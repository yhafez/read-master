/**
 * User Stats store for Read Master
 *
 * Manages user gamification statistics including:
 * - XP (experience points) and level progression
 * - Reading streak tracking
 * - Books read and reading time
 * - Achievement tracking
 * - localStorage persistence
 *
 * Level system:
 * - Each level requires XP_PER_LEVEL * currentLevel XP
 * - This creates increasing difficulty as levels progress
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const USER_STATS_STORAGE_KEY = "read-master-user-stats";

/**
 * XP required per level multiplier
 * Level 1->2: 100 XP
 * Level 2->3: 200 XP
 * Level 3->4: 300 XP
 * etc.
 */
export const XP_PER_LEVEL = 100;

/**
 * Maximum level cap
 */
export const MAX_LEVEL = 100;

/**
 * Reading activity entry for history tracking
 */
export interface ReadingActivity {
  /** Date string YYYY-MM-DD */
  date: string;
  /** Minutes read on this date */
  minutesRead: number;
  /** Pages/words read on this date */
  unitsRead: number;
  /** Books completed on this date */
  booksCompleted: number;
}

/**
 * User statistics interface
 */
export interface UserStats {
  /** Total experience points earned */
  totalXP: number;
  /** Current user level */
  level: number;
  /** XP progress towards next level */
  currentLevelXP: number;
  /** XP needed to reach next level */
  xpToNextLevel: number;
  /** Current reading streak in days */
  currentStreak: number;
  /** Longest reading streak ever achieved */
  longestStreak: number;
  /** Last date user read (for streak calculation) */
  lastReadDate: string | null;
  /** Total number of books completed */
  booksCompleted: number;
  /** Total reading time in minutes */
  totalReadingMinutes: number;
  /** Average reading speed in words per minute */
  averageWPM: number;
  /** Number of flashcards reviewed */
  flashcardsReviewed: number;
  /** Number of assessments completed */
  assessmentsCompleted: number;
  /** Average assessment score percentage */
  averageAssessmentScore: number;
  /** Reading activity history (last 30 days) */
  activityHistory: ReadingActivity[];
  /** Timestamp when stats were last updated */
  lastUpdated: number;
}

/**
 * Calculate XP required to reach a specific level
 */
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  // Sum of arithmetic series: XP_PER_LEVEL * (1 + 2 + ... + (level-1))
  // = XP_PER_LEVEL * (level-1) * level / 2
  return (XP_PER_LEVEL * (level - 1) * level) / 2;
}

/**
 * Calculate level from total XP
 */
export function getLevelFromXP(totalXP: number): number {
  if (totalXP <= 0) return 1;

  // Solve quadratic: XP_PER_LEVEL * (level-1) * level / 2 = totalXP
  // level^2 - level - (2 * totalXP / XP_PER_LEVEL) = 0
  // level = (1 + sqrt(1 + 8 * totalXP / XP_PER_LEVEL)) / 2

  const discriminant = 1 + (8 * totalXP) / XP_PER_LEVEL;
  const level = Math.floor((1 + Math.sqrt(discriminant)) / 2);

  return Math.min(level, MAX_LEVEL);
}

/**
 * Calculate XP progress within current level
 */
export function getCurrentLevelProgress(totalXP: number): {
  level: number;
  currentLevelXP: number;
  xpToNextLevel: number;
  progressPercent: number;
} {
  const level = getLevelFromXP(totalXP);
  const xpForCurrentLevel = getXPForLevel(level);
  const xpForNextLevel = getXPForLevel(level + 1);

  const currentLevelXP = totalXP - xpForCurrentLevel;
  const xpToNextLevel = xpForNextLevel - xpForCurrentLevel;
  const progressPercent =
    xpToNextLevel > 0
      ? Math.min(100, Math.round((currentLevelXP / xpToNextLevel) * 100))
      : 100;

  return {
    level,
    currentLevelXP,
    xpToNextLevel,
    progressPercent,
  };
}

/**
 * Format minutes to hours and minutes display
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const parts = new Date().toISOString().split("T");
  return parts[0] ?? "";
}

/**
 * Check if two dates are consecutive days
 */
export function areConsecutiveDays(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

/**
 * Check if a date is today
 */
export function isToday(dateString: string): boolean {
  return dateString === getTodayDateString();
}

/**
 * Validate and sanitize user stats
 */
export function sanitizeUserStats(
  stats: Partial<UserStats>
): Partial<UserStats> {
  const sanitized: Partial<UserStats> = {};

  if (typeof stats.totalXP === "number" && stats.totalXP >= 0) {
    sanitized.totalXP = Math.floor(stats.totalXP);
  }

  if (typeof stats.level === "number" && stats.level >= 1) {
    sanitized.level = Math.min(MAX_LEVEL, Math.floor(stats.level));
  }

  if (typeof stats.currentLevelXP === "number" && stats.currentLevelXP >= 0) {
    sanitized.currentLevelXP = Math.floor(stats.currentLevelXP);
  }

  if (typeof stats.xpToNextLevel === "number" && stats.xpToNextLevel >= 0) {
    sanitized.xpToNextLevel = Math.floor(stats.xpToNextLevel);
  }

  if (typeof stats.currentStreak === "number" && stats.currentStreak >= 0) {
    sanitized.currentStreak = Math.floor(stats.currentStreak);
  }

  if (typeof stats.longestStreak === "number" && stats.longestStreak >= 0) {
    sanitized.longestStreak = Math.floor(stats.longestStreak);
  }

  if (stats.lastReadDate === null || typeof stats.lastReadDate === "string") {
    sanitized.lastReadDate = stats.lastReadDate;
  }

  if (typeof stats.booksCompleted === "number" && stats.booksCompleted >= 0) {
    sanitized.booksCompleted = Math.floor(stats.booksCompleted);
  }

  if (
    typeof stats.totalReadingMinutes === "number" &&
    stats.totalReadingMinutes >= 0
  ) {
    sanitized.totalReadingMinutes = Math.floor(stats.totalReadingMinutes);
  }

  if (typeof stats.averageWPM === "number" && stats.averageWPM >= 0) {
    sanitized.averageWPM = Math.floor(stats.averageWPM);
  }

  if (
    typeof stats.flashcardsReviewed === "number" &&
    stats.flashcardsReviewed >= 0
  ) {
    sanitized.flashcardsReviewed = Math.floor(stats.flashcardsReviewed);
  }

  if (
    typeof stats.assessmentsCompleted === "number" &&
    stats.assessmentsCompleted >= 0
  ) {
    sanitized.assessmentsCompleted = Math.floor(stats.assessmentsCompleted);
  }

  if (
    typeof stats.averageAssessmentScore === "number" &&
    stats.averageAssessmentScore >= 0 &&
    stats.averageAssessmentScore <= 100
  ) {
    sanitized.averageAssessmentScore = Math.round(stats.averageAssessmentScore);
  }

  if (Array.isArray(stats.activityHistory)) {
    sanitized.activityHistory = stats.activityHistory
      .filter(
        (a) =>
          typeof a.date === "string" &&
          typeof a.minutesRead === "number" &&
          typeof a.unitsRead === "number" &&
          typeof a.booksCompleted === "number"
      )
      .slice(-30); // Keep last 30 days only
  }

  if (typeof stats.lastUpdated === "number") {
    sanitized.lastUpdated = stats.lastUpdated;
  }

  return sanitized;
}

type UserStatsState = UserStats;

interface UserStatsActions {
  /** Add XP and recalculate level */
  addXP: (amount: number) => void;
  /** Update streak based on reading activity */
  updateStreak: () => void;
  /** Record reading activity for today */
  recordReadingActivity: (
    minutesRead: number,
    unitsRead: number,
    bookCompleted?: boolean
  ) => void;
  /** Record flashcard review */
  recordFlashcardReview: (count?: number) => void;
  /** Record assessment completion */
  recordAssessmentCompletion: (score: number) => void;
  /** Get level progress percentage */
  getLevelProgress: () => number;
  /** Get activity for the last N days */
  getRecentActivity: (days: number) => ReadingActivity[];
  /** Calculate total for a period */
  getTotalForPeriod: (
    days: number,
    metric: "minutesRead" | "unitsRead" | "booksCompleted"
  ) => number;
  /** Reset all stats */
  reset: () => void;
}

type UserStatsStore = UserStatsState & UserStatsActions;

const DEFAULT_STATE: UserStatsState = {
  totalXP: 0,
  level: 1,
  currentLevelXP: 0,
  xpToNextLevel: XP_PER_LEVEL,
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

export const useUserStatsStore = create<UserStatsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_STATE,

      // Actions
      addXP: (amount: number) => {
        if (amount <= 0) return;

        set((state) => {
          const newTotalXP = state.totalXP + Math.floor(amount);
          const progress = getCurrentLevelProgress(newTotalXP);

          return {
            totalXP: newTotalXP,
            level: progress.level,
            currentLevelXP: progress.currentLevelXP,
            xpToNextLevel: progress.xpToNextLevel,
            lastUpdated: Date.now(),
          };
        });
      },

      updateStreak: () => {
        const today = getTodayDateString();
        const state = get();

        if (state.lastReadDate === null) {
          // First reading ever
          set({
            currentStreak: 1,
            longestStreak: 1,
            lastReadDate: today,
            lastUpdated: Date.now(),
          });
          return;
        }

        if (isToday(state.lastReadDate)) {
          // Already read today, no change
          return;
        }

        if (areConsecutiveDays(state.lastReadDate, today)) {
          // Consecutive day - increment streak
          const newStreak = state.currentStreak + 1;
          set({
            currentStreak: newStreak,
            longestStreak: Math.max(state.longestStreak, newStreak),
            lastReadDate: today,
            lastUpdated: Date.now(),
          });
        } else {
          // Streak broken - reset to 1
          set({
            currentStreak: 1,
            lastReadDate: today,
            lastUpdated: Date.now(),
          });
        }
      },

      recordReadingActivity: (
        minutesRead: number,
        unitsRead: number,
        bookCompleted = false
      ) => {
        const today = getTodayDateString();
        const state = get();

        // Update streak
        get().updateStreak();

        // Update activity history
        const existingIndex = state.activityHistory.findIndex(
          (a) => a.date === today
        );
        let newHistory: ReadingActivity[];

        if (existingIndex >= 0) {
          // Update existing entry
          newHistory = [...state.activityHistory];
          const existing = newHistory[existingIndex];
          if (existing) {
            newHistory[existingIndex] = {
              date: today,
              minutesRead: existing.minutesRead + Math.floor(minutesRead),
              unitsRead: existing.unitsRead + Math.floor(unitsRead),
              booksCompleted: existing.booksCompleted + (bookCompleted ? 1 : 0),
            };
          }
        } else {
          // Add new entry
          newHistory = [
            ...state.activityHistory,
            {
              date: today,
              minutesRead: Math.floor(minutesRead),
              unitsRead: Math.floor(unitsRead),
              booksCompleted: bookCompleted ? 1 : 0,
            },
          ].slice(-30); // Keep last 30 days
        }

        set({
          activityHistory: newHistory,
          totalReadingMinutes:
            state.totalReadingMinutes + Math.floor(minutesRead),
          booksCompleted: state.booksCompleted + (bookCompleted ? 1 : 0),
          lastUpdated: Date.now(),
        });
      },

      recordFlashcardReview: (count = 1) => {
        set((state) => ({
          flashcardsReviewed: state.flashcardsReviewed + Math.floor(count),
          lastUpdated: Date.now(),
        }));
      },

      recordAssessmentCompletion: (score: number) => {
        set((state) => {
          const totalScore =
            state.averageAssessmentScore * state.assessmentsCompleted + score;
          const newCount = state.assessmentsCompleted + 1;
          return {
            assessmentsCompleted: newCount,
            averageAssessmentScore: Math.round(totalScore / newCount),
            lastUpdated: Date.now(),
          };
        });
      },

      getLevelProgress: () => {
        const state = get();
        return getCurrentLevelProgress(state.totalXP).progressPercent;
      },

      getRecentActivity: (days: number) => {
        const state = get();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const parts = cutoffDate.toISOString().split("T");
        const cutoffString = parts[0] ?? "";

        return state.activityHistory.filter((a) => a.date >= cutoffString);
      },

      getTotalForPeriod: (
        days: number,
        metric: "minutesRead" | "unitsRead" | "booksCompleted"
      ) => {
        const recentActivity = get().getRecentActivity(days);
        return recentActivity.reduce((sum, a) => sum + a[metric], 0);
      },

      reset: () => {
        set({
          ...DEFAULT_STATE,
          lastUpdated: Date.now(),
        });
      },
    }),
    {
      name: USER_STATS_STORAGE_KEY,
      partialize: (state) => ({
        totalXP: state.totalXP,
        level: state.level,
        currentLevelXP: state.currentLevelXP,
        xpToNextLevel: state.xpToNextLevel,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastReadDate: state.lastReadDate,
        booksCompleted: state.booksCompleted,
        totalReadingMinutes: state.totalReadingMinutes,
        averageWPM: state.averageWPM,
        flashcardsReviewed: state.flashcardsReviewed,
        assessmentsCompleted: state.assessmentsCompleted,
        averageAssessmentScore: state.averageAssessmentScore,
        activityHistory: state.activityHistory,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);
