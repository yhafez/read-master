/**
 * Stores module exports
 */

export {
  clamp,
  sanitizeSettings,
  THEME_STORAGE_KEY,
  useThemeStore,
} from "./themeStore";

export {
  DEFAULT_UI_PREFERENCES,
  sanitizePreferences,
  supportedLanguages,
  UI_STORAGE_KEY,
  useUIStore,
  validateLanguage,
  validateReaderNavPanel,
  validateSidebarState,
} from "./uiStore";
export type {
  ReaderNavPanel,
  SidebarState,
  SupportedLanguage,
  UIPreferences,
} from "./uiStore";

export {
  AUTO_SCROLL_WPM_RANGE,
  clampValue,
  createReadingPosition,
  DEFAULT_READER_SETTINGS,
  MARGINS_RANGE,
  MAX_WIDTH_RANGE,
  READER_STORAGE_KEY,
  sanitizeReaderSettings,
  useReaderStore,
  validateBookFormat,
  validateReadingMode,
} from "./readerStore";
export type {
  BookFormat,
  CurrentBook,
  FontFamily,
  ReaderSettings,
  ReadingMode,
  ReadingPosition,
  TypographySettings,
} from "./readerStore";

export {
  DEFAULT_READER_PREFERENCES,
  READER_PREFERENCES_STORAGE_KEY,
  sanitizeReaderPreferences,
  useReaderPreferencesStore,
  validatePageTurnAnimation,
} from "./readerPreferencesStore";
export type {
  PageTurnAnimation,
  ReaderPreferences,
  ReaderPreferencesStore,
} from "./readerPreferencesStore";

export {
  AI_SETTINGS_STORAGE_KEY,
  comprehensionFrequencies,
  DEFAULT_AI_SETTINGS,
  DEFAULT_FEATURE_TOGGLES,
  isFeatureEnabled,
  readingLevels,
  sanitizeAISettings,
  sanitizeFeatureToggles,
  useAISettingsStore,
  validateComprehensionFrequency,
  validateReadingLevel,
} from "./aiSettingsStore";
export type {
  AIFeatureToggles,
  AIPersonality,
  AISettings,
  ComprehensionFrequency,
  LanguageComplexity,
  ReadingLevel,
  VerbosityLevel,
} from "./aiSettingsStore";

export {
  commonTimezones,
  DEFAULT_EMAIL_NOTIFICATIONS,
  DEFAULT_GENERAL_SETTINGS,
  formatTimezoneDisplay,
  GENERAL_SETTINGS_STORAGE_KEY,
  getBrowserTimezone,
  languageNames,
  sanitizeEmailNotifications,
  sanitizeGeneralSettings,
  supportedLanguages as generalSettingsLanguages,
  useGeneralSettingsStore,
  validateDisplayName,
  validateLanguage as validateGeneralLanguage,
  validateTimezone,
} from "./generalSettingsStore";
export type {
  CommonTimezone,
  EmailNotificationSettings,
  GeneralSettings,
  SupportedLanguage as GeneralSupportedLanguage,
} from "./generalSettingsStore";

export {
  collectionColors,
  COLLECTIONS_STORAGE_KEY,
  generateCollectionId,
  getCollectionPath,
  getDescendantIds,
  sanitizeCollection,
  useCollectionsStore,
  validateCollectionColor,
  validateCollectionName,
  wouldCreateCycle,
} from "./collectionsStore";
export type {
  Collection,
  CollectionColor,
  CreateCollectionInput,
  UpdateCollectionInput,
} from "./collectionsStore";

export {
  generateShelfId,
  getAllBookIds,
  getShelvesForBook,
  sanitizeShelf,
  shelfIcons,
  SHELVES_STORAGE_KEY,
  useShelvesStore,
  validateShelfIcon,
  validateShelfName,
} from "./shelvesStore";
export type {
  CreateShelfInput,
  Shelf,
  ShelfIcon,
  UpdateShelfInput,
} from "./shelvesStore";

export {
  areConsecutiveDays,
  formatReadingTime,
  getCurrentLevelProgress,
  getLevelFromXP,
  getTodayDateString,
  getXPForLevel,
  isToday,
  MAX_LEVEL,
  sanitizeUserStats,
  USER_STATS_STORAGE_KEY,
  useUserStatsStore,
  XP_PER_LEVEL,
} from "./userStatsStore";
export type { ReadingActivity, UserStats } from "./userStatsStore";

export {
  ACHIEVEMENTS,
  ACHIEVEMENTS_STORAGE_KEY,
  calculateProgressPercent,
  getAchievementById,
  getAchievementsByCategory,
  TIER_COLORS,
  TIER_XP_REWARDS,
  useAchievementsStore,
} from "./achievementsStore";
export type {
  Achievement,
  AchievementCategory,
  AchievementProgress,
  AchievementTier,
} from "./achievementsStore";

export {
  AUTO_ADVANCE_DELAY_RANGE,
  cardOrderOptions,
  clampNumber,
  DAILY_NEW_CARD_LIMIT_RANGE,
  DAILY_REVIEW_LIMIT_RANGE,
  DEFAULT_SRS_LIMITS,
  DEFAULT_SRS_NOTIFICATIONS,
  DEFAULT_SRS_REVIEW_PREFERENCES,
  DEFAULT_SRS_SETTINGS,
  formatReminderTime,
  getCardOrderLabelKey,
  getRatingStyleLabelKey,
  hasAnyNotificationsEnabled,
  ratingStyleOptions,
  reminderTimes,
  sanitizeLimits,
  sanitizeNotifications,
  sanitizeReviewPreferences,
  sanitizeSRSSettings,
  SRS_SETTINGS_STORAGE_KEY,
  useSRSSettingsStore,
  validateAutoAdvanceDelay,
  validateCardOrder,
  validateDailyNewCardLimit,
  validateDailyReviewLimit,
  validateRatingStyle,
  validateReminderTime,
} from "./srsSettingsStore";
export type {
  CardOrder,
  DeepPartialSRSSettings,
  RatingStyle,
  ReminderTime,
  SRSLimits,
  SRSNotifications,
  SRSReviewPreferences,
  SRSSettings,
} from "./srsSettingsStore";

export {
  clampValue as clampTTSValue,
  DEFAULT_TTS_SETTINGS,
  HIGHLIGHT_COLOR_PRESETS,
  PITCH_RANGE,
  RATE_RANGE,
  sanitizeTTSSettings,
  TTS_SETTINGS_STORAGE_KEY,
  useTTSSettingsStore,
  validateHighlightColor,
  validatePitch,
  validateProvider,
  validateRate,
  validateVolume,
  VOLUME_RANGE,
} from "./ttsSettingsStore";
export type { PartialTTSSettings, TTSSettings } from "./ttsSettingsStore";
export * from "./useSplitScreenStore";
export * from "./useTranslationStore";
