/**
 * Reading Group Leave API
 *
 * DELETE /api/groups/:id/leave - Leave a reading group
 *   - Removes membership record
 *   - Decrements membersCount on the group
 *   - Owner cannot leave (must transfer ownership or delete group)
 *
 * @example
 * ```bash
 * # Leave a group
 * curl -X DELETE "/api/groups/abc123/leave" \
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
 * Leave group response
 */
export type LeaveGroupResponse = {
  success: boolean;
  message: string;
};

/**
 * Membership info for leave operation
 */
export type MembershipInfo = {
  id: string;
  role: string;
  groupId: string;
  groupName: string;
};

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
 * Check if user is the owner
 */
export function isOwner(role: string): boolean {
  return role === "OWNER";
}

/**
 * Build cache key for group data
 */
export function buildGroupCacheKey(groupId: string): string {
  return `${CacheKeyPrefix.USER}:group:${groupId}`;
}

/**
 * Build cache key for group membership
 */
export function buildMembershipCacheKey(
  groupId: string,
  userId: string
): string {
  return `${CacheKeyPrefix.USER}:${userId}:group-membership:${groupId}`;
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get user's membership in a group
 */
async function getMembership(
  groupId: string,
  userId: string
): Promise<MembershipInfo | null> {
  const membership = await db.readingGroupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
    select: {
      id: true,
      role: true,
      groupId: true,
      group: {
        select: {
          id: true,
          name: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!membership || membership.group.deletedAt !== null) {
    return null;
  }

  return {
    id: membership.id,
    role: membership.role,
    groupId: membership.groupId,
    groupName: membership.group.name,
  };
}

/**
 * Remove membership and decrement member count in transaction
 */
async function removeMembership(membershipId: string, groupId: string) {
  return db.$transaction(async (tx) => {
    // Delete membership
    await tx.readingGroupMember.delete({
      where: { id: membershipId },
    });

    // Decrement members count
    await tx.readingGroup.update({
      where: { id: groupId },
      data: {
        membersCount: { decrement: 1 },
      },
    });
  });
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle DELETE /api/groups/:id/leave
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow DELETE
  if (req.method !== "DELETE") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use DELETE.",
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

  // Validate group ID
  const groupId = validateGroupId(req.query.id);
  if (!groupId) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "Invalid group ID", 400);
    return;
  }

  try {
    // Get membership
    const membership = await getMembership(groupId, user.id);

    if (!membership) {
      sendError(
        res,
        ErrorCodes.NOT_FOUND,
        "You are not a member of this group",
        404
      );
      return;
    }

    // Check if user is owner
    if (isOwner(membership.role)) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Group owners cannot leave. Transfer ownership or delete the group instead.",
        403
      );
      return;
    }

    // Remove membership
    await removeMembership(membership.id, groupId);

    // Invalidate caches
    await Promise.all([
      cache.del(buildGroupCacheKey(groupId)),
      cache.del(buildMembershipCacheKey(groupId, user.id)),
      cache.invalidatePattern(`${CacheKeyPrefix.USER}:${user.id}:groups:*`),
      cache.invalidatePattern(`${CacheKeyPrefix.USER}:*:groups:*`),
    ]);

    // Build response
    const response: LeaveGroupResponse = {
      success: true,
      message: `Successfully left ${membership.groupName}`,
    };

    logger.info("User left group", {
      userId: user.id,
      groupId,
      groupName: membership.groupName,
      previousRole: membership.role,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error leaving group", {
      userId: user.id,
      groupId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to leave group. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
