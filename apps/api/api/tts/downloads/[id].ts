/**
 * TTS Download Detail Endpoint - GET/DELETE /api/tts/downloads/[id]
 *
 * GET: Get details of a specific download
 * DELETE: Delete a download and its associated file
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { logger } from "../../../src/utils/logger.js";
import { getDownloadRecord, deleteDownload } from "../download.js";
import { toDownloadListItem, type DownloadListItem } from "../downloads.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Download detail response
 */
export interface DownloadDetailResponse {
  success: boolean;
  download: DownloadListItem;
}

/**
 * Delete response
 */
export interface DeleteResponse {
  success: boolean;
  message: string;
  downloadId: string;
}

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
// Handlers
// ============================================================================

/**
 * GET handler - Get download details
 */
async function handleGet(
  _req: VercelRequest,
  res: VercelResponse,
  downloadId: string,
  userId: string
): Promise<void> {
  const download = getDownloadRecord(downloadId);

  if (!download) {
    res.status(404).json({ error: "Download not found" });
    return;
  }

  // Check ownership
  if (download.userId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  logger.info("TTS download details retrieved", {
    downloadId,
    userId,
    status: download.status,
  });

  const response: DownloadDetailResponse = {
    success: true,
    download: toDownloadListItem(download),
  };

  res.status(200).json(response);
}

/**
 * DELETE handler - Delete download
 */
async function handleDelete(
  _req: VercelRequest,
  res: VercelResponse,
  downloadId: string,
  userId: string
): Promise<void> {
  const download = getDownloadRecord(downloadId);

  if (!download) {
    res.status(404).json({ error: "Download not found" });
    return;
  }

  // Check ownership
  if (download.userId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  // Delete the download (including file from R2)
  const deleted = await deleteDownload(downloadId, userId);

  if (!deleted) {
    res.status(500).json({ error: "Failed to delete download" });
    return;
  }

  logger.info("TTS download deleted", {
    downloadId,
    userId,
    bookId: download.bookId,
    fileKey: download.fileKey,
  });

  const response: DeleteResponse = {
    success: true,
    message: "Download deleted successfully",
    downloadId,
  };

  res.status(200).json(response);
}

// ============================================================================
// Main Handler
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Get download ID from path
  const { id } = req.query;
  const downloadId = Array.isArray(id) ? id[0] : id;

  if (!downloadId) {
    res.status(400).json({ error: "Download ID is required" });
    return;
  }

  // Get user
  const user = getMockUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    switch (req.method) {
      case "GET":
        await handleGet(req, res, downloadId, user.id);
        break;
      case "DELETE":
        await handleDelete(req, res, downloadId, user.id);
        break;
      default:
        res.setHeader("Allow", ["GET", "DELETE"]);
        res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    logger.error("TTS download endpoint error", {
      method: req.method,
      downloadId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ============================================================================
// Exports for Testing
// ============================================================================

export { getMockUser, handleGet, handleDelete };
