/**
 * Explain This Feature Types
 *
 * Type definitions for the ExplainPopover component and related utilities.
 * This feature allows users to select text in the reader and get AI explanations.
 */

// =============================================================================
// EXPLANATION DATA TYPES
// =============================================================================

/**
 * A single explanation response from the AI
 */
export type ExplanationData = {
  /** Unique identifier */
  id: string;
  /** Book ID context */
  bookId: string;
  /** The selected text that was explained */
  selectedText: string;
  /** The AI explanation */
  explanation: string;
  /** Simpler explanation for lower reading levels */
  simplifiedExplanation?: string | undefined;
  /** Related concepts */
  relatedConcepts?: string[] | undefined;
  /** Example sentences */
  examples?: string[] | undefined;
  /** When the explanation was generated */
  generatedAt: string;
  /** Whether this was served from cache */
  cached?: boolean | undefined;
};

/**
 * Follow-up question and answer
 */
export type FollowUpItem = {
  /** The question asked */
  question: string;
  /** The answer received */
  answer: string;
  /** When the answer was generated */
  generatedAt: string;
};

/**
 * Context for explaining selected text
 */
export type ExplainContext = {
  /** The selected text to explain */
  selectedText: string;
  /** Surrounding text before selection */
  textBefore?: string;
  /** Surrounding text after selection */
  textAfter?: string;
  /** Book title for context */
  bookTitle?: string;
  /** Chapter/section title for context */
  chapterTitle?: string;
  /** User's reading level (beginner, intermediate, advanced) */
  readingLevel?: "beginner" | "intermediate" | "advanced";
};

// =============================================================================
// COMPONENT TYPES
// =============================================================================

/**
 * Props for ExplainPopover component
 */
export type ExplainPopoverProps = {
  /** Whether the popover is open */
  open: boolean;
  /** Anchor element for positioning */
  anchorEl: HTMLElement | null;
  /** The context for the explanation */
  context: ExplainContext | null;
  /** Callback when popover closes */
  onClose: () => void;
  /** Book ID for caching and API calls */
  bookId: string;
  /** Optional existing explanation data */
  initialData?: ExplanationData | null;
  /** Callback when explanation is generated */
  onExplain?: (data: ExplanationData) => void;
  /** Callback on error */
  onError?: (error: ExplainError) => void;
};

/**
 * State for manage follow-up questions
 */
export type FollowUpState = {
  /** List of follow-up Q&A pairs */
  items: FollowUpItem[];
  /** Whether a follow-up is being generated */
  isLoading: boolean;
  /** Input value for the follow-up question */
  inputValue: string;
};

// =============================================================================
// API/LOADING TYPES
// =============================================================================

/**
 * Loading state for explanation
 */
export type ExplainLoadingState = "idle" | "loading" | "streaming" | "error";

/**
 * Error types for explanation
 */
export type ExplainErrorType =
  | "network_error"
  | "rate_limited"
  | "ai_disabled"
  | "ai_unavailable"
  | "text_too_long"
  | "text_too_short"
  | "generation_failed"
  | "unknown";

/**
 * Error structure for explanation
 */
export type ExplainError = {
  type: ExplainErrorType;
  message: string;
  retryable: boolean;
};

/**
 * API request body for explain endpoint
 */
export type ExplainApiRequest = {
  bookId: string;
  selectedText: string;
  textBefore?: string | undefined;
  textAfter?: string | undefined;
  bookTitle?: string | undefined;
  chapterTitle?: string | undefined;
  readingLevel?: "beginner" | "intermediate" | "advanced" | undefined;
};

/**
 * API request for follow-up question
 */
export type FollowUpApiRequest = {
  bookId: string;
  selectedText: string;
  originalExplanation: string;
  question: string;
  readingLevel?: "beginner" | "intermediate" | "advanced" | undefined;
};

/**
 * API response shape for explain endpoint
 */
export type ExplainApiResponse = ExplanationData & {
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
};

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum text length for explanation */
export const MIN_TEXT_LENGTH = 2;

/** Maximum text length for explanation */
export const MAX_TEXT_LENGTH = 2000;

/** Maximum context length (before/after) */
export const MAX_CONTEXT_LENGTH = 500;

/** Maximum number of follow-up questions */
export const MAX_FOLLOW_UPS = 5;

/** Default initial follow-up state */
export const INITIAL_FOLLOW_UP_STATE: FollowUpState = {
  items: [],
  isLoading: false,
  inputValue: "",
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create an ExplainError
 */
export function createExplainError(
  type: ExplainErrorType,
  message?: string
): ExplainError {
  const defaultMessages: Record<ExplainErrorType, string> = {
    network_error: "Unable to connect. Please check your internet connection.",
    rate_limited: "Too many requests. Please wait a moment and try again.",
    ai_disabled:
      "AI features are disabled for your account. Enable them in settings.",
    ai_unavailable:
      "AI service is temporarily unavailable. Please try again later.",
    text_too_long:
      "Selected text is too long. Please select a shorter passage.",
    text_too_short:
      "Selected text is too short. Please select more text to explain.",
    generation_failed: "Failed to generate explanation. Please try again.",
    unknown: "An unexpected error occurred. Please try again.",
  };

  const retryableErrors: ExplainErrorType[] = [
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
 * Get user-friendly error message
 */
export function getExplainErrorMessage(error: ExplainError): string {
  return error.message;
}

/**
 * Parse API error response to ExplainError
 */
export function parseExplainApiError(
  status: number,
  errorCode?: string,
  errorMessage?: string
): ExplainError {
  if (status === 429) {
    return createExplainError("rate_limited", errorMessage);
  }
  if (status === 403) {
    if (errorCode === "AI_DISABLED" || errorMessage?.includes("AI")) {
      return createExplainError("ai_disabled", errorMessage);
    }
    return createExplainError("unknown", errorMessage);
  }
  if (status === 400) {
    if (errorCode === "TEXT_TOO_LONG" || errorMessage?.includes("too long")) {
      return createExplainError("text_too_long", errorMessage);
    }
    if (errorCode === "TEXT_TOO_SHORT" || errorMessage?.includes("too short")) {
      return createExplainError("text_too_short", errorMessage);
    }
    return createExplainError("unknown", errorMessage);
  }
  if (status === 503) {
    return createExplainError("ai_unavailable", errorMessage);
  }
  if (status >= 500) {
    return createExplainError("generation_failed", errorMessage);
  }
  if (status === 0) {
    return createExplainError("network_error");
  }
  return createExplainError("unknown", errorMessage);
}

/**
 * Validate selected text for explanation
 */
export function validateSelectedText(text: string | undefined | null): {
  valid: boolean;
  error?: ExplainError;
} {
  if (!text || typeof text !== "string") {
    return {
      valid: false,
      error: createExplainError("text_too_short"),
    };
  }

  const trimmed = text.trim();

  if (trimmed.length < MIN_TEXT_LENGTH) {
    return {
      valid: false,
      error: createExplainError("text_too_short"),
    };
  }

  if (trimmed.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: createExplainError("text_too_long"),
    };
  }

  return { valid: true };
}

/**
 * Truncate context text to max length
 */
export function truncateContext(
  text: string | undefined,
  maxLength: number = MAX_CONTEXT_LENGTH
): string | undefined {
  if (!text) return undefined;
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength);
}

/**
 * Build API request from context
 */
export function buildExplainRequest(
  context: ExplainContext,
  bookId: string
): ExplainApiRequest {
  return {
    bookId,
    selectedText: context.selectedText.trim(),
    textBefore: truncateContext(context.textBefore),
    textAfter: truncateContext(context.textAfter),
    bookTitle: context.bookTitle,
    chapterTitle: context.chapterTitle,
    readingLevel: context.readingLevel,
  };
}

/**
 * Build follow-up request
 */
export function buildFollowUpRequest(
  bookId: string,
  selectedText: string,
  originalExplanation: string,
  question: string,
  readingLevel?: "beginner" | "intermediate" | "advanced"
): FollowUpApiRequest {
  return {
    bookId,
    selectedText: selectedText.trim(),
    originalExplanation,
    question: question.trim(),
    readingLevel,
  };
}

/**
 * Check if can add more follow-ups
 */
export function canAddFollowUp(followUpState: FollowUpState): boolean {
  return (
    followUpState.items.length < MAX_FOLLOW_UPS && !followUpState.isLoading
  );
}

/**
 * Add a follow-up item to state
 */
export function addFollowUp(
  state: FollowUpState,
  question: string,
  answer: string
): FollowUpState {
  return {
    ...state,
    items: [
      ...state.items,
      {
        question,
        answer,
        generatedAt: new Date().toISOString(),
      },
    ],
    isLoading: false,
    inputValue: "",
  };
}

/**
 * Set follow-up loading state
 */
export function setFollowUpLoading(
  state: FollowUpState,
  isLoading: boolean
): FollowUpState {
  return {
    ...state,
    isLoading,
  };
}

/**
 * Update follow-up input value
 */
export function updateFollowUpInput(
  state: FollowUpState,
  inputValue: string
): FollowUpState {
  return {
    ...state,
    inputValue,
  };
}

/**
 * Clear follow-up history
 */
export function clearFollowUps(): FollowUpState {
  return { ...INITIAL_FOLLOW_UP_STATE };
}

/**
 * Generate a unique ID for explanation
 */
export function generateExplanationId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create an explanation data object from API response
 */
export function createExplanationData(
  bookId: string,
  selectedText: string,
  explanation: string,
  simplifiedExplanation?: string,
  relatedConcepts?: string[],
  examples?: string[],
  cached?: boolean
): ExplanationData {
  return {
    id: generateExplanationId(),
    bookId,
    selectedText,
    explanation,
    simplifiedExplanation,
    relatedConcepts,
    examples,
    generatedAt: new Date().toISOString(),
    cached,
  };
}

/**
 * Check if explanation has additional content
 */
export function hasAdditionalContent(data: ExplanationData | null): boolean {
  if (!data) return false;
  return !!(
    data.simplifiedExplanation ||
    (data.relatedConcepts && data.relatedConcepts.length > 0) ||
    (data.examples && data.examples.length > 0)
  );
}

/**
 * Get display text for reading level
 */
export function getReadingLevelLabel(
  level: "beginner" | "intermediate" | "advanced" | undefined
): string {
  if (!level) return "Default";
  const labels: Record<"beginner" | "intermediate" | "advanced", string> = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
  };
  return labels[level];
}

/**
 * Count total characters in context
 */
export function countContextChars(context: ExplainContext): number {
  return (
    (context.selectedText?.length ?? 0) +
    (context.textBefore?.length ?? 0) +
    (context.textAfter?.length ?? 0)
  );
}
