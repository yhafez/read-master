/**
 * GET /api/analytics/reading-time
 *
 * Returns reading time analytics for the authenticated user
 * - Daily reading time for the last 30/90/365 days
 * - Weekly and monthly aggregations
 * - Trends and comparisons
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";
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

// ============================================================================
// Validation Schema
// ============================================================================

const readingTimeQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
  groupBy: z.enum(["day", "week", "month"]).default("day"),
});

type ReadingTimeQuery = z.infer<typeof readingTimeQuerySchema>;

// ============================================================================
// Types
// ============================================================================

export interface ReadingTimeDataPoint {
  date: string; // ISO date string
  minutes: number;
  sessions: number;
  avgWpm: number | null;
}

export interface ReadingTimeResponse {
  data: ReadingTimeDataPoint[];
  summary: {
    totalMinutes: number;
    totalHours: number;
    avgMinutesPerDay: number;
    totalSessions: number;
    avgWpm: number | null;
  };
  period: string;
  groupBy: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getPeriodDays(period: string): number {
  switch (period) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "1y":
      return 365;
    default:
      return 30;
  }
}

function getDateRangeSQL(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateKey(date: Date, groupBy: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (groupBy === "day") {
    return `${year}-${month}-${day}`;
  } else if (groupBy === "week") {
    // Get ISO week number
    const firstDay = new Date(year, 0, 1);
    const days = Math.floor(
      (date.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000)
    );
    const week = Math.ceil((days + firstDay.getDay() + 1) / 7);
    return `${year}-W${String(week).padStart(2, "0")}`;
  } else {
    // month
    return `${year}-${month}`;
  }
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

  try {
    // Validate query parameters
    const validation = readingTimeQuerySchema.safeParse(req.query);
    if (!validation.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid query parameters",
        400,
        validation.error.flatten()
      );
      return;
    }

    const query: ReadingTimeQuery = validation.data;
    const { userId: clerkUserId } = req.auth;

    // Get user from database
    const user = await getUserByClerkId(clerkUserId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    logger.info("Fetching reading time analytics", {
      userId: user.id,
      period: query.period,
      groupBy: query.groupBy,
    });

    // Get date range
    const days = getPeriodDays(query.period);
    const startDate = getDateRangeSQL(days);

    // Get reading progress data
    const progressData = await db.readingProgress.findMany({
      where: {
        userId: user.id,
        lastReadAt: { gte: startDate },
      },
      select: {
        totalReadTime: true,
        lastReadAt: true,
        averageWpm: true,
      },
      orderBy: { lastReadAt: "asc" },
    });

    // Group data by date
    const dataMap = new Map<
      string,
      { minutes: number; count: number; totalWpm: number; wpmCount: number }
    >();

    for (const progress of progressData) {
      if (!progress.lastReadAt) continue;

      const dateKey = formatDateKey(progress.lastReadAt, query.groupBy);
      const existing = dataMap.get(dateKey) || {
        minutes: 0,
        count: 0,
        totalWpm: 0,
        wpmCount: 0,
      };

      existing.minutes += progress.totalReadTime || 0;
      existing.count += 1;

      if (progress.averageWpm) {
        existing.totalWpm += progress.averageWpm;
        existing.wpmCount += 1;
      }

      dataMap.set(dateKey, existing);
    }

    // Generate complete date range (fill gaps with zeros)
    const data: ReadingTimeDataPoint[] = [];
    const currentDate = new Date(startDate);
    const today = new Date();

    while (currentDate <= today) {
      const dateKey = formatDateKey(currentDate, query.groupBy);
      const entry = dataMap.get(dateKey);

      data.push({
        date: dateKey,
        minutes: entry ? Math.round(entry.minutes) : 0,
        sessions: entry ? entry.count : 0,
        avgWpm:
          entry && entry.wpmCount > 0
            ? Math.round(entry.totalWpm / entry.wpmCount)
            : null,
      });

      // Increment date based on groupBy
      if (query.groupBy === "day") {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (query.groupBy === "week") {
        currentDate.setDate(currentDate.getDate() + 7);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    // Calculate summary
    const totalMinutes = data.reduce((sum, d) => sum + d.minutes, 0);
    const totalSessions = data.reduce((sum, d) => sum + d.sessions, 0);
    const wpmEntries = data.filter((d) => d.avgWpm !== null);
    const avgWpm =
      wpmEntries.length > 0
        ? Math.round(
            wpmEntries.reduce((sum, d) => sum + (d.avgWpm || 0), 0) /
              wpmEntries.length
          )
        : null;

    const response: ReadingTimeResponse = {
      data,
      summary: {
        totalMinutes,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        avgMinutesPerDay: Math.round((totalMinutes / days) * 10) / 10,
        totalSessions,
        avgWpm,
      },
      period: query.period,
      groupBy: query.groupBy,
    };

    logger.info("Reading time analytics fetched", {
      userId: user.id,
      dataPoints: data.length,
      totalMinutes,
    });

    sendSuccess(res, response);
  } catch (error) {
    logger.error("Failed to fetch reading time analytics", {
      userId: req.auth.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch reading time analytics",
      500,
      {
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      }
    );
  }
}

export default withAuth(handler);
