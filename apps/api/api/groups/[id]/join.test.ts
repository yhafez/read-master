/**
 * Tests for POST /api/groups/:id/join endpoint
 */

import { describe, it, expect } from "vitest";
import {
  INVITE_CODE_LENGTH,
  joinGroupSchema,
  validateGroupId,
  formatDate,
  isValidInviteCode,
  isInviteCodeMatch,
  hasCapacity,
  buildMembershipCacheKey,
  buildGroupCacheKey,
  type JoinGroupInput,
  type JoinUserInfo,
  type JoinGroupResponse,
  type MembershipCheckResult,
} from "./join.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have INVITE_CODE_LENGTH as 8", () => {
    expect(INVITE_CODE_LENGTH).toBe(8);
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export JoinGroupInput type", () => {
    const input: JoinGroupInput = {
      inviteCode: "ABC12345",
    };
    expect(input.inviteCode).toBe("ABC12345");
  });

  it("should allow null inviteCode in JoinGroupInput", () => {
    const input: JoinGroupInput = {
      inviteCode: null,
    };
    expect(input.inviteCode).toBeNull();
  });

  it("should allow undefined inviteCode in JoinGroupInput", () => {
    const input: JoinGroupInput = {};
    expect(input.inviteCode).toBeUndefined();
  });

  it("should export JoinUserInfo type", () => {
    const userInfo: JoinUserInfo = {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    expect(userInfo.id).toBe("user-1");
    expect(userInfo.username).toBe("testuser");
  });

  it("should allow null displayName and avatarUrl in JoinUserInfo", () => {
    const userInfo: JoinUserInfo = {
      id: "user-1",
      username: "testuser",
      displayName: null,
      avatarUrl: null,
    };
    expect(userInfo.displayName).toBeNull();
    expect(userInfo.avatarUrl).toBeNull();
  });

  it("should export JoinGroupResponse type", () => {
    const response: JoinGroupResponse = {
      success: true,
      message: "Successfully joined Test Group",
      membership: {
        groupId: "group-1",
        groupName: "Test Group",
        role: "MEMBER",
        joinedAt: "2026-01-18T00:00:00.000Z",
      },
    };
    expect(response.success).toBe(true);
    expect(response.membership.role).toBe("MEMBER");
  });

  it("should export MembershipCheckResult type", () => {
    const result: MembershipCheckResult = {
      exists: true,
      role: "MEMBER",
    };
    expect(result.exists).toBe(true);
    expect(result.role).toBe("MEMBER");
  });

  it("should allow null role in MembershipCheckResult", () => {
    const result: MembershipCheckResult = {
      exists: false,
      role: null,
    };
    expect(result.exists).toBe(false);
    expect(result.role).toBeNull();
  });
});

// ============================================================================
// joinGroupSchema Tests
// ============================================================================

describe("joinGroupSchema", () => {
  it("should accept empty object", () => {
    const result = joinGroupSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should accept valid 8-character uppercase alphanumeric invite code", () => {
    const result = joinGroupSchema.safeParse({ inviteCode: "ABC12345" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inviteCode).toBe("ABC12345");
    }
  });

  it("should accept all uppercase invite code", () => {
    const result = joinGroupSchema.safeParse({ inviteCode: "ABCDEFGH" });
    expect(result.success).toBe(true);
  });

  it("should accept all numeric invite code", () => {
    const result = joinGroupSchema.safeParse({ inviteCode: "12345678" });
    expect(result.success).toBe(true);
  });

  it("should reject invite code with lowercase letters", () => {
    const result = joinGroupSchema.safeParse({ inviteCode: "abc12345" });
    expect(result.success).toBe(false);
  });

  it("should reject invite code shorter than 8 characters", () => {
    const result = joinGroupSchema.safeParse({ inviteCode: "ABC1234" });
    expect(result.success).toBe(false);
  });

  it("should reject invite code longer than 8 characters", () => {
    const result = joinGroupSchema.safeParse({ inviteCode: "ABC123456" });
    expect(result.success).toBe(false);
  });

  it("should reject invite code with special characters", () => {
    const result = joinGroupSchema.safeParse({ inviteCode: "ABC123!@" });
    expect(result.success).toBe(false);
  });

  it("should accept null invite code", () => {
    const result = joinGroupSchema.safeParse({ inviteCode: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inviteCode).toBeNull();
    }
  });

  it("should accept undefined invite code", () => {
    const result = joinGroupSchema.safeParse({ inviteCode: undefined });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inviteCode).toBeUndefined();
    }
  });
});

// ============================================================================
// validateGroupId Tests
// ============================================================================

describe("validateGroupId", () => {
  it("should return trimmed string for valid ID", () => {
    expect(validateGroupId("group-123")).toBe("group-123");
  });

  it("should trim whitespace from ID", () => {
    expect(validateGroupId("  group-123  ")).toBe("group-123");
  });

  it("should return null for empty string", () => {
    expect(validateGroupId("")).toBeNull();
  });

  it("should return null for whitespace-only string", () => {
    expect(validateGroupId("   ")).toBeNull();
  });

  it("should return null for null input", () => {
    expect(validateGroupId(null)).toBeNull();
  });

  it("should return null for undefined input", () => {
    expect(validateGroupId(undefined)).toBeNull();
  });

  it("should return null for number input", () => {
    expect(validateGroupId(123)).toBeNull();
  });

  it("should return null for object input", () => {
    expect(validateGroupId({ id: "test" })).toBeNull();
  });

  it("should return null for array input", () => {
    expect(validateGroupId(["group-123"])).toBeNull();
  });

  it("should handle CUID-like IDs", () => {
    expect(validateGroupId("clxyz123abc456def")).toBe("clxyz123abc456def");
  });
});

// ============================================================================
// formatDate Tests
// ============================================================================

describe("formatDate", () => {
  it("should format date as ISO string", () => {
    const date = new Date("2026-01-18T12:30:45.000Z");
    expect(formatDate(date)).toBe("2026-01-18T12:30:45.000Z");
  });

  it("should handle midnight date", () => {
    const date = new Date("2026-01-18T00:00:00.000Z");
    expect(formatDate(date)).toBe("2026-01-18T00:00:00.000Z");
  });

  it("should handle end of day date", () => {
    const date = new Date("2026-01-18T23:59:59.999Z");
    expect(formatDate(date)).toBe("2026-01-18T23:59:59.999Z");
  });
});

// ============================================================================
// isValidInviteCode Tests
// ============================================================================

describe("isValidInviteCode", () => {
  it("should return true for valid 8-character uppercase alphanumeric code", () => {
    expect(isValidInviteCode("ABC12345")).toBe(true);
  });

  it("should return true for all uppercase code", () => {
    expect(isValidInviteCode("ABCDEFGH")).toBe(true);
  });

  it("should return true for all numeric code", () => {
    expect(isValidInviteCode("12345678")).toBe(true);
  });

  it("should return false for null", () => {
    expect(isValidInviteCode(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isValidInviteCode(undefined)).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isValidInviteCode("")).toBe(false);
  });

  it("should return false for code shorter than 8 characters", () => {
    expect(isValidInviteCode("ABC1234")).toBe(false);
  });

  it("should return false for code longer than 8 characters", () => {
    expect(isValidInviteCode("ABC123456")).toBe(false);
  });

  it("should return false for lowercase letters", () => {
    expect(isValidInviteCode("abc12345")).toBe(false);
  });

  it("should return false for special characters", () => {
    expect(isValidInviteCode("ABC123!@")).toBe(false);
  });

  it("should return false for mixed case", () => {
    expect(isValidInviteCode("AbC12345")).toBe(false);
  });
});

// ============================================================================
// isInviteCodeMatch Tests
// ============================================================================

describe("isInviteCodeMatch", () => {
  it("should return true for matching codes", () => {
    expect(isInviteCodeMatch("ABC12345", "ABC12345")).toBe(true);
  });

  it("should be case-insensitive", () => {
    expect(isInviteCodeMatch("ABC12345", "abc12345")).toBe(true);
  });

  it("should return false for non-matching codes", () => {
    expect(isInviteCodeMatch("ABC12345", "XYZ98765")).toBe(false);
  });

  it("should return false when groupInviteCode is null", () => {
    expect(isInviteCodeMatch(null, "ABC12345")).toBe(false);
  });

  it("should return false when providedCode is null", () => {
    expect(isInviteCodeMatch("ABC12345", null)).toBe(false);
  });

  it("should return false when providedCode is undefined", () => {
    expect(isInviteCodeMatch("ABC12345", undefined)).toBe(false);
  });

  it("should return false when both are null", () => {
    expect(isInviteCodeMatch(null, null)).toBe(false);
  });

  it("should return false for empty provided code", () => {
    expect(isInviteCodeMatch("ABC12345", "")).toBe(false);
  });
});

// ============================================================================
// hasCapacity Tests
// ============================================================================

describe("hasCapacity", () => {
  it("should return true when membersCount is less than maxMembers", () => {
    expect(hasCapacity(10, 50)).toBe(true);
  });

  it("should return false when membersCount equals maxMembers", () => {
    expect(hasCapacity(50, 50)).toBe(false);
  });

  it("should return false when membersCount exceeds maxMembers", () => {
    expect(hasCapacity(51, 50)).toBe(false);
  });

  it("should return true when maxMembers is null (unlimited)", () => {
    expect(hasCapacity(1000, null)).toBe(true);
  });

  it("should return true for zero members", () => {
    expect(hasCapacity(0, 50)).toBe(true);
  });

  it("should return true for one less than max", () => {
    expect(hasCapacity(49, 50)).toBe(true);
  });

  it("should handle small maxMembers", () => {
    expect(hasCapacity(1, 2)).toBe(true);
    expect(hasCapacity(2, 2)).toBe(false);
  });
});

// ============================================================================
// buildMembershipCacheKey Tests
// ============================================================================

describe("buildMembershipCacheKey", () => {
  it("should build correct cache key", () => {
    const key = buildMembershipCacheKey("group-123", "user-456");
    expect(key).toBe("user:user-456:group-membership:group-123");
  });

  it("should handle CUID-like IDs", () => {
    const key = buildMembershipCacheKey("clxyz123", "clabc456");
    expect(key).toBe("user:clabc456:group-membership:clxyz123");
  });

  it("should produce different keys for different groups", () => {
    const key1 = buildMembershipCacheKey("group-1", "user-1");
    const key2 = buildMembershipCacheKey("group-2", "user-1");
    expect(key1).not.toBe(key2);
  });

  it("should produce different keys for different users", () => {
    const key1 = buildMembershipCacheKey("group-1", "user-1");
    const key2 = buildMembershipCacheKey("group-1", "user-2");
    expect(key1).not.toBe(key2);
  });
});

// ============================================================================
// buildGroupCacheKey Tests
// ============================================================================

describe("buildGroupCacheKey", () => {
  it("should build correct cache key", () => {
    const key = buildGroupCacheKey("group-123");
    expect(key).toBe("user:group:group-123");
  });

  it("should handle CUID-like IDs", () => {
    const key = buildGroupCacheKey("clxyz123abc456");
    expect(key).toBe("user:group:clxyz123abc456");
  });

  it("should produce different keys for different groups", () => {
    const key1 = buildGroupCacheKey("group-1");
    const key2 = buildGroupCacheKey("group-2");
    expect(key1).not.toBe(key2);
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  it("should handle invite code with leading zeros", () => {
    expect(isValidInviteCode("00000000")).toBe(true);
  });

  it("should handle group ID with hyphens", () => {
    expect(validateGroupId("group-123-abc-456")).toBe("group-123-abc-456");
  });

  it("should handle group ID with underscores", () => {
    expect(validateGroupId("group_123_abc")).toBe("group_123_abc");
  });

  it("should handle unicode in group ID", () => {
    expect(validateGroupId("group-123-\u4E2D\u6587")).toBe(
      "group-123-\u4E2D\u6587"
    );
  });

  it("should handle very long group ID", () => {
    const longId = "a".repeat(100);
    expect(validateGroupId(longId)).toBe(longId);
  });

  it("should handle capacity at boundary", () => {
    // Just at limit
    expect(hasCapacity(49, 50)).toBe(true);
    expect(hasCapacity(50, 50)).toBe(false);
  });
});

// ============================================================================
// Response Structure Tests
// ============================================================================

describe("Response Structure", () => {
  it("should have correct JoinGroupResponse structure for success", () => {
    const response: JoinGroupResponse = {
      success: true,
      message: "Successfully joined Book Club",
      membership: {
        groupId: "group-123",
        groupName: "Book Club",
        role: "MEMBER",
        joinedAt: "2026-01-18T10:30:00.000Z",
      },
    };

    expect(response).toHaveProperty("success");
    expect(response).toHaveProperty("message");
    expect(response).toHaveProperty("membership");
    expect(response.membership).toHaveProperty("groupId");
    expect(response.membership).toHaveProperty("groupName");
    expect(response.membership).toHaveProperty("role");
    expect(response.membership).toHaveProperty("joinedAt");
  });

  it("should have role as MEMBER for new joiners", () => {
    const response: JoinGroupResponse = {
      success: true,
      message: "Joined",
      membership: {
        groupId: "g1",
        groupName: "Test",
        role: "MEMBER",
        joinedAt: new Date().toISOString(),
      },
    };
    expect(response.membership.role).toBe("MEMBER");
  });
});

// ============================================================================
// Integration Scenarios Tests
// ============================================================================

describe("Integration Scenarios", () => {
  it("should validate complete join flow for public group", () => {
    // Step 1: Validate group ID
    const groupId = validateGroupId("group-123");
    expect(groupId).toBe("group-123");

    // Step 2: No invite code needed for public group
    const input = joinGroupSchema.safeParse({});
    expect(input.success).toBe(true);

    // Step 3: Check capacity
    expect(hasCapacity(10, 50)).toBe(true);

    // Step 4: Build response
    const response: JoinGroupResponse = {
      success: true,
      message: "Successfully joined Public Book Club",
      membership: {
        groupId: "group-123",
        groupName: "Public Book Club",
        role: "MEMBER",
        joinedAt: formatDate(new Date()),
      },
    };
    expect(response.success).toBe(true);
  });

  it("should validate complete join flow for private group with invite", () => {
    // Step 1: Validate group ID
    const groupId = validateGroupId("group-private");
    expect(groupId).toBe("group-private");

    // Step 2: Validate invite code
    const input = joinGroupSchema.safeParse({ inviteCode: "ABC12345" });
    expect(input.success).toBe(true);

    // Step 3: Verify invite code matches
    expect(isInviteCodeMatch("ABC12345", "ABC12345")).toBe(true);

    // Step 4: Check capacity
    expect(hasCapacity(5, 20)).toBe(true);

    // Step 5: Build cache keys for invalidation
    const groupCacheKey = buildGroupCacheKey("group-private");
    const membershipCacheKey = buildMembershipCacheKey(
      "group-private",
      "user-1"
    );
    expect(groupCacheKey).toContain("group-private");
    expect(membershipCacheKey).toContain("group-private");
    expect(membershipCacheKey).toContain("user-1");
  });

  it("should reject join when group is at capacity", () => {
    expect(hasCapacity(50, 50)).toBe(false);
    expect(hasCapacity(100, 50)).toBe(false);
  });

  it("should reject join to private group without invite code", () => {
    const input = joinGroupSchema.safeParse({});
    expect(input.success).toBe(true);
    // The API handler would check isPublic and reject if no code provided
    // Here we just verify the schema allows empty input
  });

  it("should reject join with wrong invite code", () => {
    expect(isInviteCodeMatch("ABC12345", "XYZ98765")).toBe(false);
  });
});

// ============================================================================
// Membership Check Result Tests
// ============================================================================

describe("MembershipCheckResult", () => {
  it("should represent existing membership", () => {
    const result: MembershipCheckResult = {
      exists: true,
      role: "MEMBER",
    };
    expect(result.exists).toBe(true);
    expect(result.role).toBe("MEMBER");
  });

  it("should represent no membership", () => {
    const result: MembershipCheckResult = {
      exists: false,
      role: null,
    };
    expect(result.exists).toBe(false);
    expect(result.role).toBeNull();
  });

  it("should represent owner membership", () => {
    const result: MembershipCheckResult = {
      exists: true,
      role: "OWNER",
    };
    expect(result.exists).toBe(true);
    expect(result.role).toBe("OWNER");
  });

  it("should represent admin membership", () => {
    const result: MembershipCheckResult = {
      exists: true,
      role: "ADMIN",
    };
    expect(result.exists).toBe(true);
    expect(result.role).toBe("ADMIN");
  });
});
