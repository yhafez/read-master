/**
 * Reading Group Discussions API
 *
 * GET /api/groups/:id/discussions - List discussions for a group
 *   - Supports pagination, sorting, filtering
 *   - Only members can view private group discussions
 *
 * POST /api/groups/:id/discussions - Create a new discussion
 *   - Only group members can create discussions
 *   - Locked groups cannot have new discussions
 *   - Profanity filtering on title and content
 *
 * @example
 * ```bash
 * # List discussions
 * curl -X GET "/api/groups/abc123/discussions?page=1&limit=20&sortBy=lastReplyAt" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Create discussion
 * curl -X POST "/api/groups/abc123/discussions" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"title":"Book Discussion","content":"Let'\''s discuss chapter 1!"}'
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
import { validateFieldsNoProfanity } from "@read-master/shared";

// ============================================================================
// Constants
// ============================================================================

/**
 * Default page for pagination
 */
export const DEFAULT_PAGE = 1;

/**
 * Default limit for pagination
 */
export const DEFAULT_LIMIT = 20;

/**
 * Maximum limit for pagination
 */
export const MAX_LIMIT = 100;

/**
 * Minimum limit for pagination
 */
export const MIN_LIMIT = 1;

/**
 * Maximum title length
 */
export const MAX_TITLE_LENGTH = 300;

/**
 * Maximum content length
 */
export const MAX_CONTENT_LENGTH = 50000;

/**
 * Cache TTL for discussions data (5 minutes)
 */
export const DISCUSSIONS_CACHE_TTL = 60 * 5;

/**
 * Sort options for discussions
 */
export const DiscussionSortOptions = {
  LAST_REPLY: "lastReplyAt",
  CREATED: "createdAt",
  REPLIES: "repliesCount",
} as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Query parameters for listing discussions
 */
export type DiscussionListQueryParams = {
  page: number;
  limit: number;
  sortBy: string;
  sortDirection: "asc" | "desc";
  bookId?: string | undefined;
  isPinned?: boolean | undefined;
  search?: string | undefined;
};

/**
 * User info in response
 */
export type DiscussionUserInfo = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Book info in response
 */
export type DiscussionBookInfo = {
  id: string;
  title: string;
  author: string | null;
};

/**
 * Discussion summary for list response
 */
export type DiscussionSummary = {
  id: string;
  title: string;
  content: string;
  bookId: string | null;
  book: DiscussionBookInfo | null;
  isPinned: boolean;
  isLocked: boolean;
  repliesCount: number;
  lastReplyAt: string | null;
  user: DiscussionUserInfo;
  createdAt: string;
  updatedAt: string;
};

/**
 * Pagination info
 */
export type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

/**
 * Discussion list response
 */
export type DiscussionListResponse = {
  discussions: DiscussionSummary[];
  pagination: PaginationInfo;
};

/**
 * Create discussion input
 */
export type CreateDiscussionInput = {
  title: string;
  content: string;
  bookId?: string | null | undefined;
};

/**
 * Create discussion response
 */
export type CreateDiscussionResponse = {
  success: boolean;
  message: string;
  discussion: DiscussionSummary;
};

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for creating a discussion
 */
export const createDiscussionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(
      MAX_TITLE_LENGTH,
      `Title must be at most ${MAX_TITLE_LENGTH} characters`
    ),
  content: z
    .string()
    .trim()
    .min(1, "Content is required")
    .max(
      MAX_CONTENT_LENGTH,
      `Content must be at most ${MAX_CONTENT_LENGTH} characters`
    ),
  bookId: z
    .string()
    .regex(/^c[a-z0-9]+$/, "Invalid book ID format")
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
export function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString();
}

/**
 * Format required date as ISO string
 */
export function formatDateRequired(date: Date): string {
  return date.toISOString();
}

/**
 * Parse page number from query
 */
export function parsePage(value: unknown): number {
  if (typeof value === "string") {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1) {
      return num;
    }
  }
  if (typeof value === "number" && value >= 1) {
    return Math.floor(value);
  }
  return DEFAULT_PAGE;
}

/**
 * Parse limit from query
 */
export function parseLimit(value: unknown): number {
  if (typeof value === "string") {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= MIN_LIMIT && num <= MAX_LIMIT) {
      return num;
    }
  }
  if (typeof value === "number" && value >= MIN_LIMIT && value <= MAX_LIMIT) {
    return Math.floor(value);
  }
  return DEFAULT_LIMIT;
}

/**
 * Parse sort field
 */
export function parseSortBy(value: unknown): string {
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (lower === DiscussionSortOptions.LAST_REPLY || lower === "lastreplyat") {
      return DiscussionSortOptions.LAST_REPLY;
    }
    if (lower === DiscussionSortOptions.CREATED || lower === "createdat") {
      return DiscussionSortOptions.CREATED;
    }
    if (lower === DiscussionSortOptions.REPLIES || lower === "repliescount") {
      return DiscussionSortOptions.REPLIES;
    }
  }
  return DiscussionSortOptions.LAST_REPLY;
}

/**
 * Parse sort direction
 */
export function parseSortDirection(value: unknown): "asc" | "desc" {
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (lower === "asc" || lower === "ascending") {
      return "asc";
    }
  }
  return "desc";
}

/**
 * Parse boolean value from query
 */
export function parseBoolean(value: unknown): boolean | undefined {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return undefined;
}

/**
 * Parse search query
 */
export function parseSearch(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0 && trimmed.length <= 200) {
      return trimmed;
    }
  }
  return undefined;
}

/**
 * Parse book ID from query
 */
export function parseBookId(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^c[a-z0-9]+$/.test(trimmed)) {
      return trimmed;
    }
  }
  return undefined;
}

/**
 * Parse all query parameters for listing discussions
 */
export function parseListDiscussionsQuery(query: {
  page?: unknown;
  limit?: unknown;
  sortBy?: unknown;
  sortDirection?: unknown;
  bookId?: unknown;
  isPinned?: unknown;
  search?: unknown;
}): DiscussionListQueryParams {
  return {
    page: parsePage(query.page),
    limit: parseLimit(query.limit),
    sortBy: parseSortBy(query.sortBy),
    sortDirection: parseSortDirection(query.sortDirection),
    bookId: parseBookId(query.bookId),
    isPinned: parseBoolean(query.isPinned),
    search: parseSearch(query.search),
  };
}

/**
 * Build cache key for discussions list
 */
export function buildDiscussionsCacheKey(
  groupId: string,
  params: DiscussionListQueryParams
): string {
  const parts = [
    `${CacheKeyPrefix.USER}:group:${groupId}:discussions`,
    `p${params.page}`,
    `l${params.limit}`,
    `s${params.sortBy}`,
    `d${params.sortDirection}`,
  ];
  if (params.bookId) parts.push(`b${params.bookId}`);
  if (params.isPinned !== undefined) parts.push(`pin${params.isPinned}`);
  if (params.search) parts.push(`q${params.search}`);
  return parts.join(":");
}

/**
 * Build cache key for single discussion
 */
export function buildDiscussionCacheKey(discussionId: string): string {
  return `${CacheKeyPrefix.USER}:discussion:${discussionId}`;
}

/**
 * Build cache key for group data
 */
export function buildGroupCacheKey(groupId: string): string {
  return `${CacheKeyPrefix.USER}:group:${groupId}`;
}

/**
 * Map user to response format
 */
export function mapToDiscussionUserInfo(user: {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}): DiscussionUserInfo {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

/**
 * Map book to response format
 */
export function mapToDiscussionBookInfo(
  book: {
    id: string;
    title: string;
    author: string | null;
  } | null
): DiscussionBookInfo | null {
  if (!book) return null;
  return {
    id: book.id,
    title: book.title,
    author: book.author,
  };
}

/**
 * Map database discussion to response format
 */
export function mapToDiscussionSummary(discussion: {
  id: string;
  title: string;
  content: string;
  bookId: string | null;
  book: { id: string; title: string; author: string | null } | null;
  isPinned: boolean;
  isLocked: boolean;
  repliesCount: number;
  lastReplyAt: Date | null;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}): DiscussionSummary {
  return {
    id: discussion.id,
    title: discussion.title,
    content: discussion.content,
    bookId: discussion.bookId,
    book: mapToDiscussionBookInfo(discussion.book),
    isPinned: discussion.isPinned,
    isLocked: discussion.isLocked,
    repliesCount: discussion.repliesCount,
    lastReplyAt: formatDate(discussion.lastReplyAt),
    user: mapToDiscussionUserInfo(discussion.user),
    createdAt: formatDateRequired(discussion.createdAt),
    updatedAt: formatDateRequired(discussion.updatedAt),
  };
}

/**
 * Calculate pagination info
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationInfo {
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
 * Check if user is a member of the group
 */
export async function checkMembership(
  groupId: string,
  userId: string
): Promise<{ isMember: boolean; role: string | null }> {
  const membership = await db.readingGroupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
    select: { role: true },
  });
  return {
    isMember: membership !== null,
    role: membership?.role ?? null,
  };
}

/**
 * Check if user has admin permission
 */
export function hasAdminPermission(role: string | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get group for discussion operations
 */
async function getGroupForDiscussion(groupId: string) {
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
    },
  });
}

/**
 * List discussions for a group
 */
async function listDiscussions(
  groupId: string,
  params: DiscussionListQueryParams
) {
  const { page, limit, sortBy, sortDirection, bookId, isPinned, search } =
    params;

  // Build where clause
  const where: {
    groupId: string;
    deletedAt: null;
    bookId?: string;
    isPinned?: boolean;
    OR?: Array<
      | { title: { contains: string; mode: "insensitive" } }
      | { content: { contains: string; mode: "insensitive" } }
    >;
  } = {
    groupId,
    deletedAt: null,
  };

  if (bookId) {
    where.bookId = bookId;
  }
  if (isPinned !== undefined) {
    where.isPinned = isPinned;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  // Build order by (pinned first, then by sort field)
  const orderBy: Array<{ isPinned?: "desc" } | Record<string, "asc" | "desc">> =
    [{ isPinned: "desc" }, { [sortBy]: sortDirection }];

  const skip = (page - 1) * limit;

  const [discussions, total] = await Promise.all([
    db.groupDiscussion.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        bookId: true,
        book: {
          select: {
            id: true,
            title: true,
            author: true,
          },
        },
        isPinned: true,
        isLocked: true,
        repliesCount: true,
        lastReplyAt: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.groupDiscussion.count({ where }),
  ]);

  return { discussions, total };
}

/**
 * Create a new discussion
 */
async function createDiscussion(
  groupId: string,
  userId: string,
  input: CreateDiscussionInput
) {
  return db.$transaction(async (tx) => {
    // Create the discussion
    const discussion = await tx.groupDiscussion.create({
      data: {
        groupId,
        userId,
        title: input.title,
        content: input.content,
        bookId: input.bookId ?? null,
      },
      select: {
        id: true,
        title: true,
        content: true,
        bookId: true,
        book: {
          select: {
            id: true,
            title: true,
            author: true,
          },
        },
        isPinned: true,
        isLocked: true,
        repliesCount: true,
        lastReplyAt: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    // Increment discussions count on the group
    await tx.readingGroup.update({
      where: { id: groupId },
      data: {
        discussionsCount: { increment: 1 },
      },
    });

    return discussion;
  });
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET and POST /api/groups/:id/discussions
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

  // Get group
  const group = await getGroupForDiscussion(groupId);
  if (!group) {
    sendError(res, ErrorCodes.NOT_FOUND, "Group not found", 404);
    return;
  }

  // Check membership
  const { isMember } = await checkMembership(groupId, user.id);

  // For private groups, must be a member to access
  if (!group.isPublic && !isMember) {
    sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "You must be a member to access this group's discussions",
      403
    );
    return;
  }

  if (req.method === "GET") {
    await handleGetDiscussions(req, res, groupId);
  } else if (req.method === "POST") {
    await handleCreateDiscussion(req, res, groupId, user.id, isMember);
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
 * Handle GET /api/groups/:id/discussions
 */
async function handleGetDiscussions(
  req: AuthenticatedRequest,
  res: VercelResponse,
  groupId: string
): Promise<void> {
  try {
    const params = parseListDiscussionsQuery(req.query);

    // Try cache first
    const cacheKey = buildDiscussionsCacheKey(groupId, params);
    const cached = await cache.get<DiscussionListResponse>(cacheKey);
    if (cached) {
      sendSuccess(res, cached);
      return;
    }

    // Fetch from database
    const { discussions, total } = await listDiscussions(groupId, params);

    const response: DiscussionListResponse = {
      discussions: discussions.map(mapToDiscussionSummary),
      pagination: calculatePagination(params.page, params.limit, total),
    };

    // Cache the response
    await cache.set(cacheKey, response, { ttl: DISCUSSIONS_CACHE_TTL });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error listing discussions", {
      groupId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to list discussions. Please try again.",
      500
    );
  }
}

/**
 * Handle POST /api/groups/:id/discussions
 */
async function handleCreateDiscussion(
  req: AuthenticatedRequest,
  res: VercelResponse,
  groupId: string,
  userId: string,
  isMember: boolean
): Promise<void> {
  // Must be a member to create discussions
  if (!isMember) {
    sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "You must be a member to create discussions in this group",
      403
    );
    return;
  }

  // Validate request body
  const validationResult = createDiscussionSchema.safeParse(req.body);
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

  // Check profanity
  const profanityCheck = validateFieldsNoProfanity([
    { value: input.title, name: "Title" },
    { value: input.content, name: "Content" },
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

  try {
    // Create discussion
    const discussion = await createDiscussion(groupId, userId, input);

    // Invalidate caches
    await Promise.all([
      cache.del(buildGroupCacheKey(groupId)),
      cache.invalidatePattern(
        `${CacheKeyPrefix.USER}:group:${groupId}:discussions:*`
      ),
    ]);

    const response: CreateDiscussionResponse = {
      success: true,
      message: "Discussion created successfully",
      discussion: mapToDiscussionSummary(discussion),
    };

    logger.info("Discussion created", {
      userId,
      groupId,
      discussionId: discussion.id,
      title: discussion.title,
    });

    sendSuccess(res, response, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error creating discussion", {
      userId,
      groupId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to create discussion. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
