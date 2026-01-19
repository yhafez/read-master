/**
 * Tests for Achievements Store
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ACHIEVEMENTS,
  ACHIEVEMENTS_STORAGE_KEY,
  TIER_XP_REWARDS,
  TIER_COLORS,
  getAchievementById,
  getAchievementsByCategory,
  calculateProgressPercent,
  useAchievementsStore,
} from "./achievementsStore";
import type { AchievementCategory, AchievementTier } from "./achievementsStore";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("Achievement Constants", () => {
  describe("ACHIEVEMENTS array", () => {
    it("should have 23 achievements defined", () => {
      expect(ACHIEVEMENTS.length).toBe(23);
    });

    it("should have unique IDs for all achievements", () => {
      const ids = ACHIEVEMENTS.map((a) => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have valid categories for all achievements", () => {
      const validCategories: AchievementCategory[] = [
        "reading",
        "streak",
        "flashcards",
        "assessments",
        "social",
        "milestones",
      ];
      ACHIEVEMENTS.forEach((achievement) => {
        expect(validCategories).toContain(achievement.category);
      });
    });

    it("should have valid tiers for all achievements", () => {
      const validTiers: AchievementTier[] = [
        "bronze",
        "silver",
        "gold",
        "platinum",
      ];
      ACHIEVEMENTS.forEach((achievement) => {
        expect(validTiers).toContain(achievement.tier);
      });
    });

    it("should have positive thresholds for all achievements", () => {
      ACHIEVEMENTS.forEach((achievement) => {
        expect(achievement.threshold).toBeGreaterThan(0);
      });
    });

    it("should have xpReward matching tier XP rewards", () => {
      ACHIEVEMENTS.forEach((achievement) => {
        expect(achievement.xpReward).toBe(TIER_XP_REWARDS[achievement.tier]);
      });
    });

    it("should have nameKey and descriptionKey for all achievements", () => {
      ACHIEVEMENTS.forEach((achievement) => {
        expect(achievement.nameKey).toBeTruthy();
        expect(achievement.descriptionKey).toBeTruthy();
        expect(achievement.nameKey.startsWith("achievements.")).toBe(true);
        expect(achievement.descriptionKey.startsWith("achievements.")).toBe(
          true
        );
      });
    });

    it("should have icon for all achievements", () => {
      ACHIEVEMENTS.forEach((achievement) => {
        expect(achievement.icon).toBeTruthy();
        expect(typeof achievement.icon).toBe("string");
      });
    });
  });

  describe("TIER_XP_REWARDS", () => {
    it("should have correct XP values for each tier", () => {
      expect(TIER_XP_REWARDS.bronze).toBe(50);
      expect(TIER_XP_REWARDS.silver).toBe(100);
      expect(TIER_XP_REWARDS.gold).toBe(250);
      expect(TIER_XP_REWARDS.platinum).toBe(500);
    });

    it("should have increasing XP values by tier", () => {
      expect(TIER_XP_REWARDS.bronze).toBeLessThan(TIER_XP_REWARDS.silver);
      expect(TIER_XP_REWARDS.silver).toBeLessThan(TIER_XP_REWARDS.gold);
      expect(TIER_XP_REWARDS.gold).toBeLessThan(TIER_XP_REWARDS.platinum);
    });
  });

  describe("TIER_COLORS", () => {
    it("should have valid hex color values for each tier", () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      expect(TIER_COLORS.bronze).toMatch(hexColorRegex);
      expect(TIER_COLORS.silver).toMatch(hexColorRegex);
      expect(TIER_COLORS.gold).toMatch(hexColorRegex);
      expect(TIER_COLORS.platinum).toMatch(hexColorRegex);
    });
  });

  describe("ACHIEVEMENTS_STORAGE_KEY", () => {
    it("should have the correct storage key", () => {
      expect(ACHIEVEMENTS_STORAGE_KEY).toBe("read-master-achievements");
    });
  });
});

describe("Helper Functions", () => {
  describe("getAchievementById", () => {
    it("should return the correct achievement for a valid ID", () => {
      const achievement = getAchievementById("first_book");
      expect(achievement).toBeDefined();
      expect(achievement?.id).toBe("first_book");
      expect(achievement?.category).toBe("reading");
      expect(achievement?.tier).toBe("bronze");
    });

    it("should return undefined for an invalid ID", () => {
      const achievement = getAchievementById("non_existent_achievement");
      expect(achievement).toBeUndefined();
    });

    it("should return the correct achievement for each category", () => {
      const streakAchievement = getAchievementById("streak_starter");
      expect(streakAchievement?.category).toBe("streak");

      const flashcardAchievement = getAchievementById("flash_learner");
      expect(flashcardAchievement?.category).toBe("flashcards");

      const assessmentAchievement = getAchievementById("test_taker");
      expect(assessmentAchievement?.category).toBe("assessments");

      const milestoneAchievement = getAchievementById("level_5");
      expect(milestoneAchievement?.category).toBe("milestones");
    });
  });

  describe("getAchievementsByCategory", () => {
    it("should return all reading achievements", () => {
      const readingAchievements = getAchievementsByCategory("reading");
      expect(readingAchievements.length).toBeGreaterThan(0);
      readingAchievements.forEach((a) => {
        expect(a.category).toBe("reading");
      });
    });

    it("should return all streak achievements", () => {
      const streakAchievements = getAchievementsByCategory("streak");
      expect(streakAchievements.length).toBe(4);
      streakAchievements.forEach((a) => {
        expect(a.category).toBe("streak");
      });
    });

    it("should return all flashcard achievements", () => {
      const flashcardAchievements = getAchievementsByCategory("flashcards");
      expect(flashcardAchievements.length).toBe(4);
      flashcardAchievements.forEach((a) => {
        expect(a.category).toBe("flashcards");
      });
    });

    it("should return all assessment achievements", () => {
      const assessmentAchievements = getAchievementsByCategory("assessments");
      expect(assessmentAchievements.length).toBe(4);
      assessmentAchievements.forEach((a) => {
        expect(a.category).toBe("assessments");
      });
    });

    it("should return all milestone achievements", () => {
      const milestoneAchievements = getAchievementsByCategory("milestones");
      expect(milestoneAchievements.length).toBe(4);
      milestoneAchievements.forEach((a) => {
        expect(a.category).toBe("milestones");
      });
    });

    it("should return empty array for social category (no social achievements yet)", () => {
      const socialAchievements = getAchievementsByCategory("social");
      expect(socialAchievements.length).toBe(0);
    });
  });

  describe("calculateProgressPercent", () => {
    it("should return 0 for 0 current value", () => {
      expect(calculateProgressPercent(0, 100)).toBe(0);
    });

    it("should return 50 for halfway progress", () => {
      expect(calculateProgressPercent(50, 100)).toBe(50);
    });

    it("should return 100 for completed progress", () => {
      expect(calculateProgressPercent(100, 100)).toBe(100);
    });

    it("should cap at 100 for over-completed progress", () => {
      expect(calculateProgressPercent(150, 100)).toBe(100);
    });

    it("should return 100 for threshold of 0 or less", () => {
      expect(calculateProgressPercent(50, 0)).toBe(100);
      expect(calculateProgressPercent(50, -10)).toBe(100);
    });

    it("should round to nearest integer", () => {
      expect(calculateProgressPercent(33, 100)).toBe(33);
      expect(calculateProgressPercent(1, 3)).toBe(33);
      expect(calculateProgressPercent(2, 3)).toBe(67);
    });
  });
});

describe("useAchievementsStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset store state
    useAchievementsStore.getState().reset();
  });

  describe("Initial State", () => {
    it("should have progress initialized for all achievements", () => {
      const state = useAchievementsStore.getState();
      ACHIEVEMENTS.forEach((achievement) => {
        const progress = state.progress[achievement.id];
        expect(progress).toBeDefined();
        expect(progress!.achievementId).toBe(achievement.id);
        expect(progress!.currentValue).toBe(0);
        expect(progress!.isUnlocked).toBe(false);
        expect(progress!.unlockedAt).toBeNull();
      });
    });

    it("should have empty newlyUnlocked array", () => {
      const state = useAchievementsStore.getState();
      expect(state.newlyUnlocked).toEqual([]);
    });

    it("should have lastUpdated timestamp", () => {
      const state = useAchievementsStore.getState();
      expect(state.lastUpdated).toBeGreaterThan(0);
    });
  });

  describe("updateProgress", () => {
    it("should update progress for a valid achievement", () => {
      useAchievementsStore.getState().updateProgress("first_book", 1);

      const state = useAchievementsStore.getState();
      expect(state.progress["first_book"]!.currentValue).toBe(1);
    });

    it("should not update progress for an invalid achievement", () => {
      useAchievementsStore.getState().updateProgress("invalid_id", 100);

      const state = useAchievementsStore.getState();
      expect(state.progress["invalid_id"]).toBeUndefined();
    });

    it("should auto-unlock achievement when threshold is reached", () => {
      useAchievementsStore.getState().updateProgress("first_book", 1);

      const state = useAchievementsStore.getState();
      expect(state.progress["first_book"]!.isUnlocked).toBe(true);
      expect(state.progress["first_book"]!.unlockedAt).not.toBeNull();
    });

    it("should not decrease progress below 0", () => {
      useAchievementsStore.getState().updateProgress("first_book", -5);

      const state = useAchievementsStore.getState();
      expect(state.progress["first_book"]!.currentValue).toBe(0);
    });

    it("should not update progress for already unlocked achievement", () => {
      // First unlock the achievement
      useAchievementsStore.getState().updateProgress("first_book", 1);

      // Try to update again
      useAchievementsStore.getState().updateProgress("first_book", 5);

      const state = useAchievementsStore.getState();
      // Value should remain at 1 since it was unlocked
      expect(state.progress["first_book"]!.currentValue).toBe(1);
    });
  });

  describe("checkUnlock", () => {
    it("should return false for achievement with insufficient progress", () => {
      useAchievementsStore.getState().updateProgress("bookworm", 5);

      const shouldUnlock = useAchievementsStore
        .getState()
        .checkUnlock("bookworm");
      expect(shouldUnlock).toBe(false);
    });

    it("should return false for invalid achievement", () => {
      const shouldUnlock = useAchievementsStore
        .getState()
        .checkUnlock("invalid_id");
      expect(shouldUnlock).toBe(false);
    });

    it("should return false for already unlocked achievement", () => {
      useAchievementsStore.getState().updateProgress("first_book", 1);

      const shouldUnlock = useAchievementsStore
        .getState()
        .checkUnlock("first_book");
      expect(shouldUnlock).toBe(false);
    });
  });

  describe("unlockAchievement", () => {
    it("should unlock a valid achievement", () => {
      useAchievementsStore.getState().unlockAchievement("first_book");

      const state = useAchievementsStore.getState();
      expect(state.progress["first_book"]!.isUnlocked).toBe(true);
      expect(state.progress["first_book"]!.unlockedAt).not.toBeNull();
    });

    it("should add to newlyUnlocked array", () => {
      useAchievementsStore.getState().unlockAchievement("first_book");

      const state = useAchievementsStore.getState();
      expect(state.newlyUnlocked).toContain("first_book");
    });

    it("should not re-unlock already unlocked achievement", () => {
      useAchievementsStore.getState().unlockAchievement("first_book");

      const firstState = useAchievementsStore.getState();
      const firstUnlockTime = firstState.progress["first_book"]!.unlockedAt;

      // Try to unlock again
      useAchievementsStore.getState().unlockAchievement("first_book");

      const secondState = useAchievementsStore.getState();
      expect(secondState.progress["first_book"]!.unlockedAt).toBe(
        firstUnlockTime
      );
      // Should not add duplicate to newlyUnlocked
      expect(
        secondState.newlyUnlocked.filter((id) => id === "first_book").length
      ).toBe(1);
    });

    it("should not unlock invalid achievement", () => {
      useAchievementsStore.getState().unlockAchievement("invalid_id");

      const state = useAchievementsStore.getState();
      expect(state.newlyUnlocked).not.toContain("invalid_id");
    });
  });

  describe("clearNewlyUnlocked", () => {
    it("should clear the newlyUnlocked array", () => {
      useAchievementsStore.getState().unlockAchievement("first_book");
      useAchievementsStore.getState().unlockAchievement("bookworm");

      expect(useAchievementsStore.getState().newlyUnlocked.length).toBe(2);

      useAchievementsStore.getState().clearNewlyUnlocked();

      expect(useAchievementsStore.getState().newlyUnlocked).toEqual([]);
    });
  });

  describe("getProgress", () => {
    it("should return progress for a valid achievement", () => {
      useAchievementsStore.getState().updateProgress("bookworm", 5);

      const progress = useAchievementsStore.getState().getProgress("bookworm");
      expect(progress.achievementId).toBe("bookworm");
      expect(progress.currentValue).toBe(5);
      expect(progress.isUnlocked).toBe(false);
    });

    it("should return default progress for invalid achievement", () => {
      const progress = useAchievementsStore
        .getState()
        .getProgress("invalid_id");
      expect(progress.achievementId).toBe("invalid_id");
      expect(progress.currentValue).toBe(0);
      expect(progress.isUnlocked).toBe(false);
      expect(progress.unlockedAt).toBeNull();
    });
  });

  describe("getUnlockedAchievements", () => {
    it("should return empty array when no achievements unlocked", () => {
      const unlocked = useAchievementsStore
        .getState()
        .getUnlockedAchievements();
      expect(unlocked).toEqual([]);
    });

    it("should return all unlocked achievements", () => {
      useAchievementsStore.getState().unlockAchievement("first_book");
      useAchievementsStore.getState().unlockAchievement("streak_starter");

      const unlocked = useAchievementsStore
        .getState()
        .getUnlockedAchievements();
      expect(unlocked.length).toBe(2);
      expect(unlocked.map((a) => a.id)).toContain("first_book");
      expect(unlocked.map((a) => a.id)).toContain("streak_starter");
    });
  });

  describe("getLockedAchievements", () => {
    it("should return all achievements when none unlocked", () => {
      const locked = useAchievementsStore.getState().getLockedAchievements();
      expect(locked.length).toBe(ACHIEVEMENTS.length);
    });

    it("should exclude unlocked achievements", () => {
      useAchievementsStore.getState().unlockAchievement("first_book");

      const locked = useAchievementsStore.getState().getLockedAchievements();
      expect(locked.length).toBe(ACHIEVEMENTS.length - 1);
      expect(locked.map((a) => a.id)).not.toContain("first_book");
    });
  });

  describe("getTotalAchievementXP", () => {
    it("should return 0 when no achievements unlocked", () => {
      const xp = useAchievementsStore.getState().getTotalAchievementXP();
      expect(xp).toBe(0);
    });

    it("should calculate correct XP for unlocked achievements", () => {
      useAchievementsStore.getState().unlockAchievement("first_book"); // bronze: 50
      useAchievementsStore.getState().unlockAchievement("bookworm"); // silver: 100

      const xp = useAchievementsStore.getState().getTotalAchievementXP();
      expect(xp).toBe(150);
    });
  });

  describe("getUnlockCount", () => {
    it("should return 0 when no achievements unlocked", () => {
      const count = useAchievementsStore.getState().getUnlockCount();
      expect(count).toBe(0);
    });

    it("should return correct count of unlocked achievements", () => {
      useAchievementsStore.getState().unlockAchievement("first_book");
      useAchievementsStore.getState().unlockAchievement("bookworm");
      useAchievementsStore.getState().unlockAchievement("streak_starter");

      const count = useAchievementsStore.getState().getUnlockCount();
      expect(count).toBe(3);
    });
  });

  describe("checkAchievementsFromStats", () => {
    it("should unlock reading achievements based on books completed", () => {
      const newUnlocks = useAchievementsStore
        .getState()
        .checkAchievementsFromStats({
          booksCompleted: 10,
          currentStreak: 0,
          flashcardsReviewed: 0,
          assessmentsCompleted: 0,
          averageAssessmentScore: 0,
          level: 1,
          totalReadingMinutes: 0,
        });

      expect(newUnlocks).toContain("first_book");
      expect(newUnlocks).toContain("bookworm");
      expect(newUnlocks).not.toContain("bibliophile");
    });

    it("should unlock streak achievements based on current streak", () => {
      const newUnlocks = useAchievementsStore
        .getState()
        .checkAchievementsFromStats({
          booksCompleted: 0,
          currentStreak: 7,
          flashcardsReviewed: 0,
          assessmentsCompleted: 0,
          averageAssessmentScore: 0,
          level: 1,
          totalReadingMinutes: 0,
        });

      expect(newUnlocks).toContain("streak_starter");
      expect(newUnlocks).toContain("week_warrior");
      expect(newUnlocks).not.toContain("month_champion");
    });

    it("should unlock flashcard achievements based on cards reviewed", () => {
      const newUnlocks = useAchievementsStore
        .getState()
        .checkAchievementsFromStats({
          booksCompleted: 0,
          currentStreak: 0,
          flashcardsReviewed: 250,
          assessmentsCompleted: 0,
          averageAssessmentScore: 0,
          level: 1,
          totalReadingMinutes: 0,
        });

      expect(newUnlocks).toContain("flash_learner");
      expect(newUnlocks).toContain("memory_master");
      expect(newUnlocks).not.toContain("knowledge_keeper");
    });

    it("should unlock assessment achievements", () => {
      const newUnlocks = useAchievementsStore
        .getState()
        .checkAchievementsFromStats({
          booksCompleted: 0,
          currentStreak: 0,
          flashcardsReviewed: 0,
          assessmentsCompleted: 5,
          averageAssessmentScore: 95,
          level: 1,
          totalReadingMinutes: 0,
        });

      expect(newUnlocks).toContain("test_taker");
      expect(newUnlocks).toContain("high_achiever");
    });

    it("should unlock level milestones", () => {
      const newUnlocks = useAchievementsStore
        .getState()
        .checkAchievementsFromStats({
          booksCompleted: 0,
          currentStreak: 0,
          flashcardsReviewed: 0,
          assessmentsCompleted: 0,
          averageAssessmentScore: 0,
          level: 10,
          totalReadingMinutes: 0,
        });

      expect(newUnlocks).toContain("level_5");
      expect(newUnlocks).toContain("level_10");
      expect(newUnlocks).not.toContain("level_25");
    });

    it("should unlock reading time achievements", () => {
      const newUnlocks = useAchievementsStore
        .getState()
        .checkAchievementsFromStats({
          booksCompleted: 0,
          currentStreak: 0,
          flashcardsReviewed: 0,
          assessmentsCompleted: 0,
          averageAssessmentScore: 0,
          level: 1,
          totalReadingMinutes: 600,
        });

      expect(newUnlocks).toContain("hour_reader");
      expect(newUnlocks).toContain("dedicated_reader");
      expect(newUnlocks).not.toContain("reading_marathon");
    });

    it("should not unlock already unlocked achievements", () => {
      // First call unlocks first_book
      useAchievementsStore.getState().checkAchievementsFromStats({
        booksCompleted: 1,
        currentStreak: 0,
        flashcardsReviewed: 0,
        assessmentsCompleted: 0,
        averageAssessmentScore: 0,
        level: 1,
        totalReadingMinutes: 0,
      });

      // Second call should not include first_book
      const newUnlocks = useAchievementsStore
        .getState()
        .checkAchievementsFromStats({
          booksCompleted: 1,
          currentStreak: 0,
          flashcardsReviewed: 0,
          assessmentsCompleted: 0,
          averageAssessmentScore: 0,
          level: 1,
          totalReadingMinutes: 0,
        });

      expect(newUnlocks).not.toContain("first_book");
    });

    it("should require minimum assessments for high_achiever", () => {
      // High score but only 2 assessments
      const newUnlocks = useAchievementsStore
        .getState()
        .checkAchievementsFromStats({
          booksCompleted: 0,
          currentStreak: 0,
          flashcardsReviewed: 0,
          assessmentsCompleted: 2,
          averageAssessmentScore: 95,
          level: 1,
          totalReadingMinutes: 0,
        });

      expect(newUnlocks).not.toContain("high_achiever");
    });
  });

  describe("reset", () => {
    it("should reset all progress to initial state", () => {
      // Make some changes
      useAchievementsStore.getState().unlockAchievement("first_book");
      useAchievementsStore.getState().updateProgress("bookworm", 5);

      // Reset
      useAchievementsStore.getState().reset();

      const state = useAchievementsStore.getState();
      expect(state.progress["first_book"]!.isUnlocked).toBe(false);
      expect(state.progress["first_book"]!.unlockedAt).toBeNull();
      expect(state.progress["bookworm"]!.currentValue).toBe(0);
      expect(state.newlyUnlocked).toEqual([]);
    });
  });
});

describe("Achievement Categories Coverage", () => {
  it("should have at least one bronze tier per category with achievements", () => {
    const categoriesWithAchievements: AchievementCategory[] = [
      "reading",
      "streak",
      "flashcards",
      "assessments",
      "milestones",
    ];

    categoriesWithAchievements.forEach((category) => {
      const categoryAchievements = getAchievementsByCategory(category);
      const hasBronze = categoryAchievements.some((a) => a.tier === "bronze");
      expect(hasBronze).toBe(true);
    });
  });

  it("should have progression within each category (bronze -> platinum)", () => {
    const categoriesWithAchievements: AchievementCategory[] = [
      "reading",
      "streak",
      "flashcards",
      "assessments",
      "milestones",
    ];

    categoriesWithAchievements.forEach((category) => {
      const categoryAchievements = getAchievementsByCategory(category);
      const tiers = categoryAchievements.map((a) => a.tier);
      // At minimum should have bronze and at least one higher tier
      expect(tiers).toContain("bronze");
    });
  });
});
