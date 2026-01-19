/**
 * Comprehension Check-In Types
 *
 * Type definitions for the ComprehensionCheckIn component.
 * Enables comprehension check-ins during reading to verify understanding.
 */

// =============================================================================
// CHECK-IN FREQUENCY TYPES
// =============================================================================

/**
 * Frequency options for comprehension check-ins
 */
export type CheckInFrequency = "never" | "sometimes" | "always";

/**
 * Frequency configuration with intervals
 * - never: No check-ins
 * - sometimes: Every 25% progress
 * - always: Every 10% progress
 */
export const CHECK_IN_FREQUENCY_CONFIG: Record<
  CheckInFrequency,
  { interval: number; label: string }
> = {
  never: { interval: 0, label: "Never" },
  sometimes: { interval: 25, label: "Occasionally (every 25%)" },
  always: { interval: 10, label: "Frequently (every 10%)" },
};

// =============================================================================
// QUESTION TYPES
// =============================================================================

/**
 * Types of comprehension check questions
 */
export type QuestionType = "multiple_choice" | "true_false" | "short_answer";

/**
 * An option for multiple choice questions
 */
export type QuestionOption = {
  /** Option identifier (a, b, c, d) */
  id: string;
  /** Option text */
  text: string;
  /** Whether this is the correct answer */
  isCorrect: boolean;
};

/**
 * A comprehension check question
 */
export type ComprehensionQuestion = {
  /** Unique identifier */
  id: string;
  /** The question text */
  question: string;
  /** Question type */
  type: QuestionType;
  /** Answer options (for multiple choice) */
  options?: QuestionOption[];
  /** Correct answer */
  correctAnswer: string;
  /** Explanation of the answer */
  explanation: string;
  /** Difficulty level (1-5) */
  difficulty: number;
  /** Text reference where answer is found */
  textReference?: string;
};

// =============================================================================
// COMPONENT TYPES
// =============================================================================

/**
 * Props for ComprehensionCheckIn component
 */
export type ComprehensionCheckInProps = {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
  /** Book ID for the check-in */
  bookId: string;
  /** Book title for display */
  bookTitle: string;
  /** Current reading progress percentage (0-100) */
  currentProgress: number;
  /** Recently read content for generating questions */
  recentContent: string;
  /** Chapter ID if available */
  chapterId?: string;
  /** Callback when user answers correctly */
  onCorrectAnswer?: () => void;
  /** Callback when user answers incorrectly */
  onIncorrectAnswer?: () => void;
  /** Callback when user skips the check-in */
  onSkip?: () => void;
};

/**
 * State for the check-in dialog
 */
export type CheckInState =
  | "loading"
  | "question"
  | "feedback_correct"
  | "feedback_incorrect"
  | "error";

/**
 * User's answer to a question
 */
export type UserAnswer = {
  /** Selected option ID (for multiple choice) or text (for short answer) */
  value: string;
  /** When the answer was submitted */
  submittedAt: string;
};

// =============================================================================
// API TYPES
// =============================================================================

/**
 * API request for comprehension check
 */
export type ComprehensionCheckApiRequest = {
  bookId: string;
  recentContent: string;
  questionType?: QuestionType;
  chapterId?: string;
};

/**
 * API response for comprehension check
 */
export type ComprehensionCheckApiResponse = {
  id: string;
  question: string;
  type: QuestionType;
  options: QuestionOption[];
  difficulty: number;
  textReference?: string;
  bookId: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
  durationMs: number;
};

/**
 * Stored answer in the backend
 */
export type StoredAnswer = {
  assessmentId: string;
  userAnswer: string;
  isCorrect: boolean;
  submittedAt: string;
};

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Error types for comprehension check
 */
export type CheckInErrorType =
  | "network_error"
  | "rate_limited"
  | "ai_disabled"
  | "ai_unavailable"
  | "content_too_short"
  | "generation_failed"
  | "unknown";

/**
 * Error structure
 */
export type CheckInError = {
  type: CheckInErrorType;
  message: string;
  retryable: boolean;
};

// =============================================================================
// STORAGE TYPES
// =============================================================================

/**
 * Check-in progress tracking (to prevent duplicate prompts)
 */
export type CheckInProgress = {
  bookId: string;
  /** Progress milestones that have been checked (e.g., [10, 20, 30]) */
  completedMilestones: number[];
  /** Last check-in timestamp */
  lastCheckInAt: string | null;
};

/** Storage key for check-in progress */
export const CHECK_IN_STORAGE_KEY = "read-master-comprehension-checkins";

/** Storage key for check-in frequency preference */
export const CHECK_IN_FREQUENCY_KEY = "read-master-checkin-frequency";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum content length for generating questions */
export const MIN_CONTENT_LENGTH = 100;

/** Maximum content length for API request */
export const MAX_CONTENT_LENGTH = 10000;

/** Default question type */
export const DEFAULT_QUESTION_TYPE: QuestionType = "multiple_choice";

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a CheckInError
 */
export function createCheckInError(
  type: CheckInErrorType,
  message?: string
): CheckInError {
  const defaultMessages: Record<CheckInErrorType, string> = {
    network_error: "Unable to connect. Please check your internet connection.",
    rate_limited: "Too many requests. Please wait and try again.",
    ai_disabled: "AI features are disabled. Enable them in settings.",
    ai_unavailable: "AI service is temporarily unavailable.",
    content_too_short:
      "Not enough content has been read for a comprehension check.",
    generation_failed: "Failed to generate question. Please try again.",
    unknown: "An unexpected error occurred.",
  };

  const retryableErrors: CheckInErrorType[] = [
    "network_error",
    "rate_limited",
    "ai_unavailable",
    "generation_failed",
  ];

  return {
    type,
    message: message ?? defaultMessages[type],
    retryable: retryableErrors.includes(type),
  };
}

/**
 * Parse API error to CheckInError
 */
export function parseCheckInApiError(
  status: number,
  errorCode?: string,
  errorMessage?: string
): CheckInError {
  if (status === 429) {
    return createCheckInError("rate_limited", errorMessage);
  }
  if (status === 403) {
    if (errorCode === "AI_DISABLED" || errorMessage?.includes("AI")) {
      return createCheckInError("ai_disabled", errorMessage);
    }
    return createCheckInError("unknown", errorMessage);
  }
  if (status === 400) {
    if (errorMessage?.includes("content") || errorMessage?.includes("short")) {
      return createCheckInError("content_too_short", errorMessage);
    }
    return createCheckInError("unknown", errorMessage);
  }
  if (status === 503) {
    return createCheckInError("ai_unavailable", errorMessage);
  }
  if (status >= 500) {
    return createCheckInError("generation_failed", errorMessage);
  }
  if (status === 0) {
    return createCheckInError("network_error");
  }
  return createCheckInError("unknown", errorMessage);
}

/**
 * Check if an answer is correct
 */
export function isAnswerCorrect(
  question: ComprehensionQuestion,
  userAnswer: string
): boolean {
  if (question.type === "multiple_choice") {
    // Find the selected option and check if it's correct
    const selected = question.options?.find((opt) => opt.id === userAnswer);
    return selected?.isCorrect ?? false;
  }

  if (question.type === "true_false") {
    return userAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
  }

  // For short answer, do a simple case-insensitive comparison
  // In production, this would be handled by AI grading
  return (
    userAnswer.toLowerCase().trim() ===
    question.correctAnswer.toLowerCase().trim()
  );
}

/**
 * Calculate next check-in milestone based on frequency
 */
export function calculateNextMilestone(
  currentProgress: number,
  frequency: CheckInFrequency,
  completedMilestones: number[]
): number | null {
  const config = CHECK_IN_FREQUENCY_CONFIG[frequency];
  if (config.interval === 0) return null;

  // Find the highest milestone that has been reached and not completed
  // Start from the highest reachable milestone and work down
  const highestReachableMilestone =
    Math.floor(currentProgress / config.interval) * config.interval;

  for (
    let milestone = highestReachableMilestone;
    milestone >= config.interval;
    milestone -= config.interval
  ) {
    if (!completedMilestones.includes(milestone)) {
      return milestone;
    }
  }

  return null;
}

/**
 * Check if a check-in should be triggered
 */
export function shouldTriggerCheckIn(
  currentProgress: number,
  frequency: CheckInFrequency,
  completedMilestones: number[]
): boolean {
  if (frequency === "never") return false;

  const config = CHECK_IN_FREQUENCY_CONFIG[frequency];
  if (config.interval === 0) return false;

  // Calculate which milestone we should have reached
  const currentMilestone =
    Math.floor(currentProgress / config.interval) * config.interval;

  // Check if we've crossed a milestone that hasn't been completed
  return (
    currentMilestone > 0 && !completedMilestones.includes(currentMilestone)
  );
}

/**
 * Get the current milestone from progress
 */
export function getCurrentMilestone(
  currentProgress: number,
  frequency: CheckInFrequency
): number {
  const config = CHECK_IN_FREQUENCY_CONFIG[frequency];
  if (config.interval === 0) return 0;
  return Math.floor(currentProgress / config.interval) * config.interval;
}

/**
 * Load check-in progress from storage
 */
export function loadCheckInProgress(bookId: string): CheckInProgress {
  try {
    const stored = localStorage.getItem(CHECK_IN_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, CheckInProgress>;
      const progress = parsed[bookId];
      if (progress) {
        return progress;
      }
    }
  } catch {
    // Ignore parse errors
  }

  return {
    bookId,
    completedMilestones: [],
    lastCheckInAt: null,
  };
}

/**
 * Save check-in progress to storage
 */
export function saveCheckInProgress(progress: CheckInProgress): void {
  try {
    const stored = localStorage.getItem(CHECK_IN_STORAGE_KEY);
    const all = stored
      ? (JSON.parse(stored) as Record<string, CheckInProgress>)
      : {};
    all[progress.bookId] = progress;
    localStorage.setItem(CHECK_IN_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Mark a milestone as completed
 */
export function markMilestoneCompleted(
  progress: CheckInProgress,
  milestone: number
): CheckInProgress {
  return {
    ...progress,
    completedMilestones: [...progress.completedMilestones, milestone],
    lastCheckInAt: new Date().toISOString(),
  };
}

/**
 * Load frequency preference from storage
 */
export function loadCheckInFrequency(): CheckInFrequency {
  try {
    const stored = localStorage.getItem(CHECK_IN_FREQUENCY_KEY);
    if (stored && ["never", "sometimes", "always"].includes(stored)) {
      return stored as CheckInFrequency;
    }
  } catch {
    // Ignore
  }
  return "sometimes"; // Default
}

/**
 * Save frequency preference to storage
 */
export function saveCheckInFrequency(frequency: CheckInFrequency): void {
  try {
    localStorage.setItem(CHECK_IN_FREQUENCY_KEY, frequency);
  } catch {
    // Ignore
  }
}

/**
 * Build API request for comprehension check
 */
export function buildCheckInApiRequest(
  bookId: string,
  recentContent: string,
  questionType: QuestionType = DEFAULT_QUESTION_TYPE,
  chapterId?: string
): ComprehensionCheckApiRequest {
  const request: ComprehensionCheckApiRequest = {
    bookId,
    recentContent: recentContent.slice(0, MAX_CONTENT_LENGTH),
    questionType,
  };

  if (chapterId !== undefined) {
    request.chapterId = chapterId;
  }

  return request;
}

/**
 * Parse API response to ComprehensionQuestion
 */
export function parseApiResponseToQuestion(
  response: ComprehensionCheckApiResponse
): ComprehensionQuestion {
  const question: ComprehensionQuestion = {
    id: response.id,
    question: response.question,
    type: response.type,
    options: response.options,
    correctAnswer: response.options?.find((opt) => opt.isCorrect)?.id ?? "",
    explanation: "", // Not returned in initial response
    difficulty: response.difficulty,
  };

  if (response.textReference !== undefined) {
    question.textReference = response.textReference;
  }

  return question;
}

/**
 * Get difficulty label
 */
export function getDifficultyLabel(difficulty: number): string {
  if (difficulty <= 1) return "Easy";
  if (difficulty <= 2) return "Moderate";
  if (difficulty <= 3) return "Medium";
  if (difficulty <= 4) return "Challenging";
  return "Hard";
}

/**
 * Get question type label
 */
export function getQuestionTypeLabel(type: QuestionType): string {
  const labels: Record<QuestionType, string> = {
    multiple_choice: "Multiple Choice",
    true_false: "True/False",
    short_answer: "Short Answer",
  };
  return labels[type];
}

/**
 * Validate content length for check-in
 */
export function validateContentLength(content: string): {
  valid: boolean;
  error?: CheckInError;
} {
  if (!content || content.length < MIN_CONTENT_LENGTH) {
    return {
      valid: false,
      error: createCheckInError("content_too_short"),
    };
  }
  return { valid: true };
}
