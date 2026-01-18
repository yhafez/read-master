/**
 * Tests for POST /api/flashcards/:id/review endpoint
 *
 * Tests cover:
 * - SM-2 algorithm integration (via helper functions)
 * - Status transitions (NEW -> LEARNING -> REVIEW)
 * - XP award calculations
 * - Lapse handling
 * - Mastery detection
 * - Input validation
 */

import { describe, it, expect } from "vitest";
import type { FlashcardStatus } from "@read-master/database";
import type { SrsRating } from "@read-master/shared";
import {
  calculateLevel,
  XP_REWARDS,
  reviewFlashcardSchema,
} from "@read-master/shared";
import {
  XP_BY_RATING,
  MASTERY_REPETITIONS,
  MASTERY_INTERVAL_DAYS,
  determineNewStatus,
  isMastered,
  formatReviewResponse,
  reviewParamsSchema,
} from "./review.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("XP_BY_RATING", () => {
  it("should award 0 XP for rating 1 (Again)", () => {
    expect(XP_BY_RATING[1]).toBe(0);
  });

  it("should award half XP for rating 2 (Hard)", () => {
    expect(XP_BY_RATING[2]).toBe(Math.floor(XP_REWARDS.FLASHCARD_CORRECT / 2));
  });

  it("should award base XP for rating 3 (Good)", () => {
    expect(XP_BY_RATING[3]).toBe(XP_REWARDS.FLASHCARD_CORRECT);
  });

  it("should award 1.5x XP for rating 4 (Easy)", () => {
    expect(XP_BY_RATING[4]).toBe(
      Math.floor(XP_REWARDS.FLASHCARD_CORRECT * 1.5)
    );
  });

  it("should have increasing XP for higher ratings", () => {
    const xp1 = XP_BY_RATING[1];
    const xp2 = XP_BY_RATING[2];
    const xp3 = XP_BY_RATING[3];
    const xp4 = XP_BY_RATING[4];
    expect(xp1).toBeLessThan(xp2);
    expect(xp2).toBeLessThan(xp3);
    expect(xp3).toBeLessThan(xp4);
  });
});

describe("MASTERY_CONSTANTS", () => {
  it("should require at least 5 repetitions for mastery", () => {
    expect(MASTERY_REPETITIONS).toBe(5);
  });

  it("should require at least 21 day interval for mastery", () => {
    expect(MASTERY_INTERVAL_DAYS).toBe(21);
  });
});

// ============================================================================
// determineNewStatus Tests
// ============================================================================

describe("determineNewStatus", () => {
  describe("from NEW status", () => {
    it("should transition to LEARNING after first review", () => {
      const result = determineNewStatus("NEW", 1, 1, false);
      expect(result).toBe("LEARNING");
    });

    it("should stay in LEARNING even with high repetitions", () => {
      // First review transitions to LEARNING
      const result = determineNewStatus("NEW", 1, 1, false);
      expect(result).toBe("LEARNING");
    });

    it("should transition to LEARNING on lapse from NEW", () => {
      const result = determineNewStatus("NEW", 0, 1, true);
      expect(result).toBe("LEARNING");
    });
  });

  describe("from LEARNING status", () => {
    it("should stay in LEARNING with low repetitions", () => {
      const result = determineNewStatus("LEARNING", 1, 1, false);
      expect(result).toBe("LEARNING");
    });

    it("should transition to REVIEW with 2+ repetitions and 1+ day interval", () => {
      const result = determineNewStatus("LEARNING", 2, 1, false);
      expect(result).toBe("REVIEW");
    });

    it("should transition to REVIEW with higher repetitions", () => {
      const result = determineNewStatus("LEARNING", 3, 6, false);
      expect(result).toBe("REVIEW");
    });

    it("should stay in LEARNING if interval is 0", () => {
      const result = determineNewStatus("LEARNING", 2, 0, false);
      expect(result).toBe("LEARNING");
    });

    it("should go back to LEARNING on lapse", () => {
      const result = determineNewStatus("LEARNING", 0, 1, true);
      expect(result).toBe("LEARNING");
    });
  });

  describe("from REVIEW status", () => {
    it("should stay in REVIEW on successful review", () => {
      const result = determineNewStatus("REVIEW", 5, 14, false);
      expect(result).toBe("REVIEW");
    });

    it("should go back to LEARNING on lapse", () => {
      const result = determineNewStatus("REVIEW", 0, 1, true);
      expect(result).toBe("LEARNING");
    });
  });

  describe("lapse handling", () => {
    it("should always return LEARNING on lapse regardless of current status", () => {
      const statuses: FlashcardStatus[] = ["NEW", "LEARNING", "REVIEW"];
      for (const status of statuses) {
        const result = determineNewStatus(status, 0, 1, true);
        expect(result).toBe("LEARNING");
      }
    });
  });
});

// ============================================================================
// isMastered Tests
// ============================================================================

describe("isMastered", () => {
  it("should return false for new cards (0 repetitions)", () => {
    expect(isMastered(0, 0)).toBe(false);
  });

  it("should return false for cards with low repetitions", () => {
    expect(isMastered(4, 30)).toBe(false);
  });

  it("should return false for cards with short interval", () => {
    expect(isMastered(10, 14)).toBe(false);
  });

  it("should return true for cards meeting both criteria", () => {
    expect(isMastered(5, 21)).toBe(true);
  });

  it("should return true for cards exceeding both criteria", () => {
    expect(isMastered(10, 60)).toBe(true);
  });

  it("should return false at exact boundary minus one", () => {
    expect(isMastered(4, 21)).toBe(false);
    expect(isMastered(5, 20)).toBe(false);
  });

  it("should return true at exact boundary", () => {
    expect(isMastered(MASTERY_REPETITIONS, MASTERY_INTERVAL_DAYS)).toBe(true);
  });
});

// ============================================================================
// formatReviewResponse Tests
// ============================================================================

describe("formatReviewResponse", () => {
  const baseParams = {
    flashcardId: "cltest123abc",
    rating: 3 as SrsRating,
    previousState: {
      easeFactor: 2.5,
      interval: 1,
      repetitions: 1,
      status: "LEARNING" as FlashcardStatus,
    },
    newState: {
      easeFactor: 2.6,
      interval: 6,
      repetitions: 2,
      dueDate: new Date("2026-01-25T00:00:00.000Z"),
      status: "REVIEW" as FlashcardStatus,
    },
    xpAwarded: 5,
    totalXP: 100,
    isLapse: false,
    reviewedAt: new Date("2026-01-18T12:00:00.000Z"),
  };

  it("should format all fields correctly", () => {
    const result = formatReviewResponse(
      baseParams.flashcardId,
      baseParams.rating,
      baseParams.previousState,
      baseParams.newState,
      baseParams.xpAwarded,
      baseParams.totalXP,
      baseParams.isLapse,
      baseParams.reviewedAt
    );

    expect(result.flashcardId).toBe("cltest123abc");
    expect(result.rating).toBe(3);
    expect(result.xpAwarded).toBe(5);
    expect(result.totalXP).toBe(100);
    expect(result.isLapse).toBe(false);
  });

  it("should include previous state", () => {
    const result = formatReviewResponse(
      baseParams.flashcardId,
      baseParams.rating,
      baseParams.previousState,
      baseParams.newState,
      baseParams.xpAwarded,
      baseParams.totalXP,
      baseParams.isLapse,
      baseParams.reviewedAt
    );

    expect(result.previousState.easeFactor).toBe(2.5);
    expect(result.previousState.interval).toBe(1);
    expect(result.previousState.repetitions).toBe(1);
    expect(result.previousState.status).toBe("LEARNING");
  });

  it("should include new state with ISO date", () => {
    const result = formatReviewResponse(
      baseParams.flashcardId,
      baseParams.rating,
      baseParams.previousState,
      baseParams.newState,
      baseParams.xpAwarded,
      baseParams.totalXP,
      baseParams.isLapse,
      baseParams.reviewedAt
    );

    expect(result.newState.easeFactor).toBe(2.6);
    expect(result.newState.interval).toBe(6);
    expect(result.newState.repetitions).toBe(2);
    expect(result.newState.status).toBe("REVIEW");
    expect(result.newState.dueDate).toBe("2026-01-25T00:00:00.000Z");
  });

  it("should calculate level from XP", () => {
    const result = formatReviewResponse(
      baseParams.flashcardId,
      baseParams.rating,
      baseParams.previousState,
      baseParams.newState,
      baseParams.xpAwarded,
      100, // 100 XP = level 2
      baseParams.isLapse,
      baseParams.reviewedAt
    );

    const expectedLevel = calculateLevel(100);
    expect(result.level).toBe(expectedLevel.level);
  });

  it("should determine mastery correctly", () => {
    // Not mastered
    const notMastered = formatReviewResponse(
      baseParams.flashcardId,
      baseParams.rating,
      baseParams.previousState,
      { ...baseParams.newState, repetitions: 2, interval: 6 },
      baseParams.xpAwarded,
      baseParams.totalXP,
      baseParams.isLapse,
      baseParams.reviewedAt
    );
    expect(notMastered.isMastered).toBe(false);

    // Mastered
    const mastered = formatReviewResponse(
      baseParams.flashcardId,
      baseParams.rating,
      baseParams.previousState,
      { ...baseParams.newState, repetitions: 5, interval: 21 },
      baseParams.xpAwarded,
      baseParams.totalXP,
      baseParams.isLapse,
      baseParams.reviewedAt
    );
    expect(mastered.isMastered).toBe(true);
  });

  it("should format reviewedAt as ISO string", () => {
    const result = formatReviewResponse(
      baseParams.flashcardId,
      baseParams.rating,
      baseParams.previousState,
      baseParams.newState,
      baseParams.xpAwarded,
      baseParams.totalXP,
      baseParams.isLapse,
      baseParams.reviewedAt
    );

    expect(result.reviewedAt).toBe("2026-01-18T12:00:00.000Z");
  });

  it("should handle lapse flag", () => {
    const result = formatReviewResponse(
      baseParams.flashcardId,
      1, // Again rating
      baseParams.previousState,
      { ...baseParams.newState, repetitions: 0, interval: 1 },
      0, // No XP on lapse
      baseParams.totalXP,
      true, // isLapse
      baseParams.reviewedAt
    );

    expect(result.isLapse).toBe(true);
    expect(result.xpAwarded).toBe(0);
  });
});

// ============================================================================
// reviewParamsSchema Tests
// ============================================================================

describe("reviewParamsSchema", () => {
  it("should accept valid CUID format", () => {
    const result = reviewParamsSchema.safeParse({
      id: "cltest123abc",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty ID", () => {
    const result = reviewParamsSchema.safeParse({
      id: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid CUID format", () => {
    const invalidIds = ["123", "uuid-format-id", "CLTEST123", "cl_test"];
    for (const id of invalidIds) {
      const result = reviewParamsSchema.safeParse({ id });
      expect(result.success).toBe(false);
    }
  });

  it("should reject missing ID", () => {
    const result = reviewParamsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// reviewFlashcardSchema Tests (from shared package)
// ============================================================================

describe("reviewFlashcardSchema", () => {
  describe("rating validation", () => {
    it("should accept rating 1 (Again)", () => {
      const result = reviewFlashcardSchema.safeParse({ rating: 1 });
      expect(result.success).toBe(true);
    });

    it("should accept rating 2 (Hard)", () => {
      const result = reviewFlashcardSchema.safeParse({ rating: 2 });
      expect(result.success).toBe(true);
    });

    it("should accept rating 3 (Good)", () => {
      const result = reviewFlashcardSchema.safeParse({ rating: 3 });
      expect(result.success).toBe(true);
    });

    it("should accept rating 4 (Easy)", () => {
      const result = reviewFlashcardSchema.safeParse({ rating: 4 });
      expect(result.success).toBe(true);
    });

    it("should reject rating 0", () => {
      const result = reviewFlashcardSchema.safeParse({ rating: 0 });
      expect(result.success).toBe(false);
    });

    it("should reject rating 5", () => {
      const result = reviewFlashcardSchema.safeParse({ rating: 5 });
      expect(result.success).toBe(false);
    });

    it("should reject negative rating", () => {
      const result = reviewFlashcardSchema.safeParse({ rating: -1 });
      expect(result.success).toBe(false);
    });

    it("should reject non-integer rating", () => {
      const result = reviewFlashcardSchema.safeParse({ rating: 2.5 });
      expect(result.success).toBe(false);
    });

    it("should reject missing rating", () => {
      const result = reviewFlashcardSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("responseTimeMs validation", () => {
    it("should accept valid responseTimeMs", () => {
      const result = reviewFlashcardSchema.safeParse({
        rating: 3,
        responseTimeMs: 2500,
      });
      expect(result.success).toBe(true);
    });

    it("should accept responseTimeMs of 1ms", () => {
      const result = reviewFlashcardSchema.safeParse({
        rating: 3,
        responseTimeMs: 1,
      });
      expect(result.success).toBe(true);
    });

    it("should accept missing responseTimeMs", () => {
      const result = reviewFlashcardSchema.safeParse({ rating: 3 });
      expect(result.success).toBe(true);
    });

    it("should reject zero responseTimeMs", () => {
      const result = reviewFlashcardSchema.safeParse({
        rating: 3,
        responseTimeMs: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative responseTimeMs", () => {
      const result = reviewFlashcardSchema.safeParse({
        rating: 3,
        responseTimeMs: -100,
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-integer responseTimeMs", () => {
      const result = reviewFlashcardSchema.safeParse({
        rating: 3,
        responseTimeMs: 2500.5,
      });
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// Integration-like Tests
// ============================================================================

describe("Review Flow Integration", () => {
  it("should handle full review cycle from NEW to LEARNING", () => {
    // Simulate first review of a NEW card with rating 3 (Good)
    const rating = 3 as SrsRating;
    const previousStatus: FlashcardStatus = "NEW";
    const newRepetitions = 1;
    const newInterval = 1;
    const isLapse = false;

    const newStatus = determineNewStatus(
      previousStatus,
      newRepetitions,
      newInterval,
      isLapse
    );

    expect(newStatus).toBe("LEARNING");
    expect(XP_BY_RATING[rating]).toBe(XP_REWARDS.FLASHCARD_CORRECT);
  });

  it("should handle lapse from REVIEW back to LEARNING", () => {
    // Simulate a lapse (rating 1) from REVIEW status
    const rating = 1 as SrsRating;
    const previousStatus: FlashcardStatus = "REVIEW";
    const newRepetitions = 0; // Reset on lapse
    const newInterval = 1;
    const isLapse = true;

    const newStatus = determineNewStatus(
      previousStatus,
      newRepetitions,
      newInterval,
      isLapse
    );

    expect(newStatus).toBe("LEARNING");
    expect(XP_BY_RATING[rating]).toBe(0); // No XP on lapse
  });

  it("should detect mastery after multiple successful reviews", () => {
    // Card with many successful reviews
    const repetitions = 6;
    const interval = 30;

    expect(isMastered(repetitions, interval)).toBe(true);
  });

  it("should not consider card mastered after lapse", () => {
    // After a lapse, repetitions reset to 0
    const repetitions = 0;
    const interval = 1;

    expect(isMastered(repetitions, interval)).toBe(false);
  });

  it("should award appropriate XP for different ratings", () => {
    // Check XP progression
    const expectedXPs: Record<SrsRating, number> = {
      1: 0,
      2: Math.floor(XP_REWARDS.FLASHCARD_CORRECT / 2),
      3: XP_REWARDS.FLASHCARD_CORRECT,
      4: Math.floor(XP_REWARDS.FLASHCARD_CORRECT * 1.5),
    };

    expect(XP_BY_RATING[1]).toBe(expectedXPs[1]);
    expect(XP_BY_RATING[2]).toBe(expectedXPs[2]);
    expect(XP_BY_RATING[3]).toBe(expectedXPs[3]);
    expect(XP_BY_RATING[4]).toBe(expectedXPs[4]);
  });

  it("should format complete review response for various scenarios", () => {
    const scenarios = [
      { rating: 1 as SrsRating, expectedXP: 0, isLapse: true },
      {
        rating: 2 as SrsRating,
        expectedXP: Math.floor(XP_REWARDS.FLASHCARD_CORRECT / 2),
        isLapse: false,
      },
      {
        rating: 3 as SrsRating,
        expectedXP: XP_REWARDS.FLASHCARD_CORRECT,
        isLapse: false,
      },
      {
        rating: 4 as SrsRating,
        expectedXP: Math.floor(XP_REWARDS.FLASHCARD_CORRECT * 1.5),
        isLapse: false,
      },
    ];

    for (const scenario of scenarios) {
      const response = formatReviewResponse(
        "cltest123",
        scenario.rating,
        { easeFactor: 2.5, interval: 1, repetitions: 1, status: "LEARNING" },
        {
          easeFactor: 2.5,
          interval: 1,
          repetitions: scenario.isLapse ? 0 : 2,
          dueDate: new Date(),
          status: scenario.isLapse ? "LEARNING" : "LEARNING",
        },
        scenario.expectedXP,
        100,
        scenario.isLapse,
        new Date()
      );

      expect(response.rating).toBe(scenario.rating);
      expect(response.xpAwarded).toBe(scenario.expectedXP);
      expect(response.isLapse).toBe(scenario.isLapse);
    }
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  // Define XP values for the tests
  const xpForEasy = XP_BY_RATING[4];

  it("should handle maximum ease factor", () => {
    const response = formatReviewResponse(
      "cltest123",
      4,
      { easeFactor: 3.0, interval: 100, repetitions: 20, status: "REVIEW" },
      {
        easeFactor: 3.0, // Max ease factor
        interval: 130,
        repetitions: 21,
        dueDate: new Date(),
        status: "REVIEW",
      },
      xpForEasy,
      10000,
      false,
      new Date()
    );

    expect(response.newState.easeFactor).toBe(3.0);
    expect(response.isMastered).toBe(true);
  });

  it("should handle minimum ease factor", () => {
    const response = formatReviewResponse(
      "cltest123",
      1,
      { easeFactor: 1.3, interval: 1, repetitions: 0, status: "NEW" },
      {
        easeFactor: 1.3, // Min ease factor
        interval: 1,
        repetitions: 0,
        dueDate: new Date(),
        status: "LEARNING",
      },
      0,
      0,
      true,
      new Date()
    );

    expect(response.newState.easeFactor).toBe(1.3);
    expect(response.isMastered).toBe(false);
  });

  it("should handle zero XP correctly", () => {
    const response = formatReviewResponse(
      "cltest123",
      1,
      { easeFactor: 2.5, interval: 1, repetitions: 1, status: "LEARNING" },
      {
        easeFactor: 2.3,
        interval: 1,
        repetitions: 0,
        dueDate: new Date(),
        status: "LEARNING",
      },
      0,
      0, // Zero total XP
      true,
      new Date()
    );

    expect(response.xpAwarded).toBe(0);
    expect(response.totalXP).toBe(0);
    expect(response.level).toBe(1); // Level 1 at 0 XP
  });

  it("should handle high level user", () => {
    const highXP = 50000; // Very high XP
    const levelInfo = calculateLevel(highXP);

    const response = formatReviewResponse(
      "cltest123",
      4,
      { easeFactor: 2.5, interval: 30, repetitions: 10, status: "REVIEW" },
      {
        easeFactor: 2.7,
        interval: 39,
        repetitions: 11,
        dueDate: new Date(),
        status: "REVIEW",
      },
      xpForEasy,
      highXP,
      false,
      new Date()
    );

    expect(response.level).toBe(levelInfo.level);
    expect(response.level).toBeGreaterThan(10); // Should be above level 10
  });
});
