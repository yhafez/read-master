/**
 * Tests for /api/discussions/:id/replies endpoints
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
  MAX_CONTENT_LENGTH,
  MAX_REPLY_DEPTH,
  REPLIES_CACHE_TTL,
  createReplySchema,
  validateDiscussionId,
  formatDate,
  parsePage,
  parseLimit,
  parseSortDirection,
  parseMaxDepth,
  parseListRepliesQuery,
  buildRepliesCacheKey,
  buildDiscussionCacheKey,
  mapToReplyUserInfo,
  mapToReplySummary,
  buildReplyTree,
  calculatePagination,
  type ReplyListQueryParams,
  type ReplyUserInfo,
  type ReplySummary,
  type PaginationInfo,
  type ReplyListResponse,
  type CreateReplyInput,
  type CreateReplyResponse,
  type DiscussionContext,
} from "./replies.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have correct DEFAULT_PAGE", () => {
    expect(DEFAULT_PAGE).toBe(1);
  });

  it("should have correct DEFAULT_LIMIT", () => {
    expect(DEFAULT_LIMIT).toBe(50);
  });

  it("should have correct MAX_LIMIT", () => {
    expect(MAX_LIMIT).toBe(100);
  });

  it("should have correct MIN_LIMIT", () => {
    expect(MIN_LIMIT).toBe(1);
  });

  it("should have correct MAX_CONTENT_LENGTH", () => {
    expect(MAX_CONTENT_LENGTH).toBe(50000);
  });

  it("should have correct MAX_REPLY_DEPTH", () => {
    expect(MAX_REPLY_DEPTH).toBe(5);
  });

  it("should have correct REPLIES_CACHE_TTL", () => {
    expect(REPLIES_CACHE_TTL).toBe(300);
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export ReplyListQueryParams type", () => {
    const params: ReplyListQueryParams = {
      page: 1,
      limit: 50,
      sortDirection: "asc",
      maxDepth: 5,
    };
    expect(params.page).toBe(1);
    expect(params.maxDepth).toBe(5);
  });

  it("should export ReplyUserInfo type", () => {
    const userInfo: ReplyUserInfo = {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    expect(userInfo.id).toBe("user-1");
    expect(userInfo.username).toBe("testuser");
  });

  it("should allow null values in ReplyUserInfo", () => {
    const userInfo: ReplyUserInfo = {
      id: "user-1",
      username: null,
      displayName: null,
      avatarUrl: null,
    };
    expect(userInfo.username).toBeNull();
    expect(userInfo.displayName).toBeNull();
    expect(userInfo.avatarUrl).toBeNull();
  });

  it("should export ReplySummary type", () => {
    const summary: ReplySummary = {
      id: "reply-1",
      content: "Test reply content",
      parentReplyId: null,
      user: {
        id: "user-1",
        username: "test",
        displayName: null,
        avatarUrl: null,
      },
      createdAt: "2026-01-18T00:00:00.000Z",
      updatedAt: "2026-01-18T00:00:00.000Z",
    };
    expect(summary.id).toBe("reply-1");
    expect(summary.parentReplyId).toBeNull();
  });

  it("should export ReplySummary with childReplies", () => {
    const summary: ReplySummary = {
      id: "reply-1",
      content: "Parent reply",
      parentReplyId: null,
      user: {
        id: "user-1",
        username: "test",
        displayName: null,
        avatarUrl: null,
      },
      createdAt: "2026-01-18T00:00:00.000Z",
      updatedAt: "2026-01-18T00:00:00.000Z",
      childReplies: [
        {
          id: "reply-2",
          content: "Child reply",
          parentReplyId: "reply-1",
          user: {
            id: "user-2",
            username: "test2",
            displayName: null,
            avatarUrl: null,
          },
          createdAt: "2026-01-18T01:00:00.000Z",
          updatedAt: "2026-01-18T01:00:00.000Z",
        },
      ],
    };
    expect(summary.childReplies).toHaveLength(1);
    expect(summary.childReplies?.[0]?.parentReplyId).toBe("reply-1");
  });

  it("should export PaginationInfo type", () => {
    const pagination: PaginationInfo = {
      page: 1,
      limit: 50,
      total: 100,
      totalPages: 2,
      hasMore: true,
    };
    expect(pagination.totalPages).toBe(2);
    expect(pagination.hasMore).toBe(true);
  });

  it("should export ReplyListResponse type", () => {
    const response: ReplyListResponse = {
      replies: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
    expect(response.replies).toHaveLength(0);
  });

  it("should export CreateReplyInput type", () => {
    const input: CreateReplyInput = {
      content: "Test reply",
      parentReplyId: "creply123",
    };
    expect(input.content).toBe("Test reply");
    expect(input.parentReplyId).toBe("creply123");
  });

  it("should export CreateReplyResponse type", () => {
    const response: CreateReplyResponse = {
      success: true,
      message: "Reply created",
      reply: {
        id: "reply-1",
        content: "Test",
        parentReplyId: null,
        user: {
          id: "u1",
          username: "test",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T00:00:00.000Z",
        updatedAt: "2026-01-18T00:00:00.000Z",
      },
    };
    expect(response.success).toBe(true);
  });

  it("should export DiscussionContext type", () => {
    const context: DiscussionContext = {
      id: "disc-1",
      groupId: "group-1",
      isLocked: false,
      group: {
        id: "group-1",
        isPublic: true,
      },
    };
    expect(context.isLocked).toBe(false);
    expect(context.group.isPublic).toBe(true);
  });
});

// ============================================================================
// createReplySchema Tests
// ============================================================================

describe("createReplySchema", () => {
  it("should validate valid input", () => {
    const result = createReplySchema.safeParse({
      content: "This is a test reply",
    });
    expect(result.success).toBe(true);
  });

  it("should require content", () => {
    const result = createReplySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should reject empty content", () => {
    const result = createReplySchema.safeParse({
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("should trim whitespace from content", () => {
    const result = createReplySchema.safeParse({
      content: "  Test reply  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("Test reply");
    }
  });

  it("should reject content exceeding max length", () => {
    const result = createReplySchema.safeParse({
      content: "a".repeat(MAX_CONTENT_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should accept valid parentReplyId", () => {
    const result = createReplySchema.safeParse({
      content: "Reply content",
      parentReplyId: "creply123abc",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentReplyId).toBe("creply123abc");
    }
  });

  it("should accept null parentReplyId", () => {
    const result = createReplySchema.safeParse({
      content: "Reply content",
      parentReplyId: null,
    });
    expect(result.success).toBe(true);
  });

  it("should accept undefined parentReplyId", () => {
    const result = createReplySchema.safeParse({
      content: "Reply content",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentReplyId).toBeUndefined();
    }
  });

  it("should reject invalid parentReplyId format", () => {
    const result = createReplySchema.safeParse({
      content: "Reply content",
      parentReplyId: "invalid-id",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// validateDiscussionId Tests
// ============================================================================

describe("validateDiscussionId", () => {
  it("should return trimmed string for valid ID", () => {
    expect(validateDiscussionId("disc123")).toBe("disc123");
  });

  it("should trim whitespace", () => {
    expect(validateDiscussionId("  disc123  ")).toBe("disc123");
  });

  it("should return null for empty string", () => {
    expect(validateDiscussionId("")).toBeNull();
  });

  it("should return null for whitespace only", () => {
    expect(validateDiscussionId("   ")).toBeNull();
  });

  it("should return null for non-string", () => {
    expect(validateDiscussionId(123)).toBeNull();
    expect(validateDiscussionId(null)).toBeNull();
    expect(validateDiscussionId(undefined)).toBeNull();
    expect(validateDiscussionId({})).toBeNull();
  });
});

// ============================================================================
// formatDate Tests
// ============================================================================

describe("formatDate", () => {
  it("should format date as ISO string", () => {
    const date = new Date("2026-01-18T12:00:00.000Z");
    expect(formatDate(date)).toBe("2026-01-18T12:00:00.000Z");
  });

  it("should handle different timezones", () => {
    const date = new Date("2026-06-15T08:30:00.000Z");
    expect(formatDate(date)).toBe("2026-06-15T08:30:00.000Z");
  });
});

// ============================================================================
// parsePage Tests
// ============================================================================

describe("parsePage", () => {
  it("should parse valid string number", () => {
    expect(parsePage("5")).toBe(5);
  });

  it("should parse valid number", () => {
    expect(parsePage(10)).toBe(10);
  });

  it("should return default for invalid string", () => {
    expect(parsePage("abc")).toBe(DEFAULT_PAGE);
  });

  it("should return default for zero", () => {
    expect(parsePage("0")).toBe(DEFAULT_PAGE);
  });

  it("should return default for negative number", () => {
    expect(parsePage("-1")).toBe(DEFAULT_PAGE);
  });

  it("should return default for undefined", () => {
    expect(parsePage(undefined)).toBe(DEFAULT_PAGE);
  });

  it("should floor decimal numbers", () => {
    expect(parsePage(3.7)).toBe(3);
  });
});

// ============================================================================
// parseLimit Tests
// ============================================================================

describe("parseLimit", () => {
  it("should parse valid string number", () => {
    expect(parseLimit("75")).toBe(75);
  });

  it("should parse valid number", () => {
    expect(parseLimit(60)).toBe(60);
  });

  it("should return default for invalid string", () => {
    expect(parseLimit("abc")).toBe(DEFAULT_LIMIT);
  });

  it("should return default for zero", () => {
    expect(parseLimit("0")).toBe(DEFAULT_LIMIT);
  });

  it("should return default for exceeding max", () => {
    expect(parseLimit("200")).toBe(DEFAULT_LIMIT);
  });

  it("should return default for negative number", () => {
    expect(parseLimit("-10")).toBe(DEFAULT_LIMIT);
  });

  it("should accept edge case MIN_LIMIT", () => {
    expect(parseLimit("1")).toBe(1);
  });

  it("should accept edge case MAX_LIMIT", () => {
    expect(parseLimit("100")).toBe(100);
  });
});

// ============================================================================
// parseSortDirection Tests
// ============================================================================

describe("parseSortDirection", () => {
  it("should return asc by default", () => {
    expect(parseSortDirection(undefined)).toBe("asc");
  });

  it("should parse desc", () => {
    expect(parseSortDirection("desc")).toBe("desc");
  });

  it("should parse descending", () => {
    expect(parseSortDirection("descending")).toBe("desc");
  });

  it("should return asc for invalid value", () => {
    expect(parseSortDirection("invalid")).toBe("asc");
  });

  it("should return asc for asc", () => {
    expect(parseSortDirection("asc")).toBe("asc");
  });
});

// ============================================================================
// parseMaxDepth Tests
// ============================================================================

describe("parseMaxDepth", () => {
  it("should parse valid string number", () => {
    expect(parseMaxDepth("3")).toBe(3);
  });

  it("should parse valid number", () => {
    expect(parseMaxDepth(4)).toBe(4);
  });

  it("should return default for invalid string", () => {
    expect(parseMaxDepth("abc")).toBe(MAX_REPLY_DEPTH);
  });

  it("should return default for zero", () => {
    expect(parseMaxDepth("0")).toBe(MAX_REPLY_DEPTH);
  });

  it("should return default for exceeding max", () => {
    expect(parseMaxDepth("10")).toBe(MAX_REPLY_DEPTH);
  });

  it("should return default for negative number", () => {
    expect(parseMaxDepth("-1")).toBe(MAX_REPLY_DEPTH);
  });

  it("should accept edge case 1", () => {
    expect(parseMaxDepth("1")).toBe(1);
  });

  it("should accept edge case MAX_REPLY_DEPTH", () => {
    expect(parseMaxDepth(String(MAX_REPLY_DEPTH))).toBe(MAX_REPLY_DEPTH);
  });
});

// ============================================================================
// parseListRepliesQuery Tests
// ============================================================================

describe("parseListRepliesQuery", () => {
  it("should parse all parameters", () => {
    const result = parseListRepliesQuery({
      page: "2",
      limit: "75",
      sortDirection: "desc",
      maxDepth: "3",
    });
    expect(result).toEqual({
      page: 2,
      limit: 75,
      sortDirection: "desc",
      maxDepth: 3,
    });
  });

  it("should use defaults for missing parameters", () => {
    const result = parseListRepliesQuery({});
    expect(result).toEqual({
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
      sortDirection: "asc",
      maxDepth: MAX_REPLY_DEPTH,
    });
  });
});

// ============================================================================
// buildRepliesCacheKey Tests
// ============================================================================

describe("buildRepliesCacheKey", () => {
  it("should build cache key with all parameters", () => {
    const key = buildRepliesCacheKey("disc123", {
      page: 1,
      limit: 50,
      sortDirection: "asc",
      maxDepth: 5,
    });
    expect(key).toContain("discussion:disc123:replies");
    expect(key).toContain("p1");
    expect(key).toContain("l50");
    expect(key).toContain("dasc");
    expect(key).toContain("m5");
  });

  it("should generate unique keys for different parameters", () => {
    const key1 = buildRepliesCacheKey("disc123", {
      page: 1,
      limit: 50,
      sortDirection: "asc",
      maxDepth: 5,
    });
    const key2 = buildRepliesCacheKey("disc123", {
      page: 2,
      limit: 50,
      sortDirection: "asc",
      maxDepth: 5,
    });
    expect(key1).not.toBe(key2);
  });
});

// ============================================================================
// buildDiscussionCacheKey Tests
// ============================================================================

describe("buildDiscussionCacheKey", () => {
  it("should build cache key for discussion", () => {
    const key = buildDiscussionCacheKey("disc123");
    expect(key).toContain("discussion:disc123");
  });
});

// ============================================================================
// mapToReplyUserInfo Tests
// ============================================================================

describe("mapToReplyUserInfo", () => {
  it("should map user info correctly", () => {
    const user = {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    const result = mapToReplyUserInfo(user);
    expect(result).toEqual({
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    });
  });

  it("should handle null values", () => {
    const user = {
      id: "user-1",
      username: null,
      displayName: null,
      avatarUrl: null,
    };
    const result = mapToReplyUserInfo(user);
    expect(result.username).toBeNull();
    expect(result.displayName).toBeNull();
    expect(result.avatarUrl).toBeNull();
  });
});

// ============================================================================
// mapToReplySummary Tests
// ============================================================================

describe("mapToReplySummary", () => {
  it("should map reply correctly", () => {
    const reply = {
      id: "reply-1",
      content: "Test reply content",
      parentReplyId: null,
      user: {
        id: "user-1",
        username: "testuser",
        displayName: "Test User",
        avatarUrl: null,
      },
      createdAt: new Date("2026-01-18T12:00:00.000Z"),
      updatedAt: new Date("2026-01-18T12:00:00.000Z"),
    };
    const result = mapToReplySummary(reply);
    expect(result.id).toBe("reply-1");
    expect(result.content).toBe("Test reply content");
    expect(result.parentReplyId).toBeNull();
    expect(result.user.username).toBe("testuser");
    expect(result.createdAt).toBe("2026-01-18T12:00:00.000Z");
  });

  it("should handle parentReplyId", () => {
    const reply = {
      id: "reply-2",
      content: "Child reply",
      parentReplyId: "reply-1",
      user: {
        id: "user-1",
        username: null,
        displayName: null,
        avatarUrl: null,
      },
      createdAt: new Date("2026-01-18T12:00:00.000Z"),
      updatedAt: new Date("2026-01-18T12:00:00.000Z"),
    };
    const result = mapToReplySummary(reply);
    expect(result.parentReplyId).toBe("reply-1");
  });
});

// ============================================================================
// buildReplyTree Tests
// ============================================================================

describe("buildReplyTree", () => {
  it("should return empty array for empty input", () => {
    const result = buildReplyTree([], 5);
    expect(result).toEqual([]);
  });

  it("should return flat list for replies without parents", () => {
    const replies: ReplySummary[] = [
      {
        id: "reply-1",
        content: "Reply 1",
        parentReplyId: null,
        user: {
          id: "u1",
          username: "test",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T00:00:00.000Z",
        updatedAt: "2026-01-18T00:00:00.000Z",
      },
      {
        id: "reply-2",
        content: "Reply 2",
        parentReplyId: null,
        user: {
          id: "u2",
          username: "test2",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T01:00:00.000Z",
        updatedAt: "2026-01-18T01:00:00.000Z",
      },
    ];
    const result = buildReplyTree(replies, 5);
    expect(result).toHaveLength(2);
    expect(result[0]?.childReplies).toEqual([]);
    expect(result[1]?.childReplies).toEqual([]);
  });

  it("should nest child replies under parents", () => {
    const replies: ReplySummary[] = [
      {
        id: "reply-1",
        content: "Parent",
        parentReplyId: null,
        user: {
          id: "u1",
          username: "test",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T00:00:00.000Z",
        updatedAt: "2026-01-18T00:00:00.000Z",
      },
      {
        id: "reply-2",
        content: "Child",
        parentReplyId: "reply-1",
        user: {
          id: "u2",
          username: "test2",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T01:00:00.000Z",
        updatedAt: "2026-01-18T01:00:00.000Z",
      },
    ];
    const result = buildReplyTree(replies, 5);
    expect(result).toHaveLength(1);
    expect(result[0]?.childReplies).toHaveLength(1);
    expect(result[0]?.childReplies?.[0]?.id).toBe("reply-2");
  });

  it("should handle deeply nested replies", () => {
    const replies: ReplySummary[] = [
      {
        id: "reply-1",
        content: "Level 1",
        parentReplyId: null,
        user: {
          id: "u1",
          username: "test",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T00:00:00.000Z",
        updatedAt: "2026-01-18T00:00:00.000Z",
      },
      {
        id: "reply-2",
        content: "Level 2",
        parentReplyId: "reply-1",
        user: {
          id: "u1",
          username: "test",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T00:00:00.000Z",
        updatedAt: "2026-01-18T00:00:00.000Z",
      },
      {
        id: "reply-3",
        content: "Level 3",
        parentReplyId: "reply-2",
        user: {
          id: "u1",
          username: "test",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T00:00:00.000Z",
        updatedAt: "2026-01-18T00:00:00.000Z",
      },
    ];
    const result = buildReplyTree(replies, 5);
    expect(result).toHaveLength(1);
    expect(result[0]?.childReplies?.[0]?.childReplies?.[0]?.id).toBe("reply-3");
  });

  it("should limit depth to maxDepth", () => {
    const replies: ReplySummary[] = [
      {
        id: "reply-1",
        content: "Level 1",
        parentReplyId: null,
        user: {
          id: "u1",
          username: "test",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T00:00:00.000Z",
        updatedAt: "2026-01-18T00:00:00.000Z",
      },
      {
        id: "reply-2",
        content: "Level 2",
        parentReplyId: "reply-1",
        user: {
          id: "u1",
          username: "test",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T00:00:00.000Z",
        updatedAt: "2026-01-18T00:00:00.000Z",
      },
      {
        id: "reply-3",
        content: "Level 3",
        parentReplyId: "reply-2",
        user: {
          id: "u1",
          username: "test",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T00:00:00.000Z",
        updatedAt: "2026-01-18T00:00:00.000Z",
      },
    ];
    const result = buildReplyTree(replies, 1);
    expect(result).toHaveLength(1);
    expect(result[0]?.childReplies).toBeUndefined();
  });

  it("should handle orphaned replies (parent not in list)", () => {
    const replies: ReplySummary[] = [
      {
        id: "reply-1",
        content: "Orphan",
        parentReplyId: "non-existent",
        user: {
          id: "u1",
          username: "test",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T00:00:00.000Z",
        updatedAt: "2026-01-18T00:00:00.000Z",
      },
    ];
    const result = buildReplyTree(replies, 5);
    // Orphaned replies become root-level
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("reply-1");
  });
});

// ============================================================================
// calculatePagination Tests
// ============================================================================

describe("calculatePagination", () => {
  it("should calculate pagination for first page", () => {
    const result = calculatePagination(1, 50, 150);
    expect(result).toEqual({
      page: 1,
      limit: 50,
      total: 150,
      totalPages: 3,
      hasMore: true,
    });
  });

  it("should calculate pagination for last page", () => {
    const result = calculatePagination(3, 50, 150);
    expect(result).toEqual({
      page: 3,
      limit: 50,
      total: 150,
      totalPages: 3,
      hasMore: false,
    });
  });

  it("should handle empty results", () => {
    const result = calculatePagination(1, 50, 0);
    expect(result).toEqual({
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0,
      hasMore: false,
    });
  });

  it("should handle partial last page", () => {
    const result = calculatePagination(1, 50, 75);
    expect(result.totalPages).toBe(2);
    expect(result.hasMore).toBe(true);
  });

  it("should handle single page", () => {
    const result = calculatePagination(1, 50, 30);
    expect(result.totalPages).toBe(1);
    expect(result.hasMore).toBe(false);
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  it("should handle unicode in content", () => {
    const result = createReplySchema.safeParse({
      content: "日本語のテスト reply",
    });
    expect(result.success).toBe(true);
  });

  it("should handle emoji in content", () => {
    const result = createReplySchema.safeParse({
      content: "Great point! 👍🎉",
    });
    expect(result.success).toBe(true);
  });

  it("should handle special characters in discussion ID", () => {
    expect(validateDiscussionId("cdisc_123-abc")).toBe("cdisc_123-abc");
  });

  it("should handle maximum page number", () => {
    expect(parsePage("999999")).toBe(999999);
  });

  it("should handle content at max length", () => {
    const result = createReplySchema.safeParse({
      content: "a".repeat(MAX_CONTENT_LENGTH),
    });
    expect(result.success).toBe(true);
  });

  it("should handle multiple levels of nesting in tree", () => {
    const replies: ReplySummary[] = [];
    for (let i = 1; i <= 10; i++) {
      replies.push({
        id: `reply-${i}`,
        content: `Level ${i}`,
        parentReplyId: i === 1 ? null : `reply-${i - 1}`,
        user: {
          id: "u1",
          username: "test",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T00:00:00.000Z",
        updatedAt: "2026-01-18T00:00:00.000Z",
      });
    }
    const result = buildReplyTree(replies, 3);
    expect(result).toHaveLength(1);
    // With maxDepth 3, level 4 and beyond should be cut off
    expect(
      result[0]?.childReplies?.[0]?.childReplies?.[0]?.childReplies
    ).toBeUndefined();
  });
});

// ============================================================================
// Response Structure Tests
// ============================================================================

describe("Response Structure", () => {
  it("should create valid empty list response", () => {
    const response: ReplyListResponse = {
      replies: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
    expect(response.replies).toHaveLength(0);
    expect(response.pagination.total).toBe(0);
  });

  it("should create valid populated list response", () => {
    const reply: ReplySummary = {
      id: "reply-1",
      content: "Test",
      parentReplyId: null,
      user: { id: "u1", username: "test", displayName: null, avatarUrl: null },
      createdAt: "2026-01-18T00:00:00.000Z",
      updatedAt: "2026-01-18T00:00:00.000Z",
    };
    const response: ReplyListResponse = {
      replies: [reply],
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
        hasMore: false,
      },
    };
    expect(response.replies).toHaveLength(1);
    expect(response.replies[0]?.id).toBe("reply-1");
  });
});

// ============================================================================
// Integration Scenarios Tests
// ============================================================================

describe("Integration Scenarios", () => {
  it("should parse realistic query parameters", () => {
    const result = parseListRepliesQuery({
      page: "1",
      limit: "50",
      sortDirection: "asc",
      maxDepth: "3",
    });
    expect(result.page).toBe(1);
    expect(result.maxDepth).toBe(3);
  });

  it("should build unique cache keys for different queries", () => {
    const key1 = buildRepliesCacheKey("disc1", {
      page: 1,
      limit: 50,
      sortDirection: "asc",
      maxDepth: 5,
    });
    const key2 = buildRepliesCacheKey("disc1", {
      page: 2,
      limit: 50,
      sortDirection: "asc",
      maxDepth: 5,
    });
    const key3 = buildRepliesCacheKey("disc2", {
      page: 1,
      limit: 50,
      sortDirection: "asc",
      maxDepth: 5,
    });
    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key2).not.toBe(key3);
  });

  it("should map complete reply data", () => {
    const fullReply = {
      id: "creply123",
      content: "I completely agree with your analysis of chapter 5!",
      parentReplyId: null,
      user: {
        id: "cuser789",
        username: "booklover",
        displayName: "Book Lover",
        avatarUrl: "https://example.com/avatar.jpg",
      },
      createdAt: new Date("2026-01-18T15:30:00.000Z"),
      updatedAt: new Date("2026-01-18T15:30:00.000Z"),
    };

    const result = mapToReplySummary(fullReply);
    expect(result.id).toBe("creply123");
    expect(result.content).toContain("chapter 5");
    expect(result.user.username).toBe("booklover");
  });

  it("should build complete tree with multiple branches", () => {
    const replies: ReplySummary[] = [
      {
        id: "root-1",
        content: "Root 1",
        parentReplyId: null,
        user: {
          id: "u1",
          username: "user1",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T00:00:00.000Z",
        updatedAt: "2026-01-18T00:00:00.000Z",
      },
      {
        id: "root-2",
        content: "Root 2",
        parentReplyId: null,
        user: {
          id: "u2",
          username: "user2",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T01:00:00.000Z",
        updatedAt: "2026-01-18T01:00:00.000Z",
      },
      {
        id: "child-1a",
        content: "Child 1a",
        parentReplyId: "root-1",
        user: {
          id: "u3",
          username: "user3",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T02:00:00.000Z",
        updatedAt: "2026-01-18T02:00:00.000Z",
      },
      {
        id: "child-1b",
        content: "Child 1b",
        parentReplyId: "root-1",
        user: {
          id: "u4",
          username: "user4",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T03:00:00.000Z",
        updatedAt: "2026-01-18T03:00:00.000Z",
      },
      {
        id: "child-2a",
        content: "Child 2a",
        parentReplyId: "root-2",
        user: {
          id: "u5",
          username: "user5",
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2026-01-18T04:00:00.000Z",
        updatedAt: "2026-01-18T04:00:00.000Z",
      },
    ];
    const result = buildReplyTree(replies, 5);
    expect(result).toHaveLength(2);
    expect(result[0]?.childReplies).toHaveLength(2);
    expect(result[1]?.childReplies).toHaveLength(1);
  });
});

// ============================================================================
// Profanity Filter Integration Tests
// ============================================================================

describe("Profanity Filter", () => {
  it("should validate clean content in schema", () => {
    const result = createReplySchema.safeParse({
      content: "This is a thoughtful and appropriate reply to the discussion.",
    });
    expect(result.success).toBe(true);
  });

  it("should accept schema validation (profanity check is in handler)", () => {
    // Note: The schema itself doesn't check profanity - that's done in the handler
    // using containsProfanity. This test confirms the schema structure.
    const result = createReplySchema.safeParse({
      content: "Reply content",
    });
    expect(result.success).toBe(true);
  });
});
