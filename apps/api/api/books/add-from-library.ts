/**
 * POST /api/books/add-from-library
 *
 * Add a book to user's library from an external source (Google Books or Open Library).
 *
 * This endpoint:
 * - Accepts a book ID and source (google or openlib)
 * - Fetches book metadata from the external API
 * - Checks user's tier limits (free: 3 books)
 * - Creates a Book record in the database
 * - Optionally fetches public domain content (Open Library only)
 *
 * @example
 * ```bash
 * curl -X POST /api/books/add-from-library \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"bookId": "OL123456W", "source": "openlib"}'
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
import {
  getBookDetails as getGoogleBookDetails,
  getBestImageUrl,
  type GoogleBookMetadata,
} from "../../src/services/googleBooks.js";
import {
  getOpenLibraryWork,
  getOpenLibraryBookContent,
  getBestOpenLibraryCoverUrl,
  type OpenLibraryBookMetadata,
  type OpenLibraryBookContent,
} from "../../src/services/openLibrary.js";
import { getTierLimits, isWithinLimit } from "@read-master/shared";
import type { BookSource } from "@read-master/database";

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum book ID length
 */
const MAX_BOOK_ID_LENGTH = 200;

/**
 * Valid sources for adding books
 */
const VALID_SOURCES = ["google", "openlib"] as const;

/**
 * Source type
 */
type LibrarySource = (typeof VALID_SOURCES)[number];

/**
 * Default reading WPM for estimating read time
 */
const DEFAULT_READING_WPM = 250;

/**
 * Estimated words per page for books without word count
 */
const WORDS_PER_PAGE = 250;

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Add from library request validation schema
 */
const addFromLibrarySchema = z.object({
  bookId: z
    .string()
    .trim()
    .min(1, "Book ID is required")
    .max(
      MAX_BOOK_ID_LENGTH,
      `Book ID must be at most ${MAX_BOOK_ID_LENGTH} characters`
    ),
  source: z.enum(VALID_SOURCES, {
    errorMap: () => ({
      message: `Source must be one of: ${VALID_SOURCES.join(", ")}`,
    }),
  }),
  fetchContent: z.boolean().default(false).optional(),
});

/**
 * Type for validated add from library request
 */
type AddFromLibraryRequest = z.infer<typeof addFromLibrarySchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract publication year from date string or number
 */
function extractPublishYear(
  dateOrYear: string | number | undefined
): number | undefined {
  if (dateOrYear === undefined) return undefined;

  if (typeof dateOrYear === "number") {
    return dateOrYear;
  }

  // Try to extract 4-digit year from string
  const match = dateOrYear.match(/\b(\d{4})\b/);
  if (match?.[1]) {
    return parseInt(match[1], 10);
  }

  return undefined;
}

/**
 * Estimate word count from page count
 */
function estimateWordCount(pageCount: number | undefined): number | undefined {
  if (pageCount === undefined) return undefined;
  return pageCount * WORDS_PER_PAGE;
}

/**
 * Calculate estimated reading time in minutes
 */
function calculateReadingTime(
  wordCount: number | undefined
): number | undefined {
  if (wordCount === undefined) return undefined;
  return Math.ceil(wordCount / DEFAULT_READING_WPM);
}

/**
 * Normalize Google Books metadata for book creation
 */
function normalizeGoogleMetadata(metadata: GoogleBookMetadata): {
  title: string;
  author: string | null;
  description: string | null;
  coverImage: string | null;
  pageCount: number | null;
  wordCount: number | null;
  estimatedReadTime: number | null;
  genre: string | null;
  language: string;
  isbn10: string | null;
  isbn13: string | null;
  publishYear: number | null;
  publisher: string | null;
} {
  const wordCount = estimateWordCount(metadata.pageCount);

  return {
    title: metadata.title,
    author: metadata.authors.length > 0 ? metadata.authors.join(", ") : null,
    description: metadata.description ?? null,
    coverImage: getBestImageUrl(metadata.imageLinks, "medium") ?? null,
    pageCount: metadata.pageCount ?? null,
    wordCount: wordCount ?? null,
    estimatedReadTime: calculateReadingTime(wordCount) ?? null,
    genre:
      metadata.categories.length > 0 ? (metadata.categories[0] ?? null) : null,
    language: metadata.language ?? "en",
    isbn10: metadata.isbn10 ?? null,
    isbn13: metadata.isbn13 ?? null,
    publishYear: extractPublishYear(metadata.publishedDate) ?? null,
    publisher: metadata.publisher ?? null,
  };
}

/**
 * Normalize Open Library metadata for book creation
 */
function normalizeOpenLibraryMetadata(metadata: OpenLibraryBookMetadata): {
  title: string;
  author: string | null;
  description: string | null;
  coverImage: string | null;
  pageCount: number | null;
  wordCount: number | null;
  estimatedReadTime: number | null;
  genre: string | null;
  language: string;
  isbn10: string | null;
  isbn13: string | null;
  publishYear: number | null;
  publisher: string | null;
  isPublicDomain: boolean;
  hasFullText: boolean;
} {
  const wordCount = estimateWordCount(metadata.pageCount);

  return {
    title: metadata.title,
    author:
      metadata.authors.length > 0
        ? metadata.authors.map((a) => a.name).join(", ")
        : null,
    description: metadata.description ?? null,
    coverImage: getBestOpenLibraryCoverUrl(metadata, "M") ?? null,
    pageCount: metadata.pageCount ?? null,
    wordCount: wordCount ?? null,
    estimatedReadTime: calculateReadingTime(wordCount) ?? null,
    genre:
      metadata.subjects && metadata.subjects.length > 0
        ? (metadata.subjects[0] ?? null)
        : null,
    language:
      metadata.languages && metadata.languages.length > 0
        ? (metadata.languages[0] ?? "en")
        : "en",
    isbn10:
      metadata.isbn10 && metadata.isbn10.length > 0
        ? (metadata.isbn10[0] ?? null)
        : null,
    isbn13:
      metadata.isbn13 && metadata.isbn13.length > 0
        ? (metadata.isbn13[0] ?? null)
        : null,
    publishYear: metadata.firstPublishYear ?? metadata.publishYear ?? null,
    publisher:
      metadata.publishers && metadata.publishers.length > 0
        ? (metadata.publishers[0] ?? null)
        : null,
    isPublicDomain: metadata.isPublicDomain ?? false,
    hasFullText: metadata.hasFullText ?? false,
  };
}

/**
 * Build source URL for external book
 */
function buildSourceUrl(bookId: string, source: LibrarySource): string {
  if (source === "google") {
    return `https://books.google.com/books?id=${encodeURIComponent(bookId)}`;
  }
  // Open Library work URL
  return `https://openlibrary.org/works/${encodeURIComponent(bookId)}`;
}

/**
 * Determine book source enum value
 */
function getBookSource(source: LibrarySource): BookSource {
  if (source === "google") {
    return "GOOGLE_BOOKS" as BookSource;
  }
  return "OPEN_LIBRARY" as BookSource;
}

/**
 * Fetch book from Google Books
 */
async function fetchGoogleBook(
  bookId: string
): Promise<GoogleBookMetadata | null> {
  try {
    return await getGoogleBookDetails(bookId);
  } catch (error) {
    logger.warn("Failed to fetch Google Books metadata", {
      bookId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Fetch book from Open Library
 */
async function fetchOpenLibraryBook(
  bookId: string
): Promise<OpenLibraryBookMetadata | null> {
  try {
    return await getOpenLibraryWork(bookId);
  } catch (error) {
    logger.warn("Failed to fetch Open Library metadata", {
      bookId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Fetch public domain content from Open Library/Internet Archive
 */
async function fetchPublicDomainContent(
  editionId: string
): Promise<OpenLibraryBookContent | null> {
  try {
    return await getOpenLibraryBookContent(editionId);
  } catch (error) {
    logger.warn("Failed to fetch public domain content", {
      editionId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle add from library request
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
    const validationResult = addFromLibrarySchema.safeParse(req.body);
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

    const { bookId, source, fetchContent }: AddFromLibraryRequest =
      validationResult.data;

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

    // Check if book already exists in user's library
    const existingBook = await db.book.findFirst({
      where: {
        userId: user.id,
        sourceUrl: buildSourceUrl(bookId, source),
        deletedAt: null,
      },
    });

    if (existingBook) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "This book is already in your library",
        409
      );
      return;
    }

    // Fetch metadata from external source
    let bookData: ReturnType<typeof normalizeGoogleMetadata> | null = null;
    let openLibData: ReturnType<typeof normalizeOpenLibraryMetadata> | null =
      null;
    let contentInfo: OpenLibraryBookContent | null = null;

    if (source === "google") {
      const googleMetadata = await fetchGoogleBook(bookId);
      if (!googleMetadata) {
        sendError(
          res,
          ErrorCodes.NOT_FOUND,
          "Book not found in Google Books",
          404
        );
        return;
      }
      bookData = normalizeGoogleMetadata(googleMetadata);
    } else {
      const openLibMetadata = await fetchOpenLibraryBook(bookId);
      if (!openLibMetadata) {
        sendError(
          res,
          ErrorCodes.NOT_FOUND,
          "Book not found in Open Library",
          404
        );
        return;
      }
      openLibData = normalizeOpenLibraryMetadata(openLibMetadata);

      // Fetch public domain content if requested and available
      if (
        fetchContent &&
        openLibData.isPublicDomain &&
        openLibData.hasFullText
      ) {
        // For works, we need an edition ID to get content
        // The work ID from search might have associated editions with IA content
        // For now, we'll try using the work ID directly (which may not work for all books)
        contentInfo = await fetchPublicDomainContent(bookId);
      }
    }

    // Use the appropriate metadata based on source
    const metadata = source === "google" ? bookData : openLibData;
    if (!metadata) {
      sendError(res, ErrorCodes.NOT_FOUND, "Book metadata not found", 404);
      return;
    }

    // Build source URL
    const sourceUrl = buildSourceUrl(bookId, source);

    // Create book record in database
    const book = await db.book.create({
      data: {
        userId: user.id,
        title: metadata.title,
        author: metadata.author,
        description: metadata.description,
        source: getBookSource(source),
        sourceUrl,
        fileType: contentInfo?.formats.some((f) => f.type === "epub")
          ? "EPUB"
          : contentInfo?.formats.some((f) => f.type === "pdf")
            ? "PDF"
            : null,
        filePath: null, // Content URL would be stored if we downloaded it
        coverImage: metadata.coverImage,
        wordCount: metadata.wordCount,
        estimatedReadTime: metadata.estimatedReadTime,
        genre: metadata.genre,
        tags: [],
        language: metadata.language,
        isPublic: false,
        status: "WANT_TO_READ",
      },
      include: {
        chapters: true,
      },
    });

    // Log the creation
    logger.info("Book added from external library", {
      userId: user.id,
      bookId: book.id,
      source,
      externalId: bookId,
      hasContent: contentInfo !== null,
    });

    // Build response with additional metadata
    const response = {
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
      // Additional metadata from external source
      externalId: bookId,
      externalSource: source,
      isbn10: metadata.isbn10,
      isbn13: metadata.isbn13,
      publishYear: metadata.publishYear,
      publisher: metadata.publisher,
      // Content availability
      contentAvailable: contentInfo !== null,
      contentFormats: contentInfo?.formats.map((f) => f.type) ?? [],
    };

    sendCreated(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error adding book from library", {
      userId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to add book. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  addFromLibrarySchema,
  extractPublishYear,
  estimateWordCount,
  calculateReadingTime,
  normalizeGoogleMetadata,
  normalizeOpenLibraryMetadata,
  buildSourceUrl,
  getBookSource,
  fetchGoogleBook,
  fetchOpenLibraryBook,
  fetchPublicDomainContent,
  MAX_BOOK_ID_LENGTH,
  VALID_SOURCES,
  DEFAULT_READING_WPM,
  WORDS_PER_PAGE,
  type AddFromLibraryRequest,
  type LibrarySource,
};
