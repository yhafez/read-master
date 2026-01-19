/**
 * Curriculum Follow API - Follow/Unfollow curriculum
 *
 * POST /api/curriculums/:id/follow - Follow a curriculum
 *   - Creates CurriculumFollow record
 *   - Increments followersCount on curriculum
 *   - Initializes progress tracking (currentItemIndex = 0)
 *
 * DELETE /api/curriculums/:id/follow - Unfollow a curriculum
 *   - Removes CurriculumFollow record
 *   - Decrements followersCount on curriculum
 *
 * @example
 * ```bash
 * # Follow a curriculum
 * curl -X POST "/api/curriculums/abc123/follow" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Unfollow a curriculum
 * curl -X DELETE "/api/curriculums/abc123/follow" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";
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
// Types
// ============================================================================

/**
 * Response for follow action
 */
export type CurriculumFollowResponse = {
  success: boolean;
  action: "followed" | "unfollowed";
  curriculumId: string;
  curriculumTitle: string;
  userId: string;
  isFollowing: boolean;
  followersCount: number;
  progress?: CurriculumProgressInfo;
};

/**
 * Progress info returned with follow response
 */
export type CurriculumProgressInfo = {
  currentItemIndex: number;
  completedItems: number;
  totalItems: number;
  percentComplete: number;
  startedAt: string;
  completedAt: string | null;
};

/**
 * Curriculum basic info for follow operations
 */
export type CurriculumBasicInfo = {
  id: string;
  title: string;
  userId: string;
  visibility: Visibility;
  totalItems: number;
  followersCount: number;
  deletedAt: Date | null;
};

/**
 * Follow existence check result
 */
export type FollowExistsResult = {
  exists: boolean;
  follow: {
    id: string;
    currentItemIndex: number;
    completedItems: number;
    startedAt: Date;
    completedAt: Date | null;
  } | null;
};

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
 * Calculate percentage completion
 */
export function calculatePercentComplete(
  completedItems: number,
  totalItems: number
): number {
  if (totalItems <= 0) return 0;
  return Math.round((completedItems / totalItems) * 100);
}

/**
 * Check if user can follow curriculum (not owner, has visibility access)
 */
export function canFollowCurriculum(
  curriculum: CurriculumBasicInfo,
  userId: string
): { canFollow: boolean; reason?: string } {
  // Cannot follow your own curriculum
  if (curriculum.userId === userId) {
    return {
      canFollow: false,
      reason: "You cannot follow your own curriculum",
    };
  }

  // Cannot follow deleted curriculum
  if (curriculum.deletedAt) {
    return { canFollow: false, reason: "Curriculum not found" };
  }

  // Private curriculums cannot be followed directly (would need invitation)
  if (curriculum.visibility === "PRIVATE") {
    return { canFollow: false, reason: "This curriculum is private" };
  }

  return { canFollow: true };
}

/**
 * Check if curriculum exists
 */
export async function getCurriculumBasicInfo(
  curriculumId: string
): Promise<CurriculumBasicInfo | null> {
  return db.curriculum.findFirst({
    where: {
      id: curriculumId,
    },
    select: {
      id: true,
      title: true,
      userId: true,
      visibility: true,
      totalItems: true,
      followersCount: true,
      deletedAt: true,
    },
  });
}

/**
 * Check if follow relationship exists
 */
export async function checkFollowExists(
  userId: string,
  curriculumId: string
): Promise<FollowExistsResult> {
  const follow = await db.curriculumFollow.findUnique({
    where: {
      userId_curriculumId: {
        userId,
        curriculumId,
      },
    },
    select: {
      id: true,
      currentItemIndex: true,
      completedItems: true,
      startedAt: true,
      completedAt: true,
    },
  });

  return {
    exists: follow !== null,
    follow,
  };
}

/**
 * Create follow relationship and update curriculum followers count
 */
export async function createCurriculumFollow(
  userId: string,
  curriculumId: string
): Promise<{ follow: FollowExistsResult["follow"]; followersCount: number }> {
  const result = await db.$transaction(async (tx) => {
    // Create follow record
    const follow = await tx.curriculumFollow.create({
      data: {
        userId,
        curriculumId,
        currentItemIndex: 0,
        completedItems: 0,
        startedAt: new Date(),
      },
      select: {
        id: true,
        currentItemIndex: true,
        completedItems: true,
        startedAt: true,
        completedAt: true,
      },
    });

    // Increment followers count
    const curriculum = await tx.curriculum.update({
      where: { id: curriculumId },
      data: { followersCount: { increment: 1 } },
      select: { followersCount: true },
    });

    return { follow, followersCount: curriculum.followersCount };
  });

  return result;
}

/**
 * Delete follow relationship and update curriculum followers count
 */
export async function deleteCurriculumFollow(
  userId: string,
  curriculumId: string
): Promise<{ followersCount: number }> {
  const result = await db.$transaction(async (tx) => {
    // Delete follow record
    await tx.curriculumFollow.delete({
      where: {
        userId_curriculumId: {
          userId,
          curriculumId,
        },
      },
    });

    // Decrement followers count (but not below 0)
    const curriculum = await tx.curriculum.update({
      where: { id: curriculumId },
      data: { followersCount: { decrement: 1 } },
      select: { followersCount: true },
    });

    // Ensure count doesn't go below 0
    if (curriculum.followersCount < 0) {
      const fixed = await tx.curriculum.update({
        where: { id: curriculumId },
        data: { followersCount: 0 },
        select: { followersCount: true },
      });
      return { followersCount: fixed.followersCount };
    }

    return { followersCount: Math.max(0, curriculum.followersCount) };
  });

  return result;
}

/**
 * Build cache key for curriculum detail
 */
export function buildCurriculumCacheKey(curriculumId: string): string {
  return `${CacheKeyPrefix.USER}:curriculum:${curriculumId}`;
}

/**
 * Build cache key pattern for browse cache
 */
export function buildBrowseCachePattern(): string {
  return `${CacheKeyPrefix.USER}:curriculums:browse:*`;
}

/**
 * Invalidate curriculum-related caches
 */
export async function invalidateCurriculumCaches(
  curriculumId: string
): Promise<void> {
  await Promise.all([
    cache.del(buildCurriculumCacheKey(curriculumId)),
    cache.invalidatePattern(buildBrowseCachePattern()),
    cache.invalidatePattern(`${CacheKeyPrefix.USER}:*:curriculums:*`),
  ]);
}

/**
 * Build progress info from follow record
 */
export function buildProgressInfo(
  follow: FollowExistsResult["follow"],
  totalItems: number
): CurriculumProgressInfo | undefined {
  if (!follow) return undefined;

  return {
    currentItemIndex: follow.currentItemIndex,
    completedItems: follow.completedItems,
    totalItems,
    percentComplete: calculatePercentComplete(
      follow.completedItems,
      totalItems
    ),
    startedAt: formatDate(follow.startedAt),
    completedAt: follow.completedAt ? formatDate(follow.completedAt) : null,
  };
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle POST/DELETE /api/curriculums/:id/follow
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST and DELETE
  if (req.method !== "POST" && req.method !== "DELETE") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use POST to follow or DELETE to unfollow.",
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
    // Get curriculum
    const curriculum = await getCurriculumBasicInfo(curriculumId);
    if (!curriculum || curriculum.deletedAt) {
      sendError(res, ErrorCodes.NOT_FOUND, "Curriculum not found", 404);
      return;
    }

    if (req.method === "POST") {
      await handleFollow(res, user, curriculum);
    } else {
      await handleUnfollow(res, user, curriculum);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Handle Prisma unique constraint violation (duplicate follow)
    if (message.includes("Unique constraint") || message.includes("P2002")) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "You are already following this curriculum",
        409
      );
      return;
    }

    // Handle Prisma record not found (trying to delete non-existent follow)
    if (
      message.includes("Record to delete does not exist") ||
      message.includes("P2025")
    ) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "You are not following this curriculum",
        404
      );
      return;
    }

    logger.error("Error handling curriculum follow request", {
      userId: user.id,
      curriculumId,
      method: req.method,
      error: message,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to process follow request. Please try again.",
      500
    );
  }
}

/**
 * Handle POST - Follow curriculum
 */
async function handleFollow(
  res: VercelResponse,
  user: { id: string },
  curriculum: CurriculumBasicInfo
): Promise<void> {
  // Check if user can follow
  const followCheck = canFollowCurriculum(curriculum, user.id);
  if (!followCheck.canFollow) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      followCheck.reason ?? "Cannot follow this curriculum",
      400
    );
    return;
  }

  // Check if already following
  const existingFollow = await checkFollowExists(user.id, curriculum.id);
  if (existingFollow.exists) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "You are already following this curriculum",
      409
    );
    return;
  }

  // Create follow
  const result = await createCurriculumFollow(user.id, curriculum.id);

  // Invalidate caches
  await invalidateCurriculumCaches(curriculum.id);

  // Build progress info
  const progressInfo = buildProgressInfo(result.follow, curriculum.totalItems);

  const response: CurriculumFollowResponse = {
    success: true,
    action: "followed",
    curriculumId: curriculum.id,
    curriculumTitle: curriculum.title,
    userId: user.id,
    isFollowing: true,
    followersCount: result.followersCount,
    ...(progressInfo && { progress: progressInfo }),
  };

  logger.info("Curriculum followed", {
    userId: user.id,
    curriculumId: curriculum.id,
    curriculumTitle: curriculum.title,
    followersCount: result.followersCount,
  });

  sendSuccess(res, response, 201);
}

/**
 * Handle DELETE - Unfollow curriculum
 */
async function handleUnfollow(
  res: VercelResponse,
  user: { id: string },
  curriculum: CurriculumBasicInfo
): Promise<void> {
  // Check if following
  const existingFollow = await checkFollowExists(user.id, curriculum.id);
  if (!existingFollow.exists) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "You are not following this curriculum",
      404
    );
    return;
  }

  // Delete follow
  const result = await deleteCurriculumFollow(user.id, curriculum.id);

  // Invalidate caches
  await invalidateCurriculumCaches(curriculum.id);

  const response: CurriculumFollowResponse = {
    success: true,
    action: "unfollowed",
    curriculumId: curriculum.id,
    curriculumTitle: curriculum.title,
    userId: user.id,
    isFollowing: false,
    followersCount: result.followersCount,
  };

  logger.info("Curriculum unfollowed", {
    userId: user.id,
    curriculumId: curriculum.id,
    curriculumTitle: curriculum.title,
    followersCount: result.followersCount,
  });

  sendSuccess(res, response);
}

export default withAuth(handler);
