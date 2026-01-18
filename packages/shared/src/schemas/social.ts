/**
 * Zod schemas for Social feature operations
 *
 * These schemas validate social feature API requests for:
 * - Following/unfollowing users
 * - Creating and managing reading groups
 * - Group membership and roles
 * - Group discussions and replies
 * - Activity feeds
 *
 * Profanity filtering is applied to public-facing content (group names, discussions).
 *
 * @example
 * ```typescript
 * import { createReadingGroupSchema, followUserSchema } from '@read-master/shared/schemas';
 *
 * // Validate group creation
 * const result = createReadingGroupSchema.safeParse(requestBody);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.error.flatten() });
 * }
 * ```
 */

import { z } from "zod";

import { containsProfanity } from "../utils/moderation";

// =============================================================================
// ENUMS (matching Prisma schema)
// =============================================================================

/**
 * Group role enum - role of a member within a reading group
 */
export const groupRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);
export type GroupRoleSchema = z.infer<typeof groupRoleSchema>;

/**
 * Activity type enum - types of activities for feeds
 */
export const activityTypeSchema = z.enum([
  "BOOK_STARTED",
  "BOOK_COMPLETED",
  "ACHIEVEMENT_EARNED",
  "HIGHLIGHT_SHARED",
  "GROUP_JOINED",
  "CURRICULUM_FOLLOWED",
  "REVIEW_SHARED",
]);
export type ActivityTypeSchema = z.infer<typeof activityTypeSchema>;

// =============================================================================
// COMMON FIELD SCHEMAS
// =============================================================================

/**
 * User ID validation (CUID format)
 */
export const userIdSchema = z
  .string()
  .min(1, "User ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid user ID format");
export type UserIdInput = z.infer<typeof userIdSchema>;

/**
 * Reading group ID validation (CUID format)
 */
export const groupIdSchema = z
  .string()
  .min(1, "Group ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid group ID format");
export type GroupIdInput = z.infer<typeof groupIdSchema>;

/**
 * Discussion ID validation (CUID format)
 */
export const discussionIdSchema = z
  .string()
  .min(1, "Discussion ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid discussion ID format");
export type DiscussionIdInput = z.infer<typeof discussionIdSchema>;

/**
 * Discussion reply ID validation (CUID format)
 */
export const replyIdSchema = z
  .string()
  .min(1, "Reply ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid reply ID format");
export type ReplyIdInput = z.infer<typeof replyIdSchema>;

/**
 * Invite code validation
 */
export const inviteCodeSchema = z
  .string()
  .min(6, "Invite code must be at least 6 characters")
  .max(50, "Invite code must be at most 50 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Invite code can only contain letters, numbers, hyphens, and underscores"
  );
export type InviteCodeInput = z.infer<typeof inviteCodeSchema>;

// =============================================================================
// FOLLOW SCHEMAS
// =============================================================================

/**
 * Follow user schema
 */
export const followUserSchema = z.object({
  userId: userIdSchema,
});
export type FollowUserInput = z.infer<typeof followUserSchema>;

/**
 * Unfollow user schema
 */
export const unfollowUserSchema = z.object({
  userId: userIdSchema,
});
export type UnfollowUserInput = z.infer<typeof unfollowUserSchema>;

/**
 * Followers/following list query parameters
 */
export const followListQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),

  // Search
  search: z.string().max(200).trim().optional(),
});
export type FollowListQueryInput = z.infer<typeof followListQuerySchema>;

// =============================================================================
// READING GROUP SCHEMAS
// =============================================================================

/**
 * Group name validation (1-200 chars)
 */
export const groupNameSchema = z
  .string()
  .trim()
  .min(1, "Group name is required")
  .max(200, "Group name must be at most 200 characters");
export type GroupNameInput = z.infer<typeof groupNameSchema>;

/**
 * Group name with profanity filter (for public groups)
 */
export const groupNamePublicSchema = groupNameSchema.refine(
  (val) => !containsProfanity(val),
  "Group name contains inappropriate language"
);

/**
 * Group description validation
 */
export const groupDescriptionSchema = z
  .string()
  .trim()
  .max(5000, "Description must be at most 5,000 characters")
  .optional()
  .nullable();
export type GroupDescriptionInput = z.infer<typeof groupDescriptionSchema>;

/**
 * Group description with profanity filter
 */
export const groupDescriptionPublicSchema = groupDescriptionSchema.refine(
  (val) => !val || !containsProfanity(val),
  "Description contains inappropriate language"
);

/**
 * Max members validation
 */
export const maxMembersSchema = z
  .number()
  .int("Max members must be an integer")
  .positive("Max members must be positive")
  .max(1000, "Maximum 1,000 members allowed")
  .optional()
  .nullable();

/**
 * Cover image URL validation
 */
export const groupCoverImageSchema = z
  .string()
  .url("Invalid cover image URL")
  .max(2000, "URL must be at most 2000 characters")
  .optional()
  .nullable();

/**
 * Create reading group schema (base, without profanity filter)
 */
export const createReadingGroupBaseSchema = z.object({
  name: groupNameSchema,
  description: groupDescriptionSchema,
  coverImage: groupCoverImageSchema,
  isPublic: z.boolean().default(true),
  maxMembers: maxMembersSchema.default(50),
  currentBookId: z
    .string()
    .regex(/^c[a-z0-9]+$/)
    .optional()
    .nullable(),
});
export type CreateReadingGroupBaseInput = z.infer<
  typeof createReadingGroupBaseSchema
>;

/**
 * Create reading group schema (with profanity filter)
 */
export const createReadingGroupSchema = z
  .object({
    name: groupNameSchema,
    description: groupDescriptionSchema,
    coverImage: groupCoverImageSchema,
    isPublic: z.boolean().default(true),
    maxMembers: maxMembersSchema.default(50),
    currentBookId: z
      .string()
      .regex(/^c[a-z0-9]+$/)
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      // Check profanity in name
      if (containsProfanity(data.name)) {
        return false;
      }
      // Check profanity in description if provided
      if (data.description && containsProfanity(data.description)) {
        return false;
      }
      return true;
    },
    {
      message: "Content contains inappropriate language",
      path: ["name"],
    }
  );
export type CreateReadingGroupInput = z.infer<typeof createReadingGroupSchema>;

/**
 * Update reading group schema
 */
export const updateReadingGroupSchema = z
  .object({
    name: groupNameSchema.optional(),
    description: groupDescriptionSchema,
    coverImage: groupCoverImageSchema,
    isPublic: z.boolean().optional(),
    maxMembers: maxMembersSchema,
    currentBookId: z
      .string()
      .regex(/^c[a-z0-9]+$/)
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      return Object.values(data).some((value) => value !== undefined);
    },
    { message: "At least one field must be provided for update" }
  )
  .refine(
    (data) => {
      // Check profanity in name if provided
      if (data.name && containsProfanity(data.name)) {
        return false;
      }
      // Check profanity in description if provided
      if (data.description && containsProfanity(data.description)) {
        return false;
      }
      return true;
    },
    {
      message: "Content contains inappropriate language",
      path: ["name"],
    }
  );
export type UpdateReadingGroupInput = z.infer<typeof updateReadingGroupSchema>;

// =============================================================================
// GROUP MEMBERSHIP SCHEMAS
// =============================================================================

/**
 * Join group schema (for public groups)
 */
export const joinGroupSchema = z.object({
  groupId: groupIdSchema,
});
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;

/**
 * Join group with invite code schema (for private groups)
 */
export const joinGroupWithInviteSchema = z.object({
  inviteCode: inviteCodeSchema,
});
export type JoinGroupWithInviteInput = z.infer<
  typeof joinGroupWithInviteSchema
>;

/**
 * Leave group schema
 */
export const leaveGroupSchema = z.object({
  groupId: groupIdSchema,
});
export type LeaveGroupInput = z.infer<typeof leaveGroupSchema>;

/**
 * Update member role schema
 */
export const updateMemberRoleSchema = z.object({
  userId: userIdSchema,
  role: groupRoleSchema,
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

/**
 * Remove member schema
 */
export const removeMemberSchema = z.object({
  userId: userIdSchema,
});
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;

/**
 * Group members query parameters
 */
export const groupMembersQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),

  // Filters
  role: groupRoleSchema.optional(),

  // Search
  search: z.string().max(200).trim().optional(),
});
export type GroupMembersQueryInput = z.infer<typeof groupMembersQuerySchema>;

/**
 * Generate invite code schema
 */
export const generateInviteCodeSchema = z.object({
  groupId: groupIdSchema,
});
export type GenerateInviteCodeInput = z.infer<typeof generateInviteCodeSchema>;

/**
 * Update notification settings schema
 */
export const updateNotificationSettingsSchema = z.object({
  notificationsEnabled: z.boolean(),
});
export type UpdateNotificationSettingsInput = z.infer<
  typeof updateNotificationSettingsSchema
>;

// =============================================================================
// GROUP DISCUSSION SCHEMAS
// =============================================================================

/**
 * Discussion title validation (1-300 chars)
 */
export const discussionTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(300, "Title must be at most 300 characters");
export type DiscussionTitleInput = z.infer<typeof discussionTitleSchema>;

/**
 * Discussion title with profanity filter
 */
export const discussionTitlePublicSchema = discussionTitleSchema.refine(
  (val) => !containsProfanity(val),
  "Title contains inappropriate language"
);

/**
 * Discussion content validation
 */
export const discussionContentSchema = z
  .string()
  .trim()
  .min(1, "Content is required")
  .max(50000, "Content must be at most 50,000 characters");
export type DiscussionContentInput = z.infer<typeof discussionContentSchema>;

/**
 * Discussion content with profanity filter
 */
export const discussionContentPublicSchema = discussionContentSchema.refine(
  (val) => !containsProfanity(val),
  "Content contains inappropriate language"
);

/**
 * Create group discussion schema
 */
export const createGroupDiscussionSchema = z
  .object({
    title: discussionTitleSchema,
    content: discussionContentSchema,
    bookId: z
      .string()
      .regex(/^c[a-z0-9]+$/)
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      return !containsProfanity(data.title) && !containsProfanity(data.content);
    },
    {
      message: "Content contains inappropriate language",
      path: ["title"],
    }
  );
export type CreateGroupDiscussionInput = z.infer<
  typeof createGroupDiscussionSchema
>;

/**
 * Update group discussion schema
 */
export const updateGroupDiscussionSchema = z
  .object({
    title: discussionTitleSchema.optional(),
    content: discussionContentSchema.optional(),
    isPinned: z.boolean().optional(),
    isLocked: z.boolean().optional(),
  })
  .refine(
    (data) => {
      return Object.values(data).some((value) => value !== undefined);
    },
    { message: "At least one field must be provided for update" }
  )
  .refine(
    (data) => {
      const titleClean = !data.title || !containsProfanity(data.title);
      const contentClean = !data.content || !containsProfanity(data.content);
      return titleClean && contentClean;
    },
    {
      message: "Content contains inappropriate language",
      path: ["title"],
    }
  );
export type UpdateGroupDiscussionInput = z.infer<
  typeof updateGroupDiscussionSchema
>;

// =============================================================================
// DISCUSSION REPLY SCHEMAS
// =============================================================================

/**
 * Reply content validation
 */
export const replyContentSchema = z
  .string()
  .trim()
  .min(1, "Reply content is required")
  .max(50000, "Reply must be at most 50,000 characters");
export type ReplyContentInput = z.infer<typeof replyContentSchema>;

/**
 * Reply content with profanity filter
 */
export const replyContentPublicSchema = replyContentSchema.refine(
  (val) => !containsProfanity(val),
  "Reply contains inappropriate language"
);

/**
 * Create discussion reply schema
 */
export const createDiscussionReplySchema = z
  .object({
    content: replyContentSchema,
    parentReplyId: z
      .string()
      .regex(/^c[a-z0-9]+$/)
      .optional()
      .nullable(), // For nested replies
  })
  .refine((data) => !containsProfanity(data.content), {
    message: "Reply contains inappropriate language",
    path: ["content"],
  });
export type CreateDiscussionReplyInput = z.infer<
  typeof createDiscussionReplySchema
>;

/**
 * Update discussion reply schema
 */
export const updateDiscussionReplySchema = z
  .object({
    content: replyContentSchema,
  })
  .refine((data) => !containsProfanity(data.content), {
    message: "Reply contains inappropriate language",
    path: ["content"],
  });
export type UpdateDiscussionReplyInput = z.infer<
  typeof updateDiscussionReplySchema
>;

// =============================================================================
// READING GROUP QUERY SCHEMAS
// =============================================================================

/**
 * Sort fields for reading groups
 */
export const groupSortFieldSchema = z.enum([
  "createdAt",
  "membersCount",
  "discussionsCount",
  "name",
]);
export type GroupSortField = z.infer<typeof groupSortFieldSchema>;

/**
 * Sort direction
 */
export const groupSortDirectionSchema = z.enum(["asc", "desc"]);
export type GroupSortDirection = z.infer<typeof groupSortDirectionSchema>;

/**
 * Reading groups list query parameters
 */
export const groupsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),

  // Sorting
  sortBy: groupSortFieldSchema.default("createdAt"),
  sortDirection: groupSortDirectionSchema.default("desc"),

  // Filters
  isPublic: z.coerce.boolean().optional(),
  hasCurrentBook: z.coerce.boolean().optional(),

  // Search
  search: z.string().max(200).trim().optional(),

  // Include soft-deleted
  includeDeleted: z.coerce.boolean().default(false),
});
export type GroupsQueryInput = z.infer<typeof groupsQuerySchema>;

/**
 * Browse public groups query parameters
 */
export const browseGroupsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),

  // Sorting
  sortBy: z.enum(["createdAt", "membersCount", "name"]).default("membersCount"),
  sortDirection: groupSortDirectionSchema.default("desc"),

  // Filters
  hasCurrentBook: z.coerce.boolean().optional(),
  minMembers: z.coerce.number().int().nonnegative().optional(),
  maxMembers: z.coerce.number().int().positive().optional(),

  // Search
  search: z.string().max(200).trim().optional(),
});
export type BrowseGroupsQueryInput = z.infer<typeof browseGroupsQuerySchema>;

/**
 * Group discussions query parameters
 */
export const groupDiscussionsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),

  // Sorting
  sortBy: z
    .enum(["createdAt", "lastReplyAt", "repliesCount"])
    .default("lastReplyAt"),
  sortDirection: groupSortDirectionSchema.default("desc"),

  // Filters
  bookId: z
    .string()
    .regex(/^c[a-z0-9]+$/)
    .optional(),
  isPinned: z.coerce.boolean().optional(),
  isLocked: z.coerce.boolean().optional(),

  // Search
  search: z.string().max(200).trim().optional(),
});
export type GroupDiscussionsQueryInput = z.infer<
  typeof groupDiscussionsQuerySchema
>;

/**
 * Discussion replies query parameters
 */
export const discussionRepliesQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),

  // Max depth for nested replies
  maxDepth: z.coerce.number().int().positive().max(10).default(5),

  // Sort
  sortDirection: groupSortDirectionSchema.default("asc"), // Oldest first by default
});
export type DiscussionRepliesQueryInput = z.infer<
  typeof discussionRepliesQuerySchema
>;

// =============================================================================
// ACTIVITY FEED SCHEMAS
// =============================================================================

/**
 * Activity feed query parameters
 */
export const activityFeedQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),

  // Filters
  activityTypes: z
    .string()
    .transform((val) => val.split(",").map((t) => t.trim().toUpperCase()))
    .pipe(z.array(activityTypeSchema))
    .optional(),

  // Time range
  since: z.coerce.date().optional(),
});
export type ActivityFeedQueryInput = z.infer<typeof activityFeedQuerySchema>;

/**
 * Activity item schema (for response)
 */
export const activityItemSchema = z.object({
  id: z.string(),
  type: activityTypeSchema,
  userId: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string().nullable(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  data: z.record(z.unknown()), // Activity-specific data
  createdAt: z.string().datetime(),
});
export type ActivityItem = z.infer<typeof activityItemSchema>;

// =============================================================================
// ID PARAMS SCHEMAS
// =============================================================================

/**
 * User ID params schema (for route params)
 */
export const userIdParamsSchema = z.object({
  id: userIdSchema,
});
export type UserIdParamsInput = z.infer<typeof userIdParamsSchema>;

/**
 * Username params schema (for route params)
 */
export const usernameParamsSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, hyphens, and underscores"
    ),
});
export type UsernameParamsInput = z.infer<typeof usernameParamsSchema>;

/**
 * Group ID params schema (for route params)
 */
export const groupIdParamsSchema = z.object({
  id: groupIdSchema,
});
export type GroupIdParamsInput = z.infer<typeof groupIdParamsSchema>;

/**
 * Discussion ID params schema (for route params)
 */
export const discussionIdParamsSchema = z.object({
  discussionId: discussionIdSchema,
});
export type DiscussionIdParamsInput = z.infer<typeof discussionIdParamsSchema>;

/**
 * Group and discussion ID params schema (for nested routes)
 */
export const groupDiscussionIdParamsSchema = z.object({
  groupId: groupIdSchema,
  discussionId: discussionIdSchema,
});
export type GroupDiscussionIdParamsInput = z.infer<
  typeof groupDiscussionIdParamsSchema
>;

/**
 * Reply ID params schema (for route params)
 */
export const replyIdParamsSchema = z.object({
  replyId: replyIdSchema,
});
export type ReplyIdParamsInput = z.infer<typeof replyIdParamsSchema>;

// =============================================================================
// BULK OPERATIONS SCHEMAS
// =============================================================================

/**
 * Bulk remove members schema
 */
export const bulkRemoveMembersSchema = z.object({
  userIds: z
    .array(userIdSchema)
    .min(1, "At least one user ID is required")
    .max(100, "Maximum 100 members can be removed at once"),
});
export type BulkRemoveMembersInput = z.infer<typeof bulkRemoveMembersSchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * User follow status response schema
 */
export const followStatusSchema = z.object({
  isFollowing: z.boolean(),
  isFollowedBy: z.boolean(),
});
export type FollowStatus = z.infer<typeof followStatusSchema>;

/**
 * Reading group member response schema
 */
export const groupMemberResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string().nullable(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  role: groupRoleSchema,
  joinedAt: z.string().datetime(),
  notificationsEnabled: z.boolean(),
});
export type GroupMemberResponse = z.infer<typeof groupMemberResponseSchema>;

/**
 * Reading group summary response schema
 */
export const groupSummarySchema = z.object({
  id: groupIdSchema,
  name: z.string(),
  description: z.string().nullable(),
  coverImage: z.string().nullable(),
  isPublic: z.boolean(),
  maxMembers: z.number().nullable(),
  membersCount: z.number().int(),
  discussionsCount: z.number().int(),
  currentBook: z
    .object({
      id: z.string(),
      title: z.string(),
      author: z.string().nullable(),
      coverImage: z.string().nullable(),
    })
    .nullable()
    .optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type GroupSummary = z.infer<typeof groupSummarySchema>;

/**
 * Full reading group response schema
 */
export const groupResponseSchema = groupSummarySchema.extend({
  inviteCode: z.string().nullable().optional(), // Only for members with appropriate role
  isMember: z.boolean().optional(),
  userRole: groupRoleSchema.nullable().optional(),
  owner: z
    .object({
      id: z.string(),
      username: z.string().nullable(),
      displayName: z.string().nullable(),
      avatarUrl: z.string().nullable(),
    })
    .optional(),
});
export type GroupResponse = z.infer<typeof groupResponseSchema>;

/**
 * Group discussion response schema
 */
export const groupDiscussionResponseSchema = z.object({
  id: discussionIdSchema,
  title: z.string(),
  content: z.string(),
  bookId: z.string().nullable(),
  book: z
    .object({
      id: z.string(),
      title: z.string(),
      author: z.string().nullable(),
    })
    .nullable()
    .optional(),
  isPinned: z.boolean(),
  isLocked: z.boolean(),
  repliesCount: z.number().int(),
  lastReplyAt: z.string().datetime().nullable(),
  user: z.object({
    id: z.string(),
    username: z.string().nullable(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type GroupDiscussionResponse = z.infer<
  typeof groupDiscussionResponseSchema
>;

/**
 * Base discussion reply response schema (without recursive children)
 */
const baseDiscussionReplyResponseSchema = z.object({
  id: replyIdSchema,
  content: z.string(),
  parentReplyId: z.string().nullable(),
  user: z.object({
    id: z.string(),
    username: z.string().nullable(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Discussion reply response type (for recursive type definition)
 */
export type DiscussionReplyResponse = z.infer<
  typeof baseDiscussionReplyResponseSchema
> & {
  childReplies?: DiscussionReplyResponse[] | undefined;
};

/**
 * Discussion reply response schema (with recursive children)
 */
export const discussionReplyResponseSchema: z.ZodType<DiscussionReplyResponse> =
  baseDiscussionReplyResponseSchema.extend({
    childReplies: z
      .lazy(() => z.array(discussionReplyResponseSchema))
      .optional(),
  });

// =============================================================================
// SCHEMA INDEX (convenient re-exports)
// =============================================================================

/**
 * All social-related schemas for convenient importing
 */
export const socialSchemas = {
  // Enums
  groupRole: groupRoleSchema,
  activityType: activityTypeSchema,

  // Field schemas
  userId: userIdSchema,
  groupId: groupIdSchema,
  discussionId: discussionIdSchema,
  replyId: replyIdSchema,
  inviteCode: inviteCodeSchema,

  // Follow schemas
  followUser: followUserSchema,
  unfollowUser: unfollowUserSchema,
  followListQuery: followListQuerySchema,

  // Group schemas
  groupName: groupNameSchema,
  groupNamePublic: groupNamePublicSchema,
  groupDescription: groupDescriptionSchema,
  groupDescriptionPublic: groupDescriptionPublicSchema,
  createGroup: createReadingGroupSchema,
  createGroupBase: createReadingGroupBaseSchema,
  updateGroup: updateReadingGroupSchema,

  // Membership schemas
  joinGroup: joinGroupSchema,
  joinGroupWithInvite: joinGroupWithInviteSchema,
  leaveGroup: leaveGroupSchema,
  updateMemberRole: updateMemberRoleSchema,
  removeMember: removeMemberSchema,
  groupMembersQuery: groupMembersQuerySchema,
  generateInviteCode: generateInviteCodeSchema,
  updateNotificationSettings: updateNotificationSettingsSchema,

  // Discussion schemas
  discussionTitle: discussionTitleSchema,
  discussionTitlePublic: discussionTitlePublicSchema,
  discussionContent: discussionContentSchema,
  discussionContentPublic: discussionContentPublicSchema,
  createDiscussion: createGroupDiscussionSchema,
  updateDiscussion: updateGroupDiscussionSchema,

  // Reply schemas
  replyContent: replyContentSchema,
  replyContentPublic: replyContentPublicSchema,
  createReply: createDiscussionReplySchema,
  updateReply: updateDiscussionReplySchema,

  // Query schemas
  groupsQuery: groupsQuerySchema,
  browseGroups: browseGroupsQuerySchema,
  discussionsQuery: groupDiscussionsQuerySchema,
  repliesQuery: discussionRepliesQuerySchema,
  groupSortField: groupSortFieldSchema,
  groupSortDirection: groupSortDirectionSchema,

  // Activity feed
  activityFeedQuery: activityFeedQuerySchema,
  activityItem: activityItemSchema,

  // ID params
  userIdParams: userIdParamsSchema,
  usernameParams: usernameParamsSchema,
  groupIdParams: groupIdParamsSchema,
  discussionIdParams: discussionIdParamsSchema,
  groupDiscussionIdParams: groupDiscussionIdParamsSchema,
  replyIdParams: replyIdParamsSchema,

  // Bulk operations
  bulkRemoveMembers: bulkRemoveMembersSchema,

  // Response schemas
  followStatus: followStatusSchema,
  memberResponse: groupMemberResponseSchema,
  groupSummary: groupSummarySchema,
  groupResponse: groupResponseSchema,
  discussionResponse: groupDiscussionResponseSchema,
  replyResponse: discussionReplyResponseSchema,
} as const;
