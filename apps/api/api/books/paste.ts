/**
 * POST /api/books/paste
 *
 * Create a book from pasted text content.
 *
 * This endpoint:
 * - Accepts text content and optional metadata
 * - Validates the text and metadata with Zod schema
 * - Checks user's tier limits (free: 3 books)
 * - Calculates word count and reading time
 * - Creates a Book record in the database
 *
 * @example
 * ```bash
 * curl -X POST /api/books/paste \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"text": "My book content...", "title": "My Book"}'
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.js";
import {
  sendCreated,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../src/services/db.js";
import { countWords, calculateReadingTime } from "../../src/services/books.js";
import { getTierLimits, isWithinLimit } from "@read-master/shared";
import type { BookSource } from "@read-master/database";

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum text length required (characters)
 */
const MIN_TEXT_LENGTH = 10;

/**
 * Maximum text length allowed (5MB of text, roughly 1 million words)
 */
const MAX_TEXT_LENGTH = 5 * 1024 * 1024;

/**
 * Maximum title length
 */
const MAX_TITLE_LENGTH = 500;

/**
 * Maximum author length
 */
const MAX_AUTHOR_LENGTH = 200;

/**
 * Maximum description length
 */
const MAX_DESCRIPTION_LENGTH = 50000;

/**
 * Maximum genre length
 */
const MAX_GENRE_LENGTH = 100;

/**
 * Maximum number of tags
 */
const MAX_TAGS_COUNT = 20;

/**
 * Maximum tag length
 */
const MAX_TAG_LENGTH = 50;

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Paste text request validation schema
 */
const pasteTextSchema = z.object({
  text: z
    .string()
    .min(MIN_TEXT_LENGTH, `Text must be at least ${MIN_TEXT_LENGTH} characters`)
    .max(
      MAX_TEXT_LENGTH,
      `Text must be at most ${Math.round(MAX_TEXT_LENGTH / 1024 / 1024)}MB`
    ),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(
      MAX_TITLE_LENGTH,
      `Title must be at most ${MAX_TITLE_LENGTH} characters`
    ),
  author: z
    .string()
    .trim()
    .max(
      MAX_AUTHOR_LENGTH,
      `Author must be at most ${MAX_AUTHOR_LENGTH} characters`
    )
    .optional()
    .nullable(),
  description: z
    .string()
    .trim()
    .max(
      MAX_DESCRIPTION_LENGTH,
      `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`
    )
    .optional()
    .nullable(),
  genre: z
    .string()
    .trim()
    .max(
      MAX_GENRE_LENGTH,
      `Genre must be at most ${MAX_GENRE_LENGTH} characters`
    )
    .optional()
    .nullable(),
  tags: z
    .array(
      z
        .string()
        .max(MAX_TAG_LENGTH, `Tag must be at most ${MAX_TAG_LENGTH} characters`)
    )
    .max(MAX_TAGS_COUNT, `Maximum ${MAX_TAGS_COUNT} tags allowed`)
    .optional(),
  language: z
    .string()
    .length(2, "Language must be a 2-character code")
    .default("en")
    .optional(),
  isPublic: z.boolean().default(false).optional(),
});

/**
 * Type for validated paste text request
 */
type PasteTextRequest = z.infer<typeof pasteTextSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate an excerpt from text content
 */
function generateExcerpt(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Try to cut at a word boundary
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.8) {
    return truncated.slice(0, lastSpace) + "...";
  }

  return truncated + "...";
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle paste text request
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== "POST") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use POST.",
      405
    );
    return;
  }

  const { userId } = req.auth;

  try {
    // Validate request body
    const validationResult = pasteTextSchema.safeParse(req.body);
    if (!validationResult.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid request body",
        400,
        validationResult.error.flatten()
      );
      return;
    }

    const {
      text,
      title,
      author,
      description,
      genre,
      tags,
      language,
      isPublic,
    }: PasteTextRequest = validationResult.data;

    // Get user from database
    const user = await getUserByClerkId(userId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Get book count for tier limit check
    const bookCount = await db.book.count({
      where: {
        userId: user.id,
        deletedAt: null,
      },
    });

    // Check tier limits
    if (!isWithinLimit(bookCount, user.tier, "maxBooks")) {
      const limits = getTierLimits(user.tier);
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        `You have reached your book limit (${limits.maxBooks} books). Upgrade to Pro for unlimited books.`,
        403
      );
      return;
    }

    // Calculate word count and reading time
    const wordCount = countWords(text);
    const estimatedReadTime = calculateReadingTime(wordCount);

    // Generate description if not provided
    const finalDescription = description ?? generateExcerpt(text, 500);

    // Create book record in database
    const book = await db.book.create({
      data: {
        userId: user.id,
        title,
        author: author ?? null,
        description: finalDescription,
        source: "PASTED" as BookSource,
        sourceUrl: null,
        fileType: "TXT",
        filePath: null, // Content stored inline for pasted text
        coverImage: null,
        wordCount,
        estimatedReadTime,
        genre: genre ?? null,
        tags: tags ?? [],
        language: language ?? "en",
        isPublic: isPublic ?? false,
        status: "WANT_TO_READ",
        // Note: Full content would be stored in R2 in production
        // For pasted text, we could store it directly if we had a content field
      },
      include: {
        chapters: true,
      },
    });

    // Log the creation
    logger.info("Book created from pasted text", {
      userId: user.id,
      bookId: book.id,
      wordCount,
      titleLength: title.length,
    });

    // Return created book
    sendCreated(res, {
      id: book.id,
      title: book.title,
      author: book.author,
      description: book.description,
      source: book.source,
      sourceUrl: book.sourceUrl,
      fileType: book.fileType,
      coverImage: book.coverImage,
      wordCount: book.wordCount,
      estimatedReadTime: book.estimatedReadTime,
      genre: book.genre,
      tags: book.tags,
      language: book.language,
      isPublic: book.isPublic,
      status: book.status,
      createdAt: book.createdAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error creating book from pasted text", {
      userId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to create book. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  pasteTextSchema,
  generateExcerpt,
  MIN_TEXT_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_AUTHOR_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_GENRE_LENGTH,
  MAX_TAGS_COUNT,
  MAX_TAG_LENGTH,
  type PasteTextRequest,
};
