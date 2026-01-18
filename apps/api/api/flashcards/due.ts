/**
 * GET /api/flashcards/due - Get flashcards due for review
 *
 * Returns flashcards that are due for review (dueDate <= now), ordered by
 * priority (overdue cards first, then by dueDate). Respects the user's
 * daily card limit setting from their preferences.
 *
 * @example
 * ```bash
 * # Get due flashcards
 * curl -X GET "/api/flashcards/due" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Get due flashcards with book context
 * curl -X GET "/api/flashcards/due?includeBook=true" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Override daily limit
 * curl -X GET "/api/flashcards/due?limit=30" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";
import type { FlashcardType, FlashcardStatus } from "@read-master/database";
import { readingPreferencesSchema } from "@read-master/shared/schemas";

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
 * Default daily card limit if not set in user preferences
 */
export const DEFAULT_DAILY_LIMIT = 50;

/**
 * Maximum allowed limit per request
 */
export const MAX_LIMIT = 200;

/**
 * Minimum allowed limit per request
 */
export const MIN_LIMIT = 1;

// ============================================================================
// Schemas
// ============================================================================

/**
 * Query parameters for due flashcards endpoint
 */
export const dueFlashcardsQuerySchema = z.object({
  limit: z.coerce.number().int().min(MIN_LIMIT).max(MAX_LIMIT).optional(),
  includeBook: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") return val.toLowerCase() === "true";
      return false;
    })
    .default(false),
  bookId: z.string().cuid().optional(),
});

export type DueFlashcardsQueryInput = z.infer<typeof dueFlashcardsQuerySchema>;

// ============================================================================
// Types
// ============================================================================

/**
 * Flashcard type from database with optional book relation
 */
type FlashcardWithBook = {
  id: string;
  userId: string;
  bookId: string | null;
  front: string;
  back: string;
  type: FlashcardType;
  status: FlashcardStatus;
  tags: string[];
  sourceChapterId: string | null;
  sourceOffset: number | null;
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: Date;
  totalReviews: number;
  correctReviews: number;
  createdAt: Date;
  updatedAt: Date;
  book?: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
  } | null;
};

/**
 * Book context returned with flashcard
 */
export type BookContext = {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
};

/**
 * Due flashcard response format
 */
export type DueFlashcardResponse = {
  id: string;
  userId: string;
  bookId: string | null;
  front: string;
  back: string;
  type: FlashcardType;
  status: FlashcardStatus;
  tags: string[];
  sourceChapterId: string | null;
  sourceOffset: number | null;
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: string;
  totalReviews: number;
  correctReviews: number;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
  overdueBy: number; // Days overdue (0 if not overdue)
  book?: BookContext;
};

/**
 * Response data structure
 */
export type DueFlashcardsResponseData = {
  flashcards: DueFlashcardResponse[];
  meta: {
    totalDue: number;
    returned: number;
    dailyLimit: number;
    overdueCount: number;
    reviewedToday: number;
    remainingToday: number;
  };
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse user preferences JSON and extract daily card limit
 */
function getDailyCardLimit(preferences: unknown): number {
  try {
    // Handle null/undefined
    if (!preferences) {
      return DEFAULT_DAILY_LIMIT;
    }

    // If it's a string, parse it
    const parsed =
      typeof preferences === "string" ? JSON.parse(preferences) : preferences;

    // Extract reading preferences
    const readingPrefs = parsed?.reading;
    if (!readingPrefs) {
      return DEFAULT_DAILY_LIMIT;
    }

    // Validate with schema
    const validated = readingPreferencesSchema.safeParse(readingPrefs);
    if (validated.success && validated.data.dailyCardLimit) {
      return validated.data.dailyCardLimit;
    }

    return DEFAULT_DAILY_LIMIT;
  } catch {
    return DEFAULT_DAILY_LIMIT;
  }
}

/**
 * Calculate if a card is overdue and by how many days
 */
function calculateOverdueInfo(
  dueDate: Date,
  now: Date = new Date()
): {
  isOverdue: boolean;
  overdueBy: number;
} {
  const dueDateMs = dueDate.getTime();
  const nowMs = now.getTime();

  if (dueDateMs >= nowMs) {
    return { isOverdue: false, overdueBy: 0 };
  }

  // Calculate days overdue
  const msPerDay = 24 * 60 * 60 * 1000;
  const overdueMs = nowMs - dueDateMs;
  const overdueBy = Math.floor(overdueMs / msPerDay);

  return { isOverdue: true, overdueBy };
}

/**
 * Get start of today in UTC for counting reviews
 */
function getStartOfTodayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
}

/**
 * Format flashcard for API response
 */
function formatDueFlashcard(
  flashcard: FlashcardWithBook,
  now: Date = new Date()
): DueFlashcardResponse {
  const { isOverdue, overdueBy } = calculateOverdueInfo(flashcard.dueDate, now);

  const response: DueFlashcardResponse = {
    id: flashcard.id,
    userId: flashcard.userId,
    bookId: flashcard.bookId,
    front: flashcard.front,
    back: flashcard.back,
    type: flashcard.type,
    status: flashcard.status,
    tags: flashcard.tags,
    sourceChapterId: flashcard.sourceChapterId,
    sourceOffset: flashcard.sourceOffset,
    easeFactor: flashcard.easeFactor,
    interval: flashcard.interval,
    repetitions: flashcard.repetitions,
    dueDate: flashcard.dueDate.toISOString(),
    totalReviews: flashcard.totalReviews,
    correctReviews: flashcard.correctReviews,
    createdAt: flashcard.createdAt.toISOString(),
    updatedAt: flashcard.updatedAt.toISOString(),
    isOverdue,
    overdueBy,
  };

  // Add book context if available
  if (flashcard.book) {
    response.book = {
      id: flashcard.book.id,
      title: flashcard.book.title,
      author: flashcard.book.author,
      coverImage: flashcard.book.coverImage,
    };
  }

  return response;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET /api/flashcards/due
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
    // Get user from database with preferences
    const user = await getUserByClerkId(clerkUserId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Validate query parameters
    const validationResult = dueFlashcardsQuerySchema.safeParse(req.query);
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
    const startOfToday = getStartOfTodayUTC();

    // Get user's daily limit from preferences
    const userDailyLimit = getDailyCardLimit(user.preferences);

    // Use query limit if provided, otherwise use user's daily limit
    const effectiveLimit = query.limit ?? userDailyLimit;

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

    // Build where clause for due cards
    const whereClause = {
      userId: user.id,
      deletedAt: null,
      status: { not: "SUSPENDED" as const },
      dueDate: { lte: now },
      ...(query.bookId && { bookId: query.bookId }),
    };

    // Count reviews done today
    const reviewedToday = await db.flashcardReview.count({
      where: {
        flashcard: { userId: user.id },
        reviewedAt: { gte: startOfToday },
      },
    });

    // Calculate remaining reviews for today
    const remainingToday = Math.max(0, userDailyLimit - reviewedToday);

    // Get total due count
    const totalDue = await db.flashcard.count({ where: whereClause });

    // Fetch due flashcards with ordering
    // Order: overdue cards first (by dueDate asc), then due today (by dueDate asc)
    // Build the query options dynamically to handle include properly
    const queryOptions = {
      where: whereClause,
      orderBy: [{ dueDate: "asc" as const }], // Oldest due dates first (most overdue)
      take: effectiveLimit,
    };

    // Conditionally add include for book context
    const flashcards = query.includeBook
      ? await db.flashcard.findMany({
          ...queryOptions,
          include: {
            book: {
              select: {
                id: true,
                title: true,
                author: true,
                coverImage: true,
              },
            },
          },
        })
      : await db.flashcard.findMany(queryOptions);

    // Count overdue cards
    const overdueCount = flashcards.filter(
      (f) => calculateOverdueInfo(f.dueDate, now).isOverdue
    ).length;

    // Format response
    const formattedFlashcards = flashcards.map((f) =>
      formatDueFlashcard(f as FlashcardWithBook, now)
    );

    // Log the request
    logger.info("Due flashcards fetched", {
      userId: user.id,
      totalDue,
      returned: flashcards.length,
      overdueCount,
      reviewedToday,
      dailyLimit: userDailyLimit,
      effectiveLimit,
      bookId: query.bookId ?? null,
    });

    // Return response with meta information
    const responseData: DueFlashcardsResponseData = {
      flashcards: formattedFlashcards,
      meta: {
        totalDue,
        returned: flashcards.length,
        dailyLimit: userDailyLimit,
        overdueCount,
        reviewedToday,
        remainingToday,
      },
    };

    sendSuccess(res, responseData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error fetching due flashcards", {
      userId: clerkUserId,
      error: message,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch due flashcards. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  getDailyCardLimit,
  calculateOverdueInfo,
  getStartOfTodayUTC,
  formatDueFlashcard,
};
