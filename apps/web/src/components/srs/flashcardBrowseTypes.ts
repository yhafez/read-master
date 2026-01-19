/**
 * Flashcard Browse/Search Types
 *
 * Type definitions for the FlashcardBrowse component providing search,
 * filtering, bulk actions, and card management functionality.
 */

import type { FlashcardStatus, FlashcardType } from "./flashcardDeckTypes";
import type { StudyCardBook } from "./flashcardStudyTypes";

// =============================================================================
// CARD DATA TYPES
// =============================================================================

/**
 * Single flashcard for browsing/listing
 */
export type BrowseCard = {
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
  /** SRS state - ease factor */
  easeFactor: number;
  /** Current interval in days */
  interval: number;
  /** Number of reviews */
  repetitions: number;
  /** When the card is due */
  dueDate: string;
  /** Card creation date */
  createdAt: string;
  /** Last modified date */
  updatedAt: string;
};

// =============================================================================
// FILTER AND SORT TYPES
// =============================================================================

/**
 * Sort options for card browsing
 */
export type CardSortOption =
  | "createdAt"
  | "updatedAt"
  | "dueDate"
  | "easeFactor"
  | "interval"
  | "front"
  | "type";

/**
 * Sort direction
 */
export type CardSortDirection = "asc" | "desc";

/**
 * Filter options for card status
 */
export type CardStatusFilter =
  | "all"
  | "new"
  | "learning"
  | "review"
  | "suspended";

/**
 * Card due state filter
 */
export type CardDueFilter = "all" | "due" | "overdue" | "notDue";

/**
 * Browse filters configuration
 */
export type CardBrowseFilters = {
  /** Search query (searches front, back, tags) */
  search: string;
  /** Status filter */
  status: CardStatusFilter;
  /** Type filter (null = all types) */
  type: FlashcardType | null;
  /** Due state filter */
  dueState: CardDueFilter;
  /** Filter by specific book ID (null = all books) */
  bookId: string | null;
  /** Filter by tags (any match) */
  tags: string[];
  /** Sort field */
  sortBy: CardSortOption;
  /** Sort direction */
  sortDirection: CardSortDirection;
};

/**
 * Default browse filters
 */
export const DEFAULT_BROWSE_FILTERS: CardBrowseFilters = {
  search: "",
  status: "all",
  type: null,
  dueState: "all",
  bookId: null,
  tags: [],
  sortBy: "createdAt",
  sortDirection: "desc",
};

/**
 * Sort option configuration for UI
 */
export type CardSortConfig = {
  value: CardSortOption;
  labelKey: string;
};

/**
 * Available sort options
 */
export const CARD_SORT_OPTIONS: CardSortConfig[] = [
  { value: "createdAt", labelKey: "flashcards.browse.sort.createdAt" },
  { value: "updatedAt", labelKey: "flashcards.browse.sort.updatedAt" },
  { value: "dueDate", labelKey: "flashcards.browse.sort.dueDate" },
  { value: "easeFactor", labelKey: "flashcards.browse.sort.easeFactor" },
  { value: "interval", labelKey: "flashcards.browse.sort.interval" },
  { value: "front", labelKey: "flashcards.browse.sort.front" },
  { value: "type", labelKey: "flashcards.browse.sort.type" },
];

/**
 * Status filter configuration for UI
 */
export type CardStatusConfig = {
  value: CardStatusFilter;
  labelKey: string;
};

/**
 * Available status filters
 */
export const CARD_STATUS_FILTERS: CardStatusConfig[] = [
  { value: "all", labelKey: "flashcards.browse.status.all" },
  { value: "new", labelKey: "flashcards.browse.status.new" },
  { value: "learning", labelKey: "flashcards.browse.status.learning" },
  { value: "review", labelKey: "flashcards.browse.status.review" },
  { value: "suspended", labelKey: "flashcards.browse.status.suspended" },
];

/**
 * Due state filter configuration
 */
export type CardDueConfig = {
  value: CardDueFilter;
  labelKey: string;
};

/**
 * Available due state filters
 */
export const CARD_DUE_FILTERS: CardDueConfig[] = [
  { value: "all", labelKey: "flashcards.browse.due.all" },
  { value: "due", labelKey: "flashcards.browse.due.due" },
  { value: "overdue", labelKey: "flashcards.browse.due.overdue" },
  { value: "notDue", labelKey: "flashcards.browse.due.notDue" },
];

/**
 * Type filter configuration
 */
export type CardTypeConfig = {
  value: FlashcardType | null;
  labelKey: string;
};

/**
 * Available type filters
 */
export const CARD_TYPE_FILTERS: CardTypeConfig[] = [
  { value: null, labelKey: "flashcards.browse.type.all" },
  { value: "VOCABULARY", labelKey: "flashcards.browse.type.vocabulary" },
  { value: "CONCEPT", labelKey: "flashcards.browse.type.concept" },
  { value: "COMPREHENSION", labelKey: "flashcards.browse.type.comprehension" },
  { value: "QUOTE", labelKey: "flashcards.browse.type.quote" },
  { value: "CUSTOM", labelKey: "flashcards.browse.type.custom" },
];

// =============================================================================
// PAGINATION TYPES
// =============================================================================

/**
 * Pagination state
 */
export type CardPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

/**
 * Default pagination
 */
export const DEFAULT_PAGINATION: CardPagination = {
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
};

/**
 * Available page sizes
 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

// =============================================================================
// BULK ACTION TYPES
// =============================================================================

/**
 * Bulk action types
 */
export type BulkActionType =
  | "suspend"
  | "unsuspend"
  | "delete"
  | "addTag"
  | "removeTag"
  | "changeType";

/**
 * Bulk action configuration
 */
export type BulkActionConfig = {
  type: BulkActionType;
  labelKey: string;
  iconName: string;
  requiresInput: boolean;
  dangerous: boolean;
};

/**
 * Available bulk actions
 */
export const BULK_ACTIONS: BulkActionConfig[] = [
  {
    type: "suspend",
    labelKey: "flashcards.browse.bulk.suspend",
    iconName: "pause",
    requiresInput: false,
    dangerous: false,
  },
  {
    type: "unsuspend",
    labelKey: "flashcards.browse.bulk.unsuspend",
    iconName: "play",
    requiresInput: false,
    dangerous: false,
  },
  {
    type: "addTag",
    labelKey: "flashcards.browse.bulk.addTag",
    iconName: "label",
    requiresInput: true,
    dangerous: false,
  },
  {
    type: "removeTag",
    labelKey: "flashcards.browse.bulk.removeTag",
    iconName: "labelOff",
    requiresInput: true,
    dangerous: false,
  },
  {
    type: "changeType",
    labelKey: "flashcards.browse.bulk.changeType",
    iconName: "category",
    requiresInput: true,
    dangerous: false,
  },
  {
    type: "delete",
    labelKey: "flashcards.browse.bulk.delete",
    iconName: "delete",
    requiresInput: false,
    dangerous: true,
  },
];

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for FlashcardBrowse component
 */
export type FlashcardBrowseProps = {
  /** Initial filters to apply */
  initialFilters?: Partial<CardBrowseFilters>;
  /** Initial book ID filter */
  initialBookId?: string;
  /** Callback when card is clicked for details */
  onCardClick?: (cardId: string) => void;
  /** Callback when edit is requested */
  onEditCard?: (cardId: string) => void;
  /** Callback when study is requested */
  onStudyCard?: (cardId: string) => void;
  /** Whether to show bulk actions */
  showBulkActions?: boolean;
  /** Custom className */
  className?: string;
};

/**
 * Props for CardListItem component
 */
export type CardListItemProps = {
  /** Card data */
  card: BrowseCard;
  /** Whether the card is selected */
  selected?: boolean;
  /** Callback when selection changes */
  onSelect?: (selected: boolean) => void;
  /** Callback when clicked */
  onClick?: () => void;
  /** Callback when edit is clicked */
  onEdit?: () => void;
  /** Callback when study is clicked */
  onStudy?: () => void;
  /** Custom className */
  className?: string;
};

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Browse error types
 */
export type BrowseErrorType =
  | "network_error"
  | "not_found"
  | "unauthorized"
  | "bulk_action_failed"
  | "unknown";

/**
 * Browse error structure
 */
export type BrowseError = {
  type: BrowseErrorType;
  message: string;
  retryable: boolean;
};

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * API response for card list
 */
export type CardListResponse = {
  cards: BrowseCard[];
  pagination: CardPagination;
  summary: CardListSummary;
};

/**
 * Summary stats for card list
 */
export type CardListSummary = {
  totalCards: number;
  totalDue: number;
  totalOverdue: number;
  byStatus: Record<FlashcardStatus, number>;
  byType: Record<FlashcardType, number>;
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a browse error
 */
export function createBrowseError(
  type: BrowseErrorType,
  message?: string
): BrowseError {
  const defaultMessages: Record<BrowseErrorType, string> = {
    network_error: "Unable to connect. Please check your internet connection.",
    not_found: "No flashcards found.",
    unauthorized: "You are not authorized to view flashcards.",
    bulk_action_failed: "Bulk action failed. Please try again.",
    unknown: "An unexpected error occurred. Please try again.",
  };

  const retryableErrors: BrowseErrorType[] = [
    "network_error",
    "bulk_action_failed",
  ];

  return {
    type,
    message: message ?? defaultMessages[type],
    retryable: retryableErrors.includes(type),
  };
}

/**
 * Parse API error to browse error
 */
export function parseBrowseApiError(
  status: number,
  errorMessage?: string
): BrowseError {
  if (status === 404) {
    return createBrowseError("not_found", errorMessage);
  }
  if (status === 401 || status === 403) {
    return createBrowseError("unauthorized", errorMessage);
  }
  if (status === 0) {
    return createBrowseError("network_error");
  }
  return createBrowseError("unknown", errorMessage);
}

/**
 * Check if card is due
 */
export function isCardDue(card: BrowseCard): boolean {
  const now = new Date();
  const dueDate = new Date(card.dueDate);
  return dueDate <= now;
}

/**
 * Check if card is overdue (due more than 24 hours ago)
 */
export function isCardOverdue(card: BrowseCard): boolean {
  const now = new Date();
  const dueDate = new Date(card.dueDate);
  const hoursSinceDue = (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60);
  return hoursSinceDue > 24;
}

/**
 * Get card due state
 */
export function getCardDueState(card: BrowseCard): CardDueFilter {
  if (isCardOverdue(card)) return "overdue";
  if (isCardDue(card)) return "due";
  return "notDue";
}

/**
 * Convert status string to CardStatusFilter
 */
export function statusToFilter(status: FlashcardStatus): CardStatusFilter {
  switch (status) {
    case "NEW":
      return "new";
    case "LEARNING":
      return "learning";
    case "REVIEW":
      return "review";
    case "SUSPENDED":
      return "suspended";
    default:
      return "all";
  }
}

/**
 * Filter cards by search query
 */
export function filterBySearch(
  cards: BrowseCard[],
  search: string
): BrowseCard[] {
  if (!search.trim()) return cards;

  const query = search.toLowerCase().trim();
  return cards.filter((card) => {
    const front = card.front.toLowerCase();
    const back = card.back.toLowerCase();
    const tags = card.tags.join(" ").toLowerCase();
    const bookTitle = card.book?.title.toLowerCase() ?? "";
    return (
      front.includes(query) ||
      back.includes(query) ||
      tags.includes(query) ||
      bookTitle.includes(query)
    );
  });
}

/**
 * Filter cards by status
 */
export function filterByStatus(
  cards: BrowseCard[],
  status: CardStatusFilter
): BrowseCard[] {
  if (status === "all") return cards;

  const statusMap: Record<Exclude<CardStatusFilter, "all">, FlashcardStatus> = {
    new: "NEW",
    learning: "LEARNING",
    review: "REVIEW",
    suspended: "SUSPENDED",
  };

  return cards.filter((card) => card.status === statusMap[status]);
}

/**
 * Filter cards by type
 */
export function filterByType(
  cards: BrowseCard[],
  type: FlashcardType | null
): BrowseCard[] {
  if (type === null) return cards;
  return cards.filter((card) => card.type === type);
}

/**
 * Filter cards by due state
 */
export function filterByDueState(
  cards: BrowseCard[],
  dueState: CardDueFilter
): BrowseCard[] {
  if (dueState === "all") return cards;
  return cards.filter((card) => getCardDueState(card) === dueState);
}

/**
 * Filter cards by book
 */
export function filterByBook(
  cards: BrowseCard[],
  bookId: string | null
): BrowseCard[] {
  if (bookId === null) return cards;
  return cards.filter((card) => card.book?.id === bookId);
}

/**
 * Filter cards by tags (any match)
 */
export function filterByTags(
  cards: BrowseCard[],
  tags: string[]
): BrowseCard[] {
  if (tags.length === 0) return cards;
  return cards.filter((card) => tags.some((tag) => card.tags.includes(tag)));
}

/**
 * Sort cards by specified field
 */
export function sortCards(
  cards: BrowseCard[],
  sortBy: CardSortOption,
  sortDirection: CardSortDirection
): BrowseCard[] {
  const sorted = [...cards].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "createdAt":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "updatedAt":
        comparison =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case "dueDate":
        comparison =
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        break;
      case "easeFactor":
        comparison = a.easeFactor - b.easeFactor;
        break;
      case "interval":
        comparison = a.interval - b.interval;
        break;
      case "front":
        comparison = a.front.localeCompare(b.front);
        break;
      case "type":
        comparison = a.type.localeCompare(b.type);
        break;
    }

    return sortDirection === "desc" ? -comparison : comparison;
  });

  return sorted;
}

/**
 * Apply all filters and sorting to cards
 */
export function applyFiltersAndSort(
  cards: BrowseCard[],
  filters: CardBrowseFilters
): BrowseCard[] {
  let result = [...cards];

  // Apply search filter
  result = filterBySearch(result, filters.search);

  // Apply status filter
  result = filterByStatus(result, filters.status);

  // Apply type filter
  result = filterByType(result, filters.type);

  // Apply due state filter
  result = filterByDueState(result, filters.dueState);

  // Apply book filter
  result = filterByBook(result, filters.bookId);

  // Apply tag filter
  result = filterByTags(result, filters.tags);

  // Apply sorting
  result = sortCards(result, filters.sortBy, filters.sortDirection);

  return result;
}

/**
 * Paginate cards
 */
export function paginateCards(
  cards: BrowseCard[],
  page: number,
  pageSize: number
): { cards: BrowseCard[]; pagination: CardPagination } {
  const totalItems = cards.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const validPage = Math.max(1, Math.min(page, totalPages || 1));

  const startIndex = (validPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCards = cards.slice(startIndex, endIndex);

  return {
    cards: paginatedCards,
    pagination: {
      page: validPage,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

/**
 * Calculate summary stats
 */
export function calculateSummary(cards: BrowseCard[]): CardListSummary {
  const byStatus: Record<FlashcardStatus, number> = {
    NEW: 0,
    LEARNING: 0,
    REVIEW: 0,
    SUSPENDED: 0,
  };

  const byType: Record<FlashcardType, number> = {
    VOCABULARY: 0,
    CONCEPT: 0,
    COMPREHENSION: 0,
    QUOTE: 0,
    CUSTOM: 0,
  };

  let totalDue = 0;
  let totalOverdue = 0;

  for (const card of cards) {
    byStatus[card.status]++;
    byType[card.type]++;

    if (isCardDue(card)) {
      totalDue++;
      if (isCardOverdue(card)) {
        totalOverdue++;
      }
    }
  }

  return {
    totalCards: cards.length,
    totalDue,
    totalOverdue,
    byStatus,
    byType,
  };
}

/**
 * Get all unique tags from cards
 */
export function getAllTags(cards: BrowseCard[]): string[] {
  const tagSet = new Set<string>();
  for (const card of cards) {
    for (const tag of card.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}

/**
 * Get all unique books from cards
 */
export function getAllBooks(
  cards: BrowseCard[]
): Array<{ id: string; title: string }> {
  const bookMap = new Map<string, string>();
  for (const card of cards) {
    if (card.book && !bookMap.has(card.book.id)) {
      bookMap.set(card.book.id, card.book.title);
    }
  }
  return Array.from(bookMap.entries())
    .map(([id, title]) => ({ id, title }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Format interval for display
 */
export function formatInterval(days: number): string {
  if (days < 1) return "< 1 day";
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  if (days < 14) return "1 week";
  if (days < 30) return `${Math.round(days / 7)} weeks`;
  if (days < 60) return "1 month";
  if (days < 365) return `${Math.round(days / 30)} months`;
  if (days < 730) return "1 year";
  return `${Math.round(days / 365)} years`;
}

/**
 * Format ease factor for display
 */
export function formatEaseFactor(easeFactor: number): string {
  return easeFactor.toFixed(2);
}

/**
 * Get status badge color
 */
export function getStatusColor(
  status: FlashcardStatus
): "default" | "info" | "warning" | "success" | "error" {
  switch (status) {
    case "NEW":
      return "info";
    case "LEARNING":
      return "warning";
    case "REVIEW":
      return "success";
    case "SUSPENDED":
      return "error";
    default:
      return "default";
  }
}

/**
 * Get type chip color
 */
export function getTypeColor(
  type: FlashcardType
): "default" | "primary" | "secondary" | "info" | "warning" {
  switch (type) {
    case "VOCABULARY":
      return "primary";
    case "CONCEPT":
      return "secondary";
    case "COMPREHENSION":
      return "info";
    case "QUOTE":
      return "warning";
    case "CUSTOM":
    default:
      return "default";
  }
}

/**
 * Truncate text for display
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Get type display name (for when translation is not available)
 */
export function getTypeName(type: FlashcardType): string {
  const names: Record<FlashcardType, string> = {
    VOCABULARY: "Vocabulary",
    CONCEPT: "Concept",
    COMPREHENSION: "Comprehension",
    QUOTE: "Quote",
    CUSTOM: "Custom",
  };
  return names[type];
}

/**
 * Get status display name (for when translation is not available)
 */
export function getStatusName(status: FlashcardStatus): string {
  const names: Record<FlashcardStatus, string> = {
    NEW: "New",
    LEARNING: "Learning",
    REVIEW: "Review",
    SUSPENDED: "Suspended",
  };
  return names[status];
}

/**
 * Check if filters are at default values
 */
export function isDefaultFilters(filters: CardBrowseFilters): boolean {
  const defaults = DEFAULT_BROWSE_FILTERS;
  return (
    filters.search === defaults.search &&
    filters.status === defaults.status &&
    filters.type === defaults.type &&
    filters.dueState === defaults.dueState &&
    filters.bookId === defaults.bookId &&
    filters.tags.length === 0
  );
}

/**
 * Count active filters
 */
export function countActiveFilters(filters: CardBrowseFilters): number {
  let count = 0;
  if (filters.search) count++;
  if (filters.status !== "all") count++;
  if (filters.type !== null) count++;
  if (filters.dueState !== "all") count++;
  if (filters.bookId !== null) count++;
  if (filters.tags.length > 0) count++;
  return count;
}

/**
 * Validate browse card structure
 */
export function isValidBrowseCard(card: unknown): card is BrowseCard {
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
    typeof c.dueDate === "string" &&
    typeof c.createdAt === "string" &&
    typeof c.updatedAt === "string"
  );
}

/**
 * Create empty browse card (for testing/placeholder)
 */
export function createEmptyBrowseCard(id: string = "test-card"): BrowseCard {
  const now = new Date().toISOString();
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
    dueDate: now,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format relative time for due date
 */
export function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -7) return formatDate(dateStr);
  if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === -1) return "1 day overdue";
  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays < 7) return `Due in ${diffDays} days`;
  if (diffDays < 14) return "Due in 1 week";
  if (diffDays < 30) return `Due in ${Math.floor(diffDays / 7)} weeks`;
  return formatDate(dateStr);
}
