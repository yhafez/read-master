/**
 * Admin Analytics Overview Endpoint
 *
 * GET /api/admin/analytics/overview
 *
 * Returns high-level platform metrics for admin dashboard.
 * Requires ADMIN or SUPER_ADMIN role.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "@read-master/database";
import { requireAdmin } from "../../../src/middleware/index.js";
import { logger } from "../../../src/utils/logger.js";

/**
 * Overview analytics data
 */
export type OverviewAnalytics = {
  // User metrics
  totalUsers: number;
  activeUsers: number; // Active in last 30 days
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;

  // Tier distribution
  freeUsers: number;
  proUsers: number;
  scholarUsers: number;

  // Revenue metrics (in cents)
  totalRevenue: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;

  // Content metrics
  totalBooks: number;
  totalAnnotations: number;
  totalFlashcards: number;
  totalCurriculums: number;

  // Engagement metrics
  totalReadingTimeMinutes: number;
  averageReadingTimePerUser: number;
  assessmentsTaken: number;
  flashcardsReviewed: number;

  // AI metrics
  aiRequestsToday: number;
  aiCostTodayCents: number;
  aiTokensToday: number;

  // Performance
  avgApiResponseMs: number;
  errorCount: number;
};

/**
 * Calculate date ranges for analytics
 */
function getDateRanges() {
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now);
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  return {
    now,
    startOfToday,
    startOfWeek,
    startOfMonth,
    thirtyDaysAgo,
  };
}

/**
 * Main handler
 */
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
    const dates = getDateRanges();

    // Get user metrics
    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      freeUsers,
      proUsers,
      scholarUsers,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({
        where: {
          deletedAt: null,
          updatedAt: { gte: dates.thirtyDaysAgo },
        },
      }),
      prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: dates.startOfToday },
        },
      }),
      prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: dates.startOfWeek },
        },
      }),
      prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: dates.startOfMonth },
        },
      }),
      prisma.user.count({
        where: { deletedAt: null, tier: "FREE" },
      }),
      prisma.user.count({
        where: { deletedAt: null, tier: "PRO" },
      }),
      prisma.user.count({
        where: { deletedAt: null, tier: "SCHOLAR" },
      }),
    ]);

    // Get content metrics
    const [totalBooks, totalAnnotations, totalFlashcards, totalCurriculums] =
      await Promise.all([
        prisma.book.count({ where: { deletedAt: null } }),
        prisma.annotation.count({ where: { deletedAt: null } }),
        prisma.flashcard.count({ where: { deletedAt: null } }),
        prisma.curriculum.count({ where: { deletedAt: null } }),
      ]);

    // Get daily analytics for recent periods
    const [todayAnalytics, weekAnalytics, monthAnalytics] = await Promise.all([
      prisma.dailyAnalytics.findFirst({
        where: { date: { gte: dates.startOfToday } },
        orderBy: { date: "desc" },
      }),
      prisma.dailyAnalytics.aggregate({
        where: { date: { gte: dates.startOfWeek } },
        _sum: {
          totalRevenueCents: true,
          newUsers: true,
          totalReadingTimeMin: true,
          assessmentsTaken: true,
          flashcardsReviewed: true,
          aiRequestsCount: true,
          aiCostCents: true,
          aiTokensUsed: true,
          errorCount: true,
        },
        _avg: {
          avgApiResponseMs: true,
        },
      }),
      prisma.dailyAnalytics.aggregate({
        where: { date: { gte: dates.startOfMonth } },
        _sum: {
          totalRevenueCents: true,
          newUsers: true,
          totalReadingTimeMin: true,
        },
      }),
    ]);

    // Get all-time metrics
    const allTimeAnalytics = await prisma.dailyAnalytics.aggregate({
      _sum: {
        totalRevenueCents: true,
        totalReadingTimeMin: true,
        assessmentsTaken: true,
        flashcardsReviewed: true,
      },
      _avg: {
        avgApiResponseMs: true,
      },
    });

    const analytics: OverviewAnalytics = {
      // User metrics
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,

      // Tier distribution
      freeUsers,
      proUsers,
      scholarUsers,

      // Revenue metrics (convert from cents)
      totalRevenue: allTimeAnalytics._sum.totalRevenueCents ?? 0,
      revenueToday: todayAnalytics?.totalRevenueCents ?? 0,
      revenueThisWeek: weekAnalytics._sum.totalRevenueCents ?? 0,
      revenueThisMonth: monthAnalytics._sum.totalRevenueCents ?? 0,

      // Content metrics
      totalBooks,
      totalAnnotations,
      totalFlashcards,
      totalCurriculums,

      // Engagement metrics
      totalReadingTimeMinutes: allTimeAnalytics._sum.totalReadingTimeMin ?? 0,
      averageReadingTimePerUser:
        totalUsers > 0
          ? Math.round(
              (allTimeAnalytics._sum.totalReadingTimeMin ?? 0) / totalUsers
            )
          : 0,
      assessmentsTaken: allTimeAnalytics._sum.assessmentsTaken ?? 0,
      flashcardsReviewed: allTimeAnalytics._sum.flashcardsReviewed ?? 0,

      // AI metrics
      aiRequestsToday: todayAnalytics?.aiRequestsCount ?? 0,
      aiCostTodayCents: todayAnalytics?.aiCostCents ?? 0,
      aiTokensToday: todayAnalytics?.aiTokensUsed ?? 0,

      // Performance
      avgApiResponseMs: Math.round(allTimeAnalytics._avg.avgApiResponseMs ?? 0),
      errorCount: weekAnalytics._sum.errorCount ?? 0,
    };

    logger.info("Admin analytics overview fetched", {
      totalUsers,
      activeUsers,
      revenue: analytics.totalRevenue,
    });

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error("Failed to fetch overview analytics", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch analytics overview",
      },
    });
  }
}

// Apply admin middleware
export default requireAdmin(handler);
