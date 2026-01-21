/**
 * Weekly Digest Cron Job
 *
 * Sends weekly reading summary emails to active users.
 * Runs every Monday at 8:00 AM UTC.
 *
 * Vercel Cron Configuration:
 * {
 *   "crons": [{
 *     "path": "/api/cron/weekly-digest",
 *     "schedule": "0 8 * * 1"
 *   }]
 * }
 */

import type { VercelRequest, VercelResponse} from "@vercel/node";
import { db } from "../../src/services/db.js";
import { sendWeeklyDigest } from "../../src/services/emailTriggers.js";
import { logger } from "../../src/utils/logger.js";
import { sendSuccess, sendError } from "../../src/utils/response.js";

const CRON_SECRET = process.env.CRON_SECRET || "";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST requests
  if (req.method !== "POST") {
    return sendError(res, "VALIDATION_ERROR", "Method not allowed", 405);
  }

  // Verify cron secret
  const authHeader = req.headers.authorization;

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    logger.warn("Unauthorized cron job attempt", {
      path: "/api/cron/weekly-digest",
    });
    return sendError(res, "UNAUTHORIZED", "Unauthorized", 401);
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;

  try {
    logger.info("Starting weekly digest cron job");

    // Find users who are active and have weekly digest enabled
    const users = await db.user.findMany({
      where: {
        deletedAt: null,
        // Filter for users with email preferences enabled
        emailPreferences: {
          emailEnabled: true,
          weeklyDigest: true,
        },
      },
      include: {
        stats: true,
      },
      // Limit to prevent overwhelming the system
      take: 1000,
    });

    logger.info(`Found ${users.length} users for weekly digest`);

    // Send digest to each user
    for (const user of users) {
      processed++;

      // Skip users with no reading activity
      if (!user.stats || user.stats.totalReadingTime === 0) {
        logger.info("Skipping user with no reading activity", {
          userId: user.id,
        });
        continue;
      }

      // Send the digest
      const result = await sendWeeklyDigest(user.id);

      if (result.success) {
        sent++;
      } else {
        failed++;
        logger.warn("Failed to send weekly digest", {
          userId: user.id,
          error: result.error,
        });
      }

      // Rate limiting: wait 200ms between emails
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    logger.info("Weekly digest cron job completed", {
      processed,
      sent,
      failed,
    });

    sendSuccess(res, {
      message: "Weekly digests processed",
      processed,
      sent,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Weekly digest cron job failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    sendError(res, "INTERNAL_ERROR", "Failed to process weekly digests", 500);
  }
}
