/**
 * Streak Check Cron Job
 *
 * Schedule: Daily at midnight UTC (configured in vercel.json)
 * Purpose: Check and update user streaks, award streak achievements
 *
 * Streak logic:
 * - Users maintain streaks by having activity each day
 * - Activity = flashcard reviews OR reading progress updates
 * - Streaks reset if a day is missed
 * - Achievements are awarded at milestones (7, 30, 100, 365 days)
 *
 * This endpoint is called by Vercel Cron.
 * It requires the CRON_SECRET header for authentication.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { logger } from "../../src/utils/logger";
import { db } from "../../src/services/db";
import { ACHIEVEMENTS, checkAchievementCriteria } from "@read-master/shared";

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum number of users to process per batch
 */
export const BATCH_SIZE = 100;

/**
 * Streak achievement thresholds
 */
export const STREAK_MILESTONES = [7, 30, 100, 365] as const;

// ============================================================================
// Types
// ============================================================================

/**
 * User streak data
 */
export type UserStreakData = {
  userId: string;
  statsId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
};

/**
 * Result of processing streak checks
 */
export type StreakCheckResult = {
  usersProcessed: number;
  streaksChecked: number;
  streaksMaintained: number;
  streaksReset: number;
  streaksIncremented: number;
  achievementsAwarded: number;
  totalXpAwarded: number;
  errors: number;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify cron authorization
 */
export function verifyCronAuth(
  authHeader: string | undefined,
  cronSecret: string | undefined
): boolean {
  if (!cronSecret) {
    return true;
  }
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Get start of day in UTC
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
 * Check if two dates are the same day in UTC
 */
export function isSameDayUTC(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

/**
 * Check if a date is yesterday relative to reference date
 */
export function isYesterday(
  date: Date,
  referenceDate: Date = new Date()
): boolean {
  const yesterday = new Date(referenceDate);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return isSameDayUTC(date, yesterday);
}

/**
 * Get user's most recent activity date
 *
 * Considers:
 * 1. Flashcard reviews
 * 2. Reading progress updates
 */
export async function getUserLastActivityDate(
  userId: string
): Promise<Date | null> {
  // Get most recent flashcard review
  const lastReview = await db.flashcardReview.findFirst({
    where: {
      flashcard: { userId },
    },
    orderBy: { reviewedAt: "desc" },
    select: { reviewedAt: true },
  });

  // Get most recent reading progress update
  const lastRead = await db.readingProgress.findFirst({
    where: { userId },
    orderBy: { lastReadAt: "desc" },
    select: { lastReadAt: true },
  });

  const dates: Date[] = [];
  if (lastReview) dates.push(lastReview.reviewedAt);
  if (lastRead?.lastReadAt) dates.push(lastRead.lastReadAt);

  if (dates.length === 0) return null;

  // Return most recent activity
  return dates.reduce((a, b) => (a > b ? a : b));
}

/**
 * Check if user had activity on a specific day
 */
export async function hadActivityOnDay(
  userId: string,
  date: Date
): Promise<boolean> {
  const startOfDay = getStartOfDayUTC(date);
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

  // Check for flashcard reviews on that day
  const reviewCount = await db.flashcardReview.count({
    where: {
      flashcard: { userId },
      reviewedAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  });

  if (reviewCount > 0) return true;

  // Check for reading progress updates on that day
  const readingCount = await db.readingProgress.count({
    where: {
      userId,
      lastReadAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  });

  return readingCount > 0;
}

/**
 * Get all users with stats (batch)
 */
export async function getUsersWithStats(
  batchSize: number = BATCH_SIZE,
  offset: number = 0
): Promise<UserStreakData[]> {
  const stats = await db.userStats.findMany({
    select: {
      id: true,
      userId: true,
      currentStreak: true,
      longestStreak: true,
      lastActivityDate: true,
    },
    take: batchSize,
    skip: offset,
    orderBy: { createdAt: "asc" },
  });

  return stats.map((s) => ({
    userId: s.userId,
    statsId: s.id,
    currentStreak: s.currentStreak,
    longestStreak: s.longestStreak,
    lastActivityDate: s.lastActivityDate,
  }));
}

/**
 * Update user streak in database
 */
export async function updateUserStreak(
  statsId: string,
  newStreak: number,
  newLongest: number,
  lastActivity: Date | null
): Promise<void> {
  await db.userStats.update({
    where: { id: statsId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActivityDate: lastActivity,
    },
  });
}

/**
 * Award streak achievement to user
 */
export async function awardStreakAchievement(
  userId: string,
  achievementCode: string
): Promise<{ awarded: boolean; xp: number }> {
  const achievement = ACHIEVEMENTS.find((a) => a.code === achievementCode);
  if (!achievement) {
    return { awarded: false, xp: 0 };
  }

  // Check if user already has this achievement
  const dbAchievement = await db.achievement.findUnique({
    where: { code: achievementCode },
    select: { id: true },
  });

  if (!dbAchievement) {
    return { awarded: false, xp: 0 };
  }

  const existing = await db.userAchievement.findUnique({
    where: {
      userId_achievementId: {
        userId,
        achievementId: dbAchievement.id,
      },
    },
  });

  if (existing) {
    return { awarded: false, xp: 0 };
  }

  // Award the achievement
  await db.userAchievement.create({
    data: {
      userId,
      achievementId: dbAchievement.id,
      earnedAt: new Date(),
      notified: false,
    },
  });

  // Update user XP
  await db.userStats.update({
    where: { userId },
    data: {
      totalXP: { increment: achievement.xpReward },
    },
  });

  return { awarded: true, xp: achievement.xpReward };
}

/**
 * Check and award streak achievements for a user
 */
export async function checkStreakAchievements(
  userId: string,
  currentStreak: number
): Promise<{ awarded: number; totalXp: number }> {
  let awarded = 0;
  let totalXp = 0;

  // Get streak achievements from the shared constants
  const streakAchievements = ACHIEVEMENTS.filter(
    (a) =>
      a.category === "STREAK" &&
      a.isActive &&
      checkAchievementCriteria(a, { currentStreak })
  );

  for (const achievement of streakAchievements) {
    const result = await awardStreakAchievement(userId, achievement.code);
    if (result.awarded) {
      awarded++;
      totalXp += result.xp;

      logger.info("Streak achievement awarded", {
        userId,
        achievementCode: achievement.code,
        currentStreak,
        xp: result.xp,
      });
    }
  }

  return { awarded, totalXp };
}

/**
 * Process streak for a single user
 */
export async function processUserStreak(
  user: UserStreakData,
  referenceDate: Date = new Date()
): Promise<{
  maintained: boolean;
  reset: boolean;
  incremented: boolean;
  achievementsAwarded: number;
  xpAwarded: number;
}> {
  const result = {
    maintained: false,
    reset: false,
    incremented: false,
    achievementsAwarded: 0,
    xpAwarded: 0,
  };

  const yesterday = new Date(referenceDate);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  // Check if user had activity yesterday
  const hadYesterdayActivity = await hadActivityOnDay(user.userId, yesterday);

  if (!hadYesterdayActivity) {
    // No activity yesterday - reset streak if not already 0
    if (user.currentStreak > 0) {
      await updateUserStreak(
        user.statsId,
        0,
        user.longestStreak,
        user.lastActivityDate
      );
      result.reset = true;

      logger.info("Streak reset", {
        userId: user.userId,
        previousStreak: user.currentStreak,
      });
    }
    return result;
  }

  // Had activity yesterday - maintain or increment streak
  const newStreak = user.currentStreak + 1;
  const newLongest = Math.max(user.longestStreak, newStreak);

  await updateUserStreak(user.statsId, newStreak, newLongest, yesterday);
  result.maintained = true;
  result.incremented = true;

  // Check for streak achievements
  const achievements = await checkStreakAchievements(user.userId, newStreak);
  result.achievementsAwarded = achievements.awarded;
  result.xpAwarded = achievements.totalXp;

  logger.info("Streak updated", {
    userId: user.userId,
    previousStreak: user.currentStreak,
    newStreak,
    newLongest,
    achievementsAwarded: achievements.awarded,
  });

  return result;
}

/**
 * Process all user streaks
 */
export async function processStreakCheck(): Promise<StreakCheckResult> {
  const result: StreakCheckResult = {
    usersProcessed: 0,
    streaksChecked: 0,
    streaksMaintained: 0,
    streaksReset: 0,
    streaksIncremented: 0,
    achievementsAwarded: 0,
    totalXpAwarded: 0,
    errors: 0,
  };

  let offset = 0;
  let hasMore = true;
  const referenceDate = new Date();

  while (hasMore) {
    const users = await getUsersWithStats(BATCH_SIZE, offset);

    if (users.length === 0) {
      hasMore = false;
      break;
    }

    for (const user of users) {
      result.usersProcessed++;
      result.streaksChecked++;

      try {
        const userResult = await processUserStreak(user, referenceDate);

        if (userResult.maintained) result.streaksMaintained++;
        if (userResult.reset) result.streaksReset++;
        if (userResult.incremented) result.streaksIncremented++;
        result.achievementsAwarded += userResult.achievementsAwarded;
        result.totalXpAwarded += userResult.xpAwarded;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("Failed to process user streak", {
          userId: user.userId,
          error: message,
        });
        result.errors++;
      }
    }

    offset += BATCH_SIZE;

    if (users.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  return result;
}

// ============================================================================
// Main Handler
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Verify cron secret to prevent unauthorized access
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (!verifyCronAuth(authHeader, cronSecret)) {
    logger.warn("Unauthorized cron job attempt", {
      endpoint: "/api/cron/streak-check",
      ip: req.headers["x-forwarded-for"] ?? "unknown",
    });
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Only allow GET requests (Vercel Cron uses GET)
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const startTime = Date.now();

  try {
    logger.info("Starting streak check cron job", {
      timestamp: new Date().toISOString(),
    });

    const result = await processStreakCheck();

    const duration = Date.now() - startTime;

    logger.info("Streak check cron job completed", {
      duration,
      ...result,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Streak check job completed",
      duration,
      stats: result,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("Streak check cron job failed", {
      error: errorMessage,
      duration,
    });

    res.status(500).json({
      success: false,
      error: "Failed to check streaks",
      message: errorMessage,
    });
  }
}
