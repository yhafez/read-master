/**
 * Forum Reply Best Answer API
 *
 * POST /api/forum/replies/:id/best-answer - Mark a reply as the best answer
 *   - Only the original post author can mark best answer
 *   - Unmarks any previously marked best answer for the same post
 *   - Sets post.isAnswered = true
 *
 * DELETE /api/forum/replies/:id/best-answer - Unmark a reply as best answer
 *   - Only the original post author can unmark
 *   - Sets post.isAnswered = false if no other best answers exist
 *
 * @example
 * ```bash
 * # Mark reply as best answer
 * curl -X POST "/api/forum/replies/cabc456/best-answer" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Unmark best answer
 * curl -X DELETE "/api/forum/replies/cabc456/best-answer" \
 *   -H "Authorization: Bearer <token>"
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
import { forumReplyIdSchema } from "@read-master/shared/schemas";

// ============================================================================
// Types
// ============================================================================

/**
 * Reply info in response
 */
export type ReplyInfo = {
  id: string;
  isBestAnswer: boolean;
  postId: string;
};

/**
 * Post info in response
 */
export type PostInfo = {
  id: string;
  isAnswered: boolean;
};

/**
 * Mark best answer response
 */
export type MarkBestAnswerResponse = {
  reply: ReplyInfo;
  post: PostInfo;
  previousBestAnswerId: string | null;
};

/**
 * Unmark best answer response
 */
export type UnmarkBestAnswerResponse = {
  success: boolean;
  message: string;
  reply: ReplyInfo;
  post: PostInfo;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse reply ID from request
 */
export function parseReplyId(value: unknown): string | null {
  if (typeof value === "string") {
    const result = forumReplyIdSchema.safeParse(value);
    if (result.success) {
      return result.data;
    }
  }
  return null;
}

/**
 * Format date to ISO string or null
 */
export function formatDateOptional(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get reply by ID with post and author info
 */
async function getReplyWithPost(replyId: string) {
  return db.forumReply.findUnique({
    where: {
      id: replyId,
      deletedAt: null,
    },
    select: {
      id: true,
      isBestAnswer: true,
      postId: true,
      post: {
        select: {
          id: true,
          userId: true,
          isAnswered: true,
          isLocked: true,
          deletedAt: true,
          category: {
            select: {
              isActive: true,
              isLocked: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Mark reply as best answer with transaction
 * - Unmarks any previous best answer
 * - Marks the new reply as best answer
 * - Sets post.isAnswered = true
 */
async function markBestAnswer(replyId: string, postId: string) {
  return db.$transaction(async (tx) => {
    // Get current best answer (if any)
    const previousBestAnswer = await tx.forumReply.findFirst({
      where: {
        postId,
        isBestAnswer: true,
        deletedAt: null,
        id: { not: replyId },
      },
      select: { id: true },
    });

    // Unmark previous best answer if exists
    if (previousBestAnswer) {
      await tx.forumReply.update({
        where: { id: previousBestAnswer.id },
        data: { isBestAnswer: false },
      });
    }

    // Mark new reply as best answer
    const updatedReply = await tx.forumReply.update({
      where: { id: replyId },
      data: { isBestAnswer: true },
    });

    // Set post as answered
    const updatedPost = await tx.forumPost.update({
      where: { id: postId },
      data: { isAnswered: true },
    });

    return {
      reply: updatedReply,
      post: updatedPost,
      previousBestAnswerId: previousBestAnswer?.id ?? null,
    };
  });
}

/**
 * Unmark reply as best answer with transaction
 * - Unmarks the reply
 * - Sets post.isAnswered = false if no other best answers
 */
async function unmarkBestAnswer(replyId: string, postId: string) {
  return db.$transaction(async (tx) => {
    // Unmark reply
    const updatedReply = await tx.forumReply.update({
      where: { id: replyId },
      data: { isBestAnswer: false },
    });

    // Check if there are other best answers
    const otherBestAnswer = await tx.forumReply.findFirst({
      where: {
        postId,
        isBestAnswer: true,
        deletedAt: null,
        id: { not: replyId },
      },
      select: { id: true },
    });

    // Set post as not answered if no other best answers
    const updatedPost = await tx.forumPost.update({
      where: { id: postId },
      data: {
        isAnswered: otherBestAnswer !== null,
      },
    });

    return {
      reply: updatedReply,
      post: updatedPost,
    };
  });
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handle POST /api/forum/replies/:id/best-answer
 * Mark a reply as the best answer
 */
async function handleMarkBestAnswer(
  _req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string },
  replyId: string
): Promise<void> {
  try {
    // Get reply with post info
    const reply = await getReplyWithPost(replyId);

    if (!reply) {
      sendError(res, ErrorCodes.NOT_FOUND, "Reply not found", 404);
      return;
    }

    // Check post is not deleted
    if (reply.post.deletedAt !== null) {
      sendError(res, ErrorCodes.NOT_FOUND, "Reply not found", 404);
      return;
    }

    // Check category is active
    if (!reply.post.category.isActive) {
      sendError(res, ErrorCodes.NOT_FOUND, "Reply not found", 404);
      return;
    }

    // Check user is the post author (only OP can mark best answer)
    if (reply.post.userId !== user.id) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Only the post author can mark best answers",
        403
      );
      return;
    }

    // Check post is not locked
    if (reply.post.isLocked) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Cannot modify best answer on a locked post",
        403
      );
      return;
    }

    // Check reply is not already marked as best answer
    if (reply.isBestAnswer) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Reply is already marked as best answer",
        400
      );
      return;
    }

    // Mark as best answer
    const result = await markBestAnswer(replyId, reply.postId);

    const response: MarkBestAnswerResponse = {
      reply: {
        id: result.reply.id,
        isBestAnswer: result.reply.isBestAnswer,
        postId: reply.postId,
      },
      post: {
        id: result.post.id,
        isAnswered: result.post.isAnswered,
      },
      previousBestAnswerId: result.previousBestAnswerId,
    };

    logger.info("Forum reply marked as best answer", {
      userId: user.id,
      replyId,
      postId: reply.postId,
      previousBestAnswerId: result.previousBestAnswerId,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error marking forum reply as best answer", {
      userId: user.id,
      replyId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to mark best answer. Please try again.",
      500
    );
  }
}

/**
 * Handle DELETE /api/forum/replies/:id/best-answer
 * Unmark a reply as the best answer
 */
async function handleUnmarkBestAnswer(
  _req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string },
  replyId: string
): Promise<void> {
  try {
    // Get reply with post info
    const reply = await getReplyWithPost(replyId);

    if (!reply) {
      sendError(res, ErrorCodes.NOT_FOUND, "Reply not found", 404);
      return;
    }

    // Check post is not deleted
    if (reply.post.deletedAt !== null) {
      sendError(res, ErrorCodes.NOT_FOUND, "Reply not found", 404);
      return;
    }

    // Check category is active
    if (!reply.post.category.isActive) {
      sendError(res, ErrorCodes.NOT_FOUND, "Reply not found", 404);
      return;
    }

    // Check user is the post author
    if (reply.post.userId !== user.id) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Only the post author can unmark best answers",
        403
      );
      return;
    }

    // Check post is not locked
    if (reply.post.isLocked) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Cannot modify best answer on a locked post",
        403
      );
      return;
    }

    // Check reply is marked as best answer
    if (!reply.isBestAnswer) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Reply is not marked as best answer",
        400
      );
      return;
    }

    // Unmark as best answer
    const result = await unmarkBestAnswer(replyId, reply.postId);

    const response: UnmarkBestAnswerResponse = {
      success: true,
      message: "Best answer unmarked successfully",
      reply: {
        id: result.reply.id,
        isBestAnswer: result.reply.isBestAnswer,
        postId: reply.postId,
      },
      post: {
        id: result.post.id,
        isAnswered: result.post.isAnswered,
      },
    };

    logger.info("Forum reply unmarked as best answer", {
      userId: user.id,
      replyId,
      postId: reply.postId,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error unmarking forum reply as best answer", {
      userId: user.id,
      replyId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to unmark best answer. Please try again.",
      500
    );
  }
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Main handler for /api/forum/replies/:id/best-answer
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

  // Parse and validate reply ID from URL
  const replyId = parseReplyId(req.query.id);
  if (!replyId) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "Invalid reply ID", 400);
    return;
  }

  switch (req.method) {
    case "POST":
      await handleMarkBestAnswer(req, res, user, replyId);
      break;
    case "DELETE":
      await handleUnmarkBestAnswer(req, res, user, replyId);
      break;
    default:
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Method not allowed. Use POST or DELETE.",
        405
      );
  }
}

export default withAuth(handler);
