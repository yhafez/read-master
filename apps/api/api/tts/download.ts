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

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { logger } from "../../src/utils/logger.js";
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
// Mock User Data (for testing without full auth)
// ============================================================================

interface MockUser {
  id: string;
  tier: "FREE" | "PRO" | "SCHOLAR";
}

function getMockUser(req: VercelRequest): MockUser | null {
  // In production, this would use Clerk auth
  // For now, use mock user from headers or defaults
  const userId = req.headers["x-user-id"] as string | undefined;
  const tier = (req.headers["x-user-tier"] as string | undefined) || "PRO";

  if (!userId) {
    return null;
  }

  return {
    id: userId,
    tier: tier as "FREE" | "PRO" | "SCHOLAR",
  };
}

// ============================================================================
// Handler
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Get user (mock for now)
    const user = getMockUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Free tier cannot download
    if (user.tier === "FREE") {
      res.status(403).json({
        error: "TTS downloads require Pro or Scholar subscription",
        tier: user.tier,
        upgradeRequired: true,
      });
      return;
    }

    // Check quota
    const quota = await checkDownloadQuota(user.id, user.tier);
    if (!quota.allowed) {
      res.status(429).json({
        error: "Monthly download limit reached",
        used: quota.used,
        limit: quota.limit,
        remaining: quota.remaining,
        resetsAt: getNextMonthReset(),
      });
      return;
    }

    // Parse and validate request
    const parseResult = downloadRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: "Invalid request",
        details: parseResult.error.flatten().fieldErrors,
      });
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
    res.status(201).json({
      success: true,
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
    });
  } catch (error) {
    logger.error("TTS download creation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      error: "Failed to create download job",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ============================================================================
// Exports for Testing
// ============================================================================

export { downloadRequestSchema, getMockUser };
