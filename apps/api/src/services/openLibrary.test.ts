/**
 * Open Library API Service Tests
 */

import { describe, it, expect, vi, afterEach } from "vitest";

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

describe("Open Library Types", () => {
  it("should export OpenLibraryBookMetadata type", async () => {
    const module = await import("./openLibrary.js");
    // Type is exported if module can be imported
    expect(module).toBeDefined();
  });

  it("should export OpenLibrarySearchOptions type", async () => {
    const module = await import("./openLibrary.js");
    expect(module).toBeDefined();
  });

  it("should export OpenLibrarySearchResult type", async () => {
    const module = await import("./openLibrary.js");
    expect(module).toBeDefined();
  });

  it("should export OpenLibraryBookContent type", async () => {
    const module = await import("./openLibrary.js");
    expect(module).toBeDefined();
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("Open Library Constants", () => {
  it("should export OPEN_LIBRARY_API_BASE", async () => {
    const { OPEN_LIBRARY_API_BASE } = await import("./openLibrary.js");
    expect(OPEN_LIBRARY_API_BASE).toBe("https://openlibrary.org");
  });

  it("should export INTERNET_ARCHIVE_BASE", async () => {
    const { INTERNET_ARCHIVE_BASE } = await import("./openLibrary.js");
    expect(INTERNET_ARCHIVE_BASE).toBe("https://archive.org");
  });

  it("should export COVER_IMAGE_BASE", async () => {
    const { COVER_IMAGE_BASE } = await import("./openLibrary.js");
    expect(COVER_IMAGE_BASE).toBe("https://covers.openlibrary.org");
  });

  it("should export DEFAULT_OL_SEARCH_OPTIONS", async () => {
    const { DEFAULT_OL_SEARCH_OPTIONS } = await import("./openLibrary.js");
    expect(DEFAULT_OL_SEARCH_OPTIONS).toEqual({
      limit: 10,
      offset: 0,
      sort: "relevance",
      useCache: true,
    });
  });

  it("should export MAX_OL_RESULTS_LIMIT as 100", async () => {
    const { MAX_OL_RESULTS_LIMIT } = await import("./openLibrary.js");
    expect(MAX_OL_RESULTS_LIMIT).toBe(100);
  });

  it("should export OL_SEARCH_CACHE_TTL", async () => {
    const { OL_SEARCH_CACHE_TTL } = await import("./openLibrary.js");
    expect(typeof OL_SEARCH_CACHE_TTL).toBe("number");
    expect(OL_SEARCH_CACHE_TTL).toBeGreaterThan(0);
  });

  it("should export OL_DETAILS_CACHE_TTL", async () => {
    const { OL_DETAILS_CACHE_TTL } = await import("./openLibrary.js");
    expect(typeof OL_DETAILS_CACHE_TTL).toBe("number");
    expect(OL_DETAILS_CACHE_TTL).toBeGreaterThan(0);
  });
});

// ============================================================================
// OpenLibraryError Tests
// ============================================================================

describe("OpenLibraryError", () => {
  it("should create error with status code", async () => {
    const { OpenLibraryError } = await import("./openLibrary.js");
    const error = new OpenLibraryError("Not found", 404);
    expect(error.message).toBe("Not found");
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe("OpenLibraryError");
  });

  it("should create error with code", async () => {
    const { OpenLibraryError } = await import("./openLibrary.js");
    const error = new OpenLibraryError(
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
    const { OpenLibraryError } = await import("./openLibrary.js");
    const error = new OpenLibraryError("Bad request", 400);
    expect(error.retryable).toBe(false);
  });

  it("should be instance of Error", async () => {
    const { OpenLibraryError } = await import("./openLibrary.js");
    const error = new OpenLibraryError("Error", 500);
    expect(error instanceof Error).toBe(true);
  });
});

// ============================================================================
// getOpenLibraryCoverUrl Tests
// ============================================================================

describe("getOpenLibraryCoverUrl", () => {
  it("should generate correct cover URL with default size M", async () => {
    const { getOpenLibraryCoverUrl } = await import("./openLibrary.js");
    const url = getOpenLibraryCoverUrl(12345678);
    expect(url).toBe("https://covers.openlibrary.org/b/id/12345678-M.jpg");
  });

  it("should generate correct cover URL with size S", async () => {
    const { getOpenLibraryCoverUrl } = await import("./openLibrary.js");
    const url = getOpenLibraryCoverUrl(12345678, "S");
    expect(url).toBe("https://covers.openlibrary.org/b/id/12345678-S.jpg");
  });

  it("should generate correct cover URL with size L", async () => {
    const { getOpenLibraryCoverUrl } = await import("./openLibrary.js");
    const url = getOpenLibraryCoverUrl(12345678, "L");
    expect(url).toBe("https://covers.openlibrary.org/b/id/12345678-L.jpg");
  });
});

// ============================================================================
// getBestOpenLibraryCoverUrl Tests
// ============================================================================

describe("getBestOpenLibraryCoverUrl", () => {
  it("should return undefined for metadata without coverIds", async () => {
    const { getBestOpenLibraryCoverUrl } = await import("./openLibrary.js");
    const metadata = {
      workId: "OL123W",
      title: "Test",
      authors: [],
    };
    expect(getBestOpenLibraryCoverUrl(metadata)).toBeUndefined();
  });

  it("should return undefined for empty coverIds array", async () => {
    const { getBestOpenLibraryCoverUrl } = await import("./openLibrary.js");
    const metadata = {
      workId: "OL123W",
      title: "Test",
      authors: [],
      coverIds: [],
    };
    expect(getBestOpenLibraryCoverUrl(metadata)).toBeUndefined();
  });

  it("should return cover URL for first cover ID", async () => {
    const { getBestOpenLibraryCoverUrl } = await import("./openLibrary.js");
    const metadata = {
      workId: "OL123W",
      title: "Test",
      authors: [],
      coverIds: [12345, 67890],
    };
    const url = getBestOpenLibraryCoverUrl(metadata);
    expect(url).toBe("https://covers.openlibrary.org/b/id/12345-M.jpg");
  });

  it("should use specified size", async () => {
    const { getBestOpenLibraryCoverUrl } = await import("./openLibrary.js");
    const metadata = {
      workId: "OL123W",
      title: "Test",
      authors: [],
      coverIds: [12345],
    };
    const url = getBestOpenLibraryCoverUrl(metadata, "L");
    expect(url).toBe("https://covers.openlibrary.org/b/id/12345-L.jpg");
  });
});

// ============================================================================
// searchOpenLibrary Tests (with mocked fetch)
// ============================================================================

describe("searchOpenLibrary", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should return empty result for empty query without fields", async () => {
    const { searchOpenLibrary } = await import("./openLibrary.js");
    const result = await searchOpenLibrary("", { useCache: false });
    expect(result.totalItems).toBe(0);
    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it("should return empty result for whitespace-only query", async () => {
    const { searchOpenLibrary } = await import("./openLibrary.js");
    const result = await searchOpenLibrary("   ", { useCache: false });
    expect(result.totalItems).toBe(0);
    expect(result.items).toEqual([]);
  });

  it("should clamp limit to MAX_OL_RESULTS_LIMIT", async () => {
    const mockResponse = {
      numFound: 0,
      start: 0,
      numFoundExact: true,
      docs: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchOpenLibrary } = await import("./openLibrary.js");
    await searchOpenLibrary("test", { limit: 200, useCache: false });

    expect(global.fetch).toHaveBeenCalled();
    const callUrl = getFirstCallUrl();
    expect(callUrl).toContain("limit=100");
  });

  it("should set offset to 0 if negative", async () => {
    const mockResponse = {
      numFound: 0,
      start: 0,
      numFoundExact: true,
      docs: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchOpenLibrary } = await import("./openLibrary.js");
    await searchOpenLibrary("test", { offset: -5, useCache: false });

    const callUrl = getFirstCallUrl();
    expect(callUrl).toContain("offset=0");
  });

  it("should include language when specified", async () => {
    const mockResponse = {
      numFound: 0,
      start: 0,
      numFoundExact: true,
      docs: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchOpenLibrary } = await import("./openLibrary.js");
    await searchOpenLibrary("test", { language: "eng", useCache: false });

    const callUrl = getFirstCallUrl();
    expect(callUrl).toContain("language=eng");
  });

  it("should include sort when not relevance", async () => {
    const mockResponse = {
      numFound: 0,
      start: 0,
      numFoundExact: true,
      docs: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchOpenLibrary } = await import("./openLibrary.js");
    await searchOpenLibrary("test", { sort: "new", useCache: false });

    const callUrl = getFirstCallUrl();
    expect(callUrl).toContain("sort=new");
  });

  it("should normalize response data", async () => {
    const mockResponse = {
      numFound: 1,
      start: 0,
      numFoundExact: true,
      docs: [
        {
          key: "/works/OL123456W",
          title: "Test Book",
          author_name: ["Test Author"],
          author_key: ["OL789A"],
          first_publish_year: 2020,
          publisher: ["Test Publisher"],
          isbn: ["1234567890", "9781234567890"],
          number_of_pages_median: 300,
          subject: ["Programming", "Testing"],
          cover_i: 12345678,
          edition_count: 5,
          has_fulltext: true,
          ia: ["testbook_archive"],
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchOpenLibrary } = await import("./openLibrary.js");
    const result = await searchOpenLibrary("test", { useCache: false });

    expect(result.totalItems).toBe(1);
    expect(result.items).toHaveLength(1);
    const firstItem = result.items[0];
    if (!firstItem) {
      throw new Error("Expected firstItem to be defined");
    }
    expect(firstItem.workId).toBe("OL123456W");
    expect(firstItem.title).toBe("Test Book");
    expect(firstItem.authors).toEqual([{ id: "OL789A", name: "Test Author" }]);
    expect(firstItem.firstPublishYear).toBe(2020);
    expect(firstItem.publishers).toEqual(["Test Publisher"]);
    expect(firstItem.isbn10).toEqual(["1234567890"]);
    expect(firstItem.isbn13).toEqual(["9781234567890"]);
    expect(firstItem.pageCount).toBe(300);
    expect(firstItem.subjects).toEqual(["Programming", "Testing"]);
    expect(firstItem.coverIds).toEqual([12345678]);
    expect(firstItem.editionCount).toBe(5);
    expect(firstItem.hasFullText).toBe(true);
    expect(firstItem.iaIds).toEqual(["testbook_archive"]);
  });

  it("should handle missing docs in response", async () => {
    const mockResponse = {
      numFound: 0,
      start: 0,
      numFoundExact: true,
      docs: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchOpenLibrary } = await import("./openLibrary.js");
    const result = await searchOpenLibrary("nonexistent book xyz", {
      useCache: false,
    });

    expect(result.totalItems).toBe(0);
    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it("should calculate hasMore correctly", async () => {
    const mockResponse = {
      numFound: 100,
      start: 0,
      numFoundExact: true,
      docs: Array(10).fill({
        key: "/works/OL123W",
        title: "Test",
      }),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchOpenLibrary } = await import("./openLibrary.js");
    const result = await searchOpenLibrary("test", {
      limit: 10,
      useCache: false,
    });

    expect(result.hasMore).toBe(true);
  });

  it("should throw OpenLibraryError on API error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const { searchOpenLibrary, OpenLibraryError } =
      await import("./openLibrary.js");

    await expect(
      searchOpenLibrary("test", { useCache: false })
    ).rejects.toThrow(OpenLibraryError);
  });

  it("should use fields parameters for field-specific search", async () => {
    const mockResponse = {
      numFound: 0,
      start: 0,
      numFoundExact: true,
      docs: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchOpenLibrary } = await import("./openLibrary.js");
    await searchOpenLibrary("", {
      fields: { author: "Martin", title: "Clean" },
      useCache: false,
    });

    const callUrl = getFirstCallUrl();
    expect(callUrl).toContain("author%3AMartin");
    expect(callUrl).toContain("title%3AClean");
  });
});

// ============================================================================
// getOpenLibraryWork Tests
// ============================================================================

describe("getOpenLibraryWork", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should return null for empty workId", async () => {
    const { getOpenLibraryWork } = await import("./openLibrary.js");
    expect(await getOpenLibraryWork("")).toBeNull();
    expect(await getOpenLibraryWork("   ")).toBeNull();
  });

  it("should return null for 404 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const { getOpenLibraryWork } = await import("./openLibrary.js");
    const result = await getOpenLibraryWork("OL999999W", false);
    expect(result).toBeNull();
  });

  it("should return normalized work data", async () => {
    const mockWork = {
      key: "/works/OL123456W",
      title: "Clean Code",
      subtitle: "A Handbook of Agile Software Craftsmanship",
      description: "A book about writing clean code",
      subjects: ["Programming", "Software Development"],
      covers: [12345, 67890],
      first_publish_date: "2008",
      authors: [{ author: { key: "/authors/OL789A" } }],
    };

    const mockAuthor = {
      key: "/authors/OL789A",
      name: "Robert C. Martin",
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/works/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockWork),
        });
      }
      if (url.includes("/authors/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAuthor),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });
    });

    const { getOpenLibraryWork } = await import("./openLibrary.js");
    const result = await getOpenLibraryWork("OL123456W", false);

    expect(result).not.toBeNull();
    expect(result?.workId).toBe("OL123456W");
    expect(result?.title).toBe("Clean Code");
    expect(result?.subtitle).toBe("A Handbook of Agile Software Craftsmanship");
    expect(result?.description).toBe("A book about writing clean code");
    expect(result?.subjects).toEqual(["Programming", "Software Development"]);
    expect(result?.coverIds).toEqual([12345, 67890]);
    expect(result?.firstPublishYear).toBe(2008);
    expect(result?.authors).toHaveLength(1);
    expect(result?.authors[0]?.name).toBe("Robert C. Martin");
  });

  it("should handle description as object with value", async () => {
    const mockWork = {
      key: "/works/OL123W",
      title: "Test",
      description: { value: "Test description" },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWork),
    });

    const { getOpenLibraryWork } = await import("./openLibrary.js");
    const result = await getOpenLibraryWork("OL123W", false);

    expect(result?.description).toBe("Test description");
  });

  it("should throw OpenLibraryError on API error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const { getOpenLibraryWork, OpenLibraryError } =
      await import("./openLibrary.js");

    await expect(getOpenLibraryWork("OL123W", false)).rejects.toThrow(
      OpenLibraryError
    );
  });

  it("should extract workId from full key path", async () => {
    const mockWork = {
      key: "/works/OL123456W",
      title: "Test",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWork),
    });

    const { getOpenLibraryWork } = await import("./openLibrary.js");
    const result = await getOpenLibraryWork("/works/OL123456W", false);

    expect(result?.workId).toBe("OL123456W");
  });
});

// ============================================================================
// getOpenLibraryEdition Tests
// ============================================================================

describe("getOpenLibraryEdition", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should return null for empty editionId", async () => {
    const { getOpenLibraryEdition } = await import("./openLibrary.js");
    expect(await getOpenLibraryEdition("")).toBeNull();
    expect(await getOpenLibraryEdition("   ")).toBeNull();
  });

  it("should return null for 404 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const { getOpenLibraryEdition } = await import("./openLibrary.js");
    const result = await getOpenLibraryEdition("OL999999M", false);
    expect(result).toBeNull();
  });

  it("should return normalized edition data", async () => {
    const mockEdition = {
      key: "/books/OL123456M",
      title: "Clean Code",
      subtitle: "A Handbook",
      publishers: ["Prentice Hall"],
      publish_date: "2008-08-01",
      number_of_pages: 464,
      isbn_10: ["0132350882"],
      isbn_13: ["9780132350884"],
      covers: [12345],
      languages: [{ key: "/languages/eng" }],
      ocaid: "cleancode_archive",
      authors: [{ key: "/authors/OL789A" }],
    };

    const mockAuthor = {
      key: "/authors/OL789A",
      name: "Robert C. Martin",
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/books/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEdition),
        });
      }
      if (url.includes("/authors/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAuthor),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });
    });

    const { getOpenLibraryEdition } = await import("./openLibrary.js");
    const result = await getOpenLibraryEdition("OL123456M", false);

    expect(result).not.toBeNull();
    expect(result?.editionId).toBe("OL123456M");
    expect(result?.title).toBe("Clean Code");
    expect(result?.subtitle).toBe("A Handbook");
    expect(result?.publishers).toEqual(["Prentice Hall"]);
    expect(result?.publishYear).toBe(2008);
    expect(result?.pageCount).toBe(464);
    expect(result?.isbn10).toEqual(["0132350882"]);
    expect(result?.isbn13).toEqual(["9780132350884"]);
    expect(result?.coverIds).toEqual([12345]);
    expect(result?.languages).toEqual(["eng"]);
    expect(result?.iaIds).toEqual(["cleancode_archive"]);
    expect(result?.hasFullText).toBe(true);
    expect(result?.isPublicDomain).toBe(true);
  });

  it("should throw OpenLibraryError on API error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const { getOpenLibraryEdition, OpenLibraryError } =
      await import("./openLibrary.js");

    await expect(getOpenLibraryEdition("OL123M", false)).rejects.toThrow(
      OpenLibraryError
    );
  });
});

// ============================================================================
// getOpenLibraryBookContent Tests
// ============================================================================

describe("getOpenLibraryBookContent", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should return null for empty editionId", async () => {
    const { getOpenLibraryBookContent } = await import("./openLibrary.js");
    expect(await getOpenLibraryBookContent("")).toBeNull();
    expect(await getOpenLibraryBookContent("   ")).toBeNull();
  });

  it("should return null if edition has no Internet Archive ID", async () => {
    const mockEdition = {
      key: "/books/OL123456M",
      title: "Test Book",
      // No ocaid field
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEdition),
    });

    const { getOpenLibraryBookContent } = await import("./openLibrary.js");
    const result = await getOpenLibraryBookContent("OL123456M");
    expect(result).toBeNull();
  });

  it("should return content info with available formats", async () => {
    const mockEdition = {
      key: "/books/OL123456M",
      title: "Test Book",
      ocaid: "testbook_archive",
    };

    const mockIAMetadata = {
      metadata: {
        title: "Test Book",
      },
      files: [
        { name: "testbook.epub", format: "EPUB" },
        { name: "testbook.pdf", format: "PDF" },
        { name: "testbook.txt", format: "Text" },
        { name: "testbook.mobi", format: "Mobi" },
      ],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/books/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEdition),
        });
      }
      if (url.includes("/metadata/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockIAMetadata),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });
    });

    const { getOpenLibraryBookContent } = await import("./openLibrary.js");
    const result = await getOpenLibraryBookContent("OL123456M");

    expect(result).not.toBeNull();
    expect(result?.editionId).toBe("OL123456M");
    expect(result?.title).toBe("Test Book");
    expect(result?.iaId).toBe("testbook_archive");
    expect(result?.formats).toHaveLength(4);
    expect(result?.formats.find((f) => f.type === "epub")).toBeDefined();
    expect(result?.formats.find((f) => f.type === "pdf")).toBeDefined();
    expect(result?.formats.find((f) => f.type === "text")).toBeDefined();
    expect(result?.formats.find((f) => f.type === "mobi")).toBeDefined();
    expect(result?.hasTextContent).toBe(true);
  });

  it("should return null if Internet Archive returns 404", async () => {
    const mockEdition = {
      key: "/books/OL123456M",
      title: "Test Book",
      ocaid: "testbook_archive",
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/books/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEdition),
        });
      }
      if (url.includes("/metadata/")) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });
    });

    const { getOpenLibraryBookContent } = await import("./openLibrary.js");
    const result = await getOpenLibraryBookContent("OL123456M");
    expect(result).toBeNull();
  });
});

// ============================================================================
// searchOpenLibraryByISBN Tests
// ============================================================================

describe("searchOpenLibraryByISBN", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should return null for invalid ISBN length", async () => {
    const { searchOpenLibraryByISBN } = await import("./openLibrary.js");
    expect(await searchOpenLibraryByISBN("123")).toBeNull();
    expect(await searchOpenLibraryByISBN("12345678901234567")).toBeNull();
  });

  it("should return null for empty ISBN", async () => {
    const { searchOpenLibraryByISBN } = await import("./openLibrary.js");
    expect(await searchOpenLibraryByISBN("")).toBeNull();
  });

  it("should clean ISBN with hyphens", async () => {
    const mockResponse = {
      numFound: 1,
      start: 0,
      numFoundExact: true,
      docs: [
        {
          key: "/works/OL123W",
          title: "Test",
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchOpenLibraryByISBN } = await import("./openLibrary.js");
    await searchOpenLibraryByISBN("978-0-13-235088-4", false);

    const callUrl = getFirstCallUrl();
    expect(callUrl).toContain("isbn%3A9780132350884");
  });

  it("should return first result", async () => {
    const mockResponse = {
      numFound: 2,
      start: 0,
      numFoundExact: true,
      docs: [
        { key: "/works/OL111W", title: "First Book" },
        { key: "/works/OL222W", title: "Second Book" },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchOpenLibraryByISBN } = await import("./openLibrary.js");
    const result = await searchOpenLibraryByISBN("1234567890", false);

    expect(result?.workId).toBe("OL111W");
    expect(result?.title).toBe("First Book");
  });

  it("should return null when no results", async () => {
    const mockResponse = {
      numFound: 0,
      start: 0,
      numFoundExact: true,
      docs: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchOpenLibraryByISBN } = await import("./openLibrary.js");
    const result = await searchOpenLibraryByISBN("0000000000", false);

    expect(result).toBeNull();
  });
});

// ============================================================================
// searchOpenLibraryByAuthor Tests
// ============================================================================

describe("searchOpenLibraryByAuthor", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should search with author field", async () => {
    const mockResponse = {
      numFound: 0,
      start: 0,
      numFoundExact: true,
      docs: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchOpenLibraryByAuthor } = await import("./openLibrary.js");
    await searchOpenLibraryByAuthor("Robert Martin", { useCache: false });

    const callUrl = getFirstCallUrl();
    expect(callUrl).toContain("author%3ARobert+Martin");
  });
});

// ============================================================================
// searchOpenLibraryByTitle Tests
// ============================================================================

describe("searchOpenLibraryByTitle", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should search with title field", async () => {
    const mockResponse = {
      numFound: 0,
      start: 0,
      numFoundExact: true,
      docs: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchOpenLibraryByTitle } = await import("./openLibrary.js");
    await searchOpenLibraryByTitle("Clean Code", { useCache: false });

    const callUrl = getFirstCallUrl();
    expect(callUrl).toContain("title%3AClean+Code");
  });
});

// ============================================================================
// openLibrary Object Tests
// ============================================================================

describe("openLibrary object", () => {
  it("should export all search functions", async () => {
    const { openLibrary } = await import("./openLibrary.js");
    expect(typeof openLibrary.search).toBe("function");
    expect(typeof openLibrary.searchOpenLibrary).toBe("function");
    expect(typeof openLibrary.searchByISBN).toBe("function");
    expect(typeof openLibrary.searchByAuthor).toBe("function");
    expect(typeof openLibrary.searchByTitle).toBe("function");
  });

  it("should export details functions", async () => {
    const { openLibrary } = await import("./openLibrary.js");
    expect(typeof openLibrary.getWork).toBe("function");
    expect(typeof openLibrary.getEdition).toBe("function");
    expect(typeof openLibrary.getBookContent).toBe("function");
  });

  it("should export utility functions", async () => {
    const { openLibrary } = await import("./openLibrary.js");
    expect(typeof openLibrary.getCoverUrl).toBe("function");
    expect(typeof openLibrary.getBestCoverUrl).toBe("function");
  });

  it("should export cache invalidation functions", async () => {
    const { openLibrary } = await import("./openLibrary.js");
    expect(typeof openLibrary.invalidateSearchCache).toBe("function");
    expect(typeof openLibrary.invalidateWorkCache).toBe("function");
    expect(typeof openLibrary.invalidateEditionCache).toBe("function");
  });
});

// ============================================================================
// openLibraryUtils Object Tests
// ============================================================================

describe("openLibraryUtils object", () => {
  it("should export getCoverUrl function", async () => {
    const { openLibraryUtils } = await import("./openLibrary.js");
    expect(typeof openLibraryUtils.getCoverUrl).toBe("function");
  });

  it("should export getBestCoverUrl function", async () => {
    const { openLibraryUtils } = await import("./openLibrary.js");
    expect(typeof openLibraryUtils.getBestCoverUrl).toBe("function");
  });

  it("should export extractIdFromKey function", async () => {
    const { openLibraryUtils } = await import("./openLibrary.js");
    expect(typeof openLibraryUtils.extractIdFromKey).toBe("function");
    expect(openLibraryUtils.extractIdFromKey("/works/OL123W")).toBe("OL123W");
    expect(openLibraryUtils.extractIdFromKey("OL123W")).toBe("OL123W");
  });

  it("should export parseYear function", async () => {
    const { openLibraryUtils } = await import("./openLibrary.js");
    expect(typeof openLibraryUtils.parseYear).toBe("function");
    expect(openLibraryUtils.parseYear("2020")).toBe(2020);
    expect(openLibraryUtils.parseYear("2020-01-15")).toBe(2020);
    expect(openLibraryUtils.parseYear("January 2020")).toBe(2020);
    expect(openLibraryUtils.parseYear(undefined)).toBeUndefined();
    expect(openLibraryUtils.parseYear("")).toBeUndefined();
  });
});

// ============================================================================
// Index Exports Tests
// ============================================================================

describe("Index exports for Open Library", () => {
  it("should export searchOpenLibrary from index", async () => {
    const { searchOpenLibrary } = await import("./index.js");
    expect(typeof searchOpenLibrary).toBe("function");
  });

  it("should export getOpenLibraryWork from index", async () => {
    const { getOpenLibraryWork } = await import("./index.js");
    expect(typeof getOpenLibraryWork).toBe("function");
  });

  it("should export getOpenLibraryEdition from index", async () => {
    const { getOpenLibraryEdition } = await import("./index.js");
    expect(typeof getOpenLibraryEdition).toBe("function");
  });

  it("should export getOpenLibraryBookContent from index", async () => {
    const { getOpenLibraryBookContent } = await import("./index.js");
    expect(typeof getOpenLibraryBookContent).toBe("function");
  });

  it("should export openLibrary from index", async () => {
    const { openLibrary } = await import("./index.js");
    expect(openLibrary).toBeDefined();
    expect(typeof openLibrary.search).toBe("function");
  });

  it("should export OpenLibraryError from index", async () => {
    const { OpenLibraryError } = await import("./index.js");
    expect(OpenLibraryError).toBeDefined();
    const error = new OpenLibraryError("test", 500);
    expect(error instanceof Error).toBe(true);
  });

  it("should export constants from index", async () => {
    const {
      OPEN_LIBRARY_API_BASE,
      INTERNET_ARCHIVE_BASE,
      COVER_IMAGE_BASE,
      DEFAULT_OL_SEARCH_OPTIONS,
      MAX_OL_RESULTS_LIMIT,
    } = await import("./index.js");

    expect(OPEN_LIBRARY_API_BASE).toBeDefined();
    expect(INTERNET_ARCHIVE_BASE).toBeDefined();
    expect(COVER_IMAGE_BASE).toBeDefined();
    expect(DEFAULT_OL_SEARCH_OPTIONS).toBeDefined();
    expect(MAX_OL_RESULTS_LIMIT).toBeDefined();
  });

  it("should export utility functions from index", async () => {
    const { getOpenLibraryCoverUrl, getBestOpenLibraryCoverUrl } =
      await import("./index.js");
    expect(typeof getOpenLibraryCoverUrl).toBe("function");
    expect(typeof getBestOpenLibraryCoverUrl).toBe("function");
  });
});

// ============================================================================
// Normalization Edge Cases
// ============================================================================

describe("Open Library normalization edge cases", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should handle missing author_key in search results", async () => {
    const mockResponse = {
      numFound: 1,
      start: 0,
      numFoundExact: true,
      docs: [
        {
          key: "/works/OL123W",
          title: "Test",
          author_name: ["Author One", "Author Two"],
          // No author_key field
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchOpenLibrary } = await import("./openLibrary.js");
    const result = await searchOpenLibrary("test", { useCache: false });

    expect(result.items[0]?.authors).toHaveLength(2);
    expect(result.items[0]?.authors[0]?.id).toBe("unknown-0");
    expect(result.items[0]?.authors[0]?.name).toBe("Author One");
    expect(result.items[0]?.authors[1]?.id).toBe("unknown-1");
    expect(result.items[0]?.authors[1]?.name).toBe("Author Two");
  });

  it("should handle missing optional fields in search results", async () => {
    const mockResponse = {
      numFound: 1,
      start: 0,
      numFoundExact: true,
      docs: [
        {
          key: "/works/OL123W",
          title: "Minimal Book",
          // No optional fields
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchOpenLibrary } = await import("./openLibrary.js");
    const result = await searchOpenLibrary("test", { useCache: false });

    const book = result.items[0];
    expect(book?.workId).toBe("OL123W");
    expect(book?.title).toBe("Minimal Book");
    expect(book?.authors).toEqual([]);
    expect(book?.subtitle).toBeUndefined();
    expect(book?.firstPublishYear).toBeUndefined();
    expect(book?.publishers).toBeUndefined();
    expect(book?.isbn10).toBeUndefined();
    expect(book?.isbn13).toBeUndefined();
    expect(book?.pageCount).toBeUndefined();
    expect(book?.subjects).toBeUndefined();
    expect(book?.coverIds).toBeUndefined();
  });

  it("should extract most recent publish year from array", async () => {
    const mockResponse = {
      numFound: 1,
      start: 0,
      numFoundExact: true,
      docs: [
        {
          key: "/works/OL123W",
          title: "Test",
          publish_year: [2010, 2015, 2012, 2020],
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchOpenLibrary } = await import("./openLibrary.js");
    const result = await searchOpenLibrary("test", { useCache: false });

    expect(result.items[0]?.publishYear).toBe(2020);
  });

  it("should filter ISBN-10 and ISBN-13 correctly from mixed array", async () => {
    const mockResponse = {
      numFound: 1,
      start: 0,
      numFoundExact: true,
      docs: [
        {
          key: "/works/OL123W",
          title: "Test",
          isbn: [
            "1234567890", // ISBN-10
            "9781234567890", // ISBN-13
            "0987654321", // ISBN-10
            "9780987654321", // ISBN-13
            "invalid", // Should be ignored
          ],
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { searchOpenLibrary } = await import("./openLibrary.js");
    const result = await searchOpenLibrary("test", { useCache: false });

    expect(result.items[0]?.isbn10).toEqual(["1234567890", "0987654321"]);
    expect(result.items[0]?.isbn13).toEqual(["9781234567890", "9780987654321"]);
  });

  it("should handle work with no authors", async () => {
    const mockWork = {
      key: "/works/OL123W",
      title: "Anonymous Work",
      // No authors field
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWork),
    });

    const { getOpenLibraryWork } = await import("./openLibrary.js");
    const result = await getOpenLibraryWork("OL123W", false);

    expect(result?.authors).toEqual([]);
  });

  it("should handle author fetch failure gracefully", async () => {
    const mockWork = {
      key: "/works/OL123W",
      title: "Test",
      authors: [{ author: { key: "/authors/OL789A" } }],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/works/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockWork),
        });
      }
      if (url.includes("/authors/")) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Server Error",
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });
    });

    const { getOpenLibraryWork } = await import("./openLibrary.js");
    const result = await getOpenLibraryWork("OL123W", false);

    // Should not crash, just have empty authors
    expect(result?.authors).toEqual([]);
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
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            numFound: 0,
            start: 0,
            numFoundExact: true,
            docs: [],
          }),
      });
    });

    const { searchOpenLibrary } = await import("./openLibrary.js");
    const result = await searchOpenLibrary("test", { useCache: false });

    expect(callCount).toBe(2);
    expect(result.totalItems).toBe(0);
  }, 10000);
});
