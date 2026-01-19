/**
 * Reading Group Join API
 *
 * POST /api/groups/:id/join - Join a reading group
 *   - Public groups: Anyone can join
 *   - Private groups: Requires valid invite code
 *   - Creates membership record with MEMBER role
 *   - Increments membersCount on the group
 *
 * @example
 * ```bash
 * # Join public group
 * curl -X POST "/api/groups/abc123/join" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Join private group with invite code
 * curl -X POST "/api/groups/abc123/join" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"inviteCode":"ABC12345"}'
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
 * Length of invite codes
 */
export const INVITE_CODE_LENGTH = 8;

// ============================================================================
// Types
// ============================================================================

/**
 * Join group request body
 */
export type JoinGroupInput = {
  inviteCode?: string | null;
};

/**
 * User info in join response
 */
export type JoinUserInfo = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Join group response
 */
export type JoinGroupResponse = {
  success: boolean;
  message: string;
  membership: {
    groupId: string;
    groupName: string;
    role: string;
    joinedAt: string;
  };
};

/**
 * Group membership check result
 */
export type MembershipCheckResult = {
  exists: boolean;
  role: string | null;
};

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for join group request body
 */
export const joinGroupSchema = z.object({
  inviteCode: z
    .string()
    .length(
      INVITE_CODE_LENGTH,
      `Invite code must be ${INVITE_CODE_LENGTH} characters`
    )
    .regex(/^[A-Z0-9]+$/, "Invite code must be uppercase alphanumeric")
    .optional()
    .nullable(),
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
 * Validate invite code format
 */
export function isValidInviteCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return /^[A-Z0-9]{8}$/.test(code);
}

/**
 * Check if invite code matches group's invite code
 */
export function isInviteCodeMatch(
  groupInviteCode: string | null,
  providedCode: string | null | undefined
): boolean {
  if (!groupInviteCode || !providedCode) return false;
  return groupInviteCode.toUpperCase() === providedCode.toUpperCase();
}

/**
 * Check if group has space for more members
 */
export function hasCapacity(
  membersCount: number,
  maxMembers: number | null
): boolean {
  if (maxMembers === null) return true; // Unlimited
  return membersCount < maxMembers;
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

/**
 * Build cache key for group data
 */
export function buildGroupCacheKey(groupId: string): string {
  return `${CacheKeyPrefix.USER}:group:${groupId}`;
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get group for joining
 */
async function getGroupForJoin(groupId: string) {
  return db.readingGroup.findFirst({
    where: {
      id: groupId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      isPublic: true,
      inviteCode: true,
      maxMembers: true,
      membersCount: true,
      userId: true, // Owner ID
    },
  });
}

/**
 * Check if user is already a member
 */
async function checkExistingMembership(
  groupId: string,
  userId: string
): Promise<MembershipCheckResult> {
  const membership = await db.readingGroupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
    select: {
      role: true,
    },
  });

  return {
    exists: membership !== null,
    role: membership?.role ?? null,
  };
}

/**
 * Create membership and increment member count in transaction
 */
async function createMembership(groupId: string, userId: string) {
  return db.$transaction(async (tx) => {
    // Create membership
    const membership = await tx.readingGroupMember.create({
      data: {
        groupId,
        userId,
        role: "MEMBER",
      },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Increment members count
    await tx.readingGroup.update({
      where: { id: groupId },
      data: {
        membersCount: { increment: 1 },
      },
    });

    return membership;
  });
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle POST /api/groups/:id/join
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== "POST") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use POST.",
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

  // Parse and validate request body
  const validationResult = joinGroupSchema.safeParse(req.body ?? {});
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

  try {
    // Get group
    const group = await getGroupForJoin(groupId);

    if (!group) {
      sendError(res, ErrorCodes.NOT_FOUND, "Group not found", 404);
      return;
    }

    // Check if already a member
    const existingMembership = await checkExistingMembership(groupId, user.id);
    if (existingMembership.exists) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "You are already a member of this group",
        400
      );
      return;
    }

    // Check capacity
    if (!hasCapacity(group.membersCount, group.maxMembers)) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "This group has reached its maximum member limit",
        400
      );
      return;
    }

    // Check access for private groups
    if (!group.isPublic) {
      // Private group requires valid invite code
      if (!input.inviteCode) {
        sendError(
          res,
          ErrorCodes.FORBIDDEN,
          "This is a private group. An invite code is required to join.",
          403
        );
        return;
      }

      if (!isInviteCodeMatch(group.inviteCode, input.inviteCode)) {
        sendError(res, ErrorCodes.FORBIDDEN, "Invalid invite code", 403);
        return;
      }
    }

    // Create membership
    const membership = await createMembership(groupId, user.id);

    // Invalidate caches
    await Promise.all([
      cache.del(buildGroupCacheKey(groupId)),
      cache.del(buildMembershipCacheKey(groupId, user.id)),
      cache.invalidatePattern(`${CacheKeyPrefix.USER}:${user.id}:groups:*`),
      cache.invalidatePattern(`${CacheKeyPrefix.USER}:*:groups:*`),
    ]);

    // Build response
    const response: JoinGroupResponse = {
      success: true,
      message: `Successfully joined ${membership.group.name}`,
      membership: {
        groupId: membership.group.id,
        groupName: membership.group.name,
        role: membership.role,
        joinedAt: formatDate(membership.joinedAt),
      },
    };

    logger.info("User joined group", {
      userId: user.id,
      groupId: group.id,
      groupName: group.name,
      role: membership.role,
    });

    sendSuccess(res, response, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error joining group", {
      userId: user.id,
      groupId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to join group. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
