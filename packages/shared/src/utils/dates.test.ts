import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  // Validation
  isValidDate,
  isValidTimezone,
  parseDate,
  // UTC
  nowUTC,
  toUTC,
  startOfDayUTC,
  endOfDayUTC,
  startOfWeekUTC,
  startOfMonthUTC,
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addYears,
  // Timezone
  getLocalTimezone,
  getTimezoneOffset,
  convertTimezone,
  nowInTimezone,
  // Formatting
  formatDate,
  formatISO,
  formatShortDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  timeAgo,
  timeUntil,
  getTimeDifference,
  // Comparison
  isSameDay,
  isToday,
  isYesterday,
  isTomorrow,
  isPast,
  isFuture,
  isThisWeek,
  isThisMonth,
  isThisYear,
  // Duration
  formatDuration,
  formatDurationLong,
  parseDuration,
  // Reading time
  calculateReadingTime,
  formatReadingTime,
  // Streaks
  areConsecutiveDays,
  calculateStreak,
  // Constants
  COMMON_TIMEZONES,
  MS_PER_SECOND,
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
  MS_PER_WEEK,
  // Utility object
  dateUtils,
} from "./dates";

describe("Date and Timezone Utilities", () => {
  // ============================================================================
  // Constants Tests
  // ============================================================================
  describe("Constants", () => {
    it("should have correct millisecond values", () => {
      expect(MS_PER_SECOND).toBe(1000);
      expect(MS_PER_MINUTE).toBe(60 * 1000);
      expect(MS_PER_HOUR).toBe(60 * 60 * 1000);
      expect(MS_PER_DAY).toBe(24 * 60 * 60 * 1000);
      expect(MS_PER_WEEK).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("should include common timezones", () => {
      expect(COMMON_TIMEZONES).toContain("UTC");
      expect(COMMON_TIMEZONES).toContain("America/New_York");
      expect(COMMON_TIMEZONES).toContain("Europe/London");
      expect(COMMON_TIMEZONES).toContain("Asia/Tokyo");
      expect(COMMON_TIMEZONES.length).toBeGreaterThan(10);
    });
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================
  describe("isValidDate", () => {
    it("should return true for valid Date objects", () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(new Date("2024-01-15"))).toBe(true);
      expect(isValidDate(new Date(0))).toBe(true);
    });

    it("should return false for invalid Date objects", () => {
      expect(isValidDate(new Date("invalid"))).toBe(false);
      expect(isValidDate(new Date(NaN))).toBe(false);
    });

    it("should return false for non-Date values", () => {
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
      expect(isValidDate("2024-01-15")).toBe(false);
      expect(isValidDate(1705305600000)).toBe(false);
      expect(isValidDate({})).toBe(false);
    });
  });

  describe("isValidTimezone", () => {
    it("should return true for valid timezones", () => {
      expect(isValidTimezone("UTC")).toBe(true);
      expect(isValidTimezone("America/New_York")).toBe(true);
      expect(isValidTimezone("Europe/London")).toBe(true);
      expect(isValidTimezone("Asia/Tokyo")).toBe(true);
    });

    it("should return false for invalid timezones", () => {
      expect(isValidTimezone("Invalid/Timezone")).toBe(false);
      expect(isValidTimezone("")).toBe(false);
      expect(isValidTimezone("NotATimezone/AtAll")).toBe(false);
    });
  });

  describe("parseDate", () => {
    it("should parse Date objects", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      expect(parseDate(date)).toEqual(date);
    });

    it("should parse ISO strings", () => {
      const result = parseDate("2024-01-15T12:00:00Z");
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe("2024-01-15T12:00:00.000Z");
    });

    it("should parse timestamps", () => {
      const timestamp = 1705320000000;
      const result = parseDate(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(timestamp);
    });

    it("should return null for invalid inputs", () => {
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
      expect(parseDate("invalid")).toBeNull();
      expect(parseDate(new Date("invalid"))).toBeNull();
    });
  });

  // ============================================================================
  // UTC Functions Tests
  // ============================================================================
  describe("nowUTC", () => {
    it("should return current date", () => {
      const before = Date.now();
      const result = nowUTC();
      const after = Date.now();

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe("toUTC", () => {
    it("should return a Date in UTC", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = toUTC(date);
      expect(result.toISOString()).toBe("2024-01-15T12:00:00.000Z");
    });
  });

  describe("startOfDayUTC", () => {
    it("should return start of day in UTC", () => {
      const date = new Date("2024-01-15T14:30:45.123Z");
      const result = startOfDayUTC(date);

      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
      expect(result.getUTCDate()).toBe(15);
    });

    it("should use current date when none provided", () => {
      const result = startOfDayUTC();
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
    });
  });

  describe("endOfDayUTC", () => {
    it("should return end of day in UTC", () => {
      const date = new Date("2024-01-15T14:30:45.123Z");
      const result = endOfDayUTC(date);

      expect(result.getUTCHours()).toBe(23);
      expect(result.getUTCMinutes()).toBe(59);
      expect(result.getUTCSeconds()).toBe(59);
      expect(result.getUTCMilliseconds()).toBe(999);
      expect(result.getUTCDate()).toBe(15);
    });
  });

  describe("startOfWeekUTC", () => {
    it("should return Monday for mid-week dates", () => {
      // Wednesday, Jan 17, 2024
      const date = new Date("2024-01-17T12:00:00Z");
      const result = startOfWeekUTC(date);

      expect(result.getUTCDay()).toBe(1); // Monday
      expect(result.getUTCDate()).toBe(15); // Jan 15, 2024
      expect(result.getUTCHours()).toBe(0);
    });

    it("should handle Sunday correctly", () => {
      // Sunday, Jan 21, 2024
      const date = new Date("2024-01-21T12:00:00Z");
      const result = startOfWeekUTC(date);

      expect(result.getUTCDay()).toBe(1); // Monday
      expect(result.getUTCDate()).toBe(15); // Previous Monday
    });

    it("should return same day for Monday", () => {
      // Monday, Jan 15, 2024
      const date = new Date("2024-01-15T12:00:00Z");
      const result = startOfWeekUTC(date);

      expect(result.getUTCDay()).toBe(1);
      expect(result.getUTCDate()).toBe(15);
    });
  });

  describe("startOfMonthUTC", () => {
    it("should return first day of month", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = startOfMonthUTC(date);

      expect(result.getUTCDate()).toBe(1);
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCHours()).toBe(0);
    });
  });

  describe("addDays", () => {
    it("should add positive days", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = addDays(date, 5);
      expect(result.getUTCDate()).toBe(20);
    });

    it("should subtract with negative days", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = addDays(date, -5);
      expect(result.getUTCDate()).toBe(10);
    });

    it("should not mutate original date", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      addDays(date, 5);
      expect(date.getUTCDate()).toBe(15);
    });

    it("should handle month boundaries", () => {
      const date = new Date("2024-01-31T12:00:00Z");
      const result = addDays(date, 1);
      expect(result.getUTCMonth()).toBe(1); // February
      expect(result.getUTCDate()).toBe(1);
    });
  });

  describe("addHours", () => {
    it("should add hours correctly", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = addHours(date, 5);
      expect(result.getUTCHours()).toBe(17);
    });

    it("should handle day boundaries", () => {
      const date = new Date("2024-01-15T23:00:00Z");
      const result = addHours(date, 3);
      expect(result.getUTCDate()).toBe(16);
      expect(result.getUTCHours()).toBe(2);
    });
  });

  describe("addMinutes", () => {
    it("should add minutes correctly", () => {
      const date = new Date("2024-01-15T12:30:00Z");
      const result = addMinutes(date, 45);
      expect(result.getUTCHours()).toBe(13);
      expect(result.getUTCMinutes()).toBe(15);
    });
  });

  describe("addMonths", () => {
    it("should add months correctly", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = addMonths(date, 3);
      expect(result.getUTCMonth()).toBe(3); // April
    });

    it("should handle year boundaries", () => {
      const date = new Date("2024-11-15T12:00:00Z");
      const result = addMonths(date, 3);
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(1); // February
    });
  });

  describe("addYears", () => {
    it("should add years correctly", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = addYears(date, 2);
      expect(result.getUTCFullYear()).toBe(2026);
    });
  });

  // ============================================================================
  // Timezone Functions Tests
  // ============================================================================
  describe("getLocalTimezone", () => {
    it("should return a valid timezone string", () => {
      const result = getLocalTimezone();
      expect(typeof result).toBe("string");
      expect(isValidTimezone(result)).toBe(true);
    });
  });

  describe("getTimezoneOffset", () => {
    it("should return 0 for UTC", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      expect(getTimezoneOffset("UTC", date)).toBe(0);
    });

    it("should throw for invalid timezone", () => {
      expect(() => getTimezoneOffset("Invalid/Timezone")).toThrow(
        "Invalid timezone"
      );
    });
  });

  describe("convertTimezone", () => {
    it("should convert between timezones", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = convertTimezone(date, "UTC", "America/New_York");
      expect(result).toBeInstanceOf(Date);
    });

    it("should throw for invalid source timezone", () => {
      const date = new Date();
      expect(() => convertTimezone(date, "Invalid", "UTC")).toThrow(
        "Invalid source timezone"
      );
    });

    it("should throw for invalid target timezone", () => {
      const date = new Date();
      expect(() => convertTimezone(date, "UTC", "Invalid")).toThrow(
        "Invalid target timezone"
      );
    });
  });

  describe("nowInTimezone", () => {
    it("should return a date for valid timezone", () => {
      const result = nowInTimezone("America/New_York");
      expect(result).toBeInstanceOf(Date);
    });

    it("should throw for invalid timezone", () => {
      expect(() => nowInTimezone("Invalid/Timezone")).toThrow(
        "Invalid timezone"
      );
    });
  });

  // ============================================================================
  // Formatting Tests
  // ============================================================================
  describe("formatDate", () => {
    it("should format date with default options", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = formatDate(date);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should format date with custom dateStyle", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = formatDate(date, { dateStyle: "long", timezone: "UTC" });
      expect(result).toContain("January");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });

    it("should include time when timeStyle is provided", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = formatDate(date, {
        dateStyle: "short",
        timeStyle: "short",
        timezone: "UTC",
      });
      expect(result).toContain("12");
    });

    it("should return 'Invalid date' for invalid dates", () => {
      const result = formatDate(new Date("invalid"));
      expect(result).toBe("Invalid date");
    });

    it("should throw for invalid timezone", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      expect(() => formatDate(date, { timezone: "Invalid" })).toThrow(
        "Invalid timezone"
      );
    });
  });

  describe("formatISO", () => {
    it("should format as ISO string", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      expect(formatISO(date)).toBe("2024-01-15T12:00:00.000Z");
    });

    it("should throw for invalid date", () => {
      expect(() => formatISO(new Date("invalid"))).toThrow("Invalid date");
    });
  });

  describe("formatShortDate", () => {
    it("should format as short date", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = formatShortDate(date, "en-US", "UTC");
      expect(result).toContain("Jan");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });
  });

  describe("formatTime", () => {
    it("should format time only", () => {
      const date = new Date("2024-01-15T14:30:00Z");
      const result = formatTime(date, "en-US", "UTC");
      expect(result).toContain("2");
      expect(result).toContain("30");
      expect(result).toContain("PM");
    });

    it("should return 'Invalid date' for invalid dates", () => {
      expect(formatTime(new Date("invalid"))).toBe("Invalid date");
    });
  });

  describe("formatDateTime", () => {
    it("should format both date and time", () => {
      const date = new Date("2024-01-15T14:30:00Z");
      const result = formatDateTime(date, "en-US", "UTC");
      expect(result).toContain("Jan");
      expect(result).toContain("15");
      expect(result).toContain("2024");
      expect(result).toContain("2");
      expect(result).toContain("30");
    });
  });

  // ============================================================================
  // Relative Time Tests
  // ============================================================================
  describe("getTimeDifference", () => {
    it("should return seconds for small differences", () => {
      const now = new Date();
      const date = new Date(now.getTime() - 30000); // 30 seconds ago
      const result = getTimeDifference(date, now);
      expect(result.unit).toBe("second");
      expect(result.value).toBe(-30);
    });

    it("should return minutes for minute-scale differences", () => {
      const now = new Date();
      const date = new Date(now.getTime() - 5 * MS_PER_MINUTE);
      const result = getTimeDifference(date, now);
      expect(result.unit).toBe("minute");
      expect(result.value).toBe(-5);
    });

    it("should return hours for hour-scale differences", () => {
      const now = new Date();
      const date = new Date(now.getTime() - 3 * MS_PER_HOUR);
      const result = getTimeDifference(date, now);
      expect(result.unit).toBe("hour");
      expect(result.value).toBe(-3);
    });

    it("should return days for day-scale differences", () => {
      const now = new Date();
      const date = new Date(now.getTime() - 2 * MS_PER_DAY);
      const result = getTimeDifference(date, now);
      expect(result.unit).toBe("day");
      expect(result.value).toBe(-2);
    });

    it("should handle future dates", () => {
      const now = new Date();
      const date = new Date(now.getTime() + 3 * MS_PER_DAY);
      const result = getTimeDifference(date, now);
      expect(result.unit).toBe("day");
      expect(result.value).toBe(3);
    });
  });

  describe("formatRelativeTime", () => {
    it("should format past dates", () => {
      const now = new Date();
      const date = new Date(now.getTime() - 2 * MS_PER_HOUR);
      const result = formatRelativeTime(date, {}, now);
      expect(result).toContain("2");
      expect(result.toLowerCase()).toContain("hour");
      expect(result).toContain("ago");
    });

    it("should format future dates", () => {
      const now = new Date();
      const date = new Date(now.getTime() + 3 * MS_PER_DAY);
      const result = formatRelativeTime(date, {}, now);
      expect(result).toContain("3");
      expect(result.toLowerCase()).toContain("day");
      expect(result).toContain("in");
    });

    it("should return 'Invalid date' for invalid dates", () => {
      expect(formatRelativeTime(new Date("invalid"))).toBe("Invalid date");
    });

    it("should respect numeric option", () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - MS_PER_DAY);
      const resultAuto = formatRelativeTime(
        yesterday,
        { numeric: "auto" },
        now
      );
      const resultAlways = formatRelativeTime(
        yesterday,
        { numeric: "always" },
        now
      );

      // Auto might say "yesterday", always will say "1 day ago"
      expect(typeof resultAuto).toBe("string");
      expect(typeof resultAlways).toBe("string");
    });
  });

  describe("timeAgo", () => {
    it("should format past dates", () => {
      const now = new Date();
      const date = new Date(now.getTime() - 5 * MS_PER_MINUTE);
      const result = timeAgo(date, "en-US", now);
      expect(result).toContain("5");
      expect(result.toLowerCase()).toContain("minute");
    });
  });

  describe("timeUntil", () => {
    it("should format future dates", () => {
      const now = new Date();
      const date = new Date(now.getTime() + 2 * MS_PER_WEEK);
      const result = timeUntil(date, "en-US", now);
      expect(result).toContain("2");
      expect(result.toLowerCase()).toContain("week");
    });
  });

  // ============================================================================
  // Comparison Tests
  // ============================================================================
  describe("isSameDay", () => {
    it("should return true for same day", () => {
      const date1 = new Date("2024-01-15T10:00:00Z");
      const date2 = new Date("2024-01-15T22:00:00Z");
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it("should return false for different days", () => {
      const date1 = new Date("2024-01-15T10:00:00Z");
      const date2 = new Date("2024-01-16T10:00:00Z");
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe("isToday", () => {
    it("should return true for today", () => {
      expect(isToday(new Date())).toBe(true);
    });

    it("should return false for yesterday", () => {
      const yesterday = addDays(new Date(), -1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe("isYesterday", () => {
    it("should return true for yesterday", () => {
      const yesterday = addDays(new Date(), -1);
      expect(isYesterday(yesterday)).toBe(true);
    });

    it("should return false for today", () => {
      expect(isYesterday(new Date())).toBe(false);
    });
  });

  describe("isTomorrow", () => {
    it("should return true for tomorrow", () => {
      const tomorrow = addDays(new Date(), 1);
      expect(isTomorrow(tomorrow)).toBe(true);
    });

    it("should return false for today", () => {
      expect(isTomorrow(new Date())).toBe(false);
    });
  });

  describe("isPast", () => {
    it("should return true for past dates", () => {
      const past = new Date(Date.now() - 1000);
      expect(isPast(past)).toBe(true);
    });

    it("should return false for future dates", () => {
      const future = new Date(Date.now() + 10000);
      expect(isPast(future)).toBe(false);
    });
  });

  describe("isFuture", () => {
    it("should return true for future dates", () => {
      const future = new Date(Date.now() + 10000);
      expect(isFuture(future)).toBe(true);
    });

    it("should return false for past dates", () => {
      const past = new Date(Date.now() - 1000);
      expect(isFuture(past)).toBe(false);
    });
  });

  describe("isThisWeek", () => {
    it("should return true for dates in current week", () => {
      expect(isThisWeek(new Date())).toBe(true);
    });

    it("should return false for dates outside current week", () => {
      const nextWeek = addDays(new Date(), 8);
      expect(isThisWeek(nextWeek)).toBe(false);
    });
  });

  describe("isThisMonth", () => {
    it("should return true for dates in current month", () => {
      expect(isThisMonth(new Date())).toBe(true);
    });

    it("should return false for dates in different month", () => {
      const nextMonth = addMonths(new Date(), 1);
      expect(isThisMonth(nextMonth)).toBe(false);
    });
  });

  describe("isThisYear", () => {
    it("should return true for dates in current year", () => {
      expect(isThisYear(new Date())).toBe(true);
    });

    it("should return false for dates in different year", () => {
      const nextYear = addYears(new Date(), 1);
      expect(isThisYear(nextYear)).toBe(false);
    });
  });

  // ============================================================================
  // Duration Tests
  // ============================================================================
  describe("formatDuration", () => {
    it("should format seconds only", () => {
      expect(formatDuration(45)).toBe("45s");
    });

    it("should format minutes and seconds", () => {
      expect(formatDuration(90)).toBe("1m 30s");
    });

    it("should format hours, minutes, and seconds", () => {
      expect(formatDuration(3661)).toBe("1h 1m 1s");
    });

    it("should format hours only when no seconds", () => {
      expect(formatDuration(3600)).toBe("1h");
    });

    it("should return '0s' for negative values", () => {
      expect(formatDuration(-10)).toBe("0s");
    });

    it("should return '0s' for zero", () => {
      expect(formatDuration(0)).toBe("0s");
    });
  });

  describe("formatDurationLong", () => {
    it("should format with full unit names", () => {
      const result = formatDurationLong(3661);
      expect(result).toContain("hour");
      expect(result).toContain("minute");
      expect(result).toContain("second");
    });

    it("should handle singular units", () => {
      const result = formatDurationLong(3601);
      expect(result).toContain("1");
      expect(result).toContain("hour");
    });

    it("should return '0 seconds' for zero", () => {
      const result = formatDurationLong(0);
      expect(result).toContain("0");
      expect(result.toLowerCase()).toContain("second");
    });
  });

  describe("parseDuration", () => {
    it("should parse HH:MM:SS format", () => {
      expect(parseDuration("1:30:45")).toBe(5445);
    });

    it("should parse MM:SS format", () => {
      expect(parseDuration("5:30")).toBe(330);
    });

    it("should parse hour format", () => {
      expect(parseDuration("2h")).toBe(7200);
      expect(parseDuration("2 hours")).toBe(7200);
    });

    it("should parse minute format", () => {
      expect(parseDuration("30m")).toBe(1800);
      expect(parseDuration("30 minutes")).toBe(1800);
      expect(parseDuration("30 min")).toBe(1800);
    });

    it("should parse second format", () => {
      expect(parseDuration("45s")).toBe(45);
      expect(parseDuration("45 seconds")).toBe(45);
    });

    it("should parse combined format", () => {
      expect(parseDuration("1h 30m")).toBe(5400);
      expect(parseDuration("2h 15m 30s")).toBe(8130);
    });

    it("should return null for invalid input", () => {
      expect(parseDuration("")).toBeNull();
      expect(parseDuration("invalid")).toBeNull();
      expect(parseDuration(null as unknown as string)).toBeNull();
    });
  });

  // ============================================================================
  // Reading Time Tests
  // ============================================================================
  describe("calculateReadingTime", () => {
    it("should calculate reading time in seconds", () => {
      // 1000 words at 200 wpm = 5 minutes = 300 seconds
      expect(calculateReadingTime(1000, 200)).toBe(300);
    });

    it("should round up to nearest second", () => {
      // 100 words at 200 wpm = 0.5 minutes = 30 seconds
      expect(calculateReadingTime(100, 200)).toBe(30);
    });

    it("should return 0 for 0 words", () => {
      expect(calculateReadingTime(0)).toBe(0);
    });

    it("should return 0 for negative values", () => {
      expect(calculateReadingTime(-100)).toBe(0);
      expect(calculateReadingTime(100, -200)).toBe(0);
    });

    it("should use default 200 wpm", () => {
      expect(calculateReadingTime(200)).toBe(60);
    });
  });

  describe("formatReadingTime", () => {
    it("should format as minutes for short reads", () => {
      expect(formatReadingTime(1000)).toBe("5 min read");
    });

    it("should format as hours for long reads", () => {
      // 24000 words at 200 wpm = 120 minutes = 2 hours exactly
      expect(formatReadingTime(24000)).toBe("2 hour read");
    });

    it("should show just hours when even", () => {
      expect(formatReadingTime(12000)).toBe("1 hour read");
    });

    it("should format hours and minutes", () => {
      expect(formatReadingTime(15000)).toBe("1h 15m read");
    });
  });

  // ============================================================================
  // Streak Tests
  // ============================================================================
  describe("areConsecutiveDays", () => {
    it("should return true for consecutive days", () => {
      const day1 = new Date("2024-01-15T12:00:00Z");
      const day2 = new Date("2024-01-16T10:00:00Z");
      expect(areConsecutiveDays(day1, day2)).toBe(true);
    });

    it("should return true regardless of order", () => {
      const day1 = new Date("2024-01-16T12:00:00Z");
      const day2 = new Date("2024-01-15T10:00:00Z");
      expect(areConsecutiveDays(day1, day2)).toBe(true);
    });

    it("should return false for same day", () => {
      const day1 = new Date("2024-01-15T10:00:00Z");
      const day2 = new Date("2024-01-15T20:00:00Z");
      expect(areConsecutiveDays(day1, day2)).toBe(false);
    });

    it("should return false for non-consecutive days", () => {
      const day1 = new Date("2024-01-15T12:00:00Z");
      const day2 = new Date("2024-01-17T12:00:00Z");
      expect(areConsecutiveDays(day1, day2)).toBe(false);
    });
  });

  describe("calculateStreak", () => {
    let mockDate: Date;

    beforeEach(() => {
      // Mock current date to 2024-01-17
      mockDate = new Date("2024-01-17T12:00:00Z");
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return 0 for empty array", () => {
      expect(calculateStreak([])).toBe(0);
    });

    it("should return 1 for activity today only", () => {
      const activities = [new Date("2024-01-17T10:00:00Z")];
      expect(calculateStreak(activities)).toBe(1);
    });

    it("should return 1 for activity yesterday only", () => {
      const activities = [new Date("2024-01-16T10:00:00Z")];
      expect(calculateStreak(activities)).toBe(1);
    });

    it("should return 0 for activity two days ago only", () => {
      const activities = [new Date("2024-01-15T10:00:00Z")];
      expect(calculateStreak(activities)).toBe(0);
    });

    it("should count consecutive days", () => {
      const activities = [
        new Date("2024-01-17T10:00:00Z"),
        new Date("2024-01-16T10:00:00Z"),
        new Date("2024-01-15T10:00:00Z"),
      ];
      expect(calculateStreak(activities)).toBe(3);
    });

    it("should handle gaps in activity", () => {
      const activities = [
        new Date("2024-01-17T10:00:00Z"),
        new Date("2024-01-16T10:00:00Z"),
        // Gap on Jan 15
        new Date("2024-01-14T10:00:00Z"),
      ];
      expect(calculateStreak(activities)).toBe(2);
    });

    it("should handle multiple activities on same day", () => {
      const activities = [
        new Date("2024-01-17T08:00:00Z"),
        new Date("2024-01-17T12:00:00Z"),
        new Date("2024-01-17T20:00:00Z"),
        new Date("2024-01-16T10:00:00Z"),
      ];
      expect(calculateStreak(activities)).toBe(2);
    });

    it("should handle unsorted dates", () => {
      const activities = [
        new Date("2024-01-15T10:00:00Z"),
        new Date("2024-01-17T10:00:00Z"),
        new Date("2024-01-16T10:00:00Z"),
      ];
      expect(calculateStreak(activities)).toBe(3);
    });
  });

  // ============================================================================
  // Utility Object Export Tests
  // ============================================================================
  describe("dateUtils export", () => {
    it("should export all validation functions", () => {
      expect(dateUtils.isValidDate).toBe(isValidDate);
      expect(dateUtils.isValidTimezone).toBe(isValidTimezone);
      expect(dateUtils.parseDate).toBe(parseDate);
    });

    it("should export all UTC functions", () => {
      expect(dateUtils.nowUTC).toBe(nowUTC);
      expect(dateUtils.startOfDayUTC).toBe(startOfDayUTC);
      expect(dateUtils.addDays).toBe(addDays);
    });

    it("should export all timezone functions", () => {
      expect(dateUtils.getLocalTimezone).toBe(getLocalTimezone);
      expect(dateUtils.convertTimezone).toBe(convertTimezone);
    });

    it("should export all formatting functions", () => {
      expect(dateUtils.formatDate).toBe(formatDate);
      expect(dateUtils.formatRelativeTime).toBe(formatRelativeTime);
      expect(dateUtils.timeAgo).toBe(timeAgo);
    });

    it("should export all comparison functions", () => {
      expect(dateUtils.isSameDay).toBe(isSameDay);
      expect(dateUtils.isToday).toBe(isToday);
      expect(dateUtils.isPast).toBe(isPast);
    });

    it("should export all duration functions", () => {
      expect(dateUtils.formatDuration).toBe(formatDuration);
      expect(dateUtils.parseDuration).toBe(parseDuration);
    });

    it("should export constants", () => {
      expect(dateUtils.COMMON_TIMEZONES).toBe(COMMON_TIMEZONES);
      expect(dateUtils.MS_PER_DAY).toBe(MS_PER_DAY);
    });
  });

  // ============================================================================
  // Edge Cases and Integration Tests
  // ============================================================================
  describe("Edge Cases", () => {
    it("should handle leap years correctly", () => {
      const feb28 = new Date("2024-02-28T12:00:00Z");
      const result = addDays(feb28, 1);
      expect(result.getUTCDate()).toBe(29); // 2024 is a leap year
    });

    it("should handle month-end correctly", () => {
      const jan31 = new Date("2024-01-31T12:00:00Z");
      const result = addMonths(jan31, 1);
      // Adding a month to Jan 31 might give Feb 29 or Mar 2 depending on implementation
      expect(result.getUTCMonth()).toBeGreaterThanOrEqual(1);
    });

    it("should handle DST transitions gracefully", () => {
      // March 10, 2024 is DST transition in US
      const beforeDst = new Date("2024-03-10T01:00:00Z");
      const afterAdd = addHours(beforeDst, 5);
      expect(afterAdd).toBeInstanceOf(Date);
      expect(isValidDate(afterAdd)).toBe(true);
    });

    it("should handle very old dates", () => {
      const oldDate = new Date("1900-01-01T12:00:00Z");
      expect(isValidDate(oldDate)).toBe(true);
      expect(formatDate(oldDate, { timezone: "UTC" })).toContain("1900");
    });

    it("should handle very future dates", () => {
      const futureDate = new Date("2100-12-31T12:00:00Z");
      expect(isValidDate(futureDate)).toBe(true);
      expect(formatDate(futureDate, { timezone: "UTC" })).toContain("2100");
    });
  });
});
