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
import {
  chunkText,
  calculateTTSCost,
  type TTSProvider,
  type AudioFormat,
} from "../../src/services/tts.js";
import { storage } from "../../src/services/storage.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Download status
 */
export type DownloadStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * TTS Download record
 */
export interface TTSDownload {
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
  fileKey?: string;
  fileSize?: number;
  downloadUrl?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  expiresAt: Date;
}

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
// In-Memory Storage (TODO: Move to database in future iteration)
// ============================================================================

/**
 * In-memory download records (for prototype - should be database)
 * Key: downloadId -> TTSDownload
 */
export const downloadRecords = new Map<string, TTSDownload>();

/**
 * User download counts per month (for prototype - should be database)
 * Key: userId-YYYY-MM -> count
 */
export const userDownloadCounts = new Map<string, number>();

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
export function getMonthKey(userId: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  return `${userId}-${year}-${month}`;
}

/**
 * Get user's download count for current month
 */
export function getUserMonthlyDownloads(userId: string): number {
  const key = getMonthKey(userId);
  return userDownloadCounts.get(key) || 0;
}

/**
 * Increment user's monthly download count
 */
export function incrementUserDownloads(userId: string): void {
  const key = getMonthKey(userId);
  const current = userDownloadCounts.get(key) || 0;
  userDownloadCounts.set(key, current + 1);
}

/**
 * Check if user has remaining download quota
 */
export function checkDownloadQuota(
  userId: string,
  tier: keyof typeof DOWNLOAD_QUOTAS
): { allowed: boolean; remaining: number; used: number; limit: number } {
  const limit = DOWNLOAD_QUOTAS[tier];
  const used = getUserMonthlyDownloads(userId);
  const remaining = Math.max(0, limit - used);
  const allowed = remaining > 0 || limit === Infinity;

  return { allowed, remaining, used, limit };
}

/**
 * Get TTS provider for tier
 */
export function getTTSProviderForTier(
  tier: "FREE" | "PRO" | "SCHOLAR"
): TTSProvider {
  switch (tier) {
    case "SCHOLAR":
      return "elevenlabs";
    case "PRO":
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
  return `users/${userId}/audio/downloads/${downloadId}.${format}`;
}

/**
 * Create a new download record
 */
export function createDownloadRecord(params: {
  userId: string;
  bookId: string;
  bookTitle: string;
  provider: TTSProvider;
  voice: string;
  format: AudioFormat;
  text: string;
}): TTSDownload {
  const { userId, bookId, bookTitle, provider, voice, format, text } = params;
  const id = generateDownloadId();
  const chunks = chunkText(text);
  const totalCharacters = text.length;
  const estimatedCost = calculateTTSCost(provider, totalCharacters);

  const record: TTSDownload = {
    id,
    userId,
    bookId,
    bookTitle,
    status: "pending",
    provider,
    voice,
    format,
    totalChunks: chunks.length,
    processedChunks: 0,
    totalCharacters,
    estimatedCost,
    actualCost: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: calculateExpiryDate(),
  };

  downloadRecords.set(id, record);
  return record;
}

/**
 * Update download record status
 */
export function updateDownloadStatus(
  id: string,
  updates: Partial<TTSDownload>
): TTSDownload | null {
  const record = downloadRecords.get(id);
  if (!record) return null;

  const updated: TTSDownload = {
    ...record,
    ...updates,
    updatedAt: new Date(),
  };

  downloadRecords.set(id, updated);
  return updated;
}

/**
 * Get download record by ID
 */
export function getDownloadRecord(id: string): TTSDownload | null {
  return downloadRecords.get(id) || null;
}

/**
 * Get all downloads for a user
 */
export function getUserDownloads(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: DownloadStatus;
  }
): TTSDownload[] {
  const { limit = 50, offset = 0, status } = options || {};

  let downloads = Array.from(downloadRecords.values())
    .filter((d) => d.userId === userId)
    .filter((d) => !status || d.status === status)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  downloads = downloads.slice(offset, offset + limit);
  return downloads;
}

/**
 * Delete a download record and its file
 */
export async function deleteDownload(
  id: string,
  userId: string
): Promise<boolean> {
  const record = downloadRecords.get(id);
  if (!record || record.userId !== userId) {
    return false;
  }

  // Delete file from R2 if exists
  if (record.fileKey) {
    await storage.deleteFile(record.fileKey);
  }

  // Remove from records
  downloadRecords.delete(id);
  return true;
}

// ============================================================================
// Request Validation
// ============================================================================

const downloadRequestSchema = z.object({
  bookId: z.string().min(1, "Book ID is required"),
  bookTitle: z.string().min(1, "Book title is required"),
  text: z.string().min(1, "Text content is required"),
  voice: z.string().optional(),
  format: z.enum(["mp3", "opus", "aac", "flac", "wav", "pcm"]).default("mp3"),
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
    const quota = checkDownloadQuota(user.id, user.tier);
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

    // Create download record
    const download = createDownloadRecord({
      userId: user.id,
      bookId,
      bookTitle,
      provider,
      voice: voice || getDefaultVoice(provider),
      format,
      text,
    });

    // Increment user's download count
    incrementUserDownloads(user.id);

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
// Helper Functions
// ============================================================================

function getDefaultVoice(provider: TTSProvider): string {
  switch (provider) {
    case "openai":
      return "alloy";
    case "elevenlabs":
      return "rachel";
    default:
      return "default";
  }
}

function getNextMonthReset(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  downloadRequestSchema,
  getMockUser,
  getDefaultVoice,
  getNextMonthReset,
};
