/**
 * Flashcard Statistics Types Tests
 *
 * Comprehensive tests for all utility functions in flashcardStatsTypes.ts
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  // Constants
  STATS_PREFERENCES_KEY,
  DEFAULT_HISTORY_DAYS,
  MIN_HISTORY_DAYS,
  MAX_HISTORY_DAYS,
  DEFAULT_CHART_TYPE,
  RETENTION_THRESHOLDS,
  CHART_TYPES,
  TIME_RANGES,
  DEFAULT_STATS_PREFERENCES,
  // Default creation functions
  createDefaultSummary,
  createDefaultRetention,
  createDefaultStreak,
  createDefaultStudyTime,
  createDefaultForecast,
  createDefaultStats,
  // Error functions
  createStatsError,
  parseStatsApiError,
  // Formatting functions
  formatRetentionRate,
  getRetentionBadgeColor,
  getRetentionTrendDirection,
  getTrendColor,
  formatStreakCount,
  formatStudyTime,
  formatStudyTimeLong,
  formatCardCount,
  formatDate,
  formatDateLong,
  // Calculation functions
  calculateRetentionRate,
  calculateTotalReviews,
  calculateTotalCorrect,
  calculateTotalStudyTime,
  calculateAverageRetention,
  determineRetentionTrend,
  filterHistoryByRange,
  getChartData,
  // Validation functions
  isValidRetentionRate,
  isValidTimeRange,
  isValidChartType,
  isValidDailyReviewData,
  isValidStats,
  // Preference functions
  loadStatsPreferences,
  saveStatsPreferences,
  updatePreference,
  // Status helpers
  getStatusLabelKey,
  getStatusColor,
  getCardsByStatus,
  // Mock data functions
  createMockHistory,
  createMockStats,
} from "./flashcardStatsTypes";

import type {
  DailyReviewData,
  FlashcardStatsSummary,
  StatsPreferences,
} from "./flashcardStatsTypes";

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Constants", () => {
  it("should have correct STATS_PREFERENCES_KEY", () => {
    expect(STATS_PREFERENCES_KEY).toBe("flashcard-stats-preferences");
  });

  it("should have correct history days defaults", () => {
    expect(DEFAULT_HISTORY_DAYS).toBe(30);
    expect(MIN_HISTORY_DAYS).toBe(7);
    expect(MAX_HISTORY_DAYS).toBe(365);
  });

  it("should have correct DEFAULT_CHART_TYPE", () => {
    expect(DEFAULT_CHART_TYPE).toBe("reviews");
  });

  it("should have correct RETENTION_THRESHOLDS", () => {
    expect(RETENTION_THRESHOLDS.excellent).toBe(90);
    expect(RETENTION_THRESHOLDS.good).toBe(70);
    expect(RETENTION_THRESHOLDS.needsWork).toBe(0);
  });

  it("should have all CHART_TYPES", () => {
    expect(CHART_TYPES).toHaveLength(3);
    expect(CHART_TYPES.map((t) => t.value)).toEqual([
      "reviews",
      "retention",
      "time",
    ]);
  });

  it("should have all TIME_RANGES", () => {
    expect(TIME_RANGES).toHaveLength(4);
    expect(TIME_RANGES.map((r) => r.value)).toEqual([
      "7d",
      "30d",
      "90d",
      "365d",
    ]);
  });

  it("should have correct DEFAULT_STATS_PREFERENCES", () => {
    expect(DEFAULT_STATS_PREFERENCES).toEqual({
      chartType: "reviews",
      timeRange: "30d",
      showForecast: true,
      showStreak: true,
    });
  });
});

// =============================================================================
// DEFAULT CREATION FUNCTIONS TESTS
// =============================================================================

describe("Default Creation Functions", () => {
  describe("createDefaultSummary", () => {
    it("should create summary with all zeros", () => {
      const summary = createDefaultSummary();
      expect(summary.totalCards).toBe(0);
      expect(summary.activeCards).toBe(0);
      expect(summary.dueToday).toBe(0);
      expect(summary.overdueCards).toBe(0);
      expect(summary.newCards).toBe(0);
      expect(summary.learningCards).toBe(0);
      expect(summary.reviewCards).toBe(0);
      expect(summary.suspendedCards).toBe(0);
    });
  });

  describe("createDefaultRetention", () => {
    it("should create retention with zeros and stable trend", () => {
      const retention = createDefaultRetention();
      expect(retention.overall).toBe(0);
      expect(retention.last7Days).toBe(0);
      expect(retention.last30Days).toBe(0);
      expect(retention.lifetime).toBe(0);
      expect(retention.trend).toBe("stable");
      expect(retention.trendChange).toBe(0);
    });
  });

  describe("createDefaultStreak", () => {
    it("should create streak with zeros and nulls", () => {
      const streak = createDefaultStreak();
      expect(streak.currentStreak).toBe(0);
      expect(streak.longestStreak).toBe(0);
      expect(streak.studiedToday).toBe(false);
      expect(streak.lastStudyDate).toBeNull();
      expect(streak.streakStartDate).toBeNull();
    });
  });

  describe("createDefaultStudyTime", () => {
    it("should create study time with zeros", () => {
      const studyTime = createDefaultStudyTime();
      expect(studyTime.today).toBe(0);
      expect(studyTime.thisWeek).toBe(0);
      expect(studyTime.thisMonth).toBe(0);
      expect(studyTime.averagePerDay).toBe(0);
    });
  });

  describe("createDefaultForecast", () => {
    it("should create forecast with zeros", () => {
      const forecast = createDefaultForecast();
      expect(forecast.today).toBe(0);
      expect(forecast.tomorrow).toBe(0);
      expect(forecast.next7Days).toBe(0);
      expect(forecast.next30Days).toBe(0);
    });
  });

  describe("createDefaultStats", () => {
    it("should create complete stats with all defaults", () => {
      const stats = createDefaultStats();
      expect(stats.summary).toEqual(createDefaultSummary());
      expect(stats.retention).toEqual(createDefaultRetention());
      expect(stats.streak).toEqual(createDefaultStreak());
      expect(stats.studyTime).toEqual(createDefaultStudyTime());
      expect(stats.forecast).toEqual(createDefaultForecast());
      expect(stats.history).toEqual([]);
      expect(stats.updatedAt).toBeDefined();
    });
  });
});

// =============================================================================
// ERROR FUNCTIONS TESTS
// =============================================================================

describe("Error Functions", () => {
  describe("createStatsError", () => {
    it("should create network error with default message", () => {
      const error = createStatsError("network_error");
      expect(error.type).toBe("network_error");
      expect(error.message).toBe(
        "Unable to load statistics. Please check your connection."
      );
      expect(error.retryable).toBe(true);
    });

    it("should create unauthorized error", () => {
      const error = createStatsError("unauthorized");
      expect(error.type).toBe("unauthorized");
      expect(error.retryable).toBe(false);
    });

    it("should create not_found error", () => {
      const error = createStatsError("not_found");
      expect(error.type).toBe("not_found");
      expect(error.retryable).toBe(false);
    });

    it("should create unknown error", () => {
      const error = createStatsError("unknown");
      expect(error.type).toBe("unknown");
      expect(error.retryable).toBe(false);
    });

    it("should use custom message if provided", () => {
      const error = createStatsError("network_error", "Custom message");
      expect(error.message).toBe("Custom message");
    });
  });

  describe("parseStatsApiError", () => {
    it("should return not_found for 404", () => {
      const error = parseStatsApiError(404);
      expect(error.type).toBe("not_found");
    });

    it("should return unauthorized for 401", () => {
      const error = parseStatsApiError(401);
      expect(error.type).toBe("unauthorized");
    });

    it("should return unauthorized for 403", () => {
      const error = parseStatsApiError(403);
      expect(error.type).toBe("unauthorized");
    });

    it("should return network_error for status 0", () => {
      const error = parseStatsApiError(0);
      expect(error.type).toBe("network_error");
    });

    it("should return unknown for other status codes", () => {
      const error = parseStatsApiError(500);
      expect(error.type).toBe("unknown");
    });

    it("should use custom message if provided", () => {
      const error = parseStatsApiError(500, "Server error");
      expect(error.message).toBe("Server error");
    });
  });
});

// =============================================================================
// FORMATTING FUNCTIONS TESTS
// =============================================================================

describe("Formatting Functions", () => {
  describe("formatRetentionRate", () => {
    it("should format rate as percentage", () => {
      expect(formatRetentionRate(85)).toBe("85%");
      expect(formatRetentionRate(0)).toBe("0%");
      expect(formatRetentionRate(100)).toBe("100%");
    });

    it("should round decimal values", () => {
      expect(formatRetentionRate(85.6)).toBe("86%");
      expect(formatRetentionRate(85.4)).toBe("85%");
    });
  });

  describe("getRetentionBadgeColor", () => {
    it("should return success for excellent retention", () => {
      expect(getRetentionBadgeColor(90)).toBe("success");
      expect(getRetentionBadgeColor(95)).toBe("success");
      expect(getRetentionBadgeColor(100)).toBe("success");
    });

    it("should return warning for good retention", () => {
      expect(getRetentionBadgeColor(70)).toBe("warning");
      expect(getRetentionBadgeColor(80)).toBe("warning");
      expect(getRetentionBadgeColor(89)).toBe("warning");
    });

    it("should return error for needs work retention", () => {
      expect(getRetentionBadgeColor(1)).toBe("error");
      expect(getRetentionBadgeColor(50)).toBe("error");
      expect(getRetentionBadgeColor(69)).toBe("error");
    });

    it("should return default for zero", () => {
      expect(getRetentionBadgeColor(0)).toBe("default");
    });
  });

  describe("getRetentionTrendDirection", () => {
    it("should return up for improving", () => {
      expect(getRetentionTrendDirection("improving")).toBe("up");
    });

    it("should return down for declining", () => {
      expect(getRetentionTrendDirection("declining")).toBe("down");
    });

    it("should return stable for stable", () => {
      expect(getRetentionTrendDirection("stable")).toBe("stable");
    });
  });

  describe("getTrendColor", () => {
    it("should return success for improving", () => {
      expect(getTrendColor("improving")).toBe("success");
    });

    it("should return error for declining", () => {
      expect(getTrendColor("declining")).toBe("error");
    });

    it("should return default for stable", () => {
      expect(getTrendColor("stable")).toBe("default");
    });
  });

  describe("formatStreakCount", () => {
    it("should format zero", () => {
      expect(formatStreakCount(0)).toBe("0");
    });

    it("should format singular day", () => {
      expect(formatStreakCount(1)).toBe("1 day");
    });

    it("should format plural days", () => {
      expect(formatStreakCount(2)).toBe("2 days");
      expect(formatStreakCount(10)).toBe("10 days");
      expect(formatStreakCount(365)).toBe("365 days");
    });
  });

  describe("formatStudyTime", () => {
    it("should format seconds", () => {
      expect(formatStudyTime(30)).toBe("30s");
      expect(formatStudyTime(59)).toBe("59s");
    });

    it("should format minutes", () => {
      expect(formatStudyTime(60)).toBe("1m");
      expect(formatStudyTime(120)).toBe("2m");
      expect(formatStudyTime(3599)).toBe("60m");
    });

    it("should format hours and minutes", () => {
      expect(formatStudyTime(3600)).toBe("1h");
      expect(formatStudyTime(3660)).toBe("1h 1m");
      expect(formatStudyTime(7200)).toBe("2h");
      expect(formatStudyTime(7320)).toBe("2h 2m");
    });
  });

  describe("formatStudyTimeLong", () => {
    it("should format seconds in long form", () => {
      expect(formatStudyTimeLong(1)).toBe("1 second");
      expect(formatStudyTimeLong(30)).toBe("30 seconds");
    });

    it("should format minutes in long form", () => {
      expect(formatStudyTimeLong(60)).toBe("1 minute");
      expect(formatStudyTimeLong(120)).toBe("2 minutes");
    });

    it("should format hours in long form", () => {
      expect(formatStudyTimeLong(3600)).toBe("1 hour");
      expect(formatStudyTimeLong(7200)).toBe("2 hours");
    });

    it("should format hours and minutes in long form", () => {
      expect(formatStudyTimeLong(3660)).toBe("1 hour 1 minute");
      expect(formatStudyTimeLong(7320)).toBe("2 hours 2 minutes");
    });
  });

  describe("formatCardCount", () => {
    it("should format small numbers directly", () => {
      expect(formatCardCount(0)).toBe("0");
      expect(formatCardCount(100)).toBe("100");
      expect(formatCardCount(9999)).toBe("9,999");
    });

    it("should format large numbers with k suffix", () => {
      expect(formatCardCount(10000)).toBe("10k");
      expect(formatCardCount(50000)).toBe("50k");
    });
  });

  describe("formatDate", () => {
    it("should format date as short month and day", () => {
      const date = "2024-03-15";
      const formatted = formatDate(date);
      // Account for timezone differences - may show as Mar 14 or Mar 15
      expect(formatted).toMatch(/Mar/);
      expect(formatted).toMatch(/1[45]/); // Either 14 or 15 depending on timezone
    });
  });

  describe("formatDateLong", () => {
    it("should format date with year", () => {
      const date = "2024-03-15";
      const formatted = formatDateLong(date);
      expect(formatted).toMatch(/2024/);
      expect(formatted).toMatch(/Mar/);
      // Account for timezone differences
      expect(formatted).toMatch(/1[45]/); // Either 14 or 15 depending on timezone
    });
  });
});

// =============================================================================
// CALCULATION FUNCTIONS TESTS
// =============================================================================

describe("Calculation Functions", () => {
  describe("calculateRetentionRate", () => {
    it("should calculate correct rate", () => {
      expect(calculateRetentionRate(80, 100)).toBe(80);
      expect(calculateRetentionRate(9, 10)).toBe(90);
    });

    it("should return 0 for zero total", () => {
      expect(calculateRetentionRate(0, 0)).toBe(0);
    });

    it("should handle edge cases", () => {
      expect(calculateRetentionRate(100, 100)).toBe(100);
      expect(calculateRetentionRate(0, 100)).toBe(0);
    });
  });

  describe("calculateTotalReviews", () => {
    it("should sum all reviews", () => {
      const history: DailyReviewData[] = [
        createDailyData("2024-01-01", 10),
        createDailyData("2024-01-02", 20),
        createDailyData("2024-01-03", 15),
      ];
      expect(calculateTotalReviews(history)).toBe(45);
    });

    it("should return 0 for empty history", () => {
      expect(calculateTotalReviews([])).toBe(0);
    });
  });

  describe("calculateTotalCorrect", () => {
    it("should sum all correct answers", () => {
      const history: DailyReviewData[] = [
        createDailyData("2024-01-01", 10, 8),
        createDailyData("2024-01-02", 20, 18),
      ];
      expect(calculateTotalCorrect(history)).toBe(26);
    });
  });

  describe("calculateTotalStudyTime", () => {
    it("should sum all study time", () => {
      const history: DailyReviewData[] = [
        createDailyData("2024-01-01", 10, 8, 600),
        createDailyData("2024-01-02", 20, 18, 900),
      ];
      expect(calculateTotalStudyTime(history)).toBe(1500);
    });
  });

  describe("calculateAverageRetention", () => {
    it("should calculate average retention", () => {
      const history: DailyReviewData[] = [
        createDailyData("2024-01-01", 10, 8),
        createDailyData("2024-01-02", 10, 9),
      ];
      const avg = calculateAverageRetention(history);
      expect(avg).toBe(85);
    });

    it("should return 0 for empty history", () => {
      expect(calculateAverageRetention([])).toBe(0);
    });

    it("should exclude days with zero reviews", () => {
      const history: DailyReviewData[] = [
        createDailyData("2024-01-01", 10, 9),
        createDailyData("2024-01-02", 0, 0),
      ];
      expect(calculateAverageRetention(history)).toBe(90);
    });
  });

  describe("determineRetentionTrend", () => {
    it("should return stable for insufficient data", () => {
      const history = createMockHistory(5);
      const { trend } = determineRetentionTrend(history);
      expect(trend).toBe("stable");
    });

    it("should detect improving trend", () => {
      // Create history with improving retention
      const history: DailyReviewData[] = [];
      for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const retention = i < 7 ? 90 : 70; // Recent days have higher retention
        const dateStr = date.toISOString().split("T")[0] ?? "";
        history.push({
          date: dateStr,
          reviews: 20,
          correct: Math.round((retention / 100) * 20),
          incorrect: Math.round(((100 - retention) / 100) * 20),
          retentionRate: retention,
          newCardsStudied: 5,
          studyTimeSeconds: 600,
        });
      }
      const { trend, change } = determineRetentionTrend(history);
      expect(trend).toBe("improving");
      expect(change).toBeGreaterThan(0);
    });

    it("should detect declining trend", () => {
      // Create history with declining retention
      const history: DailyReviewData[] = [];
      for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const retention = i < 7 ? 70 : 90; // Recent days have lower retention
        const dateStr = date.toISOString().split("T")[0] ?? "";
        history.push({
          date: dateStr,
          reviews: 20,
          correct: Math.round((retention / 100) * 20),
          incorrect: Math.round(((100 - retention) / 100) * 20),
          retentionRate: retention,
          newCardsStudied: 5,
          studyTimeSeconds: 600,
        });
      }
      const { trend, change } = determineRetentionTrend(history);
      expect(trend).toBe("declining");
      expect(change).toBeLessThan(0);
    });
  });

  describe("filterHistoryByRange", () => {
    it("should filter to approximately 7 days", () => {
      const history = createMockHistory(30);
      const filtered = filterHistoryByRange(history, "7d");
      // Allow +1 day tolerance for boundary conditions
      expect(filtered.length).toBeLessThanOrEqual(8);
      expect(filtered.length).toBeGreaterThan(0);
    });

    it("should filter to approximately 30 days", () => {
      const history = createMockHistory(60);
      const filtered = filterHistoryByRange(history, "30d");
      // Allow +1 day tolerance for boundary conditions
      expect(filtered.length).toBeLessThanOrEqual(31);
      expect(filtered.length).toBeGreaterThan(0);
    });

    it("should handle empty history", () => {
      const filtered = filterHistoryByRange([], "7d");
      expect(filtered).toEqual([]);
    });
  });

  describe("getChartData", () => {
    it("should return reviews chart data", () => {
      const history: DailyReviewData[] = [createDailyData("2024-01-01", 10, 8)];
      const data = getChartData(history, "reviews");
      expect(data).toHaveLength(1);
      expect(data[0]?.value).toBe(10);
      expect(data[0]?.label).toBe("10 reviews");
    });

    it("should return retention chart data", () => {
      const history: DailyReviewData[] = [createDailyData("2024-01-01", 10, 8)];
      const data = getChartData(history, "retention");
      expect(data).toHaveLength(1);
      expect(data[0]?.value).toBe(80);
      expect(data[0]?.label).toBe("80%");
    });

    it("should return time chart data in minutes", () => {
      const history: DailyReviewData[] = [
        createDailyData("2024-01-01", 10, 8, 600),
      ];
      const data = getChartData(history, "time");
      expect(data).toHaveLength(1);
      expect(data[0]?.value).toBe(10); // 600 seconds = 10 minutes
    });
  });
});

// =============================================================================
// VALIDATION FUNCTIONS TESTS
// =============================================================================

describe("Validation Functions", () => {
  describe("isValidRetentionRate", () => {
    it("should accept valid rates", () => {
      expect(isValidRetentionRate(0)).toBe(true);
      expect(isValidRetentionRate(50)).toBe(true);
      expect(isValidRetentionRate(100)).toBe(true);
    });

    it("should reject invalid rates", () => {
      expect(isValidRetentionRate(-1)).toBe(false);
      expect(isValidRetentionRate(101)).toBe(false);
      expect(isValidRetentionRate(NaN)).toBe(false);
    });
  });

  describe("isValidTimeRange", () => {
    it("should accept valid time ranges", () => {
      expect(isValidTimeRange("7d")).toBe(true);
      expect(isValidTimeRange("30d")).toBe(true);
      expect(isValidTimeRange("90d")).toBe(true);
      expect(isValidTimeRange("365d")).toBe(true);
    });

    it("should reject invalid time ranges", () => {
      expect(isValidTimeRange("1d")).toBe(false);
      expect(isValidTimeRange("invalid")).toBe(false);
      expect(isValidTimeRange("")).toBe(false);
    });
  });

  describe("isValidChartType", () => {
    it("should accept valid chart types", () => {
      expect(isValidChartType("reviews")).toBe(true);
      expect(isValidChartType("retention")).toBe(true);
      expect(isValidChartType("time")).toBe(true);
    });

    it("should reject invalid chart types", () => {
      expect(isValidChartType("invalid")).toBe(false);
      expect(isValidChartType("")).toBe(false);
    });
  });

  describe("isValidDailyReviewData", () => {
    it("should accept valid data", () => {
      const data = createDailyData("2024-01-01", 10, 8);
      expect(isValidDailyReviewData(data)).toBe(true);
    });

    it("should reject invalid data", () => {
      expect(isValidDailyReviewData(null)).toBe(false);
      expect(isValidDailyReviewData(undefined)).toBe(false);
      expect(isValidDailyReviewData({})).toBe(false);
      expect(isValidDailyReviewData({ date: "2024-01-01" })).toBe(false);
    });
  });

  describe("isValidStats", () => {
    it("should accept valid stats", () => {
      const stats = createDefaultStats();
      expect(isValidStats(stats)).toBe(true);
    });

    it("should accept mock stats", () => {
      const stats = createMockStats();
      expect(isValidStats(stats)).toBe(true);
    });

    it("should reject invalid stats", () => {
      expect(isValidStats(null)).toBe(false);
      expect(isValidStats(undefined)).toBe(false);
      expect(isValidStats({})).toBe(false);
    });
  });
});

// =============================================================================
// PREFERENCE FUNCTIONS TESTS
// =============================================================================

describe("Preference Functions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("loadStatsPreferences", () => {
    it("should return defaults when nothing saved", () => {
      const prefs = loadStatsPreferences();
      expect(prefs).toEqual(DEFAULT_STATS_PREFERENCES);
    });

    it("should load saved preferences", () => {
      const saved: StatsPreferences = {
        chartType: "retention",
        timeRange: "7d",
        showForecast: false,
        showStreak: true,
      };
      localStorage.setItem(STATS_PREFERENCES_KEY, JSON.stringify(saved));
      const prefs = loadStatsPreferences();
      expect(prefs).toEqual(saved);
    });

    it("should use defaults for invalid values", () => {
      localStorage.setItem(
        STATS_PREFERENCES_KEY,
        JSON.stringify({
          chartType: "invalid",
          timeRange: "invalid",
          showForecast: "not a boolean",
        })
      );
      const prefs = loadStatsPreferences();
      expect(prefs.chartType).toBe(DEFAULT_STATS_PREFERENCES.chartType);
      expect(prefs.timeRange).toBe(DEFAULT_STATS_PREFERENCES.timeRange);
      expect(prefs.showForecast).toBe(DEFAULT_STATS_PREFERENCES.showForecast);
    });

    it("should handle invalid JSON", () => {
      localStorage.setItem(STATS_PREFERENCES_KEY, "invalid json");
      const prefs = loadStatsPreferences();
      expect(prefs).toEqual(DEFAULT_STATS_PREFERENCES);
    });
  });

  describe("saveStatsPreferences", () => {
    it("should save preferences to localStorage", () => {
      const prefs: StatsPreferences = {
        chartType: "retention",
        timeRange: "90d",
        showForecast: false,
        showStreak: false,
      };
      saveStatsPreferences(prefs);
      const saved = JSON.parse(
        localStorage.getItem(STATS_PREFERENCES_KEY) ?? "{}"
      );
      expect(saved).toEqual(prefs);
    });
  });

  describe("updatePreference", () => {
    it("should update a single preference", () => {
      const current = DEFAULT_STATS_PREFERENCES;
      const updated = updatePreference(current, "chartType", "retention");
      expect(updated.chartType).toBe("retention");
      expect(updated.timeRange).toBe(current.timeRange);
    });

    it("should not mutate original", () => {
      const current = DEFAULT_STATS_PREFERENCES;
      updatePreference(current, "chartType", "retention");
      expect(current.chartType).toBe("reviews");
    });
  });
});

// =============================================================================
// STATUS HELPERS TESTS
// =============================================================================

describe("Status Helpers", () => {
  describe("getStatusLabelKey", () => {
    it("should return correct label keys", () => {
      expect(getStatusLabelKey("NEW")).toBe("flashcards.stats.status.new");
      expect(getStatusLabelKey("LEARNING")).toBe(
        "flashcards.stats.status.learning"
      );
      expect(getStatusLabelKey("REVIEW")).toBe(
        "flashcards.stats.status.review"
      );
      expect(getStatusLabelKey("SUSPENDED")).toBe(
        "flashcards.stats.status.suspended"
      );
    });
  });

  describe("getStatusColor", () => {
    it("should return correct colors", () => {
      expect(getStatusColor("NEW")).toBe("info");
      expect(getStatusColor("LEARNING")).toBe("warning");
      expect(getStatusColor("REVIEW")).toBe("success");
      expect(getStatusColor("SUSPENDED")).toBe("default");
    });
  });

  describe("getCardsByStatus", () => {
    it("should extract status counts from summary", () => {
      const summary: FlashcardStatsSummary = {
        totalCards: 100,
        activeCards: 80,
        dueToday: 20,
        overdueCards: 5,
        newCards: 30,
        learningCards: 20,
        reviewCards: 40,
        suspendedCards: 10,
      };
      const counts = getCardsByStatus(summary);
      expect(counts.new).toBe(30);
      expect(counts.learning).toBe(20);
      expect(counts.review).toBe(40);
      expect(counts.suspended).toBe(10);
    });
  });
});

// =============================================================================
// MOCK DATA FUNCTIONS TESTS
// =============================================================================

describe("Mock Data Functions", () => {
  describe("createMockHistory", () => {
    it("should create history with specified number of days", () => {
      const history = createMockHistory(7);
      expect(history).toHaveLength(7);
    });

    it("should create valid daily data", () => {
      const history = createMockHistory(1);
      expect(isValidDailyReviewData(history[0])).toBe(true);
    });

    it("should create data in chronological order", () => {
      const history = createMockHistory(7);
      for (let i = 1; i < history.length; i++) {
        const current = history[i];
        const previous = history[i - 1];
        if (current && previous) {
          expect(current.date > previous.date).toBe(true);
        }
      }
    });
  });

  describe("createMockStats", () => {
    it("should create valid stats", () => {
      const stats = createMockStats();
      expect(isValidStats(stats)).toBe(true);
    });

    it("should have non-zero values", () => {
      const stats = createMockStats();
      expect(stats.summary.totalCards).toBeGreaterThan(0);
      expect(stats.retention.overall).toBeGreaterThan(0);
      expect(stats.history.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createDailyData(
  date: string,
  reviews: number,
  correct?: number,
  studyTimeSeconds?: number
): DailyReviewData {
  const c = correct ?? Math.floor(reviews * 0.8);
  return {
    date,
    reviews,
    correct: c,
    incorrect: reviews - c,
    retentionRate: reviews > 0 ? calculateRetentionRate(c, reviews) : 0,
    newCardsStudied: Math.floor(reviews * 0.2),
    studyTimeSeconds: studyTimeSeconds ?? reviews * 30,
  };
}
