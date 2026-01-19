/**
 * Achievements Store for Read Master
 *
 * Manages achievement definitions and user unlock status.
 * Achievement categories:
 * - Reading: Books completed, pages read
 * - Streak: Consecutive reading days
 * - Flashcards: Cards reviewed, retention rate
 * - Assessments: Tests taken, scores
 * - Social: Following, groups, sharing
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const ACHIEVEMENTS_STORAGE_KEY = "read-master-achievements";

/**
 * Achievement category types
 */
export type AchievementCategory =
  | "reading"
  | "streak"
  | "flashcards"
  | "assessments"
  | "social"
  | "milestones";

/**
 * Achievement rarity/tier
 */
export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

/**
 * Achievement definition
 */
export interface Achievement {
  /** Unique identifier */
  id: string;
  /** Display name (translation key) */
  nameKey: string;
  /** Description (translation key) */
  descriptionKey: string;
  /** Category for filtering */
  category: AchievementCategory;
  /** Rarity tier affects styling and XP reward */
  tier: AchievementTier;
  /** Icon name from MUI icons */
  icon: string;
  /** Threshold value to unlock (e.g., 10 books, 7 day streak) */
  threshold: number;
  /** XP reward when unlocked */
  xpReward: number;
  /** Whether this achievement is hidden until unlocked */
  isSecret?: boolean;
}

/**
 * User's progress toward an achievement
 */
export interface AchievementProgress {
  /** Achievement ID */
  achievementId: string;
  /** Current progress value */
  currentValue: number;
  /** Whether the achievement is unlocked */
  isUnlocked: boolean;
  /** Timestamp when unlocked (null if not unlocked) */
  unlockedAt: number | null;
}

/**
 * XP rewards by tier
 */
export const TIER_XP_REWARDS: Record<AchievementTier, number> = {
  bronze: 50,
  silver: 100,
  gold: 250,
  platinum: 500,
};

/**
 * Tier colors for styling
 */
export const TIER_COLORS: Record<AchievementTier, string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#E5E4E2",
};

/**
 * All available achievements
 */
export const ACHIEVEMENTS: Achievement[] = [
  // Reading achievements
  {
    id: "first_book",
    nameKey: "achievements.firstBook.name",
    descriptionKey: "achievements.firstBook.description",
    category: "reading",
    tier: "bronze",
    icon: "MenuBook",
    threshold: 1,
    xpReward: TIER_XP_REWARDS.bronze,
  },
  {
    id: "bookworm",
    nameKey: "achievements.bookworm.name",
    descriptionKey: "achievements.bookworm.description",
    category: "reading",
    tier: "silver",
    icon: "AutoStories",
    threshold: 10,
    xpReward: TIER_XP_REWARDS.silver,
  },
  {
    id: "bibliophile",
    nameKey: "achievements.bibliophile.name",
    descriptionKey: "achievements.bibliophile.description",
    category: "reading",
    tier: "gold",
    icon: "LibraryBooks",
    threshold: 50,
    xpReward: TIER_XP_REWARDS.gold,
  },
  {
    id: "library_master",
    nameKey: "achievements.libraryMaster.name",
    descriptionKey: "achievements.libraryMaster.description",
    category: "reading",
    tier: "platinum",
    icon: "EmojiEvents",
    threshold: 100,
    xpReward: TIER_XP_REWARDS.platinum,
  },

  // Streak achievements
  {
    id: "streak_starter",
    nameKey: "achievements.streakStarter.name",
    descriptionKey: "achievements.streakStarter.description",
    category: "streak",
    tier: "bronze",
    icon: "LocalFireDepartment",
    threshold: 3,
    xpReward: TIER_XP_REWARDS.bronze,
  },
  {
    id: "week_warrior",
    nameKey: "achievements.weekWarrior.name",
    descriptionKey: "achievements.weekWarrior.description",
    category: "streak",
    tier: "silver",
    icon: "Whatshot",
    threshold: 7,
    xpReward: TIER_XP_REWARDS.silver,
  },
  {
    id: "month_champion",
    nameKey: "achievements.monthChampion.name",
    descriptionKey: "achievements.monthChampion.description",
    category: "streak",
    tier: "gold",
    icon: "Brightness5",
    threshold: 30,
    xpReward: TIER_XP_REWARDS.gold,
  },
  {
    id: "streak_legend",
    nameKey: "achievements.streakLegend.name",
    descriptionKey: "achievements.streakLegend.description",
    category: "streak",
    tier: "platinum",
    icon: "Stars",
    threshold: 100,
    xpReward: TIER_XP_REWARDS.platinum,
  },

  // Flashcard achievements
  {
    id: "flash_learner",
    nameKey: "achievements.flashLearner.name",
    descriptionKey: "achievements.flashLearner.description",
    category: "flashcards",
    tier: "bronze",
    icon: "School",
    threshold: 50,
    xpReward: TIER_XP_REWARDS.bronze,
  },
  {
    id: "memory_master",
    nameKey: "achievements.memoryMaster.name",
    descriptionKey: "achievements.memoryMaster.description",
    category: "flashcards",
    tier: "silver",
    icon: "Psychology",
    threshold: 250,
    xpReward: TIER_XP_REWARDS.silver,
  },
  {
    id: "knowledge_keeper",
    nameKey: "achievements.knowledgeKeeper.name",
    descriptionKey: "achievements.knowledgeKeeper.description",
    category: "flashcards",
    tier: "gold",
    icon: "Lightbulb",
    threshold: 1000,
    xpReward: TIER_XP_REWARDS.gold,
  },
  {
    id: "flashcard_sage",
    nameKey: "achievements.flashcardSage.name",
    descriptionKey: "achievements.flashcardSage.description",
    category: "flashcards",
    tier: "platinum",
    icon: "Star",
    threshold: 5000,
    xpReward: TIER_XP_REWARDS.platinum,
  },

  // Assessment achievements
  {
    id: "test_taker",
    nameKey: "achievements.testTaker.name",
    descriptionKey: "achievements.testTaker.description",
    category: "assessments",
    tier: "bronze",
    icon: "Assignment",
    threshold: 5,
    xpReward: TIER_XP_REWARDS.bronze,
  },
  {
    id: "high_achiever",
    nameKey: "achievements.highAchiever.name",
    descriptionKey: "achievements.highAchiever.description",
    category: "assessments",
    tier: "silver",
    icon: "Grade",
    threshold: 90,
    xpReward: TIER_XP_REWARDS.silver,
  },
  {
    id: "perfect_score",
    nameKey: "achievements.perfectScore.name",
    descriptionKey: "achievements.perfectScore.description",
    category: "assessments",
    tier: "gold",
    icon: "WorkspacePremium",
    threshold: 100,
    xpReward: TIER_XP_REWARDS.gold,
  },
  {
    id: "assessment_expert",
    nameKey: "achievements.assessmentExpert.name",
    descriptionKey: "achievements.assessmentExpert.description",
    category: "assessments",
    tier: "platinum",
    icon: "MilitaryTech",
    threshold: 50,
    xpReward: TIER_XP_REWARDS.platinum,
  },

  // Milestone achievements
  {
    id: "level_5",
    nameKey: "achievements.level5.name",
    descriptionKey: "achievements.level5.description",
    category: "milestones",
    tier: "bronze",
    icon: "TrendingUp",
    threshold: 5,
    xpReward: TIER_XP_REWARDS.bronze,
  },
  {
    id: "level_10",
    nameKey: "achievements.level10.name",
    descriptionKey: "achievements.level10.description",
    category: "milestones",
    tier: "silver",
    icon: "Rocket",
    threshold: 10,
    xpReward: TIER_XP_REWARDS.silver,
  },
  {
    id: "level_25",
    nameKey: "achievements.level25.name",
    descriptionKey: "achievements.level25.description",
    category: "milestones",
    tier: "gold",
    icon: "Diamond",
    threshold: 25,
    xpReward: TIER_XP_REWARDS.gold,
  },
  {
    id: "level_50",
    nameKey: "achievements.level50.name",
    descriptionKey: "achievements.level50.description",
    category: "milestones",
    tier: "platinum",
    icon: "EmojiEvents",
    threshold: 50,
    xpReward: TIER_XP_REWARDS.platinum,
  },

  // Reading time achievements
  {
    id: "hour_reader",
    nameKey: "achievements.hourReader.name",
    descriptionKey: "achievements.hourReader.description",
    category: "reading",
    tier: "bronze",
    icon: "AccessTime",
    threshold: 60,
    xpReward: TIER_XP_REWARDS.bronze,
  },
  {
    id: "dedicated_reader",
    nameKey: "achievements.dedicatedReader.name",
    descriptionKey: "achievements.dedicatedReader.description",
    category: "reading",
    tier: "silver",
    icon: "Schedule",
    threshold: 600,
    xpReward: TIER_XP_REWARDS.silver,
  },
  {
    id: "reading_marathon",
    nameKey: "achievements.readingMarathon.name",
    descriptionKey: "achievements.readingMarathon.description",
    category: "reading",
    tier: "gold",
    icon: "Timer",
    threshold: 3000,
    xpReward: TIER_XP_REWARDS.gold,
  },
];

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(
  category: AchievementCategory
): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

/**
 * Calculate progress percentage
 */
export function calculateProgressPercent(
  current: number,
  threshold: number
): number {
  if (threshold <= 0) return 100;
  return Math.min(100, Math.round((current / threshold) * 100));
}

/**
 * Achievement store state
 */
interface AchievementsState {
  /** User's progress for each achievement */
  progress: Record<string, AchievementProgress>;
  /** IDs of achievements unlocked in the current session (for animations) */
  newlyUnlocked: string[];
  /** Last update timestamp */
  lastUpdated: number;
}

/**
 * Achievement store actions
 */
interface AchievementsActions {
  /** Update progress for an achievement */
  updateProgress: (achievementId: string, currentValue: number) => void;
  /** Check if an achievement should be unlocked */
  checkUnlock: (achievementId: string) => boolean;
  /** Mark an achievement as unlocked */
  unlockAchievement: (achievementId: string) => void;
  /** Clear newly unlocked achievements (after showing animation) */
  clearNewlyUnlocked: () => void;
  /** Get progress for an achievement */
  getProgress: (achievementId: string) => AchievementProgress;
  /** Get all unlocked achievements */
  getUnlockedAchievements: () => Achievement[];
  /** Get all locked achievements */
  getLockedAchievements: () => Achievement[];
  /** Get total XP earned from achievements */
  getTotalAchievementXP: () => number;
  /** Get unlock count */
  getUnlockCount: () => number;
  /** Bulk check achievements based on user stats */
  checkAchievementsFromStats: (stats: {
    booksCompleted: number;
    currentStreak: number;
    flashcardsReviewed: number;
    assessmentsCompleted: number;
    averageAssessmentScore: number;
    level: number;
    totalReadingMinutes: number;
  }) => string[];
  /** Reset all achievements */
  reset: () => void;
}

type AchievementsStore = AchievementsState & AchievementsActions;

const DEFAULT_STATE: AchievementsState = {
  progress: {},
  newlyUnlocked: [],
  lastUpdated: Date.now(),
};

/**
 * Initialize default progress for all achievements
 */
function initializeProgress(): Record<string, AchievementProgress> {
  const progress: Record<string, AchievementProgress> = {};
  for (const achievement of ACHIEVEMENTS) {
    progress[achievement.id] = {
      achievementId: achievement.id,
      currentValue: 0,
      isUnlocked: false,
      unlockedAt: null,
    };
  }
  return progress;
}

export const useAchievementsStore = create<AchievementsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      progress: initializeProgress(),

      updateProgress: (achievementId: string, currentValue: number) => {
        const achievement = getAchievementById(achievementId);
        if (!achievement) return;

        const state = get();
        const currentProgress = state.progress[achievementId];
        if (!currentProgress) return;

        // Don't update if already unlocked
        if (currentProgress.isUnlocked) return;

        const newProgress = {
          ...currentProgress,
          currentValue: Math.max(0, currentValue),
        };

        set({
          progress: {
            ...state.progress,
            [achievementId]: newProgress,
          },
          lastUpdated: Date.now(),
        });

        // Check if should unlock
        if (currentValue >= achievement.threshold) {
          get().unlockAchievement(achievementId);
        }
      },

      checkUnlock: (achievementId: string): boolean => {
        const achievement = getAchievementById(achievementId);
        if (!achievement) return false;

        const progress = get().progress[achievementId];
        if (!progress) return false;

        return (
          !progress.isUnlocked && progress.currentValue >= achievement.threshold
        );
      },

      unlockAchievement: (achievementId: string) => {
        const achievement = getAchievementById(achievementId);
        if (!achievement) return;

        const state = get();
        const currentProgress = state.progress[achievementId];
        if (!currentProgress || currentProgress.isUnlocked) return;

        const newProgress: AchievementProgress = {
          ...currentProgress,
          isUnlocked: true,
          unlockedAt: Date.now(),
        };

        set({
          progress: {
            ...state.progress,
            [achievementId]: newProgress,
          },
          newlyUnlocked: [...state.newlyUnlocked, achievementId],
          lastUpdated: Date.now(),
        });
      },

      clearNewlyUnlocked: () => {
        set({ newlyUnlocked: [] });
      },

      getProgress: (achievementId: string): AchievementProgress => {
        const state = get();
        return (
          state.progress[achievementId] ?? {
            achievementId,
            currentValue: 0,
            isUnlocked: false,
            unlockedAt: null,
          }
        );
      },

      getUnlockedAchievements: (): Achievement[] => {
        const state = get();
        return ACHIEVEMENTS.filter(
          (a) => state.progress[a.id]?.isUnlocked === true
        );
      },

      getLockedAchievements: (): Achievement[] => {
        const state = get();
        return ACHIEVEMENTS.filter(
          (a) => state.progress[a.id]?.isUnlocked !== true
        );
      },

      getTotalAchievementXP: (): number => {
        const state = get();
        return ACHIEVEMENTS.filter(
          (a) => state.progress[a.id]?.isUnlocked === true
        ).reduce((sum, a) => sum + a.xpReward, 0);
      },

      getUnlockCount: (): number => {
        return get().getUnlockedAchievements().length;
      },

      checkAchievementsFromStats: (stats): string[] => {
        const newUnlocks: string[] = [];
        const state = get();

        // Check reading achievements (books completed)
        const readingAchievements = [
          "first_book",
          "bookworm",
          "bibliophile",
          "library_master",
        ];
        for (const id of readingAchievements) {
          const achievement = getAchievementById(id);
          const progress = state.progress[id];
          if (
            achievement &&
            progress &&
            !progress.isUnlocked &&
            stats.booksCompleted >= achievement.threshold
          ) {
            get().updateProgress(id, stats.booksCompleted);
            newUnlocks.push(id);
          }
        }

        // Check streak achievements
        const streakAchievements = [
          "streak_starter",
          "week_warrior",
          "month_champion",
          "streak_legend",
        ];
        for (const id of streakAchievements) {
          const achievement = getAchievementById(id);
          const progress = state.progress[id];
          if (
            achievement &&
            progress &&
            !progress.isUnlocked &&
            stats.currentStreak >= achievement.threshold
          ) {
            get().updateProgress(id, stats.currentStreak);
            newUnlocks.push(id);
          }
        }

        // Check flashcard achievements
        const flashcardAchievements = [
          "flash_learner",
          "memory_master",
          "knowledge_keeper",
          "flashcard_sage",
        ];
        for (const id of flashcardAchievements) {
          const achievement = getAchievementById(id);
          const progress = state.progress[id];
          if (
            achievement &&
            progress &&
            !progress.isUnlocked &&
            stats.flashcardsReviewed >= achievement.threshold
          ) {
            get().updateProgress(id, stats.flashcardsReviewed);
            newUnlocks.push(id);
          }
        }

        // Check assessment achievements
        if (
          stats.assessmentsCompleted >= 5 &&
          !state.progress["test_taker"]?.isUnlocked
        ) {
          get().updateProgress("test_taker", stats.assessmentsCompleted);
          newUnlocks.push("test_taker");
        }
        if (
          stats.averageAssessmentScore >= 90 &&
          stats.assessmentsCompleted >= 3 &&
          !state.progress["high_achiever"]?.isUnlocked
        ) {
          get().updateProgress("high_achiever", stats.averageAssessmentScore);
          newUnlocks.push("high_achiever");
        }
        if (
          stats.assessmentsCompleted >= 50 &&
          !state.progress["assessment_expert"]?.isUnlocked
        ) {
          get().updateProgress("assessment_expert", stats.assessmentsCompleted);
          newUnlocks.push("assessment_expert");
        }

        // Check level achievements
        const levelAchievements = [
          "level_5",
          "level_10",
          "level_25",
          "level_50",
        ];
        for (const id of levelAchievements) {
          const achievement = getAchievementById(id);
          const progress = state.progress[id];
          if (
            achievement &&
            progress &&
            !progress.isUnlocked &&
            stats.level >= achievement.threshold
          ) {
            get().updateProgress(id, stats.level);
            newUnlocks.push(id);
          }
        }

        // Check reading time achievements
        const readingTimeAchievements = [
          "hour_reader",
          "dedicated_reader",
          "reading_marathon",
        ];
        for (const id of readingTimeAchievements) {
          const achievement = getAchievementById(id);
          const progress = state.progress[id];
          if (
            achievement &&
            progress &&
            !progress.isUnlocked &&
            stats.totalReadingMinutes >= achievement.threshold
          ) {
            get().updateProgress(id, stats.totalReadingMinutes);
            newUnlocks.push(id);
          }
        }

        return newUnlocks;
      },

      reset: () => {
        set({
          ...DEFAULT_STATE,
          progress: initializeProgress(),
          lastUpdated: Date.now(),
        });
      },
    }),
    {
      name: ACHIEVEMENTS_STORAGE_KEY,
      partialize: (state) => ({
        progress: state.progress,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);
