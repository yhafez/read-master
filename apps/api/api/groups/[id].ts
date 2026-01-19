/**
 * Reading Group API - Get, Update, Delete
 *
 * GET /api/groups/:id - Get group details
 *   - Returns full group info including members and discussions count
 *   - Requires membership or public group
 *
 * PUT /api/groups/:id - Update group
 *   - Only owner or admin can update
 *   - Applies profanity filter to name and description
 *
 * DELETE /api/groups/:id - Delete group (soft delete)
 *   - Only owner can delete
 *   - Soft deletes the group
 *
 * @example
 * ```bash
 * # Get group
 * curl -X GET "/api/groups/abc123" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Update group
 * curl -X PUT "/api/groups/abc123" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"name":"Updated Name","description":"New description"}'
 *
 * # Delete group
 * curl -X DELETE "/api/groups/abc123" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";
import {
  containsProfanity,
  validateFieldsNoProfanity,
} from "@read-master/shared";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.js";
import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../src/services/db.js";
import { cache, CacheKeyPrefix } from "../../src/services/redis.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum group name length
 */
export const MAX_NAME_LENGTH = 200;

/**
 * Maximum description length
 */
export const MAX_DESCRIPTION_LENGTH = 2000;

/**
 * Roles that can modify a group
 */
export const ADMIN_ROLES = ["OWNER", "ADMIN"] as const;

// ============================================================================
// Types
// ============================================================================

/**
 * User info in group responses
 */
export type GroupUserInfo = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Member info in group responses
 */
export type GroupMemberInfo = {
  id: string;
  user: GroupUserInfo;
  role: string;
  joinedAt: string;
};

/**
 * Book info in group responses
 */
export type GroupBookInfo = {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
};

/**
 * Full group detail response
 */
export type GroupDetailResponse = {
  id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  isPublic: boolean;
  maxMembers: number | null;
  inviteCode: string | null;
  membersCount: number;
  discussionsCount: number;
  owner: GroupUserInfo;
  currentBook: GroupBookInfo | null;
  isMember: boolean;
  memberRole: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Update group input
 */
export type UpdateGroupInput = {
  name?: string;
  description?: string | null;
  coverImage?: string | null;
  isPublic?: boolean;
  maxMembers?: number | null;
  currentBookId?: string | null;
};

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for updating a group
 */
const updateGroupSchema = z.object({
  name: z
    .string()
    .min(1, "Name cannot be empty")
    .max(MAX_NAME_LENGTH, `Name must be at most ${MAX_NAME_LENGTH} characters`)
    .refine(
      (val) => !containsProfanity(val),
      "Name contains inappropriate language"
    )
    .optional(),
  description: z
    .string()
    .max(
      MAX_DESCRIPTION_LENGTH,
      `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`
    )
    .refine(
      (val) => !containsProfanity(val),
      "Description contains inappropriate language"
    )
    .optional()
    .nullable(),
  coverImage: z
    .string()
    .url("Cover image must be a valid URL")
    .optional()
    .nullable(),
  isPublic: z.boolean().optional(),
  maxMembers: z.coerce
    .number()
    .int("Max members must be an integer")
    .min(2, "Max members must be at least 2")
    .max(1000, "Max members must be at most 1000")
    .optional()
    .nullable(),
  currentBookId: z.string().optional().nullable(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate group ID format
 */
function validateGroupId(id: unknown): string | null {
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
 * Map user data to GroupUserInfo
 */
export function mapToGroupUserInfo(user: {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}): GroupUserInfo {
  return {
    id: user.id,
    username: user.username ?? "anonymous",
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

/**
 * Map book data to GroupBookInfo
 */
export function mapToGroupBookInfo(
  book: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
  } | null
): GroupBookInfo | null {
  if (!book) return null;
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverImage: book.coverImage,
  };
}

/**
 * Check if user has admin permissions for the group
 */
function hasAdminPermission(role: string | null): boolean {
  if (!role) return false;
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

/**
 * Check if user is the owner of the group
 */
function isGroupOwner(role: string | null): boolean {
  return role === "OWNER";
}

/**
 * Build cache key for individual group
 */
function buildGroupCacheKey(groupId: string): string {
  return `${CacheKeyPrefix.USER}:group:${groupId}`;
}

/**
 * Generate a unique invite code
 */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get group with full details
 */
async function getGroupById(groupId: string, userId: string) {
  return db.readingGroup.findFirst({
    where: {
      id: groupId,
      deletedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      currentBook: {
        select: {
          id: true,
          title: true,
          author: true,
          coverImage: true,
        },
      },
      members: {
        where: { userId },
        select: {
          role: true,
          userId: true,
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
    members?: Array<{ userId: string }>;
  },
  userId: string
): boolean {
  // Public groups are accessible to everyone
  if (group.isPublic) return true;

  // Owner can always access
  if (group.userId === userId) return true;

  // Members can access
  if (group.members?.some((m) => m.userId === userId)) return true;

  return false;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET, PUT, DELETE /api/groups/:id
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

  if (req.method === "GET") {
    await handleGetGroup(res, user, groupId);
  } else if (req.method === "PUT") {
    await handleUpdateGroup(req, res, user, groupId);
  } else if (req.method === "DELETE") {
    await handleDeleteGroup(res, user, groupId);
  } else {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET, PUT, or DELETE.",
      405
    );
  }
}

/**
 * Handle GET /api/groups/:id
 */
async function handleGetGroup(
  res: VercelResponse,
  user: { id: string },
  groupId: string
): Promise<void> {
  try {
    // Get group
    const group = await getGroupById(groupId, user.id);

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

    // Get user's membership info
    const membership = group.members?.find((m) => m.userId === user.id);

    // Build response
    const response: GroupDetailResponse = {
      id: group.id,
      name: group.name,
      description: group.description,
      coverImage: group.coverImage,
      isPublic: group.isPublic,
      maxMembers: group.maxMembers,
      // Only show invite code to admins
      inviteCode: hasAdminPermission(membership?.role ?? null)
        ? group.inviteCode
        : null,
      membersCount: group.membersCount,
      discussionsCount: group.discussionsCount,
      owner: mapToGroupUserInfo(group.user),
      currentBook: mapToGroupBookInfo(group.currentBook),
      isMember: membership !== undefined,
      memberRole: membership?.role ?? null,
      createdAt: formatDate(group.createdAt),
      updatedAt: formatDate(group.updatedAt),
    };

    logger.info("Group fetched", {
      userId: user.id,
      groupId: group.id,
      isMember: response.isMember,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error fetching group", {
      userId: user.id,
      groupId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch group. Please try again.",
      500
    );
  }
}

/**
 * Handle PUT /api/groups/:id
 */
async function handleUpdateGroup(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string },
  groupId: string
): Promise<void> {
  try {
    // Get group to check permissions
    const existingGroup = await getGroupById(groupId, user.id);

    if (!existingGroup) {
      sendError(res, ErrorCodes.NOT_FOUND, "Group not found", 404);
      return;
    }

    // Check admin permission
    const membership = existingGroup.members?.find((m) => m.userId === user.id);
    if (!hasAdminPermission(membership?.role ?? null)) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Only owners and admins can update the group",
        403
      );
      return;
    }

    // Validate input
    const validationResult = updateGroupSchema.safeParse(req.body);
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

    // Additional profanity check
    const fieldsToCheck = [];
    if (input.name) {
      fieldsToCheck.push({ value: input.name, name: "Name" });
    }
    if (input.description) {
      fieldsToCheck.push({ value: input.description, name: "Description" });
    }

    if (fieldsToCheck.length > 0) {
      const profanityCheck = validateFieldsNoProfanity(fieldsToCheck);
      if (!profanityCheck.valid) {
        sendError(
          res,
          ErrorCodes.VALIDATION_ERROR,
          profanityCheck.errors[0] ?? "Content contains inappropriate language",
          400
        );
        return;
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.coverImage !== undefined) {
      updateData.coverImage = input.coverImage;
    }
    if (input.maxMembers !== undefined) {
      updateData.maxMembers = input.maxMembers;
    }
    if (input.currentBookId !== undefined) {
      updateData.currentBookId = input.currentBookId;
    }

    // Handle isPublic change (generate/remove invite code)
    if (
      input.isPublic !== undefined &&
      input.isPublic !== existingGroup.isPublic
    ) {
      updateData.isPublic = input.isPublic;
      if (!input.isPublic && !existingGroup.inviteCode) {
        // Becoming private, generate invite code
        updateData.inviteCode = generateInviteCode();
      } else if (input.isPublic) {
        // Becoming public, remove invite code
        updateData.inviteCode = null;
      }
    }

    // Update group
    const updatedGroup = await db.readingGroup.update({
      where: { id: groupId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        currentBook: {
          select: {
            id: true,
            title: true,
            author: true,
            coverImage: true,
          },
        },
        members: {
          where: { userId: user.id },
          select: {
            role: true,
            userId: true,
          },
        },
      },
    });

    // Invalidate caches
    await Promise.all([
      cache.del(buildGroupCacheKey(groupId)),
      cache.invalidatePattern(`${CacheKeyPrefix.USER}:*:groups:*`),
    ]);

    // Build response
    const updatedMembership = updatedGroup.members?.find(
      (m) => m.userId === user.id
    );
    const response: GroupDetailResponse = {
      id: updatedGroup.id,
      name: updatedGroup.name,
      description: updatedGroup.description,
      coverImage: updatedGroup.coverImage,
      isPublic: updatedGroup.isPublic,
      maxMembers: updatedGroup.maxMembers,
      inviteCode: hasAdminPermission(updatedMembership?.role ?? null)
        ? updatedGroup.inviteCode
        : null,
      membersCount: updatedGroup.membersCount,
      discussionsCount: updatedGroup.discussionsCount,
      owner: mapToGroupUserInfo(updatedGroup.user),
      currentBook: mapToGroupBookInfo(updatedGroup.currentBook),
      isMember: updatedMembership !== undefined,
      memberRole: updatedMembership?.role ?? null,
      createdAt: formatDate(updatedGroup.createdAt),
      updatedAt: formatDate(updatedGroup.updatedAt),
    };

    logger.info("Group updated", {
      userId: user.id,
      groupId: updatedGroup.id,
      updatedFields: Object.keys(updateData),
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error updating group", {
      userId: user.id,
      groupId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to update group. Please try again.",
      500
    );
  }
}

/**
 * Handle DELETE /api/groups/:id
 */
async function handleDeleteGroup(
  res: VercelResponse,
  user: { id: string },
  groupId: string
): Promise<void> {
  try {
    // Get group to check ownership
    const existingGroup = await getGroupById(groupId, user.id);

    if (!existingGroup) {
      sendError(res, ErrorCodes.NOT_FOUND, "Group not found", 404);
      return;
    }

    // Check owner permission (only owner can delete)
    const membership = existingGroup.members?.find((m) => m.userId === user.id);
    if (!isGroupOwner(membership?.role ?? null)) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Only the owner can delete the group",
        403
      );
      return;
    }

    // Soft delete the group
    await db.readingGroup.update({
      where: { id: groupId },
      data: { deletedAt: new Date() },
    });

    // Invalidate caches
    await Promise.all([
      cache.del(buildGroupCacheKey(groupId)),
      cache.invalidatePattern(`${CacheKeyPrefix.USER}:*:groups:*`),
    ]);

    logger.info("Group deleted", {
      userId: user.id,
      groupId,
      groupName: existingGroup.name,
    });

    sendSuccess(res, { message: "Group deleted successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error deleting group", {
      userId: user.id,
      groupId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to delete group. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  updateGroupSchema,
  validateGroupId,
  hasAdminPermission,
  isGroupOwner,
  buildGroupCacheKey,
  canAccessGroup,
};
