/**
 * SRS (Spaced Repetition System) Components
 *
 * Components for flashcard management and spaced repetition learning.
 */

// Flashcard Deck List
export {
  FlashcardDeckList,
  default as FlashcardDeckListDefault,
} from "./FlashcardDeckList";

// Flashcard Study Interface
export {
  FlashcardStudy,
  default as FlashcardStudyDefault,
} from "./FlashcardStudy";

// Create Flashcard Dialog
export {
  CreateFlashcardDialog,
  default as CreateFlashcardDialogDefault,
} from "./CreateFlashcardDialog";

// Edit Flashcard Dialog
export {
  EditFlashcardDialog,
  default as EditFlashcardDialogDefault,
} from "./EditFlashcardDialog";

// Flashcard Statistics Dashboard
export {
  FlashcardStats,
  default as FlashcardStatsDefault,
} from "./FlashcardStats";

// Import/Export Dialog
export {
  ImportExportFlashcardsDialog,
  default as ImportExportFlashcardsDialogDefault,
} from "./ImportExportFlashcardsDialog";

// Types and utilities
export * from "./flashcardDeckTypes";
export * from "./flashcardImportExportTypes";
export * from "./flashcardStudyTypes";
export * from "./createFlashcardTypes";
export * from "./editFlashcardTypes";

// Flashcard Stats types - explicit exports to avoid naming conflicts
export type {
  FlashcardStatsSummary,
  CardStatusCounts,
  RetentionStats,
  RetentionTrend,
  DailyReviewData,
  StreakStats,
  StudyTimeStats,
  ReviewForecast,
  FlashcardStats as FlashcardStatsData,
  ChartType,
  ChartTypeConfig,
  TimeRange,
  TimeRangeConfig,
  StatsPreferences,
  FlashcardStatsProps,
  StatsSummaryCardProps,
  RetentionDisplayProps,
  StreakDisplayProps,
  HistoryChartProps,
  StatsLoadingState,
  StatsErrorType,
  StatsError,
} from "./flashcardStatsTypes";

export {
  STATS_PREFERENCES_KEY,
  DEFAULT_HISTORY_DAYS,
  MIN_HISTORY_DAYS,
  MAX_HISTORY_DAYS,
  DEFAULT_CHART_TYPE,
  RETENTION_THRESHOLDS,
  CHART_TYPES,
  TIME_RANGES,
  DEFAULT_STATS_PREFERENCES,
  createDefaultSummary,
  createDefaultRetention,
  createDefaultStreak,
  createDefaultStudyTime,
  createDefaultForecast,
  createDefaultStats,
  createStatsError,
  parseStatsApiError,
  getRetentionTrendDirection,
  getTrendColor,
  formatStreakCount,
  formatStudyTime,
  formatStudyTimeLong,
  formatDate,
  formatDateLong,
  calculateRetentionRate,
  calculateTotalReviews,
  calculateTotalCorrect,
  calculateTotalStudyTime,
  calculateAverageRetention,
  determineRetentionTrend,
  filterHistoryByRange,
  getChartData,
  isValidRetentionRate,
  isValidTimeRange,
  isValidChartType,
  isValidDailyReviewData,
  isValidStats,
  loadStatsPreferences,
  saveStatsPreferences,
  updatePreference,
  getStatusLabelKey,
  getStatusColor,
  getCardsByStatus,
  createMockHistory,
  createMockStats,
} from "./flashcardStatsTypes";
