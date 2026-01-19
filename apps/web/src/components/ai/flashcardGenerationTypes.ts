/**
 * Flashcard Generation Types and Utilities
 *
 * Type definitions and utility functions for the AI flashcard generation feature.
 * This module supports generating flashcards from book content using AI.
 */

// =============================================================================
// FLASHCARD TYPE DEFINITIONS
// =============================================================================

/**
 * Available flashcard types for generation
 */
export type FlashcardGenerationType =
  | "vocabulary"
  | "concept"
  | "comprehension"
  | "quote";

/**
 * Flashcard type configuration for UI display
 */
export type FlashcardTypeConfig = {
  value: FlashcardGenerationType;
  labelKey: string;
  descriptionKey: string;
  icon: string;
  defaultSelected: boolean;
};

/**
 * Flashcard type configurations for the selection UI
 */
export const FLASHCARD_TYPE_OPTIONS: FlashcardTypeConfig[] = [
  {
    value: "vocabulary",
    labelKey: "ai.flashcardGeneration.types.vocabulary.label",
    descriptionKey: "ai.flashcardGeneration.types.vocabulary.description",
    icon: "text_fields",
    defaultSelected: true,
  },
  {
    value: "concept",
    labelKey: "ai.flashcardGeneration.types.concept.label",
    descriptionKey: "ai.flashcardGeneration.types.concept.description",
    icon: "lightbulb",
    defaultSelected: true,
  },
  {
    value: "comprehension",
    labelKey: "ai.flashcardGeneration.types.comprehension.label",
    descriptionKey: "ai.flashcardGeneration.types.comprehension.description",
    icon: "psychology",
    defaultSelected: false,
  },
  {
    value: "quote",
    labelKey: "ai.flashcardGeneration.types.quote.label",
    descriptionKey: "ai.flashcardGeneration.types.quote.description",
    icon: "format_quote",
    defaultSelected: false,
  },
];

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Minimum number of cards to generate
 */
export const MIN_CARD_COUNT = 1;

/**
 * Maximum number of cards to generate
 */
export const MAX_CARD_COUNT = 30;

/**
 * Default number of cards to generate
 */
export const DEFAULT_CARD_COUNT = 10;

/**
 * Minimum content length required for generation
 */
export const MIN_CONTENT_LENGTH = 50;

/**
 * Maximum content length accepted
 */
export const MAX_CONTENT_LENGTH = 50000;

/**
 * Card count step for slider
 */
export const CARD_COUNT_STEP = 5;

/**
 * Card count presets for quick selection
 */
export const CARD_COUNT_PRESETS = [5, 10, 15, 20, 30] as const;

/**
 * Storage key for generation preferences
 */
export const GENERATION_PREFS_STORAGE_KEY = "flashcard_generation_prefs";

// =============================================================================
// GENERATED FLASHCARD TYPES
// =============================================================================

/**
 * A generated flashcard from the API
 */
export type GeneratedFlashcard = {
  id: string;
  front: string;
  back: string;
  type: string;
  tags: string[];
  dueDate: string;
};

/**
 * Summary of generated cards
 */
export type GenerationSummary = {
  totalCards: number;
  byType: Partial<Record<FlashcardGenerationType, number>>;
  averageDifficulty: number;
  duplicatesRemoved: number;
  requestedCount: number;
  generatedCount: number;
  savedCount: number;
};

/**
 * API request for generating flashcards
 */
export type GenerateFlashcardsRequest = {
  bookId: string;
  content: string;
  cardTypes: FlashcardGenerationType[];
  cardCount: number;
  chapterId?: string;
  sourceOffset?: number;
};

/**
 * API response for generated flashcards
 */
export type GenerateFlashcardsResponse = {
  flashcards: GeneratedFlashcard[];
  summary: GenerationSummary;
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

// =============================================================================
// DIALOG STATE TYPES
// =============================================================================

/**
 * Generation state
 */
export type GenerationState =
  | "idle"
  | "generating"
  | "preview"
  | "saving"
  | "complete"
  | "error";

/**
 * Error types for generation
 */
export type GenerationErrorType =
  | "network_error"
  | "validation_error"
  | "rate_limit"
  | "ai_disabled"
  | "ai_unavailable"
  | "book_not_found"
  | "content_too_short"
  | "content_too_long"
  | "no_cards_generated"
  | "unknown";

/**
 * Generation error structure
 */
export type GenerationError = {
  type: GenerationErrorType;
  message: string;
  retryable: boolean;
};

/**
 * Generation preferences stored by user
 */
export type GenerationPreferences = {
  cardTypes: FlashcardGenerationType[];
  cardCount: number;
  autoSave: boolean;
};

/**
 * Props for GenerateFlashcardsDialog component
 */
export type GenerateFlashcardsDialogProps = {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** The book to generate flashcards from */
  bookId: string;
  /** Book title for display */
  bookTitle: string;
  /** The content to generate flashcards from */
  content: string;
  /** Optional chapter ID for source reference */
  chapterId?: string;
  /** Optional source offset for source reference */
  sourceOffset?: number;
  /** Callback when flashcards are successfully generated and saved */
  onSuccess?: (
    flashcards: GeneratedFlashcard[],
    summary: GenerationSummary
  ) => void;
};

/**
 * Editable flashcard for preview
 */
export type EditableFlashcard = GeneratedFlashcard & {
  isEditing: boolean;
  isSelected: boolean;
  editedFront: string;
  editedBack: string;
};

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Check if a flashcard type is valid
 */
export function isValidFlashcardType(
  type: unknown
): type is FlashcardGenerationType {
  return (
    typeof type === "string" &&
    ["vocabulary", "concept", "comprehension", "quote"].includes(type)
  );
}

/**
 * Check if card count is valid
 */
export function isValidCardCount(count: unknown): count is number {
  return (
    typeof count === "number" &&
    Number.isInteger(count) &&
    count >= MIN_CARD_COUNT &&
    count <= MAX_CARD_COUNT
  );
}

/**
 * Check if content length is valid
 */
export function isValidContentLength(content: string): boolean {
  return (
    content.length >= MIN_CONTENT_LENGTH && content.length <= MAX_CONTENT_LENGTH
  );
}

/**
 * Validate content and return error message if invalid
 */
export function validateContent(content: string): {
  valid: boolean;
  error?: string;
} {
  if (!content.trim()) {
    return { valid: false, error: "Content is required" };
  }
  if (content.length < MIN_CONTENT_LENGTH) {
    return {
      valid: false,
      error: `Content must be at least ${MIN_CONTENT_LENGTH} characters`,
    };
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return {
      valid: false,
      error: `Content must be at most ${MAX_CONTENT_LENGTH.toLocaleString()} characters`,
    };
  }
  return { valid: true };
}

/**
 * Validate selected card types
 */
export function validateCardTypes(types: FlashcardGenerationType[]): {
  valid: boolean;
  error?: string;
} {
  if (!Array.isArray(types) || types.length === 0) {
    return { valid: false, error: "Select at least one card type" };
  }
  const invalidTypes = types.filter((t) => !isValidFlashcardType(t));
  if (invalidTypes.length > 0) {
    return { valid: false, error: "Invalid card type selected" };
  }
  return { valid: true };
}

// =============================================================================
// ERROR HANDLING FUNCTIONS
// =============================================================================

/**
 * Create a generation error
 */
export function createGenerationError(
  type: GenerationErrorType,
  message?: string
): GenerationError {
  const defaultMessages: Record<GenerationErrorType, string> = {
    network_error: "Unable to connect. Please check your internet connection.",
    validation_error: "Invalid request. Please check your input.",
    rate_limit: "You've reached your AI usage limit. Please try again later.",
    ai_disabled: "AI features are disabled. Enable them in settings.",
    ai_unavailable: "AI service is temporarily unavailable. Please try again.",
    book_not_found: "Book not found.",
    content_too_short: `Content must be at least ${MIN_CONTENT_LENGTH} characters.`,
    content_too_long: `Content is too long. Maximum ${MAX_CONTENT_LENGTH.toLocaleString()} characters.`,
    no_cards_generated: "No flashcards could be generated from this content.",
    unknown: "An unexpected error occurred. Please try again.",
  };

  const retryableErrors: GenerationErrorType[] = [
    "network_error",
    "ai_unavailable",
    "unknown",
  ];

  return {
    type,
    message: message ?? defaultMessages[type],
    retryable: retryableErrors.includes(type),
  };
}

/**
 * Parse API error to generation error
 */
export function parseGenerationApiError(
  status: number,
  errorMessage?: string
): GenerationError {
  if (status === 400) {
    if (errorMessage?.toLowerCase().includes("content")) {
      if (errorMessage.includes("at least")) {
        return createGenerationError("content_too_short", errorMessage);
      }
      if (errorMessage.includes("at most")) {
        return createGenerationError("content_too_long", errorMessage);
      }
    }
    return createGenerationError("validation_error", errorMessage);
  }
  if (status === 401 || status === 403) {
    if (errorMessage?.toLowerCase().includes("disabled")) {
      return createGenerationError("ai_disabled", errorMessage);
    }
    return createGenerationError("ai_disabled");
  }
  if (status === 404) {
    return createGenerationError("book_not_found", errorMessage);
  }
  if (status === 429) {
    return createGenerationError("rate_limit", errorMessage);
  }
  if (status === 503) {
    return createGenerationError("ai_unavailable", errorMessage);
  }
  if (status === 0) {
    return createGenerationError("network_error");
  }
  return createGenerationError("unknown", errorMessage);
}

/**
 * Get localization key for generation error
 */
export function getGenerationErrorKey(type: GenerationErrorType): string {
  const keyMap: Record<GenerationErrorType, string> = {
    network_error: "ai.flashcardGeneration.error.network",
    validation_error: "ai.flashcardGeneration.error.validation",
    rate_limit: "ai.flashcardGeneration.error.rateLimit",
    ai_disabled: "ai.flashcardGeneration.error.aiDisabled",
    ai_unavailable: "ai.flashcardGeneration.error.aiUnavailable",
    book_not_found: "ai.flashcardGeneration.error.bookNotFound",
    content_too_short: "ai.flashcardGeneration.error.contentTooShort",
    content_too_long: "ai.flashcardGeneration.error.contentTooLong",
    no_cards_generated: "ai.flashcardGeneration.error.noCards",
    unknown: "ai.flashcardGeneration.error.unknown",
  };
  return keyMap[type];
}

// =============================================================================
// DISPLAY HELPER FUNCTIONS
// =============================================================================

/**
 * Get display name for flashcard type
 */
export function getFlashcardTypeDisplay(type: FlashcardGenerationType): string {
  const displayMap: Record<FlashcardGenerationType, string> = {
    vocabulary: "Vocabulary",
    concept: "Concept",
    comprehension: "Comprehension",
    quote: "Quote",
  };
  return displayMap[type] ?? type;
}

/**
 * Get description for flashcard type
 */
export function getFlashcardTypeDescription(
  type: FlashcardGenerationType
): string {
  const descriptionMap: Record<FlashcardGenerationType, string> = {
    vocabulary: "Word definitions and usage",
    concept: "Key ideas and explanations",
    comprehension: "Understanding questions",
    quote: "Important passages and meanings",
  };
  return descriptionMap[type] ?? "";
}

/**
 * Get icon name for flashcard type (Material Icons)
 */
export function getFlashcardTypeIcon(type: FlashcardGenerationType): string {
  const iconMap: Record<FlashcardGenerationType, string> = {
    vocabulary: "text_fields",
    concept: "lightbulb",
    comprehension: "psychology",
    quote: "format_quote",
  };
  return iconMap[type] ?? "note";
}

/**
 * Get the config for a flashcard type
 */
export function getFlashcardTypeConfig(
  type: FlashcardGenerationType
): FlashcardTypeConfig | undefined {
  return FLASHCARD_TYPE_OPTIONS.find((opt) => opt.value === type);
}

/**
 * Get default selected card types
 */
export function getDefaultSelectedTypes(): FlashcardGenerationType[] {
  return FLASHCARD_TYPE_OPTIONS.filter((opt) => opt.defaultSelected).map(
    (opt) => opt.value
  );
}

// =============================================================================
// EDITABLE FLASHCARD FUNCTIONS
// =============================================================================

/**
 * Convert generated flashcards to editable format
 */
export function toEditableFlashcards(
  flashcards: GeneratedFlashcard[]
): EditableFlashcard[] {
  return flashcards.map((card) => ({
    ...card,
    isEditing: false,
    isSelected: true,
    editedFront: card.front,
    editedBack: card.back,
  }));
}

/**
 * Start editing a flashcard
 */
export function startEditingCard(
  cards: EditableFlashcard[],
  cardId: string
): EditableFlashcard[] {
  return cards.map((card) =>
    card.id === cardId
      ? { ...card, isEditing: true }
      : { ...card, isEditing: false }
  );
}

/**
 * Cancel editing a flashcard
 */
export function cancelEditingCard(
  cards: EditableFlashcard[],
  cardId: string
): EditableFlashcard[] {
  return cards.map((card) =>
    card.id === cardId
      ? {
          ...card,
          isEditing: false,
          editedFront: card.front,
          editedBack: card.back,
        }
      : card
  );
}

/**
 * Save edited flashcard
 */
export function saveEditedCard(
  cards: EditableFlashcard[],
  cardId: string
): EditableFlashcard[] {
  return cards.map((card) =>
    card.id === cardId
      ? {
          ...card,
          isEditing: false,
          front: card.editedFront,
          back: card.editedBack,
        }
      : card
  );
}

/**
 * Update edited front text
 */
export function updateEditedFront(
  cards: EditableFlashcard[],
  cardId: string,
  text: string
): EditableFlashcard[] {
  return cards.map((card) =>
    card.id === cardId ? { ...card, editedFront: text } : card
  );
}

/**
 * Update edited back text
 */
export function updateEditedBack(
  cards: EditableFlashcard[],
  cardId: string,
  text: string
): EditableFlashcard[] {
  return cards.map((card) =>
    card.id === cardId ? { ...card, editedBack: text } : card
  );
}

/**
 * Toggle card selection
 */
export function toggleCardSelection(
  cards: EditableFlashcard[],
  cardId: string
): EditableFlashcard[] {
  return cards.map((card) =>
    card.id === cardId ? { ...card, isSelected: !card.isSelected } : card
  );
}

/**
 * Select all cards
 */
export function selectAllCards(
  cards: EditableFlashcard[]
): EditableFlashcard[] {
  return cards.map((card) => ({ ...card, isSelected: true }));
}

/**
 * Deselect all cards
 */
export function deselectAllCards(
  cards: EditableFlashcard[]
): EditableFlashcard[] {
  return cards.map((card) => ({ ...card, isSelected: false }));
}

/**
 * Get selected cards
 */
export function getSelectedCards(
  cards: EditableFlashcard[]
): EditableFlashcard[] {
  return cards.filter((card) => card.isSelected);
}

/**
 * Get selected card count
 */
export function getSelectedCount(cards: EditableFlashcard[]): number {
  return cards.filter((card) => card.isSelected).length;
}

/**
 * Check if any card is being edited
 */
export function isAnyCardEditing(cards: EditableFlashcard[]): boolean {
  return cards.some((card) => card.isEditing);
}

/**
 * Convert editable cards back to generated format (for saving)
 */
export function toGeneratedFlashcards(
  cards: EditableFlashcard[]
): GeneratedFlashcard[] {
  return cards
    .filter((card) => card.isSelected)
    .map((card) => ({
      id: card.id,
      front: card.front,
      back: card.back,
      type: card.type,
      tags: card.tags,
      dueDate: card.dueDate,
    }));
}

// =============================================================================
// STORAGE FUNCTIONS
// =============================================================================

/**
 * Load generation preferences from localStorage
 */
export function loadGenerationPreferences(): GenerationPreferences {
  const defaults: GenerationPreferences = {
    cardTypes: getDefaultSelectedTypes(),
    cardCount: DEFAULT_CARD_COUNT,
    autoSave: false,
  };

  try {
    const stored = localStorage.getItem(GENERATION_PREFS_STORAGE_KEY);
    if (!stored) return defaults;

    const parsed = JSON.parse(stored) as Partial<GenerationPreferences>;

    return {
      cardTypes:
        Array.isArray(parsed.cardTypes) &&
        parsed.cardTypes.every(isValidFlashcardType)
          ? parsed.cardTypes
          : defaults.cardTypes,
      cardCount: isValidCardCount(parsed.cardCount)
        ? parsed.cardCount
        : defaults.cardCount,
      autoSave:
        typeof parsed.autoSave === "boolean"
          ? parsed.autoSave
          : defaults.autoSave,
    };
  } catch {
    return defaults;
  }
}

/**
 * Save generation preferences to localStorage
 */
export function saveGenerationPreferences(prefs: GenerationPreferences): void {
  try {
    localStorage.setItem(GENERATION_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Silently fail - storage might be full or disabled
  }
}

// =============================================================================
// API REQUEST BUILDERS
// =============================================================================

/**
 * Build the API request body for flashcard generation
 */
export function buildGenerationRequest(params: {
  bookId: string;
  content: string;
  cardTypes: FlashcardGenerationType[];
  cardCount: number;
  chapterId?: string;
  sourceOffset?: number;
}): GenerateFlashcardsRequest {
  const request: GenerateFlashcardsRequest = {
    bookId: params.bookId,
    content: params.content,
    cardTypes: params.cardTypes,
    cardCount: params.cardCount,
  };

  if (params.chapterId !== undefined) {
    request.chapterId = params.chapterId;
  }
  if (params.sourceOffset !== undefined) {
    request.sourceOffset = params.sourceOffset;
  }

  return request;
}

// =============================================================================
// SUMMARY DISPLAY FUNCTIONS
// =============================================================================

/**
 * Format generation duration for display
 */
export function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  const seconds = Math.round(durationMs / 100) / 10;
  return `${seconds}s`;
}

/**
 * Format token count for display
 */
export function formatTokenCount(tokens: number): string {
  if (tokens > 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toLocaleString();
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Get summary text for generated cards
 */
export function getSummaryText(summary: GenerationSummary): string {
  const parts: string[] = [];

  parts.push(`${summary.savedCount} cards saved`);

  if (summary.duplicatesRemoved > 0) {
    parts.push(`${summary.duplicatesRemoved} duplicates removed`);
  }

  return parts.join(", ");
}

/**
 * Get breakdown by type for display
 */
export function getTypeBreakdown(
  byType: Partial<Record<FlashcardGenerationType, number>>
): Array<{ type: FlashcardGenerationType; count: number; label: string }> {
  const entries = Object.entries(byType) as Array<
    [FlashcardGenerationType, number]
  >;

  return entries
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({
      type,
      count,
      label: getFlashcardTypeDisplay(type),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate estimated generation time based on card count
 */
export function estimateGenerationTime(cardCount: number): string {
  // Rough estimate: ~2-3 seconds per card
  const maxSeconds = Math.ceil(cardCount * 3);

  if (maxSeconds < 10) {
    return "a few seconds";
  }
  if (maxSeconds < 30) {
    return "under 30 seconds";
  }
  if (maxSeconds < 60) {
    return "under a minute";
  }
  return "1-2 minutes";
}
