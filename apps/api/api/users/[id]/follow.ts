/**
 * POST/DELETE /api/users/:id/follow - Follow or unfollow a user
 *
 * POST: Create a follow relationship (current user follows target user)
 * DELETE: Remove a follow relationship (current user unfollows target user)
 *
 * Features:
 * - Prevents duplicate follows (via unique constraint)
 * - Updates follower/following counts on both users
 * - Cannot follow yourself
 * - Uses transactions for data integrity
 *
 * @example
 * ```bash
 * # Follow a user
 * curl -X POST "/api/users/user123/follow" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Unfollow a user
 * curl -X DELETE "/api/users/user123/follow" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";

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
 * Follow relationship data
 */
export type FollowRelationship = {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
};

/**
 * Response for follow action
 */
export type FollowResponse = {
  success: boolean;
  action: "followed" | "unfollowed";
  followerId: string;
  followingId: string;
  followerUsername: string;
  followingUsername: string;
  followerStats: {
    followingCount: number;
  };
  followingStats: {
    followersCount: number;
  };
};

/**
 * Check if user exists result
 */
export type UserExistsResult = {
  exists: boolean;
  user: {
    id: string;
    username: string | null;
  } | null;
};

/**
 * Follow counts update result
 */
export type FollowCountsResult = {
  followerFollowingCount: number;
  followingFollowersCount: number;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a user exists and is not deleted
 */
export async function checkUserExists(
  userId: string
): Promise<UserExistsResult> {
  const user = await db.user.findUnique({
    where: {
      id: userId,
      deletedAt: null,
    },
    select: {
      id: true,
      username: true,
    },
  });

  return {
    exists: user !== null,
    user,
  };
}

/**
 * Check if a follow relationship already exists
 */
export async function checkFollowExists(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const follow = await db.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
  });

  return follow !== null;
}

/**
 * Create a follow relationship and update counts
 * Uses a transaction for data integrity
 */
export async function createFollow(
  followerId: string,
  followingId: string
): Promise<FollowCountsResult> {
  // Use transaction to ensure atomic operation
  const result = await db.$transaction(async (tx) => {
    // Create follow relationship
    await tx.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    // Update follower's following count
    const followerStats = await tx.userStats.update({
      where: { userId: followerId },
      data: {
        followingCount: { increment: 1 },
      },
      select: { followingCount: true },
    });

    // Update following's followers count
    const followingStats = await tx.userStats.update({
      where: { userId: followingId },
      data: {
        followersCount: { increment: 1 },
      },
      select: { followersCount: true },
    });

    return {
      followerFollowingCount: followerStats.followingCount,
      followingFollowersCount: followingStats.followersCount,
    };
  });

  return result;
}

/**
 * Delete a follow relationship and update counts
 * Uses a transaction for data integrity
 */
export async function deleteFollow(
  followerId: string,
  followingId: string
): Promise<FollowCountsResult> {
  // Use transaction to ensure atomic operation
  const result = await db.$transaction(async (tx) => {
    // Delete follow relationship
    await tx.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    // Update follower's following count (decrement, but not below 0)
    const followerStats = await tx.userStats.update({
      where: { userId: followerId },
      data: {
        followingCount: { decrement: 1 },
      },
      select: { followingCount: true },
    });

    // Ensure count doesn't go below 0
    if (followerStats.followingCount < 0) {
      await tx.userStats.update({
        where: { userId: followerId },
        data: { followingCount: 0 },
      });
      followerStats.followingCount = 0;
    }

    // Update following's followers count (decrement, but not below 0)
    const followingStats = await tx.userStats.update({
      where: { userId: followingId },
      data: {
        followersCount: { decrement: 1 },
      },
      select: { followersCount: true },
    });

    // Ensure count doesn't go below 0
    if (followingStats.followersCount < 0) {
      await tx.userStats.update({
        where: { userId: followingId },
        data: { followersCount: 0 },
      });
      followingStats.followersCount = 0;
    }

    return {
      followerFollowingCount: Math.max(0, followerStats.followingCount),
      followingFollowersCount: Math.max(0, followingStats.followersCount),
    };
  });

  return result;
}

/**
 * Build cache key for user profile
 * Used to invalidate profile cache when follow status changes
 */
export function buildProfileCachePattern(username: string): string {
  return `${CacheKeyPrefix.USER}:profile:${username.toLowerCase()}:*`;
}

/**
 * Invalidate profile caches for both users involved in follow/unfollow
 */
export async function invalidateProfileCaches(
  followerUsername: string | null,
  followingUsername: string | null
): Promise<void> {
  const patterns: string[] = [];

  if (followerUsername) {
    patterns.push(buildProfileCachePattern(followerUsername));
  }

  if (followingUsername) {
    patterns.push(buildProfileCachePattern(followingUsername));
  }

  // Delete all matching cache keys
  for (const pattern of patterns) {
    await cache.invalidatePattern(pattern);
  }
}

/**
 * Validate that the user ID is not empty
 */
export function validateUserId(id: unknown): id is string {
  return typeof id === "string" && id.trim().length > 0;
}

/**
 * Check if trying to follow self
 */
export function isSelfFollow(followerId: string, followingId: string): boolean {
  return followerId === followingId;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle POST/DELETE /api/users/:id/follow
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
  const targetUserId = req.query.id;

  // Validate target user ID
  if (!validateUserId(targetUserId)) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "User ID is required", 400);
    return;
  }

  try {
    // Get current user
    const currentUser = await getUserByClerkId(clerkUserId);
    if (!currentUser) {
      sendError(res, ErrorCodes.NOT_FOUND, "Current user not found", 404);
      return;
    }

    // Check if trying to follow self
    if (isSelfFollow(currentUser.id, targetUserId)) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "You cannot follow yourself",
        400
      );
      return;
    }

    // Check if target user exists
    const targetResult = await checkUserExists(targetUserId);
    if (!targetResult.exists || !targetResult.user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    const targetUser = targetResult.user;

    if (req.method === "POST") {
      // Check if already following
      const alreadyFollowing = await checkFollowExists(
        currentUser.id,
        targetUserId
      );
      if (alreadyFollowing) {
        sendError(
          res,
          ErrorCodes.VALIDATION_ERROR,
          "You are already following this user",
          409
        );
        return;
      }

      // Create follow relationship
      const counts = await createFollow(currentUser.id, targetUserId);

      // Invalidate profile caches
      await invalidateProfileCaches(currentUser.username, targetUser.username);

      const response: FollowResponse = {
        success: true,
        action: "followed",
        followerId: currentUser.id,
        followingId: targetUserId,
        followerUsername: currentUser.username ?? "anonymous",
        followingUsername: targetUser.username ?? "anonymous",
        followerStats: {
          followingCount: counts.followerFollowingCount,
        },
        followingStats: {
          followersCount: counts.followingFollowersCount,
        },
      };

      logger.info("User followed", {
        followerId: currentUser.id,
        followingId: targetUserId,
        followerUsername: currentUser.username,
        followingUsername: targetUser.username,
      });

      sendSuccess(res, response, 201);
    } else {
      // DELETE - unfollow
      // Check if following
      const isFollowing = await checkFollowExists(currentUser.id, targetUserId);
      if (!isFollowing) {
        sendError(
          res,
          ErrorCodes.VALIDATION_ERROR,
          "You are not following this user",
          404
        );
        return;
      }

      // Delete follow relationship
      const counts = await deleteFollow(currentUser.id, targetUserId);

      // Invalidate profile caches
      await invalidateProfileCaches(currentUser.username, targetUser.username);

      const response: FollowResponse = {
        success: true,
        action: "unfollowed",
        followerId: currentUser.id,
        followingId: targetUserId,
        followerUsername: currentUser.username ?? "anonymous",
        followingUsername: targetUser.username ?? "anonymous",
        followerStats: {
          followingCount: counts.followerFollowingCount,
        },
        followingStats: {
          followersCount: counts.followingFollowersCount,
        },
      };

      logger.info("User unfollowed", {
        followerId: currentUser.id,
        followingId: targetUserId,
        followerUsername: currentUser.username,
        followingUsername: targetUser.username,
      });

      sendSuccess(res, response);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Handle Prisma unique constraint violation (duplicate follow)
    if (message.includes("Unique constraint") || message.includes("P2002")) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "You are already following this user",
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
        "You are not following this user",
        404
      );
      return;
    }

    logger.error("Error handling follow request", {
      userId: clerkUserId,
      targetUserId,
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

export default withAuth(handler);
