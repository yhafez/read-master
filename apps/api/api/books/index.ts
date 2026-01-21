/**
 * GET /api/books
 *
 * List user's books with filtering, sorting, and pagination.
 *
 * This endpoint:
 * - Lists books owned by the authenticated user
 * - Supports filtering by status, genre, tags, and search query
 * - Supports multiple sort options
 * - Implements cursor-based pagination
 * - Excludes soft-deleted books
 *
 * @example
 * ```bash
 * # Basic listing
 * curl -X GET /api/books \
 *   -H "Authorization: Bearer <token>"
 *
 * # With filters
 * curl -X GET "/api/books?status=READING&genre=Fiction&sort=recentlyRead&page=1&limit=10" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";
import type { Prisma } from "@read-master/database";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.js";
import {
  sendPaginated,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../src/services/db.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Default number of items per page
 */
const DEFAULT_LIMIT = 20;

/**
 * Maximum number of items per page
 */
const MAX_LIMIT = 100;

/**
 * Minimum number of items per page
 */
const MIN_LIMIT = 1;

/**
 * Maximum search query length
 */
const MAX_SEARCH_LENGTH = 200;

/**
 * Maximum tag filter length
 */
const MAX_TAG_LENGTH = 50;

/**
 * Maximum number of tags to filter by
 */
const MAX_TAGS_FILTER = 10;

/**
 * Valid reading status values
 */
const VALID_STATUSES = [
  "WANT_TO_READ",
  "READING",
  "COMPLETED",
  "ABANDONED",
] as const;

/**
 * Valid sort options
 */
const VALID_SORT_OPTIONS = [
  "createdAt",
  "updatedAt",
  "title",
  "author",
  "recentlyRead",
  "progress",
  "wordCount",
] as const;

/**
 * Valid sort directions
 */
const VALID_SORT_DIRECTIONS = ["asc", "desc"] as const;

// ============================================================================
// Types
// ============================================================================

type ReadingStatus = (typeof VALID_STATUSES)[number];
type SortOption = (typeof VALID_SORT_OPTIONS)[number];
type SortDirection = (typeof VALID_SORT_DIRECTIONS)[number];

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Valid file types
 */
const VALID_FILE_TYPES = ["PDF", "EPUB", "DOC", "DOCX", "TXT", "HTML"] as const;

/**
 * Valid source types
 */
const VALID_SOURCES = [
  "UPLOAD",
  "URL",
  "PASTE",
  "GOOGLE_BOOKS",
  "OPEN_LIBRARY",
] as const;

/**
 * Query parameters validation schema
 */
const listBooksQuerySchema = z.object({
  // Filtering
  status: z
    .enum(VALID_STATUSES)
    .optional()
    .describe("Filter by reading status"),
  genre: z
    .string()
    .max(100, "Genre must be at most 100 characters")
    .optional()
    .describe("Filter by genre"),
  tags: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",").map((t) => t.trim()) : undefined))
    .refine(
      (val) => !val || val.length <= MAX_TAGS_FILTER,
      `Maximum ${MAX_TAGS_FILTER} tags allowed`
    )
    .refine(
      (val) => !val || val.every((t) => t.length <= MAX_TAG_LENGTH),
      `Each tag must be at most ${MAX_TAG_LENGTH} characters`
    )
    .describe("Filter by tags (comma-separated)"),
  search: z
    .string()
    .max(
      MAX_SEARCH_LENGTH,
      `Search query must be at most ${MAX_SEARCH_LENGTH} characters`
    )
    .optional()
    .describe("Search in title, author, description, and content"),

  // Additional filters
  fileType: z.enum(VALID_FILE_TYPES).optional().describe("Filter by file type"),
  source: z.enum(VALID_SOURCES).optional().describe("Filter by book source"),
  progressMin: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Minimum reading progress percentage"),
  progressMax: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Maximum reading progress percentage"),
  dateAddedFrom: z.coerce
    .date()
    .optional()
    .describe("Filter books added after this date"),
  dateAddedTo: z.coerce
    .date()
    .optional()
    .describe("Filter books added before this date"),
  dateStartedFrom: z.coerce
    .date()
    .optional()
    .describe("Filter books started after this date"),
  dateStartedTo: z.coerce
    .date()
    .optional()
    .describe("Filter books started before this date"),
  dateCompletedFrom: z.coerce
    .date()
    .optional()
    .describe("Filter books completed after this date"),
  dateCompletedTo: z.coerce
    .date()
    .optional()
    .describe("Filter books completed before this date"),

  // Sorting
  sort: z.enum(VALID_SORT_OPTIONS).default("createdAt").describe("Sort field"),
  order: z
    .enum(VALID_SORT_DIRECTIONS)
    .default("desc")
    .describe("Sort direction"),

  // Pagination
  page: z.coerce
    .number()
    .int("Page must be an integer")
    .min(1, "Page must be at least 1")
    .default(1)
    .describe("Page number"),
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(MIN_LIMIT, `Limit must be at least ${MIN_LIMIT}`)
    .max(MAX_LIMIT, `Limit must be at most ${MAX_LIMIT}`)
    .default(DEFAULT_LIMIT)
    .describe("Items per page"),
});

/**
 * Type for validated query parameters
 */
type ListBooksQuery = z.infer<typeof listBooksQuerySchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build Prisma where clause from query parameters
 */
function buildWhereClause(
  userId: string,
  query: ListBooksQuery
): Prisma.BookWhereInput {
  const where: Prisma.BookWhereInput = {
    userId,
    deletedAt: null, // Always exclude soft-deleted books
  };

  // Filter by status
  if (query.status) {
    where.status = query.status;
  }

  // Filter by genre (case-insensitive contains)
  if (query.genre) {
    where.genre = {
      equals: query.genre,
      mode: "insensitive",
    };
  }

  // Filter by tags (all tags must be present)
  if (query.tags && query.tags.length > 0) {
    where.tags = {
      hasEvery: query.tags,
    };
  }

  // Filter by file type
  if (query.fileType) {
    where.fileType = query.fileType;
  }

  // Filter by source
  if (query.source) {
    where.source = query.source;
  }

  // Filter by progress range
  if (query.progressMin !== undefined || query.progressMax !== undefined) {
    where.readingProgress = {
      some: {
        userId,
        ...(query.progressMin !== undefined && {
          progressPercent: { gte: query.progressMin },
        }),
        ...(query.progressMax !== undefined && {
          progressPercent: { lte: query.progressMax },
        }),
      },
    };
  }

  // Filter by date added range
  if (query.dateAddedFrom || query.dateAddedTo) {
    where.createdAt = {
      ...(query.dateAddedFrom && { gte: query.dateAddedFrom }),
      ...(query.dateAddedTo && { lte: query.dateAddedTo }),
    };
  }

  // Filter by date started range
  if (query.dateStartedFrom || query.dateStartedTo) {
    where.readingProgress = {
      some: {
        userId,
        startedAt: {
          ...(query.dateStartedFrom && { gte: query.dateStartedFrom }),
          ...(query.dateStartedTo && { lte: query.dateStartedTo }),
        },
      },
    };
  }

  // Filter by date completed range
  if (query.dateCompletedFrom || query.dateCompletedTo) {
    where.readingProgress = {
      some: {
        userId,
        completedAt: {
          ...(query.dateCompletedFrom && { gte: query.dateCompletedFrom }),
          ...(query.dateCompletedTo && { lte: query.dateCompletedTo }),
        },
      },
    };
  }

  // Search in title, author, description, and potentially content
  // Note: Full-text content search requires rawContent field in DB
  if (query.search) {
    const searchConditions: Prisma.BookWhereInput[] = [
      { title: { contains: query.search, mode: "insensitive" } },
      { author: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];

    // TODO: Add full-text content search when rawContent field is available
    // This would require storing extracted text in the database
    // searchConditions.push({
    //   rawContent: { contains: query.search, mode: "insensitive" },
    // });

    where.OR = searchConditions;
  }

  return where;
}

/**
 * Build Prisma orderBy clause from query parameters
 */
function buildOrderByClause(
  sort: SortOption,
  order: SortDirection
): Prisma.BookOrderByWithRelationInput | Prisma.BookOrderByWithRelationInput[] {
  const direction = order;

  switch (sort) {
    case "title":
      return { title: direction };
    case "author":
      // Null authors should sort last
      return [{ author: { sort: direction, nulls: "last" } }, { title: "asc" }];
    case "updatedAt":
      return { updatedAt: direction };
    case "wordCount":
      return [
        { wordCount: { sort: direction, nulls: "last" } },
        { createdAt: "desc" },
      ];
    case "recentlyRead":
      // Sort by reading progress lastReadAt
      return [
        {
          readingProgress: {
            _count: direction,
          },
        },
        { updatedAt: "desc" },
      ];
    case "progress":
      // This requires joining with readingProgress
      // For now, fall back to updatedAt as proxy
      return { updatedAt: direction };
    case "createdAt":
    default:
      return { createdAt: direction };
  }
}

/**
 * Format book response for API
 */
function formatBookResponse(
  book: Prisma.BookGetPayload<{
    include: { readingProgress: true; _count: { select: { chapters: true } } };
  }>
) {
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
    fileType: book.fileType,
    language: book.language,
    wordCount: book.wordCount,
    estimatedReadTime: book.estimatedReadTime,
    genre: book.genre,
    tags: book.tags,
    status: book.status,
    isPublic: book.isPublic,
    chaptersCount: book._count.chapters,
    progress: progress
      ? {
          percentage: progress.percentage,
          currentPosition: progress.currentPosition,
          totalReadTime: progress.totalReadTime,
          lastReadAt: progress.lastReadAt?.toISOString() ?? null,
          startedAt: progress.startedAt.toISOString(),
          completedAt: progress.completedAt?.toISOString() ?? null,
        }
      : null,
    createdAt: book.createdAt.toISOString(),
    updatedAt: book.updatedAt.toISOString(),
  };
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle list books request
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
    // Validate query parameters
    const validationResult = listBooksQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid query parameters",
        400,
        validationResult.error.flatten()
      );
      return;
    }

    const query: ListBooksQuery = validationResult.data;

    // Get user from database
    const user = await getUserByClerkId(userId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Build query clauses
    const where = buildWhereClause(user.id, query);
    const orderBy = buildOrderByClause(query.sort, query.order);

    // Calculate pagination
    const skip = (query.page - 1) * query.limit;

    // Execute count and find in parallel
    const [total, books] = await Promise.all([
      db.book.count({ where }),
      db.book.findMany({
        where,
        orderBy,
        skip,
        take: query.limit,
        include: {
          readingProgress: {
            where: { userId: user.id },
            take: 1,
          },
          _count: {
            select: { chapters: true },
          },
        },
      }),
    ]);

    // Format response
    const formattedBooks = books.map(formatBookResponse);

    // Log the request
    logger.info("Books listed", {
      userId: user.id,
      query: {
        status: query.status,
        genre: query.genre,
        tags: query.tags,
        search: query.search ? `[${query.search.length} chars]` : undefined,
        sort: query.sort,
        order: query.order,
        page: query.page,
        limit: query.limit,
      },
      results: formattedBooks.length,
      total,
    });

    // Return paginated response
    sendPaginated(res, formattedBooks, query.page, query.limit, total);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error listing books", {
      userId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to list books. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  listBooksQuerySchema,
  buildWhereClause,
  buildOrderByClause,
  formatBookResponse,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
  MAX_SEARCH_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TAGS_FILTER,
  VALID_STATUSES,
  VALID_SORT_OPTIONS,
  VALID_SORT_DIRECTIONS,
  type ListBooksQuery,
  type ReadingStatus,
  type SortOption,
  type SortDirection,
};
