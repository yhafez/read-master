/**
 * Advanced book search types and utilities
 *
 * Provides comprehensive search and filtering capabilities for the library
 */

import type { Book } from "@/hooks/useBooks";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Book type filter options
 */
export type BookType = "epub" | "pdf" | "doc" | "text" | "url";

/**
 * Progress range filter
 */
export interface ProgressRange {
  min: number;
  max: number;
}

/**
 * Date range filter
 */
export interface DateRange {
  start: Date | null;
  end: Date | null;
}

/**
 * Advanced search filters
 */
export interface AdvancedSearchFilters {
  /** Full-text search query */
  query: string;
  /** Filter by book status */
  status: Book["status"] | "all";
  /** Filter by genres (multiple allowed) */
  genres: string[];
  /** Filter by tags (multiple allowed) */
  tags: string[];
  /** Filter by progress range (0-100) */
  progress: ProgressRange;
  /** Filter by date added range */
  dateAdded: DateRange;
  /** Filter by last read date range */
  lastRead: DateRange;
  /** Filter by book type */
  types: BookType[];
  /** Filter by author (partial match) */
  author: string;
}

/**
 * Filter chip display configuration
 */
export interface FilterChip {
  key: string;
  labelKey: string;
  value: string;
  onRemove: () => void;
}

/**
 * Search result metadata
 */
export interface SearchResultMeta {
  totalCount: number;
  filteredCount: number;
  activeFilterCount: number;
}

/**
 * Search dialog state
 */
export type SearchDialogState = "idle" | "searching" | "error";

/**
 * Search error types
 */
export type SearchErrorType =
  | "network"
  | "timeout"
  | "invalid_query"
  | "unknown";

/**
 * Search error
 */
export interface SearchError {
  type: SearchErrorType;
  message: string;
}

/**
 * Filter section configuration
 */
export interface FilterSectionConfig {
  id: string;
  labelKey: string;
  icon: string;
  expanded: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Book type options with i18n keys
 */
export const BOOK_TYPE_OPTIONS: Array<{ value: BookType; labelKey: string }> = [
  { value: "epub", labelKey: "library.advancedSearch.types.epub" },
  { value: "pdf", labelKey: "library.advancedSearch.types.pdf" },
  { value: "doc", labelKey: "library.advancedSearch.types.doc" },
  { value: "text", labelKey: "library.advancedSearch.types.text" },
  { value: "url", labelKey: "library.advancedSearch.types.url" },
];

/**
 * Progress range presets
 */
export const PROGRESS_PRESETS: Array<{
  labelKey: string;
  range: ProgressRange;
}> = [
  {
    labelKey: "library.advancedSearch.progress.notStarted",
    range: { min: 0, max: 0 },
  },
  {
    labelKey: "library.advancedSearch.progress.inProgress",
    range: { min: 1, max: 99 },
  },
  {
    labelKey: "library.advancedSearch.progress.almostDone",
    range: { min: 75, max: 99 },
  },
  {
    labelKey: "library.advancedSearch.progress.completed",
    range: { min: 100, max: 100 },
  },
];

/**
 * Date range presets
 */
export const DATE_PRESETS: Array<{
  labelKey: string;
  getDates: () => DateRange;
}> = [
  {
    labelKey: "library.advancedSearch.dates.today",
    getDates: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { start: today, end: tomorrow };
    },
  },
  {
    labelKey: "library.advancedSearch.dates.lastWeek",
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    },
  },
  {
    labelKey: "library.advancedSearch.dates.lastMonth",
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    },
  },
  {
    labelKey: "library.advancedSearch.dates.lastYear",
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    },
  },
];

/**
 * Filter section configurations
 */
export const FILTER_SECTIONS: FilterSectionConfig[] = [
  {
    id: "status",
    labelKey: "library.advancedSearch.sections.status",
    icon: "bookmark",
    expanded: true,
  },
  {
    id: "progress",
    labelKey: "library.advancedSearch.sections.progress",
    icon: "percent",
    expanded: true,
  },
  {
    id: "genre",
    labelKey: "library.advancedSearch.sections.genre",
    icon: "category",
    expanded: false,
  },
  {
    id: "tags",
    labelKey: "library.advancedSearch.sections.tags",
    icon: "label",
    expanded: false,
  },
  {
    id: "dates",
    labelKey: "library.advancedSearch.sections.dates",
    icon: "calendar",
    expanded: false,
  },
  {
    id: "type",
    labelKey: "library.advancedSearch.sections.type",
    icon: "file",
    expanded: false,
  },
];

/**
 * Minimum characters required for search
 */
export const MIN_SEARCH_LENGTH = 2;

/**
 * Search debounce delay in milliseconds
 */
export const SEARCH_DEBOUNCE_MS = 300;

// =============================================================================
// DEFAULT VALUES
// =============================================================================

/**
 * Default advanced search filters
 */
export const DEFAULT_ADVANCED_FILTERS: AdvancedSearchFilters = {
  query: "",
  status: "all",
  genres: [],
  tags: [],
  progress: { min: 0, max: 100 },
  dateAdded: { start: null, end: null },
  lastRead: { start: null, end: null },
  types: [],
  author: "",
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create default advanced search filters
 */
export function createDefaultFilters(): AdvancedSearchFilters {
  return { ...DEFAULT_ADVANCED_FILTERS };
}

/**
 * Check if a search query is valid
 */
export function isValidSearchQuery(query: string): boolean {
  return query.trim().length >= MIN_SEARCH_LENGTH || query.trim().length === 0;
}

/**
 * Normalize a search query
 */
export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Check if a progress range is the default (0-100)
 */
export function isDefaultProgressRange(range: ProgressRange): boolean {
  return range.min === 0 && range.max === 100;
}

/**
 * Check if a date range has any value set
 */
export function hasDateRange(range: DateRange): boolean {
  return range.start !== null || range.end !== null;
}

/**
 * Check if filters are at default values (no filters applied)
 */
export function areFiltersDefault(filters: AdvancedSearchFilters): boolean {
  return (
    filters.query === "" &&
    filters.status === "all" &&
    filters.genres.length === 0 &&
    filters.tags.length === 0 &&
    isDefaultProgressRange(filters.progress) &&
    !hasDateRange(filters.dateAdded) &&
    !hasDateRange(filters.lastRead) &&
    filters.types.length === 0 &&
    filters.author === ""
  );
}

/**
 * Count the number of active filters
 */
export function countActiveFilters(filters: AdvancedSearchFilters): number {
  let count = 0;

  if (filters.query.trim().length > 0) count++;
  if (filters.status !== "all") count++;
  if (filters.genres.length > 0) count += filters.genres.length;
  if (filters.tags.length > 0) count += filters.tags.length;
  if (!isDefaultProgressRange(filters.progress)) count++;
  if (hasDateRange(filters.dateAdded)) count++;
  if (hasDateRange(filters.lastRead)) count++;
  if (filters.types.length > 0) count += filters.types.length;
  if (filters.author.trim().length > 0) count++;

  return count;
}

/**
 * Check if a book matches a search query (full-text search)
 */
export function matchesSearchQuery(book: Book, query: string): boolean {
  if (!query.trim()) return true;

  const normalizedQuery = normalizeSearchQuery(query);
  const searchableFields = [book.title, book.author].filter(Boolean);

  return searchableFields.some((field) =>
    field.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Check if a book matches status filter
 */
export function matchesStatusFilter(
  book: Book,
  status: AdvancedSearchFilters["status"]
): boolean {
  if (status === "all") return true;
  return book.status === status;
}

/**
 * Check if a book matches progress range filter
 */
export function matchesProgressFilter(
  book: Book,
  range: ProgressRange
): boolean {
  return book.progress >= range.min && book.progress <= range.max;
}

/**
 * Check if a date is within a date range
 */
export function isDateInRange(date: Date | string, range: DateRange): boolean {
  if (!hasDateRange(range)) return true;

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (range.start && dateObj < range.start) return false;
  if (range.end && dateObj > range.end) return false;

  return true;
}

/**
 * Check if a book matches date added filter
 */
export function matchesDateAddedFilter(book: Book, range: DateRange): boolean {
  if (!hasDateRange(range)) return true;
  return isDateInRange(book.createdAt, range);
}

/**
 * Merge filters with partial updates
 */
export function mergeFilters(
  current: AdvancedSearchFilters,
  updates: Partial<AdvancedSearchFilters>
): AdvancedSearchFilters {
  return {
    ...current,
    ...updates,
    // Ensure nested objects are properly merged
    progress: updates.progress
      ? { ...current.progress, ...updates.progress }
      : current.progress,
    dateAdded: updates.dateAdded
      ? { ...current.dateAdded, ...updates.dateAdded }
      : current.dateAdded,
    lastRead: updates.lastRead
      ? { ...current.lastRead, ...updates.lastRead }
      : current.lastRead,
  };
}

/**
 * Create search result metadata
 */
export function createSearchResultMeta(
  totalCount: number,
  filteredCount: number,
  filters: AdvancedSearchFilters
): SearchResultMeta {
  return {
    totalCount,
    filteredCount,
    activeFilterCount: countActiveFilters(filters),
  };
}

/**
 * Format result count for display
 */
export function formatResultCount(meta: SearchResultMeta): string {
  if (meta.activeFilterCount === 0) {
    return `${meta.totalCount}`;
  }
  return `${meta.filteredCount} / ${meta.totalCount}`;
}

/**
 * Check if result count should show "no results" message
 */
export function shouldShowNoResults(meta: SearchResultMeta): boolean {
  return meta.filteredCount === 0 && meta.activeFilterCount > 0;
}

/**
 * Create a search error
 */
export function createSearchError(
  type: SearchErrorType,
  message: string
): SearchError {
  return { type, message };
}

/**
 * Parse an API error into a SearchError
 */
export function parseSearchApiError(error: unknown): SearchError {
  if (error instanceof Error) {
    if (
      error.message.includes("timeout") ||
      error.message.includes("aborted")
    ) {
      return createSearchError(
        "timeout",
        "Search timed out. Please try again."
      );
    }
    if (error.message.includes("network") || error.message.includes("fetch")) {
      return createSearchError(
        "network",
        "Network error. Please check your connection."
      );
    }
    return createSearchError("unknown", error.message);
  }
  return createSearchError("unknown", "An unknown error occurred.");
}

/**
 * Generate filter chips from current filters
 */
export function generateFilterChips(
  filters: AdvancedSearchFilters,
  onRemoveFilter: (key: keyof AdvancedSearchFilters, value?: string) => void
): FilterChip[] {
  const chips: FilterChip[] = [];

  // Status chip
  if (filters.status !== "all") {
    chips.push({
      key: "status",
      labelKey: `library.filters.${filters.status}`,
      value: filters.status,
      onRemove: () => onRemoveFilter("status"),
    });
  }

  // Genre chips
  filters.genres.forEach((genre) => {
    chips.push({
      key: `genre-${genre}`,
      labelKey: `library.genres.${genre}`,
      value: genre,
      onRemove: () => onRemoveFilter("genres", genre),
    });
  });

  // Tag chips
  filters.tags.forEach((tag) => {
    chips.push({
      key: `tag-${tag}`,
      labelKey: "library.advancedSearch.tagChip",
      value: tag,
      onRemove: () => onRemoveFilter("tags", tag),
    });
  });

  // Progress chip
  if (!isDefaultProgressRange(filters.progress)) {
    chips.push({
      key: "progress",
      labelKey: "library.advancedSearch.progressChip",
      value: `${filters.progress.min}-${filters.progress.max}%`,
      onRemove: () => onRemoveFilter("progress"),
    });
  }

  // Type chips
  filters.types.forEach((type) => {
    chips.push({
      key: `type-${type}`,
      labelKey: `library.advancedSearch.types.${type}`,
      value: type,
      onRemove: () => onRemoveFilter("types", type),
    });
  });

  // Author chip
  if (filters.author.trim()) {
    chips.push({
      key: "author",
      labelKey: "library.advancedSearch.authorChip",
      value: filters.author,
      onRemove: () => onRemoveFilter("author"),
    });
  }

  // Date added chip
  if (hasDateRange(filters.dateAdded)) {
    chips.push({
      key: "dateAdded",
      labelKey: "library.advancedSearch.dateAddedChip",
      value: formatDateRangeShort(filters.dateAdded),
      onRemove: () => onRemoveFilter("dateAdded"),
    });
  }

  // Last read chip
  if (hasDateRange(filters.lastRead)) {
    chips.push({
      key: "lastRead",
      labelKey: "library.advancedSearch.lastReadChip",
      value: formatDateRangeShort(filters.lastRead),
      onRemove: () => onRemoveFilter("lastRead"),
    });
  }

  return chips;
}

/**
 * Format a date range for short display
 */
export function formatDateRangeShort(range: DateRange): string {
  const formatDate = (date: Date | null): string => {
    if (!date) return "";
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  if (range.start && range.end) {
    return `${formatDate(range.start)} - ${formatDate(range.end)}`;
  }
  if (range.start) {
    return `From ${formatDate(range.start)}`;
  }
  if (range.end) {
    return `Until ${formatDate(range.end)}`;
  }
  return "";
}

/**
 * Format a progress range for display
 */
export function formatProgressRange(range: ProgressRange): string {
  if (range.min === range.max) {
    return `${range.min}%`;
  }
  return `${range.min}% - ${range.max}%`;
}

/**
 * Validate progress range values
 */
export function validateProgressRange(range: ProgressRange): boolean {
  return (
    range.min >= 0 &&
    range.min <= 100 &&
    range.max >= 0 &&
    range.max <= 100 &&
    range.min <= range.max
  );
}

/**
 * Clamp progress range to valid values
 */
export function clampProgressRange(range: ProgressRange): ProgressRange {
  const clamp = (value: number): number => Math.max(0, Math.min(100, value));
  const min = clamp(range.min);
  const max = clamp(range.max);
  return {
    min: Math.min(min, max),
    max: Math.max(min, max),
  };
}

/**
 * Check if two filter states are equal
 */
export function areFiltersEqual(
  a: AdvancedSearchFilters,
  b: AdvancedSearchFilters
): boolean {
  return (
    a.query === b.query &&
    a.status === b.status &&
    arraysEqual(a.genres, b.genres) &&
    arraysEqual(a.tags, b.tags) &&
    a.progress.min === b.progress.min &&
    a.progress.max === b.progress.max &&
    datesEqual(a.dateAdded.start, b.dateAdded.start) &&
    datesEqual(a.dateAdded.end, b.dateAdded.end) &&
    datesEqual(a.lastRead.start, b.lastRead.start) &&
    datesEqual(a.lastRead.end, b.lastRead.end) &&
    arraysEqual(a.types, b.types) &&
    a.author === b.author
  );
}

/**
 * Helper: Check if two arrays are equal
 */
function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

/**
 * Helper: Check if two dates are equal (or both null)
 */
function datesEqual(a: Date | null, b: Date | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.getTime() === b.getTime();
}

/**
 * Apply all filters to a book
 */
export function matchesAllFilters(
  book: Book,
  filters: AdvancedSearchFilters
): boolean {
  // Search query
  if (!matchesSearchQuery(book, filters.query)) return false;

  // Status
  if (!matchesStatusFilter(book, filters.status)) return false;

  // Progress
  if (!matchesProgressFilter(book, filters.progress)) return false;

  // Date added
  if (!matchesDateAddedFilter(book, filters.dateAdded)) return false;

  // Note: Genres, tags, types, author, and lastRead would require
  // additional book properties not currently in the Book type.
  // These would be checked when the full Book type is available.

  return true;
}

/**
 * Filter a list of books using advanced filters
 */
export function filterBooks(
  books: Book[],
  filters: AdvancedSearchFilters
): Book[] {
  return books.filter((book) => matchesAllFilters(book, filters));
}

/**
 * Get the label key for a book type
 */
export function getBookTypeLabelKey(type: BookType): string {
  const option = BOOK_TYPE_OPTIONS.find((opt) => opt.value === type);
  return option?.labelKey ?? `library.advancedSearch.types.${type}`;
}

/**
 * Check if a string is a valid book type
 */
export function isValidBookType(value: string): value is BookType {
  return BOOK_TYPE_OPTIONS.some((opt) => opt.value === value);
}
