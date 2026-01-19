/**
 * Tests for library sort types and utilities
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import {
  // Constants
  SORT_PREFERENCES_KEY,
  DEFAULT_SORT_FIELD,
  DEFAULT_SORT_ORDER,
  SORT_OPTIONS,
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
  // Types
  type SortField,
  type SortOrder,
  type SortPreferences,
} from "./sortTypes";

// Create localStorage mock
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn(function (
    this: { store: Record<string, string> },
    key: string
  ) {
    return this.store[key] ?? null;
  }),
  setItem: vi.fn(function (
    this: { store: Record<string, string> },
    key: string,
    value: string
  ) {
    this.store[key] = value;
  }),
  removeItem: vi.fn(function (
    this: { store: Record<string, string> },
    key: string
  ) {
    delete this.store[key];
  }),
  clear: vi.fn(function (this: { store: Record<string, string> }) {
    this.store = {};
  }),
  get length() {
    return Object.keys(this.store).length;
  },
  key: vi.fn(function (this: { store: Record<string, string> }, index: number) {
    return Object.keys(this.store)[index] ?? null;
  }),
};

// Bind methods to maintain context
localStorageMock.getItem = localStorageMock.getItem.bind(localStorageMock);
localStorageMock.setItem = localStorageMock.setItem.bind(localStorageMock);
localStorageMock.removeItem =
  localStorageMock.removeItem.bind(localStorageMock);
localStorageMock.clear = localStorageMock.clear.bind(localStorageMock);
localStorageMock.key = localStorageMock.key.bind(localStorageMock);

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("sortTypes", () => {
  beforeEach(() => {
    localStorageMock.store = {};
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Constants Tests
  // ============================================================================

  describe("Constants", () => {
    it("should have a valid localStorage key", () => {
      expect(SORT_PREFERENCES_KEY).toBe("read-master-library-sort");
    });

    it("should have createdAt as default sort field", () => {
      expect(DEFAULT_SORT_FIELD).toBe("createdAt");
    });

    it("should have desc as default sort order", () => {
      expect(DEFAULT_SORT_ORDER).toBe("desc");
    });

    it("should have 6 sort options", () => {
      expect(SORT_OPTIONS).toHaveLength(6);
    });

    it("should have all expected sort fields", () => {
      const fields = SORT_OPTIONS.map((opt) => opt.value);
      expect(fields).toContain("title");
      expect(fields).toContain("author");
      expect(fields).toContain("createdAt");
      expect(fields).toContain("lastReadAt");
      expect(fields).toContain("progress");
      expect(fields).toContain("rating");
    });

    it("should have unique sort field values", () => {
      const values = SORT_OPTIONS.map((opt) => opt.value);
      expect(new Set(values).size).toBe(values.length);
    });

    it("should have valid label keys for all sort options", () => {
      for (const option of SORT_OPTIONS) {
        expect(option.labelKey).toMatch(/^library\.sort\./);
      }
    });

    it("should have valid default orders for all sort options", () => {
      for (const option of SORT_OPTIONS) {
        expect(["asc", "desc"]).toContain(option.defaultOrder);
      }
    });

    it("should have VALID_SORT_FIELDS as a Set with all sort fields", () => {
      expect(VALID_SORT_FIELDS).toBeInstanceOf(Set);
      expect(VALID_SORT_FIELDS.size).toBe(6);
      expect(VALID_SORT_FIELDS.has("title")).toBe(true);
      expect(VALID_SORT_FIELDS.has("author")).toBe(true);
      expect(VALID_SORT_FIELDS.has("createdAt")).toBe(true);
      expect(VALID_SORT_FIELDS.has("lastReadAt")).toBe(true);
      expect(VALID_SORT_FIELDS.has("progress")).toBe(true);
      expect(VALID_SORT_FIELDS.has("rating")).toBe(true);
    });

    it("should have VALID_SORT_ORDERS as a Set with asc and desc", () => {
      expect(VALID_SORT_ORDERS).toBeInstanceOf(Set);
      expect(VALID_SORT_ORDERS.size).toBe(2);
      expect(VALID_SORT_ORDERS.has("asc")).toBe(true);
      expect(VALID_SORT_ORDERS.has("desc")).toBe(true);
    });

    it("should have DEFAULT_SORT_PREFERENCES with correct values", () => {
      expect(DEFAULT_SORT_PREFERENCES).toEqual({
        field: "createdAt",
        order: "desc",
      });
    });
  });

  // ============================================================================
  // Validation Functions Tests
  // ============================================================================

  describe("isValidSortField", () => {
    it("should return true for valid sort fields", () => {
      expect(isValidSortField("title")).toBe(true);
      expect(isValidSortField("author")).toBe(true);
      expect(isValidSortField("createdAt")).toBe(true);
      expect(isValidSortField("lastReadAt")).toBe(true);
      expect(isValidSortField("progress")).toBe(true);
      expect(isValidSortField("rating")).toBe(true);
    });

    it("should return false for invalid sort fields", () => {
      expect(isValidSortField("invalid")).toBe(false);
      expect(isValidSortField("")).toBe(false);
      expect(isValidSortField("TITLE")).toBe(false);
      expect(isValidSortField("Title")).toBe(false);
    });

    it("should return false for non-string values", () => {
      expect(isValidSortField(null)).toBe(false);
      expect(isValidSortField(undefined)).toBe(false);
      expect(isValidSortField(123)).toBe(false);
      expect(isValidSortField({})).toBe(false);
      expect(isValidSortField([])).toBe(false);
    });
  });

  describe("isValidSortOrder", () => {
    it("should return true for asc", () => {
      expect(isValidSortOrder("asc")).toBe(true);
    });

    it("should return true for desc", () => {
      expect(isValidSortOrder("desc")).toBe(true);
    });

    it("should return false for invalid orders", () => {
      expect(isValidSortOrder("ASC")).toBe(false);
      expect(isValidSortOrder("DESC")).toBe(false);
      expect(isValidSortOrder("ascending")).toBe(false);
      expect(isValidSortOrder("descending")).toBe(false);
      expect(isValidSortOrder("")).toBe(false);
    });

    it("should return false for non-string values", () => {
      expect(isValidSortOrder(null)).toBe(false);
      expect(isValidSortOrder(undefined)).toBe(false);
      expect(isValidSortOrder(1)).toBe(false);
      expect(isValidSortOrder({})).toBe(false);
    });
  });

  describe("validateSortPreferences", () => {
    it("should return valid for correct preferences", () => {
      const result = validateSortPreferences({ field: "title", order: "asc" });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.sanitized).toEqual({ field: "title", order: "asc" });
    });

    it("should return valid for all field/order combinations", () => {
      const fields: SortField[] = [
        "title",
        "author",
        "createdAt",
        "lastReadAt",
        "progress",
        "rating",
      ];
      const orders: SortOrder[] = ["asc", "desc"];

      for (const field of fields) {
        for (const order of orders) {
          const result = validateSortPreferences({ field, order });
          expect(result.valid).toBe(true);
          expect(result.sanitized).toEqual({ field, order });
        }
      }
    });

    it("should return invalid for null preferences", () => {
      const result = validateSortPreferences(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Preferences are null or undefined");
      expect(result.sanitized).toEqual(DEFAULT_SORT_PREFERENCES);
    });

    it("should return invalid for undefined preferences", () => {
      const result = validateSortPreferences(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Preferences are null or undefined");
      expect(result.sanitized).toEqual(DEFAULT_SORT_PREFERENCES);
    });

    it("should return invalid for non-object preferences", () => {
      const result = validateSortPreferences("string");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Preferences must be an object");
      expect(result.sanitized).toEqual(DEFAULT_SORT_PREFERENCES);
    });

    it("should return invalid for invalid field", () => {
      const result = validateSortPreferences({
        field: "invalid",
        order: "asc",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid preferences: field");
      expect(result.sanitized.field).toBe(DEFAULT_SORT_FIELD);
      expect(result.sanitized.order).toBe("asc");
    });

    it("should return invalid for invalid order", () => {
      const result = validateSortPreferences({
        field: "title",
        order: "invalid",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid preferences: order");
      expect(result.sanitized.field).toBe("title");
      expect(result.sanitized.order).toBe(DEFAULT_SORT_ORDER);
    });

    it("should sanitize missing field with default", () => {
      const result = validateSortPreferences({ order: "asc" });
      expect(result.valid).toBe(false);
      expect(result.sanitized.field).toBe(DEFAULT_SORT_FIELD);
      expect(result.sanitized.order).toBe("asc");
    });

    it("should sanitize missing order with default", () => {
      const result = validateSortPreferences({ field: "title" });
      expect(result.valid).toBe(false);
      expect(result.sanitized.field).toBe("title");
      expect(result.sanitized.order).toBe(DEFAULT_SORT_ORDER);
    });
  });

  // ============================================================================
  // Persistence Functions Tests
  // ============================================================================

  describe("loadSortPreferences", () => {
    it("should return default preferences when localStorage is empty", () => {
      const result = loadSortPreferences();
      expect(result).toEqual(DEFAULT_SORT_PREFERENCES);
    });

    it("should load valid preferences from localStorage", () => {
      localStorageMock.setItem(
        SORT_PREFERENCES_KEY,
        JSON.stringify({ field: "title", order: "asc" })
      );

      const result = loadSortPreferences();
      expect(result).toEqual({ field: "title", order: "asc" });
    });

    it("should return default preferences for invalid JSON", () => {
      localStorageMock.setItem(SORT_PREFERENCES_KEY, "invalid json");

      const result = loadSortPreferences();
      expect(result).toEqual(DEFAULT_SORT_PREFERENCES);
    });

    it("should sanitize invalid preferences", () => {
      localStorageMock.setItem(
        SORT_PREFERENCES_KEY,
        JSON.stringify({ field: "invalid", order: "wrong" })
      );

      const result = loadSortPreferences();
      expect(result).toEqual(DEFAULT_SORT_PREFERENCES);
    });

    it("should sanitize partially valid preferences", () => {
      localStorageMock.setItem(
        SORT_PREFERENCES_KEY,
        JSON.stringify({ field: "rating", order: "invalid" })
      );

      const result = loadSortPreferences();
      expect(result.field).toBe("rating");
      expect(result.order).toBe(DEFAULT_SORT_ORDER);
    });
  });

  describe("saveSortPreferences", () => {
    it("should save valid preferences to localStorage", () => {
      const result = saveSortPreferences({ field: "author", order: "desc" });

      expect(result).toBe(true);
      // Verify by loading back
      const loaded = loadSortPreferences();
      expect(loaded).toEqual({ field: "author", order: "desc" });
    });

    it("should return false for invalid preferences", () => {
      const result = saveSortPreferences({
        field: "invalid" as SortField,
        order: "asc",
      });

      expect(result).toBe(false);
    });

    it("should save all valid field options", () => {
      const fields: SortField[] = [
        "title",
        "author",
        "createdAt",
        "lastReadAt",
        "progress",
        "rating",
      ];

      for (const field of fields) {
        const result = saveSortPreferences({ field, order: "asc" });
        expect(result).toBe(true);
      }
    });
  });

  describe("clearSortPreferences", () => {
    it("should remove preferences from localStorage", () => {
      // First save something
      saveSortPreferences({ field: "title", order: "asc" });
      // Verify it was saved
      expect(loadSortPreferences()).toEqual({ field: "title", order: "asc" });

      // Clear it
      const result = clearSortPreferences();

      expect(result).toBe(true);
      // Verify it returns defaults after clearing
      expect(loadSortPreferences()).toEqual(DEFAULT_SORT_PREFERENCES);
    });

    it("should return true even if key does not exist", () => {
      const result = clearSortPreferences();
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // Helper Functions Tests
  // ============================================================================

  describe("getSortOptionConfig", () => {
    it("should return config for valid field", () => {
      const config = getSortOptionConfig("title");
      expect(config).toBeDefined();
      expect(config?.value).toBe("title");
      expect(config?.labelKey).toBe("library.sort.title");
    });

    it("should return config for all valid fields", () => {
      const fields: SortField[] = [
        "title",
        "author",
        "createdAt",
        "lastReadAt",
        "progress",
        "rating",
      ];

      for (const field of fields) {
        const config = getSortOptionConfig(field);
        expect(config).toBeDefined();
        expect(config?.value).toBe(field);
      }
    });

    it("should return undefined for invalid field", () => {
      const config = getSortOptionConfig("invalid" as SortField);
      expect(config).toBeUndefined();
    });
  });

  describe("getDefaultOrderForField", () => {
    it("should return desc for createdAt", () => {
      expect(getDefaultOrderForField("createdAt")).toBe("desc");
    });

    it("should return desc for lastReadAt", () => {
      expect(getDefaultOrderForField("lastReadAt")).toBe("desc");
    });

    it("should return asc for title", () => {
      expect(getDefaultOrderForField("title")).toBe("asc");
    });

    it("should return asc for author", () => {
      expect(getDefaultOrderForField("author")).toBe("asc");
    });

    it("should return desc for progress", () => {
      expect(getDefaultOrderForField("progress")).toBe("desc");
    });

    it("should return desc for rating", () => {
      expect(getDefaultOrderForField("rating")).toBe("desc");
    });

    it("should return default order for invalid field", () => {
      expect(getDefaultOrderForField("invalid" as SortField)).toBe(
        DEFAULT_SORT_ORDER
      );
    });
  });

  describe("toggleSortOrder", () => {
    it("should toggle asc to desc", () => {
      expect(toggleSortOrder("asc")).toBe("desc");
    });

    it("should toggle desc to asc", () => {
      expect(toggleSortOrder("desc")).toBe("asc");
    });
  });

  describe("getSortOrderLabelKey", () => {
    it("should return ascending key for asc", () => {
      expect(getSortOrderLabelKey("asc")).toBe("library.sort.ascending");
    });

    it("should return descending key for desc", () => {
      expect(getSortOrderLabelKey("desc")).toBe("library.sort.descending");
    });
  });

  describe("createSortPreferences", () => {
    it("should create preferences with specified order", () => {
      const prefs = createSortPreferences("title", "desc");
      expect(prefs).toEqual({ field: "title", order: "desc" });
    });

    it("should create preferences with default order when not specified", () => {
      const prefs = createSortPreferences("title");
      expect(prefs).toEqual({ field: "title", order: "asc" }); // title defaults to asc
    });

    it("should use default order from config for each field", () => {
      expect(createSortPreferences("createdAt")).toEqual({
        field: "createdAt",
        order: "desc",
      });
      expect(createSortPreferences("lastReadAt")).toEqual({
        field: "lastReadAt",
        order: "desc",
      });
      expect(createSortPreferences("author")).toEqual({
        field: "author",
        order: "asc",
      });
    });
  });

  describe("sortPreferencesChanged", () => {
    it("should return false for identical preferences", () => {
      const current: SortPreferences = { field: "title", order: "asc" };
      const previous: SortPreferences = { field: "title", order: "asc" };
      expect(sortPreferencesChanged(current, previous)).toBe(false);
    });

    it("should return true when field changes", () => {
      const current: SortPreferences = { field: "author", order: "asc" };
      const previous: SortPreferences = { field: "title", order: "asc" };
      expect(sortPreferencesChanged(current, previous)).toBe(true);
    });

    it("should return true when order changes", () => {
      const current: SortPreferences = { field: "title", order: "desc" };
      const previous: SortPreferences = { field: "title", order: "asc" };
      expect(sortPreferencesChanged(current, previous)).toBe(true);
    });

    it("should return true when both change", () => {
      const current: SortPreferences = { field: "author", order: "desc" };
      const previous: SortPreferences = { field: "title", order: "asc" };
      expect(sortPreferencesChanged(current, previous)).toBe(true);
    });
  });

  describe("formatSortForApi", () => {
    it("should return object with sort and order", () => {
      const result = formatSortForApi("title", "asc");
      expect(result).toEqual({ sort: "title", order: "asc" });
    });

    it("should work for all field/order combinations", () => {
      const fields: SortField[] = [
        "title",
        "author",
        "createdAt",
        "lastReadAt",
        "progress",
        "rating",
      ];
      const orders: SortOrder[] = ["asc", "desc"];

      for (const field of fields) {
        for (const order of orders) {
          const result = formatSortForApi(field, order);
          expect(result.sort).toBe(field);
          expect(result.order).toBe(order);
        }
      }
    });
  });

  describe("parseSortFromSearchParams", () => {
    it("should parse valid sort params", () => {
      const params = new URLSearchParams("sort=title&order=asc");
      const result = parseSortFromSearchParams(params);
      expect(result).toEqual({ field: "title", order: "asc" });
    });

    it("should use defaults for missing params", () => {
      const params = new URLSearchParams();
      const result = parseSortFromSearchParams(params);
      expect(result).toEqual(DEFAULT_SORT_PREFERENCES);
    });

    it("should use default field for invalid sort param", () => {
      const params = new URLSearchParams("sort=invalid&order=asc");
      const result = parseSortFromSearchParams(params);
      expect(result.field).toBe(DEFAULT_SORT_FIELD);
      expect(result.order).toBe("asc");
    });

    it("should use default order for invalid order param", () => {
      const params = new URLSearchParams("sort=title&order=invalid");
      const result = parseSortFromSearchParams(params);
      expect(result.field).toBe("title");
      expect(result.order).toBe(DEFAULT_SORT_ORDER);
    });

    it("should parse all valid fields", () => {
      const fields: SortField[] = [
        "title",
        "author",
        "createdAt",
        "lastReadAt",
        "progress",
        "rating",
      ];

      for (const field of fields) {
        const params = new URLSearchParams(`sort=${field}&order=asc`);
        const result = parseSortFromSearchParams(params);
        expect(result.field).toBe(field);
      }
    });
  });

  describe("serializeSortToSearchParams", () => {
    it("should serialize preferences to URLSearchParams", () => {
      const prefs: SortPreferences = { field: "author", order: "desc" };
      const params = serializeSortToSearchParams(prefs);

      expect(params.get("sort")).toBe("author");
      expect(params.get("order")).toBe("desc");
    });

    it("should be reversible with parseSortFromSearchParams", () => {
      const original: SortPreferences = { field: "rating", order: "asc" };
      const params = serializeSortToSearchParams(original);
      const parsed = parseSortFromSearchParams(params);

      expect(parsed).toEqual(original);
    });
  });

  // ============================================================================
  // Sort Options Configuration Tests
  // ============================================================================

  describe("SORT_OPTIONS configuration", () => {
    it("should have dateAdded (createdAt) as first option", () => {
      expect(SORT_OPTIONS[0]?.value).toBe("createdAt");
    });

    it("should have lastReadAt option", () => {
      const option = SORT_OPTIONS.find((opt) => opt.value === "lastReadAt");
      expect(option).toBeDefined();
      expect(option?.labelKey).toBe("library.sort.lastRead");
      expect(option?.defaultOrder).toBe("desc");
    });

    it("should have rating option", () => {
      const option = SORT_OPTIONS.find((opt) => opt.value === "rating");
      expect(option).toBeDefined();
      expect(option?.labelKey).toBe("library.sort.rating");
      expect(option?.defaultOrder).toBe("desc");
    });

    it("should have description keys for all options", () => {
      for (const option of SORT_OPTIONS) {
        expect(option.descriptionKey).toBeDefined();
        expect(option.descriptionKey).toMatch(/^library\.sort\./);
      }
    });

    it("should have icon names for all options", () => {
      for (const option of SORT_OPTIONS) {
        expect(option.icon).toBeDefined();
        expect(typeof option.icon).toBe("string");
      }
    });
  });
});
