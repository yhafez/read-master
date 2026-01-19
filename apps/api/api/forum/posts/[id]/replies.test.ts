/**
 * Tests for Forum Post Replies API
 *
 * Tests cover:
 * - Helper functions (formatDateRequired, parsePostId, mapToUserInfo, etc.)
 * - Reply body schema validation
 * - Reply depth calculation
 * - Type exports
 */

import { describe, it, expect } from "vitest";
import {
  MAX_REPLY_DEPTH,
  formatDateRequired,
  parsePostId,
  mapToUserInfo,
  mapToReplyResponse,
  createReplyBodySchema,
  type ReplyUserInfo,
  type ForumReplyResponse,
  type CreateReplyResponse,
  type CreateReplyBody,
} from "./replies.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  describe("MAX_REPLY_DEPTH", () => {
    it("should be a positive number", () => {
      expect(MAX_REPLY_DEPTH).toBeGreaterThan(0);
    });

    it("should be 5", () => {
      expect(MAX_REPLY_DEPTH).toBe(5);
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("formatDateRequired", () => {
  it("should format a date as ISO string", () => {
    const date = new Date("2025-01-15T10:30:00.000Z");
    const result = formatDateRequired(date);
    expect(result).toBe("2025-01-15T10:30:00.000Z");
  });

  it("should handle current date", () => {
    const date = new Date();
    const result = formatDateRequired(date);
    expect(result).toBe(date.toISOString());
  });
});

describe("parsePostId", () => {
  it("should return valid post ID for correct CUID format", () => {
    const result = parsePostId("cm123abc");
    expect(result).toBe("cm123abc");
  });

  it("should return valid post ID starting with c", () => {
    const result = parsePostId("cxyz789");
    expect(result).toBe("cxyz789");
  });

  it("should return null for invalid format", () => {
    expect(parsePostId("invalid")).toBeNull();
    expect(parsePostId("123abc")).toBeNull();
    expect(parsePostId("ABC123")).toBeNull();
    expect(parsePostId("")).toBeNull();
  });

  it("should return null for non-string values", () => {
    expect(parsePostId(123)).toBeNull();
    expect(parsePostId(null)).toBeNull();
    expect(parsePostId(undefined)).toBeNull();
    expect(parsePostId({})).toBeNull();
  });
});

describe("mapToUserInfo", () => {
  it("should map user with all fields", () => {
    const user = {
      id: "user123",
      username: "johndoe",
      displayName: "John Doe",
      avatarUrl: "https://example.com/avatar.jpg",
    };

    const result = mapToUserInfo(user);

    expect(result).toEqual({
      id: "user123",
      username: "johndoe",
      displayName: "John Doe",
      avatarUrl: "https://example.com/avatar.jpg",
    });
  });

  it("should map user with null fields", () => {
    const user = {
      id: "user456",
      username: null,
      displayName: null,
      avatarUrl: null,
    };

    const result = mapToUserInfo(user);

    expect(result).toEqual({
      id: "user456",
      username: null,
      displayName: null,
      avatarUrl: null,
    });
  });
});

describe("mapToReplyResponse", () => {
  it("should map reply with all fields", () => {
    const reply = {
      id: "reply123",
      postId: "post456",
      content: "This is a reply",
      userId: "user789",
      user: {
        id: "user789",
        username: "testuser",
        displayName: "Test User",
        avatarUrl: "https://example.com/avatar.jpg",
      },
      parentReplyId: null,
      upvotes: 5,
      downvotes: 1,
      voteScore: 4,
      isBestAnswer: false,
      createdAt: new Date("2025-01-15T10:00:00.000Z"),
      updatedAt: new Date("2025-01-15T11:00:00.000Z"),
    };

    const result = mapToReplyResponse(reply);

    expect(result).toEqual({
      id: "reply123",
      postId: "post456",
      content: "This is a reply",
      userId: "user789",
      user: {
        id: "user789",
        username: "testuser",
        displayName: "Test User",
        avatarUrl: "https://example.com/avatar.jpg",
      },
      parentReplyId: null,
      upvotes: 5,
      downvotes: 1,
      voteScore: 4,
      isBestAnswer: false,
      createdAt: "2025-01-15T10:00:00.000Z",
      updatedAt: "2025-01-15T11:00:00.000Z",
    });
  });

  it("should map reply with parent reply ID", () => {
    const reply = {
      id: "reply456",
      postId: "post789",
      content: "Nested reply",
      userId: "user123",
      user: {
        id: "user123",
        username: null,
        displayName: null,
        avatarUrl: null,
      },
      parentReplyId: "reply123",
      upvotes: 0,
      downvotes: 0,
      voteScore: 0,
      isBestAnswer: true,
      createdAt: new Date("2025-01-15T12:00:00.000Z"),
      updatedAt: new Date("2025-01-15T12:00:00.000Z"),
    };

    const result = mapToReplyResponse(reply);

    expect(result.parentReplyId).toBe("reply123");
    expect(result.isBestAnswer).toBe(true);
  });
});

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("createReplyBodySchema", () => {
  it("should validate valid reply content", () => {
    const result = createReplyBodySchema.safeParse({
      content: "This is a valid reply content.",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("This is a valid reply content.");
      expect(result.data.parentReplyId).toBeUndefined();
    }
  });

  it("should validate reply with parent reply ID", () => {
    const result = createReplyBodySchema.safeParse({
      content: "This is a nested reply.",
      parentReplyId: "cparent123",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentReplyId).toBe("cparent123");
    }
  });

  it("should accept null parentReplyId", () => {
    const result = createReplyBodySchema.safeParse({
      content: "Top level reply.",
      parentReplyId: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentReplyId).toBeNull();
    }
  });

  it("should reject empty content", () => {
    const result = createReplyBodySchema.safeParse({
      content: "",
    });

    expect(result.success).toBe(false);
  });

  it("should reject missing content", () => {
    const result = createReplyBodySchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("should reject invalid parent reply ID format", () => {
    const result = createReplyBodySchema.safeParse({
      content: "Valid content here.",
      parentReplyId: "invalid-id",
    });

    expect(result.success).toBe(false);
  });

  it("should reject content with profanity", () => {
    const result = createReplyBodySchema.safeParse({
      content: "This contains shit word.",
    });

    expect(result.success).toBe(false);
  });

  it("should trim whitespace from content", () => {
    const result = createReplyBodySchema.safeParse({
      content: "  Valid reply content.  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("Valid reply content.");
    }
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export ReplyUserInfo type", () => {
    const userInfo: ReplyUserInfo = {
      id: "test",
      username: "user",
      displayName: "Test",
      avatarUrl: null,
    };
    expect(userInfo.id).toBe("test");
  });

  it("should export ForumReplyResponse type", () => {
    const response: ForumReplyResponse = {
      id: "reply1",
      postId: "post1",
      content: "Content",
      userId: "user1",
      user: {
        id: "user1",
        username: null,
        displayName: null,
        avatarUrl: null,
      },
      parentReplyId: null,
      upvotes: 0,
      downvotes: 0,
      voteScore: 0,
      isBestAnswer: false,
      createdAt: "2025-01-15T00:00:00.000Z",
      updatedAt: "2025-01-15T00:00:00.000Z",
    };
    expect(response.id).toBe("reply1");
  });

  it("should export CreateReplyResponse type", () => {
    const response: CreateReplyResponse = {
      reply: {
        id: "reply1",
        postId: "post1",
        content: "Content",
        userId: "user1",
        user: {
          id: "user1",
          username: null,
          displayName: null,
          avatarUrl: null,
        },
        parentReplyId: null,
        upvotes: 0,
        downvotes: 0,
        voteScore: 0,
        isBestAnswer: false,
        createdAt: "2025-01-15T00:00:00.000Z",
        updatedAt: "2025-01-15T00:00:00.000Z",
      },
    };
    expect(response.reply.id).toBe("reply1");
  });

  it("should export CreateReplyBody type", () => {
    const body: CreateReplyBody = {
      content: "Test content",
      parentReplyId: "cparent123",
    };
    expect(body.content).toBe("Test content");
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  it("should handle very long content within limit", () => {
    const longContent = "A".repeat(1000);
    const result = createReplyBodySchema.safeParse({
      content: longContent,
    });

    expect(result.success).toBe(true);
  });

  it("should handle content exactly at max length", () => {
    const maxContent = "A".repeat(50000);
    const result = createReplyBodySchema.safeParse({
      content: maxContent,
    });

    expect(result.success).toBe(true);
  });

  it("should reject content exceeding max length", () => {
    const tooLongContent = "A".repeat(50001);
    const result = createReplyBodySchema.safeParse({
      content: tooLongContent,
    });

    expect(result.success).toBe(false);
  });

  it("should handle unicode content", () => {
    const result = createReplyBodySchema.safeParse({
      content: "Hello! This has unicode: 日本語 and emoji: 👍",
    });

    expect(result.success).toBe(true);
  });

  it("should handle newlines in content", () => {
    const result = createReplyBodySchema.safeParse({
      content: "Line 1\nLine 2\nLine 3",
    });

    expect(result.success).toBe(true);
  });
});
