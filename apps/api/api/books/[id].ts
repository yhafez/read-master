/**
 * GET /api/books/:id - Fetch a single book by ID
 * PUT /api/books/:id - Update book metadata
 *
 * GET endpoint:
 * - Returns book details for the authenticated user
 * - Includes chapters with their metadata
 * - Includes reading progress for the current user
 * - Verifies user has access to the book
 * - Excludes soft-deleted books
 *
 * PUT endpoint:
 * - Updates book metadata (title, author, description, status, etc.)
 * - Only book owner can update
 * - Validates with Zod schema
 * - Logs audit trail
 * - Handles status changes
 *
 * @example
 * ```bash
 * # GET
 * curl -X GET /api/books/clxxxxxxxxxx \
 *   -H "Authorization: Bearer <token>"
 *
 * # PUT
 * curl -X PUT /api/books/clxxxxxxxxxx \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"title": "Updated Title", "status": "READING"}'
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";
import {
  updateBookSchema,
  updateBookPublicSchema,
} from "@read-master/shared/schemas";

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
import type { Prisma } from "@read-master/database";

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

/**
 * Updated book response type (simpler than detail response)
 */
type BookUpdateResponse = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  coverImage: string | null;
  genre: string | null;
  tags: string[];
  status: string;
  isPublic: boolean;
  language: string;
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

/**
 * Format updated book for API response
 */
function formatBookUpdateResponse(book: {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  coverImage: string | null;
  genre: string | null;
  tags: string[];
  status: string;
  isPublic: boolean;
  language: string;
  updatedAt: Date;
}): BookUpdateResponse {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    description: book.description,
    coverImage: book.coverImage,
    genre: book.genre,
    tags: book.tags,
    status: book.status,
    isPublic: book.isPublic,
    language: book.language,
    updatedAt: book.updatedAt.toISOString(),
  };
}

/**
 * Build Prisma update data from validated input
 * Filters out undefined values to only update provided fields
 */
function buildUpdateData(
  input: z.infer<typeof updateBookSchema>
): Prisma.BookUpdateInput {
  const updateData: Prisma.BookUpdateInput = {};

  if (input.title !== undefined) {
    updateData.title = input.title;
  }
  if (input.author !== undefined) {
    updateData.author = input.author;
  }
  if (input.description !== undefined) {
    updateData.description = input.description;
  }
  if (input.status !== undefined) {
    updateData.status = input.status;
  }
  if (input.genre !== undefined) {
    updateData.genre = input.genre;
  }
  if (input.tags !== undefined) {
    updateData.tags = input.tags;
  }
  if (input.coverImage !== undefined) {
    updateData.coverImage = input.coverImage;
  }
  if (input.isPublic !== undefined) {
    updateData.isPublic = input.isPublic;
  }
  if (input.language !== undefined) {
    updateData.language = input.language;
  }

  return updateData;
}

/**
 * Get fields that changed between previous and new values
 */
function getChangedFields(
  previous: Record<string, unknown>,
  updated: Record<string, unknown>
): string[] {
  const changed: string[] = [];

  for (const key of Object.keys(updated)) {
    const prevValue = previous[key];
    const newValue = updated[key];

    // Handle arrays (like tags)
    if (Array.isArray(prevValue) && Array.isArray(newValue)) {
      if (JSON.stringify(prevValue) !== JSON.stringify(newValue)) {
        changed.push(key);
      }
    } else if (prevValue !== newValue) {
      changed.push(key);
    }
  }

  return changed;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET /api/books/:id request
 */
async function handleGet(
  _req: AuthenticatedRequest,
  res: VercelResponse,
  validatedBookId: string,
  userId: string
): Promise<void> {
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
}

/**
 * Handle PUT /api/books/:id request
 */
async function handlePut(
  req: AuthenticatedRequest,
  res: VercelResponse,
  validatedBookId: string,
  userId: string
): Promise<void> {
  // Get user from database
  const user = await getUserByClerkId(userId);
  if (!user) {
    sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    return;
  }

  // Fetch existing book to check ownership
  const existingBook = await db.book.findFirst({
    where: {
      id: validatedBookId,
      deletedAt: null,
    },
    select: {
      id: true,
      userId: true,
      title: true,
      author: true,
      description: true,
      coverImage: true,
      genre: true,
      tags: true,
      status: true,
      isPublic: true,
      language: true,
    },
  });

  // Check if book exists
  if (!existingBook) {
    sendError(res, ErrorCodes.NOT_FOUND, "Book not found", 404);
    return;
  }

  // Check user owns the book (only owner can update)
  if (existingBook.userId !== user.id) {
    sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "You do not have permission to update this book",
      403
    );
    return;
  }

  // Determine if book will be public after update
  const willBePublic =
    req.body?.isPublic !== undefined
      ? req.body.isPublic
      : existingBook.isPublic;

  // Use appropriate schema based on whether book will be public
  const schema = willBePublic ? updateBookPublicSchema : updateBookSchema;

  // Validate request body
  const validationResult = schema.safeParse(req.body);
  if (!validationResult.success) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Invalid update data",
      400,
      validationResult.error.flatten()
    );
    return;
  }

  const validatedData = validationResult.data;

  // Build update data
  const updateData = buildUpdateData(validatedData);

  // Track previous values for audit log
  const previousValues: Record<string, unknown> = {
    title: existingBook.title,
    author: existingBook.author,
    description: existingBook.description,
    coverImage: existingBook.coverImage,
    genre: existingBook.genre,
    tags: existingBook.tags,
    status: existingBook.status,
    isPublic: existingBook.isPublic,
    language: existingBook.language,
  };

  // Update the book
  const updatedBook = await db.book.update({
    where: { id: validatedBookId },
    data: updateData,
    select: {
      id: true,
      title: true,
      author: true,
      description: true,
      coverImage: true,
      genre: true,
      tags: true,
      status: true,
      isPublic: true,
      language: true,
      updatedAt: true,
    },
  });

  // Build new values for audit log
  const newValues: Record<string, unknown> = {
    title: updatedBook.title,
    author: updatedBook.author,
    description: updatedBook.description,
    coverImage: updatedBook.coverImage,
    genre: updatedBook.genre,
    tags: updatedBook.tags,
    status: updatedBook.status,
    isPublic: updatedBook.isPublic,
    language: updatedBook.language,
  };

  // Get which fields actually changed
  const changedFields = getChangedFields(previousValues, newValues);

  // Create audit log entry in database
  const ipAddress =
    (req.headers["x-forwarded-for"] as string | undefined)
      ?.split(",")[0]
      ?.trim() ?? null;
  const userAgent = (req.headers["user-agent"] as string | undefined) ?? null;

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "UPDATE",
      entityType: "Book",
      entityId: validatedBookId,
      previousValue: previousValues as Prisma.InputJsonValue,
      newValue: newValues as Prisma.InputJsonValue,
      metadata: {
        changedFields,
        requestId: req.headers["x-request-id"] as string | null,
      } as Prisma.InputJsonValue,
      ipAddress,
      userAgent,
    },
  });

  // Log the update
  logger.info("Book updated", {
    userId: user.id,
    bookId: validatedBookId,
    changedFields,
  });

  // Format and return response
  const response = formatBookUpdateResponse(updatedBook);
  sendSuccess(res, response);
}

/**
 * Main request handler - routes to GET or PUT handler
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET and PUT
  if (req.method !== "GET" && req.method !== "PUT") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET or PUT.",
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

    // Route to appropriate handler
    if (req.method === "GET") {
      await handleGet(req, res, validatedBookId, userId);
    } else if (req.method === "PUT") {
      await handlePut(req, res, validatedBookId, userId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const operation = req.method === "GET" ? "fetching" : "updating";
    logger.error(`Error ${operation} book`, {
      userId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      `Failed to ${req.method === "GET" ? "fetch" : "update"} book. Please try again.`,
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
  // Schemas
  bookIdSchema,
  // GET helper functions
  formatChapter,
  formatProgress,
  formatBookDetailResponse,
  // PUT helper functions
  formatBookUpdateResponse,
  buildUpdateData,
  getChangedFields,
  // Types
  type ChapterResponse,
  type ProgressResponse,
  type BookDetailResponse,
  type BookUpdateResponse,
};
