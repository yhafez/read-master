/**
 * TTS Downloads List Endpoint - GET /api/tts/downloads
 *
 * Lists all TTS downloads for the authenticated user.
 * - Supports filtering by status
 * - Supports pagination
 * - Returns download metadata and status
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
import {
  getUserDownloads,
  checkDownloadQuota,
  type TTSDownload,
  type DownloadStatus,
} from "./downloadService.js";

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
    fileSize: download.fileSize ?? undefined,
    downloadUrl: download.downloadUrl ?? undefined,
    errorMessage: download.errorMessage ?? undefined,
    createdAt: download.createdAt.toISOString(),
    completedAt: download.completedAt?.toISOString(),
    expiresAt: download.expiresAt.toISOString(),
  };
}

/**
 * Get quota info for response
 */
export async function getQuotaInfo(
  userId: string,
  tier: UserTier
): Promise<{
  used: number;
  limit: number | "unlimited";
  remaining: number | "unlimited";
}> {
  const quota = await checkDownloadQuota(userId, tier);
  return {
    used: quota.used,
    limit: quota.limit === Infinity ? "unlimited" : quota.limit,
    remaining: quota.remaining === Infinity ? "unlimited" : quota.remaining,
  };
}

// ============================================================================
// Handler
// ============================================================================

async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET
  if (req.method !== "GET") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET.",
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

    // Parse and validate query params
    const parseResult = querySchema.safeParse(req.query);
    if (!parseResult.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid query parameters",
        400,
        parseResult.error.flatten()
      );
      return;
    }

    const { limit, offset, status } = parseResult.data;

    // Get downloads
    const downloads = await getUserDownloads(user.id, {
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
    const quotaInfo = await getQuotaInfo(user.id, user.tier);

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

    sendSuccess(res, response);
  } catch (error) {
    logger.error("Failed to list TTS downloads", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to list downloads", 500, {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ============================================================================
// Export with Auth Middleware
// ============================================================================

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export { querySchema };
