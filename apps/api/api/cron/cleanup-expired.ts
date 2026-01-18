import type { VercelRequest, VercelResponse } from "@vercel/node";
import { logger } from "../../src/utils/logger";

/**
 * Cleanup Expired Data Cron Job
 *
 * Schedule: Weekly on Sundays at 3:00 AM UTC
 * Purpose: Clean up expired downloads, old audit logs, and orphaned data
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
      endpoint: "/api/cron/cleanup-expired",
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
    logger.info("Starting cleanup cron job", {
      timestamp: new Date().toISOString(),
    });

    // TODO: Implement when database and R2 storage are configured
    // 1. Delete expired TTS downloads from R2 (older than 30 days)
    // 2. Delete old audit logs (older than 90 days, configurable)
    // 3. Clean up orphaned files in R2 (no database reference)
    // 4. Delete soft-deleted records older than retention period
    // 5. Clean up expired cache entries
    // 6. Log results

    const duration = Date.now() - startTime;

    logger.info("Cleanup cron job completed", {
      duration,
      expiredDownloadsDeleted: 0, // Placeholder
      oldAuditLogsDeleted: 0,
      orphanedFilesDeleted: 0,
      softDeletedRecordsPurged: 0,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Cleanup job completed",
      duration,
      stats: {
        expiredDownloadsDeleted: 0,
        oldAuditLogsDeleted: 0,
        orphanedFilesDeleted: 0,
        softDeletedRecordsPurged: 0,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("Cleanup cron job failed", {
      error: errorMessage,
      duration,
    });

    res.status(500).json({
      success: false,
      error: "Failed to clean up expired data",
      message: errorMessage,
    });
  }
}
