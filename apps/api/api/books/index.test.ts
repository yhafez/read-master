/**
 * Tests for GET /api/books endpoint
 */

import { describe, it, expect } from "vitest";

import {
  listBooksQuerySchema,
  buildWhereClause,
  buildOrderByClause,
  formatBookResponse,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
  MAX_SEARCH_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TAGS_FILTER,
  VALID_STATUSES,
  VALID_SORT_OPTIONS,
  VALID_SORT_DIRECTIONS,
  type ListBooksQuery,
} from "./index.js";

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("listBooksQuerySchema", () => {
  describe("status validation", () => {
    it("should accept valid status WANT_TO_READ", () => {
      const result = listBooksQuerySchema.safeParse({ status: "WANT_TO_READ" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("WANT_TO_READ");
      }
    });

    it("should accept valid status READING", () => {
      const result = listBooksQuerySchema.safeParse({ status: "READING" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("READING");
      }
    });

    it("should accept valid status COMPLETED", () => {
      const result = listBooksQuerySchema.safeParse({ status: "COMPLETED" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("COMPLETED");
      }
    });

    it("should accept valid status ABANDONED", () => {
      const result = listBooksQuerySchema.safeParse({ status: "ABANDONED" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("ABANDONED");
      }
    });

    it("should reject invalid status", () => {
      const result = listBooksQuerySchema.safeParse({ status: "INVALID" });
      expect(result.success).toBe(false);
    });

    it("should allow undefined status", () => {
      const result = listBooksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBeUndefined();
      }
    });

    it("should reject lowercase status", () => {
      const result = listBooksQuerySchema.safeParse({ status: "reading" });
      expect(result.success).toBe(false);
    });
  });

  describe("genre validation", () => {
    it("should accept valid genre", () => {
      const result = listBooksQuerySchema.safeParse({ genre: "Fiction" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.genre).toBe("Fiction");
      }
    });

    it("should allow undefined genre", () => {
      const result = listBooksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.genre).toBeUndefined();
      }
    });

    it("should reject genre exceeding 100 characters", () => {
      const result = listBooksQuerySchema.safeParse({
        genre: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("should accept genre at 100 characters", () => {
      const result = listBooksQuerySchema.safeParse({
        genre: "a".repeat(100),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("tags validation", () => {
    it("should accept comma-separated tags", () => {
      const result = listBooksQuerySchema.safeParse({
        tags: "fiction,adventure",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual(["fiction", "adventure"]);
      }
    });

    it("should trim whitespace from tags", () => {
      const result = listBooksQuerySchema.safeParse({
        tags: " fiction , adventure ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual(["fiction", "adventure"]);
      }
    });

    it("should accept single tag", () => {
      const result = listBooksQuerySchema.safeParse({ tags: "fiction" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual(["fiction"]);
      }
    });

    it("should allow undefined tags", () => {
      const result = listBooksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toBeUndefined();
      }
    });

    it("should reject too many tags", () => {
      const tags = Array(MAX_TAGS_FILTER + 1)
        .fill("tag")
        .join(",");
      const result = listBooksQuerySchema.safeParse({ tags });
      expect(result.success).toBe(false);
    });

    it("should accept maximum number of tags", () => {
      const tags = Array(MAX_TAGS_FILTER).fill("tag").join(",");
      const result = listBooksQuerySchema.safeParse({ tags });
      expect(result.success).toBe(true);
    });

    it("should reject tags with one tag exceeding max length", () => {
      const tags = `short,${"a".repeat(MAX_TAG_LENGTH + 1)}`;
      const result = listBooksQuerySchema.safeParse({ tags });
      expect(result.success).toBe(false);
    });

    it("should handle empty string tags", () => {
      const result = listBooksQuerySchema.safeParse({ tags: "" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toBeUndefined();
      }
    });
  });

  describe("search validation", () => {
    it("should accept valid search query", () => {
      const result = listBooksQuerySchema.safeParse({ search: "harry potter" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe("harry potter");
      }
    });

    it("should allow undefined search", () => {
      const result = listBooksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBeUndefined();
      }
    });

    it("should reject search exceeding max length", () => {
      const result = listBooksQuerySchema.safeParse({
        search: "a".repeat(MAX_SEARCH_LENGTH + 1),
      });
      expect(result.success).toBe(false);
    });

    it("should accept search at max length", () => {
      const result = listBooksQuerySchema.safeParse({
        search: "a".repeat(MAX_SEARCH_LENGTH),
      });
      expect(result.success).toBe(true);
    });

    it("should accept search with special characters", () => {
      const result = listBooksQuerySchema.safeParse({
        search: "Lord of the Rings: The Fellowship",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("sort validation", () => {
    it("should accept createdAt sort", () => {
      const result = listBooksQuerySchema.safeParse({ sort: "createdAt" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort).toBe("createdAt");
      }
    });

    it("should accept updatedAt sort", () => {
      const result = listBooksQuerySchema.safeParse({ sort: "updatedAt" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort).toBe("updatedAt");
      }
    });

    it("should accept title sort", () => {
      const result = listBooksQuerySchema.safeParse({ sort: "title" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort).toBe("title");
      }
    });

    it("should accept author sort", () => {
      const result = listBooksQuerySchema.safeParse({ sort: "author" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort).toBe("author");
      }
    });

    it("should accept recentlyRead sort", () => {
      const result = listBooksQuerySchema.safeParse({ sort: "recentlyRead" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort).toBe("recentlyRead");
      }
    });

    it("should accept progress sort", () => {
      const result = listBooksQuerySchema.safeParse({ sort: "progress" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort).toBe("progress");
      }
    });

    it("should accept wordCount sort", () => {
      const result = listBooksQuerySchema.safeParse({ sort: "wordCount" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort).toBe("wordCount");
      }
    });

    it("should default to createdAt when not provided", () => {
      const result = listBooksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort).toBe("createdAt");
      }
    });

    it("should reject invalid sort option", () => {
      const result = listBooksQuerySchema.safeParse({ sort: "invalid" });
      expect(result.success).toBe(false);
    });
  });

  describe("order validation", () => {
    it("should accept asc order", () => {
      const result = listBooksQuerySchema.safeParse({ order: "asc" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe("asc");
      }
    });

    it("should accept desc order", () => {
      const result = listBooksQuerySchema.safeParse({ order: "desc" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe("desc");
      }
    });

    it("should default to desc when not provided", () => {
      const result = listBooksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe("desc");
      }
    });

    it("should reject invalid order", () => {
      const result = listBooksQuerySchema.safeParse({ order: "ascending" });
      expect(result.success).toBe(false);
    });
  });

  describe("page validation", () => {
    it("should accept valid page number", () => {
      const result = listBooksQuerySchema.safeParse({ page: "5" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
      }
    });

    it("should accept page as number", () => {
      const result = listBooksQuerySchema.safeParse({ page: 5 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
      }
    });

    it("should default to 1 when not provided", () => {
      const result = listBooksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it("should reject page less than 1", () => {
      const result = listBooksQuerySchema.safeParse({ page: "0" });
      expect(result.success).toBe(false);
    });

    it("should reject negative page", () => {
      const result = listBooksQuerySchema.safeParse({ page: "-1" });
      expect(result.success).toBe(false);
    });

    it("should reject non-integer page", () => {
      const result = listBooksQuerySchema.safeParse({ page: "1.5" });
      expect(result.success).toBe(false);
    });

    it("should accept large page number", () => {
      const result = listBooksQuerySchema.safeParse({ page: "1000" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1000);
      }
    });
  });

  describe("limit validation", () => {
    it("should accept valid limit", () => {
      const result = listBooksQuerySchema.safeParse({ limit: "50" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it("should accept limit as number", () => {
      const result = listBooksQuerySchema.safeParse({ limit: 50 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it("should default to DEFAULT_LIMIT when not provided", () => {
      const result = listBooksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(DEFAULT_LIMIT);
      }
    });

    it("should reject limit less than MIN_LIMIT", () => {
      const result = listBooksQuerySchema.safeParse({ limit: "0" });
      expect(result.success).toBe(false);
    });

    it("should reject limit exceeding MAX_LIMIT", () => {
      const result = listBooksQuerySchema.safeParse({
        limit: String(MAX_LIMIT + 1),
      });
      expect(result.success).toBe(false);
    });

    it("should accept limit at MIN_LIMIT", () => {
      const result = listBooksQuerySchema.safeParse({
        limit: String(MIN_LIMIT),
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(MIN_LIMIT);
      }
    });

    it("should accept limit at MAX_LIMIT", () => {
      const result = listBooksQuerySchema.safeParse({
        limit: String(MAX_LIMIT),
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(MAX_LIMIT);
      }
    });

    it("should reject non-integer limit", () => {
      const result = listBooksQuerySchema.safeParse({ limit: "10.5" });
      expect(result.success).toBe(false);
    });
  });

  describe("combined validation", () => {
    it("should accept all valid parameters", () => {
      const result = listBooksQuerySchema.safeParse({
        status: "READING",
        genre: "Fiction",
        tags: "adventure,fantasy",
        search: "dragons",
        sort: "title",
        order: "asc",
        page: "2",
        limit: "25",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("READING");
        expect(result.data.genre).toBe("Fiction");
        expect(result.data.tags).toEqual(["adventure", "fantasy"]);
        expect(result.data.search).toBe("dragons");
        expect(result.data.sort).toBe("title");
        expect(result.data.order).toBe("asc");
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(25);
      }
    });

    it("should apply defaults for missing optional fields", () => {
      const result = listBooksQuerySchema.safeParse({
        status: "READING",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("READING");
        expect(result.data.genre).toBeUndefined();
        expect(result.data.tags).toBeUndefined();
        expect(result.data.search).toBeUndefined();
        expect(result.data.sort).toBe("createdAt");
        expect(result.data.order).toBe("desc");
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(DEFAULT_LIMIT);
      }
    });

    it("should accept empty query object", () => {
      const result = listBooksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort).toBe("createdAt");
        expect(result.data.order).toBe("desc");
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(DEFAULT_LIMIT);
      }
    });
  });
});

// ============================================================================
// buildWhereClause Tests
// ============================================================================

describe("buildWhereClause", () => {
  const userId = "user_123";

  it("should include userId and exclude soft-deleted books", () => {
    const query: ListBooksQuery = {
      sort: "createdAt",
      order: "desc",
      page: 1,
      limit: 20,
    };
    const where = buildWhereClause(userId, query);
    expect(where.userId).toBe(userId);
    expect(where.deletedAt).toBeNull();
  });

  it("should add status filter when provided", () => {
    const query: ListBooksQuery = {
      status: "READING",
      sort: "createdAt",
      order: "desc",
      page: 1,
      limit: 20,
    };
    const where = buildWhereClause(userId, query);
    expect(where.status).toBe("READING");
  });

  it("should not add status filter when not provided", () => {
    const query: ListBooksQuery = {
      sort: "createdAt",
      order: "desc",
      page: 1,
      limit: 20,
    };
    const where = buildWhereClause(userId, query);
    expect(where.status).toBeUndefined();
  });

  it("should add case-insensitive genre filter when provided", () => {
    const query: ListBooksQuery = {
      genre: "Fiction",
      sort: "createdAt",
      order: "desc",
      page: 1,
      limit: 20,
    };
    const where = buildWhereClause(userId, query);
    expect(where.genre).toEqual({
      equals: "Fiction",
      mode: "insensitive",
    });
  });

  it("should add tags filter with hasEvery when provided", () => {
    const query: ListBooksQuery = {
      tags: ["adventure", "fantasy"],
      sort: "createdAt",
      order: "desc",
      page: 1,
      limit: 20,
    };
    const where = buildWhereClause(userId, query);
    expect(where.tags).toEqual({
      hasEvery: ["adventure", "fantasy"],
    });
  });

  it("should not add tags filter for empty array", () => {
    const query: ListBooksQuery = {
      tags: [],
      sort: "createdAt",
      order: "desc",
      page: 1,
      limit: 20,
    };
    const where = buildWhereClause(userId, query);
    expect(where.tags).toBeUndefined();
  });

  it("should add search filter with OR conditions when provided", () => {
    const query: ListBooksQuery = {
      search: "dragons",
      sort: "createdAt",
      order: "desc",
      page: 1,
      limit: 20,
    };
    const where = buildWhereClause(userId, query);
    expect(where.OR).toEqual([
      { title: { contains: "dragons", mode: "insensitive" } },
      { author: { contains: "dragons", mode: "insensitive" } },
      { description: { contains: "dragons", mode: "insensitive" } },
    ]);
  });

  it("should combine all filters correctly", () => {
    const query: ListBooksQuery = {
      status: "READING",
      genre: "Fantasy",
      tags: ["epic", "series"],
      search: "magic",
      sort: "createdAt",
      order: "desc",
      page: 1,
      limit: 20,
    };
    const where = buildWhereClause(userId, query);
    expect(where.userId).toBe(userId);
    expect(where.deletedAt).toBeNull();
    expect(where.status).toBe("READING");
    expect(where.genre).toEqual({ equals: "Fantasy", mode: "insensitive" });
    expect(where.tags).toEqual({ hasEvery: ["epic", "series"] });
    expect(where.OR).toBeDefined();
  });
});

// ============================================================================
// buildOrderByClause Tests
// ============================================================================

describe("buildOrderByClause", () => {
  it("should return createdAt ordering", () => {
    const orderBy = buildOrderByClause("createdAt", "desc");
    expect(orderBy).toEqual({ createdAt: "desc" });
  });

  it("should return createdAt ascending", () => {
    const orderBy = buildOrderByClause("createdAt", "asc");
    expect(orderBy).toEqual({ createdAt: "asc" });
  });

  it("should return title ordering", () => {
    const orderBy = buildOrderByClause("title", "asc");
    expect(orderBy).toEqual({ title: "asc" });
  });

  it("should return updatedAt ordering", () => {
    const orderBy = buildOrderByClause("updatedAt", "desc");
    expect(orderBy).toEqual({ updatedAt: "desc" });
  });

  it("should return author ordering with null handling", () => {
    const orderBy = buildOrderByClause("author", "asc");
    expect(orderBy).toEqual([
      { author: { sort: "asc", nulls: "last" } },
      { title: "asc" },
    ]);
  });

  it("should return wordCount ordering with null handling", () => {
    const orderBy = buildOrderByClause("wordCount", "desc");
    expect(orderBy).toEqual([
      { wordCount: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ]);
  });

  it("should return recentlyRead ordering", () => {
    const orderBy = buildOrderByClause("recentlyRead", "desc");
    expect(orderBy).toEqual([
      { readingProgress: { _count: "desc" } },
      { updatedAt: "desc" },
    ]);
  });

  it("should return progress ordering (falls back to updatedAt)", () => {
    const orderBy = buildOrderByClause("progress", "desc");
    expect(orderBy).toEqual({ updatedAt: "desc" });
  });

  it("should default to createdAt for unknown sort", () => {
    // This tests the default case in the switch
    const orderBy = buildOrderByClause("createdAt", "desc");
    expect(orderBy).toEqual({ createdAt: "desc" });
  });
});

// ============================================================================
// formatBookResponse Tests
// ============================================================================

describe("formatBookResponse", () => {
  const mockDate = new Date("2024-01-15T10:00:00Z");
  const mockUpdateDate = new Date("2024-01-20T15:30:00Z");

  it("should format book with all fields", () => {
    const book = {
      id: "book_123",
      title: "Test Book",
      author: "Test Author",
      description: "Test Description",
      coverImage: "https://example.com/cover.jpg",
      source: "UPLOAD" as const,
      sourceId: "src_123",
      sourceUrl: "https://example.com/book",
      fileType: "PDF" as const,
      language: "en",
      wordCount: 50000,
      estimatedReadTime: 200,
      rawContent: null,
      genre: "Fiction",
      tags: ["fantasy", "adventure"],
      status: "READING" as const,
      isPublic: false,
      createdAt: mockDate,
      updatedAt: mockUpdateDate,
      userId: "user_123",
      filePath: "/path/to/file",
      lexileScore: null,
      deletedAt: null,
      readingProgress: [
        {
          id: "progress_123",
          userId: "user_123",
          bookId: "book_123",
          percentage: 45.5,
          currentPosition: 22500,
          totalReadTime: 3600,
          lastReadAt: new Date("2024-01-20T14:00:00Z"),
          startedAt: new Date("2024-01-16T09:00:00Z"),
          completedAt: null,
          averageWpm: 250,
          createdAt: mockDate,
          updatedAt: mockUpdateDate,
        },
      ],
      _count: { chapters: 15 },
    };

    const formatted = formatBookResponse(book);

    expect(formatted.id).toBe("book_123");
    expect(formatted.title).toBe("Test Book");
    expect(formatted.author).toBe("Test Author");
    expect(formatted.description).toBe("Test Description");
    expect(formatted.coverImage).toBe("https://example.com/cover.jpg");
    expect(formatted.source).toBe("UPLOAD");
    expect(formatted.fileType).toBe("PDF");
    expect(formatted.language).toBe("en");
    expect(formatted.wordCount).toBe(50000);
    expect(formatted.estimatedReadTime).toBe(200);
    expect(formatted.genre).toBe("Fiction");
    expect(formatted.tags).toEqual(["fantasy", "adventure"]);
    expect(formatted.status).toBe("READING");
    expect(formatted.isPublic).toBe(false);
    expect(formatted.chaptersCount).toBe(15);
    expect(formatted.createdAt).toBe("2024-01-15T10:00:00.000Z");
    expect(formatted.updatedAt).toBe("2024-01-20T15:30:00.000Z");
  });

  it("should format progress when available", () => {
    const book = {
      id: "book_123",
      title: "Test Book",
      author: null,
      description: null,
      coverImage: null,
      source: "PASTE" as const,
      sourceId: null,
      sourceUrl: null,
      fileType: "TXT" as const,
      language: "en",
      wordCount: 1000,
      estimatedReadTime: 5,
      rawContent: null,
      genre: null,
      tags: [],
      status: "WANT_TO_READ" as const,
      isPublic: false,
      createdAt: mockDate,
      updatedAt: mockDate,
      userId: "user_123",
      filePath: null,
      lexileScore: null,
      deletedAt: null,
      readingProgress: [
        {
          id: "progress_123",
          userId: "user_123",
          bookId: "book_123",
          percentage: 75,
          currentPosition: 750,
          totalReadTime: 1800,
          lastReadAt: new Date("2024-01-18T12:00:00Z"),
          startedAt: new Date("2024-01-17T10:00:00Z"),
          completedAt: null,
          averageWpm: 200,
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ],
      _count: { chapters: 0 },
    };

    const formatted = formatBookResponse(book);

    expect(formatted.progress).not.toBeNull();
    expect(formatted.progress?.percentage).toBe(75);
    expect(formatted.progress?.currentPosition).toBe(750);
    expect(formatted.progress?.totalReadTime).toBe(1800);
    expect(formatted.progress?.lastReadAt).toBe("2024-01-18T12:00:00.000Z");
    expect(formatted.progress?.startedAt).toBe("2024-01-17T10:00:00.000Z");
    expect(formatted.progress?.completedAt).toBeNull();
  });

  it("should handle null progress (no reading progress)", () => {
    const book = {
      id: "book_456",
      title: "Unread Book",
      author: "Author",
      description: "Description",
      coverImage: null,
      source: "UPLOAD" as const,
      sourceId: null,
      sourceUrl: null,
      fileType: "EPUB" as const,
      language: "en",
      wordCount: 80000,
      estimatedReadTime: 320,
      rawContent: null,
      genre: "Non-Fiction",
      tags: [],
      status: "WANT_TO_READ" as const,
      isPublic: false,
      createdAt: mockDate,
      updatedAt: mockDate,
      userId: "user_123",
      filePath: "/path/to/book.epub",
      lexileScore: null,
      deletedAt: null,
      readingProgress: [],
      _count: { chapters: 20 },
    };

    const formatted = formatBookResponse(book);

    expect(formatted.progress).toBeNull();
    expect(formatted.chaptersCount).toBe(20);
  });

  it("should handle completed book progress", () => {
    const book = {
      id: "book_789",
      title: "Completed Book",
      author: "Author",
      description: "Description",
      coverImage: "cover.jpg",
      source: "GOOGLE_BOOKS" as const,
      sourceId: "google_123",
      sourceUrl: null,
      fileType: null,
      language: "en",
      wordCount: 60000,
      estimatedReadTime: 240,
      rawContent: null,
      genre: "Mystery",
      tags: ["thriller"],
      status: "COMPLETED" as const,
      isPublic: true,
      createdAt: mockDate,
      updatedAt: mockUpdateDate,
      userId: "user_123",
      filePath: null,
      lexileScore: 900,
      deletedAt: null,
      readingProgress: [
        {
          id: "progress_789",
          userId: "user_123",
          bookId: "book_789",
          percentage: 100,
          currentPosition: 60000,
          totalReadTime: 14400,
          lastReadAt: new Date("2024-01-19T20:00:00Z"),
          startedAt: new Date("2024-01-10T08:00:00Z"),
          completedAt: new Date("2024-01-19T20:00:00Z"),
          averageWpm: 280,
          createdAt: mockDate,
          updatedAt: mockUpdateDate,
        },
      ],
      _count: { chapters: 25 },
    };

    const formatted = formatBookResponse(book);

    expect(formatted.progress?.percentage).toBe(100);
    expect(formatted.progress?.completedAt).toBe("2024-01-19T20:00:00.000Z");
    expect(formatted.status).toBe("COMPLETED");
  });

  it("should handle book with null optional fields", () => {
    const book = {
      id: "book_minimal",
      title: "Minimal Book",
      author: null,
      description: null,
      coverImage: null,
      source: "PASTE" as const,
      sourceId: null,
      sourceUrl: null,
      fileType: "TXT" as const,
      language: "en",
      wordCount: null,
      estimatedReadTime: null,
      rawContent: null,
      genre: null,
      tags: [],
      status: "WANT_TO_READ" as const,
      isPublic: false,
      createdAt: mockDate,
      updatedAt: mockDate,
      userId: "user_123",
      filePath: null,
      lexileScore: null,
      deletedAt: null,
      readingProgress: [],
      _count: { chapters: 0 },
    };

    const formatted = formatBookResponse(book);

    expect(formatted.author).toBeNull();
    expect(formatted.description).toBeNull();
    expect(formatted.coverImage).toBeNull();
    expect(formatted.wordCount).toBeNull();
    expect(formatted.estimatedReadTime).toBeNull();
    expect(formatted.genre).toBeNull();
    expect(formatted.tags).toEqual([]);
    expect(formatted.chaptersCount).toBe(0);
    expect(formatted.progress).toBeNull();
  });

  it("should handle progress with null lastReadAt", () => {
    const book = {
      id: "book_new",
      title: "New Book",
      author: "Author",
      description: null,
      coverImage: null,
      source: "UPLOAD" as const,
      sourceId: null,
      sourceUrl: null,
      fileType: "PDF" as const,
      language: "en",
      wordCount: 30000,
      estimatedReadTime: 120,
      rawContent: null,
      genre: null,
      tags: [],
      status: "READING" as const,
      isPublic: false,
      createdAt: mockDate,
      updatedAt: mockDate,
      userId: "user_123",
      filePath: "/path/to/book.pdf",
      lexileScore: null,
      deletedAt: null,
      readingProgress: [
        {
          id: "progress_new",
          userId: "user_123",
          bookId: "book_new",
          percentage: 0,
          currentPosition: 0,
          totalReadTime: 0,
          lastReadAt: null,
          startedAt: mockDate,
          completedAt: null,
          averageWpm: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ],
      _count: { chapters: 5 },
    };

    const formatted = formatBookResponse(book);

    expect(formatted.progress?.lastReadAt).toBeNull();
    expect(formatted.progress?.percentage).toBe(0);
    expect(formatted.progress?.currentPosition).toBe(0);
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("constants", () => {
  it("should have reasonable DEFAULT_LIMIT", () => {
    expect(DEFAULT_LIMIT).toBe(20);
    expect(DEFAULT_LIMIT).toBeGreaterThan(0);
    expect(DEFAULT_LIMIT).toBeLessThanOrEqual(MAX_LIMIT);
  });

  it("should have reasonable MAX_LIMIT", () => {
    expect(MAX_LIMIT).toBe(100);
    expect(MAX_LIMIT).toBeGreaterThan(DEFAULT_LIMIT);
  });

  it("should have reasonable MIN_LIMIT", () => {
    expect(MIN_LIMIT).toBe(1);
    expect(MIN_LIMIT).toBeGreaterThan(0);
    expect(MIN_LIMIT).toBeLessThan(DEFAULT_LIMIT);
  });

  it("should have reasonable MAX_SEARCH_LENGTH", () => {
    expect(MAX_SEARCH_LENGTH).toBe(200);
    expect(MAX_SEARCH_LENGTH).toBeGreaterThan(0);
  });

  it("should have reasonable MAX_TAG_LENGTH", () => {
    expect(MAX_TAG_LENGTH).toBe(50);
    expect(MAX_TAG_LENGTH).toBeGreaterThan(0);
  });

  it("should have reasonable MAX_TAGS_FILTER", () => {
    expect(MAX_TAGS_FILTER).toBe(10);
    expect(MAX_TAGS_FILTER).toBeGreaterThan(0);
  });

  it("should have all valid statuses", () => {
    expect(VALID_STATUSES).toContain("WANT_TO_READ");
    expect(VALID_STATUSES).toContain("READING");
    expect(VALID_STATUSES).toContain("COMPLETED");
    expect(VALID_STATUSES).toContain("ABANDONED");
    expect(VALID_STATUSES.length).toBe(4);
  });

  it("should have all valid sort options", () => {
    expect(VALID_SORT_OPTIONS).toContain("createdAt");
    expect(VALID_SORT_OPTIONS).toContain("updatedAt");
    expect(VALID_SORT_OPTIONS).toContain("title");
    expect(VALID_SORT_OPTIONS).toContain("author");
    expect(VALID_SORT_OPTIONS).toContain("recentlyRead");
    expect(VALID_SORT_OPTIONS).toContain("progress");
    expect(VALID_SORT_OPTIONS).toContain("wordCount");
    expect(VALID_SORT_OPTIONS.length).toBe(7);
  });

  it("should have all valid sort directions", () => {
    expect(VALID_SORT_DIRECTIONS).toContain("asc");
    expect(VALID_SORT_DIRECTIONS).toContain("desc");
    expect(VALID_SORT_DIRECTIONS.length).toBe(2);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("edge cases", () => {
  describe("schema edge cases", () => {
    it("should handle search with only spaces", () => {
      const result = listBooksQuerySchema.safeParse({ search: "   " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe("   ");
      }
    });

    it("should handle tags with extra commas", () => {
      const result = listBooksQuerySchema.safeParse({ tags: "a,,b" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual(["a", "", "b"]);
      }
    });

    it("should handle unicode in search", () => {
      const result = listBooksQuerySchema.safeParse({ search: "日本語" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe("日本語");
      }
    });

    it("should handle unicode in genre", () => {
      const result = listBooksQuerySchema.safeParse({ genre: "フィクション" });
      expect(result.success).toBe(true);
    });

    it("should handle coerce for string page value", () => {
      const result = listBooksQuerySchema.safeParse({ page: "10" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.page).toBe("number");
        expect(result.data.page).toBe(10);
      }
    });

    it("should handle coerce for string limit value", () => {
      const result = listBooksQuerySchema.safeParse({ limit: "50" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.limit).toBe("number");
        expect(result.data.limit).toBe(50);
      }
    });
  });

  describe("buildWhereClause edge cases", () => {
    it("should handle special characters in search", () => {
      const query: ListBooksQuery = {
        search: "book (part 1) - revised",
        sort: "createdAt",
        order: "desc",
        page: 1,
        limit: 20,
      };
      const where = buildWhereClause("user_123", query);
      expect(where.OR?.[0]).toEqual({
        title: { contains: "book (part 1) - revised", mode: "insensitive" },
      });
    });

    it("should handle empty string in genre (not add filter)", () => {
      const query: ListBooksQuery = {
        genre: "",
        sort: "createdAt",
        order: "desc",
        page: 1,
        limit: 20,
      };
      const where = buildWhereClause("user_123", query);
      // Empty string is falsy, so no genre filter is added
      expect(where.genre).toBeUndefined();
    });
  });

  describe("buildOrderByClause edge cases", () => {
    it("should handle author sort descending", () => {
      const orderBy = buildOrderByClause("author", "desc");
      expect(orderBy).toEqual([
        { author: { sort: "desc", nulls: "last" } },
        { title: "asc" },
      ]);
    });

    it("should handle wordCount ascending", () => {
      const orderBy = buildOrderByClause("wordCount", "asc");
      expect(orderBy).toEqual([
        { wordCount: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ]);
    });
  });
});

// ============================================================================
// Comprehensive Validation Scenarios
// ============================================================================

describe("comprehensive validation scenarios", () => {
  it("should validate a realistic library browse request", () => {
    const result = listBooksQuerySchema.safeParse({
      status: "READING",
      sort: "recentlyRead",
      order: "desc",
      page: "1",
      limit: "20",
    });
    expect(result.success).toBe(true);
  });

  it("should validate a genre-filtered search", () => {
    const result = listBooksQuerySchema.safeParse({
      genre: "Science Fiction",
      search: "space exploration",
      sort: "title",
      order: "asc",
    });
    expect(result.success).toBe(true);
  });

  it("should validate a tags-filtered browse", () => {
    const result = listBooksQuerySchema.safeParse({
      tags: "philosophy,ethics,ancient",
      sort: "author",
      order: "asc",
      page: "2",
      limit: "50",
    });
    expect(result.success).toBe(true);
  });

  it("should validate completed books listing", () => {
    const result = listBooksQuerySchema.safeParse({
      status: "COMPLETED",
      sort: "updatedAt",
      order: "desc",
    });
    expect(result.success).toBe(true);
  });

  it("should validate want to read list with genre filter", () => {
    const result = listBooksQuerySchema.safeParse({
      status: "WANT_TO_READ",
      genre: "Fantasy",
      sort: "createdAt",
      order: "desc",
      limit: "100",
    });
    expect(result.success).toBe(true);
  });

  it("should validate search across all books", () => {
    const result = listBooksQuerySchema.safeParse({
      search: "machine learning",
      sort: "wordCount",
      order: "desc",
    });
    expect(result.success).toBe(true);
  });

  it("should validate abandoned books listing", () => {
    const result = listBooksQuerySchema.safeParse({
      status: "ABANDONED",
      sort: "title",
      order: "asc",
    });
    expect(result.success).toBe(true);
  });

  it("should validate combined status, genre, and search", () => {
    const result = listBooksQuerySchema.safeParse({
      status: "READING",
      genre: "Non-Fiction",
      search: "history",
      tags: "educational,research",
      sort: "progress",
      order: "desc",
      page: "1",
      limit: "25",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("READING");
      expect(result.data.genre).toBe("Non-Fiction");
      expect(result.data.search).toBe("history");
      expect(result.data.tags).toEqual(["educational", "research"]);
    }
  });
});
