/**
 * Tests for Curriculum Progress API
 * GET/PUT /api/curriculums/:id/progress
 */

import { describe, it, expect } from "vitest";
import {
  // Constants
  MIN_ITEM_INDEX,
  MAX_ITEM_INDEX,
  MIN_COMPLETED_ITEMS,
  MAX_COMPLETED_ITEMS,
  // Types
  type CurriculumProgressResponse,
  type UpdateProgressInput,
  type FollowWithCurriculum,
  // Schema
  updateProgressSchema,
  // Helpers
  validateCurriculumId,
  formatDate,
  formatOptionalDate,
  calculatePercentComplete,
  isComplete,
  validateItemIndex,
  validateCompletedItems,
  buildProgressResponse,
  buildCurriculumCacheKey,
} from "./progress.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have correct MIN_ITEM_INDEX", () => {
    expect(MIN_ITEM_INDEX).toBe(0);
  });

  it("should have correct MAX_ITEM_INDEX", () => {
    expect(MAX_ITEM_INDEX).toBe(10000);
  });

  it("should have correct MIN_COMPLETED_ITEMS", () => {
    expect(MIN_COMPLETED_ITEMS).toBe(0);
  });

  it("should have correct MAX_COMPLETED_ITEMS", () => {
    expect(MAX_COMPLETED_ITEMS).toBe(10000);
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type exports", () => {
  it("should export CurriculumProgressResponse type", () => {
    const response: CurriculumProgressResponse = {
      curriculumId: "curr1",
      curriculumTitle: "Test Curriculum",
      userId: "user1",
      currentItemIndex: 3,
      completedItems: 2,
      totalItems: 10,
      percentComplete: 20,
      startedAt: new Date().toISOString(),
      lastProgressAt: new Date().toISOString(),
      completedAt: null,
      isComplete: false,
    };
    expect(response).toBeDefined();
    expect(response.isComplete).toBe(false);
  });

  it("should export UpdateProgressInput type", () => {
    const input: UpdateProgressInput = {
      currentItemIndex: 5,
      completedItems: 4,
    };
    expect(input).toBeDefined();
  });

  it("should export FollowWithCurriculum type", () => {
    const follow: FollowWithCurriculum = {
      id: "follow1",
      userId: "user1",
      curriculumId: "curr1",
      currentItemIndex: 2,
      completedItems: 1,
      startedAt: new Date(),
      lastProgressAt: null,
      completedAt: null,
      curriculum: {
        id: "curr1",
        title: "Test",
        totalItems: 10,
        deletedAt: null,
      },
    };
    expect(follow).toBeDefined();
    expect(follow.curriculum.totalItems).toBe(10);
  });
});

// ============================================================================
// updateProgressSchema Tests
// ============================================================================

describe("updateProgressSchema", () => {
  it("should accept valid input with both fields", () => {
    const result = updateProgressSchema.safeParse({
      currentItemIndex: 5,
      completedItems: 3,
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid input with only currentItemIndex", () => {
    const result = updateProgressSchema.safeParse({
      currentItemIndex: 3,
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid input with only completedItems", () => {
    const result = updateProgressSchema.safeParse({
      completedItems: 5,
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty object", () => {
    const result = updateProgressSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should reject negative currentItemIndex", () => {
    const result = updateProgressSchema.safeParse({
      currentItemIndex: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject currentItemIndex above max", () => {
    const result = updateProgressSchema.safeParse({
      currentItemIndex: MAX_ITEM_INDEX + 1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative completedItems", () => {
    const result = updateProgressSchema.safeParse({
      completedItems: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject completedItems above max", () => {
    const result = updateProgressSchema.safeParse({
      completedItems: MAX_COMPLETED_ITEMS + 1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject non-integer currentItemIndex", () => {
    const result = updateProgressSchema.safeParse({
      currentItemIndex: 3.5,
    });
    expect(result.success).toBe(false);
  });

  it("should reject non-integer completedItems", () => {
    const result = updateProgressSchema.safeParse({
      completedItems: 2.7,
    });
    expect(result.success).toBe(false);
  });

  it("should accept zero values", () => {
    const result = updateProgressSchema.safeParse({
      currentItemIndex: 0,
      completedItems: 0,
    });
    expect(result.success).toBe(true);
  });

  it("should accept max values", () => {
    const result = updateProgressSchema.safeParse({
      currentItemIndex: MAX_ITEM_INDEX,
      completedItems: MAX_COMPLETED_ITEMS,
    });
    expect(result.success).toBe(true);
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
    expect(formatDate(now)).toBe(now.toISOString());
  });
});

// ============================================================================
// formatOptionalDate Tests
// ============================================================================

describe("formatOptionalDate", () => {
  it("should format date as ISO string when provided", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    expect(formatOptionalDate(date)).toBe("2024-01-15T10:30:00.000Z");
  });

  it("should return null when date is null", () => {
    expect(formatOptionalDate(null)).toBeNull();
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

  it("should cap at 100", () => {
    expect(calculatePercentComplete(15, 10)).toBe(100);
  });

  it("should floor at 0", () => {
    expect(calculatePercentComplete(-5, 10)).toBe(0);
  });
});

// ============================================================================
// isComplete Tests
// ============================================================================

describe("isComplete", () => {
  it("should return true when completedItems equals totalItems", () => {
    expect(isComplete(10, 10)).toBe(true);
  });

  it("should return true when completedItems exceeds totalItems", () => {
    expect(isComplete(12, 10)).toBe(true);
  });

  it("should return false when completedItems is less than totalItems", () => {
    expect(isComplete(5, 10)).toBe(false);
  });

  it("should return false for 0 total items", () => {
    expect(isComplete(0, 0)).toBe(false);
  });

  it("should return false for empty curriculum", () => {
    expect(isComplete(0, 0)).toBe(false);
  });

  it("should handle single item curriculum", () => {
    expect(isComplete(0, 1)).toBe(false);
    expect(isComplete(1, 1)).toBe(true);
  });
});

// ============================================================================
// validateItemIndex Tests
// ============================================================================

describe("validateItemIndex", () => {
  it("should return valid for index within bounds", () => {
    const result = validateItemIndex(5, 10);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("should return valid for index at 0", () => {
    const result = validateItemIndex(0, 10);
    expect(result.valid).toBe(true);
  });

  it("should return valid for index equal to totalItems", () => {
    const result = validateItemIndex(10, 10);
    expect(result.valid).toBe(true);
  });

  it("should return invalid for negative index", () => {
    const result = validateItemIndex(-1, 10);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Item index cannot be negative");
  });

  it("should return invalid for index exceeding totalItems", () => {
    const result = validateItemIndex(11, 10);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("exceeds curriculum size");
  });

  it("should handle empty curriculum", () => {
    const result = validateItemIndex(0, 0);
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// validateCompletedItems Tests
// ============================================================================

describe("validateCompletedItems", () => {
  it("should return valid for completedItems within bounds", () => {
    const result = validateCompletedItems(5, 10);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("should return valid for 0 completedItems", () => {
    const result = validateCompletedItems(0, 10);
    expect(result.valid).toBe(true);
  });

  it("should return valid for completedItems equal to totalItems", () => {
    const result = validateCompletedItems(10, 10);
    expect(result.valid).toBe(true);
  });

  it("should return invalid for negative completedItems", () => {
    const result = validateCompletedItems(-1, 10);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Completed items cannot be negative");
  });

  it("should return invalid for completedItems exceeding totalItems", () => {
    const result = validateCompletedItems(11, 10);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("cannot exceed total items");
  });
});

// ============================================================================
// buildProgressResponse Tests
// ============================================================================

describe("buildProgressResponse", () => {
  it("should build response for new follower", () => {
    const follow: FollowWithCurriculum = {
      id: "f1",
      userId: "u1",
      curriculumId: "c1",
      currentItemIndex: 0,
      completedItems: 0,
      startedAt: new Date("2024-01-15T10:00:00.000Z"),
      lastProgressAt: null,
      completedAt: null,
      curriculum: {
        id: "c1",
        title: "Test Curriculum",
        totalItems: 10,
        deletedAt: null,
      },
    };

    const response = buildProgressResponse(follow);

    expect(response.curriculumId).toBe("c1");
    expect(response.curriculumTitle).toBe("Test Curriculum");
    expect(response.userId).toBe("u1");
    expect(response.currentItemIndex).toBe(0);
    expect(response.completedItems).toBe(0);
    expect(response.totalItems).toBe(10);
    expect(response.percentComplete).toBe(0);
    expect(response.startedAt).toBe("2024-01-15T10:00:00.000Z");
    expect(response.lastProgressAt).toBeNull();
    expect(response.completedAt).toBeNull();
    expect(response.isComplete).toBe(false);
  });

  it("should build response for in-progress follower", () => {
    const follow: FollowWithCurriculum = {
      id: "f1",
      userId: "u1",
      curriculumId: "c1",
      currentItemIndex: 5,
      completedItems: 4,
      startedAt: new Date("2024-01-15T10:00:00.000Z"),
      lastProgressAt: new Date("2024-01-20T15:00:00.000Z"),
      completedAt: null,
      curriculum: {
        id: "c1",
        title: "Test Curriculum",
        totalItems: 10,
        deletedAt: null,
      },
    };

    const response = buildProgressResponse(follow);

    expect(response.currentItemIndex).toBe(5);
    expect(response.completedItems).toBe(4);
    expect(response.percentComplete).toBe(40);
    expect(response.lastProgressAt).toBe("2024-01-20T15:00:00.000Z");
    expect(response.isComplete).toBe(false);
  });

  it("should build response for completed curriculum", () => {
    const follow: FollowWithCurriculum = {
      id: "f1",
      userId: "u1",
      curriculumId: "c1",
      currentItemIndex: 10,
      completedItems: 10,
      startedAt: new Date("2024-01-15T10:00:00.000Z"),
      lastProgressAt: new Date("2024-02-01T12:00:00.000Z"),
      completedAt: new Date("2024-02-01T12:00:00.000Z"),
      curriculum: {
        id: "c1",
        title: "Test Curriculum",
        totalItems: 10,
        deletedAt: null,
      },
    };

    const response = buildProgressResponse(follow);

    expect(response.completedItems).toBe(10);
    expect(response.percentComplete).toBe(100);
    expect(response.completedAt).toBe("2024-02-01T12:00:00.000Z");
    expect(response.isComplete).toBe(true);
  });

  it("should handle empty curriculum", () => {
    const follow: FollowWithCurriculum = {
      id: "f1",
      userId: "u1",
      curriculumId: "c1",
      currentItemIndex: 0,
      completedItems: 0,
      startedAt: new Date("2024-01-15T10:00:00.000Z"),
      lastProgressAt: null,
      completedAt: null,
      curriculum: {
        id: "c1",
        title: "Empty Curriculum",
        totalItems: 0,
        deletedAt: null,
      },
    };

    const response = buildProgressResponse(follow);

    expect(response.totalItems).toBe(0);
    expect(response.percentComplete).toBe(0);
    expect(response.isComplete).toBe(false);
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
// Edge Cases Tests
// ============================================================================

describe("Edge cases", () => {
  it("should handle response with all dates populated", () => {
    const response: CurriculumProgressResponse = {
      curriculumId: "c1",
      curriculumTitle: "Test",
      userId: "u1",
      currentItemIndex: 10,
      completedItems: 10,
      totalItems: 10,
      percentComplete: 100,
      startedAt: "2024-01-01T00:00:00.000Z",
      lastProgressAt: "2024-02-01T00:00:00.000Z",
      completedAt: "2024-02-01T00:00:00.000Z",
      isComplete: true,
    };
    expect(response.lastProgressAt).not.toBeNull();
    expect(response.completedAt).not.toBeNull();
  });

  it("should handle update input with only one field", () => {
    const indexOnly: UpdateProgressInput = {
      currentItemIndex: 5,
    };
    expect(indexOnly.completedItems).toBeUndefined();

    const completedOnly: UpdateProgressInput = {
      completedItems: 3,
    };
    expect(completedOnly.currentItemIndex).toBeUndefined();
  });

  it("should validate boundary values correctly", () => {
    // Item index validation
    expect(validateItemIndex(0, 0).valid).toBe(true);
    expect(validateItemIndex(1, 0).valid).toBe(false);
    expect(validateItemIndex(100, 100).valid).toBe(true);
    expect(validateItemIndex(101, 100).valid).toBe(false);

    // Completed items validation
    expect(validateCompletedItems(0, 0).valid).toBe(true);
    expect(validateCompletedItems(100, 100).valid).toBe(true);
    expect(validateCompletedItems(101, 100).valid).toBe(false);
  });

  it("should calculate percentages correctly for various scenarios", () => {
    // Standard cases
    expect(calculatePercentComplete(0, 100)).toBe(0);
    expect(calculatePercentComplete(25, 100)).toBe(25);
    expect(calculatePercentComplete(50, 100)).toBe(50);
    expect(calculatePercentComplete(75, 100)).toBe(75);
    expect(calculatePercentComplete(100, 100)).toBe(100);

    // Rounding cases
    expect(calculatePercentComplete(1, 7)).toBe(14); // 14.28...
    expect(calculatePercentComplete(2, 7)).toBe(29); // 28.57...
    expect(calculatePercentComplete(3, 7)).toBe(43); // 42.85...
  });

  it("should handle isComplete correctly for edge cases", () => {
    // Edge: just under completion
    expect(isComplete(9, 10)).toBe(false);
    // Edge: exact completion
    expect(isComplete(10, 10)).toBe(true);
    // Edge: over completion (data anomaly)
    expect(isComplete(11, 10)).toBe(true);
  });
});

// ============================================================================
// Integration-style Tests
// ============================================================================

describe("Integration-style tests", () => {
  it("should validate and build response consistently", () => {
    // Validate curriculum ID
    const curriculumId = validateCurriculumId("  curr_123  ");
    expect(curriculumId).toBe("curr_123");

    // Ensure curriculumId is valid before using
    expect(curriculumId).not.toBeNull();
    const validId = curriculumId ?? "curr_123";

    // Create follow data
    const follow: FollowWithCurriculum = {
      id: "f1",
      userId: "u1",
      curriculumId: validId,
      currentItemIndex: 3,
      completedItems: 2,
      startedAt: new Date("2024-01-15T10:00:00.000Z"),
      lastProgressAt: new Date("2024-01-20T15:00:00.000Z"),
      completedAt: null,
      curriculum: {
        id: validId,
        title: "Test Curriculum",
        totalItems: 10,
        deletedAt: null,
      },
    };

    // Build response
    const response = buildProgressResponse(follow);

    // Verify consistency
    expect(response.curriculumId).toBe("curr_123");
    expect(response.percentComplete).toBe(20);
    expect(response.isComplete).toBe(false);
  });

  it("should correctly determine completion state through progress updates", () => {
    // Simulate progress through curriculum
    const totalItems = 5;

    // Step 1: Start (0 completed)
    expect(isComplete(0, totalItems)).toBe(false);
    expect(calculatePercentComplete(0, totalItems)).toBe(0);

    // Step 2: Progress (2 completed)
    expect(isComplete(2, totalItems)).toBe(false);
    expect(calculatePercentComplete(2, totalItems)).toBe(40);

    // Step 3: Almost done (4 completed)
    expect(isComplete(4, totalItems)).toBe(false);
    expect(calculatePercentComplete(4, totalItems)).toBe(80);

    // Step 4: Complete (5 completed)
    expect(isComplete(5, totalItems)).toBe(true);
    expect(calculatePercentComplete(5, totalItems)).toBe(100);
  });

  it("should validate input before allowing progress update", () => {
    const totalItems = 10;

    // Valid progress update
    const validInput = { currentItemIndex: 5, completedItems: 4 };
    const schemaResult = updateProgressSchema.safeParse(validInput);
    expect(schemaResult.success).toBe(true);

    if (schemaResult.success) {
      const { currentItemIndex, completedItems } = schemaResult.data;

      // Validate against curriculum bounds
      if (currentItemIndex !== undefined) {
        const indexValid = validateItemIndex(currentItemIndex, totalItems);
        expect(indexValid.valid).toBe(true);
      }

      if (completedItems !== undefined) {
        const completedValid = validateCompletedItems(
          completedItems,
          totalItems
        );
        expect(completedValid.valid).toBe(true);
      }
    }

    // Invalid progress update (exceeds bounds)
    const invalidInput = { currentItemIndex: 15 };
    const invalidSchemaResult = updateProgressSchema.safeParse(invalidInput);
    expect(invalidSchemaResult.success).toBe(true); // Schema passes

    if (invalidSchemaResult.success) {
      const { currentItemIndex } = invalidSchemaResult.data;
      if (currentItemIndex !== undefined) {
        const indexValid = validateItemIndex(currentItemIndex, totalItems);
        expect(indexValid.valid).toBe(false); // But validation against curriculum fails
      }
    }
  });

  it("should handle curriculum state transitions correctly", () => {
    // Test state: Not started -> In progress -> Completed -> Uncompleted

    // Not started
    let completedItems = 0;
    const totalItems = 3;
    expect(isComplete(completedItems, totalItems)).toBe(false);

    // Progress to 1
    completedItems = 1;
    expect(isComplete(completedItems, totalItems)).toBe(false);

    // Progress to 2
    completedItems = 2;
    expect(isComplete(completedItems, totalItems)).toBe(false);

    // Complete (3)
    completedItems = 3;
    expect(isComplete(completedItems, totalItems)).toBe(true);

    // User marks one as incomplete (back to 2)
    completedItems = 2;
    expect(isComplete(completedItems, totalItems)).toBe(false);
  });
});
