/**
 * Curriculum Progress API - Track progress through curriculum
 *
 * GET /api/curriculums/:id/progress - Get user's progress for curriculum
 *   - Returns current progress (currentItemIndex, completedItems, percentComplete)
 *   - Requires user to be following the curriculum
 *
 * PUT /api/curriculums/:id/progress - Update progress through curriculum
 *   - Updates currentItemIndex and/or completedItems
 *   - Marks completedAt when all items completed
 *   - Requires user to be following the curriculum
 *
 * @example
 * ```bash
 * # Get progress
 * curl -X GET "/api/curriculums/abc123/progress" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Update progress
 * curl -X PUT "/api/curriculums/abc123/progress" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"currentItemIndex": 3, "completedItems": 2}'
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";

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
 * Minimum valid item index
 */
export const MIN_ITEM_INDEX = 0;

/**
 * Maximum valid item index (practical limit)
 */
export const MAX_ITEM_INDEX = 10000;

/**
 * Minimum completed items count
 */
export const MIN_COMPLETED_ITEMS = 0;

/**
 * Maximum completed items count (practical limit)
 */
export const MAX_COMPLETED_ITEMS = 10000;

// ============================================================================
// Types
// ============================================================================

/**
 * Progress response data
 */
export type CurriculumProgressResponse = {
  curriculumId: string;
  curriculumTitle: string;
  userId: string;
  currentItemIndex: number;
  completedItems: number;
  totalItems: number;
  percentComplete: number;
  startedAt: string;
  lastProgressAt: string | null;
  completedAt: string | null;
  isComplete: boolean;
};

/**
 * Update progress input
 */
export type UpdateProgressInput = {
  currentItemIndex?: number;
  completedItems?: number;
};

/**
 * Follow record with curriculum info
 */
export type FollowWithCurriculum = {
  id: string;
  userId: string;
  curriculumId: string;
  currentItemIndex: number;
  completedItems: number;
  startedAt: Date;
  lastProgressAt: Date | null;
  completedAt: Date | null;
  curriculum: {
    id: string;
    title: string;
    totalItems: number;
    deletedAt: Date | null;
  };
};

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for updating progress
 */
export const updateProgressSchema = z
  .object({
    currentItemIndex: z
      .number()
      .int("Item index must be an integer")
      .min(MIN_ITEM_INDEX, `Item index must be at least ${MIN_ITEM_INDEX}`)
      .max(MAX_ITEM_INDEX, `Item index must be at most ${MAX_ITEM_INDEX}`)
      .optional(),
    completedItems: z
      .number()
      .int("Completed items must be an integer")
      .min(
        MIN_COMPLETED_ITEMS,
        `Completed items must be at least ${MIN_COMPLETED_ITEMS}`
      )
      .max(
        MAX_COMPLETED_ITEMS,
        `Completed items must be at most ${MAX_COMPLETED_ITEMS}`
      )
      .optional(),
  })
  .refine(
    (data) =>
      data.currentItemIndex !== undefined || data.completedItems !== undefined,
    {
      message:
        "At least one of currentItemIndex or completedItems must be provided",
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
 * Format date as ISO string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Format optional date as ISO string or null
 */
export function formatOptionalDate(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

/**
 * Calculate percentage completion
 */
export function calculatePercentComplete(
  completedItems: number,
  totalItems: number
): number {
  if (totalItems <= 0) return 0;
  const percent = Math.round((completedItems / totalItems) * 100);
  return Math.min(100, Math.max(0, percent));
}

/**
 * Check if curriculum is complete
 */
export function isComplete(
  completedItems: number,
  totalItems: number
): boolean {
  return totalItems > 0 && completedItems >= totalItems;
}

/**
 * Validate item index against total items
 */
export function validateItemIndex(
  itemIndex: number,
  totalItems: number
): { valid: boolean; reason?: string } {
  if (itemIndex < 0) {
    return { valid: false, reason: "Item index cannot be negative" };
  }
  // Allow index to equal totalItems (pointing to end)
  if (itemIndex > totalItems) {
    return {
      valid: false,
      reason: `Item index ${itemIndex} exceeds curriculum size (${totalItems} items)`,
    };
  }
  return { valid: true };
}

/**
 * Validate completed items count against total items
 */
export function validateCompletedItems(
  completedItems: number,
  totalItems: number
): { valid: boolean; reason?: string } {
  if (completedItems < 0) {
    return { valid: false, reason: "Completed items cannot be negative" };
  }
  if (completedItems > totalItems) {
    return {
      valid: false,
      reason: `Completed items (${completedItems}) cannot exceed total items (${totalItems})`,
    };
  }
  return { valid: true };
}

/**
 * Get user's follow record with curriculum info
 */
export async function getFollowWithCurriculum(
  userId: string,
  curriculumId: string
): Promise<FollowWithCurriculum | null> {
  return db.curriculumFollow.findUnique({
    where: {
      userId_curriculumId: {
        userId,
        curriculumId,
      },
    },
    include: {
      curriculum: {
        select: {
          id: true,
          title: true,
          totalItems: true,
          deletedAt: true,
        },
      },
    },
  });
}

/**
 * Build progress response from follow record
 */
export function buildProgressResponse(
  follow: FollowWithCurriculum
): CurriculumProgressResponse {
  const totalItems = follow.curriculum.totalItems;
  const completedItems = follow.completedItems;

  return {
    curriculumId: follow.curriculumId,
    curriculumTitle: follow.curriculum.title,
    userId: follow.userId,
    currentItemIndex: follow.currentItemIndex,
    completedItems,
    totalItems,
    percentComplete: calculatePercentComplete(completedItems, totalItems),
    startedAt: formatDate(follow.startedAt),
    lastProgressAt: formatOptionalDate(follow.lastProgressAt),
    completedAt: formatOptionalDate(follow.completedAt),
    isComplete: isComplete(completedItems, totalItems),
  };
}

/**
 * Build cache key for curriculum detail
 */
export function buildCurriculumCacheKey(curriculumId: string): string {
  return `${CacheKeyPrefix.USER}:curriculum:${curriculumId}`;
}

/**
 * Invalidate curriculum caches
 */
export async function invalidateCurriculumCaches(
  curriculumId: string
): Promise<void> {
  await Promise.all([
    cache.del(buildCurriculumCacheKey(curriculumId)),
    cache.invalidatePattern(`${CacheKeyPrefix.USER}:*:curriculums:*`),
  ]);
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET/PUT /api/curriculums/:id/progress
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
      "Method not allowed. Use GET to fetch progress or PUT to update.",
      405
    );
    return;
  }

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

  try {
    // Get follow record with curriculum info
    const follow = await getFollowWithCurriculum(user.id, curriculumId);

    if (!follow) {
      sendError(
        res,
        ErrorCodes.NOT_FOUND,
        "You are not following this curriculum",
        404
      );
      return;
    }

    // Check if curriculum is deleted
    if (follow.curriculum.deletedAt) {
      sendError(res, ErrorCodes.NOT_FOUND, "Curriculum not found", 404);
      return;
    }

    if (req.method === "GET") {
      await handleGetProgress(res, follow);
    } else {
      await handleUpdateProgress(req, res, user, follow);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error handling curriculum progress request", {
      userId: user.id,
      curriculumId,
      method: req.method,
      error: message,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to process progress request. Please try again.",
      500
    );
  }
}

/**
 * Handle GET - Fetch progress
 */
async function handleGetProgress(
  res: VercelResponse,
  follow: FollowWithCurriculum
): Promise<void> {
  const response = buildProgressResponse(follow);

  logger.info("Curriculum progress fetched", {
    userId: follow.userId,
    curriculumId: follow.curriculumId,
    currentItemIndex: follow.currentItemIndex,
    completedItems: follow.completedItems,
    percentComplete: response.percentComplete,
  });

  sendSuccess(res, response);
}

/**
 * Handle PUT - Update progress
 */
async function handleUpdateProgress(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string },
  follow: FollowWithCurriculum
): Promise<void> {
  // Validate input
  const validationResult = updateProgressSchema.safeParse(req.body);
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
  const totalItems = follow.curriculum.totalItems;

  // Validate currentItemIndex if provided
  if (input.currentItemIndex !== undefined) {
    const indexValidation = validateItemIndex(
      input.currentItemIndex,
      totalItems
    );
    if (!indexValidation.valid) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        indexValidation.reason ?? "Invalid item index",
        400
      );
      return;
    }
  }

  // Validate completedItems if provided
  if (input.completedItems !== undefined) {
    const completedValidation = validateCompletedItems(
      input.completedItems,
      totalItems
    );
    if (!completedValidation.valid) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        completedValidation.reason ?? "Invalid completed items count",
        400
      );
      return;
    }
  }

  // Build update data
  const updateData: {
    currentItemIndex?: number;
    completedItems?: number;
    lastProgressAt: Date;
    completedAt?: Date | null;
  } = {
    lastProgressAt: new Date(),
  };

  if (input.currentItemIndex !== undefined) {
    updateData.currentItemIndex = input.currentItemIndex;
  }

  const newCompletedItems = input.completedItems ?? follow.completedItems;
  if (input.completedItems !== undefined) {
    updateData.completedItems = input.completedItems;
  }

  // Check if completing curriculum
  const wasComplete = isComplete(follow.completedItems, totalItems);
  const willBeComplete = isComplete(newCompletedItems, totalItems);

  if (!wasComplete && willBeComplete) {
    // Mark as completed
    updateData.completedAt = new Date();
  } else if (wasComplete && !willBeComplete) {
    // Un-complete (user reduced completedItems)
    updateData.completedAt = null;
  }

  // Update progress
  const updatedFollow = await db.curriculumFollow.update({
    where: {
      userId_curriculumId: {
        userId: user.id,
        curriculumId: follow.curriculumId,
      },
    },
    data: updateData,
    include: {
      curriculum: {
        select: {
          id: true,
          title: true,
          totalItems: true,
          deletedAt: true,
        },
      },
    },
  });

  // Invalidate caches
  await invalidateCurriculumCaches(follow.curriculumId);

  const response = buildProgressResponse(updatedFollow);

  logger.info("Curriculum progress updated", {
    userId: user.id,
    curriculumId: follow.curriculumId,
    oldIndex: follow.currentItemIndex,
    newIndex: updatedFollow.currentItemIndex,
    oldCompleted: follow.completedItems,
    newCompleted: updatedFollow.completedItems,
    percentComplete: response.percentComplete,
    isComplete: response.isComplete,
    justCompleted: !wasComplete && willBeComplete,
  });

  sendSuccess(res, response);
}

export default withAuth(handler);
