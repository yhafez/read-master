/**
 * Flashcard Deck List Types
 *
 * Type definitions for the FlashcardDeckList component and related utilities.
 * This module provides types for displaying flashcard decks grouped by books,
 * with counts, filters, and navigation support.
 */

// =============================================================================
// FLASHCARD STATUS AND TYPE ENUMS
// =============================================================================

/**
 * Flashcard status - matches the schema from shared package
 */
export type FlashcardStatus = "NEW" | "LEARNING" | "REVIEW" | "SUSPENDED";

/**
 * Flashcard type - matches the schema from shared package
 */
export type FlashcardType =
  | "VOCABULARY"
  | "CONCEPT"
  | "COMPREHENSION"
  | "QUOTE"
  | "CUSTOM";

// =============================================================================
// DECK DATA TYPES
// =============================================================================

/**
 * Card counts within a deck by status
 */
export type CardCounts = {
  /** Total number of cards in the deck */
  total: number;
  /** Number of new cards (never studied) */
  new: number;
  /** Number of cards in learning phase */
  learning: number;
  /** Number of cards in review phase */
  review: number;
  /** Number of suspended cards */
  suspended: number;
};

/**
 * Due card information for a deck
 */
export type DueCounts = {
  /** Cards due for review right now */
  dueNow: number;
  /** Cards that are overdue */
  overdue: number;
  /** Cards due today (includes dueNow and overdue) */
  dueToday: number;
  /** Cards that will be due tomorrow */
  dueTomorrow: number;
};

/**
 * Study statistics for a deck
 */
export type DeckStudyStats = {
  /** Number of cards reviewed today */
  reviewedToday: number;
  /** Number of correct answers today */
  correctToday: number;
  /** Current retention rate (percentage) */
  retentionRate: number;
  /** Current streak in days */
  currentStreak: number;
  /** Average ease factor across cards */
  averageEaseFactor: number | null;
};

/**
 * Book information for a deck
 */
export type DeckBookInfo = {
  /** Book ID */
  id: string;
  /** Book title */
  title: string;
  /** Book author */
  author: string | null;
  /** Book cover URL */
  coverUrl: string | null;
};

/**
 * Single flashcard deck (grouped by book)
 */
export type FlashcardDeck = {
  /** Unique identifier (book ID or 'unassigned' for orphan cards) */
  id: string;
  /** Book information (null for unassigned cards) */
  book: DeckBookInfo | null;
  /** Card counts by status */
  cardCounts: CardCounts;
  /** Due card information */
  dueCounts: DueCounts;
  /** Study statistics */
  studyStats: DeckStudyStats;
  /** Tags used in this deck */
  tags: string[];
  /** Last review date */
  lastReviewedAt: string | null;
  /** Deck creation date (earliest card) */
  createdAt: string;
};

/**
 * Unassigned deck constant ID
 */
export const UNASSIGNED_DECK_ID = "unassigned";

// =============================================================================
// FILTER AND SORT TYPES
// =============================================================================

/**
 * Sort options for deck list
 */
export type DeckSortOption =
  | "dueCount"
  | "totalCards"
  | "lastReviewed"
  | "bookTitle"
  | "retentionRate"
  | "createdAt";

/**
 * Sort direction
 */
export type SortDirection = "asc" | "desc";

/**
 * Filter options for deck list
 */
export type DeckFilterStatus = "all" | "hasDue" | "noDue" | "hasNew";

/**
 * Deck list filters
 */
export type DeckListFilters = {
  /** Status filter */
  status: DeckFilterStatus;
  /** Search query (searches book title/author) */
  search: string;
  /** Sort field */
  sortBy: DeckSortOption;
  /** Sort direction */
  sortDirection: SortDirection;
  /** Filter by specific tags */
  tags: string[];
};

/**
 * Default deck list filters
 */
export const DEFAULT_DECK_FILTERS: DeckListFilters = {
  status: "all",
  search: "",
  sortBy: "dueCount",
  sortDirection: "desc",
  tags: [],
};

/**
 * Sort option configuration for UI
 */
export type SortOptionConfig = {
  value: DeckSortOption;
  labelKey: string;
};

/**
 * Available sort options
 */
export const SORT_OPTIONS: SortOptionConfig[] = [
  { value: "dueCount", labelKey: "flashcards.deck.sort.dueCount" },
  { value: "totalCards", labelKey: "flashcards.deck.sort.totalCards" },
  { value: "lastReviewed", labelKey: "flashcards.deck.sort.lastReviewed" },
  { value: "bookTitle", labelKey: "flashcards.deck.sort.bookTitle" },
  { value: "retentionRate", labelKey: "flashcards.deck.sort.retentionRate" },
  { value: "createdAt", labelKey: "flashcards.deck.sort.createdAt" },
];

/**
 * Filter status configuration for UI
 */
export type FilterStatusConfig = {
  value: DeckFilterStatus;
  labelKey: string;
};

/**
 * Available filter statuses
 */
export const FILTER_STATUSES: FilterStatusConfig[] = [
  { value: "all", labelKey: "flashcards.deck.filter.all" },
  { value: "hasDue", labelKey: "flashcards.deck.filter.hasDue" },
  { value: "noDue", labelKey: "flashcards.deck.filter.noDue" },
  { value: "hasNew", labelKey: "flashcards.deck.filter.hasNew" },
];

// =============================================================================
// COMPONENT TYPES
// =============================================================================

/**
 * Props for FlashcardDeckList component
 */
export type FlashcardDeckListProps = {
  /** Initial filters to apply */
  initialFilters?: Partial<DeckListFilters>;
  /** Callback when study button is clicked */
  onStudyDeck?: (deckId: string) => void;
  /** Callback when deck is clicked for details */
  onDeckClick?: (deckId: string) => void;
  /** Callback when create flashcard is clicked */
  onCreateCard?: (deckId?: string) => void;
  /** Whether to show the filter panel */
  showFilters?: boolean;
  /** Custom className */
  className?: string;
};

/**
 * Props for individual DeckCard component
 */
export type DeckCardProps = {
  /** Deck data */
  deck: FlashcardDeck;
  /** Callback when study button is clicked */
  onStudy?: (() => void) | undefined;
  /** Callback when card is clicked */
  onClick?: (() => void) | undefined;
  /** Whether the card is selected */
  selected?: boolean | undefined;
  /** Custom className */
  className?: string | undefined;
};

/**
 * Loading state for deck list
 */
export type DeckListLoadingState = "idle" | "loading" | "error";

/**
 * Error types for deck list
 */
export type DeckListErrorType =
  | "network_error"
  | "not_found"
  | "unauthorized"
  | "unknown";

/**
 * Error structure for deck list
 */
export type DeckListError = {
  type: DeckListErrorType;
  message: string;
  retryable: boolean;
};

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * API response for deck list
 */
export type DeckListResponse = {
  decks: FlashcardDeck[];
  totalDecks: number;
  totalCards: number;
  totalDue: number;
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create default card counts
 */
export function createDefaultCardCounts(): CardCounts {
  return {
    total: 0,
    new: 0,
    learning: 0,
    review: 0,
    suspended: 0,
  };
}

/**
 * Create default due counts
 */
export function createDefaultDueCounts(): DueCounts {
  return {
    dueNow: 0,
    overdue: 0,
    dueToday: 0,
    dueTomorrow: 0,
  };
}

/**
 * Create default study stats
 */
export function createDefaultStudyStats(): DeckStudyStats {
  return {
    reviewedToday: 0,
    correctToday: 0,
    retentionRate: 0,
    currentStreak: 0,
    averageEaseFactor: null,
  };
}

/**
 * Create a DeckListError
 */
export function createDeckListError(
  type: DeckListErrorType,
  message?: string
): DeckListError {
  const defaultMessages: Record<DeckListErrorType, string> = {
    network_error: "Unable to connect. Please check your internet connection.",
    not_found: "Flashcard decks not found.",
    unauthorized: "You are not authorized to view flashcard decks.",
    unknown: "An unexpected error occurred. Please try again.",
  };

  const retryableErrors: DeckListErrorType[] = ["network_error"];

  return {
    type,
    message: message ?? defaultMessages[type],
    retryable: retryableErrors.includes(type),
  };
}

/**
 * Parse API error to DeckListError
 */
export function parseApiError(
  status: number,
  errorMessage?: string
): DeckListError {
  if (status === 404) {
    return createDeckListError("not_found", errorMessage);
  }
  if (status === 401 || status === 403) {
    return createDeckListError("unauthorized", errorMessage);
  }
  if (status === 0) {
    return createDeckListError("network_error");
  }
  return createDeckListError("unknown", errorMessage);
}

/**
 * Get total due count for a deck
 */
export function getTotalDue(deck: FlashcardDeck): number {
  return deck.dueCounts.dueToday;
}

/**
 * Get active card count (excluding suspended)
 */
export function getActiveCardCount(deck: FlashcardDeck): number {
  return deck.cardCounts.total - deck.cardCounts.suspended;
}

/**
 * Check if deck has any due cards
 */
export function hasDueCards(deck: FlashcardDeck): boolean {
  return deck.dueCounts.dueToday > 0;
}

/**
 * Check if deck has any new cards
 */
export function hasNewCards(deck: FlashcardDeck): boolean {
  return deck.cardCounts.new > 0;
}

/**
 * Check if deck has any overdue cards
 */
export function hasOverdueCards(deck: FlashcardDeck): boolean {
  return deck.dueCounts.overdue > 0;
}

/**
 * Check if deck is unassigned (no book)
 */
export function isUnassignedDeck(deck: FlashcardDeck): boolean {
  return deck.id === UNASSIGNED_DECK_ID || deck.book === null;
}

/**
 * Get deck display name
 */
export function getDeckDisplayName(deck: FlashcardDeck): string {
  if (deck.book) {
    return deck.book.title;
  }
  return "Unassigned Cards";
}

/**
 * Get deck display author
 */
export function getDeckDisplayAuthor(deck: FlashcardDeck): string | null {
  return deck.book?.author ?? null;
}

/**
 * Calculate retention rate percentage string
 */
export function formatRetentionRate(rate: number): string {
  return `${Math.round(rate)}%`;
}

/**
 * Format due count for display
 */
export function formatDueCount(count: number): string {
  if (count === 0) return "0";
  if (count > 999) return "999+";
  return count.toString();
}

/**
 * Format total card count for display
 */
export function formatCardCount(count: number): string {
  if (count > 9999) {
    return `${Math.floor(count / 1000)}k`;
  }
  return count.toLocaleString();
}

/**
 * Get status badge color based on due count
 */
export function getDueBadgeColor(
  deck: FlashcardDeck
): "default" | "error" | "warning" | "success" {
  if (deck.dueCounts.overdue > 0) {
    return "error";
  }
  if (deck.dueCounts.dueNow > 0) {
    return "warning";
  }
  if (deck.dueCounts.dueToday === 0) {
    return "success";
  }
  return "default";
}

/**
 * Get retention rate color for LinearProgress
 */
export function getRetentionColor(
  rate: number
): "success" | "warning" | "error" | "inherit" {
  if (rate >= 90) return "success";
  if (rate >= 70) return "warning";
  if (rate > 0) return "error";
  return "inherit";
}

/**
 * Sort decks by specified field and direction
 */
export function sortDecks(
  decks: FlashcardDeck[],
  sortBy: DeckSortOption,
  sortDirection: SortDirection
): FlashcardDeck[] {
  const sorted = [...decks].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "dueCount":
        comparison = getTotalDue(a) - getTotalDue(b);
        break;
      case "totalCards":
        comparison = a.cardCounts.total - b.cardCounts.total;
        break;
      case "lastReviewed":
        // Null values always sort to the end, regardless of direction
        if (!a.lastReviewedAt && !b.lastReviewedAt) comparison = 0;
        else if (!a.lastReviewedAt)
          return 1; // a goes to end
        else if (!b.lastReviewedAt)
          return -1; // b goes to end
        else
          comparison =
            new Date(a.lastReviewedAt).getTime() -
            new Date(b.lastReviewedAt).getTime();
        break;
      case "bookTitle":
        comparison = getDeckDisplayName(a).localeCompare(getDeckDisplayName(b));
        break;
      case "retentionRate":
        comparison = a.studyStats.retentionRate - b.studyStats.retentionRate;
        break;
      case "createdAt":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }

    return sortDirection === "desc" ? -comparison : comparison;
  });

  return sorted;
}

/**
 * Filter decks by status
 */
export function filterDecksByStatus(
  decks: FlashcardDeck[],
  status: DeckFilterStatus
): FlashcardDeck[] {
  switch (status) {
    case "hasDue":
      return decks.filter(hasDueCards);
    case "noDue":
      return decks.filter((d) => !hasDueCards(d));
    case "hasNew":
      return decks.filter(hasNewCards);
    case "all":
    default:
      return decks;
  }
}

/**
 * Filter decks by search query
 */
export function filterDecksBySearch(
  decks: FlashcardDeck[],
  search: string
): FlashcardDeck[] {
  if (!search.trim()) return decks;

  const query = search.toLowerCase().trim();
  return decks.filter((deck) => {
    const title = getDeckDisplayName(deck).toLowerCase();
    const author = getDeckDisplayAuthor(deck)?.toLowerCase() ?? "";
    const tags = deck.tags.join(" ").toLowerCase();
    return (
      title.includes(query) || author.includes(query) || tags.includes(query)
    );
  });
}

/**
 * Filter decks by tags
 */
export function filterDecksByTags(
  decks: FlashcardDeck[],
  tags: string[]
): FlashcardDeck[] {
  if (tags.length === 0) return decks;

  return decks.filter((deck) => tags.some((tag) => deck.tags.includes(tag)));
}

/**
 * Apply all filters and sorting to decks
 */
export function applyFiltersAndSort(
  decks: FlashcardDeck[],
  filters: DeckListFilters
): FlashcardDeck[] {
  let result = [...decks];

  // Apply status filter
  result = filterDecksByStatus(result, filters.status);

  // Apply search filter
  result = filterDecksBySearch(result, filters.search);

  // Apply tag filter
  result = filterDecksByTags(result, filters.tags);

  // Apply sorting
  result = sortDecks(result, filters.sortBy, filters.sortDirection);

  return result;
}

/**
 * Calculate summary stats for a list of decks
 */
export function calculateDeckListSummary(decks: FlashcardDeck[]): {
  totalDecks: number;
  totalCards: number;
  totalDue: number;
  totalOverdue: number;
  averageRetention: number;
} {
  const totalDecks = decks.length;
  const totalCards = decks.reduce((sum, d) => sum + d.cardCounts.total, 0);
  const totalDue = decks.reduce((sum, d) => sum + d.dueCounts.dueToday, 0);
  const totalOverdue = decks.reduce((sum, d) => sum + d.dueCounts.overdue, 0);

  const decksWithRetention = decks.filter(
    (d) => d.studyStats.retentionRate > 0
  );
  const averageRetention =
    decksWithRetention.length > 0
      ? decksWithRetention.reduce(
          (sum, d) => sum + d.studyStats.retentionRate,
          0
        ) / decksWithRetention.length
      : 0;

  return {
    totalDecks,
    totalCards,
    totalDue,
    totalOverdue,
    averageRetention,
  };
}

/**
 * Get all unique tags from decks
 */
export function getAllTags(decks: FlashcardDeck[]): string[] {
  const tagSet = new Set<string>();
  decks.forEach((deck) => {
    deck.tags.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}

/**
 * Create an empty deck for a book
 */
export function createEmptyDeck(
  bookId: string,
  book: DeckBookInfo | null
): FlashcardDeck {
  return {
    id: bookId,
    book,
    cardCounts: createDefaultCardCounts(),
    dueCounts: createDefaultDueCounts(),
    studyStats: createDefaultStudyStats(),
    tags: [],
    lastReviewedAt: null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Validate deck data structure
 */
export function isValidDeck(deck: unknown): deck is FlashcardDeck {
  if (!deck || typeof deck !== "object") return false;

  const d = deck as Record<string, unknown>;

  return (
    typeof d.id === "string" &&
    (d.book === null || (typeof d.book === "object" && d.book !== null)) &&
    typeof d.cardCounts === "object" &&
    d.cardCounts !== null &&
    typeof d.dueCounts === "object" &&
    d.dueCounts !== null &&
    typeof d.studyStats === "object" &&
    d.studyStats !== null &&
    Array.isArray(d.tags) &&
    typeof d.createdAt === "string"
  );
}

/**
 * Check if deck list is empty
 */
export function isDeckListEmpty(decks: FlashcardDeck[]): boolean {
  return decks.length === 0;
}

/**
 * Check if deck list has any due cards
 */
export function hasAnyDueCards(decks: FlashcardDeck[]): boolean {
  return decks.some(hasDueCards);
}

/**
 * Get decks with due cards, sorted by due count
 */
export function getDecksWithDue(decks: FlashcardDeck[]): FlashcardDeck[] {
  return sortDecks(decks.filter(hasDueCards), "dueCount", "desc");
}

/**
 * Format last reviewed date for display
 */
export function formatLastReviewed(dateStr: string | null): string {
  if (!dateStr) return "Never";

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Get study session priority (decks that need attention first)
 */
export function getStudyPriority(deck: FlashcardDeck): number {
  let priority = 0;

  // Overdue cards have highest priority
  priority += deck.dueCounts.overdue * 100;

  // Then cards due now
  priority += deck.dueCounts.dueNow * 10;

  // Low retention needs attention
  if (deck.studyStats.retentionRate < 70 && deck.studyStats.retentionRate > 0) {
    priority += 50;
  }

  return priority;
}

/**
 * Sort decks by study priority (most urgent first)
 */
export function sortByStudyPriority(decks: FlashcardDeck[]): FlashcardDeck[] {
  return [...decks].sort((a, b) => getStudyPriority(b) - getStudyPriority(a));
}
