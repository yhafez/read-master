/**
 * Flashcard Statistics Types
 *
 * Type definitions for the FlashcardStats component and related utilities.
 * This module provides types for displaying comprehensive flashcard statistics
 * including retention rate, cards by status, history charts, streaks, and due cards.
 */

import type { FlashcardStatus } from "./flashcardDeckTypes";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Key for storing stats preferences in localStorage */
export const STATS_PREFERENCES_KEY = "flashcard-stats-preferences";

/** Default number of days for history chart */
export const DEFAULT_HISTORY_DAYS = 30;

/** Minimum days for history chart */
export const MIN_HISTORY_DAYS = 7;

/** Maximum days for history chart */
export const MAX_HISTORY_DAYS = 365;

/** Default chart type */
export const DEFAULT_CHART_TYPE = "reviews" as const;

/** Retention rate thresholds for badges */
export const RETENTION_THRESHOLDS = {
  excellent: 90, // Green
  good: 70, // Yellow/Warning
  needsWork: 0, // Red
} as const;

// =============================================================================
// CORE STATISTICS TYPES
// =============================================================================

/**
 * Overall flashcard statistics summary
 */
export type FlashcardStatsSummary = {
  /** Total number of flashcards */
  totalCards: number;
  /** Number of active (non-suspended) cards */
  activeCards: number;
  /** Number of cards due today */
  dueToday: number;
  /** Number of overdue cards */
  overdueCards: number;
  /** Number of new cards never reviewed */
  newCards: number;
  /** Number of cards in learning phase */
  learningCards: number;
  /** Number of cards in review phase */
  reviewCards: number;
  /** Number of suspended cards */
  suspendedCards: number;
};

/**
 * Card counts by status
 */
export type CardStatusCounts = {
  new: number;
  learning: number;
  review: number;
  suspended: number;
};

/**
 * Retention statistics
 */
export type RetentionStats = {
  /** Overall retention rate (percentage, 0-100) */
  overall: number;
  /** Last 7 days retention rate */
  last7Days: number;
  /** Last 30 days retention rate */
  last30Days: number;
  /** Lifetime retention rate */
  lifetime: number;
  /** Trend direction (improving, declining, stable) */
  trend: RetentionTrend;
  /** Trend change percentage */
  trendChange: number;
};

/**
 * Retention trend direction
 */
export type RetentionTrend = "improving" | "declining" | "stable";

/**
 * Review history for a single day
 */
export type DailyReviewData = {
  /** Date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Total reviews on this day */
  reviews: number;
  /** Correct answers (rating >= 3) */
  correct: number;
  /** Incorrect answers (rating < 3) */
  incorrect: number;
  /** Retention rate for this day */
  retentionRate: number;
  /** New cards studied */
  newCardsStudied: number;
  /** Total study time in seconds */
  studyTimeSeconds: number;
};

/**
 * Streak information
 */
export type StreakStats = {
  /** Current active streak in days */
  currentStreak: number;
  /** Longest streak ever achieved */
  longestStreak: number;
  /** Whether the user has studied today */
  studiedToday: boolean;
  /** Last study date (ISO string) */
  lastStudyDate: string | null;
  /** Streak start date (ISO string) */
  streakStartDate: string | null;
};

/**
 * Study time statistics
 */
export type StudyTimeStats = {
  /** Total study time today in seconds */
  today: number;
  /** Total study time this week in seconds */
  thisWeek: number;
  /** Total study time this month in seconds */
  thisMonth: number;
  /** Average study time per day in seconds */
  averagePerDay: number;
};

/**
 * Forecast for upcoming reviews
 */
export type ReviewForecast = {
  /** Cards due today */
  today: number;
  /** Cards due tomorrow */
  tomorrow: number;
  /** Cards due in the next 7 days */
  next7Days: number;
  /** Cards due in the next 30 days */
  next30Days: number;
};

/**
 * Complete flashcard statistics
 */
export type FlashcardStats = {
  /** Summary statistics */
  summary: FlashcardStatsSummary;
  /** Retention statistics */
  retention: RetentionStats;
  /** Streak information */
  streak: StreakStats;
  /** Study time statistics */
  studyTime: StudyTimeStats;
  /** Review forecast */
  forecast: ReviewForecast;
  /** Review history (array of daily data) */
  history: DailyReviewData[];
  /** Last updated timestamp */
  updatedAt: string;
};

// =============================================================================
// CHART TYPES
// =============================================================================

/**
 * Chart types available in the stats dashboard
 */
export type ChartType = "reviews" | "retention" | "time";

/**
 * Chart type configuration
 */
export type ChartTypeConfig = {
  value: ChartType;
  labelKey: string;
  descriptionKey: string;
};

/**
 * Available chart types
 */
export const CHART_TYPES: ChartTypeConfig[] = [
  {
    value: "reviews",
    labelKey: "flashcards.stats.charts.reviews",
    descriptionKey: "flashcards.stats.charts.reviewsDescription",
  },
  {
    value: "retention",
    labelKey: "flashcards.stats.charts.retention",
    descriptionKey: "flashcards.stats.charts.retentionDescription",
  },
  {
    value: "time",
    labelKey: "flashcards.stats.charts.time",
    descriptionKey: "flashcards.stats.charts.timeDescription",
  },
];

/**
 * Time range options for charts
 */
export type TimeRange = "7d" | "30d" | "90d" | "365d";

/**
 * Time range configuration
 */
export type TimeRangeConfig = {
  value: TimeRange;
  labelKey: string;
  days: number;
};

/**
 * Available time ranges
 */
export const TIME_RANGES: TimeRangeConfig[] = [
  { value: "7d", labelKey: "flashcards.stats.timeRange.7days", days: 7 },
  { value: "30d", labelKey: "flashcards.stats.timeRange.30days", days: 30 },
  { value: "90d", labelKey: "flashcards.stats.timeRange.90days", days: 90 },
  { value: "365d", labelKey: "flashcards.stats.timeRange.year", days: 365 },
];

// =============================================================================
// USER PREFERENCES
// =============================================================================

/**
 * Stats dashboard preferences
 */
export type StatsPreferences = {
  /** Selected chart type */
  chartType: ChartType;
  /** Selected time range */
  timeRange: TimeRange;
  /** Whether to show the forecast section */
  showForecast: boolean;
  /** Whether to show the streak section */
  showStreak: boolean;
};

/**
 * Default stats preferences
 */
export const DEFAULT_STATS_PREFERENCES: StatsPreferences = {
  chartType: "reviews",
  timeRange: "30d",
  showForecast: true,
  showStreak: true,
};

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for FlashcardStats component
 */
export type FlashcardStatsProps = {
  /** Optional book ID to filter stats */
  bookId?: string;
  /** Custom className */
  className?: string;
  /** Callback when study now is clicked */
  onStudyNow?: () => void;
  /** Whether to show compact view */
  compact?: boolean;
};

/**
 * Props for stats summary cards
 */
export type StatsSummaryCardProps = {
  /** Title of the stat */
  title: string;
  /** Value to display */
  value: string | number;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Icon component */
  icon?: React.ReactNode;
  /** Color theme */
  color?: "primary" | "success" | "warning" | "error" | "info";
  /** Loading state */
  loading?: boolean;
};

/**
 * Props for retention rate display
 */
export type RetentionDisplayProps = {
  /** Retention stats */
  stats: RetentionStats;
  /** Loading state */
  loading?: boolean;
};

/**
 * Props for streak display
 */
export type StreakDisplayProps = {
  /** Streak stats */
  stats: StreakStats;
  /** Loading state */
  loading?: boolean;
};

/**
 * Props for history chart
 */
export type HistoryChartProps = {
  /** History data */
  data: DailyReviewData[];
  /** Chart type to display */
  chartType: ChartType;
  /** Time range to display */
  timeRange: TimeRange;
  /** Loading state */
  loading?: boolean;
  /** Callback when time range changes */
  onTimeRangeChange?: (range: TimeRange) => void;
  /** Callback when chart type changes */
  onChartTypeChange?: (type: ChartType) => void;
};

// =============================================================================
// LOADING AND ERROR STATES
// =============================================================================

/**
 * Stats loading state
 */
export type StatsLoadingState = "idle" | "loading" | "success" | "error";

/**
 * Stats error types
 */
export type StatsErrorType =
  | "network_error"
  | "unauthorized"
  | "not_found"
  | "unknown";

/**
 * Stats error structure
 */
export type StatsError = {
  type: StatsErrorType;
  message: string;
  retryable: boolean;
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create default flashcard stats summary
 */
export function createDefaultSummary(): FlashcardStatsSummary {
  return {
    totalCards: 0,
    activeCards: 0,
    dueToday: 0,
    overdueCards: 0,
    newCards: 0,
    learningCards: 0,
    reviewCards: 0,
    suspendedCards: 0,
  };
}

/**
 * Create default retention stats
 */
export function createDefaultRetention(): RetentionStats {
  return {
    overall: 0,
    last7Days: 0,
    last30Days: 0,
    lifetime: 0,
    trend: "stable",
    trendChange: 0,
  };
}

/**
 * Create default streak stats
 */
export function createDefaultStreak(): StreakStats {
  return {
    currentStreak: 0,
    longestStreak: 0,
    studiedToday: false,
    lastStudyDate: null,
    streakStartDate: null,
  };
}

/**
 * Create default study time stats
 */
export function createDefaultStudyTime(): StudyTimeStats {
  return {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    averagePerDay: 0,
  };
}

/**
 * Create default review forecast
 */
export function createDefaultForecast(): ReviewForecast {
  return {
    today: 0,
    tomorrow: 0,
    next7Days: 0,
    next30Days: 0,
  };
}

/**
 * Create default complete stats
 */
export function createDefaultStats(): FlashcardStats {
  return {
    summary: createDefaultSummary(),
    retention: createDefaultRetention(),
    streak: createDefaultStreak(),
    studyTime: createDefaultStudyTime(),
    forecast: createDefaultForecast(),
    history: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create a stats error
 */
export function createStatsError(
  type: StatsErrorType,
  message?: string
): StatsError {
  const defaultMessages: Record<StatsErrorType, string> = {
    network_error: "Unable to load statistics. Please check your connection.",
    unauthorized: "You are not authorized to view these statistics.",
    not_found: "Statistics not found.",
    unknown: "An unexpected error occurred. Please try again.",
  };

  const retryableErrors: StatsErrorType[] = ["network_error"];

  return {
    type,
    message: message ?? defaultMessages[type],
    retryable: retryableErrors.includes(type),
  };
}

/**
 * Parse API error to stats error
 */
export function parseStatsApiError(
  status: number,
  errorMessage?: string
): StatsError {
  if (status === 404) {
    return createStatsError("not_found", errorMessage);
  }
  if (status === 401 || status === 403) {
    return createStatsError("unauthorized", errorMessage);
  }
  if (status === 0) {
    return createStatsError("network_error");
  }
  return createStatsError("unknown", errorMessage);
}

// =============================================================================
// FORMATTING FUNCTIONS
// =============================================================================

/**
 * Format retention rate for display
 */
export function formatRetentionRate(rate: number): string {
  return `${Math.round(rate)}%`;
}

/**
 * Get retention badge color based on rate
 */
export function getRetentionBadgeColor(
  rate: number
): "success" | "warning" | "error" | "default" {
  if (rate >= RETENTION_THRESHOLDS.excellent) return "success";
  if (rate >= RETENTION_THRESHOLDS.good) return "warning";
  if (rate > RETENTION_THRESHOLDS.needsWork) return "error";
  return "default";
}

/**
 * Get retention trend icon direction
 */
export function getRetentionTrendDirection(
  trend: RetentionTrend
): "up" | "down" | "stable" {
  switch (trend) {
    case "improving":
      return "up";
    case "declining":
      return "down";
    case "stable":
    default:
      return "stable";
  }
}

/**
 * Get trend color
 */
export function getTrendColor(
  trend: RetentionTrend
): "success" | "error" | "default" {
  switch (trend) {
    case "improving":
      return "success";
    case "declining":
      return "error";
    case "stable":
    default:
      return "default";
  }
}

/**
 * Format streak count for display
 */
export function formatStreakCount(days: number): string {
  if (days === 0) return "0";
  if (days === 1) return "1 day";
  return `${days} days`;
}

/**
 * Format study time for display (converts seconds to readable format)
 */
export function formatStudyTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Format study time for display in long format
 */
export function formatStudyTimeLong(seconds: number): string {
  if (seconds < 60) {
    const s = Math.round(seconds);
    return s === 1 ? "1 second" : `${s} seconds`;
  }
  if (seconds < 3600) {
    const m = Math.round(seconds / 60);
    return m === 1 ? "1 minute" : `${m} minutes`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  const hourStr = hours === 1 ? "1 hour" : `${hours} hours`;
  if (minutes === 0) return hourStr;
  const minStr = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  return `${hourStr} ${minStr}`;
}

/**
 * Format card count for display
 */
export function formatCardCount(count: number): string {
  if (count > 9999) {
    return `${Math.floor(count / 1000)}k`;
  }
  return count.toLocaleString();
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Format date for display with year
 */
export function formatDateLong(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// =============================================================================
// CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate retention rate from correct and total reviews
 */
export function calculateRetentionRate(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * Calculate total reviews from history
 */
export function calculateTotalReviews(history: DailyReviewData[]): number {
  return history.reduce((sum, day) => sum + day.reviews, 0);
}

/**
 * Calculate total correct from history
 */
export function calculateTotalCorrect(history: DailyReviewData[]): number {
  return history.reduce((sum, day) => sum + day.correct, 0);
}

/**
 * Calculate total study time from history
 */
export function calculateTotalStudyTime(history: DailyReviewData[]): number {
  return history.reduce((sum, day) => sum + day.studyTimeSeconds, 0);
}

/**
 * Calculate average retention from history
 */
export function calculateAverageRetention(history: DailyReviewData[]): number {
  const daysWithReviews = history.filter((d) => d.reviews > 0);
  if (daysWithReviews.length === 0) return 0;
  const totalRetention = daysWithReviews.reduce(
    (sum, d) => sum + d.retentionRate,
    0
  );
  return Math.round(totalRetention / daysWithReviews.length);
}

/**
 * Determine retention trend from history
 */
export function determineRetentionTrend(history: DailyReviewData[]): {
  trend: RetentionTrend;
  change: number;
} {
  if (history.length < 7) {
    return { trend: "stable", change: 0 };
  }

  const recentDays = history.slice(-7).filter((d) => d.reviews > 0);
  const olderDays = history.slice(-14, -7).filter((d) => d.reviews > 0);

  if (recentDays.length === 0 || olderDays.length === 0) {
    return { trend: "stable", change: 0 };
  }

  const recentAvg =
    recentDays.reduce((sum, d) => sum + d.retentionRate, 0) / recentDays.length;
  const olderAvg =
    olderDays.reduce((sum, d) => sum + d.retentionRate, 0) / olderDays.length;

  const change = Math.round(recentAvg - olderAvg);

  if (change > 3) return { trend: "improving", change };
  if (change < -3) return { trend: "declining", change };
  return { trend: "stable", change };
}

/**
 * Filter history by time range
 */
export function filterHistoryByRange(
  history: DailyReviewData[],
  timeRange: TimeRange
): DailyReviewData[] {
  const rangeConfig = TIME_RANGES.find((r) => r.value === timeRange);
  const days = rangeConfig?.days ?? 30;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().split("T")[0] ?? "";

  return history.filter((d) => d.date >= cutoffStr);
}

/**
 * Get chart data for a specific type
 */
export function getChartData(
  history: DailyReviewData[],
  chartType: ChartType
): Array<{ date: string; value: number; label: string }> {
  return history.map((day) => {
    let value: number;
    let label: string;

    switch (chartType) {
      case "reviews":
        value = day.reviews;
        label = `${day.reviews} reviews`;
        break;
      case "retention":
        value = day.retentionRate;
        label = `${Math.round(day.retentionRate)}%`;
        break;
      case "time":
        value = Math.round(day.studyTimeSeconds / 60); // Convert to minutes
        label = formatStudyTime(day.studyTimeSeconds);
        break;
      default:
        value = day.reviews;
        label = `${day.reviews} reviews`;
    }

    return {
      date: day.date,
      value,
      label,
    };
  });
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Check if retention rate is valid
 */
export function isValidRetentionRate(rate: number): boolean {
  return typeof rate === "number" && rate >= 0 && rate <= 100;
}

/**
 * Check if time range is valid
 */
export function isValidTimeRange(range: string): range is TimeRange {
  return TIME_RANGES.some((r) => r.value === range);
}

/**
 * Check if chart type is valid
 */
export function isValidChartType(type: string): type is ChartType {
  return CHART_TYPES.some((t) => t.value === type);
}

/**
 * Check if daily review data is valid
 */
export function isValidDailyReviewData(data: unknown): data is DailyReviewData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.date === "string" &&
    typeof d.reviews === "number" &&
    typeof d.correct === "number" &&
    typeof d.incorrect === "number" &&
    typeof d.retentionRate === "number" &&
    typeof d.newCardsStudied === "number" &&
    typeof d.studyTimeSeconds === "number"
  );
}

/**
 * Validate complete stats object
 */
export function isValidStats(stats: unknown): stats is FlashcardStats {
  if (!stats || typeof stats !== "object") return false;
  const s = stats as Record<string, unknown>;
  return (
    typeof s.summary === "object" &&
    s.summary !== null &&
    typeof s.retention === "object" &&
    s.retention !== null &&
    typeof s.streak === "object" &&
    s.streak !== null &&
    typeof s.studyTime === "object" &&
    s.studyTime !== null &&
    typeof s.forecast === "object" &&
    s.forecast !== null &&
    Array.isArray(s.history) &&
    typeof s.updatedAt === "string"
  );
}

// =============================================================================
// PREFERENCE FUNCTIONS
// =============================================================================

/**
 * Load stats preferences from localStorage
 */
export function loadStatsPreferences(): StatsPreferences {
  try {
    const saved = localStorage.getItem(STATS_PREFERENCES_KEY);
    if (!saved) return DEFAULT_STATS_PREFERENCES;

    const parsed = JSON.parse(saved);
    return {
      chartType: isValidChartType(parsed.chartType)
        ? parsed.chartType
        : DEFAULT_STATS_PREFERENCES.chartType,
      timeRange: isValidTimeRange(parsed.timeRange)
        ? parsed.timeRange
        : DEFAULT_STATS_PREFERENCES.timeRange,
      showForecast:
        typeof parsed.showForecast === "boolean"
          ? parsed.showForecast
          : DEFAULT_STATS_PREFERENCES.showForecast,
      showStreak:
        typeof parsed.showStreak === "boolean"
          ? parsed.showStreak
          : DEFAULT_STATS_PREFERENCES.showStreak,
    };
  } catch {
    return DEFAULT_STATS_PREFERENCES;
  }
}

/**
 * Save stats preferences to localStorage
 */
export function saveStatsPreferences(prefs: StatsPreferences): void {
  try {
    localStorage.setItem(STATS_PREFERENCES_KEY, JSON.stringify(prefs));
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Update single preference
 */
export function updatePreference<K extends keyof StatsPreferences>(
  current: StatsPreferences,
  key: K,
  value: StatsPreferences[K]
): StatsPreferences {
  return { ...current, [key]: value };
}

// =============================================================================
// STATUS HELPERS
// =============================================================================

/**
 * Get status label key
 */
export function getStatusLabelKey(status: FlashcardStatus): string {
  const statusLabels: Record<FlashcardStatus, string> = {
    NEW: "flashcards.stats.status.new",
    LEARNING: "flashcards.stats.status.learning",
    REVIEW: "flashcards.stats.status.review",
    SUSPENDED: "flashcards.stats.status.suspended",
  };
  return statusLabels[status];
}

/**
 * Get status color
 */
export function getStatusColor(
  status: FlashcardStatus
): "info" | "warning" | "success" | "default" {
  const statusColors: Record<
    FlashcardStatus,
    "info" | "warning" | "success" | "default"
  > = {
    NEW: "info",
    LEARNING: "warning",
    REVIEW: "success",
    SUSPENDED: "default",
  };
  return statusColors[status];
}

/**
 * Get cards by status from summary
 */
export function getCardsByStatus(
  summary: FlashcardStatsSummary
): CardStatusCounts {
  return {
    new: summary.newCards,
    learning: summary.learningCards,
    review: summary.reviewCards,
    suspended: summary.suspendedCards,
  };
}

// =============================================================================
// MOCK DATA FOR TESTING
// =============================================================================

/**
 * Create mock history data for testing
 */
export function createMockHistory(days: number): DailyReviewData[] {
  const history: DailyReviewData[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0] ?? "";

    const reviews = Math.floor(Math.random() * 50) + 10;
    const correct = Math.floor(reviews * (0.7 + Math.random() * 0.25));
    const incorrect = reviews - correct;

    history.push({
      date: dateStr,
      reviews,
      correct,
      incorrect,
      retentionRate: calculateRetentionRate(correct, reviews),
      newCardsStudied: Math.floor(Math.random() * 10),
      studyTimeSeconds: Math.floor(Math.random() * 1800) + 300,
    });
  }

  return history;
}

/**
 * Create mock stats for testing
 */
export function createMockStats(): FlashcardStats {
  const history = createMockHistory(30);
  const totalReviews = calculateTotalReviews(history);
  const totalCorrect = calculateTotalCorrect(history);
  const { trend, change } = determineRetentionTrend(history);

  return {
    summary: {
      totalCards: 250,
      activeCards: 230,
      dueToday: 25,
      overdueCards: 5,
      newCards: 50,
      learningCards: 30,
      reviewCards: 150,
      suspendedCards: 20,
    },
    retention: {
      overall: calculateRetentionRate(totalCorrect, totalReviews),
      last7Days: calculateAverageRetention(history.slice(-7)),
      last30Days: calculateAverageRetention(history),
      lifetime: 82,
      trend,
      trendChange: change,
    },
    streak: {
      currentStreak: 7,
      longestStreak: 21,
      studiedToday: true,
      lastStudyDate: new Date().toISOString(),
      streakStartDate: new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
    },
    studyTime: {
      today: 1200,
      thisWeek: 7200,
      thisMonth: 28800,
      averagePerDay: 960,
    },
    forecast: {
      today: 25,
      tomorrow: 18,
      next7Days: 120,
      next30Days: 450,
    },
    history,
    updatedAt: new Date().toISOString(),
  };
}
