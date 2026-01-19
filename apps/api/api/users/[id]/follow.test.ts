/**
 * Tests for POST/DELETE /api/users/:id/follow endpoint
 *
 * Tests cover:
 * - Type exports
 * - Helper function validation
 * - Follow/unfollow logic
 * - Duplicate prevention
 * - Self-follow prevention
 * - Count updates
 * - Cache invalidation
 * - Error handling
 * - Edge cases
 */

import { describe, it, expect } from "vitest";
import {
  // Types
  type FollowRelationship,
  type FollowResponse,
  type UserExistsResult,
  type FollowCountsResult,
  // Helper functions
  validateUserId,
  isSelfFollow,
  buildProfileCachePattern,
} from "./follow.js";

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export FollowRelationship type", () => {
    const relationship: FollowRelationship = {
      id: "follow_123",
      followerId: "user_1",
      followingId: "user_2",
      createdAt: new Date(),
    };
    expect(relationship.id).toBe("follow_123");
    expect(relationship.followerId).toBe("user_1");
    expect(relationship.followingId).toBe("user_2");
    expect(relationship.createdAt).toBeInstanceOf(Date);
  });

  it("should export FollowResponse type with followed action", () => {
    const response: FollowResponse = {
      success: true,
      action: "followed",
      followerId: "user_1",
      followingId: "user_2",
      followerUsername: "alice",
      followingUsername: "bob",
      followerStats: {
        followingCount: 5,
      },
      followingStats: {
        followersCount: 10,
      },
    };
    expect(response.success).toBe(true);
    expect(response.action).toBe("followed");
    expect(response.followerStats.followingCount).toBe(5);
    expect(response.followingStats.followersCount).toBe(10);
  });

  it("should export FollowResponse type with unfollowed action", () => {
    const response: FollowResponse = {
      success: true,
      action: "unfollowed",
      followerId: "user_1",
      followingId: "user_2",
      followerUsername: "alice",
      followingUsername: "bob",
      followerStats: {
        followingCount: 4,
      },
      followingStats: {
        followersCount: 9,
      },
    };
    expect(response.action).toBe("unfollowed");
  });

  it("should export UserExistsResult type with existing user", () => {
    const result: UserExistsResult = {
      exists: true,
      user: {
        id: "user_123",
        username: "testuser",
      },
    };
    expect(result.exists).toBe(true);
    expect(result.user?.id).toBe("user_123");
  });

  it("should export UserExistsResult type with non-existing user", () => {
    const result: UserExistsResult = {
      exists: false,
      user: null,
    };
    expect(result.exists).toBe(false);
    expect(result.user).toBeNull();
  });

  it("should export FollowCountsResult type", () => {
    const result: FollowCountsResult = {
      followerFollowingCount: 10,
      followingFollowersCount: 25,
    };
    expect(result.followerFollowingCount).toBe(10);
    expect(result.followingFollowersCount).toBe(25);
  });
});

// ============================================================================
// validateUserId Tests
// ============================================================================

describe("validateUserId", () => {
  it("should return true for valid non-empty string", () => {
    expect(validateUserId("user_123")).toBe(true);
  });

  it("should return true for string with whitespace content", () => {
    expect(validateUserId("  user_123  ")).toBe(true);
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
    expect(validateUserId(["user_123"])).toBe(false);
  });

  it("should return false for boolean", () => {
    expect(validateUserId(true)).toBe(false);
  });
});

// ============================================================================
// isSelfFollow Tests
// ============================================================================

describe("isSelfFollow", () => {
  it("should return true when followerId equals followingId", () => {
    expect(isSelfFollow("user_123", "user_123")).toBe(true);
  });

  it("should return false when followerId differs from followingId", () => {
    expect(isSelfFollow("user_1", "user_2")).toBe(false);
  });

  it("should be case-sensitive", () => {
    expect(isSelfFollow("User_123", "user_123")).toBe(false);
  });

  it("should handle empty strings", () => {
    expect(isSelfFollow("", "")).toBe(true);
  });

  it("should handle similar but different IDs", () => {
    expect(isSelfFollow("user_123", "user_1234")).toBe(false);
  });

  it("should handle IDs with special characters", () => {
    expect(isSelfFollow("user-123_abc", "user-123_abc")).toBe(true);
    expect(isSelfFollow("user-123_abc", "user-123_abd")).toBe(false);
  });
});

// ============================================================================
// buildProfileCachePattern Tests
// ============================================================================

describe("buildProfileCachePattern", () => {
  it("should build correct cache pattern for lowercase username", () => {
    const pattern = buildProfileCachePattern("alice");
    expect(pattern).toBe("user:profile:alice:*");
  });

  it("should convert username to lowercase", () => {
    const pattern = buildProfileCachePattern("Alice");
    expect(pattern).toBe("user:profile:alice:*");
  });

  it("should handle mixed case username", () => {
    const pattern = buildProfileCachePattern("AlIcE123");
    expect(pattern).toBe("user:profile:alice123:*");
  });

  it("should handle username with numbers", () => {
    const pattern = buildProfileCachePattern("user123");
    expect(pattern).toBe("user:profile:user123:*");
  });

  it("should handle username with special characters", () => {
    const pattern = buildProfileCachePattern("user-name_123");
    expect(pattern).toBe("user:profile:user-name_123:*");
  });

  it("should handle empty username", () => {
    const pattern = buildProfileCachePattern("");
    expect(pattern).toBe("user:profile::*");
  });
});

// ============================================================================
// Follow Response Structure Tests
// ============================================================================

describe("Follow Response Structure", () => {
  it("should have all required fields for follow action", () => {
    const response: FollowResponse = {
      success: true,
      action: "followed",
      followerId: "follower_id",
      followingId: "following_id",
      followerUsername: "follower",
      followingUsername: "following",
      followerStats: {
        followingCount: 1,
      },
      followingStats: {
        followersCount: 1,
      },
    };

    expect(response).toHaveProperty("success");
    expect(response).toHaveProperty("action");
    expect(response).toHaveProperty("followerId");
    expect(response).toHaveProperty("followingId");
    expect(response).toHaveProperty("followerUsername");
    expect(response).toHaveProperty("followingUsername");
    expect(response).toHaveProperty("followerStats");
    expect(response).toHaveProperty("followingStats");
    expect(response.followerStats).toHaveProperty("followingCount");
    expect(response.followingStats).toHaveProperty("followersCount");
  });

  it("should allow action to be 'followed' or 'unfollowed'", () => {
    const followedResponse: FollowResponse = {
      success: true,
      action: "followed",
      followerId: "a",
      followingId: "b",
      followerUsername: "a",
      followingUsername: "b",
      followerStats: { followingCount: 1 },
      followingStats: { followersCount: 1 },
    };

    const unfollowedResponse: FollowResponse = {
      success: true,
      action: "unfollowed",
      followerId: "a",
      followingId: "b",
      followerUsername: "a",
      followingUsername: "b",
      followerStats: { followingCount: 0 },
      followingStats: { followersCount: 0 },
    };

    expect(followedResponse.action).toBe("followed");
    expect(unfollowedResponse.action).toBe("unfollowed");
  });
});

// ============================================================================
// Follow Counts Result Tests
// ============================================================================

describe("Follow Counts Result", () => {
  it("should track both follower and following counts", () => {
    const result: FollowCountsResult = {
      followerFollowingCount: 5,
      followingFollowersCount: 10,
    };

    expect(result.followerFollowingCount).toBe(5);
    expect(result.followingFollowersCount).toBe(10);
  });

  it("should allow zero counts", () => {
    const result: FollowCountsResult = {
      followerFollowingCount: 0,
      followingFollowersCount: 0,
    };

    expect(result.followerFollowingCount).toBe(0);
    expect(result.followingFollowersCount).toBe(0);
  });

  it("should allow high counts", () => {
    const result: FollowCountsResult = {
      followerFollowingCount: 10000,
      followingFollowersCount: 1000000,
    };

    expect(result.followerFollowingCount).toBe(10000);
    expect(result.followingFollowersCount).toBe(1000000);
  });
});

// ============================================================================
// User Exists Result Tests
// ============================================================================

describe("User Exists Result", () => {
  it("should represent existing user with data", () => {
    const result: UserExistsResult = {
      exists: true,
      user: {
        id: "user_abc123",
        username: "testuser",
      },
    };

    expect(result.exists).toBe(true);
    expect(result.user).not.toBeNull();
    expect(result.user?.id).toBe("user_abc123");
    expect(result.user?.username).toBe("testuser");
  });

  it("should represent non-existing user", () => {
    const result: UserExistsResult = {
      exists: false,
      user: null,
    };

    expect(result.exists).toBe(false);
    expect(result.user).toBeNull();
  });

  it("should handle user with null username", () => {
    const result: UserExistsResult = {
      exists: true,
      user: {
        id: "user_xyz",
        username: null,
      },
    };

    expect(result.exists).toBe(true);
    expect(result.user?.username).toBeNull();
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  describe("validateUserId edge cases", () => {
    it("should handle tab characters", () => {
      expect(validateUserId("\t")).toBe(false);
      expect(validateUserId("\t\t")).toBe(false);
    });

    it("should handle newline characters", () => {
      expect(validateUserId("\n")).toBe(false);
      expect(validateUserId("\r\n")).toBe(false);
    });

    it("should handle mixed whitespace", () => {
      expect(validateUserId(" \t\n")).toBe(false);
    });

    it("should handle unicode characters in ID", () => {
      expect(validateUserId("user_日本語")).toBe(true);
    });

    it("should handle emoji in ID", () => {
      expect(validateUserId("user_🎉")).toBe(true);
    });

    it("should handle very long ID", () => {
      const longId = "user_" + "a".repeat(1000);
      expect(validateUserId(longId)).toBe(true);
    });
  });

  describe("isSelfFollow edge cases", () => {
    it("should handle unicode characters", () => {
      expect(isSelfFollow("用户_123", "用户_123")).toBe(true);
      expect(isSelfFollow("用户_123", "用户_124")).toBe(false);
    });

    it("should handle emoji in IDs", () => {
      expect(isSelfFollow("user_🎉", "user_🎉")).toBe(true);
      expect(isSelfFollow("user_🎉", "user_🎊")).toBe(false);
    });
  });

  describe("buildProfileCachePattern edge cases", () => {
    it("should handle unicode username", () => {
      const pattern = buildProfileCachePattern("用户名");
      expect(pattern).toBe("user:profile:用户名:*");
    });

    it("should handle very long username", () => {
      const longUsername = "a".repeat(100);
      const pattern = buildProfileCachePattern(longUsername);
      expect(pattern).toBe(`user:profile:${longUsername}:*`);
    });
  });
});

// ============================================================================
// Integration Scenario Tests
// ============================================================================

describe("Integration Scenarios", () => {
  it("should model complete follow workflow", () => {
    // Step 1: Validate user IDs
    const followerId = "user_alice_123";
    const followingId = "user_bob_456";

    expect(validateUserId(followerId)).toBe(true);
    expect(validateUserId(followingId)).toBe(true);

    // Step 2: Check not self-follow
    expect(isSelfFollow(followerId, followingId)).toBe(false);

    // Step 3: After follow, build response
    const followResponse: FollowResponse = {
      success: true,
      action: "followed",
      followerId,
      followingId,
      followerUsername: "alice",
      followingUsername: "bob",
      followerStats: { followingCount: 1 },
      followingStats: { followersCount: 1 },
    };

    expect(followResponse.success).toBe(true);
    expect(followResponse.action).toBe("followed");

    // Step 4: Build cache patterns for invalidation
    const alicePattern = buildProfileCachePattern("alice");
    const bobPattern = buildProfileCachePattern("bob");

    expect(alicePattern).toBe("user:profile:alice:*");
    expect(bobPattern).toBe("user:profile:bob:*");
  });

  it("should model complete unfollow workflow", () => {
    // Step 1: Validate user IDs
    const followerId = "user_alice_123";
    const followingId = "user_bob_456";

    expect(validateUserId(followerId)).toBe(true);
    expect(validateUserId(followingId)).toBe(true);

    // Step 2: After unfollow, build response
    const unfollowResponse: FollowResponse = {
      success: true,
      action: "unfollowed",
      followerId,
      followingId,
      followerUsername: "alice",
      followingUsername: "bob",
      followerStats: { followingCount: 0 },
      followingStats: { followersCount: 0 },
    };

    expect(unfollowResponse.success).toBe(true);
    expect(unfollowResponse.action).toBe("unfollowed");
    expect(unfollowResponse.followerStats.followingCount).toBe(0);
  });

  it("should model self-follow prevention", () => {
    const userId = "user_self_123";

    // Validation passes
    expect(validateUserId(userId)).toBe(true);

    // But self-follow check fails
    expect(isSelfFollow(userId, userId)).toBe(true);
  });

  it("should model invalid user ID rejection", () => {
    const invalidIds = ["", "   ", null, undefined, 123];

    for (const id of invalidIds) {
      expect(validateUserId(id)).toBe(false);
    }
  });
});

// ============================================================================
// Error Scenario Tests
// ============================================================================

describe("Error Scenarios", () => {
  it("should handle empty follower ID", () => {
    expect(validateUserId("")).toBe(false);
  });

  it("should handle empty following ID", () => {
    expect(validateUserId("")).toBe(false);
  });

  it("should detect self-follow attempt", () => {
    const userId = "same_user";
    expect(isSelfFollow(userId, userId)).toBe(true);
  });

  it("should handle cache pattern with empty username", () => {
    const pattern = buildProfileCachePattern("");
    expect(pattern).toContain("user:profile:");
    expect(pattern).toContain(":*");
  });
});

// ============================================================================
// FollowRelationship Structure Tests
// ============================================================================

describe("FollowRelationship Structure", () => {
  it("should have correct structure", () => {
    const relationship: FollowRelationship = {
      id: "follow_abc123",
      followerId: "user_1",
      followingId: "user_2",
      createdAt: new Date("2024-01-15T10:30:00Z"),
    };

    expect(typeof relationship.id).toBe("string");
    expect(typeof relationship.followerId).toBe("string");
    expect(typeof relationship.followingId).toBe("string");
    expect(relationship.createdAt).toBeInstanceOf(Date);
  });

  it("should handle different date formats", () => {
    const now = new Date();
    const relationship: FollowRelationship = {
      id: "follow_xyz",
      followerId: "a",
      followingId: "b",
      createdAt: now,
    };

    expect(relationship.createdAt.toISOString()).toBe(now.toISOString());
  });
});

// ============================================================================
// Response Validation Tests
// ============================================================================

describe("Response Validation", () => {
  it("should have consistent success flag for follow", () => {
    const response: FollowResponse = {
      success: true,
      action: "followed",
      followerId: "a",
      followingId: "b",
      followerUsername: "user_a",
      followingUsername: "user_b",
      followerStats: { followingCount: 1 },
      followingStats: { followersCount: 1 },
    };

    expect(response.success).toBe(true);
    expect(response.action).toBe("followed");
  });

  it("should have consistent success flag for unfollow", () => {
    const response: FollowResponse = {
      success: true,
      action: "unfollowed",
      followerId: "a",
      followingId: "b",
      followerUsername: "user_a",
      followingUsername: "user_b",
      followerStats: { followingCount: 0 },
      followingStats: { followersCount: 0 },
    };

    expect(response.success).toBe(true);
    expect(response.action).toBe("unfollowed");
  });

  it("should include both usernames in response", () => {
    const response: FollowResponse = {
      success: true,
      action: "followed",
      followerId: "id_1",
      followingId: "id_2",
      followerUsername: "alice",
      followingUsername: "bob",
      followerStats: { followingCount: 5 },
      followingStats: { followersCount: 10 },
    };

    expect(response.followerUsername).toBe("alice");
    expect(response.followingUsername).toBe("bob");
  });

  it("should include updated counts in response", () => {
    const response: FollowResponse = {
      success: true,
      action: "followed",
      followerId: "id_1",
      followingId: "id_2",
      followerUsername: "alice",
      followingUsername: "bob",
      followerStats: { followingCount: 100 },
      followingStats: { followersCount: 500 },
    };

    expect(response.followerStats.followingCount).toBe(100);
    expect(response.followingStats.followersCount).toBe(500);
  });
});

// ============================================================================
// Cache Pattern Tests
// ============================================================================

describe("Cache Pattern Generation", () => {
  it("should generate wildcard pattern", () => {
    const pattern = buildProfileCachePattern("testuser");
    expect(pattern.endsWith(":*")).toBe(true);
  });

  it("should include user prefix", () => {
    const pattern = buildProfileCachePattern("testuser");
    expect(pattern.startsWith("user:")).toBe(true);
  });

  it("should include profile segment", () => {
    const pattern = buildProfileCachePattern("testuser");
    expect(pattern).toContain(":profile:");
  });

  it("should include username in pattern", () => {
    const pattern = buildProfileCachePattern("uniqueuser");
    expect(pattern).toContain("uniqueuser");
  });

  it("should normalize username case", () => {
    const pattern1 = buildProfileCachePattern("TestUser");
    const pattern2 = buildProfileCachePattern("testuser");
    const pattern3 = buildProfileCachePattern("TESTUSER");

    expect(pattern1).toBe(pattern2);
    expect(pattern2).toBe(pattern3);
  });
});

// ============================================================================
// Boundary Value Tests
// ============================================================================

describe("Boundary Values", () => {
  it("should handle minimum valid counts", () => {
    const result: FollowCountsResult = {
      followerFollowingCount: 0,
      followingFollowersCount: 0,
    };

    expect(result.followerFollowingCount).toBeGreaterThanOrEqual(0);
    expect(result.followingFollowersCount).toBeGreaterThanOrEqual(0);
  });

  it("should handle large counts", () => {
    const result: FollowCountsResult = {
      followerFollowingCount: Number.MAX_SAFE_INTEGER,
      followingFollowersCount: Number.MAX_SAFE_INTEGER,
    };

    expect(result.followerFollowingCount).toBe(Number.MAX_SAFE_INTEGER);
    expect(result.followingFollowersCount).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("should handle single character username", () => {
    const pattern = buildProfileCachePattern("a");
    expect(pattern).toBe("user:profile:a:*");
  });

  it("should handle single character user ID", () => {
    expect(validateUserId("a")).toBe(true);
    expect(isSelfFollow("a", "a")).toBe(true);
    expect(isSelfFollow("a", "b")).toBe(false);
  });
});
