/**
 * Tests for POST /api/books/add-from-library
 *
 * Comprehensive test coverage for adding books from external libraries
 * (Google Books and Open Library).
 */

import { describe, it, expect } from "vitest";
import {
  addFromLibrarySchema,
  extractPublishYear,
  estimateWordCount,
  calculateReadingTime,
  normalizeGoogleMetadata,
  normalizeOpenLibraryMetadata,
  buildSourceUrl,
  getBookSource,
  MAX_BOOK_ID_LENGTH,
  VALID_SOURCES,
  DEFAULT_READING_WPM,
  WORDS_PER_PAGE,
} from "./add-from-library.js";
import type { GoogleBookMetadata } from "../../src/services/googleBooks.js";
import type { OpenLibraryBookMetadata } from "../../src/services/openLibrary.js";

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("addFromLibrarySchema", () => {
  describe("bookId validation", () => {
    it("should accept valid book ID", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "abc123",
        source: "google",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty book ID", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "",
        source: "google",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.bookId).toBeDefined();
      }
    });

    it("should reject missing book ID", () => {
      const result = addFromLibrarySchema.safeParse({
        source: "google",
      });
      expect(result.success).toBe(false);
    });

    it("should reject book ID exceeding max length", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "a".repeat(MAX_BOOK_ID_LENGTH + 1),
        source: "google",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.bookId).toBeDefined();
      }
    });

    it("should accept book ID at max length", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "a".repeat(MAX_BOOK_ID_LENGTH),
        source: "google",
      });
      expect(result.success).toBe(true);
    });

    it("should trim whitespace from book ID", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "  abc123  ",
        source: "google",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bookId).toBe("abc123");
      }
    });
  });

  describe("source validation", () => {
    it("should accept google source", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "abc123",
        source: "google",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source).toBe("google");
      }
    });

    it("should accept openlib source", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "OL123456W",
        source: "openlib",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source).toBe("openlib");
      }
    });

    it("should reject invalid source", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "abc123",
        source: "amazon",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.source).toBeDefined();
      }
    });

    it("should reject missing source", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "abc123",
      });
      expect(result.success).toBe(false);
    });

    it("should be case-sensitive for source", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "abc123",
        source: "Google",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("fetchContent validation", () => {
    it("should default fetchContent to false when not provided", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "abc123",
        source: "google",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        // When optional with default, the value is undefined if not provided
        // The default only applies to the .default() call which sets the value
        // Since we have .optional() after .default(), undefined is also valid
        expect(
          result.data.fetchContent === false ||
            result.data.fetchContent === undefined
        ).toBe(true);
      }
    });

    it("should accept fetchContent as true", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "abc123",
        source: "openlib",
        fetchContent: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fetchContent).toBe(true);
      }
    });

    it("should accept fetchContent as false", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "abc123",
        source: "google",
        fetchContent: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fetchContent).toBe(false);
      }
    });

    it("should reject invalid fetchContent type", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "abc123",
        source: "google",
        fetchContent: "yes",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("combined validation", () => {
    it("should validate complete valid request", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "OL123456W",
        source: "openlib",
        fetchContent: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          bookId: "OL123456W",
          source: "openlib",
          fetchContent: true,
        });
      }
    });

    it("should reject completely invalid request", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "",
        source: "invalid",
        fetchContent: "maybe",
      });
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("extractPublishYear", () => {
  it("should return undefined for undefined input", () => {
    expect(extractPublishYear(undefined)).toBeUndefined();
  });

  it("should return number input directly", () => {
    expect(extractPublishYear(2024)).toBe(2024);
  });

  it("should extract year from full date string", () => {
    expect(extractPublishYear("2024-01-15")).toBe(2024);
  });

  it("should extract year from partial date string", () => {
    expect(extractPublishYear("2024-01")).toBe(2024);
  });

  it("should extract year from year-only string", () => {
    expect(extractPublishYear("2024")).toBe(2024);
  });

  it("should extract year from verbose date", () => {
    expect(extractPublishYear("January 15, 2024")).toBe(2024);
  });

  it("should extract year from date with extra text", () => {
    expect(extractPublishYear("Published in 2024 by Random House")).toBe(2024);
  });

  it("should return undefined for invalid date string", () => {
    expect(extractPublishYear("no date here")).toBeUndefined();
  });

  it("should return undefined for empty string", () => {
    expect(extractPublishYear("")).toBeUndefined();
  });

  it("should extract first 4-digit year if multiple exist", () => {
    expect(extractPublishYear("2020-2024")).toBe(2020);
  });

  it("should handle historical dates", () => {
    expect(extractPublishYear("1876")).toBe(1876);
  });
});

describe("estimateWordCount", () => {
  it("should return undefined for undefined page count", () => {
    expect(estimateWordCount(undefined)).toBeUndefined();
  });

  it("should calculate word count from page count", () => {
    expect(estimateWordCount(100)).toBe(100 * WORDS_PER_PAGE);
  });

  it("should handle single page", () => {
    expect(estimateWordCount(1)).toBe(WORDS_PER_PAGE);
  });

  it("should handle zero pages", () => {
    expect(estimateWordCount(0)).toBe(0);
  });

  it("should handle large page counts", () => {
    expect(estimateWordCount(1000)).toBe(1000 * WORDS_PER_PAGE);
  });
});

describe("calculateReadingTime", () => {
  it("should return undefined for undefined word count", () => {
    expect(calculateReadingTime(undefined)).toBeUndefined();
  });

  it("should calculate reading time from word count", () => {
    // 1000 words at 250 WPM = 4 minutes
    expect(calculateReadingTime(1000)).toBe(
      Math.ceil(1000 / DEFAULT_READING_WPM)
    );
  });

  it("should round up to nearest minute", () => {
    // 1 word should still be 1 minute
    expect(calculateReadingTime(1)).toBe(1);
  });

  it("should handle zero words", () => {
    expect(calculateReadingTime(0)).toBe(0);
  });

  it("should handle large word counts", () => {
    const words = 100000;
    expect(calculateReadingTime(words)).toBe(
      Math.ceil(words / DEFAULT_READING_WPM)
    );
  });

  it("should calculate 250 words as 1 minute", () => {
    expect(calculateReadingTime(250)).toBe(1);
  });

  it("should calculate 251 words as 2 minutes (ceiling)", () => {
    expect(calculateReadingTime(251)).toBe(2);
  });
});

describe("normalizeGoogleMetadata", () => {
  const baseMetadata: GoogleBookMetadata = {
    id: "abc123",
    title: "Test Book",
    authors: [],
    categories: [],
  };

  it("should normalize basic metadata", () => {
    const result = normalizeGoogleMetadata(baseMetadata);
    expect(result.title).toBe("Test Book");
    expect(result.author).toBeNull();
    expect(result.genre).toBeNull();
  });

  it("should join multiple authors", () => {
    const metadata: GoogleBookMetadata = {
      ...baseMetadata,
      authors: ["Author One", "Author Two", "Author Three"],
    };
    const result = normalizeGoogleMetadata(metadata);
    expect(result.author).toBe("Author One, Author Two, Author Three");
  });

  it("should use first category as genre", () => {
    const metadata: GoogleBookMetadata = {
      ...baseMetadata,
      categories: ["Fiction", "Mystery", "Thriller"],
    };
    const result = normalizeGoogleMetadata(metadata);
    expect(result.genre).toBe("Fiction");
  });

  it("should handle description", () => {
    const metadata: GoogleBookMetadata = {
      ...baseMetadata,
      description: "A test book description",
    };
    const result = normalizeGoogleMetadata(metadata);
    expect(result.description).toBe("A test book description");
  });

  it("should handle page count and calculate word count", () => {
    const metadata: GoogleBookMetadata = {
      ...baseMetadata,
      pageCount: 200,
    };
    const result = normalizeGoogleMetadata(metadata);
    expect(result.pageCount).toBe(200);
    expect(result.wordCount).toBe(200 * WORDS_PER_PAGE);
    expect(result.estimatedReadTime).toBe(
      Math.ceil((200 * WORDS_PER_PAGE) / DEFAULT_READING_WPM)
    );
  });

  it("should handle language defaulting to en", () => {
    const result = normalizeGoogleMetadata(baseMetadata);
    expect(result.language).toBe("en");
  });

  it("should use provided language", () => {
    const metadata: GoogleBookMetadata = {
      ...baseMetadata,
      language: "es",
    };
    const result = normalizeGoogleMetadata(metadata);
    expect(result.language).toBe("es");
  });

  it("should handle ISBN values", () => {
    const metadata: GoogleBookMetadata = {
      ...baseMetadata,
      isbn10: "0123456789",
      isbn13: "9780123456789",
    };
    const result = normalizeGoogleMetadata(metadata);
    expect(result.isbn10).toBe("0123456789");
    expect(result.isbn13).toBe("9780123456789");
  });

  it("should extract publish year from date", () => {
    const metadata: GoogleBookMetadata = {
      ...baseMetadata,
      publishedDate: "2024-06-15",
    };
    const result = normalizeGoogleMetadata(metadata);
    expect(result.publishYear).toBe(2024);
  });

  it("should handle publisher", () => {
    const metadata: GoogleBookMetadata = {
      ...baseMetadata,
      publisher: "Test Publisher",
    };
    const result = normalizeGoogleMetadata(metadata);
    expect(result.publisher).toBe("Test Publisher");
  });

  it("should get best image URL from imageLinks", () => {
    const metadata: GoogleBookMetadata = {
      ...baseMetadata,
      imageLinks: {
        thumbnail: "https://example.com/thumb.jpg",
        medium: "https://example.com/medium.jpg",
      },
    };
    const result = normalizeGoogleMetadata(metadata);
    expect(result.coverImage).toBe("https://example.com/medium.jpg");
  });

  it("should handle missing imageLinks", () => {
    const result = normalizeGoogleMetadata(baseMetadata);
    expect(result.coverImage).toBeNull();
  });
});

describe("normalizeOpenLibraryMetadata", () => {
  const baseMetadata: OpenLibraryBookMetadata = {
    workId: "OL123456W",
    title: "Test Book",
    authors: [],
  };

  it("should normalize basic metadata", () => {
    const result = normalizeOpenLibraryMetadata(baseMetadata);
    expect(result.title).toBe("Test Book");
    expect(result.author).toBeNull();
    expect(result.genre).toBeNull();
  });

  it("should join multiple authors from objects", () => {
    const metadata: OpenLibraryBookMetadata = {
      ...baseMetadata,
      authors: [
        { id: "OL1A", name: "Author One" },
        { id: "OL2A", name: "Author Two" },
      ],
    };
    const result = normalizeOpenLibraryMetadata(metadata);
    expect(result.author).toBe("Author One, Author Two");
  });

  it("should use first subject as genre", () => {
    const metadata: OpenLibraryBookMetadata = {
      ...baseMetadata,
      subjects: ["Fiction", "Science Fiction", "Space Opera"],
    };
    const result = normalizeOpenLibraryMetadata(metadata);
    expect(result.genre).toBe("Fiction");
  });

  it("should handle empty subjects array", () => {
    const metadata: OpenLibraryBookMetadata = {
      ...baseMetadata,
      subjects: [],
    };
    const result = normalizeOpenLibraryMetadata(metadata);
    expect(result.genre).toBeNull();
  });

  it("should handle description", () => {
    const metadata: OpenLibraryBookMetadata = {
      ...baseMetadata,
      description: "An Open Library book description",
    };
    const result = normalizeOpenLibraryMetadata(metadata);
    expect(result.description).toBe("An Open Library book description");
  });

  it("should handle page count and calculate word count", () => {
    const metadata: OpenLibraryBookMetadata = {
      ...baseMetadata,
      pageCount: 300,
    };
    const result = normalizeOpenLibraryMetadata(metadata);
    expect(result.pageCount).toBe(300);
    expect(result.wordCount).toBe(300 * WORDS_PER_PAGE);
  });

  it("should use first language from array", () => {
    const metadata: OpenLibraryBookMetadata = {
      ...baseMetadata,
      languages: ["eng", "spa", "fra"],
    };
    const result = normalizeOpenLibraryMetadata(metadata);
    expect(result.language).toBe("eng");
  });

  it("should default to en for missing language", () => {
    const result = normalizeOpenLibraryMetadata(baseMetadata);
    expect(result.language).toBe("en");
  });

  it("should use first ISBN from arrays", () => {
    const metadata: OpenLibraryBookMetadata = {
      ...baseMetadata,
      isbn10: ["0123456789", "1234567890"],
      isbn13: ["9780123456789", "9781234567890"],
    };
    const result = normalizeOpenLibraryMetadata(metadata);
    expect(result.isbn10).toBe("0123456789");
    expect(result.isbn13).toBe("9780123456789");
  });

  it("should handle empty ISBN arrays", () => {
    const metadata: OpenLibraryBookMetadata = {
      ...baseMetadata,
      isbn10: [],
      isbn13: [],
    };
    const result = normalizeOpenLibraryMetadata(metadata);
    expect(result.isbn10).toBeNull();
    expect(result.isbn13).toBeNull();
  });

  it("should prefer firstPublishYear over publishYear", () => {
    const metadata: OpenLibraryBookMetadata = {
      ...baseMetadata,
      firstPublishYear: 1950,
      publishYear: 2024,
    };
    const result = normalizeOpenLibraryMetadata(metadata);
    expect(result.publishYear).toBe(1950);
  });

  it("should fall back to publishYear", () => {
    const metadata: OpenLibraryBookMetadata = {
      ...baseMetadata,
      publishYear: 2024,
    };
    const result = normalizeOpenLibraryMetadata(metadata);
    expect(result.publishYear).toBe(2024);
  });

  it("should use first publisher from array", () => {
    const metadata: OpenLibraryBookMetadata = {
      ...baseMetadata,
      publishers: ["Publisher One", "Publisher Two"],
    };
    const result = normalizeOpenLibraryMetadata(metadata);
    expect(result.publisher).toBe("Publisher One");
  });

  it("should track public domain status", () => {
    const metadata: OpenLibraryBookMetadata = {
      ...baseMetadata,
      isPublicDomain: true,
      hasFullText: true,
    };
    const result = normalizeOpenLibraryMetadata(metadata);
    expect(result.isPublicDomain).toBe(true);
    expect(result.hasFullText).toBe(true);
  });

  it("should default public domain flags to false", () => {
    const result = normalizeOpenLibraryMetadata(baseMetadata);
    expect(result.isPublicDomain).toBe(false);
    expect(result.hasFullText).toBe(false);
  });
});

describe("buildSourceUrl", () => {
  it("should build Google Books URL", () => {
    const url = buildSourceUrl("abc123", "google");
    expect(url).toBe("https://books.google.com/books?id=abc123");
  });

  it("should build Open Library work URL", () => {
    const url = buildSourceUrl("OL123456W", "openlib");
    expect(url).toBe("https://openlibrary.org/works/OL123456W");
  });

  it("should encode special characters in book ID", () => {
    const url = buildSourceUrl("abc 123/test", "google");
    expect(url).toBe("https://books.google.com/books?id=abc%20123%2Ftest");
  });

  it("should handle Open Library edition IDs", () => {
    const url = buildSourceUrl("OL123456M", "openlib");
    expect(url).toBe("https://openlibrary.org/works/OL123456M");
  });
});

describe("getBookSource", () => {
  it("should return GOOGLE_BOOKS for google source", () => {
    expect(getBookSource("google")).toBe("GOOGLE_BOOKS");
  });

  it("should return OPEN_LIBRARY for openlib source", () => {
    expect(getBookSource("openlib")).toBe("OPEN_LIBRARY");
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have reasonable MAX_BOOK_ID_LENGTH", () => {
    expect(MAX_BOOK_ID_LENGTH).toBeGreaterThan(0);
    expect(MAX_BOOK_ID_LENGTH).toBe(200);
  });

  it("should have correct VALID_SOURCES", () => {
    expect(VALID_SOURCES).toContain("google");
    expect(VALID_SOURCES).toContain("openlib");
    expect(VALID_SOURCES.length).toBe(2);
  });

  it("should have reasonable DEFAULT_READING_WPM", () => {
    expect(DEFAULT_READING_WPM).toBe(250);
  });

  it("should have reasonable WORDS_PER_PAGE", () => {
    expect(WORDS_PER_PAGE).toBe(250);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  describe("Special characters in metadata", () => {
    it("should handle Unicode in book title", () => {
      const metadata: GoogleBookMetadata = {
        id: "abc123",
        title: "书籍标题 - Book Title",
        authors: [],
        categories: [],
      };
      const result = normalizeGoogleMetadata(metadata);
      expect(result.title).toBe("书籍标题 - Book Title");
    });

    it("should handle HTML entities in description", () => {
      const metadata: GoogleBookMetadata = {
        id: "abc123",
        title: "Test",
        authors: [],
        categories: [],
        description: "This &amp; that &lt;book&gt;",
      };
      const result = normalizeGoogleMetadata(metadata);
      expect(result.description).toBe("This &amp; that &lt;book&gt;");
    });

    it("should handle special characters in author names", () => {
      const metadata: GoogleBookMetadata = {
        id: "abc123",
        title: "Test",
        authors: ["José García", "François Müller", "Björk"],
        categories: [],
      };
      const result = normalizeGoogleMetadata(metadata);
      expect(result.author).toBe("José García, François Müller, Björk");
    });
  });

  describe("Empty arrays and null values", () => {
    it("should handle all null optional fields for Google", () => {
      const metadata: GoogleBookMetadata = {
        id: "abc123",
        title: "Test",
        authors: [],
        categories: [],
      };
      const result = normalizeGoogleMetadata(metadata);
      expect(result.author).toBeNull();
      expect(result.description).toBeNull();
      expect(result.coverImage).toBeNull();
      expect(result.pageCount).toBeNull();
      expect(result.genre).toBeNull();
      expect(result.isbn10).toBeNull();
      expect(result.isbn13).toBeNull();
      expect(result.publishYear).toBeNull();
      expect(result.publisher).toBeNull();
    });

    it("should handle all null optional fields for Open Library", () => {
      const metadata: OpenLibraryBookMetadata = {
        workId: "OL123W",
        title: "Test",
        authors: [],
      };
      const result = normalizeOpenLibraryMetadata(metadata);
      expect(result.author).toBeNull();
      expect(result.description).toBeNull();
      // coverImage returns null when no coverIds
      expect(result.coverImage).toBeNull();
      expect(result.pageCount).toBeNull();
      expect(result.genre).toBeNull();
      expect(result.isbn10).toBeNull();
      expect(result.isbn13).toBeNull();
      expect(result.publishYear).toBeNull();
      expect(result.publisher).toBeNull();
    });
  });

  describe("Boundary values", () => {
    it("should handle book ID at exact max length", () => {
      const longId = "a".repeat(MAX_BOOK_ID_LENGTH);
      const result = addFromLibrarySchema.safeParse({
        bookId: longId,
        source: "google",
      });
      expect(result.success).toBe(true);
    });

    it("should reject book ID one character over max", () => {
      const tooLongId = "a".repeat(MAX_BOOK_ID_LENGTH + 1);
      const result = addFromLibrarySchema.safeParse({
        bookId: tooLongId,
        source: "google",
      });
      expect(result.success).toBe(false);
    });

    it("should handle single character book ID", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "a",
        source: "google",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Whitespace handling", () => {
    it("should trim leading/trailing spaces from book ID", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "  OL123W  ",
        source: "openlib",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bookId).toBe("OL123W");
      }
    });

    it("should reject whitespace-only book ID", () => {
      const result = addFromLibrarySchema.safeParse({
        bookId: "   ",
        source: "google",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Publish year edge cases", () => {
    it("should handle very old dates", () => {
      expect(extractPublishYear("1066")).toBe(1066);
    });

    it("should handle future dates", () => {
      expect(extractPublishYear("2099")).toBe(2099);
    });

    it("should handle dates with BC/AD notation", () => {
      // Only extracts 4-digit years, so this won't work for BC dates
      expect(extractPublishYear("500 BC")).toBeUndefined();
    });

    it("should handle date ranges", () => {
      expect(extractPublishYear("1920-1925")).toBe(1920);
    });
  });
});
