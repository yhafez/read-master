/**
 * @read-master/shared/constants
 *
 * Shared constants for the Read Master platform including:
 * - Tier limits and subscription configuration
 * - Achievement definitions and gamification
 * - Language and internationalization settings
 *
 * @example
 * ```typescript
 * import {
 *   // Tier limits
 *   TIER_LIMITS,
 *   getTierLimits,
 *   canPerformAction,
 *
 *   // Achievements
 *   ACHIEVEMENTS,
 *   getAchievementByCode,
 *   calculateLevel,
 *
 *   // Languages
 *   SUPPORTED_LANGUAGES,
 *   isRtlLanguage,
 *   getLanguageInfo
 * } from '@read-master/shared/constants';
 * ```
 */

// ============================================================================
// Limits Exports
// ============================================================================

export {
  // Types
  type TierLimits,
  type TierAction,
  // Constants
  MAX_UPLOAD_SIZE_BYTES,
  FREE_TIER_LIMITS,
  PRO_TIER_LIMITS,
  SCHOLAR_TIER_LIMITS,
  TIER_LIMITS,
  SUBSCRIPTION_PRICING,
  AI_CREDITS_PRICING,
  // Functions
  getTierLimits,
  canPerformAction,
  isWithinLimit,
  getRemainingQuota,
  isTierHigherOrEqual,
  getMinimumTierForAction,
  // Utility object
  limitUtils,
} from "./limits";

// ============================================================================
// Achievements Exports
// ============================================================================

export {
  // Types
  type AchievementCriteriaType,
  type AchievementCriterion,
  type TimeBasedCriterion,
  type AchievementDefinition,
  type AchievementCheckStats,
  // Achievement category arrays
  READING_ACHIEVEMENTS,
  STREAK_ACHIEVEMENTS,
  LEARNING_ACHIEVEMENTS,
  SOCIAL_ACHIEVEMENTS,
  MILESTONE_ACHIEVEMENTS,
  // All achievements
  ACHIEVEMENTS,
  ACHIEVEMENT_COUNTS,
  // Level system
  LEVEL_THRESHOLDS,
  XP_PER_LEVEL_AFTER_10,
  GRAND_MASTER_TITLE,
  // XP rewards
  XP_REWARDS,
  // Functions
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
  // Utility object
  achievementUtils,
} from "./achievements";

// ============================================================================
// Languages Exports
// ============================================================================

export {
  // Types
  type SupportedLanguageCode,
  type LanguageInfo,
  type TextDirection,
  // Individual language definitions
  ENGLISH,
  ARABIC,
  SPANISH,
  JAPANESE,
  CHINESE,
  TAGALOG,
  // Collections
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  LANGUAGES_BY_CODE,
  RTL_LANGUAGE_CODES,
  // Defaults
  DEFAULT_LANGUAGE_CODE,
  DEFAULT_LOCALE,
  // Formatting
  DATE_FORMAT_STYLES,
  TIME_FORMAT_STYLES,
  NUMBER_LOCALES,
  // Fonts
  FONT_STACKS,
  DYSLEXIA_FONT,
  // Functions
  isSupportedLanguage,
  getLanguageInfo,
  isRtlLanguage,
  getTextDirection,
  getFullLocale,
  getEnabledLanguages,
  getLanguageOptions,
  parseLanguageCode,
  getFontStack,
  formatNumber,
  formatLocalizedDate,
  formatLocalizedTime,
  // Utility object
  languageUtils,
} from "./languages";
