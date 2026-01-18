/**
 * POST /api/achievements/check - Check and award new achievements
 *
 * Checks user's current stats against all achievement criteria
 * and awards any newly earned achievements with XP.
 *
 * @example
 * ```bash
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
import { ACHIEVEMENTS, checkAchievementCriteria } from "@read-master/shared";
import {
  type AchievementsCheckResponse,
  mapAchievementToResponse,
  buildAchievementCheckStats,
  calculateLevelFromXP,
  seedAchievements,
} from "./index.js";

// ============================================================================
// Main Handler
// ============================================================================

async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use POST.",
      405
    );
    return;
  }

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
    const newlyUnlocked: ReturnType<typeof mapAchievementToResponse>[] = [];
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

export default withAuth(handler);
