/**
 * Tests for library component types and constants
 */

import { describe, it, expect } from "vitest";

import {
  DEFAULT_LIBRARY_FILTERS,
  SORT_OPTIONS,
  STATUS_FILTERS,
  type LibraryViewMode,
  type SortOption,
  type SortOrder,
  type StatusFilter,
  type LibraryFilters,
  type SortOptionConfig,
  type StatusFilterConfig,
} from "./types";

describe("Library Types", () => {
  describe("DEFAULT_LIBRARY_FILTERS", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_LIBRARY_FILTERS).toEqual({
        status: "all",
        search: "",
        sort: "createdAt",
        order: "desc",
        genres: [],
        tags: [],
      });
    });

    it("should have empty arrays for genres and tags", () => {
      expect(DEFAULT_LIBRARY_FILTERS.genres).toEqual([]);
      expect(DEFAULT_LIBRARY_FILTERS.tags).toEqual([]);
    });

    it("should default to showing all statuses", () => {
      expect(DEFAULT_LIBRARY_FILTERS.status).toBe("all");
    });

    it("should default to sorting by date added descending", () => {
      expect(DEFAULT_LIBRARY_FILTERS.sort).toBe("createdAt");
      expect(DEFAULT_LIBRARY_FILTERS.order).toBe("desc");
    });
  });

  describe("SORT_OPTIONS", () => {
    it("should have four sort options", () => {
      expect(SORT_OPTIONS).toHaveLength(4);
    });

    it("should include dateAdded option", () => {
      const dateOption = SORT_OPTIONS.find((opt) => opt.value === "createdAt");
      expect(dateOption).toBeDefined();
      expect(dateOption?.labelKey).toBe("library.sort.dateAdded");
    });

    it("should include title option", () => {
      const titleOption = SORT_OPTIONS.find((opt) => opt.value === "title");
      expect(titleOption).toBeDefined();
      expect(titleOption?.labelKey).toBe("library.sort.title");
    });

    it("should include author option", () => {
      const authorOption = SORT_OPTIONS.find((opt) => opt.value === "author");
      expect(authorOption).toBeDefined();
      expect(authorOption?.labelKey).toBe("library.sort.author");
    });

    it("should include progress option", () => {
      const progressOption = SORT_OPTIONS.find(
        (opt) => opt.value === "progress"
      );
      expect(progressOption).toBeDefined();
      expect(progressOption?.labelKey).toBe("library.sort.progress");
    });

    it("should have unique values", () => {
      const values = SORT_OPTIONS.map((opt) => opt.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it("should have unique label keys", () => {
      const labelKeys = SORT_OPTIONS.map((opt) => opt.labelKey);
      const uniqueLabelKeys = new Set(labelKeys);
      expect(uniqueLabelKeys.size).toBe(labelKeys.length);
    });
  });

  describe("STATUS_FILTERS", () => {
    it("should have five status filters", () => {
      expect(STATUS_FILTERS).toHaveLength(5);
    });

    it("should include all option first", () => {
      const firstOption = STATUS_FILTERS[0];
      expect(firstOption?.value).toBe("all");
      expect(firstOption?.labelKey).toBe("library.filters.all");
    });

    it("should include reading option", () => {
      const readingOption = STATUS_FILTERS.find(
        (opt) => opt.value === "reading"
      );
      expect(readingOption).toBeDefined();
      expect(readingOption?.labelKey).toBe("library.filters.reading");
    });

    it("should include completed option", () => {
      const completedOption = STATUS_FILTERS.find(
        (opt) => opt.value === "completed"
      );
      expect(completedOption).toBeDefined();
      expect(completedOption?.labelKey).toBe("library.filters.completed");
    });

    it("should include not_started option", () => {
      const notStartedOption = STATUS_FILTERS.find(
        (opt) => opt.value === "not_started"
      );
      expect(notStartedOption).toBeDefined();
      expect(notStartedOption?.labelKey).toBe("library.filters.wantToRead");
    });

    it("should include abandoned option", () => {
      const abandonedOption = STATUS_FILTERS.find(
        (opt) => opt.value === "abandoned"
      );
      expect(abandonedOption).toBeDefined();
      expect(abandonedOption?.labelKey).toBe("library.filters.abandoned");
    });

    it("should have unique values", () => {
      const values = STATUS_FILTERS.map((opt) => opt.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe("LibraryViewMode type", () => {
    it("should accept grid value", () => {
      const mode: LibraryViewMode = "grid";
      expect(mode).toBe("grid");
    });

    it("should accept list value", () => {
      const mode: LibraryViewMode = "list";
      expect(mode).toBe("list");
    });
  });

  describe("SortOption type", () => {
    it("should accept all valid sort options", () => {
      const options: SortOption[] = [
        "title",
        "author",
        "createdAt",
        "progress",
      ];
      expect(options).toHaveLength(4);
    });
  });

  describe("SortOrder type", () => {
    it("should accept asc value", () => {
      const order: SortOrder = "asc";
      expect(order).toBe("asc");
    });

    it("should accept desc value", () => {
      const order: SortOrder = "desc";
      expect(order).toBe("desc");
    });
  });

  describe("StatusFilter type", () => {
    it("should accept all status values", () => {
      const filters: StatusFilter[] = [
        "all",
        "not_started",
        "reading",
        "completed",
        "abandoned",
      ];
      expect(filters).toHaveLength(5);
    });
  });

  describe("LibraryFilters interface", () => {
    it("should create valid filter objects", () => {
      const filters: LibraryFilters = {
        status: "reading",
        search: "test query",
        sort: "title",
        order: "asc",
        genres: ["fiction", "mystery"],
        tags: ["favorite", "to-read"],
      };

      expect(filters.status).toBe("reading");
      expect(filters.search).toBe("test query");
      expect(filters.sort).toBe("title");
      expect(filters.order).toBe("asc");
      expect(filters.genres).toEqual(["fiction", "mystery"]);
      expect(filters.tags).toEqual(["favorite", "to-read"]);
    });

    it("should allow empty genres and tags arrays", () => {
      const filters: LibraryFilters = {
        ...DEFAULT_LIBRARY_FILTERS,
        genres: [],
        tags: [],
      };

      expect(filters.genres).toEqual([]);
      expect(filters.tags).toEqual([]);
    });
  });

  describe("SortOptionConfig interface", () => {
    it("should have correct structure", () => {
      const config: SortOptionConfig = {
        value: "title",
        labelKey: "library.sort.title",
      };

      expect(config.value).toBe("title");
      expect(config.labelKey).toBe("library.sort.title");
    });
  });

  describe("StatusFilterConfig interface", () => {
    it("should have correct structure", () => {
      const config: StatusFilterConfig = {
        value: "reading",
        labelKey: "library.filters.reading",
      };

      expect(config.value).toBe("reading");
      expect(config.labelKey).toBe("library.filters.reading");
    });
  });
});
