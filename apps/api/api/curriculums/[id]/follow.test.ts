/**
 * Tests for Curriculum Follow API
 * POST/DELETE /api/curriculums/:id/follow
 */

import { describe, it, expect } from "vitest";
import {
  // Types
  type CurriculumFollowResponse,
  type CurriculumProgressInfo,
  type CurriculumBasicInfo,
  type FollowExistsResult,
  // Helpers
  validateCurriculumId,
  formatDate,
  calculatePercentComplete,
  canFollowCurriculum,
  buildCurriculumCacheKey,
  buildBrowseCachePattern,
  buildProgressInfo,
} from "./follow.js";

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type exports", () => {
  it("should export CurriculumFollowResponse type", () => {
    const response: CurriculumFollowResponse = {
      success: true,
      action: "followed",
      curriculumId: "curr1",
      curriculumTitle: "Test Curriculum",
      userId: "user1",
      isFollowing: true,
      followersCount: 5,
      progress: {
        currentItemIndex: 0,
        completedItems: 0,
        totalItems: 10,
        percentComplete: 0,
        startedAt: new Date().toISOString(),
        completedAt: null,
      },
    };
    expect(response).toBeDefined();
    expect(response.action).toBe("followed");
  });

  it("should export CurriculumProgressInfo type", () => {
    const progress: CurriculumProgressInfo = {
      currentItemIndex: 3,
      completedItems: 2,
      totalItems: 10,
      percentComplete: 20,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
    expect(progress).toBeDefined();
    expect(progress.percentComplete).toBe(20);
  });

  it("should export CurriculumBasicInfo type", () => {
    const info: CurriculumBasicInfo = {
      id: "curr1",
      title: "Test",
      userId: "user1",
      visibility: "PUBLIC",
      totalItems: 5,
      followersCount: 10,
      deletedAt: null,
    };
    expect(info).toBeDefined();
    expect(info.visibility).toBe("PUBLIC");
  });

  it("should export FollowExistsResult type", () => {
    const result: FollowExistsResult = {
      exists: true,
      follow: {
        id: "follow1",
        currentItemIndex: 2,
        completedItems: 1,
        startedAt: new Date(),
        completedAt: null,
      },
    };
    expect(result).toBeDefined();
    expect(result.exists).toBe(true);
  });

  it("should handle unfollowed response", () => {
    const response: CurriculumFollowResponse = {
      success: true,
      action: "unfollowed",
      curriculumId: "curr1",
      curriculumTitle: "Test Curriculum",
      userId: "user1",
      isFollowing: false,
      followersCount: 4,
    };
    expect(response).toBeDefined();
    expect(response.action).toBe("unfollowed");
    expect(response.progress).toBeUndefined();
  });
});

// ============================================================================
// validateCurriculumId Tests
// ============================================================================

describe("validateCurriculumId", () => {
  it("should return trimmed id for valid string", () => {
    expect(validateCurriculumId("  abc123  ")).toBe("abc123");
  });

  it("should return null for empty string", () => {
    expect(validateCurriculumId("")).toBeNull();
  });

  it("should return null for whitespace-only string", () => {
    expect(validateCurriculumId("   ")).toBeNull();
  });

  it("should return null for non-string types", () => {
    expect(validateCurriculumId(null)).toBeNull();
    expect(validateCurriculumId(undefined)).toBeNull();
    expect(validateCurriculumId(123)).toBeNull();
    expect(validateCurriculumId({})).toBeNull();
    expect(validateCurriculumId([])).toBeNull();
  });

  it("should handle valid IDs", () => {
    expect(validateCurriculumId("cuid_123abc")).toBe("cuid_123abc");
    expect(validateCurriculumId("a")).toBe("a");
  });
});

// ============================================================================
// formatDate Tests
// ============================================================================

describe("formatDate", () => {
  it("should format date as ISO string", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    expect(formatDate(date)).toBe("2024-01-15T10:30:00.000Z");
  });

  it("should handle current date", () => {
    const now = new Date();
    const formatted = formatDate(now);
    expect(formatted).toBe(now.toISOString());
  });
});

// ============================================================================
// calculatePercentComplete Tests
// ============================================================================

describe("calculatePercentComplete", () => {
  it("should return 0 for 0 completed items", () => {
    expect(calculatePercentComplete(0, 10)).toBe(0);
  });

  it("should return 100 for all items completed", () => {
    expect(calculatePercentComplete(10, 10)).toBe(100);
  });

  it("should return 0 for 0 total items", () => {
    expect(calculatePercentComplete(0, 0)).toBe(0);
  });

  it("should return 0 for negative total items", () => {
    expect(calculatePercentComplete(5, -1)).toBe(0);
  });

  it("should round to nearest integer", () => {
    expect(calculatePercentComplete(1, 3)).toBe(33);
    expect(calculatePercentComplete(2, 3)).toBe(67);
  });

  it("should handle partial completion", () => {
    expect(calculatePercentComplete(5, 10)).toBe(50);
    expect(calculatePercentComplete(3, 10)).toBe(30);
    expect(calculatePercentComplete(7, 10)).toBe(70);
  });

  it("should handle single item curriculum", () => {
    expect(calculatePercentComplete(0, 1)).toBe(0);
    expect(calculatePercentComplete(1, 1)).toBe(100);
  });
});

// ============================================================================
// canFollowCurriculum Tests
// ============================================================================

describe("canFollowCurriculum", () => {
  it("should not allow following own curriculum", () => {
    const curriculum: CurriculumBasicInfo = {
      id: "curr1",
      title: "My Curriculum",
      userId: "user1",
      visibility: "PUBLIC",
      totalItems: 5,
      followersCount: 0,
      deletedAt: null,
    };
    const result = canFollowCurriculum(curriculum, "user1");
    expect(result.canFollow).toBe(false);
    expect(result.reason).toBe("You cannot follow your own curriculum");
  });

  it("should not allow following deleted curriculum", () => {
    const curriculum: CurriculumBasicInfo = {
      id: "curr1",
      title: "Deleted Curriculum",
      userId: "user2",
      visibility: "PUBLIC",
      totalItems: 5,
      followersCount: 0,
      deletedAt: new Date(),
    };
    const result = canFollowCurriculum(curriculum, "user1");
    expect(result.canFollow).toBe(false);
    expect(result.reason).toBe("Curriculum not found");
  });

  it("should not allow following private curriculum", () => {
    const curriculum: CurriculumBasicInfo = {
      id: "curr1",
      title: "Private Curriculum",
      userId: "user2",
      visibility: "PRIVATE",
      totalItems: 5,
      followersCount: 0,
      deletedAt: null,
    };
    const result = canFollowCurriculum(curriculum, "user1");
    expect(result.canFollow).toBe(false);
    expect(result.reason).toBe("This curriculum is private");
  });

  it("should allow following public curriculum", () => {
    const curriculum: CurriculumBasicInfo = {
      id: "curr1",
      title: "Public Curriculum",
      userId: "user2",
      visibility: "PUBLIC",
      totalItems: 5,
      followersCount: 0,
      deletedAt: null,
    };
    const result = canFollowCurriculum(curriculum, "user1");
    expect(result.canFollow).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("should allow following unlisted curriculum", () => {
    const curriculum: CurriculumBasicInfo = {
      id: "curr1",
      title: "Unlisted Curriculum",
      userId: "user2",
      visibility: "UNLISTED",
      totalItems: 5,
      followersCount: 0,
      deletedAt: null,
    };
    const result = canFollowCurriculum(curriculum, "user1");
    expect(result.canFollow).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

// ============================================================================
// buildCurriculumCacheKey Tests
// ============================================================================

describe("buildCurriculumCacheKey", () => {
  it("should build correct cache key", () => {
    const key = buildCurriculumCacheKey("curr123");
    expect(key).toContain("curriculum");
    expect(key).toContain("curr123");
  });

  it("should handle different IDs", () => {
    const key1 = buildCurriculumCacheKey("abc");
    const key2 = buildCurriculumCacheKey("xyz");
    expect(key1).not.toBe(key2);
  });
});

// ============================================================================
// buildBrowseCachePattern Tests
// ============================================================================

describe("buildBrowseCachePattern", () => {
  it("should build correct pattern", () => {
    const pattern = buildBrowseCachePattern();
    expect(pattern).toContain("curriculums");
    expect(pattern).toContain("browse");
    expect(pattern).toContain("*");
  });
});

// ============================================================================
// buildProgressInfo Tests
// ============================================================================

describe("buildProgressInfo", () => {
  it("should return undefined for null follow", () => {
    expect(buildProgressInfo(null, 10)).toBeUndefined();
  });

  it("should build progress info from follow record", () => {
    const follow = {
      id: "follow1",
      currentItemIndex: 3,
      completedItems: 2,
      startedAt: new Date("2024-01-15T10:00:00.000Z"),
      completedAt: null,
    };
    const progress = buildProgressInfo(follow, 10);

    expect(progress).toBeDefined();
    expect(progress).not.toBeNull();
    if (progress) {
      expect(progress.currentItemIndex).toBe(3);
      expect(progress.completedItems).toBe(2);
      expect(progress.totalItems).toBe(10);
      expect(progress.percentComplete).toBe(20);
      expect(progress.startedAt).toBe("2024-01-15T10:00:00.000Z");
      expect(progress.completedAt).toBeNull();
    }
  });

  it("should include completedAt when curriculum is completed", () => {
    const completedDate = new Date("2024-02-01T15:00:00.000Z");
    const follow = {
      id: "follow1",
      currentItemIndex: 10,
      completedItems: 10,
      startedAt: new Date("2024-01-15T10:00:00.000Z"),
      completedAt: completedDate,
    };
    const progress = buildProgressInfo(follow, 10);

    expect(progress).toBeDefined();
    expect(progress).not.toBeNull();
    if (progress) {
      expect(progress.completedItems).toBe(10);
      expect(progress.percentComplete).toBe(100);
      expect(progress.completedAt).toBe("2024-02-01T15:00:00.000Z");
    }
  });

  it("should handle empty curriculum (0 items)", () => {
    const follow = {
      id: "follow1",
      currentItemIndex: 0,
      completedItems: 0,
      startedAt: new Date("2024-01-15T10:00:00.000Z"),
      completedAt: null,
    };
    const progress = buildProgressInfo(follow, 0);

    expect(progress).toBeDefined();
    expect(progress).not.toBeNull();
    if (progress) {
      expect(progress.totalItems).toBe(0);
      expect(progress.percentComplete).toBe(0);
    }
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge cases", () => {
  it("should handle visibility enum values correctly", () => {
    const publicCurr: CurriculumBasicInfo = {
      id: "1",
      title: "T",
      userId: "u2",
      visibility: "PUBLIC",
      totalItems: 1,
      followersCount: 0,
      deletedAt: null,
    };
    const unlistedCurr: CurriculumBasicInfo = {
      id: "2",
      title: "T",
      userId: "u2",
      visibility: "UNLISTED",
      totalItems: 1,
      followersCount: 0,
      deletedAt: null,
    };
    const privateCurr: CurriculumBasicInfo = {
      id: "3",
      title: "T",
      userId: "u2",
      visibility: "PRIVATE",
      totalItems: 1,
      followersCount: 0,
      deletedAt: null,
    };

    expect(canFollowCurriculum(publicCurr, "u1").canFollow).toBe(true);
    expect(canFollowCurriculum(unlistedCurr, "u1").canFollow).toBe(true);
    expect(canFollowCurriculum(privateCurr, "u1").canFollow).toBe(false);
  });

  it("should handle follow with all optional fields", () => {
    const follow = {
      id: "follow1",
      currentItemIndex: 0,
      completedItems: 0,
      startedAt: new Date(),
      completedAt: null,
    };
    const result: FollowExistsResult = {
      exists: true,
      follow,
    };
    expect(result.exists).toBe(true);
    expect(result.follow?.completedAt).toBeNull();
  });

  it("should handle non-existent follow", () => {
    const result: FollowExistsResult = {
      exists: false,
      follow: null,
    };
    expect(result.exists).toBe(false);
    expect(result.follow).toBeNull();
  });

  it("should calculate percent correctly for edge values", () => {
    // 99 of 100 = 99%
    expect(calculatePercentComplete(99, 100)).toBe(99);
    // 1 of 100 = 1%
    expect(calculatePercentComplete(1, 100)).toBe(1);
    // Large numbers
    expect(calculatePercentComplete(500, 1000)).toBe(50);
  });

  it("should handle response types for both follow and unfollow", () => {
    const followResponse: CurriculumFollowResponse = {
      success: true,
      action: "followed",
      curriculumId: "c1",
      curriculumTitle: "Title",
      userId: "u1",
      isFollowing: true,
      followersCount: 1,
      progress: {
        currentItemIndex: 0,
        completedItems: 0,
        totalItems: 5,
        percentComplete: 0,
        startedAt: new Date().toISOString(),
        completedAt: null,
      },
    };

    const unfollowResponse: CurriculumFollowResponse = {
      success: true,
      action: "unfollowed",
      curriculumId: "c1",
      curriculumTitle: "Title",
      userId: "u1",
      isFollowing: false,
      followersCount: 0,
    };

    expect(followResponse.action).toBe("followed");
    expect(followResponse.isFollowing).toBe(true);
    expect(followResponse.progress).toBeDefined();

    expect(unfollowResponse.action).toBe("unfollowed");
    expect(unfollowResponse.isFollowing).toBe(false);
    expect(unfollowResponse.progress).toBeUndefined();
  });
});

// ============================================================================
// Integration-style Tests
// ============================================================================

describe("Integration-style tests", () => {
  it("should validate curriculum ID and build cache key consistently", () => {
    const rawId = "  curriculum_123  ";
    const validatedId = validateCurriculumId(rawId);
    expect(validatedId).toBe("curriculum_123");

    if (validatedId) {
      const cacheKey = buildCurriculumCacheKey(validatedId);
      expect(cacheKey).toContain("curriculum_123");
    }
  });

  it("should build complete progress info for new follower", () => {
    const now = new Date();
    const follow = {
      id: "new_follow",
      currentItemIndex: 0,
      completedItems: 0,
      startedAt: now,
      completedAt: null,
    };
    const totalItems = 15;

    const progress = buildProgressInfo(follow, totalItems);

    expect(progress).toEqual({
      currentItemIndex: 0,
      completedItems: 0,
      totalItems: 15,
      percentComplete: 0,
      startedAt: now.toISOString(),
      completedAt: null,
    });
  });

  it("should build complete progress info for completed curriculum", () => {
    const startDate = new Date("2024-01-01T00:00:00.000Z");
    const completeDate = new Date("2024-02-01T00:00:00.000Z");
    const follow = {
      id: "completed_follow",
      currentItemIndex: 10,
      completedItems: 10,
      startedAt: startDate,
      completedAt: completeDate,
    };
    const totalItems = 10;

    const progress = buildProgressInfo(follow, totalItems);

    expect(progress).toEqual({
      currentItemIndex: 10,
      completedItems: 10,
      totalItems: 10,
      percentComplete: 100,
      startedAt: "2024-01-01T00:00:00.000Z",
      completedAt: "2024-02-01T00:00:00.000Z",
    });
  });

  it("should correctly determine followability for various scenarios", () => {
    const baseCurriculum: Omit<
      CurriculumBasicInfo,
      "visibility" | "userId" | "deletedAt"
    > = {
      id: "curr1",
      title: "Test",
      totalItems: 10,
      followersCount: 5,
    };

    // Scenario 1: Public curriculum, different user
    const publicOther: CurriculumBasicInfo = {
      ...baseCurriculum,
      userId: "owner",
      visibility: "PUBLIC",
      deletedAt: null,
    };
    expect(canFollowCurriculum(publicOther, "follower").canFollow).toBe(true);

    // Scenario 2: Public curriculum, same user (owner)
    expect(canFollowCurriculum(publicOther, "owner").canFollow).toBe(false);

    // Scenario 3: Private curriculum, different user
    const privateOther: CurriculumBasicInfo = {
      ...baseCurriculum,
      userId: "owner",
      visibility: "PRIVATE",
      deletedAt: null,
    };
    expect(canFollowCurriculum(privateOther, "follower").canFollow).toBe(false);

    // Scenario 4: Deleted curriculum
    const deletedCurr: CurriculumBasicInfo = {
      ...baseCurriculum,
      userId: "owner",
      visibility: "PUBLIC",
      deletedAt: new Date(),
    };
    expect(canFollowCurriculum(deletedCurr, "follower").canFollow).toBe(false);
  });
});
