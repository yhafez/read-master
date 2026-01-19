/**
 * Curriculum Items API - List, Add, Reorder
 *
 * GET /api/curriculums/:id/items - List curriculum items
 *   - Returns items in order
 *   - Requires access to curriculum
 *
 * POST /api/curriculums/:id/items - Add item to curriculum
 *   - Only owner can add items
 *   - Supports book reference or external resource
 *   - Auto-assigns order index
 *
 * PUT /api/curriculums/:id/items - Reorder items
 *   - Only owner can reorder
 *   - Accepts array of item IDs in new order
 *
 * @example
 * ```bash
 * # List items
 * curl -X GET "/api/curriculums/abc123/items" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Add book item
 * curl -X POST "/api/curriculums/abc123/items" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"bookId":"book123","notes":"Read chapters 1-5"}'
 *
 * # Add external resource
 * curl -X POST "/api/curriculums/abc123/items" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"externalTitle":"Article Title","externalUrl":"https://example.com"}'
 *
 * # Reorder items
 * curl -X PUT "/api/curriculums/abc123/items" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"itemIds":["item3","item1","item2"]}'
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";
import type { Visibility } from "@read-master/database";

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
import { db, getUserByClerkId } from "../../../src/services/db.js";
import { cache, CacheKeyPrefix } from "../../../src/services/redis.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum notes length
 */
export const MAX_NOTES_LENGTH = 5000;

/**
 * Maximum external title length
 */
export const MAX_EXTERNAL_TITLE_LENGTH = 500;

/**
 * Maximum external author length
 */
export const MAX_EXTERNAL_AUTHOR_LENGTH = 200;

/**
 * Maximum external URL length
 */
export const MAX_EXTERNAL_URL_LENGTH = 2000;

/**
 * Maximum ISBN length
 */
export const MAX_ISBN_LENGTH = 20;

/**
 * Maximum estimated time in minutes (24 hours)
 */
export const MAX_ESTIMATED_TIME = 1440;

/**
 * Maximum items per curriculum
 */
export const MAX_ITEMS_PER_CURRICULUM = 200;

// ============================================================================
// Types
// ============================================================================

/**
 * Book info in curriculum item
 */
export type ItemBookInfo = {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
};

/**
 * Curriculum item response
 */
export type CurriculumItemResponse = {
  id: string;
  orderIndex: number;
  bookId: string | null;
  book: ItemBookInfo | null;
  externalTitle: string | null;
  externalAuthor: string | null;
  externalUrl: string | null;
  externalIsbn: string | null;
  notes: string | null;
  estimatedTime: number | null;
  isOptional: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Add item input
 */
export type AddItemInput = {
  bookId?: string;
  externalTitle?: string;
  externalAuthor?: string;
  externalUrl?: string;
  externalIsbn?: string;
  notes?: string;
  estimatedTime?: number;
  isOptional?: boolean;
};

/**
 * Reorder items input
 */
export type ReorderItemsInput = {
  itemIds: string[];
};

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for adding an item to a curriculum
 */
export const addItemSchema = z
  .object({
    bookId: z.string().min(1, "Book ID cannot be empty").optional(),
    externalTitle: z
      .string()
      .min(1, "External title cannot be empty")
      .max(
        MAX_EXTERNAL_TITLE_LENGTH,
        `External title must be at most ${MAX_EXTERNAL_TITLE_LENGTH} characters`
      )
      .optional(),
    externalAuthor: z
      .string()
      .max(
        MAX_EXTERNAL_AUTHOR_LENGTH,
        `External author must be at most ${MAX_EXTERNAL_AUTHOR_LENGTH} characters`
      )
      .optional()
      .nullable(),
    externalUrl: z
      .string()
      .url("External URL must be a valid URL")
      .max(
        MAX_EXTERNAL_URL_LENGTH,
        `External URL must be at most ${MAX_EXTERNAL_URL_LENGTH} characters`
      )
      .optional()
      .nullable(),
    externalIsbn: z
      .string()
      .max(
        MAX_ISBN_LENGTH,
        `ISBN must be at most ${MAX_ISBN_LENGTH} characters`
      )
      .optional()
      .nullable(),
    notes: z
      .string()
      .max(
        MAX_NOTES_LENGTH,
        `Notes must be at most ${MAX_NOTES_LENGTH} characters`
      )
      .optional()
      .nullable(),
    estimatedTime: z
      .number()
      .int("Estimated time must be an integer")
      .min(1, "Estimated time must be at least 1 minute")
      .max(
        MAX_ESTIMATED_TIME,
        `Estimated time must be at most ${MAX_ESTIMATED_TIME} minutes`
      )
      .optional()
      .nullable(),
    isOptional: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Must have either bookId or externalTitle
      return data.bookId !== undefined || data.externalTitle !== undefined;
    },
    {
      message: "Either bookId or externalTitle must be provided",
      path: ["bookId"],
    }
  );

/**
 * Schema for reordering items
 */
export const reorderItemsSchema = z.object({
  itemIds: z
    .array(z.string().min(1, "Item ID cannot be empty"))
    .min(1, "At least one item ID is required")
    .max(MAX_ITEMS_PER_CURRICULUM, `Maximum ${MAX_ITEMS_PER_CURRICULUM} items`),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate curriculum ID format
 */
export function validateCurriculumId(id: unknown): string | null {
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
 * Map book data to ItemBookInfo
 */
export function mapToItemBookInfo(
  book: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
  } | null
): ItemBookInfo | null {
  if (!book) return null;
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverImage: book.coverImage,
  };
}

/**
 * Map curriculum item to response
 */
export function mapToItemResponse(item: {
  id: string;
  orderIndex: number;
  bookId: string | null;
  book: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
  } | null;
  externalTitle: string | null;
  externalAuthor: string | null;
  externalUrl: string | null;
  externalIsbn: string | null;
  notes: string | null;
  estimatedTime: number | null;
  isOptional: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CurriculumItemResponse {
  return {
    id: item.id,
    orderIndex: item.orderIndex,
    bookId: item.bookId,
    book: mapToItemBookInfo(item.book),
    externalTitle: item.externalTitle,
    externalAuthor: item.externalAuthor,
    externalUrl: item.externalUrl,
    externalIsbn: item.externalIsbn,
    notes: item.notes,
    estimatedTime: item.estimatedTime,
    isOptional: item.isOptional,
    createdAt: formatDate(item.createdAt),
    updatedAt: formatDate(item.updatedAt),
  };
}

/**
 * Check if user can access the curriculum
 */
export function canAccessCurriculum(
  curriculum: {
    visibility: Visibility;
    userId: string;
    followers?: Array<{ userId: string }>;
  },
  userId: string
): boolean {
  // Public and unlisted are accessible to everyone
  if (
    curriculum.visibility === "PUBLIC" ||
    curriculum.visibility === "UNLISTED"
  ) {
    return true;
  }

  // Owner can always access
  if (curriculum.userId === userId) return true;

  // Private curriculums require the user to be following
  if (curriculum.followers?.some((f) => f.userId === userId)) return true;

  return false;
}

/**
 * Check if user is the owner of the curriculum
 */
export function isOwner(curriculumUserId: string, userId: string): boolean {
  return curriculumUserId === userId;
}

/**
 * Build cache key for curriculum items
 */
export function buildItemsCacheKey(curriculumId: string): string {
  return `${CacheKeyPrefix.USER}:curriculum:${curriculumId}:items`;
}

/**
 * Build cache key for individual curriculum
 */
export function buildCurriculumCacheKey(curriculumId: string): string {
  return `${CacheKeyPrefix.USER}:curriculum:${curriculumId}`;
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get curriculum with basic info for access checking
 */
async function getCurriculumForAccess(curriculumId: string, userId: string) {
  return db.curriculum.findFirst({
    where: {
      id: curriculumId,
      deletedAt: null,
    },
    select: {
      id: true,
      userId: true,
      visibility: true,
      totalItems: true,
      followers: {
        where: { userId },
        select: { userId: true },
      },
    },
  });
}

/**
 * Get curriculum items
 */
async function getCurriculumItems(curriculumId: string) {
  return db.curriculumItem.findMany({
    where: { curriculumId },
    orderBy: { orderIndex: "asc" },
    include: {
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          coverImage: true,
        },
      },
    },
  });
}

/**
 * Get next order index for curriculum
 */
async function getNextOrderIndex(curriculumId: string): Promise<number> {
  const lastItem = await db.curriculumItem.findFirst({
    where: { curriculumId },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true },
  });
  return lastItem ? lastItem.orderIndex + 1 : 0;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET, POST, PUT /api/curriculums/:id/items
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

  // Validate curriculum ID
  const curriculumId = validateCurriculumId(req.query.id);
  if (!curriculumId) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "Invalid curriculum ID", 400);
    return;
  }

  if (req.method === "GET") {
    await handleListItems(res, user, curriculumId);
  } else if (req.method === "POST") {
    await handleAddItem(req, res, user, curriculumId);
  } else if (req.method === "PUT") {
    await handleReorderItems(req, res, user, curriculumId);
  } else {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET, POST, or PUT.",
      405
    );
  }
}

/**
 * Handle GET /api/curriculums/:id/items
 */
async function handleListItems(
  res: VercelResponse,
  user: { id: string },
  curriculumId: string
): Promise<void> {
  try {
    // Get curriculum to check access
    const curriculum = await getCurriculumForAccess(curriculumId, user.id);

    if (!curriculum) {
      sendError(res, ErrorCodes.NOT_FOUND, "Curriculum not found", 404);
      return;
    }

    // Check access
    if (!canAccessCurriculum(curriculum, user.id)) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "You do not have access to this curriculum",
        403
      );
      return;
    }

    // Get items
    const items = await getCurriculumItems(curriculumId);

    logger.info("Curriculum items listed", {
      userId: user.id,
      curriculumId,
      itemCount: items.length,
    });

    sendSuccess(res, {
      items: items.map(mapToItemResponse),
      total: items.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error listing curriculum items", {
      userId: user.id,
      curriculumId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to list curriculum items. Please try again.",
      500
    );
  }
}

/**
 * Handle POST /api/curriculums/:id/items
 */
async function handleAddItem(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string },
  curriculumId: string
): Promise<void> {
  try {
    // Get curriculum to check ownership
    const curriculum = await getCurriculumForAccess(curriculumId, user.id);

    if (!curriculum) {
      sendError(res, ErrorCodes.NOT_FOUND, "Curriculum not found", 404);
      return;
    }

    // Check owner permission
    if (!isOwner(curriculum.userId, user.id)) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Only the owner can add items to the curriculum",
        403
      );
      return;
    }

    // Check item limit
    if (curriculum.totalItems >= MAX_ITEMS_PER_CURRICULUM) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        `Maximum ${MAX_ITEMS_PER_CURRICULUM} items per curriculum reached`,
        400
      );
      return;
    }

    // Validate input
    const validationResult = addItemSchema.safeParse(req.body);
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

    // If bookId provided, verify book exists
    if (input.bookId) {
      const book = await db.book.findFirst({
        where: { id: input.bookId, deletedAt: null },
        select: { id: true },
      });
      if (!book) {
        sendError(res, ErrorCodes.NOT_FOUND, "Book not found", 404);
        return;
      }
    }

    // Get next order index
    const orderIndex = await getNextOrderIndex(curriculumId);

    // Create item in transaction
    const [newItem] = await db.$transaction([
      db.curriculumItem.create({
        data: {
          curriculumId,
          orderIndex,
          bookId: input.bookId ?? null,
          externalTitle: input.externalTitle ?? null,
          externalAuthor: input.externalAuthor ?? null,
          externalUrl: input.externalUrl ?? null,
          externalIsbn: input.externalIsbn ?? null,
          notes: input.notes ?? null,
          estimatedTime: input.estimatedTime ?? null,
          isOptional: input.isOptional ?? false,
        },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              coverImage: true,
            },
          },
        },
      }),
      db.curriculum.update({
        where: { id: curriculumId },
        data: { totalItems: { increment: 1 } },
      }),
    ]);

    // Invalidate caches
    await Promise.all([
      cache.del(buildItemsCacheKey(curriculumId)),
      cache.del(buildCurriculumCacheKey(curriculumId)),
      cache.invalidatePattern(`${CacheKeyPrefix.USER}:*:curriculums:*`),
    ]);

    logger.info("Curriculum item added", {
      userId: user.id,
      curriculumId,
      itemId: newItem.id,
      orderIndex,
      hasBookId: !!input.bookId,
      hasExternalTitle: !!input.externalTitle,
    });

    sendSuccess(res, mapToItemResponse(newItem), 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error adding curriculum item", {
      userId: user.id,
      curriculumId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to add curriculum item. Please try again.",
      500
    );
  }
}

/**
 * Handle PUT /api/curriculums/:id/items (reorder)
 */
async function handleReorderItems(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string },
  curriculumId: string
): Promise<void> {
  try {
    // Get curriculum to check ownership
    const curriculum = await getCurriculumForAccess(curriculumId, user.id);

    if (!curriculum) {
      sendError(res, ErrorCodes.NOT_FOUND, "Curriculum not found", 404);
      return;
    }

    // Check owner permission
    if (!isOwner(curriculum.userId, user.id)) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Only the owner can reorder items in the curriculum",
        403
      );
      return;
    }

    // Validate input
    const validationResult = reorderItemsSchema.safeParse(req.body);
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

    const { itemIds } = validationResult.data;

    // Get current items to validate
    const currentItems = await getCurriculumItems(curriculumId);
    const currentItemIds = new Set(currentItems.map((item) => item.id));

    // Validate all provided IDs belong to this curriculum
    const invalidIds = itemIds.filter((id) => !currentItemIds.has(id));
    if (invalidIds.length > 0) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        `Invalid item IDs: ${invalidIds.join(", ")}`,
        400
      );
      return;
    }

    // Check for duplicates
    const uniqueIds = new Set(itemIds);
    if (uniqueIds.size !== itemIds.length) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Duplicate item IDs provided",
        400
      );
      return;
    }

    // Update order in transaction
    await db.$transaction(
      itemIds.map((itemId, index) =>
        db.curriculumItem.update({
          where: { id: itemId },
          data: { orderIndex: index },
        })
      )
    );

    // Invalidate caches
    await Promise.all([
      cache.del(buildItemsCacheKey(curriculumId)),
      cache.del(buildCurriculumCacheKey(curriculumId)),
    ]);

    // Get updated items
    const updatedItems = await getCurriculumItems(curriculumId);

    logger.info("Curriculum items reordered", {
      userId: user.id,
      curriculumId,
      itemCount: itemIds.length,
    });

    sendSuccess(res, {
      items: updatedItems.map(mapToItemResponse),
      total: updatedItems.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error reordering curriculum items", {
      userId: user.id,
      curriculumId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to reorder curriculum items. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
