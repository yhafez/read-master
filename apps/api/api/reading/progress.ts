/**
 * GET /api/reading/progress - Fetch reading progress for a book
 * PUT /api/reading/progress - Update reading progress for a book
 *
 * GET endpoint:
 * - Returns reading progress for the authenticated user and specified book
 * - Includes all progress metrics (position, percentage, time, WPM)
 * - Creates initial progress record if none exists
 *
 * PUT endpoint:
 * - Updates reading position and calculates percentage
 * - Tracks total read time by accumulating session durations
 * - Updates lastReadAt timestamp
 * - Handles completion detection (percentage >= 100)
 * - Awards XP on book completion (first time only)
 * - Checks for achievements on completion
 * - Updates book status to COMPLETED when finished
 *
 * @example
 * ```bash
 * # GET
 * curl -X GET "/api/reading/progress?bookId=clxxxxxxxxxx" \
 *   -H "Authorization: Bearer <token>"
 *
 * # PUT
 * curl -X PUT /api/reading/progress \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"bookId": "clxxxxxxxxxx", "currentPosition": 5000, "percentage": 25.5, "sessionDuration": 300}'
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";
import {
  updateReadingProgressSchema,
  bookIdSchema,
} from "@read-master/shared/schemas";

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
import type { Prisma } from "@read-master/database";

// ============================================================================
// Constants
// ============================================================================

/**
 * XP awarded for completing a book
 */
const BOOK_COMPLETION_XP = 100;

/**
 * Percentage threshold for book completion
 */
const COMPLETION_THRESHOLD = 100;

// ============================================================================
// Local Schemas
// ============================================================================

/**
 * Schema for GET request validation (book ID from query param)
 */
const getReadingProgressSchema = z.object({
  bookId: bookIdSchema,
});

// ============================================================================
// Types
// ============================================================================

/**
 * Achievement data type for response
 */
type AchievementData = {
  id: string;
  code: string;
  name: string;
  xpReward: number;
};

/**
 * Reading progress response type
 */
type ReadingProgressResponse = {
  id: string;
  bookId: string;
  userId: string;
  currentPosition: number;
  percentage: number;
  totalReadTime: number;
  averageWpm: number | null;
  lastReadAt: string | null;
  startedAt: string;
  completedAt: string | null;
  isCompleted: boolean;
};

/**
 * Progress update response with optional achievement/XP info
 */
type ProgressUpdateResponse = ReadingProgressResponse & {
  xpAwarded?: number;
  newAchievements?: AchievementData[];
  bookCompleted?: boolean;
  totalReadTimeFormatted: string;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format read time in seconds to human-readable string
 */
function formatReadTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format reading progress for API response
 */
function formatProgressResponse(
  progress: {
    id: string;
    bookId: string;
    userId: string;
    currentPosition: number;
    percentage: number;
    totalReadTime: number;
    averageWpm: number | null;
    lastReadAt: Date | null;
    startedAt: Date;
    completedAt: Date | null;
  },
  additionalData?: {
    xpAwarded?: number;
    newAchievements?: AchievementData[];
    bookCompleted?: boolean;
  }
): ProgressUpdateResponse {
  const response: ProgressUpdateResponse = {
    id: progress.id,
    bookId: progress.bookId,
    userId: progress.userId,
    currentPosition: progress.currentPosition,
    percentage: progress.percentage,
    totalReadTime: progress.totalReadTime,
    averageWpm: progress.averageWpm,
    lastReadAt: progress.lastReadAt?.toISOString() ?? null,
    startedAt: progress.startedAt.toISOString(),
    completedAt: progress.completedAt?.toISOString() ?? null,
    isCompleted: progress.completedAt !== null,
    totalReadTimeFormatted: formatReadTime(progress.totalReadTime),
  };

  if (additionalData?.xpAwarded !== undefined) {
    response.xpAwarded = additionalData.xpAwarded;
  }
  if (additionalData?.newAchievements !== undefined) {
    response.newAchievements = additionalData.newAchievements;
  }
  if (additionalData?.bookCompleted !== undefined) {
    response.bookCompleted = additionalData.bookCompleted;
  }

  return response;
}

/**
 * Check and award reading-related achievements
 * Returns array of newly awarded achievements
 */
async function checkAndAwardAchievements(
  userId: string,
  userStats: {
    booksCompleted: number;
    currentStreak: number;
    totalReadingTime: number;
  }
): Promise<AchievementData[]> {
  const newAchievements: AchievementData[] = [];

  // Find achievements user doesn't have yet
  const unlockedAchievements = await db.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  });
  const unlockedIds = new Set(unlockedAchievements.map((a) => a.achievementId));

  // Get all active achievements
  const allAchievements = await db.achievement.findMany({
    where: { isActive: true },
  });

  for (const achievement of allAchievements) {
    // Skip already unlocked
    if (unlockedIds.has(achievement.id)) {
      continue;
    }

    // Parse criteria
    const criteria = achievement.criteria as Record<string, number> | null;
    if (!criteria) {
      continue;
    }

    // Check if user meets criteria
    let meetsAllCriteria = true;
    for (const [key, value] of Object.entries(criteria)) {
      if (key === "booksCompleted" && userStats.booksCompleted < value) {
        meetsAllCriteria = false;
        break;
      }
      if (key === "currentStreak" && userStats.currentStreak < value) {
        meetsAllCriteria = false;
        break;
      }
      if (key === "totalReadingTime" && userStats.totalReadingTime < value) {
        meetsAllCriteria = false;
        break;
      }
    }

    if (meetsAllCriteria) {
      // Award achievement
      await db.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id,
        },
      });

      newAchievements.push({
        id: achievement.id,
        code: achievement.code,
        name: achievement.name,
        xpReward: achievement.xpReward,
      });
    }
  }

  return newAchievements;
}

/**
 * Calculate total XP from achievements
 */
function calculateAchievementXp(achievements: AchievementData[]): number {
  return achievements.reduce((sum, a) => sum + a.xpReward, 0);
}

// ============================================================================
// Main Handlers
// ============================================================================

/**
 * Handle GET /api/reading/progress request
 */
async function handleGet(
  req: AuthenticatedRequest,
  res: VercelResponse,
  userId: string
): Promise<void> {
  // Get user from database
  const user = await getUserByClerkId(userId);
  if (!user) {
    sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    return;
  }

  // Validate book ID from query
  const validationResult = getReadingProgressSchema.safeParse({
    bookId: req.query.bookId,
  });
  if (!validationResult.success) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Invalid request parameters",
      400,
      validationResult.error.flatten()
    );
    return;
  }

  const { bookId } = validationResult.data;

  // Check book exists and user has access
  const book = await db.book.findFirst({
    where: {
      id: bookId,
      deletedAt: null,
    },
  });

  if (!book) {
    sendError(res, ErrorCodes.NOT_FOUND, "Book not found", 404);
    return;
  }

  // Check access (owner or public book)
  const hasAccess = book.userId === user.id || book.isPublic;
  if (!hasAccess) {
    sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "You do not have access to this book",
      403
    );
    return;
  }

  // Get or create reading progress
  let progress = await db.readingProgress.findUnique({
    where: { userId_bookId: { userId: user.id, bookId } },
  });

  if (!progress) {
    // Create initial progress record
    progress = await db.readingProgress.create({
      data: {
        userId: user.id,
        bookId,
        currentPosition: 0,
        percentage: 0,
        totalReadTime: 0,
        lastReadAt: new Date(),
      },
    });
  }

  // Log the request
  logger.info("Reading progress fetched", {
    userId: user.id,
    bookId,
    percentage: progress.percentage,
  });

  // Return progress
  sendSuccess(res, formatProgressResponse(progress));
}

/**
 * Handle PUT /api/reading/progress request
 */
async function handlePut(
  req: AuthenticatedRequest,
  res: VercelResponse,
  userId: string
): Promise<void> {
  // Get user from database
  const user = await getUserByClerkId(userId);
  if (!user) {
    sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    return;
  }

  // Validate request body
  const validationResult = updateReadingProgressSchema.safeParse(req.body);
  if (!validationResult.success) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Invalid update data",
      400,
      validationResult.error.flatten()
    );
    return;
  }

  const { bookId, currentPosition, percentage, sessionDuration, averageWpm } =
    validationResult.data;

  // Check book exists and user owns it
  const book = await db.book.findFirst({
    where: {
      id: bookId,
      deletedAt: null,
    },
  });

  if (!book) {
    sendError(res, ErrorCodes.NOT_FOUND, "Book not found", 404);
    return;
  }

  // Only owner can update progress (not public books)
  if (book.userId !== user.id) {
    sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "You do not have permission to update progress for this book",
      403
    );
    return;
  }

  // Get existing progress
  const existingProgress = await db.readingProgress.findUnique({
    where: { userId_bookId: { userId: user.id, bookId } },
  });

  const now = new Date();
  const wasAlreadyCompleted = existingProgress?.completedAt !== null;
  const isNowComplete =
    percentage !== undefined && percentage >= COMPLETION_THRESHOLD;
  const firstTimeCompletion = isNowComplete && !wasAlreadyCompleted;

  // Build update data
  const updateData: Prisma.ReadingProgressUpdateInput = {
    lastReadAt: now,
  };

  if (currentPosition !== undefined) {
    updateData.currentPosition = currentPosition;
  }
  if (percentage !== undefined) {
    updateData.percentage = Math.min(percentage, 100);
  }
  if (sessionDuration !== undefined && existingProgress) {
    updateData.totalReadTime = existingProgress.totalReadTime + sessionDuration;
  }
  if (averageWpm !== undefined) {
    updateData.averageWpm = averageWpm;
  }

  // Set completedAt if first time completion
  if (firstTimeCompletion) {
    updateData.completedAt = now;
  }

  // Upsert the progress
  const updatedProgress = await db.readingProgress.upsert({
    where: { userId_bookId: { userId: user.id, bookId } },
    update: updateData,
    create: {
      userId: user.id,
      bookId,
      currentPosition: currentPosition ?? 0,
      percentage: percentage !== undefined ? Math.min(percentage, 100) : 0,
      totalReadTime: sessionDuration ?? 0,
      averageWpm: averageWpm ?? null,
      lastReadAt: now,
      completedAt: isNowComplete ? now : null,
    },
  });

  // Handle first-time completion
  let xpAwarded = 0;
  let newAchievements: AchievementData[] = [];

  if (firstTimeCompletion) {
    // Update book status to COMPLETED
    await db.book.update({
      where: { id: bookId },
      data: { status: "COMPLETED" },
    });

    // Award XP and update stats
    const updatedStats = await db.userStats.upsert({
      where: { userId: user.id },
      update: {
        totalXP: { increment: BOOK_COMPLETION_XP },
        booksCompleted: { increment: 1 },
        totalReadingTime: { increment: updatedProgress.totalReadTime },
        totalWordsRead: { increment: book.wordCount ?? 0 },
      },
      create: {
        userId: user.id,
        totalXP: BOOK_COMPLETION_XP,
        booksCompleted: 1,
        totalReadingTime: updatedProgress.totalReadTime,
        totalWordsRead: book.wordCount ?? 0,
      },
    });

    xpAwarded = BOOK_COMPLETION_XP;

    // Check for achievements
    newAchievements = await checkAndAwardAchievements(user.id, updatedStats);

    // Add achievement XP
    const achievementXp = calculateAchievementXp(newAchievements);
    if (achievementXp > 0) {
      await db.userStats.update({
        where: { userId: user.id },
        data: { totalXP: { increment: achievementXp } },
      });
      xpAwarded += achievementXp;
    }

    // Log completion
    logger.info("Book completed", {
      userId: user.id,
      bookId,
      totalReadTime: updatedProgress.totalReadTime,
      xpAwarded,
      achievementsUnlocked: newAchievements.length,
    });
  }

  // Log the update
  logger.info("Reading progress updated", {
    userId: user.id,
    bookId,
    percentage: updatedProgress.percentage,
    position: updatedProgress.currentPosition,
    isComplete: updatedProgress.completedAt !== null,
  });

  // Build additional data object conditionally
  const additionalData: {
    xpAwarded?: number;
    newAchievements?: AchievementData[];
    bookCompleted?: boolean;
  } = {};

  if (xpAwarded > 0) {
    additionalData.xpAwarded = xpAwarded;
  }
  if (newAchievements.length > 0) {
    additionalData.newAchievements = newAchievements;
  }
  if (firstTimeCompletion) {
    additionalData.bookCompleted = true;
  }

  // Return response
  const response = formatProgressResponse(
    updatedProgress,
    Object.keys(additionalData).length > 0 ? additionalData : undefined
  );

  sendSuccess(res, response);
}

/**
 * Main request handler - routes to GET or PUT handler
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET and PUT
  if (req.method !== "GET" && req.method !== "PUT") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET or PUT.",
      405
    );
    return;
  }

  const { userId } = req.auth;

  try {
    if (req.method === "GET") {
      await handleGet(req, res, userId);
    } else {
      await handlePut(req, res, userId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const operation = req.method === "GET" ? "fetching" : "updating";
    logger.error(`Error ${operation} reading progress`, {
      userId,
      error: message,
    });

    const verb = req.method === "GET" ? "fetch" : "update";
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      `Failed to ${verb} reading progress. Please try again.`,
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  // Constants
  BOOK_COMPLETION_XP,
  COMPLETION_THRESHOLD,
  // Schemas
  getReadingProgressSchema,
  // Helper functions
  formatReadTime,
  formatProgressResponse,
  checkAndAwardAchievements,
  calculateAchievementXp,
  // Types
  type AchievementData,
  type ReadingProgressResponse,
  type ProgressUpdateResponse,
};
