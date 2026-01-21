/**
 * Re-Engagement Emails Cron Job
 *
 * Runs daily to send emails to inactive users (3, 7, and 30 days).
 * Schedule: Daily at 10:00 AM UTC
 *
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/re-engagement-emails",
 *     "schedule": "0 10 * * *"
 *   }]
 * }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { processReEngagementCampaigns } from "../../src/services/emailTriggers.js";
import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return sendError(
      res,
      ErrorCodes.METHOD_NOT_ALLOWED,
      "Method not allowed",
      405
    );
  }

  // Verify cron secret
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn("Unauthorized cron job access attempt", {
      path: "/api/cron/re-engagement-emails",
    });
    return sendError(res, ErrorCodes.UNAUTHORIZED, "Unauthorized", 401);
  }

  try {
    logger.info("Re-engagement emails cron job started");

    // Process re-engagement campaigns
    const result = await processReEngagementCampaigns();

    logger.info("Re-engagement emails cron job completed", {
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
    });

    return sendSuccess(res, {
      message: "Re-engagement campaigns processed successfully",
      result: {
        processed: result.processed,
        sent: result.sent,
        failed: result.failed,
      },
    });
  } catch (error) {
    logger.error("Re-engagement emails cron job failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to process re-engagement campaigns",
      500
    );
  }
}
