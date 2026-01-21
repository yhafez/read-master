/**
 * Library components module
 */

// Export types (has compatibility mappings for sort types)
export * from "./types";

// Export advanced search types
export * from "./advancedSearchTypes";

// Export sort types explicitly (avoiding conflicts with types.ts)
export {
  // Constants
  SORT_PREFERENCES_KEY,
  DEFAULT_SORT_FIELD,
  DEFAULT_SORT_ORDER,
  VALID_SORT_FIELDS,
  VALID_SORT_ORDERS,
  DEFAULT_SORT_PREFERENCES,
  // Validation functions
  isValidSortField,
  isValidSortOrder,
  validateSortPreferences,
  // Persistence functions
  loadSortPreferences,
  saveSortPreferences,
  clearSortPreferences,
  // Helper functions
  getSortOptionConfig,
  getDefaultOrderForField,
  toggleSortOrder,
  getSortOrderLabelKey,
  createSortPreferences,
  sortPreferencesChanged,
  formatSortForApi,
  parseSortFromSearchParams,
  serializeSortToSearchParams,
  // Types (exported as re-export from sortTypes)
  type SortField,
  type SortPreferences,
  type SortDropdownProps,
  type SortValidationResult,
} from "./sortTypes";
export {
  BookCard,
  getStatusColor,
  getStatusKey,
  type BookCardProps,
} from "./BookCard";
export { LibraryGrid, type LibraryGridProps } from "./LibraryGrid";
export { LibraryToolbar, type LibraryToolbarProps } from "./LibraryToolbar";
export {
  LibraryFilterPanel,
  type LibraryFilterPanelProps,
} from "./LibraryFilterPanel";
export {
  AdvancedBookSearch,
  type AdvancedBookSearchProps,
} from "./AdvancedBookSearch";
export { AddBookModal, type AddBookModalProps } from "./addBook";
export {
  ActiveFilterChips,
  type ActiveFilterChipsProps,
} from "./ActiveFilterChips";
