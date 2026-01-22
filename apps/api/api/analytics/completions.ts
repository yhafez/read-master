/**
 * GET /api/analytics/completions
 *
 * Returns book completion analytics for the authenticated user
 * - Books completed over time
 * - Completion rate
 * - Books by status
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

const completionsQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d", "1y", "all"]).default("1y"),
});

type CompletionsQuery = z.infer<typeof completionsQuerySchema>;

// ============================================================================
// Types
// ============================================================================

export interface CompletionDataPoint {
  date: string; // YYYY-MM format for grouping
  completed: number;
  started: number;
  abandoned: number;
}

export interface BooksByStatus {
  status: string;
  count: number;
  percentage: number;
}

export interface CompletionsResponse {
  monthlyData: CompletionDataPoint[];
  byStatus: BooksByStatus[];
  byGenre: {
    genre: string;
    completed: number;
    inProgress: number;
  }[];
  summary: {
    totalCompleted: number;
    totalInProgress: number;
    totalAbandoned: number;
    totalWantToRead: number;
    completionRate: number; // percentage of books started that were completed
    avgTimeToComplete: number | null; // days
  };
  period: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getPeriodDays(period: string): number | null {
  switch (period) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "1y":
      return 365;
    case "all":
      return null;
    default:
      return 365;
  }
}

function getDateRangeSQL(days: number | null): Date | null {
  if (days === null) return null;
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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
    const validation = completionsQuerySchema.safeParse(req.query);
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

    const query: CompletionsQuery = validation.data;
    const { userId: clerkUserId } = req.auth;

    // Get user from database
    const user = await getUserByClerkId(clerkUserId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    logger.info("Fetching completions analytics", {
      userId: user.id,
      period: query.period,
    });

    // Get date range
    const days = getPeriodDays(query.period);
    const startDate = getDateRangeSQL(days);

    // Build where clause
    const whereClause = startDate
      ? {
          userId: user.id,
          deletedAt: null,
          updatedAt: { gte: startDate },
        }
      : {
          userId: user.id,
          deletedAt: null,
        };

    // Get all books with status changes
    const books = await db.book.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        genre: true,
        createdAt: true,
        updatedAt: true,
        readingProgress: {
          select: {
            lastReadAt: true,
            percentage: true,
          },
        },
      },
      orderBy: { updatedAt: "asc" },
    });

    // Group by month
    const monthMap = new Map<
      string,
      { completed: number; started: number; abandoned: number }
    >();

    // Track by status
    const statusCounts: Record<string, number> = {
      COMPLETED: 0,
      READING: 0,
      WANT_TO_READ: 0,
      ABANDONED: 0,
    };

    // Track by genre
    const genreMap = new Map<
      string,
      { completed: number; inProgress: number }
    >();

    // Track completion times
    const completionTimes: number[] = [];

    for (const book of books) {
      // Count by status
      statusCounts[book.status] = (statusCounts[book.status] || 0) + 1;

      // Group by month based on when status changed
      const monthKey = formatMonthKey(book.updatedAt);
      const monthEntry = monthMap.get(monthKey) || {
        completed: 0,
        started: 0,
        abandoned: 0,
      };

      if (book.status === "COMPLETED") {
        monthEntry.completed += 1;

        // Calculate completion time if we have progress data
        if (
          book.readingProgress.length > 0 &&
          book.readingProgress[0] &&
          book.readingProgress[0].lastReadAt
        ) {
          const startedAt = book.createdAt;
          const completedAt = book.readingProgress[0].lastReadAt;
          const days = Math.ceil(
            (completedAt.getTime() - startedAt.getTime()) /
              (1000 * 60 * 60 * 24)
          );
          if (days > 0 && days < 365) {
            // Filter out unrealistic values
            completionTimes.push(days);
          }
        }
      } else if (book.status === "READING") {
        monthEntry.started += 1;
      } else if (book.status === "ABANDONED") {
        monthEntry.abandoned += 1;
      }

      monthMap.set(monthKey, monthEntry);

      // Track by genre
      const genre = book.genre || "Unknown";
      const genreEntry = genreMap.get(genre) || { completed: 0, inProgress: 0 };
      if (book.status === "COMPLETED") {
        genreEntry.completed += 1;
      } else if (book.status === "READING") {
        genreEntry.inProgress += 1;
      }
      genreMap.set(genre, genreEntry);
    }

    // Build monthly data array
    const monthlyData = Array.from(monthMap.entries())
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate percentages for status
    const totalBooks = books.length;
    const byStatus: BooksByStatus[] = Object.entries(statusCounts).map(
      ([status, count]) => ({
        status,
        count,
        percentage: totalBooks > 0 ? Math.round((count / totalBooks) * 100) : 0,
      })
    );

    // Top 10 genres
    const byGenre = Array.from(genreMap.entries())
      .map(([genre, data]) => ({
        genre,
        ...data,
      }))
      .sort((a, b) => b.completed + b.inProgress - (a.completed + a.inProgress))
      .slice(0, 10);

    // Calculate completion rate
    const completed = statusCounts.COMPLETED || 0;
    const reading = statusCounts.READING || 0;
    const abandoned = statusCounts.ABANDONED || 0;
    const wantToRead = statusCounts.WANT_TO_READ || 0;

    const totalStarted = completed + reading + abandoned;
    const completionRate =
      totalStarted > 0 ? Math.round((completed / totalStarted) * 100) : 0;

    // Calculate average time to complete
    const avgTimeToComplete =
      completionTimes.length > 0
        ? Math.round(
            completionTimes.reduce((sum, days) => sum + days, 0) /
              completionTimes.length
          )
        : null;

    const response: CompletionsResponse = {
      monthlyData,
      byStatus,
      byGenre,
      summary: {
        totalCompleted: completed,
        totalInProgress: reading,
        totalAbandoned: abandoned,
        totalWantToRead: wantToRead,
        completionRate,
        avgTimeToComplete,
      },
      period: query.period,
    };

    logger.info("Completions analytics fetched", {
      userId: user.id,
      totalCompleted: completed,
      completionRate,
    });

    sendSuccess(res, response);
  } catch (error) {
    logger.error("Failed to fetch completions analytics", {
      userId: req.auth.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch completions analytics",
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
