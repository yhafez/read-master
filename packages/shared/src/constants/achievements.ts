/**
 * Achievement definitions and constants
 *
 * Defines all achievements, their criteria, XP rewards, and related utilities.
 * Achievements are organized into categories:
 * - READING: Based on books completed and reading habits
 * - STREAK: Based on consecutive days of activity
 * - LEARNING: Based on SRS flashcard reviews
 * - SOCIAL: Based on community engagement
 * - MILESTONE: Based on comprehension and assessments
 * - SPECIAL: Time-based or seasonal achievements
 *
 * @example
 * ```typescript
 * import {
 *   ACHIEVEMENTS,
 *   getAchievementByCode,
 *   getAchievementsByCategory,
 *   checkAchievementCriteria
 * } from '@read-master/shared/constants';
 *
 * const bookworm = getAchievementByCode('bookworm');
 * bookworm?.xpReward; // 500
 * ```
 */

import type {
  AchievementCategory,
  AchievementTier,
} from "@read-master/database";

// ============================================================================
// Types
// ============================================================================

/**
 * Criteria type for different achievement checks
 */
export type AchievementCriteriaType =
  | "booksCompleted"
  | "avgReadingSpeed"
  | "dailyReadTime"
  | "readingSessionTime"
  | "currentStreak"
  | "cardsReviewed"
  | "cardsMastered"
  | "retentionRate"
  | "sessionAccuracy"
  | "sessionCards"
  | "highlightsCreated"
  | "annotationsCreated"
  | "followersCount"
  | "groupsCreated"
  | "publicCurriculumsCreated"
  | "bestAnswers"
  | "assessmentsCompleted"
  | "assessmentScore"
  | "assessments80Plus"
  | "allBloomsLevels";

/**
 * Criterion definition for an achievement
 */
export type AchievementCriterion = {
  readonly type: AchievementCriteriaType;
  readonly operator: ">=" | ">" | "==" | "<" | "<=";
  readonly value: number;
};

/**
 * Time-based criterion for special achievements
 */
export type TimeBasedCriterion = {
  readonly type: "readingSessionTime";
  readonly condition: "after" | "before";
  readonly hour: number;
};

/**
 * Full achievement definition
 */
export type AchievementDefinition = {
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly category: AchievementCategory;
  readonly tier: AchievementTier;
  readonly xpReward: number;
  readonly badgeIcon: string;
  readonly badgeColor: string;
  readonly sortOrder: number;
  readonly criteria: readonly (AchievementCriterion | TimeBasedCriterion)[];
  readonly isActive: boolean;
};

/**
 * User stats used for achievement checking
 */
export type AchievementCheckStats = {
  booksCompleted?: number;
  avgReadingSpeed?: number;
  dailyReadTime?: number;
  currentStreak?: number;
  cardsReviewed?: number;
  cardsMastered?: number;
  retentionRate?: number;
  highlightsCreated?: number;
  annotationsCreated?: number;
  followersCount?: number;
  groupsCreated?: number;
  publicCurriculumsCreated?: number;
  bestAnswers?: number;
  assessmentsCompleted?: number;
  latestAssessmentScore?: number;
  assessments80Plus?: number;
  allBloomsLevelsAbove90?: boolean;
  sessionAccuracy?: number;
  sessionCards?: number;
  readingSessionHour?: number;
};

// ============================================================================
// Achievement Definitions
// ============================================================================

/**
 * Reading achievements - based on books completed and reading habits
 */
export const READING_ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    code: "first_book",
    name: "First Chapter",
    description: "Complete your first book",
    category: "READING",
    tier: "COMMON",
    xpReward: 100,
    badgeIcon: "book",
    badgeColor: "#4CAF50",
    sortOrder: 100,
    criteria: [{ type: "booksCompleted", operator: ">=", value: 1 }],
    isActive: true,
  },
  {
    code: "bookworm",
    name: "Bookworm",
    description: "Complete 10 books",
    category: "READING",
    tier: "UNCOMMON",
    xpReward: 500,
    badgeIcon: "bookworm",
    badgeColor: "#8BC34A",
    sortOrder: 101,
    criteria: [{ type: "booksCompleted", operator: ">=", value: 10 }],
    isActive: true,
  },
  {
    code: "bibliophile",
    name: "Bibliophile",
    description: "Complete 50 books",
    category: "READING",
    tier: "RARE",
    xpReward: 2000,
    badgeIcon: "library",
    badgeColor: "#2196F3",
    sortOrder: 102,
    criteria: [{ type: "booksCompleted", operator: ">=", value: 50 }],
    isActive: true,
  },
  {
    code: "scholar",
    name: "Scholar",
    description: "Complete 100 books",
    category: "READING",
    tier: "EPIC",
    xpReward: 5000,
    badgeIcon: "school",
    badgeColor: "#9C27B0",
    sortOrder: 103,
    criteria: [{ type: "booksCompleted", operator: ">=", value: 100 }],
    isActive: true,
  },
  {
    code: "speed_reader",
    name: "Speed Reader",
    description: "Read at 500 WPM average",
    category: "READING",
    tier: "UNCOMMON",
    xpReward: 300,
    badgeIcon: "speed",
    badgeColor: "#FF9800",
    sortOrder: 104,
    criteria: [{ type: "avgReadingSpeed", operator: ">=", value: 500 }],
    isActive: true,
  },
  {
    code: "marathon",
    name: "Marathon Reader",
    description: "Read for 5 hours in one day",
    category: "READING",
    tier: "UNCOMMON",
    xpReward: 250,
    badgeIcon: "timer",
    badgeColor: "#795548",
    sortOrder: 105,
    criteria: [{ type: "dailyReadTime", operator: ">=", value: 18000 }], // 5 hours in seconds
    isActive: true,
  },
  {
    code: "night_owl",
    name: "Night Owl",
    description: "Read past midnight",
    category: "READING",
    tier: "COMMON",
    xpReward: 50,
    badgeIcon: "nightlight",
    badgeColor: "#3F51B5",
    sortOrder: 106,
    criteria: [{ type: "readingSessionTime", condition: "after", hour: 0 }],
    isActive: true,
  },
  {
    code: "early_bird",
    name: "Early Bird",
    description: "Read before 6 AM",
    category: "READING",
    tier: "COMMON",
    xpReward: 50,
    badgeIcon: "wb_sunny",
    badgeColor: "#FFEB3B",
    sortOrder: 107,
    criteria: [{ type: "readingSessionTime", condition: "before", hour: 6 }],
    isActive: true,
  },
] as const;

/**
 * Streak achievements - based on consecutive days of activity
 */
export const STREAK_ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    code: "streak_7",
    name: "On Fire",
    description: "7-day reading streak",
    category: "STREAK",
    tier: "COMMON",
    xpReward: 100,
    badgeIcon: "local_fire_department",
    badgeColor: "#FF5722",
    sortOrder: 200,
    criteria: [{ type: "currentStreak", operator: ">=", value: 7 }],
    isActive: true,
  },
  {
    code: "streak_30",
    name: "Dedicated",
    description: "30-day reading streak",
    category: "STREAK",
    tier: "UNCOMMON",
    xpReward: 500,
    badgeIcon: "whatshot",
    badgeColor: "#FF5722",
    sortOrder: 201,
    criteria: [{ type: "currentStreak", operator: ">=", value: 30 }],
    isActive: true,
  },
  {
    code: "streak_100",
    name: "Unstoppable",
    description: "100-day reading streak",
    category: "STREAK",
    tier: "RARE",
    xpReward: 2000,
    badgeIcon: "bolt",
    badgeColor: "#E91E63",
    sortOrder: 202,
    criteria: [{ type: "currentStreak", operator: ">=", value: 100 }],
    isActive: true,
  },
  {
    code: "streak_365",
    name: "Legendary",
    description: "365-day reading streak",
    category: "STREAK",
    tier: "LEGENDARY",
    xpReward: 10000,
    badgeIcon: "stars",
    badgeColor: "#FFD700",
    sortOrder: 203,
    criteria: [{ type: "currentStreak", operator: ">=", value: 365 }],
    isActive: true,
  },
] as const;

/**
 * Learning/SRS achievements - based on flashcard reviews
 */
export const LEARNING_ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    code: "first_review",
    name: "Memory Spark",
    description: "Complete first SRS review",
    category: "LEARNING",
    tier: "COMMON",
    xpReward: 25,
    badgeIcon: "psychology",
    badgeColor: "#00BCD4",
    sortOrder: 300,
    criteria: [{ type: "cardsReviewed", operator: ">=", value: 1 }],
    isActive: true,
  },
  {
    code: "cards_100",
    name: "Card Collector",
    description: "Review 100 cards",
    category: "LEARNING",
    tier: "COMMON",
    xpReward: 200,
    badgeIcon: "style",
    badgeColor: "#00BCD4",
    sortOrder: 301,
    criteria: [{ type: "cardsReviewed", operator: ">=", value: 100 }],
    isActive: true,
  },
  {
    code: "cards_1000",
    name: "Memory Master",
    description: "Review 1000 cards",
    category: "LEARNING",
    tier: "RARE",
    xpReward: 1000,
    badgeIcon: "view_module",
    badgeColor: "#00ACC1",
    sortOrder: 302,
    criteria: [{ type: "cardsReviewed", operator: ">=", value: 1000 }],
    isActive: true,
  },
  {
    code: "mastered_50",
    name: "Getting Sharp",
    description: "Master 50 cards",
    category: "LEARNING",
    tier: "UNCOMMON",
    xpReward: 300,
    badgeIcon: "verified",
    badgeColor: "#4CAF50",
    sortOrder: 303,
    criteria: [{ type: "cardsMastered", operator: ">=", value: 50 }],
    isActive: true,
  },
  {
    code: "mastered_500",
    name: "Steel Trap",
    description: "Master 500 cards",
    category: "LEARNING",
    tier: "EPIC",
    xpReward: 1500,
    badgeIcon: "lock",
    badgeColor: "#607D8B",
    sortOrder: 304,
    criteria: [{ type: "cardsMastered", operator: ">=", value: 500 }],
    isActive: true,
  },
  {
    code: "retention_90",
    name: "Excellent Recall",
    description: "90%+ retention rate",
    category: "LEARNING",
    tier: "RARE",
    xpReward: 500,
    badgeIcon: "insights",
    badgeColor: "#673AB7",
    sortOrder: 305,
    criteria: [{ type: "retentionRate", operator: ">=", value: 0.9 }],
    isActive: true,
  },
  {
    code: "perfect_day",
    name: "Perfect Day",
    description: "100% correct in a review session (10+ cards)",
    category: "LEARNING",
    tier: "UNCOMMON",
    xpReward: 150,
    badgeIcon: "emoji_events",
    badgeColor: "#FFC107",
    sortOrder: 306,
    criteria: [
      { type: "sessionAccuracy", operator: "==", value: 1.0 },
      { type: "sessionCards", operator: ">=", value: 10 },
    ],
    isActive: true,
  },
] as const;

/**
 * Social achievements - based on community engagement
 */
export const SOCIAL_ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    code: "first_highlight",
    name: "Highlighter",
    description: "Create first highlight",
    category: "SOCIAL",
    tier: "COMMON",
    xpReward: 25,
    badgeIcon: "highlight",
    badgeColor: "#FFEB3B",
    sortOrder: 400,
    criteria: [{ type: "highlightsCreated", operator: ">=", value: 1 }],
    isActive: true,
  },
  {
    code: "annotator",
    name: "Annotator",
    description: "Create 100 annotations",
    category: "SOCIAL",
    tier: "UNCOMMON",
    xpReward: 300,
    badgeIcon: "edit_note",
    badgeColor: "#FF9800",
    sortOrder: 401,
    criteria: [{ type: "annotationsCreated", operator: ">=", value: 100 }],
    isActive: true,
  },
  {
    code: "social_butterfly",
    name: "Social Butterfly",
    description: "Gain 10 followers",
    category: "SOCIAL",
    tier: "UNCOMMON",
    xpReward: 200,
    badgeIcon: "group",
    badgeColor: "#E91E63",
    sortOrder: 402,
    criteria: [{ type: "followersCount", operator: ">=", value: 10 }],
    isActive: true,
  },
  {
    code: "influencer",
    name: "Influencer",
    description: "Gain 100 followers",
    category: "SOCIAL",
    tier: "EPIC",
    xpReward: 1000,
    badgeIcon: "trending_up",
    badgeColor: "#9C27B0",
    sortOrder: 403,
    criteria: [{ type: "followersCount", operator: ">=", value: 100 }],
    isActive: true,
  },
  {
    code: "group_founder",
    name: "Group Founder",
    description: "Create a reading group",
    category: "SOCIAL",
    tier: "COMMON",
    xpReward: 150,
    badgeIcon: "groups",
    badgeColor: "#3F51B5",
    sortOrder: 404,
    criteria: [{ type: "groupsCreated", operator: ">=", value: 1 }],
    isActive: true,
  },
  {
    code: "curriculum_creator",
    name: "Curriculum Creator",
    description: "Create a public curriculum",
    category: "SOCIAL",
    tier: "UNCOMMON",
    xpReward: 200,
    badgeIcon: "assignment",
    badgeColor: "#009688",
    sortOrder: 405,
    criteria: [{ type: "publicCurriculumsCreated", operator: ">=", value: 1 }],
    isActive: true,
  },
  {
    code: "helpful",
    name: "Helpful",
    description: "Get 10 best answers in forum",
    category: "SOCIAL",
    tier: "RARE",
    xpReward: 500,
    badgeIcon: "volunteer_activism",
    badgeColor: "#4CAF50",
    sortOrder: 406,
    criteria: [{ type: "bestAnswers", operator: ">=", value: 10 }],
    isActive: true,
  },
] as const;

/**
 * Milestone achievements - based on comprehension and assessments
 */
export const MILESTONE_ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    code: "first_assessment",
    name: "Pop Quiz",
    description: "Complete first assessment",
    category: "MILESTONE",
    tier: "COMMON",
    xpReward: 50,
    badgeIcon: "quiz",
    badgeColor: "#2196F3",
    sortOrder: 500,
    criteria: [{ type: "assessmentsCompleted", operator: ">=", value: 1 }],
    isActive: true,
  },
  {
    code: "ace",
    name: "Ace",
    description: "Score 100% on an assessment",
    category: "MILESTONE",
    tier: "UNCOMMON",
    xpReward: 200,
    badgeIcon: "grade",
    badgeColor: "#FFD700",
    sortOrder: 501,
    criteria: [{ type: "assessmentScore", operator: "==", value: 1.0 }],
    isActive: true,
  },
  {
    code: "consistent",
    name: "Consistent",
    description: "Score 80%+ on 10 assessments",
    category: "MILESTONE",
    tier: "RARE",
    xpReward: 400,
    badgeIcon: "trending_up",
    badgeColor: "#8BC34A",
    sortOrder: 502,
    criteria: [{ type: "assessments80Plus", operator: ">=", value: 10 }],
    isActive: true,
  },
  {
    code: "blooms_master",
    name: "Deep Thinker",
    description: "Score 90%+ on all Bloom's levels",
    category: "MILESTONE",
    tier: "LEGENDARY",
    xpReward: 1000,
    badgeIcon: "lightbulb",
    badgeColor: "#9C27B0",
    sortOrder: 503,
    criteria: [{ type: "allBloomsLevels", operator: ">=", value: 0.9 }],
    isActive: true,
  },
] as const;

/**
 * All achievements combined
 */
export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  ...READING_ACHIEVEMENTS,
  ...STREAK_ACHIEVEMENTS,
  ...LEARNING_ACHIEVEMENTS,
  ...SOCIAL_ACHIEVEMENTS,
  ...MILESTONE_ACHIEVEMENTS,
] as const;

/**
 * Achievement count by category
 */
export const ACHIEVEMENT_COUNTS = {
  READING: READING_ACHIEVEMENTS.length,
  STREAK: STREAK_ACHIEVEMENTS.length,
  LEARNING: LEARNING_ACHIEVEMENTS.length,
  SOCIAL: SOCIAL_ACHIEVEMENTS.length,
  MILESTONE: MILESTONE_ACHIEVEMENTS.length,
  SPECIAL: 0,
  TOTAL: ACHIEVEMENTS.length,
} as const;

// ============================================================================
// Level System Constants
// ============================================================================

/**
 * Level thresholds and titles
 */
export const LEVEL_THRESHOLDS: readonly {
  readonly level: number;
  readonly xpRequired: number;
  readonly title: string;
}[] = [
  { level: 1, xpRequired: 0, title: "Novice Reader" },
  { level: 2, xpRequired: 100, title: "Apprentice" },
  { level: 3, xpRequired: 300, title: "Page Turner" },
  { level: 4, xpRequired: 600, title: "Bookworm" },
  { level: 5, xpRequired: 1000, title: "Avid Reader" },
  { level: 6, xpRequired: 1500, title: "Literature Lover" },
  { level: 7, xpRequired: 2500, title: "Scholar" },
  { level: 8, xpRequired: 4000, title: "Bibliophile" },
  { level: 9, xpRequired: 6000, title: "Sage" },
  { level: 10, xpRequired: 10000, title: "Master Reader" },
] as const;

/**
 * XP increment per level after level 10
 */
export const XP_PER_LEVEL_AFTER_10 = 5000;

/**
 * Title for levels 11 and above
 */
export const GRAND_MASTER_TITLE = "Grand Master";

// ============================================================================
// XP Rewards for Actions
// ============================================================================

/**
 * XP awarded for various actions
 */
export const XP_REWARDS = {
  /** XP for completing a book */
  BOOK_COMPLETED: 100,
  /** XP for a correct flashcard review */
  FLASHCARD_CORRECT: 5,
  /** XP for completing daily reviews */
  DAILY_REVIEW_COMPLETE: 25,
  /** XP for completing an assessment */
  ASSESSMENT_COMPLETED: 50,
  /** XP bonus per 10% score above 50% */
  ASSESSMENT_SCORE_BONUS: 10,
  /** XP for creating an annotation */
  ANNOTATION_CREATED: 2,
  /** XP for getting a best answer in forum */
  BEST_ANSWER: 50,
  /** XP for daily login/activity */
  DAILY_ACTIVITY: 10,
  /** XP bonus per day of streak (max 7) */
  STREAK_BONUS_PER_DAY: 5,
  /** Max streak bonus per day */
  MAX_STREAK_BONUS: 35,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get an achievement by its code
 */
export function getAchievementByCode(
  code: string
): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((a) => a.code === code);
}

/**
 * Get all achievements in a specific category
 */
export function getAchievementsByCategory(
  category: AchievementCategory
): readonly AchievementDefinition[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

/**
 * Get all achievements of a specific tier
 */
export function getAchievementsByTier(
  tier: AchievementTier
): readonly AchievementDefinition[] {
  return ACHIEVEMENTS.filter((a) => a.tier === tier);
}

/**
 * Get all active achievements
 */
export function getActiveAchievements(): readonly AchievementDefinition[] {
  return ACHIEVEMENTS.filter((a) => a.isActive);
}

/**
 * Calculate level from XP
 */
export function calculateLevel(totalXP: number): {
  level: number;
  title: string;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
} {
  // Check levels 1-10
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    const threshold = LEVEL_THRESHOLDS[i];
    if (threshold && totalXP >= threshold.xpRequired) {
      if (threshold.level === 10) {
        // Calculate levels beyond 10
        const xpAbove10 = totalXP - threshold.xpRequired;
        const additionalLevels = Math.floor(xpAbove10 / XP_PER_LEVEL_AFTER_10);
        const level = 10 + additionalLevels;
        const currentLevelXP =
          threshold.xpRequired + additionalLevels * XP_PER_LEVEL_AFTER_10;
        const nextLevelXP = currentLevelXP + XP_PER_LEVEL_AFTER_10;
        const progressPercent =
          ((totalXP - currentLevelXP) / XP_PER_LEVEL_AFTER_10) * 100;

        // Level 10 still has "Master Reader" title, Grand Master is for 11+
        const title =
          additionalLevels > 0 ? GRAND_MASTER_TITLE : threshold.title;

        return {
          level,
          title,
          currentLevelXP,
          nextLevelXP,
          progressPercent: Math.min(100, Math.max(0, progressPercent)),
        };
      }

      const nextThreshold = LEVEL_THRESHOLDS[i + 1];
      const nextXP = nextThreshold
        ? nextThreshold.xpRequired
        : threshold.xpRequired + XP_PER_LEVEL_AFTER_10;
      const progressPercent =
        ((totalXP - threshold.xpRequired) / (nextXP - threshold.xpRequired)) *
        100;

      return {
        level: threshold.level,
        title: threshold.title,
        currentLevelXP: threshold.xpRequired,
        nextLevelXP: nextXP,
        progressPercent: Math.min(100, Math.max(0, progressPercent)),
      };
    }
  }

  // Default to level 1
  const firstLevel = LEVEL_THRESHOLDS[0];
  const secondLevel = LEVEL_THRESHOLDS[1];
  const firstTitle = firstLevel?.title ?? "Novice Reader";
  const secondXP = secondLevel?.xpRequired ?? 100;
  return {
    level: 1,
    title: firstTitle,
    currentLevelXP: 0,
    nextLevelXP: secondXP,
    progressPercent: (totalXP / secondXP) * 100,
  };
}

/**
 * Get XP required for a specific level
 */
export function getXPForLevel(level: number): number {
  if (level <= 0) return 0;
  if (level <= 10) {
    return LEVEL_THRESHOLDS[level - 1]?.xpRequired ?? 0;
  }
  // Level 11+: 10000 + (level - 10) * 5000
  const level10XP = LEVEL_THRESHOLDS[9]?.xpRequired ?? 10000;
  return level10XP + (level - 10) * XP_PER_LEVEL_AFTER_10;
}

/**
 * Get title for a specific level
 */
export function getTitleForLevel(level: number): string {
  const firstTitle = LEVEL_THRESHOLDS[0]?.title ?? "Novice Reader";
  const lastTitle = LEVEL_THRESHOLDS[9]?.title ?? "Master Reader";
  if (level <= 0) return firstTitle;
  if (level <= 10) {
    return LEVEL_THRESHOLDS[level - 1]?.title ?? lastTitle;
  }
  return GRAND_MASTER_TITLE;
}

/**
 * Check if a single criterion is satisfied
 */
function checkCriterion(
  criterion: AchievementCriterion | TimeBasedCriterion,
  stats: AchievementCheckStats
): boolean {
  // Handle time-based criteria
  if ("condition" in criterion) {
    const hour = stats.readingSessionHour;
    if (hour === undefined) return false;

    if (criterion.condition === "after") {
      // "after midnight" = hour >= 0 and hour < 1 (or just exactly 0)
      // For simplicity, "after hour X" means hour >= X
      return hour >= criterion.hour || (criterion.hour === 0 && hour < 6);
    } else if (criterion.condition === "before") {
      return hour < criterion.hour;
    }
    return false;
  }

  // Handle regular criteria
  const value = getStatValue(criterion.type, stats);
  if (value === undefined) return false;

  switch (criterion.operator) {
    case ">=":
      return value >= criterion.value;
    case ">":
      return value > criterion.value;
    case "==":
      return value === criterion.value;
    case "<":
      return value < criterion.value;
    case "<=":
      return value <= criterion.value;
    default:
      return false;
  }
}

/**
 * Get stat value from stats object
 */
function getStatValue(
  type: AchievementCriteriaType,
  stats: AchievementCheckStats
): number | undefined {
  switch (type) {
    case "booksCompleted":
      return stats.booksCompleted;
    case "avgReadingSpeed":
      return stats.avgReadingSpeed;
    case "dailyReadTime":
      return stats.dailyReadTime;
    case "currentStreak":
      return stats.currentStreak;
    case "cardsReviewed":
      return stats.cardsReviewed;
    case "cardsMastered":
      return stats.cardsMastered;
    case "retentionRate":
      return stats.retentionRate;
    case "sessionAccuracy":
      return stats.sessionAccuracy;
    case "sessionCards":
      return stats.sessionCards;
    case "highlightsCreated":
      return stats.highlightsCreated;
    case "annotationsCreated":
      return stats.annotationsCreated;
    case "followersCount":
      return stats.followersCount;
    case "groupsCreated":
      return stats.groupsCreated;
    case "publicCurriculumsCreated":
      return stats.publicCurriculumsCreated;
    case "bestAnswers":
      return stats.bestAnswers;
    case "assessmentsCompleted":
      return stats.assessmentsCompleted;
    case "assessmentScore":
      return stats.latestAssessmentScore;
    case "assessments80Plus":
      return stats.assessments80Plus;
    case "allBloomsLevels":
      return stats.allBloomsLevelsAbove90 ? 1.0 : 0;
    default:
      return undefined;
  }
}

/**
 * Check if an achievement's criteria are satisfied
 */
export function checkAchievementCriteria(
  achievement: AchievementDefinition,
  stats: AchievementCheckStats
): boolean {
  // All criteria must be satisfied
  return achievement.criteria.every((criterion) =>
    checkCriterion(criterion, stats)
  );
}

/**
 * Get all achievements that would be unlocked by given stats
 */
export function getUnlockableAchievements(
  stats: AchievementCheckStats,
  alreadyUnlocked: readonly string[] = []
): readonly AchievementDefinition[] {
  const unlockedSet = new Set(alreadyUnlocked);
  return ACHIEVEMENTS.filter(
    (a) =>
      a.isActive &&
      !unlockedSet.has(a.code) &&
      checkAchievementCriteria(a, stats)
  );
}

/**
 * Calculate total XP from a list of achievements
 */
export function calculateTotalXP(achievementCodes: readonly string[]): number {
  return achievementCodes.reduce((total, code) => {
    const achievement = getAchievementByCode(code);
    return total + (achievement?.xpReward ?? 0);
  }, 0);
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Convenience object for importing all achievement-related utilities
 */
export const achievementUtils = {
  getAchievementByCode,
  getAchievementsByCategory,
  getAchievementsByTier,
  getActiveAchievements,
  calculateLevel,
  getXPForLevel,
  getTitleForLevel,
  checkAchievementCriteria,
  getUnlockableAchievements,
  calculateTotalXP,
} as const;
