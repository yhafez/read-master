/**
 * Pre-Reading Guide Types
 *
 * Type definitions for the PreReadingGuide component and related utilities.
 */

// =============================================================================
// GUIDE DATA TYPES
// =============================================================================

/**
 * Vocabulary item in the pre-reading guide
 */
export type VocabularyItem = {
  /** The term/word */
  term: string;
  /** Definition of the term */
  definition: string;
  /** Usage examples */
  examples?: string[];
};

/**
 * Key concept in the pre-reading guide
 */
export type KeyConcept = {
  /** Concept name */
  term: string;
  /** Definition/explanation */
  definition: string;
  /** Why it matters for the book */
  relevance: string;
};

/**
 * Overview section of the guide
 */
export type GuideOverview = {
  /** Brief summary of the book */
  summary: string;
  /** Main themes */
  themes: string[];
  /** Target audience description */
  targetAudience: string;
};

/**
 * Context section of the guide
 */
export type GuideContext = {
  /** Historical background */
  historicalContext?: string;
  /** Cultural background */
  culturalContext?: string;
  /** Author background */
  authorContext?: string;
};

/**
 * Complete pre-reading guide data
 */
export type PreReadingGuideData = {
  /** Unique identifier */
  id: string;
  /** Book ID this guide belongs to */
  bookId: string;
  /** Overview section */
  overview: GuideOverview;
  /** Key concepts to understand */
  keyConcepts: KeyConcept[];
  /** Historical/cultural context */
  context: GuideContext;
  /** Questions to consider while reading */
  guidingQuestions: string[];
  /** Vocabulary words */
  vocabulary: VocabularyItem[];
  /** Tips for reading the book */
  readingTips: string[];
  /** When the guide was generated */
  generatedAt: string | null;
  /** Whether this was served from cache */
  cached?: boolean;
};

// =============================================================================
// COMPONENT TYPES
// =============================================================================

/**
 * Props for PreReadingGuide component
 */
export type PreReadingGuideProps = {
  /** Book ID to generate/display guide for */
  bookId: string;
  /** Book title for display */
  bookTitle: string;
  /** Optional existing guide data (to skip fetching) */
  initialData?: PreReadingGuideData | null;
  /** Callback when guide generation starts */
  onGenerateStart?: () => void;
  /** Callback when guide generation completes */
  onGenerateComplete?: (guide: PreReadingGuideData) => void;
  /** Callback when an error occurs */
  onError?: (error: PreReadingGuideError) => void;
  /** Whether the component should be initially expanded */
  defaultExpanded?: boolean;
  /** Custom className */
  className?: string;
};

/**
 * Section identifiers for collapsible sections
 */
export type GuideSectionId =
  | "overview"
  | "vocabulary"
  | "keyConcepts"
  | "context"
  | "guidingQuestions"
  | "readingTips";

/**
 * State for managing expanded sections
 */
export type ExpandedSections = Record<GuideSectionId, boolean>;

/**
 * Default expanded state for sections
 */
export const DEFAULT_EXPANDED_SECTIONS: ExpandedSections = {
  overview: true,
  vocabulary: true,
  keyConcepts: false,
  context: false,
  guidingQuestions: false,
  readingTips: false,
};

// =============================================================================
// API/LOADING TYPES
// =============================================================================

/**
 * Loading state for the guide
 */
export type GuideLoadingState = "idle" | "loading" | "generating" | "error";

/**
 * Error types for the guide
 */
export type PreReadingGuideErrorType =
  | "network_error"
  | "not_found"
  | "rate_limited"
  | "ai_disabled"
  | "ai_unavailable"
  | "generation_failed"
  | "unknown";

/**
 * Error structure for the guide
 */
export type PreReadingGuideError = {
  type: PreReadingGuideErrorType;
  message: string;
  retryable: boolean;
};

/**
 * API response shape for generate endpoint
 */
export type GenerateGuideResponse = PreReadingGuideData & {
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
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a PreReadingGuideError
 */
export function createGuideError(
  type: PreReadingGuideErrorType,
  message?: string
): PreReadingGuideError {
  const defaultMessages: Record<PreReadingGuideErrorType, string> = {
    network_error: "Unable to connect. Please check your internet connection.",
    not_found: "Book not found. It may have been deleted.",
    rate_limited: "Too many requests. Please wait a moment and try again.",
    ai_disabled:
      "AI features are disabled for your account. Enable them in settings.",
    ai_unavailable:
      "AI service is temporarily unavailable. Please try again later.",
    generation_failed: "Failed to generate guide. Please try again.",
    unknown: "An unexpected error occurred. Please try again.",
  };

  const retryableErrors: PreReadingGuideErrorType[] = [
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
export function getGuideErrorMessage(error: PreReadingGuideError): string {
  return error.message;
}

/**
 * Parse API error response to PreReadingGuideError
 */
export function parseApiError(
  status: number,
  errorCode?: string,
  errorMessage?: string
): PreReadingGuideError {
  if (status === 404) {
    return createGuideError("not_found");
  }
  if (status === 429) {
    return createGuideError("rate_limited", errorMessage);
  }
  if (status === 403) {
    if (errorCode === "AI_DISABLED" || errorMessage?.includes("AI")) {
      return createGuideError("ai_disabled", errorMessage);
    }
    return createGuideError("unknown", errorMessage);
  }
  if (status === 503) {
    return createGuideError("ai_unavailable", errorMessage);
  }
  if (status >= 500) {
    return createGuideError("generation_failed", errorMessage);
  }
  if (status === 0) {
    return createGuideError("network_error");
  }
  return createGuideError("unknown", errorMessage);
}

/**
 * Check if guide data has content in a section
 */
export function hasContent(guide: PreReadingGuideData | null): boolean {
  if (!guide) return false;
  return !!(
    guide.overview?.summary ||
    guide.vocabulary?.length > 0 ||
    guide.keyConcepts?.length > 0 ||
    guide.guidingQuestions?.length > 0 ||
    guide.readingTips?.length > 0
  );
}

/**
 * Count total items in the guide
 */
export function countGuideItems(guide: PreReadingGuideData | null): number {
  if (!guide) return 0;
  return (
    (guide.vocabulary?.length ?? 0) +
    (guide.keyConcepts?.length ?? 0) +
    (guide.guidingQuestions?.length ?? 0) +
    (guide.readingTips?.length ?? 0)
  );
}

/**
 * Get section label
 */
export function getSectionLabel(sectionId: GuideSectionId): string {
  const labels: Record<GuideSectionId, string> = {
    overview: "Overview",
    vocabulary: "Vocabulary",
    keyConcepts: "Key Concepts",
    context: "Context",
    guidingQuestions: "Guiding Questions",
    readingTips: "Reading Tips",
  };
  return labels[sectionId];
}

/**
 * Toggle a section in expanded state
 */
export function toggleSection(
  expanded: ExpandedSections,
  sectionId: GuideSectionId
): ExpandedSections {
  return {
    ...expanded,
    [sectionId]: !expanded[sectionId],
  };
}

/**
 * Expand all sections
 */
export function expandAllSections(): ExpandedSections {
  return {
    overview: true,
    vocabulary: true,
    keyConcepts: true,
    context: true,
    guidingQuestions: true,
    readingTips: true,
  };
}

/**
 * Collapse all sections except overview
 */
export function collapseAllSections(): ExpandedSections {
  return {
    overview: true,
    vocabulary: false,
    keyConcepts: false,
    context: false,
    guidingQuestions: false,
    readingTips: false,
  };
}
