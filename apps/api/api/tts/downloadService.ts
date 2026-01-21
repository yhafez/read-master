/**
 * TTS Download Service - Database operations for TTS downloads
 * Replaces in-memory storage with Prisma database operations
 */

import { db } from "../../src/services/db.js";
import type { TTSProvider as ServiceTTSProvider } from "../../src/services/tts.js";
import { logger } from "../../src/utils/logger.js";
import type { TTSProvider, AudioFormat, DownloadStatus } from "@prisma/client";

// ============================================================================
// Types (re-export from Prisma for consistency)
// ============================================================================

export type { TTSProvider, AudioFormat, DownloadStatus };

// Use Prisma's TTSDownload type
export type TTSDownload = {
  id: string;
  userId: string;
  bookId: string;
  bookTitle: string;
  status: DownloadStatus;
  provider: TTSProvider;
  voice: string;
  format: AudioFormat;
  totalChunks: number;
  processedChunks: number;
  totalCharacters: number;
  estimatedCost: number;
  actualCost: number;
  fileKey: string | null;
  fileSize: number | null;
  downloadUrl: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  expiresAt: Date;
  deletedAt: Date | null;
};

// ============================================================================
// Constants
// ============================================================================

/**
 * Monthly download quota by tier
 */
export const DOWNLOAD_QUOTAS = {
  FREE: 0, // Free users cannot download
  PRO: 5, // Pro: 5 downloads per month
  SCHOLAR: Infinity, // Scholar: unlimited
} as const;

/**
 * Download expiry time in days
 */
export const DOWNLOAD_EXPIRY_DAYS = 30;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique download ID
 */
export function generateDownloadId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `dl_${timestamp}_${random}`;
}

/**
 * Get the current month key for quota tracking
 */
export function getMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Get user's download count for current month
 */
export async function getUserMonthlyDownloads(userId: string): Promise<number> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const count = await db.tTSDownload.count({
    where: {
      userId,
      createdAt: {
        gte: monthStart,
      },
      deletedAt: null,
    },
  });

  return count;
}

/**
 * Check if user has remaining download quota
 */
export async function checkDownloadQuota(
  userId: string,
  tier: keyof typeof DOWNLOAD_QUOTAS
): Promise<{
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
}> {
  const limit = DOWNLOAD_QUOTAS[tier];
  const used = await getUserMonthlyDownloads(userId);
  const remaining = Math.max(0, limit - used);
  const allowed = remaining > 0 || limit === Infinity;

  return { allowed, remaining, used, limit };
}

/**
 * Get TTS provider for tier (returns Prisma enum format)
 */
export function getTTSProviderForTier(
  tier: "FREE" | "PRO" | "SCHOLAR"
): TTSProvider {
  switch (tier) {
    case "SCHOLAR":
      return "ELEVENLABS";
    case "PRO":
      return "OPENAI";
    default:
      return "WEB_SPEECH";
  }
}

/**
 * Convert service TTS provider to Prisma enum
 */
export function serviceProviderToPrisma(
  provider: ServiceTTSProvider
): TTSProvider {
  switch (provider.toLowerCase()) {
    case "elevenlabs":
      return "ELEVENLABS";
    case "openai":
      return "OPENAI";
    default:
      return "WEB_SPEECH";
  }
}

/**
 * Convert Prisma TTS provider to service format
 */
export function prismaProviderToService(
  provider: TTSProvider
): ServiceTTSProvider {
  switch (provider) {
    case "ELEVENLABS":
      return "elevenlabs";
    case "OPENAI":
      return "openai";
    default:
      return "web_speech";
  }
}

/**
 * Calculate expiry date
 */
export function calculateExpiryDate(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + DOWNLOAD_EXPIRY_DAYS);
  return expiry;
}

/**
 * Build storage key for TTS download
 */
export function buildDownloadKey(
  userId: string,
  downloadId: string,
  format: AudioFormat
): string {
  return `users/${userId}/audio/downloads/${downloadId}.${format.toLowerCase()}`;
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Create a new download record
 */
export async function createDownloadRecord(params: {
  userId: string;
  bookId: string;
  bookTitle: string;
  provider: TTSProvider;
  voice: string;
  format: AudioFormat;
  totalChunks: number;
  totalCharacters: number;
  estimatedCost: number;
}): Promise<TTSDownload> {
  const {
    userId,
    bookId,
    bookTitle,
    provider,
    voice,
    format,
    totalChunks,
    totalCharacters,
    estimatedCost,
  } = params;

  const id = generateDownloadId();

  const download = await db.tTSDownload.create({
    data: {
      id,
      userId,
      bookId,
      bookTitle,
      status: "PENDING",
      provider,
      voice,
      format,
      totalChunks,
      processedChunks: 0,
      totalCharacters,
      estimatedCost,
      actualCost: 0,
      expiresAt: calculateExpiryDate(),
    },
  });

  logger.info("TTS download record created", {
    downloadId: download.id,
    userId,
    bookId,
    provider,
  });

  return download;
}

/**
 * Update download record status
 */
export async function updateDownloadStatus(
  id: string,
  updates: Partial<Omit<TTSDownload, "id" | "userId" | "bookId" | "createdAt">>
): Promise<TTSDownload | null> {
  try {
    const download = await db.tTSDownload.update({
      where: { id },
      data: {
        ...updates,
        ...(updates.status === "COMPLETED" && !updates.completedAt
          ? { completedAt: new Date() }
          : {}),
      },
    });

    logger.info("TTS download updated", {
      downloadId: id,
      status: updates.status,
    });

    return download;
  } catch (error) {
    logger.error("Failed to update TTS download", {
      downloadId: id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Get download record by ID
 */
export async function getDownloadRecord(
  id: string
): Promise<TTSDownload | null> {
  const download = await db.tTSDownload.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  return download;
}

/**
 * Get all downloads for a user
 */
export async function getUserDownloads(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: DownloadStatus;
  }
): Promise<TTSDownload[]> {
  const { limit = 50, offset = 0, status } = options || {};

  const downloads = await db.tTSDownload.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(status ? { status } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    skip: offset,
  });

  return downloads;
}

/**
 * Delete a download record (soft delete)
 */
export async function deleteDownload(
  id: string,
  userId: string
): Promise<boolean> {
  try {
    // Verify ownership
    const download = await getDownloadRecord(id);
    if (!download || download.userId !== userId) {
      return false;
    }

    // Soft delete
    await db.tTSDownload.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    logger.info("TTS download deleted", {
      downloadId: id,
      userId,
      fileKey: download.fileKey,
    });

    return true;
  } catch (error) {
    logger.error("Failed to delete TTS download", {
      downloadId: id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Get next month reset date
 */
export function getNextMonthReset(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

/**
 * Get default voice for provider
 */
export function getDefaultVoice(provider: TTSProvider): string {
  switch (provider) {
    case "OPENAI":
      return "alloy";
    case "ELEVENLABS":
      return "rachel";
    default:
      return "default";
  }
}
