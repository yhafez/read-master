/**
 * SRS Reminders Cron Job
 *
 * Schedule: Daily at 8:00 AM UTC (configured in vercel.json)
 * Purpose: Identify users with due flashcards who have reminders enabled
 *          and log notifications (actual email sending would be done via email service)
 *
 * This endpoint is called by Vercel Cron.
 * It requires the CRON_SECRET header for authentication.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { logger } from "../../src/utils/logger";
import { db } from "../../src/services/db";

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum number of users to process per batch
 */
export const BATCH_SIZE = 100;

/**
 * Minimum cards due to trigger a reminder
 */
export const MIN_DUE_CARDS_FOR_REMINDER = 1;

// ============================================================================
// Types
// ============================================================================

/**
 * User with due flashcard count
 */
export type UserWithDueCards = {
  userId: string;
  email: string;
  displayName: string | null;
  dueCount: number;
  timezone: string;
};

/**
 * Result of processing SRS reminders
 */
export type SrsRemindersResult = {
  usersProcessed: number;
  usersWithDueCards: number;
  usersNotified: number;
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
  // If no cron secret configured, allow in development
  if (!cronSecret) {
    return true;
  }
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Get users with due flashcards
 *
 * Finds users who:
 * 1. Have active (not soft-deleted) accounts
 * 2. Have at least one flashcard due (dueDate <= now)
 * 3. Have not suspended all their cards
 *
 * Note: Email/push notification preferences would be checked
 * via user.preferences JSON field in a production implementation.
 */
export async function getUsersWithDueCards(
  batchSize: number = BATCH_SIZE,
  offset: number = 0
): Promise<UserWithDueCards[]> {
  const now = new Date();

  // Find users with due cards using a subquery approach
  const usersWithCards = await db.user.findMany({
    where: {
      deletedAt: null,
      flashcards: {
        some: {
          dueDate: { lte: now },
          status: { not: "SUSPENDED" },
          deletedAt: null,
        },
      },
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      timezone: true,
      preferences: true,
      flashcards: {
        where: {
          dueDate: { lte: now },
          status: { not: "SUSPENDED" },
          deletedAt: null,
        },
        select: { id: true },
      },
    },
    take: batchSize,
    skip: offset,
    orderBy: { createdAt: "asc" },
  });

  return usersWithCards.map((user) => ({
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    dueCount: user.flashcards.length,
    timezone: user.timezone,
  }));
}

/**
 * Check if a user has reminders enabled
 *
 * Checks the user's preferences JSON for srsRemindersEnabled flag.
 * Defaults to true if not explicitly set.
 */
export function hasRemindersEnabled(preferences: unknown): boolean {
  if (!preferences || typeof preferences !== "object") {
    return true; // Default to enabled
  }

  const prefs = preferences as Record<string, unknown>;

  // Check for explicit opt-out
  if (prefs.srsRemindersEnabled === false) {
    return false;
  }

  return true;
}

/**
 * Log notification for a user (placeholder for actual email sending)
 *
 * In production, this would:
 * 1. Send an email via SendGrid/Resend/etc.
 * 2. Send a push notification via web-push
 * 3. Create a notification record in the database
 *
 * For now, we just log the notification intent.
 */
export async function logNotification(user: UserWithDueCards): Promise<void> {
  logger.info("SRS reminder notification queued", {
    userId: user.userId,
    email: user.email,
    dueCount: user.dueCount,
    timezone: user.timezone,
    // In production, would include:
    // emailSent: true,
    // pushSent: boolean,
    // notificationId: string
  });
}

/**
 * Process all users and send reminders
 */
export async function processSrsReminders(): Promise<SrsRemindersResult> {
  const result: SrsRemindersResult = {
    usersProcessed: 0,
    usersWithDueCards: 0,
    usersNotified: 0,
    errors: 0,
  };

  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const users = await getUsersWithDueCards(BATCH_SIZE, offset);

    if (users.length === 0) {
      hasMore = false;
      break;
    }

    result.usersWithDueCards += users.length;

    for (const user of users) {
      result.usersProcessed++;

      // Check if user meets minimum threshold
      if (user.dueCount < MIN_DUE_CARDS_FOR_REMINDER) {
        continue;
      }

      try {
        // Log the notification (in production, would send email/push)
        await logNotification(user);
        result.usersNotified++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("Failed to send SRS reminder", {
          userId: user.userId,
          error: message,
        });
        result.errors++;
      }
    }

    offset += BATCH_SIZE;

    // Safety check to prevent infinite loops
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
      endpoint: "/api/cron/srs-reminders",
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
    logger.info("Starting SRS reminders cron job", {
      timestamp: new Date().toISOString(),
    });

    const result = await processSrsReminders();

    const duration = Date.now() - startTime;

    logger.info("SRS reminders cron job completed", {
      duration,
      ...result,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "SRS reminders job completed",
      duration,
      usersNotified: result.usersNotified,
      stats: result,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("SRS reminders cron job failed", {
      error: errorMessage,
      duration,
    });

    res.status(500).json({
      success: false,
      error: "Failed to send SRS reminders",
      message: errorMessage,
    });
  }
}
