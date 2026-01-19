/**
 * Forum Reply Vote API
 *
 * POST /api/forum/replies/:id/vote - Vote on a forum reply
 *   - Creates or updates a vote (upvote/downvote)
 *   - Prevents duplicate votes (unique constraint)
 *   - Updates reply vote counts atomically
 *
 * DELETE /api/forum/replies/:id/vote - Remove vote from a forum reply
 *   - Removes the user's vote
 *   - Updates reply vote counts atomically
 *
 * @example
 * ```bash
 * # Upvote a reply
 * curl -X POST "/api/forum/replies/cabc456/vote" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"value":1}'
 *
 * # Downvote a reply
 * curl -X POST "/api/forum/replies/cabc456/vote" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"value":-1}'
 *
 * # Remove vote
 * curl -X DELETE "/api/forum/replies/cabc456/vote" \
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
import {
  forumReplyIdSchema,
  voteValueSchema,
} from "@read-master/shared/schemas";
import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

/**
 * Vote response
 */
export type ReplyVoteResponse = {
  replyId: string;
  value: number;
  upvotes: number;
  downvotes: number;
  voteScore: number;
};

/**
 * Create/Update vote response
 */
export type CreateReplyVoteResponse = {
  vote: ReplyVoteResponse;
};

/**
 * Remove vote response
 */
export type RemoveReplyVoteResponse = {
  success: boolean;
  message: string;
  replyId: string;
  upvotes: number;
  downvotes: number;
  voteScore: number;
};

/**
 * Zod schema for vote request body
 */
export const voteBodySchema = z.object({
  value: voteValueSchema,
});
export type VoteBody = z.infer<typeof voteBodySchema>;

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
 * Map to vote response format
 */
export function mapToVoteResponse(
  replyId: string,
  value: number,
  reply: { upvotes: number; downvotes: number; voteScore: number }
): ReplyVoteResponse {
  return {
    replyId,
    value,
    upvotes: reply.upvotes,
    downvotes: reply.downvotes,
    voteScore: reply.voteScore,
  };
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get reply by ID for validation
 */
async function getReplyById(replyId: string) {
  return db.forumReply.findUnique({
    where: {
      id: replyId,
      deletedAt: null,
    },
    select: {
      id: true,
      upvotes: true,
      downvotes: true,
      voteScore: true,
      post: {
        select: {
          id: true,
          deletedAt: true,
          category: {
            select: {
              isActive: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Get existing vote
 */
async function getExistingVote(userId: string, replyId: string) {
  return db.forumVote.findUnique({
    where: {
      userId_replyId: {
        userId,
        replyId,
      },
    },
    select: {
      id: true,
      value: true,
    },
  });
}

/**
 * Create or update vote with transaction
 */
async function upsertVote(
  userId: string,
  replyId: string,
  value: number,
  existingVote: { id: string; value: number } | null
) {
  return db.$transaction(async (tx) => {
    if (existingVote) {
      // Calculate the delta for vote counts
      const oldValue = existingVote.value;
      const valueChanged = oldValue !== value;

      if (valueChanged) {
        // Update existing vote
        await tx.forumVote.update({
          where: { id: existingVote.id },
          data: { value },
        });

        // Update reply counts based on change
        const upvoteDelta = value === 1 ? 1 : 0 - (oldValue === 1 ? 1 : 0);
        const downvoteDelta = value === -1 ? 1 : 0 - (oldValue === -1 ? 1 : 0);

        await tx.forumReply.update({
          where: { id: replyId },
          data: {
            upvotes: { increment: upvoteDelta },
            downvotes: { increment: downvoteDelta },
            voteScore: { increment: value - oldValue },
          },
        });
      }
    } else {
      // Create new vote
      await tx.forumVote.create({
        data: {
          userId,
          replyId,
          value,
        },
      });

      // Update reply counts - build data object conditionally
      type UpdateData = {
        upvotes?: { increment: number };
        downvotes?: { increment: number };
        voteScore: { increment: number };
      };
      const updateData: UpdateData = {
        voteScore: { increment: value },
      };
      if (value === 1) {
        updateData.upvotes = { increment: 1 };
      } else {
        updateData.downvotes = { increment: 1 };
      }
      await tx.forumReply.update({
        where: { id: replyId },
        data: updateData,
      });
    }

    // Get updated reply counts
    return tx.forumReply.findUnique({
      where: { id: replyId },
      select: {
        upvotes: true,
        downvotes: true,
        voteScore: true,
      },
    });
  });
}

/**
 * Remove vote with transaction
 */
async function removeVote(
  _userId: string,
  replyId: string,
  existingVote: { id: string; value: number }
) {
  return db.$transaction(async (tx) => {
    // Delete the vote
    await tx.forumVote.delete({
      where: { id: existingVote.id },
    });

    // Update reply counts - build data object conditionally
    type UpdateData = {
      upvotes?: { decrement: number };
      downvotes?: { decrement: number };
      voteScore: { decrement: number };
    };
    const updateData: UpdateData = {
      voteScore: { decrement: existingVote.value },
    };
    if (existingVote.value === 1) {
      updateData.upvotes = { decrement: 1 };
    } else {
      updateData.downvotes = { decrement: 1 };
    }
    await tx.forumReply.update({
      where: { id: replyId },
      data: updateData,
    });

    // Get updated reply counts
    return tx.forumReply.findUnique({
      where: { id: replyId },
      select: {
        upvotes: true,
        downvotes: true,
        voteScore: true,
      },
    });
  });
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handle POST /api/forum/replies/:id/vote
 */
async function handleCreateVote(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string },
  replyId: string
): Promise<void> {
  try {
    // Get reply and validate
    const reply = await getReplyById(replyId);

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

    // Validate request body
    const parseResult = voteBodySchema.safeParse(req.body);
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

    const { value } = parseResult.data;

    // Get existing vote
    const existingVote = await getExistingVote(user.id, replyId);

    // Create or update vote
    const updatedReply = await upsertVote(
      user.id,
      replyId,
      value,
      existingVote
    );

    if (!updatedReply) {
      sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to update vote", 500);
      return;
    }

    const response: CreateReplyVoteResponse = {
      vote: mapToVoteResponse(replyId, value, updatedReply),
    };

    logger.info("Forum reply vote recorded", {
      userId: user.id,
      replyId,
      value,
      isUpdate: !!existingVote,
    });

    sendSuccess(res, response, existingVote ? 200 : 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error voting on forum reply", {
      userId: user.id,
      replyId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to vote. Please try again.",
      500
    );
  }
}

/**
 * Handle DELETE /api/forum/replies/:id/vote
 */
async function handleRemoveVote(
  _req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string },
  replyId: string
): Promise<void> {
  try {
    // Get reply and validate
    const reply = await getReplyById(replyId);

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

    // Get existing vote
    const existingVote = await getExistingVote(user.id, replyId);

    if (!existingVote) {
      sendError(res, ErrorCodes.NOT_FOUND, "Vote not found", 404);
      return;
    }

    // Remove vote
    const updatedReply = await removeVote(user.id, replyId, existingVote);

    if (!updatedReply) {
      sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to remove vote", 500);
      return;
    }

    const response: RemoveReplyVoteResponse = {
      success: true,
      message: "Vote removed successfully",
      replyId,
      upvotes: updatedReply.upvotes,
      downvotes: updatedReply.downvotes,
      voteScore: updatedReply.voteScore,
    };

    logger.info("Forum reply vote removed", {
      userId: user.id,
      replyId,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error removing forum reply vote", {
      userId: user.id,
      replyId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to remove vote. Please try again.",
      500
    );
  }
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Main handler for /api/forum/replies/:id/vote
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
      await handleCreateVote(req, res, user, replyId);
      break;
    case "DELETE":
      await handleRemoveVote(req, res, user, replyId);
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
