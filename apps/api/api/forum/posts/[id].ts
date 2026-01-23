/**
 * Forum Post Detail API
 *
 * GET /api/forum/posts/:id - Get a single forum post with replies
 *   - Returns full post content with replies
 *   - Increments view count
 *
 * PUT /api/forum/posts/:id - Update a forum post
 *   - Only post author can update
 *   - Validates title and content with Zod schema
 *   - Applies profanity filter
 *
 * DELETE /api/forum/posts/:id - Soft delete a forum post
 *   - Only post author can delete
 *   - Soft deletes the post (sets deletedAt)
 *   - Updates category post count
 *
 * @example
 * ```bash
 * # Get post details
 * curl -X GET "/api/forum/posts/cxyz123" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Update post
 * curl -X PUT "/api/forum/posts/cxyz123" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"title":"Updated Title","content":"Updated content..."}'
 *
 * # Delete post
 * curl -X DELETE "/api/forum/posts/cxyz123" \
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
import {
  forumPostIdSchema,
  updateForumPostSchema,
} from "@read-master/shared/schemas";

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum reply depth to fetch
 */
export const MAX_REPLY_DEPTH = 5;

/**
 * Default replies per page
 */
export const DEFAULT_REPLIES_LIMIT = 50;

// ============================================================================
// Types
// ============================================================================

/**
 * User info in response
 */
export type PostUserInfo = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Category info in response
 */
export type PostCategoryInfo = {
  id: string;
  slug: string;
  name: string;
  color: string | null;
};

/**
 * Book info in response
 */
export type PostBookInfo = {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
};

/**
 * Reply info in response
 */
export type ForumReplyInfo = {
  id: string;
  content: string;
  userId: string;
  user: PostUserInfo;
  parentReplyId: string | null;
  upvotes: number;
  downvotes: number;
  voteScore: number;
  isBestAnswer: boolean;
  currentUserVote: number; // 1 for upvote, -1 for downvote, 0 for no vote
  createdAt: string;
  updatedAt: string;
};

/**
 * Full post detail response
 */
export type ForumPostDetailResponse = {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  category: PostCategoryInfo;
  userId: string;
  user: PostUserInfo;
  bookId: string | null;
  book: PostBookInfo | null;
  isPinned: boolean;
  isLocked: boolean;
  isFeatured: boolean;
  isAnswered: boolean;
  upvotes: number;
  downvotes: number;
  voteScore: number;
  currentUserVote: number; // 1 for upvote, -1 for downvote, 0 for no vote
  viewCount: number;
  repliesCount: number;
  replies: ForumReplyInfo[];
  lastReplyAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Get post response
 */
export type GetPostResponse = {
  post: ForumPostDetailResponse;
};

/**
 * Update post response
 */
export type UpdatePostResponse = {
  post: ForumPostDetailResponse;
};

/**
 * Delete post response
 */
export type DeletePostResponse = {
  success: boolean;
  message: string;
};

// ============================================================================
// Helper Functions
// ============================================================================

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
}): PostUserInfo {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

/**
 * Map category to response format
 */
export function mapToCategoryInfo(category: {
  id: string;
  slug: string;
  name: string;
  color: string | null;
}): PostCategoryInfo {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    color: category.color,
  };
}

/**
 * Map book to response format
 */
export function mapToBookInfo(
  book: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
  } | null
): PostBookInfo | null {
  if (!book) return null;
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverImage: book.coverImage,
  };
}

/**
 * Map reply to response format
 */
export function mapToReplyInfo(
  reply: {
    id: string;
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
  },
  userVotesMap: Map<string, number>
): ForumReplyInfo {
  return {
    id: reply.id,
    content: reply.content,
    userId: reply.userId,
    user: mapToUserInfo(reply.user),
    parentReplyId: reply.parentReplyId,
    upvotes: reply.upvotes,
    downvotes: reply.downvotes,
    voteScore: reply.voteScore,
    isBestAnswer: reply.isBestAnswer,
    currentUserVote: userVotesMap.get(reply.id) ?? 0,
    createdAt: formatDateRequired(reply.createdAt),
    updatedAt: formatDateRequired(reply.updatedAt),
  };
}

/**
 * User votes for post and replies
 */
export type UserVotes = {
  postVote: number; // 1, -1, or 0
  replyVotes: Map<string, number>; // replyId -> vote value
};

/**
 * Map post to full detail response
 */
export function mapToPostDetailResponse(
  post: {
    id: string;
    title: string;
    content: string;
    categoryId: string;
    category: {
      id: string;
      slug: string;
      name: string;
      color: string | null;
    };
    userId: string;
    user: {
      id: string;
      username: string | null;
      displayName: string | null;
      avatarUrl: string | null;
    };
    bookId: string | null;
    book: {
      id: string;
      title: string;
      author: string | null;
      coverImage: string | null;
    } | null;
    isPinned: boolean;
    isLocked: boolean;
    isFeatured: boolean;
    isAnswered: boolean;
    upvotes: number;
    downvotes: number;
    voteScore: number;
    viewCount: number;
    repliesCount: number;
    replies: Array<{
      id: string;
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
    }>;
    lastReplyAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  userVotes: UserVotes
): ForumPostDetailResponse {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    categoryId: post.categoryId,
    category: mapToCategoryInfo(post.category),
    userId: post.userId,
    user: mapToUserInfo(post.user),
    bookId: post.bookId,
    book: mapToBookInfo(post.book),
    isPinned: post.isPinned,
    isLocked: post.isLocked,
    isFeatured: post.isFeatured,
    isAnswered: post.isAnswered,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    voteScore: post.voteScore,
    currentUserVote: userVotes.postVote,
    viewCount: post.viewCount,
    repliesCount: post.repliesCount,
    replies: post.replies.map((reply) =>
      mapToReplyInfo(reply, userVotes.replyVotes)
    ),
    lastReplyAt: formatDate(post.lastReplyAt),
    createdAt: formatDateRequired(post.createdAt),
    updatedAt: formatDateRequired(post.updatedAt),
  };
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get post by ID with full details including replies
 */
async function getPostById(postId: string) {
  return db.forumPost.findUnique({
    where: {
      id: postId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      content: true,
      categoryId: true,
      category: {
        select: {
          id: true,
          slug: true,
          name: true,
          color: true,
          isActive: true,
        },
      },
      userId: true,
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      bookId: true,
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          coverImage: true,
        },
      },
      isPinned: true,
      isLocked: true,
      isFeatured: true,
      isAnswered: true,
      upvotes: true,
      downvotes: true,
      voteScore: true,
      viewCount: true,
      repliesCount: true,
      replies: {
        where: {
          deletedAt: null,
        },
        orderBy: [{ isBestAnswer: "desc" }, { createdAt: "asc" }],
        take: DEFAULT_REPLIES_LIMIT,
        select: {
          id: true,
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
      },
      lastReplyAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Increment view count for a post
 */
async function incrementViewCount(postId: string) {
  return db.forumPost.update({
    where: { id: postId },
    data: {
      viewCount: { increment: 1 },
    },
    select: { viewCount: true },
  });
}

/**
 * Get user's votes for a post and its replies
 */
async function getUserVotes(
  userId: string,
  postId: string,
  replyIds: string[]
): Promise<UserVotes> {
  // Fetch the user's vote on the post
  const postVote = await db.forumVote.findUnique({
    where: {
      userId_postId: {
        userId,
        postId,
      },
    },
    select: { value: true },
  });

  // Fetch the user's votes on replies
  const replyVotes = await db.forumVote.findMany({
    where: {
      userId,
      replyId: { in: replyIds },
    },
    select: { replyId: true, value: true },
  });

  // Build the reply votes map
  const replyVotesMap = new Map<string, number>();
  replyVotes.forEach((vote) => {
    if (vote.replyId) {
      replyVotesMap.set(vote.replyId, vote.value);
    }
  });

  return {
    postVote: postVote?.value ?? 0,
    replyVotes: replyVotesMap,
  };
}

/**
 * Update a forum post
 */
async function updatePost(
  postId: string,
  data: { title?: string; content?: string }
) {
  return db.forumPost.update({
    where: { id: postId },
    data,
    select: {
      id: true,
      title: true,
      content: true,
      categoryId: true,
      category: {
        select: {
          id: true,
          slug: true,
          name: true,
          color: true,
        },
      },
      userId: true,
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      bookId: true,
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          coverImage: true,
        },
      },
      isPinned: true,
      isLocked: true,
      isFeatured: true,
      isAnswered: true,
      upvotes: true,
      downvotes: true,
      voteScore: true,
      viewCount: true,
      repliesCount: true,
      replies: {
        where: {
          deletedAt: null,
        },
        orderBy: [{ isBestAnswer: "desc" }, { createdAt: "asc" }],
        take: DEFAULT_REPLIES_LIMIT,
        select: {
          id: true,
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
      },
      lastReplyAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Soft delete a forum post and update category stats
 */
async function softDeletePost(postId: string, categoryId: string) {
  const now = new Date();

  return db.$transaction(async (tx) => {
    // Soft delete the post
    await tx.forumPost.update({
      where: { id: postId },
      data: {
        deletedAt: now,
      },
    });

    // Update category post count
    await tx.forumCategory.update({
      where: { id: categoryId },
      data: {
        postsCount: { decrement: 1 },
      },
    });

    return { success: true };
  });
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handle GET /api/forum/posts/:id
 */
async function handleGetPost(
  _req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string },
  postId: string
): Promise<void> {
  try {
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

    // Increment view count (fire and forget)
    incrementViewCount(postId).catch((err) => {
      logger.warn("Failed to increment view count", {
        postId,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    });

    // Fetch user's votes for post and replies
    const replyIds = post.replies.map((r) => r.id);
    const userVotes = await getUserVotes(user.id, postId, replyIds);

    const response: GetPostResponse = {
      post: mapToPostDetailResponse(post, userVotes),
    };

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error getting forum post", {
      userId: user.id,
      postId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to get post. Please try again.",
      500
    );
  }
}

/**
 * Handle PUT /api/forum/posts/:id
 */
async function handleUpdatePost(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string },
  postId: string
): Promise<void> {
  try {
    // Get existing post
    const existingPost = await getPostById(postId);

    if (!existingPost) {
      sendError(res, ErrorCodes.NOT_FOUND, "Post not found", 404);
      return;
    }

    // Check user is the author
    if (existingPost.userId !== user.id) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "You can only edit your own posts",
        403
      );
      return;
    }

    // Check post is not locked
    if (existingPost.isLocked) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "This post is locked and cannot be edited",
        403
      );
      return;
    }

    // Validate request body
    const parseResult = updateForumPostSchema.safeParse(req.body);
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

    const input = parseResult.data;

    // Update the post - only include fields that are defined
    const updateData: { title?: string; content?: string } = {};
    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.content !== undefined) {
      updateData.content = input.content;
    }
    const updatedPost = await updatePost(postId, updateData);

    // Fetch user's votes for post and replies
    const replyIds = updatedPost.replies.map((r) => r.id);
    const userVotes = await getUserVotes(user.id, postId, replyIds);

    const response: UpdatePostResponse = {
      post: mapToPostDetailResponse(updatedPost, userVotes),
    };

    logger.info("Forum post updated", {
      userId: user.id,
      postId,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error updating forum post", {
      userId: user.id,
      postId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to update post. Please try again.",
      500
    );
  }
}

/**
 * Handle DELETE /api/forum/posts/:id
 */
async function handleDeletePost(
  _req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string },
  postId: string
): Promise<void> {
  try {
    // Get existing post
    const existingPost = await getPostById(postId);

    if (!existingPost) {
      sendError(res, ErrorCodes.NOT_FOUND, "Post not found", 404);
      return;
    }

    // Check user is the author
    if (existingPost.userId !== user.id) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "You can only delete your own posts",
        403
      );
      return;
    }

    // Soft delete the post
    await softDeletePost(postId, existingPost.categoryId);

    const response: DeletePostResponse = {
      success: true,
      message: "Post deleted successfully",
    };

    logger.info("Forum post deleted", {
      userId: user.id,
      postId,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error deleting forum post", {
      userId: user.id,
      postId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to delete post. Please try again.",
      500
    );
  }
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Main handler for /api/forum/posts/:id
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
    case "GET":
      await handleGetPost(req, res, user, postId);
      break;
    case "PUT":
      await handleUpdatePost(req, res, user, postId);
      break;
    case "DELETE":
      await handleDeletePost(req, res, user, postId);
      break;
    default:
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Method not allowed. Use GET, PUT, or DELETE.",
        405
      );
  }
}

export default withAuth(handler);
