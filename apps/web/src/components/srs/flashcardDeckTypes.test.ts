/**
 * Flashcard Deck Types Tests
 *
 * Comprehensive tests for flashcardDeckTypes.ts utility functions.
 */

import { describe, expect, it } from "vitest";
import {
  applyFiltersAndSort,
  calculateDeckListSummary,
  createDeckListError,
  createDefaultCardCounts,
  createDefaultDueCounts,
  createDefaultStudyStats,
  createEmptyDeck,
  DEFAULT_DECK_FILTERS,
  FILTER_STATUSES,
  filterDecksBySearch,
  filterDecksByStatus,
  filterDecksByTags,
  formatCardCount,
  formatDueCount,
  formatLastReviewed,
  formatRetentionRate,
  getActiveCardCount,
  getAllTags,
  getDeckDisplayAuthor,
  getDeckDisplayName,
  getDecksWithDue,
  getDueBadgeColor,
  getRetentionColor,
  getStudyPriority,
  getTotalDue,
  hasAnyDueCards,
  hasDueCards,
  hasNewCards,
  hasOverdueCards,
  isUnassignedDeck,
  isValidDeck,
  isDeckListEmpty,
  parseApiError,
  sortByStudyPriority,
  sortDecks,
  SORT_OPTIONS,
  UNASSIGNED_DECK_ID,
  type CardCounts,
  type DeckBookInfo,
  type DeckListError,
  type DeckListFilters,
  type DueCounts,
  type DeckStudyStats,
  type FlashcardDeck,
} from "./flashcardDeckTypes";

// =============================================================================
// TEST FIXTURES
// =============================================================================

const createMockBook = (overrides?: Partial<DeckBookInfo>): DeckBookInfo => ({
  id: "book1",
  title: "Test Book",
  author: "Test Author",
  coverUrl: "https://example.com/cover.jpg",
  ...overrides,
});

const createMockDeck = (overrides?: Partial<FlashcardDeck>): FlashcardDeck => ({
  id: "deck1",
  book: createMockBook(),
  cardCounts: {
    total: 100,
    new: 20,
    learning: 30,
    review: 40,
    suspended: 10,
  },
  dueCounts: {
    dueNow: 15,
    overdue: 5,
    dueToday: 25,
    dueTomorrow: 10,
  },
  studyStats: {
    reviewedToday: 50,
    correctToday: 45,
    retentionRate: 90,
    currentStreak: 7,
    averageEaseFactor: 2.5,
  },
  tags: ["vocabulary", "chapter-1"],
  lastReviewedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  ...overrides,
});

const createUnassignedDeck = (
  overrides?: Partial<FlashcardDeck>
): FlashcardDeck =>
  createMockDeck({
    id: UNASSIGNED_DECK_ID,
    book: null,
    ...overrides,
  });

// =============================================================================
// TYPE EXPORT TESTS
// =============================================================================

describe("Type Exports", () => {
  it("should export CardCounts type", () => {
    const counts: CardCounts = {
      total: 100,
      new: 20,
      learning: 30,
      review: 40,
      suspended: 10,
    };
    expect(counts).toBeDefined();
  });

  it("should export DueCounts type", () => {
    const dueCounts: DueCounts = {
      dueNow: 10,
      overdue: 5,
      dueToday: 15,
      dueTomorrow: 20,
    };
    expect(dueCounts).toBeDefined();
  });

  it("should export DeckStudyStats type", () => {
    const stats: DeckStudyStats = {
      reviewedToday: 50,
      correctToday: 45,
      retentionRate: 90,
      currentStreak: 7,
      averageEaseFactor: 2.5,
    };
    expect(stats).toBeDefined();
  });

  it("should export FlashcardDeck type", () => {
    const deck: FlashcardDeck = createMockDeck();
    expect(deck).toBeDefined();
  });

  it("should export DeckListFilters type", () => {
    const filters: DeckListFilters = DEFAULT_DECK_FILTERS;
    expect(filters).toBeDefined();
  });

  it("should export DeckListError type", () => {
    const error: DeckListError = {
      type: "network_error",
      message: "Test error",
      retryable: true,
    };
    expect(error).toBeDefined();
  });
});

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Constants", () => {
  it("should define UNASSIGNED_DECK_ID", () => {
    expect(UNASSIGNED_DECK_ID).toBe("unassigned");
  });

  it("should define DEFAULT_DECK_FILTERS", () => {
    expect(DEFAULT_DECK_FILTERS).toEqual({
      status: "all",
      search: "",
      sortBy: "dueCount",
      sortDirection: "desc",
      tags: [],
    });
  });

  it("should define SORT_OPTIONS", () => {
    expect(SORT_OPTIONS).toHaveLength(6);
    expect(SORT_OPTIONS.map((o) => o.value)).toContain("dueCount");
    expect(SORT_OPTIONS.map((o) => o.value)).toContain("totalCards");
    expect(SORT_OPTIONS.map((o) => o.value)).toContain("lastReviewed");
    expect(SORT_OPTIONS.map((o) => o.value)).toContain("bookTitle");
    expect(SORT_OPTIONS.map((o) => o.value)).toContain("retentionRate");
    expect(SORT_OPTIONS.map((o) => o.value)).toContain("createdAt");
  });

  it("should define FILTER_STATUSES", () => {
    expect(FILTER_STATUSES).toHaveLength(4);
    expect(FILTER_STATUSES.map((s) => s.value)).toContain("all");
    expect(FILTER_STATUSES.map((s) => s.value)).toContain("hasDue");
    expect(FILTER_STATUSES.map((s) => s.value)).toContain("noDue");
    expect(FILTER_STATUSES.map((s) => s.value)).toContain("hasNew");
  });
});

// =============================================================================
// DEFAULT VALUE CREATORS TESTS
// =============================================================================

describe("createDefaultCardCounts", () => {
  it("should create default card counts with all zeros", () => {
    const counts = createDefaultCardCounts();
    expect(counts).toEqual({
      total: 0,
      new: 0,
      learning: 0,
      review: 0,
      suspended: 0,
    });
  });
});

describe("createDefaultDueCounts", () => {
  it("should create default due counts with all zeros", () => {
    const counts = createDefaultDueCounts();
    expect(counts).toEqual({
      dueNow: 0,
      overdue: 0,
      dueToday: 0,
      dueTomorrow: 0,
    });
  });
});

describe("createDefaultStudyStats", () => {
  it("should create default study stats with zeros and null", () => {
    const stats = createDefaultStudyStats();
    expect(stats).toEqual({
      reviewedToday: 0,
      correctToday: 0,
      retentionRate: 0,
      currentStreak: 0,
      averageEaseFactor: null,
    });
  });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe("createDeckListError", () => {
  it("should create network error with default message", () => {
    const error = createDeckListError("network_error");
    expect(error.type).toBe("network_error");
    expect(error.message).toContain("Unable to connect");
    expect(error.retryable).toBe(true);
  });

  it("should create not_found error (non-retryable)", () => {
    const error = createDeckListError("not_found");
    expect(error.type).toBe("not_found");
    expect(error.retryable).toBe(false);
  });

  it("should create unauthorized error (non-retryable)", () => {
    const error = createDeckListError("unauthorized");
    expect(error.type).toBe("unauthorized");
    expect(error.retryable).toBe(false);
  });

  it("should create unknown error (non-retryable)", () => {
    const error = createDeckListError("unknown");
    expect(error.type).toBe("unknown");
    expect(error.retryable).toBe(false);
  });

  it("should use custom message when provided", () => {
    const error = createDeckListError("network_error", "Custom message");
    expect(error.message).toBe("Custom message");
  });
});

describe("parseApiError", () => {
  it("should parse 404 as not_found", () => {
    const error = parseApiError(404);
    expect(error.type).toBe("not_found");
  });

  it("should parse 401 as unauthorized", () => {
    const error = parseApiError(401);
    expect(error.type).toBe("unauthorized");
  });

  it("should parse 403 as unauthorized", () => {
    const error = parseApiError(403);
    expect(error.type).toBe("unauthorized");
  });

  it("should parse 0 (no response) as network_error", () => {
    const error = parseApiError(0);
    expect(error.type).toBe("network_error");
    expect(error.retryable).toBe(true);
  });

  it("should parse 500 as unknown", () => {
    const error = parseApiError(500);
    expect(error.type).toBe("unknown");
  });

  it("should include custom error message", () => {
    const error = parseApiError(500, "Server error");
    expect(error.message).toBe("Server error");
  });
});

// =============================================================================
// DECK DATA ACCESSOR TESTS
// =============================================================================

describe("getTotalDue", () => {
  it("should return dueToday count", () => {
    const deck = createMockDeck({
      dueCounts: { dueNow: 10, overdue: 5, dueToday: 25, dueTomorrow: 8 },
    });
    expect(getTotalDue(deck)).toBe(25);
  });

  it("should return 0 for no due cards", () => {
    const deck = createMockDeck({ dueCounts: createDefaultDueCounts() });
    expect(getTotalDue(deck)).toBe(0);
  });
});

describe("getActiveCardCount", () => {
  it("should return total minus suspended", () => {
    const deck = createMockDeck({
      cardCounts: {
        total: 100,
        new: 20,
        learning: 30,
        review: 40,
        suspended: 10,
      },
    });
    expect(getActiveCardCount(deck)).toBe(90);
  });

  it("should return total when no suspended cards", () => {
    const deck = createMockDeck({
      cardCounts: {
        total: 50,
        new: 10,
        learning: 20,
        review: 20,
        suspended: 0,
      },
    });
    expect(getActiveCardCount(deck)).toBe(50);
  });
});

describe("hasDueCards", () => {
  it("should return true when dueToday > 0", () => {
    const deck = createMockDeck();
    expect(hasDueCards(deck)).toBe(true);
  });

  it("should return false when dueToday = 0", () => {
    const deck = createMockDeck({ dueCounts: createDefaultDueCounts() });
    expect(hasDueCards(deck)).toBe(false);
  });
});

describe("hasNewCards", () => {
  it("should return true when new > 0", () => {
    const deck = createMockDeck();
    expect(hasNewCards(deck)).toBe(true);
  });

  it("should return false when new = 0", () => {
    const deck = createMockDeck({
      cardCounts: { ...createDefaultCardCounts(), total: 50 },
    });
    expect(hasNewCards(deck)).toBe(false);
  });
});

describe("hasOverdueCards", () => {
  it("should return true when overdue > 0", () => {
    const deck = createMockDeck();
    expect(hasOverdueCards(deck)).toBe(true);
  });

  it("should return false when overdue = 0", () => {
    const deck = createMockDeck({
      dueCounts: { ...createDefaultDueCounts(), dueToday: 10 },
    });
    expect(hasOverdueCards(deck)).toBe(false);
  });
});

describe("isUnassignedDeck", () => {
  it("should return true for UNASSIGNED_DECK_ID", () => {
    const deck = createUnassignedDeck();
    expect(isUnassignedDeck(deck)).toBe(true);
  });

  it("should return true when book is null", () => {
    const deck = createMockDeck({ id: "custom-id", book: null });
    expect(isUnassignedDeck(deck)).toBe(true);
  });

  it("should return false for deck with book", () => {
    const deck = createMockDeck();
    expect(isUnassignedDeck(deck)).toBe(false);
  });
});

describe("getDeckDisplayName", () => {
  it("should return book title when book exists", () => {
    const deck = createMockDeck();
    expect(getDeckDisplayName(deck)).toBe("Test Book");
  });

  it("should return 'Unassigned Cards' when no book", () => {
    const deck = createUnassignedDeck();
    expect(getDeckDisplayName(deck)).toBe("Unassigned Cards");
  });
});

describe("getDeckDisplayAuthor", () => {
  it("should return author when book exists", () => {
    const deck = createMockDeck();
    expect(getDeckDisplayAuthor(deck)).toBe("Test Author");
  });

  it("should return null when no book", () => {
    const deck = createUnassignedDeck();
    expect(getDeckDisplayAuthor(deck)).toBeNull();
  });

  it("should return null when author is null", () => {
    const deck = createMockDeck({
      book: createMockBook({ author: null }),
    });
    expect(getDeckDisplayAuthor(deck)).toBeNull();
  });
});

// =============================================================================
// FORMATTING TESTS
// =============================================================================

describe("formatRetentionRate", () => {
  it("should format retention rate as percentage", () => {
    expect(formatRetentionRate(90)).toBe("90%");
  });

  it("should round to nearest integer", () => {
    expect(formatRetentionRate(85.7)).toBe("86%");
    expect(formatRetentionRate(85.3)).toBe("85%");
  });

  it("should handle 0%", () => {
    expect(formatRetentionRate(0)).toBe("0%");
  });

  it("should handle 100%", () => {
    expect(formatRetentionRate(100)).toBe("100%");
  });
});

describe("formatDueCount", () => {
  it("should format normal counts", () => {
    expect(formatDueCount(25)).toBe("25");
    expect(formatDueCount(100)).toBe("100");
  });

  it("should return '0' for zero", () => {
    expect(formatDueCount(0)).toBe("0");
  });

  it("should return '999+' for counts over 999", () => {
    expect(formatDueCount(1000)).toBe("999+");
    expect(formatDueCount(5000)).toBe("999+");
  });
});

describe("formatCardCount", () => {
  it("should format normal counts with locale", () => {
    expect(formatCardCount(100)).toBe("100");
    expect(formatCardCount(1000)).toBe("1,000");
  });

  it("should format large counts in thousands", () => {
    expect(formatCardCount(10000)).toBe("10k");
    expect(formatCardCount(25000)).toBe("25k");
  });

  it("should handle zero", () => {
    expect(formatCardCount(0)).toBe("0");
  });
});

describe("formatLastReviewed", () => {
  it("should return 'Never' for null", () => {
    expect(formatLastReviewed(null)).toBe("Never");
  });

  it("should return 'Today' for today's date", () => {
    const today = new Date().toISOString();
    expect(formatLastReviewed(today)).toBe("Today");
  });

  it("should return 'Yesterday' for yesterday", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(formatLastReviewed(yesterday)).toBe("Yesterday");
  });

  it("should return 'X days ago' for recent dates", () => {
    const threeDaysAgo = new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(formatLastReviewed(threeDaysAgo)).toBe("3 days ago");
  });

  it("should return 'X weeks ago' for older dates", () => {
    const twoWeeksAgo = new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(formatLastReviewed(twoWeeksAgo)).toBe("2 weeks ago");
  });

  it("should return 'X months ago' for much older dates", () => {
    const twoMonthsAgo = new Date(
      Date.now() - 60 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(formatLastReviewed(twoMonthsAgo)).toBe("2 months ago");
  });
});

// =============================================================================
// COLOR/BADGE TESTS
// =============================================================================

describe("getDueBadgeColor", () => {
  it("should return 'error' when overdue cards exist", () => {
    const deck = createMockDeck();
    expect(getDueBadgeColor(deck)).toBe("error");
  });

  it("should return 'warning' when due now but not overdue", () => {
    const deck = createMockDeck({
      dueCounts: { dueNow: 10, overdue: 0, dueToday: 10, dueTomorrow: 5 },
    });
    expect(getDueBadgeColor(deck)).toBe("warning");
  });

  it("should return 'success' when no cards due today", () => {
    const deck = createMockDeck({
      dueCounts: createDefaultDueCounts(),
    });
    expect(getDueBadgeColor(deck)).toBe("success");
  });

  it("should return 'default' for other cases", () => {
    const deck = createMockDeck({
      dueCounts: { dueNow: 0, overdue: 0, dueToday: 5, dueTomorrow: 10 },
    });
    expect(getDueBadgeColor(deck)).toBe("default");
  });
});

describe("getRetentionColor", () => {
  it("should return 'success' for 90%+", () => {
    expect(getRetentionColor(90)).toBe("success");
    expect(getRetentionColor(100)).toBe("success");
  });

  it("should return 'warning' for 70-89%", () => {
    expect(getRetentionColor(70)).toBe("warning");
    expect(getRetentionColor(85)).toBe("warning");
  });

  it("should return 'error' for below 70%", () => {
    expect(getRetentionColor(50)).toBe("error");
    expect(getRetentionColor(69)).toBe("error");
  });

  it("should return 'inherit' for 0%", () => {
    expect(getRetentionColor(0)).toBe("inherit");
  });
});

// =============================================================================
// SORTING TESTS
// =============================================================================

describe("sortDecks", () => {
  const deck1 = createMockDeck({
    id: "deck1",
    book: createMockBook({ title: "Alpha Book" }),
    dueCounts: { dueNow: 5, overdue: 0, dueToday: 10, dueTomorrow: 5 },
    cardCounts: { total: 50, new: 10, learning: 20, review: 15, suspended: 5 },
    studyStats: {
      reviewedToday: 20,
      correctToday: 18,
      retentionRate: 90,
      currentStreak: 5,
      averageEaseFactor: 2.5,
    },
    createdAt: "2024-01-01T00:00:00Z",
    lastReviewedAt: "2024-06-01T00:00:00Z",
  });
  const deck2 = createMockDeck({
    id: "deck2",
    book: createMockBook({ title: "Beta Book" }),
    dueCounts: { dueNow: 15, overdue: 5, dueToday: 25, dueTomorrow: 10 },
    cardCounts: {
      total: 100,
      new: 20,
      learning: 30,
      review: 40,
      suspended: 10,
    },
    studyStats: {
      reviewedToday: 50,
      correctToday: 40,
      retentionRate: 80,
      currentStreak: 3,
      averageEaseFactor: 2.3,
    },
    createdAt: "2024-02-01T00:00:00Z",
    lastReviewedAt: "2024-07-01T00:00:00Z",
  });

  it("should sort by dueCount desc", () => {
    const sorted = sortDecks([deck1, deck2], "dueCount", "desc");
    expect(sorted).toHaveLength(2);
    expect(sorted[0]!.id).toBe("deck2");
  });

  it("should sort by dueCount asc", () => {
    const sorted = sortDecks([deck1, deck2], "dueCount", "asc");
    expect(sorted).toHaveLength(2);
    expect(sorted[0]!.id).toBe("deck1");
  });

  it("should sort by totalCards desc", () => {
    const sorted = sortDecks([deck1, deck2], "totalCards", "desc");
    expect(sorted).toHaveLength(2);
    expect(sorted[0]!.id).toBe("deck2");
  });

  it("should sort by bookTitle asc", () => {
    const sorted = sortDecks([deck1, deck2], "bookTitle", "asc");
    expect(sorted).toHaveLength(2);
    expect(sorted[0]!.id).toBe("deck1");
  });

  it("should sort by bookTitle desc", () => {
    const sorted = sortDecks([deck1, deck2], "bookTitle", "desc");
    expect(sorted).toHaveLength(2);
    expect(sorted[0]!.id).toBe("deck2");
  });

  it("should sort by retentionRate desc", () => {
    const sorted = sortDecks([deck1, deck2], "retentionRate", "desc");
    expect(sorted).toHaveLength(2);
    expect(sorted[0]!.id).toBe("deck1");
  });

  it("should sort by createdAt asc", () => {
    const sorted = sortDecks([deck1, deck2], "createdAt", "asc");
    expect(sorted).toHaveLength(2);
    expect(sorted[0]!.id).toBe("deck1");
  });

  it("should sort by lastReviewed desc", () => {
    const sorted = sortDecks([deck1, deck2], "lastReviewed", "desc");
    expect(sorted).toHaveLength(2);
    expect(sorted[0]!.id).toBe("deck2");
  });

  it("should handle null lastReviewedAt", () => {
    const deckWithNull = createMockDeck({ id: "deck3", lastReviewedAt: null });
    const sorted = sortDecks([deck1, deckWithNull], "lastReviewed", "desc");
    expect(sorted).toHaveLength(2);
    expect(sorted[0]!.id).toBe("deck1");
  });
});

// =============================================================================
// FILTERING TESTS
// =============================================================================

describe("filterDecksByStatus", () => {
  const deckWithDue = createMockDeck({ id: "with-due" });
  const deckNoDue = createMockDeck({
    id: "no-due",
    dueCounts: createDefaultDueCounts(),
    cardCounts: { total: 20, new: 0, learning: 10, review: 10, suspended: 0 },
  });
  const deckWithNew = createMockDeck({
    id: "with-new",
    dueCounts: createDefaultDueCounts(),
    cardCounts: { total: 20, new: 10, learning: 5, review: 5, suspended: 0 },
  });

  it("should return all decks for 'all' filter", () => {
    const result = filterDecksByStatus([deckWithDue, deckNoDue], "all");
    expect(result).toHaveLength(2);
  });

  it("should filter to only decks with due cards", () => {
    const result = filterDecksByStatus([deckWithDue, deckNoDue], "hasDue");
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("with-due");
  });

  it("should filter to only decks without due cards", () => {
    const result = filterDecksByStatus([deckWithDue, deckNoDue], "noDue");
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("no-due");
  });

  it("should filter to only decks with new cards", () => {
    const result = filterDecksByStatus(
      [deckWithDue, deckNoDue, deckWithNew],
      "hasNew"
    );
    expect(result).toHaveLength(2);
  });
});

describe("filterDecksBySearch", () => {
  const deck1 = createMockDeck({
    id: "deck1",
    book: createMockBook({
      title: "Introduction to JavaScript",
      author: "John Smith",
    }),
    tags: ["programming", "web"],
  });
  const deck2 = createMockDeck({
    id: "deck2",
    book: createMockBook({ title: "Python Basics", author: "Jane Doe" }),
    tags: ["programming", "python"],
  });

  it("should return all decks for empty search", () => {
    const result = filterDecksBySearch([deck1, deck2], "");
    expect(result).toHaveLength(2);
  });

  it("should filter by book title", () => {
    const result = filterDecksBySearch([deck1, deck2], "javascript");
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("deck1");
  });

  it("should filter by author", () => {
    const result = filterDecksBySearch([deck1, deck2], "jane");
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("deck2");
  });

  it("should filter by tags", () => {
    const result = filterDecksBySearch([deck1, deck2], "python");
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("deck2");
  });

  it("should be case insensitive", () => {
    const result = filterDecksBySearch([deck1, deck2], "JAVASCRIPT");
    expect(result).toHaveLength(1);
  });
});

describe("filterDecksByTags", () => {
  const deck1 = createMockDeck({
    id: "deck1",
    tags: ["vocabulary", "chapter-1"],
  });
  const deck2 = createMockDeck({
    id: "deck2",
    tags: ["concepts", "chapter-2"],
  });
  const deck3 = createMockDeck({ id: "deck3", tags: ["vocabulary", "quiz"] });

  it("should return all decks for empty tags array", () => {
    const result = filterDecksByTags([deck1, deck2, deck3], []);
    expect(result).toHaveLength(3);
  });

  it("should filter to decks with matching tags", () => {
    const result = filterDecksByTags([deck1, deck2, deck3], ["vocabulary"]);
    expect(result).toHaveLength(2);
    expect(result.map((d) => d.id)).toContain("deck1");
    expect(result.map((d) => d.id)).toContain("deck3");
  });

  it("should match any tag (OR logic)", () => {
    const result = filterDecksByTags(
      [deck1, deck2, deck3],
      ["chapter-1", "concepts"]
    );
    expect(result).toHaveLength(2);
  });
});

describe("applyFiltersAndSort", () => {
  const decks = [
    createMockDeck({
      id: "deck1",
      book: createMockBook({ title: "Alpha" }),
      dueCounts: { dueNow: 10, overdue: 0, dueToday: 15, dueTomorrow: 5 },
    }),
    createMockDeck({
      id: "deck2",
      book: createMockBook({ title: "Beta" }),
      dueCounts: createDefaultDueCounts(),
    }),
  ];

  it("should apply default filters correctly", () => {
    const result = applyFiltersAndSort(decks, DEFAULT_DECK_FILTERS);
    expect(result).toHaveLength(2);
    // Should be sorted by dueCount desc, so deck1 first
    expect(result[0]!.id).toBe("deck1");
  });

  it("should apply combined filters", () => {
    const filters: DeckListFilters = {
      status: "hasDue",
      search: "alpha",
      sortBy: "dueCount",
      sortDirection: "desc",
      tags: [],
    };
    const result = applyFiltersAndSort(decks, filters);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("deck1");
  });
});

// =============================================================================
// SUMMARY CALCULATION TESTS
// =============================================================================

describe("calculateDeckListSummary", () => {
  it("should calculate summary for multiple decks", () => {
    const decks = [
      createMockDeck({
        cardCounts: {
          total: 100,
          new: 20,
          learning: 30,
          review: 40,
          suspended: 10,
        },
        dueCounts: { dueNow: 10, overdue: 5, dueToday: 20, dueTomorrow: 10 },
        studyStats: {
          reviewedToday: 50,
          correctToday: 45,
          retentionRate: 90,
          currentStreak: 5,
          averageEaseFactor: 2.5,
        },
      }),
      createMockDeck({
        cardCounts: {
          total: 50,
          new: 10,
          learning: 15,
          review: 20,
          suspended: 5,
        },
        dueCounts: { dueNow: 5, overdue: 0, dueToday: 10, dueTomorrow: 5 },
        studyStats: {
          reviewedToday: 25,
          correctToday: 20,
          retentionRate: 80,
          currentStreak: 3,
          averageEaseFactor: 2.3,
        },
      }),
    ];

    const summary = calculateDeckListSummary(decks);
    expect(summary.totalDecks).toBe(2);
    expect(summary.totalCards).toBe(150);
    expect(summary.totalDue).toBe(30);
    expect(summary.totalOverdue).toBe(5);
    expect(summary.averageRetention).toBe(85);
  });

  it("should handle empty deck list", () => {
    const summary = calculateDeckListSummary([]);
    expect(summary.totalDecks).toBe(0);
    expect(summary.totalCards).toBe(0);
    expect(summary.totalDue).toBe(0);
    expect(summary.averageRetention).toBe(0);
  });

  it("should exclude decks with 0% retention from average", () => {
    const decks = [
      createMockDeck({
        studyStats: { ...createDefaultStudyStats(), retentionRate: 80 },
      }),
      createMockDeck({
        studyStats: createDefaultStudyStats(), // 0% retention
      }),
    ];

    const summary = calculateDeckListSummary(decks);
    expect(summary.averageRetention).toBe(80);
  });
});

// =============================================================================
// TAG EXTRACTION TESTS
// =============================================================================

describe("getAllTags", () => {
  it("should extract all unique tags from decks", () => {
    const decks = [
      createMockDeck({ tags: ["vocab", "chapter-1"] }),
      createMockDeck({ tags: ["vocab", "chapter-2"] }),
      createMockDeck({ tags: ["quiz"] }),
    ];

    const tags = getAllTags(decks);
    expect(tags).toHaveLength(4);
    expect(tags).toContain("vocab");
    expect(tags).toContain("chapter-1");
    expect(tags).toContain("chapter-2");
    expect(tags).toContain("quiz");
  });

  it("should return sorted tags", () => {
    const decks = [createMockDeck({ tags: ["zebra", "alpha", "middle"] })];

    const tags = getAllTags(decks);
    expect(tags).toEqual(["alpha", "middle", "zebra"]);
  });

  it("should return empty array for decks with no tags", () => {
    const decks = [createMockDeck({ tags: [] })];
    const tags = getAllTags(decks);
    expect(tags).toEqual([]);
  });
});

// =============================================================================
// DECK CREATION TESTS
// =============================================================================

describe("createEmptyDeck", () => {
  it("should create an empty deck with book info", () => {
    const book = createMockBook();
    const deck = createEmptyDeck("book1", book);

    expect(deck.id).toBe("book1");
    expect(deck.book).toEqual(book);
    expect(deck.cardCounts.total).toBe(0);
    expect(deck.dueCounts.dueToday).toBe(0);
    expect(deck.studyStats.retentionRate).toBe(0);
    expect(deck.tags).toEqual([]);
    expect(deck.lastReviewedAt).toBeNull();
  });

  it("should create an empty deck without book", () => {
    const deck = createEmptyDeck(UNASSIGNED_DECK_ID, null);

    expect(deck.id).toBe(UNASSIGNED_DECK_ID);
    expect(deck.book).toBeNull();
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe("isValidDeck", () => {
  it("should return true for valid deck", () => {
    const deck = createMockDeck();
    expect(isValidDeck(deck)).toBe(true);
  });

  it("should return false for null", () => {
    expect(isValidDeck(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isValidDeck(undefined)).toBe(false);
  });

  it("should return false for non-object", () => {
    expect(isValidDeck("string")).toBe(false);
    expect(isValidDeck(123)).toBe(false);
  });

  it("should return false for missing required fields", () => {
    expect(isValidDeck({ id: "test" })).toBe(false);
    expect(isValidDeck({ id: "test", book: null })).toBe(false);
  });

  it("should return true for deck with null book", () => {
    const deck = createUnassignedDeck();
    expect(isValidDeck(deck)).toBe(true);
  });
});

// =============================================================================
// LIST STATE TESTS
// =============================================================================

describe("isDeckListEmpty", () => {
  it("should return true for empty array", () => {
    expect(isDeckListEmpty([])).toBe(true);
  });

  it("should return false for non-empty array", () => {
    expect(isDeckListEmpty([createMockDeck()])).toBe(false);
  });
});

describe("hasAnyDueCards", () => {
  it("should return true if any deck has due cards", () => {
    const decks = [
      createMockDeck({ dueCounts: createDefaultDueCounts() }),
      createMockDeck({
        dueCounts: { dueNow: 5, overdue: 0, dueToday: 5, dueTomorrow: 0 },
      }),
    ];
    expect(hasAnyDueCards(decks)).toBe(true);
  });

  it("should return false if no decks have due cards", () => {
    const decks = [
      createMockDeck({ dueCounts: createDefaultDueCounts() }),
      createMockDeck({ dueCounts: createDefaultDueCounts() }),
    ];
    expect(hasAnyDueCards(decks)).toBe(false);
  });
});

describe("getDecksWithDue", () => {
  it("should return only decks with due cards, sorted by due count", () => {
    const deck1 = createMockDeck({
      id: "deck1",
      dueCounts: { dueNow: 5, overdue: 0, dueToday: 10, dueTomorrow: 5 },
    });
    const deck2 = createMockDeck({
      id: "deck2",
      dueCounts: createDefaultDueCounts(),
    });
    const deck3 = createMockDeck({
      id: "deck3",
      dueCounts: { dueNow: 15, overdue: 5, dueToday: 25, dueTomorrow: 10 },
    });

    const result = getDecksWithDue([deck1, deck2, deck3]);
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe("deck3"); // Higher due count
    expect(result[1]!.id).toBe("deck1");
  });
});

// =============================================================================
// STUDY PRIORITY TESTS
// =============================================================================

describe("getStudyPriority", () => {
  it("should give highest priority to overdue cards", () => {
    const deckOverdue = createMockDeck({
      dueCounts: { dueNow: 5, overdue: 10, dueToday: 15, dueTomorrow: 5 },
      studyStats: { ...createDefaultStudyStats(), retentionRate: 90 },
    });
    const deckDueNow = createMockDeck({
      dueCounts: { dueNow: 20, overdue: 0, dueToday: 20, dueTomorrow: 5 },
      studyStats: { ...createDefaultStudyStats(), retentionRate: 90 },
    });

    expect(getStudyPriority(deckOverdue)).toBeGreaterThan(
      getStudyPriority(deckDueNow)
    );
  });

  it("should add priority for low retention", () => {
    const deckLowRetention = createMockDeck({
      dueCounts: createDefaultDueCounts(),
      studyStats: { ...createDefaultStudyStats(), retentionRate: 50 },
    });
    const deckHighRetention = createMockDeck({
      dueCounts: createDefaultDueCounts(),
      studyStats: { ...createDefaultStudyStats(), retentionRate: 95 },
    });

    expect(getStudyPriority(deckLowRetention)).toBeGreaterThan(
      getStudyPriority(deckHighRetention)
    );
  });

  it("should return 0 for deck with no due cards and high retention", () => {
    const deck = createMockDeck({
      dueCounts: createDefaultDueCounts(),
      studyStats: { ...createDefaultStudyStats(), retentionRate: 95 },
    });
    expect(getStudyPriority(deck)).toBe(0);
  });
});

describe("sortByStudyPriority", () => {
  it("should sort decks by study priority (highest first)", () => {
    const deck1 = createMockDeck({
      id: "low-priority",
      dueCounts: createDefaultDueCounts(),
      studyStats: { ...createDefaultStudyStats(), retentionRate: 95 },
    });
    const deck2 = createMockDeck({
      id: "high-priority",
      dueCounts: { dueNow: 10, overdue: 5, dueToday: 15, dueTomorrow: 5 },
      studyStats: { ...createDefaultStudyStats(), retentionRate: 60 },
    });

    const sorted = sortByStudyPriority([deck1, deck2]);
    expect(sorted).toHaveLength(2);
    expect(sorted[0]!.id).toBe("high-priority");
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe("Edge Cases", () => {
  it("should handle deck with all null book fields", () => {
    const deck = createMockDeck({
      book: { id: "book1", title: "Test", author: null, coverUrl: null },
    });
    expect(getDeckDisplayAuthor(deck)).toBeNull();
  });

  it("should handle very large numbers", () => {
    expect(formatCardCount(1000000)).toBe("1000k");
    expect(formatDueCount(9999)).toBe("999+");
  });

  it("should handle deck with empty tags array", () => {
    const deck = createMockDeck({ tags: [] });
    expect(getAllTags([deck])).toEqual([]);
    expect(filterDecksByTags([deck], ["test"])).toHaveLength(0);
  });

  it("should handle whitespace-only search", () => {
    const deck = createMockDeck();
    const result = filterDecksBySearch([deck], "   ");
    expect(result).toHaveLength(1);
  });
});
