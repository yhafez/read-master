import type { VercelRequest, VercelResponse } from "@vercel/node";
import { logger } from "../../src/utils/logger";

/**
 * Streak Check Cron Job
 *
 * Schedule: Daily at midnight UTC
 * Purpose: Check and update user streaks, award streak achievements
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

    // TODO: Implement when database is configured
    // 1. Query all users with active streaks
    // 2. Check if they completed required activity yesterday
    // 3. Update streak counts (increment or reset)
    // 4. Award streak achievements (7-day, 30-day, 100-day, etc.)
    // 5. Log results

    const duration = Date.now() - startTime;

    logger.info("Streak check cron job completed", {
      duration,
      streaksChecked: 0, // Placeholder
      streaksReset: 0,
      achievementsAwarded: 0,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Streak check job completed",
      duration,
      stats: {
        streaksChecked: 0,
        streaksReset: 0,
        achievementsAwarded: 0,
      },
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
