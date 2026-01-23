/**
 * GET /api/recommendations/books - Get AI book recommendations
 *
 * Returns personalized book recommendations based on reading history,
 * social connections, and AI analysis.
 *
 * Query Parameters:
 * - source: "all" | "social" | "ai" | "trending" (default: "all")
 * - limit: number (default: 10, max: 50)
 * - includeRead: boolean (default: false) - Include books already in library
 *
 * @example
 * ```bash
 * curl -X GET "/api/recommendations/books?source=social&limit=10" \
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
import { generateBookRecommendations } from "../../src/services/ai-recommendations.js";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const VALID_SOURCES = ["all", "social", "ai", "trending", "following"] as const;
type RecommendationSource = (typeof VALID_SOURCES)[number];

// ============================================================================
// Types
// ============================================================================

interface BookRecommendation {
  id: string;
  bookId: string | null;
  bookTitle: string;
  bookAuthor: string | null;
  bookCoverUrl: string | null;
  reason: string;
  score: number;
  source: string;
  sourceUser: {
    id: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
  dismissed: boolean;
  addedToLibrary: boolean;
}

interface BookRecommendationsResponse {
  recommendations: BookRecommendation[];
  total: number;
  hasMore: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get books from users the current user follows
 */
async function getFollowingBooks(
  userId: string,
  userBookTitles: Set<string>,
  limit: number
): Promise<BookRecommendation[]> {
  // Get users being followed
  const following = await db.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });

  if (following.length === 0) {
    return [];
  }

  const followingIds = following.map((f) => f.followingId);

  // Get recently completed books from followed users
  const books = await db.book.findMany({
    where: {
      userId: { in: followingIds },
      status: "COMPLETED",
      deletedAt: null,
      isPublic: true,
    },
    orderBy: { updatedAt: "desc" },
    take: limit * 2,
    select: {
      id: true,
      title: true,
      author: true,
      coverImage: true,
      genre: true,
      userId: true,
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Filter out books user already has
  const filteredBooks = books.filter(
    (b) => !userBookTitles.has(b.title.toLowerCase())
  );

  // Convert to recommendations
  return filteredBooks.slice(0, limit).map((book) => ({
    id: `following-${book.id}`,
    bookId: book.id,
    bookTitle: book.title,
    bookAuthor: book.author,
    bookCoverUrl: book.coverImage,
    reason: `Recently read by ${book.user.displayName || book.user.username || "someone you follow"}`,
    score: 0.8,
    source: "FOLLOWING",
    sourceUser: {
      id: book.user.id,
      username: book.user.username,
      avatarUrl: book.user.avatarUrl,
    },
    dismissed: false,
    addedToLibrary: false,
  }));
}

/**
 * Get trending books in user's network
 */
async function getTrendingBooks(
  userId: string,
  userBookTitles: Set<string>,
  limit: number
): Promise<BookRecommendation[]> {
  // Get most commonly read books in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const trendingBooks = await db.book.groupBy({
    by: ["title", "author"],
    where: {
      status: "COMPLETED",
      deletedAt: null,
      isPublic: true,
      updatedAt: { gte: thirtyDaysAgo },
      userId: { not: userId },
    },
    _count: { title: true },
    orderBy: { _count: { title: "desc" } },
    take: limit * 2,
  });

  // Filter out books user already has
  const filteredBooks = trendingBooks.filter(
    (b) => !userBookTitles.has(b.title.toLowerCase())
  );

  // Get cover images for trending books
  const recommendations: BookRecommendation[] = [];

  for (const book of filteredBooks.slice(0, limit)) {
    const sampleBook = await db.book.findFirst({
      where: {
        title: book.title,
        author: book.author,
        deletedAt: null,
      },
      select: {
        id: true,
        coverImage: true,
      },
    });

    recommendations.push({
      id: `trending-${sampleBook?.id || book.title}`,
      bookId: sampleBook?.id ?? null,
      bookTitle: book.title,
      bookAuthor: book.author,
      bookCoverUrl: sampleBook?.coverImage ?? null,
      reason: `Trending: ${book._count.title} readers completed recently`,
      score: Math.min(0.9, 0.5 + book._count.title * 0.05),
      source: "TRENDING",
      sourceUser: null,
      dismissed: false,
      addedToLibrary: false,
    });
  }

  return recommendations;
}

/**
 * Get stored recommendations from database
 */
async function getStoredRecommendations(
  userId: string,
  source: RecommendationSource,
  limit: number
): Promise<BookRecommendation[]> {
  const where: Record<string, unknown> = {
    userId,
    dismissed: false,
    expiresAt: { gte: new Date() },
  };

  if (source !== "all") {
    where.source = source.toUpperCase();
  }

  const recommendations = await db.bookRecommendation.findMany({
    where,
    orderBy: { score: "desc" },
    take: limit,
  });

  return recommendations.map((rec) => ({
    id: rec.id,
    bookId: rec.bookId,
    bookTitle: rec.bookTitle,
    bookAuthor: rec.bookAuthor,
    bookCoverUrl: rec.bookCoverUrl,
    reason: rec.reason,
    score: rec.score,
    source: rec.source,
    sourceUser: null, // Would need to join with user table
    dismissed: rec.dismissed,
    addedToLibrary: rec.addedToLibrary,
  }));
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

    // Parse query parameters
    const rawSource =
      typeof req.query.source === "string" ? req.query.source : "all";
    const source = VALID_SOURCES.includes(rawSource as RecommendationSource)
      ? (rawSource as RecommendationSource)
      : "all";

    const rawLimit =
      typeof req.query.limit === "string"
        ? parseInt(req.query.limit, 10)
        : DEFAULT_LIMIT;
    const limit =
      !isNaN(rawLimit) && rawLimit >= 1
        ? Math.min(rawLimit, MAX_LIMIT)
        : DEFAULT_LIMIT;

    const includeRead = req.query.includeRead === "true";

    // Check cache
    const cacheKey = `${CacheKeyPrefix.USER}:${user.id}:book-recs:${source}`;
    const cached = await cache.get<BookRecommendationsResponse>(cacheKey);

    if (cached) {
      logger.info("Book recommendations cache hit", {
        userId: user.id,
        source,
      });
      sendSuccess(res, cached);
      return;
    }

    // Get user's existing books for filtering
    const userBooks = await db.book.findMany({
      where: { userId: user.id, deletedAt: null },
      select: { title: true },
    });
    const userBookTitles = new Set(userBooks.map((b) => b.title.toLowerCase()));

    // Collect recommendations from different sources
    let recommendations: BookRecommendation[] = [];

    // Get stored recommendations
    const storedRecs = await getStoredRecommendations(user.id, source, limit);
    recommendations.push(...storedRecs);

    // If not enough stored recommendations, generate more
    if (recommendations.length < limit) {
      const remaining = limit - recommendations.length;

      if (source === "all" || source === "following") {
        const followingRecs = await getFollowingBooks(
          user.id,
          includeRead ? new Set() : userBookTitles,
          Math.ceil(remaining / 2)
        );
        recommendations.push(...followingRecs);
      }

      if (source === "all" || source === "trending") {
        const trendingRecs = await getTrendingBooks(
          user.id,
          includeRead ? new Set() : userBookTitles,
          Math.ceil(remaining / 2)
        );
        recommendations.push(...trendingRecs);
      }

      if (source === "all" || source === "ai") {
        // Generate AI recommendations if user has AI enabled
        if (user.aiEnabled) {
          try {
            const aiRecs = await generateBookRecommendations(
              user.id,
              Math.ceil(remaining / 3)
            );
            recommendations.push(...aiRecs);
          } catch (error) {
            logger.warn("Failed to generate AI recommendations", {
              userId: user.id,
              error: error instanceof Error ? error.message : "Unknown",
            });
          }
        }
      }
    }

    // Deduplicate by book title
    const seenTitles = new Set<string>();
    recommendations = recommendations.filter((rec) => {
      const key = rec.bookTitle.toLowerCase();
      if (seenTitles.has(key)) {
        return false;
      }
      seenTitles.add(key);
      return true;
    });

    // Sort by score and limit
    recommendations.sort((a, b) => b.score - a.score);
    recommendations = recommendations.slice(0, limit);

    const response: BookRecommendationsResponse = {
      recommendations,
      total: recommendations.length,
      hasMore: recommendations.length >= limit,
    };

    // Cache for 30 minutes
    await cache.set(cacheKey, response, { ttl: CacheTTL.MEDIUM });

    logger.info("Book recommendations fetched", {
      userId: user.id,
      source,
      count: recommendations.length,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error fetching book recommendations", {
      userId: clerkUserId,
      error: message,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch recommendations. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
