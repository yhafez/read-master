/**
 * TTS Download Endpoint - POST /api/tts/download
 *
 * Creates a TTS audio download job for a full book.
 * - Checks download quota (Pro: 5/month, Scholar: unlimited)
 * - Generates audio in chunks using TTS service
 * - Combines chunks into final file
 * - Uploads to R2 storage
 * - Returns job ID and status
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";
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
import { getUserByClerkId } from "../../src/services/db.js";
import { chunkText, calculateTTSCost } from "../../src/services/tts.js";
import {
  checkDownloadQuota,
  createDownloadRecord,
  getTTSProviderForTier,
  getDefaultVoice,
  getNextMonthReset,
  prismaProviderToService,
  type DownloadStatus,
  type AudioFormat,
} from "./downloadService.js";

// ============================================================================
// Types (re-exported from service)
// ============================================================================

export type { DownloadStatus };

// ============================================================================
// Request Validation
// ============================================================================

const downloadRequestSchema = z.object({
  bookId: z.string().min(1, "Book ID is required"),
  bookTitle: z.string().min(1, "Book title is required"),
  text: z.string().min(1, "Text content is required"),
  voice: z.string().optional(),
  format: z.enum(["MP3", "OPUS", "AAC", "FLAC", "WAV", "PCM"]).default("MP3"),
});

export type DownloadRequest = z.infer<typeof downloadRequestSchema>;

// ============================================================================
// Handler
// ============================================================================

async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== "POST") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use POST.",
      405
    );
    return;
  }

  const { userId } = req.auth;

  try {
    // Get user from database
    const user = await getUserByClerkId(userId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Free tier cannot download
    if (user.tier === "FREE") {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "TTS downloads require Pro or Scholar subscription",
        403,
        { tier: user.tier, upgradeRequired: true }
      );
      return;
    }

    // Check quota
    const quota = await checkDownloadQuota(user.id, user.tier);
    if (!quota.allowed) {
      sendError(
        res,
        ErrorCodes.RATE_LIMITED,
        "Monthly download limit reached",
        429,
        {
          used: quota.used,
          limit: quota.limit,
          remaining: quota.remaining,
          resetsAt: getNextMonthReset(),
        }
      );
      return;
    }

    // Parse and validate request
    const parseResult = downloadRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid request body",
        400,
        parseResult.error.flatten()
      );
      return;
    }

    const { bookId, bookTitle, text, voice, format } = parseResult.data;

    // Get provider for tier
    const provider = getTTSProviderForTier(user.tier);
    const serviceProvider = prismaProviderToService(provider);

    // Calculate chunks for the text
    const chunks = chunkText(text);
    const totalCharacters = text.length;
    const estimatedCost = calculateTTSCost(serviceProvider, totalCharacters);

    // Create download record in database
    const download = await createDownloadRecord({
      userId: user.id,
      bookId,
      bookTitle,
      provider,
      voice: voice || getDefaultVoice(provider),
      format: format as AudioFormat,
      totalChunks: chunks.length,
      totalCharacters,
      estimatedCost,
    });

    // Log the download creation
    logger.info("TTS download job created", {
      downloadId: download.id,
      userId: user.id,
      bookId,
      provider,
      totalCharacters: download.totalCharacters,
      totalChunks: download.totalChunks,
      estimatedCost: download.estimatedCost,
    });

    // In a real implementation, we would queue a background job here
    // For now, we just mark it as pending and return

    // Return success with job ID
    sendSuccess(
      res,
      {
        download: {
          id: download.id,
          status: download.status,
          provider: download.provider,
          voice: download.voice,
          format: download.format,
          totalChunks: download.totalChunks,
          totalCharacters: download.totalCharacters,
          estimatedCost: download.estimatedCost,
          expiresAt: download.expiresAt.toISOString(),
          createdAt: download.createdAt.toISOString(),
        },
        quota: {
          used: quota.used + 1,
          limit: quota.limit === Infinity ? "unlimited" : quota.limit,
          remaining:
            quota.limit === Infinity
              ? "unlimited"
              : Math.max(0, quota.remaining - 1),
        },
      },
      201
    );
  } catch (error) {
    logger.error("TTS download creation failed", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to create download job",
      500,
      { message: error instanceof Error ? error.message : "Unknown error" }
    );
  }
}

// ============================================================================
// Export with Auth Middleware
// ============================================================================

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export { downloadRequestSchema };
