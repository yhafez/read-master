/**
 * Tests for GET /api/flashcards/stats endpoint
 */

import { describe, it, expect } from "vitest";
import {
  statsQuerySchema,
  calculateRetentionRate,
  calculateStreak,
  isMastered,
  buildReviewHistory,
  getStartOfDayUTC,
  formatDateString,
  DEFAULT_HISTORY_DAYS,
  MAX_HISTORY_DAYS,
  MIN_HISTORY_DAYS,
  FLASHCARD_STATUSES,
} from "./stats.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have correct default history days", () => {
    expect(DEFAULT_HISTORY_DAYS).toBe(30);
  });

  it("should have correct max history days", () => {
    expect(MAX_HISTORY_DAYS).toBe(365);
  });

  it("should have correct min history days", () => {
    expect(MIN_HISTORY_DAYS).toBe(1);
  });

  it("should have all flashcard statuses", () => {
    expect(FLASHCARD_STATUSES).toEqual([
      "NEW",
      "LEARNING",
      "REVIEW",
      "SUSPENDED",
    ]);
  });
});

// ============================================================================
// getStartOfDayUTC Tests
// ============================================================================

describe("getStartOfDayUTC", () => {
  it("should return midnight UTC for a given date", () => {
    const date = new Date("2024-03-15T14:30:00.000Z");
    const result = getStartOfDayUTC(date);

    expect(result.toISOString()).toBe("2024-03-15T00:00:00.000Z");
  });

  it("should handle dates at midnight", () => {
    const date = new Date("2024-03-15T00:00:00.000Z");
    const result = getStartOfDayUTC(date);

    expect(result.toISOString()).toBe("2024-03-15T00:00:00.000Z");
  });

  it("should handle dates at end of day", () => {
    const date = new Date("2024-03-15T23:59:59.999Z");
    const result = getStartOfDayUTC(date);

    expect(result.toISOString()).toBe("2024-03-15T00:00:00.000Z");
  });

  it("should handle month boundaries", () => {
    const date = new Date("2024-01-31T15:00:00.000Z");
    const result = getStartOfDayUTC(date);

    expect(result.toISOString()).toBe("2024-01-31T00:00:00.000Z");
  });

  it("should handle year boundaries", () => {
    const date = new Date("2024-12-31T23:59:59.999Z");
    const result = getStartOfDayUTC(date);

    expect(result.toISOString()).toBe("2024-12-31T00:00:00.000Z");
  });
});

// ============================================================================
// formatDateString Tests
// ============================================================================

describe("formatDateString", () => {
  it("should format date as YYYY-MM-DD", () => {
    const date = new Date("2024-03-15T14:30:00.000Z");
    const result = formatDateString(date);

    expect(result).toBe("2024-03-15");
  });

  it("should pad single digit months", () => {
    const date = new Date("2024-01-05T00:00:00.000Z");
    const result = formatDateString(date);

    expect(result).toBe("2024-01-05");
  });

  it("should pad single digit days", () => {
    const date = new Date("2024-12-01T00:00:00.000Z");
    const result = formatDateString(date);

    expect(result).toBe("2024-12-01");
  });
});

// ============================================================================
// calculateRetentionRate Tests
// ============================================================================

describe("calculateRetentionRate", () => {
  it("should return 0 for zero total reviews", () => {
    const result = calculateRetentionRate(0, 0);
    expect(result).toBe(0);
  });

  it("should return 100 for all correct reviews", () => {
    const result = calculateRetentionRate(10, 10);
    expect(result).toBe(100);
  });

  it("should return 0 for all incorrect reviews", () => {
    const result = calculateRetentionRate(0, 10);
    expect(result).toBe(0);
  });

  it("should calculate correct percentage for mixed reviews", () => {
    const result = calculateRetentionRate(7, 10);
    expect(result).toBe(70);
  });

  it("should round to 2 decimal places", () => {
    const result = calculateRetentionRate(1, 3);
    expect(result).toBe(33.33);
  });

  it("should handle large numbers", () => {
    const result = calculateRetentionRate(850, 1000);
    expect(result).toBe(85);
  });

  it("should handle very small retention rates", () => {
    const result = calculateRetentionRate(1, 1000);
    expect(result).toBe(0.1);
  });
});

// ============================================================================
// isMastered Tests
// ============================================================================

describe("isMastered", () => {
  it("should return true for 5 repetitions and 21 day interval", () => {
    expect(isMastered(5, 21)).toBe(true);
  });

  it("should return true for more than 5 repetitions and more than 21 days", () => {
    expect(isMastered(10, 60)).toBe(true);
  });

  it("should return false for less than 5 repetitions", () => {
    expect(isMastered(4, 30)).toBe(false);
  });

  it("should return false for less than 21 day interval", () => {
    expect(isMastered(10, 20)).toBe(false);
  });

  it("should return false for both below threshold", () => {
    expect(isMastered(3, 14)).toBe(false);
  });

  it("should return false for 0 repetitions", () => {
    expect(isMastered(0, 0)).toBe(false);
  });

  it("should return true for exactly at thresholds", () => {
    expect(isMastered(5, 21)).toBe(true);
  });
});

// ============================================================================
// calculateStreak Tests
// ============================================================================

describe("calculateStreak", () => {
  const referenceDate = new Date("2024-03-15T12:00:00.000Z");

  it("should return zeros for empty review dates", () => {
    const result = calculateStreak([], referenceDate);

    expect(result.current).toBe(0);
    expect(result.longest).toBe(0);
    expect(result.lastReviewDate).toBe(null);
  });

  it("should return 1 for single review today", () => {
    const reviews = [new Date("2024-03-15T10:00:00.000Z")];
    const result = calculateStreak(reviews, referenceDate);

    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
    expect(result.lastReviewDate).toBe("2024-03-15");
  });

  it("should return 1 for single review yesterday", () => {
    const reviews = [new Date("2024-03-14T10:00:00.000Z")];
    const result = calculateStreak(reviews, referenceDate);

    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
    expect(result.lastReviewDate).toBe("2024-03-14");
  });

  it("should return 0 current streak for review 2 days ago", () => {
    const reviews = [new Date("2024-03-13T10:00:00.000Z")];
    const result = calculateStreak(reviews, referenceDate);

    expect(result.current).toBe(0);
    expect(result.longest).toBe(1);
    expect(result.lastReviewDate).toBe("2024-03-13");
  });

  it("should calculate consecutive day streak", () => {
    const reviews = [
      new Date("2024-03-15T10:00:00.000Z"),
      new Date("2024-03-14T15:00:00.000Z"),
      new Date("2024-03-13T08:00:00.000Z"),
    ];
    const result = calculateStreak(reviews, referenceDate);

    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
    expect(result.lastReviewDate).toBe("2024-03-15");
  });

  it("should handle gap in streak", () => {
    const reviews = [
      new Date("2024-03-15T10:00:00.000Z"),
      new Date("2024-03-14T10:00:00.000Z"),
      // Gap on 2024-03-13
      new Date("2024-03-12T10:00:00.000Z"),
      new Date("2024-03-11T10:00:00.000Z"),
    ];
    const result = calculateStreak(reviews, referenceDate);

    expect(result.current).toBe(2);
    expect(result.longest).toBe(2);
  });

  it("should count multiple reviews on same day as one", () => {
    const reviews = [
      new Date("2024-03-15T10:00:00.000Z"),
      new Date("2024-03-15T11:00:00.000Z"),
      new Date("2024-03-15T12:00:00.000Z"),
      new Date("2024-03-14T10:00:00.000Z"),
    ];
    const result = calculateStreak(reviews, referenceDate);

    expect(result.current).toBe(2);
    expect(result.longest).toBe(2);
  });

  it("should calculate longest streak in past", () => {
    const reviews = [
      new Date("2024-03-15T10:00:00.000Z"), // Today - current = 1
      // Gap
      new Date("2024-03-10T10:00:00.000Z"), // 5-day streak in past
      new Date("2024-03-09T10:00:00.000Z"),
      new Date("2024-03-08T10:00:00.000Z"),
      new Date("2024-03-07T10:00:00.000Z"),
      new Date("2024-03-06T10:00:00.000Z"),
    ];
    const result = calculateStreak(reviews, referenceDate);

    expect(result.current).toBe(1);
    expect(result.longest).toBe(5);
  });

  it("should handle unsorted review dates", () => {
    const reviews = [
      new Date("2024-03-13T10:00:00.000Z"),
      new Date("2024-03-15T10:00:00.000Z"),
      new Date("2024-03-14T10:00:00.000Z"),
    ];
    const result = calculateStreak(reviews, referenceDate);

    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
    expect(result.lastReviewDate).toBe("2024-03-15");
  });

  it("should handle long streaks", () => {
    const reviews: Date[] = [];
    // Create a 30-day streak ending today
    for (let i = 0; i < 30; i++) {
      const date = new Date(referenceDate);
      date.setUTCDate(date.getUTCDate() - i);
      reviews.push(date);
    }
    const result = calculateStreak(reviews, referenceDate);

    expect(result.current).toBe(30);
    expect(result.longest).toBe(30);
  });
});

// ============================================================================
// buildReviewHistory Tests
// ============================================================================

describe("buildReviewHistory", () => {
  const referenceDate = new Date("2024-03-15T12:00:00.000Z");

  it("should return empty array for 0 days", () => {
    const result = buildReviewHistory([], 0, referenceDate);
    expect(result).toEqual([]);
  });

  it("should return all zeros for no reviews", () => {
    const result = buildReviewHistory([], 3, referenceDate);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      date: "2024-03-13",
      reviewed: 0,
      correct: 0,
      incorrect: 0,
    });
    expect(result[1]).toEqual({
      date: "2024-03-14",
      reviewed: 0,
      correct: 0,
      incorrect: 0,
    });
    expect(result[2]).toEqual({
      date: "2024-03-15",
      reviewed: 0,
      correct: 0,
      incorrect: 0,
    });
  });

  it("should count reviews correctly", () => {
    const reviews = [
      { reviewedAt: new Date("2024-03-15T10:00:00.000Z"), rating: 4 },
      { reviewedAt: new Date("2024-03-15T11:00:00.000Z"), rating: 3 },
      { reviewedAt: new Date("2024-03-15T12:00:00.000Z"), rating: 2 },
    ];
    const result = buildReviewHistory(reviews, 1, referenceDate);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: "2024-03-15",
      reviewed: 3,
      correct: 2,
      incorrect: 1,
    });
  });

  it("should classify ratings 3-4 as correct", () => {
    const reviews = [
      { reviewedAt: new Date("2024-03-15T10:00:00.000Z"), rating: 3 },
      { reviewedAt: new Date("2024-03-15T11:00:00.000Z"), rating: 4 },
    ];
    const result = buildReviewHistory(reviews, 1, referenceDate);

    expect(result).toHaveLength(1);
    expect(result[0]?.correct).toBe(2);
    expect(result[0]?.incorrect).toBe(0);
  });

  it("should classify ratings 1-2 as incorrect", () => {
    const reviews = [
      { reviewedAt: new Date("2024-03-15T10:00:00.000Z"), rating: 1 },
      { reviewedAt: new Date("2024-03-15T11:00:00.000Z"), rating: 2 },
    ];
    const result = buildReviewHistory(reviews, 1, referenceDate);

    expect(result).toHaveLength(1);
    expect(result[0]?.correct).toBe(0);
    expect(result[0]?.incorrect).toBe(2);
  });

  it("should distribute reviews across days", () => {
    const reviews = [
      { reviewedAt: new Date("2024-03-15T10:00:00.000Z"), rating: 4 },
      { reviewedAt: new Date("2024-03-14T10:00:00.000Z"), rating: 3 },
      { reviewedAt: new Date("2024-03-14T11:00:00.000Z"), rating: 2 },
      { reviewedAt: new Date("2024-03-13T10:00:00.000Z"), rating: 1 },
    ];
    const result = buildReviewHistory(reviews, 3, referenceDate);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      date: "2024-03-13",
      reviewed: 1,
      correct: 0,
      incorrect: 1,
    });
    expect(result[1]).toEqual({
      date: "2024-03-14",
      reviewed: 2,
      correct: 1,
      incorrect: 1,
    });
    expect(result[2]).toEqual({
      date: "2024-03-15",
      reviewed: 1,
      correct: 1,
      incorrect: 0,
    });
  });

  it("should ignore reviews outside the date range", () => {
    const reviews = [
      { reviewedAt: new Date("2024-03-15T10:00:00.000Z"), rating: 4 },
      { reviewedAt: new Date("2024-03-10T10:00:00.000Z"), rating: 3 }, // Outside range
    ];
    const result = buildReviewHistory(reviews, 3, referenceDate);

    expect(result).toHaveLength(3);
    // Only the review from 2024-03-15 should be counted
    const totalReviewed = result.reduce((sum, r) => sum + r.reviewed, 0);
    expect(totalReviewed).toBe(1);
  });

  it("should handle 30 day history", () => {
    const reviews = [
      { reviewedAt: new Date("2024-03-15T10:00:00.000Z"), rating: 4 },
      { reviewedAt: new Date("2024-03-01T10:00:00.000Z"), rating: 3 },
    ];
    const result = buildReviewHistory(reviews, 30, referenceDate);

    expect(result).toHaveLength(30);
    expect(result[0]?.date).toBe("2024-02-15");
    expect(result[29]?.date).toBe("2024-03-15");
  });

  it("should sort days in ascending order", () => {
    const reviews: Array<{ reviewedAt: Date; rating: number }> = [];
    const result = buildReviewHistory(reviews, 5, referenceDate);

    expect(result).toHaveLength(5);
    expect(result[0]?.date).toBe("2024-03-11");
    expect(result[4]?.date).toBe("2024-03-15");

    // Verify ascending order
    for (let i = 1; i < result.length; i++) {
      const current = result[i];
      const previous = result[i - 1];
      if (current && previous) {
        expect(current.date > previous.date).toBe(true);
      }
    }
  });
});

// ============================================================================
// statsQuerySchema Tests
// ============================================================================

describe("statsQuerySchema", () => {
  it("should accept empty query", () => {
    const result = statsQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days).toBe(DEFAULT_HISTORY_DAYS);
      expect(result.data.bookId).toBeUndefined();
    }
  });

  it("should accept valid bookId", () => {
    const result = statsQuerySchema.safeParse({
      bookId: "cm123abc456def789ghi0jk",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bookId).toBe("cm123abc456def789ghi0jk");
    }
  });

  it("should reject invalid bookId format", () => {
    const result = statsQuerySchema.safeParse({
      bookId: "invalid-id",
    });

    expect(result.success).toBe(false);
  });

  it("should accept valid days as number", () => {
    const result = statsQuerySchema.safeParse({
      days: 7,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days).toBe(7);
    }
  });

  it("should coerce days from string", () => {
    const result = statsQuerySchema.safeParse({
      days: "14",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days).toBe(14);
    }
  });

  it("should reject days below minimum", () => {
    const result = statsQuerySchema.safeParse({
      days: 0,
    });

    expect(result.success).toBe(false);
  });

  it("should reject days above maximum", () => {
    const result = statsQuerySchema.safeParse({
      days: 400,
    });

    expect(result.success).toBe(false);
  });

  it("should accept minimum days", () => {
    const result = statsQuerySchema.safeParse({
      days: MIN_HISTORY_DAYS,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days).toBe(MIN_HISTORY_DAYS);
    }
  });

  it("should accept maximum days", () => {
    const result = statsQuerySchema.safeParse({
      days: MAX_HISTORY_DAYS,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days).toBe(MAX_HISTORY_DAYS);
    }
  });

  it("should reject non-integer days", () => {
    const result = statsQuerySchema.safeParse({
      days: 7.5,
    });

    expect(result.success).toBe(false);
  });

  it("should accept both bookId and days", () => {
    const result = statsQuerySchema.safeParse({
      bookId: "cm123abc456def789ghi0jk",
      days: 60,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bookId).toBe("cm123abc456def789ghi0jk");
      expect(result.data.days).toBe(60);
    }
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Integration tests", () => {
  it("should calculate stats correctly for a realistic scenario", () => {
    // Simulate 7 days of review history
    const today = new Date("2024-03-15T12:00:00.000Z");
    const reviews = [
      // Today - 5 reviews
      { reviewedAt: new Date("2024-03-15T10:00:00.000Z"), rating: 4 },
      { reviewedAt: new Date("2024-03-15T11:00:00.000Z"), rating: 3 },
      { reviewedAt: new Date("2024-03-15T12:00:00.000Z"), rating: 2 },
      { reviewedAt: new Date("2024-03-15T13:00:00.000Z"), rating: 4 },
      { reviewedAt: new Date("2024-03-15T14:00:00.000Z"), rating: 1 },
      // Yesterday - 3 reviews
      { reviewedAt: new Date("2024-03-14T10:00:00.000Z"), rating: 3 },
      { reviewedAt: new Date("2024-03-14T11:00:00.000Z"), rating: 4 },
      { reviewedAt: new Date("2024-03-14T12:00:00.000Z"), rating: 3 },
      // 2 days ago - 2 reviews
      { reviewedAt: new Date("2024-03-13T10:00:00.000Z"), rating: 2 },
      { reviewedAt: new Date("2024-03-13T11:00:00.000Z"), rating: 2 },
    ];

    // Build history
    const history = buildReviewHistory(reviews, 7, today);
    expect(history).toHaveLength(7);

    // Verify today's stats
    const todayEntry = history.find((h) => h.date === "2024-03-15");
    expect(todayEntry).toEqual({
      date: "2024-03-15",
      reviewed: 5,
      correct: 3,
      incorrect: 2,
    });

    // Calculate retention
    const totalReviews = reviews.length;
    const correctReviews = reviews.filter((r) => r.rating >= 3).length;
    const retention = calculateRetentionRate(correctReviews, totalReviews);
    expect(retention).toBe(60); // 6 correct out of 10

    // Calculate streak
    const reviewDates = reviews.map((r) => r.reviewedAt);
    const streak = calculateStreak(reviewDates, today);
    expect(streak.current).toBe(3); // 3 consecutive days
    expect(streak.longest).toBe(3);
  });

  it("should handle edge case of single review", () => {
    const today = new Date("2024-03-15T12:00:00.000Z");
    const reviewDate = new Date("2024-03-15T10:00:00.000Z");
    const reviews = [{ reviewedAt: reviewDate, rating: 4 }];

    const history = buildReviewHistory(reviews, 7, today);
    expect(history.filter((h) => h.reviewed > 0)).toHaveLength(1);

    const retention = calculateRetentionRate(1, 1);
    expect(retention).toBe(100);

    const streak = calculateStreak([reviewDate], today);
    expect(streak.current).toBe(1);
    expect(streak.longest).toBe(1);
  });

  it("should handle broken streak scenario", () => {
    const today = new Date("2024-03-15T12:00:00.000Z");
    const reviewDates = [
      // Current short streak
      new Date("2024-03-15T10:00:00.000Z"),
      new Date("2024-03-14T10:00:00.000Z"),
      // Gap
      // Longer past streak
      new Date("2024-03-10T10:00:00.000Z"),
      new Date("2024-03-09T10:00:00.000Z"),
      new Date("2024-03-08T10:00:00.000Z"),
      new Date("2024-03-07T10:00:00.000Z"),
      new Date("2024-03-06T10:00:00.000Z"),
    ];

    const streak = calculateStreak(reviewDates, today);
    expect(streak.current).toBe(2); // Only today and yesterday
    expect(streak.longest).toBe(5); // 5 consecutive days in the past
    expect(streak.lastReviewDate).toBe("2024-03-15");
  });
});
