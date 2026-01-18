/**
 * Annotation CRUD endpoints
 *
 * POST /api/annotations - Create annotation (highlight, note, bookmark)
 * GET /api/annotations - List annotations for a book with filters
 * PUT /api/annotations/:id - Update annotation
 * DELETE /api/annotations/:id - Soft delete annotation
 *
 * All annotations are stored with character offsets for portability.
 * Public annotations are filtered for profanity.
 *
 * @example
 * ```bash
 * # Create a highlight
 * curl -X POST /api/annotations \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "bookId": "clxxxxxxxxxx",
 *     "type": "HIGHLIGHT",
 *     "startOffset": 100,
 *     "endOffset": 200,
 *     "selectedText": "Important passage",
 *     "color": "#FFFF00",
 *     "isPublic": false
 *   }'
 *
 * # List annotations
 * curl -X GET "/api/annotations?bookId=clxxxxxxxxxx&type=HIGHLIGHT" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import {
  createAnnotationSchema,
  createAnnotationPublicSchema,
  updateAnnotationSchema,
  updateAnnotationPublicSchema,
  annotationQuerySchema,
  annotationIdSchema,
} from "@read-master/shared/schemas";
import { containsProfanity } from "@read-master/shared";

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
import type { Prisma, AnnotationType } from "@read-master/database";

// ============================================================================
// Constants
// ============================================================================

/**
 * Default highlight color (yellow)
 */
const DEFAULT_HIGHLIGHT_COLOR = "#FFFF00";

/**
 * Supported HTTP methods
 */
const SUPPORTED_METHODS = ["GET", "POST", "PUT", "DELETE"];

// ============================================================================
// Types
// ============================================================================

/**
 * Annotation response type
 */
type AnnotationResponse = {
  id: string;
  bookId: string;
  userId: string;
  type: AnnotationType;
  startOffset: number;
  endOffset: number;
  selectedText: string | null;
  note: string | null;
  color: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Annotation list response type
 */
type AnnotationListResponse = {
  annotations: AnnotationResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format annotation for API response
 */
function formatAnnotationResponse(annotation: {
  id: string;
  bookId: string;
  userId: string;
  type: AnnotationType;
  startOffset: number;
  endOffset: number;
  selectedText: string | null;
  note: string | null;
  color: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AnnotationResponse {
  return {
    id: annotation.id,
    bookId: annotation.bookId,
    userId: annotation.userId,
    type: annotation.type,
    startOffset: annotation.startOffset,
    endOffset: annotation.endOffset,
    selectedText: annotation.selectedText,
    note: annotation.note,
    color: annotation.color,
    isPublic: annotation.isPublic,
    createdAt: annotation.createdAt.toISOString(),
    updatedAt: annotation.updatedAt.toISOString(),
  };
}

/**
 * Build Prisma where clause from query parameters
 */
function buildAnnotationWhereClause(
  userId: string,
  query: {
    bookId: string;
    type?: AnnotationType;
    isPublic?: boolean;
    hasNote?: boolean;
    search?: string;
    includeDeleted?: boolean;
  }
): Prisma.AnnotationWhereInput {
  const where: Prisma.AnnotationWhereInput = {
    userId,
    bookId: query.bookId,
  };

  // Type filter
  if (query.type) {
    where.type = query.type;
  }

  // Visibility filter
  if (query.isPublic !== undefined) {
    where.isPublic = query.isPublic;
  }

  // Has note filter
  if (query.hasNote !== undefined) {
    if (query.hasNote) {
      where.note = { not: null };
    } else {
      where.note = null;
    }
  }

  // Search in notes
  if (query.search) {
    where.note = { contains: query.search, mode: "insensitive" };
  }

  // Soft delete filter
  if (!query.includeDeleted) {
    where.deletedAt = null;
  }

  return where;
}

/**
 * Build Prisma orderBy from sort parameters
 */
function buildAnnotationOrderBy(
  sortBy: string,
  sortDirection: "asc" | "desc"
): Prisma.AnnotationOrderByWithRelationInput {
  const orderBy: Prisma.AnnotationOrderByWithRelationInput = {};

  switch (sortBy) {
    case "createdAt":
      orderBy.createdAt = sortDirection;
      break;
    case "updatedAt":
      orderBy.updatedAt = sortDirection;
      break;
    case "startOffset":
      orderBy.startOffset = sortDirection;
      break;
    case "type":
      orderBy.type = sortDirection;
      break;
    default:
      orderBy.startOffset = "asc";
  }

  return orderBy;
}

/**
 * Check if annotation contains profanity in public fields
 */
function checkAnnotationProfanity(data: {
  note?: string | null;
  isPublic?: boolean;
}): { valid: boolean; field?: string } {
  // Only check if making annotation public
  if (!data.isPublic) {
    return { valid: true };
  }

  // Check note for profanity
  if (data.note && containsProfanity(data.note)) {
    return { valid: false, field: "note" };
  }

  return { valid: true };
}

// ============================================================================
// Main Handlers
// ============================================================================

/**
 * Handle POST /api/annotations - Create annotation
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

  // Determine if annotation is public and use appropriate schema
  const isPublic = req.body?.isPublic === true;
  const schema = isPublic
    ? createAnnotationPublicSchema
    : createAnnotationSchema;

  // Validate request body
  const validationResult = schema.safeParse(req.body);
  if (!validationResult.success) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Invalid annotation data",
      400,
      validationResult.error.flatten()
    );
    return;
  }

  const data = validationResult.data;

  // Check book exists and user has access
  const book = await db.book.findFirst({
    where: {
      id: data.bookId,
      deletedAt: null,
    },
  });

  if (!book) {
    sendError(res, ErrorCodes.NOT_FOUND, "Book not found", 404);
    return;
  }

  // Only owner can add annotations
  if (book.userId !== user.id) {
    sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "You do not have permission to annotate this book",
      403
    );
    return;
  }

  // Create annotation data
  const annotationData: Prisma.AnnotationCreateInput = {
    user: { connect: { id: user.id } },
    book: { connect: { id: data.bookId } },
    type: data.type,
    startOffset: data.startOffset,
    endOffset: data.endOffset,
    isPublic: data.isPublic,
  };

  // Set type-specific fields
  if (data.type === "HIGHLIGHT") {
    annotationData.selectedText = data.selectedText;
    annotationData.color = data.color ?? DEFAULT_HIGHLIGHT_COLOR;
    if ("note" in data && data.note) {
      annotationData.note = data.note;
    }
  } else if (data.type === "NOTE") {
    annotationData.note = data.note;
    if ("selectedText" in data && data.selectedText) {
      annotationData.selectedText = data.selectedText;
    }
  } else if (data.type === "BOOKMARK") {
    if ("note" in data && data.note) {
      annotationData.note = data.note;
    }
  }

  // Create annotation
  const annotation = await db.annotation.create({
    data: annotationData,
  });

  // Log the creation
  logger.info("Annotation created", {
    userId: user.id,
    annotationId: annotation.id,
    bookId: data.bookId,
    type: data.type,
    isPublic: data.isPublic,
  });

  sendSuccess(res, formatAnnotationResponse(annotation), 201);
}

/**
 * Handle GET /api/annotations - List annotations
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
  const validationResult = annotationQuerySchema.safeParse(req.query);
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

  const query = validationResult.data;

  // Check book exists and user has access
  const book = await db.book.findFirst({
    where: {
      id: query.bookId,
      deletedAt: null,
    },
  });

  if (!book) {
    sendError(res, ErrorCodes.NOT_FOUND, "Book not found", 404);
    return;
  }

  // Check access (owner or public book)
  const isOwner = book.userId === user.id;
  if (!isOwner && !book.isPublic) {
    sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "You do not have access to annotations for this book",
      403
    );
    return;
  }

  // Build where clause - for non-owners, only show public annotations
  // Extract only needed fields to avoid exactOptionalPropertyTypes issues
  const whereQuery: Parameters<typeof buildAnnotationWhereClause>[1] = {
    bookId: query.bookId,
    includeDeleted: query.includeDeleted,
    ...(query.type !== undefined && { type: query.type }),
    ...(query.isPublic !== undefined && { isPublic: query.isPublic }),
    ...(query.hasNote !== undefined && { hasNote: query.hasNote }),
    ...(query.search !== undefined && { search: query.search }),
  };

  // For non-owners, override to only show public annotations
  if (!isOwner) {
    whereQuery.isPublic = true;
  }

  const where = buildAnnotationWhereClause(
    isOwner ? user.id : book.userId,
    whereQuery
  );

  // If not owner, override userId to book owner's
  if (!isOwner) {
    where.userId = book.userId;
  }

  // Build orderBy
  const orderBy = buildAnnotationOrderBy(query.sortBy, query.sortDirection);

  // Get total count
  const total = await db.annotation.count({ where });

  // Calculate pagination
  const skip = (query.page - 1) * query.limit;

  // Fetch annotations
  const annotations = await db.annotation.findMany({
    where,
    orderBy,
    skip,
    take: query.limit,
  });

  // Log the request
  logger.info("Annotations listed", {
    userId: user.id,
    bookId: query.bookId,
    count: annotations.length,
    total,
  });

  // Return paginated response
  sendPaginated(
    res,
    annotations.map(formatAnnotationResponse),
    query.page,
    query.limit,
    total
  );
}

/**
 * Handle PUT /api/annotations - Update annotation
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

  // Get annotation ID from query
  const annotationId = req.query.id as string;
  const idValidation = annotationIdSchema.safeParse(annotationId);
  if (!idValidation.success) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "Invalid annotation ID", 400);
    return;
  }

  // Find existing annotation
  const existingAnnotation = await db.annotation.findFirst({
    where: {
      id: annotationId,
      deletedAt: null,
    },
  });

  if (!existingAnnotation) {
    sendError(res, ErrorCodes.NOT_FOUND, "Annotation not found", 404);
    return;
  }

  // Check ownership
  if (existingAnnotation.userId !== user.id) {
    sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "You do not have permission to update this annotation",
      403
    );
    return;
  }

  // Determine if annotation is/will be public
  const willBePublic = req.body?.isPublic ?? existingAnnotation.isPublic;
  const schema = willBePublic
    ? updateAnnotationPublicSchema
    : updateAnnotationSchema;

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

  const data = validationResult.data;

  // Additional profanity check for becoming public
  if (willBePublic && !existingAnnotation.isPublic) {
    const profanityCheck = checkAnnotationProfanity({
      note: data.note ?? existingAnnotation.note,
      isPublic: true,
    });
    if (!profanityCheck.valid) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        `${profanityCheck.field} contains inappropriate language`,
        400
      );
      return;
    }
  }

  // Build update data
  const updateData: Prisma.AnnotationUpdateInput = {};

  if (data.note !== undefined) {
    updateData.note = data.note;
  }
  if (data.color !== undefined) {
    updateData.color = data.color;
  }
  if (data.isPublic !== undefined) {
    updateData.isPublic = data.isPublic;
  }
  if (data.startOffset !== undefined) {
    updateData.startOffset = data.startOffset;
  }
  if (data.endOffset !== undefined) {
    updateData.endOffset = data.endOffset;
  }
  if (data.selectedText !== undefined) {
    updateData.selectedText = data.selectedText;
  }

  // Update annotation
  const updatedAnnotation = await db.annotation.update({
    where: { id: annotationId },
    data: updateData,
  });

  // Log the update
  logger.info("Annotation updated", {
    userId: user.id,
    annotationId,
    bookId: existingAnnotation.bookId,
    fieldsUpdated: Object.keys(updateData),
  });

  sendSuccess(res, formatAnnotationResponse(updatedAnnotation));
}

/**
 * Handle DELETE /api/annotations - Soft delete annotation
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

  // Get annotation ID from query
  const annotationId = req.query.id as string;
  const idValidation = annotationIdSchema.safeParse(annotationId);
  if (!idValidation.success) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "Invalid annotation ID", 400);
    return;
  }

  // Find existing annotation
  const existingAnnotation = await db.annotation.findFirst({
    where: {
      id: annotationId,
      deletedAt: null,
    },
  });

  if (!existingAnnotation) {
    sendError(res, ErrorCodes.NOT_FOUND, "Annotation not found", 404);
    return;
  }

  // Check ownership
  if (existingAnnotation.userId !== user.id) {
    sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "You do not have permission to delete this annotation",
      403
    );
    return;
  }

  // Soft delete annotation
  await db.annotation.update({
    where: { id: annotationId },
    data: { deletedAt: new Date() },
  });

  // Log the deletion
  logger.info("Annotation deleted", {
    userId: user.id,
    annotationId,
    bookId: existingAnnotation.bookId,
    type: existingAnnotation.type,
  });

  sendSuccess(res, {
    id: annotationId,
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

    logger.error(`Error ${operation} annotation`, {
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
      `Failed to ${verb} annotation. Please try again.`,
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
  DEFAULT_HIGHLIGHT_COLOR,
  SUPPORTED_METHODS,
  // Helper functions
  formatAnnotationResponse,
  buildAnnotationWhereClause,
  buildAnnotationOrderBy,
  checkAnnotationProfanity,
  // Types
  type AnnotationResponse,
  type AnnotationListResponse,
};
