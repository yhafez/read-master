/**
 * GET /api/books/:id/content - Stream book content
 *
 * This endpoint:
 * - Verifies user has access to the book (owner or public book)
 * - Fetches content from R2 storage or database (for pasted text)
 * - Supports HTTP Range requests for partial content (large files)
 * - Streams content to client with appropriate headers
 * - Sets correct content type and disposition headers
 *
 * @example
 * ```bash
 * # Full content
 * curl -X GET /api/books/clxxxxxxxxxx/content \
 *   -H "Authorization: Bearer <token>"
 *
 * # Range request (partial content)
 * curl -X GET /api/books/clxxxxxxxxxx/content \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Range: bytes=0-1023"
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../../src/middleware/auth.js";
import { sendError, ErrorCodes } from "../../../src/utils/response.js";
import { logger } from "../../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../../src/services/db.js";
import {
  getFile,
  getFileInfo,
  inferContentType,
  isStorageAvailable,
} from "../../../src/services/storage.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum book ID length (CUID length)
 */
const MAX_ID_LENGTH = 30;

/**
 * Minimum book ID length
 */
const MIN_ID_LENGTH = 1;

/**
 * Default chunk size for range requests (1MB)
 */
const DEFAULT_CHUNK_SIZE = 1024 * 1024;

/**
 * Maximum range request size (10MB)
 */
const MAX_RANGE_SIZE = 10 * 1024 * 1024;

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Book ID parameter validation schema
 */
const bookIdSchema = z
  .string()
  .transform((val) => val.trim())
  .pipe(
    z
      .string()
      .min(MIN_ID_LENGTH, "Book ID is required")
      .max(MAX_ID_LENGTH, `Book ID must be at most ${MAX_ID_LENGTH} characters`)
  );

// ============================================================================
// Types
// ============================================================================

/**
 * Parsed range request result
 */
type ParsedRange = {
  start: number;
  end: number;
};

/**
 * Content response metadata
 */
type ContentMetadata = {
  contentType: string;
  contentLength: number;
  filename: string;
  acceptRanges: boolean;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse HTTP Range header
 * Supports format: bytes=start-end or bytes=start-
 *
 * @param rangeHeader - The Range header value
 * @param totalSize - Total file size in bytes
 * @returns Parsed range or null if invalid
 */
function parseRangeHeader(
  rangeHeader: string | undefined,
  totalSize: number
): ParsedRange | null {
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) {
    return null;
  }

  const rangeValue = rangeHeader.slice(6); // Remove "bytes="
  const parts = rangeValue.split("-");

  if (parts.length !== 2) {
    return null;
  }

  const [startStr, endStr] = parts;
  const start = startStr ? parseInt(startStr, 10) : NaN;
  const end = endStr ? parseInt(endStr, 10) : totalSize - 1;

  // Validate parsed values
  if (isNaN(start) || start < 0) {
    return null;
  }

  if (isNaN(end) || end >= totalSize) {
    return { start, end: totalSize - 1 };
  }

  if (start > end) {
    return null;
  }

  // Limit range size
  const rangeSize = end - start + 1;
  if (rangeSize > MAX_RANGE_SIZE) {
    return { start, end: start + MAX_RANGE_SIZE - 1 };
  }

  return { start, end };
}

/**
 * Extract filename from file path
 */
function extractFilename(filePath: string): string {
  const parts = filePath.split("/");
  return parts[parts.length - 1] || "content";
}

/**
 * Build content metadata from book and file info
 */
function buildContentMetadata(
  filePath: string,
  fileType: string | null,
  contentLength: number
): ContentMetadata {
  const filename = extractFilename(filePath);
  const contentType = fileType
    ? inferContentType(filename)
    : "application/octet-stream";

  return {
    contentType,
    contentLength,
    filename,
    acceptRanges: true,
  };
}

/**
 * Set common response headers for content streaming
 */
function setContentHeaders(
  res: VercelResponse,
  metadata: ContentMetadata,
  isPartial: boolean,
  range?: ParsedRange,
  totalSize?: number
): void {
  res.setHeader("Content-Type", metadata.contentType);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(metadata.filename)}"`
  );
  res.setHeader("Cache-Control", "private, max-age=3600");

  if (isPartial && range && totalSize !== undefined) {
    res.setHeader(
      "Content-Range",
      `bytes ${range.start}-${range.end}/${totalSize}`
    );
    res.setHeader("Content-Length", range.end - range.start + 1);
  } else {
    res.setHeader("Content-Length", metadata.contentLength);
  }
}

/**
 * Format content range header value
 */
function formatContentRange(start: number, end: number, total: number): string {
  return `bytes ${start}-${end}/${total}`;
}

/**
 * Extract a range of bytes from a buffer
 */
function extractRangeFromBuffer(
  buffer: Buffer,
  start: number,
  end: number
): Buffer {
  return buffer.subarray(start, end + 1);
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET /api/books/:id/content request
 */
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
    // Extract book ID from URL path
    const bookId = req.query.id;

    // Validate book ID
    const validationResult = bookIdSchema.safeParse(bookId);
    if (!validationResult.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid book ID",
        400,
        validationResult.error.flatten()
      );
      return;
    }

    const validatedBookId = validationResult.data;

    // Get user from database
    const user = await getUserByClerkId(userId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Fetch book to check access
    const book = await db.book.findFirst({
      where: {
        id: validatedBookId,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        filePath: true,
        fileType: true,
        isPublic: true,
      },
    });

    // Check if book exists
    if (!book) {
      sendError(res, ErrorCodes.NOT_FOUND, "Book not found", 404);
      return;
    }

    // Check user has access to the book (owner or public)
    const hasAccess = book.userId === user.id || book.isPublic;
    if (!hasAccess) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "You do not have access to this book",
        403
      );
      return;
    }

    // Check if book has stored content
    if (!book.filePath) {
      sendError(
        res,
        ErrorCodes.NOT_FOUND,
        "This book does not have downloadable content",
        404
      );
      return;
    }

    // Check if R2 storage is available
    if (!isStorageAvailable()) {
      sendError(
        res,
        ErrorCodes.INTERNAL_ERROR,
        "Storage service is temporarily unavailable",
        503
      );
      return;
    }

    // For text-based formats (DOC, DOCX, TXT, HTML), try to serve the extracted .txt file
    // This provides pre-parsed content for the TextReader component
    let actualFilePath = book.filePath;
    const isTextFormat =
      book.fileType === "DOC" ||
      book.fileType === "DOCX" ||
      book.fileType === "TXT" ||
      book.fileType === "HTML";

    if (isTextFormat) {
      const textFilePath = `${book.filePath}.txt`;
      const textFileInfo = await getFileInfo(textFilePath);
      if (textFileInfo.exists) {
        actualFilePath = textFilePath;
        logger.debug("Serving extracted text content", {
          bookId: validatedBookId,
          originalPath: book.filePath,
          textPath: textFilePath,
        });
      }
    }

    // Get file info first (for size and range requests)
    const fileInfo = await getFileInfo(actualFilePath);
    if (!fileInfo.exists || fileInfo.contentLength === undefined) {
      logger.error("Book file not found in storage", {
        bookId: validatedBookId,
        filePath: actualFilePath,
      });
      sendError(
        res,
        ErrorCodes.NOT_FOUND,
        "Book content not found in storage",
        404
      );
      return;
    }

    const totalSize = fileInfo.contentLength;
    const metadata = buildContentMetadata(
      actualFilePath,
      book.fileType,
      totalSize
    );

    // Override content type for extracted text files
    if (actualFilePath.endsWith(".txt")) {
      metadata.contentType = "text/plain; charset=utf-8";
    }

    // Parse Range header if present
    const rangeHeader = req.headers.range as string | undefined;
    const parsedRange = parseRangeHeader(rangeHeader, totalSize);

    // Get file content
    const fileResult = await getFile(actualFilePath);
    if (!fileResult.success || !fileResult.data) {
      logger.error("Failed to retrieve book content", {
        bookId: validatedBookId,
        filePath: actualFilePath,
        error: fileResult.error,
      });
      sendError(
        res,
        ErrorCodes.INTERNAL_ERROR,
        "Failed to retrieve book content",
        500
      );
      return;
    }

    // Handle range request (partial content)
    if (parsedRange) {
      const partialContent = extractRangeFromBuffer(
        fileResult.data,
        parsedRange.start,
        parsedRange.end
      );

      setContentHeaders(res, metadata, true, parsedRange, totalSize);

      logger.info("Serving partial book content", {
        userId: user.id,
        bookId: validatedBookId,
        range: formatContentRange(
          parsedRange.start,
          parsedRange.end,
          totalSize
        ),
        size: partialContent.length,
      });

      res.status(206).send(partialContent);
      return;
    }

    // Handle full content request
    setContentHeaders(res, metadata, false);

    logger.info("Serving book content", {
      userId: user.id,
      bookId: validatedBookId,
      size: totalSize,
      contentType: metadata.contentType,
    });

    res.status(200).send(fileResult.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error serving book content", {
      userId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to retrieve book content. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  // Constants
  MAX_ID_LENGTH,
  MIN_ID_LENGTH,
  DEFAULT_CHUNK_SIZE,
  MAX_RANGE_SIZE,
  // Schemas
  bookIdSchema,
  // Helper functions
  parseRangeHeader,
  extractFilename,
  buildContentMetadata,
  setContentHeaders,
  formatContentRange,
  extractRangeFromBuffer,
  // Types
  type ParsedRange,
  type ContentMetadata,
};
