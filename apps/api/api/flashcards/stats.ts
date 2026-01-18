/**
 * GET /api/flashcards/stats - Get flashcard statistics
 *
 * Returns comprehensive statistics about the user's flashcard collection,
 * including retention rate, card counts by status, review history, and streak.
 *
 * @example
 * ```bash
 * # Get all flashcard stats
 * curl -X GET "/api/flashcards/stats" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Get stats for a specific book
 * curl -X GET "/api/flashcards/stats?bookId=cm123..." \
 *   -H "Authorization: Bearer <token>"
 *
 * # Get stats for a specific time period
 * curl -X GET "/api/flashcards/stats?days=30" \
 *   -H "Authorization: Bearer <token>"
 * ```
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
// Constants
// ============================================================================

/**
 * Default number of days for review history
 */
export const DEFAULT_HISTORY_DAYS = 30;

/**
 * Maximum number of days for review history
 */
export const MAX_HISTORY_DAYS = 365;

/**
 * Minimum number of days for review history
 */
export const MIN_HISTORY_DAYS = 1;

/**
 * Flashcard statuses for counting
 */
export const FLASHCARD_STATUSES = [
  "NEW",
  "LEARNING",
  "REVIEW",
  "SUSPENDED",
] as const;

// ============================================================================
// Schemas
// ============================================================================

/**
 * Query parameters for stats endpoint
 */
export const statsQuerySchema = z.object({
  bookId: z.string().cuid().optional(),
  days: z.coerce
    .number()
    .int()
    .min(MIN_HISTORY_DAYS)
    .max(MAX_HISTORY_DAYS)
    .optional()
    .default(DEFAULT_HISTORY_DAYS),
});

export type StatsQueryInput = z.infer<typeof statsQuerySchema>;

// ============================================================================
// Types
// ============================================================================

/**
 * Card counts by status
 */
export type StatusCounts = {
  new: number;
  learning: number;
  review: number;
  suspended: number;
  total: number;
};

/**
 * Review history entry for a single day
 */
export type ReviewHistoryEntry = {
  date: string; // ISO date string (YYYY-MM-DD)
  reviewed: number;
  correct: number; // Ratings 3-4
  incorrect: number; // Ratings 1-2
};

/**
 * Streak information
 */
export type StreakInfo = {
  current: number; // Current consecutive days with reviews
  longest: number; // Longest streak ever
  lastReviewDate: string | null; // ISO date string
};

/**
 * Response data structure
 */
export type FlashcardStatsResponse = {
  retentionRate: number; // Percentage (0-100)
  statusCounts: StatusCounts;
  reviewHistory: ReviewHistoryEntry[];
  streak: StreakInfo;
  totalReviews: number;
  averageEaseFactor: number;
  averageInterval: number;
  masteredCount: number; // Cards with 5+ repetitions and 21+ day interval
  dueCount: number; // Cards due now
  overdueCount: number; // Cards overdue
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get start of day in UTC for a given date
 */
export function getStartOfDayUTC(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
}

/**
 * Format date as YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  const isoString = date.toISOString();
  const datePart = isoString.split("T")[0];
  // datePart is always defined for valid ISO strings, but TypeScript needs assurance
  return datePart ?? isoString.substring(0, 10);
}

/**
 * Calculate retention rate from correct and total reviews
 * Retention rate = (correct reviews / total reviews) * 100
 * Correct reviews are ratings 3 (Good) and 4 (Easy)
 */
export function calculateRetentionRate(
  correctReviews: number,
  totalReviews: number
): number {
  if (totalReviews === 0) {
    return 0;
  }
  const rate = (correctReviews / totalReviews) * 100;
  // Round to 2 decimal places
  return Math.round(rate * 100) / 100;
}

/**
 * Calculate current streak from review history
 * A streak is consecutive days with at least one review
 */
export function calculateStreak(
  reviewDates: Date[],
  today: Date = new Date()
): { current: number; longest: number; lastReviewDate: string | null } {
  if (reviewDates.length === 0) {
    return { current: 0, longest: 0, lastReviewDate: null };
  }

  // Sort dates descending (most recent first)
  const sortedDates = [...reviewDates].sort(
    (a, b) => b.getTime() - a.getTime()
  );

  // Get unique days (in UTC)
  const uniqueDays = new Set<string>();
  for (const date of sortedDates) {
    uniqueDays.add(formatDateString(date));
  }
  const sortedUniqueDays = [...uniqueDays].sort().reverse();

  const firstDay = sortedUniqueDays[0];
  if (sortedUniqueDays.length === 0 || !firstDay) {
    return { current: 0, longest: 0, lastReviewDate: null };
  }

  const lastReviewDate: string = firstDay;

  // Calculate current streak
  let currentStreak = 0;
  const todayStr = formatDateString(getStartOfDayUTC(today));
  const yesterdayDate = new Date(today);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterdayStr = formatDateString(getStartOfDayUTC(yesterdayDate));

  // Current streak must include today or yesterday
  if (lastReviewDate !== todayStr && lastReviewDate !== yesterdayStr) {
    currentStreak = 0;
  } else {
    // Count consecutive days
    const checkDate = new Date(lastReviewDate);
    for (const dayStr of sortedUniqueDays) {
      const expectedStr = formatDateString(checkDate);
      if (dayStr === expectedStr) {
        currentStreak++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  // Sort ascending for longest streak calculation
  const ascendingDays = [...sortedUniqueDays].sort();
  for (const dayStr of ascendingDays) {
    const currentDate = new Date(dayStr + "T00:00:00Z");

    if (prevDate === null) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round(
        (currentDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = currentDate;
  }

  return { current: currentStreak, longest: longestStreak, lastReviewDate };
}

/**
 * Check if a card is mastered (5+ repetitions and 21+ day interval)
 */
export function isMastered(repetitions: number, interval: number): boolean {
  return repetitions >= 5 && interval >= 21;
}

/**
 * Build review history from review records
 */
export function buildReviewHistory(
  reviews: Array<{ reviewedAt: Date; rating: number }>,
  days: number,
  today: Date = new Date()
): ReviewHistoryEntry[] {
  const history: ReviewHistoryEntry[] = [];
  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - days + 1);

  // Initialize all days with zeros
  const dayMap = new Map<
    string,
    { reviewed: number; correct: number; incorrect: number }
  >();
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + i);
    const dateStr = formatDateString(getStartOfDayUTC(date));
    dayMap.set(dateStr, { reviewed: 0, correct: 0, incorrect: 0 });
  }

  // Populate with actual review data
  for (const review of reviews) {
    const dateStr = formatDateString(getStartOfDayUTC(review.reviewedAt));
    const entry = dayMap.get(dateStr);
    if (entry) {
      entry.reviewed++;
      if (review.rating >= 3) {
        entry.correct++;
      } else {
        entry.incorrect++;
      }
    }
  }

  // Convert to array
  const sortedDates = [...dayMap.keys()].sort();
  for (const dateStr of sortedDates) {
    const entry = dayMap.get(dateStr);
    if (entry) {
      history.push({
        date: dateStr,
        reviewed: entry.reviewed,
        correct: entry.correct,
        incorrect: entry.incorrect,
      });
    }
  }

  return history;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET /api/flashcards/stats
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET
  if (req.method !== "GET") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET.",
      405
    );
    return;
  }

  const { userId: clerkUserId } = req.auth;

  try {
    // Get user from database
    const user = await getUserByClerkId(clerkUserId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Validate query parameters
    const validationResult = statsQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid query parameters",
        400,
        validationResult.error.flatten()
      );
      return;
    }

    const query = validationResult.data;
    const now = new Date();

    // If bookId is provided, verify user owns the book
    if (query.bookId) {
      const book = await db.book.findFirst({
        where: {
          id: query.bookId,
          userId: user.id,
          deletedAt: null,
        },
      });

      if (!book) {
        sendError(
          res,
          ErrorCodes.NOT_FOUND,
          "Book not found or you do not have access",
          404
        );
        return;
      }
    }

    // Build base where clause
    const baseWhere = {
      userId: user.id,
      deletedAt: null,
      ...(query.bookId && { bookId: query.bookId }),
    };

    // Get status counts
    const [newCount, learningCount, reviewCount, suspendedCount] =
      await Promise.all([
        db.flashcard.count({ where: { ...baseWhere, status: "NEW" } }),
        db.flashcard.count({ where: { ...baseWhere, status: "LEARNING" } }),
        db.flashcard.count({ where: { ...baseWhere, status: "REVIEW" } }),
        db.flashcard.count({ where: { ...baseWhere, status: "SUSPENDED" } }),
      ]);

    const totalCards = newCount + learningCount + reviewCount + suspendedCount;

    // Get aggregated statistics for active cards
    const aggregateStats = await db.flashcard.aggregate({
      where: { ...baseWhere, status: { not: "SUSPENDED" } },
      _avg: {
        easeFactor: true,
        interval: true,
      },
    });

    // Count mastered cards (5+ repetitions and 21+ day interval)
    const masteredCount = await db.flashcard.count({
      where: {
        ...baseWhere,
        status: { not: "SUSPENDED" },
        repetitions: { gte: 5 },
        interval: { gte: 21 },
      },
    });

    // Count due and overdue cards
    const dueCount = await db.flashcard.count({
      where: {
        ...baseWhere,
        status: { not: "SUSPENDED" },
        dueDate: { lte: now },
      },
    });

    // Get yesterday for overdue comparison
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(23, 59, 59, 999);

    const overdueCount = await db.flashcard.count({
      where: {
        ...baseWhere,
        status: { not: "SUSPENDED" },
        dueDate: { lt: getStartOfDayUTC(now) },
      },
    });

    // Get review history for the specified period
    const startDate = new Date(now);
    startDate.setUTCDate(startDate.getUTCDate() - query.days);

    // Build review where clause considering bookId
    const reviewWhereClause = query.bookId
      ? {
          flashcard: { userId: user.id, bookId: query.bookId },
          reviewedAt: { gte: startDate },
        }
      : {
          flashcard: { userId: user.id },
          reviewedAt: { gte: startDate },
        };

    const reviews = await db.flashcardReview.findMany({
      where: reviewWhereClause,
      select: {
        reviewedAt: true,
        rating: true,
      },
    });

    // Calculate retention rate from reviews
    const correctReviews = reviews.filter((r) => r.rating >= 3).length;
    const retentionRate = calculateRetentionRate(
      correctReviews,
      reviews.length
    );

    // Build review history
    const reviewHistory = buildReviewHistory(reviews, query.days, now);

    // Get all review dates for streak calculation (need all-time reviews for accurate streak)
    const allReviewDates = await db.flashcardReview.findMany({
      where: query.bookId
        ? { flashcard: { userId: user.id, bookId: query.bookId } }
        : { flashcard: { userId: user.id } },
      select: { reviewedAt: true },
      orderBy: { reviewedAt: "desc" },
    });

    // Calculate streak
    const streak = calculateStreak(
      allReviewDates.map((r) => r.reviewedAt),
      now
    );

    // Build response
    const response: FlashcardStatsResponse = {
      retentionRate,
      statusCounts: {
        new: newCount,
        learning: learningCount,
        review: reviewCount,
        suspended: suspendedCount,
        total: totalCards,
      },
      reviewHistory,
      streak: {
        current: streak.current,
        longest: streak.longest,
        lastReviewDate: streak.lastReviewDate,
      },
      totalReviews: reviews.length,
      averageEaseFactor: aggregateStats._avg.easeFactor ?? 2.5,
      averageInterval: aggregateStats._avg.interval ?? 0,
      masteredCount,
      dueCount,
      overdueCount,
    };

    // Log the request
    logger.info("Flashcard stats fetched", {
      userId: user.id,
      bookId: query.bookId ?? null,
      days: query.days,
      totalCards,
      retentionRate,
      currentStreak: streak.current,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error fetching flashcard stats", {
      userId: clerkUserId,
      error: message,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch flashcard stats. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
