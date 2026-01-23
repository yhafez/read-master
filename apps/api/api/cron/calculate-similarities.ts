/**
 * POST /api/cron/calculate-similarities - Calculate user similarities
 *
 * Background job to calculate and store similarity scores between users.
 * Should be run daily via Vercel cron or external scheduler.
 *
 * Security: Requires CRON_SECRET header for authentication.
 *
 * @example
 * ```bash
 * curl -X POST "/api/cron/calculate-similarities" \
 *   -H "Authorization: Bearer <CRON_SECRET>"
 * ```
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { db } from "../../src/services/db.js";

// ============================================================================
// Constants
// ============================================================================

const BATCH_SIZE = 50;
const MAX_SIMILAR_USERS_PER_USER = 100;
const MIN_SIMILARITY_THRESHOLD = 0.1;

// ============================================================================
// Types
// ============================================================================

interface UserBookProfile {
  id: string;
  genres: Map<string, number>;
  authors: Map<string, number>;
  tags: Set<string>;
  completedRatio: number;
  totalBooks: number;
}

interface SimilarityResult {
  userId1: string;
  userId2: string;
  score: number;
  factors: {
    genres: number;
    authors: number;
    tags: number;
    behavior: number;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify cron secret
 */
function verifyCronSecret(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.warn("CRON_SECRET not configured");
    return false;
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.substring(7);
  return token === cronSecret;
}

/**
 * Build user profile from their books
 */
async function buildUserProfile(
  userId: string
): Promise<UserBookProfile | null> {
  const books = await db.book.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    select: {
      genre: true,
      author: true,
      tags: true,
      status: true,
    },
  });

  if (books.length === 0) {
    return null;
  }

  const genres = new Map<string, number>();
  const authors = new Map<string, number>();
  const tags = new Set<string>();
  let completed = 0;

  for (const book of books) {
    if (book.genre) {
      genres.set(book.genre, (genres.get(book.genre) || 0) + 1);
    }
    if (book.author) {
      authors.set(book.author, (authors.get(book.author) || 0) + 1);
    }
    book.tags.forEach((tag) => tags.add(tag));
    if (book.status === "COMPLETED") {
      completed++;
    }
  }

  return {
    id: userId,
    genres,
    authors,
    tags,
    completedRatio: completed / books.length,
    totalBooks: books.length,
  };
}

/**
 * Calculate similarity between two user profiles
 */
function calculateSimilarity(
  profile1: UserBookProfile,
  profile2: UserBookProfile
): SimilarityResult {
  // Genre similarity (weighted Jaccard)
  const genreIntersection = [...profile1.genres.keys()].filter((g) =>
    profile2.genres.has(g)
  );
  const genreUnion = new Set([
    ...profile1.genres.keys(),
    ...profile2.genres.keys(),
  ]);
  const genreSimilarity =
    genreUnion.size > 0 ? genreIntersection.length / genreUnion.size : 0;

  // Author similarity
  const authorIntersection = [...profile1.authors.keys()].filter((a) =>
    profile2.authors.has(a)
  );
  const authorUnion = new Set([
    ...profile1.authors.keys(),
    ...profile2.authors.keys(),
  ]);
  const authorSimilarity =
    authorUnion.size > 0 ? authorIntersection.length / authorUnion.size : 0;

  // Tag similarity
  const tagIntersection = [...profile1.tags].filter((t) =>
    profile2.tags.has(t)
  );
  const tagUnion = new Set([...profile1.tags, ...profile2.tags]);
  const tagSimilarity =
    tagUnion.size > 0 ? tagIntersection.length / tagUnion.size : 0;

  // Behavior similarity (completion ratio)
  const behaviorSimilarity =
    1 - Math.abs(profile1.completedRatio - profile2.completedRatio);

  // Weighted score
  const score =
    genreSimilarity * 0.35 +
    authorSimilarity * 0.3 +
    tagSimilarity * 0.2 +
    behaviorSimilarity * 0.15;

  return {
    userId1: profile1.id,
    userId2: profile2.id,
    score,
    factors: {
      genres: genreSimilarity,
      authors: authorSimilarity,
      tags: tagSimilarity,
      behavior: behaviorSimilarity,
    },
  };
}

/**
 * Process a batch of users
 */
async function processBatch(
  users: Array<{ id: string }>,
  allProfiles: Map<string, UserBookProfile>
): Promise<number> {
  let similaritiesCreated = 0;

  for (const user of users) {
    const profile1 = allProfiles.get(user.id);
    if (!profile1) continue;

    const similarities: SimilarityResult[] = [];

    // Compare with all other users
    for (const [otherId, profile2] of allProfiles) {
      if (otherId === user.id) continue;

      const similarity = calculateSimilarity(profile1, profile2);
      if (similarity.score >= MIN_SIMILARITY_THRESHOLD) {
        similarities.push(similarity);
      }
    }

    // Sort by score and keep top N
    similarities.sort((a, b) => b.score - a.score);
    const topSimilarities = similarities.slice(0, MAX_SIMILAR_USERS_PER_USER);

    // Delete old similarities for this user
    await db.$executeRaw`
      DELETE FROM "UserSimilarity"
      WHERE "userId1" = ${user.id}
    `;

    // Insert new similarities
    if (topSimilarities.length > 0) {
      await db.$executeRaw`
        INSERT INTO "UserSimilarity" ("id", "userId1", "userId2", "score", "factors", "lastCalculated", "createdAt", "updatedAt")
        SELECT
          gen_random_uuid()::text,
          ${user.id},
          data."userId2",
          data.score,
          data.factors::jsonb,
          NOW(),
          NOW(),
          NOW()
        FROM (
          SELECT
            unnest(${topSimilarities.map((s) => s.userId2)}::text[]) as "userId2",
            unnest(${topSimilarities.map((s) => s.score)}::float[]) as score,
            unnest(${topSimilarities.map((s) => JSON.stringify(s.factors))}::text[]) as factors
        ) as data
      `;

      similaritiesCreated += topSimilarities.length;
    }
  }

  return similaritiesCreated;
}

// ============================================================================
// Main Handler
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use POST.",
      405
    );
    return;
  }

  // Verify cron secret
  if (!verifyCronSecret(req)) {
    sendError(res, ErrorCodes.UNAUTHORIZED, "Unauthorized", 401);
    return;
  }

  const startTime = Date.now();

  try {
    logger.info("Starting similarity calculation job");

    // Get all users with public profiles and at least 3 books
    const users = await db.user.findMany({
      where: {
        profilePublic: true,
        deletedAt: null,
        books: {
          some: {
            deletedAt: null,
          },
        },
      },
      select: { id: true },
    });

    // Filter to users with enough books
    const usersWithBooks = await Promise.all(
      users.map(async (user) => {
        const bookCount = await db.book.count({
          where: {
            userId: user.id,
            deletedAt: null,
          },
        });
        return bookCount >= 3 ? user : null;
      })
    );

    const eligibleUsers = usersWithBooks.filter((u) => u !== null) as Array<{
      id: string;
    }>;

    logger.info("Building user profiles", {
      totalUsers: users.length,
      eligibleUsers: eligibleUsers.length,
    });

    // Build profiles for all eligible users
    const allProfiles = new Map<string, UserBookProfile>();
    for (const user of eligibleUsers) {
      const profile = await buildUserProfile(user.id);
      if (profile) {
        allProfiles.set(user.id, profile);
      }
    }

    logger.info("Profiles built", { profileCount: allProfiles.size });

    // Process in batches
    let totalSimilarities = 0;
    for (let i = 0; i < eligibleUsers.length; i += BATCH_SIZE) {
      const batch = eligibleUsers.slice(i, i + BATCH_SIZE);
      const count = await processBatch(batch, allProfiles);
      totalSimilarities += count;

      logger.info("Batch processed", {
        batchStart: i,
        batchSize: batch.length,
        similaritiesCreated: count,
      });
    }

    const duration = Date.now() - startTime;

    logger.info("Similarity calculation completed", {
      usersProcessed: eligibleUsers.length,
      totalSimilarities,
      durationMs: duration,
    });

    sendSuccess(res, {
      success: true,
      usersProcessed: eligibleUsers.length,
      similaritiesCreated: totalSimilarities,
      durationMs: duration,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const duration = Date.now() - startTime;

    logger.error("Similarity calculation failed", {
      error: message,
      durationMs: duration,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to calculate similarities",
      500
    );
  }
}
