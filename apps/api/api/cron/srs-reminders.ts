import type { VercelRequest, VercelResponse } from "@vercel/node";
import { logger } from "../../src/utils/logger";

/**
 * SRS Reminders Cron Job
 *
 * Schedule: Daily at 8:00 AM UTC
 * Purpose: Send email reminders to users with due flashcards
 *
 * This endpoint is called by Vercel Cron.
 * It requires the CRON_SECRET header for authentication.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Verify cron secret to prevent unauthorized access
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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

    // TODO: Implement when database and email services are configured
    // 1. Query users with cards due today
    // 2. Filter users who have reminders enabled
    // 3. Send reminder emails with card counts
    // 4. Log results

    const duration = Date.now() - startTime;

    logger.info("SRS reminders cron job completed", {
      duration,
      usersNotified: 0, // Placeholder
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "SRS reminders job completed",
      duration,
      usersNotified: 0,
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
