/**
 * Admin AI Costs Analytics Endpoint
 *
 * GET /api/admin/analytics/ai-costs
 *
 * Returns AI usage and cost metrics.
 * Requires ADMIN or SUPER_ADMIN role.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "@read-master/database";
import { requireAdmin } from "../../../src/middleware/index.js";
import { logger } from "../../../src/utils/logger.js";

export type AICostsAnalytics = {
  // Total costs (in cents)
  totalCostCents: number;
  costThisMonth: number;
  costLastMonth: number;
  costGrowth: number; // % change

  // Usage metrics
  totalRequests: number;
  totalTokens: number;
  averageCostPerRequest: number;
  averageTokensPerRequest: number;

  // Feature breakdown
  preReadingGuidesGenerated: number;
  explanationsGenerated: number;
  assessmentsGenerated: number;
  flashcardsGenerated: number;

  // Daily AI usage (last 30 days)
  dailyUsage: Array<{
    date: string;
    requests: number;
    tokens: number;
    costCents: number;
    preReadingGuides: number;
    explanations: number;
    assessments: number;
    flashcards: number;
  }>;

  // Cost efficiency metrics
  costPerUser: number; // Average cost per active user
  costPerFeature: {
    preReadingGuide: number;
    explanation: number;
    assessment: number;
    flashcard: number;
  };
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

    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfLastMonth = new Date(startOfMonth);
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

    // Get all-time AI metrics
    const allTimeMetrics = await prisma.dailyAnalytics.aggregate({
      _sum: {
        aiRequestsCount: true,
        aiTokensUsed: true,
        aiCostCents: true,
        preReadingGuidesGen: true,
        explanationsGen: true,
        assessmentsGen: true,
        flashcardsGen: true,
      },
    });

    // Get monthly costs
    const [thisMonthCost, lastMonthCost] = await Promise.all([
      prisma.dailyAnalytics.aggregate({
        where: { date: { gte: startOfMonth } },
        _sum: { aiCostCents: true },
      }),
      prisma.dailyAnalytics.aggregate({
        where: {
          date: { gte: startOfLastMonth, lt: startOfMonth },
        },
        _sum: { aiCostCents: true },
      }),
    ]);

    // Get daily AI usage
    const dailyAnalytics = await prisma.dailyAnalytics.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: "asc" },
      select: {
        date: true,
        aiRequestsCount: true,
        aiTokensUsed: true,
        aiCostCents: true,
        preReadingGuidesGen: true,
        explanationsGen: true,
        assessmentsGen: true,
        flashcardsGen: true,
      },
    });

    // Get active user count for cost per user
    const activeUsers = await prisma.user.count({
      where: {
        deletedAt: null,
        updatedAt: { gte: thirtyDaysAgo },
      },
    });

    const totalRequests = allTimeMetrics._sum.aiRequestsCount ?? 0;
    const totalCost = allTimeMetrics._sum.aiCostCents ?? 0;
    const thisMonth = thisMonthCost._sum.aiCostCents ?? 0;
    const lastMonth = lastMonthCost._sum.aiCostCents ?? 0;

    // Calculate feature costs (estimated)
    const totalFeatures =
      (allTimeMetrics._sum.preReadingGuidesGen ?? 0) +
      (allTimeMetrics._sum.explanationsGen ?? 0) +
      (allTimeMetrics._sum.assessmentsGen ?? 0) +
      (allTimeMetrics._sum.flashcardsGen ?? 0);

    const avgCostPerFeature = totalFeatures > 0 ? totalCost / totalFeatures : 0;

    const analytics: AICostsAnalytics = {
      // Total costs
      totalCostCents: totalCost,
      costThisMonth: thisMonth,
      costLastMonth: lastMonth,
      costGrowth:
        lastMonth > 0
          ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
          : 0,

      // Usage metrics
      totalRequests,
      totalTokens: allTimeMetrics._sum.aiTokensUsed ?? 0,
      averageCostPerRequest:
        totalRequests > 0 ? Math.round(totalCost / totalRequests) : 0,
      averageTokensPerRequest:
        totalRequests > 0
          ? Math.round((allTimeMetrics._sum.aiTokensUsed ?? 0) / totalRequests)
          : 0,

      // Feature breakdown
      preReadingGuidesGenerated: allTimeMetrics._sum.preReadingGuidesGen ?? 0,
      explanationsGenerated: allTimeMetrics._sum.explanationsGen ?? 0,
      assessmentsGenerated: allTimeMetrics._sum.assessmentsGen ?? 0,
      flashcardsGenerated: allTimeMetrics._sum.flashcardsGen ?? 0,

      // Daily usage
      dailyUsage: dailyAnalytics.map((day) => ({
        date: day.date.toISOString(),
        requests: day.aiRequestsCount,
        tokens: day.aiTokensUsed,
        costCents: day.aiCostCents,
        preReadingGuides: day.preReadingGuidesGen,
        explanations: day.explanationsGen,
        assessments: day.assessmentsGen,
        flashcards: day.flashcardsGen,
      })),

      // Cost efficiency
      costPerUser: activeUsers > 0 ? Math.round(totalCost / activeUsers) : 0,
      costPerFeature: {
        preReadingGuide: Math.round(avgCostPerFeature),
        explanation: Math.round(avgCostPerFeature),
        assessment: Math.round(avgCostPerFeature * 2), // Assessments cost more
        flashcard: Math.round(avgCostPerFeature * 1.5), // Flashcards cost slightly more
      },
    };

    logger.info("Admin AI costs analytics fetched", {
      totalCost,
      totalRequests,
      costThisMonth: thisMonth,
    });

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error("Failed to fetch AI costs analytics", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch AI costs analytics",
      },
    });
  }
}

export default requireAdmin(handler);
