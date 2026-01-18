/**
 * GET /api/books/:id
 *
 * Fetch a single book by ID with chapters and reading progress.
 *
 * This endpoint:
 * - Returns book details for the authenticated user
 * - Includes chapters with their metadata
 * - Includes reading progress for the current user
 * - Verifies user has access to the book
 * - Excludes soft-deleted books
 *
 * @example
 * ```bash
 * curl -X GET /api/books/clxxxxxxxxxx \
 *   -H "Authorization: Bearer <token>"
 * ```
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
import { db, getUserByClerkId } from "../../src/services/db.js";

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
 * Chapter response type
 */
type ChapterResponse = {
  id: string;
  title: string | null;
  orderIndex: number;
  startPosition: number;
  endPosition: number;
  wordCount: number | null;
};

/**
 * Reading progress response type
 */
type ProgressResponse = {
  percentage: number;
  currentPosition: number;
  totalReadTime: number;
  averageWpm: number | null;
  lastReadAt: string | null;
  startedAt: string;
  completedAt: string | null;
};

/**
 * Book detail response type
 */
type BookDetailResponse = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  coverImage: string | null;
  source: string;
  sourceId: string | null;
  sourceUrl: string | null;
  filePath: string | null;
  fileType: string | null;
  language: string;
  wordCount: number | null;
  estimatedReadTime: number | null;
  lexileScore: number | null;
  genre: string | null;
  tags: string[];
  status: string;
  isPublic: boolean;
  chapters: ChapterResponse[];
  progress: ProgressResponse | null;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format chapter for API response
 */
function formatChapter(chapter: {
  id: string;
  title: string | null;
  orderIndex: number;
  startPosition: number;
  endPosition: number;
  wordCount: number | null;
}): ChapterResponse {
  return {
    id: chapter.id,
    title: chapter.title,
    orderIndex: chapter.orderIndex,
    startPosition: chapter.startPosition,
    endPosition: chapter.endPosition,
    wordCount: chapter.wordCount,
  };
}

/**
 * Format reading progress for API response
 */
function formatProgress(
  progress: {
    percentage: number;
    currentPosition: number;
    totalReadTime: number;
    averageWpm: number | null;
    lastReadAt: Date | null;
    startedAt: Date;
    completedAt: Date | null;
  } | null
): ProgressResponse | null {
  if (!progress) {
    return null;
  }

  return {
    percentage: progress.percentage,
    currentPosition: progress.currentPosition,
    totalReadTime: progress.totalReadTime,
    averageWpm: progress.averageWpm,
    lastReadAt: progress.lastReadAt?.toISOString() ?? null,
    startedAt: progress.startedAt.toISOString(),
    completedAt: progress.completedAt?.toISOString() ?? null,
  };
}

/**
 * Format book detail response for API
 */
function formatBookDetailResponse(book: {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  coverImage: string | null;
  source: string;
  sourceId: string | null;
  sourceUrl: string | null;
  filePath: string | null;
  fileType: string | null;
  language: string;
  wordCount: number | null;
  estimatedReadTime: number | null;
  lexileScore: number | null;
  genre: string | null;
  tags: string[];
  status: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  chapters: {
    id: string;
    title: string | null;
    orderIndex: number;
    startPosition: number;
    endPosition: number;
    wordCount: number | null;
  }[];
  readingProgress: {
    percentage: number;
    currentPosition: number;
    totalReadTime: number;
    averageWpm: number | null;
    lastReadAt: Date | null;
    startedAt: Date;
    completedAt: Date | null;
  }[];
}): BookDetailResponse {
  const progress = book.readingProgress[0] ?? null;

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    description: book.description,
    coverImage: book.coverImage,
    source: book.source,
    sourceId: book.sourceId,
    sourceUrl: book.sourceUrl,
    filePath: book.filePath,
    fileType: book.fileType,
    language: book.language,
    wordCount: book.wordCount,
    estimatedReadTime: book.estimatedReadTime,
    lexileScore: book.lexileScore,
    genre: book.genre,
    tags: book.tags,
    status: book.status,
    isPublic: book.isPublic,
    chapters: book.chapters.map(formatChapter),
    progress: formatProgress(progress),
    createdAt: book.createdAt.toISOString(),
    updatedAt: book.updatedAt.toISOString(),
  };
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET /api/books/:id request
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
    // Vercel passes path params via query for [...] routes
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

    // Fetch book with chapters and reading progress
    const book = await db.book.findFirst({
      where: {
        id: validatedBookId,
        deletedAt: null, // Exclude soft-deleted books
      },
      include: {
        chapters: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            title: true,
            orderIndex: true,
            startPosition: true,
            endPosition: true,
            wordCount: true,
          },
        },
        readingProgress: {
          where: { userId: user.id },
          take: 1,
          select: {
            percentage: true,
            currentPosition: true,
            totalReadTime: true,
            averageWpm: true,
            lastReadAt: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    // Check if book exists
    if (!book) {
      sendError(res, ErrorCodes.NOT_FOUND, "Book not found", 404);
      return;
    }

    // Check user has access to the book
    // Users can access their own books OR public books
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

    // Format response
    const response = formatBookDetailResponse(book);

    // Log the request
    logger.info("Book fetched", {
      userId: user.id,
      bookId: validatedBookId,
      chaptersCount: book.chapters.length,
      hasProgress: book.readingProgress.length > 0,
    });

    // Return book details
    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error fetching book", {
      userId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch book. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  bookIdSchema,
  formatChapter,
  formatProgress,
  formatBookDetailResponse,
  MAX_ID_LENGTH,
  MIN_ID_LENGTH,
  type ChapterResponse,
  type ProgressResponse,
  type BookDetailResponse,
};
