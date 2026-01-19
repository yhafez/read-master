/**
 * Assessment Types and Utilities
 *
 * Provides types, constants, and utility functions for assessment generation,
 * taking, grading, and results display. Includes timer management, scoring
 * logic, and state management helpers.
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Assessment type enum
 */
export type AssessmentType = "quick" | "standard" | "comprehensive";

/**
 * Bloom's taxonomy level
 */
export type BloomLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";

/**
 * Question type
 */
export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "essay"
  | "fill_blank";

/**
 * Assessment option for multiple choice questions
 */
export type AssessmentOption = {
  id: string;
  text: string;
};

/**
 * Assessment question
 */
export type AssessmentQuestion = {
  id: string;
  question: string;
  type: QuestionType;
  bloomLevel: BloomLevel;
  difficulty: number;
  points: number;
  options?: AssessmentOption[];
};

/**
 * Generated assessment from API
 */
export type GeneratedAssessment = {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  totalPoints: number;
  questions: AssessmentQuestion[];
  bloomDistribution: Record<BloomLevel, number>;
  bookId: string;
};

/**
 * User's answer to a question
 */
export type UserAnswer = {
  questionId: string;
  answer: string;
  timeSpentMs: number;
};

/**
 * Graded answer from API
 */
export type GradedAnswer = {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  score: number;
  feedback?: string;
  correctAnswer?: string;
};

/**
 * Assessment result
 */
export type AssessmentResult = {
  assessmentId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number;
  gradedAnswers: GradedAnswer[];
  bloomsBreakdown: Record<BloomLevel, number>;
};

/**
 * Assessment generation request
 */
export type GenerateAssessmentRequest = {
  bookId: string;
  assessmentType: AssessmentType;
  questionCount?: number;
  focusLevels?: BloomLevel[];
  chapterIds?: string[];
};

/**
 * Assessment submit request
 */
export type SubmitAssessmentRequest = {
  assessmentId: string;
  answers: UserAnswer[];
  timeSpent: number;
};

/**
 * Assessment state for UI
 */
export type AssessmentState =
  | "idle"
  | "generating"
  | "ready"
  | "in_progress"
  | "submitting"
  | "completed"
  | "error";

/**
 * Assessment error
 */
export type AssessmentError = {
  code: string;
  message: string;
};

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Assessment type options
 */
export const ASSESSMENT_TYPE_OPTIONS: AssessmentType[] = [
  "quick",
  "standard",
  "comprehensive",
];

/**
 * Bloom's levels in order
 */
export const BLOOM_LEVELS_ORDER: BloomLevel[] = [
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
  "create",
];

/**
 * Question type display names
 */
export const QUESTION_TYPE_DISPLAY: Record<QuestionType, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True/False",
  short_answer: "Short Answer",
  essay: "Essay",
  fill_blank: "Fill in the Blank",
};

/**
 * Default question counts by assessment type
 */
export const DEFAULT_QUESTION_COUNTS: Record<AssessmentType, number> = {
  quick: 5,
  standard: 10,
  comprehensive: 20,
};

/**
 * Estimated time per question type (in minutes)
 */
export const TIME_PER_QUESTION: Record<QuestionType, number> = {
  multiple_choice: 1,
  true_false: 0.5,
  short_answer: 2,
  essay: 5,
  fill_blank: 1,
};

/**
 * Minimum question count
 */
export const MIN_QUESTION_COUNT = 3;

/**
 * Maximum question count
 */
export const MAX_QUESTION_COUNT = 30;

/**
 * Bloom's level colors for visualization
 */
export const BLOOM_LEVEL_COLORS: Record<BloomLevel, string> = {
  remember: "#4caf50",
  understand: "#2196f3",
  apply: "#ff9800",
  analyze: "#9c27b0",
  evaluate: "#f44336",
  create: "#00bcd4",
};

/**
 * Bloom's level display names
 */
export const BLOOM_LEVEL_DISPLAY: Record<BloomLevel, string> = {
  remember: "Remember",
  understand: "Understand",
  apply: "Apply",
  analyze: "Analyze",
  evaluate: "Evaluate",
  create: "Create",
};

/**
 * Difficulty level labels
 */
export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Very Easy",
  2: "Easy",
  3: "Medium",
  4: "Hard",
  5: "Very Hard",
};

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates an assessment type
 */
export function isValidAssessmentType(type: string): type is AssessmentType {
  return ASSESSMENT_TYPE_OPTIONS.includes(type as AssessmentType);
}

/**
 * Validates a Bloom's level
 */
export function isValidBloomLevel(level: string): level is BloomLevel {
  return BLOOM_LEVELS_ORDER.includes(level as BloomLevel);
}

/**
 * Validates a question type
 */
export function isValidQuestionType(type: string): type is QuestionType {
  return Object.keys(QUESTION_TYPE_DISPLAY).includes(type);
}

/**
 * Validates question count
 */
export function isValidQuestionCount(count: number): boolean {
  return (
    Number.isInteger(count) &&
    count >= MIN_QUESTION_COUNT &&
    count <= MAX_QUESTION_COUNT
  );
}

/**
 * Validates an answer (non-empty string)
 */
export function isValidAnswer(answer: string | undefined): boolean {
  return typeof answer === "string" && answer.trim().length > 0;
}

// =============================================================================
// TIMER FUNCTIONS
// =============================================================================

/**
 * Formats time in seconds to MM:SS format
 */
export function formatTime(seconds: number): string {
  if (seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Formats time in seconds to human readable format
 */
export function formatTimeReadable(seconds: number): string {
  if (seconds < 0) return "0 seconds";
  if (seconds < 60) {
    return `${Math.round(seconds)} second${Math.round(seconds) !== 1 ? "s" : ""}`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (secs === 0) {
    return `${mins} minute${mins !== 1 ? "s" : ""}`;
  }
  return `${mins} minute${mins !== 1 ? "s" : ""} ${secs} second${secs !== 1 ? "s" : ""}`;
}

/**
 * Parses time string (MM:SS) to seconds
 */
export function parseTime(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length !== 2) return 0;
  const mins = parseInt(parts[0] ?? "0", 10);
  const secs = parseInt(parts[1] ?? "0", 10);
  if (isNaN(mins) || isNaN(secs)) return 0;
  return mins * 60 + secs;
}

/**
 * Calculates estimated time for assessment
 */
export function calculateEstimatedTime(
  questions: AssessmentQuestion[]
): number {
  return questions.reduce((total, q) => {
    return total + (TIME_PER_QUESTION[q.type] ?? 1);
  }, 0);
}

/**
 * Gets time warning status based on elapsed vs estimated time
 */
export function getTimeWarningStatus(
  elapsedSeconds: number,
  estimatedMinutes: number
): "normal" | "warning" | "critical" {
  const estimatedSeconds = estimatedMinutes * 60;
  const ratio = elapsedSeconds / estimatedSeconds;
  if (ratio >= 1.5) return "critical";
  if (ratio >= 1.0) return "warning";
  return "normal";
}

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

/**
 * Calculates percentage score
 */
export function calculatePercentage(score: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((score / total) * 100);
}

/**
 * Gets grade letter from percentage
 */
export function getGradeLetter(percentage: number): string {
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "F";
}

/**
 * Gets grade color from percentage
 */
export function getGradeColor(percentage: number): string {
  if (percentage >= 90) return "#4caf50"; // green
  if (percentage >= 80) return "#8bc34a"; // light green
  if (percentage >= 70) return "#ff9800"; // orange
  if (percentage >= 60) return "#ff5722"; // deep orange
  return "#f44336"; // red
}

/**
 * Calculates Bloom's breakdown from graded answers and questions
 */
export function calculateBloomsBreakdown(
  questions: AssessmentQuestion[],
  gradedAnswers: GradedAnswer[]
): Record<BloomLevel, number> {
  const breakdown: Record<BloomLevel, { correct: number; total: number }> = {
    remember: { correct: 0, total: 0 },
    understand: { correct: 0, total: 0 },
    apply: { correct: 0, total: 0 },
    analyze: { correct: 0, total: 0 },
    evaluate: { correct: 0, total: 0 },
    create: { correct: 0, total: 0 },
  };

  questions.forEach((q) => {
    const graded = gradedAnswers.find((a) => a.questionId === q.id);
    breakdown[q.bloomLevel].total += 1;
    if (graded?.isCorrect) {
      breakdown[q.bloomLevel].correct += 1;
    }
  });

  const result: Record<BloomLevel, number> = {
    remember: 0,
    understand: 0,
    apply: 0,
    analyze: 0,
    evaluate: 0,
    create: 0,
  };

  for (const level of BLOOM_LEVELS_ORDER) {
    const { correct, total } = breakdown[level];
    result[level] = total > 0 ? Math.round((correct / total) * 100) : 0;
  }

  return result;
}

// =============================================================================
// QUESTION NAVIGATION FUNCTIONS
// =============================================================================

/**
 * Creates initial answers state for questions
 */
export function createInitialAnswers(
  questions: AssessmentQuestion[]
): Map<string, UserAnswer> {
  const answers = new Map<string, UserAnswer>();
  questions.forEach((q) => {
    answers.set(q.id, {
      questionId: q.id,
      answer: "",
      timeSpentMs: 0,
    });
  });
  return answers;
}

/**
 * Checks if all questions have been answered
 */
export function areAllQuestionsAnswered(
  questions: AssessmentQuestion[],
  answers: Map<string, UserAnswer>
): boolean {
  return questions.every((q) => {
    const answer = answers.get(q.id);
    return isValidAnswer(answer?.answer);
  });
}

/**
 * Gets count of answered questions
 */
export function getAnsweredCount(
  questions: AssessmentQuestion[],
  answers: Map<string, UserAnswer>
): number {
  return questions.filter((q) => {
    const answer = answers.get(q.id);
    return isValidAnswer(answer?.answer);
  }).length;
}

/**
 * Gets indices of unanswered questions
 */
export function getUnansweredIndices(
  questions: AssessmentQuestion[],
  answers: Map<string, UserAnswer>
): number[] {
  return questions
    .map((q, index) => {
      const answer = answers.get(q.id);
      return isValidAnswer(answer?.answer) ? -1 : index;
    })
    .filter((index) => index !== -1);
}

// =============================================================================
// DISPLAY HELPER FUNCTIONS
// =============================================================================

/**
 * Gets assessment type display name
 */
export function getAssessmentTypeDisplay(type: AssessmentType): string {
  const displays: Record<AssessmentType, string> = {
    quick: "Quick Check",
    standard: "Standard",
    comprehensive: "Comprehensive",
  };
  return displays[type] ?? type;
}

/**
 * Gets assessment type description
 */
export function getAssessmentTypeDescription(type: AssessmentType): string {
  const descriptions: Record<AssessmentType, string> = {
    quick: "5 questions, ~5 minutes",
    standard: "10 questions, ~15 minutes",
    comprehensive: "20 questions, ~30 minutes",
  };
  return descriptions[type] ?? "";
}

/**
 * Gets difficulty display name
 */
export function getDifficultyDisplay(difficulty: number): string {
  return DIFFICULTY_LABELS[difficulty] ?? "Unknown";
}

/**
 * Gets Bloom's level description
 */
export function getBloomLevelDescription(level: BloomLevel): string {
  const descriptions: Record<BloomLevel, string> = {
    remember: "Recall facts and basic concepts",
    understand: "Explain ideas or concepts",
    apply: "Use information in new situations",
    analyze: "Draw connections among ideas",
    evaluate: "Justify a stand or decision",
    create: "Produce new or original work",
  };
  return descriptions[level] ?? "";
}

/**
 * Gets question type icon name (for MUI icons)
 */
export function getQuestionTypeIcon(type: QuestionType): string {
  const icons: Record<QuestionType, string> = {
    multiple_choice: "RadioButtonChecked",
    true_false: "CheckCircle",
    short_answer: "ShortText",
    essay: "Notes",
    fill_blank: "TextFields",
  };
  return icons[type] ?? "QuestionMark";
}

// =============================================================================
// STORAGE FUNCTIONS
// =============================================================================

const STORAGE_KEY_PREFIX = "assessment_";

/**
 * Saves assessment progress to localStorage
 */
export function saveAssessmentProgress(
  assessmentId: string,
  currentQuestionIndex: number,
  answers: Map<string, UserAnswer>,
  elapsedSeconds: number
): void {
  try {
    const data = {
      assessmentId,
      currentQuestionIndex,
      answers: Array.from(answers.entries()),
      elapsedSeconds,
      savedAt: Date.now(),
    };
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${assessmentId}`,
      JSON.stringify(data)
    );
  } catch {
    // Ignore storage errors
  }
}

/**
 * Loads assessment progress from localStorage
 */
export function loadAssessmentProgress(assessmentId: string): {
  currentQuestionIndex: number;
  answers: Map<string, UserAnswer>;
  elapsedSeconds: number;
} | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${assessmentId}`);
    if (!stored) return null;

    const data = JSON.parse(stored);
    if (data.assessmentId !== assessmentId) return null;

    // Check if progress is less than 24 hours old
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - data.savedAt > maxAge) {
      clearAssessmentProgress(assessmentId);
      return null;
    }

    return {
      currentQuestionIndex: data.currentQuestionIndex ?? 0,
      answers: new Map(data.answers ?? []),
      elapsedSeconds: data.elapsedSeconds ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Clears assessment progress from localStorage
 */
export function clearAssessmentProgress(assessmentId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${assessmentId}`);
  } catch {
    // Ignore storage errors
  }
}

// =============================================================================
// API RESPONSE HELPERS
// =============================================================================

/**
 * Parses API error response
 */
export function parseAssessmentError(error: unknown): AssessmentError {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error
  ) {
    return {
      code: String((error as { code: unknown }).code),
      message: String((error as { message: unknown }).message),
    };
  }
  return {
    code: "UNKNOWN_ERROR",
    message: error instanceof Error ? error.message : "An error occurred",
  };
}

/**
 * Gets user-friendly error message
 */
export function getAssessmentErrorMessage(error: AssessmentError): string {
  const messages: Record<string, string> = {
    AI_DISABLED: "AI features are disabled. Enable them in settings.",
    RATE_LIMIT_EXCEEDED: "Rate limit exceeded. Please try again later.",
    BOOK_NOT_FOUND: "Book not found.",
    CONTENT_TOO_SHORT: "Book content is too short for assessment generation.",
    GENERATION_FAILED: "Failed to generate assessment. Please try again.",
    SUBMISSION_FAILED: "Failed to submit assessment. Please try again.",
    UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
  };
  return messages[error.code] ?? error.message;
}
