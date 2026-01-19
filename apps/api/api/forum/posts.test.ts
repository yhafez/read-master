/**
 * Tests for /api/forum/posts endpoint
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
  POSTS_CACHE_TTL,
  PostSortOptions,
  VALID_SORT_OPTIONS,
  formatDate,
  formatDateRequired,
  truncateContent,
  parsePage,
  parseLimit,
  parseSortBy,
  isValidSortOption,
  parseCategoryId,
  parseCategorySlug,
  parseSearch,
  parseBoolean,
  parseBookId,
  parseListPostsQuery,
  buildPostsCacheKey,
  buildOrderBy,
  mapToPostUserInfo,
  mapToPostCategoryInfo,
  mapToPostBookInfo,
  mapToPostSummary,
  calculatePagination,
  type PostListQueryParams,
  type PostUserInfo,
  type PostCategoryInfo,
  type PostBookInfo,
  type ForumPostSummary,
  type PaginationInfo,
  type ForumPostsResponse,
} from "./posts.js";

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

  it("should have correct POSTS_CACHE_TTL (5 minutes)", () => {
    expect(POSTS_CACHE_TTL).toBe(300);
  });

  it("should have correct PostSortOptions", () => {
    expect(PostSortOptions.RECENT).toBe("recent");
    expect(PostSortOptions.POPULAR).toBe("popular");
    expect(PostSortOptions.UNANSWERED).toBe("unanswered");
    expect(PostSortOptions.MOST_VIEWED).toBe("mostViewed");
    expect(PostSortOptions.LAST_REPLY).toBe("lastReply");
  });

  it("should have correct VALID_SORT_OPTIONS", () => {
    expect(VALID_SORT_OPTIONS).toContain("recent");
    expect(VALID_SORT_OPTIONS).toContain("popular");
    expect(VALID_SORT_OPTIONS).toContain("unanswered");
    expect(VALID_SORT_OPTIONS).toContain("mostViewed");
    expect(VALID_SORT_OPTIONS).toContain("lastReply");
    expect(VALID_SORT_OPTIONS).toHaveLength(5);
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export PostListQueryParams type", () => {
    const params: PostListQueryParams = {
      page: 1,
      limit: 20,
      sortBy: "recent",
      categoryId: "ctest123",
      search: "test",
    };
    expect(params.page).toBe(1);
    expect(params.sortBy).toBe("recent");
  });

  it("should export PostUserInfo type", () => {
    const userInfo: PostUserInfo = {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    expect(userInfo.id).toBe("user-1");
    expect(userInfo.username).toBe("testuser");
  });

  it("should allow null values in PostUserInfo", () => {
    const userInfo: PostUserInfo = {
      id: "user-1",
      username: null,
      displayName: null,
      avatarUrl: null,
    };
    expect(userInfo.username).toBeNull();
    expect(userInfo.displayName).toBeNull();
    expect(userInfo.avatarUrl).toBeNull();
  });

  it("should export PostCategoryInfo type", () => {
    const categoryInfo: PostCategoryInfo = {
      id: "cat-1",
      slug: "general",
      name: "General Discussion",
      color: "#3B82F6",
    };
    expect(categoryInfo.slug).toBe("general");
    expect(categoryInfo.name).toBe("General Discussion");
  });

  it("should export PostBookInfo type", () => {
    const bookInfo: PostBookInfo = {
      id: "book-1",
      title: "Test Book",
      author: "Test Author",
      coverImage: "https://example.com/cover.jpg",
    };
    expect(bookInfo.id).toBe("book-1");
    expect(bookInfo.title).toBe("Test Book");
  });

  it("should export ForumPostSummary type", () => {
    const summary: ForumPostSummary = {
      id: "post-1",
      title: "Test Post",
      contentPreview: "Test content...",
      categoryId: "cat-1",
      category: { id: "cat-1", slug: "general", name: "General", color: null },
      userId: "user-1",
      user: {
        id: "user-1",
        username: "test",
        displayName: null,
        avatarUrl: null,
      },
      bookId: null,
      book: null,
      isPinned: false,
      isLocked: false,
      isFeatured: false,
      isAnswered: false,
      upvotes: 10,
      downvotes: 2,
      voteScore: 8,
      viewCount: 100,
      repliesCount: 5,
      lastReplyAt: null,
      createdAt: "2026-01-18T00:00:00.000Z",
      updatedAt: "2026-01-18T00:00:00.000Z",
    };
    expect(summary.id).toBe("post-1");
    expect(summary.voteScore).toBe(8);
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
  });

  it("should export ForumPostsResponse type", () => {
    const response: ForumPostsResponse = {
      posts: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
    expect(response.posts).toHaveLength(0);
  });
});

// ============================================================================
// formatDate Tests
// ============================================================================

describe("formatDate", () => {
  it("should return null for null input", () => {
    expect(formatDate(null)).toBeNull();
  });

  it("should return ISO string for valid date", () => {
    const date = new Date("2026-01-18T12:30:45.000Z");
    expect(formatDate(date)).toBe("2026-01-18T12:30:45.000Z");
  });

  it("should handle date at midnight", () => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    expect(formatDate(date)).toBe("2026-01-01T00:00:00.000Z");
  });
});

// ============================================================================
// formatDateRequired Tests
// ============================================================================

describe("formatDateRequired", () => {
  it("should return ISO string for valid date", () => {
    const date = new Date("2026-01-18T12:30:45.000Z");
    expect(formatDateRequired(date)).toBe("2026-01-18T12:30:45.000Z");
  });

  it("should preserve milliseconds", () => {
    const date = new Date("2026-06-15T08:25:30.123Z");
    expect(formatDateRequired(date)).toBe("2026-06-15T08:25:30.123Z");
  });
});

// ============================================================================
// truncateContent Tests
// ============================================================================

describe("truncateContent", () => {
  it("should return content unchanged if shorter than max length", () => {
    const content = "Short content";
    expect(truncateContent(content, 200)).toBe("Short content");
  });

  it("should truncate content longer than max length", () => {
    const content = "A".repeat(300);
    const result = truncateContent(content, 200);
    expect(result.length).toBe(203); // 200 + "..."
    expect(result.endsWith("...")).toBe(true);
  });

  it("should use default max length of 200", () => {
    const content = "B".repeat(250);
    const result = truncateContent(content);
    expect(result.length).toBe(203);
  });

  it("should handle content exactly at max length", () => {
    const content = "C".repeat(200);
    expect(truncateContent(content, 200)).toBe(content);
  });

  it("should trim trailing whitespace before ellipsis", () => {
    const content = "Hello world   " + "X".repeat(200);
    const result = truncateContent(content, 20);
    expect(result).not.toContain("   ...");
    expect(result.endsWith("...")).toBe(true);
  });

  it("should handle empty content", () => {
    expect(truncateContent("", 200)).toBe("");
  });

  it("should handle custom max length", () => {
    const content = "Hello World! This is a test.";
    const result = truncateContent(content, 10);
    expect(result).toBe("Hello Worl...");
  });
});

// ============================================================================
// parsePage Tests
// ============================================================================

describe("parsePage", () => {
  it("should return default for undefined", () => {
    expect(parsePage(undefined)).toBe(DEFAULT_PAGE);
  });

  it("should return default for null", () => {
    expect(parsePage(null)).toBe(DEFAULT_PAGE);
  });

  it("should parse valid string number", () => {
    expect(parsePage("5")).toBe(5);
  });

  it("should return default for zero", () => {
    expect(parsePage("0")).toBe(DEFAULT_PAGE);
  });

  it("should return default for negative number", () => {
    expect(parsePage("-1")).toBe(DEFAULT_PAGE);
  });

  it("should return default for non-numeric string", () => {
    expect(parsePage("abc")).toBe(DEFAULT_PAGE);
  });

  it("should handle number input", () => {
    expect(parsePage(10)).toBe(10);
  });

  it("should floor decimal numbers", () => {
    expect(parsePage(3.7)).toBe(3);
  });

  it("should handle large page numbers", () => {
    expect(parsePage("1000")).toBe(1000);
  });
});

// ============================================================================
// parseLimit Tests
// ============================================================================

describe("parseLimit", () => {
  it("should return default for undefined", () => {
    expect(parseLimit(undefined)).toBe(DEFAULT_LIMIT);
  });

  it("should return default for null", () => {
    expect(parseLimit(null)).toBe(DEFAULT_LIMIT);
  });

  it("should parse valid string number", () => {
    expect(parseLimit("50")).toBe(50);
  });

  it("should return default for values below MIN_LIMIT", () => {
    expect(parseLimit("0")).toBe(DEFAULT_LIMIT);
  });

  it("should return default for values above MAX_LIMIT", () => {
    expect(parseLimit("200")).toBe(DEFAULT_LIMIT);
  });

  it("should accept MIN_LIMIT", () => {
    expect(parseLimit("1")).toBe(1);
  });

  it("should accept MAX_LIMIT", () => {
    expect(parseLimit("100")).toBe(100);
  });

  it("should handle number input", () => {
    expect(parseLimit(25)).toBe(25);
  });

  it("should floor decimal numbers", () => {
    expect(parseLimit(15.9)).toBe(15);
  });

  it("should return default for negative number", () => {
    expect(parseLimit("-10")).toBe(DEFAULT_LIMIT);
  });
});

// ============================================================================
// parseSortBy Tests
// ============================================================================

describe("parseSortBy", () => {
  it("should return recent for undefined", () => {
    expect(parseSortBy(undefined)).toBe(PostSortOptions.RECENT);
  });

  it("should return recent for invalid value", () => {
    expect(parseSortBy("invalid")).toBe(PostSortOptions.RECENT);
  });

  it("should parse 'recent'", () => {
    expect(parseSortBy("recent")).toBe(PostSortOptions.RECENT);
  });

  it("should parse 'newest' as recent", () => {
    expect(parseSortBy("newest")).toBe(PostSortOptions.RECENT);
  });

  it("should parse 'latest' as recent", () => {
    expect(parseSortBy("latest")).toBe(PostSortOptions.RECENT);
  });

  it("should parse 'popular'", () => {
    expect(parseSortBy("popular")).toBe(PostSortOptions.POPULAR);
  });

  it("should parse 'top' as popular", () => {
    expect(parseSortBy("top")).toBe(PostSortOptions.POPULAR);
  });

  it("should parse 'votes' as popular", () => {
    expect(parseSortBy("votes")).toBe(PostSortOptions.POPULAR);
  });

  it("should parse 'unanswered'", () => {
    expect(parseSortBy("unanswered")).toBe(PostSortOptions.UNANSWERED);
  });

  it("should parse 'noreplies' as unanswered", () => {
    expect(parseSortBy("noreplies")).toBe(PostSortOptions.UNANSWERED);
  });

  it("should parse 'mostViewed'", () => {
    expect(parseSortBy("mostViewed")).toBe(PostSortOptions.MOST_VIEWED);
  });

  it("should parse 'views' as mostViewed", () => {
    expect(parseSortBy("views")).toBe(PostSortOptions.MOST_VIEWED);
  });

  it("should parse 'lastReply'", () => {
    expect(parseSortBy("lastReply")).toBe(PostSortOptions.LAST_REPLY);
  });

  it("should parse 'active' as lastReply", () => {
    expect(parseSortBy("active")).toBe(PostSortOptions.LAST_REPLY);
  });

  it("should be case insensitive", () => {
    expect(parseSortBy("POPULAR")).toBe(PostSortOptions.POPULAR);
    expect(parseSortBy("Recent")).toBe(PostSortOptions.RECENT);
    expect(parseSortBy("UNANSWERED")).toBe(PostSortOptions.UNANSWERED);
  });

  it("should trim whitespace", () => {
    expect(parseSortBy("  popular  ")).toBe(PostSortOptions.POPULAR);
  });
});

// ============================================================================
// isValidSortOption Tests
// ============================================================================

describe("isValidSortOption", () => {
  it("should return true for valid options", () => {
    expect(isValidSortOption("recent")).toBe(true);
    expect(isValidSortOption("popular")).toBe(true);
    expect(isValidSortOption("unanswered")).toBe(true);
    expect(isValidSortOption("mostViewed")).toBe(true);
    expect(isValidSortOption("lastReply")).toBe(true);
  });

  it("should return false for invalid options", () => {
    expect(isValidSortOption("invalid")).toBe(false);
    expect(isValidSortOption("")).toBe(false);
    expect(isValidSortOption("newest")).toBe(false); // alias, not direct value
  });
});

// ============================================================================
// parseCategoryId Tests
// ============================================================================

describe("parseCategoryId", () => {
  it("should return undefined for undefined", () => {
    expect(parseCategoryId(undefined)).toBeUndefined();
  });

  it("should return undefined for null", () => {
    expect(parseCategoryId(null)).toBeUndefined();
  });

  it("should return undefined for empty string", () => {
    expect(parseCategoryId("")).toBeUndefined();
  });

  it("should return valid cuid", () => {
    expect(parseCategoryId("ctest123abc")).toBe("ctest123abc");
  });

  it("should return undefined for invalid format", () => {
    expect(parseCategoryId("invalid")).toBeUndefined();
    expect(parseCategoryId("123")).toBeUndefined();
    expect(parseCategoryId("Test123")).toBeUndefined();
  });

  it("should trim whitespace", () => {
    expect(parseCategoryId("  ctest123  ")).toBe("ctest123");
  });
});

// ============================================================================
// parseCategorySlug Tests
// ============================================================================

describe("parseCategorySlug", () => {
  it("should return undefined for undefined", () => {
    expect(parseCategorySlug(undefined)).toBeUndefined();
  });

  it("should return undefined for empty string", () => {
    expect(parseCategorySlug("")).toBeUndefined();
  });

  it("should return valid slug", () => {
    expect(parseCategorySlug("general-discussion")).toBe("general-discussion");
  });

  it("should lowercase the slug", () => {
    expect(parseCategorySlug("General-Discussion")).toBe("general-discussion");
  });

  it("should return undefined for invalid characters", () => {
    expect(parseCategorySlug("hello_world")).toBeUndefined();
    expect(parseCategorySlug("hello world")).toBeUndefined();
    expect(parseCategorySlug("hello!world")).toBeUndefined();
  });

  it("should return undefined for slug over 100 chars", () => {
    expect(parseCategorySlug("a".repeat(101))).toBeUndefined();
  });

  it("should accept slug at 100 chars", () => {
    expect(parseCategorySlug("a".repeat(100))).toBe("a".repeat(100));
  });

  it("should trim whitespace", () => {
    expect(parseCategorySlug("  general  ")).toBe("general");
  });
});

// ============================================================================
// parseSearch Tests
// ============================================================================

describe("parseSearch", () => {
  it("should return undefined for undefined", () => {
    expect(parseSearch(undefined)).toBeUndefined();
  });

  it("should return undefined for empty string", () => {
    expect(parseSearch("")).toBeUndefined();
  });

  it("should return valid search query", () => {
    expect(parseSearch("test query")).toBe("test query");
  });

  it("should return undefined for search over 200 chars", () => {
    expect(parseSearch("a".repeat(201))).toBeUndefined();
  });

  it("should accept search at 200 chars", () => {
    expect(parseSearch("a".repeat(200))).toBe("a".repeat(200));
  });

  it("should trim whitespace", () => {
    expect(parseSearch("  search term  ")).toBe("search term");
  });

  it("should return undefined for only whitespace", () => {
    expect(parseSearch("   ")).toBeUndefined();
  });
});

// ============================================================================
// parseBoolean Tests
// ============================================================================

describe("parseBoolean", () => {
  it("should return undefined for undefined", () => {
    expect(parseBoolean(undefined)).toBeUndefined();
  });

  it("should return true for 'true'", () => {
    expect(parseBoolean("true")).toBe(true);
  });

  it("should return true for true", () => {
    expect(parseBoolean(true)).toBe(true);
  });

  it("should return true for '1'", () => {
    expect(parseBoolean("1")).toBe(true);
  });

  it("should return false for 'false'", () => {
    expect(parseBoolean("false")).toBe(false);
  });

  it("should return false for false", () => {
    expect(parseBoolean(false)).toBe(false);
  });

  it("should return false for '0'", () => {
    expect(parseBoolean("0")).toBe(false);
  });

  it("should return undefined for invalid value", () => {
    expect(parseBoolean("yes")).toBeUndefined();
    expect(parseBoolean("no")).toBeUndefined();
    expect(parseBoolean(1)).toBeUndefined();
    expect(parseBoolean(0)).toBeUndefined();
  });
});

// ============================================================================
// parseBookId Tests
// ============================================================================

describe("parseBookId", () => {
  it("should return undefined for undefined", () => {
    expect(parseBookId(undefined)).toBeUndefined();
  });

  it("should return valid cuid", () => {
    expect(parseBookId("cbook123abc")).toBe("cbook123abc");
  });

  it("should return undefined for invalid format", () => {
    expect(parseBookId("invalid")).toBeUndefined();
  });

  it("should trim whitespace", () => {
    expect(parseBookId("  cbook123  ")).toBe("cbook123");
  });
});

// ============================================================================
// parseListPostsQuery Tests
// ============================================================================

describe("parseListPostsQuery", () => {
  it("should parse empty query with defaults", () => {
    const result = parseListPostsQuery({});
    expect(result.page).toBe(DEFAULT_PAGE);
    expect(result.limit).toBe(DEFAULT_LIMIT);
    expect(result.sortBy).toBe(PostSortOptions.RECENT);
    expect(result.categoryId).toBeUndefined();
    expect(result.search).toBeUndefined();
  });

  it("should parse all valid parameters", () => {
    const result = parseListPostsQuery({
      page: "2",
      limit: "50",
      sortBy: "popular",
      categoryId: "ccat123",
      categorySlug: "general",
      search: "test",
      isPinned: "true",
      isFeatured: "false",
      isAnswered: "true",
      bookId: "cbook123",
    });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(50);
    expect(result.sortBy).toBe(PostSortOptions.POPULAR);
    expect(result.categoryId).toBe("ccat123");
    expect(result.categorySlug).toBe("general");
    expect(result.search).toBe("test");
    expect(result.isPinned).toBe(true);
    expect(result.isFeatured).toBe(false);
    expect(result.isAnswered).toBe(true);
    expect(result.bookId).toBe("cbook123");
  });

  it("should handle partial query parameters", () => {
    const result = parseListPostsQuery({
      page: "3",
      sortBy: "unanswered",
    });

    expect(result.page).toBe(3);
    expect(result.limit).toBe(DEFAULT_LIMIT);
    expect(result.sortBy).toBe(PostSortOptions.UNANSWERED);
  });
});

// ============================================================================
// buildPostsCacheKey Tests
// ============================================================================

describe("buildPostsCacheKey", () => {
  it("should build basic cache key", () => {
    const params: PostListQueryParams = {
      page: 1,
      limit: 20,
      sortBy: "recent",
    };
    const key = buildPostsCacheKey(params);
    expect(key).toContain("forum:posts");
    expect(key).toContain("p1");
    expect(key).toContain("l20");
    expect(key).toContain("srecent");
  });

  it("should include category ID in key", () => {
    const params: PostListQueryParams = {
      page: 1,
      limit: 20,
      sortBy: "recent",
      categoryId: "ccat123",
    };
    const key = buildPostsCacheKey(params);
    expect(key).toContain("catccat123");
  });

  it("should include category slug in key", () => {
    const params: PostListQueryParams = {
      page: 1,
      limit: 20,
      sortBy: "recent",
      categorySlug: "general",
    };
    const key = buildPostsCacheKey(params);
    expect(key).toContain("sluggeneral");
  });

  it("should include search in key", () => {
    const params: PostListQueryParams = {
      page: 1,
      limit: 20,
      sortBy: "recent",
      search: "test",
    };
    const key = buildPostsCacheKey(params);
    expect(key).toContain("qtest");
  });

  it("should include boolean flags in key", () => {
    const params: PostListQueryParams = {
      page: 1,
      limit: 20,
      sortBy: "recent",
      isPinned: true,
      isFeatured: false,
      isAnswered: true,
    };
    const key = buildPostsCacheKey(params);
    expect(key).toContain("pintrue");
    expect(key).toContain("featfalse");
    expect(key).toContain("anstrue");
  });

  it("should include book ID in key", () => {
    const params: PostListQueryParams = {
      page: 1,
      limit: 20,
      sortBy: "recent",
      bookId: "cbook123",
    };
    const key = buildPostsCacheKey(params);
    expect(key).toContain("bookcbook123");
  });
});

// ============================================================================
// buildOrderBy Tests
// ============================================================================

describe("buildOrderBy", () => {
  it("should build order for recent", () => {
    const order = buildOrderBy(PostSortOptions.RECENT);
    expect(order[0]).toEqual({ isPinned: "desc" });
    expect(order[1]).toEqual({ createdAt: "desc" });
  });

  it("should build order for popular", () => {
    const order = buildOrderBy(PostSortOptions.POPULAR);
    expect(order[0]).toEqual({ isPinned: "desc" });
    expect(order[1]).toEqual({ voteScore: "desc" });
    expect(order[2]).toEqual({ createdAt: "desc" });
  });

  it("should build order for mostViewed", () => {
    const order = buildOrderBy(PostSortOptions.MOST_VIEWED);
    expect(order[0]).toEqual({ isPinned: "desc" });
    expect(order[1]).toEqual({ viewCount: "desc" });
    expect(order[2]).toEqual({ createdAt: "desc" });
  });

  it("should build order for lastReply", () => {
    const order = buildOrderBy(PostSortOptions.LAST_REPLY);
    expect(order[0]).toEqual({ isPinned: "desc" });
    expect(order[1]).toEqual({ lastReplyAt: "desc" });
    expect(order[2]).toEqual({ createdAt: "desc" });
  });

  it("should build order for unanswered", () => {
    const order = buildOrderBy(PostSortOptions.UNANSWERED);
    expect(order[0]).toEqual({ isPinned: "desc" });
    expect(order[1]).toEqual({ createdAt: "desc" });
  });

  it("should default to recent for unknown sort", () => {
    const order = buildOrderBy("unknown");
    expect(order[0]).toEqual({ isPinned: "desc" });
    expect(order[1]).toEqual({ createdAt: "desc" });
  });
});

// ============================================================================
// mapToPostUserInfo Tests
// ============================================================================

describe("mapToPostUserInfo", () => {
  it("should map user with all fields", () => {
    const user = {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    const result = mapToPostUserInfo(user);
    expect(result.id).toBe("user-1");
    expect(result.username).toBe("testuser");
    expect(result.displayName).toBe("Test User");
    expect(result.avatarUrl).toBe("https://example.com/avatar.jpg");
  });

  it("should map user with null fields", () => {
    const user = {
      id: "user-1",
      username: null,
      displayName: null,
      avatarUrl: null,
    };
    const result = mapToPostUserInfo(user);
    expect(result.username).toBeNull();
    expect(result.displayName).toBeNull();
    expect(result.avatarUrl).toBeNull();
  });
});

// ============================================================================
// mapToPostCategoryInfo Tests
// ============================================================================

describe("mapToPostCategoryInfo", () => {
  it("should map category with all fields", () => {
    const category = {
      id: "cat-1",
      slug: "general",
      name: "General Discussion",
      color: "#3B82F6",
    };
    const result = mapToPostCategoryInfo(category);
    expect(result.id).toBe("cat-1");
    expect(result.slug).toBe("general");
    expect(result.name).toBe("General Discussion");
    expect(result.color).toBe("#3B82F6");
  });

  it("should map category with null color", () => {
    const category = {
      id: "cat-1",
      slug: "general",
      name: "General",
      color: null,
    };
    const result = mapToPostCategoryInfo(category);
    expect(result.color).toBeNull();
  });
});

// ============================================================================
// mapToPostBookInfo Tests
// ============================================================================

describe("mapToPostBookInfo", () => {
  it("should return null for null book", () => {
    expect(mapToPostBookInfo(null)).toBeNull();
  });

  it("should map book with all fields", () => {
    const book = {
      id: "book-1",
      title: "Test Book",
      author: "Test Author",
      coverImage: "https://example.com/cover.jpg",
    };
    const result = mapToPostBookInfo(book);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.id).toBe("book-1");
      expect(result.title).toBe("Test Book");
      expect(result.author).toBe("Test Author");
      expect(result.coverImage).toBe("https://example.com/cover.jpg");
    }
  });

  it("should map book with null optional fields", () => {
    const book = {
      id: "book-1",
      title: "Test Book",
      author: null,
      coverImage: null,
    };
    const result = mapToPostBookInfo(book);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.author).toBeNull();
      expect(result.coverImage).toBeNull();
    }
  });
});

// ============================================================================
// mapToPostSummary Tests
// ============================================================================

describe("mapToPostSummary", () => {
  it("should map post with all fields", () => {
    const post = {
      id: "post-1",
      title: "Test Post Title",
      content: "This is the full content of the post that may be quite long.",
      categoryId: "cat-1",
      category: {
        id: "cat-1",
        slug: "general",
        name: "General",
        color: "#3B82F6",
      },
      userId: "user-1",
      user: {
        id: "user-1",
        username: "testuser",
        displayName: "Test User",
        avatarUrl: "https://example.com/avatar.jpg",
      },
      bookId: "book-1",
      book: {
        id: "book-1",
        title: "Test Book",
        author: "Author",
        coverImage: "https://example.com/cover.jpg",
      },
      isPinned: true,
      isLocked: false,
      isFeatured: true,
      isAnswered: false,
      upvotes: 10,
      downvotes: 2,
      voteScore: 8,
      viewCount: 100,
      repliesCount: 5,
      lastReplyAt: new Date("2026-01-18T10:30:00.000Z"),
      createdAt: new Date("2026-01-18T00:00:00.000Z"),
      updatedAt: new Date("2026-01-18T05:00:00.000Z"),
    };

    const result = mapToPostSummary(post);

    expect(result.id).toBe("post-1");
    expect(result.title).toBe("Test Post Title");
    expect(result.contentPreview).toBe(
      "This is the full content of the post that may be quite long."
    );
    expect(result.categoryId).toBe("cat-1");
    expect(result.category.slug).toBe("general");
    expect(result.userId).toBe("user-1");
    expect(result.user.username).toBe("testuser");
    expect(result.bookId).toBe("book-1");
    expect(result.book).not.toBeNull();
    expect(result.isPinned).toBe(true);
    expect(result.isLocked).toBe(false);
    expect(result.isFeatured).toBe(true);
    expect(result.isAnswered).toBe(false);
    expect(result.upvotes).toBe(10);
    expect(result.downvotes).toBe(2);
    expect(result.voteScore).toBe(8);
    expect(result.viewCount).toBe(100);
    expect(result.repliesCount).toBe(5);
    expect(result.lastReplyAt).toBe("2026-01-18T10:30:00.000Z");
    expect(result.createdAt).toBe("2026-01-18T00:00:00.000Z");
    expect(result.updatedAt).toBe("2026-01-18T05:00:00.000Z");
  });

  it("should truncate long content", () => {
    const post = {
      id: "post-1",
      title: "Test",
      content: "A".repeat(500),
      categoryId: "cat-1",
      category: { id: "cat-1", slug: "general", name: "General", color: null },
      userId: "user-1",
      user: {
        id: "user-1",
        username: null,
        displayName: null,
        avatarUrl: null,
      },
      bookId: null,
      book: null,
      isPinned: false,
      isLocked: false,
      isFeatured: false,
      isAnswered: false,
      upvotes: 0,
      downvotes: 0,
      voteScore: 0,
      viewCount: 0,
      repliesCount: 0,
      lastReplyAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = mapToPostSummary(post);
    expect(result.contentPreview.length).toBeLessThanOrEqual(203);
    expect(result.contentPreview.endsWith("...")).toBe(true);
  });

  it("should handle null lastReplyAt", () => {
    const post = {
      id: "post-1",
      title: "Test",
      content: "Content",
      categoryId: "cat-1",
      category: { id: "cat-1", slug: "general", name: "General", color: null },
      userId: "user-1",
      user: {
        id: "user-1",
        username: null,
        displayName: null,
        avatarUrl: null,
      },
      bookId: null,
      book: null,
      isPinned: false,
      isLocked: false,
      isFeatured: false,
      isAnswered: false,
      upvotes: 0,
      downvotes: 0,
      voteScore: 0,
      viewCount: 0,
      repliesCount: 0,
      lastReplyAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = mapToPostSummary(post);
    expect(result.lastReplyAt).toBeNull();
  });
});

// ============================================================================
// calculatePagination Tests
// ============================================================================

describe("calculatePagination", () => {
  it("should calculate pagination for first page", () => {
    const result = calculatePagination(1, 20, 100);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.total).toBe(100);
    expect(result.totalPages).toBe(5);
    expect(result.hasMore).toBe(true);
  });

  it("should calculate pagination for last page", () => {
    const result = calculatePagination(5, 20, 100);
    expect(result.page).toBe(5);
    expect(result.totalPages).toBe(5);
    expect(result.hasMore).toBe(false);
  });

  it("should handle zero total", () => {
    const result = calculatePagination(1, 20, 0);
    expect(result.totalPages).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it("should handle partial last page", () => {
    const result = calculatePagination(1, 20, 45);
    expect(result.totalPages).toBe(3);
    expect(result.hasMore).toBe(true);
  });

  it("should handle single page", () => {
    const result = calculatePagination(1, 20, 15);
    expect(result.totalPages).toBe(1);
    expect(result.hasMore).toBe(false);
  });

  it("should handle exact page boundary", () => {
    const result = calculatePagination(2, 20, 40);
    expect(result.totalPages).toBe(2);
    expect(result.hasMore).toBe(false);
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  it("should handle empty posts response", () => {
    const response: ForumPostsResponse = {
      posts: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
    expect(response.posts).toHaveLength(0);
  });

  it("should handle post with zero votes", () => {
    const summary: ForumPostSummary = {
      id: "post-1",
      title: "Test",
      contentPreview: "Content",
      categoryId: "cat-1",
      category: { id: "cat-1", slug: "general", name: "General", color: null },
      userId: "user-1",
      user: {
        id: "user-1",
        username: null,
        displayName: null,
        avatarUrl: null,
      },
      bookId: null,
      book: null,
      isPinned: false,
      isLocked: false,
      isFeatured: false,
      isAnswered: false,
      upvotes: 0,
      downvotes: 0,
      voteScore: 0,
      viewCount: 0,
      repliesCount: 0,
      lastReplyAt: null,
      createdAt: "2026-01-18T00:00:00.000Z",
      updatedAt: "2026-01-18T00:00:00.000Z",
    };
    expect(summary.voteScore).toBe(0);
    expect(summary.upvotes).toBe(0);
    expect(summary.downvotes).toBe(0);
  });

  it("should handle negative vote score", () => {
    const summary: ForumPostSummary = {
      id: "post-1",
      title: "Test",
      contentPreview: "Content",
      categoryId: "cat-1",
      category: { id: "cat-1", slug: "general", name: "General", color: null },
      userId: "user-1",
      user: {
        id: "user-1",
        username: null,
        displayName: null,
        avatarUrl: null,
      },
      bookId: null,
      book: null,
      isPinned: false,
      isLocked: false,
      isFeatured: false,
      isAnswered: false,
      upvotes: 5,
      downvotes: 15,
      voteScore: -10,
      viewCount: 50,
      repliesCount: 3,
      lastReplyAt: null,
      createdAt: "2026-01-18T00:00:00.000Z",
      updatedAt: "2026-01-18T00:00:00.000Z",
    };
    expect(summary.voteScore).toBe(-10);
  });
});

// ============================================================================
// Response Structure Tests
// ============================================================================

describe("Response Structure", () => {
  it("should create valid response with posts", () => {
    const posts: ForumPostSummary[] = [
      {
        id: "post-1",
        title: "First Post",
        contentPreview: "First content",
        categoryId: "cat-1",
        category: {
          id: "cat-1",
          slug: "general",
          name: "General",
          color: null,
        },
        userId: "user-1",
        user: {
          id: "user-1",
          username: "user1",
          displayName: null,
          avatarUrl: null,
        },
        bookId: null,
        book: null,
        isPinned: true,
        isLocked: false,
        isFeatured: false,
        isAnswered: false,
        upvotes: 10,
        downvotes: 0,
        voteScore: 10,
        viewCount: 100,
        repliesCount: 5,
        lastReplyAt: "2026-01-18T10:00:00.000Z",
        createdAt: "2026-01-18T00:00:00.000Z",
        updatedAt: "2026-01-18T00:00:00.000Z",
      },
      {
        id: "post-2",
        title: "Second Post",
        contentPreview: "Second content",
        categoryId: "cat-2",
        category: { id: "cat-2", slug: "help", name: "Help", color: "#22C55E" },
        userId: "user-2",
        user: {
          id: "user-2",
          username: "user2",
          displayName: "User Two",
          avatarUrl: null,
        },
        bookId: "book-1",
        book: {
          id: "book-1",
          title: "Book",
          author: "Author",
          coverImage: null,
        },
        isPinned: false,
        isLocked: false,
        isFeatured: true,
        isAnswered: true,
        upvotes: 25,
        downvotes: 3,
        voteScore: 22,
        viewCount: 500,
        repliesCount: 15,
        lastReplyAt: "2026-01-18T12:00:00.000Z",
        createdAt: "2026-01-17T00:00:00.000Z",
        updatedAt: "2026-01-18T12:00:00.000Z",
      },
    ];

    const response: ForumPostsResponse = {
      posts,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasMore: false,
      },
    };

    expect(response.posts).toHaveLength(2);
    expect(response.posts[0]?.isPinned).toBe(true);
    expect(response.posts[1]?.isFeatured).toBe(true);
  });
});
