/**
 * Date and Timezone Utilities
 *
 * Provides comprehensive date/time handling for the Read Master application.
 * All dates are stored in UTC in the database and converted to local time for display.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Supported date format styles
 */
export type DateFormatStyle = "short" | "medium" | "long" | "full";

/**
 * Supported time format styles
 */
export type TimeFormatStyle = "short" | "medium" | "long";

/**
 * Options for formatting dates
 */
export interface DateFormatOptions {
  /** Date format style */
  dateStyle?: DateFormatStyle;
  /** Time format style (omit to show date only) */
  timeStyle?: TimeFormatStyle;
  /** Timezone to display in (defaults to user's local timezone) */
  timezone?: string;
  /** Locale for formatting (defaults to 'en-US') */
  locale?: string;
}

/**
 * Options for relative time formatting
 */
export interface RelativeTimeOptions {
  /** Locale for formatting (defaults to 'en-US') */
  locale?: string;
  /** Whether to use numeric always (e.g., "1 day ago" vs "yesterday") */
  numeric?: "always" | "auto";
  /** Style of relative time (e.g., "long", "short", "narrow") */
  style?: "long" | "short" | "narrow";
}

/**
 * Time unit for relative time calculations
 */
export type TimeUnit =
  | "second"
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "year";

/**
 * Result of time difference calculation
 */
export interface TimeDifference {
  /** The numeric value of the difference */
  value: number;
  /** The unit of time */
  unit: TimeUnit;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Milliseconds per time unit
 */
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = MS_PER_SECOND * 60;
export const MS_PER_HOUR = MS_PER_MINUTE * 60;
export const MS_PER_DAY = MS_PER_HOUR * 24;
export const MS_PER_WEEK = MS_PER_DAY * 7;
export const MS_PER_MONTH = MS_PER_DAY * 30; // Approximate
export const MS_PER_YEAR = MS_PER_DAY * 365; // Approximate

/**
 * Common timezone identifiers
 */
export const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Manila",
  "Australia/Sydney",
] as const;

export type CommonTimezone = (typeof COMMON_TIMEZONES)[number];

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if a value is a valid Date object
 */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Check if a string is a valid timezone identifier
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse a date from various input formats
 * Returns null if parsing fails
 */
export function parseDate(
  input: string | number | Date | null | undefined
): Date | null {
  if (input === null || input === undefined) {
    return null;
  }

  if (input instanceof Date) {
    return isValidDate(input) ? input : null;
  }

  if (typeof input === "number") {
    const date = new Date(input);
    return isValidDate(date) ? date : null;
  }

  if (typeof input === "string") {
    // Try parsing as ISO string first
    const date = new Date(input);
    if (isValidDate(date)) {
      return date;
    }
    return null;
  }

  return null;
}

// ============================================================================
// UTC Functions
// ============================================================================

/**
 * Get the current date/time in UTC
 */
export function nowUTC(): Date {
  return new Date();
}

/**
 * Convert a local date to UTC
 * Note: JavaScript Dates are always stored as UTC internally,
 * this function is mainly for clarity in code
 */
export function toUTC(date: Date): Date {
  return new Date(date.toISOString());
}

/**
 * Get the start of today in UTC (00:00:00.000)
 */
export function startOfDayUTC(date: Date = new Date()): Date {
  const utcDate = new Date(date);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
}

/**
 * Get the end of today in UTC (23:59:59.999)
 */
export function endOfDayUTC(date: Date = new Date()): Date {
  const utcDate = new Date(date);
  utcDate.setUTCHours(23, 59, 59, 999);
  return utcDate;
}

/**
 * Get the start of the week in UTC (Monday 00:00:00.000)
 */
export function startOfWeekUTC(date: Date = new Date()): Date {
  const utcDate = new Date(date);
  const day = utcDate.getUTCDay();
  // Adjust to Monday (day 1). If Sunday (0), go back 6 days
  const diff = day === 0 ? 6 : day - 1;
  utcDate.setUTCDate(utcDate.getUTCDate() - diff);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
}

/**
 * Get the start of the month in UTC
 */
export function startOfMonthUTC(date: Date = new Date()): Date {
  const utcDate = new Date(date);
  utcDate.setUTCDate(1);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
}

/**
 * Add days to a date (returns new Date)
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Add hours to a date (returns new Date)
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setUTCHours(result.getUTCHours() + hours);
  return result;
}

/**
 * Add minutes to a date (returns new Date)
 */
export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setUTCMinutes(result.getUTCMinutes() + minutes);
  return result;
}

/**
 * Add months to a date (returns new Date)
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/**
 * Add years to a date (returns new Date)
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}

// ============================================================================
// Timezone Conversion Functions
// ============================================================================

/**
 * Get the user's local timezone
 */
export function getLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get the timezone offset in minutes for a given timezone at a specific date
 * Positive values mean behind UTC, negative values mean ahead of UTC
 */
export function getTimezoneOffset(
  timezone: string,
  date: Date = new Date()
): number {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  // Get the date parts in the target timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string): number => {
    const part = parts.find((p) => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };

  // Create a date in the target timezone
  const tzDate = new Date(
    Date.UTC(
      getPart("year"),
      getPart("month") - 1,
      getPart("day"),
      getPart("hour"),
      getPart("minute"),
      getPart("second")
    )
  );

  // Calculate offset in minutes
  return Math.round((date.getTime() - tzDate.getTime()) / MS_PER_MINUTE);
}

/**
 * Convert a date from one timezone to another
 * Returns the same instant in time, represented as if in the target timezone
 */
export function convertTimezone(
  date: Date,
  fromTimezone: string,
  toTimezone: string
): Date {
  if (!isValidTimezone(fromTimezone)) {
    throw new Error(`Invalid source timezone: ${fromTimezone}`);
  }
  if (!isValidTimezone(toTimezone)) {
    throw new Error(`Invalid target timezone: ${toTimezone}`);
  }

  // Get offsets for both timezones at this instant
  const fromOffset = getTimezoneOffset(fromTimezone, date);
  const toOffset = getTimezoneOffset(toTimezone, date);

  // Calculate the difference and apply it
  const offsetDiff = fromOffset - toOffset;
  return new Date(date.getTime() + offsetDiff * MS_PER_MINUTE);
}

/**
 * Get the current time in a specific timezone
 */
export function nowInTimezone(timezone: string): Date {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
  return convertTimezone(new Date(), "UTC", timezone);
}

// ============================================================================
// Date Formatting Functions
// ============================================================================

/**
 * Format a date according to the specified options
 */
export function formatDate(
  date: Date,
  options: DateFormatOptions = {}
): string {
  const {
    dateStyle = "medium",
    timeStyle,
    timezone = getLocalTimezone(),
    locale = "en-US",
  } = options;

  if (!isValidDate(date)) {
    return "Invalid date";
  }

  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    dateStyle,
  };

  if (timeStyle) {
    formatOptions.timeStyle = timeStyle;
  }

  try {
    return new Intl.DateTimeFormat(locale, formatOptions).format(date);
  } catch {
    // Fallback for unsupported locales
    return new Intl.DateTimeFormat("en-US", formatOptions).format(date);
  }
}

/**
 * Format a date as ISO string (for database storage)
 */
export function formatISO(date: Date): string {
  if (!isValidDate(date)) {
    throw new Error("Invalid date");
  }
  return date.toISOString();
}

/**
 * Format a date as a short date string (e.g., "Jan 15, 2024")
 */
export function formatShortDate(
  date: Date,
  locale: string = "en-US",
  timezone?: string
): string {
  return formatDate(date, {
    dateStyle: "medium",
    locale,
    timezone: timezone ?? getLocalTimezone(),
  });
}

/**
 * Format a time (e.g., "3:45 PM")
 */
export function formatTime(
  date: Date,
  locale: string = "en-US",
  timezone?: string
): string {
  if (!isValidDate(date)) {
    return "Invalid date";
  }

  const tz = timezone ?? getLocalTimezone();
  if (!isValidTimezone(tz)) {
    throw new Error(`Invalid timezone: ${tz}`);
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Format date and time together (e.g., "Jan 15, 2024, 3:45 PM")
 */
export function formatDateTime(
  date: Date,
  locale: string = "en-US",
  timezone?: string
): string {
  return formatDate(date, {
    dateStyle: "medium",
    timeStyle: "short",
    locale,
    timezone: timezone ?? getLocalTimezone(),
  });
}

// ============================================================================
// Relative Time Functions
// ============================================================================

/**
 * Calculate the difference between two dates and return the most appropriate unit
 */
export function getTimeDifference(
  date: Date,
  referenceDate: Date = new Date()
): TimeDifference {
  const diffMs = date.getTime() - referenceDate.getTime();
  const absDiffMs = Math.abs(diffMs);

  if (absDiffMs < MS_PER_MINUTE) {
    return { value: Math.round(diffMs / MS_PER_SECOND), unit: "second" };
  }
  if (absDiffMs < MS_PER_HOUR) {
    return { value: Math.round(diffMs / MS_PER_MINUTE), unit: "minute" };
  }
  if (absDiffMs < MS_PER_DAY) {
    return { value: Math.round(diffMs / MS_PER_HOUR), unit: "hour" };
  }
  if (absDiffMs < MS_PER_WEEK) {
    return { value: Math.round(diffMs / MS_PER_DAY), unit: "day" };
  }
  if (absDiffMs < MS_PER_MONTH) {
    return { value: Math.round(diffMs / MS_PER_WEEK), unit: "week" };
  }
  if (absDiffMs < MS_PER_YEAR) {
    return { value: Math.round(diffMs / MS_PER_MONTH), unit: "month" };
  }
  return { value: Math.round(diffMs / MS_PER_YEAR), unit: "year" };
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(
  date: Date,
  options: RelativeTimeOptions = {},
  referenceDate: Date = new Date()
): string {
  const { locale = "en-US", numeric = "auto", style = "long" } = options;

  if (!isValidDate(date)) {
    return "Invalid date";
  }

  const { value, unit } = getTimeDifference(date, referenceDate);

  try {
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric, style });
    return formatter.format(value, unit);
  } catch {
    // Fallback for unsupported locales
    const formatter = new Intl.RelativeTimeFormat("en-US", { numeric, style });
    return formatter.format(value, unit);
  }
}

/**
 * Get a human-readable "time ago" string
 * Alias for formatRelativeTime with past-focused defaults
 */
export function timeAgo(
  date: Date,
  locale: string = "en-US",
  referenceDate: Date = new Date()
): string {
  return formatRelativeTime(date, { locale, numeric: "auto" }, referenceDate);
}

/**
 * Get a human-readable "time until" string
 * For future dates, returns when something will happen
 */
export function timeUntil(
  date: Date,
  locale: string = "en-US",
  referenceDate: Date = new Date()
): string {
  return formatRelativeTime(date, { locale, numeric: "auto" }, referenceDate);
}

// ============================================================================
// Date Comparison Functions
// ============================================================================

/**
 * Check if two dates are the same day (in UTC)
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

/**
 * Check if a date is today (in UTC)
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Check if a date is yesterday (in UTC)
 */
export function isYesterday(date: Date): boolean {
  const yesterday = addDays(new Date(), -1);
  return isSameDay(date, yesterday);
}

/**
 * Check if a date is tomorrow (in UTC)
 */
export function isTomorrow(date: Date): boolean {
  const tomorrow = addDays(new Date(), 1);
  return isSameDay(date, tomorrow);
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date): boolean {
  return date.getTime() > Date.now();
}

/**
 * Check if a date is within the current week (in UTC, week starts Monday)
 */
export function isThisWeek(date: Date): boolean {
  const now = new Date();
  const weekStart = startOfWeekUTC(now);
  const weekEnd = addDays(weekStart, 7);
  return date >= weekStart && date < weekEnd;
}

/**
 * Check if a date is within the current month (in UTC)
 */
export function isThisMonth(date: Date): boolean {
  const now = new Date();
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth()
  );
}

/**
 * Check if a date is within the current year (in UTC)
 */
export function isThisYear(date: Date): boolean {
  return date.getUTCFullYear() === new Date().getUTCFullYear();
}

// ============================================================================
// Duration Functions
// ============================================================================

/**
 * Format a duration in seconds to human-readable string
 * e.g., 3661 -> "1h 1m 1s"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) {
    return "0s";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

/**
 * Format a duration in seconds to a longer human-readable string
 * e.g., 3661 -> "1 hour, 1 minute, 1 second"
 */
export function formatDurationLong(
  seconds: number,
  locale: string = "en-US"
): string {
  if (seconds < 0) {
    return formatDurationUnit(0, "second", locale);
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(formatDurationUnit(hours, "hour", locale));
  if (minutes > 0) parts.push(formatDurationUnit(minutes, "minute", locale));
  if (secs > 0 || parts.length === 0) {
    parts.push(formatDurationUnit(secs, "second", locale));
  }

  return parts.join(", ");
}

/**
 * Format a single duration unit with proper pluralization
 */
function formatDurationUnit(
  value: number,
  unit: string,
  locale: string
): string {
  try {
    // Use Intl.NumberFormat for proper pluralization
    const formatter = new Intl.NumberFormat(locale, {
      style: "unit",
      unit,
      unitDisplay: "long",
    });
    return formatter.format(value);
  } catch {
    // Fallback for environments without unit formatting
    const plural = value !== 1 ? "s" : "";
    return `${value} ${unit}${plural}`;
  }
}

/**
 * Parse a duration string to seconds
 * Supports formats like "1h 30m", "90m", "1:30:00", "5400s"
 */
export function parseDuration(input: string): number | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim().toLowerCase();

  // Try parsing HH:MM:SS or MM:SS format
  const colonMatch = trimmed.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (colonMatch) {
    const first = colonMatch[1];
    const second = colonMatch[2];
    const third = colonMatch[3];
    if (first !== undefined && second !== undefined && third !== undefined) {
      // HH:MM:SS format
      return (
        parseInt(first, 10) * 3600 +
        parseInt(second, 10) * 60 +
        parseInt(third, 10)
      );
    } else if (first !== undefined && second !== undefined) {
      // MM:SS format
      return parseInt(first, 10) * 60 + parseInt(second, 10);
    }
  }

  // Try parsing "1h 30m 45s" format
  let totalSeconds = 0;
  let hasMatch = false;

  const hourMatch = trimmed.match(/(\d+)\s*h(?:our)?s?/);
  if (hourMatch && hourMatch[1] !== undefined) {
    totalSeconds += parseInt(hourMatch[1], 10) * 3600;
    hasMatch = true;
  }

  const minuteMatch = trimmed.match(/(\d+)\s*m(?:in(?:ute)?)?s?/);
  if (minuteMatch && minuteMatch[1] !== undefined) {
    totalSeconds += parseInt(minuteMatch[1], 10) * 60;
    hasMatch = true;
  }

  const secondMatch = trimmed.match(/(\d+)\s*s(?:ec(?:ond)?)?s?/);
  if (secondMatch && secondMatch[1] !== undefined) {
    totalSeconds += parseInt(secondMatch[1], 10);
    hasMatch = true;
  }

  return hasMatch ? totalSeconds : null;
}

// ============================================================================
// Reading Time Estimation
// ============================================================================

/**
 * Calculate estimated reading time based on word count and reading speed
 * Returns time in seconds
 */
export function calculateReadingTime(
  wordCount: number,
  wordsPerMinute: number = 200
): number {
  if (wordCount <= 0 || wordsPerMinute <= 0) {
    return 0;
  }
  return Math.ceil((wordCount / wordsPerMinute) * 60);
}

/**
 * Format estimated reading time (e.g., "5 min read", "2 hour read")
 */
export function formatReadingTime(
  wordCount: number,
  wordsPerMinute: number = 200
): string {
  const seconds = calculateReadingTime(wordCount, wordsPerMinute);
  const minutes = Math.ceil(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min read`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hour read`;
  }

  return `${hours}h ${remainingMinutes}m read`;
}

// ============================================================================
// Streak Calculation Functions
// ============================================================================

/**
 * Check if two dates are consecutive days (in UTC)
 */
export function areConsecutiveDays(date1: Date, date2: Date): boolean {
  const d1 = startOfDayUTC(date1);
  const d2 = startOfDayUTC(date2);
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return diffMs === MS_PER_DAY;
}

/**
 * Calculate the current streak from a list of activity dates
 * Returns the number of consecutive days including today
 */
export function calculateStreak(activityDates: Date[]): number {
  if (activityDates.length === 0) {
    return 0;
  }

  // Sort dates in descending order (most recent first)
  const sortedDates = [...activityDates]
    .map((d) => startOfDayUTC(d))
    .sort((a, b) => b.getTime() - a.getTime());

  // Remove duplicates (same day)
  const uniqueDates: Date[] = [];
  for (const date of sortedDates) {
    const lastDate = uniqueDates[uniqueDates.length - 1];
    if (
      uniqueDates.length === 0 ||
      (lastDate !== undefined && !isSameDay(date, lastDate))
    ) {
      uniqueDates.push(date);
    }
  }

  const today = startOfDayUTC(new Date());
  const yesterday = addDays(today, -1);

  // Check if the most recent activity was today or yesterday
  const mostRecent = uniqueDates[0];
  if (mostRecent === undefined) {
    return 0;
  }
  if (!isSameDay(mostRecent, today) && !isSameDay(mostRecent, yesterday)) {
    return 0; // Streak broken
  }

  // Count consecutive days
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = uniqueDates[i - 1];
    const currDate = uniqueDates[i];
    if (
      prevDate !== undefined &&
      currDate !== undefined &&
      areConsecutiveDays(prevDate, currDate)
    ) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ============================================================================
// Export all functions for convenience
// ============================================================================

export const dateUtils = {
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
  MS_PER_MONTH,
  MS_PER_YEAR,
};
