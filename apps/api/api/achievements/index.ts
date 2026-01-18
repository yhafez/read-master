/**
 * Achievements API endpoints
 *
 * GET /api/achievements - List all achievements with user's unlock status
 * POST /api/achievements/check - Check and award new achievements
 *
 * @example
 * ```bash
 * # Get all achievements with unlock status
 * curl -X GET "/api/achievements" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Check and award new achievements
 * curl -X POST "/api/achievements/check" \
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
import {
  ACHIEVEMENTS,
  type AchievementDefinition,
  type AchievementCheckStats,
  checkAchievementCriteria,
} from "@read-master/shared";

// ============================================================================
// Types
// ============================================================================

/**
 * Achievement with user's unlock status
 */
export type AchievementWithStatus = {
  code: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  xpReward: number;
  badgeIcon: string;
  badgeColor: string;
  sortOrder: number;
  isActive: boolean;
  isUnlocked: boolean;
  unlockedAt: string | null;
};

/**
 * GET response: List of achievements
 */
export type AchievementsListResponse = {
  achievements: AchievementWithStatus[];
  totalCount: number;
  unlockedCount: number;
  categories: {
    name: string;
    total: number;
    unlocked: number;
  }[];
};

/**
 * POST /check response: Newly unlocked achievements
 */
export type AchievementsCheckResponse = {
  newlyUnlocked: AchievementWithStatus[];
  totalXpAwarded: number;
  previousXp: number;
  newXp: number;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map AchievementDefinition to API response format
 */
export function mapAchievementToResponse(
  achievement: AchievementDefinition,
  isUnlocked: boolean,
  unlockedAt: Date | null
): AchievementWithStatus {
  return {
    code: achievement.code,
    name: achievement.name,
    description: achievement.description,
    category: achievement.category,
    tier: achievement.tier,
    xpReward: achievement.xpReward,
    badgeIcon: achievement.badgeIcon,
    badgeColor: achievement.badgeColor,
    sortOrder: achievement.sortOrder,
    isActive: achievement.isActive,
    isUnlocked,
    unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
  };
}

/**
 * Build user stats from database for achievement checking
 */
export async function buildAchievementCheckStats(
  userId: string
): Promise<AchievementCheckStats> {
  // Fetch user stats
  const userStats = await db.userStats.findUnique({
    where: { userId },
  });

  // Count highlights (annotations of type HIGHLIGHT)
  const highlightsCount = await db.annotation.count({
    where: {
      userId,
      type: "HIGHLIGHT",
      deletedAt: null,
    },
  });

  // Count all annotations
  const annotationsCount = await db.annotation.count({
    where: {
      userId,
      deletedAt: null,
    },
  });

  // Count groups created (userId is the owner)
  const groupsCount = await db.readingGroup.count({
    where: {
      userId,
    },
  });

  // Count public curriculums created (userId is the creator)
  const publicCurriculumsCount = await db.curriculum.count({
    where: {
      userId,
      visibility: "PUBLIC",
      deletedAt: null,
    },
  });

  // Count best answers in forum
  const bestAnswersCount = await db.forumReply.count({
    where: {
      userId,
      isBestAnswer: true,
      deletedAt: null,
    },
  });

  // Count assessments with score >= 80% (assessments don't have soft delete)
  const assessments80PlusCount = await db.assessment.count({
    where: {
      userId,
      score: {
        gte: 80, // Score is 0-100 in the schema
      },
    },
  });

  // Get latest assessment score
  const latestAssessment = await db.assessment.findFirst({
    where: {
      userId,
      score: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      score: true,
    },
  });

  // Count mastered cards (interval >= 21 days is considered mastered)
  const masteredCardsCount = await db.flashcard.count({
    where: {
      userId,
      interval: {
        gte: 21,
      },
      deletedAt: null,
    },
  });

  // Build the stats object - only include defined values for optional properties
  const stats: AchievementCheckStats = {
    booksCompleted: userStats?.booksCompleted ?? 0,
    currentStreak: userStats?.currentStreak ?? 0,
    cardsReviewed: userStats?.totalCardsReviewed ?? 0,
    cardsMastered: masteredCardsCount,
    highlightsCreated: highlightsCount,
    annotationsCreated: annotationsCount,
    followersCount: userStats?.followersCount ?? 0,
    groupsCreated: groupsCount,
    publicCurriculumsCreated: publicCurriculumsCount,
    bestAnswers: bestAnswersCount,
    assessmentsCompleted: userStats?.assessmentsCompleted ?? 0,
    assessments80Plus: assessments80PlusCount,
  };

  // Only add optional fields if they have values
  if (userStats?.averageWpm != null) {
    stats.avgReadingSpeed = userStats.averageWpm;
  }
  if (userStats?.averageRetention != null) {
    stats.retentionRate = userStats.averageRetention;
  }
  if (latestAssessment?.score != null) {
    stats.latestAssessmentScore = latestAssessment.score;
  }

  return stats;
}

/**
 * Calculate level from XP using the level thresholds
 */
export function calculateLevelFromXP(totalXP: number): number {
  const LEVEL_THRESHOLDS = [
    0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000,
  ] as const;
  const XP_PER_LEVEL_AFTER_10 = 5000;
  const LEVEL_10_THRESHOLD = 10000; // LEVEL_THRESHOLDS[9]

  // Handle negative XP
  if (totalXP < 0) {
    return 1;
  }

  // Check levels 1-10
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    const threshold = LEVEL_THRESHOLDS[i];
    // threshold is always defined since we're iterating within bounds
    if (threshold !== undefined && totalXP >= threshold) {
      if (i === 9) {
        // Level 10, check for beyond
        const xpAbove10 = totalXP - LEVEL_10_THRESHOLD;
        const additionalLevels = Math.floor(xpAbove10 / XP_PER_LEVEL_AFTER_10);
        return 10 + additionalLevels;
      }
      return i + 1;
    }
  }
  return 1;
}

/**
 * Get or create achievement in database by code
 */
export async function getOrCreateAchievement(
  definition: AchievementDefinition
): Promise<{ id: string }> {
  // Try to find existing achievement
  let achievement = await db.achievement.findUnique({
    where: { code: definition.code },
    select: { id: true },
  });

  // Create if not exists
  if (!achievement) {
    achievement = await db.achievement.create({
      data: {
        code: definition.code,
        name: definition.name,
        description: definition.description,
        category: definition.category,
        tier: definition.tier,
        xpReward: definition.xpReward,
        badgeIcon: definition.badgeIcon,
        badgeColor: definition.badgeColor,
        sortOrder: definition.sortOrder,
        isActive: definition.isActive,
        criteria: {},
      },
      select: { id: true },
    });
  }

  return achievement;
}

/**
 * Seed all achievements into the database
 */
export async function seedAchievements(): Promise<Map<string, string>> {
  const achievementMap = new Map<string, string>();

  for (const definition of ACHIEVEMENTS) {
    const achievement = await getOrCreateAchievement(definition);
    achievementMap.set(definition.code, achievement.id);
  }

  return achievementMap;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handle GET /api/achievements
 * List all achievements with user's unlock status
 */
async function handleGet(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const { userId: clerkUserId } = req.auth;

  try {
    const user = await getUserByClerkId(clerkUserId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Ensure achievements are seeded
    await seedAchievements();

    // Get user's unlocked achievements
    const userAchievements = await db.userAchievement.findMany({
      where: { userId: user.id },
      include: {
        achievement: {
          select: { code: true },
        },
      },
    });

    // Create a map for quick lookup
    const unlockedMap = new Map<string, Date>();
    for (const ua of userAchievements) {
      unlockedMap.set(ua.achievement.code, ua.earnedAt);
    }

    // Build response
    const achievementsList: AchievementWithStatus[] = ACHIEVEMENTS.map(
      (achievement) => {
        const unlockedAt = unlockedMap.get(achievement.code) ?? null;
        return mapAchievementToResponse(
          achievement,
          unlockedAt !== null,
          unlockedAt
        );
      }
    );

    // Sort by sortOrder
    achievementsList.sort((a, b) => a.sortOrder - b.sortOrder);

    // Calculate category statistics
    const categoryStats = new Map<
      string,
      { total: number; unlocked: number }
    >();
    for (const achievement of achievementsList) {
      const stats = categoryStats.get(achievement.category) ?? {
        total: 0,
        unlocked: 0,
      };
      stats.total++;
      if (achievement.isUnlocked) {
        stats.unlocked++;
      }
      categoryStats.set(achievement.category, stats);
    }

    const categories = Array.from(categoryStats.entries()).map(
      ([name, stats]) => ({
        name,
        total: stats.total,
        unlocked: stats.unlocked,
      })
    );

    const unlockedCount = achievementsList.filter((a) => a.isUnlocked).length;

    const response: AchievementsListResponse = {
      achievements: achievementsList,
      totalCount: achievementsList.length,
      unlockedCount,
      categories,
    };

    logger.info("Achievements list fetched", {
      userId: user.id,
      totalCount: achievementsList.length,
      unlockedCount,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error fetching achievements", {
      userId: clerkUserId,
      error: message,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch achievements. Please try again.",
      500
    );
  }
}

/**
 * Handle POST /api/achievements/check
 * Check and award new achievements based on user's current stats
 */
async function handleCheck(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const { userId: clerkUserId } = req.auth;

  try {
    const user = await getUserByClerkId(clerkUserId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Ensure achievements are seeded
    await seedAchievements();

    // Get user's already unlocked achievements
    const userAchievements = await db.userAchievement.findMany({
      where: { userId: user.id },
      include: {
        achievement: {
          select: { code: true },
        },
      },
    });

    const alreadyUnlockedCodes = new Set(
      userAchievements.map((ua) => ua.achievement.code)
    );

    // Build stats for checking
    const stats = await buildAchievementCheckStats(user.id);

    // Find achievements that can be unlocked
    const newlyUnlocked: AchievementWithStatus[] = [];
    let totalXpAwarded = 0;

    for (const achievement of ACHIEVEMENTS) {
      // Skip if already unlocked or inactive
      if (alreadyUnlockedCodes.has(achievement.code) || !achievement.isActive) {
        continue;
      }

      // Check if criteria are met
      if (checkAchievementCriteria(achievement, stats)) {
        // Get achievement ID from database
        const dbAchievement = await db.achievement.findUnique({
          where: { code: achievement.code },
          select: { id: true },
        });

        if (!dbAchievement) {
          continue;
        }

        // Create user achievement record
        const userAchievement = await db.userAchievement.create({
          data: {
            userId: user.id,
            achievementId: dbAchievement.id,
            earnedAt: new Date(),
            notified: false,
          },
        });

        totalXpAwarded += achievement.xpReward;

        newlyUnlocked.push(
          mapAchievementToResponse(achievement, true, userAchievement.earnedAt)
        );
      }
    }

    // Get current user stats for XP update
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
        },
      });
    }

    const previousXp = userStats.totalXP;
    const previousLevel = calculateLevelFromXP(previousXp);
    const newXp = previousXp + totalXpAwarded;
    const newLevel = calculateLevelFromXP(newXp);

    // Update user XP if any achievements were unlocked
    if (totalXpAwarded > 0) {
      await db.userStats.update({
        where: { id: userStats.id },
        data: {
          totalXP: newXp,
          level: newLevel,
        },
      });
    }

    const response: AchievementsCheckResponse = {
      newlyUnlocked,
      totalXpAwarded,
      previousXp,
      newXp,
      previousLevel,
      newLevel,
      leveledUp: newLevel > previousLevel,
    };

    logger.info("Achievements check completed", {
      userId: user.id,
      newlyUnlockedCount: newlyUnlocked.length,
      totalXpAwarded,
      leveledUp: newLevel > previousLevel,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error checking achievements", {
      userId: clerkUserId,
      error: message,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to check achievements. Please try again.",
      500
    );
  }
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Route handler for /api/achievements
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Parse the URL to check for /check suffix
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const isCheckEndpoint = url.pathname.endsWith("/check");

  if (req.method === "GET" && !isCheckEndpoint) {
    return handleGet(req, res);
  }

  if (req.method === "POST" && isCheckEndpoint) {
    return handleCheck(req, res);
  }

  // For POST to base endpoint, also support check
  if (req.method === "POST" && !isCheckEndpoint) {
    return handleCheck(req, res);
  }

  sendError(
    res,
    ErrorCodes.VALIDATION_ERROR,
    "Method not allowed. Use GET for listing or POST for checking.",
    405
  );
}

export default withAuth(handler);
