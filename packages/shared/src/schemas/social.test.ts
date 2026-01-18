/**
 * Tests for Social Zod schemas
 *
 * This test suite validates:
 * - Enum schemas (groupRole, activityType)
 * - ID schemas (userId, groupId, discussionId, replyId)
 * - Follow schemas
 * - Reading group schemas with profanity filter
 * - Membership schemas
 * - Discussion and reply schemas
 * - Query schemas with pagination and filtering
 * - Activity feed schemas
 */

import { describe, expect, it } from "vitest";
import {
  // Enums
  groupRoleSchema,
  activityTypeSchema,

  // IDs
  userIdSchema,
  groupIdSchema,
  discussionIdSchema,
  replyIdSchema,
  inviteCodeSchema,

  // Follow schemas
  followUserSchema,
  unfollowUserSchema,
  followListQuerySchema,

  // Group schemas
  groupNameSchema,
  groupNamePublicSchema,
  groupDescriptionSchema,
  groupDescriptionPublicSchema,
  maxMembersSchema,
  createReadingGroupBaseSchema,
  createReadingGroupSchema,
  updateReadingGroupSchema,

  // Membership schemas
  joinGroupSchema,
  joinGroupWithInviteSchema,
  leaveGroupSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
  groupMembersQuerySchema,
  generateInviteCodeSchema,
  updateNotificationSettingsSchema,

  // Discussion schemas
  discussionTitleSchema,
  discussionTitlePublicSchema,
  discussionContentSchema,
  discussionContentPublicSchema,
  createGroupDiscussionSchema,
  updateGroupDiscussionSchema,

  // Reply schemas
  replyContentSchema,
  replyContentPublicSchema,
  createDiscussionReplySchema,
  updateDiscussionReplySchema,

  // Query schemas
  groupSortFieldSchema,
  groupsQuerySchema,
  browseGroupsQuerySchema,
  groupDiscussionsQuerySchema,
  discussionRepliesQuerySchema,

  // Activity feed
  activityFeedQuerySchema,
  activityItemSchema,

  // ID params
  userIdParamsSchema,
  usernameParamsSchema,
  groupIdParamsSchema,
  groupDiscussionIdParamsSchema,

  // Bulk operations
  bulkRemoveMembersSchema,

  // Response schemas
  followStatusSchema,
  groupMemberResponseSchema,
  groupSummarySchema,
  groupResponseSchema,
  groupDiscussionResponseSchema,
  discussionReplyResponseSchema,

  // Collection
  socialSchemas,
} from "./social";

// =============================================================================
// ENUM VALIDATION TESTS
// =============================================================================

describe("Social Enum Schemas", () => {
  describe("groupRoleSchema", () => {
    it("should accept valid group roles", () => {
      expect(groupRoleSchema.parse("OWNER")).toBe("OWNER");
      expect(groupRoleSchema.parse("ADMIN")).toBe("ADMIN");
      expect(groupRoleSchema.parse("MEMBER")).toBe("MEMBER");
    });

    it("should reject invalid group roles", () => {
      expect(() => groupRoleSchema.parse("owner")).toThrow();
      expect(() => groupRoleSchema.parse("MODERATOR")).toThrow();
      expect(() => groupRoleSchema.parse("")).toThrow();
    });
  });

  describe("activityTypeSchema", () => {
    it("should accept valid activity types", () => {
      expect(activityTypeSchema.parse("BOOK_STARTED")).toBe("BOOK_STARTED");
      expect(activityTypeSchema.parse("BOOK_COMPLETED")).toBe("BOOK_COMPLETED");
      expect(activityTypeSchema.parse("ACHIEVEMENT_EARNED")).toBe(
        "ACHIEVEMENT_EARNED"
      );
      expect(activityTypeSchema.parse("HIGHLIGHT_SHARED")).toBe(
        "HIGHLIGHT_SHARED"
      );
      expect(activityTypeSchema.parse("GROUP_JOINED")).toBe("GROUP_JOINED");
      expect(activityTypeSchema.parse("CURRICULUM_FOLLOWED")).toBe(
        "CURRICULUM_FOLLOWED"
      );
      expect(activityTypeSchema.parse("REVIEW_SHARED")).toBe("REVIEW_SHARED");
    });

    it("should reject invalid activity types", () => {
      expect(() => activityTypeSchema.parse("book_started")).toThrow();
      expect(() => activityTypeSchema.parse("LIKED")).toThrow();
    });
  });
});

// =============================================================================
// ID SCHEMA TESTS
// =============================================================================

describe("Social ID Schemas", () => {
  describe("userIdSchema", () => {
    it("should accept valid CUID format", () => {
      expect(userIdSchema.parse("clhuser123")).toBe("clhuser123");
      expect(userIdSchema.parse("c123")).toBe("c123");
    });

    it("should reject invalid formats", () => {
      expect(() => userIdSchema.parse("")).toThrow();
      expect(() => userIdSchema.parse("abc123")).toThrow();
    });
  });

  describe("groupIdSchema", () => {
    it("should accept valid group IDs", () => {
      expect(groupIdSchema.parse("clhgroup123")).toBe("clhgroup123");
    });

    it("should reject invalid formats", () => {
      expect(() => groupIdSchema.parse("")).toThrow();
      expect(() => groupIdSchema.parse("invalid")).toThrow();
    });
  });

  describe("discussionIdSchema", () => {
    it("should accept valid discussion IDs", () => {
      expect(discussionIdSchema.parse("clhdiscussion123")).toBe(
        "clhdiscussion123"
      );
    });
  });

  describe("replyIdSchema", () => {
    it("should accept valid reply IDs", () => {
      expect(replyIdSchema.parse("clhreply123")).toBe("clhreply123");
    });
  });

  describe("inviteCodeSchema", () => {
    it("should accept valid invite codes", () => {
      expect(inviteCodeSchema.parse("abc123")).toBe("abc123");
      expect(inviteCodeSchema.parse("invite-code_123")).toBe("invite-code_123");
    });

    it("should reject codes under 6 characters", () => {
      expect(() => inviteCodeSchema.parse("abc12")).toThrow();
    });

    it("should reject codes over 50 characters", () => {
      expect(() => inviteCodeSchema.parse("a".repeat(51))).toThrow();
    });

    it("should reject invalid characters", () => {
      expect(() => inviteCodeSchema.parse("invite@code")).toThrow();
      expect(() => inviteCodeSchema.parse("invite code")).toThrow();
    });
  });
});

// =============================================================================
// FOLLOW SCHEMA TESTS
// =============================================================================

describe("Follow Schemas", () => {
  describe("followUserSchema", () => {
    it("should accept valid user ID", () => {
      const result = followUserSchema.parse({
        userId: "clhuser123",
      });
      expect(result.userId).toBe("clhuser123");
    });
  });

  describe("unfollowUserSchema", () => {
    it("should accept valid user ID", () => {
      const result = unfollowUserSchema.parse({
        userId: "clhuser123",
      });
      expect(result.userId).toBe("clhuser123");
    });
  });

  describe("followListQuerySchema", () => {
    it("should apply defaults", () => {
      const result = followListQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("should accept search parameter", () => {
      const result = followListQuerySchema.parse({
        search: "john",
      });
      expect(result.search).toBe("john");
    });
  });
});

// =============================================================================
// READING GROUP SCHEMA TESTS
// =============================================================================

describe("Reading Group Schemas", () => {
  describe("groupNameSchema", () => {
    it("should accept valid names", () => {
      expect(groupNameSchema.parse("Classic Literature Club")).toBe(
        "Classic Literature Club"
      );
    });

    it("should trim whitespace", () => {
      expect(groupNameSchema.parse("  Book Club  ")).toBe("Book Club");
    });

    it("should reject empty names", () => {
      expect(() => groupNameSchema.parse("")).toThrow();
    });

    it("should reject names over 200 characters", () => {
      expect(() => groupNameSchema.parse("a".repeat(201))).toThrow();
    });
  });

  describe("groupNamePublicSchema", () => {
    it("should accept clean names", () => {
      expect(groupNamePublicSchema.parse("Philosophy Book Club")).toBe(
        "Philosophy Book Club"
      );
    });

    it("should reject names with profanity", () => {
      expect(() =>
        groupNamePublicSchema.parse("The Fucking Book Club")
      ).toThrow(/inappropriate/i);
    });
  });

  describe("groupDescriptionSchema", () => {
    it("should accept valid descriptions", () => {
      expect(groupDescriptionSchema.parse("We read classics")).toBe(
        "We read classics"
      );
    });

    it("should accept optional/nullable values", () => {
      expect(groupDescriptionSchema.parse(undefined)).toBeUndefined();
      expect(groupDescriptionSchema.parse(null)).toBeNull();
    });
  });

  describe("groupDescriptionPublicSchema", () => {
    it("should reject descriptions with profanity", () => {
      expect(() =>
        groupDescriptionPublicSchema.parse("This is some bullshit group")
      ).toThrow(/inappropriate/i);
    });
  });

  describe("maxMembersSchema", () => {
    it("should accept valid member counts", () => {
      expect(maxMembersSchema.parse(50)).toBe(50);
      expect(maxMembersSchema.parse(1000)).toBe(1000);
    });

    it("should accept optional/nullable values", () => {
      expect(maxMembersSchema.parse(undefined)).toBeUndefined();
      expect(maxMembersSchema.parse(null)).toBeNull();
    });

    it("should reject counts over 1000", () => {
      expect(() => maxMembersSchema.parse(1001)).toThrow();
    });
  });

  describe("createReadingGroupBaseSchema", () => {
    it("should accept valid group data", () => {
      const result = createReadingGroupBaseSchema.parse({
        name: "Book Club",
        description: "We read books",
      });
      expect(result.name).toBe("Book Club");
      expect(result.isPublic).toBe(true);
      expect(result.maxMembers).toBe(50);
    });
  });

  describe("createReadingGroupSchema (with profanity filter)", () => {
    it("should accept clean content", () => {
      const result = createReadingGroupSchema.parse({
        name: "Philosophy Reading Group",
        description: "Discussion of philosophical texts",
        isPublic: true,
      });
      expect(result.name).toBe("Philosophy Reading Group");
    });

    it("should reject profanity in name", () => {
      expect(() =>
        createReadingGroupSchema.parse({
          name: "Fucking Book Club",
          description: "Clean description",
        })
      ).toThrow(/inappropriate/i);
    });

    it("should reject profanity in description", () => {
      expect(() =>
        createReadingGroupSchema.parse({
          name: "Book Club",
          description: "This shit is great",
        })
      ).toThrow(/inappropriate/i);
    });
  });

  describe("updateReadingGroupSchema", () => {
    it("should accept partial updates", () => {
      const result = updateReadingGroupSchema.parse({
        name: "Updated Name",
      });
      expect(result.name).toBe("Updated Name");
    });

    it("should reject empty update", () => {
      expect(() => updateReadingGroupSchema.parse({})).toThrow(
        /at least one field/i
      );
    });

    it("should reject profanity in updates", () => {
      expect(() =>
        updateReadingGroupSchema.parse({
          name: "Shit Name",
        })
      ).toThrow(/inappropriate/i);
    });
  });
});

// =============================================================================
// MEMBERSHIP SCHEMA TESTS
// =============================================================================

describe("Membership Schemas", () => {
  describe("joinGroupSchema", () => {
    it("should accept valid group ID", () => {
      const result = joinGroupSchema.parse({
        groupId: "clhgroup123",
      });
      expect(result.groupId).toBe("clhgroup123");
    });
  });

  describe("joinGroupWithInviteSchema", () => {
    it("should accept valid invite code", () => {
      const result = joinGroupWithInviteSchema.parse({
        inviteCode: "abc123xyz",
      });
      expect(result.inviteCode).toBe("abc123xyz");
    });
  });

  describe("leaveGroupSchema", () => {
    it("should accept valid group ID", () => {
      const result = leaveGroupSchema.parse({
        groupId: "clhgroup123",
      });
      expect(result.groupId).toBe("clhgroup123");
    });
  });

  describe("updateMemberRoleSchema", () => {
    it("should accept valid role update", () => {
      const result = updateMemberRoleSchema.parse({
        userId: "clhuser123",
        role: "ADMIN",
      });
      expect(result.role).toBe("ADMIN");
    });
  });

  describe("removeMemberSchema", () => {
    it("should accept valid user ID", () => {
      const result = removeMemberSchema.parse({
        userId: "clhuser123",
      });
      expect(result.userId).toBe("clhuser123");
    });
  });

  describe("groupMembersQuerySchema", () => {
    it("should apply defaults", () => {
      const result = groupMembersQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("should accept role filter", () => {
      const result = groupMembersQuerySchema.parse({
        role: "ADMIN",
      });
      expect(result.role).toBe("ADMIN");
    });
  });

  describe("generateInviteCodeSchema", () => {
    it("should accept valid group ID", () => {
      const result = generateInviteCodeSchema.parse({
        groupId: "clhgroup123",
      });
      expect(result.groupId).toBe("clhgroup123");
    });
  });

  describe("updateNotificationSettingsSchema", () => {
    it("should accept notification toggle", () => {
      const result = updateNotificationSettingsSchema.parse({
        notificationsEnabled: false,
      });
      expect(result.notificationsEnabled).toBe(false);
    });
  });
});

// =============================================================================
// DISCUSSION SCHEMA TESTS
// =============================================================================

describe("Discussion Schemas", () => {
  describe("discussionTitleSchema", () => {
    it("should accept valid titles", () => {
      expect(discussionTitleSchema.parse("Book Discussion")).toBe(
        "Book Discussion"
      );
    });

    it("should reject titles over 300 characters", () => {
      expect(() => discussionTitleSchema.parse("a".repeat(301))).toThrow();
    });
  });

  describe("discussionTitlePublicSchema", () => {
    it("should reject profanity", () => {
      expect(() =>
        discussionTitlePublicSchema.parse("Fucking Great Book")
      ).toThrow(/inappropriate/i);
    });
  });

  describe("discussionContentSchema", () => {
    it("should accept valid content", () => {
      expect(
        discussionContentSchema.parse("I really enjoyed this chapter...")
      ).toBe("I really enjoyed this chapter...");
    });

    it("should reject content over 50,000 characters", () => {
      expect(() => discussionContentSchema.parse("a".repeat(50001))).toThrow();
    });
  });

  describe("discussionContentPublicSchema", () => {
    it("should reject profanity", () => {
      expect(() =>
        discussionContentPublicSchema.parse("This is bullshit content")
      ).toThrow(/inappropriate/i);
    });
  });

  describe("createGroupDiscussionSchema", () => {
    it("should accept valid discussion", () => {
      const result = createGroupDiscussionSchema.parse({
        title: "Weekly Discussion",
        content: "Let's discuss chapter 5 of the book.",
      });
      expect(result.title).toBe("Weekly Discussion");
    });

    it("should accept discussion with book reference", () => {
      const result = createGroupDiscussionSchema.parse({
        title: "Book Discussion",
        content: "Thoughts on this book?",
        bookId: "clhbook123",
      });
      expect(result.bookId).toBe("clhbook123");
    });

    it("should reject profanity in title", () => {
      expect(() =>
        createGroupDiscussionSchema.parse({
          title: "Fucking Great Discussion",
          content: "Clean content",
        })
      ).toThrow(/inappropriate/i);
    });

    it("should reject profanity in content", () => {
      expect(() =>
        createGroupDiscussionSchema.parse({
          title: "Discussion",
          content: "This shit is great",
        })
      ).toThrow(/inappropriate/i);
    });
  });

  describe("updateGroupDiscussionSchema", () => {
    it("should accept partial updates", () => {
      const result = updateGroupDiscussionSchema.parse({
        title: "Updated Title",
      });
      expect(result.title).toBe("Updated Title");
    });

    it("should accept moderation flags", () => {
      const result = updateGroupDiscussionSchema.parse({
        isPinned: true,
        isLocked: false,
      });
      expect(result.isPinned).toBe(true);
    });

    it("should reject empty update", () => {
      expect(() => updateGroupDiscussionSchema.parse({})).toThrow(
        /at least one field/i
      );
    });
  });
});

// =============================================================================
// REPLY SCHEMA TESTS
// =============================================================================

describe("Reply Schemas", () => {
  describe("replyContentSchema", () => {
    it("should accept valid reply content", () => {
      expect(replyContentSchema.parse("I agree with this point!")).toBe(
        "I agree with this point!"
      );
    });

    it("should reject empty content", () => {
      expect(() => replyContentSchema.parse("")).toThrow();
    });
  });

  describe("replyContentPublicSchema", () => {
    it("should reject profanity", () => {
      expect(() => replyContentPublicSchema.parse("Go fuck yourself")).toThrow(
        /inappropriate/i
      );
    });
  });

  describe("createDiscussionReplySchema", () => {
    it("should accept valid reply", () => {
      const result = createDiscussionReplySchema.parse({
        content: "Great point!",
      });
      expect(result.content).toBe("Great point!");
    });

    it("should accept nested reply", () => {
      const result = createDiscussionReplySchema.parse({
        content: "Reply to the reply",
        parentReplyId: "clhreply123",
      });
      expect(result.parentReplyId).toBe("clhreply123");
    });

    it("should reject profanity", () => {
      expect(() =>
        createDiscussionReplySchema.parse({
          content: "This is bullshit",
        })
      ).toThrow(/inappropriate/i);
    });
  });

  describe("updateDiscussionReplySchema", () => {
    it("should accept updated content", () => {
      const result = updateDiscussionReplySchema.parse({
        content: "Updated reply content",
      });
      expect(result.content).toBe("Updated reply content");
    });

    it("should reject profanity in updates", () => {
      expect(() =>
        updateDiscussionReplySchema.parse({
          content: "Updated shit content",
        })
      ).toThrow(/inappropriate/i);
    });
  });
});

// =============================================================================
// QUERY SCHEMA TESTS
// =============================================================================

describe("Social Query Schemas", () => {
  describe("groupsQuerySchema", () => {
    it("should apply defaults", () => {
      const result = groupsQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe("createdAt");
      expect(result.sortDirection).toBe("desc");
      expect(result.includeDeleted).toBe(false);
    });

    it("should accept filter options", () => {
      const result = groupsQuerySchema.parse({
        isPublic: true,
        hasCurrentBook: true,
        search: "philosophy",
      });
      expect(result.isPublic).toBe(true);
      expect(result.hasCurrentBook).toBe(true);
    });
  });

  describe("browseGroupsQuerySchema", () => {
    it("should apply defaults for public browsing", () => {
      const result = browseGroupsQuerySchema.parse({});
      expect(result.sortBy).toBe("membersCount");
    });

    it("should accept member count filters", () => {
      const result = browseGroupsQuerySchema.parse({
        minMembers: 10,
        maxMembers: 100,
      });
      expect(result.minMembers).toBe(10);
      expect(result.maxMembers).toBe(100);
    });
  });

  describe("groupDiscussionsQuerySchema", () => {
    it("should apply defaults", () => {
      const result = groupDiscussionsQuerySchema.parse({});
      expect(result.sortBy).toBe("lastReplyAt");
    });

    it("should accept filters", () => {
      const result = groupDiscussionsQuerySchema.parse({
        bookId: "clhbook123",
        isPinned: true,
      });
      expect(result.bookId).toBe("clhbook123");
      expect(result.isPinned).toBe(true);
    });
  });

  describe("discussionRepliesQuerySchema", () => {
    it("should apply defaults", () => {
      const result = discussionRepliesQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.maxDepth).toBe(5);
      expect(result.sortDirection).toBe("asc");
    });
  });

  describe("groupSortFieldSchema", () => {
    it("should accept valid sort fields", () => {
      expect(groupSortFieldSchema.parse("createdAt")).toBe("createdAt");
      expect(groupSortFieldSchema.parse("membersCount")).toBe("membersCount");
      expect(groupSortFieldSchema.parse("discussionsCount")).toBe(
        "discussionsCount"
      );
      expect(groupSortFieldSchema.parse("name")).toBe("name");
    });

    it("should reject invalid sort fields", () => {
      expect(() => groupSortFieldSchema.parse("invalid")).toThrow();
    });
  });
});

// =============================================================================
// ACTIVITY FEED SCHEMA TESTS
// =============================================================================

describe("Activity Feed Schemas", () => {
  describe("activityFeedQuerySchema", () => {
    it("should apply defaults", () => {
      const result = activityFeedQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("should accept activity type filter", () => {
      const result = activityFeedQuerySchema.parse({
        activityTypes: "BOOK_STARTED,BOOK_COMPLETED",
      });
      expect(result.activityTypes).toEqual(["BOOK_STARTED", "BOOK_COMPLETED"]);
    });

    it("should accept since date", () => {
      const result = activityFeedQuerySchema.parse({
        since: "2024-01-01",
      });
      expect(result.since).toBeInstanceOf(Date);
    });
  });

  describe("activityItemSchema", () => {
    it("should accept valid activity item", () => {
      const result = activityItemSchema.parse({
        id: "clhactivity123",
        type: "BOOK_STARTED",
        userId: "clhuser123",
        user: {
          id: "clhuser123",
          username: "reader",
          displayName: "Book Reader",
          avatarUrl: null,
        },
        data: { bookId: "clhbook123", bookTitle: "Great Book" },
        createdAt: "2024-01-15T10:00:00Z",
      });
      expect(result.type).toBe("BOOK_STARTED");
    });
  });
});

// =============================================================================
// ID PARAMS SCHEMA TESTS
// =============================================================================

describe("Social ID Params Schemas", () => {
  describe("userIdParamsSchema", () => {
    it("should accept valid user ID", () => {
      const result = userIdParamsSchema.parse({
        id: "clhuser123",
      });
      expect(result.id).toBe("clhuser123");
    });
  });

  describe("usernameParamsSchema", () => {
    it("should accept valid username", () => {
      const result = usernameParamsSchema.parse({
        username: "book_reader",
      });
      expect(result.username).toBe("book_reader");
    });

    it("should reject username under 3 characters", () => {
      expect(() =>
        usernameParamsSchema.parse({
          username: "ab",
        })
      ).toThrow();
    });
  });

  describe("groupIdParamsSchema", () => {
    it("should accept valid group ID", () => {
      const result = groupIdParamsSchema.parse({
        id: "clhgroup123",
      });
      expect(result.id).toBe("clhgroup123");
    });
  });

  describe("groupDiscussionIdParamsSchema", () => {
    it("should accept valid nested params", () => {
      const result = groupDiscussionIdParamsSchema.parse({
        groupId: "clhgroup123",
        discussionId: "clhdiscussion456",
      });
      expect(result.groupId).toBe("clhgroup123");
      expect(result.discussionId).toBe("clhdiscussion456");
    });
  });
});

// =============================================================================
// BULK OPERATIONS SCHEMA TESTS
// =============================================================================

describe("Bulk Operations Schemas", () => {
  describe("bulkRemoveMembersSchema", () => {
    it("should accept array of user IDs", () => {
      const result = bulkRemoveMembersSchema.parse({
        userIds: ["clhuser1", "clhuser2", "clhuser3"],
      });
      expect(result.userIds).toHaveLength(3);
    });

    it("should reject empty array", () => {
      expect(() =>
        bulkRemoveMembersSchema.parse({
          userIds: [],
        })
      ).toThrow(/at least one/i);
    });

    it("should reject more than 100 IDs", () => {
      const ids = Array.from({ length: 101 }, (_, i) => `clhuser${i}`);
      expect(() =>
        bulkRemoveMembersSchema.parse({
          userIds: ids,
        })
      ).toThrow(/100/);
    });
  });
});

// =============================================================================
// RESPONSE SCHEMA TESTS
// =============================================================================

describe("Social Response Schemas", () => {
  describe("followStatusSchema", () => {
    it("should accept valid follow status", () => {
      const result = followStatusSchema.parse({
        isFollowing: true,
        isFollowedBy: false,
      });
      expect(result.isFollowing).toBe(true);
      expect(result.isFollowedBy).toBe(false);
    });
  });

  describe("groupMemberResponseSchema", () => {
    it("should accept valid member response", () => {
      const result = groupMemberResponseSchema.parse({
        id: "clhmembership123",
        userId: "clhuser123",
        user: {
          id: "clhuser123",
          username: "reader",
          displayName: "Book Reader",
          avatarUrl: null,
        },
        role: "MEMBER",
        joinedAt: "2024-01-15T10:00:00Z",
        notificationsEnabled: true,
      });
      expect(result.role).toBe("MEMBER");
    });
  });

  describe("groupSummarySchema", () => {
    it("should accept valid group summary", () => {
      const result = groupSummarySchema.parse({
        id: "clhgroup123",
        name: "Philosophy Club",
        description: "We discuss philosophy",
        coverImage: null,
        isPublic: true,
        maxMembers: 50,
        membersCount: 25,
        discussionsCount: 10,
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
      });
      expect(result.membersCount).toBe(25);
    });
  });

  describe("groupResponseSchema", () => {
    it("should accept full group response", () => {
      const result = groupResponseSchema.parse({
        id: "clhgroup123",
        name: "Philosophy Club",
        description: null,
        coverImage: null,
        isPublic: true,
        maxMembers: null,
        membersCount: 10,
        discussionsCount: 5,
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        isMember: true,
        userRole: "ADMIN",
      });
      expect(result.isMember).toBe(true);
      expect(result.userRole).toBe("ADMIN");
    });
  });

  describe("groupDiscussionResponseSchema", () => {
    it("should accept valid discussion response", () => {
      const result = groupDiscussionResponseSchema.parse({
        id: "clhdiscussion123",
        title: "Weekly Discussion",
        content: "Let's discuss this week's reading.",
        bookId: null,
        isPinned: false,
        isLocked: false,
        repliesCount: 5,
        lastReplyAt: "2024-01-15T12:00:00Z",
        user: {
          id: "clhuser123",
          username: "reader",
          displayName: "Book Reader",
          avatarUrl: null,
        },
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
      });
      expect(result.repliesCount).toBe(5);
    });
  });

  describe("discussionReplyResponseSchema", () => {
    it("should accept valid reply response", () => {
      const result = discussionReplyResponseSchema.parse({
        id: "clhreply123",
        content: "Great point!",
        parentReplyId: null,
        user: {
          id: "clhuser123",
          username: "reader",
          displayName: "Book Reader",
          avatarUrl: null,
        },
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
      });
      expect(result.content).toBe("Great point!");
    });
  });
});

// =============================================================================
// SCHEMA COLLECTION EXPORT TESTS
// =============================================================================

describe("socialSchemas collection", () => {
  it("should export all enum schemas", () => {
    expect(socialSchemas.groupRole).toBeDefined();
    expect(socialSchemas.activityType).toBeDefined();
  });

  it("should export all ID schemas", () => {
    expect(socialSchemas.userId).toBeDefined();
    expect(socialSchemas.groupId).toBeDefined();
    expect(socialSchemas.discussionId).toBeDefined();
    expect(socialSchemas.replyId).toBeDefined();
    expect(socialSchemas.inviteCode).toBeDefined();
  });

  it("should export all follow schemas", () => {
    expect(socialSchemas.followUser).toBeDefined();
    expect(socialSchemas.unfollowUser).toBeDefined();
    expect(socialSchemas.followListQuery).toBeDefined();
  });

  it("should export all group schemas", () => {
    expect(socialSchemas.createGroup).toBeDefined();
    expect(socialSchemas.createGroupBase).toBeDefined();
    expect(socialSchemas.updateGroup).toBeDefined();
  });

  it("should export all membership schemas", () => {
    expect(socialSchemas.joinGroup).toBeDefined();
    expect(socialSchemas.joinGroupWithInvite).toBeDefined();
    expect(socialSchemas.leaveGroup).toBeDefined();
    expect(socialSchemas.updateMemberRole).toBeDefined();
    expect(socialSchemas.removeMember).toBeDefined();
  });

  it("should export all discussion schemas", () => {
    expect(socialSchemas.createDiscussion).toBeDefined();
    expect(socialSchemas.updateDiscussion).toBeDefined();
  });

  it("should export all reply schemas", () => {
    expect(socialSchemas.createReply).toBeDefined();
    expect(socialSchemas.updateReply).toBeDefined();
  });

  it("should export all query schemas", () => {
    expect(socialSchemas.groupsQuery).toBeDefined();
    expect(socialSchemas.browseGroups).toBeDefined();
    expect(socialSchemas.discussionsQuery).toBeDefined();
    expect(socialSchemas.repliesQuery).toBeDefined();
  });

  it("should export activity feed schemas", () => {
    expect(socialSchemas.activityFeedQuery).toBeDefined();
    expect(socialSchemas.activityItem).toBeDefined();
  });

  it("should export response schemas", () => {
    expect(socialSchemas.followStatus).toBeDefined();
    expect(socialSchemas.memberResponse).toBeDefined();
    expect(socialSchemas.groupSummary).toBeDefined();
    expect(socialSchemas.groupResponse).toBeDefined();
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe("Edge Cases", () => {
  describe("Unicode and special characters", () => {
    it("should accept unicode in group name", () => {
      const result = groupNameSchema.parse("读书俱乐部");
      expect(result).toBe("读书俱乐部");
    });

    it("should accept unicode in discussion content", () => {
      const result =
        discussionContentSchema.parse("これは日本語のディスカッションです。");
      expect(result).toContain("日本語");
    });

    it("should accept RTL content", () => {
      const result = groupDescriptionSchema.parse("نادي القراءة للكتب العربية");
      expect(result).toContain("القراءة");
    });
  });

  describe("Boundary conditions", () => {
    it("should accept group name of exactly 200 characters", () => {
      const maxName = "a".repeat(200);
      expect(groupNameSchema.parse(maxName).length).toBe(200);
    });

    it("should accept discussion title of exactly 300 characters", () => {
      const maxTitle = "a".repeat(300);
      expect(discussionTitleSchema.parse(maxTitle).length).toBe(300);
    });

    it("should accept invite code of exactly 6 characters", () => {
      expect(inviteCodeSchema.parse("abc123")).toBe("abc123");
    });

    it("should accept invite code of exactly 50 characters", () => {
      const maxCode = "a".repeat(50);
      expect(inviteCodeSchema.parse(maxCode).length).toBe(50);
    });
  });

  describe("Whitespace handling", () => {
    it("should trim whitespace from group name", () => {
      expect(groupNameSchema.parse("  Book Club  ")).toBe("Book Club");
    });

    it("should trim whitespace from discussion content", () => {
      expect(discussionContentSchema.parse("  Content here  ")).toBe(
        "Content here"
      );
    });
  });
});
