/**
 * Zod validation schemas for API operations
 *
 * This module exports all validation schemas used for API request/response
 * validation. Schemas enforce data integrity and provide type inference.
 *
 * @example
 * ```typescript
 * import { createBookSchema, bookQuerySchema } from '@read-master/shared/schemas';
 * import { createAnnotationSchema, annotationSchemas } from '@read-master/shared/schemas';
 * import { createFlashcardSchema, reviewFlashcardSchema } from '@read-master/shared/schemas';
 * import { createForumPostSchema, forumVoteSchema, forumSchemas } from '@read-master/shared/schemas';
 * import { generateAssessmentSchema, assessmentSchemas } from '@read-master/shared/schemas';
 * import { createCurriculumSchema, curriculumSchemas } from '@read-master/shared/schemas';
 * import { createReadingGroupSchema, socialSchemas } from '@read-master/shared/schemas';
 * import { updateUserProfileSchema, userSchemas } from '@read-master/shared/schemas';
 *
 * // Server-side validation
 * const result = createBookSchema.safeParse(req.body);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.error.flatten() });
 * }
 * const book = result.data; // Fully typed!
 *
 * // Annotation validation
 * const annotationResult = createAnnotationSchema.safeParse(req.body);
 * if (!annotationResult.success) {
 *   return res.status(400).json({ errors: annotationResult.error.flatten() });
 * }
 *
 * // Flashcard review validation
 * const reviewResult = reviewFlashcardSchema.safeParse({ rating: 3 });
 * if (!reviewResult.success) {
 *   return res.status(400).json({ errors: reviewResult.error.flatten() });
 * }
 *
 * // Forum post validation with profanity filtering
 * const postResult = createForumPostSchema.safeParse({
 *   categoryId: 'clhcat123',
 *   title: 'Discussion topic',
 *   content: 'Post content here...',
 * });
 *
 * // Assessment validation
 * const assessmentResult = generateAssessmentSchema.safeParse({
 *   bookId: 'clbook123',
 *   questionCount: 10,
 * });
 *
 * // Curriculum validation with profanity filtering
 * const curriculumResult = createCurriculumSchema.safeParse({
 *   title: 'Philosophy Reading Path',
 *   description: 'A journey through Western philosophy...',
 *   visibility: 'PUBLIC',
 * });
 *
 * // Social feature validation
 * const groupResult = createReadingGroupSchema.safeParse({
 *   name: 'Classic Literature Club',
 *   isPublic: true,
 * });
 *
 * // User profile validation
 * const profileResult = updateUserProfileSchema.safeParse({
 *   displayName: 'Book Lover',
 *   bio: 'Avid reader...',
 * });
 * ```
 */

// Book schemas
export * from "./books";

// Annotation schemas
export * from "./annotations";

// Flashcard schemas
export * from "./flashcards";

// Forum schemas
export * from "./forum";

// Assessment schemas
export * from "./assessments";

// Curriculum schemas
export * from "./curriculums";

// Social feature schemas - explicitly export to avoid conflicts with forum
export {
  // Enums
  groupRoleSchema,
  type GroupRoleSchema,
  activityTypeSchema,
  type ActivityTypeSchema,

  // IDs - use social prefix to avoid conflicts
  userIdSchema as socialUserIdSchema,
  type UserIdInput as SocialUserIdInput,
  groupIdSchema,
  type GroupIdInput,
  discussionIdSchema,
  type DiscussionIdInput,
  replyIdSchema as socialReplyIdSchema,
  type ReplyIdInput as SocialReplyIdInput,
  inviteCodeSchema,
  type InviteCodeInput,

  // Follow schemas
  followUserSchema,
  type FollowUserInput,
  unfollowUserSchema,
  type UnfollowUserInput,
  followListQuerySchema,
  type FollowListQueryInput,

  // Group schemas
  groupNameSchema,
  groupNamePublicSchema,
  type GroupNameInput,
  groupDescriptionSchema,
  groupDescriptionPublicSchema,
  type GroupDescriptionInput,
  maxMembersSchema,
  groupCoverImageSchema,
  createReadingGroupBaseSchema,
  type CreateReadingGroupBaseInput,
  createReadingGroupSchema,
  type CreateReadingGroupInput,
  updateReadingGroupSchema,
  type UpdateReadingGroupInput,

  // Membership schemas
  joinGroupSchema,
  type JoinGroupInput,
  joinGroupWithInviteSchema,
  type JoinGroupWithInviteInput,
  leaveGroupSchema,
  type LeaveGroupInput,
  updateMemberRoleSchema,
  type UpdateMemberRoleInput,
  removeMemberSchema,
  type RemoveMemberInput,
  groupMembersQuerySchema,
  type GroupMembersQueryInput,
  generateInviteCodeSchema,
  type GenerateInviteCodeInput,
  updateNotificationSettingsSchema,
  type UpdateNotificationSettingsInput,

  // Discussion schemas
  discussionTitleSchema,
  discussionTitlePublicSchema,
  type DiscussionTitleInput,
  discussionContentSchema,
  discussionContentPublicSchema,
  type DiscussionContentInput,
  createGroupDiscussionSchema,
  type CreateGroupDiscussionInput,
  updateGroupDiscussionSchema,
  type UpdateGroupDiscussionInput,

  // Reply schemas - use social prefix
  replyContentSchema as socialReplyContentSchema,
  replyContentPublicSchema as socialReplyContentPublicSchema,
  type ReplyContentInput as SocialReplyContentInput,
  createDiscussionReplySchema,
  type CreateDiscussionReplyInput,
  updateDiscussionReplySchema,
  type UpdateDiscussionReplyInput,

  // Query schemas
  groupSortFieldSchema,
  type GroupSortField,
  groupSortDirectionSchema,
  type GroupSortDirection,
  groupsQuerySchema,
  type GroupsQueryInput,
  browseGroupsQuerySchema,
  type BrowseGroupsQueryInput,
  groupDiscussionsQuerySchema,
  type GroupDiscussionsQueryInput,
  discussionRepliesQuerySchema,
  type DiscussionRepliesQueryInput,

  // Activity feed
  activityFeedQuerySchema,
  type ActivityFeedQueryInput,
  activityItemSchema,
  type ActivityItem,

  // ID params - use social prefix to avoid conflicts
  userIdParamsSchema as socialUserIdParamsSchema,
  type UserIdParamsInput as SocialUserIdParamsInput,
  usernameParamsSchema as socialUsernameParamsSchema,
  type UsernameParamsInput as SocialUsernameParamsInput,
  groupIdParamsSchema,
  type GroupIdParamsInput,
  discussionIdParamsSchema,
  type DiscussionIdParamsInput,
  groupDiscussionIdParamsSchema,
  type GroupDiscussionIdParamsInput,
  replyIdParamsSchema as socialReplyIdParamsSchema,
  type ReplyIdParamsInput as SocialReplyIdParamsInput,

  // Bulk operations
  bulkRemoveMembersSchema,
  type BulkRemoveMembersInput,

  // Response schemas
  followStatusSchema,
  type FollowStatus,
  groupMemberResponseSchema,
  type GroupMemberResponse,
  groupSummarySchema,
  type GroupSummary,
  groupResponseSchema,
  type GroupResponse,
  groupDiscussionResponseSchema,
  type GroupDiscussionResponse,
  discussionReplyResponseSchema,
  type DiscussionReplyResponse,

  // Collection
  socialSchemas,
} from "./social";

// User schemas - explicitly export to avoid conflicts
export {
  // Enums - use user prefix to avoid conflicts
  userTierSchema as userUserTierSchema,
  type UserTierSchema as UserUserTierSchema,
  themePreferenceSchema,
  type ThemePreferenceSchema,
  fontPreferenceSchema,
  type FontPreferenceSchema,
  languagePreferenceSchema,
  type LanguagePreferenceSchema,

  // IDs
  userIdSchema,
  type UserIdInput,
  clerkIdSchema,
  type ClerkIdInput,

  // Fields
  usernameSchema,
  type UsernameInput,
  emailSchema,
  type EmailInput,
  displayNameSchema,
  displayNamePublicSchema,
  type DisplayNameInput,
  firstNameSchema,
  type FirstNameInput,
  lastNameSchema,
  type LastNameInput,
  bioSchema,
  bioPublicSchema,
  type BioInput,
  avatarUrlSchema,
  type AvatarUrlInput,
  timezoneSchema,
  type TimezoneInput,
  readingLevelSchema,
  type ReadingLevelInput,

  // Privacy
  privacySettingsSchema,
  type PrivacySettingsInput,
  updatePrivacySettingsSchema,
  type UpdatePrivacySettingsInput,

  // Preferences
  readingPreferencesSchema,
  type ReadingPreferencesInput,
  notificationPreferencesSchema,
  type NotificationPreferencesInput,
  aiPreferencesSchema,
  type AiPreferencesInput,
  userPreferencesSchema,
  type UserPreferencesInput,
  updateUserPreferencesSchema,
  type UpdateUserPreferencesInput,

  // Profile
  updateUserProfileBaseSchema,
  type UpdateUserProfileBaseInput,
  updateUserProfileSchema,
  type UpdateUserProfileInput,
  completeProfileSetupSchema,
  type CompleteProfileSetupInput,

  // Query
  userSortFieldSchema,
  type UserSortField,
  userSortDirectionSchema,
  type UserSortDirection,
  userSearchQuerySchema,
  type UserSearchQueryInput,

  // ID params
  userIdParamsSchema,
  type UserIdParamsInput,
  usernameParamsSchema,
  type UsernameParamsInput,

  // Clerk webhooks
  clerkUserCreatedSchema,
  type ClerkUserCreatedData,
  clerkUserUpdatedSchema,
  type ClerkUserUpdatedData,
  clerkUserDeletedSchema,
  type ClerkUserDeletedData,

  // Response schemas
  userSummarySchema,
  type UserSummary,
  publicUserProfileSchema,
  type PublicUserProfile,
  privateUserProfileSchema,
  type PrivateUserProfile,

  // GDPR
  requestDataExportSchema,
  type RequestDataExportInput,
  deleteAccountSchema,
  type DeleteAccountInput,

  // Collection
  userSchemas,
} from "./users";
