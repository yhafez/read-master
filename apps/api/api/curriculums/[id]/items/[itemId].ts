/**
 * Curriculum Item API - Update, Delete
 *
 * PUT /api/curriculums/:id/items/:itemId - Update item
 *   - Only owner can update
 *   - Updates item metadata
 *
 * DELETE /api/curriculums/:id/items/:itemId - Remove item
 *   - Only owner can delete
 *   - Reorders remaining items
 *   - Updates curriculum totalItems
 *
 * @example
 * ```bash
 * # Update item
 * curl -X PUT "/api/curriculums/abc123/items/item456" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"notes":"Updated notes","isOptional":true}'
 *
 * # Delete item
 * curl -X DELETE "/api/curriculums/abc123/items/item456" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../../../src/middleware/auth.js";
import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../../../src/utils/response.js";
import { logger } from "../../../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../../../src/services/db.js";
import { cache, CacheKeyPrefix } from "../../../../src/services/redis.js";

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
 * Update item input
 */
export type UpdateItemInput = {
  bookId?: string | null;
  externalTitle?: string | null;
  externalAuthor?: string | null;
  externalUrl?: string | null;
  externalIsbn?: string | null;
  notes?: string | null;
  estimatedTime?: number | null;
  isOptional?: boolean;
};

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for updating an item
 */
export const updateItemSchema = z
  .object({
    bookId: z.string().min(1, "Book ID cannot be empty").optional().nullable(),
    externalTitle: z
      .string()
      .min(1, "External title cannot be empty")
      .max(
        MAX_EXTERNAL_TITLE_LENGTH,
        `External title must be at most ${MAX_EXTERNAL_TITLE_LENGTH} characters`
      )
      .optional()
      .nullable(),
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
      // At least one field must be provided
      const hasValue = Object.values(data).some((v) => v !== undefined);
      return hasValue;
    },
    {
      message: "At least one field must be provided for update",
      path: [],
    }
  );

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
 * Validate item ID format
 */
export function validateItemId(id: unknown): string | null {
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
 * Get curriculum with item for access checking
 */
async function getCurriculumWithItem(curriculumId: string, itemId: string) {
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
      items: {
        where: { id: itemId },
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
      },
    },
  });
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle PUT, DELETE /api/curriculums/:id/items/:itemId
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

  // Validate item ID
  const itemId = validateItemId(req.query.itemId);
  if (!itemId) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "Invalid item ID", 400);
    return;
  }

  if (req.method === "PUT") {
    await handleUpdateItem(req, res, user, curriculumId, itemId);
  } else if (req.method === "DELETE") {
    await handleDeleteItem(res, user, curriculumId, itemId);
  } else {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use PUT or DELETE.",
      405
    );
  }
}

/**
 * Handle PUT /api/curriculums/:id/items/:itemId
 */
async function handleUpdateItem(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string },
  curriculumId: string,
  itemId: string
): Promise<void> {
  try {
    // Get curriculum with item
    const curriculum = await getCurriculumWithItem(curriculumId, itemId);

    if (!curriculum) {
      sendError(res, ErrorCodes.NOT_FOUND, "Curriculum not found", 404);
      return;
    }

    // Check owner permission
    if (!isOwner(curriculum.userId, user.id)) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Only the owner can update items in the curriculum",
        403
      );
      return;
    }

    // Check item exists
    if (curriculum.items.length === 0) {
      sendError(res, ErrorCodes.NOT_FOUND, "Item not found in curriculum", 404);
      return;
    }

    // Validate input
    const validationResult = updateItemSchema.safeParse(req.body);
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

    // If bookId provided and not null, verify book exists
    if (input.bookId !== undefined && input.bookId !== null) {
      const book = await db.book.findFirst({
        where: { id: input.bookId, deletedAt: null },
        select: { id: true },
      });
      if (!book) {
        sendError(res, ErrorCodes.NOT_FOUND, "Book not found", 404);
        return;
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (input.bookId !== undefined) {
      updateData.bookId = input.bookId;
      // Clear external fields if setting bookId
      if (input.bookId !== null) {
        updateData.externalTitle = null;
        updateData.externalAuthor = null;
        updateData.externalUrl = null;
        updateData.externalIsbn = null;
      }
    }
    if (input.externalTitle !== undefined) {
      updateData.externalTitle = input.externalTitle;
      // Clear bookId if setting external title
      if (input.externalTitle !== null) {
        updateData.bookId = null;
      }
    }
    if (input.externalAuthor !== undefined) {
      updateData.externalAuthor = input.externalAuthor;
    }
    if (input.externalUrl !== undefined) {
      updateData.externalUrl = input.externalUrl;
    }
    if (input.externalIsbn !== undefined) {
      updateData.externalIsbn = input.externalIsbn;
    }
    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }
    if (input.estimatedTime !== undefined) {
      updateData.estimatedTime = input.estimatedTime;
    }
    if (input.isOptional !== undefined) {
      updateData.isOptional = input.isOptional;
    }

    // Update item
    const updatedItem = await db.curriculumItem.update({
      where: { id: itemId },
      data: updateData,
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

    // Invalidate caches
    await Promise.all([
      cache.del(buildItemsCacheKey(curriculumId)),
      cache.del(buildCurriculumCacheKey(curriculumId)),
    ]);

    logger.info("Curriculum item updated", {
      userId: user.id,
      curriculumId,
      itemId,
      updatedFields: Object.keys(updateData),
    });

    sendSuccess(res, mapToItemResponse(updatedItem));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error updating curriculum item", {
      userId: user.id,
      curriculumId,
      itemId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to update curriculum item. Please try again.",
      500
    );
  }
}

/**
 * Handle DELETE /api/curriculums/:id/items/:itemId
 */
async function handleDeleteItem(
  res: VercelResponse,
  user: { id: string },
  curriculumId: string,
  itemId: string
): Promise<void> {
  try {
    // Get curriculum with item
    const curriculum = await getCurriculumWithItem(curriculumId, itemId);

    if (!curriculum) {
      sendError(res, ErrorCodes.NOT_FOUND, "Curriculum not found", 404);
      return;
    }

    // Check owner permission
    if (!isOwner(curriculum.userId, user.id)) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Only the owner can delete items from the curriculum",
        403
      );
      return;
    }

    // Check item exists
    const item = curriculum.items[0];
    if (!item) {
      sendError(res, ErrorCodes.NOT_FOUND, "Item not found in curriculum", 404);
      return;
    }

    // Save order index before deletion for reordering
    const deletedOrderIndex = item.orderIndex;

    // Delete item and reorder remaining items in transaction
    await db.$transaction(async (tx) => {
      // Delete the item
      await tx.curriculumItem.delete({
        where: { id: itemId },
      });

      // Reorder remaining items
      await tx.curriculumItem.updateMany({
        where: {
          curriculumId,
          orderIndex: { gt: deletedOrderIndex },
        },
        data: {
          orderIndex: { decrement: 1 },
        },
      });

      // Update curriculum totalItems
      await tx.curriculum.update({
        where: { id: curriculumId },
        data: { totalItems: { decrement: 1 } },
      });
    });

    // Invalidate caches
    await Promise.all([
      cache.del(buildItemsCacheKey(curriculumId)),
      cache.del(buildCurriculumCacheKey(curriculumId)),
      cache.invalidatePattern(`${CacheKeyPrefix.USER}:*:curriculums:*`),
    ]);

    logger.info("Curriculum item deleted", {
      userId: user.id,
      curriculumId,
      itemId,
      orderIndex: deletedOrderIndex,
    });

    sendSuccess(res, { message: "Item deleted successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error deleting curriculum item", {
      userId: user.id,
      curriculumId,
      itemId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to delete curriculum item. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
