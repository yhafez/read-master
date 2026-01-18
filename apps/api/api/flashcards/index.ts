/**
 * Flashcard CRUD endpoints
 *
 * POST /api/flashcards - Create a manual flashcard
 * GET /api/flashcards - List user's flashcards with filters
 * PUT /api/flashcards - Update a flashcard (requires ?id=xxx)
 * DELETE /api/flashcards - Soft delete (suspend) a flashcard (requires ?id=xxx)
 *
 * Flashcards use the SM-2 algorithm for spaced repetition scheduling.
 * This endpoint handles CRUD; review logic is in /api/flashcards/[id]/review.
 *
 * @example
 * ```bash
 * # Create a flashcard
 * curl -X POST /api/flashcards \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "front": "What is photosynthesis?",
 *     "back": "The process by which plants convert light energy into chemical energy",
 *     "type": "CONCEPT",
 *     "bookId": "clxxxxxxxxxx",
 *     "tags": ["biology", "plants"]
 *   }'
 *
 * # List flashcards with filters
 * curl -X GET "/api/flashcards?status=NEW&bookId=clxxxxxxxxxx&page=1&limit=20" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Update a flashcard
 * curl -X PUT "/api/flashcards?id=clxxxxxxxxxx" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{ "front": "Updated question?", "tags": ["updated"] }'
 *
 * # Soft delete (suspend) a flashcard
 * curl -X DELETE "/api/flashcards?id=clxxxxxxxxxx" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import type {
  Prisma,
  FlashcardType,
  FlashcardStatus,
} from "@read-master/database";
import {
  createFlashcardSchema,
  updateFlashcardSchema,
  flashcardQuerySchema,
  flashcardIdSchema,
  type CreateFlashcardInput,
  type UpdateFlashcardInput,
  type FlashcardQueryInput,
} from "@read-master/shared/schemas";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.js";
import {
  sendSuccess,
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
export const DEFAULT_LIMIT = 20;

/**
 * Maximum number of items per page
 */
export const MAX_LIMIT = 100;

/**
 * Supported HTTP methods
 */
export const SUPPORTED_METHODS = ["GET", "POST", "PUT", "DELETE"];

/**
 * Valid flashcard types
 */
export const VALID_TYPES: FlashcardType[] = [
  "VOCABULARY",
  "CONCEPT",
  "COMPREHENSION",
  "QUOTE",
  "CUSTOM",
];

/**
 * Valid flashcard statuses
 */
export const VALID_STATUSES: FlashcardStatus[] = [
  "NEW",
  "LEARNING",
  "REVIEW",
  "SUSPENDED",
];

// ============================================================================
// Types
// ============================================================================

/**
 * Flashcard response type
 */
export type FlashcardResponse = {
  id: string;
  userId: string;
  bookId: string | null;
  front: string;
  back: string;
  type: FlashcardType;
  status: FlashcardStatus;
  tags: string[];
  sourceChapterId: string | null;
  sourceOffset: number | null;
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: string;
  totalReviews: number;
  correctReviews: number;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format flashcard for API response
 */
function formatFlashcardResponse(flashcard: {
  id: string;
  userId: string;
  bookId: string | null;
  front: string;
  back: string;
  type: FlashcardType;
  status: FlashcardStatus;
  tags: string[];
  sourceChapterId: string | null;
  sourceOffset: number | null;
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: Date;
  totalReviews: number;
  correctReviews: number;
  createdAt: Date;
  updatedAt: Date;
}): FlashcardResponse {
  return {
    id: flashcard.id,
    userId: flashcard.userId,
    bookId: flashcard.bookId,
    front: flashcard.front,
    back: flashcard.back,
    type: flashcard.type,
    status: flashcard.status,
    tags: flashcard.tags,
    sourceChapterId: flashcard.sourceChapterId,
    sourceOffset: flashcard.sourceOffset,
    easeFactor: flashcard.easeFactor,
    interval: flashcard.interval,
    repetitions: flashcard.repetitions,
    dueDate: flashcard.dueDate.toISOString(),
    totalReviews: flashcard.totalReviews,
    correctReviews: flashcard.correctReviews,
    createdAt: flashcard.createdAt.toISOString(),
    updatedAt: flashcard.updatedAt.toISOString(),
  };
}

/**
 * Build Prisma where clause from query parameters
 */
function buildWhereClause(
  userId: string,
  query: FlashcardQueryInput
): Prisma.FlashcardWhereInput {
  const where: Prisma.FlashcardWhereInput = {
    userId,
  };

  // Soft delete filter - default to exclude deleted
  if (!query.includeDeleted) {
    where.deletedAt = null;
  }

  // Book ID filter
  if (query.bookId) {
    where.bookId = query.bookId;
  }

  // Status filter
  if (query.status) {
    where.status = query.status;
  }

  // Type filter
  if (query.type) {
    where.type = query.type;
  }

  // Tags filter (all tags must be present)
  if (query.tags && query.tags.length > 0) {
    where.tags = {
      hasEvery: query.tags,
    };
  }

  // Due only filter - cards due for review now
  if (query.dueOnly) {
    where.dueDate = {
      lte: new Date(),
    };
    // Also exclude suspended cards from due list
    where.status = {
      not: "SUSPENDED",
    };
  }

  // Due before filter
  if (query.dueBefore) {
    where.dueDate = {
      lte: query.dueBefore,
    };
  }

  // Search in front/back content
  if (query.search) {
    where.OR = [
      { front: { contains: query.search, mode: "insensitive" } },
      { back: { contains: query.search, mode: "insensitive" } },
    ];
  }

  return where;
}

/**
 * Build Prisma orderBy from sort parameters
 */
function buildOrderByClause(
  sortBy: string,
  sortDirection: "asc" | "desc"
): Prisma.FlashcardOrderByWithRelationInput {
  const orderBy: Prisma.FlashcardOrderByWithRelationInput = {};

  switch (sortBy) {
    case "createdAt":
      orderBy.createdAt = sortDirection;
      break;
    case "updatedAt":
      orderBy.updatedAt = sortDirection;
      break;
    case "dueDate":
      orderBy.dueDate = sortDirection;
      break;
    case "easeFactor":
      orderBy.easeFactor = sortDirection;
      break;
    case "interval":
      orderBy.interval = sortDirection;
      break;
    case "front":
      orderBy.front = sortDirection;
      break;
    default:
      // Default to dueDate ascending (most due first)
      orderBy.dueDate = "asc";
  }

  return orderBy;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handle POST /api/flashcards - Create a flashcard
 */
async function handleCreate(
  req: AuthenticatedRequest,
  res: VercelResponse,
  clerkUserId: string
): Promise<void> {
  // Get user from database
  const user = await getUserByClerkId(clerkUserId);
  if (!user) {
    sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    return;
  }

  // Validate request body
  const validationResult = createFlashcardSchema.safeParse(req.body);
  if (!validationResult.success) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Invalid flashcard data",
      400,
      validationResult.error.flatten()
    );
    return;
  }

  const data: CreateFlashcardInput = validationResult.data;

  // If bookId is provided, verify user owns the book
  if (data.bookId) {
    const book = await db.book.findFirst({
      where: {
        id: data.bookId,
        userId: user.id,
        deletedAt: null,
      },
    });

    if (!book) {
      sendError(
        res,
        ErrorCodes.NOT_FOUND,
        "Book not found or you do not have access",
        404
      );
      return;
    }
  }

  // Create flashcard data
  const flashcardData: Prisma.FlashcardCreateInput = {
    user: { connect: { id: user.id } },
    front: data.front,
    back: data.back,
    type: data.type,
    tags: data.tags ?? [],
  };

  // Optional book association
  if (data.bookId) {
    flashcardData.book = { connect: { id: data.bookId } };
  }

  // Source reference (for AI-generated cards)
  if (data.sourceChapterId) {
    flashcardData.sourceChapterId = data.sourceChapterId;
  }
  if (data.sourceOffset !== undefined && data.sourceOffset !== null) {
    flashcardData.sourceOffset = data.sourceOffset;
  }

  // Create flashcard
  const flashcard = await db.flashcard.create({
    data: flashcardData,
  });

  // Log creation
  logger.info("Flashcard created", {
    userId: user.id,
    flashcardId: flashcard.id,
    type: flashcard.type,
    bookId: data.bookId ?? null,
  });

  sendSuccess(res, formatFlashcardResponse(flashcard), 201);
}

/**
 * Handle GET /api/flashcards - List flashcards
 */
async function handleList(
  req: AuthenticatedRequest,
  res: VercelResponse,
  clerkUserId: string
): Promise<void> {
  // Get user from database
  const user = await getUserByClerkId(clerkUserId);
  if (!user) {
    sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    return;
  }

  // Validate query parameters
  const validationResult = flashcardQuerySchema.safeParse(req.query);
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

  const query: FlashcardQueryInput = validationResult.data;

  // If bookId is provided, verify user owns the book
  if (query.bookId) {
    const book = await db.book.findFirst({
      where: {
        id: query.bookId,
        userId: user.id,
        deletedAt: null,
      },
    });

    if (!book) {
      sendError(
        res,
        ErrorCodes.NOT_FOUND,
        "Book not found or you do not have access",
        404
      );
      return;
    }
  }

  // Build query clauses
  const where = buildWhereClause(user.id, query);
  const orderBy = buildOrderByClause(query.sortBy, query.sortDirection);

  // Calculate pagination
  const skip = (query.page - 1) * query.limit;

  // Execute count and find in parallel
  const [total, flashcards] = await Promise.all([
    db.flashcard.count({ where }),
    db.flashcard.findMany({
      where,
      orderBy,
      skip,
      take: query.limit,
    }),
  ]);

  // Log the request
  logger.info("Flashcards listed", {
    userId: user.id,
    query: {
      bookId: query.bookId,
      status: query.status,
      type: query.type,
      tags: query.tags,
      search: query.search ? `[${query.search.length} chars]` : undefined,
      dueOnly: query.dueOnly,
      page: query.page,
      limit: query.limit,
    },
    results: flashcards.length,
    total,
  });

  // Return paginated response
  sendPaginated(
    res,
    flashcards.map(formatFlashcardResponse),
    query.page,
    query.limit,
    total
  );
}

/**
 * Handle PUT /api/flashcards - Update a flashcard
 */
async function handleUpdate(
  req: AuthenticatedRequest,
  res: VercelResponse,
  clerkUserId: string
): Promise<void> {
  // Get user from database
  const user = await getUserByClerkId(clerkUserId);
  if (!user) {
    sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    return;
  }

  // Get flashcard ID from query
  const flashcardId = req.query.id as string;
  const idValidation = flashcardIdSchema.safeParse(flashcardId);
  if (!idValidation.success) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "Invalid flashcard ID", 400);
    return;
  }

  // Find existing flashcard
  const existingFlashcard = await db.flashcard.findFirst({
    where: {
      id: flashcardId,
      deletedAt: null,
    },
  });

  if (!existingFlashcard) {
    sendError(res, ErrorCodes.NOT_FOUND, "Flashcard not found", 404);
    return;
  }

  // Check ownership
  if (existingFlashcard.userId !== user.id) {
    sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "You do not have permission to update this flashcard",
      403
    );
    return;
  }

  // Validate request body
  const validationResult = updateFlashcardSchema.safeParse(req.body);
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

  const data: UpdateFlashcardInput = validationResult.data;

  // Build update data
  const updateData: Prisma.FlashcardUpdateInput = {};

  if (data.front !== undefined) {
    updateData.front = data.front;
  }
  if (data.back !== undefined) {
    updateData.back = data.back;
  }
  if (data.type !== undefined) {
    updateData.type = data.type;
  }
  if (data.tags !== undefined) {
    updateData.tags = data.tags;
  }
  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  // Update flashcard
  const updatedFlashcard = await db.flashcard.update({
    where: { id: flashcardId },
    data: updateData,
  });

  // Log update
  logger.info("Flashcard updated", {
    userId: user.id,
    flashcardId,
    fieldsUpdated: Object.keys(updateData),
  });

  sendSuccess(res, formatFlashcardResponse(updatedFlashcard));
}

/**
 * Handle DELETE /api/flashcards - Soft delete (suspend) a flashcard
 */
async function handleDelete(
  req: AuthenticatedRequest,
  res: VercelResponse,
  clerkUserId: string
): Promise<void> {
  // Get user from database
  const user = await getUserByClerkId(clerkUserId);
  if (!user) {
    sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    return;
  }

  // Get flashcard ID from query
  const flashcardId = req.query.id as string;
  const idValidation = flashcardIdSchema.safeParse(flashcardId);
  if (!idValidation.success) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "Invalid flashcard ID", 400);
    return;
  }

  // Find existing flashcard
  const existingFlashcard = await db.flashcard.findFirst({
    where: {
      id: flashcardId,
      deletedAt: null,
    },
  });

  if (!existingFlashcard) {
    sendError(res, ErrorCodes.NOT_FOUND, "Flashcard not found", 404);
    return;
  }

  // Check ownership
  if (existingFlashcard.userId !== user.id) {
    sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "You do not have permission to delete this flashcard",
      403
    );
    return;
  }

  // Soft delete the flashcard
  await db.flashcard.update({
    where: { id: flashcardId },
    data: { deletedAt: new Date() },
  });

  // Log deletion
  logger.info("Flashcard deleted", {
    userId: user.id,
    flashcardId,
    type: existingFlashcard.type,
    bookId: existingFlashcard.bookId,
  });

  sendSuccess(res, {
    id: flashcardId,
    deleted: true,
    deletedAt: new Date().toISOString(),
  });
}

// ============================================================================
// Main Request Handler
// ============================================================================

/**
 * Main request handler - routes to appropriate handler based on method
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Check method
  if (!req.method || !SUPPORTED_METHODS.includes(req.method)) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      `Method not allowed. Use ${SUPPORTED_METHODS.join(", ")}.`,
      405
    );
    return;
  }

  const { userId } = req.auth;

  try {
    switch (req.method) {
      case "GET":
        await handleList(req, res, userId);
        break;
      case "POST":
        await handleCreate(req, res, userId);
        break;
      case "PUT":
        await handleUpdate(req, res, userId);
        break;
      case "DELETE":
        await handleDelete(req, res, userId);
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const operations: Record<string, string> = {
      GET: "fetching",
      POST: "creating",
      PUT: "updating",
      DELETE: "deleting",
    };
    const operation = operations[req.method ?? "GET"] ?? "processing";

    logger.error(`Error ${operation} flashcard`, {
      userId,
      error: message,
      method: req.method,
    });

    const verbs: Record<string, string> = {
      GET: "fetch",
      POST: "create",
      PUT: "update",
      DELETE: "delete",
    };
    const verb = verbs[req.method ?? "GET"] ?? "process";

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      `Failed to ${verb} flashcard. Please try again.`,
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  formatFlashcardResponse as formatFlashcard,
  buildWhereClause,
  buildOrderByClause,
};
