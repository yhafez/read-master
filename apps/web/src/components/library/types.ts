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
 * Library filter state
 */
export interface LibraryFilters {
  status: StatusFilter;
  search: string;
  sort: SortOption;
  order: SortOrder;
  genres: string[];
  tags: string[];
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
