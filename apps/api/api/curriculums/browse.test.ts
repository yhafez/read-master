/**
 * Tests for Curriculum Browse API
 *
 * Tests cover:
 * - Constants exports
 * - Type exports
 * - Query parameter parsing
 * - Cache key generation
 * - Where clause building
 * - Order by clause building
 * - Helper functions (formatDate, mapToBrowseUserInfo, etc.)
 * - Filter validation
 * - Sort options
 * - Edge cases
 * - Integration scenarios
 */

import { describe, it, expect } from "vitest";
import type { Visibility } from "@read-master/database";
import {
  // Constants
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
  MAX_SEARCH_LENGTH,
  MAX_CATEGORY_LENGTH,
  MAX_DIFFICULTY_LENGTH,
  BROWSE_CACHE_TTL,
  BrowseSortOptions,
  VALID_SORT_OPTIONS,
  DIFFICULTY_OPTIONS,
  // Types
  type BrowseCurriculumsQueryParams,
  type BrowseUserInfo,
  type BrowseCurriculumSummary,
  type BrowsePaginationInfo,
  type BrowseCurriculumsResponse,
  // Helper functions
  parsePage,
  parseLimit,
  parseSortBy,
  isValidSortOption,
  parseCategory,
  parseDifficulty,
  isValidDifficulty,
  parseSearch,
  parseTag,
  parseBrowseQuery,
  buildBrowseCacheKey,
  formatDate,
  mapToBrowseUserInfo,
  mapToBrowseCurriculumSummary,
  truncateDescription,
  calculatePagination,
  buildOrderBy,
  buildBrowseWhereClause,
} from "./browse.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have correct DEFAULT_LIMIT", () => {
    expect(DEFAULT_LIMIT).toBe(20);
  });

  it("should have correct MAX_LIMIT", () => {
    expect(MAX_LIMIT).toBe(50);
  });

  it("should have correct MIN_LIMIT", () => {
    expect(MIN_LIMIT).toBe(1);
  });

  it("should have correct MAX_SEARCH_LENGTH", () => {
    expect(MAX_SEARCH_LENGTH).toBe(200);
  });

  it("should have correct MAX_CATEGORY_LENGTH", () => {
    expect(MAX_CATEGORY_LENGTH).toBe(100);
  });

  it("should have correct MAX_DIFFICULTY_LENGTH", () => {
    expect(MAX_DIFFICULTY_LENGTH).toBe(50);
  });

  it("should have BROWSE_CACHE_TTL defined", () => {
    expect(BROWSE_CACHE_TTL).toBeDefined();
    expect(typeof BROWSE_CACHE_TTL).toBe("number");
  });

  it("should have correct BrowseSortOptions", () => {
    expect(BrowseSortOptions.POPULARITY).toBe("popularity");
    expect(BrowseSortOptions.RECENT).toBe("recent");
    expect(BrowseSortOptions.RATING).toBe("rating");
    expect(BrowseSortOptions.FOLLOWERS).toBe("followers");
    expect(BrowseSortOptions.ITEMS).toBe("items");
  });

  it("should have correct VALID_SORT_OPTIONS", () => {
    expect(VALID_SORT_OPTIONS).toContain("popularity");
    expect(VALID_SORT_OPTIONS).toContain("recent");
    expect(VALID_SORT_OPTIONS).toContain("rating");
    expect(VALID_SORT_OPTIONS).toContain("followers");
    expect(VALID_SORT_OPTIONS).toContain("items");
    expect(VALID_SORT_OPTIONS).toHaveLength(5);
  });

  it("should have correct DIFFICULTY_OPTIONS", () => {
    expect(DIFFICULTY_OPTIONS).toEqual([
      "Beginner",
      "Intermediate",
      "Advanced",
    ]);
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export BrowseCurriculumsQueryParams type", () => {
    const params: BrowseCurriculumsQueryParams = {
      page: 1,
      limit: 20,
      sortBy: "popularity",
      category: "Philosophy",
      difficulty: "Beginner",
      search: "classics",
      tag: "history",
    };
    expect(params.page).toBe(1);
    expect(params.sortBy).toBe("popularity");
    expect(params.category).toBe("Philosophy");
  });

  it("should export BrowseUserInfo type", () => {
    const user: BrowseUserInfo = {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    expect(user.id).toBe("user-1");
    expect(user.username).toBe("testuser");
  });

  it("should export BrowseCurriculumSummary type", () => {
    const curriculum: BrowseCurriculumSummary = {
      id: "curr-1",
      title: "Test Curriculum",
      description: "A test curriculum",
      coverImage: null,
      category: "Philosophy",
      tags: ["history", "classics"],
      difficulty: "Beginner",
      visibility: "PUBLIC" as Visibility,
      totalItems: 5,
      followersCount: 100,
      creator: {
        id: "user-1",
        username: "testuser",
        displayName: "Test User",
        avatarUrl: null,
      },
      isFollowing: false,
      isOfficial: false,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    expect(curriculum.id).toBe("curr-1");
    expect(curriculum.visibility).toBe("PUBLIC");
  });

  it("should export BrowsePaginationInfo type", () => {
    const pagination: BrowsePaginationInfo = {
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasMore: true,
    };
    expect(pagination.page).toBe(1);
    expect(pagination.hasMore).toBe(true);
  });

  it("should export BrowseCurriculumsResponse type", () => {
    const response: BrowseCurriculumsResponse = {
      curriculums: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
      filters: {
        category: null,
        difficulty: null,
        search: null,
        tag: null,
        sortBy: "popularity",
      },
    };
    expect(response.curriculums).toEqual([]);
    expect(response.filters.sortBy).toBe("popularity");
  });
});

// ============================================================================
// parsePage Tests
// ============================================================================

describe("parsePage", () => {
  it("should parse valid page numbers", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("5")).toBe(5);
    expect(parsePage("100")).toBe(100);
  });

  it("should return default for invalid page numbers", () => {
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-1")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("")).toBe(1);
    expect(parsePage(null)).toBe(1);
    expect(parsePage(undefined)).toBe(1);
  });

  it("should handle number inputs", () => {
    expect(parsePage(3)).toBe(3);
    expect(parsePage(10.5)).toBe(10);
    expect(parsePage(0)).toBe(1);
    expect(parsePage(-5)).toBe(1);
  });
});

// ============================================================================
// parseLimit Tests
// ============================================================================

describe("parseLimit", () => {
  it("should parse valid limit values", () => {
    expect(parseLimit("1")).toBe(1);
    expect(parseLimit("20")).toBe(20);
    expect(parseLimit("50")).toBe(50);
  });

  it("should return default for invalid limits", () => {
    expect(parseLimit("0")).toBe(DEFAULT_LIMIT);
    expect(parseLimit("-1")).toBe(DEFAULT_LIMIT);
    expect(parseLimit("51")).toBe(DEFAULT_LIMIT);
    expect(parseLimit("100")).toBe(DEFAULT_LIMIT);
    expect(parseLimit("abc")).toBe(DEFAULT_LIMIT);
    expect(parseLimit(null)).toBe(DEFAULT_LIMIT);
    expect(parseLimit(undefined)).toBe(DEFAULT_LIMIT);
  });

  it("should handle number inputs", () => {
    expect(parseLimit(30)).toBe(30);
    expect(parseLimit(25.7)).toBe(25);
    expect(parseLimit(0)).toBe(DEFAULT_LIMIT);
    expect(parseLimit(100)).toBe(DEFAULT_LIMIT);
  });
});

// ============================================================================
// parseSortBy Tests
// ============================================================================

describe("parseSortBy", () => {
  it("should parse popularity sort options", () => {
    expect(parseSortBy("popularity")).toBe("popularity");
    expect(parseSortBy("POPULARITY")).toBe("popularity");
    expect(parseSortBy("popular")).toBe("popularity");
    expect(parseSortBy("top")).toBe("popularity");
  });

  it("should parse recent sort options", () => {
    expect(parseSortBy("recent")).toBe("recent");
    expect(parseSortBy("RECENT")).toBe("recent");
    expect(parseSortBy("newest")).toBe("recent");
    expect(parseSortBy("latest")).toBe("recent");
    expect(parseSortBy("new")).toBe("recent");
  });

  it("should parse rating sort options", () => {
    expect(parseSortBy("rating")).toBe("rating");
    expect(parseSortBy("RATING")).toBe("rating");
    expect(parseSortBy("rated")).toBe("rating");
  });

  it("should parse followers sort options", () => {
    expect(parseSortBy("followers")).toBe("followers");
    expect(parseSortBy("FOLLOWERS")).toBe("followers");
    expect(parseSortBy("followed")).toBe("followers");
  });

  it("should parse items sort options", () => {
    expect(parseSortBy("items")).toBe("items");
    expect(parseSortBy("ITEMS")).toBe("items");
    expect(parseSortBy("size")).toBe("items");
  });

  it("should return default for invalid sort options", () => {
    expect(parseSortBy("invalid")).toBe("popularity");
    expect(parseSortBy("")).toBe("popularity");
    expect(parseSortBy(null)).toBe("popularity");
    expect(parseSortBy(undefined)).toBe("popularity");
    expect(parseSortBy(123)).toBe("popularity");
  });
});

// ============================================================================
// isValidSortOption Tests
// ============================================================================

describe("isValidSortOption", () => {
  it("should return true for valid sort options", () => {
    expect(isValidSortOption("popularity")).toBe(true);
    expect(isValidSortOption("recent")).toBe(true);
    expect(isValidSortOption("rating")).toBe(true);
    expect(isValidSortOption("followers")).toBe(true);
    expect(isValidSortOption("items")).toBe(true);
  });

  it("should return false for invalid sort options", () => {
    expect(isValidSortOption("invalid")).toBe(false);
    expect(isValidSortOption("POPULARITY")).toBe(false); // case-sensitive
    expect(isValidSortOption("")).toBe(false);
  });
});

// ============================================================================
// parseCategory Tests
// ============================================================================

describe("parseCategory", () => {
  it("should parse valid categories", () => {
    expect(parseCategory("Philosophy")).toBe("Philosophy");
    expect(parseCategory("Science")).toBe("Science");
    expect(parseCategory("  History  ")).toBe("History");
  });

  it("should return null for invalid categories", () => {
    expect(parseCategory("")).toBe(null);
    expect(parseCategory(null)).toBe(null);
    expect(parseCategory(undefined)).toBe(null);
    expect(parseCategory(123)).toBe(null);
    expect(parseCategory("a".repeat(101))).toBe(null); // too long
  });

  it("should trim whitespace", () => {
    expect(parseCategory("  Philosophy  ")).toBe("Philosophy");
  });
});

// ============================================================================
// parseDifficulty Tests
// ============================================================================

describe("parseDifficulty", () => {
  it("should parse valid difficulties", () => {
    expect(parseDifficulty("Beginner")).toBe("Beginner");
    expect(parseDifficulty("Intermediate")).toBe("Intermediate");
    expect(parseDifficulty("Advanced")).toBe("Advanced");
  });

  it("should handle case-insensitive input", () => {
    expect(parseDifficulty("beginner")).toBe("Beginner");
    expect(parseDifficulty("INTERMEDIATE")).toBe("Intermediate");
    expect(parseDifficulty("ADVANCED")).toBe("Advanced");
  });

  it("should return null for invalid difficulties", () => {
    expect(parseDifficulty("Easy")).toBe(null);
    expect(parseDifficulty("Hard")).toBe(null);
    expect(parseDifficulty("")).toBe(null);
    expect(parseDifficulty(null)).toBe(null);
    expect(parseDifficulty(undefined)).toBe(null);
    expect(parseDifficulty(123)).toBe(null);
  });
});

// ============================================================================
// isValidDifficulty Tests
// ============================================================================

describe("isValidDifficulty", () => {
  it("should return true for valid difficulties", () => {
    expect(isValidDifficulty("Beginner")).toBe(true);
    expect(isValidDifficulty("beginner")).toBe(true);
    expect(isValidDifficulty("Intermediate")).toBe(true);
    expect(isValidDifficulty("Advanced")).toBe(true);
  });

  it("should return false for invalid difficulties", () => {
    expect(isValidDifficulty("Easy")).toBe(false);
    expect(isValidDifficulty("Hard")).toBe(false);
    expect(isValidDifficulty("")).toBe(false);
  });
});

// ============================================================================
// parseSearch Tests
// ============================================================================

describe("parseSearch", () => {
  it("should parse valid search queries", () => {
    expect(parseSearch("classics")).toBe("classics");
    expect(parseSearch("philosophy books")).toBe("philosophy books");
  });

  it("should trim whitespace", () => {
    expect(parseSearch("  classics  ")).toBe("classics");
  });

  it("should return null for invalid search queries", () => {
    expect(parseSearch("")).toBe(null);
    expect(parseSearch("   ")).toBe(null);
    expect(parseSearch(null)).toBe(null);
    expect(parseSearch(undefined)).toBe(null);
    expect(parseSearch(123)).toBe(null);
    expect(parseSearch("a".repeat(201))).toBe(null); // too long
  });

  it("should accept max length search", () => {
    const maxSearch = "a".repeat(200);
    expect(parseSearch(maxSearch)).toBe(maxSearch);
  });
});

// ============================================================================
// parseTag Tests
// ============================================================================

describe("parseTag", () => {
  it("should parse valid tags", () => {
    expect(parseTag("history")).toBe("history");
    expect(parseTag("  classics  ")).toBe("classics");
  });

  it("should convert to lowercase", () => {
    expect(parseTag("HISTORY")).toBe("history");
    expect(parseTag("History")).toBe("history");
  });

  it("should return null for invalid tags", () => {
    expect(parseTag("")).toBe(null);
    expect(parseTag("   ")).toBe(null);
    expect(parseTag(null)).toBe(null);
    expect(parseTag(undefined)).toBe(null);
    expect(parseTag(123)).toBe(null);
    expect(parseTag("a".repeat(51))).toBe(null); // too long
  });
});

// ============================================================================
// parseBrowseQuery Tests
// ============================================================================

describe("parseBrowseQuery", () => {
  it("should parse complete query", () => {
    const result = parseBrowseQuery({
      page: "2",
      limit: "30",
      sortBy: "recent",
      category: "Philosophy",
      difficulty: "Beginner",
      search: "classics",
      tag: "history",
    });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(30);
    expect(result.sortBy).toBe("recent");
    expect(result.category).toBe("Philosophy");
    expect(result.difficulty).toBe("Beginner");
    expect(result.search).toBe("classics");
    expect(result.tag).toBe("history");
  });

  it("should use defaults for missing values", () => {
    const result = parseBrowseQuery({});

    expect(result.page).toBe(1);
    expect(result.limit).toBe(DEFAULT_LIMIT);
    expect(result.sortBy).toBe("popularity");
    expect(result.category).toBeNull();
    expect(result.difficulty).toBeNull();
    expect(result.search).toBeNull();
    expect(result.tag).toBeNull();
  });

  it("should handle partial query", () => {
    const result = parseBrowseQuery({
      category: "Science",
      sortBy: "followers",
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(DEFAULT_LIMIT);
    expect(result.sortBy).toBe("followers");
    expect(result.category).toBe("Science");
    expect(result.difficulty).toBeNull();
    expect(result.search).toBeNull();
    expect(result.tag).toBeNull();
  });
});

// ============================================================================
// buildBrowseCacheKey Tests
// ============================================================================

describe("buildBrowseCacheKey", () => {
  it("should build basic cache key", () => {
    const params: BrowseCurriculumsQueryParams = {
      page: 1,
      limit: 20,
      sortBy: "popularity",
      category: null,
      difficulty: null,
      search: null,
      tag: null,
    };
    const key = buildBrowseCacheKey(params);
    expect(key).toContain("curriculums:browse");
    expect(key).toContain("p1");
    expect(key).toContain("l20");
    expect(key).toContain("spopularity");
  });

  it("should include filters in cache key", () => {
    const params: BrowseCurriculumsQueryParams = {
      page: 2,
      limit: 30,
      sortBy: "recent",
      category: "Philosophy",
      difficulty: "Beginner",
      search: "classics",
      tag: "history",
    };
    const key = buildBrowseCacheKey(params);
    expect(key).toContain("p2");
    expect(key).toContain("l30");
    expect(key).toContain("srecent");
    expect(key).toContain("cat-philosophy");
    expect(key).toContain("diff-beginner");
    expect(key).toContain("q-classics");
    expect(key).toContain("tag-history");
  });

  it("should generate different keys for different parameters", () => {
    const params1: BrowseCurriculumsQueryParams = {
      page: 1,
      limit: 20,
      sortBy: "popularity",
      category: null,
      difficulty: null,
      search: null,
      tag: null,
    };
    const params2: BrowseCurriculumsQueryParams = {
      page: 2,
      limit: 20,
      sortBy: "popularity",
      category: null,
      difficulty: null,
      search: null,
      tag: null,
    };

    expect(buildBrowseCacheKey(params1)).not.toBe(buildBrowseCacheKey(params2));
  });
});

// ============================================================================
// formatDate Tests
// ============================================================================

describe("formatDate", () => {
  it("should format date to ISO string", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    expect(formatDate(date)).toBe("2024-01-15T10:30:00.000Z");
  });

  it("should handle different dates", () => {
    const date1 = new Date("2023-06-01T00:00:00.000Z");
    const date2 = new Date("2024-12-31T23:59:59.999Z");
    expect(formatDate(date1)).toBe("2023-06-01T00:00:00.000Z");
    expect(formatDate(date2)).toBe("2024-12-31T23:59:59.999Z");
  });
});

// ============================================================================
// mapToBrowseUserInfo Tests
// ============================================================================

describe("mapToBrowseUserInfo", () => {
  it("should map user with all fields", () => {
    const user = {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    const result = mapToBrowseUserInfo(user);
    expect(result.id).toBe("user-1");
    expect(result.username).toBe("testuser");
    expect(result.displayName).toBe("Test User");
    expect(result.avatarUrl).toBe("https://example.com/avatar.jpg");
  });

  it("should use 'anonymous' for null username", () => {
    const user = {
      id: "user-1",
      username: null,
      displayName: null,
      avatarUrl: null,
    };
    const result = mapToBrowseUserInfo(user);
    expect(result.username).toBe("anonymous");
    expect(result.displayName).toBeNull();
    expect(result.avatarUrl).toBeNull();
  });
});

// ============================================================================
// mapToBrowseCurriculumSummary Tests
// ============================================================================

describe("mapToBrowseCurriculumSummary", () => {
  const baseCurriculum = {
    id: "curr-1",
    title: "Test Curriculum",
    description: "A test curriculum description",
    coverImage: "https://example.com/cover.jpg",
    category: "Philosophy",
    tags: ["history", "classics"],
    difficulty: "Beginner",
    visibility: "PUBLIC" as Visibility,
    totalItems: 5,
    followersCount: 100,
    isOfficial: false,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-15T12:00:00.000Z"),
    user: {
      id: "user-1",
      username: "creator",
      displayName: "Creator Name",
      avatarUrl: "https://example.com/avatar.jpg",
    },
    followers: [],
  };

  it("should map curriculum to summary format", () => {
    const result = mapToBrowseCurriculumSummary(baseCurriculum, "user-2");

    expect(result.id).toBe("curr-1");
    expect(result.title).toBe("Test Curriculum");
    expect(result.category).toBe("Philosophy");
    expect(result.difficulty).toBe("Beginner");
    expect(result.totalItems).toBe(5);
    expect(result.followersCount).toBe(100);
    expect(result.creator.username).toBe("creator");
    expect(result.isFollowing).toBe(false);
  });

  it("should set isFollowing to true when user is following", () => {
    const curriculum = {
      ...baseCurriculum,
      followers: [{ userId: "user-2" }],
    };
    const result = mapToBrowseCurriculumSummary(curriculum, "user-2");
    expect(result.isFollowing).toBe(true);
  });

  it("should truncate long descriptions", () => {
    const longDescription = "a".repeat(500);
    const curriculum = {
      ...baseCurriculum,
      description: longDescription,
    };
    const result = mapToBrowseCurriculumSummary(curriculum, "user-2");
    expect(result.description.length).toBeLessThanOrEqual(303); // 300 + "..."
    expect(result.description.endsWith("...")).toBe(true);
  });

  it("should format dates as ISO strings", () => {
    const result = mapToBrowseCurriculumSummary(baseCurriculum, "user-2");
    expect(result.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(result.updatedAt).toBe("2024-01-15T12:00:00.000Z");
  });
});

// ============================================================================
// truncateDescription Tests
// ============================================================================

describe("truncateDescription", () => {
  it("should not truncate short descriptions", () => {
    expect(truncateDescription("Short description", 300)).toBe(
      "Short description"
    );
  });

  it("should truncate long descriptions", () => {
    const longText = "a".repeat(350);
    const result = truncateDescription(longText, 300);
    expect(result.length).toBe(303); // 300 + "..."
    expect(result.endsWith("...")).toBe(true);
  });

  it("should handle exact length", () => {
    const exactLength = "a".repeat(300);
    const result = truncateDescription(exactLength, 300);
    expect(result).toBe(exactLength);
    expect(result.length).toBe(300);
  });

  it("should handle empty string", () => {
    expect(truncateDescription("", 300)).toBe("");
  });

  it("should handle different max lengths", () => {
    const text = "a".repeat(100);
    expect(truncateDescription(text, 50).length).toBe(53); // 50 + "..."
    expect(truncateDescription(text, 200)).toBe(text); // no truncation needed
  });
});

// ============================================================================
// calculatePagination Tests
// ============================================================================

describe("calculatePagination", () => {
  it("should calculate pagination for first page", () => {
    const result = calculatePagination(100, 1, 20);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.total).toBe(100);
    expect(result.totalPages).toBe(5);
    expect(result.hasMore).toBe(true);
  });

  it("should calculate pagination for last page", () => {
    const result = calculatePagination(100, 5, 20);
    expect(result.page).toBe(5);
    expect(result.hasMore).toBe(false);
  });

  it("should handle zero results", () => {
    const result = calculatePagination(0, 1, 20);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it("should handle single page", () => {
    const result = calculatePagination(15, 1, 20);
    expect(result.totalPages).toBe(1);
    expect(result.hasMore).toBe(false);
  });

  it("should handle partial last page", () => {
    const result = calculatePagination(45, 3, 20);
    expect(result.totalPages).toBe(3);
    expect(result.hasMore).toBe(false);
  });
});

// ============================================================================
// buildOrderBy Tests
// ============================================================================

describe("buildOrderBy", () => {
  it("should build order for popularity", () => {
    const result = buildOrderBy("popularity");
    expect(result).toEqual([{ followersCount: "desc" }, { createdAt: "desc" }]);
  });

  it("should build order for recent", () => {
    const result = buildOrderBy("recent");
    expect(result).toEqual([{ createdAt: "desc" }]);
  });

  it("should build order for rating", () => {
    const result = buildOrderBy("rating");
    expect(result).toEqual([{ followersCount: "desc" }, { createdAt: "desc" }]);
  });

  it("should build order for followers", () => {
    const result = buildOrderBy("followers");
    expect(result).toEqual([{ followersCount: "desc" }, { createdAt: "desc" }]);
  });

  it("should build order for items", () => {
    const result = buildOrderBy("items");
    expect(result).toEqual([{ totalItems: "desc" }, { createdAt: "desc" }]);
  });

  it("should use default order for unknown sort", () => {
    const result = buildOrderBy("unknown");
    expect(result).toEqual([{ followersCount: "desc" }, { createdAt: "desc" }]);
  });
});

// ============================================================================
// buildBrowseWhereClause Tests
// ============================================================================

describe("buildBrowseWhereClause", () => {
  it("should always include PUBLIC visibility and deletedAt null", () => {
    const params: BrowseCurriculumsQueryParams = {
      page: 1,
      limit: 20,
      sortBy: "popularity",
      category: null,
      difficulty: null,
      search: null,
      tag: null,
    };
    const result = buildBrowseWhereClause(params);
    expect(result.visibility).toBe("PUBLIC");
    expect(result.deletedAt).toBeNull();
  });

  it("should include category filter", () => {
    const params: BrowseCurriculumsQueryParams = {
      page: 1,
      limit: 20,
      sortBy: "popularity",
      category: "Philosophy",
      difficulty: null,
      search: null,
      tag: null,
    };
    const result = buildBrowseWhereClause(params);
    expect(result.category).toEqual({
      equals: "Philosophy",
      mode: "insensitive",
    });
  });

  it("should include difficulty filter", () => {
    const params: BrowseCurriculumsQueryParams = {
      page: 1,
      limit: 20,
      sortBy: "popularity",
      category: null,
      difficulty: "Beginner",
      search: null,
      tag: null,
    };
    const result = buildBrowseWhereClause(params);
    expect(result.difficulty).toBe("Beginner");
  });

  it("should include tag filter", () => {
    const params: BrowseCurriculumsQueryParams = {
      page: 1,
      limit: 20,
      sortBy: "popularity",
      category: null,
      difficulty: null,
      search: null,
      tag: "history",
    };
    const result = buildBrowseWhereClause(params);
    expect(result.tags).toEqual({ has: "history" });
  });

  it("should include search filter with OR", () => {
    const params: BrowseCurriculumsQueryParams = {
      page: 1,
      limit: 20,
      sortBy: "popularity",
      category: null,
      difficulty: null,
      search: "classics",
      tag: null,
    };
    const result = buildBrowseWhereClause(params);
    expect(result.OR).toEqual([
      { title: { contains: "classics", mode: "insensitive" } },
      { description: { contains: "classics", mode: "insensitive" } },
    ]);
  });

  it("should combine all filters", () => {
    const params: BrowseCurriculumsQueryParams = {
      page: 1,
      limit: 20,
      sortBy: "popularity",
      category: "Philosophy",
      difficulty: "Intermediate",
      search: "ancient",
      tag: "history",
    };
    const result = buildBrowseWhereClause(params);
    expect(result.visibility).toBe("PUBLIC");
    expect(result.deletedAt).toBeNull();
    expect(result.category).toEqual({
      equals: "Philosophy",
      mode: "insensitive",
    });
    expect(result.difficulty).toBe("Intermediate");
    expect(result.tags).toEqual({ has: "history" });
    expect(result.OR).toEqual([
      { title: { contains: "ancient", mode: "insensitive" } },
      { description: { contains: "ancient", mode: "insensitive" } },
    ]);
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  it("should handle boundary page values", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage(Number.MAX_SAFE_INTEGER.toString())).toBe(
      Number.MAX_SAFE_INTEGER
    );
  });

  it("should handle boundary limit values", () => {
    expect(parseLimit("1")).toBe(1);
    expect(parseLimit("50")).toBe(50);
    expect(parseLimit("0")).toBe(DEFAULT_LIMIT);
    expect(parseLimit("51")).toBe(DEFAULT_LIMIT);
  });

  it("should handle special characters in search", () => {
    expect(parseSearch("test & query")).toBe("test & query");
    expect(parseSearch("test's query")).toBe("test's query");
    expect(parseSearch('test "query"')).toBe('test "query"');
  });

  it("should handle unicode in category", () => {
    expect(parseCategory("哲学")).toBe("哲学");
    expect(parseCategory("Philosophie")).toBe("Philosophie");
  });

  it("should handle pagination edge cases", () => {
    // Single item
    expect(calculatePagination(1, 1, 20)).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
      hasMore: false,
    });

    // Page beyond total
    const beyondTotal = calculatePagination(20, 5, 10);
    expect(beyondTotal.hasMore).toBe(false);
  });

  it("should handle empty strings gracefully", () => {
    const result = parseBrowseQuery({
      page: "",
      limit: "",
      sortBy: "",
      category: "",
      difficulty: "",
      search: "",
      tag: "",
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(DEFAULT_LIMIT);
    expect(result.sortBy).toBe("popularity");
    expect(result.category).toBeNull();
    expect(result.difficulty).toBeNull();
    expect(result.search).toBeNull();
    expect(result.tag).toBeNull();
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Integration Tests", () => {
  it("should build complete request from raw query params", () => {
    const rawQuery = {
      page: "2",
      limit: "25",
      sortBy: "recent",
      category: "Science",
      difficulty: "advanced",
      search: "quantum",
      tag: "physics",
    };

    const params = parseBrowseQuery(rawQuery);
    const cacheKey = buildBrowseCacheKey(params);
    const whereClause = buildBrowseWhereClause(params);
    const orderBy = buildOrderBy(params.sortBy);

    expect(params.page).toBe(2);
    expect(params.difficulty).toBe("Advanced"); // normalized
    expect(cacheKey).toContain("p2");
    expect(cacheKey).toContain("srecent");
    expect(whereClause.visibility).toBe("PUBLIC");
    expect(whereClause.difficulty).toBe("Advanced");
    expect(orderBy).toEqual([{ createdAt: "desc" }]);
  });

  it("should handle typical browse workflow", () => {
    // User browses with filters
    const query = parseBrowseQuery({
      category: "History",
      sortBy: "popularity",
    });

    // Generate cache key
    const cacheKey = buildBrowseCacheKey(query);
    expect(cacheKey).toContain("cat-history");
    expect(cacheKey).toContain("spopularity");

    // Build database query
    const where = buildBrowseWhereClause(query);
    expect(where.visibility).toBe("PUBLIC");
    expect(where.category).toEqual({
      equals: "History",
      mode: "insensitive",
    });

    // Get order
    const orderBy = buildOrderBy(query.sortBy);
    expect(orderBy[0]).toHaveProperty("followersCount", "desc");
  });
});
