/**
 * Onboarding Emails Cron Job
 *
 * Runs daily to send scheduled onboarding emails to users
 * based on their signup date.
 *
 * Vercel Cron: Runs at 10:00 AM UTC daily
 *
 * To configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/onboarding-emails",
 *     "schedule": "0 10 * * *"
 *   }]
 * }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { processOnboardingSequence } from "../../src/services/emailTriggers.js";
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
      path: "/api/cron/onboarding-emails",
    });
    return sendError(res, "UNAUTHORIZED", "Unauthorized", 401);
  }

  try {
    logger.info("Starting onboarding emails cron job");

    const results = await processOnboardingSequence();

    logger.info("Onboarding emails cron job completed", results);

    sendSuccess(res, {
      message: "Onboarding emails processed",
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Onboarding emails cron job failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    sendError(
      res,
      "INTERNAL_ERROR",
      "Failed to process onboarding emails",
      500
    );
  }
}
