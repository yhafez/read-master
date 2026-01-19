/**
 * GET /api/feed - Get activity feed from followed users
 *
 * Returns a paginated activity feed showing recent activity from users
 * the current user follows. Activity types include:
 * - Reading completions (book_completed)
 * - Achievement unlocks (achievement_earned)
 * - Shared highlights/annotations (highlight_shared)
 *
 * Privacy:
 * - Only includes activity from users who have showActivity: true
 * - Only includes public annotations (isPublic: true)
 *
 * @example
 * ```bash
 * # Get first page of feed
 * curl -X GET "/api/feed" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Get second page with custom limit
 * curl -X GET "/api/feed?page=2&limit=20" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";

import { withAuth, type AuthenticatedRequest } from "../src/middleware/auth.js";
import { sendSuccess, sendError, ErrorCodes } from "../src/utils/response.js";
import { logger } from "../src/utils/logger.js";
import { db, getUserByClerkId } from "../src/services/db.js";
import { cache, CacheKeyPrefix, CacheTTL } from "../src/services/redis.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Default page number
 */
export const DEFAULT_PAGE = 1;

/**
 * Default items per page
 */
export const DEFAULT_LIMIT = 20;

/**
 * Maximum items per page
 */
export const MAX_LIMIT = 50;

/**
 * Minimum items per page
 */
export const MIN_LIMIT = 1;

/**
 * Cache TTL for feed data (5 minutes - short due to social nature)
 */
export const FEED_CACHE_TTL = CacheTTL.SHORT;

/**
 * Maximum highlight text length to include in feed
 */
export const MAX_HIGHLIGHT_PREVIEW_LENGTH = 200;

// ============================================================================
// Types
// ============================================================================

/**
 * Query parameters for feed endpoint
 */
export type FeedQueryParams = {
  page: number;
  limit: number;
};

/**
 * Activity type
 */
export type ActivityType =
  | "book_completed"
  | "achievement_earned"
  | "highlight_shared";

/**
 * User info in activity items
 */
export type FeedUserInfo = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Book info in activity items
 */
export type FeedBookInfo = {
  id: string;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
};

/**
 * Achievement info in activity items
 */
export type FeedAchievementInfo = {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  rarity: string;
};

/**
 * Highlight info in activity items
 */
export type FeedHighlightInfo = {
  id: string;
  selectedText: string;
  note: string | null;
  color: string | null;
};

/**
 * Activity item in the feed
 */
export type FeedActivityItem = {
  id: string;
  type: ActivityType;
  user: FeedUserInfo;
  timestamp: string;
  book?: FeedBookInfo;
  achievement?: FeedAchievementInfo;
  highlight?: FeedHighlightInfo;
};

/**
 * Pagination info
 */
export type FeedPaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

/**
 * Feed response
 */
export type FeedResponse = {
  items: FeedActivityItem[];
  pagination: FeedPaginationInfo;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse and validate page number
 */
export function parsePage(value: string | string[] | undefined): number {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_PAGE;
  }

  const strValue = Array.isArray(value) ? value[0] : value;
  if (strValue === undefined) {
    return DEFAULT_PAGE;
  }

  const parsed = parseInt(strValue, 10);

  if (isNaN(parsed) || parsed < 1) {
    return DEFAULT_PAGE;
  }

  return parsed;
}

/**
 * Parse and validate limit
 */
export function parseLimit(value: string | string[] | undefined): number {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_LIMIT;
  }

  const strValue = Array.isArray(value) ? value[0] : value;
  if (strValue === undefined) {
    return DEFAULT_LIMIT;
  }

  const parsed = parseInt(strValue, 10);

  if (isNaN(parsed)) {
    return DEFAULT_LIMIT;
  }

  if (parsed < MIN_LIMIT) {
    return MIN_LIMIT;
  }

  if (parsed > MAX_LIMIT) {
    return MAX_LIMIT;
  }

  return parsed;
}

/**
 * Parse query parameters for feed endpoint
 */
export function parseFeedQueryParams(
  query: Record<string, string | string[] | undefined>
): FeedQueryParams {
  return {
    page: parsePage(query.page),
    limit: parseLimit(query.limit),
  };
}

/**
 * Build cache key for feed
 */
export function buildFeedCacheKey(
  userId: string,
  params: FeedQueryParams
): string {
  return `${CacheKeyPrefix.USER}:feed:${userId}:page${params.page}:limit${params.limit}`;
}

/**
 * Format date as ISO string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Map tier enum to rarity string
 */
export function mapTierToRarity(tier: string): string {
  switch (tier) {
    case "BRONZE":
      return "bronze";
    case "SILVER":
      return "silver";
    case "GOLD":
      return "gold";
    case "PLATINUM":
      return "platinum";
    default:
      return tier.toLowerCase();
  }
}

/**
 * Truncate text to max length, preserving word boundaries
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.slice(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(" ");

  if (lastSpaceIndex > maxLength * 0.7) {
    return truncated.slice(0, lastSpaceIndex) + "...";
  }

  return truncated + "...";
}

/**
 * Map user to feed user info
 */
export function mapToFeedUserInfo(user: {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}): FeedUserInfo {
  return {
    id: user.id,
    username: user.username ?? "anonymous",
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

/**
 * Map book to feed book info
 */
export function mapToFeedBookInfo(book: {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
}): FeedBookInfo {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverImageUrl: book.coverImage,
  };
}

/**
 * Map achievement to feed achievement info
 */
export function mapToFeedAchievementInfo(achievement: {
  id: string;
  name: string;
  description: string;
  badgeIcon: string | null;
  tier: string;
}): FeedAchievementInfo {
  return {
    id: achievement.id,
    name: achievement.name,
    description: achievement.description,
    icon: achievement.badgeIcon,
    rarity: mapTierToRarity(achievement.tier),
  };
}

/**
 * Map annotation to feed highlight info
 */
export function mapToFeedHighlightInfo(annotation: {
  id: string;
  selectedText: string | null;
  note: string | null;
  color: string | null;
}): FeedHighlightInfo {
  return {
    id: annotation.id,
    selectedText: annotation.selectedText
      ? truncateText(annotation.selectedText, MAX_HIGHLIGHT_PREVIEW_LENGTH)
      : "",
    note: annotation.note,
    color: annotation.color,
  };
}

/**
 * Create activity item for completed book
 */
export function createBookCompletedActivity(
  id: string,
  user: FeedUserInfo,
  timestamp: Date,
  book: FeedBookInfo
): FeedActivityItem {
  return {
    id,
    type: "book_completed",
    user,
    timestamp: formatDate(timestamp),
    book,
  };
}

/**
 * Create activity item for earned achievement
 */
export function createAchievementActivity(
  id: string,
  user: FeedUserInfo,
  timestamp: Date,
  achievement: FeedAchievementInfo
): FeedActivityItem {
  return {
    id,
    type: "achievement_earned",
    user,
    timestamp: formatDate(timestamp),
    achievement,
  };
}

/**
 * Create activity item for shared highlight
 */
export function createHighlightActivity(
  id: string,
  user: FeedUserInfo,
  timestamp: Date,
  book: FeedBookInfo,
  highlight: FeedHighlightInfo
): FeedActivityItem {
  return {
    id,
    type: "highlight_shared",
    user,
    timestamp: formatDate(timestamp),
    book,
    highlight,
  };
}

/**
 * Calculate pagination info
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number
): FeedPaginationInfo {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return {
    page,
    limit,
    total,
    totalPages,
    hasMore,
  };
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get IDs of users the current user follows who have activity sharing enabled
 */
async function getFollowedUserIdsWithActivity(
  userId: string
): Promise<string[]> {
  const follows = await db.follow.findMany({
    where: {
      followerId: userId,
      following: {
        showActivity: true,
        deletedAt: null,
      },
    },
    select: {
      followingId: true,
    },
  });

  return follows.map((f) => f.followingId);
}

/**
 * Get completed books from followed users
 */
async function getCompletedBooksFromFollowed(
  userIds: string[],
  skip: number,
  take: number
): Promise<
  Array<{
    id: string;
    userId: string;
    completedAt: Date;
    user: {
      id: string;
      username: string | null;
      displayName: string | null;
      avatarUrl: string | null;
    };
    book: {
      id: string;
      title: string;
      author: string | null;
      coverImage: string | null;
    };
  }>
> {
  if (userIds.length === 0) {
    return [];
  }

  const results = await db.readingProgress.findMany({
    where: {
      userId: { in: userIds },
      completedAt: { not: null },
      book: {
        deletedAt: null,
      },
    },
    orderBy: { completedAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      userId: true,
      completedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          coverImage: true,
        },
      },
    },
  });

  // Filter to only items with completedAt (TypeScript narrowing)
  return results.filter(
    (r): r is typeof r & { completedAt: Date } => r.completedAt !== null
  );
}

/**
 * Get achievements from followed users
 */
async function getAchievementsFromFollowed(
  userIds: string[],
  skip: number,
  take: number
): Promise<
  Array<{
    id: string;
    userId: string;
    earnedAt: Date;
    user: {
      id: string;
      username: string | null;
      displayName: string | null;
      avatarUrl: string | null;
    };
    achievement: {
      id: string;
      name: string;
      description: string;
      badgeIcon: string | null;
      tier: string;
    };
  }>
> {
  if (userIds.length === 0) {
    return [];
  }

  return db.userAchievement.findMany({
    where: {
      userId: { in: userIds },
    },
    orderBy: { earnedAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      userId: true,
      earnedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      achievement: {
        select: {
          id: true,
          name: true,
          description: true,
          badgeIcon: true,
          tier: true,
        },
      },
    },
  });
}

/**
 * Get shared highlights/annotations from followed users
 */
async function getSharedHighlightsFromFollowed(
  userIds: string[],
  skip: number,
  take: number
): Promise<
  Array<{
    id: string;
    userId: string;
    createdAt: Date;
    selectedText: string | null;
    note: string | null;
    color: string | null;
    user: {
      id: string;
      username: string | null;
      displayName: string | null;
      avatarUrl: string | null;
    };
    book: {
      id: string;
      title: string;
      author: string | null;
      coverImage: string | null;
    };
  }>
> {
  if (userIds.length === 0) {
    return [];
  }

  return db.annotation.findMany({
    where: {
      userId: { in: userIds },
      isPublic: true,
      deletedAt: null,
      book: {
        deletedAt: null,
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      userId: true,
      createdAt: true,
      selectedText: true,
      note: true,
      color: true,
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          coverImage: true,
        },
      },
    },
  });
}

/**
 * Count total activity items from followed users
 */
async function countTotalActivity(userIds: string[]): Promise<number> {
  if (userIds.length === 0) {
    return 0;
  }

  const [completedBooks, achievements, highlights] = await Promise.all([
    db.readingProgress.count({
      where: {
        userId: { in: userIds },
        completedAt: { not: null },
        book: {
          deletedAt: null,
        },
      },
    }),
    db.userAchievement.count({
      where: {
        userId: { in: userIds },
      },
    }),
    db.annotation.count({
      where: {
        userId: { in: userIds },
        isPublic: true,
        deletedAt: null,
        book: {
          deletedAt: null,
        },
      },
    }),
  ]);

  return completedBooks + achievements + highlights;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET /api/feed
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET
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
    // Get current user
    const currentUser = await getUserByClerkId(clerkUserId);
    if (!currentUser) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Parse query parameters
    const params = parseFeedQueryParams(
      req.query as Record<string, string | string[] | undefined>
    );

    // Check cache first
    const cacheKey = buildFeedCacheKey(currentUser.id, params);
    const cached = await cache.get<FeedResponse>(cacheKey);

    if (cached) {
      logger.info("Feed cache hit", {
        userId: currentUser.id,
        page: params.page,
        limit: params.limit,
      });

      sendSuccess(res, cached);
      return;
    }

    // Get IDs of followed users who share activity
    const followedUserIds = await getFollowedUserIdsWithActivity(
      currentUser.id
    );

    // If not following anyone with activity enabled, return empty feed
    if (followedUserIds.length === 0) {
      const emptyResponse: FeedResponse = {
        items: [],
        pagination: calculatePagination(0, params.page, params.limit),
      };

      await cache.set(cacheKey, emptyResponse, { ttl: FEED_CACHE_TTL });

      logger.info("Feed empty - no followed users with activity", {
        userId: currentUser.id,
      });

      sendSuccess(res, emptyResponse);
      return;
    }

    // Calculate skip for pagination
    const skip = (params.page - 1) * params.limit;
    // Fetch more to account for interleaving different activity types
    const fetchLimit = params.limit;

    // Fetch all activity types in parallel
    const [completedBooks, achievements, highlights, totalCount] =
      await Promise.all([
        getCompletedBooksFromFollowed(followedUserIds, 0, fetchLimit * 2),
        getAchievementsFromFollowed(followedUserIds, 0, fetchLimit * 2),
        getSharedHighlightsFromFollowed(followedUserIds, 0, fetchLimit * 2),
        countTotalActivity(followedUserIds),
      ]);

    // Convert to feed items
    const allItems: FeedActivityItem[] = [];

    // Add completed books
    for (const progress of completedBooks) {
      if (progress.completedAt) {
        allItems.push(
          createBookCompletedActivity(
            `book_${progress.id}`,
            mapToFeedUserInfo(progress.user),
            progress.completedAt,
            mapToFeedBookInfo(progress.book)
          )
        );
      }
    }

    // Add achievements
    for (const userAchievement of achievements) {
      allItems.push(
        createAchievementActivity(
          `achievement_${userAchievement.id}`,
          mapToFeedUserInfo(userAchievement.user),
          userAchievement.earnedAt,
          mapToFeedAchievementInfo(userAchievement.achievement)
        )
      );
    }

    // Add shared highlights
    for (const annotation of highlights) {
      allItems.push(
        createHighlightActivity(
          `highlight_${annotation.id}`,
          mapToFeedUserInfo(annotation.user),
          annotation.createdAt,
          mapToFeedBookInfo(annotation.book),
          mapToFeedHighlightInfo(annotation)
        )
      );
    }

    // Sort all items by timestamp descending
    allItems.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply pagination
    const paginatedItems = allItems.slice(skip, skip + params.limit);

    // Build response
    const response: FeedResponse = {
      items: paginatedItems,
      pagination: calculatePagination(totalCount, params.page, params.limit),
    };

    // Cache the response
    await cache.set(cacheKey, response, { ttl: FEED_CACHE_TTL });

    logger.info("Feed fetched", {
      userId: currentUser.id,
      followedCount: followedUserIds.length,
      itemCount: paginatedItems.length,
      totalCount,
      page: params.page,
      limit: params.limit,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error fetching feed", {
      userId: clerkUserId,
      error: message,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch feed. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
