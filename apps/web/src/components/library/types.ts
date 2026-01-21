/**
 * Library component types
 */

import type { Book } from "@/hooks/useBooks";

import type { SortField, SortOrder } from "./sortTypes";
import {
  SORT_OPTIONS as EXTENDED_SORT_OPTIONS,
  DEFAULT_SORT_FIELD,
  DEFAULT_SORT_ORDER,
} from "./sortTypes";

/**
 * View mode for library display
 */
export type LibraryViewMode = "grid" | "list";

/**
 * Sort options for library (re-export from sortTypes for compatibility)
 */
export type SortOption = SortField;
export type { SortOrder } from "./sortTypes";

/**
 * Book status filter options
 */
export type StatusFilter = "all" | Book["status"];

/**
 * Progress percentage filter options (simple categories)
 */
export type ProgressRangeFilter =
  | "all"
  | "0-25"
  | "26-50"
  | "51-75"
  | "76-99"
  | "100";

/**
 * File type filter options (matching database)
 */
export type FileTypeFilter =
  | "all"
  | "PDF"
  | "EPUB"
  | "DOC"
  | "DOCX"
  | "TXT"
  | "HTML";

/**
 * Source filter options (matching database)
 */
export type SourceFilter =
  | "all"
  | "UPLOAD"
  | "URL"
  | "PASTE"
  | "GOOGLE_BOOKS"
  | "OPEN_LIBRARY";

/**
 * Date range filter
 */
export interface DateRangeFilter {
  from: Date | null;
  to: Date | null;
}

/**
 * Library filter state
 */
export interface LibraryFilters {
  status: StatusFilter;
  search: string;
  sort: SortOption;
  order: SortOrder;
  genres: string[];
  tags: string[];
  progress: ProgressRangeFilter;
  fileType: FileTypeFilter;
  source: SourceFilter;
  dateAdded: DateRangeFilter;
  dateStarted: DateRangeFilter;
  dateCompleted: DateRangeFilter;
}

/**
 * Default library filters
 */
export const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  status: "all",
  search: "",
  sort: DEFAULT_SORT_FIELD,
  order: DEFAULT_SORT_ORDER,
  genres: [],
  tags: [],
  progress: "all",
  fileType: "all",
  source: "all",
  dateAdded: { from: null, to: null },
  dateStarted: { from: null, to: null },
  dateCompleted: { from: null, to: null },
};

/**
 * Sort option configuration (simplified for backward compatibility)
 */
export interface SortOptionConfig {
  value: SortOption;
  labelKey: string;
}

/**
 * Available sort options (mapped from extended options for compatibility)
 */
export const SORT_OPTIONS: SortOptionConfig[] = EXTENDED_SORT_OPTIONS.map(
  (opt) => ({
    value: opt.value,
    labelKey: opt.labelKey,
  })
);

/**
 * Status filter configuration
 */
export interface StatusFilterConfig {
  value: StatusFilter;
  labelKey: string;
}

/**
 * Available status filters
 */
export const STATUS_FILTERS: StatusFilterConfig[] = [
  { value: "all", labelKey: "library.filters.all" },
  { value: "reading", labelKey: "library.filters.reading" },
  { value: "completed", labelKey: "library.filters.completed" },
  { value: "not_started", labelKey: "library.filters.wantToRead" },
  { value: "abandoned", labelKey: "library.filters.abandoned" },
];

/**
 * Progress percentage filter configuration
 */
export interface ProgressRangeConfig {
  value: ProgressRangeFilter;
  labelKey: string;
}

export const PROGRESS_FILTERS: ProgressRangeConfig[] = [
  { value: "all", labelKey: "library.filters.progress.all" },
  { value: "0-25", labelKey: "library.filters.progress.0-25" },
  { value: "26-50", labelKey: "library.filters.progress.26-50" },
  { value: "51-75", labelKey: "library.filters.progress.51-75" },
  { value: "76-99", labelKey: "library.filters.progress.76-99" },
  { value: "100", labelKey: "library.filters.progress.100" },
];

/**
 * File type filter configuration
 */
export interface FileTypeConfig {
  value: FileTypeFilter;
  labelKey: string;
}

export const FILE_TYPE_FILTERS: FileTypeConfig[] = [
  { value: "all", labelKey: "library.filters.fileType.all" },
  { value: "EPUB", labelKey: "library.filters.fileType.epub" },
  { value: "PDF", labelKey: "library.filters.fileType.pdf" },
  { value: "DOC", labelKey: "library.filters.fileType.doc" },
  { value: "DOCX", labelKey: "library.filters.fileType.docx" },
  { value: "TXT", labelKey: "library.filters.fileType.txt" },
  { value: "HTML", labelKey: "library.filters.fileType.html" },
];

/**
 * Source filter configuration
 */
export interface SourceFilterConfig {
  value: SourceFilter;
  labelKey: string;
}

export const SOURCE_FILTERS: SourceFilterConfig[] = [
  { value: "all", labelKey: "library.filters.source.all" },
  { value: "UPLOAD", labelKey: "library.filters.source.upload" },
  { value: "URL", labelKey: "library.filters.source.url" },
  { value: "PASTE", labelKey: "library.filters.source.paste" },
  { value: "GOOGLE_BOOKS", labelKey: "library.filters.source.googleBooks" },
  { value: "OPEN_LIBRARY", labelKey: "library.filters.source.openLibrary" },
];
