/**
 * Reading Group Books API - Manage scheduled books for the group
 *
 * GET /api/groups/:id/books - List books in the group's reading list
 *   - Returns books with schedule information
 *   - Sorted by status (CURRENT first) and orderIndex
 *
 * POST /api/groups/:id/books - Add a book to the group's reading list
 *   - Requires OWNER or ADMIN role
 *   - Sets schedule and status
 *
 * PUT /api/groups/:id/books/:bookId - Update a book's schedule
 *   - Requires OWNER or ADMIN role
 *   - Can update status, dates, and order
 *
 * DELETE /api/groups/:id/books/:bookId - Remove a book from the list
 *   - Requires OWNER or ADMIN role
 *
 * @example
 * ```bash
 * # List group books
 * curl -X GET "/api/groups/abc123/books" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Add book to group
 * curl -X POST "/api/groups/abc123/books" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"bookId":"book123","startDate":"2024-01-15","endDate":"2024-02-15","status":"UPCOMING"}'
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";
import type { GroupBookStatus } from "@read-master/database";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../../src/middleware/auth.js";
import {
  sendSuccess,
  sendPaginated,
  sendError,
  ErrorCodes,
} from "../../../src/utils/response.js";
import { logger } from "../../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../../src/services/db.js";
import { cache, CacheKeyPrefix } from "../../../src/services/redis.js";

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
export const MAX_LIMIT = 50;

/**
 * Roles that can modify group books
 */
export const ADMIN_ROLES = ["OWNER", "ADMIN"] as const;

/**
 * Valid book statuses
 */
export const VALID_STATUSES: GroupBookStatus[] = [
  "UPCOMING",
  "CURRENT",
  "COMPLETED",
  "SKIPPED",
];

// ============================================================================
// Types
// ============================================================================

/**
 * Book info in response
 */
export type GroupBookInfo = {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
  wordCount: number | null;
};

/**
 * Group book response
 */
export type GroupBookResponse = {
  id: string;
  groupId: string;
  book: GroupBookInfo;
  status: GroupBookStatus;
  startDate: string | null;
  endDate: string | null;
  targetPage: number | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * Add book to group input
 */
export type AddGroupBookInput = {
  bookId: string;
  startDate?: string | null;
  endDate?: string | null;
  targetPage?: number | null;
  status?: GroupBookStatus;
};

/**
 * Update group book input
 */
export type UpdateGroupBookInput = {
  startDate?: string | null;
  endDate?: string | null;
  targetPage?: number | null;
  status?: GroupBookStatus;
  orderIndex?: number;
};

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for listing group books query parameters
 */
const listGroupBooksQuerySchema = z.object({
  status: z.enum(["UPCOMING", "CURRENT", "COMPLETED", "SKIPPED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

/**
 * Schema for adding a book to group
 */
const addGroupBookSchema = z.object({
  bookId: z.string().min(1, "Book ID is required"),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  targetPage: z.coerce.number().int().min(1).optional().nullable(),
  status: z
    .enum(["UPCOMING", "CURRENT", "COMPLETED", "SKIPPED"])
    .default("UPCOMING"),
});

/**
 * Schema for updating a group book
 */
const updateGroupBookSchema = z.object({
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  targetPage: z.coerce.number().int().min(1).optional().nullable(),
  status: z.enum(["UPCOMING", "CURRENT", "COMPLETED", "SKIPPED"]).optional(),
  orderIndex: z.coerce.number().int().min(0).optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate group ID format
 */
export function validateGroupId(id: unknown): string | null {
  if (typeof id !== "string" || id.trim().length === 0) {
    return null;
  }
  return id.trim();
}

/**
 * Format date as ISO string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Check if user has admin permissions for the group
 */
function hasAdminPermission(role: string | null): boolean {
  if (!role) return false;
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

/**
 * Build cache key for group books
 */
function buildGroupBooksCacheKey(groupId: string, status?: string): string {
  const parts = [CacheKeyPrefix.USER, "group", groupId, "books"];
  if (status) {
    parts.push(status);
  }
  return parts.join(":");
}

/**
 * Map book to GroupBookInfo
 */
function mapToGroupBookInfo(book: {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
  wordCount: number | null;
}): GroupBookInfo {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverImage: book.coverImage,
    wordCount: book.wordCount,
  };
}

/**
 * Map group book to response
 */
function mapToGroupBookResponse(groupBook: {
  id: string;
  groupId: string;
  status: GroupBookStatus;
  startDate: Date | null;
  endDate: Date | null;
  targetPage: number | null;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
  book: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
    wordCount: number | null;
  };
}): GroupBookResponse {
  return {
    id: groupBook.id,
    groupId: groupBook.groupId,
    book: mapToGroupBookInfo(groupBook.book),
    status: groupBook.status,
    startDate: groupBook.startDate ? formatDate(groupBook.startDate) : null,
    endDate: groupBook.endDate ? formatDate(groupBook.endDate) : null,
    targetPage: groupBook.targetPage,
    orderIndex: groupBook.orderIndex,
    createdAt: formatDate(groupBook.createdAt),
    updatedAt: formatDate(groupBook.updatedAt),
  };
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get group with user's membership
 */
async function getGroupWithMembership(groupId: string, userId: string) {
  return db.readingGroup.findFirst({
    where: {
      id: groupId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      isPublic: true,
      userId: true,
      members: {
        where: { userId },
        select: {
          role: true,
        },
      },
    },
  });
}

/**
 * Check if user can access the group
 */
function canAccessGroup(
  group: {
    isPublic: boolean;
    userId: string;
    members?: Array<{ role: string }>;
  },
  userId: string
): boolean {
  if (group.isPublic) return true;
  if (group.userId === userId) return true;
  if (group.members && group.members.length > 0) return true;
  return false;
}

/**
 * Get the next order index for a new book
 */
async function getNextOrderIndex(groupId: string): Promise<number> {
  const lastBook = await db.groupBook.findFirst({
    where: { groupId },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true },
  });
  return (lastBook?.orderIndex ?? -1) + 1;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET, POST, PUT, DELETE /api/groups/:id/books
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const { userId: clerkUserId } = req.auth;

  // Get current user
  const user = await getUserByClerkId(clerkUserId);
  if (!user) {
    sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    return;
  }

  // Validate group ID
  const groupId = validateGroupId(req.query.id);
  if (!groupId) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "Invalid group ID", 400);
    return;
  }

  // Get group with membership
  const group = await getGroupWithMembership(groupId, user.id);
  if (!group) {
    sendError(res, ErrorCodes.NOT_FOUND, "Group not found", 404);
    return;
  }

  // Check access
  if (!canAccessGroup(group, user.id)) {
    sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "You do not have access to this group",
      403
    );
    return;
  }

  const userRole = group.members?.[0]?.role ?? null;

  if (req.method === "GET") {
    await handleListGroupBooks(req, res, groupId);
  } else if (req.method === "POST") {
    await handleAddGroupBook(req, res, user, groupId, userRole);
  } else if (req.method === "PUT") {
    await handleUpdateGroupBook(req, res, user, groupId, userRole);
  } else if (req.method === "DELETE") {
    await handleDeleteGroupBook(req, res, user, groupId, userRole);
  } else {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET, POST, PUT, or DELETE.",
      405
    );
  }
}

/**
 * Handle GET /api/groups/:id/books - List group books
 */
async function handleListGroupBooks(
  req: AuthenticatedRequest,
  res: VercelResponse,
  groupId: string
): Promise<void> {
  try {
    // Parse query parameters
    const queryResult = listGroupBooksQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid query parameters",
        400,
        queryResult.error.flatten()
      );
      return;
    }

    const { status, page, limit } = queryResult.data;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: { groupId: string; status?: GroupBookStatus } = { groupId };
    if (status) {
      where.status = status;
    }

    // Execute queries in parallel
    const [total, groupBooks] = await Promise.all([
      db.groupBook.count({ where }),
      db.groupBook.findMany({
        where,
        orderBy: [
          // CURRENT books first, then by orderIndex
          { status: "asc" },
          { orderIndex: "asc" },
        ],
        skip,
        take: limit,
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              coverImage: true,
              wordCount: true,
            },
          },
        },
      }),
    ]);

    // Map to response format
    const responses = groupBooks.map(mapToGroupBookResponse);

    logger.info("Group books listed", {
      groupId,
      status,
      count: responses.length,
      total,
    });

    sendPaginated(res, responses, page, limit, total);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error listing group books", { groupId, error: message });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to list group books. Please try again.",
      500
    );
  }
}

/**
 * Handle POST /api/groups/:id/books - Add book to group
 */
async function handleAddGroupBook(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string },
  groupId: string,
  userRole: string | null
): Promise<void> {
  try {
    // Check admin permission
    if (!hasAdminPermission(userRole)) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Only owners and admins can add books to the group",
        403
      );
      return;
    }

    // Validate input
    const validationResult = addGroupBookSchema.safeParse(req.body);
    if (!validationResult.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid input",
        400,
        validationResult.error.flatten()
      );
      return;
    }

    const input = validationResult.data;

    // Check if book exists
    const book = await db.book.findFirst({
      where: {
        id: input.bookId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        author: true,
        coverImage: true,
        wordCount: true,
      },
    });

    if (!book) {
      sendError(res, ErrorCodes.NOT_FOUND, "Book not found", 404);
      return;
    }

    // Check if book is already in the group
    const existingGroupBook = await db.groupBook.findUnique({
      where: {
        groupId_bookId: {
          groupId,
          bookId: input.bookId,
        },
      },
    });

    if (existingGroupBook) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "This book is already in the group's reading list",
        400
      );
      return;
    }

    // Get next order index
    const orderIndex = await getNextOrderIndex(groupId);

    // Create group book
    const groupBook = await db.groupBook.create({
      data: {
        groupId,
        bookId: input.bookId,
        status: input.status,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        targetPage: input.targetPage ?? null,
        orderIndex,
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverImage: true,
            wordCount: true,
          },
        },
      },
    });

    // If adding as CURRENT, also update the group's currentBookId
    if (input.status === "CURRENT") {
      await db.readingGroup.update({
        where: { id: groupId },
        data: { currentBookId: input.bookId },
      });
    }

    // Invalidate cache
    await cache.invalidatePattern(`${CacheKeyPrefix.USER}:group:${groupId}:*`);

    const response = mapToGroupBookResponse(groupBook);

    logger.info("Book added to group", {
      userId: user.id,
      groupId,
      bookId: input.bookId,
      bookTitle: book.title,
      status: input.status,
    });

    sendSuccess(res, response, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error adding book to group", {
      userId: user.id,
      groupId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to add book to group. Please try again.",
      500
    );
  }
}

/**
 * Handle PUT /api/groups/:id/books?bookId=xxx - Update group book
 */
async function handleUpdateGroupBook(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string },
  groupId: string,
  userRole: string | null
): Promise<void> {
  try {
    // Check admin permission
    if (!hasAdminPermission(userRole)) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Only owners and admins can update group books",
        403
      );
      return;
    }

    // Get bookId from query
    const bookId = req.query.bookId;
    if (typeof bookId !== "string" || !bookId.trim()) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Book ID is required as query parameter",
        400
      );
      return;
    }

    // Validate input
    const validationResult = updateGroupBookSchema.safeParse(req.body);
    if (!validationResult.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid input",
        400,
        validationResult.error.flatten()
      );
      return;
    }

    const input = validationResult.data;

    // Check if group book exists
    const existingGroupBook = await db.groupBook.findUnique({
      where: {
        groupId_bookId: {
          groupId,
          bookId: bookId.trim(),
        },
      },
    });

    if (!existingGroupBook) {
      sendError(res, ErrorCodes.NOT_FOUND, "Book not found in group", 404);
      return;
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (input.startDate !== undefined) {
      updateData.startDate = input.startDate ? new Date(input.startDate) : null;
    }
    if (input.endDate !== undefined) {
      updateData.endDate = input.endDate ? new Date(input.endDate) : null;
    }
    if (input.targetPage !== undefined) {
      updateData.targetPage = input.targetPage;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.orderIndex !== undefined) {
      updateData.orderIndex = input.orderIndex;
    }

    // Update group book
    const updatedGroupBook = await db.groupBook.update({
      where: {
        groupId_bookId: {
          groupId,
          bookId: bookId.trim(),
        },
      },
      data: updateData,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverImage: true,
            wordCount: true,
          },
        },
      },
    });

    // If status changed to CURRENT, update group's currentBookId
    if (input.status === "CURRENT") {
      await db.readingGroup.update({
        where: { id: groupId },
        data: { currentBookId: bookId.trim() },
      });
    }

    // Invalidate cache
    await cache.invalidatePattern(`${CacheKeyPrefix.USER}:group:${groupId}:*`);

    const response = mapToGroupBookResponse(updatedGroupBook);

    logger.info("Group book updated", {
      userId: user.id,
      groupId,
      bookId: bookId.trim(),
      updatedFields: Object.keys(updateData),
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error updating group book", {
      userId: user.id,
      groupId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to update group book. Please try again.",
      500
    );
  }
}

/**
 * Handle DELETE /api/groups/:id/books?bookId=xxx - Remove book from group
 */
async function handleDeleteGroupBook(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string },
  groupId: string,
  userRole: string | null
): Promise<void> {
  try {
    // Check admin permission
    if (!hasAdminPermission(userRole)) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Only owners and admins can remove books from the group",
        403
      );
      return;
    }

    // Get bookId from query
    const bookId = req.query.bookId;
    if (typeof bookId !== "string" || !bookId.trim()) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Book ID is required as query parameter",
        400
      );
      return;
    }

    // Check if group book exists
    const existingGroupBook = await db.groupBook.findUnique({
      where: {
        groupId_bookId: {
          groupId,
          bookId: bookId.trim(),
        },
      },
      include: {
        book: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!existingGroupBook) {
      sendError(res, ErrorCodes.NOT_FOUND, "Book not found in group", 404);
      return;
    }

    // Delete group book
    await db.groupBook.delete({
      where: {
        groupId_bookId: {
          groupId,
          bookId: bookId.trim(),
        },
      },
    });

    // If this was the current book, clear currentBookId
    const group = await db.readingGroup.findUnique({
      where: { id: groupId },
      select: { currentBookId: true },
    });

    if (group?.currentBookId === bookId.trim()) {
      await db.readingGroup.update({
        where: { id: groupId },
        data: { currentBookId: null },
      });
    }

    // Invalidate cache
    await cache.invalidatePattern(`${CacheKeyPrefix.USER}:group:${groupId}:*`);

    logger.info("Book removed from group", {
      userId: user.id,
      groupId,
      bookId: bookId.trim(),
      bookTitle: existingGroupBook.book.title,
    });

    sendSuccess(res, { message: "Book removed from group successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error removing book from group", {
      userId: user.id,
      groupId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to remove book from group. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  listGroupBooksQuerySchema,
  addGroupBookSchema,
  updateGroupBookSchema,
  hasAdminPermission,
  buildGroupBooksCacheKey,
  mapToGroupBookInfo,
  mapToGroupBookResponse,
};
