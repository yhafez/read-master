/**
 * Progress Tracking Types
 *
 * Type definitions and utilities for the ProgressTracker component
 * that displays reading progress (%, time, speed).
 */

// =============================================================================
// PROGRESS DATA TYPES
// =============================================================================

/**
 * Reading session data for tracking
 */
export type ReadingSession = {
  /** Session start timestamp (ms) */
  startTime: number;
  /** Total words read in this session */
  wordsRead: number;
  /** Total time spent reading (ms) */
  timeSpent: number;
  /** Last update timestamp */
  lastUpdate: number;
};

/**
 * Progress display data
 */
export type ProgressData = {
  /** Current position (page, character offset, etc.) */
  currentPosition: number;
  /** Total positions (total pages, total characters, etc.) */
  totalPositions: number;
  /** Percentage complete (0-100) */
  percentage: number;
  /** Words read in current session */
  wordsRead: number;
  /** Total word count of the book */
  totalWords: number;
  /** Time spent reading in current session (ms) */
  timeSpentMs: number;
  /** Estimated time remaining (ms) */
  timeRemainingMs: number;
  /** Current reading speed (words per minute) */
  wpm: number;
  /** Average reading speed across sessions */
  averageWpm: number;
};

/**
 * Time display format
 */
export type TimeDisplayFormat = "short" | "long" | "compact";

/**
 * Progress display mode
 */
export type ProgressDisplayMode = "minimal" | "standard" | "detailed";

// =============================================================================
// COMPONENT TYPES
// =============================================================================

/**
 * Props for ProgressTracker component
 */
export type ProgressTrackerProps = {
  /** Current position in the book */
  currentPosition: number;
  /** Total positions in the book */
  totalPositions: number;
  /** Total word count of the book */
  totalWords: number;
  /** Words read so far */
  wordsRead: number;
  /** Time spent reading (ms) */
  timeSpentMs: number;
  /** Average WPM from past sessions (optional) */
  averageWpm?: number;
  /** Display mode */
  displayMode?: ProgressDisplayMode;
  /** Show progress bar */
  showProgressBar?: boolean;
  /** Show percentage */
  showPercentage?: boolean;
  /** Show time remaining */
  showTimeRemaining?: boolean;
  /** Show reading speed */
  showSpeed?: boolean;
  /** Compact layout for mobile */
  compact?: boolean;
  /** Callback when user clicks on progress bar to navigate */
  onNavigate?: (percentage: number) => void;
};

/**
 * Progress bar segment for chapters
 */
export type ProgressBarSegment = {
  /** Segment start percentage (0-100) */
  start: number;
  /** Segment end percentage (0-100) */
  end: number;
  /** Segment label (chapter name) */
  label?: string;
  /** Whether this segment is completed */
  completed: boolean;
};

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default reading speed (WPM) for estimation when no history exists
 */
export const DEFAULT_WPM = 200;

/**
 * Minimum WPM threshold (below this is considered paused/idle)
 */
export const MIN_WPM_THRESHOLD = 50;

/**
 * Maximum reasonable WPM (above this is likely skimming)
 */
export const MAX_WPM_THRESHOLD = 1000;

/**
 * Minimum time spent to consider for WPM calculation (ms)
 */
export const MIN_TIME_FOR_WPM = 30000; // 30 seconds

/**
 * Time after which reading is considered "paused" (ms)
 */
export const READING_PAUSE_THRESHOLD = 60000; // 1 minute

/**
 * Milliseconds in common time units
 */
export const TIME_UNITS = {
  SECOND: 1000,
  MINUTE: 60000,
  HOUR: 3600000,
  DAY: 86400000,
} as const;

/**
 * Display mode defaults
 */
export const DISPLAY_MODE_DEFAULTS: Record<
  ProgressDisplayMode,
  {
    showProgressBar: boolean;
    showPercentage: boolean;
    showTimeRemaining: boolean;
    showSpeed: boolean;
  }
> = {
  minimal: {
    showProgressBar: true,
    showPercentage: true,
    showTimeRemaining: false,
    showSpeed: false,
  },
  standard: {
    showProgressBar: true,
    showPercentage: true,
    showTimeRemaining: true,
    showSpeed: false,
  },
  detailed: {
    showProgressBar: true,
    showPercentage: true,
    showTimeRemaining: true,
    showSpeed: true,
  },
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate percentage from position
 */
export function calculatePercentage(
  currentPosition: number,
  totalPositions: number
): number {
  if (totalPositions <= 0) return 0;
  if (currentPosition <= 0) return 0;
  if (currentPosition >= totalPositions) return 100;

  const percentage = (currentPosition / totalPositions) * 100;
  // Round to 1 decimal place
  return Math.round(percentage * 10) / 10;
}

/**
 * Calculate words per minute
 */
export function calculateWpm(wordsRead: number, timeSpentMs: number): number {
  if (wordsRead <= 0 || timeSpentMs <= 0) return 0;

  // Convert ms to minutes
  const minutes = timeSpentMs / TIME_UNITS.MINUTE;
  if (minutes < 0.001) return 0; // Avoid division by very small numbers

  const wpm = wordsRead / minutes;

  // Clamp to reasonable range
  if (wpm < MIN_WPM_THRESHOLD) return 0;
  if (wpm > MAX_WPM_THRESHOLD) return MAX_WPM_THRESHOLD;

  return Math.round(wpm);
}

/**
 * Estimate time remaining based on words left and reading speed
 */
export function estimateTimeRemaining(
  wordsRemaining: number,
  wpm: number
): number {
  if (wordsRemaining <= 0) return 0;

  const effectiveWpm = wpm > 0 ? wpm : DEFAULT_WPM;
  const minutesRemaining = wordsRemaining / effectiveWpm;

  return Math.round(minutesRemaining * TIME_UNITS.MINUTE);
}

/**
 * Format time duration for display
 */
export function formatDuration(
  ms: number,
  format: TimeDisplayFormat = "short"
): string {
  if (ms <= 0) return format === "compact" ? "0m" : "0 min";

  const totalSeconds = Math.floor(ms / TIME_UNITS.SECOND);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  switch (format) {
    case "compact":
      if (hours > 0) {
        return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
      }
      if (minutes > 0) {
        return `${minutes}m`;
      }
      return `${seconds}s`;

    case "long": {
      if (hours > 0) {
        const hourLabel = hours === 1 ? "hour" : "hours";
        const minLabel = minutes === 1 ? "minute" : "minutes";
        return minutes > 0
          ? `${hours} ${hourLabel}, ${minutes} ${minLabel}`
          : `${hours} ${hourLabel}`;
      }
      if (minutes > 0) {
        const minLabel = minutes === 1 ? "minute" : "minutes";
        return `${minutes} ${minLabel}`;
      }
      const secLabel = seconds === 1 ? "second" : "seconds";
      return `${seconds} ${secLabel}`;
    }

    case "short":
    default:
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      if (minutes > 0) {
        return `${minutes} min`;
      }
      return `${seconds} sec`;
  }
}

/**
 * Format percentage for display
 */
export function formatPercentage(
  percentage: number,
  decimalPlaces: number = 0
): string {
  const clamped = Math.min(Math.max(percentage, 0), 100);
  return `${clamped.toFixed(decimalPlaces)}%`;
}

/**
 * Format WPM for display
 */
export function formatWpm(wpm: number): string {
  if (wpm <= 0) return "-- WPM";
  return `${Math.round(wpm)} WPM`;
}

/**
 * Calculate words read based on position change
 */
export function calculateWordsRead(
  currentPosition: number,
  totalPositions: number,
  totalWords: number
): number {
  if (totalPositions <= 0 || totalWords <= 0) return 0;

  const ratio = currentPosition / totalPositions;
  return Math.round(ratio * totalWords);
}

/**
 * Calculate complete progress data from inputs
 */
export function calculateProgressData(params: {
  currentPosition: number;
  totalPositions: number;
  totalWords: number;
  wordsRead: number;
  timeSpentMs: number;
  averageWpm?: number;
}): ProgressData {
  const {
    currentPosition,
    totalPositions,
    totalWords,
    wordsRead,
    timeSpentMs,
    averageWpm,
  } = params;

  const percentage = calculatePercentage(currentPosition, totalPositions);
  const currentWpm = calculateWpm(wordsRead, timeSpentMs);

  // Use average WPM if available and current WPM is unreliable
  const effectiveWpm =
    timeSpentMs < MIN_TIME_FOR_WPM && averageWpm
      ? averageWpm
      : currentWpm > 0
        ? currentWpm
        : averageWpm || DEFAULT_WPM;

  const wordsRemaining = Math.max(totalWords - wordsRead, 0);
  const timeRemainingMs = estimateTimeRemaining(wordsRemaining, effectiveWpm);

  return {
    currentPosition,
    totalPositions,
    percentage,
    wordsRead,
    totalWords,
    timeSpentMs,
    timeRemainingMs,
    wpm: currentWpm,
    averageWpm: averageWpm || currentWpm,
  };
}

/**
 * Check if reading session appears to be active (not paused)
 */
export function isReadingActive(lastUpdateMs: number): boolean {
  const now = Date.now();
  const elapsed = now - lastUpdateMs;
  return elapsed < READING_PAUSE_THRESHOLD;
}

/**
 * Create initial reading session
 */
export function createReadingSession(): ReadingSession {
  const now = Date.now();
  return {
    startTime: now,
    wordsRead: 0,
    timeSpent: 0,
    lastUpdate: now,
  };
}

/**
 * Update reading session with new progress
 */
export function updateReadingSession(
  session: ReadingSession,
  wordsRead: number
): ReadingSession {
  const now = Date.now();
  const wasActive = isReadingActive(session.lastUpdate);

  // Only count time if reading was active (not paused)
  const additionalTime = wasActive ? now - session.lastUpdate : 0;

  return {
    ...session,
    wordsRead,
    timeSpent: session.timeSpent + additionalTime,
    lastUpdate: now,
  };
}

/**
 * Get display settings based on display mode
 */
export function getDisplaySettings(
  mode: ProgressDisplayMode,
  overrides?: Partial<{
    showProgressBar: boolean;
    showPercentage: boolean;
    showTimeRemaining: boolean;
    showSpeed: boolean;
  }>
): {
  showProgressBar: boolean;
  showPercentage: boolean;
  showTimeRemaining: boolean;
  showSpeed: boolean;
} {
  const defaults = DISPLAY_MODE_DEFAULTS[mode];
  return {
    showProgressBar: overrides?.showProgressBar ?? defaults.showProgressBar,
    showPercentage: overrides?.showPercentage ?? defaults.showPercentage,
    showTimeRemaining:
      overrides?.showTimeRemaining ?? defaults.showTimeRemaining,
    showSpeed: overrides?.showSpeed ?? defaults.showSpeed,
  };
}

/**
 * Create progress bar segments from chapter data
 */
export function createProgressSegments(
  chapters: Array<{
    title: string;
    startPosition: number;
    endPosition: number;
  }>,
  totalPositions: number,
  currentPosition: number
): ProgressBarSegment[] {
  if (chapters.length === 0 || totalPositions <= 0) {
    return [];
  }

  return chapters.map((chapter) => {
    const start = calculatePercentage(chapter.startPosition, totalPositions);
    const end = calculatePercentage(chapter.endPosition, totalPositions);
    const completed = currentPosition >= chapter.endPosition;

    return {
      start,
      end,
      label: chapter.title,
      completed,
    };
  });
}

/**
 * Validate progress tracker props
 */
export function validateProgressProps(props: ProgressTrackerProps): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof props.currentPosition !== "number" || props.currentPosition < 0) {
    errors.push("currentPosition must be a non-negative number");
  }

  if (typeof props.totalPositions !== "number" || props.totalPositions <= 0) {
    errors.push("totalPositions must be a positive number");
  }

  if (typeof props.totalWords !== "number" || props.totalWords <= 0) {
    errors.push("totalWords must be a positive number");
  }

  if (typeof props.wordsRead !== "number" || props.wordsRead < 0) {
    errors.push("wordsRead must be a non-negative number");
  }

  if (typeof props.timeSpentMs !== "number" || props.timeSpentMs < 0) {
    errors.push("timeSpentMs must be a non-negative number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
