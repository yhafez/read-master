/**
 * GET /api/stats - Get user gamification stats
 *
 * Returns comprehensive gamification statistics including XP, level,
 * progress to next level, streaks, and reading statistics.
 *
 * @example
 * ```bash
 * # Get gamification stats
 * curl -X GET "/api/stats" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";

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
// Constants - Level Thresholds
// ============================================================================

/**
 * Level threshold configuration
 * Based on SPECIFICATIONS.md level thresholds
 */
export const LEVEL_THRESHOLDS: readonly {
  readonly level: number;
  readonly xpRequired: number;
  readonly title: string;
}[] = [
  { level: 1, xpRequired: 0, title: "Novice Reader" },
  { level: 2, xpRequired: 100, title: "Apprentice" },
  { level: 3, xpRequired: 300, title: "Page Turner" },
  { level: 4, xpRequired: 600, title: "Bookworm" },
  { level: 5, xpRequired: 1000, title: "Avid Reader" },
  { level: 6, xpRequired: 1500, title: "Literature Lover" },
  { level: 7, xpRequired: 2500, title: "Scholar" },
  { level: 8, xpRequired: 4000, title: "Bibliophile" },
  { level: 9, xpRequired: 6000, title: "Sage" },
  { level: 10, xpRequired: 10000, title: "Master Reader" },
] as const;

/**
 * XP increment per level after level 10
 */
export const XP_PER_LEVEL_AFTER_10 = 5000;

/**
 * Title for levels 11+
 */
export const GRAND_MASTER_TITLE = "Grand Master";

/**
 * Maximum level defined in thresholds
 */
export const MAX_DEFINED_LEVEL = 10;

// ============================================================================
// Types
// ============================================================================

/**
 * Level information
 */
export type LevelInfo = {
  level: number;
  title: string;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressToNextLevel: number; // Percentage (0-100)
  xpNeededForNextLevel: number;
};

/**
 * Streak information
 */
export type StreakInfo = {
  current: number;
  longest: number;
  lastActivityDate: string | null;
};

/**
 * Reading statistics
 */
export type ReadingStats = {
  booksCompleted: number;
  totalReadingTime: number; // In seconds
  totalWordsRead: number;
  averageWpm: number | null;
};

/**
 * Flashcard statistics
 */
export type FlashcardStats = {
  totalCardsReviewed: number;
  totalCardsCreated: number;
  averageRetention: number | null; // 0-1
};

/**
 * Assessment statistics
 */
export type AssessmentStats = {
  assessmentsCompleted: number;
  averageScore: number | null; // 0-100
};

/**
 * Social statistics
 */
export type SocialStats = {
  followersCount: number;
  followingCount: number;
};

/**
 * Full gamification stats response
 */
export type GamificationStatsResponse = {
  userId: string;
  levelInfo: LevelInfo;
  streak: StreakInfo;
  reading: ReadingStats;
  flashcards: FlashcardStats;
  assessments: AssessmentStats;
  social: SocialStats;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate XP required for a given level
 * Levels 1-10 use predefined thresholds
 * Levels 11+ add 5000 XP per level
 */
export function getXPRequiredForLevel(level: number): number {
  if (level <= 0) {
    return 0;
  }

  if (level <= MAX_DEFINED_LEVEL) {
    const threshold = LEVEL_THRESHOLDS.find((t) => t.level === level);
    return threshold?.xpRequired ?? 0;
  }

  // For levels 11+: level 10 XP + (level - 10) * 5000
  const level10XP = LEVEL_THRESHOLDS[9]?.xpRequired ?? 10000;
  return level10XP + (level - MAX_DEFINED_LEVEL) * XP_PER_LEVEL_AFTER_10;
}

/**
 * Get the title for a given level
 */
export function getTitleForLevel(level: number): string {
  if (level <= 0) {
    return LEVEL_THRESHOLDS[0]?.title ?? "Novice Reader";
  }

  if (level <= MAX_DEFINED_LEVEL) {
    const threshold = LEVEL_THRESHOLDS.find((t) => t.level === level);
    return threshold?.title ?? GRAND_MASTER_TITLE;
  }

  return GRAND_MASTER_TITLE;
}

/**
 * Calculate level from total XP
 * Returns the level and all related information
 */
export function calculateLevelFromXP(totalXP: number): LevelInfo {
  // Handle edge cases
  if (totalXP < 0) {
    totalXP = 0;
  }

  let currentLevel = 1;

  // Find current level from predefined thresholds
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    const threshold = LEVEL_THRESHOLDS[i];
    if (threshold && totalXP >= threshold.xpRequired) {
      currentLevel = threshold.level;
      break;
    }
  }

  // Check if beyond level 10
  if (currentLevel === MAX_DEFINED_LEVEL) {
    const level10XP = getXPRequiredForLevel(10);
    const xpBeyond10 = totalXP - level10XP;

    if (xpBeyond10 > 0) {
      // Calculate additional levels beyond 10
      const additionalLevels = Math.floor(xpBeyond10 / XP_PER_LEVEL_AFTER_10);
      currentLevel = MAX_DEFINED_LEVEL + additionalLevels;
    }
  }

  const xpForCurrentLevel = getXPRequiredForLevel(currentLevel);
  const xpForNextLevel = getXPRequiredForLevel(currentLevel + 1);
  const xpInCurrentLevel = totalXP - xpForCurrentLevel;
  const xpRangeForLevel = xpForNextLevel - xpForCurrentLevel;

  // Calculate progress percentage (0-100)
  const progressToNextLevel =
    xpRangeForLevel > 0
      ? Math.min(100, Math.round((xpInCurrentLevel / xpRangeForLevel) * 100))
      : 0;

  const xpNeededForNextLevel = Math.max(0, xpForNextLevel - totalXP);

  return {
    level: currentLevel,
    title: getTitleForLevel(currentLevel),
    currentXP: totalXP,
    xpForCurrentLevel,
    xpForNextLevel,
    progressToNextLevel,
    xpNeededForNextLevel,
  };
}

/**
 * Format date as ISO string or return null
 */
export function formatDateOrNull(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET /api/stats
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

    // Fetch or create UserStats
    let userStats = await db.userStats.findUnique({
      where: { userId: user.id },
    });

    // Create default stats if they don't exist
    if (!userStats) {
      userStats = await db.userStats.create({
        data: {
          userId: user.id,
          totalXP: 0,
          level: 1,
          currentStreak: 0,
          longestStreak: 0,
          booksCompleted: 0,
          totalReadingTime: 0,
          totalWordsRead: 0,
          totalCardsReviewed: 0,
          totalCardsCreated: 0,
          assessmentsCompleted: 0,
          followersCount: 0,
          followingCount: 0,
        },
      });
    }

    // Calculate level info from XP
    const levelInfo = calculateLevelFromXP(userStats.totalXP);

    // If the stored level doesn't match calculated level, update it
    if (userStats.level !== levelInfo.level) {
      await db.userStats.update({
        where: { id: userStats.id },
        data: { level: levelInfo.level },
      });
      userStats.level = levelInfo.level;
    }

    // Build response
    const response: GamificationStatsResponse = {
      userId: user.id,
      levelInfo,
      streak: {
        current: userStats.currentStreak,
        longest: userStats.longestStreak,
        lastActivityDate: formatDateOrNull(userStats.lastActivityDate),
      },
      reading: {
        booksCompleted: userStats.booksCompleted,
        totalReadingTime: userStats.totalReadingTime,
        totalWordsRead: userStats.totalWordsRead,
        averageWpm: userStats.averageWpm,
      },
      flashcards: {
        totalCardsReviewed: userStats.totalCardsReviewed,
        totalCardsCreated: userStats.totalCardsCreated,
        averageRetention: userStats.averageRetention,
      },
      assessments: {
        assessmentsCompleted: userStats.assessmentsCompleted,
        averageScore: userStats.averageScore,
      },
      social: {
        followersCount: userStats.followersCount,
        followingCount: userStats.followingCount,
      },
    };

    // Log the request
    logger.info("Gamification stats fetched", {
      userId: user.id,
      level: levelInfo.level,
      totalXP: userStats.totalXP,
      currentStreak: userStats.currentStreak,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error fetching gamification stats", {
      userId: clerkUserId,
      error: message,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch gamification stats. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
