/**
 * Tests for GET /api/books/search endpoint
 */

import { describe, it, expect } from "vitest";
import type { GoogleBookMetadata } from "../../src/services/googleBooks.js";
import type { OpenLibraryBookMetadata } from "../../src/services/openLibrary.js";
import {
  searchQuerySchema,
  normalizeGoogleBook,
  normalizeOpenLibraryBook,
  getDeduplicationKey,
  deduplicateResults,
  scoreItem,
  sortResults,
  buildCombinedSearchCacheKey,
  MAX_LIMIT,
  DEFAULT_LIMIT,
  MIN_QUERY_LENGTH,
  MAX_QUERY_LENGTH,
  COMBINED_SEARCH_CACHE_TTL,
  type SearchResultItem,
} from "./search.js";

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("searchQuerySchema", () => {
  describe("query (q) validation", () => {
    it("should accept valid query", () => {
      const result = searchQuerySchema.safeParse({ q: "clean code" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.q).toBe("clean code");
      }
    });

    it("should accept single character query", () => {
      const result = searchQuerySchema.safeParse({ q: "a" });
      expect(result.success).toBe(true);
    });

    it("should reject empty query", () => {
      const result = searchQuerySchema.safeParse({ q: "" });
      expect(result.success).toBe(false);
    });

    it("should reject query that is too long", () => {
      const longQuery = "a".repeat(MAX_QUERY_LENGTH + 1);
      const result = searchQuerySchema.safeParse({ q: longQuery });
      expect(result.success).toBe(false);
    });

    it("should accept query at max length", () => {
      const maxQuery = "a".repeat(MAX_QUERY_LENGTH);
      const result = searchQuerySchema.safeParse({ q: maxQuery });
      expect(result.success).toBe(true);
    });

    it("should reject missing query", () => {
      const result = searchQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("limit validation", () => {
    it("should use default limit when not provided", () => {
      const result = searchQuerySchema.safeParse({ q: "test" });
      expect(result.success).toBe(true);
      if (result.success) {
        // limit is optional with default, so it may be undefined here
        // The default is applied at the handler level
        expect(result.data.limit).toBeUndefined();
      }
    });

    it("should accept valid limit", () => {
      const result = searchQuerySchema.safeParse({ q: "test", limit: "20" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it("should accept limit as number", () => {
      const result = searchQuerySchema.safeParse({ q: "test", limit: 15 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(15);
      }
    });

    it("should reject limit below 1", () => {
      const result = searchQuerySchema.safeParse({ q: "test", limit: "0" });
      expect(result.success).toBe(false);
    });

    it("should reject limit above max", () => {
      const result = searchQuerySchema.safeParse({
        q: "test",
        limit: String(MAX_LIMIT + 1),
      });
      expect(result.success).toBe(false);
    });

    it("should accept limit at max", () => {
      const result = searchQuerySchema.safeParse({
        q: "test",
        limit: String(MAX_LIMIT),
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(MAX_LIMIT);
      }
    });
  });

  describe("offset validation", () => {
    it("should use default offset when not provided", () => {
      const result = searchQuerySchema.safeParse({ q: "test" });
      expect(result.success).toBe(true);
      if (result.success) {
        // offset is optional with default, so it may be undefined here
        // The default is applied at the handler level
        expect(result.data.offset).toBeUndefined();
      }
    });

    it("should accept valid offset", () => {
      const result = searchQuerySchema.safeParse({ q: "test", offset: "10" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(10);
      }
    });

    it("should reject negative offset", () => {
      const result = searchQuerySchema.safeParse({ q: "test", offset: "-1" });
      expect(result.success).toBe(false);
    });

    it("should accept zero offset", () => {
      const result = searchQuerySchema.safeParse({ q: "test", offset: "0" });
      expect(result.success).toBe(true);
    });
  });

  describe("language validation", () => {
    it("should accept valid 2-char language code", () => {
      const result = searchQuerySchema.safeParse({ q: "test", language: "en" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.language).toBe("en");
      }
    });

    it("should reject 1-char language code", () => {
      const result = searchQuerySchema.safeParse({ q: "test", language: "e" });
      expect(result.success).toBe(false);
    });

    it("should reject 3-char language code", () => {
      const result = searchQuerySchema.safeParse({
        q: "test",
        language: "eng",
      });
      expect(result.success).toBe(false);
    });

    it("should accept missing language", () => {
      const result = searchQuerySchema.safeParse({ q: "test" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.language).toBeUndefined();
      }
    });
  });

  describe("source validation", () => {
    it("should default to all when not provided", () => {
      const result = searchQuerySchema.safeParse({ q: "test" });
      expect(result.success).toBe(true);
      if (result.success) {
        // source is optional with default, so it may be undefined here
        // The default is applied at the handler level
        expect(result.data.source).toBeUndefined();
      }
    });

    it("should accept 'all' source", () => {
      const result = searchQuerySchema.safeParse({ q: "test", source: "all" });
      expect(result.success).toBe(true);
    });

    it("should accept 'google' source", () => {
      const result = searchQuerySchema.safeParse({
        q: "test",
        source: "google",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source).toBe("google");
      }
    });

    it("should accept 'openlib' source", () => {
      const result = searchQuerySchema.safeParse({
        q: "test",
        source: "openlib",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source).toBe("openlib");
      }
    });

    it("should reject invalid source", () => {
      const result = searchQuerySchema.safeParse({
        q: "test",
        source: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("combined validation", () => {
    it("should accept complete valid params", () => {
      const result = searchQuerySchema.safeParse({
        q: "javascript programming",
        limit: "25",
        offset: "10",
        language: "en",
        source: "all",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.q).toBe("javascript programming");
        expect(result.data.limit).toBe(25);
        expect(result.data.offset).toBe(10);
        expect(result.data.language).toBe("en");
        expect(result.data.source).toBe("all");
      }
    });

    it("should accept minimal valid params", () => {
      const result = searchQuerySchema.safeParse({ q: "test" });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Normalization Tests
// ============================================================================

describe("normalizeGoogleBook", () => {
  it("should normalize basic Google Book metadata", () => {
    const googleBook: GoogleBookMetadata = {
      id: "abc123",
      title: "Clean Code",
      authors: ["Robert C. Martin"],
      categories: ["Programming"],
    };

    const result = normalizeGoogleBook(googleBook);

    expect(result.id).toBe("google:abc123");
    expect(result.source).toBe("google");
    expect(result.title).toBe("Clean Code");
    expect(result.authors).toEqual(["Robert C. Martin"]);
    expect(result.categories).toEqual(["Programming"]);
  });

  it("should normalize complete Google Book metadata", () => {
    const googleBook: GoogleBookMetadata = {
      id: "xyz789",
      title: "The Pragmatic Programmer",
      subtitle: "From Journeyman to Master",
      authors: ["David Thomas", "Andrew Hunt"],
      categories: ["Software Engineering", "Programming"],
      description: "A great book about programming.",
      publishedDate: "2019-09-13",
      publisher: "Addison-Wesley",
      isbn10: "0135957052",
      isbn13: "9780135957059",
      pageCount: 352,
      language: "en",
      averageRating: 4.5,
      ratingsCount: 1234,
      previewLink: "https://books.google.com/preview",
      imageLinks: {
        thumbnail: "https://example.com/thumb.jpg",
        medium: "https://example.com/medium.jpg",
      },
    };

    const result = normalizeGoogleBook(googleBook);

    expect(result.id).toBe("google:xyz789");
    expect(result.source).toBe("google");
    expect(result.title).toBe("The Pragmatic Programmer");
    expect(result.subtitle).toBe("From Journeyman to Master");
    expect(result.authors).toEqual(["David Thomas", "Andrew Hunt"]);
    expect(result.description).toBe("A great book about programming.");
    expect(result.publishYear).toBe(2019);
    expect(result.publisher).toBe("Addison-Wesley");
    expect(result.isbn10).toBe("0135957052");
    expect(result.isbn13).toBe("9780135957059");
    expect(result.pageCount).toBe(352);
    expect(result.language).toBe("en");
    expect(result.averageRating).toBe(4.5);
    expect(result.ratingsCount).toBe(1234);
    expect(result.previewLink).toBe("https://books.google.com/preview");
    expect(result.coverImage).toBe("https://example.com/medium.jpg");
  });

  it("should handle year-only publish date", () => {
    const googleBook: GoogleBookMetadata = {
      id: "test123",
      title: "Test Book",
      authors: [],
      categories: [],
      publishedDate: "2020",
    };

    const result = normalizeGoogleBook(googleBook);
    expect(result.publishYear).toBe(2020);
  });

  it("should handle empty authors and categories", () => {
    const googleBook: GoogleBookMetadata = {
      id: "empty",
      title: "Empty Book",
      authors: [],
      categories: [],
    };

    const result = normalizeGoogleBook(googleBook);
    expect(result.authors).toEqual([]);
    expect(result.categories).toEqual([]);
  });

  it("should not include undefined optional fields", () => {
    const googleBook: GoogleBookMetadata = {
      id: "minimal",
      title: "Minimal",
      authors: [],
      categories: [],
    };

    const result = normalizeGoogleBook(googleBook);

    expect(result.subtitle).toBeUndefined();
    expect(result.description).toBeUndefined();
    expect(result.publishYear).toBeUndefined();
    expect(result.publisher).toBeUndefined();
    expect(result.isbn10).toBeUndefined();
    expect(result.isbn13).toBeUndefined();
    expect(result.coverImage).toBeUndefined();
  });
});

describe("normalizeOpenLibraryBook", () => {
  it("should normalize basic Open Library metadata", () => {
    const openLibBook: OpenLibraryBookMetadata = {
      workId: "OL123456W",
      title: "Clean Code",
      authors: [{ id: "OL1234A", name: "Robert C. Martin" }],
    };

    const result = normalizeOpenLibraryBook(openLibBook);

    expect(result.id).toBe("openlib:OL123456W");
    expect(result.source).toBe("openlib");
    expect(result.title).toBe("Clean Code");
    expect(result.authors).toEqual(["Robert C. Martin"]);
    expect(result.categories).toEqual([]);
  });

  it("should normalize complete Open Library metadata", () => {
    const openLibBook: OpenLibraryBookMetadata = {
      workId: "OL789012W",
      title: "The Pragmatic Programmer",
      subtitle: "From Journeyman to Master",
      authors: [
        { id: "OL1A", name: "David Thomas" },
        { id: "OL2A", name: "Andrew Hunt" },
      ],
      subjects: ["Software Engineering", "Programming"],
      description: "A great book about programming.",
      firstPublishYear: 1999,
      publishers: ["Addison-Wesley"],
      isbn10: ["0135957052"],
      isbn13: ["9780135957059"],
      pageCount: 352,
      languages: ["en"],
      averageRating: 4.5,
      ratingsCount: 1234,
      hasFullText: true,
      isPublicDomain: false,
      coverIds: [12345],
    };

    const result = normalizeOpenLibraryBook(openLibBook);

    expect(result.id).toBe("openlib:OL789012W");
    expect(result.source).toBe("openlib");
    expect(result.title).toBe("The Pragmatic Programmer");
    expect(result.subtitle).toBe("From Journeyman to Master");
    expect(result.authors).toEqual(["David Thomas", "Andrew Hunt"]);
    expect(result.categories).toEqual(["Software Engineering", "Programming"]);
    expect(result.description).toBe("A great book about programming.");
    expect(result.publishYear).toBe(1999);
    expect(result.publisher).toBe("Addison-Wesley");
    expect(result.isbn10).toBe("0135957052");
    expect(result.isbn13).toBe("9780135957059");
    expect(result.pageCount).toBe(352);
    expect(result.language).toBe("en");
    expect(result.averageRating).toBe(4.5);
    expect(result.ratingsCount).toBe(1234);
    expect(result.hasFullText).toBe(true);
    // isPublicDomain is only set when true (due to exactOptionalPropertyTypes)
    expect(result.isPublicDomain).toBeUndefined();
    expect(result.coverImage).toContain("12345");
  });

  it("should handle empty authors and subjects", () => {
    const openLibBook: OpenLibraryBookMetadata = {
      workId: "OL000000W",
      title: "Empty Book",
      authors: [],
    };

    const result = normalizeOpenLibraryBook(openLibBook);
    expect(result.authors).toEqual([]);
    expect(result.categories).toEqual([]);
  });

  it("should use first ISBN when multiple provided", () => {
    const openLibBook: OpenLibraryBookMetadata = {
      workId: "OL111111W",
      title: "Multi-ISBN Book",
      authors: [],
      isbn10: ["1234567890", "0987654321"],
      isbn13: ["9781234567890", "9780987654321"],
    };

    const result = normalizeOpenLibraryBook(openLibBook);
    expect(result.isbn10).toBe("1234567890");
    expect(result.isbn13).toBe("9781234567890");
  });

  it("should use first publisher when multiple provided", () => {
    const openLibBook: OpenLibraryBookMetadata = {
      workId: "OL222222W",
      title: "Multi-Publisher Book",
      authors: [],
      publishers: ["Publisher A", "Publisher B"],
    };

    const result = normalizeOpenLibraryBook(openLibBook);
    expect(result.publisher).toBe("Publisher A");
  });
});

// ============================================================================
// Deduplication Tests
// ============================================================================

describe("getDeduplicationKey", () => {
  it("should use ISBN-13 when available", () => {
    const item: SearchResultItem = {
      id: "google:123",
      source: "google",
      title: "Test Book",
      authors: ["Author"],
      categories: [],
      isbn13: "9780135957059",
    };

    const key = getDeduplicationKey(item);
    expect(key).toBe("isbn:9780135957059");
  });

  it("should use ISBN-10 when ISBN-13 not available", () => {
    const item: SearchResultItem = {
      id: "google:123",
      source: "google",
      title: "Test Book",
      authors: ["Author"],
      categories: [],
      isbn10: "0135957052",
    };

    const key = getDeduplicationKey(item);
    expect(key).toBe("isbn:0135957052");
  });

  it("should strip hyphens from ISBN", () => {
    const item: SearchResultItem = {
      id: "google:123",
      source: "google",
      title: "Test Book",
      authors: ["Author"],
      categories: [],
      isbn13: "978-0-13-595705-9",
    };

    const key = getDeduplicationKey(item);
    expect(key).toBe("isbn:9780135957059");
  });

  it("should use title+author when no ISBN", () => {
    const item: SearchResultItem = {
      id: "google:123",
      source: "google",
      title: "Clean Code",
      authors: ["Robert C. Martin"],
      categories: [],
    };

    const key = getDeduplicationKey(item);
    expect(key).toBe("title:clean code|author:robert c. martin");
  });

  it("should normalize title whitespace", () => {
    const item: SearchResultItem = {
      id: "google:123",
      source: "google",
      title: "  Clean    Code  ",
      authors: ["Author"],
      categories: [],
    };

    const key = getDeduplicationKey(item);
    expect(key).toBe("title:clean code|author:author");
  });

  it("should handle empty authors", () => {
    const item: SearchResultItem = {
      id: "google:123",
      source: "google",
      title: "Orphan Book",
      authors: [],
      categories: [],
    };

    const key = getDeduplicationKey(item);
    expect(key).toBe("title:orphan book|author:");
  });
});

describe("deduplicateResults", () => {
  it("should remove duplicates with same ISBN", () => {
    const items: SearchResultItem[] = [
      {
        id: "google:1",
        source: "google",
        title: "Book A",
        authors: ["Author"],
        categories: [],
        isbn13: "9780135957059",
        description: "Short desc",
      },
      {
        id: "openlib:1",
        source: "openlib",
        title: "Book A - Different Title",
        authors: ["Author"],
        categories: [],
        isbn13: "9780135957059",
        description: "Longer description with more details",
        coverImage: "https://example.com/cover.jpg",
      },
    ];

    const result = deduplicateResults(items);
    expect(result).toHaveLength(1);
    // Should keep the one with more data (openlib has cover)
    expect(result[0]?.id).toBe("openlib:1");
  });

  it("should remove duplicates with same title+author", () => {
    const items: SearchResultItem[] = [
      {
        id: "google:1",
        source: "google",
        title: "Clean Code",
        authors: ["Robert Martin"],
        categories: [],
      },
      {
        id: "openlib:1",
        source: "openlib",
        title: "CLEAN CODE",
        authors: ["ROBERT MARTIN"],
        categories: ["Programming"],
        description: "Has description",
      },
    ];

    const result = deduplicateResults(items);
    expect(result).toHaveLength(1);
    // Should keep the one with more data
    expect(result[0]?.id).toBe("openlib:1");
  });

  it("should keep unique items", () => {
    const items: SearchResultItem[] = [
      {
        id: "google:1",
        source: "google",
        title: "Book One",
        authors: ["Author A"],
        categories: [],
        isbn13: "1111111111111",
      },
      {
        id: "google:2",
        source: "google",
        title: "Book Two",
        authors: ["Author B"],
        categories: [],
        isbn13: "2222222222222",
      },
    ];

    const result = deduplicateResults(items);
    expect(result).toHaveLength(2);
  });

  it("should handle empty array", () => {
    const result = deduplicateResults([]);
    expect(result).toEqual([]);
  });

  it("should handle single item", () => {
    const items: SearchResultItem[] = [
      {
        id: "google:1",
        source: "google",
        title: "Single Book",
        authors: [],
        categories: [],
      },
    ];

    const result = deduplicateResults(items);
    expect(result).toHaveLength(1);
  });
});

// ============================================================================
// Scoring Tests
// ============================================================================

describe("scoreItem", () => {
  it("should score item with all fields higher", () => {
    const fullItem: SearchResultItem = {
      id: "full",
      source: "google",
      title: "Full Book",
      authors: ["Author"],
      categories: ["Category"],
      description: "Description",
      coverImage: "https://example.com/cover.jpg",
      isbn13: "9780135957059",
      isbn10: "0135957052",
      pageCount: 300,
      publisher: "Publisher",
      publishYear: 2020,
      averageRating: 4.5,
      hasFullText: true,
    };

    const minimalItem: SearchResultItem = {
      id: "minimal",
      source: "google",
      title: "Minimal Book",
      authors: [],
      categories: [],
    };

    const fullScore = scoreItem(fullItem);
    const minimalScore = scoreItem(minimalItem);

    expect(fullScore).toBeGreaterThan(minimalScore);
  });

  it("should give more weight to description and cover", () => {
    const withDesc: SearchResultItem = {
      id: "desc",
      source: "google",
      title: "Book",
      authors: [],
      categories: [],
      description: "Description",
    };

    const withCover: SearchResultItem = {
      id: "cover",
      source: "google",
      title: "Book",
      authors: [],
      categories: [],
      coverImage: "https://example.com/cover.jpg",
    };

    const withIsbn: SearchResultItem = {
      id: "isbn",
      source: "google",
      title: "Book",
      authors: [],
      categories: [],
      isbn10: "1234567890",
    };

    // Description and cover should score higher than ISBN
    expect(scoreItem(withDesc)).toBeGreaterThan(scoreItem(withIsbn));
    expect(scoreItem(withCover)).toBeGreaterThan(scoreItem(withIsbn));
  });

  it("should give bonus for hasFullText", () => {
    const withFullText: SearchResultItem = {
      id: "full",
      source: "openlib",
      title: "Book",
      authors: [],
      categories: [],
      hasFullText: true,
    };

    const withoutFullText: SearchResultItem = {
      id: "none",
      source: "openlib",
      title: "Book",
      authors: [],
      categories: [],
    };

    expect(scoreItem(withFullText)).toBeGreaterThan(scoreItem(withoutFullText));
  });
});

describe("sortResults", () => {
  it("should prioritize items with cover images", () => {
    const items: SearchResultItem[] = [
      {
        id: "no-cover",
        source: "google",
        title: "No Cover",
        authors: [],
        categories: [],
      },
      {
        id: "has-cover",
        source: "google",
        title: "Has Cover",
        authors: [],
        categories: [],
        coverImage: "https://example.com/cover.jpg",
      },
    ];

    const sorted = sortResults(items);
    expect(sorted[0]?.id).toBe("has-cover");
  });

  it("should sort by score when cover status is equal", () => {
    const items: SearchResultItem[] = [
      {
        id: "low-score",
        source: "google",
        title: "Low Score",
        authors: [],
        categories: [],
        coverImage: "https://example.com/cover1.jpg",
      },
      {
        id: "high-score",
        source: "google",
        title: "High Score",
        authors: ["Author"],
        categories: ["Category"],
        description: "Description",
        coverImage: "https://example.com/cover2.jpg",
        isbn13: "9780135957059",
      },
    ];

    const sorted = sortResults(items);
    expect(sorted[0]?.id).toBe("high-score");
  });

  it("should sort by ratings count when scores are equal", () => {
    const items: SearchResultItem[] = [
      {
        id: "few-ratings",
        source: "google",
        title: "Few Ratings",
        authors: [],
        categories: [],
        ratingsCount: 10,
      },
      {
        id: "many-ratings",
        source: "google",
        title: "Many Ratings",
        authors: [],
        categories: [],
        ratingsCount: 1000,
      },
    ];

    const sorted = sortResults(items);
    expect(sorted[0]?.id).toBe("many-ratings");
  });

  it("should handle empty array", () => {
    const sorted = sortResults([]);
    expect(sorted).toEqual([]);
  });
});

// ============================================================================
// Cache Key Tests
// ============================================================================

describe("buildCombinedSearchCacheKey", () => {
  it("should build consistent cache key", () => {
    const params = { q: "clean code", limit: 10, offset: 0 };
    const key1 = buildCombinedSearchCacheKey(params);
    const key2 = buildCombinedSearchCacheKey(params);
    expect(key1).toBe(key2);
  });

  it("should normalize query whitespace", () => {
    const key1 = buildCombinedSearchCacheKey({ q: "clean code" });
    const key2 = buildCombinedSearchCacheKey({ q: "clean  code" });
    expect(key1).toBe(key2);
  });

  it("should include offset in key", () => {
    const key1 = buildCombinedSearchCacheKey({ q: "test", offset: 0 });
    const key2 = buildCombinedSearchCacheKey({ q: "test", offset: 10 });
    expect(key1).not.toBe(key2);
  });

  it("should include limit in key", () => {
    const key1 = buildCombinedSearchCacheKey({ q: "test", limit: 10 });
    const key2 = buildCombinedSearchCacheKey({ q: "test", limit: 20 });
    expect(key1).not.toBe(key2);
  });

  it("should include language in key", () => {
    const key1 = buildCombinedSearchCacheKey({ q: "test", language: "en" });
    const key2 = buildCombinedSearchCacheKey({ q: "test", language: "es" });
    expect(key1).not.toBe(key2);
  });

  it("should include source in key", () => {
    const key1 = buildCombinedSearchCacheKey({ q: "test", source: "all" });
    const key2 = buildCombinedSearchCacheKey({ q: "test", source: "google" });
    expect(key1).not.toBe(key2);
  });

  it("should be case insensitive for query", () => {
    const key1 = buildCombinedSearchCacheKey({ q: "CLEAN CODE" });
    const key2 = buildCombinedSearchCacheKey({ q: "clean code" });
    expect(key1).toBe(key2);
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have reasonable MAX_LIMIT", () => {
    expect(MAX_LIMIT).toBeGreaterThan(0);
    expect(MAX_LIMIT).toBeLessThanOrEqual(100);
  });

  it("should have reasonable DEFAULT_LIMIT", () => {
    expect(DEFAULT_LIMIT).toBeGreaterThan(0);
    expect(DEFAULT_LIMIT).toBeLessThanOrEqual(MAX_LIMIT);
  });

  it("should have reasonable MIN_QUERY_LENGTH", () => {
    expect(MIN_QUERY_LENGTH).toBeGreaterThanOrEqual(1);
    expect(MIN_QUERY_LENGTH).toBeLessThan(MAX_QUERY_LENGTH);
  });

  it("should have reasonable MAX_QUERY_LENGTH", () => {
    expect(MAX_QUERY_LENGTH).toBeGreaterThan(MIN_QUERY_LENGTH);
    expect(MAX_QUERY_LENGTH).toBeLessThanOrEqual(1000);
  });

  it("should have reasonable COMBINED_SEARCH_CACHE_TTL", () => {
    expect(COMBINED_SEARCH_CACHE_TTL).toBeGreaterThan(0);
    // Should be between 5 minutes and 1 hour
    expect(COMBINED_SEARCH_CACHE_TTL).toBeGreaterThanOrEqual(300);
    expect(COMBINED_SEARCH_CACHE_TTL).toBeLessThanOrEqual(3600);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge cases", () => {
  it("should handle books with special characters in title", () => {
    const googleBook: GoogleBookMetadata = {
      id: "special",
      title: "C++ Primer: 5th Edition (Developer's Library)",
      authors: ["Stanley B. Lippman"],
      categories: ["Programming"],
    };

    const result = normalizeGoogleBook(googleBook);
    expect(result.title).toBe("C++ Primer: 5th Edition (Developer's Library)");
  });

  it("should handle books with unicode characters", () => {
    const openLibBook: OpenLibraryBookMetadata = {
      workId: "OL999999W",
      title: "日本語の本",
      authors: [{ id: "OL1A", name: "山田太郎" }],
    };

    const result = normalizeOpenLibraryBook(openLibBook);
    expect(result.title).toBe("日本語の本");
    expect(result.authors).toEqual(["山田太郎"]);
  });

  it("should handle invalid publish date format", () => {
    const googleBook: GoogleBookMetadata = {
      id: "bad-date",
      title: "Bad Date Book",
      authors: [],
      categories: [],
      publishedDate: "unknown",
    };

    const result = normalizeGoogleBook(googleBook);
    expect(result.publishYear).toBeUndefined();
  });

  it("should handle very long author lists", () => {
    const authors = Array.from({ length: 50 }, (_, i) => `Author ${i + 1}`);
    const googleBook: GoogleBookMetadata = {
      id: "many-authors",
      title: "Many Authors Book",
      authors,
      categories: [],
    };

    const result = normalizeGoogleBook(googleBook);
    expect(result.authors).toHaveLength(50);
  });

  it("should handle empty strings in arrays", () => {
    const openLibBook: OpenLibraryBookMetadata = {
      workId: "OL888888W",
      title: "Empty Strings Book",
      authors: [{ id: "", name: "" }],
      subjects: ["", "Valid Subject", ""],
    };

    const result = normalizeOpenLibraryBook(openLibBook);
    expect(result.authors).toEqual([""]);
    expect(result.categories).toContain("");
  });

  it("should deduplicate items with very similar titles", () => {
    const items: SearchResultItem[] = [
      {
        id: "google:1",
        source: "google",
        title: "The Clean Coder",
        authors: ["Robert C. Martin"],
        categories: [],
      },
      {
        id: "openlib:1",
        source: "openlib",
        title: "THE CLEAN CODER",
        authors: ["Robert C. Martin"],
        categories: [],
        description: "Has description",
      },
    ];

    const result = deduplicateResults(items);
    expect(result).toHaveLength(1);
  });
});
