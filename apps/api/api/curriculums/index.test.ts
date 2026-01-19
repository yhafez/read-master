/**
 * Tests for Curriculum API - List and Create
 *
 * Tests cover:
 * - Type exports
 * - Query parameter parsing
 * - Cache key generation
 * - Where clause building
 * - Helper functions (formatDate, mapToCurriculumUserInfo, etc.)
 * - Tier permission checking
 * - Profanity filtering via schema
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
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_CATEGORY_LENGTH,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  CURRICULUMS_CACHE_TTL,
  VISIBILITY_OPTIONS,
  DIFFICULTY_OPTIONS,
  // Types (test exports)
  type ListCurriculumsQueryParams,
  type CurriculumUserInfo,
  type CurriculumItemInfo,
  type CurriculumResponse,
  type CreateCurriculumInput,
  type CurriculumsPaginationInfo,
  type ListCurriculumsResponse,
  // Schemas
  listCurriculumsQuerySchema,
  createCurriculumSchema,
  // Helper functions
  parseListCurriculumsQuery,
  buildCurriculumsListCacheKey,
  buildCurriculumsWhereClause,
  formatDate,
  mapToCurriculumUserInfo,
  mapToCurriculumItemInfo,
  mapToCurriculumResponse,
  calculatePagination,
  canCreateCurriculum,
} from "./index.js";

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

  it("should have correct MAX_TITLE_LENGTH", () => {
    expect(MAX_TITLE_LENGTH).toBe(200);
  });

  it("should have correct MAX_DESCRIPTION_LENGTH", () => {
    expect(MAX_DESCRIPTION_LENGTH).toBe(5000);
  });

  it("should have correct MAX_CATEGORY_LENGTH", () => {
    expect(MAX_CATEGORY_LENGTH).toBe(100);
  });

  it("should have correct MAX_TAGS", () => {
    expect(MAX_TAGS).toBe(10);
  });

  it("should have correct MAX_TAG_LENGTH", () => {
    expect(MAX_TAG_LENGTH).toBe(50);
  });

  it("should have CURRICULUMS_CACHE_TTL defined", () => {
    expect(CURRICULUMS_CACHE_TTL).toBeDefined();
    expect(typeof CURRICULUMS_CACHE_TTL).toBe("number");
  });

  it("should have correct VISIBILITY_OPTIONS", () => {
    expect(VISIBILITY_OPTIONS).toEqual(["PUBLIC", "PRIVATE", "UNLISTED"]);
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
  it("should export ListCurriculumsQueryParams type", () => {
    const params: ListCurriculumsQueryParams = {
      visibility: "PUBLIC",
      page: 1,
      limit: 20,
    };
    expect(params.visibility).toBe("PUBLIC");
    expect(params.page).toBe(1);
  });

  it("should export CurriculumUserInfo type", () => {
    const user: CurriculumUserInfo = {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    expect(user.id).toBe("user-1");
    expect(user.username).toBe("testuser");
  });

  it("should export CurriculumItemInfo type", () => {
    const item: CurriculumItemInfo = {
      id: "item-1",
      orderIndex: 0,
      bookId: "book-1",
      externalTitle: null,
      externalAuthor: null,
      externalUrl: null,
      notes: "Some notes",
      estimatedTime: 60,
      isOptional: false,
    };
    expect(item.id).toBe("item-1");
    expect(item.orderIndex).toBe(0);
  });

  it("should export CurriculumResponse type", () => {
    const response: CurriculumResponse = {
      id: "curriculum-1",
      title: "Test Curriculum",
      description: "A test curriculum",
      coverImage: null,
      category: "Science",
      tags: ["science", "beginner"],
      difficulty: "Beginner",
      visibility: "PUBLIC",
      totalItems: 5,
      followersCount: 10,
      creator: {
        id: "user-1",
        username: "creator",
        displayName: null,
        avatarUrl: null,
      },
      isFollowing: false,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    expect(response.id).toBe("curriculum-1");
    expect(response.visibility).toBe("PUBLIC");
  });

  it("should export CreateCurriculumInput type", () => {
    const input: CreateCurriculumInput = {
      title: "New Curriculum",
      description: "Description",
      visibility: "PUBLIC",
    };
    expect(input.title).toBe("New Curriculum");
    expect(input.visibility).toBe("PUBLIC");
  });

  it("should export CurriculumsPaginationInfo type", () => {
    const pagination: CurriculumsPaginationInfo = {
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasMore: true,
    };
    expect(pagination.total).toBe(100);
    expect(pagination.hasMore).toBe(true);
  });

  it("should export ListCurriculumsResponse type structure", () => {
    // This validates the type exists and has the expected structure
    const response: ListCurriculumsResponse = {
      curriculums: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
    expect(response.curriculums).toEqual([]);
  });
});

// ============================================================================
// listCurriculumsQuerySchema Tests
// ============================================================================

describe("listCurriculumsQuerySchema", () => {
  it("should parse valid query with all parameters", () => {
    const result = listCurriculumsQuerySchema.safeParse({
      visibility: "PUBLIC",
      page: "2",
      limit: "10",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visibility).toBe("PUBLIC");
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    }
  });

  it("should use defaults for missing parameters", () => {
    const result = listCurriculumsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visibility).toBeNull();
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(DEFAULT_LIMIT);
    }
  });

  it("should accept PRIVATE visibility", () => {
    const result = listCurriculumsQuerySchema.safeParse({
      visibility: "PRIVATE",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visibility).toBe("PRIVATE");
    }
  });

  it("should accept UNLISTED visibility", () => {
    const result = listCurriculumsQuerySchema.safeParse({
      visibility: "UNLISTED",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visibility).toBe("UNLISTED");
    }
  });

  it("should reject invalid visibility", () => {
    const result = listCurriculumsQuerySchema.safeParse({
      visibility: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("should reject page less than 1", () => {
    const result = listCurriculumsQuerySchema.safeParse({
      page: "0",
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative page", () => {
    const result = listCurriculumsQuerySchema.safeParse({
      page: "-1",
    });
    expect(result.success).toBe(false);
  });

  it("should reject limit greater than MAX_LIMIT", () => {
    const result = listCurriculumsQuerySchema.safeParse({
      limit: "100",
    });
    expect(result.success).toBe(false);
  });

  it("should reject limit less than MIN_LIMIT", () => {
    const result = listCurriculumsQuerySchema.safeParse({
      limit: "0",
    });
    expect(result.success).toBe(false);
  });

  it("should coerce string numbers to integers", () => {
    const result = listCurriculumsQuerySchema.safeParse({
      page: "5",
      limit: "25",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(5);
      expect(result.data.limit).toBe(25);
    }
  });
});

// ============================================================================
// createCurriculumSchema Tests
// ============================================================================

describe("createCurriculumSchema", () => {
  it("should validate a complete valid input", () => {
    const result = createCurriculumSchema.safeParse({
      title: "My Curriculum",
      description: "A great learning path",
      coverImage: "https://example.com/cover.jpg",
      category: "Science",
      tags: ["science", "beginner"],
      difficulty: "Beginner",
      visibility: "PUBLIC",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("My Curriculum");
      expect(result.data.visibility).toBe("PUBLIC");
    }
  });

  it("should validate minimal required input", () => {
    const result = createCurriculumSchema.safeParse({
      title: "My Curriculum",
      description: "Description",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visibility).toBe("PRIVATE"); // default
      expect(result.data.tags).toEqual([]); // default
    }
  });

  it("should reject empty title", () => {
    const result = createCurriculumSchema.safeParse({
      title: "",
      description: "Description",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty description", () => {
    const result = createCurriculumSchema.safeParse({
      title: "Title",
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject title exceeding MAX_TITLE_LENGTH", () => {
    const result = createCurriculumSchema.safeParse({
      title: "x".repeat(MAX_TITLE_LENGTH + 1),
      description: "Description",
    });
    expect(result.success).toBe(false);
  });

  it("should reject description exceeding MAX_DESCRIPTION_LENGTH", () => {
    const result = createCurriculumSchema.safeParse({
      title: "Title",
      description: "x".repeat(MAX_DESCRIPTION_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should reject profane title", () => {
    const result = createCurriculumSchema.safeParse({
      title: "What the fuck title",
      description: "Description",
    });
    expect(result.success).toBe(false);
  });

  it("should reject profane description", () => {
    const result = createCurriculumSchema.safeParse({
      title: "Title",
      description: "This is a bullshit description",
    });
    expect(result.success).toBe(false);
  });

  it("should reject profane category", () => {
    const result = createCurriculumSchema.safeParse({
      title: "Title",
      description: "Description",
      category: "Shit category",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid cover image URL", () => {
    const result = createCurriculumSchema.safeParse({
      title: "Title",
      description: "Description",
      coverImage: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("should reject too many tags", () => {
    const result = createCurriculumSchema.safeParse({
      title: "Title",
      description: "Description",
      tags: Array(MAX_TAGS + 1).fill("tag"),
    });
    expect(result.success).toBe(false);
  });

  it("should reject tag exceeding MAX_TAG_LENGTH", () => {
    const result = createCurriculumSchema.safeParse({
      title: "Title",
      description: "Description",
      tags: ["x".repeat(MAX_TAG_LENGTH + 1)],
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid difficulty", () => {
    const result = createCurriculumSchema.safeParse({
      title: "Title",
      description: "Description",
      difficulty: "Expert", // not a valid option
    });
    expect(result.success).toBe(false);
  });

  it("should accept all valid difficulty options", () => {
    for (const difficulty of DIFFICULTY_OPTIONS) {
      const result = createCurriculumSchema.safeParse({
        title: "Title",
        description: "Description",
        difficulty,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should accept all valid visibility options", () => {
    for (const visibility of VISIBILITY_OPTIONS) {
      const result = createCurriculumSchema.safeParse({
        title: "Title",
        description: "Description",
        visibility,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should accept null optional fields", () => {
    const result = createCurriculumSchema.safeParse({
      title: "Title",
      description: "Description",
      coverImage: null,
      category: null,
      difficulty: null,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// parseListCurriculumsQuery Tests
// ============================================================================

describe("parseListCurriculumsQuery", () => {
  it("should parse valid query parameters", () => {
    const result = parseListCurriculumsQuery({
      visibility: "PUBLIC",
      page: "2",
      limit: "15",
    });
    expect(result.visibility).toBe("PUBLIC");
    expect(result.page).toBe(2);
    expect(result.limit).toBe(15);
  });

  it("should return defaults for empty query", () => {
    const result = parseListCurriculumsQuery({});
    expect(result.visibility).toBeNull();
    expect(result.page).toBe(1);
    expect(result.limit).toBe(DEFAULT_LIMIT);
  });

  it("should return defaults for invalid query", () => {
    const result = parseListCurriculumsQuery({
      page: "invalid",
      limit: "invalid",
    });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(DEFAULT_LIMIT);
  });

  it("should handle array values", () => {
    const result = parseListCurriculumsQuery({
      visibility: ["PUBLIC"],
    });
    // Should return defaults due to array being unexpected
    expect(result.visibility).toBeNull();
  });
});

// ============================================================================
// buildCurriculumsListCacheKey Tests
// ============================================================================

describe("buildCurriculumsListCacheKey", () => {
  it("should build cache key with basic params", () => {
    const key = buildCurriculumsListCacheKey("user-1", {
      visibility: null,
      page: 1,
      limit: 20,
    });
    expect(key).toContain("user-1");
    expect(key).toContain("curriculums");
    expect(key).toContain("page-1");
    expect(key).toContain("limit-20");
  });

  it("should include visibility in cache key when specified", () => {
    const key = buildCurriculumsListCacheKey("user-1", {
      visibility: "PUBLIC",
      page: 1,
      limit: 20,
    });
    expect(key).toContain("visibility-PUBLIC");
  });

  it("should not include visibility when null", () => {
    const key = buildCurriculumsListCacheKey("user-1", {
      visibility: null,
      page: 1,
      limit: 20,
    });
    expect(key).not.toContain("visibility");
  });

  it("should produce different keys for different pages", () => {
    const key1 = buildCurriculumsListCacheKey("user-1", {
      visibility: null,
      page: 1,
      limit: 20,
    });
    const key2 = buildCurriculumsListCacheKey("user-1", {
      visibility: null,
      page: 2,
      limit: 20,
    });
    expect(key1).not.toBe(key2);
  });

  it("should produce different keys for different users", () => {
    const params = {
      visibility: null as Visibility | null,
      page: 1,
      limit: 20,
    };
    const key1 = buildCurriculumsListCacheKey("user-1", params);
    const key2 = buildCurriculumsListCacheKey("user-2", params);
    expect(key1).not.toBe(key2);
  });
});

// ============================================================================
// buildCurriculumsWhereClause Tests
// ============================================================================

describe("buildCurriculumsWhereClause", () => {
  it("should build basic where clause for user", () => {
    const where = buildCurriculumsWhereClause("user-1", {
      visibility: null,
      page: 1,
      limit: 20,
    });
    expect(where.userId).toBe("user-1");
    expect(where.deletedAt).toBeNull();
  });

  it("should add visibility filter when specified", () => {
    const where = buildCurriculumsWhereClause("user-1", {
      visibility: "PUBLIC",
      page: 1,
      limit: 20,
    });
    expect(where.visibility).toBe("PUBLIC");
  });

  it("should not add visibility filter when null", () => {
    const where = buildCurriculumsWhereClause("user-1", {
      visibility: null,
      page: 1,
      limit: 20,
    });
    expect(where.visibility).toBeUndefined();
  });

  it("should filter for PRIVATE visibility", () => {
    const where = buildCurriculumsWhereClause("user-1", {
      visibility: "PRIVATE",
      page: 1,
      limit: 20,
    });
    expect(where.visibility).toBe("PRIVATE");
  });

  it("should filter for UNLISTED visibility", () => {
    const where = buildCurriculumsWhereClause("user-1", {
      visibility: "UNLISTED",
      page: 1,
      limit: 20,
    });
    expect(where.visibility).toBe("UNLISTED");
  });
});

// ============================================================================
// formatDate Tests
// ============================================================================

describe("formatDate", () => {
  it("should format date as ISO string", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    const result = formatDate(date);
    expect(result).toBe("2024-01-15T10:30:00.000Z");
  });

  it("should handle dates with milliseconds", () => {
    const date = new Date("2024-06-20T15:45:30.123Z");
    const result = formatDate(date);
    expect(result).toBe("2024-06-20T15:45:30.123Z");
  });

  it("should return consistent format", () => {
    const date = new Date(0); // Unix epoch
    const result = formatDate(date);
    expect(result).toBe("1970-01-01T00:00:00.000Z");
  });
});

// ============================================================================
// mapToCurriculumUserInfo Tests
// ============================================================================

describe("mapToCurriculumUserInfo", () => {
  it("should map user with all fields", () => {
    const result = mapToCurriculumUserInfo({
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    });
    expect(result).toEqual({
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    });
  });

  it("should default username to 'anonymous' when null", () => {
    const result = mapToCurriculumUserInfo({
      id: "user-1",
      username: null,
      displayName: "Test User",
      avatarUrl: null,
    });
    expect(result.username).toBe("anonymous");
  });

  it("should handle all null optional fields", () => {
    const result = mapToCurriculumUserInfo({
      id: "user-1",
      username: null,
      displayName: null,
      avatarUrl: null,
    });
    expect(result).toEqual({
      id: "user-1",
      username: "anonymous",
      displayName: null,
      avatarUrl: null,
    });
  });
});

// ============================================================================
// mapToCurriculumItemInfo Tests
// ============================================================================

describe("mapToCurriculumItemInfo", () => {
  it("should map item with book reference", () => {
    const result = mapToCurriculumItemInfo({
      id: "item-1",
      orderIndex: 0,
      bookId: "book-1",
      externalTitle: null,
      externalAuthor: null,
      externalUrl: null,
      notes: "Read chapter 1",
      estimatedTime: 60,
      isOptional: false,
    });
    expect(result).toEqual({
      id: "item-1",
      orderIndex: 0,
      bookId: "book-1",
      externalTitle: null,
      externalAuthor: null,
      externalUrl: null,
      notes: "Read chapter 1",
      estimatedTime: 60,
      isOptional: false,
    });
  });

  it("should map item with external resource", () => {
    const result = mapToCurriculumItemInfo({
      id: "item-2",
      orderIndex: 1,
      bookId: null,
      externalTitle: "External Book",
      externalAuthor: "John Doe",
      externalUrl: "https://example.com/book",
      notes: null,
      estimatedTime: 120,
      isOptional: true,
    });
    expect(result.externalTitle).toBe("External Book");
    expect(result.isOptional).toBe(true);
  });

  it("should preserve orderIndex correctly", () => {
    const result = mapToCurriculumItemInfo({
      id: "item-3",
      orderIndex: 5,
      bookId: null,
      externalTitle: null,
      externalAuthor: null,
      externalUrl: null,
      notes: null,
      estimatedTime: null,
      isOptional: false,
    });
    expect(result.orderIndex).toBe(5);
  });
});

// ============================================================================
// mapToCurriculumResponse Tests
// ============================================================================

describe("mapToCurriculumResponse", () => {
  const baseCurriculum = {
    id: "curriculum-1",
    title: "Test Curriculum",
    description: "A test description",
    coverImage: "https://example.com/cover.jpg",
    category: "Science",
    tags: ["science", "physics"],
    difficulty: "Intermediate",
    visibility: "PUBLIC" as Visibility,
    totalItems: 5,
    followersCount: 10,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-15T00:00:00.000Z"),
    user: {
      id: "user-1",
      username: "creator",
      displayName: "Creator Name",
      avatarUrl: "https://example.com/avatar.jpg",
    },
    followers: [] as Array<{ userId: string }>,
  };

  it("should map curriculum with all fields", () => {
    const result = mapToCurriculumResponse(baseCurriculum, "user-2");
    expect(result.id).toBe("curriculum-1");
    expect(result.title).toBe("Test Curriculum");
    expect(result.visibility).toBe("PUBLIC");
    expect(result.totalItems).toBe(5);
    expect(result.followersCount).toBe(10);
    expect(result.creator.id).toBe("user-1");
    expect(result.isFollowing).toBe(false);
    expect(result.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("should detect following status correctly", () => {
    const curriculumWithFollower = {
      ...baseCurriculum,
      followers: [{ userId: "user-2" }],
    };
    const result = mapToCurriculumResponse(curriculumWithFollower, "user-2");
    expect(result.isFollowing).toBe(true);
  });

  it("should return isFollowing false when user is not following", () => {
    const curriculumWithFollower = {
      ...baseCurriculum,
      followers: [{ userId: "user-3" }],
    };
    const result = mapToCurriculumResponse(curriculumWithFollower, "user-2");
    expect(result.isFollowing).toBe(false);
  });

  it("should handle curriculum with empty followers array", () => {
    const curriculumNoFollowers = {
      ...baseCurriculum,
      followers: [],
    };
    const result = mapToCurriculumResponse(curriculumNoFollowers, "user-2");
    expect(result.isFollowing).toBe(false);
  });

  it("should handle null optional fields", () => {
    const curriculumWithNulls = {
      ...baseCurriculum,
      coverImage: null,
      category: null,
      difficulty: null,
    };
    const result = mapToCurriculumResponse(curriculumWithNulls, "user-2");
    expect(result.coverImage).toBeNull();
    expect(result.category).toBeNull();
    expect(result.difficulty).toBeNull();
  });
});

// ============================================================================
// calculatePagination Tests
// ============================================================================

describe("calculatePagination", () => {
  it("should calculate pagination for first page", () => {
    const result = calculatePagination(100, 1, 20);
    expect(result).toEqual({
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasMore: true,
    });
  });

  it("should calculate pagination for last page", () => {
    const result = calculatePagination(100, 5, 20);
    expect(result).toEqual({
      page: 5,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasMore: false,
    });
  });

  it("should handle total less than limit", () => {
    const result = calculatePagination(5, 1, 20);
    expect(result).toEqual({
      page: 1,
      limit: 20,
      total: 5,
      totalPages: 1,
      hasMore: false,
    });
  });

  it("should handle zero total", () => {
    const result = calculatePagination(0, 1, 20);
    expect(result).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasMore: false,
    });
  });

  it("should handle exact page boundary", () => {
    const result = calculatePagination(40, 2, 20);
    expect(result.totalPages).toBe(2);
    expect(result.hasMore).toBe(false);
  });

  it("should handle partial last page", () => {
    const result = calculatePagination(45, 2, 20);
    expect(result.totalPages).toBe(3);
    expect(result.hasMore).toBe(true);
  });
});

// ============================================================================
// canCreateCurriculum Tests
// ============================================================================

describe("canCreateCurriculum", () => {
  it("should return false for FREE tier", () => {
    expect(canCreateCurriculum("FREE")).toBe(false);
  });

  it("should return true for PRO tier", () => {
    expect(canCreateCurriculum("PRO")).toBe(true);
  });

  it("should return true for SCHOLAR tier", () => {
    expect(canCreateCurriculum("SCHOLAR")).toBe(true);
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  describe("Empty arrays and collections", () => {
    it("should handle curriculum with empty tags", () => {
      const curriculum = {
        id: "curriculum-1",
        title: "Title",
        description: "Description",
        coverImage: null,
        category: null,
        tags: [],
        difficulty: null,
        visibility: "PUBLIC" as Visibility,
        totalItems: 0,
        followersCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: "user-1",
          username: "user",
          displayName: null,
          avatarUrl: null,
        },
        followers: [],
      };
      const result = mapToCurriculumResponse(curriculum, "user-2");
      expect(result.tags).toEqual([]);
    });
  });

  describe("Boundary values", () => {
    it("should accept title at MAX_TITLE_LENGTH", () => {
      const result = createCurriculumSchema.safeParse({
        title: "x".repeat(MAX_TITLE_LENGTH),
        description: "Description",
      });
      expect(result.success).toBe(true);
    });

    it("should accept description at MAX_DESCRIPTION_LENGTH", () => {
      const result = createCurriculumSchema.safeParse({
        title: "Title",
        description: "x".repeat(MAX_DESCRIPTION_LENGTH),
      });
      expect(result.success).toBe(true);
    });

    it("should accept exactly MAX_TAGS tags", () => {
      const result = createCurriculumSchema.safeParse({
        title: "Title",
        description: "Description",
        tags: Array(MAX_TAGS).fill("tag"),
      });
      expect(result.success).toBe(true);
    });

    it("should accept tag at MAX_TAG_LENGTH", () => {
      const result = createCurriculumSchema.safeParse({
        title: "Title",
        description: "Description",
        tags: ["x".repeat(MAX_TAG_LENGTH)],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Unicode and special characters", () => {
    it("should accept unicode in title", () => {
      const result = createCurriculumSchema.safeParse({
        title: "日本語のカリキュラム",
        description: "Description",
      });
      expect(result.success).toBe(true);
    });

    it("should accept unicode in description", () => {
      const result = createCurriculumSchema.safeParse({
        title: "Title",
        description: "العربية الوصف",
      });
      expect(result.success).toBe(true);
    });

    it("should accept emojis in tags", () => {
      const result = createCurriculumSchema.safeParse({
        title: "Title",
        description: "Description",
        tags: ["📚", "🎓"],
      });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Integration Tests", () => {
  it("should parse query and build where clause correctly", () => {
    const query = {
      visibility: "PRIVATE",
      page: "2",
      limit: "10",
    };
    const params = parseListCurriculumsQuery(query);
    const where = buildCurriculumsWhereClause("user-1", params);

    expect(params.visibility).toBe("PRIVATE");
    expect(where.visibility).toBe("PRIVATE");
    expect(where.userId).toBe("user-1");
  });

  it("should create and map curriculum response correctly", () => {
    // Simulate creating curriculum data and mapping to response
    const inputValidation = createCurriculumSchema.safeParse({
      title: "My Learning Path",
      description: "A comprehensive learning path",
      category: "Technology",
      tags: ["programming", "web"],
      difficulty: "Beginner",
      visibility: "PUBLIC",
    });

    expect(inputValidation.success).toBe(true);

    if (inputValidation.success) {
      // Simulate database return with explicit fields
      const dbCurriculum = {
        id: "curriculum-new",
        title: inputValidation.data.title,
        description: inputValidation.data.description,
        coverImage: inputValidation.data.coverImage ?? null,
        category: inputValidation.data.category ?? null,
        tags: inputValidation.data.tags ?? [],
        difficulty: inputValidation.data.difficulty ?? null,
        visibility: inputValidation.data.visibility,
        totalItems: 0,
        followersCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: "user-1",
          username: "creator",
          displayName: "Creator",
          avatarUrl: null,
        },
        followers: [],
      };

      const response = mapToCurriculumResponse(dbCurriculum, "user-1");
      expect(response.title).toBe("My Learning Path");
      expect(response.category).toBe("Technology");
      expect(response.isFollowing).toBe(false);
    }
  });
});
