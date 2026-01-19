/**
 * Reading Groups API - List and Create
 *
 * GET /api/groups - List reading groups
 *   - Returns public groups and user's private groups
 *   - Supports search, filtering, and pagination
 *
 * POST /api/groups - Create a reading group
 *   - Requires Pro or Scholar tier
 *   - Applies profanity filter to name and description
 *   - Creates owner membership automatically
 *
 * @example
 * ```bash
 * # List groups
 * curl -X GET "/api/groups?search=book%20club&page=1&limit=20" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Create group
 * curl -X POST "/api/groups" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"name":"My Book Club","description":"A club for readers","isPublic":true}'
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";
import type { Prisma } from "@read-master/database";
import {
  containsProfanity,
  validateFieldsNoProfanity,
  getTierLimits,
} from "@read-master/shared";

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
import { cache, CacheKeyPrefix, CacheTTL } from "../../src/services/redis.js";

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
 * Minimum number of items per page
 */
export const MIN_LIMIT = 1;

/**
 * Maximum search query length
 */
export const MAX_SEARCH_LENGTH = 100;

/**
 * Maximum group name length
 */
export const MAX_NAME_LENGTH = 200;

/**
 * Maximum description length
 */
export const MAX_DESCRIPTION_LENGTH = 2000;

/**
 * Cache TTL for group lists
 */
export const GROUPS_CACHE_TTL = CacheTTL.SHORT;

/**
 * Default maximum members for a new group
 */
export const DEFAULT_MAX_MEMBERS = 50;

// ============================================================================
// Types
// ============================================================================

/**
 * Query parameters for listing groups
 */
export type ListGroupsQueryParams = {
  search: string | null;
  isPublic: boolean | null;
  page: number;
  limit: number;
};

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
 * Group response data
 */
export type GroupResponse = {
  id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  isPublic: boolean;
  maxMembers: number | null;
  membersCount: number;
  discussionsCount: number;
  owner: GroupUserInfo;
  currentBook: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
  } | null;
  isMember: boolean;
  memberRole: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Create group input
 */
export type CreateGroupInput = {
  name: string;
  description?: string | null;
  coverImage?: string | null;
  isPublic: boolean;
  maxMembers?: number | null;
};

/**
 * Pagination info
 */
export type GroupsPaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

/**
 * List groups response
 */
export type ListGroupsResponse = {
  groups: GroupResponse[];
  pagination: GroupsPaginationInfo;
};

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for listing groups query parameters
 */
const listGroupsQuerySchema = z.object({
  search: z
    .string()
    .max(
      MAX_SEARCH_LENGTH,
      `Search must be at most ${MAX_SEARCH_LENGTH} characters`
    )
    .optional()
    .nullable()
    .transform((val) => val || null),
  isPublic: z
    .enum(["true", "false"])
    .optional()
    .nullable()
    .transform((val) =>
      val === "true" ? true : val === "false" ? false : null
    ),
  page: z.coerce
    .number()
    .int("Page must be an integer")
    .min(1, "Page must be at least 1")
    .default(1),
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(MIN_LIMIT, `Limit must be at least ${MIN_LIMIT}`)
    .max(MAX_LIMIT, `Limit must be at most ${MAX_LIMIT}`)
    .default(DEFAULT_LIMIT),
});

/**
 * Schema for creating a group
 */
const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(MAX_NAME_LENGTH, `Name must be at most ${MAX_NAME_LENGTH} characters`)
    .refine(
      (val) => !containsProfanity(val),
      "Name contains inappropriate language"
    ),
  description: z
    .string()
    .max(
      MAX_DESCRIPTION_LENGTH,
      `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`
    )
    .optional()
    .nullable()
    .refine(
      (val) => !val || !containsProfanity(val),
      "Description contains inappropriate language"
    ),
  coverImage: z
    .string()
    .url("Cover image must be a valid URL")
    .optional()
    .nullable(),
  isPublic: z.boolean().default(true),
  maxMembers: z.coerce
    .number()
    .int("Max members must be an integer")
    .min(2, "Max members must be at least 2")
    .max(1000, "Max members must be at most 1000")
    .optional()
    .nullable(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse query parameters for listing groups
 */
function parseListGroupsQuery(
  query: Record<string, string | string[] | undefined>
): ListGroupsQueryParams {
  const result = listGroupsQuerySchema.safeParse(query);
  if (!result.success) {
    return {
      search: null,
      isPublic: null,
      page: 1,
      limit: DEFAULT_LIMIT,
    };
  }
  return result.data;
}

/**
 * Build cache key for group list
 */
function buildGroupsListCacheKey(
  userId: string,
  params: ListGroupsQueryParams
): string {
  const parts = [
    CacheKeyPrefix.USER,
    userId,
    "groups",
    `page-${params.page}`,
    `limit-${params.limit}`,
  ];
  if (params.search) {
    parts.push(`search-${params.search.toLowerCase()}`);
  }
  if (params.isPublic !== null) {
    parts.push(`public-${params.isPublic}`);
  }
  return parts.join(":");
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
 * Map book data to response format
 */
export function mapToGroupBookInfo(
  book: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
  } | null
): GroupResponse["currentBook"] {
  if (!book) return null;
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverImage: book.coverImage,
  };
}

/**
 * Map group data to GroupResponse
 */
export function mapToGroupResponse(
  group: {
    id: string;
    name: string;
    description: string | null;
    coverImage: string | null;
    isPublic: boolean;
    maxMembers: number | null;
    membersCount: number;
    discussionsCount: number;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      username: string | null;
      displayName: string | null;
      avatarUrl: string | null;
    };
    currentBook: {
      id: string;
      title: string;
      author: string | null;
      coverImage: string | null;
    } | null;
    members?: Array<{
      role: string;
      userId: string;
    }>;
  },
  currentUserId: string
): GroupResponse {
  const membership = group.members?.find((m) => m.userId === currentUserId);

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    coverImage: group.coverImage,
    isPublic: group.isPublic,
    maxMembers: group.maxMembers,
    membersCount: group.membersCount,
    discussionsCount: group.discussionsCount,
    owner: mapToGroupUserInfo(group.user),
    currentBook: mapToGroupBookInfo(group.currentBook),
    isMember: membership !== undefined,
    memberRole: membership?.role ?? null,
    createdAt: formatDate(group.createdAt),
    updatedAt: formatDate(group.updatedAt),
  };
}

/**
 * Calculate pagination info
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number
): GroupsPaginationInfo {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
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

/**
 * Sanitize search input
 */
export function sanitizeSearch(search: string | null): string | null {
  if (!search) return null;
  return search.trim().slice(0, MAX_SEARCH_LENGTH);
}

/**
 * Check if user can create reading groups based on tier
 */
export function canCreateReadingGroup(tier: string): boolean {
  const limits = getTierLimits(tier as "FREE" | "PRO" | "SCHOLAR");
  return limits.canCreateReadingGroups;
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Build where clause for listing groups
 */
function buildGroupsWhereClause(
  userId: string,
  params: ListGroupsQueryParams
): Prisma.ReadingGroupWhereInput {
  const where: Prisma.ReadingGroupWhereInput = {
    deletedAt: null,
    OR: [
      { isPublic: true },
      { userId },
      {
        members: {
          some: { userId },
        },
      },
    ],
  };

  // Filter by public/private
  if (params.isPublic !== null) {
    if (params.isPublic) {
      // Only show public groups
      where.isPublic = true;
      delete where.OR;
    } else {
      // Only show user's private groups or groups they're a member of
      delete where.OR;
      where.AND = [
        { isPublic: false },
        {
          OR: [{ userId }, { members: { some: { userId } } }],
        },
      ];
    }
  }

  // Search in name and description
  if (params.search) {
    const searchCondition: Prisma.ReadingGroupWhereInput = {
      OR: [
        { name: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
      ],
    };

    if (where.AND) {
      (where.AND as Prisma.ReadingGroupWhereInput[]).push(searchCondition);
    } else {
      where.AND = [searchCondition];
    }
  }

  return where;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET and POST /api/groups
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

  if (req.method === "GET") {
    await handleListGroups(req, res, user);
  } else if (req.method === "POST") {
    await handleCreateGroup(req, res, user);
  } else {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET or POST.",
      405
    );
  }
}

/**
 * Handle GET /api/groups - List groups
 */
async function handleListGroups(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string; tier: string }
): Promise<void> {
  try {
    // Parse query parameters
    const params = parseListGroupsQuery(
      req.query as Record<string, string | string[] | undefined>
    );

    // Try cache first
    const cacheKey = buildGroupsListCacheKey(user.id, params);
    const cached = await cache.get<{ groups: GroupResponse[]; total: number }>(
      cacheKey
    );

    if (cached) {
      logger.info("Groups list cache hit", { userId: user.id });
      sendPaginated(
        res,
        cached.groups,
        params.page,
        params.limit,
        cached.total
      );
      return;
    }

    // Build query
    const where = buildGroupsWhereClause(user.id, params);
    const skip = (params.page - 1) * params.limit;

    // Execute queries in parallel
    const [total, groups] = await Promise.all([
      db.readingGroup.count({ where }),
      db.readingGroup.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: params.limit,
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
      }),
    ]);

    // Map to response format
    const groupResponses = groups.map((group) =>
      mapToGroupResponse(group, user.id)
    );

    // Cache results
    await cache.set(
      cacheKey,
      { groups: groupResponses, total },
      { ttl: GROUPS_CACHE_TTL }
    );

    logger.info("Groups listed", {
      userId: user.id,
      params,
      count: groupResponses.length,
      total,
    });

    sendPaginated(res, groupResponses, params.page, params.limit, total);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error listing groups", { userId: user.id, error: message });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to list groups. Please try again.",
      500
    );
  }
}

/**
 * Handle POST /api/groups - Create group
 */
async function handleCreateGroup(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string; tier: string }
): Promise<void> {
  try {
    // Check tier permissions
    if (!canCreateReadingGroup(user.tier)) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Creating reading groups requires Pro or Scholar subscription",
        403
      );
      return;
    }

    // Validate input
    const validationResult = createGroupSchema.safeParse(req.body);
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

    // Additional profanity check (belt and suspenders)
    const profanityCheck = validateFieldsNoProfanity([
      { value: input.name, name: "Name" },
      ...(input.description
        ? [{ value: input.description, name: "Description" }]
        : []),
    ]);

    if (!profanityCheck.valid) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        profanityCheck.errors[0] ?? "Content contains inappropriate language",
        400
      );
      return;
    }

    // Generate invite code for private groups
    const inviteCode = input.isPublic ? null : generateInviteCode();

    // Create group and owner membership in transaction
    const group = await db.$transaction(async (tx) => {
      // Create the group
      const newGroup = await tx.readingGroup.create({
        data: {
          userId: user.id,
          name: input.name,
          description: input.description ?? null,
          coverImage: input.coverImage ?? null,
          isPublic: input.isPublic,
          maxMembers: input.maxMembers ?? DEFAULT_MAX_MEMBERS,
          inviteCode,
          membersCount: 1, // Owner counts as member
          discussionsCount: 0,
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
        },
      });

      // Add owner as member with OWNER role
      await tx.readingGroupMember.create({
        data: {
          groupId: newGroup.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      return newGroup;
    });

    // Invalidate cache
    const cachePattern = `${CacheKeyPrefix.USER}:${user.id}:groups:*`;
    await cache.invalidatePattern(cachePattern);

    // Build response
    const response = mapToGroupResponse(
      {
        ...group,
        members: [{ role: "OWNER", userId: user.id }],
      },
      user.id
    );

    logger.info("Group created", {
      userId: user.id,
      groupId: group.id,
      name: group.name,
      isPublic: group.isPublic,
    });

    sendSuccess(res, response, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error creating group", { userId: user.id, error: message });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to create group. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  listGroupsQuerySchema,
  createGroupSchema,
  parseListGroupsQuery,
  buildGroupsListCacheKey,
  buildGroupsWhereClause,
};
