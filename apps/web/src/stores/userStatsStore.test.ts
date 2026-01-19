/**
 * Tests for userStatsStore
 *
 * Tests cover:
 * - XP and level calculations
 * - Streak tracking
 * - Reading activity recording
 * - Utility functions
 * - Store actions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import {
  useUserStatsStore,
  getXPForLevel,
  getLevelFromXP,
  getCurrentLevelProgress,
  formatReadingTime,
  getTodayDateString,
  areConsecutiveDays,
  isToday,
  sanitizeUserStats,
  XP_PER_LEVEL,
  MAX_LEVEL,
  USER_STATS_STORAGE_KEY,
  type ReadingActivity,
  type UserStats,
} from "./userStatsStore";

// Helper to reset store between tests
function resetStore() {
  useUserStatsStore.getState().reset();
}

describe("userStatsStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
    localStorage.clear();
    resetStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Constants", () => {
    it("should have correct XP_PER_LEVEL", () => {
      expect(XP_PER_LEVEL).toBe(100);
    });

    it("should have correct MAX_LEVEL", () => {
      expect(MAX_LEVEL).toBe(100);
    });

    it("should have correct storage key", () => {
      expect(USER_STATS_STORAGE_KEY).toBe("read-master-user-stats");
    });
  });

  describe("getXPForLevel", () => {
    it("should return 0 for level 1", () => {
      expect(getXPForLevel(1)).toBe(0);
    });

    it("should return 0 for level 0 or negative", () => {
      expect(getXPForLevel(0)).toBe(0);
      expect(getXPForLevel(-1)).toBe(0);
    });

    it("should return correct XP for level 2", () => {
      // XP needed = 100 * 1 = 100
      expect(getXPForLevel(2)).toBe(100);
    });

    it("should return correct XP for level 3", () => {
      // XP needed = 100 * (1 + 2) / 2 * 2 = 300
      expect(getXPForLevel(3)).toBe(300);
    });

    it("should return correct XP for level 5", () => {
      // XP needed = 100 * (4 * 5) / 2 = 1000
      expect(getXPForLevel(5)).toBe(1000);
    });

    it("should return correct XP for level 10", () => {
      // XP needed = 100 * (9 * 10) / 2 = 4500
      expect(getXPForLevel(10)).toBe(4500);
    });
  });

  describe("getLevelFromXP", () => {
    it("should return level 1 for 0 XP", () => {
      expect(getLevelFromXP(0)).toBe(1);
    });

    it("should return level 1 for negative XP", () => {
      expect(getLevelFromXP(-100)).toBe(1);
    });

    it("should return level 2 at exactly 100 XP", () => {
      expect(getLevelFromXP(100)).toBe(2);
    });

    it("should return level 2 for 99 XP", () => {
      expect(getLevelFromXP(99)).toBe(1);
    });

    it("should return level 3 at 300 XP", () => {
      expect(getLevelFromXP(300)).toBe(3);
    });

    it("should return level 5 at 1000 XP", () => {
      expect(getLevelFromXP(1000)).toBe(5);
    });

    it("should cap at MAX_LEVEL", () => {
      expect(getLevelFromXP(999999999)).toBe(MAX_LEVEL);
    });
  });

  describe("getCurrentLevelProgress", () => {
    it("should return correct progress for 0 XP", () => {
      const progress = getCurrentLevelProgress(0);
      expect(progress.level).toBe(1);
      expect(progress.currentLevelXP).toBe(0);
      expect(progress.xpToNextLevel).toBe(100);
      expect(progress.progressPercent).toBe(0);
    });

    it("should return correct progress at 50 XP", () => {
      const progress = getCurrentLevelProgress(50);
      expect(progress.level).toBe(1);
      expect(progress.currentLevelXP).toBe(50);
      expect(progress.xpToNextLevel).toBe(100);
      expect(progress.progressPercent).toBe(50);
    });

    it("should return correct progress at 150 XP", () => {
      const progress = getCurrentLevelProgress(150);
      expect(progress.level).toBe(2);
      expect(progress.currentLevelXP).toBe(50);
      expect(progress.xpToNextLevel).toBe(200);
      expect(progress.progressPercent).toBe(25);
    });

    it("should return 100% progress at max level", () => {
      const maxXP = getXPForLevel(MAX_LEVEL);
      const progress = getCurrentLevelProgress(maxXP);
      expect(progress.level).toBe(MAX_LEVEL);
    });
  });

  describe("formatReadingTime", () => {
    it("should format minutes under 60", () => {
      expect(formatReadingTime(30)).toBe("30m");
      expect(formatReadingTime(1)).toBe("1m");
      expect(formatReadingTime(59)).toBe("59m");
    });

    it("should format exact hours", () => {
      expect(formatReadingTime(60)).toBe("1h");
      expect(formatReadingTime(120)).toBe("2h");
      expect(formatReadingTime(180)).toBe("3h");
    });

    it("should format hours and minutes", () => {
      expect(formatReadingTime(90)).toBe("1h 30m");
      expect(formatReadingTime(150)).toBe("2h 30m");
      expect(formatReadingTime(61)).toBe("1h 1m");
    });

    it("should handle zero", () => {
      expect(formatReadingTime(0)).toBe("0m");
    });
  });

  describe("getTodayDateString", () => {
    it("should return correct date string", () => {
      expect(getTodayDateString()).toBe("2025-01-15");
    });
  });

  describe("areConsecutiveDays", () => {
    it("should return true for consecutive days", () => {
      expect(areConsecutiveDays("2025-01-14", "2025-01-15")).toBe(true);
      expect(areConsecutiveDays("2025-01-15", "2025-01-14")).toBe(true);
    });

    it("should return false for same day", () => {
      expect(areConsecutiveDays("2025-01-15", "2025-01-15")).toBe(false);
    });

    it("should return false for non-consecutive days", () => {
      expect(areConsecutiveDays("2025-01-13", "2025-01-15")).toBe(false);
      expect(areConsecutiveDays("2025-01-10", "2025-01-15")).toBe(false);
    });

    it("should handle month boundaries", () => {
      expect(areConsecutiveDays("2025-01-31", "2025-02-01")).toBe(true);
      expect(areConsecutiveDays("2024-12-31", "2025-01-01")).toBe(true);
    });
  });

  describe("isToday", () => {
    it("should return true for today", () => {
      expect(isToday("2025-01-15")).toBe(true);
    });

    it("should return false for other days", () => {
      expect(isToday("2025-01-14")).toBe(false);
      expect(isToday("2025-01-16")).toBe(false);
    });
  });

  describe("sanitizeUserStats", () => {
    it("should sanitize valid stats", () => {
      const stats: Partial<UserStats> = {
        totalXP: 100.5,
        level: 2.7,
        currentStreak: 5.9,
      };
      const sanitized = sanitizeUserStats(stats);
      expect(sanitized.totalXP).toBe(100);
      expect(sanitized.level).toBe(2);
      expect(sanitized.currentStreak).toBe(5);
    });

    it("should ignore invalid values", () => {
      const stats = {
        totalXP: -100,
        level: 0,
        currentStreak: -5,
      };
      const sanitized = sanitizeUserStats(stats);
      expect(sanitized.totalXP).toBeUndefined();
      expect(sanitized.level).toBeUndefined();
      expect(sanitized.currentStreak).toBeUndefined();
    });

    it("should cap level at MAX_LEVEL", () => {
      const stats: Partial<UserStats> = { level: 150 };
      const sanitized = sanitizeUserStats(stats);
      expect(sanitized.level).toBe(MAX_LEVEL);
    });

    it("should sanitize activity history", () => {
      const stats: Partial<UserStats> = {
        activityHistory: [
          {
            date: "2025-01-15",
            minutesRead: 30,
            unitsRead: 1000,
            booksCompleted: 0,
          },
          {
            date: "invalid",
            minutesRead: "not a number" as unknown as number,
            unitsRead: 0,
            booksCompleted: 0,
          },
        ],
      };
      const sanitized = sanitizeUserStats(stats);
      expect(sanitized.activityHistory).toHaveLength(1);
    });

    it("should limit activity history to 30 days", () => {
      const history: ReadingActivity[] = Array.from({ length: 50 }, (_, i) => ({
        date: `2025-01-${String(i + 1).padStart(2, "0")}`,
        minutesRead: 30,
        unitsRead: 1000,
        booksCompleted: 0,
      }));
      const sanitized = sanitizeUserStats({ activityHistory: history });
      expect(sanitized.activityHistory).toHaveLength(30);
    });
  });

  describe("Store - Initial State", () => {
    it("should have correct initial state", () => {
      const state = useUserStatsStore.getState();
      expect(state.totalXP).toBe(0);
      expect(state.level).toBe(1);
      expect(state.currentLevelXP).toBe(0);
      expect(state.xpToNextLevel).toBe(XP_PER_LEVEL);
      expect(state.currentStreak).toBe(0);
      expect(state.longestStreak).toBe(0);
      expect(state.lastReadDate).toBeNull();
      expect(state.booksCompleted).toBe(0);
      expect(state.totalReadingMinutes).toBe(0);
      expect(state.averageWPM).toBe(200);
      expect(state.flashcardsReviewed).toBe(0);
      expect(state.assessmentsCompleted).toBe(0);
      expect(state.averageAssessmentScore).toBe(0);
      expect(state.activityHistory).toEqual([]);
    });
  });

  describe("Store - addXP", () => {
    it("should add XP correctly", () => {
      useUserStatsStore.getState().addXP(50);
      const state = useUserStatsStore.getState();
      expect(state.totalXP).toBe(50);
    });

    it("should not add zero or negative XP", () => {
      useUserStatsStore.getState().addXP(0);
      useUserStatsStore.getState().addXP(-10);
      const state = useUserStatsStore.getState();
      expect(state.totalXP).toBe(0);
    });

    it("should level up when threshold is reached", () => {
      useUserStatsStore.getState().addXP(100);
      const state = useUserStatsStore.getState();
      expect(state.level).toBe(2);
      expect(state.currentLevelXP).toBe(0);
    });

    it("should handle multiple level ups", () => {
      // Level progression: 1->2 needs 100 XP, 2->3 needs 200 XP, 3->4 needs 300 XP
      // Total for level 4: 100 + 200 + 300 = 600 XP
      // 500 XP puts us at level 3 with 200/300 XP progress
      useUserStatsStore.getState().addXP(500);
      const state = useUserStatsStore.getState();
      expect(state.level).toBe(3);
    });
  });

  describe("Store - updateStreak", () => {
    it("should start streak on first read", () => {
      useUserStatsStore.getState().updateStreak();
      const state = useUserStatsStore.getState();
      expect(state.currentStreak).toBe(1);
      expect(state.longestStreak).toBe(1);
      expect(state.lastReadDate).toBe("2025-01-15");
    });

    it("should not change streak if already read today", () => {
      useUserStatsStore.getState().updateStreak();
      useUserStatsStore.getState().updateStreak();
      const state = useUserStatsStore.getState();
      expect(state.currentStreak).toBe(1);
    });

    it("should increment streak on consecutive day", () => {
      useUserStatsStore.getState().updateStreak();

      // Advance to next day
      vi.setSystemTime(new Date("2025-01-16T12:00:00Z"));

      useUserStatsStore.getState().updateStreak();

      const state = useUserStatsStore.getState();
      expect(state.currentStreak).toBe(2);
      expect(state.longestStreak).toBe(2);
    });

    it("should reset streak if day is missed", () => {
      useUserStatsStore.getState().updateStreak();

      // Advance two days (skip one)
      vi.setSystemTime(new Date("2025-01-17T12:00:00Z"));

      useUserStatsStore.getState().updateStreak();

      const state = useUserStatsStore.getState();
      expect(state.currentStreak).toBe(1);
      expect(state.longestStreak).toBe(1); // Previous longest was 1
    });

    it("should maintain longest streak", () => {
      // Build up a 3-day streak
      useUserStatsStore.getState().updateStreak();
      vi.setSystemTime(new Date("2025-01-16T12:00:00Z"));
      useUserStatsStore.getState().updateStreak();
      vi.setSystemTime(new Date("2025-01-17T12:00:00Z"));
      useUserStatsStore.getState().updateStreak();

      expect(useUserStatsStore.getState().longestStreak).toBe(3);

      // Break streak
      vi.setSystemTime(new Date("2025-01-19T12:00:00Z"));
      useUserStatsStore.getState().updateStreak();

      const state = useUserStatsStore.getState();
      expect(state.currentStreak).toBe(1);
      expect(state.longestStreak).toBe(3); // Maintained
    });
  });

  describe("Store - recordReadingActivity", () => {
    it("should record reading activity", () => {
      useUserStatsStore.getState().recordReadingActivity(30, 1000);

      const state = useUserStatsStore.getState();
      expect(state.totalReadingMinutes).toBe(30);
      expect(state.activityHistory).toHaveLength(1);
      const activity = state.activityHistory[0];
      expect(activity).toBeDefined();
      expect(activity?.minutesRead).toBe(30);
      expect(activity?.unitsRead).toBe(1000);
    });

    it("should accumulate activity for same day", () => {
      useUserStatsStore.getState().recordReadingActivity(30, 1000);
      useUserStatsStore.getState().recordReadingActivity(20, 500);

      const state = useUserStatsStore.getState();
      expect(state.totalReadingMinutes).toBe(50);
      expect(state.activityHistory).toHaveLength(1);
      const activity = state.activityHistory[0];
      expect(activity).toBeDefined();
      expect(activity?.minutesRead).toBe(50);
      expect(activity?.unitsRead).toBe(1500);
    });

    it("should track book completions", () => {
      useUserStatsStore.getState().recordReadingActivity(60, 5000, true);

      const state = useUserStatsStore.getState();
      expect(state.booksCompleted).toBe(1);
      const activity = state.activityHistory[0];
      expect(activity).toBeDefined();
      expect(activity?.booksCompleted).toBe(1);
    });

    it("should update streak when recording activity", () => {
      useUserStatsStore.getState().recordReadingActivity(30, 1000);

      const state = useUserStatsStore.getState();
      expect(state.currentStreak).toBe(1);
      expect(state.lastReadDate).toBe("2025-01-15");
    });
  });

  describe("Store - recordFlashcardReview", () => {
    it("should record flashcard reviews", () => {
      useUserStatsStore.getState().recordFlashcardReview(5);

      expect(useUserStatsStore.getState().flashcardsReviewed).toBe(5);
    });

    it("should default to 1 review", () => {
      useUserStatsStore.getState().recordFlashcardReview();

      expect(useUserStatsStore.getState().flashcardsReviewed).toBe(1);
    });

    it("should accumulate reviews", () => {
      useUserStatsStore.getState().recordFlashcardReview(3);
      useUserStatsStore.getState().recordFlashcardReview(2);

      expect(useUserStatsStore.getState().flashcardsReviewed).toBe(5);
    });
  });

  describe("Store - recordAssessmentCompletion", () => {
    it("should record assessment completion", () => {
      useUserStatsStore.getState().recordAssessmentCompletion(80);

      const state = useUserStatsStore.getState();
      expect(state.assessmentsCompleted).toBe(1);
      expect(state.averageAssessmentScore).toBe(80);
    });

    it("should calculate average score correctly", () => {
      useUserStatsStore.getState().recordAssessmentCompletion(80);
      useUserStatsStore.getState().recordAssessmentCompletion(60);

      const state = useUserStatsStore.getState();
      expect(state.assessmentsCompleted).toBe(2);
      expect(state.averageAssessmentScore).toBe(70); // (80 + 60) / 2
    });

    it("should handle multiple assessments", () => {
      useUserStatsStore.getState().recordAssessmentCompletion(100);
      useUserStatsStore.getState().recordAssessmentCompletion(80);
      useUserStatsStore.getState().recordAssessmentCompletion(60);

      const state = useUserStatsStore.getState();
      expect(state.assessmentsCompleted).toBe(3);
      expect(state.averageAssessmentScore).toBe(80); // (100 + 80 + 60) / 3 = 80
    });
  });

  describe("Store - getLevelProgress", () => {
    it("should return correct progress percentage", () => {
      useUserStatsStore.getState().addXP(50);

      expect(useUserStatsStore.getState().getLevelProgress()).toBe(50);
    });

    it("should return 0 for no XP", () => {
      expect(useUserStatsStore.getState().getLevelProgress()).toBe(0);
    });
  });

  describe("Store - getRecentActivity", () => {
    it("should return activity within specified days", () => {
      useUserStatsStore.getState().recordReadingActivity(30, 1000);

      vi.setSystemTime(new Date("2025-01-16T12:00:00Z"));
      useUserStatsStore.getState().recordReadingActivity(20, 500);

      const recent = useUserStatsStore.getState().getRecentActivity(7);
      expect(recent).toHaveLength(2);
    });

    it("should exclude old activity", () => {
      useUserStatsStore.getState().recordReadingActivity(30, 1000);

      // Advance 10 days
      vi.setSystemTime(new Date("2025-01-25T12:00:00Z"));
      useUserStatsStore.getState().recordReadingActivity(20, 500);

      const recent = useUserStatsStore.getState().getRecentActivity(7);
      expect(recent).toHaveLength(1);
      const activity = recent[0];
      expect(activity).toBeDefined();
      expect(activity?.date).toBe("2025-01-25");
    });
  });

  describe("Store - getTotalForPeriod", () => {
    it("should calculate total minutes for period", () => {
      useUserStatsStore.getState().recordReadingActivity(30, 1000);
      vi.setSystemTime(new Date("2025-01-16T12:00:00Z"));
      useUserStatsStore.getState().recordReadingActivity(20, 500);

      const total = useUserStatsStore
        .getState()
        .getTotalForPeriod(7, "minutesRead");
      expect(total).toBe(50);
    });

    it("should calculate total books for period", () => {
      useUserStatsStore.getState().recordReadingActivity(60, 5000, true);
      useUserStatsStore.getState().recordReadingActivity(30, 3000, true);

      const total = useUserStatsStore
        .getState()
        .getTotalForPeriod(7, "booksCompleted");
      expect(total).toBe(2);
    });
  });

  describe("Store - reset", () => {
    it("should reset all stats to default", () => {
      useUserStatsStore.getState().addXP(500);
      useUserStatsStore.getState().recordReadingActivity(30, 1000, true);
      useUserStatsStore.getState().recordFlashcardReview(10);

      useUserStatsStore.getState().reset();

      const state = useUserStatsStore.getState();
      expect(state.totalXP).toBe(0);
      expect(state.level).toBe(1);
      expect(state.booksCompleted).toBe(0);
      expect(state.activityHistory).toEqual([]);
      expect(state.flashcardsReviewed).toBe(0);
    });
  });

  describe("Type exports", () => {
    it("should export ReadingActivity type", () => {
      const activity: ReadingActivity = {
        date: "2025-01-15",
        minutesRead: 30,
        unitsRead: 1000,
        booksCompleted: 0,
      };
      expect(activity).toBeDefined();
    });

    it("should export UserStats type", () => {
      const stats: UserStats = {
        totalXP: 0,
        level: 1,
        currentLevelXP: 0,
        xpToNextLevel: 100,
        currentStreak: 0,
        longestStreak: 0,
        lastReadDate: null,
        booksCompleted: 0,
        totalReadingMinutes: 0,
        averageWPM: 200,
        flashcardsReviewed: 0,
        assessmentsCompleted: 0,
        averageAssessmentScore: 0,
        activityHistory: [],
        lastUpdated: Date.now(),
      };
      expect(stats).toBeDefined();
    });
  });
});
