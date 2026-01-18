/**
 * GET /api/books/search
 *
 * Search for books in Google Books and Open Library APIs.
 *
 * This endpoint:
 * - Accepts a search query and optional filters
 * - Searches both Google Books and Open Library in parallel
 * - Combines and deduplicates results
 * - Caches results in Redis for performance
 * - Returns normalized book metadata
 *
 * @example
 * ```bash
 * curl -X GET "/api/books/search?q=clean+code&limit=10" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.js";
import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import {
  searchBooks as searchGoogleBooks,
  getBestImageUrl,
  type GoogleBookMetadata,
} from "../../src/services/googleBooks.js";
import {
  searchOpenLibrary,
  getBestOpenLibraryCoverUrl,
  type OpenLibraryBookMetadata,
} from "../../src/services/openLibrary.js";
import {
  cache,
  CacheTTL,
  CacheKeyPrefix,
  buildKey,
} from "../../src/services/redis.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum results per page
 */
const MAX_LIMIT = 40;

/**
 * Default results per page
 */
const DEFAULT_LIMIT = 10;

/**
 * Cache TTL for combined search results (15 minutes)
 */
const COMBINED_SEARCH_CACHE_TTL = CacheTTL.MEDIUM;

/**
 * Minimum query length
 */
const MIN_QUERY_LENGTH = 1;

/**
 * Maximum query length
 */
const MAX_QUERY_LENGTH = 500;

// ============================================================================
// Types
// ============================================================================

/**
 * Normalized search result item
 */
export type SearchResultItem = {
  /** Unique identifier (prefixed with source) */
  id: string;
  /** Source of the result */
  source: "google" | "openlib";
  /** Book title */
  title: string;
  /** Book subtitle */
  subtitle?: string;
  /** List of authors */
  authors: string[];
  /** Book description */
  description?: string;
  /** Publication year */
  publishYear?: number;
  /** Publisher */
  publisher?: string;
  /** ISBN-10 */
  isbn10?: string;
  /** ISBN-13 */
  isbn13?: string;
  /** Number of pages */
  pageCount?: number;
  /** Book categories/subjects */
  categories: string[];
  /** Cover image URL */
  coverImage?: string;
  /** Language code */
  language?: string;
  /** Average rating (0-5) */
  averageRating?: number;
  /** Number of ratings */
  ratingsCount?: number;
  /** Whether full text is available (for Open Library) */
  hasFullText?: boolean;
  /** Whether it's in public domain (for Open Library) */
  isPublicDomain?: boolean;
  /** Preview link (for Google Books) */
  previewLink?: string;
};

/**
 * Combined search results
 */
export type CombinedSearchResult = {
  /** Total estimated items (combined from both sources) */
  totalItems: number;
  /** Normalized search results */
  items: SearchResultItem[];
  /** Current offset */
  offset: number;
  /** Items per page */
  limit: number;
  /** Whether more results are available */
  hasMore: boolean;
  /** Search query */
  query: string;
  /** Sources that were searched */
  sources: {
    google: { available: boolean; count: number };
    openlib: { available: boolean; count: number };
  };
};

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Search query params validation schema
 */
const searchQuerySchema = z.object({
  q: z
    .string()
    .min(MIN_QUERY_LENGTH, "Search query is required")
    .max(
      MAX_QUERY_LENGTH,
      `Query must be at most ${MAX_QUERY_LENGTH} characters`
    ),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT)
    .optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
  language: z.string().length(2).optional(),
  source: z.enum(["all", "google", "openlib"]).default("all").optional(),
});

/**
 * Type for validated search params
 */
type SearchQueryParams = z.infer<typeof searchQuerySchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build cache key for combined search
 */
function buildCombinedSearchCacheKey(params: SearchQueryParams): string {
  const parts = [
    params.q.toLowerCase().trim().replace(/\s+/g, "_"),
    `o${params.offset ?? 0}`,
    `l${params.limit ?? DEFAULT_LIMIT}`,
    params.language ?? "",
    params.source ?? "all",
  ].filter(Boolean);

  return buildKey(CacheKeyPrefix.SEARCH, "combined", ...parts);
}

/**
 * Normalize Google Books result to common format
 */
function normalizeGoogleBook(book: GoogleBookMetadata): SearchResultItem {
  const result: SearchResultItem = {
    id: `google:${book.id}`,
    source: "google",
    title: book.title,
    authors: book.authors,
    categories: book.categories,
  };

  // Add optional fields
  if (book.subtitle) result.subtitle = book.subtitle;
  if (book.description) result.description = book.description;
  if (book.publishedDate) {
    const year = parseInt(book.publishedDate.split("-")[0] || "", 10);
    if (!isNaN(year)) result.publishYear = year;
  }
  if (book.publisher) result.publisher = book.publisher;
  if (book.isbn10) result.isbn10 = book.isbn10;
  if (book.isbn13) result.isbn13 = book.isbn13;
  if (book.pageCount) result.pageCount = book.pageCount;
  if (book.language) result.language = book.language;
  if (book.averageRating !== undefined)
    result.averageRating = book.averageRating;
  if (book.ratingsCount !== undefined) result.ratingsCount = book.ratingsCount;
  if (book.previewLink) result.previewLink = book.previewLink;

  // Get best cover image
  const coverUrl = getBestImageUrl(book.imageLinks, "medium");
  if (coverUrl) result.coverImage = coverUrl;

  return result;
}

/**
 * Normalize Open Library result to common format
 */
function normalizeOpenLibraryBook(
  book: OpenLibraryBookMetadata
): SearchResultItem {
  const result: SearchResultItem = {
    id: `openlib:${book.workId}`,
    source: "openlib",
    title: book.title,
    authors: book.authors.map((a) => a.name),
    categories: book.subjects ?? [],
  };

  // Add optional fields
  if (book.subtitle) result.subtitle = book.subtitle;
  if (book.description) result.description = book.description;
  if (book.firstPublishYear) result.publishYear = book.firstPublishYear;
  const firstPublisher = book.publishers?.[0];
  if (firstPublisher) {
    result.publisher = firstPublisher;
  }
  const firstIsbn10 = book.isbn10?.[0];
  const firstIsbn13 = book.isbn13?.[0];
  if (firstIsbn10) result.isbn10 = firstIsbn10;
  if (firstIsbn13) result.isbn13 = firstIsbn13;
  if (book.pageCount) result.pageCount = book.pageCount;
  const firstLanguage = book.languages?.[0];
  if (firstLanguage) {
    result.language = firstLanguage;
  }
  if (book.averageRating !== undefined)
    result.averageRating = book.averageRating;
  if (book.ratingsCount !== undefined) result.ratingsCount = book.ratingsCount;
  if (book.hasFullText) result.hasFullText = book.hasFullText;
  if (book.isPublicDomain) result.isPublicDomain = book.isPublicDomain;

  // Get best cover image
  const coverUrl = getBestOpenLibraryCoverUrl(book, "M");
  if (coverUrl) result.coverImage = coverUrl;

  return result;
}

/**
 * Generate a deduplication key from a search result
 * Uses ISBN if available, otherwise title+author combination
 */
function getDeduplicationKey(item: SearchResultItem): string {
  // Prefer ISBN-13 for deduplication
  if (item.isbn13) {
    return `isbn:${item.isbn13.replace(/[-\s]/g, "")}`;
  }
  // Fall back to ISBN-10
  if (item.isbn10) {
    return `isbn:${item.isbn10.replace(/[-\s]/g, "")}`;
  }
  // Use title + first author as fallback
  const normalizedTitle = item.title.toLowerCase().trim().replace(/\s+/g, " ");
  const firstAuthor = (item.authors[0] ?? "").toLowerCase().trim();
  return `title:${normalizedTitle}|author:${firstAuthor}`;
}

/**
 * Deduplicate search results, preferring items with more data
 */
function deduplicateResults(items: SearchResultItem[]): SearchResultItem[] {
  const seen = new Map<string, SearchResultItem>();

  for (const item of items) {
    const key = getDeduplicationKey(item);
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, item);
    } else {
      // Keep the item with more information
      const existingScore = scoreItem(existing);
      const newScore = scoreItem(item);

      if (newScore > existingScore) {
        seen.set(key, item);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Score a search result based on completeness of data
 * Higher score = more complete data
 */
function scoreItem(item: SearchResultItem): number {
  let score = 0;

  if (item.description) score += 3;
  if (item.coverImage) score += 3;
  if (item.isbn13) score += 2;
  if (item.isbn10) score += 1;
  if (item.pageCount) score += 1;
  if (item.publisher) score += 1;
  if (item.publishYear) score += 1;
  if (item.averageRating !== undefined) score += 1;
  if (item.authors.length > 0) score += 1;
  if (item.categories.length > 0) score += 1;
  if (item.hasFullText) score += 2; // Bonus for having full text available

  return score;
}

/**
 * Sort search results by relevance/quality
 */
function sortResults(items: SearchResultItem[]): SearchResultItem[] {
  return items.sort((a, b) => {
    // Prioritize items with cover images
    if (a.coverImage && !b.coverImage) return -1;
    if (!a.coverImage && b.coverImage) return 1;

    // Then by completeness score
    const scoreA = scoreItem(a);
    const scoreB = scoreItem(b);
    if (scoreA !== scoreB) return scoreB - scoreA;

    // Then by rating count (popularity)
    const ratingsA = a.ratingsCount ?? 0;
    const ratingsB = b.ratingsCount ?? 0;
    return ratingsB - ratingsA;
  });
}

/**
 * Execute searches in parallel and combine results
 */
async function searchBothSources(
  query: string,
  limit: number,
  offset: number,
  language?: string,
  source: "all" | "google" | "openlib" = "all"
): Promise<CombinedSearchResult> {
  // Calculate limit per source when searching both
  // Request more from each to account for deduplication
  const perSourceLimit = source === "all" ? Math.ceil(limit * 1.5) : limit;
  const perSourceOffset = source === "all" ? Math.floor(offset / 2) : offset;

  // Build Google Books options - only include langRestrict if language is defined
  const googleOptions: Parameters<typeof searchGoogleBooks>[1] = {
    maxResults: Math.min(perSourceLimit, 40),
    startIndex: perSourceOffset,
    useCache: true,
  };
  if (language) {
    googleOptions.langRestrict = language;
  }

  const googlePromise =
    source === "all" || source === "google"
      ? searchGoogleBooks(query, googleOptions).catch((error) => {
          logger.warn("Google Books search failed", {
            query,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return null;
        })
      : Promise.resolve(null);

  // Build Open Library options - only include language if defined
  const openLibOptions: Parameters<typeof searchOpenLibrary>[1] = {
    limit: Math.min(perSourceLimit, 100),
    offset: perSourceOffset,
    useCache: true,
  };
  if (language) {
    openLibOptions.language = language;
  }

  const openLibPromise =
    source === "all" || source === "openlib"
      ? searchOpenLibrary(query, openLibOptions).catch((error) => {
          logger.warn("Open Library search failed", {
            query,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return null;
        })
      : Promise.resolve(null);

  // Execute searches in parallel
  const [googleResult, openLibResult] = await Promise.all([
    googlePromise,
    openLibPromise,
  ]);

  // Normalize results
  const normalizedItems: SearchResultItem[] = [];

  if (googleResult) {
    for (const book of googleResult.items) {
      normalizedItems.push(normalizeGoogleBook(book));
    }
  }

  if (openLibResult) {
    for (const book of openLibResult.items) {
      normalizedItems.push(normalizeOpenLibraryBook(book));
    }
  }

  // Deduplicate and sort
  const deduplicated = deduplicateResults(normalizedItems);
  const sorted = sortResults(deduplicated);

  // Apply final limit (after deduplication)
  const finalItems = sorted.slice(0, limit);

  // Calculate total (estimated, since we're combining sources)
  const googleTotal = googleResult?.totalItems ?? 0;
  const openLibTotal = openLibResult?.totalItems ?? 0;
  // Use max of the two as estimate (not sum, since there's overlap)
  const estimatedTotal = Math.max(googleTotal, openLibTotal);

  return {
    totalItems: estimatedTotal,
    items: finalItems,
    offset,
    limit,
    hasMore: offset + finalItems.length < estimatedTotal,
    query,
    sources: {
      google: {
        available: googleResult !== null,
        count: googleResult?.items.length ?? 0,
      },
      openlib: {
        available: openLibResult !== null,
        count: openLibResult?.items.length ?? 0,
      },
    },
  };
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle search request
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET
  if (req.method !== "GET") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET.",
      405
    );
    return;
  }

  try {
    // Parse and validate query params
    const validationResult = searchQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid query parameters",
        400,
        validationResult.error.flatten()
      );
      return;
    }

    const params: SearchQueryParams = validationResult.data;
    const query = params.q.trim();
    const limit = params.limit ?? DEFAULT_LIMIT;
    const offset = params.offset ?? 0;
    const language = params.language;
    const source = params.source ?? "all";

    // Check cache first
    const cacheKey = buildCombinedSearchCacheKey(params);
    const cached = await cache.get<CombinedSearchResult>(cacheKey);

    if (cached) {
      logger.debug("Combined search cache hit", { query, cacheKey });
      sendSuccess(res, cached);
      return;
    }

    // Execute search
    const result = await searchBothSources(
      query,
      limit,
      offset,
      language,
      source
    );

    // Cache the result (don't await)
    cache
      .set(cacheKey, result, { ttl: COMBINED_SEARCH_CACHE_TTL })
      .catch((error) => {
        logger.warn("Failed to cache combined search result", {
          cacheKey,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });

    logger.info("Book search completed", {
      query,
      limit,
      offset,
      source,
      resultCount: result.items.length,
      googleCount: result.sources.google.count,
      openLibCount: result.sources.openlib.count,
    });

    sendSuccess(res, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error searching books", {
      query: req.query?.q,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to search books. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  searchQuerySchema,
  normalizeGoogleBook,
  normalizeOpenLibraryBook,
  getDeduplicationKey,
  deduplicateResults,
  scoreItem,
  sortResults,
  searchBothSources,
  buildCombinedSearchCacheKey,
  MAX_LIMIT,
  DEFAULT_LIMIT,
  MIN_QUERY_LENGTH,
  MAX_QUERY_LENGTH,
  COMBINED_SEARCH_CACHE_TTL,
  type SearchQueryParams,
};
