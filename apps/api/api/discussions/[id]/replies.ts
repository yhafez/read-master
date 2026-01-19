/**
 * Discussion Replies API
 *
 * GET /api/discussions/:id/replies - List replies for a discussion
 *   - Supports pagination and nested replies
 *   - Only members can view private group discussion replies
 *
 * POST /api/discussions/:id/replies - Create a reply to a discussion
 *   - Only group members can create replies
 *   - Locked discussions cannot have new replies
 *   - Supports nested replies (parentReplyId)
 *   - Profanity filtering on content
 *
 * @example
 * ```bash
 * # List replies
 * curl -X GET "/api/discussions/abc123/replies?page=1&limit=50" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Create reply
 * curl -X POST "/api/discussions/abc123/replies" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"content":"Great point!"}'
 *
 * # Create nested reply
 * curl -X POST "/api/discussions/abc123/replies" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"content":"I agree!","parentReplyId":"reply123"}'
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
import { containsProfanity } from "@read-master/shared";

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
export const DEFAULT_LIMIT = 50;

/**
 * Maximum limit for pagination
 */
export const MAX_LIMIT = 100;

/**
 * Minimum limit for pagination
 */
export const MIN_LIMIT = 1;

/**
 * Maximum content length for replies
 */
export const MAX_CONTENT_LENGTH = 50000;

/**
 * Maximum depth for nested replies
 */
export const MAX_REPLY_DEPTH = 5;

/**
 * Cache TTL for replies data (5 minutes)
 */
export const REPLIES_CACHE_TTL = 60 * 5;

// ============================================================================
// Types
// ============================================================================

/**
 * Query parameters for listing replies
 */
export type ReplyListQueryParams = {
  page: number;
  limit: number;
  sortDirection: "asc" | "desc";
  maxDepth: number;
};

/**
 * User info in response
 */
export type ReplyUserInfo = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Reply summary (without nested children)
 */
export type ReplySummary = {
  id: string;
  content: string;
  parentReplyId: string | null;
  user: ReplyUserInfo;
  createdAt: string;
  updatedAt: string;
  childReplies?: ReplySummary[];
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
 * Reply list response
 */
export type ReplyListResponse = {
  replies: ReplySummary[];
  pagination: PaginationInfo;
};

/**
 * Create reply input
 */
export type CreateReplyInput = {
  content: string;
  parentReplyId?: string | null | undefined;
};

/**
 * Create reply response
 */
export type CreateReplyResponse = {
  success: boolean;
  message: string;
  reply: ReplySummary;
};

/**
 * Discussion context (for access control)
 */
export type DiscussionContext = {
  id: string;
  groupId: string;
  isLocked: boolean;
  group: {
    id: string;
    isPublic: boolean;
  };
};

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for creating a reply
 */
export const createReplySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Content is required")
    .max(
      MAX_CONTENT_LENGTH,
      `Content must be at most ${MAX_CONTENT_LENGTH} characters`
    ),
  parentReplyId: z
    .string()
    .regex(/^c[a-z0-9]+$/, "Invalid parent reply ID format")
    .optional()
    .nullable(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate discussion ID format
 */
export function validateDiscussionId(id: unknown): string | null {
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
 * Parse sort direction
 */
export function parseSortDirection(value: unknown): "asc" | "desc" {
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (lower === "desc" || lower === "descending") {
      return "desc";
    }
  }
  return "asc"; // Oldest first by default for replies
}

/**
 * Parse max depth for nested replies
 */
export function parseMaxDepth(value: unknown): number {
  if (typeof value === "string") {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= MAX_REPLY_DEPTH) {
      return num;
    }
  }
  if (typeof value === "number" && value >= 1 && value <= MAX_REPLY_DEPTH) {
    return Math.floor(value);
  }
  return MAX_REPLY_DEPTH;
}

/**
 * Parse all query parameters for listing replies
 */
export function parseListRepliesQuery(query: {
  page?: unknown;
  limit?: unknown;
  sortDirection?: unknown;
  maxDepth?: unknown;
}): ReplyListQueryParams {
  return {
    page: parsePage(query.page),
    limit: parseLimit(query.limit),
    sortDirection: parseSortDirection(query.sortDirection),
    maxDepth: parseMaxDepth(query.maxDepth),
  };
}

/**
 * Build cache key for replies list
 */
export function buildRepliesCacheKey(
  discussionId: string,
  params: ReplyListQueryParams
): string {
  return [
    `${CacheKeyPrefix.USER}:discussion:${discussionId}:replies`,
    `p${params.page}`,
    `l${params.limit}`,
    `d${params.sortDirection}`,
    `m${params.maxDepth}`,
  ].join(":");
}

/**
 * Build cache key for discussion data
 */
export function buildDiscussionCacheKey(discussionId: string): string {
  return `${CacheKeyPrefix.USER}:discussion:${discussionId}`;
}

/**
 * Map user to response format
 */
export function mapToReplyUserInfo(user: {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}): ReplyUserInfo {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

/**
 * Map database reply to response format (flat)
 */
export function mapToReplySummary(reply: {
  id: string;
  content: string;
  parentReplyId: string | null;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}): ReplySummary {
  return {
    id: reply.id,
    content: reply.content,
    parentReplyId: reply.parentReplyId,
    user: mapToReplyUserInfo(reply.user),
    createdAt: formatDate(reply.createdAt),
    updatedAt: formatDate(reply.updatedAt),
  };
}

/**
 * Build nested reply tree from flat array
 */
export function buildReplyTree(
  flatReplies: ReplySummary[],
  maxDepth: number
): ReplySummary[] {
  // Create a map of all replies by ID
  const replyMap = new Map<string, ReplySummary>();
  for (const reply of flatReplies) {
    replyMap.set(reply.id, { ...reply, childReplies: [] });
  }

  // Build the tree
  const rootReplies: ReplySummary[] = [];

  for (const reply of flatReplies) {
    const node = replyMap.get(reply.id);
    if (!node) continue;
    if (reply.parentReplyId && replyMap.has(reply.parentReplyId)) {
      const parent = replyMap.get(reply.parentReplyId);
      if (parent) {
        if (!parent.childReplies) {
          parent.childReplies = [];
        }
        parent.childReplies.push(node);
      }
    } else {
      rootReplies.push(node);
    }
  }

  // Limit depth by flattening deep children
  function limitDepth(replies: ReplySummary[], currentDepth: number): void {
    for (const reply of replies) {
      if (currentDepth >= maxDepth) {
        // Remove children beyond max depth
        delete reply.childReplies;
      } else if (reply.childReplies && reply.childReplies.length > 0) {
        limitDepth(reply.childReplies, currentDepth + 1);
      }
    }
  }

  limitDepth(rootReplies, 1);

  return rootReplies;
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
 * Get depth of a reply in the tree
 */
export async function getReplyDepth(replyId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = replyId;

  while (currentId && depth < MAX_REPLY_DEPTH + 1) {
    const parentReply: { parentReplyId: string | null } | null =
      await db.discussionReply.findUnique({
        where: { id: currentId },
        select: { parentReplyId: true },
      });
    if (!parentReply || !parentReply.parentReplyId) {
      break;
    }
    currentId = parentReply.parentReplyId;
    depth++;
  }

  return depth;
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get discussion with group context
 */
async function getDiscussionContext(
  discussionId: string
): Promise<DiscussionContext | null> {
  const discussion = await db.groupDiscussion.findFirst({
    where: {
      id: discussionId,
      deletedAt: null,
    },
    select: {
      id: true,
      groupId: true,
      isLocked: true,
      group: {
        select: {
          id: true,
          isPublic: true,
        },
      },
    },
  });

  if (!discussion) return null;

  return {
    id: discussion.id,
    groupId: discussion.groupId,
    isLocked: discussion.isLocked,
    group: {
      id: discussion.group.id,
      isPublic: discussion.group.isPublic,
    },
  };
}

/**
 * List replies for a discussion (top-level only for pagination)
 */
async function listTopLevelReplies(
  discussionId: string,
  params: ReplyListQueryParams
) {
  const { page, limit, sortDirection } = params;
  const skip = (page - 1) * limit;

  const where = {
    discussionId,
    deletedAt: null,
    parentReplyId: null, // Top-level only
  };

  const [replies, total] = await Promise.all([
    db.discussionReply.findMany({
      where,
      orderBy: { createdAt: sortDirection },
      skip,
      take: limit,
      select: {
        id: true,
        content: true,
        parentReplyId: true,
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
    db.discussionReply.count({ where }),
  ]);

  return { replies, total };
}

/**
 * Get all nested replies for a set of top-level reply IDs
 */
async function getNestedReplies(
  discussionId: string,
  topLevelIds: string[]
): Promise<
  Array<{
    id: string;
    content: string;
    parentReplyId: string | null;
    user: {
      id: string;
      username: string | null;
      displayName: string | null;
      avatarUrl: string | null;
    };
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  if (topLevelIds.length === 0) return [];

  // Get all replies in this discussion that are not top-level
  // This is simpler than recursive queries and works for reasonable reply counts
  return db.discussionReply.findMany({
    where: {
      discussionId,
      deletedAt: null,
      parentReplyId: { not: null },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      parentReplyId: true,
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
}

/**
 * Create a reply
 */
async function createReply(
  discussionId: string,
  userId: string,
  input: CreateReplyInput
) {
  return db.$transaction(async (tx) => {
    // Create the reply
    const reply = await tx.discussionReply.create({
      data: {
        discussionId,
        userId,
        content: input.content,
        parentReplyId: input.parentReplyId ?? null,
      },
      select: {
        id: true,
        content: true,
        parentReplyId: true,
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

    // Update discussion stats
    await tx.groupDiscussion.update({
      where: { id: discussionId },
      data: {
        repliesCount: { increment: 1 },
        lastReplyAt: new Date(),
      },
    });

    return reply;
  });
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET and POST /api/discussions/:id/replies
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

  // Validate discussion ID
  const discussionId = validateDiscussionId(req.query.id);
  if (!discussionId) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "Invalid discussion ID", 400);
    return;
  }

  // Get discussion context
  const discussion = await getDiscussionContext(discussionId);
  if (!discussion) {
    sendError(res, ErrorCodes.NOT_FOUND, "Discussion not found", 404);
    return;
  }

  // Check membership
  const { isMember } = await checkMembership(discussion.groupId, user.id);

  // For private groups, must be a member to access
  if (!discussion.group.isPublic && !isMember) {
    sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "You must be a member to access this discussion",
      403
    );
    return;
  }

  if (req.method === "GET") {
    await handleGetReplies(req, res, discussionId);
  } else if (req.method === "POST") {
    await handleCreateReply(
      req,
      res,
      discussionId,
      user.id,
      isMember,
      discussion
    );
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
 * Handle GET /api/discussions/:id/replies
 */
async function handleGetReplies(
  req: AuthenticatedRequest,
  res: VercelResponse,
  discussionId: string
): Promise<void> {
  try {
    const params = parseListRepliesQuery(req.query);

    // Try cache first
    const cacheKey = buildRepliesCacheKey(discussionId, params);
    const cached = await cache.get<ReplyListResponse>(cacheKey);
    if (cached) {
      sendSuccess(res, cached);
      return;
    }

    // Fetch top-level replies with pagination
    const { replies: topLevelReplies, total } = await listTopLevelReplies(
      discussionId,
      params
    );

    // Get nested replies for these top-level replies
    const topLevelIds = topLevelReplies.map((r) => r.id);
    const nestedReplies = await getNestedReplies(discussionId, topLevelIds);

    // Combine and build tree
    const allReplies = [
      ...topLevelReplies.map(mapToReplySummary),
      ...nestedReplies.map(mapToReplySummary),
    ];
    const replyTree = buildReplyTree(allReplies, params.maxDepth);

    // Only return the top-level replies that were paginated
    const paginatedReplies = replyTree.filter(
      (r) => r.parentReplyId === null && topLevelIds.includes(r.id)
    );

    const response: ReplyListResponse = {
      replies: paginatedReplies,
      pagination: calculatePagination(params.page, params.limit, total),
    };

    // Cache the response
    await cache.set(cacheKey, response, { ttl: REPLIES_CACHE_TTL });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error listing replies", {
      discussionId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to list replies. Please try again.",
      500
    );
  }
}

/**
 * Handle POST /api/discussions/:id/replies
 */
async function handleCreateReply(
  req: AuthenticatedRequest,
  res: VercelResponse,
  discussionId: string,
  userId: string,
  isMember: boolean,
  discussion: DiscussionContext
): Promise<void> {
  // Must be a member to create replies
  if (!isMember) {
    sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "You must be a member to reply to this discussion",
      403
    );
    return;
  }

  // Check if discussion is locked
  if (discussion.isLocked) {
    sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "This discussion is locked and cannot receive new replies",
      403
    );
    return;
  }

  // Validate request body
  const validationResult = createReplySchema.safeParse(req.body);
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
  if (containsProfanity(input.content)) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Reply contains inappropriate language",
      400
    );
    return;
  }

  // If parent reply is specified, validate it
  if (input.parentReplyId) {
    const parentReply = await db.discussionReply.findFirst({
      where: {
        id: input.parentReplyId,
        discussionId,
        deletedAt: null,
      },
    });

    if (!parentReply) {
      sendError(res, ErrorCodes.NOT_FOUND, "Parent reply not found", 404);
      return;
    }

    // Check depth limit
    const depth = await getReplyDepth(input.parentReplyId);
    if (depth >= MAX_REPLY_DEPTH) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        `Maximum reply depth of ${MAX_REPLY_DEPTH} reached`,
        400
      );
      return;
    }
  }

  try {
    // Create reply
    const reply = await createReply(discussionId, userId, input);

    // Invalidate caches
    await Promise.all([
      cache.del(buildDiscussionCacheKey(discussionId)),
      cache.invalidatePattern(
        `${CacheKeyPrefix.USER}:discussion:${discussionId}:replies:*`
      ),
      cache.invalidatePattern(
        `${CacheKeyPrefix.USER}:group:${discussion.groupId}:discussions:*`
      ),
    ]);

    const response: CreateReplyResponse = {
      success: true,
      message: "Reply created successfully",
      reply: mapToReplySummary(reply),
    };

    logger.info("Reply created", {
      userId,
      discussionId,
      replyId: reply.id,
      parentReplyId: reply.parentReplyId,
    });

    sendSuccess(res, response, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error creating reply", {
      userId,
      discussionId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to create reply. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
