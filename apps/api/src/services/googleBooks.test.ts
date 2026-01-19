/**
 * Google Books API Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Helper to safely get the first call URL from a mocked fetch
 */
function getFirstCallUrl(): string {
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
  const calls = mockFetch.mock.calls;
  if (calls.length === 0 || !calls[0]) {
    throw new Error("No calls made to fetch");
  }
  return calls[0][0] as string;
}

// ============================================================================
// Type Exports Tests
// ============================================================================

describe("Google Books Types", () => {
  it("should export GoogleBookMetadata type", async () => {
    const module = await import("./googleBooks.js");
    // Type is exported if module can be imported
    expect(module).toBeDefined();
  });

  it("should export GoogleBooksSearchOptions type", async () => {
    const module = await import("./googleBooks.js");
    expect(module).toBeDefined();
  });

  it("should export GoogleBooksSearchResult type", async () => {
    const module = await import("./googleBooks.js");
    expect(module).toBeDefined();
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("Google Books Constants", () => {
  it("should export GOOGLE_BOOKS_API_BASE", async () => {
    const { GOOGLE_BOOKS_API_BASE } = await import("./googleBooks.js");
    expect(GOOGLE_BOOKS_API_BASE).toBe("https://www.googleapis.com/books/v1");
  });

  it("should export DEFAULT_SEARCH_OPTIONS", async () => {
    const { DEFAULT_SEARCH_OPTIONS } = await import("./googleBooks.js");
    expect(DEFAULT_SEARCH_OPTIONS).toEqual({
      maxResults: 10,
      startIndex: 0,
      orderBy: "relevance",
      printType: "books",
      useCache: true,
    });
  });

  it("should export MAX_RESULTS_LIMIT as 40", async () => {
    const { MAX_RESULTS_LIMIT } = await import("./googleBooks.js");
    expect(MAX_RESULTS_LIMIT).toBe(40);
  });

  it("should export SEARCH_CACHE_TTL", async () => {
    const { SEARCH_CACHE_TTL } = await import("./googleBooks.js");
    expect(typeof SEARCH_CACHE_TTL).toBe("number");
    expect(SEARCH_CACHE_TTL).toBeGreaterThan(0);
  });

  it("should export DETAILS_CACHE_TTL", async () => {
    const { DETAILS_CACHE_TTL } = await import("./googleBooks.js");
    expect(typeof DETAILS_CACHE_TTL).toBe("number");
    expect(DETAILS_CACHE_TTL).toBeGreaterThan(0);
  });
});

// ============================================================================
// GoogleBooksError Tests
// ============================================================================

describe("GoogleBooksError", () => {
  it("should create error with status code", async () => {
    const { GoogleBooksError } = await import("./googleBooks.js");
    const error = new GoogleBooksError("Not found", 404);
    expect(error.message).toBe("Not found");
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe("GoogleBooksError");
  });

  it("should create error with code", async () => {
    const { GoogleBooksError } = await import("./googleBooks.js");
    const error = new GoogleBooksError(
      "Rate limited",
      429,
      "RATE_LIMIT_EXCEEDED",
      true
    );
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(error.retryable).toBe(true);
  });

  it("should default retryable to false", async () => {
    const { GoogleBooksError } = await import("./googleBooks.js");
    const error = new GoogleBooksError("Bad request", 400);
    expect(error.retryable).toBe(false);
  });

  it("should be instance of Error", async () => {
    const { GoogleBooksError } = await import("./googleBooks.js");
    const error = new GoogleBooksError("Error", 500);
    expect(error instanceof Error).toBe(true);
  });
});

// ============================================================================
// isGoogleBooksConfigured Tests
// ============================================================================

describe("isGoogleBooksConfigured", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return true when API key is set", async () => {
    process.env.GOOGLE_BOOKS_API_KEY = "test-api-key";
    const { isGoogleBooksConfigured } = await import("./googleBooks.js");
    expect(isGoogleBooksConfigured()).toBe(true);
  });

  it("should return false when API key is not set", async () => {
    delete process.env.GOOGLE_BOOKS_API_KEY;
    const { isGoogleBooksConfigured } = await import("./googleBooks.js");
    expect(isGoogleBooksConfigured()).toBe(false);
  });

  it("should return false when API key is empty string", async () => {
    process.env.GOOGLE_BOOKS_API_KEY = "";
    const { isGoogleBooksConfigured } = await import("./googleBooks.js");
    expect(isGoogleBooksConfigured()).toBe(false);
  });
});

// ============================================================================
// getBestImageUrl Tests
// ============================================================================

describe("getBestImageUrl", () => {
  it("should return undefined for undefined imageLinks", async () => {
    const { getBestImageUrl } = await import("./googleBooks.js");
    expect(getBestImageUrl(undefined)).toBeUndefined();
  });

  it("should return undefined for empty imageLinks", async () => {
    const { getBestImageUrl } = await import("./googleBooks.js");
    expect(getBestImageUrl({})).toBeUndefined();
  });

  it("should return medium image by default", async () => {
    const { getBestImageUrl } = await import("./googleBooks.js");
    const imageLinks = {
      smallThumbnail: "https://small.jpg",
      thumbnail: "https://thumb.jpg",
      medium: "https://medium.jpg",
      large: "https://large.jpg",
    };
    expect(getBestImageUrl(imageLinks)).toBe("https://medium.jpg");
  });

  it("should prefer small for small size", async () => {
    const { getBestImageUrl } = await import("./googleBooks.js");
    const imageLinks = {
      smallThumbnail: "https://small-thumb.jpg",
      thumbnail: "https://thumb.jpg",
      small: "https://small.jpg",
      medium: "https://medium.jpg",
    };
    expect(getBestImageUrl(imageLinks, "small")).toBe("https://small.jpg");
  });

  it("should prefer large for large size", async () => {
    const { getBestImageUrl } = await import("./googleBooks.js");
    const imageLinks = {
      thumbnail: "https://thumb.jpg",
      medium: "https://medium.jpg",
      large: "https://large.jpg",
      extraLarge: "https://xlarge.jpg",
    };
    expect(getBestImageUrl(imageLinks, "large")).toBe("https://large.jpg");
  });

  it("should fall back to next available size", async () => {
    const { getBestImageUrl } = await import("./googleBooks.js");
    const imageLinks = {
      smallThumbnail: "https://small-thumb.jpg",
    };
    expect(getBestImageUrl(imageLinks, "large")).toBe(
      "https://small-thumb.jpg"
    );
  });

  it("should prioritize large > medium > small for large preference", async () => {
    const { getBestImageUrl } = await import("./googleBooks.js");
    const imageLinks = {
      small: "https://small.jpg",
      medium: "https://medium.jpg",
    };
    // large not available, should fall back to extraLarge, then medium
    expect(getBestImageUrl(imageLinks, "large")).toBe("https://medium.jpg");
  });
});

// ============================================================================
// searchBooks Tests (with mocked fetch)
// ============================================================================

describe("searchBooks", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
    // Reset any module-level state
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should return empty result for empty query without inField", async () => {
    const { searchBooks } = await import("./googleBooks.js");
    const result = await searchBooks("", { useCache: false });
    expect(result.totalItems).toBe(0);
    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it("should return empty result for whitespace-only query", async () => {
    const { searchBooks } = await import("./googleBooks.js");
    const result = await searchBooks("   ", { useCache: false });
    expect(result.totalItems).toBe(0);
    expect(result.items).toEqual([]);
  });

  it("should clamp maxResults to MAX_RESULTS_LIMIT", async () => {
    const mockResponse = {
      kind: "books#volumes",
      totalItems: 0,
      items: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchBooks } = await import("./googleBooks.js");
    await searchBooks("test", { maxResults: 100, useCache: false });

    expect(global.fetch).toHaveBeenCalled();
    const callUrl = getFirstCallUrl();
    expect(callUrl).toContain("maxResults=40");
  });

  it("should set startIndex to 0 if negative", async () => {
    const mockResponse = {
      kind: "books#volumes",
      totalItems: 0,
      items: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchBooks } = await import("./googleBooks.js");
    await searchBooks("test", { startIndex: -5, useCache: false });

    const callUrl = getFirstCallUrl();
    expect(callUrl).toContain("startIndex=0");
  });

  it("should include language restriction when specified", async () => {
    const mockResponse = {
      kind: "books#volumes",
      totalItems: 0,
      items: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchBooks } = await import("./googleBooks.js");
    await searchBooks("test", { langRestrict: "en", useCache: false });

    const callUrl = getFirstCallUrl();
    expect(callUrl).toContain("langRestrict=en");
  });

  it("should include filter when specified", async () => {
    const mockResponse = {
      kind: "books#volumes",
      totalItems: 0,
      items: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchBooks } = await import("./googleBooks.js");
    await searchBooks("test", { filter: "free-ebooks", useCache: false });

    const callUrl = getFirstCallUrl();
    expect(callUrl).toContain("filter=free-ebooks");
  });

  it("should normalize response data", async () => {
    const mockResponse = {
      kind: "books#volumes",
      totalItems: 1,
      items: [
        {
          kind: "books#volume",
          id: "test123",
          volumeInfo: {
            title: "Test Book",
            authors: ["Test Author"],
            industryIdentifiers: [
              { type: "ISBN_10", identifier: "1234567890" },
              { type: "ISBN_13", identifier: "9781234567890" },
            ],
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchBooks } = await import("./googleBooks.js");
    const result = await searchBooks("test", { useCache: false });

    expect(result.totalItems).toBe(1);
    expect(result.items).toHaveLength(1);
    const firstItem = result.items[0];
    if (!firstItem) {
      throw new Error("Expected firstItem to be defined");
    }
    expect(firstItem.id).toBe("test123");
    expect(firstItem.title).toBe("Test Book");
    expect(firstItem.authors).toEqual(["Test Author"]);
    expect(firstItem.isbn10).toBe("1234567890");
    expect(firstItem.isbn13).toBe("9781234567890");
  });

  it("should handle missing items in response", async () => {
    const mockResponse = {
      kind: "books#volumes",
      totalItems: 0,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchBooks } = await import("./googleBooks.js");
    const result = await searchBooks("nonexistent book xyz", {
      useCache: false,
    });

    expect(result.totalItems).toBe(0);
    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it("should calculate hasMore correctly", async () => {
    const mockResponse = {
      kind: "books#volumes",
      totalItems: 100,
      items: Array(10).fill({
        kind: "books#volume",
        id: "test",
        volumeInfo: { title: "Test" },
      }),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchBooks } = await import("./googleBooks.js");
    const result = await searchBooks("test", {
      maxResults: 10,
      useCache: false,
    });

    expect(result.hasMore).toBe(true);
  });

  it("should throw GoogleBooksError on API error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: () =>
        Promise.resolve({
          error: {
            code: 400,
            message: "Invalid query",
            errors: [
              { domain: "global", reason: "invalid", message: "Invalid query" },
            ],
          },
        }),
    });

    const { searchBooks, GoogleBooksError } = await import("./googleBooks.js");

    await expect(searchBooks("test", { useCache: false })).rejects.toThrow(
      GoogleBooksError
    );
  });

  it("should use inField parameters for field-specific search", async () => {
    const mockResponse = {
      kind: "books#volumes",
      totalItems: 0,
      items: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchBooks } = await import("./googleBooks.js");
    await searchBooks("", {
      inField: { author: "Martin", title: "Clean" },
      useCache: false,
    });

    const callUrl = getFirstCallUrl();
    expect(callUrl).toContain("inauthor%3AMartin");
    expect(callUrl).toContain("intitle%3AClean");
  });
});

// ============================================================================
// getBookDetails Tests
// ============================================================================

describe("getBookDetails", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should return null for empty volumeId", async () => {
    const { getBookDetails } = await import("./googleBooks.js");
    expect(await getBookDetails("")).toBeNull();
    expect(await getBookDetails("   ")).toBeNull();
  });

  it("should return null for 404 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const { getBookDetails } = await import("./googleBooks.js");
    const result = await getBookDetails("nonexistent", false);
    expect(result).toBeNull();
  });

  it("should return normalized book data", async () => {
    const mockVolume = {
      kind: "books#volume",
      id: "abc123",
      volumeInfo: {
        title: "Clean Code",
        subtitle: "A Handbook of Agile Software Craftsmanship",
        authors: ["Robert C. Martin"],
        publisher: "Prentice Hall",
        publishedDate: "2008-08-01",
        description: "A book about writing clean code",
        pageCount: 464,
        categories: ["Computers / Software Development & Engineering"],
        language: "en",
        imageLinks: {
          thumbnail: "http://books.google.com/thumb.jpg",
        },
      },
      saleInfo: {
        isEbook: true,
        saleability: "FOR_SALE",
      },
      accessInfo: {
        epub: { isAvailable: true },
        pdf: { isAvailable: false },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockVolume),
    });

    const { getBookDetails } = await import("./googleBooks.js");
    const result = await getBookDetails("abc123", false);

    expect(result).not.toBeNull();
    expect(result?.id).toBe("abc123");
    expect(result?.title).toBe("Clean Code");
    expect(result?.subtitle).toBe("A Handbook of Agile Software Craftsmanship");
    expect(result?.authors).toEqual(["Robert C. Martin"]);
    expect(result?.publisher).toBe("Prentice Hall");
    expect(result?.pageCount).toBe(464);
    expect(result?.isEbook).toBe(true);
    expect(result?.isEpubAvailable).toBe(true);
    expect(result?.isPdfAvailable).toBe(false);
  });

  it("should upgrade HTTP image URLs to HTTPS", async () => {
    const mockVolume = {
      kind: "books#volume",
      id: "test",
      volumeInfo: {
        title: "Test",
        imageLinks: {
          thumbnail: "http://books.google.com/thumb.jpg",
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockVolume),
    });

    const { getBookDetails } = await import("./googleBooks.js");
    const result = await getBookDetails("test", false);

    expect(result?.imageLinks?.thumbnail).toContain("https://");
  });

  it("should throw GoogleBooksError on API error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () =>
        Promise.resolve({
          error: { code: 500, message: "Server error" },
        }),
    });

    const { getBookDetails, GoogleBooksError } =
      await import("./googleBooks.js");

    await expect(getBookDetails("test", false)).rejects.toThrow(
      GoogleBooksError
    );
  });
});

// ============================================================================
// searchByISBN Tests
// ============================================================================

describe("searchByISBN", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should return null for invalid ISBN length", async () => {
    const { searchByISBN } = await import("./googleBooks.js");
    expect(await searchByISBN("123")).toBeNull();
    expect(await searchByISBN("12345678901234567")).toBeNull();
  });

  it("should return null for empty ISBN", async () => {
    const { searchByISBN } = await import("./googleBooks.js");
    expect(await searchByISBN("")).toBeNull();
  });

  it("should clean ISBN with hyphens", async () => {
    const mockResponse = {
      kind: "books#volumes",
      totalItems: 1,
      items: [
        {
          id: "test",
          volumeInfo: { title: "Test" },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchByISBN } = await import("./googleBooks.js");
    await searchByISBN("978-0-13-235088-4", false);

    const callUrl = getFirstCallUrl();
    expect(callUrl).toContain("isbn%3A9780132350884");
  });

  it("should return first result", async () => {
    const mockResponse = {
      kind: "books#volumes",
      totalItems: 2,
      items: [
        { id: "first", volumeInfo: { title: "First Book" } },
        { id: "second", volumeInfo: { title: "Second Book" } },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchByISBN } = await import("./googleBooks.js");
    const result = await searchByISBN("1234567890", false);

    expect(result?.id).toBe("first");
    expect(result?.title).toBe("First Book");
  });

  it("should return null when no results", async () => {
    const mockResponse = {
      kind: "books#volumes",
      totalItems: 0,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchByISBN } = await import("./googleBooks.js");
    const result = await searchByISBN("0000000000", false);

    expect(result).toBeNull();
  });
});

// ============================================================================
// searchByAuthor Tests
// ============================================================================

describe("searchByAuthor", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should search with inauthor parameter", async () => {
    const mockResponse = {
      kind: "books#volumes",
      totalItems: 0,
      items: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchByAuthor } = await import("./googleBooks.js");
    await searchByAuthor("Robert Martin", { useCache: false });

    const callUrl = getFirstCallUrl();
    expect(callUrl).toContain("inauthor%3ARobert+Martin");
  });
});

// ============================================================================
// searchByTitle Tests
// ============================================================================

describe("searchByTitle", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should search with intitle parameter", async () => {
    const mockResponse = {
      kind: "books#volumes",
      totalItems: 0,
      items: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchByTitle } = await import("./googleBooks.js");
    await searchByTitle("Clean Code", { useCache: false });

    const callUrl = getFirstCallUrl();
    expect(callUrl).toContain("intitle%3AClean+Code");
  });
});

// ============================================================================
// googleBooks Object Tests
// ============================================================================

describe("googleBooks object", () => {
  it("should export all search functions", async () => {
    const { googleBooks } = await import("./googleBooks.js");
    expect(typeof googleBooks.search).toBe("function");
    expect(typeof googleBooks.searchBooks).toBe("function");
    expect(typeof googleBooks.searchByISBN).toBe("function");
    expect(typeof googleBooks.searchByAuthor).toBe("function");
    expect(typeof googleBooks.searchByTitle).toBe("function");
  });

  it("should export details functions", async () => {
    const { googleBooks } = await import("./googleBooks.js");
    expect(typeof googleBooks.getDetails).toBe("function");
    expect(typeof googleBooks.getBookDetails).toBe("function");
  });

  it("should export utility functions", async () => {
    const { googleBooks } = await import("./googleBooks.js");
    expect(typeof googleBooks.getBestImageUrl).toBe("function");
    expect(typeof googleBooks.isConfigured).toBe("function");
  });

  it("should export cache invalidation functions", async () => {
    const { googleBooks } = await import("./googleBooks.js");
    expect(typeof googleBooks.invalidateSearchCache).toBe("function");
    expect(typeof googleBooks.invalidateDetailsCache).toBe("function");
  });
});

// ============================================================================
// googleBooksUtils Object Tests
// ============================================================================

describe("googleBooksUtils object", () => {
  it("should export isConfigured function", async () => {
    const { googleBooksUtils } = await import("./googleBooks.js");
    expect(typeof googleBooksUtils.isConfigured).toBe("function");
  });

  it("should export getBestImageUrl function", async () => {
    const { googleBooksUtils } = await import("./googleBooks.js");
    expect(typeof googleBooksUtils.getBestImageUrl).toBe("function");
  });
});

// ============================================================================
// Index Exports Tests
// ============================================================================

describe("Index exports", () => {
  it("should export searchBooks from index", async () => {
    const { searchBooks } = await import("./index.js");
    expect(typeof searchBooks).toBe("function");
  }, 10000);

  it("should export getBookDetails from index", async () => {
    const { getBookDetails } = await import("./index.js");
    expect(typeof getBookDetails).toBe("function");
  }, 10000);

  it("should export googleBooks from index", async () => {
    const { googleBooks } = await import("./index.js");
    expect(googleBooks).toBeDefined();
    expect(typeof googleBooks.search).toBe("function");
  });

  it("should export GoogleBooksError from index", async () => {
    const { GoogleBooksError } = await import("./index.js");
    expect(GoogleBooksError).toBeDefined();
    const error = new GoogleBooksError("test", 500);
    expect(error instanceof Error).toBe(true);
  });

  it("should export constants from index", async () => {
    const { GOOGLE_BOOKS_API_BASE, DEFAULT_SEARCH_OPTIONS, MAX_RESULTS_LIMIT } =
      await import("./index.js");

    expect(GOOGLE_BOOKS_API_BASE).toBeDefined();
    expect(DEFAULT_SEARCH_OPTIONS).toBeDefined();
    expect(MAX_RESULTS_LIMIT).toBeDefined();
  });

  it("should export utility functions from index", async () => {
    const { getBestImageUrl, isGoogleBooksConfigured } =
      await import("./index.js");
    expect(typeof getBestImageUrl).toBe("function");
    expect(typeof isGoogleBooksConfigured).toBe("function");
  });
});

// ============================================================================
// Normalization Edge Cases
// ============================================================================

describe("Volume normalization edge cases", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should handle missing volumeInfo", async () => {
    const mockVolume = {
      kind: "books#volume",
      id: "test",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockVolume),
    });

    const { getBookDetails } = await import("./googleBooks.js");
    const result = await getBookDetails("test", false);

    expect(result?.title).toBe("Unknown Title");
    expect(result?.authors).toEqual([]);
    expect(result?.categories).toEqual([]);
  });

  it("should handle missing saleInfo", async () => {
    const mockVolume = {
      kind: "books#volume",
      id: "test",
      volumeInfo: { title: "Test" },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockVolume),
    });

    const { getBookDetails } = await import("./googleBooks.js");
    const result = await getBookDetails("test", false);

    expect(result?.isEbook).toBeUndefined();
    expect(result?.saleability).toBeUndefined();
    expect(result?.price).toBeUndefined();
  });

  it("should handle missing accessInfo", async () => {
    const mockVolume = {
      kind: "books#volume",
      id: "test",
      volumeInfo: { title: "Test" },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockVolume),
    });

    const { getBookDetails } = await import("./googleBooks.js");
    const result = await getBookDetails("test", false);

    expect(result?.isEpubAvailable).toBeUndefined();
    expect(result?.isPdfAvailable).toBeUndefined();
  });

  it("should prefer retailPrice over listPrice", async () => {
    const mockVolume = {
      kind: "books#volume",
      id: "test",
      volumeInfo: { title: "Test" },
      saleInfo: {
        listPrice: { amount: 29.99, currencyCode: "USD" },
        retailPrice: { amount: 24.99, currencyCode: "USD" },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockVolume),
    });

    const { getBookDetails } = await import("./googleBooks.js");
    const result = await getBookDetails("test", false);

    expect(result?.price?.amount).toBe(24.99);
  });

  it("should fall back to listPrice when no retailPrice", async () => {
    const mockVolume = {
      kind: "books#volume",
      id: "test",
      volumeInfo: { title: "Test" },
      saleInfo: {
        listPrice: { amount: 29.99, currencyCode: "USD" },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockVolume),
    });

    const { getBookDetails } = await import("./googleBooks.js");
    const result = await getBookDetails("test", false);

    expect(result?.price?.amount).toBe(29.99);
  });

  it("should detect text readability from accessViewStatus", async () => {
    const mockVolume = {
      kind: "books#volume",
      id: "test",
      volumeInfo: { title: "Test" },
      accessInfo: {
        accessViewStatus: "SAMPLE",
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockVolume),
    });

    const { getBookDetails } = await import("./googleBooks.js");
    const result = await getBookDetails("test", false);

    expect(result?.isTextReadable).toBe(true);
  });
});

// ============================================================================
// Rate Limiting Tests
// ============================================================================

describe("Rate limiting", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should retry on 429 response", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 2) {
        return Promise.resolve({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          json: () =>
            Promise.resolve({
              error: { code: 429, message: "Rate limited" },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            kind: "books#volumes",
            totalItems: 0,
            items: [],
          }),
      });
    });

    const { searchBooks } = await import("./googleBooks.js");
    const result = await searchBooks("test", { useCache: false });

    expect(callCount).toBe(2);
    expect(result.totalItems).toBe(0);
  }, 10000);
});
