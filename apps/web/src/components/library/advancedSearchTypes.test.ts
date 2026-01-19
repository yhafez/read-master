/**
 * Tests for advanced book search types and utilities
 */

import { describe, it, expect } from "vitest";
import type { Book } from "@/hooks/useBooks";
import {
  // Types
  type AdvancedSearchFilters,
  type ProgressRange,
  type DateRange,
  type BookType,
  type SearchResultMeta,
  type SearchError,
  // Constants
  BOOK_TYPE_OPTIONS,
  PROGRESS_PRESETS,
  DATE_PRESETS,
  FILTER_SECTIONS,
  MIN_SEARCH_LENGTH,
  SEARCH_DEBOUNCE_MS,
  DEFAULT_ADVANCED_FILTERS,
  // Functions
  createDefaultFilters,
  isValidSearchQuery,
  normalizeSearchQuery,
  isDefaultProgressRange,
  hasDateRange,
  areFiltersDefault,
  countActiveFilters,
  matchesSearchQuery,
  matchesStatusFilter,
  matchesProgressFilter,
  isDateInRange,
  matchesDateAddedFilter,
  mergeFilters,
  createSearchResultMeta,
  formatResultCount,
  shouldShowNoResults,
  createSearchError,
  parseSearchApiError,
  generateFilterChips,
  formatDateRangeShort,
  formatProgressRange,
  validateProgressRange,
  clampProgressRange,
  areFiltersEqual,
  matchesAllFilters,
  filterBooks,
  getBookTypeLabelKey,
  isValidBookType,
} from "./advancedSearchTypes";

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    title: "Test Book",
    author: "Test Author",
    status: "reading",
    progress: 50,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-20T10:00:00Z",
    ...overrides,
  };
}

function createMockFilters(
  overrides: Partial<AdvancedSearchFilters> = {}
): AdvancedSearchFilters {
  return {
    ...createDefaultFilters(),
    ...overrides,
  };
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

describe("Type exports", () => {
  it("exports AdvancedSearchFilters type", () => {
    const filters: AdvancedSearchFilters = createDefaultFilters();
    expect(filters).toHaveProperty("query");
    expect(filters).toHaveProperty("status");
    expect(filters).toHaveProperty("genres");
    expect(filters).toHaveProperty("tags");
    expect(filters).toHaveProperty("progress");
    expect(filters).toHaveProperty("dateAdded");
    expect(filters).toHaveProperty("lastRead");
    expect(filters).toHaveProperty("types");
    expect(filters).toHaveProperty("author");
  });

  it("exports ProgressRange type", () => {
    const range: ProgressRange = { min: 0, max: 100 };
    expect(range.min).toBe(0);
    expect(range.max).toBe(100);
  });

  it("exports DateRange type", () => {
    const range: DateRange = { start: null, end: null };
    expect(range.start).toBeNull();
    expect(range.end).toBeNull();
  });

  it("exports BookType type", () => {
    const types: BookType[] = ["epub", "pdf", "doc", "text", "url"];
    expect(types).toHaveLength(5);
  });

  it("exports SearchResultMeta type", () => {
    const meta: SearchResultMeta = {
      totalCount: 100,
      filteredCount: 50,
      activeFilterCount: 3,
    };
    expect(meta.totalCount).toBe(100);
  });

  it("exports SearchError type", () => {
    const error: SearchError = {
      type: "network",
      message: "Network error",
    };
    expect(error.type).toBe("network");
  });
});

// =============================================================================
// CONSTANTS
// =============================================================================

describe("Constants", () => {
  describe("BOOK_TYPE_OPTIONS", () => {
    it("contains all book types", () => {
      expect(BOOK_TYPE_OPTIONS).toHaveLength(5);
      expect(BOOK_TYPE_OPTIONS.map((o) => o.value)).toEqual([
        "epub",
        "pdf",
        "doc",
        "text",
        "url",
      ]);
    });

    it("has labelKey for each option", () => {
      BOOK_TYPE_OPTIONS.forEach((option) => {
        expect(option.labelKey).toBeTruthy();
        expect(option.labelKey).toContain("library.advancedSearch.types");
      });
    });
  });

  describe("PROGRESS_PRESETS", () => {
    it("has presets for common progress ranges", () => {
      expect(PROGRESS_PRESETS.length).toBeGreaterThan(0);
      PROGRESS_PRESETS.forEach((preset) => {
        expect(preset.labelKey).toBeTruthy();
        expect(preset.range).toHaveProperty("min");
        expect(preset.range).toHaveProperty("max");
      });
    });

    it("includes not started preset", () => {
      const notStarted = PROGRESS_PRESETS.find(
        (p) => p.range.min === 0 && p.range.max === 0
      );
      expect(notStarted).toBeDefined();
    });

    it("includes completed preset", () => {
      const completed = PROGRESS_PRESETS.find(
        (p) => p.range.min === 100 && p.range.max === 100
      );
      expect(completed).toBeDefined();
    });
  });

  describe("DATE_PRESETS", () => {
    it("has presets for common date ranges", () => {
      expect(DATE_PRESETS.length).toBeGreaterThan(0);
      DATE_PRESETS.forEach((preset) => {
        expect(preset.labelKey).toBeTruthy();
        expect(typeof preset.getDates).toBe("function");
      });
    });

    it("getDates returns valid DateRange", () => {
      DATE_PRESETS.forEach((preset) => {
        const range = preset.getDates();
        expect(range).toHaveProperty("start");
        expect(range).toHaveProperty("end");
      });
    });

    it("today preset returns today's date range", () => {
      const todayPreset = DATE_PRESETS[0]; // First preset is today
      if (todayPreset) {
        const range = todayPreset.getDates();
        expect(range.start).not.toBeNull();
        expect(range.end).not.toBeNull();
      }
    });
  });

  describe("FILTER_SECTIONS", () => {
    it("has filter section configurations", () => {
      expect(FILTER_SECTIONS.length).toBeGreaterThan(0);
      FILTER_SECTIONS.forEach((section) => {
        expect(section.id).toBeTruthy();
        expect(section.labelKey).toBeTruthy();
        expect(section.icon).toBeTruthy();
        expect(typeof section.expanded).toBe("boolean");
      });
    });
  });

  describe("Search constants", () => {
    it("MIN_SEARCH_LENGTH is defined", () => {
      expect(MIN_SEARCH_LENGTH).toBe(2);
    });

    it("SEARCH_DEBOUNCE_MS is defined", () => {
      expect(SEARCH_DEBOUNCE_MS).toBe(300);
    });
  });

  describe("DEFAULT_ADVANCED_FILTERS", () => {
    it("has all filter properties", () => {
      expect(DEFAULT_ADVANCED_FILTERS.query).toBe("");
      expect(DEFAULT_ADVANCED_FILTERS.status).toBe("all");
      expect(DEFAULT_ADVANCED_FILTERS.genres).toEqual([]);
      expect(DEFAULT_ADVANCED_FILTERS.tags).toEqual([]);
      expect(DEFAULT_ADVANCED_FILTERS.progress).toEqual({ min: 0, max: 100 });
      expect(DEFAULT_ADVANCED_FILTERS.dateAdded).toEqual({
        start: null,
        end: null,
      });
      expect(DEFAULT_ADVANCED_FILTERS.lastRead).toEqual({
        start: null,
        end: null,
      });
      expect(DEFAULT_ADVANCED_FILTERS.types).toEqual([]);
      expect(DEFAULT_ADVANCED_FILTERS.author).toBe("");
    });
  });
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

describe("createDefaultFilters", () => {
  it("creates a copy of default filters", () => {
    const filters = createDefaultFilters();
    expect(filters).toEqual(DEFAULT_ADVANCED_FILTERS);
    expect(filters).not.toBe(DEFAULT_ADVANCED_FILTERS);
  });
});

describe("isValidSearchQuery", () => {
  it("returns true for empty query", () => {
    expect(isValidSearchQuery("")).toBe(true);
    expect(isValidSearchQuery("   ")).toBe(true);
  });

  it("returns true for query >= MIN_SEARCH_LENGTH", () => {
    expect(isValidSearchQuery("ab")).toBe(true);
    expect(isValidSearchQuery("abc")).toBe(true);
    expect(isValidSearchQuery("test query")).toBe(true);
  });

  it("returns false for query < MIN_SEARCH_LENGTH (non-empty)", () => {
    expect(isValidSearchQuery("a")).toBe(false);
    expect(isValidSearchQuery(" a ")).toBe(false);
  });
});

describe("normalizeSearchQuery", () => {
  it("trims whitespace", () => {
    expect(normalizeSearchQuery("  test  ")).toBe("test");
  });

  it("converts to lowercase", () => {
    expect(normalizeSearchQuery("TEST")).toBe("test");
    expect(normalizeSearchQuery("TeSt QuErY")).toBe("test query");
  });
});

describe("isDefaultProgressRange", () => {
  it("returns true for 0-100 range", () => {
    expect(isDefaultProgressRange({ min: 0, max: 100 })).toBe(true);
  });

  it("returns false for non-default ranges", () => {
    expect(isDefaultProgressRange({ min: 0, max: 50 })).toBe(false);
    expect(isDefaultProgressRange({ min: 25, max: 100 })).toBe(false);
    expect(isDefaultProgressRange({ min: 50, max: 75 })).toBe(false);
  });
});

describe("hasDateRange", () => {
  it("returns false for null dates", () => {
    expect(hasDateRange({ start: null, end: null })).toBe(false);
  });

  it("returns true if start is set", () => {
    expect(hasDateRange({ start: new Date(), end: null })).toBe(true);
  });

  it("returns true if end is set", () => {
    expect(hasDateRange({ start: null, end: new Date() })).toBe(true);
  });

  it("returns true if both are set", () => {
    expect(hasDateRange({ start: new Date(), end: new Date() })).toBe(true);
  });
});

describe("areFiltersDefault", () => {
  it("returns true for default filters", () => {
    expect(areFiltersDefault(createDefaultFilters())).toBe(true);
  });

  it("returns false if query is set", () => {
    expect(areFiltersDefault(createMockFilters({ query: "test" }))).toBe(false);
  });

  it("returns false if status is not all", () => {
    expect(areFiltersDefault(createMockFilters({ status: "reading" }))).toBe(
      false
    );
  });

  it("returns false if genres are set", () => {
    expect(areFiltersDefault(createMockFilters({ genres: ["fiction"] }))).toBe(
      false
    );
  });

  it("returns false if tags are set", () => {
    expect(areFiltersDefault(createMockFilters({ tags: ["favorite"] }))).toBe(
      false
    );
  });

  it("returns false if progress range is not default", () => {
    expect(
      areFiltersDefault(createMockFilters({ progress: { min: 50, max: 100 } }))
    ).toBe(false);
  });

  it("returns false if types are set", () => {
    expect(areFiltersDefault(createMockFilters({ types: ["epub"] }))).toBe(
      false
    );
  });
});

describe("countActiveFilters", () => {
  it("returns 0 for default filters", () => {
    expect(countActiveFilters(createDefaultFilters())).toBe(0);
  });

  it("counts query as 1 filter", () => {
    expect(countActiveFilters(createMockFilters({ query: "test" }))).toBe(1);
  });

  it("counts status as 1 filter", () => {
    expect(countActiveFilters(createMockFilters({ status: "reading" }))).toBe(
      1
    );
  });

  it("counts each genre individually", () => {
    expect(
      countActiveFilters(createMockFilters({ genres: ["fiction", "mystery"] }))
    ).toBe(2);
  });

  it("counts each tag individually", () => {
    expect(
      countActiveFilters(createMockFilters({ tags: ["favorite", "to-read"] }))
    ).toBe(2);
  });

  it("counts non-default progress as 1", () => {
    expect(
      countActiveFilters(createMockFilters({ progress: { min: 0, max: 50 } }))
    ).toBe(1);
  });

  it("counts date ranges", () => {
    expect(
      countActiveFilters(
        createMockFilters({ dateAdded: { start: new Date(), end: null } })
      )
    ).toBe(1);
  });

  it("counts multiple filters correctly", () => {
    const filters = createMockFilters({
      query: "test",
      status: "reading",
      genres: ["fiction"],
      author: "Author",
    });
    expect(countActiveFilters(filters)).toBe(4);
  });
});

describe("matchesSearchQuery", () => {
  const book = createMockBook({
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
  });

  it("returns true for empty query", () => {
    expect(matchesSearchQuery(book, "")).toBe(true);
    expect(matchesSearchQuery(book, "   ")).toBe(true);
  });

  it("matches title", () => {
    expect(matchesSearchQuery(book, "gatsby")).toBe(true);
    expect(matchesSearchQuery(book, "GREAT")).toBe(true);
    expect(matchesSearchQuery(book, "the great")).toBe(true);
  });

  it("matches author", () => {
    expect(matchesSearchQuery(book, "fitzgerald")).toBe(true);
    expect(matchesSearchQuery(book, "scott")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(matchesSearchQuery(book, "GATSBY")).toBe(true);
    expect(matchesSearchQuery(book, "GaTsBy")).toBe(true);
  });

  it("returns false for non-matching query", () => {
    expect(matchesSearchQuery(book, "hemingway")).toBe(false);
    expect(matchesSearchQuery(book, "moby dick")).toBe(false);
  });
});

describe("matchesStatusFilter", () => {
  const book = createMockBook({ status: "reading" });

  it("returns true for 'all' status", () => {
    expect(matchesStatusFilter(book, "all")).toBe(true);
  });

  it("returns true for matching status", () => {
    expect(matchesStatusFilter(book, "reading")).toBe(true);
  });

  it("returns false for non-matching status", () => {
    expect(matchesStatusFilter(book, "completed")).toBe(false);
    expect(matchesStatusFilter(book, "not_started")).toBe(false);
  });
});

describe("matchesProgressFilter", () => {
  const book = createMockBook({ progress: 50 });

  it("matches when progress is within range", () => {
    expect(matchesProgressFilter(book, { min: 0, max: 100 })).toBe(true);
    expect(matchesProgressFilter(book, { min: 25, max: 75 })).toBe(true);
    expect(matchesProgressFilter(book, { min: 50, max: 50 })).toBe(true);
  });

  it("does not match when progress is outside range", () => {
    expect(matchesProgressFilter(book, { min: 0, max: 25 })).toBe(false);
    expect(matchesProgressFilter(book, { min: 75, max: 100 })).toBe(false);
  });

  it("handles boundary values", () => {
    expect(matchesProgressFilter(book, { min: 50, max: 100 })).toBe(true);
    expect(matchesProgressFilter(book, { min: 0, max: 50 })).toBe(true);
  });
});

describe("isDateInRange", () => {
  const testDate = new Date("2024-06-15");

  it("returns true for empty range", () => {
    expect(isDateInRange(testDate, { start: null, end: null })).toBe(true);
  });

  it("checks start date", () => {
    expect(
      isDateInRange(testDate, { start: new Date("2024-01-01"), end: null })
    ).toBe(true);
    expect(
      isDateInRange(testDate, { start: new Date("2024-12-01"), end: null })
    ).toBe(false);
  });

  it("checks end date", () => {
    expect(
      isDateInRange(testDate, { start: null, end: new Date("2024-12-31") })
    ).toBe(true);
    expect(
      isDateInRange(testDate, { start: null, end: new Date("2024-01-01") })
    ).toBe(false);
  });

  it("checks full range", () => {
    expect(
      isDateInRange(testDate, {
        start: new Date("2024-01-01"),
        end: new Date("2024-12-31"),
      })
    ).toBe(true);
    expect(
      isDateInRange(testDate, {
        start: new Date("2024-01-01"),
        end: new Date("2024-03-01"),
      })
    ).toBe(false);
  });

  it("handles string dates", () => {
    expect(
      isDateInRange("2024-06-15", { start: new Date("2024-01-01"), end: null })
    ).toBe(true);
  });
});

describe("matchesDateAddedFilter", () => {
  const book = createMockBook({ createdAt: "2024-06-15T10:00:00Z" });

  it("returns true for empty range", () => {
    expect(matchesDateAddedFilter(book, { start: null, end: null })).toBe(true);
  });

  it("returns true when within range", () => {
    expect(
      matchesDateAddedFilter(book, {
        start: new Date("2024-01-01"),
        end: new Date("2024-12-31"),
      })
    ).toBe(true);
  });

  it("returns false when outside range", () => {
    expect(
      matchesDateAddedFilter(book, {
        start: new Date("2024-01-01"),
        end: new Date("2024-03-01"),
      })
    ).toBe(false);
  });
});

describe("mergeFilters", () => {
  it("merges partial updates", () => {
    const current = createDefaultFilters();
    const merged = mergeFilters(current, { query: "test", status: "reading" });
    expect(merged.query).toBe("test");
    expect(merged.status).toBe("reading");
    expect(merged.genres).toEqual([]);
  });

  it("merges nested progress object", () => {
    const current = createDefaultFilters();
    const merged = mergeFilters(current, { progress: { min: 25, max: 75 } });
    expect(merged.progress).toEqual({ min: 25, max: 75 });
  });

  it("preserves unupdated values", () => {
    const current = createMockFilters({ query: "original", status: "reading" });
    const merged = mergeFilters(current, { status: "completed" });
    expect(merged.query).toBe("original");
    expect(merged.status).toBe("completed");
  });
});

describe("createSearchResultMeta", () => {
  it("creates result metadata", () => {
    const filters = createMockFilters({ query: "test", status: "reading" });
    const meta = createSearchResultMeta(100, 25, filters);
    expect(meta.totalCount).toBe(100);
    expect(meta.filteredCount).toBe(25);
    expect(meta.activeFilterCount).toBe(2);
  });
});

describe("formatResultCount", () => {
  it("shows only total when no filters", () => {
    const meta: SearchResultMeta = {
      totalCount: 100,
      filteredCount: 100,
      activeFilterCount: 0,
    };
    expect(formatResultCount(meta)).toBe("100");
  });

  it("shows filtered/total when filters active", () => {
    const meta: SearchResultMeta = {
      totalCount: 100,
      filteredCount: 25,
      activeFilterCount: 2,
    };
    expect(formatResultCount(meta)).toBe("25 / 100");
  });
});

describe("shouldShowNoResults", () => {
  it("returns false when there are results", () => {
    expect(
      shouldShowNoResults({
        totalCount: 100,
        filteredCount: 25,
        activeFilterCount: 2,
      })
    ).toBe(false);
  });

  it("returns false when no filters and no results", () => {
    expect(
      shouldShowNoResults({
        totalCount: 0,
        filteredCount: 0,
        activeFilterCount: 0,
      })
    ).toBe(false);
  });

  it("returns true when filters active and no results", () => {
    expect(
      shouldShowNoResults({
        totalCount: 100,
        filteredCount: 0,
        activeFilterCount: 2,
      })
    ).toBe(true);
  });
});

describe("createSearchError", () => {
  it("creates error object", () => {
    const error = createSearchError("network", "Network failed");
    expect(error.type).toBe("network");
    expect(error.message).toBe("Network failed");
  });
});

describe("parseSearchApiError", () => {
  it("parses timeout errors", () => {
    const error = parseSearchApiError(new Error("Request timeout"));
    expect(error.type).toBe("timeout");
  });

  it("parses network errors", () => {
    const error = parseSearchApiError(new Error("network error"));
    expect(error.type).toBe("network");
  });

  it("parses fetch errors", () => {
    const error = parseSearchApiError(new Error("fetch failed"));
    expect(error.type).toBe("network");
  });

  it("parses unknown errors", () => {
    const error = parseSearchApiError(new Error("Something went wrong"));
    expect(error.type).toBe("unknown");
  });

  it("handles non-Error objects", () => {
    const error = parseSearchApiError("string error");
    expect(error.type).toBe("unknown");
    expect(error.message).toBe("An unknown error occurred.");
  });
});

describe("generateFilterChips", () => {
  const mockOnRemove = () => {};

  it("generates no chips for default filters", () => {
    const chips = generateFilterChips(createDefaultFilters(), mockOnRemove);
    expect(chips).toHaveLength(0);
  });

  it("generates chip for status", () => {
    const filters = createMockFilters({ status: "reading" });
    const chips = generateFilterChips(filters, mockOnRemove);
    expect(chips.find((c) => c.key === "status")).toBeDefined();
  });

  it("generates chips for genres", () => {
    const filters = createMockFilters({ genres: ["fiction", "mystery"] });
    const chips = generateFilterChips(filters, mockOnRemove);
    expect(chips.filter((c) => c.key.startsWith("genre-"))).toHaveLength(2);
  });

  it("generates chips for tags", () => {
    const filters = createMockFilters({ tags: ["favorite"] });
    const chips = generateFilterChips(filters, mockOnRemove);
    expect(chips.find((c) => c.key === "tag-favorite")).toBeDefined();
  });

  it("generates chip for non-default progress", () => {
    const filters = createMockFilters({ progress: { min: 50, max: 75 } });
    const chips = generateFilterChips(filters, mockOnRemove);
    expect(chips.find((c) => c.key === "progress")).toBeDefined();
  });

  it("generates chip for author", () => {
    const filters = createMockFilters({ author: "Test Author" });
    const chips = generateFilterChips(filters, mockOnRemove);
    expect(chips.find((c) => c.key === "author")).toBeDefined();
  });
});

describe("formatDateRangeShort", () => {
  it("returns empty string for null dates", () => {
    expect(formatDateRangeShort({ start: null, end: null })).toBe("");
  });

  it("formats start date only", () => {
    const result = formatDateRangeShort({
      start: new Date("2024-06-15"),
      end: null,
    });
    expect(result).toContain("From");
    expect(result).toContain("Jun");
  });

  it("formats end date only", () => {
    const result = formatDateRangeShort({
      start: null,
      end: new Date("2024-06-15"),
    });
    expect(result).toContain("Until");
    expect(result).toContain("Jun");
  });

  it("formats full range", () => {
    const result = formatDateRangeShort({
      start: new Date("2024-06-01"),
      end: new Date("2024-06-30"),
    });
    expect(result).toContain("-");
    expect(result).toContain("Jun");
  });
});

describe("formatProgressRange", () => {
  it("formats single value", () => {
    expect(formatProgressRange({ min: 50, max: 50 })).toBe("50%");
  });

  it("formats range", () => {
    expect(formatProgressRange({ min: 25, max: 75 })).toBe("25% - 75%");
  });
});

describe("validateProgressRange", () => {
  it("returns true for valid ranges", () => {
    expect(validateProgressRange({ min: 0, max: 100 })).toBe(true);
    expect(validateProgressRange({ min: 25, max: 75 })).toBe(true);
    expect(validateProgressRange({ min: 50, max: 50 })).toBe(true);
  });

  it("returns false for invalid min", () => {
    expect(validateProgressRange({ min: -1, max: 100 })).toBe(false);
    expect(validateProgressRange({ min: 101, max: 100 })).toBe(false);
  });

  it("returns false for invalid max", () => {
    expect(validateProgressRange({ min: 0, max: -1 })).toBe(false);
    expect(validateProgressRange({ min: 0, max: 101 })).toBe(false);
  });

  it("returns false when min > max", () => {
    expect(validateProgressRange({ min: 75, max: 25 })).toBe(false);
  });
});

describe("clampProgressRange", () => {
  it("returns same values for valid range", () => {
    expect(clampProgressRange({ min: 25, max: 75 })).toEqual({
      min: 25,
      max: 75,
    });
  });

  it("clamps negative values to 0", () => {
    expect(clampProgressRange({ min: -10, max: 50 })).toEqual({
      min: 0,
      max: 50,
    });
  });

  it("clamps values over 100", () => {
    expect(clampProgressRange({ min: 50, max: 150 })).toEqual({
      min: 50,
      max: 100,
    });
  });

  it("swaps min and max if min > max", () => {
    expect(clampProgressRange({ min: 75, max: 25 })).toEqual({
      min: 25,
      max: 75,
    });
  });
});

describe("areFiltersEqual", () => {
  it("returns true for identical filters", () => {
    const a = createDefaultFilters();
    const b = createDefaultFilters();
    expect(areFiltersEqual(a, b)).toBe(true);
  });

  it("returns false for different query", () => {
    const a = createMockFilters({ query: "test" });
    const b = createMockFilters({ query: "other" });
    expect(areFiltersEqual(a, b)).toBe(false);
  });

  it("returns false for different status", () => {
    const a = createMockFilters({ status: "reading" });
    const b = createMockFilters({ status: "completed" });
    expect(areFiltersEqual(a, b)).toBe(false);
  });

  it("returns true for same genres in different order", () => {
    const a = createMockFilters({ genres: ["fiction", "mystery"] });
    const b = createMockFilters({ genres: ["mystery", "fiction"] });
    expect(areFiltersEqual(a, b)).toBe(true);
  });

  it("returns false for different progress ranges", () => {
    const a = createMockFilters({ progress: { min: 0, max: 50 } });
    const b = createMockFilters({ progress: { min: 50, max: 100 } });
    expect(areFiltersEqual(a, b)).toBe(false);
  });
});

describe("matchesAllFilters", () => {
  const book = createMockBook({
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    status: "reading",
    progress: 50,
  });

  it("returns true for default filters", () => {
    expect(matchesAllFilters(book, createDefaultFilters())).toBe(true);
  });

  it("returns true when all filters match", () => {
    const filters = createMockFilters({
      query: "gatsby",
      status: "reading",
      progress: { min: 25, max: 75 },
    });
    expect(matchesAllFilters(book, filters)).toBe(true);
  });

  it("returns false when query does not match", () => {
    const filters = createMockFilters({ query: "moby dick" });
    expect(matchesAllFilters(book, filters)).toBe(false);
  });

  it("returns false when status does not match", () => {
    const filters = createMockFilters({ status: "completed" });
    expect(matchesAllFilters(book, filters)).toBe(false);
  });

  it("returns false when progress does not match", () => {
    const filters = createMockFilters({ progress: { min: 75, max: 100 } });
    expect(matchesAllFilters(book, filters)).toBe(false);
  });
});

describe("filterBooks", () => {
  const books: Book[] = [
    createMockBook({
      id: "1",
      title: "Book One",
      status: "reading",
      progress: 25,
    }),
    createMockBook({
      id: "2",
      title: "Book Two",
      status: "completed",
      progress: 100,
    }),
    createMockBook({
      id: "3",
      title: "Book Three",
      status: "reading",
      progress: 75,
    }),
    createMockBook({
      id: "4",
      title: "Another Book",
      status: "not_started",
      progress: 0,
    }),
  ];

  it("returns all books for default filters", () => {
    expect(filterBooks(books, createDefaultFilters())).toHaveLength(4);
  });

  it("filters by search query", () => {
    const result = filterBooks(books, createMockFilters({ query: "book" }));
    expect(result).toHaveLength(4);
    const result2 = filterBooks(books, createMockFilters({ query: "one" }));
    expect(result2).toHaveLength(1);
  });

  it("filters by status", () => {
    const result = filterBooks(books, createMockFilters({ status: "reading" }));
    expect(result).toHaveLength(2);
    expect(result.every((b) => b.status === "reading")).toBe(true);
  });

  it("filters by progress", () => {
    const result = filterBooks(
      books,
      createMockFilters({ progress: { min: 50, max: 100 } })
    );
    expect(result).toHaveLength(2);
    expect(result.every((b) => b.progress >= 50)).toBe(true);
  });

  it("combines multiple filters", () => {
    const result = filterBooks(
      books,
      createMockFilters({
        status: "reading",
        progress: { min: 50, max: 100 },
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("3");
  });
});

describe("getBookTypeLabelKey", () => {
  it("returns label key for known types", () => {
    expect(getBookTypeLabelKey("epub")).toBe(
      "library.advancedSearch.types.epub"
    );
    expect(getBookTypeLabelKey("pdf")).toBe("library.advancedSearch.types.pdf");
  });

  it("returns fallback for unknown types", () => {
    expect(getBookTypeLabelKey("unknown" as BookType)).toBe(
      "library.advancedSearch.types.unknown"
    );
  });
});

describe("isValidBookType", () => {
  it("returns true for valid types", () => {
    expect(isValidBookType("epub")).toBe(true);
    expect(isValidBookType("pdf")).toBe(true);
    expect(isValidBookType("doc")).toBe(true);
    expect(isValidBookType("text")).toBe(true);
    expect(isValidBookType("url")).toBe(true);
  });

  it("returns false for invalid types", () => {
    expect(isValidBookType("invalid")).toBe(false);
    expect(isValidBookType("")).toBe(false);
    expect(isValidBookType("EPUB")).toBe(false);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe("Edge cases", () => {
  it("handles empty book list", () => {
    expect(filterBooks([], createDefaultFilters())).toHaveLength(0);
  });

  it("handles book without coverUrl", () => {
    const book = createMockBook({});
    // Remove coverUrl to test handling of missing optional property
    delete (book as Partial<Book>).coverUrl;
    expect(matchesAllFilters(book, createDefaultFilters())).toBe(true);
  });

  it("handles very long search queries", () => {
    const longQuery = "a".repeat(1000);
    expect(normalizeSearchQuery(longQuery)).toHaveLength(1000);
  });

  it("handles special characters in search", () => {
    const book = createMockBook({ title: "Book (Part 1) [2024]" });
    expect(matchesSearchQuery(book, "part 1")).toBe(true);
    expect(matchesSearchQuery(book, "[2024]")).toBe(true);
  });
});
