/**
 * Forum Post Replies API
 *
 * POST /api/forum/posts/:id/replies - Create a reply to a forum post
 *   - Validates content with Zod schema and profanity filter
 *   - Supports nested replies (parentReplyId)
 *   - Updates post reply count and lastReplyAt
 *
 * @example
 * ```bash
 * # Create a top-level reply
 * curl -X POST "/api/forum/posts/cxyz123/replies" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"content":"This is my reply..."}'
 *
 * # Create a nested reply
 * curl -X POST "/api/forum/posts/cxyz123/replies" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"content":"This is a nested reply...","parentReplyId":"cabc456"}'
 * ```
 */

import type { VercelResponse } from "@vercel/node";

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
import {
  forumPostIdSchema,
  forumReplyContentPublicSchema,
  forumReplyIdSchema,
} from "@read-master/shared/schemas";
import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum reply depth allowed for nesting
 */
export const MAX_REPLY_DEPTH = 5;

// ============================================================================
// Types
// ============================================================================

/**
 * User info in reply response
 */
export type ReplyUserInfo = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Forum reply response
 */
export type ForumReplyResponse = {
  id: string;
  postId: string;
  content: string;
  userId: string;
  user: ReplyUserInfo;
  parentReplyId: string | null;
  upvotes: number;
  downvotes: number;
  voteScore: number;
  isBestAnswer: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Create reply response
 */
export type CreateReplyResponse = {
  reply: ForumReplyResponse;
};

/**
 * Zod schema for create reply request body
 */
export const createReplyBodySchema = z.object({
  content: forumReplyContentPublicSchema,
  parentReplyId: forumReplyIdSchema.optional().nullable(),
});
export type CreateReplyBody = z.infer<typeof createReplyBodySchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format date as ISO string
 */
export function formatDateRequired(date: Date): string {
  return date.toISOString();
}

/**
 * Parse post ID from request
 */
export function parsePostId(value: unknown): string | null {
  if (typeof value === "string") {
    const result = forumPostIdSchema.safeParse(value);
    if (result.success) {
      return result.data;
    }
  }
  return null;
}

/**
 * Map user to response format
 */
export function mapToUserInfo(user: {
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
 * Map reply to response format
 */
export function mapToReplyResponse(reply: {
  id: string;
  postId: string;
  content: string;
  userId: string;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  parentReplyId: string | null;
  upvotes: number;
  downvotes: number;
  voteScore: number;
  isBestAnswer: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ForumReplyResponse {
  return {
    id: reply.id,
    postId: reply.postId,
    content: reply.content,
    userId: reply.userId,
    user: mapToUserInfo(reply.user),
    parentReplyId: reply.parentReplyId,
    upvotes: reply.upvotes,
    downvotes: reply.downvotes,
    voteScore: reply.voteScore,
    isBestAnswer: reply.isBestAnswer,
    createdAt: formatDateRequired(reply.createdAt),
    updatedAt: formatDateRequired(reply.updatedAt),
  };
}

/**
 * Calculate the depth of a reply chain
 */
export async function calculateReplyDepth(
  parentReplyId: string
): Promise<number> {
  let depth = 0;
  let currentReplyId: string | null = parentReplyId;

  while (currentReplyId && depth < MAX_REPLY_DEPTH + 1) {
    const parentReply: { parentReplyId: string | null } | null =
      await db.forumReply.findUnique({
        where: { id: currentReplyId },
        select: { parentReplyId: true },
      });

    if (!parentReply) break;

    depth++;
    currentReplyId = parentReply.parentReplyId;
  }

  return depth;
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get post by ID for validation
 */
async function getPostById(postId: string) {
  return db.forumPost.findUnique({
    where: {
      id: postId,
      deletedAt: null,
    },
    select: {
      id: true,
      isLocked: true,
      category: {
        select: {
          isActive: true,
          isLocked: true,
        },
      },
    },
  });
}

/**
 * Get parent reply for validation
 */
async function getParentReply(replyId: string, postId: string) {
  return db.forumReply.findFirst({
    where: {
      id: replyId,
      postId,
      deletedAt: null,
    },
    select: {
      id: true,
      parentReplyId: true,
    },
  });
}

/**
 * Create a forum reply with transaction
 */
async function createReply(
  postId: string,
  userId: string,
  content: string,
  parentReplyId: string | null
) {
  const now = new Date();

  return db.$transaction(async (tx) => {
    // Create the reply
    const reply = await tx.forumReply.create({
      data: {
        postId,
        userId,
        content,
        parentReplyId,
      },
      select: {
        id: true,
        postId: true,
        content: true,
        userId: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        parentReplyId: true,
        upvotes: true,
        downvotes: true,
        voteScore: true,
        isBestAnswer: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Update post stats
    await tx.forumPost.update({
      where: { id: postId },
      data: {
        repliesCount: { increment: 1 },
        lastReplyAt: now,
        lastReplyId: reply.id,
      },
    });

    return reply;
  });
}

// ============================================================================
// Handler
// ============================================================================

/**
 * Handle POST /api/forum/posts/:id/replies
 */
async function handleCreateReply(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string },
  postId: string
): Promise<void> {
  try {
    // Get post and validate
    const post = await getPostById(postId);

    if (!post) {
      sendError(res, ErrorCodes.NOT_FOUND, "Post not found", 404);
      return;
    }

    // Check post is not locked
    if (post.isLocked) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "This post is locked and not accepting new replies",
        403
      );
      return;
    }

    // Check category is active and not locked
    if (!post.category.isActive) {
      sendError(res, ErrorCodes.NOT_FOUND, "Post not found", 404);
      return;
    }

    if (post.category.isLocked) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "This category is locked and not accepting new replies",
        403
      );
      return;
    }

    // Validate request body
    const parseResult = createReplyBodySchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten();
      const errorMessages = [
        ...Object.values(errors.fieldErrors).flat(),
        ...errors.formErrors,
      ].filter(Boolean);
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        errorMessages[0] || "Validation failed",
        400
      );
      return;
    }

    const { content, parentReplyId } = parseResult.data;

    // Validate parent reply if provided
    if (parentReplyId) {
      const parentReply = await getParentReply(parentReplyId, postId);

      if (!parentReply) {
        sendError(
          res,
          ErrorCodes.NOT_FOUND,
          "Parent reply not found or does not belong to this post",
          404
        );
        return;
      }

      // Check reply depth
      const depth = await calculateReplyDepth(parentReplyId);
      if (depth >= MAX_REPLY_DEPTH) {
        sendError(
          res,
          ErrorCodes.VALIDATION_ERROR,
          `Maximum reply depth of ${MAX_REPLY_DEPTH} has been reached`,
          400
        );
        return;
      }
    }

    // Create the reply
    const reply = await createReply(
      postId,
      user.id,
      content,
      parentReplyId ?? null
    );

    const response: CreateReplyResponse = {
      reply: mapToReplyResponse(reply),
    };

    logger.info("Forum reply created", {
      userId: user.id,
      postId,
      replyId: reply.id,
      parentReplyId: parentReplyId ?? null,
    });

    sendSuccess(res, response, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error creating forum reply", {
      userId: user.id,
      postId,
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

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Main handler for /api/forum/posts/:id/replies
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

  // Parse and validate post ID from URL
  const postId = parsePostId(req.query.id);
  if (!postId) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "Invalid post ID", 400);
    return;
  }

  switch (req.method) {
    case "POST":
      await handleCreateReply(req, res, user, postId);
      break;
    default:
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Method not allowed. Use POST.",
        405
      );
  }
}

export default withAuth(handler);
