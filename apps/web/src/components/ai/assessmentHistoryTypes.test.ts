/**
 * Tests for Assessment History Types and Utilities
 */

import { describe, it, expect, beforeEach } from "vitest";
import type {
  AssessmentHistoryItem,
  AssessmentHistorySort,
} from "./assessmentHistoryTypes";
import {
  // Constants
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  DEFAULT_SORT,
  SCORE_THRESHOLDS,
  TREND_THRESHOLD,
  MIN_ASSESSMENTS_FOR_TREND,
  // Filter functions
  createDefaultFilter,
  isFilterActive,
  countActiveFilters,
  filterHistoryItems,
  // Sort functions
  sortHistoryItems,
  toggleSort,
  // Statistics functions
  calculateHistorySummary,
  createEmptyBloomsBreakdown,
  calculateAverageBloomsBreakdown,
  calculateTrend,
  getBloomLevelProgress,
  // Performance categorization
  getPerformanceCategory,
  getPerformanceLabel,
  getPerformanceColor,
  // Date/time formatting
  formatDuration,
  formatTotalTime,
  getRelativeTime,
  // Retake helpers
  canRetake,
  buildRetakeUrl,
  // Mock data
  generateMockHistoryItem,
  generateMockHistory,
  // Conversion helpers
  getUniqueBooks,
} from "./assessmentHistoryTypes";

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createTestItem(
  overrides?: Partial<AssessmentHistoryItem>
): AssessmentHistoryItem {
  return {
    id: "test-1",
    assessmentId: "assess-1",
    bookId: "book-1",
    bookTitle: "Test Book",
    bookAuthor: "Test Author",
    assessmentType: "standard",
    score: 80,
    totalPoints: 100,
    percentage: 80,
    correctAnswers: 8,
    totalQuestions: 10,
    timeSpent: 600, // 10 minutes
    completedAt: "2024-01-15T10:00:00.000Z",
    bloomsBreakdown: {
      remember: 90,
      understand: 85,
      apply: 75,
      analyze: 70,
      evaluate: 65,
      create: 60,
    },
    ...overrides,
  };
}

function createTestItems(): AssessmentHistoryItem[] {
  return [
    createTestItem({
      id: "test-1",
      bookId: "book-1",
      bookTitle: "Book A",
      percentage: 90,
      assessmentType: "quick",
      completedAt: "2024-01-15T10:00:00.000Z",
      timeSpent: 300,
    }),
    createTestItem({
      id: "test-2",
      bookId: "book-2",
      bookTitle: "Book B",
      percentage: 75,
      assessmentType: "standard",
      completedAt: "2024-01-14T10:00:00.000Z",
      timeSpent: 600,
    }),
    createTestItem({
      id: "test-3",
      bookId: "book-1",
      bookTitle: "Book A",
      percentage: 65,
      assessmentType: "comprehensive",
      completedAt: "2024-01-13T10:00:00.000Z",
      timeSpent: 1200,
    }),
  ];
}

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Constants", () => {
  it("should have valid DEFAULT_PAGE_SIZE", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(10);
    expect(PAGE_SIZE_OPTIONS).toContain(DEFAULT_PAGE_SIZE);
  });

  it("should have valid PAGE_SIZE_OPTIONS", () => {
    expect(PAGE_SIZE_OPTIONS).toEqual([5, 10, 20, 50]);
  });

  it("should have valid DEFAULT_SORT", () => {
    expect(DEFAULT_SORT.field).toBe("completedAt");
    expect(DEFAULT_SORT.order).toBe("desc");
  });

  it("should have valid SCORE_THRESHOLDS", () => {
    expect(SCORE_THRESHOLDS.excellent).toBe(90);
    expect(SCORE_THRESHOLDS.good).toBe(70);
    expect(SCORE_THRESHOLDS.average).toBe(50);
    expect(SCORE_THRESHOLDS.needsWork).toBe(0);
  });

  it("should have valid trend constants", () => {
    expect(TREND_THRESHOLD).toBe(5);
    expect(MIN_ASSESSMENTS_FOR_TREND).toBe(3);
  });
});

// =============================================================================
// FILTER FUNCTIONS TESTS
// =============================================================================

describe("Filter Functions", () => {
  describe("createDefaultFilter", () => {
    it("should return empty filter object", () => {
      const filter = createDefaultFilter();
      expect(filter).toEqual({});
    });
  });

  describe("isFilterActive", () => {
    it("should return false for empty filter", () => {
      expect(isFilterActive({})).toBe(false);
    });

    it("should return true when bookId is set", () => {
      expect(isFilterActive({ bookId: "book-1" })).toBe(true);
    });

    it("should return true when assessmentType is set", () => {
      expect(isFilterActive({ assessmentType: "quick" })).toBe(true);
    });

    it("should return true when dateFrom is set", () => {
      expect(isFilterActive({ dateFrom: "2024-01-01" })).toBe(true);
    });

    it("should return true when dateTo is set", () => {
      expect(isFilterActive({ dateTo: "2024-12-31" })).toBe(true);
    });

    it("should return true when minScore is set", () => {
      expect(isFilterActive({ minScore: 70 })).toBe(true);
    });

    it("should return true when maxScore is set", () => {
      expect(isFilterActive({ maxScore: 90 })).toBe(true);
    });
  });

  describe("countActiveFilters", () => {
    it("should return 0 for empty filter", () => {
      expect(countActiveFilters({})).toBe(0);
    });

    it("should count single filter", () => {
      expect(countActiveFilters({ bookId: "book-1" })).toBe(1);
    });

    it("should count multiple filters", () => {
      expect(
        countActiveFilters({
          bookId: "book-1",
          assessmentType: "quick",
          minScore: 70,
        })
      ).toBe(3);
    });

    it("should count all filters", () => {
      expect(
        countActiveFilters({
          bookId: "book-1",
          assessmentType: "quick",
          dateFrom: "2024-01-01",
          dateTo: "2024-12-31",
          minScore: 70,
          maxScore: 90,
        })
      ).toBe(6);
    });
  });

  describe("filterHistoryItems", () => {
    let items: AssessmentHistoryItem[];

    beforeEach(() => {
      items = createTestItems();
    });

    it("should return all items when no filter applied", () => {
      const result = filterHistoryItems(items, {});
      expect(result).toHaveLength(3);
    });

    it("should filter by bookId", () => {
      const result = filterHistoryItems(items, { bookId: "book-1" });
      expect(result).toHaveLength(2);
      expect(result.every((i) => i.bookId === "book-1")).toBe(true);
    });

    it("should filter by assessmentType", () => {
      const result = filterHistoryItems(items, { assessmentType: "quick" });
      expect(result).toHaveLength(1);
      expect(result[0]?.assessmentType).toBe("quick");
    });

    it("should filter by dateFrom", () => {
      const result = filterHistoryItems(items, {
        dateFrom: "2024-01-14T00:00:00.000Z",
      });
      expect(result).toHaveLength(2);
    });

    it("should filter by dateTo", () => {
      const result = filterHistoryItems(items, {
        dateTo: "2024-01-14T23:59:59.999Z",
      });
      expect(result).toHaveLength(2);
    });

    it("should filter by minScore", () => {
      const result = filterHistoryItems(items, { minScore: 70 });
      expect(result).toHaveLength(2);
      expect(result.every((i) => i.percentage >= 70)).toBe(true);
    });

    it("should filter by maxScore", () => {
      const result = filterHistoryItems(items, { maxScore: 80 });
      expect(result).toHaveLength(2);
      expect(result.every((i) => i.percentage <= 80)).toBe(true);
    });

    it("should apply multiple filters together", () => {
      const result = filterHistoryItems(items, {
        bookId: "book-1",
        minScore: 70,
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("test-1");
    });
  });
});

// =============================================================================
// SORT FUNCTIONS TESTS
// =============================================================================

describe("Sort Functions", () => {
  describe("sortHistoryItems", () => {
    let items: AssessmentHistoryItem[];

    beforeEach(() => {
      items = createTestItems();
    });

    it("should sort by completedAt descending", () => {
      const result = sortHistoryItems(items, {
        field: "completedAt",
        order: "desc",
      });
      expect(result[0]?.id).toBe("test-1");
      expect(result[2]?.id).toBe("test-3");
    });

    it("should sort by completedAt ascending", () => {
      const result = sortHistoryItems(items, {
        field: "completedAt",
        order: "asc",
      });
      expect(result[0]?.id).toBe("test-3");
      expect(result[2]?.id).toBe("test-1");
    });

    it("should sort by percentage descending", () => {
      const result = sortHistoryItems(items, {
        field: "percentage",
        order: "desc",
      });
      expect(result[0]?.percentage).toBe(90);
      expect(result[2]?.percentage).toBe(65);
    });

    it("should sort by percentage ascending", () => {
      const result = sortHistoryItems(items, {
        field: "percentage",
        order: "asc",
      });
      expect(result[0]?.percentage).toBe(65);
      expect(result[2]?.percentage).toBe(90);
    });

    it("should sort by timeSpent descending", () => {
      const result = sortHistoryItems(items, {
        field: "timeSpent",
        order: "desc",
      });
      expect(result[0]?.timeSpent).toBe(1200);
      expect(result[2]?.timeSpent).toBe(300);
    });

    it("should sort by bookTitle alphabetically ascending", () => {
      const result = sortHistoryItems(items, {
        field: "bookTitle",
        order: "asc",
      });
      expect(result[0]?.bookTitle).toBe("Book A");
      expect(result[2]?.bookTitle).toBe("Book B");
    });

    it("should not mutate original array", () => {
      const originalOrder = items.map((i) => i.id);
      sortHistoryItems(items, { field: "percentage", order: "desc" });
      expect(items.map((i) => i.id)).toEqual(originalOrder);
    });
  });

  describe("toggleSort", () => {
    it("should toggle order when same field", () => {
      const current: AssessmentHistorySort = {
        field: "completedAt",
        order: "desc",
      };
      const result = toggleSort(current, "completedAt");
      expect(result.field).toBe("completedAt");
      expect(result.order).toBe("asc");
    });

    it("should toggle back to desc", () => {
      const current: AssessmentHistorySort = {
        field: "completedAt",
        order: "asc",
      };
      const result = toggleSort(current, "completedAt");
      expect(result.order).toBe("desc");
    });

    it("should default to desc when changing field", () => {
      const current: AssessmentHistorySort = {
        field: "completedAt",
        order: "asc",
      };
      const result = toggleSort(current, "percentage");
      expect(result.field).toBe("percentage");
      expect(result.order).toBe("desc");
    });
  });
});

// =============================================================================
// STATISTICS FUNCTIONS TESTS
// =============================================================================

describe("Statistics Functions", () => {
  describe("createEmptyBloomsBreakdown", () => {
    it("should return all levels with 0", () => {
      const result = createEmptyBloomsBreakdown();
      expect(result).toEqual({
        remember: 0,
        understand: 0,
        apply: 0,
        analyze: 0,
        evaluate: 0,
        create: 0,
      });
    });
  });

  describe("calculateHistorySummary", () => {
    it("should return zeros for empty array", () => {
      const result = calculateHistorySummary([]);
      expect(result.totalAssessments).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.totalTimeSpent).toBe(0);
      expect(result.bestScore).toBe(0);
      expect(result.worstScore).toBe(0);
      expect(result.recentTrend).toBe("stable");
    });

    it("should calculate correct statistics", () => {
      const items = createTestItems();
      const result = calculateHistorySummary(items);

      expect(result.totalAssessments).toBe(3);
      expect(result.averageScore).toBe(77); // (90+75+65)/3 = 76.67 rounded
      expect(result.totalTimeSpent).toBe(2100); // 300+600+1200
      expect(result.bestScore).toBe(90);
      expect(result.worstScore).toBe(65);
    });

    it("should count assessments by book", () => {
      const items = createTestItems();
      const result = calculateHistorySummary(items);

      expect(result.assessmentsByBook["book-1"]).toBe(2);
      expect(result.assessmentsByBook["book-2"]).toBe(1);
    });
  });

  describe("calculateAverageBloomsBreakdown", () => {
    it("should return empty breakdown for no items", () => {
      const result = calculateAverageBloomsBreakdown([]);
      expect(result).toEqual(createEmptyBloomsBreakdown());
    });

    it("should calculate average breakdown", () => {
      const items = [
        createTestItem({
          bloomsBreakdown: {
            remember: 80,
            understand: 80,
            apply: 80,
            analyze: 80,
            evaluate: 80,
            create: 80,
          },
        }),
        createTestItem({
          bloomsBreakdown: {
            remember: 60,
            understand: 60,
            apply: 60,
            analyze: 60,
            evaluate: 60,
            create: 60,
          },
        }),
      ];

      const result = calculateAverageBloomsBreakdown(items);
      expect(result.remember).toBe(70);
      expect(result.understand).toBe(70);
    });
  });

  describe("calculateTrend", () => {
    it("should return stable for less than MIN_ASSESSMENTS_FOR_TREND items", () => {
      const items = [createTestItem(), createTestItem()];
      expect(calculateTrend(items)).toBe("stable");
    });

    it("should return improving when recent scores are higher", () => {
      const items = [
        createTestItem({
          completedAt: "2024-01-15T10:00:00.000Z",
          percentage: 90,
        }),
        createTestItem({
          completedAt: "2024-01-14T10:00:00.000Z",
          percentage: 88,
        }),
        createTestItem({
          completedAt: "2024-01-13T10:00:00.000Z",
          percentage: 70,
        }),
        createTestItem({
          completedAt: "2024-01-12T10:00:00.000Z",
          percentage: 65,
        }),
      ];
      expect(calculateTrend(items)).toBe("improving");
    });

    it("should return declining when recent scores are lower", () => {
      const items = [
        createTestItem({
          completedAt: "2024-01-15T10:00:00.000Z",
          percentage: 60,
        }),
        createTestItem({
          completedAt: "2024-01-14T10:00:00.000Z",
          percentage: 62,
        }),
        createTestItem({
          completedAt: "2024-01-13T10:00:00.000Z",
          percentage: 85,
        }),
        createTestItem({
          completedAt: "2024-01-12T10:00:00.000Z",
          percentage: 88,
        }),
      ];
      expect(calculateTrend(items)).toBe("declining");
    });

    it("should return stable when scores are similar", () => {
      const items = [
        createTestItem({
          completedAt: "2024-01-15T10:00:00.000Z",
          percentage: 80,
        }),
        createTestItem({
          completedAt: "2024-01-14T10:00:00.000Z",
          percentage: 82,
        }),
        createTestItem({
          completedAt: "2024-01-13T10:00:00.000Z",
          percentage: 79,
        }),
        createTestItem({
          completedAt: "2024-01-12T10:00:00.000Z",
          percentage: 81,
        }),
      ];
      expect(calculateTrend(items)).toBe("stable");
    });
  });

  describe("getBloomLevelProgress", () => {
    it("should return progress data for all levels", () => {
      const breakdown = {
        remember: 90,
        understand: 85,
        apply: 75,
        analyze: 70,
        evaluate: 65,
        create: 60,
      };
      const result = getBloomLevelProgress(breakdown);

      expect(result).toHaveLength(6);
      expect(result[0]?.level).toBe("remember");
      expect(result[0]?.percentage).toBe(90);
      expect(result[0]?.label).toBeDefined();
      expect(result[0]?.color).toBeDefined();
    });
  });
});

// =============================================================================
// PERFORMANCE CATEGORIZATION TESTS
// =============================================================================

describe("Performance Categorization", () => {
  describe("getPerformanceCategory", () => {
    it("should return excellent for 90+", () => {
      expect(getPerformanceCategory(90)).toBe("excellent");
      expect(getPerformanceCategory(95)).toBe("excellent");
      expect(getPerformanceCategory(100)).toBe("excellent");
    });

    it("should return good for 70-89", () => {
      expect(getPerformanceCategory(70)).toBe("good");
      expect(getPerformanceCategory(80)).toBe("good");
      expect(getPerformanceCategory(89)).toBe("good");
    });

    it("should return average for 50-69", () => {
      expect(getPerformanceCategory(50)).toBe("average");
      expect(getPerformanceCategory(60)).toBe("average");
      expect(getPerformanceCategory(69)).toBe("average");
    });

    it("should return needsWork for below 50", () => {
      expect(getPerformanceCategory(0)).toBe("needsWork");
      expect(getPerformanceCategory(25)).toBe("needsWork");
      expect(getPerformanceCategory(49)).toBe("needsWork");
    });
  });

  describe("getPerformanceLabel", () => {
    it("should return correct labels", () => {
      expect(getPerformanceLabel(95)).toBe("Excellent");
      expect(getPerformanceLabel(80)).toBe("Good");
      expect(getPerformanceLabel(60)).toBe("Average");
      expect(getPerformanceLabel(40)).toBe("Needs Work");
    });
  });

  describe("getPerformanceColor", () => {
    it("should return valid hex colors", () => {
      const hexPattern = /^#[0-9a-f]{6}$/i;
      expect(getPerformanceColor(95)).toMatch(hexPattern);
      expect(getPerformanceColor(80)).toMatch(hexPattern);
      expect(getPerformanceColor(60)).toMatch(hexPattern);
      expect(getPerformanceColor(40)).toMatch(hexPattern);
    });
  });
});

// =============================================================================
// DATE/TIME FORMATTING TESTS
// =============================================================================

describe("Date/Time Formatting", () => {
  describe("formatDuration", () => {
    it("should format seconds only", () => {
      expect(formatDuration(30)).toBe("30s");
      expect(formatDuration(59)).toBe("59s");
    });

    it("should format minutes and seconds", () => {
      expect(formatDuration(60)).toBe("1m");
      expect(formatDuration(90)).toBe("1m 30s");
      expect(formatDuration(125)).toBe("2m 5s");
    });

    it("should format hours and minutes", () => {
      expect(formatDuration(3600)).toBe("1h");
      expect(formatDuration(3660)).toBe("1h 1m");
      expect(formatDuration(7200)).toBe("2h");
      expect(formatDuration(7500)).toBe("2h 5m");
    });
  });

  describe("formatTotalTime", () => {
    it("should format minutes only", () => {
      expect(formatTotalTime(0)).toBe("0m");
      expect(formatTotalTime(60)).toBe("1m");
      expect(formatTotalTime(300)).toBe("5m");
    });

    it("should format hours and minutes", () => {
      expect(formatTotalTime(3600)).toBe("1h 0m");
      expect(formatTotalTime(3660)).toBe("1h 1m");
      expect(formatTotalTime(7500)).toBe("2h 5m");
    });
  });

  describe("getRelativeTime", () => {
    it("should return Today for same day", () => {
      const today = new Date().toISOString();
      expect(getRelativeTime(today)).toBe("Today");
    });

    it("should return Yesterday for previous day", () => {
      const yesterday = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();
      expect(getRelativeTime(yesterday)).toBe("Yesterday");
    });

    it("should return days ago for recent dates", () => {
      const threeDaysAgo = new Date(
        Date.now() - 3 * 24 * 60 * 60 * 1000
      ).toISOString();
      expect(getRelativeTime(threeDaysAgo)).toBe("3 days ago");
    });

    it("should return weeks ago for dates 7-30 days old", () => {
      const twoWeeksAgo = new Date(
        Date.now() - 14 * 24 * 60 * 60 * 1000
      ).toISOString();
      expect(getRelativeTime(twoWeeksAgo)).toBe("2 weeks ago");
    });

    it("should return months ago for dates 30-365 days old", () => {
      const twoMonthsAgo = new Date(
        Date.now() - 60 * 24 * 60 * 60 * 1000
      ).toISOString();
      expect(getRelativeTime(twoMonthsAgo)).toBe("2 months ago");
    });

    it("should return years ago for dates older than 365 days", () => {
      const twoYearsAgo = new Date(
        Date.now() - 730 * 24 * 60 * 60 * 1000
      ).toISOString();
      expect(getRelativeTime(twoYearsAgo)).toBe("2 years ago");
    });
  });
});

// =============================================================================
// RETAKE HELPERS TESTS
// =============================================================================

describe("Retake Helpers", () => {
  describe("canRetake", () => {
    it("should always return true", () => {
      const item = createTestItem();
      expect(canRetake(item)).toBe(true);
    });
  });

  describe("buildRetakeUrl", () => {
    it("should build URL with item assessmentType", () => {
      const item = createTestItem({
        bookId: "book-123",
        assessmentType: "standard",
      });
      const url = buildRetakeUrl(item);
      expect(url).toBe("/assessments/new?bookId=book-123&type=standard");
    });

    it("should build URL with custom assessmentType", () => {
      const item = createTestItem({ bookId: "book-123" });
      const url = buildRetakeUrl(item, "comprehensive");
      expect(url).toBe("/assessments/new?bookId=book-123&type=comprehensive");
    });
  });
});

// =============================================================================
// MOCK DATA TESTS
// =============================================================================

describe("Mock Data Generation", () => {
  describe("generateMockHistoryItem", () => {
    it("should generate valid item", () => {
      const item = generateMockHistoryItem();
      expect(item.id).toBeDefined();
      expect(item.assessmentId).toBeDefined();
      expect(item.bookId).toBeDefined();
      expect(item.percentage).toBeGreaterThanOrEqual(50);
      expect(item.percentage).toBeLessThanOrEqual(100);
      expect(item.completedAt).toBeDefined();
      expect(item.bloomsBreakdown).toBeDefined();
    });

    it("should apply overrides", () => {
      const item = generateMockHistoryItem({
        id: "custom-id",
        percentage: 85,
      });
      expect(item.id).toBe("custom-id");
      expect(item.percentage).toBe(85);
    });
  });

  describe("generateMockHistory", () => {
    it("should generate requested number of items", () => {
      const items = generateMockHistory(5);
      expect(items).toHaveLength(5);
    });

    it("should generate items with varied book titles", () => {
      const items = generateMockHistory(10);
      const uniqueTitles = new Set(items.map((i) => i.bookTitle));
      expect(uniqueTitles.size).toBeGreaterThan(1);
    });
  });
});

// =============================================================================
// CONVERSION HELPERS TESTS
// =============================================================================

describe("Conversion Helpers", () => {
  describe("getUniqueBooks", () => {
    it("should return empty array for no items", () => {
      const result = getUniqueBooks([]);
      expect(result).toEqual([]);
    });

    it("should return unique books", () => {
      const items = createTestItems();
      const result = getUniqueBooks(items);

      expect(result).toHaveLength(2);
      expect(result.find((b) => b.id === "book-1")).toBeDefined();
      expect(result.find((b) => b.id === "book-2")).toBeDefined();
    });

    it("should preserve book titles", () => {
      const items = createTestItems();
      const result = getUniqueBooks(items);

      const book1 = result.find((b) => b.id === "book-1");
      expect(book1?.title).toBe("Book A");
    });
  });
});
