/**
 * Admin Revenue Analytics Endpoint
 *
 * GET /api/admin/analytics/revenue
 *
 * Returns revenue metrics and subscription data.
 * Requires ADMIN or SUPER_ADMIN role.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "@read-master/database";
import { requireAdmin } from "../../../src/middleware/index.js";
import { logger } from "../../../src/utils/logger.js";

export type RevenueAnalytics = {
  // Total revenue (in cents)
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueGrowth: number; // % change

  // Subscriptions
  totalSubscriptions: number;
  proSubscriptions: number;
  scholarSubscriptions: number;

  // Revenue breakdown
  newSubscriptionsRevenue: number;
  renewalsRevenue: number;
  upgradesRevenue: number;
  refundsRevenue: number;

  // Daily revenue data (last 30 days)
  dailyRevenue: Array<{
    date: string;
    totalRevenue: number;
    newSubscriptions: number;
    renewals: number;
    upgrades: number;
    refunds: number;
  }>;

  // MRR (Monthly Recurring Revenue)
  mrr: number;
  arrProjection: number; // Annual Recurring Revenue projection
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

    const endOfLastMonth = new Date(startOfMonth);
    endOfLastMonth.setDate(0);

    // Get subscription counts
    const [totalSubscriptions, proSubscriptions, scholarSubscriptions] =
      await Promise.all([
        prisma.user.count({
          where: {
            deletedAt: null,
            tier: { not: "FREE" },
          },
        }),
        prisma.user.count({
          where: { deletedAt: null, tier: "PRO" },
        }),
        prisma.user.count({
          where: { deletedAt: null, tier: "SCHOLAR" },
        }),
      ]);

    // Get revenue metrics
    const [allTimeRevenue, thisMonthRevenue, lastMonthRevenue] =
      await Promise.all([
        prisma.dailyAnalytics.aggregate({
          _sum: {
            totalRevenueCents: true,
            newSubscriptionsCents: true,
            renewalsCents: true,
            upgradesCents: true,
            refundsCents: true,
          },
        }),
        prisma.dailyAnalytics.aggregate({
          where: { date: { gte: startOfMonth } },
          _sum: {
            totalRevenueCents: true,
          },
        }),
        prisma.dailyAnalytics.aggregate({
          where: {
            date: { gte: startOfLastMonth, lt: startOfMonth },
          },
          _sum: {
            totalRevenueCents: true,
          },
        }),
      ]);

    // Get daily revenue data
    const dailyAnalytics = await prisma.dailyAnalytics.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: "asc" },
      select: {
        date: true,
        totalRevenueCents: true,
        newSubscriptionsCents: true,
        renewalsCents: true,
        upgradesCents: true,
        refundsCents: true,
      },
    });

    const thisMonth = thisMonthRevenue._sum.totalRevenueCents ?? 0;
    const lastMonth = lastMonthRevenue._sum.totalRevenueCents ?? 0;

    // Calculate MRR (assuming PRO = $9.99/month = 999 cents, SCHOLAR = $19.99/month = 1999 cents)
    const mrr = proSubscriptions * 999 + scholarSubscriptions * 1999;

    const analytics: RevenueAnalytics = {
      // Total revenue
      totalRevenue: allTimeRevenue._sum.totalRevenueCents ?? 0,
      revenueThisMonth: thisMonth,
      revenueLastMonth: lastMonth,
      revenueGrowth:
        lastMonth > 0
          ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
          : 0,

      // Subscriptions
      totalSubscriptions,
      proSubscriptions,
      scholarSubscriptions,

      // Revenue breakdown
      newSubscriptionsRevenue: allTimeRevenue._sum.newSubscriptionsCents ?? 0,
      renewalsRevenue: allTimeRevenue._sum.renewalsCents ?? 0,
      upgradesRevenue: allTimeRevenue._sum.upgradesCents ?? 0,
      refundsRevenue: allTimeRevenue._sum.refundsCents ?? 0,

      // Daily revenue
      dailyRevenue: dailyAnalytics.map((day) => ({
        date: day.date.toISOString(),
        totalRevenue: day.totalRevenueCents,
        newSubscriptions: day.newSubscriptionsCents,
        renewals: day.renewalsCents,
        upgrades: day.upgradesCents,
        refunds: day.refundsCents,
      })),

      // MRR
      mrr,
      arrProjection: mrr * 12,
    };

    logger.info("Admin revenue analytics fetched", {
      totalRevenue: analytics.totalRevenue,
      mrr,
    });

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error("Failed to fetch revenue analytics", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch revenue analytics",
      },
    });
  }
}

export default requireAdmin(handler);
