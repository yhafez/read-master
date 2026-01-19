/**
 * Assessment History Types and Utilities
 *
 * Provides types, constants, and utility functions for displaying assessment
 * history, filtering results, tracking progress over time, and managing retakes.
 */

import type {
  BloomLevel,
  AssessmentType,
  AssessmentResult,
} from "./assessmentTypes";
import {
  BLOOM_LEVELS_ORDER,
  BLOOM_LEVEL_COLORS,
  BLOOM_LEVEL_DISPLAY,
} from "./assessmentTypes";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Assessment history item representing a completed assessment
 */
export type AssessmentHistoryItem = {
  id: string;
  assessmentId: string;
  bookId: string;
  bookTitle: string;
  bookAuthor?: string | undefined;
  assessmentType: AssessmentType;
  score: number;
  totalPoints: number;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number; // in seconds
  completedAt: string; // ISO date string
  bloomsBreakdown: Record<BloomLevel, number>;
};

/**
 * Assessment history summary for aggregated statistics
 */
export type AssessmentHistorySummary = {
  totalAssessments: number;
  averageScore: number;
  totalTimeSpent: number;
  bestScore: number;
  worstScore: number;
  assessmentsByBook: Record<string, number>;
  averageBloomsBreakdown: Record<BloomLevel, number>;
  recentTrend: "improving" | "stable" | "declining";
};

/**
 * Filter options for assessment history
 */
export type AssessmentHistoryFilter = {
  bookId?: string | undefined;
  assessmentType?: AssessmentType | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  minScore?: number | undefined;
  maxScore?: number | undefined;
};

/**
 * Sort options for assessment history
 */
export type AssessmentHistorySortField =
  | "completedAt"
  | "percentage"
  | "timeSpent"
  | "bookTitle";

export type AssessmentHistorySortOrder = "asc" | "desc";

export type AssessmentHistorySort = {
  field: AssessmentHistorySortField;
  order: AssessmentHistorySortOrder;
};

/**
 * History page state
 */
export type HistoryPageState = {
  items: AssessmentHistoryItem[];
  loading: boolean;
  error: string | null;
  filter: AssessmentHistoryFilter;
  sort: AssessmentHistorySort;
  page: number;
  pageSize: number;
  totalCount: number;
  selectedId: string | null;
};

/**
 * Bloom's level progress data for charts
 */
export type BloomLevelProgress = {
  level: BloomLevel;
  percentage: number;
  color: string;
  label: string;
};

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default page size for history list
 */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Available page size options
 */
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

/**
 * Default sort configuration
 */
export const DEFAULT_SORT: AssessmentHistorySort = {
  field: "completedAt",
  order: "desc",
};

/**
 * Sort field display names
 */
export const SORT_FIELD_DISPLAY: Record<AssessmentHistorySortField, string> = {
  completedAt: "Date",
  percentage: "Score",
  timeSpent: "Duration",
  bookTitle: "Book",
};

/**
 * Score thresholds for performance categories
 */
export const SCORE_THRESHOLDS = {
  excellent: 90,
  good: 70,
  average: 50,
  needsWork: 0,
} as const;

/**
 * Performance category labels
 */
export const PERFORMANCE_LABELS = {
  excellent: "Excellent",
  good: "Good",
  average: "Average",
  needsWork: "Needs Work",
} as const;

/**
 * Performance category colors
 */
export const PERFORMANCE_COLORS = {
  excellent: "#4caf50",
  good: "#8bc34a",
  average: "#ff9800",
  needsWork: "#f44336",
} as const;

/**
 * Trend thresholds
 */
export const TREND_THRESHOLD = 5; // percentage points difference for trend

/**
 * Minimum assessments required for trend calculation
 */
export const MIN_ASSESSMENTS_FOR_TREND = 3;

// =============================================================================
// FILTER FUNCTIONS
// =============================================================================

/**
 * Creates default filter
 */
export function createDefaultFilter(): AssessmentHistoryFilter {
  return {};
}

/**
 * Checks if filter is active (has any non-empty values)
 */
export function isFilterActive(filter: AssessmentHistoryFilter): boolean {
  return (
    filter.bookId !== undefined ||
    filter.assessmentType !== undefined ||
    filter.dateFrom !== undefined ||
    filter.dateTo !== undefined ||
    filter.minScore !== undefined ||
    filter.maxScore !== undefined
  );
}

/**
 * Counts active filter fields
 */
export function countActiveFilters(filter: AssessmentHistoryFilter): number {
  let count = 0;
  if (filter.bookId !== undefined) count++;
  if (filter.assessmentType !== undefined) count++;
  if (filter.dateFrom !== undefined) count++;
  if (filter.dateTo !== undefined) count++;
  if (filter.minScore !== undefined) count++;
  if (filter.maxScore !== undefined) count++;
  return count;
}

/**
 * Applies filter to assessment history items (client-side filtering)
 */
export function filterHistoryItems(
  items: AssessmentHistoryItem[],
  filter: AssessmentHistoryFilter
): AssessmentHistoryItem[] {
  return items.filter((item) => {
    if (filter.bookId && item.bookId !== filter.bookId) return false;
    if (filter.assessmentType && item.assessmentType !== filter.assessmentType)
      return false;
    if (filter.dateFrom && item.completedAt < filter.dateFrom) return false;
    if (filter.dateTo && item.completedAt > filter.dateTo) return false;
    if (filter.minScore !== undefined && item.percentage < filter.minScore)
      return false;
    if (filter.maxScore !== undefined && item.percentage > filter.maxScore)
      return false;
    return true;
  });
}

// =============================================================================
// SORT FUNCTIONS
// =============================================================================

/**
 * Sorts assessment history items
 */
export function sortHistoryItems(
  items: AssessmentHistoryItem[],
  sort: AssessmentHistorySort
): AssessmentHistoryItem[] {
  const sorted = [...items].sort((a, b) => {
    let comparison = 0;
    switch (sort.field) {
      case "completedAt":
        comparison = a.completedAt.localeCompare(b.completedAt);
        break;
      case "percentage":
        comparison = a.percentage - b.percentage;
        break;
      case "timeSpent":
        comparison = a.timeSpent - b.timeSpent;
        break;
      case "bookTitle":
        comparison = a.bookTitle.localeCompare(b.bookTitle);
        break;
    }
    return sort.order === "asc" ? comparison : -comparison;
  });
  return sorted;
}

/**
 * Toggles sort order or changes sort field
 */
export function toggleSort(
  currentSort: AssessmentHistorySort,
  field: AssessmentHistorySortField
): AssessmentHistorySort {
  if (currentSort.field === field) {
    return {
      field,
      order: currentSort.order === "asc" ? "desc" : "asc",
    };
  }
  return { field, order: "desc" };
}

// =============================================================================
// STATISTICS FUNCTIONS
// =============================================================================

/**
 * Calculates assessment history summary
 */
export function calculateHistorySummary(
  items: AssessmentHistoryItem[]
): AssessmentHistorySummary {
  if (items.length === 0) {
    return {
      totalAssessments: 0,
      averageScore: 0,
      totalTimeSpent: 0,
      bestScore: 0,
      worstScore: 0,
      assessmentsByBook: {},
      averageBloomsBreakdown: createEmptyBloomsBreakdown(),
      recentTrend: "stable",
    };
  }

  const scores = items.map((i) => i.percentage);
  const totalTime = items.reduce((sum, i) => sum + i.timeSpent, 0);

  // Assessments by book
  const byBook: Record<string, number> = {};
  items.forEach((item) => {
    byBook[item.bookId] = (byBook[item.bookId] ?? 0) + 1;
  });

  // Average Bloom's breakdown
  const avgBlooms = calculateAverageBloomsBreakdown(items);

  // Calculate trend from recent assessments
  const trend = calculateTrend(items);

  return {
    totalAssessments: items.length,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    totalTimeSpent: totalTime,
    bestScore: Math.max(...scores),
    worstScore: Math.min(...scores),
    assessmentsByBook: byBook,
    averageBloomsBreakdown: avgBlooms,
    recentTrend: trend,
  };
}

/**
 * Creates empty Bloom's breakdown
 */
export function createEmptyBloomsBreakdown(): Record<BloomLevel, number> {
  return {
    remember: 0,
    understand: 0,
    apply: 0,
    analyze: 0,
    evaluate: 0,
    create: 0,
  };
}

/**
 * Calculates average Bloom's breakdown across assessments
 */
export function calculateAverageBloomsBreakdown(
  items: AssessmentHistoryItem[]
): Record<BloomLevel, number> {
  if (items.length === 0) return createEmptyBloomsBreakdown();

  const totals = createEmptyBloomsBreakdown();
  items.forEach((item) => {
    BLOOM_LEVELS_ORDER.forEach((level) => {
      totals[level] += item.bloomsBreakdown[level] ?? 0;
    });
  });

  const avg = createEmptyBloomsBreakdown();
  BLOOM_LEVELS_ORDER.forEach((level) => {
    avg[level] = Math.round(totals[level] / items.length);
  });

  return avg;
}

/**
 * Calculates performance trend from recent assessments
 */
export function calculateTrend(
  items: AssessmentHistoryItem[]
): "improving" | "stable" | "declining" {
  if (items.length < MIN_ASSESSMENTS_FOR_TREND) return "stable";

  // Sort by date descending
  const sorted = [...items].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt)
  );

  // Compare recent vs older half
  const mid = Math.floor(sorted.length / 2);
  const recentAvg =
    sorted.slice(0, mid).reduce((sum, i) => sum + i.percentage, 0) / mid;
  const olderAvg =
    sorted.slice(mid).reduce((sum, i) => sum + i.percentage, 0) /
    (sorted.length - mid);

  const diff = recentAvg - olderAvg;

  if (diff >= TREND_THRESHOLD) return "improving";
  if (diff <= -TREND_THRESHOLD) return "declining";
  return "stable";
}

/**
 * Gets Bloom's level progress data for visualization
 */
export function getBloomLevelProgress(
  breakdown: Record<BloomLevel, number>
): BloomLevelProgress[] {
  return BLOOM_LEVELS_ORDER.map((level) => ({
    level,
    percentage: breakdown[level] ?? 0,
    color: BLOOM_LEVEL_COLORS[level],
    label: BLOOM_LEVEL_DISPLAY[level],
  }));
}

// =============================================================================
// PERFORMANCE CATEGORIZATION
// =============================================================================

/**
 * Gets performance category for a score
 */
export function getPerformanceCategory(
  percentage: number
): keyof typeof SCORE_THRESHOLDS {
  if (percentage >= SCORE_THRESHOLDS.excellent) return "excellent";
  if (percentage >= SCORE_THRESHOLDS.good) return "good";
  if (percentage >= SCORE_THRESHOLDS.average) return "average";
  return "needsWork";
}

/**
 * Gets performance label for a score
 */
export function getPerformanceLabel(percentage: number): string {
  return PERFORMANCE_LABELS[getPerformanceCategory(percentage)];
}

/**
 * Gets performance color for a score
 */
export function getPerformanceColor(percentage: number): string {
  return PERFORMANCE_COLORS[getPerformanceCategory(percentage)];
}

// =============================================================================
// DATE/TIME FORMATTING
// =============================================================================

/**
 * Formats date for display
 */
export function formatHistoryDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats date and time for display
 */
export function formatHistoryDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formats duration in seconds to readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

/**
 * Formats total time spent (hours/minutes)
 */
export function formatTotalTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Gets relative time string (e.g., "2 days ago")
 */
export function getRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// =============================================================================
// RETAKE HELPERS
// =============================================================================

/**
 * Checks if an assessment can be retaken
 */
export function canRetake(_item: AssessmentHistoryItem): boolean {
  // All assessments can be retaken
  return true;
}

/**
 * Builds retake URL for an assessment
 */
export function buildRetakeUrl(
  item: AssessmentHistoryItem,
  assessmentType?: AssessmentType
): string {
  const type = assessmentType ?? item.assessmentType;
  return `/assessments/new?bookId=${item.bookId}&type=${type}`;
}

// =============================================================================
// MOCK DATA GENERATION (for development/testing)
// =============================================================================

/**
 * Generates mock assessment history item
 */
export function generateMockHistoryItem(
  overrides?: Partial<AssessmentHistoryItem>
): AssessmentHistoryItem {
  const percentage = Math.floor(Math.random() * 50) + 50; // 50-100%
  const totalQuestions = [5, 10, 20][Math.floor(Math.random() * 3)] ?? 10;
  const correctAnswers = Math.round((percentage / 100) * totalQuestions);

  return {
    id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    assessmentId: `assess-${Math.random().toString(36).slice(2, 9)}`,
    bookId: `book-${Math.random().toString(36).slice(2, 9)}`,
    bookTitle: "Sample Book Title",
    bookAuthor: "Sample Author",
    assessmentType: ["quick", "standard", "comprehensive"][
      Math.floor(Math.random() * 3)
    ] as AssessmentType,
    score: correctAnswers * 100,
    totalPoints: totalQuestions * 100,
    percentage,
    correctAnswers,
    totalQuestions,
    timeSpent: Math.floor(Math.random() * 1800) + 60, // 1-31 minutes
    completedAt: new Date(
      Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)
    ).toISOString(),
    bloomsBreakdown: {
      remember: Math.floor(Math.random() * 40) + 60,
      understand: Math.floor(Math.random() * 40) + 60,
      apply: Math.floor(Math.random() * 50) + 50,
      analyze: Math.floor(Math.random() * 50) + 50,
      evaluate: Math.floor(Math.random() * 60) + 40,
      create: Math.floor(Math.random() * 60) + 40,
    },
    ...overrides,
  };
}

/**
 * Generates array of mock history items
 */
export function generateMockHistory(count: number): AssessmentHistoryItem[] {
  const bookTitles = [
    "The Great Gatsby",
    "To Kill a Mockingbird",
    "1984",
    "Pride and Prejudice",
    "The Catcher in the Rye",
  ];
  const authors = [
    "F. Scott Fitzgerald",
    "Harper Lee",
    "George Orwell",
    "Jane Austen",
    "J.D. Salinger",
  ];

  return Array.from({ length: count }, (_, i) => {
    const bookIndex = i % bookTitles.length;
    // Using non-null assertion since bookIndex is always valid via modulo
    const title = bookTitles[bookIndex] as string;
    const author = authors[bookIndex] as string;
    return generateMockHistoryItem({
      bookTitle: title,
      bookAuthor: author,
      bookId: `book-${bookIndex}`,
    });
  });
}

// =============================================================================
// CONVERSION HELPERS
// =============================================================================

/**
 * Converts AssessmentResult to AssessmentHistoryItem
 */
export function resultToHistoryItem(
  result: AssessmentResult,
  bookId: string,
  bookTitle: string,
  bookAuthor: string | undefined,
  assessmentType: AssessmentType
): AssessmentHistoryItem {
  return {
    id: `history-${result.assessmentId}`,
    assessmentId: result.assessmentId,
    bookId,
    bookTitle,
    bookAuthor,
    assessmentType,
    score: result.score,
    totalPoints: result.totalPoints,
    percentage: result.percentage,
    correctAnswers: result.correctAnswers,
    totalQuestions: result.totalQuestions,
    timeSpent: result.timeSpent,
    completedAt: new Date().toISOString(),
    bloomsBreakdown: result.bloomsBreakdown,
  };
}

/**
 * Gets unique books from history
 */
export function getUniqueBooks(
  items: AssessmentHistoryItem[]
): Array<{ id: string; title: string }> {
  const bookMap = new Map<string, string>();
  items.forEach((item) => {
    if (!bookMap.has(item.bookId)) {
      bookMap.set(item.bookId, item.bookTitle);
    }
  });
  return Array.from(bookMap.entries()).map(([id, title]) => ({ id, title }));
}
