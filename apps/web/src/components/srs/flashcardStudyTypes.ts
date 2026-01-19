/**
 * Flashcard Study Interface Types
 *
 * Type definitions for the FlashcardStudy component implementing SM-2 algorithm.
 * This module provides types for the study session interface with 4-rating responses.
 */

import type { FlashcardStatus, FlashcardType } from "./flashcardDeckTypes";

// =============================================================================
// SRS RATING TYPES (from shared package)
// =============================================================================

/**
 * SRS Rating values
 * 1 = Again (complete blackout)
 * 2 = Hard (correct with difficulty)
 * 3 = Good (correct with some hesitation)
 * 4 = Easy (perfect recall)
 */
export type SrsRating = 1 | 2 | 3 | 4;

/**
 * Rating button configuration
 */
export type RatingButtonConfig = {
  rating: SrsRating;
  labelKey: string;
  descriptionKey: string;
  color: "error" | "warning" | "info" | "success";
  shortcut: string;
};

/**
 * Rating button configurations
 */
export const RATING_BUTTONS: RatingButtonConfig[] = [
  {
    rating: 1,
    labelKey: "flashcards.study.again",
    descriptionKey: "flashcards.study.againDescription",
    color: "error",
    shortcut: "1",
  },
  {
    rating: 2,
    labelKey: "flashcards.study.hard",
    descriptionKey: "flashcards.study.hardDescription",
    color: "warning",
    shortcut: "2",
  },
  {
    rating: 3,
    labelKey: "flashcards.study.good",
    descriptionKey: "flashcards.study.goodDescription",
    color: "info",
    shortcut: "3",
  },
  {
    rating: 4,
    labelKey: "flashcards.study.easy",
    descriptionKey: "flashcards.study.easyDescription",
    color: "success",
    shortcut: "4",
  },
];

// =============================================================================
// FLASHCARD DATA TYPES
// =============================================================================

/**
 * Book reference for a flashcard
 */
export type StudyCardBook = {
  id: string;
  title: string;
  author: string | null;
};

/**
 * Single flashcard for study
 */
export type StudyCard = {
  /** Unique card ID */
  id: string;
  /** Front side (question/prompt) */
  front: string;
  /** Back side (answer) */
  back: string;
  /** Card type */
  type: FlashcardType;
  /** Current status */
  status: FlashcardStatus;
  /** Tags for organization */
  tags: string[];
  /** Associated book (if any) */
  book: StudyCardBook | null;
  /** SRS state */
  easeFactor: number;
  /** Current interval in days */
  interval: number;
  /** Number of consecutive successful reviews */
  repetitions: number;
  /** When the card is due */
  dueDate: string;
  /** Card creation date */
  createdAt: string;
};

/**
 * Study session state
 */
export type StudySessionState =
  | "loading"
  | "ready"
  | "studying"
  | "showingAnswer"
  | "submitting"
  | "completed"
  | "error";

/**
 * Study session progress
 */
export type StudyProgress = {
  /** Total cards in session */
  totalCards: number;
  /** Cards completed in this session */
  completedCards: number;
  /** Cards remaining */
  remainingCards: number;
  /** Correct answers (rating >= 3) */
  correctCount: number;
  /** Incorrect answers (rating < 3) */
  incorrectCount: number;
  /** Current card index (0-based) */
  currentIndex: number;
};

/**
 * Review result for a single card
 */
export type CardReviewResult = {
  cardId: string;
  rating: SrsRating;
  /** Time taken to reveal answer (ms) */
  responseTimeMs: number | null;
  /** New interval after review */
  newInterval: number;
  /** New due date after review */
  newDueDate: string;
  /** XP awarded */
  xpAwarded: number;
};

/**
 * Study session summary (shown at completion)
 */
export type StudySessionSummary = {
  /** Total cards studied */
  totalStudied: number;
  /** Cards answered correctly (rating >= 3) */
  correctCount: number;
  /** Cards answered incorrectly (rating < 3) */
  incorrectCount: number;
  /** Retention rate for this session */
  sessionRetentionRate: number;
  /** Total XP earned */
  totalXpEarned: number;
  /** Average response time (ms) */
  averageResponseTimeMs: number | null;
  /** Duration of study session (ms) */
  sessionDurationMs: number;
  /** Cards by rating breakdown */
  ratingBreakdown: Record<SrsRating, number>;
  /** Cards still due (if any) */
  cardsStillDue: number;
};

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Study error types
 */
export type StudyErrorType =
  | "network_error"
  | "no_cards_due"
  | "submission_failed"
  | "unauthorized"
  | "unknown";

/**
 * Study error structure
 */
export type StudyError = {
  type: StudyErrorType;
  message: string;
  retryable: boolean;
};

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for FlashcardStudy component
 */
export type FlashcardStudyProps = {
  /** Deck/book ID to study (optional, studies all if omitted) */
  deckId?: string;
  /** Maximum cards to study in this session */
  sessionLimit?: number;
  /** Callback when study session completes */
  onComplete?: (summary: StudySessionSummary) => void;
  /** Callback when user exits early */
  onExit?: () => void;
  /** Custom className */
  className?: string;
};

/**
 * Props for the card display component
 */
export type StudyCardDisplayProps = {
  /** Card to display */
  card: StudyCard;
  /** Whether to show the answer */
  showAnswer: boolean;
  /** Callback to show answer */
  onShowAnswer?: () => void;
  /** Whether the card is flipping */
  isFlipping?: boolean;
};

/**
 * Props for rating buttons component
 */
export type RatingButtonsProps = {
  /** Predicted intervals for each rating */
  predictedIntervals: Record<SrsRating, number>;
  /** Callback when rating is selected */
  onRate: (rating: SrsRating) => void;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Disabled state */
  disabled?: boolean;
};

/**
 * Props for session progress component
 */
export type StudyProgressDisplayProps = {
  /** Progress data */
  progress: StudyProgress;
  /** Show detailed stats */
  showDetails?: boolean;
};

/**
 * Props for session summary component
 */
export type StudySummaryProps = {
  /** Summary data */
  summary: StudySessionSummary;
  /** Callback to start new session */
  onStudyMore?: () => void;
  /** Callback to go back */
  onBack?: () => void;
};

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default session limit
 */
export const DEFAULT_SESSION_LIMIT = 20;

/**
 * Minimum cards for a study session
 */
export const MIN_SESSION_CARDS = 1;

/**
 * Time to show card before allowing answer reveal (ms)
 */
export const MIN_CARD_VIEW_TIME = 500;

/**
 * Animation duration for card flip (ms)
 */
export const CARD_FLIP_DURATION = 300;

/**
 * Keyboard shortcuts
 */
export const STUDY_SHORTCUTS = {
  SHOW_ANSWER: " ", // Space
  RATE_AGAIN: "1",
  RATE_HARD: "2",
  RATE_GOOD: "3",
  RATE_EASY: "4",
  UNDO: "u",
  EXIT: "Escape",
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create default study progress
 */
export function createDefaultProgress(totalCards: number): StudyProgress {
  return {
    totalCards,
    completedCards: 0,
    remainingCards: totalCards,
    correctCount: 0,
    incorrectCount: 0,
    currentIndex: 0,
  };
}

/**
 * Create a study error
 */
export function createStudyError(
  type: StudyErrorType,
  message?: string
): StudyError {
  const defaultMessages: Record<StudyErrorType, string> = {
    network_error: "Unable to connect. Please check your internet connection.",
    no_cards_due: "No cards are due for review right now.",
    submission_failed: "Failed to submit review. Please try again.",
    unauthorized: "You are not authorized to access these cards.",
    unknown: "An unexpected error occurred. Please try again.",
  };

  const retryableErrors: StudyErrorType[] = [
    "network_error",
    "submission_failed",
  ];

  return {
    type,
    message: message ?? defaultMessages[type],
    retryable: retryableErrors.includes(type),
  };
}

/**
 * Parse API error to study error
 */
export function parseStudyApiError(
  status: number,
  errorMessage?: string
): StudyError {
  if (status === 404) {
    return createStudyError("no_cards_due", errorMessage);
  }
  if (status === 401 || status === 403) {
    return createStudyError("unauthorized", errorMessage);
  }
  if (status === 0) {
    return createStudyError("network_error");
  }
  return createStudyError("unknown", errorMessage);
}

/**
 * Check if rating is a "success" (correct answer)
 */
export function isCorrectRating(rating: SrsRating): boolean {
  return rating >= 3;
}

/**
 * Check if rating is valid
 */
export function isValidRating(rating: number): rating is SrsRating {
  return Number.isInteger(rating) && rating >= 1 && rating <= 4;
}

/**
 * Get rating button config by rating
 */
export function getRatingConfig(rating: SrsRating): RatingButtonConfig {
  const config = RATING_BUTTONS.find((b) => b.rating === rating);
  if (!config) {
    throw new Error(`Invalid rating: ${rating}`);
  }
  return config;
}

/**
 * Calculate session retention rate
 */
export function calculateSessionRetention(
  correctCount: number,
  totalCount: number
): number {
  if (totalCount === 0) return 0;
  return Math.round((correctCount / totalCount) * 100);
}

/**
 * Calculate average response time
 */
export function calculateAverageResponseTime(
  times: (number | null)[]
): number | null {
  const validTimes = times.filter((t): t is number => t !== null && t > 0);
  if (validTimes.length === 0) return null;
  return Math.round(
    validTimes.reduce((sum, t) => sum + t, 0) / validTimes.length
  );
}

/**
 * Update progress after a review
 */
export function updateProgress(
  progress: StudyProgress,
  rating: SrsRating
): StudyProgress {
  const isCorrect = isCorrectRating(rating);
  return {
    ...progress,
    completedCards: progress.completedCards + 1,
    remainingCards: progress.remainingCards - 1,
    correctCount: progress.correctCount + (isCorrect ? 1 : 0),
    incorrectCount: progress.incorrectCount + (isCorrect ? 0 : 1),
    currentIndex: progress.currentIndex + 1,
  };
}

/**
 * Create session summary from results
 */
export function createSessionSummary(
  results: CardReviewResult[],
  sessionStartTime: number,
  cardsStillDue: number
): StudySessionSummary {
  const now = Date.now();
  const ratingBreakdown: Record<SrsRating, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

  let correctCount = 0;
  let totalXp = 0;
  const responseTimes: (number | null)[] = [];

  for (const result of results) {
    ratingBreakdown[result.rating]++;
    if (isCorrectRating(result.rating)) {
      correctCount++;
    }
    totalXp += result.xpAwarded;
    responseTimes.push(result.responseTimeMs);
  }

  return {
    totalStudied: results.length,
    correctCount,
    incorrectCount: results.length - correctCount,
    sessionRetentionRate: calculateSessionRetention(
      correctCount,
      results.length
    ),
    totalXpEarned: totalXp,
    averageResponseTimeMs: calculateAverageResponseTime(responseTimes),
    sessionDurationMs: now - sessionStartTime,
    ratingBreakdown,
    cardsStillDue,
  };
}

/**
 * Format interval for display (human-readable)
 */
export function formatIntervalDisplay(days: number): string {
  if (days < 1) return "< 1d";
  if (days === 1) return "1d";
  if (days < 7) return `${days}d`;
  if (days < 14) return "1w";
  if (days < 30) return `${Math.round(days / 7)}w`;
  if (days < 60) return "1mo";
  if (days < 365) return `${Math.round(days / 30)}mo`;
  if (days < 730) return "1y";
  return `${Math.round(days / 365)}y`;
}

/**
 * Format duration for display (mm:ss or hh:mm:ss)
 */
export function formatSessionDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Format response time for display
 */
export function formatResponseTime(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Check if session is complete
 */
export function isSessionComplete(progress: StudyProgress): boolean {
  return progress.remainingCards === 0;
}

/**
 * Get progress percentage
 */
export function getProgressPercentage(progress: StudyProgress): number {
  if (progress.totalCards === 0) return 0;
  return Math.round((progress.completedCards / progress.totalCards) * 100);
}

/**
 * Validate study card structure
 */
export function isValidStudyCard(card: unknown): card is StudyCard {
  if (!card || typeof card !== "object") return false;
  const c = card as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.front === "string" &&
    typeof c.back === "string" &&
    typeof c.type === "string" &&
    typeof c.status === "string" &&
    Array.isArray(c.tags) &&
    typeof c.easeFactor === "number" &&
    typeof c.interval === "number" &&
    typeof c.repetitions === "number" &&
    typeof c.dueDate === "string" &&
    typeof c.createdAt === "string"
  );
}

/**
 * Create empty study card (for testing/placeholder)
 */
export function createEmptyStudyCard(id: string = "test-card"): StudyCard {
  return {
    id,
    front: "",
    back: "",
    type: "CUSTOM",
    status: "NEW",
    tags: [],
    book: null,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get color for rating badge
 */
export function getRatingColor(
  rating: SrsRating
): "error" | "warning" | "info" | "success" {
  const config = getRatingConfig(rating);
  return config.color;
}

/**
 * Get retention badge color
 */
export function getRetentionBadgeColor(
  rate: number
): "success" | "warning" | "error" | "default" {
  if (rate >= 90) return "success";
  if (rate >= 70) return "warning";
  if (rate > 0) return "error";
  return "default";
}

/**
 * Check if card can be undone (only last card)
 */
export function canUndo(
  results: CardReviewResult[],
  maxUndos: number = 1
): boolean {
  // For now, only support undoing the last card
  return results.length > 0 && results.length <= maxUndos;
}

/**
 * Get shortcut description for help dialog
 */
export function getShortcutDescriptions(): Array<{
  key: string;
  action: string;
}> {
  return [
    { key: "Space", action: "Show answer" },
    { key: "1", action: "Rate Again" },
    { key: "2", action: "Rate Hard" },
    { key: "3", action: "Rate Good" },
    { key: "4", action: "Rate Easy" },
    { key: "Esc", action: "Exit study" },
  ];
}
