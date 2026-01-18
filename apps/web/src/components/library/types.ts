/**
 * Library component types
 */

import type { Book, BookListFilters } from "@/hooks/useBooks";

/**
 * View mode for library display
 */
export type LibraryViewMode = "grid" | "list";

/**
 * Sort options for library
 */
export type SortOption = NonNullable<BookListFilters["sort"]>;
export type SortOrder = NonNullable<BookListFilters["order"]>;

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
  sort: "createdAt",
  order: "desc",
  genres: [],
  tags: [],
};

/**
 * Sort option configuration
 */
export interface SortOptionConfig {
  value: SortOption;
  labelKey: string;
}

/**
 * Available sort options
 */
export const SORT_OPTIONS: SortOptionConfig[] = [
  { value: "createdAt", labelKey: "library.sort.dateAdded" },
  { value: "title", labelKey: "library.sort.title" },
  { value: "author", labelKey: "library.sort.author" },
  { value: "progress", labelKey: "library.sort.progress" },
];

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
