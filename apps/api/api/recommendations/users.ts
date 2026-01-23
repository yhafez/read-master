/**
 * GET /api/recommendations/users - Get similar readers
 *
 * Returns users with similar reading habits and preferences.
 * Based on reading history overlap, genre preferences, and reading patterns.
 *
 * Query Parameters:
 * - limit: number (default: 10, max: 50) - Number of similar users to return
 *
 * @example
 * ```bash
 * curl -X GET "/api/recommendations/users?limit=10" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.js";
import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../src/services/db.js";
import { cache, CacheKeyPrefix, CacheTTL } from "../../src/services/redis.js";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// ============================================================================
// Types
// ============================================================================

interface SimilarUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  similarityScore: number;
  commonBooks: number;
  commonGenres: string[];
  sharedInterests: string[];
}

interface SimilarUsersResponse {
  users: SimilarUser[];
  total: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate similarity between two users based on their reading data
 */
async function calculateUserSimilarity(
  userId1: string,
  userId2: string
): Promise<{ score: number; factors: Record<string, number> }> {
  // Get books for both users
  const [books1, books2] = await Promise.all([
    db.book.findMany({
      where: { userId: userId1, deletedAt: null },
      select: { id: true, genre: true, author: true, tags: true, status: true },
    }),
    db.book.findMany({
      where: { userId: userId2, deletedAt: null },
      select: { id: true, genre: true, author: true, tags: true, status: true },
    }),
  ]);

  if (books1.length === 0 || books2.length === 0) {
    return { score: 0, factors: {} };
  }

  // Calculate genre overlap (Jaccard similarity)
  const genres1 = new Set(books1.map((b) => b.genre).filter(Boolean));
  const genres2 = new Set(books2.map((b) => b.genre).filter(Boolean));
  const genreIntersection = new Set([...genres1].filter((g) => genres2.has(g)));
  const genreUnion = new Set([...genres1, ...genres2]);
  const genreSimilarity =
    genreUnion.size > 0 ? genreIntersection.size / genreUnion.size : 0;

  // Calculate author overlap
  const authors1 = new Set(books1.map((b) => b.author).filter(Boolean));
  const authors2 = new Set(books2.map((b) => b.author).filter(Boolean));
  const authorIntersection = new Set(
    [...authors1].filter((a) => authors2.has(a))
  );
  const authorUnion = new Set([...authors1, ...authors2]);
  const authorSimilarity =
    authorUnion.size > 0 ? authorIntersection.size / authorUnion.size : 0;

  // Calculate tag overlap
  const tags1 = new Set(books1.flatMap((b) => b.tags));
  const tags2 = new Set(books2.flatMap((b) => b.tags));
  const tagIntersection = new Set([...tags1].filter((t) => tags2.has(t)));
  const tagUnion = new Set([...tags1, ...tags2]);
  const tagSimilarity =
    tagUnion.size > 0 ? tagIntersection.size / tagUnion.size : 0;

  // Calculate reading behavior similarity (completed vs reading ratio)
  const completed1 =
    books1.filter((b) => b.status === "COMPLETED").length / books1.length;
  const completed2 =
    books2.filter((b) => b.status === "COMPLETED").length / books2.length;
  const behaviorSimilarity = 1 - Math.abs(completed1 - completed2);

  // Weighted average
  const factors = {
    genres: genreSimilarity,
    authors: authorSimilarity,
    tags: tagSimilarity,
    behavior: behaviorSimilarity,
  };

  const score =
    genreSimilarity * 0.35 +
    authorSimilarity * 0.25 +
    tagSimilarity * 0.25 +
    behaviorSimilarity * 0.15;

  return { score, factors };
}

/**
 * Get common books and genres between users
 */
async function getCommonInterests(
  userId1: string,
  userId2: string
): Promise<{
  commonBooks: number;
  commonGenres: string[];
  sharedInterests: string[];
}> {
  const [books1, books2] = await Promise.all([
    db.book.findMany({
      where: { userId: userId1, deletedAt: null },
      select: { title: true, author: true, genre: true },
    }),
    db.book.findMany({
      where: { userId: userId2, deletedAt: null },
      select: { title: true, author: true, genre: true },
    }),
  ]);

  // Find common authors
  const authors1 = new Set(books1.map((b) => b.author).filter(Boolean));
  const authors2 = new Set(books2.map((b) => b.author).filter(Boolean));
  const commonAuthors = [...authors1].filter((a) => authors2.has(a));

  // Find common genres
  const genres1 = new Set(books1.map((b) => b.genre).filter(Boolean));
  const genres2 = new Set(books2.map((b) => b.genre).filter(Boolean));
  const commonGenres = [...genres1].filter((g) => genres2.has(g)) as string[];

  // Count books with same author
  const commonBooks = commonAuthors.length;

  // Shared interests are common authors and genres
  const sharedInterests = [
    ...commonAuthors.slice(0, 3).map((a) => `Author: ${a}`),
    ...commonGenres.slice(0, 3).map((g) => `Genre: ${g}`),
  ];

  return { commonBooks, commonGenres, sharedInterests };
}

// ============================================================================
// Main Handler
// ============================================================================

async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET.",
      405
    );
    return;
  }

  const { userId: clerkUserId } = req.auth;

  try {
    const user = await getUserByClerkId(clerkUserId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Parse limit
    const rawLimit =
      typeof req.query.limit === "string"
        ? parseInt(req.query.limit, 10)
        : DEFAULT_LIMIT;
    const limit =
      !isNaN(rawLimit) && rawLimit >= 1
        ? Math.min(rawLimit, MAX_LIMIT)
        : DEFAULT_LIMIT;

    // Check cache
    const cacheKey = `${CacheKeyPrefix.USER}:${user.id}:similar-users`;
    const cached = await cache.get<SimilarUsersResponse>(cacheKey);

    if (cached) {
      logger.info("Similar users cache hit", { userId: user.id });
      sendSuccess(res, cached);
      return;
    }

    // Try to get pre-calculated similarities first
    const preCalculated = await db.$queryRaw<
      Array<{
        userId2: string;
        score: number;
        factors: unknown;
      }>
    >`
      SELECT "userId2", score, factors
      FROM "UserSimilarity"
      WHERE "userId1" = ${user.id}
      ORDER BY score DESC
      LIMIT ${limit * 2}
    `;

    let similarUserIds: string[];
    let similarityScores: Map<string, number>;

    if (preCalculated.length > 0) {
      // Use pre-calculated similarities
      similarUserIds = preCalculated.map((r) => r.userId2);
      similarityScores = new Map(
        preCalculated.map((r) => [r.userId2, r.score])
      );
    } else {
      // Calculate on-the-fly (fallback)
      // Get users who have public profiles and stats
      const potentialUsers = await db.user.findMany({
        where: {
          id: { not: user.id },
          profilePublic: true,
          deletedAt: null,
        },
        select: { id: true },
        take: 100,
      });

      // Calculate similarities
      const similarities = await Promise.all(
        potentialUsers.map(async (u) => {
          const { score } = await calculateUserSimilarity(user.id, u.id);
          return { userId: u.id, score };
        })
      );

      // Sort by similarity and take top results
      similarities.sort((a, b) => b.score - a.score);
      const topSimilar = similarities
        .filter((s) => s.score > 0.1)
        .slice(0, limit);

      similarUserIds = topSimilar.map((s) => s.userId);
      similarityScores = new Map(topSimilar.map((s) => [s.userId, s.score]));
    }

    // Get user details
    const userDetails = await db.user.findMany({
      where: {
        id: { in: similarUserIds },
        profilePublic: true,
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    // Build response with common interests
    const similarUsers: SimilarUser[] = await Promise.all(
      userDetails.map(async (u) => {
        const { commonBooks, commonGenres, sharedInterests } =
          await getCommonInterests(user.id, u.id);

        return {
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          similarityScore: similarityScores.get(u.id) ?? 0,
          commonBooks,
          commonGenres,
          sharedInterests,
        };
      })
    );

    // Sort by similarity score
    similarUsers.sort((a, b) => b.similarityScore - a.similarityScore);

    const response: SimilarUsersResponse = {
      users: similarUsers.slice(0, limit),
      total: similarUsers.length,
    };

    // Cache for 1 hour
    await cache.set(cacheKey, response, { ttl: CacheTTL.LONG });

    logger.info("Similar users fetched", {
      userId: user.id,
      count: response.users.length,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error fetching similar users", {
      userId: clerkUserId,
      error: message,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch similar users. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
