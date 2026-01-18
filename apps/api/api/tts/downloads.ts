/**
 * TTS Downloads List Endpoint - GET /api/tts/downloads
 *
 * Lists all TTS downloads for the authenticated user.
 * - Supports filtering by status
 * - Supports pagination
 * - Returns download metadata and status
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { logger } from "../../src/utils/logger.js";
import {
  getUserDownloads,
  checkDownloadQuota,
  type TTSDownload,
  type DownloadStatus,
} from "./download.js";

/** User tier type for downloads */
type UserTier = "FREE" | "PRO" | "SCHOLAR";

// ============================================================================
// Types
// ============================================================================

/**
 * Download list item (public-facing, without sensitive data)
 */
export interface DownloadListItem {
  id: string;
  bookId: string;
  bookTitle: string;
  status: DownloadStatus;
  provider: string;
  voice: string;
  format: string;
  totalChunks: number;
  processedChunks: number;
  progress: number;
  totalCharacters: number;
  estimatedCost: number;
  actualCost: number;
  fileSize?: number | undefined;
  downloadUrl?: string | undefined;
  errorMessage?: string | undefined;
  createdAt: string;
  completedAt?: string | undefined;
  expiresAt: string;
}

/**
 * Downloads list response
 */
export interface DownloadsListResponse {
  success: boolean;
  downloads: DownloadListItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  quota: {
    used: number;
    limit: number | "unlimited";
    remaining: number | "unlimited";
  };
}

// ============================================================================
// Request Validation
// ============================================================================

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: z
    .enum(["pending", "processing", "completed", "failed", "cancelled"])
    .optional(),
});

export type DownloadsQueryParams = z.infer<typeof querySchema>;

// ============================================================================
// Mock User Data (for testing without full auth)
// ============================================================================

interface MockUser {
  id: string;
  tier: "FREE" | "PRO" | "SCHOLAR";
}

function getMockUser(req: VercelRequest): MockUser | null {
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
// Helper Functions
// ============================================================================

/**
 * Transform download record to public list item
 */
export function toDownloadListItem(download: TTSDownload): DownloadListItem {
  const progress =
    download.totalChunks > 0
      ? Math.round((download.processedChunks / download.totalChunks) * 100)
      : 0;

  return {
    id: download.id,
    bookId: download.bookId,
    bookTitle: download.bookTitle,
    status: download.status,
    provider: download.provider,
    voice: download.voice,
    format: download.format,
    totalChunks: download.totalChunks,
    processedChunks: download.processedChunks,
    progress,
    totalCharacters: download.totalCharacters,
    estimatedCost: download.estimatedCost,
    actualCost: download.actualCost,
    fileSize: download.fileSize,
    downloadUrl: download.downloadUrl,
    errorMessage: download.errorMessage,
    createdAt: download.createdAt.toISOString(),
    completedAt: download.completedAt?.toISOString(),
    expiresAt: download.expiresAt.toISOString(),
  };
}

/**
 * Get quota info for response
 */
export function getQuotaInfo(
  userId: string,
  tier: UserTier
): {
  used: number;
  limit: number | "unlimited";
  remaining: number | "unlimited";
} {
  const quota = checkDownloadQuota(userId, tier);
  return {
    used: quota.used,
    limit: quota.limit === Infinity ? "unlimited" : quota.limit,
    remaining: quota.remaining === Infinity ? "unlimited" : quota.remaining,
  };
}

// ============================================================================
// Handler
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
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

    // Parse and validate query params
    const parseResult = querySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { limit, offset, status } = parseResult.data;

    // Get downloads
    const downloads = getUserDownloads(user.id, {
      limit: limit + 1, // Fetch one extra to determine hasMore
      offset,
      ...(status ? { status: status as DownloadStatus } : {}),
    });

    // Check if there are more results
    const hasMore = downloads.length > limit;
    const resultsToReturn = hasMore ? downloads.slice(0, limit) : downloads;

    // Transform to public format
    const downloadItems = resultsToReturn.map(toDownloadListItem);

    // Get quota info
    const quotaInfo = getQuotaInfo(user.id, user.tier);

    // Log the request
    logger.info("TTS downloads list retrieved", {
      userId: user.id,
      count: downloadItems.length,
      status,
      limit,
      offset,
    });

    // Return response
    const response: DownloadsListResponse = {
      success: true,
      downloads: downloadItems,
      pagination: {
        total: downloadItems.length,
        limit,
        offset,
        hasMore,
      },
      quota: quotaInfo,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error("Failed to list TTS downloads", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      error: "Failed to list downloads",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ============================================================================
// Exports for Testing
// ============================================================================

export { querySchema, getMockUser };
