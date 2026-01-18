import { describe, expect, it } from "vitest";

import {
  addFromLibrarySchema,
  bookIdSchema,
  bookQuerySchema,
  bookSchemas,
  bookSourceSchema,
  bookTitlePublicSchema,
  bookTitleSchema,
  createBookGoogleBooksSchema,
  createBookOpenLibrarySchema,
  createBookPasteSchema,
  createBookSchema,
  createBookUploadSchema,
  createBookUrlSchema,
  externalBookSearchSchema,
  fileTypeSchema,
  readingStatusSchema,
  tagsArraySchema,
  updateBookPublicSchema,
  updateBookSchema,
  updateReadingProgressSchema,
} from "./books";

describe("book schemas", () => {
  // =============================================================================
  // ENUM SCHEMAS
  // =============================================================================

  describe("bookSourceSchema", () => {
    it("should accept valid book sources", () => {
      expect(bookSourceSchema.parse("UPLOAD")).toBe("UPLOAD");
      expect(bookSourceSchema.parse("URL")).toBe("URL");
      expect(bookSourceSchema.parse("PASTE")).toBe("PASTE");
      expect(bookSourceSchema.parse("GOOGLE_BOOKS")).toBe("GOOGLE_BOOKS");
      expect(bookSourceSchema.parse("OPEN_LIBRARY")).toBe("OPEN_LIBRARY");
    });

    it("should reject invalid book sources", () => {
      expect(() => bookSourceSchema.parse("INVALID")).toThrow();
      expect(() => bookSourceSchema.parse("upload")).toThrow(); // lowercase
      expect(() => bookSourceSchema.parse("")).toThrow();
    });
  });

  describe("fileTypeSchema", () => {
    it("should accept valid file types", () => {
      expect(fileTypeSchema.parse("PDF")).toBe("PDF");
      expect(fileTypeSchema.parse("EPUB")).toBe("EPUB");
      expect(fileTypeSchema.parse("DOC")).toBe("DOC");
      expect(fileTypeSchema.parse("DOCX")).toBe("DOCX");
      expect(fileTypeSchema.parse("TXT")).toBe("TXT");
      expect(fileTypeSchema.parse("HTML")).toBe("HTML");
    });

    it("should reject invalid file types", () => {
      expect(() => fileTypeSchema.parse("MOBI")).toThrow();
      expect(() => fileTypeSchema.parse("pdf")).toThrow(); // lowercase
    });
  });

  describe("readingStatusSchema", () => {
    it("should accept valid reading statuses", () => {
      expect(readingStatusSchema.parse("WANT_TO_READ")).toBe("WANT_TO_READ");
      expect(readingStatusSchema.parse("READING")).toBe("READING");
      expect(readingStatusSchema.parse("COMPLETED")).toBe("COMPLETED");
      expect(readingStatusSchema.parse("ABANDONED")).toBe("ABANDONED");
    });

    it("should reject invalid reading statuses", () => {
      expect(() => readingStatusSchema.parse("PAUSED")).toThrow();
      expect(() => readingStatusSchema.parse("reading")).toThrow();
    });
  });

  // =============================================================================
  // FIELD SCHEMAS
  // =============================================================================

  describe("bookTitleSchema", () => {
    it("should accept valid titles", () => {
      expect(bookTitleSchema.parse("A Book Title")).toBe("A Book Title");
      expect(bookTitleSchema.parse("X")).toBe("X"); // 1 character minimum
      expect(bookTitleSchema.parse("A".repeat(500))).toHaveLength(500); // 500 max
    });

    it("should trim whitespace", () => {
      expect(bookTitleSchema.parse("  Trimmed Title  ")).toBe("Trimmed Title");
    });

    it("should reject empty titles", () => {
      expect(() => bookTitleSchema.parse("")).toThrow();
      expect(() => bookTitleSchema.parse("   ")).toThrow(); // whitespace only
    });

    it("should reject titles over 500 characters", () => {
      expect(() => bookTitleSchema.parse("A".repeat(501))).toThrow();
    });
  });

  describe("bookTitlePublicSchema", () => {
    it("should accept clean titles", () => {
      expect(bookTitlePublicSchema.parse("A Great Book")).toBe("A Great Book");
    });

    it("should reject titles with profanity", () => {
      expect(() =>
        bookTitlePublicSchema.parse("What the Fuck: A Story")
      ).toThrow();
    });
  });

  describe("tagsArraySchema", () => {
    it("should accept valid tags array", () => {
      const tags = ["fiction", "sci-fi", "adventure"];
      expect(tagsArraySchema.parse(tags)).toEqual(tags);
    });

    it("should default to empty array", () => {
      expect(tagsArraySchema.parse(undefined)).toEqual([]);
    });

    it("should reject arrays with more than 20 tags", () => {
      const tooManyTags = Array(21).fill("tag");
      expect(() => tagsArraySchema.parse(tooManyTags)).toThrow();
    });

    it("should reject tags over 50 characters", () => {
      const longTag = "A".repeat(51);
      expect(() => tagsArraySchema.parse([longTag])).toThrow();
    });

    it("should accept tags with valid characters", () => {
      expect(
        tagsArraySchema.parse(["sci-fi", "non_fiction", "2024"])
      ).toBeTruthy();
    });

    it("should reject tags with special characters", () => {
      expect(() => tagsArraySchema.parse(["tag@special"])).toThrow();
      expect(() => tagsArraySchema.parse(["tag#hashtag"])).toThrow();
    });
  });

  // =============================================================================
  // CREATE BOOK SCHEMAS
  // =============================================================================

  describe("createBookUploadSchema", () => {
    it("should accept valid upload data", () => {
      const data = {
        source: "UPLOAD" as const,
        title: "My Book",
        fileType: "PDF" as const,
      };
      const result = createBookUploadSchema.parse(data);
      expect(result.source).toBe("UPLOAD");
      expect(result.title).toBe("My Book");
      expect(result.fileType).toBe("PDF");
    });

    it("should set defaults correctly", () => {
      const data = {
        source: "UPLOAD" as const,
        title: "My Book",
        fileType: "EPUB" as const,
      };
      const result = createBookUploadSchema.parse(data);
      expect(result.isPublic).toBe(false);
    });

    it("should accept optional fields", () => {
      const data = {
        source: "UPLOAD" as const,
        title: "My Book",
        fileType: "PDF" as const,
        author: "John Doe",
        description: "A great book",
        tags: ["fiction", "classic"],
        genre: "Fiction",
        language: "es",
        isPublic: true,
      };
      const result = createBookUploadSchema.parse(data);
      expect(result.author).toBe("John Doe");
      expect(result.tags).toEqual(["fiction", "classic"]);
    });
  });

  describe("createBookUrlSchema", () => {
    it("should accept valid URL import data", () => {
      const data = {
        source: "URL" as const,
        title: "Article Title",
        sourceUrl: "https://example.com/article",
      };
      const result = createBookUrlSchema.parse(data);
      expect(result.source).toBe("URL");
      expect(result.sourceUrl).toBe("https://example.com/article");
    });

    it("should reject invalid URLs", () => {
      const data = {
        source: "URL" as const,
        title: "Article",
        sourceUrl: "not-a-url",
      };
      expect(() => createBookUrlSchema.parse(data)).toThrow();
    });
  });

  describe("createBookPasteSchema", () => {
    it("should accept valid pasted content", () => {
      const data = {
        source: "PASTE" as const,
        title: "My Notes",
        content:
          "This is the content of my notes that I want to save as a book.",
      };
      const result = createBookPasteSchema.parse(data);
      expect(result.source).toBe("PASTE");
      expect(result.content).toBe(data.content);
    });

    it("should reject content less than 10 characters", () => {
      const data = {
        source: "PASTE" as const,
        title: "Short",
        content: "Too short",
      };
      expect(() => createBookPasteSchema.parse(data)).toThrow();
    });

    it("should accept long content up to 5 million characters", () => {
      const data = {
        source: "PASTE" as const,
        title: "Long Book",
        content: "A".repeat(100000), // 100k chars
      };
      expect(() => createBookPasteSchema.parse(data)).not.toThrow();
    });
  });

  describe("createBookGoogleBooksSchema", () => {
    it("should accept valid Google Books data", () => {
      const data = {
        source: "GOOGLE_BOOKS" as const,
        title: "A Book from Google",
        sourceId: "abc123",
      };
      const result = createBookGoogleBooksSchema.parse(data);
      expect(result.sourceId).toBe("abc123");
    });

    it("should require sourceId", () => {
      const data = {
        source: "GOOGLE_BOOKS" as const,
        title: "A Book",
      };
      expect(() => createBookGoogleBooksSchema.parse(data)).toThrow();
    });
  });

  describe("createBookOpenLibrarySchema", () => {
    it("should accept valid Open Library data", () => {
      const data = {
        source: "OPEN_LIBRARY" as const,
        title: "Classic Novel",
        sourceId: "OL123M",
      };
      const result = createBookOpenLibrarySchema.parse(data);
      expect(result.sourceId).toBe("OL123M");
    });
  });

  describe("createBookSchema (discriminated union)", () => {
    it("should correctly parse upload source", () => {
      const data = {
        source: "UPLOAD",
        title: "Upload Book",
        fileType: "PDF",
      };
      const result = createBookSchema.parse(data);
      expect(result.source).toBe("UPLOAD");
    });

    it("should correctly parse paste source", () => {
      const data = {
        source: "PASTE",
        title: "Paste Book",
        content: "This is the content of the pasted text here.",
      };
      const result = createBookSchema.parse(data);
      expect(result.source).toBe("PASTE");
    });

    it("should reject invalid source", () => {
      const data = {
        source: "INVALID_SOURCE",
        title: "Book",
      };
      expect(() => createBookSchema.parse(data)).toThrow();
    });
  });

  // =============================================================================
  // UPDATE BOOK SCHEMAS
  // =============================================================================

  describe("updateBookSchema", () => {
    it("should accept partial updates", () => {
      const data = { title: "New Title" };
      const result = updateBookSchema.parse(data);
      expect(result.title).toBe("New Title");
    });

    it("should accept status updates", () => {
      const data = { status: "COMPLETED" as const };
      const result = updateBookSchema.parse(data);
      expect(result.status).toBe("COMPLETED");
    });

    it("should accept multiple fields", () => {
      const data = {
        title: "Updated Title",
        author: "New Author",
        status: "READING" as const,
        tags: ["updated", "edited"],
      };
      const result = updateBookSchema.parse(data);
      expect(result.title).toBe("Updated Title");
      expect(result.tags).toEqual(["updated", "edited"]);
    });

    it("should reject if no fields provided", () => {
      expect(() => updateBookSchema.parse({})).toThrow();
    });

    it("should accept null for nullable fields", () => {
      const data = {
        author: null,
        description: null,
      };
      const result = updateBookSchema.parse(data);
      expect(result.author).toBeNull();
    });
  });

  describe("updateBookPublicSchema", () => {
    it("should accept clean updates", () => {
      const data = { title: "Clean Title" };
      const result = updateBookPublicSchema.parse(data);
      expect(result.title).toBe("Clean Title");
    });

    it("should reject updates with profanity in title", () => {
      const data = { title: "Fuck This Book" };
      expect(() => updateBookPublicSchema.parse(data)).toThrow();
    });

    it("should reject updates with profanity in description", () => {
      const data = { description: "This book is fucking awesome" };
      expect(() => updateBookPublicSchema.parse(data)).toThrow();
    });
  });

  // =============================================================================
  // QUERY SCHEMA
  // =============================================================================

  describe("bookQuerySchema", () => {
    it("should set default values", () => {
      const result = bookQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe("createdAt");
      expect(result.sortDirection).toBe("desc");
      expect(result.includeDeleted).toBe(false);
    });

    it("should parse pagination params", () => {
      const result = bookQuerySchema.parse({ page: "3", limit: "50" });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
    });

    it("should reject limit over 100", () => {
      expect(() => bookQuerySchema.parse({ limit: "101" })).toThrow();
    });

    it("should parse status filter", () => {
      const result = bookQuerySchema.parse({ status: "READING" });
      expect(result.status).toBe("READING");
    });

    it("should parse tags as comma-separated string", () => {
      const result = bookQuerySchema.parse({
        tags: "fiction,classic,favorite",
      });
      expect(result.tags).toEqual(["fiction", "classic", "favorite"]);
    });

    it("should parse search query", () => {
      const result = bookQuerySchema.parse({ search: "great gatsby" });
      expect(result.search).toBe("great gatsby");
    });

    it("should parse sort options", () => {
      const result = bookQuerySchema.parse({
        sortBy: "title",
        sortDirection: "asc",
      });
      expect(result.sortBy).toBe("title");
      expect(result.sortDirection).toBe("asc");
    });
  });

  // =============================================================================
  // BOOK ID SCHEMA
  // =============================================================================

  describe("bookIdSchema", () => {
    it("should accept valid CUID format", () => {
      // CUID format: starts with 'c', followed by alphanumeric lowercase
      expect(bookIdSchema.parse("clxyz1234567890abcdef")).toBe(
        "clxyz1234567890abcdef"
      );
    });

    it("should reject empty string", () => {
      expect(() => bookIdSchema.parse("")).toThrow();
    });

    it("should reject invalid formats", () => {
      expect(() => bookIdSchema.parse("12345")).toThrow(); // doesn't start with 'c'
      expect(() => bookIdSchema.parse("CABCDEF")).toThrow(); // uppercase
    });
  });

  // =============================================================================
  // EXTERNAL SEARCH SCHEMAS
  // =============================================================================

  describe("externalBookSearchSchema", () => {
    it("should accept valid search query", () => {
      const result = externalBookSearchSchema.parse({ query: "great gatsby" });
      expect(result.query).toBe("great gatsby");
      expect(result.maxResults).toBe(10); // default
      expect(result.startIndex).toBe(0); // default
    });

    it("should reject empty query", () => {
      expect(() => externalBookSearchSchema.parse({ query: "" })).toThrow();
    });

    it("should reject query over 200 characters", () => {
      expect(() =>
        externalBookSearchSchema.parse({ query: "A".repeat(201) })
      ).toThrow();
    });

    it("should parse pagination options", () => {
      const result = externalBookSearchSchema.parse({
        query: "test",
        maxResults: "20",
        startIndex: "10",
      });
      expect(result.maxResults).toBe(20);
      expect(result.startIndex).toBe(10);
    });
  });

  describe("addFromLibrarySchema", () => {
    it("should accept valid Google Books addition", () => {
      const data = {
        source: "GOOGLE_BOOKS" as const,
        sourceId: "abc123",
      };
      const result = addFromLibrarySchema.parse(data);
      expect(result.source).toBe("GOOGLE_BOOKS");
      expect(result.sourceId).toBe("abc123");
    });

    it("should accept valid Open Library addition", () => {
      const data = {
        source: "OPEN_LIBRARY" as const,
        sourceId: "OL123M",
      };
      const result = addFromLibrarySchema.parse(data);
      expect(result.source).toBe("OPEN_LIBRARY");
    });

    it("should accept optional overrides", () => {
      const data = {
        source: "GOOGLE_BOOKS" as const,
        sourceId: "abc123",
        title: "Custom Title",
        author: "Custom Author",
        tags: ["custom", "tags"],
      };
      const result = addFromLibrarySchema.parse(data);
      expect(result.title).toBe("Custom Title");
    });

    it("should reject invalid source", () => {
      const data = {
        source: "UPLOAD",
        sourceId: "abc123",
      };
      expect(() => addFromLibrarySchema.parse(data)).toThrow();
    });
  });

  // =============================================================================
  // READING PROGRESS SCHEMA
  // =============================================================================

  describe("updateReadingProgressSchema", () => {
    it("should accept valid progress update", () => {
      const data = {
        bookId: "clxyz1234567890abcdef",
        currentPosition: 1000,
        percentage: 25.5,
      };
      const result = updateReadingProgressSchema.parse(data);
      expect(result.currentPosition).toBe(1000);
      expect(result.percentage).toBe(25.5);
    });

    it("should reject negative position", () => {
      const data = {
        bookId: "clxyz1234567890abcdef",
        currentPosition: -1,
      };
      expect(() => updateReadingProgressSchema.parse(data)).toThrow();
    });

    it("should reject percentage over 100", () => {
      const data = {
        bookId: "clxyz1234567890abcdef",
        currentPosition: 1000,
        percentage: 101,
      };
      expect(() => updateReadingProgressSchema.parse(data)).toThrow();
    });

    it("should accept session duration in seconds", () => {
      const data = {
        bookId: "clxyz1234567890abcdef",
        currentPosition: 5000,
        sessionDuration: 600,
      };
      const result = updateReadingProgressSchema.parse(data);
      expect(result.sessionDuration).toBe(600);
    });
  });

  // =============================================================================
  // SCHEMA EXPORTS
  // =============================================================================

  describe("bookSchemas export object", () => {
    it("should export all enum schemas", () => {
      expect(bookSchemas.bookSource).toBeDefined();
      expect(bookSchemas.fileType).toBeDefined();
      expect(bookSchemas.readingStatus).toBeDefined();
    });

    it("should export all field schemas", () => {
      expect(bookSchemas.title).toBeDefined();
      expect(bookSchemas.titlePublic).toBeDefined();
      expect(bookSchemas.author).toBeDefined();
      expect(bookSchemas.description).toBeDefined();
      expect(bookSchemas.tags).toBeDefined();
      expect(bookSchemas.genre).toBeDefined();
      expect(bookSchemas.language).toBeDefined();
      expect(bookSchemas.url).toBeDefined();
      expect(bookSchemas.bookId).toBeDefined();
    });

    it("should export all create schemas", () => {
      expect(bookSchemas.createUpload).toBeDefined();
      expect(bookSchemas.createUrl).toBeDefined();
      expect(bookSchemas.createPaste).toBeDefined();
      expect(bookSchemas.createGoogleBooks).toBeDefined();
      expect(bookSchemas.createOpenLibrary).toBeDefined();
      expect(bookSchemas.create).toBeDefined();
    });

    it("should export all update schemas", () => {
      expect(bookSchemas.update).toBeDefined();
      expect(bookSchemas.updatePublic).toBeDefined();
    });

    it("should export all query schemas", () => {
      expect(bookSchemas.query).toBeDefined();
      expect(bookSchemas.sortField).toBeDefined();
      expect(bookSchemas.sortDirection).toBeDefined();
      expect(bookSchemas.idParams).toBeDefined();
      expect(bookSchemas.externalSearch).toBeDefined();
      expect(bookSchemas.addFromLibrary).toBeDefined();
    });

    it("should export reading progress schema", () => {
      expect(bookSchemas.updateProgress).toBeDefined();
    });
  });
});
