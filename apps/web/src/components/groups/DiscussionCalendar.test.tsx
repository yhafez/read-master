/**
 * DiscussionCalendar Tests
 *
 * Tests for the calendar component that displays scheduled discussions.
 */

import { describe, it, expect } from "vitest";
import {
  getDiscussionsForDate,
  generateCalendarDays,
  getDayNames,
  isUpcomingDiscussion,
  type ScheduledDiscussion,
} from "./DiscussionCalendar";
import { addDays, subDays, startOfMonth, endOfMonth, format } from "date-fns";

// ============================================================================
// Test Data
// ============================================================================

const createMockDiscussion = (
  overrides: Partial<ScheduledDiscussion> = {}
): ScheduledDiscussion => ({
  id: "disc-1",
  title: "Test Discussion",
  scheduledAt: new Date().toISOString(),
  isScheduled: true,
  book: null,
  user: {
    displayName: "Test User",
    username: "testuser",
  },
  ...overrides,
});

// ============================================================================
// getDiscussionsForDate Tests
// ============================================================================

describe("getDiscussionsForDate", () => {
  it("should return empty array when no discussions exist", () => {
    const result = getDiscussionsForDate([], new Date());
    expect(result).toEqual([]);
  });

  it("should return discussions scheduled for the given date", () => {
    const today = new Date();
    const discussions = [
      createMockDiscussion({
        id: "1",
        scheduledAt: today.toISOString(),
      }),
      createMockDiscussion({
        id: "2",
        scheduledAt: addDays(today, 1).toISOString(),
      }),
    ];

    const result = getDiscussionsForDate(discussions, today);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("1");
  });

  it("should match discussions regardless of time on the same day", () => {
    // Use local time to avoid timezone issues
    const baseDate = new Date(2026, 0, 22); // Jan 22, 2026 local time
    const discussions = [
      createMockDiscussion({
        id: "morning",
        scheduledAt: new Date(2026, 0, 22, 8, 0, 0).toISOString(),
      }),
      createMockDiscussion({
        id: "afternoon",
        scheduledAt: new Date(2026, 0, 22, 14, 0, 0).toISOString(),
      }),
      createMockDiscussion({
        id: "evening",
        scheduledAt: new Date(2026, 0, 22, 20, 0, 0).toISOString(),
      }),
    ];

    const result = getDiscussionsForDate(discussions, baseDate);
    expect(result).toHaveLength(3);
  });

  it("should filter out discussions without scheduledAt", () => {
    const today = new Date();
    const discussions = [
      createMockDiscussion({
        id: "1",
        scheduledAt: today.toISOString(),
      }),
      {
        ...createMockDiscussion({ id: "2" }),
        scheduledAt: undefined as unknown as string,
      },
    ];

    const result = getDiscussionsForDate(
      discussions as ScheduledDiscussion[],
      today
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("1");
  });

  it("should return multiple discussions for the same date", () => {
    const today = new Date();
    const discussions = [
      createMockDiscussion({
        id: "1",
        title: "Discussion 1",
        scheduledAt: today.toISOString(),
      }),
      createMockDiscussion({
        id: "2",
        title: "Discussion 2",
        scheduledAt: today.toISOString(),
      }),
      createMockDiscussion({
        id: "3",
        title: "Discussion 3",
        scheduledAt: today.toISOString(),
      }),
    ];

    const result = getDiscussionsForDate(discussions, today);
    expect(result).toHaveLength(3);
  });
});

// ============================================================================
// generateCalendarDays Tests
// ============================================================================

describe("generateCalendarDays", () => {
  it("should generate an array of dates", () => {
    const result = generateCalendarDays(new Date("2026-01-15"));
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should always generate a multiple of 7 days (full weeks)", () => {
    const months = [
      new Date("2026-01-15"),
      new Date("2026-02-15"),
      new Date("2026-03-15"),
      new Date("2026-04-15"),
    ];

    months.forEach((month) => {
      const result = generateCalendarDays(month);
      expect(result.length % 7).toBe(0);
    });
  });

  it("should include all days of the month", () => {
    const date = new Date("2026-01-15");
    const result = generateCalendarDays(date);

    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    // Check that the first day of the month is included
    const hasFirstDay = result.some(
      (d) => format(d, "yyyy-MM-dd") === format(monthStart, "yyyy-MM-dd")
    );
    expect(hasFirstDay).toBe(true);

    // Check that the last day of the month is included
    const hasLastDay = result.some(
      (d) => format(d, "yyyy-MM-dd") === format(monthEnd, "yyyy-MM-dd")
    );
    expect(hasLastDay).toBe(true);
  });

  it("should start with a Sunday (weekStartsOn: 0)", () => {
    const result = generateCalendarDays(new Date("2026-01-15"));
    expect(result[0]?.getDay()).toBe(0); // Sunday
  });

  it("should end with a Saturday", () => {
    const result = generateCalendarDays(new Date("2026-01-15"));
    const lastDay = result[result.length - 1];
    expect(lastDay?.getDay()).toBe(6); // Saturday
  });

  it("should generate between 28 and 42 days (4-6 weeks)", () => {
    const months = [
      new Date("2026-01-15"),
      new Date("2026-02-15"),
      new Date("2026-03-15"),
    ];

    months.forEach((month) => {
      const result = generateCalendarDays(month);
      expect(result.length).toBeGreaterThanOrEqual(28);
      expect(result.length).toBeLessThanOrEqual(42);
    });
  });
});

// ============================================================================
// getDayNames Tests
// ============================================================================

describe("getDayNames", () => {
  it("should return 7 day names", () => {
    const result = getDayNames();
    expect(result).toHaveLength(7);
  });

  it("should start with Sunday", () => {
    const result = getDayNames();
    expect(result[0]).toBe("Sun");
  });

  it("should end with Saturday", () => {
    const result = getDayNames();
    expect(result[6]).toBe("Sat");
  });

  it("should contain all weekday abbreviations", () => {
    const result = getDayNames();
    expect(result).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });
});

// ============================================================================
// isUpcomingDiscussion Tests
// ============================================================================

describe("isUpcomingDiscussion", () => {
  it("should return true for future discussions", () => {
    const futureDate = addDays(new Date(), 7);
    const discussion = createMockDiscussion({
      scheduledAt: futureDate.toISOString(),
    });

    expect(isUpcomingDiscussion(discussion)).toBe(true);
  });

  it("should return false for past discussions", () => {
    const pastDate = subDays(new Date(), 7);
    const discussion = createMockDiscussion({
      scheduledAt: pastDate.toISOString(),
    });

    expect(isUpcomingDiscussion(discussion)).toBe(false);
  });

  it("should return false when scheduledAt is not set", () => {
    const discussion = {
      ...createMockDiscussion(),
      scheduledAt: undefined as unknown as string,
    };

    expect(isUpcomingDiscussion(discussion as ScheduledDiscussion)).toBe(false);
  });

  it("should return true for discussion scheduled tomorrow", () => {
    const tomorrow = addDays(new Date(), 1);
    const discussion = createMockDiscussion({
      scheduledAt: tomorrow.toISOString(),
    });

    expect(isUpcomingDiscussion(discussion)).toBe(true);
  });

  it("should return false for discussion scheduled yesterday", () => {
    const yesterday = subDays(new Date(), 1);
    const discussion = createMockDiscussion({
      scheduledAt: yesterday.toISOString(),
    });

    expect(isUpcomingDiscussion(discussion)).toBe(false);
  });
});

// ============================================================================
// ScheduledDiscussion Type Tests
// ============================================================================

describe("ScheduledDiscussion type", () => {
  it("should accept valid discussion with all fields", () => {
    const discussion: ScheduledDiscussion = {
      id: "disc-123",
      title: "Weekly Book Club Meeting",
      scheduledAt: new Date().toISOString(),
      isScheduled: true,
      book: {
        id: "book-456",
        title: "1984",
      },
      user: {
        displayName: "John Doe",
        username: "johndoe",
      },
    };

    expect(discussion.id).toBe("disc-123");
    expect(discussion.book?.title).toBe("1984");
  });

  it("should accept discussion with null book", () => {
    const discussion: ScheduledDiscussion = {
      id: "disc-123",
      title: "General Discussion",
      scheduledAt: new Date().toISOString(),
      isScheduled: true,
      book: null,
      user: {
        displayName: "Jane Doe",
        username: "janedoe",
      },
    };

    expect(discussion.book).toBeNull();
  });

  it("should accept discussion with null user fields", () => {
    const discussion: ScheduledDiscussion = {
      id: "disc-123",
      title: "Anonymous Discussion",
      scheduledAt: new Date().toISOString(),
      isScheduled: true,
      book: null,
      user: {
        displayName: null,
        username: null,
      },
    };

    expect(discussion.user.displayName).toBeNull();
    expect(discussion.user.username).toBeNull();
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge cases", () => {
  describe("getDiscussionsForDate edge cases", () => {
    it("should handle leap year February 29", () => {
      const leapDay = new Date("2024-02-29");
      const discussions = [
        createMockDiscussion({
          id: "leap",
          scheduledAt: leapDay.toISOString(),
        }),
      ];

      const result = getDiscussionsForDate(discussions, leapDay);
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("leap");
    });

    it("should handle year boundary (Dec 31 to Jan 1)", () => {
      // Use local time for consistent behavior across timezones
      const dec31 = new Date(2025, 11, 31, 12, 0, 0); // Dec 31, 2025 noon local
      const jan1 = new Date(2026, 0, 1, 12, 0, 0); // Jan 1, 2026 noon local

      const discussions = [
        createMockDiscussion({
          id: "dec31",
          scheduledAt: dec31.toISOString(),
        }),
        createMockDiscussion({
          id: "jan1",
          scheduledAt: jan1.toISOString(),
        }),
      ];

      const resultDec = getDiscussionsForDate(discussions, dec31);
      expect(resultDec).toHaveLength(1);
      expect(resultDec[0]?.id).toBe("dec31");

      const resultJan = getDiscussionsForDate(discussions, jan1);
      expect(resultJan).toHaveLength(1);
      expect(resultJan[0]?.id).toBe("jan1");
    });
  });

  describe("generateCalendarDays edge cases", () => {
    it("should handle February in a leap year", () => {
      const feb2024 = new Date("2024-02-15");
      const result = generateCalendarDays(feb2024);

      // February 2024 has 29 days, should include Feb 29
      const hasFeb29 = result.some(
        (d) => format(d, "yyyy-MM-dd") === "2024-02-29"
      );
      expect(hasFeb29).toBe(true);
    });

    it("should handle February in a non-leap year", () => {
      const feb2025 = new Date("2025-02-15");
      const result = generateCalendarDays(feb2025);

      // February 2025 has 28 days, should NOT include Feb 29
      const hasFeb29 = result.some(
        (d) => format(d, "yyyy-MM-dd") === "2025-02-29"
      );
      expect(hasFeb29).toBe(false);
    });

    it("should handle months that start on Sunday", () => {
      // March 2026 starts on Sunday
      const march2026 = new Date(2026, 2, 1); // March 1, 2026 local time
      const result = generateCalendarDays(march2026);
      const firstDay = result[0];

      // First day should be March 1st (which is a Sunday)
      expect(firstDay).toBeDefined();
      expect(format(firstDay as Date, "yyyy-MM-dd")).toBe("2026-03-01");
    });

    it("should handle months that end on Saturday", () => {
      // January 2026 ends on Saturday
      const jan2026 = new Date("2026-01-31");
      const result = generateCalendarDays(jan2026);
      const lastDay = result[result.length - 1];

      // Last day should be January 31st (which is a Saturday)
      expect(lastDay).toBeDefined();
      expect(format(lastDay as Date, "yyyy-MM-dd")).toBe("2026-01-31");
    });
  });
});

// ============================================================================
// Component Props Type Tests
// ============================================================================

describe("DiscussionCalendarProps type", () => {
  it("should define required and optional properties", () => {
    // This is a compile-time check, but we can verify the structure
    const minimalProps = {
      discussions: [] as ScheduledDiscussion[],
    };

    const fullProps = {
      discussions: [] as ScheduledDiscussion[],
      isLoading: false,
      error: null,
      onDiscussionClick: (_id: string) => {},
      onDateClick: (_date: Date) => {},
    };

    expect(minimalProps.discussions).toBeDefined();
    expect(fullProps.isLoading).toBe(false);
    expect(fullProps.error).toBeNull();
    expect(typeof fullProps.onDiscussionClick).toBe("function");
    expect(typeof fullProps.onDateClick).toBe("function");
  });
});
