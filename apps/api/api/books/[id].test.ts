/**
 * Tests for GET /api/books/:id endpoint
 *
 * Tests cover:
 * - Book ID validation (format, length, edge cases)
 * - formatChapter helper function
 * - formatProgress helper function
 * - formatBookDetailResponse helper function
 * - Constants (ID length limits)
 * - Edge cases (Unicode, special characters, null handling)
 */

import { describe, it, expect } from "vitest";
import {
  bookIdSchema,
  formatChapter,
  formatProgress,
  formatBookDetailResponse,
  MAX_ID_LENGTH,
  MIN_ID_LENGTH,
} from "./[id].js";

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Create a mock chapter for testing
 */
function createMockChapter(
  overrides: Partial<{
    id: string;
    title: string | null;
    orderIndex: number;
    startPosition: number;
    endPosition: number;
    wordCount: number | null;
  }> = {}
) {
  return {
    id: "chapter_123",
    title: "Chapter 1: Introduction",
    orderIndex: 0,
    startPosition: 0,
    endPosition: 5000,
    wordCount: 1000,
    ...overrides,
  };
}

/**
 * Create a mock reading progress for testing
 */
function createMockProgress(
  overrides: Partial<{
    percentage: number;
    currentPosition: number;
    totalReadTime: number;
    averageWpm: number | null;
    lastReadAt: Date | null;
    startedAt: Date;
    completedAt: Date | null;
  }> = {}
) {
  return {
    percentage: 45.5,
    currentPosition: 2500,
    totalReadTime: 3600,
    averageWpm: 250,
    lastReadAt: new Date("2024-01-15T10:30:00Z"),
    startedAt: new Date("2024-01-01T08:00:00Z"),
    completedAt: null,
    ...overrides,
  };
}

/**
 * Create a mock book for testing
 */
function createMockBook(
  overrides: Partial<{
    id: string;
    title: string;
    author: string | null;
    description: string | null;
    coverImage: string | null;
    source: string;
    sourceId: string | null;
    sourceUrl: string | null;
    filePath: string | null;
    fileType: string | null;
    language: string;
    wordCount: number | null;
    estimatedReadTime: number | null;
    lexileScore: number | null;
    genre: string | null;
    tags: string[];
    status: string;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
    chapters: ReturnType<typeof createMockChapter>[];
    readingProgress: ReturnType<typeof createMockProgress>[];
  }> = {}
) {
  return {
    id: "book_abc123def456",
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    description: "A novel about the American Dream in the Jazz Age.",
    coverImage: "https://example.com/cover.jpg",
    source: "UPLOAD",
    sourceId: null,
    sourceUrl: null,
    filePath: "users/user_123/books/book_abc123def456.epub",
    fileType: "EPUB",
    language: "en",
    wordCount: 47094,
    estimatedReadTime: 188,
    lexileScore: 1070,
    genre: "Fiction",
    tags: ["classic", "american-literature"],
    status: "READING",
    isPublic: false,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-15T12:00:00Z"),
    chapters: [createMockChapter()],
    readingProgress: [createMockProgress()],
    ...overrides,
  };
}

// ============================================================================
// Book ID Schema Tests
// ============================================================================

describe("bookIdSchema", () => {
  describe("valid book IDs", () => {
    it("should accept a valid CUID", () => {
      const result = bookIdSchema.safeParse("clg1234567890abcdef");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("clg1234567890abcdef");
      }
    });

    it("should accept a single character ID", () => {
      const result = bookIdSchema.safeParse("a");
      expect(result.success).toBe(true);
    });

    it("should accept maximum length ID", () => {
      const maxId = "a".repeat(MAX_ID_LENGTH);
      const result = bookIdSchema.safeParse(maxId);
      expect(result.success).toBe(true);
    });

    it("should accept numeric string ID", () => {
      const result = bookIdSchema.safeParse("123456789");
      expect(result.success).toBe(true);
    });

    it("should accept alphanumeric ID", () => {
      const result = bookIdSchema.safeParse("book123ABC");
      expect(result.success).toBe(true);
    });

    it("should accept ID with underscores", () => {
      const result = bookIdSchema.safeParse("book_123_abc");
      expect(result.success).toBe(true);
    });

    it("should accept ID with hyphens", () => {
      const result = bookIdSchema.safeParse("book-123-abc");
      expect(result.success).toBe(true);
    });
  });

  describe("trimming behavior", () => {
    it("should trim leading whitespace", () => {
      const result = bookIdSchema.safeParse("  book123");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("book123");
      }
    });

    it("should trim trailing whitespace", () => {
      const result = bookIdSchema.safeParse("book123  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("book123");
      }
    });

    it("should trim both leading and trailing whitespace", () => {
      const result = bookIdSchema.safeParse("  book123  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("book123");
      }
    });

    it("should preserve internal whitespace after trimming", () => {
      const result = bookIdSchema.safeParse("book 123");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("book 123");
      }
    });
  });

  describe("invalid book IDs", () => {
    it("should reject empty string", () => {
      const result = bookIdSchema.safeParse("");
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toContain("required");
      }
    });

    it("should reject whitespace-only string", () => {
      const result = bookIdSchema.safeParse("   ");
      expect(result.success).toBe(false);
    });

    it("should reject ID exceeding maximum length", () => {
      const tooLongId = "a".repeat(MAX_ID_LENGTH + 1);
      const result = bookIdSchema.safeParse(tooLongId);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toContain("at most");
      }
    });

    it("should reject non-string values (number)", () => {
      const result = bookIdSchema.safeParse(123);
      expect(result.success).toBe(false);
    });

    it("should reject non-string values (null)", () => {
      const result = bookIdSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it("should reject non-string values (undefined)", () => {
      const result = bookIdSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });

    it("should reject non-string values (object)", () => {
      const result = bookIdSchema.safeParse({ id: "book123" });
      expect(result.success).toBe(false);
    });

    it("should reject non-string values (array)", () => {
      const result = bookIdSchema.safeParse(["book123"]);
      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should accept Unicode characters in ID", () => {
      const result = bookIdSchema.safeParse("book_日本語");
      expect(result.success).toBe(true);
    });

    it("should accept emoji in ID", () => {
      const result = bookIdSchema.safeParse("book_📚");
      expect(result.success).toBe(true);
    });

    it("should accept ID at exact minimum length", () => {
      const result = bookIdSchema.safeParse("x");
      expect(result.success).toBe(true);
    });

    it("should accept ID at exact maximum length", () => {
      const exactMaxId = "x".repeat(MAX_ID_LENGTH);
      const result = bookIdSchema.safeParse(exactMaxId);
      expect(result.success).toBe(true);
    });

    it("should handle special characters", () => {
      const result = bookIdSchema.safeParse("book@#$%");
      expect(result.success).toBe(true);
    });

    it("should handle newline character after trimming", () => {
      const result = bookIdSchema.safeParse("book123\n");
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// formatChapter Tests
// ============================================================================

describe("formatChapter", () => {
  describe("basic formatting", () => {
    it("should format chapter with all fields", () => {
      const chapter = createMockChapter();
      const result = formatChapter(chapter);

      expect(result).toEqual({
        id: "chapter_123",
        title: "Chapter 1: Introduction",
        orderIndex: 0,
        startPosition: 0,
        endPosition: 5000,
        wordCount: 1000,
      });
    });

    it("should format chapter with null title", () => {
      const chapter = createMockChapter({ title: null });
      const result = formatChapter(chapter);

      expect(result.title).toBeNull();
    });

    it("should format chapter with null wordCount", () => {
      const chapter = createMockChapter({ wordCount: null });
      const result = formatChapter(chapter);

      expect(result.wordCount).toBeNull();
    });
  });

  describe("ordering", () => {
    it("should preserve orderIndex of 0", () => {
      const chapter = createMockChapter({ orderIndex: 0 });
      const result = formatChapter(chapter);

      expect(result.orderIndex).toBe(0);
    });

    it("should preserve high orderIndex", () => {
      const chapter = createMockChapter({ orderIndex: 99 });
      const result = formatChapter(chapter);

      expect(result.orderIndex).toBe(99);
    });
  });

  describe("position values", () => {
    it("should handle zero start position", () => {
      const chapter = createMockChapter({ startPosition: 0 });
      const result = formatChapter(chapter);

      expect(result.startPosition).toBe(0);
    });

    it("should handle large position values", () => {
      const chapter = createMockChapter({
        startPosition: 1000000,
        endPosition: 2000000,
      });
      const result = formatChapter(chapter);

      expect(result.startPosition).toBe(1000000);
      expect(result.endPosition).toBe(2000000);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string title", () => {
      const chapter = createMockChapter({ title: "" });
      const result = formatChapter(chapter);

      expect(result.title).toBe("");
    });

    it("should handle Unicode in title", () => {
      const chapter = createMockChapter({ title: "第一章：はじめに" });
      const result = formatChapter(chapter);

      expect(result.title).toBe("第一章：はじめに");
    });

    it("should handle zero wordCount", () => {
      const chapter = createMockChapter({ wordCount: 0 });
      const result = formatChapter(chapter);

      expect(result.wordCount).toBe(0);
    });
  });
});

// ============================================================================
// formatProgress Tests
// ============================================================================

describe("formatProgress", () => {
  describe("basic formatting", () => {
    it("should format progress with all fields", () => {
      const progress = createMockProgress();
      const result = formatProgress(progress);

      expect(result).toEqual({
        percentage: 45.5,
        currentPosition: 2500,
        totalReadTime: 3600,
        averageWpm: 250,
        lastReadAt: "2024-01-15T10:30:00.000Z",
        startedAt: "2024-01-01T08:00:00.000Z",
        completedAt: null,
      });
    });

    it("should return null for null progress", () => {
      const result = formatProgress(null);
      expect(result).toBeNull();
    });

    it("should handle completed book", () => {
      const progress = createMockProgress({
        percentage: 100,
        completedAt: new Date("2024-01-20T14:00:00Z"),
      });
      const result = formatProgress(progress);

      expect(result?.percentage).toBe(100);
      expect(result?.completedAt).toBe("2024-01-20T14:00:00.000Z");
    });
  });

  describe("null field handling", () => {
    it("should handle null lastReadAt", () => {
      const progress = createMockProgress({ lastReadAt: null });
      const result = formatProgress(progress);

      expect(result?.lastReadAt).toBeNull();
    });

    it("should handle null averageWpm", () => {
      const progress = createMockProgress({ averageWpm: null });
      const result = formatProgress(progress);

      expect(result?.averageWpm).toBeNull();
    });

    it("should handle null completedAt", () => {
      const progress = createMockProgress({ completedAt: null });
      const result = formatProgress(progress);

      expect(result?.completedAt).toBeNull();
    });
  });

  describe("date formatting", () => {
    it("should format startedAt as ISO string", () => {
      const progress = createMockProgress({
        startedAt: new Date("2024-06-15T09:30:00Z"),
      });
      const result = formatProgress(progress);

      expect(result?.startedAt).toBe("2024-06-15T09:30:00.000Z");
    });

    it("should format lastReadAt as ISO string when present", () => {
      const progress = createMockProgress({
        lastReadAt: new Date("2024-06-20T18:45:00Z"),
      });
      const result = formatProgress(progress);

      expect(result?.lastReadAt).toBe("2024-06-20T18:45:00.000Z");
    });

    it("should format completedAt as ISO string when present", () => {
      const progress = createMockProgress({
        completedAt: new Date("2024-07-01T12:00:00Z"),
      });
      const result = formatProgress(progress);

      expect(result?.completedAt).toBe("2024-07-01T12:00:00.000Z");
    });
  });

  describe("edge cases", () => {
    it("should handle zero percentage", () => {
      const progress = createMockProgress({ percentage: 0 });
      const result = formatProgress(progress);

      expect(result?.percentage).toBe(0);
    });

    it("should handle 100% percentage", () => {
      const progress = createMockProgress({ percentage: 100 });
      const result = formatProgress(progress);

      expect(result?.percentage).toBe(100);
    });

    it("should handle zero currentPosition", () => {
      const progress = createMockProgress({ currentPosition: 0 });
      const result = formatProgress(progress);

      expect(result?.currentPosition).toBe(0);
    });

    it("should handle zero totalReadTime", () => {
      const progress = createMockProgress({ totalReadTime: 0 });
      const result = formatProgress(progress);

      expect(result?.totalReadTime).toBe(0);
    });

    it("should handle very high averageWpm", () => {
      const progress = createMockProgress({ averageWpm: 1000 });
      const result = formatProgress(progress);

      expect(result?.averageWpm).toBe(1000);
    });

    it("should handle decimal percentage", () => {
      const progress = createMockProgress({ percentage: 33.333 });
      const result = formatProgress(progress);

      expect(result?.percentage).toBe(33.333);
    });
  });
});

// ============================================================================
// formatBookDetailResponse Tests
// ============================================================================

describe("formatBookDetailResponse", () => {
  describe("basic formatting", () => {
    it("should format complete book with all fields", () => {
      const book = createMockBook();
      const result = formatBookDetailResponse(book);

      expect(result).toEqual({
        id: "book_abc123def456",
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        description: "A novel about the American Dream in the Jazz Age.",
        coverImage: "https://example.com/cover.jpg",
        source: "UPLOAD",
        sourceId: null,
        sourceUrl: null,
        filePath: "users/user_123/books/book_abc123def456.epub",
        fileType: "EPUB",
        language: "en",
        wordCount: 47094,
        estimatedReadTime: 188,
        lexileScore: 1070,
        genre: "Fiction",
        tags: ["classic", "american-literature"],
        status: "READING",
        isPublic: false,
        chapters: [
          {
            id: "chapter_123",
            title: "Chapter 1: Introduction",
            orderIndex: 0,
            startPosition: 0,
            endPosition: 5000,
            wordCount: 1000,
          },
        ],
        progress: {
          percentage: 45.5,
          currentPosition: 2500,
          totalReadTime: 3600,
          averageWpm: 250,
          lastReadAt: "2024-01-15T10:30:00.000Z",
          startedAt: "2024-01-01T08:00:00.000Z",
          completedAt: null,
        },
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-15T12:00:00.000Z",
      });
    });

    it("should format book with no reading progress", () => {
      const book = createMockBook({ readingProgress: [] });
      const result = formatBookDetailResponse(book);

      expect(result.progress).toBeNull();
    });

    it("should format book with no chapters", () => {
      const book = createMockBook({ chapters: [] });
      const result = formatBookDetailResponse(book);

      expect(result.chapters).toEqual([]);
    });
  });

  describe("null field handling", () => {
    it("should handle null author", () => {
      const book = createMockBook({ author: null });
      const result = formatBookDetailResponse(book);

      expect(result.author).toBeNull();
    });

    it("should handle null description", () => {
      const book = createMockBook({ description: null });
      const result = formatBookDetailResponse(book);

      expect(result.description).toBeNull();
    });

    it("should handle null coverImage", () => {
      const book = createMockBook({ coverImage: null });
      const result = formatBookDetailResponse(book);

      expect(result.coverImage).toBeNull();
    });

    it("should handle null sourceId", () => {
      const book = createMockBook({ sourceId: null });
      const result = formatBookDetailResponse(book);

      expect(result.sourceId).toBeNull();
    });

    it("should handle null sourceUrl", () => {
      const book = createMockBook({ sourceUrl: null });
      const result = formatBookDetailResponse(book);

      expect(result.sourceUrl).toBeNull();
    });

    it("should handle null filePath", () => {
      const book = createMockBook({ filePath: null });
      const result = formatBookDetailResponse(book);

      expect(result.filePath).toBeNull();
    });

    it("should handle null fileType", () => {
      const book = createMockBook({ fileType: null });
      const result = formatBookDetailResponse(book);

      expect(result.fileType).toBeNull();
    });

    it("should handle null wordCount", () => {
      const book = createMockBook({ wordCount: null });
      const result = formatBookDetailResponse(book);

      expect(result.wordCount).toBeNull();
    });

    it("should handle null estimatedReadTime", () => {
      const book = createMockBook({ estimatedReadTime: null });
      const result = formatBookDetailResponse(book);

      expect(result.estimatedReadTime).toBeNull();
    });

    it("should handle null lexileScore", () => {
      const book = createMockBook({ lexileScore: null });
      const result = formatBookDetailResponse(book);

      expect(result.lexileScore).toBeNull();
    });

    it("should handle null genre", () => {
      const book = createMockBook({ genre: null });
      const result = formatBookDetailResponse(book);

      expect(result.genre).toBeNull();
    });
  });

  describe("source types", () => {
    it("should format UPLOAD source", () => {
      const book = createMockBook({ source: "UPLOAD" });
      const result = formatBookDetailResponse(book);

      expect(result.source).toBe("UPLOAD");
    });

    it("should format URL source with sourceUrl", () => {
      const book = createMockBook({
        source: "URL",
        sourceUrl: "https://example.com/article",
      });
      const result = formatBookDetailResponse(book);

      expect(result.source).toBe("URL");
      expect(result.sourceUrl).toBe("https://example.com/article");
    });

    it("should format GOOGLE_BOOKS source with sourceId", () => {
      const book = createMockBook({
        source: "GOOGLE_BOOKS",
        sourceId: "abc123XYZ",
      });
      const result = formatBookDetailResponse(book);

      expect(result.source).toBe("GOOGLE_BOOKS");
      expect(result.sourceId).toBe("abc123XYZ");
    });

    it("should format OPEN_LIBRARY source", () => {
      const book = createMockBook({
        source: "OPEN_LIBRARY",
        sourceId: "OL12345W",
      });
      const result = formatBookDetailResponse(book);

      expect(result.source).toBe("OPEN_LIBRARY");
      expect(result.sourceId).toBe("OL12345W");
    });

    it("should format PASTE source", () => {
      const book = createMockBook({
        source: "PASTE",
        filePath: null,
        fileType: null,
      });
      const result = formatBookDetailResponse(book);

      expect(result.source).toBe("PASTE");
    });
  });

  describe("file types", () => {
    it("should format PDF file type", () => {
      const book = createMockBook({ fileType: "PDF" });
      const result = formatBookDetailResponse(book);

      expect(result.fileType).toBe("PDF");
    });

    it("should format EPUB file type", () => {
      const book = createMockBook({ fileType: "EPUB" });
      const result = formatBookDetailResponse(book);

      expect(result.fileType).toBe("EPUB");
    });

    it("should format DOC file type", () => {
      const book = createMockBook({ fileType: "DOC" });
      const result = formatBookDetailResponse(book);

      expect(result.fileType).toBe("DOC");
    });

    it("should format DOCX file type", () => {
      const book = createMockBook({ fileType: "DOCX" });
      const result = formatBookDetailResponse(book);

      expect(result.fileType).toBe("DOCX");
    });

    it("should format TXT file type", () => {
      const book = createMockBook({ fileType: "TXT" });
      const result = formatBookDetailResponse(book);

      expect(result.fileType).toBe("TXT");
    });

    it("should format HTML file type", () => {
      const book = createMockBook({ fileType: "HTML" });
      const result = formatBookDetailResponse(book);

      expect(result.fileType).toBe("HTML");
    });
  });

  describe("reading status", () => {
    it("should format WANT_TO_READ status", () => {
      const book = createMockBook({ status: "WANT_TO_READ" });
      const result = formatBookDetailResponse(book);

      expect(result.status).toBe("WANT_TO_READ");
    });

    it("should format READING status", () => {
      const book = createMockBook({ status: "READING" });
      const result = formatBookDetailResponse(book);

      expect(result.status).toBe("READING");
    });

    it("should format COMPLETED status", () => {
      const book = createMockBook({ status: "COMPLETED" });
      const result = formatBookDetailResponse(book);

      expect(result.status).toBe("COMPLETED");
    });

    it("should format ABANDONED status", () => {
      const book = createMockBook({ status: "ABANDONED" });
      const result = formatBookDetailResponse(book);

      expect(result.status).toBe("ABANDONED");
    });
  });

  describe("chapters formatting", () => {
    it("should format multiple chapters in order", () => {
      const book = createMockBook({
        chapters: [
          createMockChapter({ id: "ch1", orderIndex: 0 }),
          createMockChapter({ id: "ch2", orderIndex: 1 }),
          createMockChapter({ id: "ch3", orderIndex: 2 }),
        ],
      });
      const result = formatBookDetailResponse(book);

      expect(result.chapters.length).toBe(3);
      expect(result.chapters[0]?.id).toBe("ch1");
      expect(result.chapters[1]?.id).toBe("ch2");
      expect(result.chapters[2]?.id).toBe("ch3");
    });

    it("should format chapters with mixed null fields", () => {
      const book = createMockBook({
        chapters: [
          createMockChapter({ title: null, wordCount: 1000 }),
          createMockChapter({ title: "Chapter 2", wordCount: null }),
        ],
      });
      const result = formatBookDetailResponse(book);

      expect(result.chapters[0]?.title).toBeNull();
      expect(result.chapters[0]?.wordCount).toBe(1000);
      expect(result.chapters[1]?.title).toBe("Chapter 2");
      expect(result.chapters[1]?.wordCount).toBeNull();
    });
  });

  describe("tags formatting", () => {
    it("should format empty tags array", () => {
      const book = createMockBook({ tags: [] });
      const result = formatBookDetailResponse(book);

      expect(result.tags).toEqual([]);
    });

    it("should format single tag", () => {
      const book = createMockBook({ tags: ["fiction"] });
      const result = formatBookDetailResponse(book);

      expect(result.tags).toEqual(["fiction"]);
    });

    it("should format multiple tags", () => {
      const book = createMockBook({ tags: ["fiction", "classic", "american"] });
      const result = formatBookDetailResponse(book);

      expect(result.tags).toEqual(["fiction", "classic", "american"]);
    });
  });

  describe("visibility", () => {
    it("should format public book", () => {
      const book = createMockBook({ isPublic: true });
      const result = formatBookDetailResponse(book);

      expect(result.isPublic).toBe(true);
    });

    it("should format private book", () => {
      const book = createMockBook({ isPublic: false });
      const result = formatBookDetailResponse(book);

      expect(result.isPublic).toBe(false);
    });
  });

  describe("date formatting", () => {
    it("should format createdAt as ISO string", () => {
      const book = createMockBook({
        createdAt: new Date("2024-03-15T09:00:00Z"),
      });
      const result = formatBookDetailResponse(book);

      expect(result.createdAt).toBe("2024-03-15T09:00:00.000Z");
    });

    it("should format updatedAt as ISO string", () => {
      const book = createMockBook({
        updatedAt: new Date("2024-03-20T14:30:00Z"),
      });
      const result = formatBookDetailResponse(book);

      expect(result.updatedAt).toBe("2024-03-20T14:30:00.000Z");
    });
  });

  describe("edge cases", () => {
    it("should handle Unicode in title and author", () => {
      const book = createMockBook({
        title: "坊っちゃん",
        author: "夏目漱石",
      });
      const result = formatBookDetailResponse(book);

      expect(result.title).toBe("坊っちゃん");
      expect(result.author).toBe("夏目漱石");
    });

    it("should handle special characters in description", () => {
      const book = createMockBook({
        description: "A story about <love> & \"happiness\" — with 'quotes'",
      });
      const result = formatBookDetailResponse(book);

      expect(result.description).toBe(
        "A story about <love> & \"happiness\" — with 'quotes'"
      );
    });

    it("should handle very long description", () => {
      const longDescription = "A".repeat(10000);
      const book = createMockBook({ description: longDescription });
      const result = formatBookDetailResponse(book);

      expect(result.description?.length).toBe(10000);
    });

    it("should handle zero wordCount", () => {
      const book = createMockBook({ wordCount: 0 });
      const result = formatBookDetailResponse(book);

      expect(result.wordCount).toBe(0);
    });

    it("should handle zero estimatedReadTime", () => {
      const book = createMockBook({ estimatedReadTime: 0 });
      const result = formatBookDetailResponse(book);

      expect(result.estimatedReadTime).toBe(0);
    });

    it("should handle zero lexileScore", () => {
      const book = createMockBook({ lexileScore: 0 });
      const result = formatBookDetailResponse(book);

      expect(result.lexileScore).toBe(0);
    });

    it("should handle negative lexileScore (BR levels)", () => {
      const book = createMockBook({ lexileScore: -100 });
      const result = formatBookDetailResponse(book);

      expect(result.lexileScore).toBe(-100);
    });

    it("should handle minimal book with all optional fields null", () => {
      const book = createMockBook({
        author: null,
        description: null,
        coverImage: null,
        sourceId: null,
        sourceUrl: null,
        filePath: null,
        fileType: null,
        wordCount: null,
        estimatedReadTime: null,
        lexileScore: null,
        genre: null,
        tags: [],
        chapters: [],
        readingProgress: [],
      });
      const result = formatBookDetailResponse(book);

      expect(result.author).toBeNull();
      expect(result.description).toBeNull();
      expect(result.coverImage).toBeNull();
      expect(result.chapters).toEqual([]);
      expect(result.progress).toBeNull();
    });
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("constants", () => {
  it("should have MIN_ID_LENGTH of 1", () => {
    expect(MIN_ID_LENGTH).toBe(1);
  });

  it("should have MAX_ID_LENGTH of 30", () => {
    expect(MAX_ID_LENGTH).toBe(30);
  });

  it("should have MAX_ID_LENGTH greater than MIN_ID_LENGTH", () => {
    expect(MAX_ID_LENGTH).toBeGreaterThan(MIN_ID_LENGTH);
  });
});
