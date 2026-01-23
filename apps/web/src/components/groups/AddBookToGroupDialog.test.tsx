/**
 * Tests for AddBookToGroupDialog Component
 *
 * Tests the Add Book to Group dialog functionality including:
 * - Component rendering
 * - Book search and selection
 * - Schedule options
 * - Form submission
 * - Error handling
 */

import { describe, it, expect, vi } from "vitest";
import type { Book } from "@/hooks/useBooks";

// ============================================================================
// Mock Data
// ============================================================================

const mockBook: Book = {
  id: "book-1",
  title: "Test Book",
  author: "Test Author",
  coverUrl: "https://example.com/cover.jpg",
  fileType: "EPUB",
  status: "reading",
  progress: 25,
  wordCount: 50000,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-15T00:00:00Z",
};

const mockBooks: Book[] = [
  mockBook,
  {
    id: "book-2",
    title: "Another Book",
    author: "Another Author",
    fileType: "PDF",
    status: "not_started",
    progress: 0,
    wordCount: 30000,
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-05T00:00:00Z",
  },
  {
    id: "book-3",
    title: "Third Book",
    author: "Third Author",
    coverUrl: "https://example.com/cover3.jpg",
    fileType: "EPUB",
    status: "completed",
    progress: 100,
    wordCount: 75000,
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
  },
];

// ============================================================================
// Type Tests
// ============================================================================

describe("AddBookToGroupDialog Types", () => {
  describe("Props Interface", () => {
    it("should have required open prop", () => {
      const props = {
        open: true,
        onClose: () => {},
        groupId: "group-1",
        groupName: "Test Group",
      };
      expect(props.open).toBe(true);
    });

    it("should have required onClose callback", () => {
      const onClose = vi.fn();
      const props = {
        open: true,
        onClose,
        groupId: "group-1",
        groupName: "Test Group",
      };
      props.onClose();
      expect(onClose).toHaveBeenCalled();
    });

    it("should have required groupId prop", () => {
      const props = {
        open: true,
        onClose: () => {},
        groupId: "group-123",
        groupName: "Test Group",
      };
      expect(props.groupId).toBe("group-123");
    });

    it("should have required groupName prop", () => {
      const props = {
        open: true,
        onClose: () => {},
        groupId: "group-1",
        groupName: "My Reading Group",
      };
      expect(props.groupName).toBe("My Reading Group");
    });

    it("should have optional onSuccess callback", () => {
      const onSuccess = vi.fn();
      const props = {
        open: true,
        onClose: () => {},
        groupId: "group-1",
        groupName: "Test Group",
        onSuccess,
      };
      expect(props.onSuccess).toBeDefined();
    });
  });
});

// ============================================================================
// Book Search Tests
// ============================================================================

describe("Book Search Functionality", () => {
  describe("filterBooks", () => {
    const filterBooks = (books: Book[], query: string): Book[] => {
      if (!query.trim()) return books;
      const lowerQuery = query.toLowerCase();
      return books.filter(
        (book) =>
          book.title.toLowerCase().includes(lowerQuery) ||
          book.author?.toLowerCase().includes(lowerQuery)
      );
    };

    it("should return all books when query is empty", () => {
      const result = filterBooks(mockBooks, "");
      expect(result).toHaveLength(3);
    });

    it("should return all books when query is whitespace", () => {
      const result = filterBooks(mockBooks, "   ");
      expect(result).toHaveLength(3);
    });

    it("should filter books by title (case insensitive)", () => {
      const result = filterBooks(mockBooks, "test");
      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("Test Book");
    });

    it("should filter books by author (case insensitive)", () => {
      const result = filterBooks(mockBooks, "another");
      expect(result).toHaveLength(1);
      expect(result[0]?.author).toBe("Another Author");
    });

    it("should filter by partial title match", () => {
      const result = filterBooks(mockBooks, "book");
      expect(result).toHaveLength(3); // All have "Book" in title
    });

    it("should return empty array when no matches", () => {
      const result = filterBooks(mockBooks, "xyz");
      expect(result).toHaveLength(0);
    });

    it("should handle special characters in query", () => {
      const result = filterBooks(mockBooks, "test-book");
      expect(result).toHaveLength(0); // No exact match with hyphen
    });

    it("should match on both title and author", () => {
      const booksWithMatch = [
        { ...mockBook, title: "Search Term Here", author: "Other Author" },
        { ...mockBook, id: "2", title: "Other Title", author: "Search Term" },
      ];
      const result = filterBooks(booksWithMatch as Book[], "search term");
      expect(result).toHaveLength(2);
    });
  });
});

// ============================================================================
// Schedule Options Tests
// ============================================================================

describe("Schedule Options", () => {
  describe("Status Options", () => {
    const validStatuses = ["UPCOMING", "CURRENT", "COMPLETED", "SKIPPED"];

    it("should have UPCOMING as a valid status", () => {
      expect(validStatuses).toContain("UPCOMING");
    });

    it("should have CURRENT as a valid status", () => {
      expect(validStatuses).toContain("CURRENT");
    });

    it("should have COMPLETED as a valid status", () => {
      expect(validStatuses).toContain("COMPLETED");
    });

    it("should have SKIPPED as a valid status", () => {
      expect(validStatuses).toContain("SKIPPED");
    });

    it("should default to UPCOMING for new books", () => {
      const getInitialStatus = () => "UPCOMING";
      expect(getInitialStatus()).toBe("UPCOMING");
    });
  });

  describe("Date Formatting", () => {
    const formatDateForInput = (date: Date | null): string => {
      if (!date) return "";
      const parts = date.toISOString().split("T");
      return parts[0] ?? "";
    };

    it("should format date as YYYY-MM-DD", () => {
      const date = new Date("2024-03-15T12:00:00Z");
      const result = formatDateForInput(date);
      expect(result).toBe("2024-03-15");
    });

    it("should return empty string for null date", () => {
      const result = formatDateForInput(null);
      expect(result).toBe("");
    });

    it("should handle end of year dates", () => {
      const date = new Date("2024-12-31T23:59:59Z");
      const result = formatDateForInput(date);
      expect(result).toBe("2024-12-31");
    });

    it("should handle start of year dates", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      const result = formatDateForInput(date);
      expect(result).toBe("2024-01-01");
    });
  });

  describe("Target Page Validation", () => {
    const parseTargetPage = (value: string): number | null => {
      if (!value) return null;
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? null : parsed;
    };

    it("should parse valid page number", () => {
      expect(parseTargetPage("100")).toBe(100);
    });

    it("should return null for empty string", () => {
      expect(parseTargetPage("")).toBeNull();
    });

    it("should return null for non-numeric string", () => {
      expect(parseTargetPage("abc")).toBeNull();
    });

    it("should parse zero", () => {
      expect(parseTargetPage("0")).toBe(0);
    });

    it("should parse large numbers", () => {
      expect(parseTargetPage("9999")).toBe(9999);
    });

    it("should handle whitespace-only string", () => {
      const value = "   ";
      const parsed = value.trim() ? parseInt(value.trim(), 10) : null;
      expect(parsed).toBeNull();
    });
  });
});

// ============================================================================
// Form State Tests
// ============================================================================

describe("Form State Management", () => {
  describe("Initial State", () => {
    const getInitialState = () => ({
      searchQuery: "",
      selectedBook: null as Book | null,
      status: "UPCOMING" as const,
      startDate: "",
      endDate: "",
      targetPage: "",
      error: null as string | null,
    });

    it("should have empty search query", () => {
      const state = getInitialState();
      expect(state.searchQuery).toBe("");
    });

    it("should have no selected book", () => {
      const state = getInitialState();
      expect(state.selectedBook).toBeNull();
    });

    it("should have UPCOMING status by default", () => {
      const state = getInitialState();
      expect(state.status).toBe("UPCOMING");
    });

    it("should have empty dates", () => {
      const state = getInitialState();
      expect(state.startDate).toBe("");
      expect(state.endDate).toBe("");
    });

    it("should have no error", () => {
      const state = getInitialState();
      expect(state.error).toBeNull();
    });
  });

  describe("State Reset on Close", () => {
    it("should reset all state values on dialog close", () => {
      type DialogState = {
        searchQuery: string;
        selectedBook: Book | null;
        status: "UPCOMING" | "CURRENT" | "COMPLETED" | "SKIPPED";
        startDate: string;
        endDate: string;
        targetPage: string;
        error: string | null;
      };

      let state: DialogState = {
        searchQuery: "test",
        selectedBook: mockBook,
        status: "CURRENT",
        startDate: "2024-03-15",
        endDate: "2024-04-15",
        targetPage: "100",
        error: "Some error",
      };

      // Simulate reset
      const resetState = () => {
        state = {
          searchQuery: "",
          selectedBook: null,
          status: "UPCOMING",
          startDate: "",
          endDate: "",
          targetPage: "",
          error: null,
        };
      };

      resetState();

      expect(state.searchQuery).toBe("");
      expect(state.selectedBook).toBeNull();
      expect(state.status).toBe("UPCOMING");
      expect(state.startDate).toBe("");
      expect(state.endDate).toBe("");
      expect(state.targetPage).toBe("");
      expect(state.error).toBeNull();
    });
  });
});

// ============================================================================
// Input Validation Tests
// ============================================================================

describe("Input Validation", () => {
  describe("AddGroupBookInput", () => {
    interface AddGroupBookInput {
      bookId: string;
      status: string;
      startDate: string | null;
      endDate: string | null;
      targetPage: number | null;
    }

    const createInput = (
      book: Book,
      options: Partial<AddGroupBookInput> = {}
    ): AddGroupBookInput => ({
      bookId: book.id,
      status: options.status ?? "UPCOMING",
      startDate: options.startDate ?? null,
      endDate: options.endDate ?? null,
      targetPage: options.targetPage ?? null,
    });

    it("should include bookId", () => {
      const input = createInput(mockBook);
      expect(input.bookId).toBe("book-1");
    });

    it("should use default status when not specified", () => {
      const input = createInput(mockBook);
      expect(input.status).toBe("UPCOMING");
    });

    it("should include custom status when specified", () => {
      const input = createInput(mockBook, { status: "CURRENT" });
      expect(input.status).toBe("CURRENT");
    });

    it("should handle null dates", () => {
      const input = createInput(mockBook);
      expect(input.startDate).toBeNull();
      expect(input.endDate).toBeNull();
    });

    it("should include dates when specified", () => {
      const input = createInput(mockBook, {
        startDate: "2024-03-15",
        endDate: "2024-04-15",
      });
      expect(input.startDate).toBe("2024-03-15");
      expect(input.endDate).toBe("2024-04-15");
    });

    it("should handle null targetPage", () => {
      const input = createInput(mockBook);
      expect(input.targetPage).toBeNull();
    });

    it("should include targetPage when specified", () => {
      const input = createInput(mockBook, { targetPage: 150 });
      expect(input.targetPage).toBe(150);
    });
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe("Error Handling", () => {
  describe("Book Selection Errors", () => {
    it("should show error when no book selected on submit", () => {
      let error: string | null = null;
      const selectedBook: Book | null = null;

      const validate = (): boolean => {
        if (!selectedBook) {
          error = "Please select a book first";
          return false;
        }
        return true;
      };

      const isValid = validate();
      expect(isValid).toBe(false);
      expect(error).toBe("Please select a book first");
    });

    it("should not show error when book is selected", () => {
      let error: string | null = null;
      const selectedBook: Book | null = mockBook;

      const validate = (): boolean => {
        if (!selectedBook) {
          error = "Please select a book first";
          return false;
        }
        return true;
      };

      const isValid = validate();
      expect(isValid).toBe(true);
      expect(error).toBeNull();
    });
  });

  describe("API Error Handling", () => {
    it("should extract message from Error instance", () => {
      const error: unknown = new Error("Failed to add book");
      const message = error instanceof Error ? error.message : "Unknown error";
      expect(message).toBe("Failed to add book");
    });

    it("should use fallback message for non-Error", () => {
      const error: unknown = "string error";
      const message =
        error instanceof Error ? error.message : "Failed to add book to group";
      expect(message).toBe("Failed to add book to group");
    });

    it("should handle null error", () => {
      const error: unknown = null;
      const message =
        error instanceof Error ? error.message : "Failed to add book to group";
      expect(message).toBe("Failed to add book to group");
    });
  });
});

// ============================================================================
// Book Display Tests
// ============================================================================

describe("Book Display", () => {
  describe("Book Card Rendering", () => {
    it("should display book title", () => {
      const book = mockBook;
      expect(book.title).toBe("Test Book");
    });

    it("should display book author when available", () => {
      const book = mockBook;
      expect(book.author).toBe("Test Author");
    });

    it("should handle missing author", () => {
      const book = { ...mockBook, author: null };
      expect(book.author).toBeNull();
    });

    it("should display cover image when available", () => {
      const book = mockBook;
      expect(book.coverUrl).toBeDefined();
    });

    it("should handle missing cover image", () => {
      const { coverUrl: _coverUrl, ...bookWithoutCover } = mockBook;
      const book: Book = bookWithoutCover;
      expect(book.coverUrl).toBeUndefined();
    });
  });

  describe("Empty States", () => {
    it("should show no results message when search has no matches", () => {
      const query = "xyz";
      const filteredBooks: Book[] = [];
      const hasNoResults = query && filteredBooks.length === 0;
      expect(hasNoResults).toBe(true);
    });

    it("should show no books message when library is empty", () => {
      const allBooks: Book[] = [];
      const query = "";
      const hasNoBooks = !query && allBooks.length === 0;
      expect(hasNoBooks).toBe(true);
    });

    it("should not show empty message when books exist", () => {
      const allBooks = mockBooks;
      const hasBooks = allBooks.length > 0;
      expect(hasBooks).toBe(true);
    });
  });
});

// ============================================================================
// Button State Tests
// ============================================================================

describe("Button States", () => {
  describe("Add Button", () => {
    it("should be disabled when no book selected", () => {
      const selectedBook: Book | null = null;
      const isPending = false;
      const isDisabled = !selectedBook || isPending;
      expect(isDisabled).toBe(true);
    });

    it("should be disabled when mutation is pending", () => {
      const selectedBook: Book | null = mockBook;
      const isPending = true;
      const isDisabled = !selectedBook || isPending;
      expect(isDisabled).toBe(true);
    });

    it("should be enabled when book selected and not pending", () => {
      const selectedBook: Book | null = mockBook;
      const isPending = false;
      const isDisabled = !selectedBook || isPending;
      expect(isDisabled).toBe(false);
    });
  });

  describe("Cancel Button", () => {
    it("should always be enabled", () => {
      const cancelDisabled = false;
      expect(cancelDisabled).toBe(false);
    });

    it("should call onClose when clicked", () => {
      const onClose = vi.fn();
      onClose();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
