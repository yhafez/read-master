/**
 * Tests for GET/PUT /api/reading/progress endpoint
 *
 * Tests cover:
 * - Helper function unit tests (formatReadTime, formatProgressResponse, calculateAchievementXp)
 * - Constants validation
 * - Schema validation
 * - Response formatting
 */

import { describe, it, expect } from "vitest";
import {
  BOOK_COMPLETION_XP,
  COMPLETION_THRESHOLD,
  getReadingProgressSchema,
  formatReadTime,
  formatProgressResponse,
  calculateAchievementXp,
  type AchievementData,
} from "./progress.js";
import { updateReadingProgressSchema } from "@read-master/shared/schemas";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Reading Progress Constants", () => {
  describe("BOOK_COMPLETION_XP", () => {
    it("should be 100 XP for completing a book", () => {
      expect(BOOK_COMPLETION_XP).toBe(100);
    });

    it("should be a positive number", () => {
      expect(BOOK_COMPLETION_XP).toBeGreaterThan(0);
    });
  });

  describe("COMPLETION_THRESHOLD", () => {
    it("should be 100 percent", () => {
      expect(COMPLETION_THRESHOLD).toBe(100);
    });

    it("should be between 0 and 100", () => {
      expect(COMPLETION_THRESHOLD).toBeGreaterThanOrEqual(0);
      expect(COMPLETION_THRESHOLD).toBeLessThanOrEqual(100);
    });
  });
});

// ============================================================================
// formatReadTime Tests
// ============================================================================

describe("formatReadTime", () => {
  describe("seconds only", () => {
    it("should format 0 seconds", () => {
      expect(formatReadTime(0)).toBe("0s");
    });

    it("should format 1 second", () => {
      expect(formatReadTime(1)).toBe("1s");
    });

    it("should format 30 seconds", () => {
      expect(formatReadTime(30)).toBe("30s");
    });

    it("should format 59 seconds", () => {
      expect(formatReadTime(59)).toBe("59s");
    });
  });

  describe("minutes", () => {
    it("should format 1 minute (60 seconds)", () => {
      expect(formatReadTime(60)).toBe("1m");
    });

    it("should format 1 minute 30 seconds", () => {
      expect(formatReadTime(90)).toBe("1m 30s");
    });

    it("should format 5 minutes", () => {
      expect(formatReadTime(300)).toBe("5m");
    });

    it("should format 59 minutes 59 seconds", () => {
      expect(formatReadTime(3599)).toBe("59m 59s");
    });

    it("should format 30 minutes", () => {
      expect(formatReadTime(1800)).toBe("30m");
    });
  });

  describe("hours", () => {
    it("should format 1 hour (3600 seconds)", () => {
      expect(formatReadTime(3600)).toBe("1h");
    });

    it("should format 1 hour 30 minutes", () => {
      expect(formatReadTime(5400)).toBe("1h 30m");
    });

    it("should format 2 hours", () => {
      expect(formatReadTime(7200)).toBe("2h");
    });

    it("should format 10 hours 15 minutes", () => {
      expect(formatReadTime(36900)).toBe("10h 15m");
    });

    it("should format 24 hours", () => {
      expect(formatReadTime(86400)).toBe("24h");
    });

    it("should format large time values (100 hours)", () => {
      expect(formatReadTime(360000)).toBe("100h");
    });
  });

  describe("edge cases", () => {
    it("should handle exactly 60 seconds", () => {
      expect(formatReadTime(60)).toBe("1m");
    });

    it("should handle exactly 3600 seconds", () => {
      expect(formatReadTime(3600)).toBe("1h");
    });

    it("should handle 1 hour and 1 second (ignores seconds)", () => {
      expect(formatReadTime(3601)).toBe("1h");
    });

    it("should handle very large values", () => {
      expect(formatReadTime(1000000)).toBe("277h 46m");
    });
  });
});

// ============================================================================
// formatProgressResponse Tests
// ============================================================================

describe("formatProgressResponse", () => {
  const baseProgress = {
    id: "progress-123",
    bookId: "book-456",
    userId: "user-789",
    currentPosition: 5000,
    percentage: 25.5,
    totalReadTime: 3600,
    averageWpm: 250,
    lastReadAt: new Date("2024-01-15T10:30:00Z"),
    startedAt: new Date("2024-01-01T00:00:00Z"),
    completedAt: null,
  };

  describe("basic response formatting", () => {
    it("should format all basic fields correctly", () => {
      const response = formatProgressResponse(baseProgress);

      expect(response.id).toBe("progress-123");
      expect(response.bookId).toBe("book-456");
      expect(response.userId).toBe("user-789");
      expect(response.currentPosition).toBe(5000);
      expect(response.percentage).toBe(25.5);
      expect(response.totalReadTime).toBe(3600);
      expect(response.averageWpm).toBe(250);
    });

    it("should format dates as ISO strings", () => {
      const response = formatProgressResponse(baseProgress);

      expect(response.lastReadAt).toBe("2024-01-15T10:30:00.000Z");
      expect(response.startedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("should set isCompleted to false when completedAt is null", () => {
      const response = formatProgressResponse(baseProgress);
      expect(response.isCompleted).toBe(false);
      expect(response.completedAt).toBeNull();
    });

    it("should format totalReadTimeFormatted correctly", () => {
      const response = formatProgressResponse(baseProgress);
      expect(response.totalReadTimeFormatted).toBe("1h");
    });
  });

  describe("completed progress", () => {
    it("should set isCompleted to true when completedAt is set", () => {
      const completedProgress = {
        ...baseProgress,
        percentage: 100,
        completedAt: new Date("2024-01-20T15:00:00Z"),
      };

      const response = formatProgressResponse(completedProgress);

      expect(response.isCompleted).toBe(true);
      expect(response.completedAt).toBe("2024-01-20T15:00:00.000Z");
    });
  });

  describe("null values", () => {
    it("should handle null lastReadAt", () => {
      const progressWithNullLastRead = {
        ...baseProgress,
        lastReadAt: null,
      };

      const response = formatProgressResponse(progressWithNullLastRead);
      expect(response.lastReadAt).toBeNull();
    });

    it("should handle null averageWpm", () => {
      const progressWithNullWpm = {
        ...baseProgress,
        averageWpm: null,
      };

      const response = formatProgressResponse(progressWithNullWpm);
      expect(response.averageWpm).toBeNull();
    });
  });

  describe("additional data", () => {
    it("should include xpAwarded when provided", () => {
      const response = formatProgressResponse(baseProgress, { xpAwarded: 100 });
      expect(response.xpAwarded).toBe(100);
    });

    it("should include bookCompleted when provided", () => {
      const response = formatProgressResponse(baseProgress, {
        bookCompleted: true,
      });
      expect(response.bookCompleted).toBe(true);
    });

    it("should include newAchievements when provided", () => {
      const achievements: AchievementData[] = [
        { id: "ach-1", code: "FIRST_BOOK", name: "First Book", xpReward: 50 },
      ];

      const response = formatProgressResponse(baseProgress, {
        newAchievements: achievements,
      });

      expect(response.newAchievements).toEqual(achievements);
    });

    it("should not include optional fields when not provided", () => {
      const response = formatProgressResponse(baseProgress);

      expect(response.xpAwarded).toBeUndefined();
      expect(response.bookCompleted).toBeUndefined();
      expect(response.newAchievements).toBeUndefined();
    });

    it("should include all additional data when provided", () => {
      const achievements: AchievementData[] = [
        { id: "ach-1", code: "FIRST_BOOK", name: "First Book", xpReward: 50 },
        {
          id: "ach-2",
          code: "READING_STREAK_7",
          name: "Week Streak",
          xpReward: 25,
        },
      ];

      const response = formatProgressResponse(baseProgress, {
        xpAwarded: 175,
        bookCompleted: true,
        newAchievements: achievements,
      });

      expect(response.xpAwarded).toBe(175);
      expect(response.bookCompleted).toBe(true);
      expect(response.newAchievements).toHaveLength(2);
    });
  });

  describe("edge cases", () => {
    it("should handle zero values", () => {
      const zeroProgress = {
        ...baseProgress,
        currentPosition: 0,
        percentage: 0,
        totalReadTime: 0,
        averageWpm: null,
      };

      const response = formatProgressResponse(zeroProgress);

      expect(response.currentPosition).toBe(0);
      expect(response.percentage).toBe(0);
      expect(response.totalReadTime).toBe(0);
      expect(response.totalReadTimeFormatted).toBe("0s");
    });

    it("should handle 100% completion", () => {
      const fullProgress = {
        ...baseProgress,
        percentage: 100,
        completedAt: new Date("2024-01-20T15:00:00Z"),
      };

      const response = formatProgressResponse(fullProgress);

      expect(response.percentage).toBe(100);
      expect(response.isCompleted).toBe(true);
    });

    it("should handle very long read times", () => {
      const longReadProgress = {
        ...baseProgress,
        totalReadTime: 360000, // 100 hours
      };

      const response = formatProgressResponse(longReadProgress);

      expect(response.totalReadTime).toBe(360000);
      expect(response.totalReadTimeFormatted).toBe("100h");
    });
  });
});

// ============================================================================
// calculateAchievementXp Tests
// ============================================================================

describe("calculateAchievementXp", () => {
  describe("basic calculations", () => {
    it("should return 0 for empty array", () => {
      expect(calculateAchievementXp([])).toBe(0);
    });

    it("should return single achievement XP", () => {
      const achievements: AchievementData[] = [
        { id: "1", code: "FIRST", name: "First", xpReward: 50 },
      ];
      expect(calculateAchievementXp(achievements)).toBe(50);
    });

    it("should sum multiple achievement XPs", () => {
      const achievements: AchievementData[] = [
        { id: "1", code: "FIRST", name: "First", xpReward: 50 },
        { id: "2", code: "SECOND", name: "Second", xpReward: 25 },
        { id: "3", code: "THIRD", name: "Third", xpReward: 100 },
      ];
      expect(calculateAchievementXp(achievements)).toBe(175);
    });
  });

  describe("edge cases", () => {
    it("should handle zero XP rewards", () => {
      const achievements: AchievementData[] = [
        { id: "1", code: "ZERO", name: "Zero XP", xpReward: 0 },
      ];
      expect(calculateAchievementXp(achievements)).toBe(0);
    });

    it("should handle mixed zero and non-zero XP", () => {
      const achievements: AchievementData[] = [
        { id: "1", code: "FIRST", name: "First", xpReward: 50 },
        { id: "2", code: "ZERO", name: "Zero", xpReward: 0 },
        { id: "3", code: "THIRD", name: "Third", xpReward: 25 },
      ];
      expect(calculateAchievementXp(achievements)).toBe(75);
    });

    it("should handle large XP values", () => {
      const achievements: AchievementData[] = [
        { id: "1", code: "BIG", name: "Big", xpReward: 10000 },
        { id: "2", code: "BIGGER", name: "Bigger", xpReward: 50000 },
      ];
      expect(calculateAchievementXp(achievements)).toBe(60000);
    });

    it("should handle many achievements", () => {
      const achievements: AchievementData[] = Array.from(
        { length: 100 },
        (_, i) => ({
          id: `${i}`,
          code: `ACH_${i}`,
          name: `Achievement ${i}`,
          xpReward: 10,
        })
      );
      expect(calculateAchievementXp(achievements)).toBe(1000);
    });
  });

  describe("real-world scenarios", () => {
    it("should calculate XP for reading milestones", () => {
      const achievements: AchievementData[] = [
        { id: "1", code: "FIRST_BOOK", name: "First Book", xpReward: 100 },
        {
          id: "2",
          code: "BOOKWORM",
          name: "Bookworm (10 books)",
          xpReward: 500,
        },
      ];
      expect(calculateAchievementXp(achievements)).toBe(600);
    });

    it("should calculate XP for streak achievements", () => {
      const achievements: AchievementData[] = [
        { id: "1", code: "STREAK_7", name: "7 Day Streak", xpReward: 50 },
        { id: "2", code: "STREAK_30", name: "30 Day Streak", xpReward: 200 },
        { id: "3", code: "STREAK_100", name: "100 Day Streak", xpReward: 1000 },
      ];
      expect(calculateAchievementXp(achievements)).toBe(1250);
    });
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export AchievementData type", () => {
    const achievement: AchievementData = {
      id: "test",
      code: "TEST",
      name: "Test Achievement",
      xpReward: 50,
    };

    expect(achievement.id).toBe("test");
    expect(achievement.code).toBe("TEST");
    expect(achievement.name).toBe("Test Achievement");
    expect(achievement.xpReward).toBe(50);
  });
});

// ============================================================================
// Schema Tests
// ============================================================================

describe("getReadingProgressSchema", () => {
  // Valid CUID format for tests
  const validBookId = "clbook1234567890abcdef";

  describe("valid inputs", () => {
    it("should accept valid bookId", () => {
      const result = getReadingProgressSchema.safeParse({
        bookId: validBookId,
      });
      expect(result.success).toBe(true);
    });

    it("should accept bookId with valid CUID format", () => {
      // Note: bookIdSchema validates CUID format (starts with 'c', lowercase alphanumeric)
      // It doesn't trim, so this test verifies the schema accepts valid format
      const result = getReadingProgressSchema.safeParse({
        bookId: "clxyz9876543210fedcba",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject missing bookId", () => {
      const result = getReadingProgressSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject empty bookId", () => {
      const result = getReadingProgressSchema.safeParse({
        bookId: "",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("updateReadingProgressSchema", () => {
  // Valid CUID format for tests
  const validBookId = "clbook1234567890abcdef";

  describe("valid inputs", () => {
    it("should accept full update", () => {
      const result = updateReadingProgressSchema.safeParse({
        bookId: validBookId,
        currentPosition: 5000,
        percentage: 25.5,
        sessionDuration: 300,
        averageWpm: 250,
      });
      expect(result.success).toBe(true);
    });

    it("should accept position only update", () => {
      const result = updateReadingProgressSchema.safeParse({
        bookId: validBookId,
        currentPosition: 5000,
      });
      expect(result.success).toBe(true);
    });

    it("should accept percentage only update", () => {
      const result = updateReadingProgressSchema.safeParse({
        bookId: validBookId,
        percentage: 50,
      });
      expect(result.success).toBe(true);
    });

    it("should accept session duration only update", () => {
      const result = updateReadingProgressSchema.safeParse({
        bookId: validBookId,
        sessionDuration: 600,
      });
      expect(result.success).toBe(true);
    });

    it("should accept 100% completion", () => {
      const result = updateReadingProgressSchema.safeParse({
        bookId: validBookId,
        percentage: 100,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject missing bookId", () => {
      const result = updateReadingProgressSchema.safeParse({
        currentPosition: 5000,
      });
      expect(result.success).toBe(false);
    });

    it("should reject no progress fields", () => {
      const result = updateReadingProgressSchema.safeParse({
        bookId: validBookId,
      });
      expect(result.success).toBe(false);
    });

    it("should reject only averageWpm without other fields", () => {
      const result = updateReadingProgressSchema.safeParse({
        bookId: validBookId,
        averageWpm: 250,
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative position", () => {
      const result = updateReadingProgressSchema.safeParse({
        bookId: validBookId,
        currentPosition: -1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject percentage over 100", () => {
      const result = updateReadingProgressSchema.safeParse({
        bookId: validBookId,
        percentage: 101,
      });
      expect(result.success).toBe(false);
    });

    it("should reject session duration over 1 hour", () => {
      const result = updateReadingProgressSchema.safeParse({
        bookId: validBookId,
        sessionDuration: 3601,
      });
      expect(result.success).toBe(false);
    });

    it("should reject WPM over 2000", () => {
      const result = updateReadingProgressSchema.safeParse({
        bookId: validBookId,
        currentPosition: 100,
        averageWpm: 2001,
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid bookId format", () => {
      const result = updateReadingProgressSchema.safeParse({
        bookId: "invalid-book-id",
        currentPosition: 100,
      });
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// Integration Tests (Pure Functions)
// ============================================================================

describe("Integration - Progress Response with Achievements", () => {
  it("should format complete response with achievements and XP", () => {
    const progress = {
      id: "prog-1",
      bookId: "book-1",
      userId: "user-1",
      currentPosition: 50000,
      percentage: 100,
      totalReadTime: 7200,
      averageWpm: 300,
      lastReadAt: new Date("2024-01-20T12:00:00Z"),
      startedAt: new Date("2024-01-01T08:00:00Z"),
      completedAt: new Date("2024-01-20T12:00:00Z"),
    };

    const achievements: AchievementData[] = [
      { id: "1", code: "FIRST_BOOK", name: "First Book", xpReward: 100 },
      { id: "2", code: "SPEED_READER", name: "Speed Reader", xpReward: 75 },
    ];

    const totalXp = BOOK_COMPLETION_XP + calculateAchievementXp(achievements);

    const response = formatProgressResponse(progress, {
      xpAwarded: totalXp,
      bookCompleted: true,
      newAchievements: achievements,
    });

    expect(response.isCompleted).toBe(true);
    expect(response.xpAwarded).toBe(275); // 100 base + 100 + 75 achievements
    expect(response.bookCompleted).toBe(true);
    expect(response.newAchievements).toHaveLength(2);
    expect(response.totalReadTimeFormatted).toBe("2h");
  });

  it("should handle first-time reader scenario", () => {
    const progress = {
      id: "prog-new",
      bookId: "book-new",
      userId: "user-new",
      currentPosition: 0,
      percentage: 0,
      totalReadTime: 0,
      averageWpm: null,
      lastReadAt: new Date(),
      startedAt: new Date(),
      completedAt: null,
    };

    const response = formatProgressResponse(progress);

    expect(response.currentPosition).toBe(0);
    expect(response.percentage).toBe(0);
    expect(response.isCompleted).toBe(false);
    expect(response.totalReadTimeFormatted).toBe("0s");
    expect(response.xpAwarded).toBeUndefined();
    expect(response.newAchievements).toBeUndefined();
  });
});
