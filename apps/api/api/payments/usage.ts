/**
 * GET /api/payments/usage
 *
 * Returns current usage statistics for the authenticated user
 * Useful for displaying usage indicators and tracking tier limits
 */

import type { VercelResponse } from "@vercel/node";
import { withAuth } from "../../src/middleware/auth.js";
import type { AuthenticatedRequest } from "../../src/middleware/auth.js";
import {
  sendError,
  sendSuccess,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../src/services/db.js";
import { getTierLimits } from "@read-master/shared/constants";
import type { UserTier } from "@read-master/database";

// ============================================================================
// Types
// ============================================================================

export interface UsageStats {
  tier: UserTier;
  limits: {
    maxBooks: number;
    maxAiInteractionsPerDay: number;
    maxActiveFlashcards: number;
    maxTtsDownloadsPerMonth: number;
  };
  usage: {
    booksCount: number;
    aiInteractionsToday: number;
    activeFlashcardsCount: number;
    ttsDownloadsThisMonth: number;
  };
  remaining: {
    books: number;
    aiInteractions: number;
    flashcards: number;
    ttsDownloads: number;
  };
  percentages: {
    books: number;
    aiInteractions: number;
    flashcards: number;
    ttsDownloads: number;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate usage percentage (capped at 100)
 */
export function calculatePercentage(used: number, limit: number): number {
  if (limit === Infinity || limit === 0) {
    return 0; // Unlimited or not available
  }
  return Math.min(100, Math.round((used / limit) * 100));
}

/**
 * Get start of current day in UTC
 */
export function getStartOfToday(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

/**
 * Get start of current month in UTC
 */
export function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Serialize limit value for JSON (convert Infinity to -1)
 */
export function serializeLimit(value: number): number {
  return value === Infinity ? -1 : value;
}

/**
 * Map tier limits to serializable format
 */
export function mapTierLimits(tier: UserTier): UsageStats["limits"] {
  const limits = getTierLimits(tier);
  return {
    maxBooks: serializeLimit(limits.maxBooks),
    maxAiInteractionsPerDay: serializeLimit(limits.maxAiInteractionsPerDay),
    maxActiveFlashcards: serializeLimit(limits.maxActiveFlashcards),
    maxTtsDownloadsPerMonth: serializeLimit(limits.maxTtsDownloadsPerMonth),
  };
}

// ============================================================================
// Handler
// ============================================================================

async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET
  if (req.method !== "GET") {
    return sendError(
      res,
      ErrorCodes.METHOD_NOT_ALLOWED,
      "Method not allowed",
      405
    );
  }

  const { userId } = req.auth;

  try {
    // Get user with tier
    const user = await getUserByClerkId(userId);

    if (!user) {
      return sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    }

    const tier = user.tier as UserTier;
    const limits = getTierLimits(tier);

    // Get usage counts in parallel
    const startOfToday = getStartOfToday();
    const startOfMonth = getStartOfMonth();

    const [
      booksCount,
      aiInteractionsToday,
      activeFlashcardsCount,
      ttsDownloadsThisMonth,
    ] = await Promise.all([
      // Count user's books (not deleted)
      db.book.count({
        where: {
          userId: user.id,
          deletedAt: null,
        },
      }),

      // Count AI interactions today
      db.aIUsageLog.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: startOfToday,
          },
        },
      }),

      // Count active flashcards (not deleted, not suspended)
      db.flashcard.count({
        where: {
          userId: user.id,
          deletedAt: null,
        },
      }),

      // Count TTS downloads this month
      db.tTSDownload.count({
        where: {
          userId: user.id,
          status: "COMPLETED",
          createdAt: {
            gte: startOfMonth,
          },
        },
      }),
    ]);

    // Calculate remaining quotas
    const remaining = {
      books:
        limits.maxBooks === Infinity
          ? -1
          : Math.max(0, limits.maxBooks - booksCount),
      aiInteractions:
        limits.maxAiInteractionsPerDay === Infinity
          ? -1
          : Math.max(0, limits.maxAiInteractionsPerDay - aiInteractionsToday),
      flashcards:
        limits.maxActiveFlashcards === Infinity
          ? -1
          : Math.max(0, limits.maxActiveFlashcards - activeFlashcardsCount),
      ttsDownloads:
        limits.maxTtsDownloadsPerMonth === Infinity
          ? -1
          : Math.max(0, limits.maxTtsDownloadsPerMonth - ttsDownloadsThisMonth),
    };

    // Calculate usage percentages
    const percentages = {
      books: calculatePercentage(booksCount, limits.maxBooks),
      aiInteractions: calculatePercentage(
        aiInteractionsToday,
        limits.maxAiInteractionsPerDay
      ),
      flashcards: calculatePercentage(
        activeFlashcardsCount,
        limits.maxActiveFlashcards
      ),
      ttsDownloads: calculatePercentage(
        ttsDownloadsThisMonth,
        limits.maxTtsDownloadsPerMonth
      ),
    };

    const usageStats: UsageStats = {
      tier,
      limits: mapTierLimits(tier),
      usage: {
        booksCount,
        aiInteractionsToday,
        activeFlashcardsCount,
        ttsDownloadsThisMonth,
      },
      remaining,
      percentages,
    };

    logger.debug("Usage stats retrieved", {
      userId,
      tier,
      booksCount,
      aiInteractionsToday,
    });

    return sendSuccess(res, usageStats);
  } catch (error) {
    logger.error("Failed to get usage stats", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to retrieve usage statistics",
      500
    );
  }
}

// ============================================================================
// Export
// ============================================================================

export default withAuth(handler);
