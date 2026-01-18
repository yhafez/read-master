/**
 * SM-2 Spaced Repetition Algorithm Implementation
 *
 * The SM-2 algorithm was developed by Piotr Wozniak for the SuperMemo 2 software.
 * It calculates the optimal interval for reviewing flashcards based on:
 * - The current interval (days since last review)
 * - The ease factor (how easy the card is for the user)
 * - The quality of the response (rating 1-4)
 *
 * Reference: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

/**
 * Rating values for flashcard reviews
 * 1 = Again (complete blackout, forgot the answer)
 * 2 = Hard (correct with significant difficulty)
 * 3 = Good (correct with some hesitation)
 * 4 = Easy (perfect recall with no hesitation)
 */
export type SrsRating = 1 | 2 | 3 | 4;

/**
 * Rating labels for user interface
 */
export const SRS_RATING_LABELS: Record<SrsRating, string> = {
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Easy",
};

/**
 * SM-2 algorithm constants
 */
export const SM2_CONSTANTS = {
  /** Minimum ease factor to prevent cards from becoming too difficult */
  MIN_EASE_FACTOR: 1.3,
  /** Default ease factor for new cards */
  DEFAULT_EASE_FACTOR: 2.5,
  /** Maximum ease factor */
  MAX_EASE_FACTOR: 3.0,
  /** Initial interval in days for first successful review */
  INITIAL_INTERVAL: 1,
  /** Second interval in days after two successful reviews */
  SECOND_INTERVAL: 6,
  /** Interval multiplier for Hard rating (60% of normal) */
  HARD_INTERVAL_MODIFIER: 0.6,
  /** Interval multiplier for Easy rating (130% of normal) */
  EASY_INTERVAL_MODIFIER: 1.3,
  /** Easy bonus added to ease factor */
  EASY_BONUS: 0.15,
} as const;

/**
 * Current state of a flashcard for SRS calculations
 */
export interface SrsCardState {
  /** Current ease factor (minimum 1.3, default 2.5) */
  easeFactor: number;
  /** Current interval in days until next review */
  interval: number;
  /** Number of consecutive successful reviews (rating >= 3) */
  repetitions: number;
}

/**
 * Result of an SRS review calculation
 */
export interface SrsReviewResult {
  /** New ease factor after review */
  newEaseFactor: number;
  /** New interval in days until next review */
  newInterval: number;
  /** New repetition count */
  newRepetitions: number;
  /** The due date for the next review */
  nextDueDate: Date;
  /** Whether this was a "lapse" (rating < 3 resets repetitions) */
  isLapse: boolean;
}

/**
 * Validates that a rating is within the valid range (1-4)
 */
export function isValidRating(rating: number): rating is SrsRating {
  return Number.isInteger(rating) && rating >= 1 && rating <= 4;
}

/**
 * Clamps the ease factor to the valid range [MIN_EASE_FACTOR, MAX_EASE_FACTOR]
 */
export function clampEaseFactor(easeFactor: number): number {
  return Math.max(
    SM2_CONSTANTS.MIN_EASE_FACTOR,
    Math.min(SM2_CONSTANTS.MAX_EASE_FACTOR, easeFactor)
  );
}

/**
 * Calculates the new ease factor based on the rating
 *
 * The SM-2 formula for ease factor adjustment:
 * EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 *
 * Where:
 * - EF = current ease factor
 * - q = quality of response (0-5 in original, mapped from 1-4 here)
 *
 * For our 1-4 rating scale, we map:
 * 1 (Again) -> q = 0 (complete blackout)
 * 2 (Hard)  -> q = 2 (correct with serious difficulty)
 * 3 (Good)  -> q = 4 (correct with some hesitation)
 * 4 (Easy)  -> q = 5 (perfect response)
 */
export function calculateNewEaseFactor(
  currentEaseFactor: number,
  rating: SrsRating
): number {
  // Map our 1-4 scale to the original SM-2 0-5 scale
  const qMap: Record<SrsRating, number> = {
    1: 0, // Again -> complete blackout
    2: 2, // Hard -> correct with serious difficulty
    3: 4, // Good -> correct with some hesitation
    4: 5, // Easy -> perfect response
  };

  const q = qMap[rating];

  // SM-2 ease factor formula
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  let newEaseFactor = currentEaseFactor + delta;

  // Add a small bonus for Easy rating to encourage mastery
  if (rating === 4) {
    newEaseFactor += SM2_CONSTANTS.EASY_BONUS;
  }

  // Clamp to valid range
  return clampEaseFactor(newEaseFactor);
}

/**
 * Calculates the new interval based on the rating and card state
 *
 * For ratings 1 (Again) and 2 (Hard):
 * - Reset to short intervals to reinforce learning
 *
 * For ratings 3 (Good) and 4 (Easy):
 * - If first review (repetitions = 0): interval = 1 day
 * - If second review (repetitions = 1): interval = 6 days
 * - Otherwise: interval = previous_interval * ease_factor
 *
 * Easy rating gets an additional 30% bonus to the interval
 */
export function calculateNewInterval(
  currentInterval: number,
  easeFactor: number,
  rating: SrsRating,
  repetitions: number
): number {
  // For "Again" (rating 1), reset to relearning
  if (rating === 1) {
    // Card goes back to the beginning
    return SM2_CONSTANTS.INITIAL_INTERVAL;
  }

  // For "Hard" (rating 2), reduce the interval but don't reset completely
  if (rating === 2) {
    // If this is an early review, use a shorter interval
    if (repetitions <= 1) {
      return SM2_CONSTANTS.INITIAL_INTERVAL;
    }
    // Otherwise, use a reduced interval (60% of what it would be with Good)
    const baseInterval = Math.round(currentInterval * easeFactor);
    return Math.max(
      1,
      Math.round(baseInterval * SM2_CONSTANTS.HARD_INTERVAL_MODIFIER)
    );
  }

  // For "Good" (rating 3) and "Easy" (rating 4)
  let newInterval: number;

  if (repetitions === 0) {
    // First successful review
    newInterval = SM2_CONSTANTS.INITIAL_INTERVAL;
  } else if (repetitions === 1) {
    // Second successful review
    newInterval = SM2_CONSTANTS.SECOND_INTERVAL;
  } else {
    // Subsequent reviews: interval * ease_factor
    newInterval = Math.round(currentInterval * easeFactor);
  }

  // Apply Easy bonus (130% of calculated interval)
  if (rating === 4) {
    newInterval = Math.round(
      newInterval * SM2_CONSTANTS.EASY_INTERVAL_MODIFIER
    );
  }

  // Ensure minimum interval of 1 day
  return Math.max(1, newInterval);
}

/**
 * Calculates the new repetition count based on the rating
 *
 * - Rating 1 (Again) or 2 (Hard): Reset to 0 (card needs relearning)
 * - Rating 3 (Good) or 4 (Easy): Increment by 1
 */
export function calculateNewRepetitions(
  currentRepetitions: number,
  rating: SrsRating
): number {
  // "Again" and "Hard" reset the repetition count (lapse)
  if (rating <= 2) {
    return 0;
  }

  // "Good" and "Easy" increment the repetition count
  return currentRepetitions + 1;
}

/**
 * Calculates the next due date based on the interval
 *
 * @param interval - The interval in days
 * @param fromDate - The date to calculate from (defaults to now)
 * @returns The date when the card is next due
 */
export function calculateNextDueDate(
  interval: number,
  fromDate: Date = new Date()
): Date {
  const dueDate = new Date(fromDate);
  dueDate.setDate(dueDate.getDate() + interval);
  // Set to start of day in UTC for consistency
  dueDate.setUTCHours(0, 0, 0, 0);
  return dueDate;
}

/**
 * Main function: Calculates the next review state for a flashcard
 *
 * This implements the SM-2 algorithm with modifications for our 1-4 rating scale:
 * - 1 (Again): Complete blackout, reset card
 * - 2 (Hard): Correct but with difficulty, reduce interval
 * - 3 (Good): Correct with some hesitation, normal progression
 * - 4 (Easy): Perfect recall, accelerated progression
 *
 * @param currentState - The current SRS state of the card
 * @param rating - The quality rating (1-4)
 * @param reviewDate - The date of the review (defaults to now)
 * @returns The new SRS state and next due date
 */
export function calculateNextReview(
  currentState: SrsCardState,
  rating: SrsRating,
  reviewDate: Date = new Date()
): SrsReviewResult {
  // Validate inputs
  if (!isValidRating(rating)) {
    throw new Error(`Invalid rating: ${rating}. Must be 1, 2, 3, or 4.`);
  }

  const { easeFactor, interval, repetitions } = currentState;

  // Calculate new values
  const newRepetitions = calculateNewRepetitions(repetitions, rating);
  const isLapse = newRepetitions === 0 && repetitions > 0;

  // For lapses, we use a reduced ease factor but not below minimum
  let newEaseFactor: number;
  if (isLapse) {
    // On lapse, reduce ease factor more aggressively
    newEaseFactor = calculateNewEaseFactor(easeFactor, rating);
  } else {
    newEaseFactor = calculateNewEaseFactor(easeFactor, rating);
  }

  // Calculate new interval based on the new state
  const newInterval = calculateNewInterval(
    interval,
    newEaseFactor,
    rating,
    repetitions
  );

  // Calculate next due date
  const nextDueDate = calculateNextDueDate(newInterval, reviewDate);

  return {
    newEaseFactor,
    newInterval,
    newRepetitions,
    nextDueDate,
    isLapse,
  };
}

/**
 * Creates a default SRS state for a new flashcard
 */
export function createDefaultSrsState(): SrsCardState {
  return {
    easeFactor: SM2_CONSTANTS.DEFAULT_EASE_FACTOR,
    interval: 0,
    repetitions: 0,
  };
}

/**
 * Determines if a card is due for review
 *
 * @param dueDate - The card's due date
 * @param now - The current date (defaults to now)
 * @returns true if the card is due or overdue
 */
export function isCardDue(dueDate: Date, now: Date = new Date()): boolean {
  return dueDate <= now;
}

/**
 * Calculates the number of days until a card is due
 *
 * @param dueDate - The card's due date
 * @param now - The current date (defaults to now)
 * @returns Negative if overdue, 0 if due today, positive if due in future
 */
export function daysUntilDue(dueDate: Date, now: Date = new Date()): number {
  const diffMs = dueDate.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculates retention rate from review history
 *
 * @param reviews - Array of ratings from review history
 * @returns Retention rate as a percentage (0-100)
 */
export function calculateRetentionRate(reviews: SrsRating[]): number {
  if (reviews.length === 0) {
    return 0;
  }

  // Count successful reviews (rating >= 3)
  const successfulReviews = reviews.filter((r) => r >= 3).length;
  return Math.round((successfulReviews / reviews.length) * 100);
}

/**
 * Predicts the next intervals for all possible ratings
 * Useful for showing the user what will happen for each choice
 *
 * @param currentState - The current SRS state of the card
 * @returns Object with predicted intervals for each rating
 */
export function predictNextIntervals(
  currentState: SrsCardState
): Record<SrsRating, number> {
  const predictions: Record<SrsRating, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  };

  for (const rating of [1, 2, 3, 4] as SrsRating[]) {
    const result = calculateNextReview(currentState, rating);
    predictions[rating] = result.newInterval;
  }

  return predictions;
}

/**
 * Formats an interval as a human-readable string
 *
 * @param days - The interval in days
 * @returns Human-readable string (e.g., "1 day", "2 weeks", "3 months")
 */
export function formatInterval(days: number): string {
  if (days < 1) {
    return "< 1 day";
  }

  if (days === 1) {
    return "1 day";
  }

  if (days < 7) {
    return `${days} days`;
  }

  if (days < 14) {
    return "1 week";
  }

  if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${weeks} weeks`;
  }

  if (days < 60) {
    return "1 month";
  }

  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} months`;
  }

  if (days < 730) {
    return "1 year";
  }

  const years = Math.round(days / 365);
  return `${years} years`;
}
