/**
 * Tests for Forum Zod schemas
 *
 * This test suite validates:
 * - Enum schemas (userTier, voteValue, reportType)
 * - ID schemas (postId, replyId, categoryId, categorySlug)
 * - Content field schemas (title, content with profanity filter)
 * - Create/update schemas for posts and replies
 * - Vote schemas
 * - Moderation schemas
 * - Query schemas with pagination and filtering
 * - Bulk operation schemas
 * - Search schemas
 */

import { describe, expect, it } from "vitest";
import {
  // Enums
  userTierSchema,
  voteValueSchema,
  reportTypeSchema,

  // IDs
  forumPostIdSchema,
  forumReplyIdSchema,
  forumCategoryIdSchema,
  forumCategorySlugSchema,
  forumBookIdSchema,

  // Fields
  forumPostTitleSchema,
  forumPostTitlePublicSchema,
  forumContentSchema,
  forumContentPublicSchema,
  forumReplyContentSchema,
  forumReplyContentPublicSchema,

  // Category
  forumCategoryResponseSchema,

  // Post
  createForumPostSchema,
  createForumPostBaseSchema,
  updateForumPostSchema,
  forumPostQuerySchema,
  forumPostSortFieldSchema,
  postIdParamsSchema,
  categoryPostIdParamsSchema,

  // Reply
  createForumReplySchema,
  updateForumReplySchema,
  forumReplyQuerySchema,
  forumReplySortFieldSchema,
  replyIdParamsSchema,
  postReplyIdParamsSchema,

  // Vote
  voteOnPostSchema,
  voteOnReplySchema,
  removePostVoteSchema,
  removeReplyVoteSchema,
  forumVoteSchema,

  // Moderation
  markBestAnswerSchema,
  togglePinPostSchema,
  toggleLockPostSchema,
  reportContentSchema,

  // Bulk operations
  bulkDeletePostsSchema,
  bulkDeleteRepliesSchema,

  // Search
  forumSearchSchema,

  // Collection
  forumSchemas,
} from "./forum";

// =============================================================================
// ENUM VALIDATION TESTS
// =============================================================================

describe("Forum Enum Schemas", () => {
  describe("userTierSchema", () => {
    it("should accept valid user tiers", () => {
      expect(userTierSchema.parse("FREE")).toBe("FREE");
      expect(userTierSchema.parse("PRO")).toBe("PRO");
      expect(userTierSchema.parse("SCHOLAR")).toBe("SCHOLAR");
    });

    it("should reject invalid user tiers", () => {
      expect(() => userTierSchema.parse("PREMIUM")).toThrow();
      expect(() => userTierSchema.parse("free")).toThrow();
      expect(() => userTierSchema.parse("")).toThrow();
    });
  });

  describe("voteValueSchema", () => {
    it("should accept valid vote values", () => {
      expect(voteValueSchema.parse(1)).toBe(1);
      expect(voteValueSchema.parse(-1)).toBe(-1);
    });

    it("should reject invalid vote values", () => {
      expect(() => voteValueSchema.parse(0)).toThrow();
      expect(() => voteValueSchema.parse(2)).toThrow();
      expect(() => voteValueSchema.parse(-2)).toThrow();
      expect(() => voteValueSchema.parse(1.5)).toThrow();
      expect(() => voteValueSchema.parse("1")).toThrow();
    });
  });

  describe("reportTypeSchema", () => {
    it("should accept valid report types", () => {
      expect(reportTypeSchema.parse("SPAM")).toBe("SPAM");
      expect(reportTypeSchema.parse("HARASSMENT")).toBe("HARASSMENT");
      expect(reportTypeSchema.parse("INAPPROPRIATE")).toBe("INAPPROPRIATE");
      expect(reportTypeSchema.parse("OFF_TOPIC")).toBe("OFF_TOPIC");
      expect(reportTypeSchema.parse("MISINFORMATION")).toBe("MISINFORMATION");
      expect(reportTypeSchema.parse("OTHER")).toBe("OTHER");
    });

    it("should reject invalid report types", () => {
      expect(() => reportTypeSchema.parse("spam")).toThrow();
      expect(() => reportTypeSchema.parse("ABUSE")).toThrow();
    });
  });
});

// =============================================================================
// ID SCHEMA TESTS
// =============================================================================

describe("Forum ID Schemas", () => {
  describe("forumPostIdSchema", () => {
    it("should accept valid CUID format", () => {
      expect(forumPostIdSchema.parse("clh1234567890abcdef")).toBe(
        "clh1234567890abcdef"
      );
      expect(forumPostIdSchema.parse("c123")).toBe("c123");
    });

    it("should reject invalid formats", () => {
      expect(() => forumPostIdSchema.parse("")).toThrow();
      expect(() => forumPostIdSchema.parse("abc123")).toThrow();
      expect(() => forumPostIdSchema.parse("CLH1234")).toThrow();
      expect(() => forumPostIdSchema.parse("c-123")).toThrow();
    });
  });

  describe("forumReplyIdSchema", () => {
    it("should accept valid CUID format", () => {
      expect(forumReplyIdSchema.parse("clh1234567890")).toBe("clh1234567890");
    });

    it("should reject invalid formats", () => {
      expect(() => forumReplyIdSchema.parse("")).toThrow();
      expect(() => forumReplyIdSchema.parse("invalid")).toThrow();
    });
  });

  describe("forumCategoryIdSchema", () => {
    it("should accept valid CUID format", () => {
      expect(forumCategoryIdSchema.parse("clhcategory123")).toBe(
        "clhcategory123"
      );
    });

    it("should reject invalid formats", () => {
      expect(() => forumCategoryIdSchema.parse("")).toThrow();
    });
  });

  describe("forumCategorySlugSchema", () => {
    it("should accept valid URL-friendly slugs", () => {
      expect(forumCategorySlugSchema.parse("general-discussion")).toBe(
        "general-discussion"
      );
      expect(forumCategorySlugSchema.parse("book-recommendations")).toBe(
        "book-recommendations"
      );
      expect(forumCategorySlugSchema.parse("qa")).toBe("qa");
      expect(forumCategorySlugSchema.parse("help123")).toBe("help123");
    });

    it("should reject invalid slugs", () => {
      expect(() => forumCategorySlugSchema.parse("General")).toThrow(); // Uppercase
      expect(() => forumCategorySlugSchema.parse("has_underscore")).toThrow();
      expect(() =>
        forumCategorySlugSchema.parse("-starts-with-hyphen")
      ).toThrow();
      expect(() =>
        forumCategorySlugSchema.parse("ends-with-hyphen-")
      ).toThrow();
      expect(() => forumCategorySlugSchema.parse("a")).toThrow(); // Too short
    });
  });

  describe("forumBookIdSchema", () => {
    it("should accept valid book IDs", () => {
      expect(forumBookIdSchema.parse("clhbook123")).toBe("clhbook123");
    });

    it("should accept optional/nullable values", () => {
      expect(forumBookIdSchema.parse(undefined)).toBeUndefined();
      expect(forumBookIdSchema.parse(null)).toBeNull();
    });

    it("should reject invalid book IDs", () => {
      expect(() => forumBookIdSchema.parse("invalid-id")).toThrow();
    });
  });
});

// =============================================================================
// CONTENT FIELD SCHEMA TESTS
// =============================================================================

describe("Forum Content Field Schemas", () => {
  describe("forumPostTitleSchema", () => {
    it("should accept valid titles", () => {
      expect(forumPostTitleSchema.parse("How to improve reading speed?")).toBe(
        "How to improve reading speed?"
      );
      expect(forumPostTitleSchema.parse("Q&A")).toBe("Q&A"); // 3 chars minimum
    });

    it("should trim whitespace", () => {
      expect(forumPostTitleSchema.parse("  Title with spaces  ")).toBe(
        "Title with spaces"
      );
    });

    it("should reject too short titles", () => {
      expect(() => forumPostTitleSchema.parse("Hi")).toThrow();
      expect(() => forumPostTitleSchema.parse("")).toThrow();
    });

    it("should reject too long titles", () => {
      const longTitle = "a".repeat(201);
      expect(() => forumPostTitleSchema.parse(longTitle)).toThrow();
    });

    it("should accept exactly 200 characters", () => {
      const maxTitle = "a".repeat(200);
      expect(forumPostTitleSchema.parse(maxTitle)).toBe(maxTitle);
    });
  });

  describe("forumPostTitlePublicSchema", () => {
    it("should accept clean titles", () => {
      expect(forumPostTitlePublicSchema.parse("Best books for beginners")).toBe(
        "Best books for beginners"
      );
    });

    it("should reject titles with profanity", () => {
      expect(() =>
        forumPostTitlePublicSchema.parse("This is fucking awesome")
      ).toThrow(/inappropriate/i);
      expect(() =>
        forumPostTitlePublicSchema.parse("What the shit is this")
      ).toThrow(/inappropriate/i);
    });
  });

  describe("forumContentSchema", () => {
    it("should accept valid content", () => {
      const content = "This is a detailed post about reading comprehension.";
      expect(forumContentSchema.parse(content)).toBe(content);
    });

    it("should reject content under 10 characters", () => {
      expect(() => forumContentSchema.parse("Short")).toThrow();
      expect(() => forumContentSchema.parse("123456789")).toThrow(); // 9 chars
    });

    it("should accept content of exactly 10 characters", () => {
      expect(forumContentSchema.parse("1234567890")).toBe("1234567890");
    });

    it("should reject content over 50,000 characters", () => {
      const longContent = "a".repeat(50001);
      expect(() => forumContentSchema.parse(longContent)).toThrow();
    });

    it("should accept content of exactly 50,000 characters", () => {
      const maxContent = "a".repeat(50000);
      expect(forumContentSchema.parse(maxContent).length).toBe(50000);
    });
  });

  describe("forumContentPublicSchema", () => {
    it("should accept clean content", () => {
      const content = "I recommend starting with classic literature.";
      expect(forumContentPublicSchema.parse(content)).toBe(content);
    });

    it("should reject content with profanity", () => {
      expect(() =>
        forumContentPublicSchema.parse(
          "This book is complete bullshit and waste of time"
        )
      ).toThrow(/inappropriate/i);
    });
  });

  describe("forumReplyContentSchema", () => {
    it("should accept valid reply content", () => {
      expect(forumReplyContentSchema.parse("I agree with this!")).toBe(
        "I agree with this!"
      );
    });

    it("should accept single character replies", () => {
      expect(forumReplyContentSchema.parse("+")).toBe("+");
    });

    it("should reject empty replies", () => {
      expect(() => forumReplyContentSchema.parse("")).toThrow();
    });
  });

  describe("forumReplyContentPublicSchema", () => {
    it("should reject replies with profanity", () => {
      expect(() =>
        forumReplyContentPublicSchema.parse("Go fuck yourself")
      ).toThrow(/inappropriate/i);
    });
  });
});

// =============================================================================
// FORUM POST SCHEMAS TESTS
// =============================================================================

describe("Forum Post Schemas", () => {
  describe("createForumPostSchema", () => {
    it("should accept valid post data", () => {
      const result = createForumPostSchema.parse({
        categoryId: "clhcategory123",
        title: "My first post",
        content: "This is the content of my first post.",
      });
      expect(result.title).toBe("My first post");
      expect(result.content).toBe("This is the content of my first post.");
    });

    it("should accept post with book reference", () => {
      const result = createForumPostSchema.parse({
        categoryId: "clhcategory123",
        title: "Discussion about this book",
        content: "Let's discuss the themes in this book.",
        bookId: "clhbook123",
      });
      expect(result.bookId).toBe("clhbook123");
    });

    it("should accept null bookId", () => {
      const result = createForumPostSchema.parse({
        categoryId: "clhcategory123",
        title: "General discussion",
        content: "No specific book for this post.",
        bookId: null,
      });
      expect(result.bookId).toBeNull();
    });

    it("should reject posts with profanity in title", () => {
      expect(() =>
        createForumPostSchema.parse({
          categoryId: "clhcategory123",
          title: "This is fucking ridiculous",
          content: "Normal content here for the post body.",
        })
      ).toThrow(/inappropriate/i);
    });

    it("should reject posts with profanity in content", () => {
      expect(() =>
        createForumPostSchema.parse({
          categoryId: "clhcategory123",
          title: "Normal title",
          content: "This content has shit language in it",
        })
      ).toThrow(/inappropriate/i);
    });

    it("should reject missing required fields", () => {
      expect(() =>
        createForumPostSchema.parse({
          categoryId: "clhcategory123",
          title: "Title only",
        })
      ).toThrow();
      expect(() =>
        createForumPostSchema.parse({
          categoryId: "clhcategory123",
          content: "Content only without title",
        })
      ).toThrow();
    });
  });

  describe("createForumPostBaseSchema (no profanity filter)", () => {
    it("should accept content without profanity filtering", () => {
      const result = createForumPostBaseSchema.parse({
        categoryId: "clhcategory123",
        title: "Technical discussion",
        content: "This is internal content.",
      });
      expect(result.title).toBe("Technical discussion");
    });
  });

  describe("updateForumPostSchema", () => {
    it("should accept partial updates with title", () => {
      const result = updateForumPostSchema.parse({
        title: "Updated title",
      });
      expect(result.title).toBe("Updated title");
    });

    it("should accept partial updates with content", () => {
      const result = updateForumPostSchema.parse({
        content: "Updated content for the post.",
      });
      expect(result.content).toBe("Updated content for the post.");
    });

    it("should accept both fields", () => {
      const result = updateForumPostSchema.parse({
        title: "New title",
        content: "New content goes here for update.",
      });
      expect(result.title).toBe("New title");
      expect(result.content).toBe("New content goes here for update.");
    });

    it("should reject empty update", () => {
      expect(() => updateForumPostSchema.parse({})).toThrow(
        /at least one field/i
      );
    });

    it("should reject profanity in updates", () => {
      expect(() =>
        updateForumPostSchema.parse({
          title: "Fucking updated title",
        })
      ).toThrow(/inappropriate/i);
    });
  });

  describe("forumPostQuerySchema", () => {
    it("should apply defaults", () => {
      const result = forumPostQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe("createdAt");
      expect(result.sortOrder).toBe("desc");
      expect(result.includeDeleted).toBe(false);
    });

    it("should coerce string numbers", () => {
      const result = forumPostQuerySchema.parse({
        page: "5",
        limit: "50",
      });
      expect(result.page).toBe(5);
      expect(result.limit).toBe(50);
    });

    it("should accept all filter options", () => {
      const result = forumPostQuerySchema.parse({
        categoryId: "clhcat123",
        categorySlug: "general-discussion",
        userId: "user123",
        bookId: "clhbook123",
        isPinned: true,
        isLocked: false,
        isAnswered: true,
        isFeatured: false,
        hasReplies: true,
        search: "reading tips",
      });
      expect(result.isPinned).toBe(true);
      expect(result.search).toBe("reading tips");
    });

    it("should reject limit over 100", () => {
      expect(() =>
        forumPostQuerySchema.parse({
          limit: 101,
        })
      ).toThrow();
    });

    it("should accept all sort fields", () => {
      const sortFields = [
        "createdAt",
        "updatedAt",
        "voteScore",
        "viewCount",
        "repliesCount",
        "lastReplyAt",
      ];
      for (const field of sortFields) {
        const result = forumPostQuerySchema.parse({ sortBy: field });
        expect(result.sortBy).toBe(field);
      }
    });
  });

  describe("forumPostSortFieldSchema", () => {
    it("should accept valid sort fields", () => {
      expect(forumPostSortFieldSchema.parse("createdAt")).toBe("createdAt");
      expect(forumPostSortFieldSchema.parse("voteScore")).toBe("voteScore");
    });

    it("should reject invalid sort fields", () => {
      expect(() => forumPostSortFieldSchema.parse("invalid")).toThrow();
    });
  });

  describe("postIdParamsSchema", () => {
    it("should accept valid post ID params", () => {
      const result = postIdParamsSchema.parse({ postId: "clhpost123" });
      expect(result.postId).toBe("clhpost123");
    });

    it("should reject invalid post ID", () => {
      expect(() => postIdParamsSchema.parse({ postId: "invalid" })).toThrow();
    });
  });

  describe("categoryPostIdParamsSchema", () => {
    it("should accept valid nested params", () => {
      const result = categoryPostIdParamsSchema.parse({
        categoryId: "clhcat123",
        postId: "clhpost456",
      });
      expect(result.categoryId).toBe("clhcat123");
      expect(result.postId).toBe("clhpost456");
    });
  });
});

// =============================================================================
// FORUM REPLY SCHEMAS TESTS
// =============================================================================

describe("Forum Reply Schemas", () => {
  describe("createForumReplySchema", () => {
    it("should accept valid reply data", () => {
      const result = createForumReplySchema.parse({
        postId: "clhpost123",
        content: "This is my reply to the post.",
      });
      expect(result.content).toBe("This is my reply to the post.");
    });

    it("should accept nested reply", () => {
      const result = createForumReplySchema.parse({
        postId: "clhpost123",
        content: "Replying to another reply.",
        parentReplyId: "clhreply456",
      });
      expect(result.parentReplyId).toBe("clhreply456");
    });

    it("should accept null parentReplyId for top-level", () => {
      const result = createForumReplySchema.parse({
        postId: "clhpost123",
        content: "Top level reply here.",
        parentReplyId: null,
      });
      expect(result.parentReplyId).toBeNull();
    });

    it("should reject replies with profanity", () => {
      expect(() =>
        createForumReplySchema.parse({
          postId: "clhpost123",
          content: "You are such a fucking idiot",
        })
      ).toThrow(/inappropriate/i);
    });
  });

  describe("updateForumReplySchema", () => {
    it("should accept updated content", () => {
      const result = updateForumReplySchema.parse({
        content: "Updated reply content here.",
      });
      expect(result.content).toBe("Updated reply content here.");
    });

    it("should reject profanity in updates", () => {
      expect(() =>
        updateForumReplySchema.parse({
          content: "This is bullshit content",
        })
      ).toThrow(/inappropriate/i);
    });
  });

  describe("forumReplyQuerySchema", () => {
    it("should apply defaults", () => {
      const result = forumReplyQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.sortBy).toBe("createdAt");
      expect(result.sortOrder).toBe("asc");
      expect(result.topLevelOnly).toBe(false);
      expect(result.includeNested).toBe(true);
      expect(result.maxDepth).toBe(5);
    });

    it("should accept filter options", () => {
      const result = forumReplyQuerySchema.parse({
        parentReplyId: "clhreply123",
        topLevelOnly: true,
        includeNested: false,
        maxDepth: 3,
      });
      expect(result.topLevelOnly).toBe(true);
      expect(result.maxDepth).toBe(3);
    });
  });

  describe("forumReplySortFieldSchema", () => {
    it("should accept valid sort fields", () => {
      expect(forumReplySortFieldSchema.parse("createdAt")).toBe("createdAt");
      expect(forumReplySortFieldSchema.parse("voteScore")).toBe("voteScore");
    });
  });

  describe("replyIdParamsSchema", () => {
    it("should accept valid reply ID params", () => {
      const result = replyIdParamsSchema.parse({ replyId: "clhreply123" });
      expect(result.replyId).toBe("clhreply123");
    });
  });

  describe("postReplyIdParamsSchema", () => {
    it("should accept valid nested params", () => {
      const result = postReplyIdParamsSchema.parse({
        postId: "clhpost123",
        replyId: "clhreply456",
      });
      expect(result.postId).toBe("clhpost123");
      expect(result.replyId).toBe("clhreply456");
    });
  });
});

// =============================================================================
// FORUM VOTE SCHEMAS TESTS
// =============================================================================

describe("Forum Vote Schemas", () => {
  describe("voteOnPostSchema", () => {
    it("should accept upvote on post", () => {
      const result = voteOnPostSchema.parse({
        postId: "clhpost123",
        value: 1,
      });
      expect(result.value).toBe(1);
    });

    it("should accept downvote on post", () => {
      const result = voteOnPostSchema.parse({
        postId: "clhpost123",
        value: -1,
      });
      expect(result.value).toBe(-1);
    });

    it("should reject invalid vote value", () => {
      expect(() =>
        voteOnPostSchema.parse({
          postId: "clhpost123",
          value: 0,
        })
      ).toThrow();
    });
  });

  describe("voteOnReplySchema", () => {
    it("should accept vote on reply", () => {
      const result = voteOnReplySchema.parse({
        replyId: "clhreply123",
        value: 1,
      });
      expect(result.replyId).toBe("clhreply123");
    });
  });

  describe("removePostVoteSchema", () => {
    it("should accept valid post ID for vote removal", () => {
      const result = removePostVoteSchema.parse({
        postId: "clhpost123",
      });
      expect(result.postId).toBe("clhpost123");
    });
  });

  describe("removeReplyVoteSchema", () => {
    it("should accept valid reply ID for vote removal", () => {
      const result = removeReplyVoteSchema.parse({
        replyId: "clhreply123",
      });
      expect(result.replyId).toBe("clhreply123");
    });
  });

  describe("forumVoteSchema (unified)", () => {
    it("should accept vote on post only", () => {
      const result = forumVoteSchema.parse({
        postId: "clhpost123",
        value: 1,
      });
      expect(result.postId).toBe("clhpost123");
      expect(result.replyId).toBeUndefined();
    });

    it("should accept vote on reply only", () => {
      const result = forumVoteSchema.parse({
        replyId: "clhreply123",
        value: -1,
      });
      expect(result.replyId).toBe("clhreply123");
      expect(result.postId).toBeUndefined();
    });

    it("should reject when both postId and replyId are provided", () => {
      expect(() =>
        forumVoteSchema.parse({
          postId: "clhpost123",
          replyId: "clhreply123",
          value: 1,
        })
      ).toThrow(/exactly one/i);
    });

    it("should reject when neither postId nor replyId is provided", () => {
      expect(() =>
        forumVoteSchema.parse({
          value: 1,
        })
      ).toThrow(/exactly one/i);
    });
  });
});

// =============================================================================
// MODERATION SCHEMAS TESTS
// =============================================================================

describe("Moderation Schemas", () => {
  describe("markBestAnswerSchema", () => {
    it("should accept valid reply ID", () => {
      const result = markBestAnswerSchema.parse({
        replyId: "clhreply123",
      });
      expect(result.replyId).toBe("clhreply123");
    });
  });

  describe("togglePinPostSchema", () => {
    it("should accept pin toggle", () => {
      const result = togglePinPostSchema.parse({
        postId: "clhpost123",
        isPinned: true,
      });
      expect(result.isPinned).toBe(true);
    });

    it("should accept unpin", () => {
      const result = togglePinPostSchema.parse({
        postId: "clhpost123",
        isPinned: false,
      });
      expect(result.isPinned).toBe(false);
    });
  });

  describe("toggleLockPostSchema", () => {
    it("should accept lock toggle", () => {
      const result = toggleLockPostSchema.parse({
        postId: "clhpost123",
        isLocked: true,
      });
      expect(result.isLocked).toBe(true);
    });
  });

  describe("reportContentSchema", () => {
    it("should accept report for post", () => {
      const result = reportContentSchema.parse({
        postId: "clhpost123",
        type: "SPAM",
        reason: "This is spam content",
      });
      expect(result.type).toBe("SPAM");
    });

    it("should accept report for reply", () => {
      const result = reportContentSchema.parse({
        replyId: "clhreply123",
        type: "HARASSMENT",
      });
      expect(result.type).toBe("HARASSMENT");
    });

    it("should accept report without reason", () => {
      const result = reportContentSchema.parse({
        postId: "clhpost123",
        type: "OFF_TOPIC",
      });
      expect(result.reason).toBeUndefined();
    });

    it("should reject report with both postId and replyId", () => {
      expect(() =>
        reportContentSchema.parse({
          postId: "clhpost123",
          replyId: "clhreply123",
          type: "SPAM",
        })
      ).toThrow(/exactly one/i);
    });

    it("should reject report with neither postId nor replyId", () => {
      expect(() =>
        reportContentSchema.parse({
          type: "SPAM",
        })
      ).toThrow(/exactly one/i);
    });

    it("should reject reason over 1000 characters", () => {
      expect(() =>
        reportContentSchema.parse({
          postId: "clhpost123",
          type: "OTHER",
          reason: "a".repeat(1001),
        })
      ).toThrow();
    });
  });
});

// =============================================================================
// BULK OPERATION SCHEMAS TESTS
// =============================================================================

describe("Bulk Operation Schemas", () => {
  describe("bulkDeletePostsSchema", () => {
    it("should accept array of post IDs", () => {
      const result = bulkDeletePostsSchema.parse({
        postIds: ["clhpost1", "clhpost2", "clhpost3"],
      });
      expect(result.postIds).toHaveLength(3);
    });

    it("should reject empty array", () => {
      expect(() =>
        bulkDeletePostsSchema.parse({
          postIds: [],
        })
      ).toThrow(/at least one/i);
    });

    it("should reject more than 100 IDs", () => {
      const ids = Array.from({ length: 101 }, (_, i) => `clhpost${i}`);
      expect(() =>
        bulkDeletePostsSchema.parse({
          postIds: ids,
        })
      ).toThrow(/100/);
    });

    it("should accept exactly 100 IDs", () => {
      const ids = Array.from({ length: 100 }, (_, i) => `clhpost${i}`);
      const result = bulkDeletePostsSchema.parse({ postIds: ids });
      expect(result.postIds).toHaveLength(100);
    });
  });

  describe("bulkDeleteRepliesSchema", () => {
    it("should accept array of reply IDs", () => {
      const result = bulkDeleteRepliesSchema.parse({
        replyIds: ["clhreply1", "clhreply2"],
      });
      expect(result.replyIds).toHaveLength(2);
    });

    it("should reject empty array", () => {
      expect(() =>
        bulkDeleteRepliesSchema.parse({
          replyIds: [],
        })
      ).toThrow(/at least one/i);
    });
  });
});

// =============================================================================
// SEARCH SCHEMA TESTS
// =============================================================================

describe("Forum Search Schema", () => {
  describe("forumSearchSchema", () => {
    it("should accept valid search query", () => {
      const result = forumSearchSchema.parse({
        query: "reading tips",
      });
      expect(result.query).toBe("reading tips");
      expect(result.searchIn).toBe("all");
    });

    it("should accept search with filters", () => {
      const result = forumSearchSchema.parse({
        query: "comprehension",
        searchIn: "posts",
        categorySlug: "general-discussion",
        page: 2,
        limit: 10,
      });
      expect(result.searchIn).toBe("posts");
      expect(result.page).toBe(2);
    });

    it("should reject query under 2 characters", () => {
      expect(() =>
        forumSearchSchema.parse({
          query: "a",
        })
      ).toThrow();
    });

    it("should reject query over 200 characters", () => {
      expect(() =>
        forumSearchSchema.parse({
          query: "a".repeat(201),
        })
      ).toThrow();
    });

    it("should apply defaults", () => {
      const result = forumSearchSchema.parse({ query: "test" });
      expect(result.searchIn).toBe("all");
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("should reject limit over 50 for search", () => {
      expect(() =>
        forumSearchSchema.parse({
          query: "test",
          limit: 51,
        })
      ).toThrow();
    });
  });
});

// =============================================================================
// CATEGORY RESPONSE SCHEMA TESTS
// =============================================================================

describe("Forum Category Response Schema", () => {
  describe("forumCategoryResponseSchema", () => {
    it("should accept valid category response", () => {
      const result = forumCategoryResponseSchema.parse({
        id: "clhcat123",
        slug: "general-discussion",
        name: "General Discussion",
        description: "Talk about anything",
        icon: "chat",
        color: "#3B82F6",
        sortOrder: 1,
        isActive: true,
        isLocked: false,
        minTierToPost: "FREE",
        postsCount: 100,
        lastPostAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(result.name).toBe("General Discussion");
    });

    it("should accept nullable fields as null", () => {
      const result = forumCategoryResponseSchema.parse({
        id: "clhcat123",
        slug: "help",
        name: "Help",
        description: null,
        icon: null,
        color: null,
        sortOrder: 2,
        isActive: true,
        isLocked: false,
        minTierToPost: "FREE",
        postsCount: 0,
        lastPostAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(result.description).toBeNull();
    });
  });
});

// =============================================================================
// SCHEMA COLLECTION EXPORT TESTS
// =============================================================================

describe("forumSchemas collection", () => {
  it("should export all enum schemas", () => {
    expect(forumSchemas.userTier).toBeDefined();
    expect(forumSchemas.voteValue).toBeDefined();
  });

  it("should export all ID schemas", () => {
    expect(forumSchemas.postId).toBeDefined();
    expect(forumSchemas.replyId).toBeDefined();
    expect(forumSchemas.categoryId).toBeDefined();
    expect(forumSchemas.categorySlug).toBeDefined();
    expect(forumSchemas.bookId).toBeDefined();
  });

  it("should export all field schemas", () => {
    expect(forumSchemas.postTitle).toBeDefined();
    expect(forumSchemas.postTitlePublic).toBeDefined();
    expect(forumSchemas.content).toBeDefined();
    expect(forumSchemas.contentPublic).toBeDefined();
    expect(forumSchemas.replyContent).toBeDefined();
    expect(forumSchemas.replyContentPublic).toBeDefined();
  });

  it("should export all post schemas", () => {
    expect(forumSchemas.createPost).toBeDefined();
    expect(forumSchemas.createPostBase).toBeDefined();
    expect(forumSchemas.updatePost).toBeDefined();
    expect(forumSchemas.updatePostBase).toBeDefined();
    expect(forumSchemas.postQuery).toBeDefined();
    expect(forumSchemas.postSortField).toBeDefined();
    expect(forumSchemas.postIdParams).toBeDefined();
    expect(forumSchemas.categoryPostIdParams).toBeDefined();
  });

  it("should export all reply schemas", () => {
    expect(forumSchemas.createReply).toBeDefined();
    expect(forumSchemas.createReplyBase).toBeDefined();
    expect(forumSchemas.updateReply).toBeDefined();
    expect(forumSchemas.updateReplyBase).toBeDefined();
    expect(forumSchemas.replyQuery).toBeDefined();
    expect(forumSchemas.replySortField).toBeDefined();
    expect(forumSchemas.replyIdParams).toBeDefined();
    expect(forumSchemas.postReplyIdParams).toBeDefined();
  });

  it("should export all vote schemas", () => {
    expect(forumSchemas.voteOnPost).toBeDefined();
    expect(forumSchemas.voteOnReply).toBeDefined();
    expect(forumSchemas.removePostVote).toBeDefined();
    expect(forumSchemas.removeReplyVote).toBeDefined();
    expect(forumSchemas.vote).toBeDefined();
  });

  it("should export all moderation schemas", () => {
    expect(forumSchemas.markBestAnswer).toBeDefined();
    expect(forumSchemas.togglePinPost).toBeDefined();
    expect(forumSchemas.toggleLockPost).toBeDefined();
    expect(forumSchemas.reportType).toBeDefined();
    expect(forumSchemas.reportContent).toBeDefined();
  });

  it("should export all bulk operation schemas", () => {
    expect(forumSchemas.bulkDeletePosts).toBeDefined();
    expect(forumSchemas.bulkDeleteReplies).toBeDefined();
  });

  it("should export search schema", () => {
    expect(forumSchemas.search).toBeDefined();
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe("Edge Cases", () => {
  describe("Unicode and special characters", () => {
    it("should accept unicode in title", () => {
      const result = forumPostTitleSchema.parse("如何提高阅读速度？");
      expect(result).toBe("如何提高阅读速度？");
    });

    it("should accept unicode in content", () => {
      const result = forumContentSchema.parse(
        "これは日本語のコンテンツです。読書の理解力を高める方法について話しましょう。"
      );
      expect(result).toContain("これは");
    });

    it("should accept RTL content", () => {
      const result = forumContentSchema.parse(
        "مرحبا بكم في منتدى القراءة. نتمنى لكم تجربة رائعة."
      );
      expect(result).toContain("مرحبا");
    });
  });

  describe("Boundary conditions", () => {
    it("should accept title of exactly 3 characters", () => {
      expect(forumPostTitleSchema.parse("ABC")).toBe("ABC");
    });

    it("should accept content of exactly 10 characters", () => {
      expect(forumContentSchema.parse("0123456789")).toBe("0123456789");
    });

    it("should reject title of 2 characters", () => {
      expect(() => forumPostTitleSchema.parse("AB")).toThrow();
    });

    it("should reject content of 9 characters", () => {
      expect(() => forumContentSchema.parse("012345678")).toThrow();
    });
  });

  describe("Whitespace handling", () => {
    it("should trim whitespace from title", () => {
      expect(forumPostTitleSchema.parse("  Padded Title  ")).toBe(
        "Padded Title"
      );
    });

    it("should trim whitespace from content", () => {
      expect(forumContentSchema.parse("  Padded content here  ")).toBe(
        "Padded content here"
      );
    });

    it("should trim whitespace from reply", () => {
      expect(forumReplyContentSchema.parse("  Reply  ")).toBe("Reply");
    });
  });
});
