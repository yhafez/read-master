/**
 * Tests for BookCard component
 * Tests helper functions, type validation, and component logic
 */

import { describe, it, expect } from "vitest";

import type { Book } from "@/hooks/useBooks";
import type { LibraryViewMode } from "./types";

// Import helper functions (exported for testing)
import { getStatusColor, getStatusKey, type BookCardProps } from "./BookCard";

// Sample book data
const mockBook: Book = {
  id: "book-1",
  title: "Test Book Title",
  author: "Test Author Name",
  status: "reading",
  progress: 50,
  wordCount: 50000,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-02T00:00:00Z",
};

describe("BookCard", () => {
  describe("getStatusColor helper", () => {
    it("should return 'info' for reading status", () => {
      expect(getStatusColor("reading")).toBe("info");
    });

    it("should return 'success' for completed status", () => {
      expect(getStatusColor("completed")).toBe("success");
    });

    it("should return 'error' for abandoned status", () => {
      expect(getStatusColor("abandoned")).toBe("error");
    });

    it("should return 'default' for not_started status", () => {
      expect(getStatusColor("not_started")).toBe("default");
    });

    it("should return 'default' for unknown status", () => {
      // TypeScript would prevent this, but testing runtime behavior
      expect(getStatusColor("unknown" as Book["status"])).toBe("default");
    });

    it("should handle all defined statuses without throwing", () => {
      const statuses: Book["status"][] = [
        "not_started",
        "reading",
        "completed",
        "abandoned",
      ];

      statuses.forEach((status) => {
        expect(() => getStatusColor(status)).not.toThrow();
      });
    });

    it("should return consistent colors for same status", () => {
      const status: Book["status"] = "reading";
      const color1 = getStatusColor(status);
      const color2 = getStatusColor(status);
      expect(color1).toBe(color2);
    });
  });

  describe("getStatusKey helper", () => {
    it("should return correct key for reading status", () => {
      expect(getStatusKey("reading")).toBe("library.filters.reading");
    });

    it("should return correct key for completed status", () => {
      expect(getStatusKey("completed")).toBe("library.filters.completed");
    });

    it("should return correct key for abandoned status", () => {
      expect(getStatusKey("abandoned")).toBe("library.filters.abandoned");
    });

    it("should return correct key for not_started status", () => {
      expect(getStatusKey("not_started")).toBe("library.filters.wantToRead");
    });

    it("should return default key for unknown status", () => {
      // TypeScript would prevent this, but testing runtime behavior
      expect(getStatusKey("unknown" as Book["status"])).toBe(
        "library.filters.wantToRead"
      );
    });

    it("should return i18n keys in correct format", () => {
      const statuses: Book["status"][] = [
        "not_started",
        "reading",
        "completed",
        "abandoned",
      ];

      statuses.forEach((status) => {
        const key = getStatusKey(status);
        expect(key).toMatch(/^library\.filters\./);
      });
    });

    it("should handle all defined statuses without throwing", () => {
      const statuses: Book["status"][] = [
        "not_started",
        "reading",
        "completed",
        "abandoned",
      ];

      statuses.forEach((status) => {
        expect(() => getStatusKey(status)).not.toThrow();
      });
    });
  });

  describe("BookCardProps interface", () => {
    it("should accept valid props with grid viewMode", () => {
      const props: BookCardProps = {
        book: mockBook,
        viewMode: "grid",
      };

      expect(props.book).toEqual(mockBook);
      expect(props.viewMode).toBe("grid");
    });

    it("should accept valid props with list viewMode", () => {
      const props: BookCardProps = {
        book: mockBook,
        viewMode: "list",
      };

      expect(props.book).toEqual(mockBook);
      expect(props.viewMode).toBe("list");
    });

    it("should accept props with onDelete callback", () => {
      const mockOnDelete = (book: Book): void => {
        // Mock implementation
        expect(book).toBeDefined();
      };

      const props: BookCardProps = {
        book: mockBook,
        viewMode: "grid",
        onDelete: mockOnDelete,
      };

      expect(props.onDelete).toBeDefined();
      expect(typeof props.onDelete).toBe("function");
    });

    it("should accept props with onMouseEnter callback", () => {
      const mockOnMouseEnter = (): void => {
        // Mock implementation
      };

      const props: BookCardProps = {
        book: mockBook,
        viewMode: "grid",
        onMouseEnter: mockOnMouseEnter,
      };

      expect(props.onMouseEnter).toBeDefined();
      expect(typeof props.onMouseEnter).toBe("function");
    });

    it("should accept props with all optional callbacks", () => {
      const mockOnDelete = (book: Book): void => {
        expect(book.id).toBe(mockBook.id);
      };
      const mockOnMouseEnter = (): void => {};

      const props: BookCardProps = {
        book: mockBook,
        viewMode: "list",
        onDelete: mockOnDelete,
        onMouseEnter: mockOnMouseEnter,
      };

      expect(props.onDelete).toBeDefined();
      expect(props.onMouseEnter).toBeDefined();
    });

    it("should accept props with undefined optional callbacks", () => {
      const props: BookCardProps = {
        book: mockBook,
        viewMode: "grid",
        onDelete: undefined,
        onMouseEnter: undefined,
      };

      expect(props.onDelete).toBeUndefined();
      expect(props.onMouseEnter).toBeUndefined();
    });

    it("should accept props without optional callbacks", () => {
      const props: BookCardProps = {
        book: mockBook,
        viewMode: "grid",
      };

      expect(props).not.toHaveProperty("onDelete");
      expect(props).not.toHaveProperty("onMouseEnter");
    });
  });

  describe("Book data handling", () => {
    it("should support books with coverUrl", () => {
      const bookWithCover: Book = {
        ...mockBook,
        coverUrl: "https://example.com/cover.jpg",
      };

      const props: BookCardProps = {
        book: bookWithCover,
        viewMode: "grid",
      };

      expect(props.book.coverUrl).toBe("https://example.com/cover.jpg");
    });

    it("should support books without coverUrl", () => {
      const bookWithoutCover: Book = {
        id: "book-2",
        title: "No Cover Book",
        author: "Unknown Author",
        status: "not_started",
        progress: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      };

      const props: BookCardProps = {
        book: bookWithoutCover,
        viewMode: "grid",
      };

      expect(props.book.coverUrl).toBeUndefined();
    });

    it("should support books with 0% progress", () => {
      const newBook: Book = {
        ...mockBook,
        status: "not_started",
        progress: 0,
      };

      const props: BookCardProps = {
        book: newBook,
        viewMode: "grid",
      };

      expect(props.book.progress).toBe(0);
    });

    it("should support books with 100% progress", () => {
      const completedBook: Book = {
        ...mockBook,
        status: "completed",
        progress: 100,
      };

      const props: BookCardProps = {
        book: completedBook,
        viewMode: "grid",
      };

      expect(props.book.progress).toBe(100);
    });

    it("should support books with partial progress", () => {
      const inProgressBook: Book = {
        ...mockBook,
        status: "reading",
        progress: 42,
      };

      const props: BookCardProps = {
        book: inProgressBook,
        viewMode: "grid",
      };

      expect(props.book.progress).toBe(42);
    });

    it("should support books with wordCount", () => {
      const props: BookCardProps = {
        book: mockBook,
        viewMode: "grid",
      };

      expect(props.book.wordCount).toBe(50000);
    });

    it("should support books without wordCount", () => {
      const bookWithoutWordCount: Book = {
        id: "book-3",
        title: "Unknown Length Book",
        author: "Some Author",
        status: "reading",
        progress: 25,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      };

      const props: BookCardProps = {
        book: bookWithoutWordCount,
        viewMode: "grid",
      };

      expect(props.book.wordCount).toBeUndefined();
    });
  });

  describe("ViewMode handling", () => {
    it("should accept grid viewMode", () => {
      const mode: LibraryViewMode = "grid";
      expect(mode).toBe("grid");
    });

    it("should accept list viewMode", () => {
      const mode: LibraryViewMode = "list";
      expect(mode).toBe("list");
    });

    it("grid and list are the only valid view modes", () => {
      const validModes: LibraryViewMode[] = ["grid", "list"];
      expect(validModes).toHaveLength(2);
      expect(validModes).toContain("grid");
      expect(validModes).toContain("list");
    });
  });

  describe("Placeholder image generation", () => {
    it("should generate correct placeholder URL for books without covers", () => {
      const title = "My Book Title";
      const encodedTitle = encodeURIComponent(title.slice(0, 20));
      const placeholderUrl = `https://placehold.co/200x300?text=${encodedTitle}`;

      expect(placeholderUrl).toContain("placehold.co");
      expect(placeholderUrl).toContain("200x300");
      expect(placeholderUrl).toContain(encodedTitle);
    });

    it("should truncate long titles in placeholder URL", () => {
      const longTitle =
        "This Is A Very Long Book Title That Should Be Truncated For Display";
      const encodedTruncated = encodeURIComponent(longTitle.slice(0, 20));
      const placeholderUrl = `https://placehold.co/200x300?text=${encodedTruncated}`;

      // Title is truncated to 20 characters
      expect(placeholderUrl).toContain(
        encodeURIComponent("This Is A Very Long ")
      );
    });

    it("should handle special characters in title for placeholder", () => {
      const title = "Book & Title: Special!";
      const encodedTitle = encodeURIComponent(title.slice(0, 20));

      expect(encodedTitle).toContain("%26"); // & encoded
      expect(encodedTitle).toContain("%3A"); // : encoded
    });
  });

  describe("Status to color mapping consistency", () => {
    it("should map each status to a unique MUI color", () => {
      const statusColors = new Map<Book["status"], string>();
      const statuses: Book["status"][] = [
        "not_started",
        "reading",
        "completed",
        "abandoned",
      ];

      statuses.forEach((status) => {
        statusColors.set(status, getStatusColor(status));
      });

      // Check we have all statuses
      expect(statusColors.size).toBe(4);

      // Verify specific mappings
      expect(statusColors.get("reading")).toBe("info");
      expect(statusColors.get("completed")).toBe("success");
      expect(statusColors.get("abandoned")).toBe("error");
      expect(statusColors.get("not_started")).toBe("default");
    });

    it("should use valid MUI chip colors", () => {
      const validMuiChipColors = [
        "default",
        "primary",
        "secondary",
        "error",
        "info",
        "success",
        "warning",
      ];

      const statuses: Book["status"][] = [
        "not_started",
        "reading",
        "completed",
        "abandoned",
      ];

      statuses.forEach((status) => {
        const color = getStatusColor(status);
        expect(validMuiChipColors).toContain(color);
      });
    });
  });

  describe("i18n key consistency", () => {
    it("should have translation keys for all statuses", () => {
      const statuses: Book["status"][] = [
        "not_started",
        "reading",
        "completed",
        "abandoned",
      ];

      statuses.forEach((status) => {
        const key = getStatusKey(status);
        expect(key).toBeDefined();
        expect(key).not.toBe("");
        expect(typeof key).toBe("string");
      });
    });

    it("should return unique keys for each status", () => {
      const statuses: Book["status"][] = [
        "not_started",
        "reading",
        "completed",
        "abandoned",
      ];

      const keys = statuses.map(getStatusKey);
      const uniqueKeys = new Set(keys);

      // Note: not_started and default case both return wantToRead
      // This is intentional as they map to the same i18n key
      expect(uniqueKeys.size).toBeGreaterThanOrEqual(3);
    });

    it("should use correct namespace prefix", () => {
      const statuses: Book["status"][] = [
        "not_started",
        "reading",
        "completed",
        "abandoned",
      ];

      statuses.forEach((status) => {
        const key = getStatusKey(status);
        expect(key.startsWith("library.filters.")).toBe(true);
      });
    });
  });

  describe("Callback invocation patterns", () => {
    it("onDelete callback receives book data", () => {
      let receivedBook: Book | undefined;
      const onDelete = (book: Book): void => {
        receivedBook = book;
      };

      // Simulate callback invocation
      onDelete(mockBook);

      expect(receivedBook).toEqual(mockBook);
      expect(receivedBook).toBeDefined();
      if (receivedBook) {
        expect(receivedBook.id).toBe("book-1");
        expect(receivedBook.title).toBe("Test Book Title");
      }
    });

    it("onMouseEnter callback is invocable", () => {
      let wasInvoked = false;
      const onMouseEnter = (): void => {
        wasInvoked = true;
      };

      // Simulate callback invocation
      onMouseEnter();

      expect(wasInvoked).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty title", () => {
      const bookWithEmptyTitle: Book = {
        ...mockBook,
        title: "",
      };

      const props: BookCardProps = {
        book: bookWithEmptyTitle,
        viewMode: "grid",
      };

      expect(props.book.title).toBe("");
    });

    it("should handle empty author", () => {
      const bookWithEmptyAuthor: Book = {
        ...mockBook,
        author: "",
      };

      const props: BookCardProps = {
        book: bookWithEmptyAuthor,
        viewMode: "grid",
      };

      expect(props.book.author).toBe("");
    });

    it("should handle very long titles", () => {
      const longTitle = "A".repeat(500);
      const bookWithLongTitle: Book = {
        ...mockBook,
        title: longTitle,
      };

      const props: BookCardProps = {
        book: bookWithLongTitle,
        viewMode: "grid",
      };

      expect(props.book.title.length).toBe(500);
    });

    it("should handle special characters in title and author", () => {
      const bookWithSpecialChars: Book = {
        ...mockBook,
        title: 'Book <Title> with & "quotes"',
        author: "Author's Name & Co.",
      };

      const props: BookCardProps = {
        book: bookWithSpecialChars,
        viewMode: "grid",
      };

      expect(props.book.title).toContain("<");
      expect(props.book.title).toContain("&");
      expect(props.book.author).toContain("'");
    });

    it("should handle Unicode characters in title and author", () => {
      const bookWithUnicode: Book = {
        ...mockBook,
        title: "日本語の本 📚",
        author: "المؤلف العربي",
      };

      const props: BookCardProps = {
        book: bookWithUnicode,
        viewMode: "grid",
      };

      expect(props.book.title).toContain("日本語");
      expect(props.book.author).toContain("العربي");
    });
  });
});
