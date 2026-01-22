/**
 * Leaderboards API
 *
 * GET /api/leaderboards?metric=books&period=weekly&type=global&limit=100
 *
 * Query params:
 * - metric: books | pages | time | streak | xp | assessments
 * - period: daily | weekly | monthly | alltime
 * - type: global | friends
 * - limit: number (default 100, max 100)
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";

import { withAuth, type AuthenticatedRequest } from "../../src/middleware/auth";
import { prisma } from "@read-master/database";
import { sendError, sendSuccess, ErrorCodes } from "../../src/utils/response";
import { logger } from "../../src/utils/logger";

// ============================================================================
// Types & Validation
// ============================================================================

const leaderboardQuerySchema = z.object({
  metric: z
    .enum(["books", "pages", "time", "streak", "xp", "assessments"])
    .default("books"),
  period: z.enum(["daily", "weekly", "monthly", "alltime"]).default("alltime"),
  type: z.enum(["global", "friends"]).default("global"),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

type LeaderboardMetric = z.infer<typeof leaderboardQuerySchema>["metric"];
type LeaderboardPeriod = z.infer<typeof leaderboardQuerySchema>["period"];
type LeaderboardType = z.infer<typeof leaderboardQuerySchema>["type"];

type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  tier: string;
  score: number;
  change: number; // Rank change from previous period (+1, -1, 0)
  isCurrentUser: boolean;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the start date for a period
 */
function getPeriodStartDate(period: LeaderboardPeriod): Date {
  const now = new Date();

  switch (period) {
    case "daily": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "weekly": {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "monthly": {
      const start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "alltime":
      return new Date(0); // Beginning of time
  }
}

/**
 * Get the metric field name and aggregation
 */
function getMetricConfig(metric: LeaderboardMetric): {
  statsField: string;
} {
  switch (metric) {
    case "books":
      return { statsField: "booksCompleted" };
    case "pages":
      return { statsField: "totalWordsRead" }; // Using words as proxy for pages
    case "time":
      return { statsField: "totalReadingTime" };
    case "streak":
      return { statsField: "currentStreak" };
    case "xp":
      return { statsField: "totalXP" };
    case "assessments":
      return { statsField: "assessmentsCompleted" };
  }
}

// Type for user stats with user relation
type UserStatsWithUser = {
  userId: string;
  booksCompleted: number;
  totalWordsRead: number;
  totalReadingTime: number;
  currentStreak: number;
  totalXP: number;
  assessmentsCompleted: number;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    tier: string;
  };
};

/**
 * Get leaderboard data
 */
async function getLeaderboardData(
  metric: LeaderboardMetric,
  period: LeaderboardPeriod,
  type: LeaderboardType,
  limit: number,
  currentUserId: string
): Promise<LeaderboardEntry[]> {
  const { statsField } = getMetricConfig(metric);
  const periodStart = getPeriodStartDate(period);

  // Build where clause for the query
  type WhereClause = {
    lastActivityDate?: { gte: Date };
    userId?: { in: string[] };
  };

  const whereClause: WhereClause = {};

  // For non-alltime periods, filter by activity date
  if (period !== "alltime") {
    whereClause.lastActivityDate = {
      gte: periodStart,
    };
  }

  // For friends leaderboard, get followed users
  if (type === "friends") {
    const follows = await prisma.follow.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    });
    const friendIds = follows.map(
      (f: { followingId: string }) => f.followingId
    );

    // Include current user
    friendIds.push(currentUserId);

    whereClause.userId = {
      in: friendIds,
    };
  }

  // Get top users based on metric
  const userStats = (await prisma.userStats.findMany({
    where: whereClause,
    orderBy: {
      [statsField]: "desc",
    },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          tier: true,
        },
      },
    },
  })) as UserStatsWithUser[];

  // Convert to leaderboard entries
  const entries: LeaderboardEntry[] = userStats.map((stats, index) => ({
    rank: index + 1,
    userId: stats.user.id,
    username: stats.user.username ?? "unknown",
    displayName: stats.user.displayName,
    avatar: stats.user.avatarUrl,
    tier: stats.user.tier,
    score: stats[statsField as keyof typeof stats] as number,
    change: 0, // TODO: Calculate rank change
    isCurrentUser: stats.userId === currentUserId,
  }));

  return entries;
}

// ============================================================================
// Handler
// ============================================================================

async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    return sendError(
      res,
      ErrorCodes.METHOD_NOT_ALLOWED,
      "Method not allowed",
      405
    );
  }

  // Parse query params
  const parseResult = leaderboardQuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    return sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Invalid query parameters",
      400,
      parseResult.error.flatten()
    );
  }

  const { metric, period, type, limit } = parseResult.data;
  const currentUserId = req.auth.userId;

  try {
    // Get leaderboard data
    const entries = await getLeaderboardData(
      metric,
      period,
      type,
      limit,
      currentUserId
    );

    // Find current user's rank if not in top list
    let currentUserEntry: LeaderboardEntry | null = null;
    const currentUserInList = entries.find((e) => e.isCurrentUser);

    if (!currentUserInList) {
      // Get current user's stats
      const userStats = (await prisma.userStats.findUnique({
        where: { userId: currentUserId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              tier: true,
            },
          },
        },
      })) as UserStatsWithUser | null;

      if (userStats) {
        const { statsField } = getMetricConfig(metric);
        const score = userStats[statsField as keyof typeof userStats] as number;

        // Calculate rank by counting users with higher scores
        const periodStart = getPeriodStartDate(period);

        type RankWhereClause = {
          [key: string]: { gt: number } | { gte: Date } | { in: string[] };
        };

        const rankWhereClause: RankWhereClause = {
          [statsField]: {
            gt: score,
          },
        };

        if (period !== "alltime") {
          rankWhereClause.lastActivityDate = {
            gte: periodStart,
          };
        }

        if (type === "friends") {
          const follows = await prisma.follow.findMany({
            where: { followerId: currentUserId },
            select: { followingId: true },
          });
          const friendIds = follows.map(
            (f: { followingId: string }) => f.followingId
          );
          friendIds.push(currentUserId);
          rankWhereClause.userId = { in: friendIds };
        }

        const rank = await prisma.userStats.count({
          where: rankWhereClause,
        });

        currentUserEntry = {
          rank: rank + 1,
          userId: userStats.user.id,
          username: userStats.user.username ?? "unknown",
          displayName: userStats.user.displayName,
          avatar: userStats.user.avatarUrl,
          tier: userStats.user.tier,
          score,
          change: 0,
          isCurrentUser: true,
        };
      }
    }

    return sendSuccess(res, {
      leaderboard: entries,
      currentUser: currentUserEntry ?? currentUserInList ?? null,
      metric,
      period,
      type,
    });
  } catch (error) {
    logger.error("Error fetching leaderboard:", error);
    return sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch leaderboard",
      500
    );
  }
}

export default withAuth(handler);
