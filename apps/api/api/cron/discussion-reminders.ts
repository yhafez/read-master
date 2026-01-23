/**
 * Discussion Reminders Cron Job
 *
 * Runs every hour to send reminder emails for upcoming book club discussions.
 * Sends reminders at 24 hours and 1 hour before scheduled discussions.
 *
 * Vercel Cron: Runs at the top of every hour
 *
 * To configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/discussion-reminders",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { processDiscussionReminders } from "../../src/services/emailTriggers.js";
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

  // Verify cron secret (Vercel automatically adds this header)
  const authHeader = req.headers.authorization;

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    logger.warn("Unauthorized cron job attempt", {
      path: "/api/cron/discussion-reminders",
    });
    return sendError(res, "UNAUTHORIZED", "Unauthorized", 401);
  }

  try {
    logger.info("Starting discussion reminders cron job");

    const results = await processDiscussionReminders();

    logger.info("Discussion reminders cron job completed", results);

    sendSuccess(res, {
      message: "Discussion reminders processed",
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Discussion reminders cron job failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    sendError(
      res,
      "INTERNAL_ERROR",
      "Failed to process discussion reminders",
      500
    );
  }
}
