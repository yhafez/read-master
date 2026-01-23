/**
 * Tests for /api/groups/:id/discussions endpoints
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
  MAX_TITLE_LENGTH,
  MAX_CONTENT_LENGTH,
  DISCUSSIONS_CACHE_TTL,
  DiscussionSortOptions,
  createDiscussionSchema,
  validateGroupId,
  formatDate,
  formatDateRequired,
  parsePage,
  parseLimit,
  parseSortBy,
  parseSortDirection,
  parseBoolean,
  parseSearch,
  parseBookId,
  parseListDiscussionsQuery,
  buildDiscussionsCacheKey,
  buildDiscussionCacheKey,
  buildGroupCacheKey,
  mapToDiscussionUserInfo,
  mapToDiscussionBookInfo,
  mapToDiscussionSummary,
  calculatePagination,
  hasAdminPermission,
  type DiscussionListQueryParams,
  type DiscussionUserInfo,
  type DiscussionBookInfo,
  type DiscussionSummary,
  type PaginationInfo,
  type DiscussionListResponse,
  type CreateDiscussionInput,
  type CreateDiscussionResponse,
} from "./discussions.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have correct DEFAULT_PAGE", () => {
    expect(DEFAULT_PAGE).toBe(1);
  });

  it("should have correct DEFAULT_LIMIT", () => {
    expect(DEFAULT_LIMIT).toBe(20);
  });

  it("should have correct MAX_LIMIT", () => {
    expect(MAX_LIMIT).toBe(100);
  });

  it("should have correct MIN_LIMIT", () => {
    expect(MIN_LIMIT).toBe(1);
  });

  it("should have correct MAX_TITLE_LENGTH", () => {
    expect(MAX_TITLE_LENGTH).toBe(300);
  });

  it("should have correct MAX_CONTENT_LENGTH", () => {
    expect(MAX_CONTENT_LENGTH).toBe(50000);
  });

  it("should have correct DISCUSSIONS_CACHE_TTL", () => {
    expect(DISCUSSIONS_CACHE_TTL).toBe(300);
  });

  it("should have correct DiscussionSortOptions", () => {
    expect(DiscussionSortOptions.LAST_REPLY).toBe("lastReplyAt");
    expect(DiscussionSortOptions.CREATED).toBe("createdAt");
    expect(DiscussionSortOptions.REPLIES).toBe("repliesCount");
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export DiscussionListQueryParams type", () => {
    const params: DiscussionListQueryParams = {
      page: 1,
      limit: 20,
      sortBy: "lastReplyAt",
      sortDirection: "desc",
      bookId: "ctest123",
      isPinned: true,
      search: "test",
    };
    expect(params.page).toBe(1);
    expect(params.sortBy).toBe("lastReplyAt");
  });

  it("should export DiscussionUserInfo type", () => {
    const userInfo: DiscussionUserInfo = {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    expect(userInfo.id).toBe("user-1");
    expect(userInfo.username).toBe("testuser");
  });

  it("should allow null values in DiscussionUserInfo", () => {
    const userInfo: DiscussionUserInfo = {
      id: "user-1",
      username: null,
      displayName: null,
      avatarUrl: null,
    };
    expect(userInfo.username).toBeNull();
    expect(userInfo.displayName).toBeNull();
    expect(userInfo.avatarUrl).toBeNull();
  });

  it("should export DiscussionBookInfo type", () => {
    const bookInfo: DiscussionBookInfo = {
      id: "book-1",
      title: "Test Book",
      author: "Test Author",
    };
    expect(bookInfo.id).toBe("book-1");
    expect(bookInfo.title).toBe("Test Book");
  });

  it("should export DiscussionSummary type", () => {
    const summary: DiscussionSummary = {
      id: "disc-1",
      title: "Test Discussion",
      content: "Test content",
      bookId: "book-1",
      book: { id: "book-1", title: "Test Book", author: "Author" },
      isPinned: false,
      isLocked: false,
      isScheduled: false,
      scheduledAt: null,
      repliesCount: 5,
      lastReplyAt: "2026-01-18T00:00:00.000Z",
      user: {
        id: "user-1",
        username: "test",
        displayName: null,
        avatarUrl: null,
      },
      createdAt: "2026-01-18T00:00:00.000Z",
      updatedAt: "2026-01-18T00:00:00.000Z",
    };
    expect(summary.id).toBe("disc-1");
    expect(summary.isPinned).toBe(false);
  });

  it("should export PaginationInfo type", () => {
    const pagination: PaginationInfo = {
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasMore: true,
    };
    expect(pagination.totalPages).toBe(5);
    expect(pagination.hasMore).toBe(true);
  });

  it("should export DiscussionListResponse type", () => {
    const response: DiscussionListResponse = {
      discussions: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
    expect(response.discussions).toHaveLength(0);
  });

  it("should export CreateDiscussionInput type", () => {
    const input: CreateDiscussionInput = {
      title: "Test Title",
      content: "Test Content",
      bookId: "cbook123",
    };
    expect(input.title).toBe("Test Title");
  });

  it("should export CreateDiscussionResponse type", () => {
    const response: CreateDiscussionResponse = {
      success: true,
      message: "Discussion created",
      discussion: {
        id: "disc-1",
        title: "Test",
        content: "Content",
        bookId: null,
        book: null,
        isPinned: false,
        isLocked: false,
        isScheduled: false,
        scheduledAt: null,
        repliesCount: 0,
        lastReplyAt: null,
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
});

// ============================================================================
// createDiscussionSchema Tests
// ============================================================================

describe("createDiscussionSchema", () => {
  it("should validate valid input", () => {
    const result = createDiscussionSchema.safeParse({
      title: "Test Discussion",
      content: "This is test content",
    });
    expect(result.success).toBe(true);
  });

  it("should require title", () => {
    const result = createDiscussionSchema.safeParse({
      content: "Content only",
    });
    expect(result.success).toBe(false);
  });

  it("should require content", () => {
    const result = createDiscussionSchema.safeParse({
      title: "Title only",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty title", () => {
    const result = createDiscussionSchema.safeParse({
      title: "",
      content: "Content",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty content", () => {
    const result = createDiscussionSchema.safeParse({
      title: "Title",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("should trim whitespace from title", () => {
    const result = createDiscussionSchema.safeParse({
      title: "  Test Title  ",
      content: "Content",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Test Title");
    }
  });

  it("should reject title exceeding max length", () => {
    const result = createDiscussionSchema.safeParse({
      title: "a".repeat(MAX_TITLE_LENGTH + 1),
      content: "Content",
    });
    expect(result.success).toBe(false);
  });

  it("should reject content exceeding max length", () => {
    const result = createDiscussionSchema.safeParse({
      title: "Title",
      content: "a".repeat(MAX_CONTENT_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should accept valid bookId", () => {
    const result = createDiscussionSchema.safeParse({
      title: "Title",
      content: "Content",
      bookId: "cbook123abc",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bookId).toBe("cbook123abc");
    }
  });

  it("should accept null bookId", () => {
    const result = createDiscussionSchema.safeParse({
      title: "Title",
      content: "Content",
      bookId: null,
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid bookId format", () => {
    const result = createDiscussionSchema.safeParse({
      title: "Title",
      content: "Content",
      bookId: "invalid-id",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// validateGroupId Tests
// ============================================================================

describe("validateGroupId", () => {
  it("should return trimmed string for valid ID", () => {
    expect(validateGroupId("group123")).toBe("group123");
  });

  it("should trim whitespace", () => {
    expect(validateGroupId("  group123  ")).toBe("group123");
  });

  it("should return null for empty string", () => {
    expect(validateGroupId("")).toBeNull();
  });

  it("should return null for whitespace only", () => {
    expect(validateGroupId("   ")).toBeNull();
  });

  it("should return null for non-string", () => {
    expect(validateGroupId(123)).toBeNull();
    expect(validateGroupId(null)).toBeNull();
    expect(validateGroupId(undefined)).toBeNull();
    expect(validateGroupId({})).toBeNull();
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

  it("should return null for null input", () => {
    expect(formatDate(null)).toBeNull();
  });
});

describe("formatDateRequired", () => {
  it("should format date as ISO string", () => {
    const date = new Date("2026-01-18T12:00:00.000Z");
    expect(formatDateRequired(date)).toBe("2026-01-18T12:00:00.000Z");
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
    expect(parseLimit("50")).toBe(50);
  });

  it("should parse valid number", () => {
    expect(parseLimit(30)).toBe(30);
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
// parseSortBy Tests
// ============================================================================

describe("parseSortBy", () => {
  it("should parse lastReplyAt", () => {
    expect(parseSortBy("lastReplyAt")).toBe(DiscussionSortOptions.LAST_REPLY);
  });

  it("should parse lastreplyat (case insensitive)", () => {
    expect(parseSortBy("LASTREPLYAT")).toBe(DiscussionSortOptions.LAST_REPLY);
  });

  it("should parse createdAt", () => {
    expect(parseSortBy("createdAt")).toBe(DiscussionSortOptions.CREATED);
  });

  it("should parse repliesCount", () => {
    expect(parseSortBy("repliesCount")).toBe(DiscussionSortOptions.REPLIES);
  });

  it("should return default for invalid value", () => {
    expect(parseSortBy("invalid")).toBe(DiscussionSortOptions.LAST_REPLY);
  });

  it("should return default for undefined", () => {
    expect(parseSortBy(undefined)).toBe(DiscussionSortOptions.LAST_REPLY);
  });
});

// ============================================================================
// parseSortDirection Tests
// ============================================================================

describe("parseSortDirection", () => {
  it("should parse asc", () => {
    expect(parseSortDirection("asc")).toBe("asc");
  });

  it("should parse ascending", () => {
    expect(parseSortDirection("ascending")).toBe("asc");
  });

  it("should return desc for desc", () => {
    expect(parseSortDirection("desc")).toBe("desc");
  });

  it("should return desc for invalid value", () => {
    expect(parseSortDirection("invalid")).toBe("desc");
  });

  it("should return desc for undefined", () => {
    expect(parseSortDirection(undefined)).toBe("desc");
  });
});

// ============================================================================
// parseBoolean Tests
// ============================================================================

describe("parseBoolean", () => {
  it("should return true for 'true'", () => {
    expect(parseBoolean("true")).toBe(true);
  });

  it("should return true for boolean true", () => {
    expect(parseBoolean(true)).toBe(true);
  });

  it("should return false for 'false'", () => {
    expect(parseBoolean("false")).toBe(false);
  });

  it("should return false for boolean false", () => {
    expect(parseBoolean(false)).toBe(false);
  });

  it("should return undefined for other values", () => {
    expect(parseBoolean("yes")).toBeUndefined();
    expect(parseBoolean(1)).toBeUndefined();
    expect(parseBoolean(undefined)).toBeUndefined();
  });
});

// ============================================================================
// parseSearch Tests
// ============================================================================

describe("parseSearch", () => {
  it("should return trimmed search string", () => {
    expect(parseSearch("  test query  ")).toBe("test query");
  });

  it("should return undefined for empty string", () => {
    expect(parseSearch("")).toBeUndefined();
  });

  it("should return undefined for whitespace only", () => {
    expect(parseSearch("   ")).toBeUndefined();
  });

  it("should return undefined for non-string", () => {
    expect(parseSearch(123)).toBeUndefined();
  });

  it("should truncate search exceeding 200 characters", () => {
    const longSearch = "a".repeat(201);
    expect(parseSearch(longSearch)).toBeUndefined();
  });

  it("should accept search at exactly 200 characters", () => {
    const search = "a".repeat(200);
    expect(parseSearch(search)).toBe(search);
  });
});

// ============================================================================
// parseBookId Tests
// ============================================================================

describe("parseBookId", () => {
  it("should return valid CUID", () => {
    expect(parseBookId("cbook123abc")).toBe("cbook123abc");
  });

  it("should return undefined for invalid format", () => {
    expect(parseBookId("invalid-id")).toBeUndefined();
  });

  it("should return undefined for non-string", () => {
    expect(parseBookId(123)).toBeUndefined();
  });

  it("should trim whitespace", () => {
    expect(parseBookId("  cbook123  ")).toBe("cbook123");
  });
});

// ============================================================================
// parseListDiscussionsQuery Tests
// ============================================================================

describe("parseListDiscussionsQuery", () => {
  it("should parse all parameters", () => {
    const result = parseListDiscussionsQuery({
      page: "2",
      limit: "50",
      sortBy: "createdAt",
      sortDirection: "asc",
      bookId: "cbook123",
      isPinned: "true",
      search: "test",
    });
    expect(result).toEqual({
      page: 2,
      limit: 50,
      sortBy: "createdAt",
      sortDirection: "asc",
      bookId: "cbook123",
      isPinned: true,
      search: "test",
    });
  });

  it("should use defaults for missing parameters", () => {
    const result = parseListDiscussionsQuery({});
    expect(result).toEqual({
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
      sortBy: DiscussionSortOptions.LAST_REPLY,
      sortDirection: "desc",
      bookId: undefined,
      isPinned: undefined,
      search: undefined,
    });
  });
});

// ============================================================================
// buildDiscussionsCacheKey Tests
// ============================================================================

describe("buildDiscussionsCacheKey", () => {
  it("should build basic cache key", () => {
    const key = buildDiscussionsCacheKey("group123", {
      page: 1,
      limit: 20,
      sortBy: "lastReplyAt",
      sortDirection: "desc",
    });
    expect(key).toContain("group:group123:discussions");
    expect(key).toContain("p1");
    expect(key).toContain("l20");
    expect(key).toContain("slastReplyAt");
    expect(key).toContain("ddesc");
  });

  it("should include bookId when present", () => {
    const key = buildDiscussionsCacheKey("group123", {
      page: 1,
      limit: 20,
      sortBy: "lastReplyAt",
      sortDirection: "desc",
      bookId: "book123",
    });
    expect(key).toContain("bbook123");
  });

  it("should include isPinned when present", () => {
    const key = buildDiscussionsCacheKey("group123", {
      page: 1,
      limit: 20,
      sortBy: "lastReplyAt",
      sortDirection: "desc",
      isPinned: true,
    });
    expect(key).toContain("pintrue");
  });

  it("should include search when present", () => {
    const key = buildDiscussionsCacheKey("group123", {
      page: 1,
      limit: 20,
      sortBy: "lastReplyAt",
      sortDirection: "desc",
      search: "test",
    });
    expect(key).toContain("qtest");
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
// buildGroupCacheKey Tests
// ============================================================================

describe("buildGroupCacheKey", () => {
  it("should build cache key for group", () => {
    const key = buildGroupCacheKey("group123");
    expect(key).toContain("group:group123");
  });
});

// ============================================================================
// mapToDiscussionUserInfo Tests
// ============================================================================

describe("mapToDiscussionUserInfo", () => {
  it("should map user info correctly", () => {
    const user = {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    const result = mapToDiscussionUserInfo(user);
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
    const result = mapToDiscussionUserInfo(user);
    expect(result.username).toBeNull();
    expect(result.displayName).toBeNull();
    expect(result.avatarUrl).toBeNull();
  });
});

// ============================================================================
// mapToDiscussionBookInfo Tests
// ============================================================================

describe("mapToDiscussionBookInfo", () => {
  it("should map book info correctly", () => {
    const book = {
      id: "book-1",
      title: "Test Book",
      author: "Test Author",
    };
    const result = mapToDiscussionBookInfo(book);
    expect(result).toEqual({
      id: "book-1",
      title: "Test Book",
      author: "Test Author",
    });
  });

  it("should return null for null input", () => {
    expect(mapToDiscussionBookInfo(null)).toBeNull();
  });

  it("should handle null author", () => {
    const book = {
      id: "book-1",
      title: "Test Book",
      author: null,
    };
    const result = mapToDiscussionBookInfo(book);
    expect(result?.author).toBeNull();
  });
});

// ============================================================================
// mapToDiscussionSummary Tests
// ============================================================================

describe("mapToDiscussionSummary", () => {
  it("should map discussion correctly", () => {
    const discussion = {
      id: "disc-1",
      title: "Test Discussion",
      content: "Test content",
      bookId: "book-1",
      book: { id: "book-1", title: "Test Book", author: "Author" },
      isPinned: true,
      isLocked: false,
      isScheduled: true,
      scheduledAt: new Date("2026-01-20T10:00:00.000Z"),
      repliesCount: 10,
      lastReplyAt: new Date("2026-01-18T12:00:00.000Z"),
      user: {
        id: "user-1",
        username: "testuser",
        displayName: "Test User",
        avatarUrl: null,
      },
      createdAt: new Date("2026-01-17T12:00:00.000Z"),
      updatedAt: new Date("2026-01-18T12:00:00.000Z"),
    };
    const result = mapToDiscussionSummary(discussion);
    expect(result.id).toBe("disc-1");
    expect(result.title).toBe("Test Discussion");
    expect(result.isPinned).toBe(true);
    expect(result.isScheduled).toBe(true);
    expect(result.scheduledAt).toBe("2026-01-20T10:00:00.000Z");
    expect(result.repliesCount).toBe(10);
    expect(result.lastReplyAt).toBe("2026-01-18T12:00:00.000Z");
    expect(result.book?.id).toBe("book-1");
    expect(result.user.username).toBe("testuser");
  });

  it("should handle null lastReplyAt", () => {
    const discussion = {
      id: "disc-1",
      title: "Test Discussion",
      content: "Content",
      bookId: null,
      book: null,
      isPinned: false,
      isLocked: false,
      isScheduled: false,
      scheduledAt: null,
      repliesCount: 0,
      lastReplyAt: null,
      user: {
        id: "user-1",
        username: null,
        displayName: null,
        avatarUrl: null,
      },
      createdAt: new Date("2026-01-18T12:00:00.000Z"),
      updatedAt: new Date("2026-01-18T12:00:00.000Z"),
    };
    const result = mapToDiscussionSummary(discussion);
    expect(result.lastReplyAt).toBeNull();
    expect(result.book).toBeNull();
    expect(result.isScheduled).toBe(false);
    expect(result.scheduledAt).toBeNull();
  });
});

// ============================================================================
// calculatePagination Tests
// ============================================================================

describe("calculatePagination", () => {
  it("should calculate pagination for first page", () => {
    const result = calculatePagination(1, 20, 100);
    expect(result).toEqual({
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasMore: true,
    });
  });

  it("should calculate pagination for last page", () => {
    const result = calculatePagination(5, 20, 100);
    expect(result).toEqual({
      page: 5,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasMore: false,
    });
  });

  it("should handle empty results", () => {
    const result = calculatePagination(1, 20, 0);
    expect(result).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasMore: false,
    });
  });

  it("should handle partial last page", () => {
    const result = calculatePagination(1, 20, 25);
    expect(result.totalPages).toBe(2);
    expect(result.hasMore).toBe(true);
  });

  it("should handle single page", () => {
    const result = calculatePagination(1, 20, 10);
    expect(result.totalPages).toBe(1);
    expect(result.hasMore).toBe(false);
  });
});

// ============================================================================
// hasAdminPermission Tests
// ============================================================================

describe("hasAdminPermission", () => {
  it("should return true for OWNER", () => {
    expect(hasAdminPermission("OWNER")).toBe(true);
  });

  it("should return true for ADMIN", () => {
    expect(hasAdminPermission("ADMIN")).toBe(true);
  });

  it("should return false for MEMBER", () => {
    expect(hasAdminPermission("MEMBER")).toBe(false);
  });

  it("should return false for null", () => {
    expect(hasAdminPermission(null)).toBe(false);
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  it("should handle unicode in search", () => {
    const search = parseSearch("日本語テスト");
    expect(search).toBe("日本語テスト");
  });

  it("should handle emoji in search", () => {
    const search = parseSearch("📚 books");
    expect(search).toBe("📚 books");
  });

  it("should handle special characters in group ID", () => {
    expect(validateGroupId("cgroup_123-abc")).toBe("cgroup_123-abc");
  });

  it("should handle maximum page number", () => {
    expect(parsePage("999999")).toBe(999999);
  });

  it("should handle float page as string", () => {
    expect(parsePage("3.9")).toBe(3);
  });
});

// ============================================================================
// Response Structure Tests
// ============================================================================

describe("Response Structure", () => {
  it("should create valid empty list response", () => {
    const response: DiscussionListResponse = {
      discussions: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
    expect(response.discussions).toHaveLength(0);
    expect(response.pagination.total).toBe(0);
  });

  it("should create valid populated list response", () => {
    const discussion: DiscussionSummary = {
      id: "disc-1",
      title: "Test",
      content: "Content",
      bookId: null,
      book: null,
      isPinned: false,
      isLocked: false,
      isScheduled: false,
      scheduledAt: null,
      repliesCount: 0,
      lastReplyAt: null,
      user: { id: "u1", username: "test", displayName: null, avatarUrl: null },
      createdAt: "2026-01-18T00:00:00.000Z",
      updatedAt: "2026-01-18T00:00:00.000Z",
    };
    const response: DiscussionListResponse = {
      discussions: [discussion],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
      },
    };
    expect(response.discussions).toHaveLength(1);
    expect(response.discussions[0]?.id).toBe("disc-1");
  });
});

// ============================================================================
// Integration Scenarios Tests
// ============================================================================

describe("Integration Scenarios", () => {
  it("should parse realistic query parameters", () => {
    const result = parseListDiscussionsQuery({
      page: "1",
      limit: "20",
      sortBy: "lastReplyAt",
      sortDirection: "desc",
      search: "chapter 1 discussion",
    });
    expect(result.page).toBe(1);
    expect(result.search).toBe("chapter 1 discussion");
  });

  it("should build unique cache keys for different queries", () => {
    const key1 = buildDiscussionsCacheKey("group1", {
      page: 1,
      limit: 20,
      sortBy: "lastReplyAt",
      sortDirection: "desc",
    });
    const key2 = buildDiscussionsCacheKey("group1", {
      page: 2,
      limit: 20,
      sortBy: "lastReplyAt",
      sortDirection: "desc",
    });
    const key3 = buildDiscussionsCacheKey("group2", {
      page: 1,
      limit: 20,
      sortBy: "lastReplyAt",
      sortDirection: "desc",
    });
    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key2).not.toBe(key3);
  });

  it("should map complete discussion data", () => {
    const fullDiscussion = {
      id: "cdiscussion123",
      title: "Book Club Meeting Notes",
      content: "Let's discuss our thoughts on chapter 5...",
      bookId: "cbook456",
      book: {
        id: "cbook456",
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
      },
      isPinned: true,
      isLocked: false,
      isScheduled: true,
      scheduledAt: new Date("2026-01-25T18:00:00.000Z"),
      repliesCount: 15,
      lastReplyAt: new Date("2026-01-18T15:30:00.000Z"),
      user: {
        id: "cuser789",
        username: "booklover",
        displayName: "Book Lover",
        avatarUrl: "https://example.com/avatar.jpg",
      },
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
      updatedAt: new Date("2026-01-18T15:30:00.000Z"),
    };

    const result = mapToDiscussionSummary(fullDiscussion);
    expect(result.id).toBe("cdiscussion123");
    expect(result.title).toBe("Book Club Meeting Notes");
    expect(result.book?.title).toBe("The Great Gatsby");
    expect(result.user.username).toBe("booklover");
    expect(result.isPinned).toBe(true);
    expect(result.isScheduled).toBe(true);
    expect(result.scheduledAt).toBe("2026-01-25T18:00:00.000Z");
    expect(result.repliesCount).toBe(15);
  });
});

// ============================================================================
// Profanity Filter Integration Tests
// ============================================================================

describe("Profanity Filter", () => {
  it("should validate clean content in schema", () => {
    const result = createDiscussionSchema.safeParse({
      title: "Clean Discussion Title",
      content: "This is appropriate content for discussion.",
    });
    expect(result.success).toBe(true);
  });

  it("should accept schema validation (profanity check is in handler)", () => {
    // Note: The schema itself doesn't check profanity - that's done in the handler
    // using validateFieldsNoProfanity. This test confirms the schema structure.
    const result = createDiscussionSchema.safeParse({
      title: "Title",
      content: "Content",
    });
    expect(result.success).toBe(true);
  });
});
