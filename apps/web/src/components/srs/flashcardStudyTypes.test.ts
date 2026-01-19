/**
 * Tests for flashcardStudyTypes
 *
 * Comprehensive tests for the flashcard study interface types and utilities.
 */

import { describe, expect, it } from "vitest";
import {
  // Types
  type SrsRating,
  type StudyCard,
  type StudyProgress,
  type StudySessionSummary,
  type CardReviewResult,
  type StudyError,
  // Constants
  RATING_BUTTONS,
  DEFAULT_SESSION_LIMIT,
  MIN_SESSION_CARDS,
  MIN_CARD_VIEW_TIME,
  CARD_FLIP_DURATION,
  STUDY_SHORTCUTS,
  // Functions
  createDefaultProgress,
  createStudyError,
  parseStudyApiError,
  isCorrectRating,
  isValidRating,
  getRatingConfig,
  calculateSessionRetention,
  calculateAverageResponseTime,
  updateProgress,
  createSessionSummary,
  formatIntervalDisplay,
  formatSessionDuration,
  formatResponseTime,
  isSessionComplete,
  getProgressPercentage,
  isValidStudyCard,
  createEmptyStudyCard,
  getRatingColor,
  getRetentionBadgeColor,
  canUndo,
  getShortcutDescriptions,
} from "./flashcardStudyTypes";

// =============================================================================
// TYPE EXPORT TESTS
// =============================================================================

describe("Type exports", () => {
  it("should export SrsRating type", () => {
    const rating: SrsRating = 3;
    expect(rating).toBe(3);
  });

  it("should export StudyCard type", () => {
    const card: StudyCard = {
      id: "test",
      front: "Q",
      back: "A",
      type: "CUSTOM",
      status: "NEW",
      tags: [],
      book: null,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      dueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    expect(card.id).toBe("test");
  });

  it("should export StudyProgress type", () => {
    const progress: StudyProgress = {
      totalCards: 10,
      completedCards: 5,
      remainingCards: 5,
      correctCount: 4,
      incorrectCount: 1,
      currentIndex: 5,
    };
    expect(progress.totalCards).toBe(10);
  });

  it("should export CardReviewResult type", () => {
    const result: CardReviewResult = {
      cardId: "test",
      rating: 3,
      responseTimeMs: 1000,
      newInterval: 6,
      newDueDate: new Date().toISOString(),
      xpAwarded: 10,
    };
    expect(result.rating).toBe(3);
  });

  it("should export StudyError type", () => {
    const error: StudyError = {
      type: "network_error",
      message: "Test error",
      retryable: true,
    };
    expect(error.retryable).toBe(true);
  });

  it("should export StudySessionSummary type", () => {
    const summary: StudySessionSummary = {
      totalStudied: 10,
      correctCount: 8,
      incorrectCount: 2,
      sessionRetentionRate: 80,
      totalXpEarned: 100,
      averageResponseTimeMs: 2000,
      sessionDurationMs: 60000,
      ratingBreakdown: { 1: 1, 2: 1, 3: 4, 4: 4 },
      cardsStillDue: 5,
    };
    expect(summary.sessionRetentionRate).toBe(80);
  });
});

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Constants", () => {
  it("should export RATING_BUTTONS with 4 ratings", () => {
    expect(RATING_BUTTONS).toHaveLength(4);
    expect(RATING_BUTTONS[0]!.rating).toBe(1);
    expect(RATING_BUTTONS[3]!.rating).toBe(4);
  });

  it("should have correct colors for rating buttons", () => {
    expect(RATING_BUTTONS[0]!.color).toBe("error");
    expect(RATING_BUTTONS[1]!.color).toBe("warning");
    expect(RATING_BUTTONS[2]!.color).toBe("info");
    expect(RATING_BUTTONS[3]!.color).toBe("success");
  });

  it("should export DEFAULT_SESSION_LIMIT", () => {
    expect(DEFAULT_SESSION_LIMIT).toBe(20);
  });

  it("should export MIN_SESSION_CARDS", () => {
    expect(MIN_SESSION_CARDS).toBe(1);
  });

  it("should export MIN_CARD_VIEW_TIME", () => {
    expect(MIN_CARD_VIEW_TIME).toBeGreaterThan(0);
  });

  it("should export CARD_FLIP_DURATION", () => {
    expect(CARD_FLIP_DURATION).toBeGreaterThan(0);
  });

  it("should export STUDY_SHORTCUTS", () => {
    expect(STUDY_SHORTCUTS.SHOW_ANSWER).toBe(" ");
    expect(STUDY_SHORTCUTS.RATE_AGAIN).toBe("1");
    expect(STUDY_SHORTCUTS.RATE_HARD).toBe("2");
    expect(STUDY_SHORTCUTS.RATE_GOOD).toBe("3");
    expect(STUDY_SHORTCUTS.RATE_EASY).toBe("4");
    expect(STUDY_SHORTCUTS.EXIT).toBe("Escape");
  });
});

// =============================================================================
// createDefaultProgress TESTS
// =============================================================================

describe("createDefaultProgress", () => {
  it("should create progress with correct total", () => {
    const progress = createDefaultProgress(10);
    expect(progress.totalCards).toBe(10);
    expect(progress.completedCards).toBe(0);
    expect(progress.remainingCards).toBe(10);
  });

  it("should initialize counts to zero", () => {
    const progress = createDefaultProgress(5);
    expect(progress.correctCount).toBe(0);
    expect(progress.incorrectCount).toBe(0);
    expect(progress.currentIndex).toBe(0);
  });

  it("should handle zero cards", () => {
    const progress = createDefaultProgress(0);
    expect(progress.totalCards).toBe(0);
    expect(progress.remainingCards).toBe(0);
  });
});

// =============================================================================
// createStudyError TESTS
// =============================================================================

describe("createStudyError", () => {
  it("should create network error with default message", () => {
    const error = createStudyError("network_error");
    expect(error.type).toBe("network_error");
    expect(error.message).toContain("internet");
    expect(error.retryable).toBe(true);
  });

  it("should create no cards error", () => {
    const error = createStudyError("no_cards_due");
    expect(error.type).toBe("no_cards_due");
    expect(error.retryable).toBe(false);
  });

  it("should create submission failed error", () => {
    const error = createStudyError("submission_failed");
    expect(error.type).toBe("submission_failed");
    expect(error.retryable).toBe(true);
  });

  it("should use custom message when provided", () => {
    const error = createStudyError("unknown", "Custom error message");
    expect(error.message).toBe("Custom error message");
  });

  it("should handle unauthorized error", () => {
    const error = createStudyError("unauthorized");
    expect(error.type).toBe("unauthorized");
    expect(error.retryable).toBe(false);
  });
});

// =============================================================================
// parseStudyApiError TESTS
// =============================================================================

describe("parseStudyApiError", () => {
  it("should parse 404 as no_cards_due", () => {
    const error = parseStudyApiError(404);
    expect(error.type).toBe("no_cards_due");
  });

  it("should parse 401 as unauthorized", () => {
    const error = parseStudyApiError(401);
    expect(error.type).toBe("unauthorized");
  });

  it("should parse 403 as unauthorized", () => {
    const error = parseStudyApiError(403);
    expect(error.type).toBe("unauthorized");
  });

  it("should parse 0 as network_error", () => {
    const error = parseStudyApiError(0);
    expect(error.type).toBe("network_error");
  });

  it("should parse other codes as unknown", () => {
    const error = parseStudyApiError(500);
    expect(error.type).toBe("unknown");
  });

  it("should use custom message when provided", () => {
    const error = parseStudyApiError(500, "Server error");
    expect(error.message).toBe("Server error");
  });
});

// =============================================================================
// isCorrectRating TESTS
// =============================================================================

describe("isCorrectRating", () => {
  it("should return false for rating 1", () => {
    expect(isCorrectRating(1)).toBe(false);
  });

  it("should return false for rating 2", () => {
    expect(isCorrectRating(2)).toBe(false);
  });

  it("should return true for rating 3", () => {
    expect(isCorrectRating(3)).toBe(true);
  });

  it("should return true for rating 4", () => {
    expect(isCorrectRating(4)).toBe(true);
  });
});

// =============================================================================
// isValidRating TESTS
// =============================================================================

describe("isValidRating", () => {
  it("should return true for valid ratings", () => {
    expect(isValidRating(1)).toBe(true);
    expect(isValidRating(2)).toBe(true);
    expect(isValidRating(3)).toBe(true);
    expect(isValidRating(4)).toBe(true);
  });

  it("should return false for invalid ratings", () => {
    expect(isValidRating(0)).toBe(false);
    expect(isValidRating(5)).toBe(false);
    expect(isValidRating(-1)).toBe(false);
    expect(isValidRating(1.5)).toBe(false);
  });
});

// =============================================================================
// getRatingConfig TESTS
// =============================================================================

describe("getRatingConfig", () => {
  it("should return correct config for rating 1", () => {
    const config = getRatingConfig(1);
    expect(config.rating).toBe(1);
    expect(config.color).toBe("error");
  });

  it("should return correct config for rating 4", () => {
    const config = getRatingConfig(4);
    expect(config.rating).toBe(4);
    expect(config.color).toBe("success");
  });

  it("should throw for invalid rating", () => {
    expect(() => getRatingConfig(5 as SrsRating)).toThrow();
  });
});

// =============================================================================
// calculateSessionRetention TESTS
// =============================================================================

describe("calculateSessionRetention", () => {
  it("should calculate correct retention rate", () => {
    expect(calculateSessionRetention(8, 10)).toBe(80);
  });

  it("should return 100 for all correct", () => {
    expect(calculateSessionRetention(10, 10)).toBe(100);
  });

  it("should return 0 for none correct", () => {
    expect(calculateSessionRetention(0, 10)).toBe(0);
  });

  it("should return 0 for zero total", () => {
    expect(calculateSessionRetention(0, 0)).toBe(0);
  });

  it("should round to integer", () => {
    expect(calculateSessionRetention(1, 3)).toBe(33);
  });
});

// =============================================================================
// calculateAverageResponseTime TESTS
// =============================================================================

describe("calculateAverageResponseTime", () => {
  it("should calculate average of valid times", () => {
    expect(calculateAverageResponseTime([1000, 2000, 3000])).toBe(2000);
  });

  it("should ignore null values", () => {
    expect(calculateAverageResponseTime([1000, null, 3000])).toBe(2000);
  });

  it("should return null for empty array", () => {
    expect(calculateAverageResponseTime([])).toBeNull();
  });

  it("should return null for all null values", () => {
    expect(calculateAverageResponseTime([null, null])).toBeNull();
  });

  it("should round to integer", () => {
    expect(calculateAverageResponseTime([1000, 1001])).toBe(1001);
  });
});

// =============================================================================
// updateProgress TESTS
// =============================================================================

describe("updateProgress", () => {
  const baseProgress: StudyProgress = {
    totalCards: 10,
    completedCards: 5,
    remainingCards: 5,
    correctCount: 3,
    incorrectCount: 2,
    currentIndex: 5,
  };

  it("should increment correct count for rating >= 3", () => {
    const updated = updateProgress(baseProgress, 3);
    expect(updated.correctCount).toBe(4);
    expect(updated.incorrectCount).toBe(2);
  });

  it("should increment incorrect count for rating < 3", () => {
    const updated = updateProgress(baseProgress, 2);
    expect(updated.incorrectCount).toBe(3);
    expect(updated.correctCount).toBe(3);
  });

  it("should update completion counts", () => {
    const updated = updateProgress(baseProgress, 3);
    expect(updated.completedCards).toBe(6);
    expect(updated.remainingCards).toBe(4);
    expect(updated.currentIndex).toBe(6);
  });

  it("should not mutate original progress", () => {
    const updated = updateProgress(baseProgress, 3);
    expect(updated).not.toBe(baseProgress);
    expect(baseProgress.completedCards).toBe(5);
  });
});

// =============================================================================
// createSessionSummary TESTS
// =============================================================================

describe("createSessionSummary", () => {
  const mockResults: CardReviewResult[] = [
    {
      cardId: "1",
      rating: 3,
      responseTimeMs: 1000,
      newInterval: 6,
      newDueDate: new Date().toISOString(),
      xpAwarded: 10,
    },
    {
      cardId: "2",
      rating: 4,
      responseTimeMs: 2000,
      newInterval: 8,
      newDueDate: new Date().toISOString(),
      xpAwarded: 10,
    },
    {
      cardId: "3",
      rating: 1,
      responseTimeMs: 500,
      newInterval: 1,
      newDueDate: new Date().toISOString(),
      xpAwarded: 2,
    },
  ];

  it("should calculate total studied", () => {
    const summary = createSessionSummary(mockResults, Date.now() - 60000, 5);
    expect(summary.totalStudied).toBe(3);
  });

  it("should calculate correct/incorrect counts", () => {
    const summary = createSessionSummary(mockResults, Date.now() - 60000, 5);
    expect(summary.correctCount).toBe(2);
    expect(summary.incorrectCount).toBe(1);
  });

  it("should calculate retention rate", () => {
    const summary = createSessionSummary(mockResults, Date.now() - 60000, 5);
    expect(summary.sessionRetentionRate).toBe(67);
  });

  it("should calculate total XP", () => {
    const summary = createSessionSummary(mockResults, Date.now() - 60000, 5);
    expect(summary.totalXpEarned).toBe(22);
  });

  it("should calculate rating breakdown", () => {
    const summary = createSessionSummary(mockResults, Date.now() - 60000, 5);
    expect(summary.ratingBreakdown[1]).toBe(1);
    expect(summary.ratingBreakdown[3]).toBe(1);
    expect(summary.ratingBreakdown[4]).toBe(1);
  });

  it("should include cards still due", () => {
    const summary = createSessionSummary(mockResults, Date.now() - 60000, 5);
    expect(summary.cardsStillDue).toBe(5);
  });
});

// =============================================================================
// formatIntervalDisplay TESTS
// =============================================================================

describe("formatIntervalDisplay", () => {
  it("should format less than 1 day", () => {
    expect(formatIntervalDisplay(0)).toBe("< 1d");
    expect(formatIntervalDisplay(0.5)).toBe("< 1d");
  });

  it("should format 1 day", () => {
    expect(formatIntervalDisplay(1)).toBe("1d");
  });

  it("should format days", () => {
    expect(formatIntervalDisplay(3)).toBe("3d");
    expect(formatIntervalDisplay(6)).toBe("6d");
  });

  it("should format weeks", () => {
    expect(formatIntervalDisplay(7)).toBe("1w");
    expect(formatIntervalDisplay(14)).toBe("2w");
    expect(formatIntervalDisplay(21)).toBe("3w");
  });

  it("should format months", () => {
    expect(formatIntervalDisplay(30)).toBe("1mo");
    expect(formatIntervalDisplay(60)).toBe("2mo");
  });

  it("should format years", () => {
    expect(formatIntervalDisplay(365)).toBe("1y");
    expect(formatIntervalDisplay(730)).toBe("2y");
  });
});

// =============================================================================
// formatSessionDuration TESTS
// =============================================================================

describe("formatSessionDuration", () => {
  it("should format seconds only", () => {
    expect(formatSessionDuration(30000)).toBe("0:30");
  });

  it("should format minutes and seconds", () => {
    expect(formatSessionDuration(90000)).toBe("1:30");
  });

  it("should format hours, minutes, and seconds", () => {
    expect(formatSessionDuration(3661000)).toBe("1:01:01");
  });

  it("should pad numbers with zeros", () => {
    expect(formatSessionDuration(61000)).toBe("1:01");
  });
});

// =============================================================================
// formatResponseTime TESTS
// =============================================================================

describe("formatResponseTime", () => {
  it("should return dash for null", () => {
    expect(formatResponseTime(null)).toBe("-");
  });

  it("should format milliseconds", () => {
    expect(formatResponseTime(500)).toBe("500ms");
  });

  it("should format seconds", () => {
    expect(formatResponseTime(1500)).toBe("1.5s");
  });
});

// =============================================================================
// isSessionComplete TESTS
// =============================================================================

describe("isSessionComplete", () => {
  it("should return true when no cards remaining", () => {
    const progress: StudyProgress = {
      totalCards: 5,
      completedCards: 5,
      remainingCards: 0,
      correctCount: 4,
      incorrectCount: 1,
      currentIndex: 5,
    };
    expect(isSessionComplete(progress)).toBe(true);
  });

  it("should return false when cards remaining", () => {
    const progress: StudyProgress = {
      totalCards: 5,
      completedCards: 3,
      remainingCards: 2,
      correctCount: 2,
      incorrectCount: 1,
      currentIndex: 3,
    };
    expect(isSessionComplete(progress)).toBe(false);
  });
});

// =============================================================================
// getProgressPercentage TESTS
// =============================================================================

describe("getProgressPercentage", () => {
  it("should calculate percentage correctly", () => {
    const progress: StudyProgress = {
      totalCards: 10,
      completedCards: 5,
      remainingCards: 5,
      correctCount: 4,
      incorrectCount: 1,
      currentIndex: 5,
    };
    expect(getProgressPercentage(progress)).toBe(50);
  });

  it("should return 0 for zero total", () => {
    const progress = createDefaultProgress(0);
    expect(getProgressPercentage(progress)).toBe(0);
  });

  it("should round to integer", () => {
    const progress: StudyProgress = {
      totalCards: 3,
      completedCards: 1,
      remainingCards: 2,
      correctCount: 1,
      incorrectCount: 0,
      currentIndex: 1,
    };
    expect(getProgressPercentage(progress)).toBe(33);
  });
});

// =============================================================================
// isValidStudyCard TESTS
// =============================================================================

describe("isValidStudyCard", () => {
  it("should return true for valid card", () => {
    const card = createEmptyStudyCard();
    expect(isValidStudyCard(card)).toBe(true);
  });

  it("should return false for null", () => {
    expect(isValidStudyCard(null)).toBe(false);
  });

  it("should return false for non-object", () => {
    expect(isValidStudyCard("string")).toBe(false);
  });

  it("should return false for missing fields", () => {
    const partial = { id: "test", front: "Q" };
    expect(isValidStudyCard(partial)).toBe(false);
  });

  it("should return false for wrong field types", () => {
    const invalid = {
      id: 123, // should be string
      front: "Q",
      back: "A",
      type: "CUSTOM",
      status: "NEW",
      tags: [],
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      dueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    expect(isValidStudyCard(invalid)).toBe(false);
  });
});

// =============================================================================
// createEmptyStudyCard TESTS
// =============================================================================

describe("createEmptyStudyCard", () => {
  it("should create card with default id", () => {
    const card = createEmptyStudyCard();
    expect(card.id).toBe("test-card");
  });

  it("should create card with custom id", () => {
    const card = createEmptyStudyCard("custom-id");
    expect(card.id).toBe("custom-id");
  });

  it("should create card with default values", () => {
    const card = createEmptyStudyCard();
    expect(card.front).toBe("");
    expect(card.back).toBe("");
    expect(card.type).toBe("CUSTOM");
    expect(card.status).toBe("NEW");
    expect(card.easeFactor).toBe(2.5);
    expect(card.interval).toBe(0);
  });
});

// =============================================================================
// getRatingColor TESTS
// =============================================================================

describe("getRatingColor", () => {
  it("should return error for rating 1", () => {
    expect(getRatingColor(1)).toBe("error");
  });

  it("should return warning for rating 2", () => {
    expect(getRatingColor(2)).toBe("warning");
  });

  it("should return info for rating 3", () => {
    expect(getRatingColor(3)).toBe("info");
  });

  it("should return success for rating 4", () => {
    expect(getRatingColor(4)).toBe("success");
  });
});

// =============================================================================
// getRetentionBadgeColor TESTS
// =============================================================================

describe("getRetentionBadgeColor", () => {
  it("should return success for rate >= 90", () => {
    expect(getRetentionBadgeColor(90)).toBe("success");
    expect(getRetentionBadgeColor(100)).toBe("success");
  });

  it("should return warning for rate >= 70 and < 90", () => {
    expect(getRetentionBadgeColor(70)).toBe("warning");
    expect(getRetentionBadgeColor(89)).toBe("warning");
  });

  it("should return error for rate > 0 and < 70", () => {
    expect(getRetentionBadgeColor(50)).toBe("error");
    expect(getRetentionBadgeColor(1)).toBe("error");
  });

  it("should return default for rate = 0", () => {
    expect(getRetentionBadgeColor(0)).toBe("default");
  });
});

// =============================================================================
// canUndo TESTS
// =============================================================================

describe("canUndo", () => {
  it("should return true for single result", () => {
    const results: CardReviewResult[] = [
      {
        cardId: "1",
        rating: 3,
        responseTimeMs: 1000,
        newInterval: 6,
        newDueDate: new Date().toISOString(),
        xpAwarded: 10,
      },
    ];
    expect(canUndo(results)).toBe(true);
  });

  it("should return false for empty results", () => {
    expect(canUndo([])).toBe(false);
  });

  it("should return false for results exceeding maxUndos", () => {
    const results: CardReviewResult[] = [
      {
        cardId: "1",
        rating: 3,
        responseTimeMs: 1000,
        newInterval: 6,
        newDueDate: new Date().toISOString(),
        xpAwarded: 10,
      },
      {
        cardId: "2",
        rating: 4,
        responseTimeMs: 1000,
        newInterval: 8,
        newDueDate: new Date().toISOString(),
        xpAwarded: 10,
      },
    ];
    expect(canUndo(results, 1)).toBe(false);
  });

  it("should use custom maxUndos", () => {
    const results: CardReviewResult[] = [
      {
        cardId: "1",
        rating: 3,
        responseTimeMs: 1000,
        newInterval: 6,
        newDueDate: new Date().toISOString(),
        xpAwarded: 10,
      },
      {
        cardId: "2",
        rating: 4,
        responseTimeMs: 1000,
        newInterval: 8,
        newDueDate: new Date().toISOString(),
        xpAwarded: 10,
      },
    ];
    expect(canUndo(results, 3)).toBe(true);
  });
});

// =============================================================================
// getShortcutDescriptions TESTS
// =============================================================================

describe("getShortcutDescriptions", () => {
  it("should return array of shortcuts", () => {
    const shortcuts = getShortcutDescriptions();
    expect(Array.isArray(shortcuts)).toBe(true);
    expect(shortcuts.length).toBeGreaterThan(0);
  });

  it("should include space for show answer", () => {
    const shortcuts = getShortcutDescriptions();
    const spaceShortcut = shortcuts.find((s) => s.key === "Space");
    expect(spaceShortcut).toBeDefined();
    expect(spaceShortcut!.action).toContain("answer");
  });

  it("should include rating shortcuts", () => {
    const shortcuts = getShortcutDescriptions();
    const ratingShortcuts = shortcuts.filter((s) =>
      ["1", "2", "3", "4"].includes(s.key)
    );
    expect(ratingShortcuts.length).toBe(4);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe("Edge cases", () => {
  it("should handle empty results in createSessionSummary", () => {
    const summary = createSessionSummary([], Date.now(), 0);
    expect(summary.totalStudied).toBe(0);
    expect(summary.sessionRetentionRate).toBe(0);
    expect(summary.averageResponseTimeMs).toBeNull();
  });

  it("should handle all null response times", () => {
    const results: CardReviewResult[] = [
      {
        cardId: "1",
        rating: 3,
        responseTimeMs: null,
        newInterval: 6,
        newDueDate: new Date().toISOString(),
        xpAwarded: 10,
      },
    ];
    const summary = createSessionSummary(results, Date.now(), 0);
    expect(summary.averageResponseTimeMs).toBeNull();
  });

  it("should handle very large intervals", () => {
    expect(formatIntervalDisplay(3650)).toBe("10y");
  });

  it("should handle very long session duration", () => {
    // 1 hour 30 minutes 45 seconds
    expect(formatSessionDuration(5445000)).toBe("1:30:45");
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe("Integration scenarios", () => {
  it("should handle a complete study session flow", () => {
    // Start session
    const totalCards = 5;
    let progress = createDefaultProgress(totalCards);
    expect(progress.remainingCards).toBe(5);

    // Review cards
    const ratings: SrsRating[] = [3, 4, 2, 3, 1];
    const results: CardReviewResult[] = [];

    for (let i = 0; i < ratings.length; i++) {
      const rating = ratings[i]!;
      progress = updateProgress(progress, rating);
      results.push({
        cardId: `card-${i}`,
        rating,
        responseTimeMs: 1000 + i * 500,
        newInterval: rating >= 3 ? 6 : 1,
        newDueDate: new Date().toISOString(),
        xpAwarded: isCorrectRating(rating) ? 10 : 2,
      });
    }

    // Verify progress
    expect(isSessionComplete(progress)).toBe(true);
    expect(progress.correctCount).toBe(3);
    expect(progress.incorrectCount).toBe(2);

    // Create summary
    const summary = createSessionSummary(results, Date.now() - 60000, 0);
    expect(summary.totalStudied).toBe(5);
    expect(summary.sessionRetentionRate).toBe(60);
    expect(summary.totalXpEarned).toBe(34); // 3*10 + 2*2
  });

  it("should correctly track rating breakdown", () => {
    const results: CardReviewResult[] = [
      {
        cardId: "1",
        rating: 1,
        responseTimeMs: 1000,
        newInterval: 1,
        newDueDate: "",
        xpAwarded: 2,
      },
      {
        cardId: "2",
        rating: 1,
        responseTimeMs: 1000,
        newInterval: 1,
        newDueDate: "",
        xpAwarded: 2,
      },
      {
        cardId: "3",
        rating: 2,
        responseTimeMs: 1000,
        newInterval: 1,
        newDueDate: "",
        xpAwarded: 2,
      },
      {
        cardId: "4",
        rating: 3,
        responseTimeMs: 1000,
        newInterval: 6,
        newDueDate: "",
        xpAwarded: 10,
      },
      {
        cardId: "5",
        rating: 3,
        responseTimeMs: 1000,
        newInterval: 6,
        newDueDate: "",
        xpAwarded: 10,
      },
      {
        cardId: "6",
        rating: 3,
        responseTimeMs: 1000,
        newInterval: 6,
        newDueDate: "",
        xpAwarded: 10,
      },
      {
        cardId: "7",
        rating: 4,
        responseTimeMs: 1000,
        newInterval: 8,
        newDueDate: "",
        xpAwarded: 10,
      },
    ];

    const summary = createSessionSummary(results, Date.now(), 0);
    expect(summary.ratingBreakdown[1]).toBe(2);
    expect(summary.ratingBreakdown[2]).toBe(1);
    expect(summary.ratingBreakdown[3]).toBe(3);
    expect(summary.ratingBreakdown[4]).toBe(1);
  });
});
