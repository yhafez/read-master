/**
 * Zod schemas for Forum operations
 *
 * These schemas validate forum-related API requests for:
 * - Creating and updating forum posts
 * - Creating and updating forum replies (with nesting support)
 * - Voting on posts and replies
 * - Querying/filtering forum content
 * - Forum moderation actions
 *
 * Validation rules follow the database schema:
 * - Title: 3-200 characters (required for posts)
 * - Content: 10-50,000 characters (required)
 * - Vote value: 1 (upvote) or -1 (downvote)
 *
 * Profanity filtering is applied to all public text fields.
 *
 * @example
 * ```typescript
 * import { createForumPostSchema, createForumReplySchema, forumVoteSchema } from '@read-master/shared/schemas';
 *
 * // Validate post creation
 * const result = createForumPostSchema.safeParse(requestBody);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.error.flatten() });
 * }
 *
 * // Validate vote submission
 * const voteResult = forumVoteSchema.safeParse({ value: 1, postId: 'cuid123' });
 * ```
 */

import { z } from "zod";
import { containsProfanity } from "../utils/moderation";

// =============================================================================
// ENUMS (matching Prisma schema)
// =============================================================================

/**
 * User tier enum - for category access control
 */
export const userTierSchema = z.enum(["FREE", "PRO", "SCHOLAR"]);
export type UserTierSchema = z.infer<typeof userTierSchema>;

/**
 * Vote value enum - upvote or downvote
 */
export const voteValueSchema = z
  .number()
  .int("Vote value must be an integer")
  .refine((val) => val === 1 || val === -1, {
    message: "Vote value must be 1 (upvote) or -1 (downvote)",
  });
export type VoteValue = z.infer<typeof voteValueSchema>;

// =============================================================================
// COMMON FIELD SCHEMAS
// =============================================================================

/**
 * Forum post ID validation (CUID format)
 */
export const forumPostIdSchema = z
  .string()
  .min(1, "Post ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid post ID format");
export type ForumPostIdInput = z.infer<typeof forumPostIdSchema>;

/**
 * Forum reply ID validation (CUID format)
 */
export const forumReplyIdSchema = z
  .string()
  .min(1, "Reply ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid reply ID format");
export type ForumReplyIdInput = z.infer<typeof forumReplyIdSchema>;

/**
 * Forum category ID validation (CUID format)
 */
export const forumCategoryIdSchema = z
  .string()
  .min(1, "Category ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid category ID format");
export type ForumCategoryIdInput = z.infer<typeof forumCategoryIdSchema>;

/**
 * Forum category slug validation
 * URL-friendly: lowercase letters, numbers, hyphens only
 */
export const forumCategorySlugSchema = z
  .string()
  .min(2, "Category slug must be at least 2 characters")
  .max(50, "Category slug cannot exceed 50 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Category slug must be URL-friendly (lowercase letters, numbers, hyphens)"
  );
export type ForumCategorySlugInput = z.infer<typeof forumCategorySlugSchema>;

/**
 * Book ID validation (CUID format) - optional for posts
 */
export const forumBookIdSchema = z
  .string()
  .regex(/^c[a-z0-9]+$/, "Invalid book ID format")
  .optional()
  .nullable();

/**
 * Forum post title validation (without profanity filter)
 * - Required field
 * - 3-200 characters (matching database VarChar(200))
 * - Trimmed of whitespace
 */
export const forumPostTitleSchema = z
  .string()
  .min(3, "Title must be at least 3 characters")
  .max(200, "Title cannot exceed 200 characters")
  .trim();
export type ForumPostTitleInput = z.infer<typeof forumPostTitleSchema>;

/**
 * Forum post title validation with profanity filter
 */
export const forumPostTitlePublicSchema = forumPostTitleSchema.refine(
  (val) => !containsProfanity(val),
  "Title contains inappropriate language"
);

/**
 * Forum post/reply content validation (without profanity filter)
 * - Required field
 * - 10-50,000 characters (matching database Text)
 * - Trimmed of whitespace
 */
export const forumContentSchema = z
  .string()
  .min(10, "Content must be at least 10 characters")
  .max(50000, "Content cannot exceed 50,000 characters")
  .trim();
export type ForumContentInput = z.infer<typeof forumContentSchema>;

/**
 * Forum content validation with profanity filter
 */
export const forumContentPublicSchema = forumContentSchema.refine(
  (val) => !containsProfanity(val),
  "Content contains inappropriate language"
);

/**
 * Forum reply content validation (without profanity filter)
 * - Required field
 * - 1-50,000 characters (more lenient minimum for replies)
 * - Trimmed of whitespace
 */
export const forumReplyContentSchema = z
  .string()
  .min(1, "Reply content is required")
  .max(50000, "Reply cannot exceed 50,000 characters")
  .trim();
export type ForumReplyContentInput = z.infer<typeof forumReplyContentSchema>;

/**
 * Forum reply content validation with profanity filter
 */
export const forumReplyContentPublicSchema = forumReplyContentSchema.refine(
  (val) => !containsProfanity(val),
  "Reply contains inappropriate language"
);

// =============================================================================
// FORUM CATEGORY SCHEMAS
// =============================================================================

/**
 * Forum category response schema
 */
export const forumCategoryResponseSchema = z.object({
  id: forumCategoryIdSchema,
  slug: forumCategorySlugSchema,
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  isLocked: z.boolean(),
  minTierToPost: userTierSchema,
  postsCount: z.number().int(),
  lastPostAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ForumCategoryResponse = z.infer<typeof forumCategoryResponseSchema>;

// =============================================================================
// FORUM POST SCHEMAS
// =============================================================================

/**
 * Create forum post schema (without profanity filter - for internal/private use)
 */
export const createForumPostBaseSchema = z.object({
  categoryId: forumCategoryIdSchema,
  title: forumPostTitleSchema,
  content: forumContentSchema,
  bookId: forumBookIdSchema,
});

/**
 * Create forum post schema with profanity filtering
 */
export const createForumPostSchema = z.object({
  categoryId: forumCategoryIdSchema,
  title: forumPostTitlePublicSchema,
  content: forumContentPublicSchema,
  bookId: forumBookIdSchema,
});
export type CreateForumPostInput = z.infer<typeof createForumPostSchema>;

/**
 * Update forum post schema (without profanity filter)
 */
export const updateForumPostBaseSchema = z
  .object({
    title: forumPostTitleSchema.optional(),
    content: forumContentSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

/**
 * Update forum post schema with profanity filtering
 */
export const updateForumPostSchema = z
  .object({
    title: forumPostTitlePublicSchema.optional(),
    content: forumContentPublicSchema.optional(),
  })
  .refine((data) => data.title !== undefined || data.content !== undefined, {
    message: "At least one field must be provided for update",
  });
export type UpdateForumPostInput = z.infer<typeof updateForumPostSchema>;

/**
 * Forum post sort fields
 */
export const forumPostSortFieldSchema = z.enum([
  "createdAt",
  "updatedAt",
  "voteScore",
  "viewCount",
  "repliesCount",
  "lastReplyAt",
]);
export type ForumPostSortField = z.infer<typeof forumPostSortFieldSchema>;

/**
 * Forum posts query schema
 */
export const forumPostQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),

  // Sorting
  sortBy: forumPostSortFieldSchema.default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),

  // Filtering
  categoryId: forumCategoryIdSchema.optional(),
  categorySlug: forumCategorySlugSchema.optional(),
  userId: z.string().optional(),
  bookId: forumBookIdSchema,
  isPinned: z.coerce.boolean().optional(),
  isLocked: z.coerce.boolean().optional(),
  isAnswered: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  hasReplies: z.coerce.boolean().optional(),

  // Search
  search: z.string().max(200).trim().optional(),

  // Include soft-deleted (admin only)
  includeDeleted: z.coerce.boolean().default(false),
});
export type ForumPostQueryInput = z.infer<typeof forumPostQuerySchema>;

/**
 * Post ID params schema for route parameters
 */
export const postIdParamsSchema = z.object({
  postId: forumPostIdSchema,
});
export type PostIdParams = z.infer<typeof postIdParamsSchema>;

/**
 * Category post ID params schema for nested routes
 */
export const categoryPostIdParamsSchema = z.object({
  categoryId: forumCategoryIdSchema,
  postId: forumPostIdSchema,
});
export type CategoryPostIdParams = z.infer<typeof categoryPostIdParamsSchema>;

// =============================================================================
// FORUM REPLY SCHEMAS
// =============================================================================

/**
 * Create forum reply schema (without profanity filter)
 */
export const createForumReplyBaseSchema = z.object({
  postId: forumPostIdSchema,
  content: forumReplyContentSchema,
  parentReplyId: forumReplyIdSchema.optional().nullable(),
});

/**
 * Create forum reply schema with profanity filtering
 */
export const createForumReplySchema = z.object({
  postId: forumPostIdSchema,
  content: forumReplyContentPublicSchema,
  parentReplyId: forumReplyIdSchema.optional().nullable(),
});
export type CreateForumReplyInput = z.infer<typeof createForumReplySchema>;

/**
 * Update forum reply schema (without profanity filter)
 */
export const updateForumReplyBaseSchema = z.object({
  content: forumReplyContentSchema,
});

/**
 * Update forum reply schema with profanity filtering
 */
export const updateForumReplySchema = z.object({
  content: forumReplyContentPublicSchema,
});
export type UpdateForumReplyInput = z.infer<typeof updateForumReplySchema>;

/**
 * Forum reply sort fields
 */
export const forumReplySortFieldSchema = z.enum([
  "createdAt",
  "updatedAt",
  "voteScore",
]);
export type ForumReplySortField = z.infer<typeof forumReplySortFieldSchema>;

/**
 * Forum replies query schema
 */
export const forumReplyQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),

  // Sorting
  sortBy: forumReplySortFieldSchema.default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),

  // Filtering
  parentReplyId: forumReplyIdSchema.optional().nullable(),
  topLevelOnly: z.coerce.boolean().default(false),
  includeNested: z.coerce.boolean().default(true),
  maxDepth: z.coerce.number().int().min(1).max(10).default(5),

  // Include soft-deleted (admin only)
  includeDeleted: z.coerce.boolean().default(false),
});
export type ForumReplyQueryInput = z.infer<typeof forumReplyQuerySchema>;

/**
 * Reply ID params schema for route parameters
 */
export const replyIdParamsSchema = z.object({
  replyId: forumReplyIdSchema,
});
export type ReplyIdParams = z.infer<typeof replyIdParamsSchema>;

/**
 * Post reply ID params schema for nested routes
 */
export const postReplyIdParamsSchema = z.object({
  postId: forumPostIdSchema,
  replyId: forumReplyIdSchema,
});
export type PostReplyIdParams = z.infer<typeof postReplyIdParamsSchema>;

// =============================================================================
// FORUM VOTE SCHEMAS
// =============================================================================

/**
 * Vote on a post schema
 */
export const voteOnPostSchema = z.object({
  postId: forumPostIdSchema,
  value: voteValueSchema,
});
export type VoteOnPostInput = z.infer<typeof voteOnPostSchema>;

/**
 * Vote on a reply schema
 */
export const voteOnReplySchema = z.object({
  replyId: forumReplyIdSchema,
  value: voteValueSchema,
});
export type VoteOnReplyInput = z.infer<typeof voteOnReplySchema>;

/**
 * Remove vote from post schema
 */
export const removePostVoteSchema = z.object({
  postId: forumPostIdSchema,
});
export type RemovePostVoteInput = z.infer<typeof removePostVoteSchema>;

/**
 * Remove vote from reply schema
 */
export const removeReplyVoteSchema = z.object({
  replyId: forumReplyIdSchema,
});
export type RemoveReplyVoteInput = z.infer<typeof removeReplyVoteSchema>;

/**
 * Combined vote schema (for unified vote endpoint)
 */
export const forumVoteSchema = z
  .object({
    postId: forumPostIdSchema.optional(),
    replyId: forumReplyIdSchema.optional(),
    value: voteValueSchema,
  })
  .refine(
    (data) => {
      const hasPostId = data.postId !== undefined;
      const hasReplyId = data.replyId !== undefined;
      return (hasPostId && !hasReplyId) || (!hasPostId && hasReplyId);
    },
    {
      message: "Exactly one of postId or replyId must be provided",
    }
  );
export type ForumVoteInput = z.infer<typeof forumVoteSchema>;

// =============================================================================
// MODERATION SCHEMAS
// =============================================================================

/**
 * Mark reply as best answer schema
 */
export const markBestAnswerSchema = z.object({
  replyId: forumReplyIdSchema,
});
export type MarkBestAnswerInput = z.infer<typeof markBestAnswerSchema>;

/**
 * Toggle post pin status schema
 */
export const togglePinPostSchema = z.object({
  postId: forumPostIdSchema,
  isPinned: z.boolean(),
});
export type TogglePinPostInput = z.infer<typeof togglePinPostSchema>;

/**
 * Toggle post lock status schema
 */
export const toggleLockPostSchema = z.object({
  postId: forumPostIdSchema,
  isLocked: z.boolean(),
});
export type ToggleLockPostInput = z.infer<typeof toggleLockPostSchema>;

/**
 * Report type enum
 */
export const reportTypeSchema = z.enum([
  "SPAM",
  "HARASSMENT",
  "INAPPROPRIATE",
  "OFF_TOPIC",
  "MISINFORMATION",
  "OTHER",
]);
export type ReportType = z.infer<typeof reportTypeSchema>;

/**
 * Report content schema
 */
export const reportContentSchema = z
  .object({
    postId: forumPostIdSchema.optional(),
    replyId: forumReplyIdSchema.optional(),
    type: reportTypeSchema,
    reason: z
      .string()
      .max(1000, "Reason cannot exceed 1,000 characters")
      .trim()
      .optional(),
  })
  .refine(
    (data) => {
      const hasPostId = data.postId !== undefined;
      const hasReplyId = data.replyId !== undefined;
      return (hasPostId && !hasReplyId) || (!hasPostId && hasReplyId);
    },
    {
      message: "Exactly one of postId or replyId must be provided",
    }
  );
export type ReportContentInput = z.infer<typeof reportContentSchema>;

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Bulk delete posts schema (moderator action)
 */
export const bulkDeletePostsSchema = z.object({
  postIds: z
    .array(forumPostIdSchema)
    .min(1, "At least one post ID is required")
    .max(100, "Cannot delete more than 100 posts at once"),
});
export type BulkDeletePostsInput = z.infer<typeof bulkDeletePostsSchema>;

/**
 * Bulk delete replies schema (moderator action)
 */
export const bulkDeleteRepliesSchema = z.object({
  replyIds: z
    .array(forumReplyIdSchema)
    .min(1, "At least one reply ID is required")
    .max(100, "Cannot delete more than 100 replies at once"),
});
export type BulkDeleteRepliesInput = z.infer<typeof bulkDeleteRepliesSchema>;

// =============================================================================
// SEARCH SCHEMAS
// =============================================================================

/**
 * Forum search schema
 */
export const forumSearchSchema = z.object({
  query: z
    .string()
    .min(2, "Search query must be at least 2 characters")
    .max(200, "Search query cannot exceed 200 characters")
    .trim(),
  searchIn: z.enum(["posts", "replies", "all"]).default("all"),
  categoryId: forumCategoryIdSchema.optional(),
  categorySlug: forumCategorySlugSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
export type ForumSearchInput = z.infer<typeof forumSearchSchema>;

// =============================================================================
// EXPORTED SCHEMA COLLECTION
// =============================================================================

/**
 * Collection of all forum schemas for convenient importing
 */
export const forumSchemas = {
  // Enums
  userTier: userTierSchema,
  voteValue: voteValueSchema,

  // IDs
  postId: forumPostIdSchema,
  replyId: forumReplyIdSchema,
  categoryId: forumCategoryIdSchema,
  categorySlug: forumCategorySlugSchema,
  bookId: forumBookIdSchema,

  // Fields
  postTitle: forumPostTitleSchema,
  postTitlePublic: forumPostTitlePublicSchema,
  content: forumContentSchema,
  contentPublic: forumContentPublicSchema,
  replyContent: forumReplyContentSchema,
  replyContentPublic: forumReplyContentPublicSchema,

  // Category
  categoryResponse: forumCategoryResponseSchema,

  // Post
  createPost: createForumPostSchema,
  createPostBase: createForumPostBaseSchema,
  updatePost: updateForumPostSchema,
  updatePostBase: updateForumPostBaseSchema,
  postQuery: forumPostQuerySchema,
  postSortField: forumPostSortFieldSchema,
  postIdParams: postIdParamsSchema,
  categoryPostIdParams: categoryPostIdParamsSchema,

  // Reply
  createReply: createForumReplySchema,
  createReplyBase: createForumReplyBaseSchema,
  updateReply: updateForumReplySchema,
  updateReplyBase: updateForumReplyBaseSchema,
  replyQuery: forumReplyQuerySchema,
  replySortField: forumReplySortFieldSchema,
  replyIdParams: replyIdParamsSchema,
  postReplyIdParams: postReplyIdParamsSchema,

  // Vote
  voteOnPost: voteOnPostSchema,
  voteOnReply: voteOnReplySchema,
  removePostVote: removePostVoteSchema,
  removeReplyVote: removeReplyVoteSchema,
  vote: forumVoteSchema,

  // Moderation
  markBestAnswer: markBestAnswerSchema,
  togglePinPost: togglePinPostSchema,
  toggleLockPost: toggleLockPostSchema,
  reportType: reportTypeSchema,
  reportContent: reportContentSchema,

  // Bulk operations
  bulkDeletePosts: bulkDeletePostsSchema,
  bulkDeleteReplies: bulkDeleteRepliesSchema,

  // Search
  search: forumSearchSchema,
} as const;
