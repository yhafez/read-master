/**
 * Admin User Analytics Endpoint
 *
 * GET /api/admin/analytics/users
 *
 * Returns detailed user growth and retention metrics.
 * Requires ADMIN or SUPER_ADMIN role.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "@read-master/database";
import { requireAdmin } from "../../../src/middleware/index.js";
import { logger } from "../../../src/utils/logger.js";

export type UserAnalytics = {
  // Current totals
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  scholarUsers: number;

  // Growth (last 30 days)
  newUsers: number;
  churnedUsers: number;
  netGrowth: number;

  // Engagement
  activeUsers: number; // Active in last 7 days
  activeRate: number; // % of total users
  averageSessionsPerUser: number;

  // Roles
  usersByRole: {
    USER: number;
    MODERATOR: number;
    ADMIN: number;
    SUPER_ADMIN: number;
  };

  // Daily growth data (last 30 days)
  dailyGrowth: Array<{
    date: string;
    newUsers: number;
    totalUsers: number;
    activeUsers: number;
    churned: number;
  }>;
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

    // Get user counts by tier
    const [totalUsers, freeUsers, proUsers, scholarUsers] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, tier: "FREE" } }),
      prisma.user.count({ where: { deletedAt: null, tier: "PRO" } }),
      prisma.user.count({ where: { deletedAt: null, tier: "SCHOLAR" } }),
    ]);

    // Get user counts by role
    const [userCount, modCount, adminCount, superAdminCount] =
      await Promise.all([
        prisma.user.count({ where: { deletedAt: null, role: "USER" } }),
        prisma.user.count({ where: { deletedAt: null, role: "MODERATOR" } }),
        prisma.user.count({ where: { deletedAt: null, role: "ADMIN" } }),
        prisma.user.count({ where: { deletedAt: null, role: "SUPER_ADMIN" } }),
      ]);

    // Get growth metrics
    const [newUsers, activeUsers] = await Promise.all([
      prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.user.count({
        where: {
          deletedAt: null,
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    // Get daily analytics for growth chart
    const dailyAnalytics = await prisma.dailyAnalytics.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: "asc" },
      select: {
        date: true,
        newUsers: true,
        totalUsers: true,
        activeUsers: true,
        churned: true,
      },
    });

    const analytics: UserAnalytics = {
      // Current totals
      totalUsers,
      freeUsers,
      proUsers,
      scholarUsers,

      // Growth
      newUsers,
      churnedUsers: dailyAnalytics.reduce((sum, day) => sum + day.churned, 0),
      netGrowth:
        newUsers - dailyAnalytics.reduce((sum, day) => sum + day.churned, 0),

      // Engagement
      activeUsers,
      activeRate:
        totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
      averageSessionsPerUser: 0, // TODO: Implement session tracking

      // Roles
      usersByRole: {
        USER: userCount,
        MODERATOR: modCount,
        ADMIN: adminCount,
        SUPER_ADMIN: superAdminCount,
      },

      // Daily growth data
      dailyGrowth: dailyAnalytics.map((day) => ({
        date: day.date.toISOString(),
        newUsers: day.newUsers,
        totalUsers: day.totalUsers,
        activeUsers: day.activeUsers,
        churned: day.churned,
      })),
    };

    logger.info("Admin user analytics fetched", {
      totalUsers,
      newUsers,
      activeUsers,
    });

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error("Failed to fetch user analytics", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch user analytics",
      },
    });
  }
}

export default requireAdmin(handler);
