/**
 * Tests for Reading Groups API - List and Create
 *
 * Tests cover:
 * - Type exports
 * - Query parameter parsing
 * - Cache key generation
 * - Where clause building
 * - Helper functions (formatDate, mapToGroupUserInfo, etc.)
 * - Tier permission checking
 * - Invite code generation
 * - Profanity filtering via schema
 * - Edge cases
 * - Integration scenarios
 */

import { describe, it, expect } from "vitest";
import {
  // Constants
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
  MAX_SEARCH_LENGTH,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  GROUPS_CACHE_TTL,
  DEFAULT_MAX_MEMBERS,
  // Types (test exports)
  type ListGroupsQueryParams,
  type GroupUserInfo,
  type GroupResponse,
  type CreateGroupInput,
  type GroupsPaginationInfo,
  type ListGroupsResponse,
  // Schemas
  listGroupsQuerySchema,
  createGroupSchema,
  // Helper functions
  parseListGroupsQuery,
  buildGroupsListCacheKey,
  buildGroupsWhereClause,
  formatDate,
  mapToGroupUserInfo,
  mapToGroupBookInfo,
  mapToGroupResponse,
  calculatePagination,
  generateInviteCode,
  sanitizeSearch,
  canCreateReadingGroup,
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

  it("should have correct MAX_SEARCH_LENGTH", () => {
    expect(MAX_SEARCH_LENGTH).toBe(100);
  });

  it("should have correct MAX_NAME_LENGTH", () => {
    expect(MAX_NAME_LENGTH).toBe(200);
  });

  it("should have correct MAX_DESCRIPTION_LENGTH", () => {
    expect(MAX_DESCRIPTION_LENGTH).toBe(2000);
  });

  it("should have correct DEFAULT_MAX_MEMBERS", () => {
    expect(DEFAULT_MAX_MEMBERS).toBe(50);
  });

  it("should have GROUPS_CACHE_TTL defined", () => {
    expect(GROUPS_CACHE_TTL).toBeDefined();
    expect(typeof GROUPS_CACHE_TTL).toBe("number");
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export ListGroupsQueryParams type", () => {
    const params: ListGroupsQueryParams = {
      search: "test",
      isPublic: true,
      page: 1,
      limit: 20,
    };
    expect(params.search).toBe("test");
    expect(params.isPublic).toBe(true);
  });

  it("should export GroupUserInfo type", () => {
    const user: GroupUserInfo = {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    expect(user.id).toBe("user-1");
    expect(user.username).toBe("testuser");
  });

  it("should export GroupResponse type", () => {
    const response: GroupResponse = {
      id: "group-1",
      name: "Test Group",
      description: "A test group",
      coverImage: null,
      isPublic: true,
      maxMembers: 50,
      membersCount: 10,
      discussionsCount: 5,
      owner: {
        id: "user-1",
        username: "owner",
        displayName: null,
        avatarUrl: null,
      },
      currentBook: null,
      isMember: true,
      memberRole: "MEMBER",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    expect(response.id).toBe("group-1");
    expect(response.isMember).toBe(true);
  });

  it("should export CreateGroupInput type", () => {
    const input: CreateGroupInput = {
      name: "New Group",
      description: "Description",
      isPublic: true,
    };
    expect(input.name).toBe("New Group");
  });

  it("should export GroupsPaginationInfo type", () => {
    const pagination: GroupsPaginationInfo = {
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasMore: true,
    };
    expect(pagination.hasMore).toBe(true);
  });

  it("should export ListGroupsResponse type", () => {
    const response: ListGroupsResponse = {
      groups: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
    expect(response.groups).toEqual([]);
  });
});

// ============================================================================
// listGroupsQuerySchema Tests
// ============================================================================

describe("listGroupsQuerySchema", () => {
  it("should parse valid query with all fields", () => {
    const result = listGroupsQuerySchema.safeParse({
      search: "book club",
      isPublic: "true",
      page: "2",
      limit: "30",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe("book club");
      expect(result.data.isPublic).toBe(true);
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(30);
    }
  });

  it("should use defaults for missing fields", () => {
    const result = listGroupsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBeNull();
      expect(result.data.isPublic).toBeNull();
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(DEFAULT_LIMIT);
    }
  });

  it("should parse isPublic=false correctly", () => {
    const result = listGroupsQuerySchema.safeParse({ isPublic: "false" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPublic).toBe(false);
    }
  });

  it("should transform empty search to null", () => {
    const result = listGroupsQuerySchema.safeParse({ search: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBeNull();
    }
  });

  it("should reject search exceeding max length", () => {
    const result = listGroupsQuerySchema.safeParse({
      search: "a".repeat(MAX_SEARCH_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should reject page less than 1", () => {
    const result = listGroupsQuerySchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  it("should reject limit exceeding max", () => {
    const result = listGroupsQuerySchema.safeParse({
      limit: String(MAX_LIMIT + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should reject limit below min", () => {
    const result = listGroupsQuerySchema.safeParse({ limit: "0" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// createGroupSchema Tests
// ============================================================================

describe("createGroupSchema", () => {
  it("should validate minimal valid input", () => {
    const result = createGroupSchema.safeParse({
      name: "My Book Club",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("My Book Club");
      expect(result.data.isPublic).toBe(true); // default
    }
  });

  it("should validate full valid input", () => {
    const result = createGroupSchema.safeParse({
      name: "Book Club",
      description: "A club for book lovers",
      coverImage: "https://example.com/cover.jpg",
      isPublic: false,
      maxMembers: 100,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxMembers).toBe(100);
      expect(result.data.isPublic).toBe(false);
    }
  });

  it("should reject empty name", () => {
    const result = createGroupSchema.safeParse({
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject name exceeding max length", () => {
    const result = createGroupSchema.safeParse({
      name: "a".repeat(MAX_NAME_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should reject description exceeding max length", () => {
    const result = createGroupSchema.safeParse({
      name: "Test",
      description: "a".repeat(MAX_DESCRIPTION_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should reject name with profanity", () => {
    const result = createGroupSchema.safeParse({
      name: "fuck club",
    });
    expect(result.success).toBe(false);
  });

  it("should reject description with profanity", () => {
    const result = createGroupSchema.safeParse({
      name: "Test Group",
      description: "This is shit",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid cover image URL", () => {
    const result = createGroupSchema.safeParse({
      name: "Test",
      coverImage: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("should reject maxMembers below minimum", () => {
    const result = createGroupSchema.safeParse({
      name: "Test",
      maxMembers: 1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject maxMembers above maximum", () => {
    const result = createGroupSchema.safeParse({
      name: "Test",
      maxMembers: 1001,
    });
    expect(result.success).toBe(false);
  });

  it("should allow null description", () => {
    const result = createGroupSchema.safeParse({
      name: "Test",
      description: null,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// parseListGroupsQuery Tests
// ============================================================================

describe("parseListGroupsQuery", () => {
  it("should parse valid query parameters", () => {
    const result = parseListGroupsQuery({
      search: "test",
      isPublic: "true",
      page: "2",
      limit: "30",
    });
    expect(result.search).toBe("test");
    expect(result.isPublic).toBe(true);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(30);
  });

  it("should return defaults for empty query", () => {
    const result = parseListGroupsQuery({});
    expect(result.search).toBeNull();
    expect(result.isPublic).toBeNull();
    expect(result.page).toBe(1);
    expect(result.limit).toBe(DEFAULT_LIMIT);
  });

  it("should return defaults for invalid query", () => {
    const result = parseListGroupsQuery({
      page: "invalid",
      limit: "invalid",
    });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(DEFAULT_LIMIT);
  });

  it("should handle array values", () => {
    const result = parseListGroupsQuery({
      search: ["test1", "test2"],
    });
    // Should use defaults when given invalid input
    expect(result).toBeDefined();
  });
});

// ============================================================================
// buildGroupsListCacheKey Tests
// ============================================================================

describe("buildGroupsListCacheKey", () => {
  it("should build basic cache key", () => {
    const key = buildGroupsListCacheKey("user-123", {
      search: null,
      isPublic: null,
      page: 1,
      limit: 20,
    });
    expect(key).toContain("user-123");
    expect(key).toContain("groups");
    expect(key).toContain("page-1");
    expect(key).toContain("limit-20");
  });

  it("should include search in cache key", () => {
    const key = buildGroupsListCacheKey("user-123", {
      search: "Book Club",
      isPublic: null,
      page: 1,
      limit: 20,
    });
    expect(key).toContain("search-book club");
  });

  it("should include isPublic in cache key", () => {
    const key = buildGroupsListCacheKey("user-123", {
      search: null,
      isPublic: true,
      page: 1,
      limit: 20,
    });
    expect(key).toContain("public-true");
  });

  it("should create different keys for different users", () => {
    const params: ListGroupsQueryParams = {
      search: null,
      isPublic: null,
      page: 1,
      limit: 20,
    };
    const key1 = buildGroupsListCacheKey("user-1", params);
    const key2 = buildGroupsListCacheKey("user-2", params);
    expect(key1).not.toBe(key2);
  });

  it("should create different keys for different pages", () => {
    const key1 = buildGroupsListCacheKey("user-1", {
      search: null,
      isPublic: null,
      page: 1,
      limit: 20,
    });
    const key2 = buildGroupsListCacheKey("user-1", {
      search: null,
      isPublic: null,
      page: 2,
      limit: 20,
    });
    expect(key1).not.toBe(key2);
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

  it("should handle midnight UTC", () => {
    const date = new Date("2024-06-01T00:00:00.000Z");
    const result = formatDate(date);
    expect(result).toBe("2024-06-01T00:00:00.000Z");
  });

  it("should handle end of day", () => {
    const date = new Date("2024-12-31T23:59:59.999Z");
    const result = formatDate(date);
    expect(result).toBe("2024-12-31T23:59:59.999Z");
  });
});

// ============================================================================
// mapToGroupUserInfo Tests
// ============================================================================

describe("mapToGroupUserInfo", () => {
  it("should map user data correctly", () => {
    const result = mapToGroupUserInfo({
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

  it("should handle null username", () => {
    const result = mapToGroupUserInfo({
      id: "user-1",
      username: null,
      displayName: null,
      avatarUrl: null,
    });
    expect(result.username).toBe("anonymous");
  });

  it("should preserve null displayName and avatarUrl", () => {
    const result = mapToGroupUserInfo({
      id: "user-1",
      username: "test",
      displayName: null,
      avatarUrl: null,
    });
    expect(result.displayName).toBeNull();
    expect(result.avatarUrl).toBeNull();
  });
});

// ============================================================================
// mapToGroupBookInfo Tests
// ============================================================================

describe("mapToGroupBookInfo", () => {
  it("should map book data correctly", () => {
    const result = mapToGroupBookInfo({
      id: "book-1",
      title: "Test Book",
      author: "Test Author",
      coverImage: "https://example.com/cover.jpg",
    });
    expect(result).toEqual({
      id: "book-1",
      title: "Test Book",
      author: "Test Author",
      coverImage: "https://example.com/cover.jpg",
    });
  });

  it("should return null for null book", () => {
    const result = mapToGroupBookInfo(null);
    expect(result).toBeNull();
  });

  it("should handle null author and coverImage", () => {
    const result = mapToGroupBookInfo({
      id: "book-1",
      title: "Test",
      author: null,
      coverImage: null,
    });
    expect(result?.author).toBeNull();
    expect(result?.coverImage).toBeNull();
  });
});

// ============================================================================
// mapToGroupResponse Tests
// ============================================================================

describe("mapToGroupResponse", () => {
  const baseGroup = {
    id: "group-1",
    name: "Test Group",
    description: "A test group",
    coverImage: null,
    isPublic: true,
    maxMembers: 50,
    membersCount: 10,
    discussionsCount: 5,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-15T00:00:00.000Z"),
    user: {
      id: "owner-1",
      username: "owner",
      displayName: "Group Owner",
      avatarUrl: null,
    },
    currentBook: null,
    members: [],
  };

  it("should map group data correctly", () => {
    const result = mapToGroupResponse(baseGroup, "user-1");
    expect(result.id).toBe("group-1");
    expect(result.name).toBe("Test Group");
    expect(result.membersCount).toBe(10);
    expect(result.owner.username).toBe("owner");
    expect(result.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("should detect member status correctly", () => {
    const groupWithMember = {
      ...baseGroup,
      members: [{ role: "MEMBER", userId: "user-1" }],
    };
    const result = mapToGroupResponse(groupWithMember, "user-1");
    expect(result.isMember).toBe(true);
    expect(result.memberRole).toBe("MEMBER");
  });

  it("should handle non-member correctly", () => {
    const result = mapToGroupResponse(baseGroup, "other-user");
    expect(result.isMember).toBe(false);
    expect(result.memberRole).toBeNull();
  });

  it("should include current book when present", () => {
    const groupWithBook = {
      ...baseGroup,
      currentBook: {
        id: "book-1",
        title: "Current Read",
        author: "Author",
        coverImage: null,
      },
    };
    const result = mapToGroupResponse(groupWithBook, "user-1");
    expect(result.currentBook).not.toBeNull();
    expect(result.currentBook?.title).toBe("Current Read");
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
    expect(result.hasMore).toBe(false);
  });

  it("should handle empty results", () => {
    const result = calculatePagination(0, 1, 20);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it("should handle partial last page", () => {
    const result = calculatePagination(45, 1, 20);
    expect(result.totalPages).toBe(3); // ceil(45/20) = 3
    expect(result.hasMore).toBe(true);
  });

  it("should handle single page", () => {
    const result = calculatePagination(10, 1, 20);
    expect(result.totalPages).toBe(1);
    expect(result.hasMore).toBe(false);
  });
});

// ============================================================================
// generateInviteCode Tests
// ============================================================================

describe("generateInviteCode", () => {
  it("should generate 8-character code", () => {
    const code = generateInviteCode();
    expect(code.length).toBe(8);
  });

  it("should only contain uppercase letters and numbers", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it("should generate different codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateInviteCode());
    }
    // Should generate at least 95 unique codes out of 100
    expect(codes.size).toBeGreaterThan(95);
  });
});

// ============================================================================
// sanitizeSearch Tests
// ============================================================================

describe("sanitizeSearch", () => {
  it("should return null for null input", () => {
    expect(sanitizeSearch(null)).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(sanitizeSearch("")).toBeNull();
  });

  it("should trim whitespace", () => {
    expect(sanitizeSearch("  test  ")).toBe("test");
  });

  it("should truncate to max length", () => {
    const longSearch = "a".repeat(MAX_SEARCH_LENGTH + 50);
    const result = sanitizeSearch(longSearch);
    expect(result?.length).toBe(MAX_SEARCH_LENGTH);
  });

  it("should preserve valid search", () => {
    expect(sanitizeSearch("book club")).toBe("book club");
  });
});

// ============================================================================
// canCreateReadingGroup Tests
// ============================================================================

describe("canCreateReadingGroup", () => {
  it("should return false for FREE tier", () => {
    expect(canCreateReadingGroup("FREE")).toBe(false);
  });

  it("should return true for PRO tier", () => {
    expect(canCreateReadingGroup("PRO")).toBe(true);
  });

  it("should return true for SCHOLAR tier", () => {
    expect(canCreateReadingGroup("SCHOLAR")).toBe(true);
  });
});

// ============================================================================
// buildGroupsWhereClause Tests
// ============================================================================

describe("buildGroupsWhereClause", () => {
  it("should include deletedAt null", () => {
    const where = buildGroupsWhereClause("user-1", {
      search: null,
      isPublic: null,
      page: 1,
      limit: 20,
    });
    expect(where.deletedAt).toBeNull();
  });

  it("should include OR clause for mixed visibility", () => {
    const where = buildGroupsWhereClause("user-1", {
      search: null,
      isPublic: null,
      page: 1,
      limit: 20,
    });
    expect(where.OR).toBeDefined();
    expect(Array.isArray(where.OR)).toBe(true);
  });

  it("should filter for public only when isPublic=true", () => {
    const where = buildGroupsWhereClause("user-1", {
      search: null,
      isPublic: true,
      page: 1,
      limit: 20,
    });
    expect(where.isPublic).toBe(true);
    expect(where.OR).toBeUndefined();
  });

  it("should add AND clause for private groups filter", () => {
    const where = buildGroupsWhereClause("user-1", {
      search: null,
      isPublic: false,
      page: 1,
      limit: 20,
    });
    expect(where.AND).toBeDefined();
    expect(where.OR).toBeUndefined();
  });

  it("should add search condition", () => {
    const where = buildGroupsWhereClause("user-1", {
      search: "book",
      isPublic: null,
      page: 1,
      limit: 20,
    });
    expect(where.AND).toBeDefined();
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  it("should handle unicode in group name validation", () => {
    const result = createGroupSchema.safeParse({
      name: "日本語クラブ",
    });
    expect(result.success).toBe(true);
  });

  it("should handle emoji in group name validation", () => {
    const result = createGroupSchema.safeParse({
      name: "Book Club 📚",
    });
    expect(result.success).toBe(true);
  });

  it("should handle mixed case search in cache key", () => {
    const key = buildGroupsListCacheKey("user-1", {
      search: "BOOK Club",
      isPublic: null,
      page: 1,
      limit: 20,
    });
    expect(key).toContain("search-book club");
  });

  it("should handle whitespace-only search", () => {
    const result = sanitizeSearch("   ");
    expect(result).toBe("");
  });

  it("should handle special characters in search", () => {
    const result = sanitizeSearch("book & club");
    expect(result).toBe("book & club");
  });
});

// ============================================================================
// Integration Scenarios Tests
// ============================================================================

describe("Integration Scenarios", () => {
  it("should validate complete group creation workflow", () => {
    // 1. Check tier permission
    expect(canCreateReadingGroup("PRO")).toBe(true);

    // 2. Validate input
    const input = createGroupSchema.safeParse({
      name: "My Book Club",
      description: "A club for readers",
      isPublic: false,
      maxMembers: 25,
    });
    expect(input.success).toBe(true);

    // 3. Generate invite code for private group
    const inviteCode = generateInviteCode();
    expect(inviteCode.length).toBe(8);
  });

  it("should validate complete group listing workflow", () => {
    // 1. Parse query params
    const params = parseListGroupsQuery({
      search: "book",
      isPublic: "true",
      page: "1",
      limit: "10",
    });
    expect(params.search).toBe("book");

    // 2. Build cache key
    const cacheKey = buildGroupsListCacheKey("user-1", params);
    expect(cacheKey).toContain("search-book");

    // 3. Build where clause
    const where = buildGroupsWhereClause("user-1", params);
    expect(where.isPublic).toBe(true);

    // 4. Calculate pagination
    const pagination = calculatePagination(50, params.page, params.limit);
    expect(pagination.totalPages).toBe(5);
  });

  it("should handle group response mapping with all data", () => {
    const group = {
      id: "group-1",
      name: "Complete Group",
      description: "Full description",
      coverImage: "https://example.com/cover.jpg",
      isPublic: true,
      maxMembers: 100,
      membersCount: 25,
      discussionsCount: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: "owner-1",
        username: "owner",
        displayName: "Owner Name",
        avatarUrl: "https://example.com/avatar.jpg",
      },
      currentBook: {
        id: "book-1",
        title: "Current Book",
        author: "Author Name",
        coverImage: "https://example.com/book.jpg",
      },
      members: [{ role: "ADMIN", userId: "user-1" }],
    };

    const response = mapToGroupResponse(group, "user-1");
    expect(response.isMember).toBe(true);
    expect(response.memberRole).toBe("ADMIN");
    expect(response.currentBook?.title).toBe("Current Book");
    expect(response.owner.displayName).toBe("Owner Name");
  });
});

// ============================================================================
// Profanity Filter Tests
// ============================================================================

describe("Profanity Filter via Schema", () => {
  it("should reject name with strong profanity", () => {
    const result = createGroupSchema.safeParse({
      name: "What the fuck",
    });
    expect(result.success).toBe(false);
  });

  it("should reject description with strong profanity", () => {
    const result = createGroupSchema.safeParse({
      name: "Clean Name",
      description: "This is bullshit",
    });
    expect(result.success).toBe(false);
  });

  it("should allow clean content", () => {
    const result = createGroupSchema.safeParse({
      name: "Clean Book Club",
      description: "A wonderful place for book lovers",
    });
    expect(result.success).toBe(true);
  });

  it("should reject slurs in name", () => {
    const result = createGroupSchema.safeParse({
      name: "test faggot",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Response Structure Tests
// ============================================================================

describe("Response Structure", () => {
  it("should have all required fields in GroupResponse", () => {
    const group = {
      id: "group-1",
      name: "Test",
      description: null,
      coverImage: null,
      isPublic: true,
      maxMembers: 50,
      membersCount: 1,
      discussionsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: "user-1",
        username: "test",
        displayName: null,
        avatarUrl: null,
      },
      currentBook: null,
      members: [],
    };

    const response = mapToGroupResponse(group, "user-1");

    // Check all required fields exist
    expect(response).toHaveProperty("id");
    expect(response).toHaveProperty("name");
    expect(response).toHaveProperty("description");
    expect(response).toHaveProperty("coverImage");
    expect(response).toHaveProperty("isPublic");
    expect(response).toHaveProperty("maxMembers");
    expect(response).toHaveProperty("membersCount");
    expect(response).toHaveProperty("discussionsCount");
    expect(response).toHaveProperty("owner");
    expect(response).toHaveProperty("currentBook");
    expect(response).toHaveProperty("isMember");
    expect(response).toHaveProperty("memberRole");
    expect(response).toHaveProperty("createdAt");
    expect(response).toHaveProperty("updatedAt");
  });

  it("should have valid date formats", () => {
    const group = {
      id: "group-1",
      name: "Test",
      description: null,
      coverImage: null,
      isPublic: true,
      maxMembers: 50,
      membersCount: 1,
      discussionsCount: 0,
      createdAt: new Date("2024-01-15T10:00:00.000Z"),
      updatedAt: new Date("2024-01-20T15:30:00.000Z"),
      user: {
        id: "user-1",
        username: "test",
        displayName: null,
        avatarUrl: null,
      },
      currentBook: null,
      members: [],
    };

    const response = mapToGroupResponse(group, "user-1");

    // Dates should be ISO strings
    expect(response.createdAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
    expect(response.updatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
  });
});
