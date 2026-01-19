/**
 * Create Flashcard Dialog Types
 *
 * Type definitions and utilities for the manual flashcard creation dialog.
 * Supports creating flashcards with front/back content, type selection,
 * tags, and optional book linking.
 */

import type { FlashcardType } from "./flashcardDeckTypes";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum front content length */
export const MIN_FRONT_LENGTH = 1;

/** Maximum front content length */
export const MAX_FRONT_LENGTH = 500;

/** Minimum back content length */
export const MIN_BACK_LENGTH = 1;

/** Maximum back content length */
export const MAX_BACK_LENGTH = 2000;

/** Maximum number of tags allowed */
export const MAX_TAGS = 10;

/** Maximum length of a single tag */
export const MAX_TAG_LENGTH = 50;

/** LocalStorage key for default preferences */
export const PREFERENCES_KEY = "flashcard-create-preferences";

// =============================================================================
// FORM DATA TYPES
// =============================================================================

/**
 * Form data for creating a flashcard
 */
export type CreateFlashcardFormData = {
  /** Front side content (question/prompt) */
  front: string;
  /** Back side content (answer) */
  back: string;
  /** Flashcard type */
  type: FlashcardType;
  /** Tags for organization */
  tags: string[];
  /** Optional linked book ID */
  bookId: string | null;
};

/**
 * Default form data for new flashcard
 */
export const DEFAULT_FORM_DATA: CreateFlashcardFormData = {
  front: "",
  back: "",
  type: "CUSTOM",
  tags: [],
  bookId: null,
};

/**
 * User preferences for flashcard creation
 */
export type CreateFlashcardPreferences = {
  /** Default flashcard type */
  defaultType: FlashcardType;
  /** Recently used tags */
  recentTags: string[];
  /** Last used book ID */
  lastBookId: string | null;
};

/**
 * Default preferences
 */
export const DEFAULT_PREFERENCES: CreateFlashcardPreferences = {
  defaultType: "CUSTOM",
  recentTags: [],
  lastBookId: null,
};

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * Field-level validation error
 */
export type FieldError = {
  field: keyof CreateFlashcardFormData;
  messageKey: string;
  params?: Record<string, string | number>;
};

/**
 * Form validation result
 */
export type ValidationResult = {
  valid: boolean;
  errors: FieldError[];
};

// =============================================================================
// COMPONENT STATE TYPES
// =============================================================================

/**
 * Dialog state
 */
export type DialogState =
  | "idle"
  | "validating"
  | "submitting"
  | "success"
  | "error";

/**
 * Submission error
 */
export type SubmissionError = {
  messageKey: string;
  retryable: boolean;
};

/**
 * Book option for dropdown
 */
export type BookOption = {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
};

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for CreateFlashcardDialog
 */
export type CreateFlashcardDialogProps = {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when flashcard is successfully created */
  onSuccess?: (flashcard: CreatedFlashcard) => void;
  /** Pre-selected book ID (from deck view) */
  initialBookId?: string;
  /** Pre-filled front content (from text selection) */
  initialFront?: string;
  /** Pre-filled back content */
  initialBack?: string;
};

/**
 * Created flashcard response
 */
export type CreatedFlashcard = {
  id: string;
  front: string;
  back: string;
  type: FlashcardType;
  tags: string[];
  bookId: string | null;
  createdAt: string;
};

// =============================================================================
// TYPE CONFIGURATION
// =============================================================================

/**
 * Configuration for each flashcard type in the UI
 */
export type FlashcardTypeConfig = {
  value: FlashcardType;
  labelKey: string;
  descriptionKey: string;
  icon: string;
};

/**
 * Available flashcard types with UI configuration
 */
export const FLASHCARD_TYPE_CONFIGS: FlashcardTypeConfig[] = [
  {
    value: "CUSTOM",
    labelKey: "flashcards.create.types.custom",
    descriptionKey: "flashcards.create.types.customDescription",
    icon: "edit",
  },
  {
    value: "VOCABULARY",
    labelKey: "flashcards.create.types.vocabulary",
    descriptionKey: "flashcards.create.types.vocabularyDescription",
    icon: "abc",
  },
  {
    value: "CONCEPT",
    labelKey: "flashcards.create.types.concept",
    descriptionKey: "flashcards.create.types.conceptDescription",
    icon: "lightbulb",
  },
  {
    value: "COMPREHENSION",
    labelKey: "flashcards.create.types.comprehension",
    descriptionKey: "flashcards.create.types.comprehensionDescription",
    icon: "quiz",
  },
  {
    value: "QUOTE",
    labelKey: "flashcards.create.types.quote",
    descriptionKey: "flashcards.create.types.quoteDescription",
    icon: "format_quote",
  },
];

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Check if front content is valid
 */
export function isValidFront(front: string): boolean {
  const trimmed = front.trim();
  return (
    trimmed.length >= MIN_FRONT_LENGTH && trimmed.length <= MAX_FRONT_LENGTH
  );
}

/**
 * Check if back content is valid
 */
export function isValidBack(back: string): boolean {
  const trimmed = back.trim();
  return trimmed.length >= MIN_BACK_LENGTH && trimmed.length <= MAX_BACK_LENGTH;
}

/**
 * Check if a single tag is valid
 */
export function isValidTag(tag: string): boolean {
  const trimmed = tag.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_TAG_LENGTH;
}

/**
 * Check if tags array is valid
 */
export function isValidTags(tags: string[]): boolean {
  if (tags.length > MAX_TAGS) return false;
  return tags.every(isValidTag);
}

/**
 * Check if flashcard type is valid
 */
export function isValidType(type: string): type is FlashcardType {
  const validTypes: FlashcardType[] = [
    "VOCABULARY",
    "CONCEPT",
    "COMPREHENSION",
    "QUOTE",
    "CUSTOM",
  ];
  return validTypes.includes(type as FlashcardType);
}

/**
 * Validate form data and return all errors
 */
export function validateFormData(
  data: CreateFlashcardFormData
): ValidationResult {
  const errors: FieldError[] = [];

  // Validate front
  if (!data.front.trim()) {
    errors.push({
      field: "front",
      messageKey: "flashcards.create.errors.frontRequired",
    });
  } else if (data.front.trim().length < MIN_FRONT_LENGTH) {
    errors.push({
      field: "front",
      messageKey: "flashcards.create.errors.frontTooShort",
      params: { min: MIN_FRONT_LENGTH },
    });
  } else if (data.front.trim().length > MAX_FRONT_LENGTH) {
    errors.push({
      field: "front",
      messageKey: "flashcards.create.errors.frontTooLong",
      params: { max: MAX_FRONT_LENGTH },
    });
  }

  // Validate back
  if (!data.back.trim()) {
    errors.push({
      field: "back",
      messageKey: "flashcards.create.errors.backRequired",
    });
  } else if (data.back.trim().length < MIN_BACK_LENGTH) {
    errors.push({
      field: "back",
      messageKey: "flashcards.create.errors.backTooShort",
      params: { min: MIN_BACK_LENGTH },
    });
  } else if (data.back.trim().length > MAX_BACK_LENGTH) {
    errors.push({
      field: "back",
      messageKey: "flashcards.create.errors.backTooLong",
      params: { max: MAX_BACK_LENGTH },
    });
  }

  // Validate type
  if (!isValidType(data.type)) {
    errors.push({
      field: "type",
      messageKey: "flashcards.create.errors.invalidType",
    });
  }

  // Validate tags
  if (data.tags.length > MAX_TAGS) {
    errors.push({
      field: "tags",
      messageKey: "flashcards.create.errors.tooManyTags",
      params: { max: MAX_TAGS },
    });
  }
  const invalidTag = data.tags.find((tag) => !isValidTag(tag));
  if (invalidTag) {
    errors.push({
      field: "tags",
      messageKey: "flashcards.create.errors.invalidTag",
      params: { maxLength: MAX_TAG_LENGTH },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get error message for a specific field
 */
export function getFieldError(
  result: ValidationResult,
  field: keyof CreateFlashcardFormData
): FieldError | undefined {
  return result.errors.find((e) => e.field === field);
}

/**
 * Check if a specific field has an error
 */
export function hasFieldError(
  result: ValidationResult,
  field: keyof CreateFlashcardFormData
): boolean {
  return result.errors.some((e) => e.field === field);
}

// =============================================================================
// FORM HELPERS
// =============================================================================

/**
 * Create form data with initial values
 */
export function createFormData(
  initial?: Partial<CreateFlashcardFormData>
): CreateFlashcardFormData {
  return {
    ...DEFAULT_FORM_DATA,
    ...initial,
  };
}

/**
 * Update a single field in form data
 */
export function updateFormField<K extends keyof CreateFlashcardFormData>(
  data: CreateFlashcardFormData,
  field: K,
  value: CreateFlashcardFormData[K]
): CreateFlashcardFormData {
  return {
    ...data,
    [field]: value,
  };
}

/**
 * Add a tag to form data
 */
export function addTag(
  data: CreateFlashcardFormData,
  tag: string
): CreateFlashcardFormData {
  const trimmedTag = tag.trim();
  if (
    !trimmedTag ||
    data.tags.includes(trimmedTag) ||
    data.tags.length >= MAX_TAGS
  ) {
    return data;
  }
  return {
    ...data,
    tags: [...data.tags, trimmedTag],
  };
}

/**
 * Remove a tag from form data
 */
export function removeTag(
  data: CreateFlashcardFormData,
  tag: string
): CreateFlashcardFormData {
  return {
    ...data,
    tags: data.tags.filter((t) => t !== tag),
  };
}

/**
 * Reset form data to defaults
 */
export function resetFormData(
  preferences?: CreateFlashcardPreferences
): CreateFlashcardFormData {
  return {
    ...DEFAULT_FORM_DATA,
    type: preferences?.defaultType ?? DEFAULT_FORM_DATA.type,
    bookId: preferences?.lastBookId ?? null,
  };
}

// =============================================================================
// PREFERENCE HELPERS
// =============================================================================

/**
 * Load preferences from localStorage
 */
export function loadPreferences(): CreateFlashcardPreferences {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<CreateFlashcardPreferences>;
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
      };
    }
  } catch {
    // Ignore parsing errors
  }
  return DEFAULT_PREFERENCES;
}

/**
 * Save preferences to localStorage
 */
export function savePreferences(preferences: CreateFlashcardPreferences): void {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Update preferences with new tag
 */
export function updateRecentTags(
  preferences: CreateFlashcardPreferences,
  newTags: string[]
): CreateFlashcardPreferences {
  const allTags = [...newTags, ...preferences.recentTags];
  const uniqueTags = Array.from(new Set(allTags)).slice(0, 20); // Keep last 20 unique tags
  return {
    ...preferences,
    recentTags: uniqueTags,
  };
}

// =============================================================================
// API HELPERS
// =============================================================================

/**
 * Build request body for API
 */
export function buildCreateRequest(
  data: CreateFlashcardFormData
): Record<string, unknown> {
  return {
    front: data.front.trim(),
    back: data.back.trim(),
    type: data.type,
    tags: data.tags,
    bookId: data.bookId,
  };
}

/**
 * Parse API error response for flashcard creation
 */
export function parseCreateApiError(
  status: number,
  message?: string
): SubmissionError {
  if (status === 400) {
    return {
      messageKey: "flashcards.create.errors.validation",
      retryable: false,
    };
  }
  if (status === 401 || status === 403) {
    return {
      messageKey: "flashcards.create.errors.unauthorized",
      retryable: false,
    };
  }
  if (status === 429) {
    return {
      messageKey: "flashcards.create.errors.rateLimit",
      retryable: true,
    };
  }
  if (status >= 500) {
    return {
      messageKey: "flashcards.create.errors.server",
      retryable: true,
    };
  }
  return {
    messageKey: message ?? "flashcards.create.errors.unknown",
    retryable: true,
  };
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Get character count display
 */
export function getCharacterCount(text: string, max: number): string {
  return `${text.length}/${max}`;
}

/**
 * Check if at character limit
 */
export function isAtLimit(text: string, max: number): boolean {
  return text.length >= max;
}

/**
 * Check if near character limit (90%+)
 */
export function isNearLimit(text: string, max: number): boolean {
  return text.length >= max * 0.9;
}

/**
 * Get type config by value
 */
export function getTypeConfig(
  type: FlashcardType
): FlashcardTypeConfig | undefined {
  return FLASHCARD_TYPE_CONFIGS.find((c) => c.value === type);
}

/**
 * Format tags for display
 */
export function formatTagsDisplay(tags: string[]): string {
  if (tags.length === 0) return "";
  if (tags.length <= 3) return tags.join(", ");
  return `${tags.slice(0, 3).join(", ")} +${tags.length - 3}`;
}
