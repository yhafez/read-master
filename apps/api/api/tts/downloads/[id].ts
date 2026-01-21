/**
 * TTS Download Detail Endpoint - GET/DELETE /api/tts/downloads/[id]
 *
 * GET: Get details of a specific download
 * DELETE: Delete a download and its associated file
 */

import type { VercelResponse } from "@vercel/node";
import {
  withAuth,
  type AuthenticatedRequest,
} from "../../../src/middleware/auth.js";
import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../../src/utils/response.js";
import { logger } from "../../../src/utils/logger.js";
import { getUserByClerkId } from "../../../src/services/db.js";
import { getDownloadRecord, deleteDownload } from "../downloadService.js";
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
// Handlers
// ============================================================================

/**
 * GET handler - Get download details
 */
async function handleGet(
  _req: AuthenticatedRequest,
  res: VercelResponse,
  downloadId: string,
  userId: string
): Promise<void> {
  const download = await getDownloadRecord(downloadId);

  if (!download) {
    sendError(res, ErrorCodes.NOT_FOUND, "Download not found", 404);
    return;
  }

  // Check ownership
  if (download.userId !== userId) {
    sendError(res, ErrorCodes.FORBIDDEN, "Access denied", 403);
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

  sendSuccess(res, response);
}

/**
 * DELETE handler - Delete download
 */
async function handleDelete(
  _req: AuthenticatedRequest,
  res: VercelResponse,
  downloadId: string,
  userId: string
): Promise<void> {
  const download = await getDownloadRecord(downloadId);

  if (!download) {
    sendError(res, ErrorCodes.NOT_FOUND, "Download not found", 404);
    return;
  }

  // Check ownership
  if (download.userId !== userId) {
    sendError(res, ErrorCodes.FORBIDDEN, "Access denied", 403);
    return;
  }

  // Delete the download (including file from R2)
  const deleted = await deleteDownload(downloadId, userId);

  if (!deleted) {
    sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to delete download", 500);
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

  sendSuccess(res, response);
}

// ============================================================================
// Main Handler
// ============================================================================

async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Get download ID from path
  const { id } = req.query;
  const downloadId = Array.isArray(id) ? id[0] : id;

  if (!downloadId) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "Download ID is required", 400);
    return;
  }

  const { userId } = req.auth;

  // Get user from database
  const user = await getUserByClerkId(userId);
  if (!user) {
    sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
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
        sendError(
          res,
          ErrorCodes.VALIDATION_ERROR,
          "Method not allowed. Use GET or DELETE.",
          405
        );
    }
  } catch (error) {
    logger.error("TTS download endpoint error", {
      method: req.method,
      downloadId,
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    sendError(res, ErrorCodes.INTERNAL_ERROR, "Internal server error", 500, {
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

export { handleGet, handleDelete };
