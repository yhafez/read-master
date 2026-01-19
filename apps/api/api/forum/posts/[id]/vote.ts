/**
 * Forum Post Vote API
 *
 * POST /api/forum/posts/:id/vote - Vote on a forum post
 *   - Creates or updates a vote (upvote/downvote)
 *   - Prevents duplicate votes (unique constraint)
 *   - Updates post vote counts atomically
 *
 * DELETE /api/forum/posts/:id/vote - Remove vote from a forum post
 *   - Removes the user's vote
 *   - Updates post vote counts atomically
 *
 * @example
 * ```bash
 * # Upvote a post
 * curl -X POST "/api/forum/posts/cxyz123/vote" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"value":1}'
 *
 * # Downvote a post
 * curl -X POST "/api/forum/posts/cxyz123/vote" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"value":-1}'
 *
 * # Remove vote
 * curl -X DELETE "/api/forum/posts/cxyz123/vote" \
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
  forumPostIdSchema,
  voteValueSchema,
} from "@read-master/shared/schemas";
import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

/**
 * Vote response
 */
export type VoteResponse = {
  postId: string;
  value: number;
  upvotes: number;
  downvotes: number;
  voteScore: number;
};

/**
 * Create/Update vote response
 */
export type CreateVoteResponse = {
  vote: VoteResponse;
};

/**
 * Remove vote response
 */
export type RemoveVoteResponse = {
  success: boolean;
  message: string;
  postId: string;
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
 * Get post vote counts
 */
export function mapToVoteResponse(
  postId: string,
  value: number,
  post: { upvotes: number; downvotes: number; voteScore: number }
): VoteResponse {
  return {
    postId,
    value,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    voteScore: post.voteScore,
  };
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
      upvotes: true,
      downvotes: true,
      voteScore: true,
      category: {
        select: {
          isActive: true,
        },
      },
    },
  });
}

/**
 * Get existing vote
 */
async function getExistingVote(userId: string, postId: string) {
  return db.forumVote.findUnique({
    where: {
      userId_postId: {
        userId,
        postId,
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
  postId: string,
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

        // Update post counts based on change
        const upvoteDelta = value === 1 ? 1 : 0 - (oldValue === 1 ? 1 : 0);
        const downvoteDelta = value === -1 ? 1 : 0 - (oldValue === -1 ? 1 : 0);

        await tx.forumPost.update({
          where: { id: postId },
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
          postId,
          value,
        },
      });

      // Update post counts - build data object conditionally
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
      await tx.forumPost.update({
        where: { id: postId },
        data: updateData,
      });
    }

    // Get updated post counts
    return tx.forumPost.findUnique({
      where: { id: postId },
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
  postId: string,
  existingVote: { id: string; value: number }
) {
  return db.$transaction(async (tx) => {
    // Delete the vote
    await tx.forumVote.delete({
      where: { id: existingVote.id },
    });

    // Update post counts - build data object conditionally
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
    await tx.forumPost.update({
      where: { id: postId },
      data: updateData,
    });

    // Get updated post counts
    return tx.forumPost.findUnique({
      where: { id: postId },
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
 * Handle POST /api/forum/posts/:id/vote
 */
async function handleCreateVote(
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

    // Check category is active
    if (!post.category.isActive) {
      sendError(res, ErrorCodes.NOT_FOUND, "Post not found", 404);
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
    const existingVote = await getExistingVote(user.id, postId);

    // Create or update vote
    const updatedPost = await upsertVote(user.id, postId, value, existingVote);

    if (!updatedPost) {
      sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to update vote", 500);
      return;
    }

    const response: CreateVoteResponse = {
      vote: mapToVoteResponse(postId, value, updatedPost),
    };

    logger.info("Forum post vote recorded", {
      userId: user.id,
      postId,
      value,
      isUpdate: !!existingVote,
    });

    sendSuccess(res, response, existingVote ? 200 : 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error voting on forum post", {
      userId: user.id,
      postId,
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
 * Handle DELETE /api/forum/posts/:id/vote
 */
async function handleRemoveVote(
  _req: AuthenticatedRequest,
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

    // Check category is active
    if (!post.category.isActive) {
      sendError(res, ErrorCodes.NOT_FOUND, "Post not found", 404);
      return;
    }

    // Get existing vote
    const existingVote = await getExistingVote(user.id, postId);

    if (!existingVote) {
      sendError(res, ErrorCodes.NOT_FOUND, "Vote not found", 404);
      return;
    }

    // Remove vote
    const updatedPost = await removeVote(user.id, postId, existingVote);

    if (!updatedPost) {
      sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to remove vote", 500);
      return;
    }

    const response: RemoveVoteResponse = {
      success: true,
      message: "Vote removed successfully",
      postId,
      upvotes: updatedPost.upvotes,
      downvotes: updatedPost.downvotes,
      voteScore: updatedPost.voteScore,
    };

    logger.info("Forum post vote removed", {
      userId: user.id,
      postId,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error removing forum post vote", {
      userId: user.id,
      postId,
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
 * Main handler for /api/forum/posts/:id/vote
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
      await handleCreateVote(req, res, user, postId);
      break;
    case "DELETE":
      await handleRemoveVote(req, res, user, postId);
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
