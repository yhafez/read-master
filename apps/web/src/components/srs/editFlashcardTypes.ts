/**
 * Edit Flashcard Dialog Types
 *
 * Type definitions and utilities for the flashcard editing dialog.
 * Reuses validation logic from createFlashcardTypes but adds
 * editing-specific functionality.
 */

import type { FlashcardType } from "./flashcardDeckTypes";
import {
  type CreateFlashcardFormData,
  type ValidationResult,
  type FieldError,
  type SubmissionError,
  type BookOption,
  MIN_FRONT_LENGTH,
  MAX_FRONT_LENGTH,
  MIN_BACK_LENGTH,
  MAX_BACK_LENGTH,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  isValidFront,
  isValidBack,
  isValidTag,
  isValidType,
} from "./createFlashcardTypes";

// Re-export validation constants for convenience
export {
  MIN_FRONT_LENGTH,
  MAX_FRONT_LENGTH,
  MIN_BACK_LENGTH,
  MAX_BACK_LENGTH,
  MAX_TAGS,
  MAX_TAG_LENGTH,
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * Form data for editing a flashcard (same as create but with id)
 */
export type EditFlashcardFormData = CreateFlashcardFormData & {
  /** The flashcard ID being edited */
  id: string;
};

/**
 * Props for EditFlashcardDialog
 */
export type EditFlashcardDialogProps = {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when flashcard is successfully updated */
  onSuccess?: (flashcard: UpdatedFlashcard) => void;
  /** The flashcard ID to edit */
  flashcardId: string | null;
};

/**
 * Updated flashcard response
 */
export type UpdatedFlashcard = {
  id: string;
  front: string;
  back: string;
  type: FlashcardType;
  tags: string[];
  bookId: string | null;
  updatedAt: string;
};

/**
 * Existing flashcard data (loaded from API)
 */
export type ExistingFlashcard = {
  id: string;
  front: string;
  back: string;
  type: FlashcardType;
  tags: string[];
  bookId: string | null;
  book?: {
    id: string;
    title: string;
    author: string | null;
    coverUrl: string | null;
  } | null;
};

/**
 * Dialog state for edit flow
 */
export type EditDialogState =
  | "loading"
  | "idle"
  | "validating"
  | "submitting"
  | "success"
  | "error"
  | "load-error";

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate edit form data and return all errors
 */
export function validateEditFormData(
  data: EditFlashcardFormData
): ValidationResult {
  const errors: FieldError[] = [];

  // Validate ID exists
  if (!data.id.trim()) {
    errors.push({
      field: "front", // Map to visible field
      messageKey: "flashcards.edit.errors.missingId",
    });
    return { valid: false, errors };
  }

  // Validate front
  if (!data.front.trim()) {
    errors.push({
      field: "front",
      messageKey: "flashcards.edit.errors.frontRequired",
    });
  } else if (data.front.trim().length < MIN_FRONT_LENGTH) {
    errors.push({
      field: "front",
      messageKey: "flashcards.edit.errors.frontTooShort",
      params: { min: MIN_FRONT_LENGTH },
    });
  } else if (data.front.trim().length > MAX_FRONT_LENGTH) {
    errors.push({
      field: "front",
      messageKey: "flashcards.edit.errors.frontTooLong",
      params: { max: MAX_FRONT_LENGTH },
    });
  }

  // Validate back
  if (!data.back.trim()) {
    errors.push({
      field: "back",
      messageKey: "flashcards.edit.errors.backRequired",
    });
  } else if (data.back.trim().length < MIN_BACK_LENGTH) {
    errors.push({
      field: "back",
      messageKey: "flashcards.edit.errors.backTooShort",
      params: { min: MIN_BACK_LENGTH },
    });
  } else if (data.back.trim().length > MAX_BACK_LENGTH) {
    errors.push({
      field: "back",
      messageKey: "flashcards.edit.errors.backTooLong",
      params: { max: MAX_BACK_LENGTH },
    });
  }

  // Validate type
  if (!isValidType(data.type)) {
    errors.push({
      field: "type",
      messageKey: "flashcards.edit.errors.invalidType",
    });
  }

  // Validate tags
  if (data.tags.length > MAX_TAGS) {
    errors.push({
      field: "tags",
      messageKey: "flashcards.edit.errors.tooManyTags",
      params: { max: MAX_TAGS },
    });
  }
  const invalidTag = data.tags.find((tag) => !isValidTag(tag));
  if (invalidTag) {
    errors.push({
      field: "tags",
      messageKey: "flashcards.edit.errors.invalidTag",
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
export function getEditFieldError(
  result: ValidationResult,
  field: keyof CreateFlashcardFormData
): FieldError | undefined {
  return result.errors.find((e) => e.field === field);
}

/**
 * Check if a specific field has an error
 */
export function hasEditFieldError(
  result: ValidationResult,
  field: keyof CreateFlashcardFormData
): boolean {
  return result.errors.some((e) => e.field === field);
}

// =============================================================================
// FORM HELPERS
// =============================================================================

/**
 * Create edit form data from existing flashcard
 */
export function createEditFormData(
  flashcard: ExistingFlashcard
): EditFlashcardFormData {
  return {
    id: flashcard.id,
    front: flashcard.front,
    back: flashcard.back,
    type: flashcard.type,
    tags: flashcard.tags,
    bookId: flashcard.bookId,
  };
}

/**
 * Create empty edit form data (for loading state)
 */
export function createEmptyEditFormData(): EditFlashcardFormData {
  return {
    id: "",
    front: "",
    back: "",
    type: "CUSTOM",
    tags: [],
    bookId: null,
  };
}

/**
 * Update a single field in edit form data
 */
export function updateEditFormField<K extends keyof EditFlashcardFormData>(
  data: EditFlashcardFormData,
  field: K,
  value: EditFlashcardFormData[K]
): EditFlashcardFormData {
  return {
    ...data,
    [field]: value,
  };
}

/**
 * Add a tag to edit form data
 */
export function addEditTag(
  data: EditFlashcardFormData,
  tag: string
): EditFlashcardFormData {
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
 * Remove a tag from edit form data
 */
export function removeEditTag(
  data: EditFlashcardFormData,
  tag: string
): EditFlashcardFormData {
  return {
    ...data,
    tags: data.tags.filter((t) => t !== tag),
  };
}

/**
 * Check if form data has changed from original
 */
export function hasFormChanged(
  original: ExistingFlashcard,
  current: EditFlashcardFormData
): boolean {
  if (original.front !== current.front.trim()) return true;
  if (original.back !== current.back.trim()) return true;
  if (original.type !== current.type) return true;
  if (original.bookId !== current.bookId) return true;

  // Compare tags
  if (original.tags.length !== current.tags.length) return true;
  const sortedOriginal = [...original.tags].sort();
  const sortedCurrent = [...current.tags].sort();
  return sortedOriginal.some((tag, i) => tag !== sortedCurrent[i]);
}

// =============================================================================
// API HELPERS
// =============================================================================

/**
 * Build request body for update API
 */
export function buildUpdateRequest(
  data: EditFlashcardFormData
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
 * Parse API error response for flashcard update
 */
export function parseUpdateApiError(
  status: number,
  message?: string
): SubmissionError {
  if (status === 400) {
    return {
      messageKey: "flashcards.edit.errors.validation",
      retryable: false,
    };
  }
  if (status === 401 || status === 403) {
    return {
      messageKey: "flashcards.edit.errors.unauthorized",
      retryable: false,
    };
  }
  if (status === 404) {
    return {
      messageKey: "flashcards.edit.errors.notFound",
      retryable: false,
    };
  }
  if (status === 429) {
    return {
      messageKey: "flashcards.edit.errors.rateLimit",
      retryable: true,
    };
  }
  if (status >= 500) {
    return {
      messageKey: "flashcards.edit.errors.server",
      retryable: true,
    };
  }
  return {
    messageKey: message ?? "flashcards.edit.errors.unknown",
    retryable: true,
  };
}

/**
 * Parse load error for fetching flashcard
 */
export function parseLoadApiError(
  status: number,
  message?: string
): SubmissionError {
  if (status === 401 || status === 403) {
    return {
      messageKey: "flashcards.edit.errors.loadUnauthorized",
      retryable: false,
    };
  }
  if (status === 404) {
    return {
      messageKey: "flashcards.edit.errors.loadNotFound",
      retryable: false,
    };
  }
  if (status >= 500) {
    return {
      messageKey: "flashcards.edit.errors.loadServer",
      retryable: true,
    };
  }
  return {
    messageKey: message ?? "flashcards.edit.errors.loadUnknown",
    retryable: true,
  };
}

// =============================================================================
// BOOK OPTION HELPERS
// =============================================================================

/**
 * Convert existing flashcard's book to BookOption
 */
export function getBookOptionFromFlashcard(
  flashcard: ExistingFlashcard
): BookOption | null {
  if (!flashcard.book) return null;
  return {
    id: flashcard.book.id,
    title: flashcard.book.title,
    author: flashcard.book.author,
    coverUrl: flashcard.book.coverUrl,
  };
}

// Re-export commonly used types and functions from create
export type {
  CreateFlashcardFormData,
  ValidationResult,
  FieldError,
  SubmissionError,
  BookOption,
};
export { isValidFront, isValidBack, isValidTag, isValidType };
