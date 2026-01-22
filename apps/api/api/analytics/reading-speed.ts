/**
 * GET /api/analytics/reading-speed
 *
 * Returns reading speed analytics for the authenticated user
 * - Daily WPM trends
 * - Speed by book/genre
 * - Improvement over time
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

const readingSpeedQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
});

type ReadingSpeedQuery = z.infer<typeof readingSpeedQuerySchema>;

// ============================================================================
// Types
// ============================================================================

export interface SpeedDataPoint {
  date: string;
  avgWpm: number;
  minWpm: number | null;
  maxWpm: number | null;
  sessions: number;
}

export interface SpeedByGenre {
  genre: string;
  avgWpm: number;
  sessionsCount: number;
}

export interface ReadingSpeedResponse {
  trends: SpeedDataPoint[];
  byGenre: SpeedByGenre[];
  summary: {
    currentAvgWpm: number;
    overallAvgWpm: number;
    improvementPercent: number | null;
    fastestWpm: number | null;
    slowestWpm: number | null;
  };
  period: string;
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

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    const validation = readingSpeedQuerySchema.safeParse(req.query);
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

    const query: ReadingSpeedQuery = validation.data;
    const { userId: clerkUserId } = req.auth;

    // Get user from database
    const user = await getUserByClerkId(clerkUserId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    logger.info("Fetching reading speed analytics", {
      userId: user.id,
      period: query.period,
    });

    // Get date range
    const days = getPeriodDays(query.period);
    const startDate = getDateRangeSQL(days);

    // Get reading progress with WPM data
    const progressData = await db.readingProgress.findMany({
      where: {
        userId: user.id,
        lastReadAt: { gte: startDate },
        averageWpm: { not: null },
      },
      select: {
        averageWpm: true,
        lastReadAt: true,
        book: {
          select: {
            genre: true,
          },
        },
      },
      orderBy: { lastReadAt: "asc" },
    });

    // Group by date for trends
    const dateMap = new Map<string, { wpms: number[]; sessions: number }>();

    // Group by genre
    const genreMap = new Map<string, { wpms: number[]; sessions: number }>();

    for (const progress of progressData) {
      if (!progress.lastReadAt || !progress.averageWpm) continue;

      // By date
      const dateKey = formatDate(progress.lastReadAt);
      const dateEntry = dateMap.get(dateKey) || { wpms: [], sessions: 0 };
      dateEntry.wpms.push(progress.averageWpm);
      dateEntry.sessions += 1;
      dateMap.set(dateKey, dateEntry);

      // By genre
      const genre = progress.book?.genre || "Unknown";
      const genreEntry = genreMap.get(genre) || { wpms: [], sessions: 0 };
      genreEntry.wpms.push(progress.averageWpm);
      genreEntry.sessions += 1;
      genreMap.set(genre, genreEntry);
    }

    // Build trends data
    const trends: SpeedDataPoint[] = [];
    const currentDate = new Date(startDate);
    const today = new Date();

    while (currentDate <= today) {
      const dateKey = formatDate(currentDate);
      const entry = dateMap.get(dateKey);

      if (entry && entry.wpms.length > 0) {
        const avgWpm = Math.round(
          entry.wpms.reduce((sum, wpm) => sum + wpm, 0) / entry.wpms.length
        );
        trends.push({
          date: dateKey,
          avgWpm,
          minWpm: Math.min(...entry.wpms),
          maxWpm: Math.max(...entry.wpms),
          sessions: entry.sessions,
        });
      } else {
        trends.push({
          date: dateKey,
          avgWpm: 0,
          minWpm: null,
          maxWpm: null,
          sessions: 0,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Build genre data
    const byGenre: SpeedByGenre[] = Array.from(genreMap.entries())
      .map(([genre, data]) => ({
        genre,
        avgWpm: Math.round(
          data.wpms.reduce((sum, wpm) => sum + wpm, 0) / data.wpms.length
        ),
        sessionsCount: data.sessions,
      }))
      .sort((a, b) => b.avgWpm - a.avgWpm)
      .slice(0, 10); // Top 10 genres

    // Calculate summary
    const allWpms = progressData
      .map((p) => p.averageWpm)
      .filter((wpm): wpm is number => wpm !== null);

    const overallAvgWpm =
      allWpms.length > 0
        ? Math.round(
            allWpms.reduce((sum, wpm) => sum + wpm, 0) / allWpms.length
          )
        : 0;

    // Current average (last 7 days)
    const sevenDaysAgo = getDateRangeSQL(7);
    const recentWpms = progressData
      .filter(
        (p) => p.lastReadAt && p.lastReadAt >= sevenDaysAgo && p.averageWpm
      )
      .map((p) => p.averageWpm!)
      .filter((wpm): wpm is number => wpm !== null);

    const currentAvgWpm =
      recentWpms.length > 0
        ? Math.round(
            recentWpms.reduce((sum, wpm) => sum + wpm, 0) / recentWpms.length
          )
        : overallAvgWpm;

    // Calculate improvement
    const firstHalfEnd = new Date(startDate);
    firstHalfEnd.setDate(firstHalfEnd.getDate() + Math.floor(days / 2));

    const firstHalfWpms = progressData
      .filter(
        (p) =>
          p.lastReadAt &&
          p.lastReadAt >= startDate &&
          p.lastReadAt < firstHalfEnd &&
          p.averageWpm
      )
      .map((p) => p.averageWpm!)
      .filter((wpm): wpm is number => wpm !== null);

    const secondHalfWpms = progressData
      .filter(
        (p) => p.lastReadAt && p.lastReadAt >= firstHalfEnd && p.averageWpm
      )
      .map((p) => p.averageWpm!)
      .filter((wpm): wpm is number => wpm !== null);

    const firstAvg =
      firstHalfWpms.length > 0
        ? firstHalfWpms.reduce((sum, wpm) => sum + wpm, 0) /
          firstHalfWpms.length
        : null;

    const secondAvg =
      secondHalfWpms.length > 0
        ? secondHalfWpms.reduce((sum, wpm) => sum + wpm, 0) /
          secondHalfWpms.length
        : null;

    const improvementPercent =
      firstAvg && secondAvg && firstAvg > 0
        ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100)
        : null;

    const response: ReadingSpeedResponse = {
      trends,
      byGenre,
      summary: {
        currentAvgWpm,
        overallAvgWpm,
        improvementPercent,
        fastestWpm: allWpms.length > 0 ? Math.max(...allWpms) : null,
        slowestWpm: allWpms.length > 0 ? Math.min(...allWpms) : null,
      },
      period: query.period,
    };

    logger.info("Reading speed analytics fetched", {
      userId: user.id,
      dataPoints: trends.length,
      currentAvgWpm,
    });

    sendSuccess(res, response);
  } catch (error) {
    logger.error("Failed to fetch reading speed analytics", {
      userId: req.auth.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch reading speed analytics",
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
