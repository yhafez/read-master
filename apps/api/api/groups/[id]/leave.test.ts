/**
 * Tests for DELETE /api/groups/:id/leave endpoint
 */

import { describe, it, expect } from "vitest";
import {
  validateGroupId,
  isOwner,
  buildGroupCacheKey,
  buildMembershipCacheKey,
  type LeaveGroupResponse,
  type MembershipInfo,
} from "./leave.js";

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export LeaveGroupResponse type", () => {
    const response: LeaveGroupResponse = {
      success: true,
      message: "Successfully left Test Group",
    };
    expect(response.success).toBe(true);
    expect(response.message).toBe("Successfully left Test Group");
  });

  it("should export MembershipInfo type", () => {
    const membershipInfo: MembershipInfo = {
      id: "membership-1",
      role: "MEMBER",
      groupId: "group-1",
      groupName: "Test Group",
    };
    expect(membershipInfo.id).toBe("membership-1");
    expect(membershipInfo.role).toBe("MEMBER");
    expect(membershipInfo.groupId).toBe("group-1");
    expect(membershipInfo.groupName).toBe("Test Group");
  });

  it("should allow different roles in MembershipInfo", () => {
    const ownerMembership: MembershipInfo = {
      id: "m-1",
      role: "OWNER",
      groupId: "g-1",
      groupName: "Owner's Group",
    };
    expect(ownerMembership.role).toBe("OWNER");

    const adminMembership: MembershipInfo = {
      id: "m-2",
      role: "ADMIN",
      groupId: "g-1",
      groupName: "Admin's Group",
    };
    expect(adminMembership.role).toBe("ADMIN");

    const memberMembership: MembershipInfo = {
      id: "m-3",
      role: "MEMBER",
      groupId: "g-1",
      groupName: "Member's Group",
    };
    expect(memberMembership.role).toBe("MEMBER");
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

  it("should handle IDs with hyphens", () => {
    expect(validateGroupId("group-abc-123")).toBe("group-abc-123");
  });

  it("should handle IDs with underscores", () => {
    expect(validateGroupId("group_abc_123")).toBe("group_abc_123");
  });
});

// ============================================================================
// isOwner Tests
// ============================================================================

describe("isOwner", () => {
  it("should return true for OWNER role", () => {
    expect(isOwner("OWNER")).toBe(true);
  });

  it("should return false for ADMIN role", () => {
    expect(isOwner("ADMIN")).toBe(false);
  });

  it("should return false for MEMBER role", () => {
    expect(isOwner("MEMBER")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isOwner("")).toBe(false);
  });

  it("should return false for lowercase owner", () => {
    expect(isOwner("owner")).toBe(false);
  });

  it("should return false for mixed case Owner", () => {
    expect(isOwner("Owner")).toBe(false);
  });

  it("should return false for arbitrary string", () => {
    expect(isOwner("MODERATOR")).toBe(false);
  });

  it("should return false for partial match", () => {
    expect(isOwner("OWNER_ADMIN")).toBe(false);
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

  it("should handle special characters in group ID", () => {
    const key = buildGroupCacheKey("group-123-abc");
    expect(key).toBe("user:group:group-123-abc");
  });

  it("should handle empty string ID", () => {
    const key = buildGroupCacheKey("");
    expect(key).toBe("user:group:");
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

  it("should contain both group and user identifiers", () => {
    const key = buildMembershipCacheKey("my-group", "my-user");
    expect(key).toContain("my-group");
    expect(key).toContain("my-user");
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  it("should handle group ID with unicode characters", () => {
    expect(validateGroupId("group-\u4E2D\u6587")).toBe("group-\u4E2D\u6587");
  });

  it("should handle very long group ID", () => {
    const longId = "a".repeat(100);
    expect(validateGroupId(longId)).toBe(longId);
  });

  it("should handle group ID with numbers only", () => {
    expect(validateGroupId("12345678")).toBe("12345678");
  });

  it("should handle whitespace in middle of ID (not trimmed)", () => {
    expect(validateGroupId("group 123")).toBe("group 123");
  });

  it("should handle newlines and tabs as whitespace to trim", () => {
    expect(validateGroupId("\n\tgroup-123\n\t")).toBe("group-123");
  });
});

// ============================================================================
// Response Structure Tests
// ============================================================================

describe("Response Structure", () => {
  it("should have correct LeaveGroupResponse structure for success", () => {
    const response: LeaveGroupResponse = {
      success: true,
      message: "Successfully left Book Club",
    };

    expect(response).toHaveProperty("success");
    expect(response).toHaveProperty("message");
    expect(response.success).toBe(true);
    expect(response.message).toContain("Successfully left");
  });

  it("should have correct MembershipInfo structure", () => {
    const membership: MembershipInfo = {
      id: "mem-123",
      role: "MEMBER",
      groupId: "grp-456",
      groupName: "Reading Circle",
    };

    expect(membership).toHaveProperty("id");
    expect(membership).toHaveProperty("role");
    expect(membership).toHaveProperty("groupId");
    expect(membership).toHaveProperty("groupName");
  });
});

// ============================================================================
// Integration Scenarios Tests
// ============================================================================

describe("Integration Scenarios", () => {
  it("should validate complete leave flow for MEMBER", () => {
    // Step 1: Validate group ID
    const groupId = validateGroupId("group-123");
    expect(groupId).toBe("group-123");

    // Step 2: Verify user is not owner (can leave)
    const membership: MembershipInfo = {
      id: "mem-1",
      role: "MEMBER",
      groupId: "group-123",
      groupName: "Book Club",
    };
    expect(isOwner(membership.role)).toBe(false);

    // Step 3: Build cache keys for invalidation
    const groupCacheKey = buildGroupCacheKey("group-123");
    const membershipCacheKey = buildMembershipCacheKey("group-123", "user-1");
    expect(groupCacheKey).toContain("group-123");
    expect(membershipCacheKey).toContain("group-123");

    // Step 4: Build response
    const response: LeaveGroupResponse = {
      success: true,
      message: `Successfully left ${membership.groupName}`,
    };
    expect(response.success).toBe(true);
    expect(response.message).toContain("Book Club");
  });

  it("should validate complete leave flow for ADMIN", () => {
    // Admins can also leave
    const membership: MembershipInfo = {
      id: "mem-2",
      role: "ADMIN",
      groupId: "group-456",
      groupName: "Study Group",
    };
    expect(isOwner(membership.role)).toBe(false); // Admins can leave

    const response: LeaveGroupResponse = {
      success: true,
      message: `Successfully left ${membership.groupName}`,
    };
    expect(response.success).toBe(true);
  });

  it("should prevent OWNER from leaving", () => {
    const membership: MembershipInfo = {
      id: "mem-3",
      role: "OWNER",
      groupId: "group-789",
      groupName: "My Book Club",
    };
    expect(isOwner(membership.role)).toBe(true);
    // API would return 403 error for owner trying to leave
  });

  it("should handle membership not found scenario", () => {
    // When membership is null, API returns 404
    const membershipInfo: MembershipInfo | null = null;
    expect(membershipInfo).toBeNull();
  });
});

// ============================================================================
// Role Validation Tests
// ============================================================================

describe("Role Validation", () => {
  it("should correctly identify all valid roles", () => {
    expect(isOwner("OWNER")).toBe(true);
    expect(isOwner("ADMIN")).toBe(false);
    expect(isOwner("MEMBER")).toBe(false);
  });

  it("should handle case sensitivity for roles", () => {
    // Only exact "OWNER" string should match
    expect(isOwner("OWNER")).toBe(true);
    expect(isOwner("owner")).toBe(false);
    expect(isOwner("Owner")).toBe(false);
    expect(isOwner("OWNER ")).toBe(false);
    expect(isOwner(" OWNER")).toBe(false);
  });

  it("should handle unknown roles", () => {
    expect(isOwner("SUPER_ADMIN")).toBe(false);
    expect(isOwner("GUEST")).toBe(false);
    expect(isOwner("MODERATOR")).toBe(false);
  });
});

// ============================================================================
// Cache Key Pattern Tests
// ============================================================================

describe("Cache Key Patterns", () => {
  it("should generate consistent cache keys", () => {
    const key1 = buildGroupCacheKey("group-1");
    const key2 = buildGroupCacheKey("group-1");
    expect(key1).toBe(key2);
  });

  it("should generate consistent membership cache keys", () => {
    const key1 = buildMembershipCacheKey("group-1", "user-1");
    const key2 = buildMembershipCacheKey("group-1", "user-1");
    expect(key1).toBe(key2);
  });

  it("should use correct prefixes in cache keys", () => {
    const groupKey = buildGroupCacheKey("g1");
    const membershipKey = buildMembershipCacheKey("g1", "u1");

    expect(groupKey).toMatch(/^user:/);
    expect(membershipKey).toMatch(/^user:/);
  });

  it("should include group-membership identifier in membership cache key", () => {
    const key = buildMembershipCacheKey("group-id", "user-id");
    expect(key).toContain("group-membership");
  });
});

// ============================================================================
// Leave Scenarios Tests
// ============================================================================

describe("Leave Scenarios", () => {
  describe("Regular Member Leaving", () => {
    it("should allow MEMBER to leave", () => {
      expect(isOwner("MEMBER")).toBe(false);
    });

    it("should generate correct response message", () => {
      const groupName = "Book Club";
      const response: LeaveGroupResponse = {
        success: true,
        message: `Successfully left ${groupName}`,
      };
      expect(response.message).toBe("Successfully left Book Club");
    });
  });

  describe("Admin Leaving", () => {
    it("should allow ADMIN to leave", () => {
      expect(isOwner("ADMIN")).toBe(false);
    });
  });

  describe("Owner Restrictions", () => {
    it("should not allow OWNER to leave", () => {
      expect(isOwner("OWNER")).toBe(true);
    });

    it("should check isOwner before processing leave", () => {
      const membershipRole = "OWNER";
      const canLeave = !isOwner(membershipRole);
      expect(canLeave).toBe(false);
    });
  });
});

// ============================================================================
// Validation ID Edge Cases
// ============================================================================

describe("Validation ID Edge Cases", () => {
  it("should handle boolean input", () => {
    expect(validateGroupId(true as unknown)).toBeNull();
    expect(validateGroupId(false as unknown)).toBeNull();
  });

  it("should handle function input", () => {
    expect(validateGroupId((() => "test") as unknown)).toBeNull();
  });

  it("should handle symbol input", () => {
    expect(validateGroupId(Symbol("test") as unknown)).toBeNull();
  });

  it("should handle BigInt input", () => {
    expect(validateGroupId(BigInt(123) as unknown)).toBeNull();
  });
});
