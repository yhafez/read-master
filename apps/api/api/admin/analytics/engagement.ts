/**
 * Admin Engagement Analytics Endpoint
 *
 * GET /api/admin/analytics/engagement
 *
 * Returns user engagement and activity metrics.
 * Requires ADMIN or SUPER_ADMIN role.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "@read-master/database";
import { requireAdmin } from "../../../src/middleware/index.js";
import { logger } from "../../../src/utils/logger.js";

export type EngagementAnalytics = {
  // Reading metrics
  totalReadingTimeMinutes: number;
  averageReadingTimePerUser: number;
  booksCompleted: number;
  booksAdded: number;

  // Content creation
  annotationsCreated: number;
  flashcardsCreated: number;
  flashcardsReviewed: number;
  assessmentsTaken: number;

  // Social engagement
  forumPostsCreated: number;
  forumRepliesCreated: number;
  groupsCreated: number;
  curriculumsCreated: number;

  // Daily engagement (last 30 days)
  dailyEngagement: Array<{
    date: string;
    readingTime: number;
    booksCompleted: number;
    annotationsCreated: number;
    flashcardsReviewed: number;
    assessmentsTaken: number;
  }>;

  // User activity distribution
  activeUsersLast7Days: number;
  activeUsersLast30Days: number;
  inactiveUsers: number; // No activity in 30+ days
};

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Only GET requests allowed",
      },
    });
    return;
  }

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    // Get all-time engagement metrics
    const allTimeMetrics = await prisma.dailyAnalytics.aggregate({
      _sum: {
        totalReadingTimeMin: true,
        booksCompleted: true,
        booksAdded: true,
        annotationsCreated: true,
        flashcardsCreated: true,
        flashcardsReviewed: true,
        assessmentsTaken: true,
        forumPostsCreated: true,
        forumRepliesCreated: true,
        groupsCreated: true,
        curriculumsCreated: true,
      },
    });

    // Get daily engagement data
    const dailyAnalytics = await prisma.dailyAnalytics.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: "asc" },
      select: {
        date: true,
        totalReadingTimeMin: true,
        booksCompleted: true,
        annotationsCreated: true,
        flashcardsReviewed: true,
        assessmentsTaken: true,
      },
    });

    // Get user activity metrics
    const [totalUsers, activeUsers7Days, activeUsers30Days] = await Promise.all(
      [
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.user.count({
          where: {
            deletedAt: null,
            updatedAt: { gte: sevenDaysAgo },
          },
        }),
        prisma.user.count({
          where: {
            deletedAt: null,
            updatedAt: { gte: thirtyDaysAgo },
          },
        }),
      ]
    );

    const inactiveUsers = totalUsers - activeUsers30Days;
    const avgReadingTimePerUser =
      totalUsers > 0
        ? Math.round(
            (allTimeMetrics._sum.totalReadingTimeMin ?? 0) / totalUsers
          )
        : 0;

    const analytics: EngagementAnalytics = {
      // Reading metrics
      totalReadingTimeMinutes: allTimeMetrics._sum.totalReadingTimeMin ?? 0,
      averageReadingTimePerUser: avgReadingTimePerUser,
      booksCompleted: allTimeMetrics._sum.booksCompleted ?? 0,
      booksAdded: allTimeMetrics._sum.booksAdded ?? 0,

      // Content creation
      annotationsCreated: allTimeMetrics._sum.annotationsCreated ?? 0,
      flashcardsCreated: allTimeMetrics._sum.flashcardsCreated ?? 0,
      flashcardsReviewed: allTimeMetrics._sum.flashcardsReviewed ?? 0,
      assessmentsTaken: allTimeMetrics._sum.assessmentsTaken ?? 0,

      // Social engagement
      forumPostsCreated: allTimeMetrics._sum.forumPostsCreated ?? 0,
      forumRepliesCreated: allTimeMetrics._sum.forumRepliesCreated ?? 0,
      groupsCreated: allTimeMetrics._sum.groupsCreated ?? 0,
      curriculumsCreated: allTimeMetrics._sum.curriculumsCreated ?? 0,

      // Daily engagement
      dailyEngagement: dailyAnalytics.map((day) => ({
        date: day.date.toISOString(),
        readingTime: day.totalReadingTimeMin,
        booksCompleted: day.booksCompleted,
        annotationsCreated: day.annotationsCreated,
        flashcardsReviewed: day.flashcardsReviewed,
        assessmentsTaken: day.assessmentsTaken,
      })),

      // User activity
      activeUsersLast7Days: activeUsers7Days,
      activeUsersLast30Days: activeUsers30Days,
      inactiveUsers,
    };

    logger.info("Admin engagement analytics fetched", {
      totalReadingTime: analytics.totalReadingTimeMinutes,
      activeUsers: activeUsers7Days,
    });

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error("Failed to fetch engagement analytics", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch engagement analytics",
      },
    });
  }
}

export default requireAdmin(handler);
