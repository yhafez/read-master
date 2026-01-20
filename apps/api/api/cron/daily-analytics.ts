/**
 * Daily Analytics Cron Job
 *
 * Schedule: Daily at midnight UTC (configured in vercel.json)
 * Purpose: Aggregate platform metrics for the previous day and store in DailyAnalytics table
 *
 * Metrics collected:
 * - User metrics (total, active, new, churned, by tier)
 * - Revenue metrics (total, by type)
 * - Engagement metrics (books, reading time, assessments, flashcards, annotations)
 * - Social metrics (forum posts, groups, curriculums)
 * - AI usage metrics (requests, tokens, cost, by feature)
 * - Performance metrics (response times, errors)
 *
 * This endpoint is called by Vercel Cron.
 * It requires the CRON_SECRET header for authentication.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "@read-master/database";
import { logger } from "../../src/utils/logger.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Result of daily analytics calculation
 */
export type DailyAnalyticsResult = {
  date: Date;
  metricsCalculated: number;
  recordCreated: boolean;
  executionTimeMs: number;
};

/**
 * Daily analytics metrics to be stored
 */
export type DailyMetrics = {
  date: Date;

  // User metrics
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  churned: number;
  freeUsers: number;
  proUsers: number;
  scholarUsers: number;

  // Revenue metrics (in cents)
  totalRevenueCents: number;
  newSubscriptionsCents: number;
  renewalsCents: number;
  upgradesCents: number;
  refundsCents: number;

  // Engagement metrics
  booksAdded: number;
  booksCompleted: number;
  totalReadingTimeMin: number;
  assessmentsTaken: number;
  flashcardsCreated: number;
  flashcardsReviewed: number;
  annotationsCreated: number;
  forumPostsCreated: number;
  forumRepliesCreated: number;
  groupsCreated: number;
  curriculumsCreated: number;

  // AI usage metrics
  aiRequestsCount: number;
  aiTokensUsed: number;
  aiCostCents: number;
  preReadingGuidesGen: number;
  explanationsGen: number;
  assessmentsGen: number;
  flashcardsGen: number;

  // Performance metrics
  avgApiResponseMs: number | null;
  errorCount: number;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get date range for yesterday (midnight to midnight UTC)
 */
function getYesterdayDateRange(): { start: Date; end: Date; date: Date } {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(yesterday);
  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

  return {
    start: startOfYesterday,
    end: endOfYesterday,
    date: yesterday,
  };
}

/**
 * Calculate user metrics for the day
 */
async function calculateUserMetrics(
  startDate: Date,
  endDate: Date
): Promise<
  Pick<
    DailyMetrics,
    | "totalUsers"
    | "activeUsers"
    | "newUsers"
    | "churned"
    | "freeUsers"
    | "proUsers"
    | "scholarUsers"
  >
> {
  const [totalUsers, activeUsers, newUsers, freeUsers, proUsers, scholarUsers] =
    await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({
        where: {
          deletedAt: null,
          updatedAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.user.count({ where: { deletedAt: null, tier: "FREE" } }),
      prisma.user.count({ where: { deletedAt: null, tier: "PRO" } }),
      prisma.user.count({ where: { deletedAt: null, tier: "SCHOLAR" } }),
    ]);

  // Calculate churned users (users deleted on this day)
  const churned = await prisma.user.count({
    where: {
      deletedAt: { gte: startDate, lte: endDate },
    },
  });

  return {
    totalUsers,
    activeUsers,
    newUsers,
    churned,
    freeUsers,
    proUsers,
    scholarUsers,
  };
}

/**
 * Calculate revenue metrics for the day
 * Note: This is a placeholder. Real implementation would query payment/subscription tables.
 */
async function calculateRevenueMetrics(): Promise<
  Pick<
    DailyMetrics,
    | "totalRevenueCents"
    | "newSubscriptionsCents"
    | "renewalsCents"
    | "upgradesCents"
    | "refundsCents"
  >
> {
  // TODO: Implement actual revenue tracking when payment system is integrated
  // For now, return zeros as placeholder
  return {
    totalRevenueCents: 0,
    newSubscriptionsCents: 0,
    renewalsCents: 0,
    upgradesCents: 0,
    refundsCents: 0,
  };
}

/**
 * Calculate engagement metrics for the day
 */
async function calculateEngagementMetrics(
  startDate: Date,
  endDate: Date
): Promise<
  Pick<
    DailyMetrics,
    | "booksAdded"
    | "booksCompleted"
    | "totalReadingTimeMin"
    | "assessmentsTaken"
    | "flashcardsCreated"
    | "flashcardsReviewed"
    | "annotationsCreated"
    | "forumPostsCreated"
    | "forumRepliesCreated"
    | "groupsCreated"
    | "curriculumsCreated"
  >
> {
  const [
    booksAdded,
    booksCompleted,
    assessmentsTaken,
    flashcardsCreated,
    flashcardsReviewed,
    annotationsCreated,
    forumPostsCreated,
    forumRepliesCreated,
    groupsCreated,
    curriculumsCreated,
  ] = await Promise.all([
    prisma.book.count({
      where: {
        deletedAt: null,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.book.count({
      where: {
        deletedAt: null,
        status: "COMPLETED",
        updatedAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.assessment.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.flashcard.count({
      where: {
        deletedAt: null,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.flashcardReview.count(),
    prisma.annotation.count({
      where: {
        deletedAt: null,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.forumPost.count({
      where: {
        deletedAt: null,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.forumReply.count({
      where: {
        deletedAt: null,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.readingGroup.count({
      where: {
        deletedAt: null,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.curriculum.count({
      where: {
        deletedAt: null,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  // Calculate total reading time (sum of all reading sessions on this day)
  // Note: totalReadTime is in seconds, convert to minutes
  const readingTimeResult = await prisma.readingProgress.aggregate({
    where: {
      updatedAt: { gte: startDate, lte: endDate },
    },
    _sum: {
      totalReadTime: true,
    },
  });

  const totalReadingTimeMin = readingTimeResult._sum?.totalReadTime
    ? Math.round(readingTimeResult._sum.totalReadTime / 60)
    : 0;

  return {
    booksAdded,
    booksCompleted,
    totalReadingTimeMin,
    assessmentsTaken,
    flashcardsCreated,
    flashcardsReviewed,
    annotationsCreated,
    forumPostsCreated,
    forumRepliesCreated,
    groupsCreated,
    curriculumsCreated,
  };
}

/**
 * Calculate AI usage metrics for the day
 */
async function calculateAIMetrics(
  startDate: Date,
  endDate: Date
): Promise<
  Pick<
    DailyMetrics,
    | "aiRequestsCount"
    | "aiTokensUsed"
    | "aiCostCents"
    | "preReadingGuidesGen"
    | "explanationsGen"
    | "assessmentsGen"
    | "flashcardsGen"
  >
> {
  const aiUsageLogs = await prisma.aIUsageLog.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      totalTokens: true,
      cost: true,
      operation: true,
    },
  });

  const aiRequestsCount = aiUsageLogs.length;
  const aiTokensUsed = aiUsageLogs.reduce(
    (sum, log) => sum + log.totalTokens,
    0
  );
  // Convert cost from Decimal (USD) to cents
  const aiCostCents = aiUsageLogs.reduce(
    (sum, log) => sum + Math.round(Number(log.cost) * 100),
    0
  );

  // Count by operation type
  const preReadingGuidesGen = aiUsageLogs.filter(
    (log) => log.operation === "pre_reading_guide"
  ).length;
  const explanationsGen = aiUsageLogs.filter(
    (log) => log.operation === "explain"
  ).length;
  const assessmentsGen = aiUsageLogs.filter(
    (log) => log.operation === "assessment"
  ).length;
  const flashcardsGen = aiUsageLogs.filter(
    (log) => log.operation === "flashcards"
  ).length;

  return {
    aiRequestsCount,
    aiTokensUsed,
    aiCostCents,
    preReadingGuidesGen,
    explanationsGen,
    assessmentsGen,
    flashcardsGen,
  };
}

/**
 * Calculate performance metrics for the day
 * Note: This is a placeholder. Real implementation would query monitoring/logging system.
 */
async function calculatePerformanceMetrics(): Promise<
  Pick<DailyMetrics, "avgApiResponseMs" | "errorCount">
> {
  // TODO: Implement actual performance tracking when monitoring is set up
  // For now, return null/0 as placeholder
  return {
    avgApiResponseMs: null,
    errorCount: 0,
  };
}

/**
 * Calculate all metrics for a given day
 */
export async function calculateDailyMetrics(date: Date): Promise<DailyMetrics> {
  const { start, end } = getYesterdayDateRange();

  logger.info("Calculating daily metrics", {
    date: date.toISOString(),
    start: start.toISOString(),
    end: end.toISOString(),
  });

  const [
    userMetrics,
    revenueMetrics,
    engagementMetrics,
    aiMetrics,
    performanceMetrics,
  ] = await Promise.all([
    calculateUserMetrics(start, end),
    calculateRevenueMetrics(),
    calculateEngagementMetrics(start, end),
    calculateAIMetrics(start, end),
    calculatePerformanceMetrics(),
  ]);

  return {
    date,
    ...userMetrics,
    ...revenueMetrics,
    ...engagementMetrics,
    ...aiMetrics,
    ...performanceMetrics,
  };
}

/**
 * Store daily metrics in the database
 */
export async function storeDailyMetrics(metrics: DailyMetrics): Promise<void> {
  await prisma.dailyAnalytics.upsert({
    where: { date: metrics.date },
    create: metrics,
    update: metrics,
  });

  logger.info("Daily metrics stored", {
    date: metrics.date.toISOString(),
    totalUsers: metrics.totalUsers,
    activeUsers: metrics.activeUsers,
    newUsers: metrics.newUsers,
  });
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Main cron job handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const startTime = Date.now();

  // Verify cron secret for security
  const cronSecret =
    req.headers["x-cron-secret"] || req.headers["authorization"];
  if (cronSecret !== process.env.CRON_SECRET) {
    logger.warn("Unauthorized cron job attempt", {
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
    });

    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid cron secret",
      },
    });
    return;
  }

  try {
    const { date } = getYesterdayDateRange();

    logger.info("Starting daily analytics cron job", {
      date: date.toISOString(),
    });

    // Calculate metrics for yesterday
    const metrics = await calculateDailyMetrics(date);

    // Store in database
    await storeDailyMetrics(metrics);

    const executionTimeMs = Date.now() - startTime;

    const result: DailyAnalyticsResult = {
      date,
      metricsCalculated: Object.keys(metrics).length - 1, // Exclude 'date' field
      recordCreated: true,
      executionTimeMs,
    };

    logger.info("Daily analytics cron job completed", {
      ...result,
      totalUsers: metrics.totalUsers,
      activeUsers: metrics.activeUsers,
      newUsers: metrics.newUsers,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    logger.error("Daily analytics cron job failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      executionTimeMs,
    });

    // TODO: Send notification on failure (email, Slack, etc.)

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to calculate daily analytics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}
