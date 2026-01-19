/**
 * Library sort types and utilities
 *
 * Provides comprehensive sort functionality for the library including:
 * - Sort options (title, author, dateAdded, lastRead, progress, rating)
 * - Sort order (asc/desc)
 * - Persistence to localStorage
 * - Validation utilities
 */

// ============================================================================
// Constants
// ============================================================================

/** localStorage key for sort preferences */
export const SORT_PREFERENCES_KEY = "read-master-library-sort";

/** Default sort field */
export const DEFAULT_SORT_FIELD = "createdAt" as const;

/** Default sort order */
export const DEFAULT_SORT_ORDER = "desc" as const;

// ============================================================================
// Types
// ============================================================================

/**
 * All available sort fields for the library
 */
export type SortField =
  | "title"
  | "author"
  | "createdAt"
  | "lastReadAt"
  | "progress"
  | "rating";

/**
 * Sort order direction
 */
export type SortOrder = "asc" | "desc";

/**
 * Configuration for a single sort option
 */
export interface SortOptionConfig {
  /** The field value to sort by */
  value: SortField;
  /** i18n key for the display label */
  labelKey: string;
  /** i18n key for description (used in tooltips) */
  descriptionKey?: string;
  /** Default order when this sort is first selected */
  defaultOrder: SortOrder;
  /** Icon name (optional, for UI enhancement) */
  icon?: string;
}

/**
 * User's current sort preferences
 */
export interface SortPreferences {
  /** Current sort field */
  field: SortField;
  /** Current sort order */
  order: SortOrder;
}

/**
 * Sort dropdown component props
 */
export interface SortDropdownProps {
  /** Current sort field */
  sortBy: SortField;
  /** Current sort order */
  sortOrder: SortOrder;
  /** Callback when sort changes */
  onSortChange: (field: SortField, order: SortOrder) => void;
  /** Whether to show compact version (icon only on mobile) */
  compact?: boolean;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Validation result for sort preferences
 */
export interface SortValidationResult {
  /** Whether the preferences are valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Sanitized preferences (defaults applied if invalid) */
  sanitized: SortPreferences;
}

// ============================================================================
// Sort Options Configuration
// ============================================================================

/**
 * All available sort options with their configurations
 */
export const SORT_OPTIONS: SortOptionConfig[] = [
  {
    value: "createdAt",
    labelKey: "library.sort.dateAdded",
    descriptionKey: "library.sort.dateAddedDesc",
    defaultOrder: "desc",
    icon: "calendar",
  },
  {
    value: "lastReadAt",
    labelKey: "library.sort.lastRead",
    descriptionKey: "library.sort.lastReadDesc",
    defaultOrder: "desc",
    icon: "clock",
  },
  {
    value: "title",
    labelKey: "library.sort.title",
    descriptionKey: "library.sort.titleDesc",
    defaultOrder: "asc",
    icon: "text",
  },
  {
    value: "author",
    labelKey: "library.sort.author",
    descriptionKey: "library.sort.authorDesc",
    defaultOrder: "asc",
    icon: "person",
  },
  {
    value: "progress",
    labelKey: "library.sort.progress",
    descriptionKey: "library.sort.progressDesc",
    defaultOrder: "desc",
    icon: "progress",
  },
  {
    value: "rating",
    labelKey: "library.sort.rating",
    descriptionKey: "library.sort.ratingDesc",
    defaultOrder: "desc",
    icon: "star",
  },
];

/**
 * Valid sort fields as a set for quick validation
 */
export const VALID_SORT_FIELDS: Set<string> = new Set(
  SORT_OPTIONS.map((opt) => opt.value)
);

/**
 * Valid sort orders
 */
export const VALID_SORT_ORDERS: Set<string> = new Set(["asc", "desc"]);

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default sort preferences
 */
export const DEFAULT_SORT_PREFERENCES: SortPreferences = {
  field: DEFAULT_SORT_FIELD,
  order: DEFAULT_SORT_ORDER,
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if a value is a valid sort field
 */
export function isValidSortField(value: unknown): value is SortField {
  return typeof value === "string" && VALID_SORT_FIELDS.has(value);
}

/**
 * Check if a value is a valid sort order
 */
export function isValidSortOrder(value: unknown): value is SortOrder {
  return typeof value === "string" && VALID_SORT_ORDERS.has(value);
}

/**
 * Validate sort preferences and return sanitized result
 */
export function validateSortPreferences(prefs: unknown): SortValidationResult {
  // Handle null/undefined
  if (prefs == null) {
    return {
      valid: false,
      error: "Preferences are null or undefined",
      sanitized: { ...DEFAULT_SORT_PREFERENCES },
    };
  }

  // Handle non-object
  if (typeof prefs !== "object") {
    return {
      valid: false,
      error: "Preferences must be an object",
      sanitized: { ...DEFAULT_SORT_PREFERENCES },
    };
  }

  const obj = prefs as Record<string, unknown>;

  // Validate field
  const fieldValid = isValidSortField(obj.field);
  const field = fieldValid ? (obj.field as SortField) : DEFAULT_SORT_FIELD;

  // Validate order
  const orderValid = isValidSortOrder(obj.order);
  const order = orderValid ? (obj.order as SortOrder) : DEFAULT_SORT_ORDER;

  const valid = fieldValid && orderValid;

  if (valid) {
    return {
      valid: true,
      sanitized: { field, order },
    };
  }

  return {
    valid: false,
    error: `Invalid preferences: ${!fieldValid ? "field" : "order"}`,
    sanitized: { field, order },
  };
}

// ============================================================================
// Persistence Functions
// ============================================================================

/**
 * Load sort preferences from localStorage
 */
export function loadSortPreferences(): SortPreferences {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return { ...DEFAULT_SORT_PREFERENCES };
    }

    const stored = localStorage.getItem(SORT_PREFERENCES_KEY);
    if (!stored) {
      return { ...DEFAULT_SORT_PREFERENCES };
    }

    const parsed = JSON.parse(stored);
    const validation = validateSortPreferences(parsed);
    return validation.sanitized;
  } catch {
    // JSON parse error or other issues
    return { ...DEFAULT_SORT_PREFERENCES };
  }
}

/**
 * Save sort preferences to localStorage
 */
export function saveSortPreferences(prefs: SortPreferences): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }

    // Validate before saving
    const validation = validateSortPreferences(prefs);
    if (!validation.valid) {
      return false;
    }

    localStorage.setItem(SORT_PREFERENCES_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear sort preferences from localStorage
 */
export function clearSortPreferences(): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }

    localStorage.removeItem(SORT_PREFERENCES_KEY);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the configuration for a specific sort field
 */
export function getSortOptionConfig(
  field: SortField
): SortOptionConfig | undefined {
  return SORT_OPTIONS.find((opt) => opt.value === field);
}

/**
 * Get the default order for a sort field
 */
export function getDefaultOrderForField(field: SortField): SortOrder {
  const config = getSortOptionConfig(field);
  return config?.defaultOrder ?? DEFAULT_SORT_ORDER;
}

/**
 * Toggle sort order (asc -> desc, desc -> asc)
 */
export function toggleSortOrder(order: SortOrder): SortOrder {
  return order === "asc" ? "desc" : "asc";
}

/**
 * Get display label key for sort order
 */
export function getSortOrderLabelKey(order: SortOrder): string {
  return order === "asc" ? "library.sort.ascending" : "library.sort.descending";
}

/**
 * Create sort preferences object
 */
export function createSortPreferences(
  field: SortField,
  order?: SortOrder
): SortPreferences {
  return {
    field,
    order: order ?? getDefaultOrderForField(field),
  };
}

/**
 * Check if preferences have changed
 */
export function sortPreferencesChanged(
  current: SortPreferences,
  previous: SortPreferences
): boolean {
  return current.field !== previous.field || current.order !== previous.order;
}

/**
 * Format sort for API query (e.g., "title:asc" or just "title")
 */
export function formatSortForApi(
  field: SortField,
  order: SortOrder
): { sort: SortField; order: SortOrder } {
  return { sort: field, order };
}

/**
 * Parse sort from URL search params
 */
export function parseSortFromSearchParams(
  params: URLSearchParams
): SortPreferences {
  const sortParam = params.get("sort");
  const orderParam = params.get("order");

  const field = isValidSortField(sortParam) ? sortParam : DEFAULT_SORT_FIELD;
  const order = isValidSortOrder(orderParam) ? orderParam : DEFAULT_SORT_ORDER;

  return { field, order };
}

/**
 * Serialize sort preferences to URL search params
 */
export function serializeSortToSearchParams(
  prefs: SortPreferences
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("sort", prefs.field);
  params.set("order", prefs.order);
  return params;
}
