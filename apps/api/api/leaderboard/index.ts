/**
 * GET /api/leaderboard - Get leaderboard rankings
 *
 * Returns leaderboard data based on the specified metric and timeframe.
 * Supports global and friends-only leaderboards.
 *
 * Query Parameters:
 * - timeframe: "weekly" | "monthly" | "all_time" (default: "weekly")
 * - metric: "xp" | "books" | "streak" | "reading_time" (default: "xp")
 * - friendsOnly: boolean (default: false) - Only show followed users
 * - page: number (default: 1) - Page number for pagination
 * - limit: number (default: 50, max: 100) - Number of entries per page
 *
 * Privacy: Only includes users who have opted in (showStats: true)
 *
 * @example
 * ```bash
 * # Get weekly XP leaderboard
 * curl -X GET "/api/leaderboard?timeframe=weekly&metric=xp" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Get friends leaderboard
 * curl -X GET "/api/leaderboard?friendsOnly=true&metric=books" \
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
import type {
  LeaderboardEntry,
  LeaderboardResponse,
} from "@read-master/shared";

// ============================================================================
// Constants
// ============================================================================

/**
 * Valid timeframe values
 */
export const VALID_TIMEFRAMES = ["weekly", "monthly", "all_time"] as const;
export type LeaderboardTimeframe = (typeof VALID_TIMEFRAMES)[number];

/**
 * Valid metric values
 */
export const VALID_METRICS = ["xp", "books", "streak", "reading_time"] as const;
export type LeaderboardMetric = (typeof VALID_METRICS)[number];

/**
 * Default and max values for pagination
 */
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;
export const DEFAULT_PAGE = 1;

/**
 * Cache TTL by timeframe (shorter for weekly, longer for all-time)
 */
export const CACHE_TTL_BY_TIMEFRAME: Record<LeaderboardTimeframe, number> = {
  weekly: CacheTTL.SHORT, // 5 minutes
  monthly: CacheTTL.MEDIUM, // 15 minutes
  all_time: CacheTTL.LONG, // 1 hour
};

// ============================================================================
// Types
// ============================================================================

/**
 * Parsed and validated query parameters
 */
export type LeaderboardQueryParams = {
  timeframe: LeaderboardTimeframe;
  metric: LeaderboardMetric;
  friendsOnly: boolean;
  page: number;
  limit: number;
};

/**
 * Database row structure for leaderboard queries
 */
export type LeaderboardRow = {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  value: number;
};

/**
 * Full leaderboard response with pagination
 */
export type FullLeaderboardResponse = LeaderboardResponse & {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse and validate query parameters
 */
export function parseQueryParams(
  query: Record<string, string | string[] | undefined>
): LeaderboardQueryParams {
  // Parse timeframe
  const rawTimeframe =
    typeof query.timeframe === "string" ? query.timeframe : "weekly";
  const timeframe = VALID_TIMEFRAMES.includes(
    rawTimeframe as LeaderboardTimeframe
  )
    ? (rawTimeframe as LeaderboardTimeframe)
    : "weekly";

  // Parse metric
  const rawMetric = typeof query.metric === "string" ? query.metric : "xp";
  const metric = VALID_METRICS.includes(rawMetric as LeaderboardMetric)
    ? (rawMetric as LeaderboardMetric)
    : "xp";

  // Parse friendsOnly
  const friendsOnly = query.friendsOnly === "true";

  // Parse page
  const rawPage =
    typeof query.page === "string" ? parseInt(query.page, 10) : DEFAULT_PAGE;
  const page = !isNaN(rawPage) && rawPage >= 1 ? rawPage : DEFAULT_PAGE;

  // Parse limit
  const rawLimit =
    typeof query.limit === "string" ? parseInt(query.limit, 10) : DEFAULT_LIMIT;
  const limit =
    !isNaN(rawLimit) && rawLimit >= 1
      ? Math.min(rawLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

  return { timeframe, metric, friendsOnly, page, limit };
}

/**
 * Get the database column name for a metric
 */
export function getMetricColumn(metric: LeaderboardMetric): string {
  switch (metric) {
    case "xp":
      return "totalXP";
    case "books":
      return "booksCompleted";
    case "streak":
      return "currentStreak";
    case "reading_time":
      return "totalReadingTime";
    default:
      return "totalXP";
  }
}

/**
 * Get the start date for a timeframe
 */
export function getTimeframeStartDate(
  timeframe: LeaderboardTimeframe
): Date | null {
  const now = new Date();

  switch (timeframe) {
    case "weekly": {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      return weekAgo;
    }
    case "monthly": {
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      monthAgo.setHours(0, 0, 0, 0);
      return monthAgo;
    }
    case "all_time":
      return null; // No date filter
    default:
      return null;
  }
}

/**
 * Build cache key for leaderboard
 */
export function buildLeaderboardCacheKey(
  params: LeaderboardQueryParams,
  userId?: string
): string {
  const parts = [
    CacheKeyPrefix.LEADERBOARD,
    params.metric,
    params.timeframe,
    params.friendsOnly ? `friends:${userId}` : "global",
    `page:${params.page}`,
    `limit:${params.limit}`,
  ];
  return parts.join(":");
}

/**
 * Map database row to leaderboard entry
 */
export function mapRowToEntry(
  row: LeaderboardRow,
  rank: number,
  currentUserId: string
): LeaderboardEntry {
  return {
    rank,
    user: {
      id: row.userId,
      username: row.username || "Anonymous",
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
    },
    value: row.value,
    isCurrentUser: row.userId === currentUserId,
  };
}

/**
 * Build pagination metadata
 */
export function buildPagination(
  page: number,
  limit: number,
  total: number
): FullLeaderboardResponse["pagination"] {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get friend user IDs for a user
 */
async function getFriendIds(userId: string): Promise<string[]> {
  const follows = await db.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  return follows.map((f) => f.followingId);
}

/**
 * Get leaderboard entries from database
 */
async function getLeaderboardData(
  params: LeaderboardQueryParams,
  currentUserId: string,
  friendIds: string[]
): Promise<{ rows: LeaderboardRow[]; total: number }> {
  const metricColumn = getMetricColumn(params.metric);
  const startDate = getTimeframeStartDate(params.timeframe);
  const offset = (params.page - 1) * params.limit;

  // Build base where clause
  // Only include users who have opted in (showStats: true)
  const baseWhere: Record<string, unknown> = {
    user: {
      showStats: true,
      deletedAt: null,
    },
  };

  // For friends only, filter by friend IDs
  if (params.friendsOnly) {
    // Include self in friends leaderboard
    const userIds = [...friendIds, currentUserId];
    baseWhere.userId = { in: userIds };
  }

  // For weekly/monthly, we need to filter by lastActivityDate
  // Note: This is a simplification - in reality, you'd want separate tracking
  // For now, we use lastActivityDate for streak/xp and just show all for books/reading_time
  if (startDate && (params.metric === "streak" || params.metric === "xp")) {
    baseWhere.lastActivityDate = {
      gte: startDate,
    };
  }

  // Count total matching entries
  const total = await db.userStats.count({
    where: baseWhere,
  });

  // Get leaderboard entries with user info
  // Note: We select all metric fields to avoid dynamic key issues with Prisma types
  const stats = await db.userStats.findMany({
    where: baseWhere,
    orderBy: { [metricColumn]: "desc" },
    skip: offset,
    take: params.limit,
    select: {
      userId: true,
      totalXP: true,
      booksCompleted: true,
      currentStreak: true,
      totalReadingTime: true,
      user: {
        select: {
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Map to LeaderboardRow format
  const rows: LeaderboardRow[] = stats.map((stat) => {
    // Get the appropriate value based on metric
    let value: number;
    switch (params.metric) {
      case "xp":
        value = stat.totalXP;
        break;
      case "books":
        value = stat.booksCompleted;
        break;
      case "streak":
        value = stat.currentStreak;
        break;
      case "reading_time":
        value = stat.totalReadingTime;
        break;
      default:
        value = stat.totalXP;
    }

    return {
      userId: stat.userId,
      username: stat.user?.username ?? null,
      displayName: stat.user?.displayName ?? null,
      avatarUrl: stat.user?.avatarUrl ?? null,
      value,
    };
  });

  return { rows, total };
}

/**
 * Get current user's rank
 */
async function getCurrentUserRank(
  params: LeaderboardQueryParams,
  currentUserId: string,
  friendIds: string[]
): Promise<number | null> {
  const metricColumn = getMetricColumn(params.metric);
  const startDate = getTimeframeStartDate(params.timeframe);

  // First, get the current user's stats
  const currentUserStats = await db.userStats.findUnique({
    where: { userId: currentUserId },
    select: {
      totalXP: true,
      booksCompleted: true,
      currentStreak: true,
      totalReadingTime: true,
    },
  });

  if (!currentUserStats) {
    return null;
  }

  // Get the appropriate value based on metric
  let currentValue: number;
  switch (params.metric) {
    case "xp":
      currentValue = currentUserStats.totalXP;
      break;
    case "books":
      currentValue = currentUserStats.booksCompleted;
      break;
    case "streak":
      currentValue = currentUserStats.currentStreak;
      break;
    case "reading_time":
      currentValue = currentUserStats.totalReadingTime;
      break;
    default:
      currentValue = currentUserStats.totalXP;
  }

  // Build where clause for counting users with higher values
  const baseWhere: Record<string, unknown> = {
    user: {
      showStats: true,
      deletedAt: null,
    },
    [metricColumn]: {
      gt: currentValue,
    },
  };

  // For friends only, filter by friend IDs
  if (params.friendsOnly) {
    const userIds = [...friendIds, currentUserId];
    baseWhere.userId = { in: userIds };
  }

  // Apply timeframe filter
  if (startDate && (params.metric === "streak" || params.metric === "xp")) {
    baseWhere.lastActivityDate = {
      gte: startDate,
    };
  }

  // Count how many users have a higher value
  const usersAbove = await db.userStats.count({
    where: baseWhere,
  });

  // Rank is usersAbove + 1
  return usersAbove + 1;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET /api/leaderboard
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
    // Get user from database
    const user = await getUserByClerkId(clerkUserId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Parse query parameters
    const params = parseQueryParams(
      req.query as Record<string, string | string[] | undefined>
    );

    // Check cache first
    const cacheKey = buildLeaderboardCacheKey(params, user.id);
    const cached = await cache.get<FullLeaderboardResponse>(cacheKey);

    if (cached) {
      // Update isCurrentUser flags in cached data
      const updatedEntries = cached.entries.map((entry) => ({
        ...entry,
        isCurrentUser: entry.user.id === user.id,
      }));

      const response: FullLeaderboardResponse = {
        ...cached,
        entries: updatedEntries,
      };

      logger.info("Leaderboard cache hit", {
        userId: user.id,
        params,
        entriesCount: response.entries.length,
      });

      sendSuccess(res, response);
      return;
    }

    // Get friend IDs if needed
    const friendIds = params.friendsOnly ? await getFriendIds(user.id) : [];

    // Get leaderboard data
    const { rows, total } = await getLeaderboardData(
      params,
      user.id,
      friendIds
    );

    // Calculate base rank for this page
    const baseRank = (params.page - 1) * params.limit;

    // Map rows to entries
    const entries: LeaderboardEntry[] = rows.map((row, index) =>
      mapRowToEntry(row, baseRank + index + 1, user.id)
    );

    // Get current user's rank
    const currentUserRank = await getCurrentUserRank(
      params,
      user.id,
      friendIds
    );

    // Build response
    const response: FullLeaderboardResponse = {
      entries,
      currentUserRank,
      timeframe: params.timeframe,
      metric: params.metric,
      pagination: buildPagination(params.page, params.limit, total),
    };

    // Cache the response
    const cacheTtl = CACHE_TTL_BY_TIMEFRAME[params.timeframe];
    await cache.set(cacheKey, response, { ttl: cacheTtl });

    logger.info("Leaderboard fetched", {
      userId: user.id,
      params,
      entriesCount: entries.length,
      total,
      currentUserRank,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error fetching leaderboard", {
      userId: clerkUserId,
      error: message,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch leaderboard. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
