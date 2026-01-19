/**
 * Progress Tracking Types Tests
 *
 * Comprehensive test suite for progress tracking utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  // Types
  type ReadingSession,
  type ProgressData,
  type ProgressTrackerProps,
  type ProgressBarSegment,
  type TimeDisplayFormat,
  type ProgressDisplayMode,
  // Constants
  DEFAULT_WPM,
  MIN_WPM_THRESHOLD,
  MAX_WPM_THRESHOLD,
  MIN_TIME_FOR_WPM,
  READING_PAUSE_THRESHOLD,
  TIME_UNITS,
  DISPLAY_MODE_DEFAULTS,
  // Functions
  calculatePercentage,
  calculateWpm,
  estimateTimeRemaining,
  formatDuration,
  formatPercentage,
  formatWpm,
  calculateWordsRead,
  calculateProgressData,
  isReadingActive,
  createReadingSession,
  updateReadingSession,
  getDisplaySettings,
  createProgressSegments,
  validateProgressProps,
} from "./progressTypes";

// =============================================================================
// TYPE EXPORT TESTS
// =============================================================================

describe("Type exports", () => {
  it("exports ReadingSession type", () => {
    const session: ReadingSession = {
      startTime: Date.now(),
      wordsRead: 0,
      timeSpent: 0,
      lastUpdate: Date.now(),
    };
    expect(session).toBeDefined();
    expect(session.startTime).toBeTypeOf("number");
  });

  it("exports ProgressData type", () => {
    const data: ProgressData = {
      currentPosition: 0,
      totalPositions: 100,
      percentage: 0,
      wordsRead: 0,
      totalWords: 1000,
      timeSpentMs: 0,
      timeRemainingMs: 0,
      wpm: 0,
      averageWpm: 0,
    };
    expect(data).toBeDefined();
    expect(data.totalPositions).toBe(100);
  });

  it("exports ProgressTrackerProps type", () => {
    const props: ProgressTrackerProps = {
      currentPosition: 50,
      totalPositions: 100,
      totalWords: 10000,
      wordsRead: 5000,
      timeSpentMs: 300000,
    };
    expect(props).toBeDefined();
  });

  it("exports ProgressBarSegment type", () => {
    const segment: ProgressBarSegment = {
      start: 0,
      end: 25,
      label: "Chapter 1",
      completed: true,
    };
    expect(segment).toBeDefined();
  });

  it("exports TimeDisplayFormat type", () => {
    const formats: TimeDisplayFormat[] = ["short", "long", "compact"];
    expect(formats).toHaveLength(3);
  });

  it("exports ProgressDisplayMode type", () => {
    const modes: ProgressDisplayMode[] = ["minimal", "standard", "detailed"];
    expect(modes).toHaveLength(3);
  });
});

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Constants", () => {
  it("DEFAULT_WPM is 200", () => {
    expect(DEFAULT_WPM).toBe(200);
  });

  it("MIN_WPM_THRESHOLD is 50", () => {
    expect(MIN_WPM_THRESHOLD).toBe(50);
  });

  it("MAX_WPM_THRESHOLD is 1000", () => {
    expect(MAX_WPM_THRESHOLD).toBe(1000);
  });

  it("MIN_TIME_FOR_WPM is 30 seconds", () => {
    expect(MIN_TIME_FOR_WPM).toBe(30000);
  });

  it("READING_PAUSE_THRESHOLD is 1 minute", () => {
    expect(READING_PAUSE_THRESHOLD).toBe(60000);
  });

  it("TIME_UNITS has correct values", () => {
    expect(TIME_UNITS.SECOND).toBe(1000);
    expect(TIME_UNITS.MINUTE).toBe(60000);
    expect(TIME_UNITS.HOUR).toBe(3600000);
    expect(TIME_UNITS.DAY).toBe(86400000);
  });

  it("DISPLAY_MODE_DEFAULTS has all modes", () => {
    expect(DISPLAY_MODE_DEFAULTS.minimal).toBeDefined();
    expect(DISPLAY_MODE_DEFAULTS.standard).toBeDefined();
    expect(DISPLAY_MODE_DEFAULTS.detailed).toBeDefined();
  });

  it("minimal mode shows only progress bar and percentage", () => {
    const minimal = DISPLAY_MODE_DEFAULTS.minimal;
    expect(minimal.showProgressBar).toBe(true);
    expect(minimal.showPercentage).toBe(true);
    expect(minimal.showTimeRemaining).toBe(false);
    expect(minimal.showSpeed).toBe(false);
  });

  it("standard mode shows time remaining", () => {
    const standard = DISPLAY_MODE_DEFAULTS.standard;
    expect(standard.showProgressBar).toBe(true);
    expect(standard.showPercentage).toBe(true);
    expect(standard.showTimeRemaining).toBe(true);
    expect(standard.showSpeed).toBe(false);
  });

  it("detailed mode shows everything", () => {
    const detailed = DISPLAY_MODE_DEFAULTS.detailed;
    expect(detailed.showProgressBar).toBe(true);
    expect(detailed.showPercentage).toBe(true);
    expect(detailed.showTimeRemaining).toBe(true);
    expect(detailed.showSpeed).toBe(true);
  });
});

// =============================================================================
// calculatePercentage TESTS
// =============================================================================

describe("calculatePercentage", () => {
  it("returns 0 for position 0", () => {
    expect(calculatePercentage(0, 100)).toBe(0);
  });

  it("returns 100 for complete position", () => {
    expect(calculatePercentage(100, 100)).toBe(100);
  });

  it("calculates correct percentage", () => {
    expect(calculatePercentage(50, 100)).toBe(50);
    expect(calculatePercentage(25, 100)).toBe(25);
    expect(calculatePercentage(75, 100)).toBe(75);
  });

  it("rounds to 1 decimal place", () => {
    expect(calculatePercentage(33, 100)).toBe(33);
    expect(calculatePercentage(1, 3)).toBe(33.3);
  });

  it("returns 0 for invalid inputs", () => {
    expect(calculatePercentage(-10, 100)).toBe(0);
    expect(calculatePercentage(0, 0)).toBe(0);
    expect(calculatePercentage(0, -100)).toBe(0);
  });

  it("caps at 100", () => {
    expect(calculatePercentage(150, 100)).toBe(100);
    expect(calculatePercentage(1000, 100)).toBe(100);
  });
});

// =============================================================================
// calculateWpm TESTS
// =============================================================================

describe("calculateWpm", () => {
  it("returns 0 for no words read", () => {
    expect(calculateWpm(0, 60000)).toBe(0);
  });

  it("returns 0 for no time spent", () => {
    expect(calculateWpm(100, 0)).toBe(0);
  });

  it("calculates correct WPM", () => {
    // 200 words in 1 minute = 200 WPM
    expect(calculateWpm(200, 60000)).toBe(200);
    // 400 words in 2 minutes = 200 WPM
    expect(calculateWpm(400, 120000)).toBe(200);
    // 100 words in 30 seconds = 200 WPM
    expect(calculateWpm(100, 30000)).toBe(200);
  });

  it("returns 0 for WPM below threshold", () => {
    // 10 words in 1 minute = 10 WPM (below threshold)
    expect(calculateWpm(10, 60000)).toBe(0);
  });

  it("caps at MAX_WPM_THRESHOLD", () => {
    // 2000 words in 1 minute = 2000 WPM (capped to 1000)
    expect(calculateWpm(2000, 60000)).toBe(MAX_WPM_THRESHOLD);
  });

  it("handles negative values", () => {
    expect(calculateWpm(-100, 60000)).toBe(0);
    expect(calculateWpm(100, -60000)).toBe(0);
  });

  it("rounds to whole number", () => {
    // 150 words in 1 minute = 150 WPM
    expect(calculateWpm(150, 60000)).toBe(150);
    // 155 words in 1 minute = 155 WPM
    expect(calculateWpm(155, 60000)).toBe(155);
  });
});

// =============================================================================
// estimateTimeRemaining TESTS
// =============================================================================

describe("estimateTimeRemaining", () => {
  it("returns 0 for no words remaining", () => {
    expect(estimateTimeRemaining(0, 200)).toBe(0);
  });

  it("uses provided WPM", () => {
    // 200 words at 200 WPM = 1 minute
    expect(estimateTimeRemaining(200, 200)).toBe(60000);
    // 400 words at 200 WPM = 2 minutes
    expect(estimateTimeRemaining(400, 200)).toBe(120000);
  });

  it("uses DEFAULT_WPM when WPM is 0", () => {
    // 200 words at 200 WPM (default) = 1 minute
    expect(estimateTimeRemaining(200, 0)).toBe(60000);
  });

  it("handles large word counts", () => {
    // 10000 words at 200 WPM = 50 minutes = 3000000 ms
    expect(estimateTimeRemaining(10000, 200)).toBe(3000000);
  });

  it("handles negative values", () => {
    expect(estimateTimeRemaining(-100, 200)).toBe(0);
  });
});

// =============================================================================
// formatDuration TESTS
// =============================================================================

describe("formatDuration", () => {
  describe("short format", () => {
    it("formats seconds", () => {
      expect(formatDuration(5000, "short")).toBe("5 sec");
      expect(formatDuration(59000, "short")).toBe("59 sec");
    });

    it("formats minutes", () => {
      expect(formatDuration(60000, "short")).toBe("1 min");
      expect(formatDuration(120000, "short")).toBe("2 min");
      expect(formatDuration(300000, "short")).toBe("5 min");
    });

    it("formats hours and minutes", () => {
      expect(formatDuration(3600000, "short")).toBe("1h 0m");
      expect(formatDuration(3660000, "short")).toBe("1h 1m");
      expect(formatDuration(7200000, "short")).toBe("2h 0m");
    });

    it("returns 0 min for 0 or negative", () => {
      expect(formatDuration(0, "short")).toBe("0 min");
      expect(formatDuration(-1000, "short")).toBe("0 min");
    });
  });

  describe("compact format", () => {
    it("formats seconds", () => {
      expect(formatDuration(5000, "compact")).toBe("5s");
      expect(formatDuration(59000, "compact")).toBe("59s");
    });

    it("formats minutes", () => {
      expect(formatDuration(60000, "compact")).toBe("1m");
      expect(formatDuration(300000, "compact")).toBe("5m");
    });

    it("formats hours", () => {
      expect(formatDuration(3600000, "compact")).toBe("1h");
      expect(formatDuration(3660000, "compact")).toBe("1h 1m");
    });

    it("returns 0m for 0 or negative", () => {
      expect(formatDuration(0, "compact")).toBe("0m");
      expect(formatDuration(-1000, "compact")).toBe("0m");
    });
  });

  describe("long format", () => {
    it("formats seconds with proper pluralization", () => {
      expect(formatDuration(1000, "long")).toBe("1 second");
      expect(formatDuration(5000, "long")).toBe("5 seconds");
    });

    it("formats minutes with proper pluralization", () => {
      expect(formatDuration(60000, "long")).toBe("1 minute");
      expect(formatDuration(120000, "long")).toBe("2 minutes");
    });

    it("formats hours with proper pluralization", () => {
      expect(formatDuration(3600000, "long")).toBe("1 hour");
      expect(formatDuration(7200000, "long")).toBe("2 hours");
      expect(formatDuration(3660000, "long")).toBe("1 hour, 1 minute");
      expect(formatDuration(7320000, "long")).toBe("2 hours, 2 minutes");
    });

    it("returns 0 min for 0 or negative (default behavior)", () => {
      // formatDuration returns early for 0/negative values with default format
      expect(formatDuration(0, "long")).toBe("0 min");
    });
  });

  it("defaults to short format", () => {
    expect(formatDuration(60000)).toBe("1 min");
  });
});

// =============================================================================
// formatPercentage TESTS
// =============================================================================

describe("formatPercentage", () => {
  it("formats basic percentages", () => {
    expect(formatPercentage(0)).toBe("0%");
    expect(formatPercentage(50)).toBe("50%");
    expect(formatPercentage(100)).toBe("100%");
  });

  it("respects decimal places", () => {
    expect(formatPercentage(33.333, 0)).toBe("33%");
    expect(formatPercentage(33.333, 1)).toBe("33.3%");
    expect(formatPercentage(33.333, 2)).toBe("33.33%");
  });

  it("clamps to 0-100", () => {
    expect(formatPercentage(-10)).toBe("0%");
    expect(formatPercentage(150)).toBe("100%");
  });

  it("defaults to 0 decimal places", () => {
    expect(formatPercentage(33.5)).toBe("34%");
  });
});

// =============================================================================
// formatWpm TESTS
// =============================================================================

describe("formatWpm", () => {
  it("formats positive WPM", () => {
    expect(formatWpm(200)).toBe("200 WPM");
    expect(formatWpm(150)).toBe("150 WPM");
  });

  it("returns placeholder for 0 or negative", () => {
    expect(formatWpm(0)).toBe("-- WPM");
    expect(formatWpm(-100)).toBe("-- WPM");
  });

  it("rounds to whole number", () => {
    expect(formatWpm(199.5)).toBe("200 WPM");
    expect(formatWpm(199.4)).toBe("199 WPM");
  });
});

// =============================================================================
// calculateWordsRead TESTS
// =============================================================================

describe("calculateWordsRead", () => {
  it("calculates words based on position ratio", () => {
    expect(calculateWordsRead(50, 100, 1000)).toBe(500);
    expect(calculateWordsRead(25, 100, 1000)).toBe(250);
    expect(calculateWordsRead(75, 100, 1000)).toBe(750);
  });

  it("returns 0 for invalid inputs", () => {
    expect(calculateWordsRead(50, 0, 1000)).toBe(0);
    expect(calculateWordsRead(50, 100, 0)).toBe(0);
    expect(calculateWordsRead(50, -100, 1000)).toBe(0);
  });

  it("rounds to whole number", () => {
    expect(calculateWordsRead(33, 100, 1000)).toBe(330);
    expect(calculateWordsRead(1, 3, 100)).toBe(33);
  });
});

// =============================================================================
// calculateProgressData TESTS
// =============================================================================

describe("calculateProgressData", () => {
  it("calculates complete progress data", () => {
    const data = calculateProgressData({
      currentPosition: 50,
      totalPositions: 100,
      totalWords: 10000,
      wordsRead: 5000,
      timeSpentMs: 1500000, // 25 minutes
    });

    expect(data.percentage).toBe(50);
    expect(data.currentPosition).toBe(50);
    expect(data.totalPositions).toBe(100);
    expect(data.wordsRead).toBe(5000);
    expect(data.totalWords).toBe(10000);
    expect(data.timeSpentMs).toBe(1500000);
    expect(data.wpm).toBe(200); // 5000 words / 25 minutes
    expect(data.timeRemainingMs).toBeGreaterThan(0);
  });

  it("uses averageWpm when time is below threshold", () => {
    const data = calculateProgressData({
      currentPosition: 10,
      totalPositions: 100,
      totalWords: 10000,
      wordsRead: 1000,
      timeSpentMs: 10000, // 10 seconds (below MIN_TIME_FOR_WPM)
      averageWpm: 250,
    });

    // Should use average WPM for time remaining calculation
    expect(data.timeRemainingMs).toBeGreaterThan(0);
  });

  it("handles edge cases", () => {
    const data = calculateProgressData({
      currentPosition: 0,
      totalPositions: 100,
      totalWords: 1000,
      wordsRead: 0,
      timeSpentMs: 0,
    });

    expect(data.percentage).toBe(0);
    expect(data.wpm).toBe(0);
    expect(data.timeRemainingMs).toBeGreaterThan(0); // Uses default WPM
  });
});

// =============================================================================
// isReadingActive TESTS
// =============================================================================

describe("isReadingActive", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for recent update", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    expect(isReadingActive(now)).toBe(true);
    expect(isReadingActive(now - 30000)).toBe(true);
    expect(isReadingActive(now - 59999)).toBe(true);
  });

  it("returns false for stale update", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    expect(isReadingActive(now - 60000)).toBe(false);
    expect(isReadingActive(now - 120000)).toBe(false);
  });
});

// =============================================================================
// createReadingSession TESTS
// =============================================================================

describe("createReadingSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a new session with current timestamp", () => {
    const now = 1000000;
    vi.setSystemTime(now);

    const session = createReadingSession();

    expect(session.startTime).toBe(now);
    expect(session.wordsRead).toBe(0);
    expect(session.timeSpent).toBe(0);
    expect(session.lastUpdate).toBe(now);
  });
});

// =============================================================================
// updateReadingSession TESTS
// =============================================================================

describe("updateReadingSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates words read and time spent when active", () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    const session = createReadingSession();

    // Advance 30 seconds
    vi.setSystemTime(startTime + 30000);

    const updated = updateReadingSession(session, 100);

    expect(updated.wordsRead).toBe(100);
    expect(updated.timeSpent).toBe(30000);
    expect(updated.lastUpdate).toBe(startTime + 30000);
  });

  it("does not count time if paused", () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    const session = createReadingSession();

    // Advance 2 minutes (past pause threshold)
    vi.setSystemTime(startTime + 120000);

    const updated = updateReadingSession(session, 100);

    expect(updated.wordsRead).toBe(100);
    expect(updated.timeSpent).toBe(0); // Time not counted
    expect(updated.lastUpdate).toBe(startTime + 120000);
  });

  it("accumulates time across updates", () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    let session = createReadingSession();

    // First update after 30 seconds
    vi.setSystemTime(startTime + 30000);
    session = updateReadingSession(session, 100);

    // Second update after another 30 seconds
    vi.setSystemTime(startTime + 60000);
    session = updateReadingSession(session, 200);

    expect(session.wordsRead).toBe(200);
    expect(session.timeSpent).toBe(60000);
  });
});

// =============================================================================
// getDisplaySettings TESTS
// =============================================================================

describe("getDisplaySettings", () => {
  it("returns default settings for each mode", () => {
    expect(getDisplaySettings("minimal")).toEqual(
      DISPLAY_MODE_DEFAULTS.minimal
    );
    expect(getDisplaySettings("standard")).toEqual(
      DISPLAY_MODE_DEFAULTS.standard
    );
    expect(getDisplaySettings("detailed")).toEqual(
      DISPLAY_MODE_DEFAULTS.detailed
    );
  });

  it("applies overrides", () => {
    const settings = getDisplaySettings("minimal", {
      showTimeRemaining: true,
      showSpeed: true,
    });

    expect(settings.showProgressBar).toBe(true); // From default
    expect(settings.showPercentage).toBe(true); // From default
    expect(settings.showTimeRemaining).toBe(true); // Override
    expect(settings.showSpeed).toBe(true); // Override
  });

  it("overrides can disable features", () => {
    const settings = getDisplaySettings("detailed", {
      showProgressBar: false,
      showSpeed: false,
    });

    expect(settings.showProgressBar).toBe(false); // Override
    expect(settings.showSpeed).toBe(false); // Override
    expect(settings.showPercentage).toBe(true); // From default
  });
});

// =============================================================================
// createProgressSegments TESTS
// =============================================================================

describe("createProgressSegments", () => {
  it("creates segments from chapters", () => {
    const chapters = [
      { title: "Chapter 1", startPosition: 0, endPosition: 25 },
      { title: "Chapter 2", startPosition: 25, endPosition: 50 },
      { title: "Chapter 3", startPosition: 50, endPosition: 100 },
    ];

    const segments = createProgressSegments(chapters, 100, 30);

    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({
      start: 0,
      end: 25,
      label: "Chapter 1",
      completed: true,
    });
    expect(segments[1]).toEqual({
      start: 25,
      end: 50,
      label: "Chapter 2",
      completed: false,
    });
    expect(segments[2]).toEqual({
      start: 50,
      end: 100,
      label: "Chapter 3",
      completed: false,
    });
  });

  it("returns empty array for no chapters", () => {
    expect(createProgressSegments([], 100, 50)).toEqual([]);
  });

  it("returns empty array for invalid total", () => {
    const chapters = [{ title: "Ch1", startPosition: 0, endPosition: 50 }];
    expect(createProgressSegments(chapters, 0, 25)).toEqual([]);
    expect(createProgressSegments(chapters, -100, 25)).toEqual([]);
  });

  it("handles chapter completion at boundaries", () => {
    const chapters = [
      { title: "Ch1", startPosition: 0, endPosition: 50 },
      { title: "Ch2", startPosition: 50, endPosition: 100 },
    ];

    // At exactly the end of chapter 1
    const segments = createProgressSegments(chapters, 100, 50);
    expect(segments).toHaveLength(2);
    // Use array destructuring to handle TypeScript's strictness
    const [firstSegment, secondSegment] = segments;
    expect(firstSegment).toBeDefined();
    expect(secondSegment).toBeDefined();
    if (firstSegment && secondSegment) {
      expect(firstSegment.completed).toBe(true);
      expect(secondSegment.completed).toBe(false);
    }
  });
});

// =============================================================================
// validateProgressProps TESTS
// =============================================================================

describe("validateProgressProps", () => {
  it("validates correct props", () => {
    const result = validateProgressProps({
      currentPosition: 50,
      totalPositions: 100,
      totalWords: 10000,
      wordsRead: 5000,
      timeSpentMs: 300000,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects negative currentPosition", () => {
    const result = validateProgressProps({
      currentPosition: -10,
      totalPositions: 100,
      totalWords: 10000,
      wordsRead: 5000,
      timeSpentMs: 300000,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "currentPosition must be a non-negative number"
    );
  });

  it("rejects non-positive totalPositions", () => {
    const result = validateProgressProps({
      currentPosition: 50,
      totalPositions: 0,
      totalWords: 10000,
      wordsRead: 5000,
      timeSpentMs: 300000,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("totalPositions must be a positive number");
  });

  it("rejects non-positive totalWords", () => {
    const result = validateProgressProps({
      currentPosition: 50,
      totalPositions: 100,
      totalWords: -100,
      wordsRead: 5000,
      timeSpentMs: 300000,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("totalWords must be a positive number");
  });

  it("rejects negative wordsRead", () => {
    const result = validateProgressProps({
      currentPosition: 50,
      totalPositions: 100,
      totalWords: 10000,
      wordsRead: -100,
      timeSpentMs: 300000,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("wordsRead must be a non-negative number");
  });

  it("rejects negative timeSpentMs", () => {
    const result = validateProgressProps({
      currentPosition: 50,
      totalPositions: 100,
      totalWords: 10000,
      wordsRead: 5000,
      timeSpentMs: -1000,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "timeSpentMs must be a non-negative number"
    );
  });

  it("reports multiple errors", () => {
    const result = validateProgressProps({
      currentPosition: -10,
      totalPositions: 0,
      totalWords: -100,
      wordsRead: -50,
      timeSpentMs: -1000,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe("Edge cases", () => {
  it("handles very large numbers", () => {
    const percentage = calculatePercentage(999999999, 1000000000);
    expect(percentage).toBeCloseTo(100, 0);

    const wpm = calculateWpm(100000, 600000); // 100k words in 10 minutes
    expect(wpm).toBe(MAX_WPM_THRESHOLD); // Capped
  });

  it("handles fractional positions", () => {
    const percentage = calculatePercentage(33.333, 100);
    expect(percentage).toBeCloseTo(33.3, 1);
  });

  it("handles very small time values", () => {
    // 1 ms / 60000 = 0.0000167 minutes, which is < 0.001 threshold
    // So calculateWpm returns 0 to avoid division by very small numbers
    const wpm = calculateWpm(1, 1);
    expect(wpm).toBe(0);

    // But with 100ms, it would calculate high WPM and cap at MAX_WPM_THRESHOLD
    const wpm2 = calculateWpm(10, 100); // 10 words in 100ms = 6000 WPM
    expect(wpm2).toBe(MAX_WPM_THRESHOLD);
  });
});

// =============================================================================
// INTEGRATION SCENARIOS
// =============================================================================

describe("Integration scenarios", () => {
  it("simulates typical reading session progress", () => {
    // Start of reading
    const initialData = calculateProgressData({
      currentPosition: 0,
      totalPositions: 100,
      totalWords: 50000,
      wordsRead: 0,
      timeSpentMs: 0,
    });
    expect(initialData.percentage).toBe(0);
    expect(initialData.timeRemainingMs).toBeGreaterThan(0);

    // Middle of reading (25 minutes in, halfway through)
    const midData = calculateProgressData({
      currentPosition: 50,
      totalPositions: 100,
      totalWords: 50000,
      wordsRead: 25000,
      timeSpentMs: 1500000, // 25 minutes
    });
    expect(midData.percentage).toBe(50);
    expect(midData.wpm).toBe(1000); // 25000 / 25 = 1000, capped
    expect(midData.timeRemainingMs).toBeGreaterThan(0);

    // Near completion
    const nearEndData = calculateProgressData({
      currentPosition: 95,
      totalPositions: 100,
      totalWords: 50000,
      wordsRead: 47500,
      timeSpentMs: 14250000, // ~4 hours
      averageWpm: 200,
    });
    expect(nearEndData.percentage).toBe(95);
    expect(nearEndData.timeRemainingMs).toBeLessThan(midData.timeRemainingMs);
  });

  it("formats progress for display", () => {
    const data = calculateProgressData({
      currentPosition: 75,
      totalPositions: 100,
      totalWords: 10000,
      wordsRead: 7500,
      timeSpentMs: 2250000, // 37.5 minutes
    });

    expect(formatPercentage(data.percentage)).toBe("75%");
    expect(formatWpm(data.wpm)).toBe("200 WPM");
    expect(formatDuration(data.timeRemainingMs)).toMatch(/\d+/);
  });
});
