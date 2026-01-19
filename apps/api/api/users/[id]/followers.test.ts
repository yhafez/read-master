/**
 * Tests for GET /api/users/:id/followers endpoint
 *
 * Tests cover:
 * - Type exports
 * - Helper function validation
 * - Query parameter parsing
 * - Search filtering
 * - Pagination calculations
 * - User info mapping
 * - Relationship status handling
 * - Edge cases
 */

import { describe, it, expect } from "vitest";

import {
  type FollowUserInfo,
  type FollowUserWithRelation,
  type FollowListQueryParams,
  type FollowListResponse,
  type FollowWithUser,
  parseFollowListParams,
  validateUserId,
  buildSearchFilter,
  mapFollowToUserInfo,
  sanitizeSearch,
} from "./followers.js";

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export FollowUserInfo type with correct shape", () => {
    const userInfo: FollowUserInfo = {
      id: "user-123",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
      bio: "A test user",
      followedAt: "2024-01-01T00:00:00.000Z",
    };

    expect(userInfo).toBeDefined();
    expect(userInfo.id).toBe("user-123");
    expect(userInfo.username).toBe("testuser");
    expect(userInfo.displayName).toBe("Test User");
    expect(userInfo.avatarUrl).toBe("https://example.com/avatar.jpg");
    expect(userInfo.bio).toBe("A test user");
    expect(userInfo.followedAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("should export FollowUserInfo type with null values", () => {
    const userInfo: FollowUserInfo = {
      id: "user-123",
      username: null,
      displayName: null,
      avatarUrl: null,
      bio: null,
      followedAt: "2024-01-01T00:00:00.000Z",
    };

    expect(userInfo.username).toBeNull();
    expect(userInfo.displayName).toBeNull();
    expect(userInfo.avatarUrl).toBeNull();
    expect(userInfo.bio).toBeNull();
  });

  it("should export FollowUserWithRelation type extending FollowUserInfo", () => {
    const userWithRelation: FollowUserWithRelation = {
      id: "user-123",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: null,
      bio: null,
      followedAt: "2024-01-01T00:00:00.000Z",
      isFollowing: true,
      isFollowedBy: false,
    };

    expect(userWithRelation.isFollowing).toBe(true);
    expect(userWithRelation.isFollowedBy).toBe(false);
  });

  it("should export FollowListQueryParams type", () => {
    const params: FollowListQueryParams = {
      page: 1,
      limit: 20,
      search: "test",
    };

    expect(params.page).toBe(1);
    expect(params.limit).toBe(20);
    expect(params.search).toBe("test");
  });

  it("should export FollowListQueryParams type without search", () => {
    const params: FollowListQueryParams = {
      page: 2,
      limit: 50,
    };

    expect(params.page).toBe(2);
    expect(params.limit).toBe(50);
    expect(params.search).toBeUndefined();
  });

  it("should export FollowListResponse type", () => {
    const response: FollowListResponse = {
      users: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        offset: 0,
        skip: 0,
        take: 20,
        hasNext: false,
        hasPrevious: false,
        firstPage: 0,
        lastPage: 0,
        startItem: 0,
        endItem: 0,
      },
      targetUserId: "user-123",
      targetUsername: "testuser",
    };

    expect(response.users).toEqual([]);
    expect(response.targetUserId).toBe("user-123");
    expect(response.targetUsername).toBe("testuser");
  });
});

// ============================================================================
// validateUserId Tests
// ============================================================================

describe("validateUserId", () => {
  it("should return true for valid string ID", () => {
    expect(validateUserId("user-123")).toBe(true);
  });

  it("should return true for UUID-like string", () => {
    expect(validateUserId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("should return true for CUID-like string", () => {
    expect(validateUserId("clz123abc")).toBe(true);
  });

  it("should return false for empty string", () => {
    expect(validateUserId("")).toBe(false);
  });

  it("should return false for whitespace-only string", () => {
    expect(validateUserId("   ")).toBe(false);
  });

  it("should return false for null", () => {
    expect(validateUserId(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(validateUserId(undefined)).toBe(false);
  });

  it("should return false for number", () => {
    expect(validateUserId(123)).toBe(false);
  });

  it("should return false for object", () => {
    expect(validateUserId({ id: "123" })).toBe(false);
  });

  it("should return false for array", () => {
    expect(validateUserId(["123"])).toBe(false);
  });
});

// ============================================================================
// parseFollowListParams Tests
// ============================================================================

describe("parseFollowListParams", () => {
  it("should return default values when no params provided", () => {
    const result = parseFollowListParams({});

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.search).toBeUndefined();
  });

  it("should parse page number from string", () => {
    const result = parseFollowListParams({ page: "3" });

    expect(result.page).toBe(3);
  });

  it("should parse limit from string", () => {
    const result = parseFollowListParams({ limit: "50" });

    expect(result.limit).toBe(50);
  });

  it("should parse search parameter", () => {
    const result = parseFollowListParams({ search: "john" });

    expect(result.search).toBe("john");
  });

  it("should handle array page parameter (take first)", () => {
    const result = parseFollowListParams({ page: ["2", "3"] });

    expect(result.page).toBe(2);
  });

  it("should handle array search parameter (take first)", () => {
    const result = parseFollowListParams({ search: ["john", "doe"] });

    expect(result.search).toBe("john");
  });

  it("should trim and lowercase search parameter", () => {
    const result = parseFollowListParams({ search: "  JOHN  " });

    expect(result.search).toBe("john");
  });

  it("should return undefined search for empty string", () => {
    const result = parseFollowListParams({ search: "" });

    expect(result.search).toBeUndefined();
  });

  it("should return undefined search for whitespace-only", () => {
    const result = parseFollowListParams({ search: "   " });

    expect(result.search).toBeUndefined();
  });

  it("should parse all parameters together", () => {
    const result = parseFollowListParams({
      page: "2",
      limit: "30",
      search: "test",
    });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(30);
    expect(result.search).toBe("test");
  });

  it("should clamp limit to max value", () => {
    const result = parseFollowListParams({ limit: "500" });

    expect(result.limit).toBe(100);
  });

  it("should clamp limit to min value", () => {
    const result = parseFollowListParams({ limit: "0" });

    expect(result.limit).toBe(1);
  });
});

// ============================================================================
// buildSearchFilter Tests
// ============================================================================

describe("buildSearchFilter", () => {
  it("should return undefined for undefined search", () => {
    const result = buildSearchFilter(undefined);

    expect(result).toBeUndefined();
  });

  it("should return undefined for empty search", () => {
    const result = buildSearchFilter("");

    expect(result).toBeUndefined();
  });

  it("should build OR filter for valid search", () => {
    const result = buildSearchFilter("john");

    expect(result).toBeDefined();
    expect(result?.OR).toHaveLength(2);
  });

  it("should include username filter", () => {
    const result = buildSearchFilter("john");

    expect(result?.OR[0]).toEqual({
      follower: {
        username: {
          contains: "john",
          mode: "insensitive",
        },
      },
    });
  });

  it("should include displayName filter", () => {
    const result = buildSearchFilter("john");

    expect(result?.OR[1]).toEqual({
      follower: {
        displayName: {
          contains: "john",
          mode: "insensitive",
        },
      },
    });
  });

  it("should use case-insensitive search", () => {
    const result = buildSearchFilter("JOHN");

    expect(result?.OR[0]).toEqual({
      follower: {
        username: {
          contains: "JOHN",
          mode: "insensitive",
        },
      },
    });
  });
});

// ============================================================================
// sanitizeSearch Tests
// ============================================================================

describe("sanitizeSearch", () => {
  it("should return undefined for undefined input", () => {
    expect(sanitizeSearch(undefined)).toBeUndefined();
  });

  it("should return undefined for empty string", () => {
    expect(sanitizeSearch("")).toBeUndefined();
  });

  it("should return undefined for whitespace-only string", () => {
    expect(sanitizeSearch("   ")).toBeUndefined();
  });

  it("should trim whitespace", () => {
    expect(sanitizeSearch("  test  ")).toBe("test");
  });

  it("should limit length to 100 characters", () => {
    const longString = "a".repeat(150);
    const result = sanitizeSearch(longString);

    expect(result).toBe("a".repeat(100));
  });

  it("should return sanitized string for valid input", () => {
    expect(sanitizeSearch("john")).toBe("john");
  });

  it("should handle special characters", () => {
    expect(sanitizeSearch("john.doe@example")).toBe("john.doe@example");
  });
});

// ============================================================================
// mapFollowToUserInfo Tests
// ============================================================================

describe("mapFollowToUserInfo", () => {
  const createMockFollow = (
    overrides?: Partial<FollowWithUser>
  ): FollowWithUser => ({
    id: "follow-123",
    followerId: "follower-123",
    followingId: "following-123",
    createdAt: new Date("2024-01-01T12:00:00.000Z"),
    follower: {
      id: "follower-123",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
      bio: "A test bio",
      deletedAt: null,
    },
    ...overrides,
  });

  it("should map basic user info correctly", () => {
    const follow = createMockFollow();
    const result = mapFollowToUserInfo(follow, new Set(), new Set());

    expect(result.id).toBe("follower-123");
    expect(result.username).toBe("testuser");
    expect(result.displayName).toBe("Test User");
    expect(result.avatarUrl).toBe("https://example.com/avatar.jpg");
    expect(result.bio).toBe("A test bio");
  });

  it("should format followedAt as ISO string", () => {
    const follow = createMockFollow();
    const result = mapFollowToUserInfo(follow, new Set(), new Set());

    expect(result.followedAt).toBe("2024-01-01T12:00:00.000Z");
  });

  it("should set isFollowing true when current user follows this user", () => {
    const follow = createMockFollow();
    const currentUserFollowing = new Set(["follower-123"]);

    const result = mapFollowToUserInfo(follow, currentUserFollowing, new Set());

    expect(result.isFollowing).toBe(true);
  });

  it("should set isFollowing false when current user does not follow this user", () => {
    const follow = createMockFollow();
    const result = mapFollowToUserInfo(follow, new Set(), new Set());

    expect(result.isFollowing).toBe(false);
  });

  it("should set isFollowedBy true when this user follows current user", () => {
    const follow = createMockFollow();
    const currentUserFollowers = new Set(["follower-123"]);

    const result = mapFollowToUserInfo(follow, new Set(), currentUserFollowers);

    expect(result.isFollowedBy).toBe(true);
  });

  it("should set isFollowedBy false when this user does not follow current user", () => {
    const follow = createMockFollow();
    const result = mapFollowToUserInfo(follow, new Set(), new Set());

    expect(result.isFollowedBy).toBe(false);
  });

  it("should handle mutual follow relationship", () => {
    const follow = createMockFollow();
    const currentUserFollowing = new Set(["follower-123"]);
    const currentUserFollowers = new Set(["follower-123"]);

    const result = mapFollowToUserInfo(
      follow,
      currentUserFollowing,
      currentUserFollowers
    );

    expect(result.isFollowing).toBe(true);
    expect(result.isFollowedBy).toBe(true);
  });

  it("should handle null user fields", () => {
    const follow = createMockFollow({
      follower: {
        id: "follower-123",
        username: null,
        displayName: null,
        avatarUrl: null,
        bio: null,
        deletedAt: null,
      },
    });

    const result = mapFollowToUserInfo(follow, new Set(), new Set());

    expect(result.username).toBeNull();
    expect(result.displayName).toBeNull();
    expect(result.avatarUrl).toBeNull();
    expect(result.bio).toBeNull();
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  it("should handle empty Sets for relationship lookup", () => {
    const follow: FollowWithUser = {
      id: "follow-123",
      followerId: "follower-123",
      followingId: "following-123",
      createdAt: new Date(),
      follower: {
        id: "follower-123",
        username: "user",
        displayName: null,
        avatarUrl: null,
        bio: null,
        deletedAt: null,
      },
    };

    const result = mapFollowToUserInfo(follow, new Set(), new Set());

    expect(result.isFollowing).toBe(false);
    expect(result.isFollowedBy).toBe(false);
  });

  it("should handle search with special regex characters", () => {
    const result = buildSearchFilter("john.*");

    expect(result).toBeDefined();
    expect(result?.OR[0]).toEqual({
      follower: {
        username: {
          contains: "john.*",
          mode: "insensitive",
        },
      },
    });
  });

  it("should handle unicode search", () => {
    const result = parseFollowListParams({ search: "用户名" });

    expect(result.search).toBe("用户名");
  });

  it("should handle emoji in search", () => {
    const result = parseFollowListParams({ search: "user🎉" });

    expect(result.search).toBe("user🎉");
  });

  it("should handle numeric strings as search", () => {
    const result = parseFollowListParams({ search: "123" });

    expect(result.search).toBe("123");
  });

  it("should handle very long search strings", () => {
    const longSearch = "a".repeat(200);
    const sanitized = sanitizeSearch(longSearch);

    expect(sanitized?.length).toBe(100);
  });

  it("should handle mixed case usernames in relationship sets", () => {
    const follow: FollowWithUser = {
      id: "follow-123",
      followerId: "User-123",
      followingId: "following-123",
      createdAt: new Date(),
      follower: {
        id: "User-123",
        username: "TestUser",
        displayName: null,
        avatarUrl: null,
        bio: null,
        deletedAt: null,
      },
    };

    // IDs are case-sensitive, so exact match is required
    const currentUserFollowing = new Set(["User-123"]);
    const result = mapFollowToUserInfo(follow, currentUserFollowing, new Set());

    expect(result.isFollowing).toBe(true);
  });
});

// ============================================================================
// Response Structure Tests
// ============================================================================

describe("Response Structure", () => {
  it("should have correct structure for FollowListResponse", () => {
    const response: FollowListResponse = {
      users: [
        {
          id: "user-1",
          username: "user1",
          displayName: "User 1",
          avatarUrl: null,
          bio: null,
          followedAt: "2024-01-01T00:00:00.000Z",
          isFollowing: false,
          isFollowedBy: true,
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5,
        offset: 0,
        skip: 0,
        take: 20,
        hasNext: true,
        hasPrevious: false,
        firstPage: 1,
        lastPage: 5,
        startItem: 1,
        endItem: 20,
      },
      targetUserId: "target-123",
      targetUsername: "targetuser",
    };

    expect(response.users).toHaveLength(1);
    expect(response.pagination.total).toBe(100);
    expect(response.pagination.hasNext).toBe(true);
    expect(response.targetUserId).toBe("target-123");
  });

  it("should handle empty users array in response", () => {
    const response: FollowListResponse = {
      users: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        offset: 0,
        skip: 0,
        take: 20,
        hasNext: false,
        hasPrevious: false,
        firstPage: 0,
        lastPage: 0,
        startItem: 0,
        endItem: 0,
      },
      targetUserId: "target-123",
      targetUsername: null,
    };

    expect(response.users).toHaveLength(0);
    expect(response.pagination.total).toBe(0);
    expect(response.targetUsername).toBeNull();
  });
});

// ============================================================================
// Integration-like Tests
// ============================================================================

describe("Integration Scenarios", () => {
  it("should handle complete followers listing workflow", () => {
    // Parse query params
    const params = parseFollowListParams({
      page: "1",
      limit: "10",
      search: "john",
    });

    expect(params.page).toBe(1);
    expect(params.limit).toBe(10);
    expect(params.search).toBe("john");

    // Build search filter
    const filter = buildSearchFilter(params.search);
    expect(filter).toBeDefined();

    // Map follow to user info
    const follow: FollowWithUser = {
      id: "follow-1",
      followerId: "user-1",
      followingId: "target-1",
      createdAt: new Date("2024-06-15T10:30:00Z"),
      follower: {
        id: "user-1",
        username: "johnsmith",
        displayName: "John Smith",
        avatarUrl: "https://example.com/john.jpg",
        bio: "Developer",
        deletedAt: null,
      },
    };

    const currentFollowing = new Set(["user-1"]);
    const currentFollowers = new Set<string>();

    const userInfo = mapFollowToUserInfo(
      follow,
      currentFollowing,
      currentFollowers
    );

    expect(userInfo.username).toBe("johnsmith");
    expect(userInfo.isFollowing).toBe(true);
    expect(userInfo.isFollowedBy).toBe(false);
    expect(userInfo.followedAt).toBe("2024-06-15T10:30:00.000Z");
  });

  it("should handle follower with no relationship to current user", () => {
    const follow: FollowWithUser = {
      id: "follow-1",
      followerId: "random-user",
      followingId: "target-1",
      createdAt: new Date(),
      follower: {
        id: "random-user",
        username: "randomuser",
        displayName: "Random User",
        avatarUrl: null,
        bio: null,
        deletedAt: null,
      },
    };

    const userInfo = mapFollowToUserInfo(follow, new Set(), new Set());

    expect(userInfo.isFollowing).toBe(false);
    expect(userInfo.isFollowedBy).toBe(false);
  });

  it("should handle pagination at boundary", () => {
    const params = parseFollowListParams({
      page: "100",
      limit: "100",
    });

    expect(params.page).toBe(100);
    expect(params.limit).toBe(100);
  });
});

// ============================================================================
// FollowWithUser Type Tests
// ============================================================================

describe("FollowWithUser Type", () => {
  it("should have correct structure", () => {
    const follow: FollowWithUser = {
      id: "follow-abc",
      followerId: "user-a",
      followingId: "user-b",
      createdAt: new Date("2024-03-15"),
      follower: {
        id: "user-a",
        username: "usera",
        displayName: "User A",
        avatarUrl: "https://example.com/a.jpg",
        bio: "Bio for A",
        deletedAt: null,
      },
    };

    expect(follow.id).toBe("follow-abc");
    expect(follow.followerId).toBe("user-a");
    expect(follow.followingId).toBe("user-b");
    expect(follow.follower.id).toBe("user-a");
    expect(follow.follower.username).toBe("usera");
  });

  it("should handle deleted user (deletedAt not null)", () => {
    const follow: FollowWithUser = {
      id: "follow-abc",
      followerId: "user-deleted",
      followingId: "user-b",
      createdAt: new Date(),
      follower: {
        id: "user-deleted",
        username: "deleteduser",
        displayName: null,
        avatarUrl: null,
        bio: null,
        deletedAt: new Date("2024-01-01"),
      },
    };

    expect(follow.follower.deletedAt).not.toBeNull();
  });
});
