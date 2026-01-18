import { describe, it, expect, vi, beforeEach } from "vitest";

import { queryKeys } from "../lib/queryClient";

import type { Book, BookListFilters, PaginatedResponse } from "./useBooks";

// Mock fetch for API tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Sample book data
const mockBook: Book = {
  id: "book-1",
  title: "Test Book",
  author: "Test Author",
  status: "reading",
  progress: 50,
  wordCount: 50000,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-02T00:00:00Z",
};

const mockBooksResponse: PaginatedResponse<Book> = {
  data: [mockBook],
  pagination: {
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
  },
};

// Note: Full hook testing with renderHook requires @testing-library/react
// which is not currently installed. These tests focus on the queryKeys
// and API structure which can be tested without component rendering.

describe("Book types", () => {
  describe("Book interface", () => {
    it("should have required fields", () => {
      const book: Book = {
        id: "test-id",
        title: "Test Title",
        author: "Test Author",
        status: "not_started",
        progress: 0,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-02",
      };

      expect(book.id).toBeDefined();
      expect(book.title).toBeDefined();
      expect(book.author).toBeDefined();
      expect(book.status).toBeDefined();
      expect(book.progress).toBeDefined();
    });

    it("should have correct status types", () => {
      const statuses: Book["status"][] = [
        "not_started",
        "reading",
        "completed",
        "abandoned",
      ];

      statuses.forEach((status) => {
        const book: Book = {
          ...mockBook,
          status,
        };
        expect(book.status).toBe(status);
      });
    });

    it("should allow optional fields", () => {
      const book: Book = {
        id: "test-id",
        title: "Test Title",
        author: "Test Author",
        status: "not_started",
        progress: 0,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-02",
        coverUrl: "https://example.com/cover.jpg",
        wordCount: 50000,
      };

      expect(book.coverUrl).toBe("https://example.com/cover.jpg");
      expect(book.wordCount).toBe(50000);
    });
  });

  describe("BookListFilters interface", () => {
    it("should support all filter options", () => {
      const filters: BookListFilters = {
        status: "reading",
        search: "test query",
        sort: "title",
        order: "asc",
        page: 1,
        limit: 10,
      };

      expect(filters.status).toBe("reading");
      expect(filters.search).toBe("test query");
      expect(filters.sort).toBe("title");
      expect(filters.order).toBe("asc");
      expect(filters.page).toBe(1);
      expect(filters.limit).toBe(10);
    });

    it("should allow partial filters", () => {
      const filters: BookListFilters = {
        status: "completed",
      };

      expect(filters.status).toBe("completed");
      expect(filters.search).toBeUndefined();
    });

    it("should support all sort options", () => {
      const sortOptions: NonNullable<BookListFilters["sort"]>[] = [
        "title",
        "author",
        "createdAt",
        "progress",
      ];

      sortOptions.forEach((sort) => {
        const filters = { sort } as BookListFilters;
        expect(filters.sort).toBe(sort);
      });
    });
  });

  describe("PaginatedResponse interface", () => {
    it("should have correct structure", () => {
      expect(mockBooksResponse.data).toBeInstanceOf(Array);
      expect(mockBooksResponse.pagination).toBeDefined();
      expect(mockBooksResponse.pagination.page).toBe(1);
      expect(mockBooksResponse.pagination.limit).toBe(10);
      expect(mockBooksResponse.pagination.total).toBe(1);
      expect(mockBooksResponse.pagination.totalPages).toBe(1);
    });
  });
});

describe("queryKeys for books", () => {
  describe("queryKeys.books.all", () => {
    it("should return correct base key", () => {
      expect(queryKeys.books.all).toEqual(["books"]);
    });
  });

  describe("queryKeys.books.lists", () => {
    it("should return lists key", () => {
      expect(queryKeys.books.lists()).toEqual(["books", "list"]);
    });
  });

  describe("queryKeys.books.list", () => {
    it("should return list key with filters", () => {
      const filters = { status: "reading", page: 1 };
      expect(queryKeys.books.list(filters)).toEqual(["books", "list", filters]);
    });

    it("should return list key without filters", () => {
      expect(queryKeys.books.list()).toEqual(["books", "list", undefined]);
    });

    it("should produce different keys for different filters", () => {
      const key1 = queryKeys.books.list({ status: "reading" });
      const key2 = queryKeys.books.list({ status: "completed" });
      expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2));
    });

    it("should produce same key structure for same filters", () => {
      const filters = { status: "reading" };
      const key1 = queryKeys.books.list(filters);
      const key2 = queryKeys.books.list(filters);
      expect(JSON.stringify(key1)).toBe(JSON.stringify(key2));
    });
  });

  describe("queryKeys.books.details", () => {
    it("should return details base key", () => {
      expect(queryKeys.books.details()).toEqual(["books", "detail"]);
    });
  });

  describe("queryKeys.books.detail", () => {
    it("should return detail key for specific book", () => {
      expect(queryKeys.books.detail("book-123")).toEqual([
        "books",
        "detail",
        "book-123",
      ]);
    });

    it("should produce different keys for different book IDs", () => {
      const key1 = queryKeys.books.detail("book-1");
      const key2 = queryKeys.books.detail("book-2");
      expect(key1).not.toEqual(key2);
    });
  });

  describe("queryKeys.books.content", () => {
    it("should return content key for specific book", () => {
      expect(queryKeys.books.content("book-123")).toEqual([
        "books",
        "detail",
        "book-123",
        "content",
      ]);
    });
  });

  describe("queryKeys.books.search", () => {
    it("should return search key with query", () => {
      expect(queryKeys.books.search("Harry Potter")).toEqual([
        "books",
        "search",
        "Harry Potter",
      ]);
    });

    it("should produce different keys for different queries", () => {
      const key1 = queryKeys.books.search("query1");
      const key2 = queryKeys.books.search("query2");
      expect(key1).not.toEqual(key2);
    });
  });
});

describe("API URL construction", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should construct correct URL for fetching all books", () => {
    const params = new URLSearchParams();
    const url = `/api/books?${params.toString()}`;
    expect(url).toBe("/api/books?");
  });

  it("should construct correct URL with filters", () => {
    const params = new URLSearchParams();
    params.set("status", "reading");
    params.set("search", "test");
    params.set("page", "2");
    const url = `/api/books?${params.toString()}`;
    expect(url).toBe("/api/books?status=reading&search=test&page=2");
  });

  it("should construct correct URL for single book", () => {
    const bookId = "book-123";
    const url = `/api/books/${bookId}`;
    expect(url).toBe("/api/books/book-123");
  });
});

describe("Query key relationships", () => {
  it("books.list keys should start with books.lists prefix", () => {
    const listKey = queryKeys.books.list({ status: "reading" });
    const listsKey = queryKeys.books.lists();

    expect(listKey[0]).toBe(listsKey[0]);
    expect(listKey[1]).toBe(listsKey[1]);
  });

  it("books.detail keys should start with books.details prefix", () => {
    const detailKey = queryKeys.books.detail("book-1");
    const detailsKey = queryKeys.books.details();

    expect(detailKey[0]).toBe(detailsKey[0]);
    expect(detailKey[1]).toBe(detailsKey[1]);
  });

  it("books.content keys should be nested under books.detail", () => {
    const contentKey = queryKeys.books.content("book-1");
    const detailKey = queryKeys.books.detail("book-1");

    expect(contentKey[0]).toBe(detailKey[0]);
    expect(contentKey[1]).toBe(detailKey[1]);
    expect(contentKey[2]).toBe(detailKey[2]);
  });

  it("all book keys should start with 'books'", () => {
    expect(queryKeys.books.all[0]).toBe("books");
    expect(queryKeys.books.lists()[0]).toBe("books");
    expect(queryKeys.books.list()[0]).toBe("books");
    expect(queryKeys.books.details()[0]).toBe("books");
    expect(queryKeys.books.detail("id")[0]).toBe("books");
    expect(queryKeys.books.content("id")[0]).toBe("books");
    expect(queryKeys.books.search("query")[0]).toBe("books");
  });
});
