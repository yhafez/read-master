/**
 * POST /api/flashcards/:id/review - Submit a flashcard review
 *
 * Implements the SM-2 spaced repetition algorithm to schedule the next review.
 * Updates the flashcard's SRS state, creates a review record, awards XP,
 * and checks for achievements.
 *
 * Rating scale:
 * - 1 (Again): Complete blackout, reset card
 * - 2 (Hard): Correct but with difficulty, shorter interval
 * - 3 (Good): Correct with some hesitation, normal progression
 * - 4 (Easy): Perfect recall, accelerated progression
 *
 * @example
 * ```bash
 * curl -X POST /api/flashcards/clxxxxxxxxxx/review \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{ "rating": 3, "responseTimeMs": 2500 }'
 * ```
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { FlashcardStatus } from "@read-master/database";
import { z } from "zod";
import {
  reviewFlashcardSchema,
  flashcardIdSchema,
  type ReviewFlashcardInput,
} from "@read-master/shared/schemas";
import {
  calculateNextReview,
  type SrsRating,
  type SrsCardState,
} from "@read-master/shared";
import { XP_REWARDS, calculateLevel } from "@read-master/shared";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../../src/middleware/auth.js";
import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../../src/utils/response.js";
import { logger } from "../../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../../src/services/db.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * XP awarded based on rating
 * Rating 1 (Again): No XP (failed recall)
 * Rating 2 (Hard): Half XP (struggled)
 * Rating 3 (Good): Base XP (correct)
 * Rating 4 (Easy): 1.5x XP (perfect recall)
 */
export const XP_BY_RATING: Record<SrsRating, number> = {
  1: 0,
  2: Math.floor(XP_REWARDS.FLASHCARD_CORRECT / 2),
  3: XP_REWARDS.FLASHCARD_CORRECT,
  4: Math.floor(XP_REWARDS.FLASHCARD_CORRECT * 1.5),
};

/**
 * Minimum repetitions to be considered "mastered"
 * Card must have been reviewed successfully this many times
 */
export const MASTERY_REPETITIONS = 5;

/**
 * Minimum interval (in days) to be considered "mastered"
 */
export const MASTERY_INTERVAL_DAYS = 21;

// ============================================================================
// Types
// ============================================================================

/**
 * Review response type
 */
export type ReviewResponse = {
  flashcardId: string;
  rating: SrsRating;
  previousState: {
    easeFactor: number;
    interval: number;
    repetitions: number;
    status: FlashcardStatus;
  };
  newState: {
    easeFactor: number;
    interval: number;
    repetitions: number;
    dueDate: string;
    status: FlashcardStatus;
  };
  xpAwarded: number;
  totalXP: number;
  level: number;
  isLapse: boolean;
  isMastered: boolean;
  reviewedAt: string;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine new flashcard status based on SRS state
 *
 * NEW -> LEARNING (after first review)
 * LEARNING -> REVIEW (after interval >= 1 day)
 * REVIEW -> REVIEW (stays in review)
 * Any -> LEARNING (on lapse/reset)
 */
export function determineNewStatus(
  currentStatus: FlashcardStatus,
  newRepetitions: number,
  newInterval: number,
  isLapse: boolean
): FlashcardStatus {
  // On lapse, go back to learning
  if (isLapse) {
    return "LEARNING";
  }

  // First successful review - move from NEW to LEARNING
  if (currentStatus === "NEW") {
    return "LEARNING";
  }

  // After enough successful reviews with good interval, move to REVIEW
  if (currentStatus === "LEARNING" && newRepetitions >= 2 && newInterval >= 1) {
    return "REVIEW";
  }

  // Stay in current status
  return currentStatus;
}

/**
 * Check if a card has reached mastery
 */
export function isMastered(repetitions: number, interval: number): boolean {
  return (
    repetitions >= MASTERY_REPETITIONS && interval >= MASTERY_INTERVAL_DAYS
  );
}

/**
 * Check if this review completes the user's daily reviews
 * (For potential achievement checking in the future)
 */
export async function getDailyReviewCount(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const count = await db.flashcardReview.count({
    where: {
      flashcard: {
        userId,
      },
      reviewedAt: {
        gte: startOfDay,
      },
    },
  });

  return count;
}

/**
 * Format the response for a successful review
 */
export function formatReviewResponse(
  flashcardId: string,
  rating: SrsRating,
  previousState: SrsCardState & { status: FlashcardStatus },
  newState: {
    easeFactor: number;
    interval: number;
    repetitions: number;
    dueDate: Date;
    status: FlashcardStatus;
  },
  xpAwarded: number,
  totalXP: number,
  isLapse: boolean,
  reviewedAt: Date
): ReviewResponse {
  const levelInfo = calculateLevel(totalXP);

  return {
    flashcardId,
    rating,
    previousState: {
      easeFactor: previousState.easeFactor,
      interval: previousState.interval,
      repetitions: previousState.repetitions,
      status: previousState.status,
    },
    newState: {
      easeFactor: newState.easeFactor,
      interval: newState.interval,
      repetitions: newState.repetitions,
      dueDate: newState.dueDate.toISOString(),
      status: newState.status,
    },
    xpAwarded,
    totalXP,
    level: levelInfo.level,
    isLapse,
    isMastered: isMastered(newState.repetitions, newState.interval),
    reviewedAt: reviewedAt.toISOString(),
  };
}

/**
 * Validate request parameters schema
 */
export const reviewParamsSchema = z.object({
  id: flashcardIdSchema,
});

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle POST /api/flashcards/:id/review
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== "POST") {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "Method not allowed", 405);
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

    // Validate flashcard ID from URL params
    const flashcardId = (req as VercelRequest).query.id;
    const paramsResult = reviewParamsSchema.safeParse({ id: flashcardId });
    if (!paramsResult.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid flashcard ID",
        400,
        paramsResult.error.flatten()
      );
      return;
    }

    // Validate request body
    const bodyResult = reviewFlashcardSchema.safeParse(req.body);
    if (!bodyResult.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid review data",
        400,
        bodyResult.error.flatten()
      );
      return;
    }

    const { rating, responseTimeMs }: ReviewFlashcardInput = bodyResult.data;
    const validatedId = paramsResult.data.id;

    // Find the flashcard
    const flashcard = await db.flashcard.findFirst({
      where: {
        id: validatedId,
        deletedAt: null,
      },
    });

    if (!flashcard) {
      sendError(res, ErrorCodes.NOT_FOUND, "Flashcard not found", 404);
      return;
    }

    // Check ownership
    if (flashcard.userId !== user.id) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "You do not have permission to review this flashcard",
        403
      );
      return;
    }

    // Check if card is suspended
    if (flashcard.status === "SUSPENDED") {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Cannot review a suspended flashcard",
        400
      );
      return;
    }

    // Get current SRS state
    const currentState: SrsCardState & { status: FlashcardStatus } = {
      easeFactor: flashcard.easeFactor,
      interval: flashcard.interval,
      repetitions: flashcard.repetitions,
      status: flashcard.status,
    };

    // Calculate new SRS state using SM-2 algorithm
    const reviewDate = new Date();
    const srsResult = calculateNextReview(
      {
        easeFactor: currentState.easeFactor,
        interval: currentState.interval,
        repetitions: currentState.repetitions,
      },
      rating as SrsRating,
      reviewDate
    );

    // Determine new status
    const newStatus = determineNewStatus(
      currentState.status,
      srsResult.newRepetitions,
      srsResult.newInterval,
      srsResult.isLapse
    );

    // Calculate XP to award
    const xpAwarded = XP_BY_RATING[rating as SrsRating];

    // Track if this card is newly mastered
    const wasNotMastered = !isMastered(
      currentState.repetitions,
      currentState.interval
    );
    const isNowMastered = isMastered(
      srsResult.newRepetitions,
      srsResult.newInterval
    );
    const newlyMastered = wasNotMastered && isNowMastered;

    // Determine if this is a correct review (for statistics)
    const isCorrect = rating >= 3;

    // Use transaction to update all related data atomically
    const result = await db.$transaction(async (tx) => {
      // 1. Update flashcard with new SRS state
      // Build update data - only include correctReviews increment if correct
      const flashcardUpdateData: {
        easeFactor: number;
        interval: number;
        repetitions: number;
        dueDate: Date;
        status: FlashcardStatus;
        totalReviews: { increment: number };
        correctReviews?: { increment: number };
      } = {
        easeFactor: srsResult.newEaseFactor,
        interval: srsResult.newInterval,
        repetitions: srsResult.newRepetitions,
        dueDate: srsResult.nextDueDate,
        status: newStatus,
        totalReviews: { increment: 1 },
      };

      if (isCorrect) {
        flashcardUpdateData.correctReviews = { increment: 1 };
      }

      const updatedFlashcard = await tx.flashcard.update({
        where: { id: validatedId },
        data: flashcardUpdateData,
      });

      // 2. Create FlashcardReview record
      const review = await tx.flashcardReview.create({
        data: {
          flashcardId: validatedId,
          rating,
          responseTimeMs: responseTimeMs ?? null,
          previousEaseFactor: currentState.easeFactor,
          previousInterval: currentState.interval,
          previousRepetitions: currentState.repetitions,
          newEaseFactor: srsResult.newEaseFactor,
          newInterval: srsResult.newInterval,
          newRepetitions: srsResult.newRepetitions,
          reviewedAt: reviewDate,
        },
      });

      // 3. Update or create UserStats
      const existingStats = await tx.userStats.findUnique({
        where: { userId: user.id },
      });

      let updatedStats;
      if (existingStats) {
        updatedStats = await tx.userStats.update({
          where: { userId: user.id },
          data: {
            totalXP: { increment: xpAwarded },
            totalCardsReviewed: { increment: 1 },
            lastActivityDate: reviewDate,
          },
        });
      } else {
        // For new UserStats, use upsert pattern with connect
        updatedStats = await tx.userStats.create({
          data: {
            user: { connect: { id: user.id } },
            totalXP: xpAwarded,
            totalCardsReviewed: 1,
            lastActivityDate: reviewDate,
          },
        });
      }

      // Recalculate level based on new XP
      const levelInfo = calculateLevel(updatedStats.totalXP);
      if (levelInfo.level !== updatedStats.level) {
        await tx.userStats.update({
          where: { userId: user.id },
          data: { level: levelInfo.level },
        });
        updatedStats.level = levelInfo.level;
      }

      return {
        flashcard: updatedFlashcard,
        review,
        stats: updatedStats,
      };
    });

    // Log the review
    logger.info("Flashcard reviewed", {
      userId: user.id,
      flashcardId: validatedId,
      rating,
      previousInterval: currentState.interval,
      newInterval: srsResult.newInterval,
      isLapse: srsResult.isLapse,
      xpAwarded,
      newlyMastered,
    });

    // Format and send response
    const response = formatReviewResponse(
      validatedId,
      rating as SrsRating,
      currentState,
      {
        easeFactor: srsResult.newEaseFactor,
        interval: srsResult.newInterval,
        repetitions: srsResult.newRepetitions,
        dueDate: srsResult.nextDueDate,
        status: newStatus,
      },
      xpAwarded,
      result.stats.totalXP,
      srsResult.isLapse,
      reviewDate
    );

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error reviewing flashcard", {
      userId: clerkUserId,
      error: message,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to review flashcard. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
