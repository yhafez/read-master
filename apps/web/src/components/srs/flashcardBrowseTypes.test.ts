/**
 * Tests for Flashcard Browse Types
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  type BrowseCard,
  type CardBrowseFilters,
  DEFAULT_BROWSE_FILTERS,
  createBrowseError,
  parseBrowseApiError,
  isCardDue,
  isCardOverdue,
  getCardDueState,
  statusToFilter,
  filterBySearch,
  filterByStatus,
  filterByType,
  filterByDueState,
  filterByBook,
  filterByTags,
  sortCards,
  applyFiltersAndSort,
  paginateCards,
  calculateSummary,
  getAllTags,
  getAllBooks,
  formatInterval,
  formatEaseFactor,
  getStatusColor,
  getTypeColor,
  truncateText,
  getTypeName,
  getStatusName,
  isDefaultFilters,
  countActiveFilters,
  isValidBrowseCard,
  createEmptyBrowseCard,
  formatDate,
  formatDueDate,
} from "./flashcardBrowseTypes";

// =============================================================================
// TEST DATA
// =============================================================================

const createTestCard = (overrides: Partial<BrowseCard> = {}): BrowseCard => ({
  id: "test-card-1",
  front: "Test front",
  back: "Test back",
  type: "VOCABULARY",
  status: "NEW",
  tags: ["tag1", "tag2"],
  book: { id: "book-1", title: "Test Book", author: "Test Author" },
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
  dueDate: new Date().toISOString(),
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

const createTestCards = (): BrowseCard[] => [
  createTestCard({
    id: "card-1",
    front: "Card One",
    type: "VOCABULARY",
    status: "NEW",
    tags: ["vocab", "test"],
    dueDate: new Date().toISOString(),
  }),
  createTestCard({
    id: "card-2",
    front: "Card Two",
    type: "CONCEPT",
    status: "LEARNING",
    tags: ["concept"],
    book: { id: "book-2", title: "Book Two", author: "Author Two" },
    dueDate: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
  }),
  createTestCard({
    id: "card-3",
    front: "Card Three",
    type: "COMPREHENSION",
    status: "REVIEW",
    tags: ["reading"],
    book: null,
    dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  }),
  createTestCard({
    id: "card-4",
    front: "Card Four",
    type: "QUOTE",
    status: "SUSPENDED",
    tags: ["quote", "test"],
    dueDate: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days ago
  }),
  createTestCard({
    id: "card-5",
    front: "Card Five",
    type: "CUSTOM",
    status: "REVIEW",
    tags: [],
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString(), // 1 week from now
  }),
];

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe("Error Handling", () => {
  describe("createBrowseError", () => {
    it("creates network error", () => {
      const error = createBrowseError("network_error");
      expect(error.type).toBe("network_error");
      expect(error.message).toContain("internet connection");
      expect(error.retryable).toBe(true);
    });

    it("creates not found error", () => {
      const error = createBrowseError("not_found");
      expect(error.type).toBe("not_found");
      expect(error.retryable).toBe(false);
    });

    it("creates unauthorized error", () => {
      const error = createBrowseError("unauthorized");
      expect(error.type).toBe("unauthorized");
      expect(error.retryable).toBe(false);
    });

    it("creates bulk action failed error", () => {
      const error = createBrowseError("bulk_action_failed");
      expect(error.type).toBe("bulk_action_failed");
      expect(error.retryable).toBe(true);
    });

    it("uses custom message when provided", () => {
      const customMessage = "Custom error message";
      const error = createBrowseError("unknown", customMessage);
      expect(error.message).toBe(customMessage);
    });
  });

  describe("parseBrowseApiError", () => {
    it("parses 404 as not_found", () => {
      const error = parseBrowseApiError(404);
      expect(error.type).toBe("not_found");
    });

    it("parses 401 as unauthorized", () => {
      const error = parseBrowseApiError(401);
      expect(error.type).toBe("unauthorized");
    });

    it("parses 403 as unauthorized", () => {
      const error = parseBrowseApiError(403);
      expect(error.type).toBe("unauthorized");
    });

    it("parses 0 as network_error", () => {
      const error = parseBrowseApiError(0);
      expect(error.type).toBe("network_error");
    });

    it("parses other status as unknown", () => {
      const error = parseBrowseApiError(500);
      expect(error.type).toBe("unknown");
    });

    it("uses provided error message", () => {
      const error = parseBrowseApiError(500, "Server error");
      expect(error.message).toBe("Server error");
    });
  });
});

// =============================================================================
// DUE DATE TESTS
// =============================================================================

describe("Due Date Utilities", () => {
  describe("isCardDue", () => {
    it("returns true for past due date", () => {
      const card = createTestCard({
        dueDate: new Date(Date.now() - 86400000).toISOString(),
      });
      expect(isCardDue(card)).toBe(true);
    });

    it("returns true for current due date", () => {
      const card = createTestCard({
        dueDate: new Date().toISOString(),
      });
      expect(isCardDue(card)).toBe(true);
    });

    it("returns false for future due date", () => {
      const card = createTestCard({
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      });
      expect(isCardDue(card)).toBe(false);
    });
  });

  describe("isCardOverdue", () => {
    it("returns true for cards due more than 24 hours ago", () => {
      const card = createTestCard({
        dueDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      });
      expect(isCardOverdue(card)).toBe(true);
    });

    it("returns false for cards due less than 24 hours ago", () => {
      const card = createTestCard({
        dueDate: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      });
      expect(isCardOverdue(card)).toBe(false);
    });

    it("returns false for future due dates", () => {
      const card = createTestCard({
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      });
      expect(isCardOverdue(card)).toBe(false);
    });
  });

  describe("getCardDueState", () => {
    it('returns "overdue" for overdue cards', () => {
      const card = createTestCard({
        dueDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      });
      expect(getCardDueState(card)).toBe("overdue");
    });

    it('returns "due" for due but not overdue cards', () => {
      const card = createTestCard({
        dueDate: new Date(Date.now() - 3600000).toISOString(),
      });
      expect(getCardDueState(card)).toBe("due");
    });

    it('returns "notDue" for future cards', () => {
      const card = createTestCard({
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      });
      expect(getCardDueState(card)).toBe("notDue");
    });
  });
});

// =============================================================================
// STATUS CONVERSION TESTS
// =============================================================================

describe("statusToFilter", () => {
  it('converts NEW to "new"', () => {
    expect(statusToFilter("NEW")).toBe("new");
  });

  it('converts LEARNING to "learning"', () => {
    expect(statusToFilter("LEARNING")).toBe("learning");
  });

  it('converts REVIEW to "review"', () => {
    expect(statusToFilter("REVIEW")).toBe("review");
  });

  it('converts SUSPENDED to "suspended"', () => {
    expect(statusToFilter("SUSPENDED")).toBe("suspended");
  });
});

// =============================================================================
// FILTER TESTS
// =============================================================================

describe("Filtering Functions", () => {
  const testCards = createTestCards();

  describe("filterBySearch", () => {
    it("returns all cards for empty search", () => {
      const result = filterBySearch(testCards, "");
      expect(result.length).toBe(testCards.length);
    });

    it("filters by front text", () => {
      const result = filterBySearch(testCards, "Card One");
      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe("card-1");
    });

    it("filters by back text", () => {
      const result = filterBySearch(testCards, "Test back");
      expect(result.length).toBe(testCards.length); // All have same back
    });

    it("filters by tag", () => {
      const result = filterBySearch(testCards, "vocab");
      expect(result.length).toBe(1);
    });

    it("filters by book title", () => {
      const result = filterBySearch(testCards, "Book Two");
      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe("card-2");
    });

    it("is case insensitive", () => {
      const result = filterBySearch(testCards, "CARD ONE");
      expect(result.length).toBe(1);
    });

    it("trims whitespace", () => {
      const result = filterBySearch(testCards, "  Card One  ");
      expect(result.length).toBe(1);
    });
  });

  describe("filterByStatus", () => {
    it("returns all cards for 'all' filter", () => {
      const result = filterByStatus(testCards, "all");
      expect(result.length).toBe(testCards.length);
    });

    it("filters NEW cards", () => {
      const result = filterByStatus(testCards, "new");
      expect(result.every((c) => c.status === "NEW")).toBe(true);
    });

    it("filters LEARNING cards", () => {
      const result = filterByStatus(testCards, "learning");
      expect(result.every((c) => c.status === "LEARNING")).toBe(true);
    });

    it("filters REVIEW cards", () => {
      const result = filterByStatus(testCards, "review");
      expect(result.every((c) => c.status === "REVIEW")).toBe(true);
    });

    it("filters SUSPENDED cards", () => {
      const result = filterByStatus(testCards, "suspended");
      expect(result.every((c) => c.status === "SUSPENDED")).toBe(true);
    });
  });

  describe("filterByType", () => {
    it("returns all cards for null type", () => {
      const result = filterByType(testCards, null);
      expect(result.length).toBe(testCards.length);
    });

    it("filters VOCABULARY cards", () => {
      const result = filterByType(testCards, "VOCABULARY");
      expect(result.every((c) => c.type === "VOCABULARY")).toBe(true);
    });

    it("filters CONCEPT cards", () => {
      const result = filterByType(testCards, "CONCEPT");
      expect(result.every((c) => c.type === "CONCEPT")).toBe(true);
    });
  });

  describe("filterByDueState", () => {
    it("returns all cards for 'all' filter", () => {
      const result = filterByDueState(testCards, "all");
      expect(result.length).toBe(testCards.length);
    });

    it("filters overdue cards", () => {
      const result = filterByDueState(testCards, "overdue");
      result.forEach((c) => {
        expect(isCardOverdue(c)).toBe(true);
      });
    });

    it("filters not due cards", () => {
      const result = filterByDueState(testCards, "notDue");
      result.forEach((c) => {
        expect(getCardDueState(c)).toBe("notDue");
      });
    });
  });

  describe("filterByBook", () => {
    it("returns all cards for null book", () => {
      const result = filterByBook(testCards, null);
      expect(result.length).toBe(testCards.length);
    });

    it("filters by specific book", () => {
      const result = filterByBook(testCards, "book-2");
      expect(result.length).toBe(1);
      expect(result[0]?.book?.id).toBe("book-2");
    });

    it("returns empty for non-existent book", () => {
      const result = filterByBook(testCards, "non-existent");
      expect(result.length).toBe(0);
    });
  });

  describe("filterByTags", () => {
    it("returns all cards for empty tags", () => {
      const result = filterByTags(testCards, []);
      expect(result.length).toBe(testCards.length);
    });

    it("filters by single tag", () => {
      const result = filterByTags(testCards, ["test"]);
      expect(result.every((c) => c.tags.includes("test"))).toBe(true);
    });

    it("filters by multiple tags (OR logic)", () => {
      const result = filterByTags(testCards, ["vocab", "quote"]);
      expect(
        result.every(
          (c) => c.tags.includes("vocab") || c.tags.includes("quote")
        )
      ).toBe(true);
    });
  });
});

// =============================================================================
// SORT TESTS
// =============================================================================

describe("Sorting Functions", () => {
  describe("sortCards", () => {
    it("sorts by createdAt ascending", () => {
      const cards = [
        createTestCard({ id: "a", createdAt: "2024-01-03T00:00:00Z" }),
        createTestCard({ id: "b", createdAt: "2024-01-01T00:00:00Z" }),
        createTestCard({ id: "c", createdAt: "2024-01-02T00:00:00Z" }),
      ];
      const result = sortCards(cards, "createdAt", "asc");
      expect(result[0]?.id).toBe("b");
      expect(result[1]?.id).toBe("c");
      expect(result[2]?.id).toBe("a");
    });

    it("sorts by createdAt descending", () => {
      const cards = [
        createTestCard({ id: "a", createdAt: "2024-01-01T00:00:00Z" }),
        createTestCard({ id: "b", createdAt: "2024-01-03T00:00:00Z" }),
        createTestCard({ id: "c", createdAt: "2024-01-02T00:00:00Z" }),
      ];
      const result = sortCards(cards, "createdAt", "desc");
      expect(result[0]?.id).toBe("b");
      expect(result[1]?.id).toBe("c");
      expect(result[2]?.id).toBe("a");
    });

    it("sorts by easeFactor", () => {
      const cards = [
        createTestCard({ id: "a", easeFactor: 2.0 }),
        createTestCard({ id: "b", easeFactor: 3.0 }),
        createTestCard({ id: "c", easeFactor: 2.5 }),
      ];
      const result = sortCards(cards, "easeFactor", "asc");
      expect(result[0]?.id).toBe("a");
      expect(result[1]?.id).toBe("c");
      expect(result[2]?.id).toBe("b");
    });

    it("sorts by interval", () => {
      const cards = [
        createTestCard({ id: "a", interval: 14 }),
        createTestCard({ id: "b", interval: 1 }),
        createTestCard({ id: "c", interval: 7 }),
      ];
      const result = sortCards(cards, "interval", "desc");
      expect(result[0]?.id).toBe("a");
      expect(result[1]?.id).toBe("c");
      expect(result[2]?.id).toBe("b");
    });

    it("sorts by front text alphabetically", () => {
      const cards = [
        createTestCard({ id: "a", front: "Zebra" }),
        createTestCard({ id: "b", front: "Apple" }),
        createTestCard({ id: "c", front: "Mango" }),
      ];
      const result = sortCards(cards, "front", "asc");
      expect(result[0]?.id).toBe("b");
      expect(result[1]?.id).toBe("c");
      expect(result[2]?.id).toBe("a");
    });

    it("sorts by type", () => {
      const cards = [
        createTestCard({ id: "a", type: "VOCABULARY" }),
        createTestCard({ id: "b", type: "CONCEPT" }),
        createTestCard({ id: "c", type: "QUOTE" }),
      ];
      const result = sortCards(cards, "type", "asc");
      expect(result[0]?.type).toBe("CONCEPT");
    });
  });
});

// =============================================================================
// PAGINATION TESTS
// =============================================================================

describe("Pagination", () => {
  describe("paginateCards", () => {
    const testCards = createTestCards();

    it("returns correct page of results", () => {
      const result = paginateCards(testCards, 1, 2);
      expect(result.cards.length).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalItems).toBe(5);
      expect(result.pagination.totalPages).toBe(3);
    });

    it("returns correct second page", () => {
      const result = paginateCards(testCards, 2, 2);
      expect(result.cards.length).toBe(2);
      expect(result.pagination.page).toBe(2);
    });

    it("returns correct last page with fewer items", () => {
      const result = paginateCards(testCards, 3, 2);
      expect(result.cards.length).toBe(1);
      expect(result.pagination.page).toBe(3);
    });

    it("clamps page to valid range", () => {
      const result = paginateCards(testCards, 100, 2);
      expect(result.pagination.page).toBe(3); // Max valid page
    });

    it("handles empty array", () => {
      const result = paginateCards([], 1, 10);
      expect(result.cards.length).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.page).toBe(1);
    });
  });
});

// =============================================================================
// SUMMARY TESTS
// =============================================================================

describe("calculateSummary", () => {
  const testCards = createTestCards();

  it("calculates total cards", () => {
    const summary = calculateSummary(testCards);
    expect(summary.totalCards).toBe(5);
  });

  it("calculates cards by status", () => {
    const summary = calculateSummary(testCards);
    expect(summary.byStatus.NEW).toBe(1);
    expect(summary.byStatus.LEARNING).toBe(1);
    expect(summary.byStatus.REVIEW).toBe(2);
    expect(summary.byStatus.SUSPENDED).toBe(1);
  });

  it("calculates cards by type", () => {
    const summary = calculateSummary(testCards);
    expect(summary.byType.VOCABULARY).toBe(1);
    expect(summary.byType.CONCEPT).toBe(1);
    expect(summary.byType.COMPREHENSION).toBe(1);
    expect(summary.byType.QUOTE).toBe(1);
    expect(summary.byType.CUSTOM).toBe(1);
  });
});

// =============================================================================
// TAG AND BOOK EXTRACTION TESTS
// =============================================================================

describe("Tag and Book Extraction", () => {
  const testCards = createTestCards();

  describe("getAllTags", () => {
    it("extracts unique tags sorted alphabetically", () => {
      const tags = getAllTags(testCards);
      expect(tags).toContain("vocab");
      expect(tags).toContain("test");
      expect(tags).toContain("concept");
      expect(tags).toContain("reading");
      expect(tags).toContain("quote");
      expect(tags).toEqual([...tags].sort());
    });

    it("returns empty array for cards with no tags", () => {
      const cards = [createTestCard({ tags: [] })];
      const tags = getAllTags(cards);
      expect(tags.length).toBe(0);
    });
  });

  describe("getAllBooks", () => {
    it("extracts unique books sorted by title", () => {
      const books = getAllBooks(testCards);
      expect(books.length).toBe(2);
      expect(books[0]?.title).toBe("Book Two");
      expect(books[1]?.title).toBe("Test Book");
    });

    it("skips cards without books", () => {
      const cards = [createTestCard({ book: null })];
      const books = getAllBooks(cards);
      expect(books.length).toBe(0);
    });
  });
});

// =============================================================================
// FORMAT TESTS
// =============================================================================

describe("Formatting Functions", () => {
  describe("formatInterval", () => {
    it("formats less than 1 day", () => {
      expect(formatInterval(0)).toBe("< 1 day");
    });

    it("formats 1 day", () => {
      expect(formatInterval(1)).toBe("1 day");
    });

    it("formats days", () => {
      expect(formatInterval(5)).toBe("5 days");
    });

    it("formats 1 week", () => {
      expect(formatInterval(7)).toBe("1 week");
    });

    it("formats weeks", () => {
      expect(formatInterval(21)).toBe("3 weeks");
    });

    it("formats 1 month", () => {
      expect(formatInterval(30)).toBe("1 month");
    });

    it("formats months", () => {
      expect(formatInterval(90)).toBe("3 months");
    });

    it("formats 1 year", () => {
      expect(formatInterval(365)).toBe("1 year");
    });

    it("formats years", () => {
      expect(formatInterval(1000)).toBe("3 years");
    });
  });

  describe("formatEaseFactor", () => {
    it("formats to 2 decimal places", () => {
      expect(formatEaseFactor(2.5)).toBe("2.50");
      expect(formatEaseFactor(2.123)).toBe("2.12");
    });
  });

  describe("truncateText", () => {
    it("returns text unchanged if under limit", () => {
      expect(truncateText("short", 10)).toBe("short");
    });

    it("truncates and adds ellipsis", () => {
      expect(truncateText("this is a long text", 10)).toBe("this is...");
    });

    it("handles exact length", () => {
      expect(truncateText("1234567890", 10)).toBe("1234567890");
    });
  });

  describe("formatDate", () => {
    it("formats date string", () => {
      const result = formatDate("2024-01-15T10:00:00Z");
      expect(result).toContain("Jan");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });
  });

  describe("formatDueDate", () => {
    beforeEach(() => {
      const mockDate = new Date("2024-01-15T12:00:00Z");
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "Due today" for today', () => {
      const today = new Date("2024-01-15T12:00:00Z").toISOString();
      expect(formatDueDate(today)).toBe("Due today");
    });

    it('returns "Due tomorrow" for tomorrow', () => {
      const tomorrow = new Date("2024-01-16T12:00:00Z").toISOString();
      expect(formatDueDate(tomorrow)).toBe("Due tomorrow");
    });

    it('returns "1 day overdue" for yesterday', () => {
      const yesterday = new Date("2024-01-14T12:00:00Z").toISOString();
      expect(formatDueDate(yesterday)).toBe("1 day overdue");
    });
  });
});

// =============================================================================
// COLOR TESTS
// =============================================================================

describe("Color Functions", () => {
  describe("getStatusColor", () => {
    it("returns info for NEW", () => {
      expect(getStatusColor("NEW")).toBe("info");
    });

    it("returns warning for LEARNING", () => {
      expect(getStatusColor("LEARNING")).toBe("warning");
    });

    it("returns success for REVIEW", () => {
      expect(getStatusColor("REVIEW")).toBe("success");
    });

    it("returns error for SUSPENDED", () => {
      expect(getStatusColor("SUSPENDED")).toBe("error");
    });
  });

  describe("getTypeColor", () => {
    it("returns primary for VOCABULARY", () => {
      expect(getTypeColor("VOCABULARY")).toBe("primary");
    });

    it("returns secondary for CONCEPT", () => {
      expect(getTypeColor("CONCEPT")).toBe("secondary");
    });

    it("returns info for COMPREHENSION", () => {
      expect(getTypeColor("COMPREHENSION")).toBe("info");
    });

    it("returns warning for QUOTE", () => {
      expect(getTypeColor("QUOTE")).toBe("warning");
    });

    it("returns default for CUSTOM", () => {
      expect(getTypeColor("CUSTOM")).toBe("default");
    });
  });
});

// =============================================================================
// NAME FUNCTIONS TESTS
// =============================================================================

describe("Name Functions", () => {
  describe("getTypeName", () => {
    it("returns correct names for all types", () => {
      expect(getTypeName("VOCABULARY")).toBe("Vocabulary");
      expect(getTypeName("CONCEPT")).toBe("Concept");
      expect(getTypeName("COMPREHENSION")).toBe("Comprehension");
      expect(getTypeName("QUOTE")).toBe("Quote");
      expect(getTypeName("CUSTOM")).toBe("Custom");
    });
  });

  describe("getStatusName", () => {
    it("returns correct names for all statuses", () => {
      expect(getStatusName("NEW")).toBe("New");
      expect(getStatusName("LEARNING")).toBe("Learning");
      expect(getStatusName("REVIEW")).toBe("Review");
      expect(getStatusName("SUSPENDED")).toBe("Suspended");
    });
  });
});

// =============================================================================
// FILTER STATE TESTS
// =============================================================================

describe("Filter State Functions", () => {
  describe("isDefaultFilters", () => {
    it("returns true for default filters", () => {
      expect(isDefaultFilters(DEFAULT_BROWSE_FILTERS)).toBe(true);
    });

    it("returns false when search is set", () => {
      const filters = { ...DEFAULT_BROWSE_FILTERS, search: "test" };
      expect(isDefaultFilters(filters)).toBe(false);
    });

    it("returns false when status is not 'all'", () => {
      const filters = { ...DEFAULT_BROWSE_FILTERS, status: "new" as const };
      expect(isDefaultFilters(filters)).toBe(false);
    });

    it("returns false when type is set", () => {
      const filters = {
        ...DEFAULT_BROWSE_FILTERS,
        type: "VOCABULARY" as const,
      };
      expect(isDefaultFilters(filters)).toBe(false);
    });

    it("returns false when tags are set", () => {
      const filters = { ...DEFAULT_BROWSE_FILTERS, tags: ["test"] };
      expect(isDefaultFilters(filters)).toBe(false);
    });
  });

  describe("countActiveFilters", () => {
    it("returns 0 for default filters", () => {
      expect(countActiveFilters(DEFAULT_BROWSE_FILTERS)).toBe(0);
    });

    it("counts search filter", () => {
      const filters = { ...DEFAULT_BROWSE_FILTERS, search: "test" };
      expect(countActiveFilters(filters)).toBe(1);
    });

    it("counts multiple filters", () => {
      const filters = {
        ...DEFAULT_BROWSE_FILTERS,
        search: "test",
        status: "new" as const,
        type: "VOCABULARY" as const,
        tags: ["tag1"],
      };
      expect(countActiveFilters(filters)).toBe(4);
    });
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe("Validation Functions", () => {
  describe("isValidBrowseCard", () => {
    it("returns true for valid card", () => {
      const card = createTestCard();
      expect(isValidBrowseCard(card)).toBe(true);
    });

    it("returns false for null", () => {
      expect(isValidBrowseCard(null)).toBe(false);
    });

    it("returns false for missing required fields", () => {
      expect(isValidBrowseCard({ id: "test" })).toBe(false);
    });

    it("returns false for non-object", () => {
      expect(isValidBrowseCard("string")).toBe(false);
    });
  });

  describe("createEmptyBrowseCard", () => {
    it("creates card with default values", () => {
      const card = createEmptyBrowseCard();
      expect(card.id).toBe("test-card");
      expect(card.front).toBe("");
      expect(card.back).toBe("");
      expect(card.type).toBe("CUSTOM");
      expect(card.status).toBe("NEW");
      expect(card.tags).toEqual([]);
      expect(card.easeFactor).toBe(2.5);
    });

    it("uses provided id", () => {
      const card = createEmptyBrowseCard("custom-id");
      expect(card.id).toBe("custom-id");
    });
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe("applyFiltersAndSort Integration", () => {
  const testCards = createTestCards();

  it("applies multiple filters and sorts correctly", () => {
    const filters: CardBrowseFilters = {
      ...DEFAULT_BROWSE_FILTERS,
      status: "review",
      sortBy: "createdAt",
      sortDirection: "asc",
    };
    const result = applyFiltersAndSort(testCards, filters);
    expect(result.every((c) => c.status === "REVIEW")).toBe(true);
  });

  it("handles empty result from filters", () => {
    const filters: CardBrowseFilters = {
      ...DEFAULT_BROWSE_FILTERS,
      search: "nonexistent",
    };
    const result = applyFiltersAndSort(testCards, filters);
    expect(result.length).toBe(0);
  });

  it("applies all filter types together", () => {
    const filters: CardBrowseFilters = {
      ...DEFAULT_BROWSE_FILTERS,
      search: "Card",
      status: "new",
      type: "VOCABULARY",
    };
    const result = applyFiltersAndSort(testCards, filters);
    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe("card-1");
  });
});
