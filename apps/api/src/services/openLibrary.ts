/**
 * Open Library API Service
 *
 * Provides search, book details, and public domain book content functionality
 * using the Open Library API. Includes caching, rate limit handling, and
 * response normalization.
 *
 * @see https://openlibrary.org/developers/api
 *
 * @example
 * ```typescript
 * import { openLibrary, searchOpenLibrary, getOpenLibraryBook } from './services/openLibrary';
 *
 * // Search for books
 * const results = await searchOpenLibrary('clean code', { limit: 10 });
 *
 * // Get book details by Open Library ID
 * const book = await getOpenLibraryBook('OL123456W');
 *
 * // Get public domain book content
 * const content = await getOpenLibraryBookContent('OL123456M');
 * ```
 */

import { logger } from "../utils/logger.js";
import { cache, CacheTTL, CacheKeyPrefix, buildKey } from "./redis.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Normalized book metadata from Open Library API
 */
export type OpenLibraryBookMetadata = {
  /** Open Library Work ID (e.g., "OL123456W") */
  workId: string;
  /** Open Library Edition ID (if from edition endpoint) */
  editionId?: string;
  /** Book title */
  title: string;
  /** Book subtitle (if available) */
  subtitle?: string;
  /** List of authors with IDs */
  authors: Array<{
    id: string;
    name: string;
  }>;
  /** First publish year */
  firstPublishYear?: number;
  /** Publish year of this edition */
  publishYear?: number;
  /** List of publishers */
  publishers?: string[];
  /** ISBN-10 identifiers */
  isbn10?: string[];
  /** ISBN-13 identifiers */
  isbn13?: string[];
  /** Number of pages */
  pageCount?: number;
  /** Book subjects/genres */
  subjects?: string[];
  /** Book description */
  description?: string;
  /** Cover IDs for constructing image URLs */
  coverIds?: number[];
  /** Languages */
  languages?: string[];
  /** Number of editions */
  editionCount?: number;
  /** Whether the book is in public domain */
  isPublicDomain?: boolean;
  /** Whether full text is available */
  hasFullText?: boolean;
  /** Internet Archive identifiers for content access */
  iaIds?: string[];
  /** Average rating (if available) */
  averageRating?: number;
  /** Number of ratings */
  ratingsCount?: number;
  /** Number of times book is listed as "want to read" */
  wantToReadCount?: number;
  /** Number of times book is listed as "currently reading" */
  currentlyReadingCount?: number;
  /** Number of times book is listed as "already read" */
  alreadyReadCount?: number;
};

/**
 * Search options for Open Library API
 */
export type OpenLibrarySearchOptions = {
  /** Maximum number of results (default: 10) */
  limit?: number;
  /** Offset for pagination (0-based) */
  offset?: number;
  /** Sort order */
  sort?: "relevance" | "new" | "old" | "rating" | "editions";
  /** Filter by language (ISO 639-1 code) */
  language?: string;
  /** Search in specific fields */
  fields?: {
    /** Search in title */
    title?: string;
    /** Search by author */
    author?: string;
    /** Search by subject */
    subject?: string;
    /** Search by publisher */
    publisher?: string;
    /** Search by ISBN */
    isbn?: string;
    /** Search by first publish year */
    firstPublishYear?: number;
  };
  /** Whether to use cache (default: true) */
  useCache?: boolean;
};

/**
 * Search result from Open Library API
 */
export type OpenLibrarySearchResult = {
  /** Total number of items matching the query */
  totalItems: number;
  /** List of books in this result page */
  items: OpenLibraryBookMetadata[];
  /** Whether more results are available */
  hasMore: boolean;
  /** Offset of this result set */
  offset: number;
  /** Search query that was used */
  query: string;
};

/**
 * Public domain book content
 */
export type OpenLibraryBookContent = {
  /** Edition ID */
  editionId: string;
  /** Book title */
  title: string;
  /** Internet Archive ID */
  iaId: string;
  /** Available formats */
  formats: Array<{
    type: "epub" | "pdf" | "text" | "mobi";
    url: string;
  }>;
  /** Direct text content (if available via text format) */
  textContent?: string;
  /** Whether text content is available */
  hasTextContent: boolean;
};

/**
 * Raw search document from Open Library API
 */
type OpenLibrarySearchDocRaw = {
  key: string;
  title: string;
  subtitle?: string;
  author_name?: string[];
  author_key?: string[];
  first_publish_year?: number;
  publish_year?: number[];
  publisher?: string[];
  isbn?: string[];
  number_of_pages_median?: number;
  subject?: string[];
  cover_i?: number;
  cover_edition_key?: string;
  language?: string[];
  edition_count?: number;
  public_scan_b?: boolean;
  has_fulltext?: boolean;
  ia?: string[];
  ratings_average?: number;
  ratings_count?: number;
  want_to_read_count?: number;
  currently_reading_count?: number;
  already_read_count?: number;
};

/**
 * Raw search response from Open Library API
 */
type OpenLibrarySearchResponseRaw = {
  numFound: number;
  start: number;
  numFoundExact: boolean;
  docs: OpenLibrarySearchDocRaw[];
};

/**
 * Raw work response from Open Library API
 */
type OpenLibraryWorkRaw = {
  key: string;
  title: string;
  subtitle?: string;
  authors?: Array<{ author: { key: string } }>;
  description?: string | { value: string };
  subjects?: string[];
  covers?: number[];
  first_publish_date?: string;
};

/**
 * Raw edition response from Open Library API
 */
type OpenLibraryEditionRaw = {
  key: string;
  title: string;
  subtitle?: string;
  authors?: Array<{ key: string }>;
  publishers?: string[];
  publish_date?: string;
  number_of_pages?: number;
  isbn_10?: string[];
  isbn_13?: string[];
  covers?: number[];
  languages?: Array<{ key: string }>;
  description?: string | { value: string };
  ocaid?: string;
  ia_box_id?: string[];
};

/**
 * Raw author response from Open Library API
 */
type OpenLibraryAuthorRaw = {
  key: string;
  name: string;
  personal_name?: string;
  birth_date?: string;
  death_date?: string;
};

/**
 * Custom error for Open Library API errors
 */
export class OpenLibraryError extends Error {
  /** HTTP status code */
  statusCode: number;
  /** Error code */
  code: string | undefined;
  /** Whether the error is retryable */
  retryable: boolean;

  constructor(
    message: string,
    statusCode: number,
    code?: string,
    retryable: boolean = false
  ) {
    super(message);
    this.name = "OpenLibraryError";
    this.statusCode = statusCode;
    this.code = code;
    this.retryable = retryable;
  }
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Open Library API base URL
 */
export const OPEN_LIBRARY_API_BASE = "https://openlibrary.org";

/**
 * Internet Archive base URL for content
 */
export const INTERNET_ARCHIVE_BASE = "https://archive.org";

/**
 * Cover image base URL
 */
export const COVER_IMAGE_BASE = "https://covers.openlibrary.org";

/**
 * Default search options
 */
export const DEFAULT_OL_SEARCH_OPTIONS: Required<
  Pick<OpenLibrarySearchOptions, "limit" | "offset" | "sort" | "useCache">
> = {
  limit: 10,
  offset: 0,
  sort: "relevance",
  useCache: true,
};

/**
 * Maximum results per request
 */
export const MAX_OL_RESULTS_LIMIT = 100;

/**
 * Cache TTL for search results (15 minutes)
 */
export const OL_SEARCH_CACHE_TTL = CacheTTL.MEDIUM;

/**
 * Cache TTL for book details (1 hour)
 */
export const OL_DETAILS_CACHE_TTL = CacheTTL.LONG;

/**
 * Cache TTL for author info (1 hour)
 */
export const OL_AUTHOR_CACHE_TTL = CacheTTL.LONG;

/**
 * Rate limit: requests per second
 */
export const OL_RATE_LIMIT_RPS = 1;

/**
 * Rate limit: max retries on 429
 */
export const OL_RATE_LIMIT_MAX_RETRIES = 3;

/**
 * Base delay for exponential backoff (ms)
 */
export const OL_RATE_LIMIT_BASE_DELAY = 1000;

// ============================================================================
// Internal State
// ============================================================================

/** Last request timestamp for rate limiting */
let lastRequestTime = 0;

/** Request queue for rate limiting */
const requestQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Rate limit enforcement - ensures we don't exceed API rate limits
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const minDelay = 1000 / OL_RATE_LIMIT_RPS;
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < minDelay) {
    await new Promise((resolve) =>
      setTimeout(resolve, minDelay - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
}

/**
 * Process the request queue
 */
async function processQueue(): Promise<void> {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (request) {
      await enforceRateLimit();
      await request();
    }
  }

  isProcessingQueue = false;
}

/**
 * Make a rate-limited API request
 */
async function rateLimitedFetch(url: string): Promise<Response> {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const response = await fetch(url);
        resolve(response);
      } catch (error) {
        reject(error);
      }
    });
    processQueue().catch(reject);
  });
}

/**
 * Fetch with retry on rate limit (429) errors
 */
async function fetchWithRetry(
  url: string,
  retries: number = OL_RATE_LIMIT_MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await rateLimitedFetch(url);

      if (response.status === 429 && attempt < retries) {
        // Rate limited - exponential backoff
        const delay = OL_RATE_LIMIT_BASE_DELAY * Math.pow(2, attempt);
        logger.warn("Open Library API rate limited, retrying", {
          attempt: attempt + 1,
          maxRetries: retries,
          delayMs: delay,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        const delay = OL_RATE_LIMIT_BASE_DELAY * Math.pow(2, attempt);
        logger.warn("Open Library API request failed, retrying", {
          attempt: attempt + 1,
          maxRetries: retries,
          delayMs: delay,
          error: lastError.message,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error("Request failed after retries");
}

/**
 * Build cache key for search results
 */
function buildSearchCacheKey(
  query: string,
  options: OpenLibrarySearchOptions
): string {
  const parts = [
    query.toLowerCase().trim().replace(/\s+/g, "_"),
    `o${options.offset ?? 0}`,
    `l${options.limit ?? 10}`,
    options.language ?? "",
    options.sort ?? "",
  ].filter(Boolean);

  return buildKey(CacheKeyPrefix.SEARCH, "openlib", ...parts);
}

/**
 * Build cache key for work details
 */
function buildWorkCacheKey(workId: string): string {
  return buildKey(CacheKeyPrefix.BOOK, "openlib", "work", workId);
}

/**
 * Build cache key for edition details
 */
function buildEditionCacheKey(editionId: string): string {
  return buildKey(CacheKeyPrefix.BOOK, "openlib", "edition", editionId);
}

/**
 * Build cache key for author details
 */
function buildAuthorCacheKey(authorId: string): string {
  return buildKey(CacheKeyPrefix.BOOK, "openlib", "author", authorId);
}

/**
 * Extract text from description which can be string or { value: string }
 */
function extractDescription(
  description: string | { value: string } | undefined
): string | undefined {
  if (!description) return undefined;
  if (typeof description === "string") return description;
  return description.value;
}

/**
 * Extract Open Library ID from key (e.g., "/works/OL123456W" -> "OL123456W")
 */
function extractIdFromKey(key: string): string {
  return key.split("/").pop() ?? key;
}

/**
 * Parse year from various date formats
 */
function parseYear(dateString: string | undefined): number | undefined {
  if (!dateString) return undefined;

  // Try to extract 4-digit year
  const match = dateString.match(/\b(\d{4})\b/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }

  return undefined;
}

/**
 * Extract ISBN-10 from array (filter to 10-digit)
 */
function extractIsbn10(isbns: string[] | undefined): string[] | undefined {
  if (!isbns || isbns.length === 0) return undefined;
  const isbn10s = isbns.filter(
    (isbn) => isbn.replace(/[-\s]/g, "").length === 10
  );
  return isbn10s.length > 0 ? isbn10s : undefined;
}

/**
 * Extract ISBN-13 from array (filter to 13-digit)
 */
function extractIsbn13(isbns: string[] | undefined): string[] | undefined {
  if (!isbns || isbns.length === 0) return undefined;
  const isbn13s = isbns.filter(
    (isbn) => isbn.replace(/[-\s]/g, "").length === 13
  );
  return isbn13s.length > 0 ? isbn13s : undefined;
}

/**
 * Normalize search document to OpenLibraryBookMetadata
 */
function normalizeSearchDoc(
  doc: OpenLibrarySearchDocRaw
): OpenLibraryBookMetadata {
  const workId = extractIdFromKey(doc.key);

  // Build authors array
  const authors: OpenLibraryBookMetadata["authors"] = [];
  if (doc.author_name && doc.author_key) {
    for (let i = 0; i < doc.author_name.length; i++) {
      const authorName = doc.author_name[i];
      if (authorName) {
        authors.push({
          id: doc.author_key[i] ?? `unknown-${i}`,
          name: authorName,
        });
      }
    }
  } else if (doc.author_name) {
    doc.author_name.forEach((name, i) => {
      authors.push({
        id: `unknown-${i}`,
        name,
      });
    });
  }

  // Build result
  const result: OpenLibraryBookMetadata = {
    workId,
    title: doc.title,
    authors,
  };

  // Add optional fields
  if (doc.subtitle !== undefined) result.subtitle = doc.subtitle;
  if (doc.first_publish_year !== undefined)
    result.firstPublishYear = doc.first_publish_year;
  if (doc.publish_year && doc.publish_year.length > 0) {
    result.publishYear = Math.max(...doc.publish_year);
  }
  if (doc.publisher && doc.publisher.length > 0)
    result.publishers = doc.publisher;

  const isbn10 = extractIsbn10(doc.isbn);
  const isbn13 = extractIsbn13(doc.isbn);
  if (isbn10) result.isbn10 = isbn10;
  if (isbn13) result.isbn13 = isbn13;

  if (doc.number_of_pages_median !== undefined)
    result.pageCount = doc.number_of_pages_median;
  if (doc.subject && doc.subject.length > 0) result.subjects = doc.subject;
  if (doc.cover_i !== undefined) result.coverIds = [doc.cover_i];
  if (doc.language && doc.language.length > 0) result.languages = doc.language;
  if (doc.edition_count !== undefined) result.editionCount = doc.edition_count;
  if (doc.public_scan_b !== undefined)
    result.isPublicDomain = doc.public_scan_b;
  if (doc.has_fulltext !== undefined) result.hasFullText = doc.has_fulltext;
  if (doc.ia && doc.ia.length > 0) result.iaIds = doc.ia;
  if (doc.ratings_average !== undefined)
    result.averageRating = doc.ratings_average;
  if (doc.ratings_count !== undefined) result.ratingsCount = doc.ratings_count;
  if (doc.want_to_read_count !== undefined)
    result.wantToReadCount = doc.want_to_read_count;
  if (doc.currently_reading_count !== undefined)
    result.currentlyReadingCount = doc.currently_reading_count;
  if (doc.already_read_count !== undefined)
    result.alreadyReadCount = doc.already_read_count;

  return result;
}

/**
 * Fetch author details by author ID
 */
async function fetchAuthorDetails(
  authorId: string,
  useCache: boolean = true
): Promise<{ id: string; name: string } | null> {
  const cleanId = extractIdFromKey(authorId);
  const cacheKey = buildAuthorCacheKey(cleanId);

  if (useCache) {
    const cached = await cache.get<{ id: string; name: string }>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  try {
    const url = `${OPEN_LIBRARY_API_BASE}/authors/${cleanId}.json`;
    const response = await fetchWithRetry(url);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as OpenLibraryAuthorRaw;
    const author = {
      id: cleanId,
      name: data.name ?? data.personal_name ?? "Unknown Author",
    };

    if (useCache) {
      cache
        .set(cacheKey, author, { ttl: OL_AUTHOR_CACHE_TTL })
        .catch((error) => {
          logger.warn("Failed to cache Open Library author", {
            cacheKey,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        });
    }

    return author;
  } catch (error) {
    logger.warn("Failed to fetch Open Library author", {
      authorId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Search for books using Open Library API
 *
 * @param query - Search query string
 * @param options - Search options
 * @returns Search results with normalized book metadata
 *
 * @throws {OpenLibraryError} If API request fails
 *
 * @example
 * ```typescript
 * // Simple search
 * const results = await searchOpenLibrary('clean code');
 *
 * // Search with options
 * const results = await searchOpenLibrary('javascript', {
 *   limit: 20,
 *   language: 'eng',
 *   sort: 'new',
 * });
 *
 * // Search by author
 * const results = await searchOpenLibrary('', {
 *   fields: { author: 'Robert Martin' },
 * });
 * ```
 */
export async function searchOpenLibrary(
  query: string,
  options: OpenLibrarySearchOptions = {}
): Promise<OpenLibrarySearchResult> {
  // Merge with defaults
  const opts = { ...DEFAULT_OL_SEARCH_OPTIONS, ...options };

  // Validate options
  if (opts.limit > MAX_OL_RESULTS_LIMIT) {
    opts.limit = MAX_OL_RESULTS_LIMIT;
  }
  if (opts.limit < 1) {
    opts.limit = 1;
  }
  if (opts.offset < 0) {
    opts.offset = 0;
  }

  // Build search query
  const queryParts: string[] = [];

  if (query.trim()) {
    queryParts.push(query.trim());
  }

  if (options.fields) {
    const { fields } = options;
    if (fields.title) queryParts.push(`title:${fields.title}`);
    if (fields.author) queryParts.push(`author:${fields.author}`);
    if (fields.subject) queryParts.push(`subject:${fields.subject}`);
    if (fields.publisher) queryParts.push(`publisher:${fields.publisher}`);
    if (fields.isbn) queryParts.push(`isbn:${fields.isbn}`);
    if (fields.firstPublishYear)
      queryParts.push(`first_publish_year:${fields.firstPublishYear}`);
  }

  const searchQuery = queryParts.join(" ");

  if (!searchQuery.trim()) {
    return {
      totalItems: 0,
      items: [],
      hasMore: false,
      offset: opts.offset,
      query,
    };
  }

  // Check cache first
  const cacheKey = buildSearchCacheKey(query, opts);

  if (opts.useCache) {
    const cached = await cache.get<OpenLibrarySearchResult>(cacheKey);
    if (cached) {
      logger.debug("Open Library search cache hit", { query, cacheKey });
      return cached;
    }
  }

  // Build URL
  const params = new URLSearchParams({
    q: searchQuery,
    limit: String(opts.limit),
    offset: String(opts.offset),
  });

  if (opts.language) {
    params.set("language", opts.language);
  }

  // Add sort
  if (opts.sort && opts.sort !== "relevance") {
    const sortMap: Record<string, string> = {
      new: "new",
      old: "old",
      rating: "rating",
      editions: "editions",
    };
    const sortValue = sortMap[opts.sort];
    if (sortValue) {
      params.set("sort", sortValue);
    }
  }

  const url = `${OPEN_LIBRARY_API_BASE}/search.json?${params.toString()}`;

  logger.debug("Open Library API search request", {
    query,
    offset: opts.offset,
    limit: opts.limit,
  });

  // Make request
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    const error = new OpenLibraryError(
      `Open Library API error: ${response.status} ${response.statusText}`,
      response.status,
      undefined,
      response.status === 429 || response.status >= 500
    );
    logger.error("Open Library API search failed", {
      query,
      statusCode: error.statusCode,
      message: error.message,
    });
    throw error;
  }

  const data = (await response.json()) as OpenLibrarySearchResponseRaw;

  // Normalize results
  const items = data.docs.map(normalizeSearchDoc);

  const result: OpenLibrarySearchResult = {
    totalItems: data.numFound,
    items,
    hasMore: opts.offset + items.length < data.numFound,
    offset: opts.offset,
    query,
  };

  // Cache the result
  if (opts.useCache) {
    cache.set(cacheKey, result, { ttl: OL_SEARCH_CACHE_TTL }).catch((error) => {
      logger.warn("Failed to cache Open Library search result", {
        cacheKey,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    });
  }

  logger.info("Open Library search completed", {
    query,
    totalItems: data.numFound,
    returnedItems: items.length,
  });

  return result;
}

/**
 * Get detailed information about a specific work
 *
 * @param workId - Open Library Work ID (e.g., "OL123456W")
 * @param useCache - Whether to use cache (default: true)
 * @returns Book metadata or null if not found
 *
 * @throws {OpenLibraryError} If API request fails (except 404)
 *
 * @example
 * ```typescript
 * const book = await getOpenLibraryWork('OL123456W');
 * if (book) {
 *   // Use book.title and book.authors
 * }
 * ```
 */
export async function getOpenLibraryWork(
  workId: string,
  useCache: boolean = true
): Promise<OpenLibraryBookMetadata | null> {
  if (!workId || !workId.trim()) {
    return null;
  }

  const cleanId = extractIdFromKey(workId);
  const cacheKey = buildWorkCacheKey(cleanId);

  // Check cache first
  if (useCache) {
    const cached = await cache.get<OpenLibraryBookMetadata>(cacheKey);
    if (cached) {
      logger.debug("Open Library work cache hit", { workId, cacheKey });
      return cached;
    }
  }

  const url = `${OPEN_LIBRARY_API_BASE}/works/${cleanId}.json`;

  logger.debug("Open Library API work request", { workId });

  const response = await fetchWithRetry(url);

  if (response.status === 404) {
    logger.debug("Open Library work not found", { workId });
    return null;
  }

  if (!response.ok) {
    const error = new OpenLibraryError(
      `Open Library API error: ${response.status} ${response.statusText}`,
      response.status,
      undefined,
      response.status === 429 || response.status >= 500
    );
    logger.error("Open Library API work request failed", {
      workId,
      statusCode: error.statusCode,
      message: error.message,
    });
    throw error;
  }

  const data = (await response.json()) as OpenLibraryWorkRaw;

  // Fetch author details
  const authors: OpenLibraryBookMetadata["authors"] = [];
  if (data.authors) {
    for (const authorRef of data.authors) {
      const authorId = extractIdFromKey(authorRef.author.key);
      const authorDetails = await fetchAuthorDetails(authorId, useCache);
      if (authorDetails) {
        authors.push(authorDetails);
      }
    }
  }

  // Build metadata
  const result: OpenLibraryBookMetadata = {
    workId: cleanId,
    title: data.title,
    authors,
  };

  // Add optional fields
  if (data.subtitle !== undefined) result.subtitle = data.subtitle;
  const description = extractDescription(data.description);
  if (description) result.description = description;
  if (data.subjects && data.subjects.length > 0)
    result.subjects = data.subjects;
  if (data.covers && data.covers.length > 0) result.coverIds = data.covers;
  if (data.first_publish_date) {
    const year = parseYear(data.first_publish_date);
    if (year !== undefined) result.firstPublishYear = year;
  }

  // Cache the result
  if (useCache) {
    cache
      .set(cacheKey, result, { ttl: OL_DETAILS_CACHE_TTL })
      .catch((error) => {
        logger.warn("Failed to cache Open Library work", {
          cacheKey,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });
  }

  logger.info("Open Library work retrieved", {
    workId,
    title: result.title,
  });

  return result;
}

/**
 * Get detailed information about a specific edition
 *
 * @param editionId - Open Library Edition ID (e.g., "OL123456M")
 * @param useCache - Whether to use cache (default: true)
 * @returns Book metadata or null if not found
 *
 * @example
 * ```typescript
 * const book = await getOpenLibraryEdition('OL123456M');
 * ```
 */
export async function getOpenLibraryEdition(
  editionId: string,
  useCache: boolean = true
): Promise<OpenLibraryBookMetadata | null> {
  if (!editionId || !editionId.trim()) {
    return null;
  }

  const cleanId = extractIdFromKey(editionId);
  const cacheKey = buildEditionCacheKey(cleanId);

  // Check cache first
  if (useCache) {
    const cached = await cache.get<OpenLibraryBookMetadata>(cacheKey);
    if (cached) {
      logger.debug("Open Library edition cache hit", { editionId, cacheKey });
      return cached;
    }
  }

  const url = `${OPEN_LIBRARY_API_BASE}/books/${cleanId}.json`;

  logger.debug("Open Library API edition request", { editionId });

  const response = await fetchWithRetry(url);

  if (response.status === 404) {
    logger.debug("Open Library edition not found", { editionId });
    return null;
  }

  if (!response.ok) {
    const error = new OpenLibraryError(
      `Open Library API error: ${response.status} ${response.statusText}`,
      response.status,
      undefined,
      response.status === 429 || response.status >= 500
    );
    logger.error("Open Library API edition request failed", {
      editionId,
      statusCode: error.statusCode,
      message: error.message,
    });
    throw error;
  }

  const data = (await response.json()) as OpenLibraryEditionRaw;

  // Fetch author details
  const authors: OpenLibraryBookMetadata["authors"] = [];
  if (data.authors) {
    for (const authorRef of data.authors) {
      const authorId = extractIdFromKey(authorRef.key);
      const authorDetails = await fetchAuthorDetails(authorId, useCache);
      if (authorDetails) {
        authors.push(authorDetails);
      }
    }
  }

  // Build metadata
  const result: OpenLibraryBookMetadata = {
    workId: "", // Edition may not have work ID directly
    editionId: cleanId,
    title: data.title,
    authors,
  };

  // Add optional fields
  if (data.subtitle !== undefined) result.subtitle = data.subtitle;
  const description = extractDescription(data.description);
  if (description) result.description = description;
  if (data.publishers && data.publishers.length > 0)
    result.publishers = data.publishers;
  if (data.publish_date) {
    const year = parseYear(data.publish_date);
    if (year !== undefined) result.publishYear = year;
  }
  if (data.number_of_pages !== undefined)
    result.pageCount = data.number_of_pages;
  if (data.isbn_10 && data.isbn_10.length > 0) result.isbn10 = data.isbn_10;
  if (data.isbn_13 && data.isbn_13.length > 0) result.isbn13 = data.isbn_13;
  if (data.covers && data.covers.length > 0) result.coverIds = data.covers;
  if (data.languages && data.languages.length > 0) {
    result.languages = data.languages.map((lang) => extractIdFromKey(lang.key));
  }
  if (data.ocaid) {
    result.iaIds = [data.ocaid];
    result.hasFullText = true;
    result.isPublicDomain = true;
  }

  // Cache the result
  if (useCache) {
    cache
      .set(cacheKey, result, { ttl: OL_DETAILS_CACHE_TTL })
      .catch((error) => {
        logger.warn("Failed to cache Open Library edition", {
          cacheKey,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });
  }

  logger.info("Open Library edition retrieved", {
    editionId,
    title: result.title,
  });

  return result;
}

/**
 * Get public domain book content from Internet Archive
 *
 * @param editionId - Open Library Edition ID with Internet Archive content
 * @returns Book content info or null if not available
 *
 * @example
 * ```typescript
 * const content = await getOpenLibraryBookContent('OL123456M');
 * if (content && content.formats.length > 0) {
 *   const epubUrl = content.formats.find(f => f.type === 'epub')?.url;
 * }
 * ```
 */
export async function getOpenLibraryBookContent(
  editionId: string
): Promise<OpenLibraryBookContent | null> {
  if (!editionId || !editionId.trim()) {
    return null;
  }

  // First get the edition to find the Internet Archive ID
  const edition = await getOpenLibraryEdition(editionId, true);

  const iaId = edition?.iaIds?.[0];
  if (!edition || !iaId) {
    logger.debug("No Internet Archive content for edition", { editionId });
    return null;
  }

  // Fetch metadata from Internet Archive
  const metadataUrl = `${INTERNET_ARCHIVE_BASE}/metadata/${iaId}`;

  logger.debug("Fetching Internet Archive metadata", { iaId });

  const response = await fetchWithRetry(metadataUrl);

  if (response.status === 404) {
    logger.debug("Internet Archive item not found", { iaId });
    return null;
  }

  if (!response.ok) {
    logger.warn("Failed to fetch Internet Archive metadata", {
      iaId,
      status: response.status,
    });
    return null;
  }

  interface IAMetadata {
    metadata?: {
      title?: string;
    };
    files?: Array<{
      name: string;
      format?: string;
    }>;
  }

  const metadata = (await response.json()) as IAMetadata;

  // Build formats array based on available files
  const formats: OpenLibraryBookContent["formats"] = [];
  const files = metadata.files ?? [];

  for (const file of files) {
    const fileName = file.name.toLowerCase();
    const downloadUrl = `${INTERNET_ARCHIVE_BASE}/download/${iaId}/${encodeURIComponent(file.name)}`;

    if (fileName.endsWith(".epub")) {
      formats.push({ type: "epub", url: downloadUrl });
    } else if (fileName.endsWith(".pdf")) {
      formats.push({ type: "pdf", url: downloadUrl });
    } else if (fileName.endsWith(".mobi")) {
      formats.push({ type: "mobi", url: downloadUrl });
    } else if (
      fileName.endsWith(".txt") ||
      file.format === "Text" ||
      file.format === "DjVuTXT"
    ) {
      formats.push({ type: "text", url: downloadUrl });
    }
  }

  const result: OpenLibraryBookContent = {
    editionId: extractIdFromKey(editionId),
    title: edition.title,
    iaId,
    formats,
    hasTextContent: formats.some((f) => f.type === "text"),
  };

  logger.info("Open Library book content retrieved", {
    editionId,
    iaId,
    formatCount: formats.length,
  });

  return result;
}

/**
 * Search for a book by ISBN
 *
 * @param isbn - ISBN-10 or ISBN-13
 * @param useCache - Whether to use cache (default: true)
 * @returns Book metadata or null if not found
 *
 * @example
 * ```typescript
 * const book = await searchOpenLibraryByISBN('9780132350884');
 * ```
 */
export async function searchOpenLibraryByISBN(
  isbn: string,
  useCache: boolean = true
): Promise<OpenLibraryBookMetadata | null> {
  // Clean ISBN (remove hyphens and spaces)
  const cleanIsbn = isbn.replace(/[-\s]/g, "");

  if (!cleanIsbn || (cleanIsbn.length !== 10 && cleanIsbn.length !== 13)) {
    return null;
  }

  const results = await searchOpenLibrary("", {
    fields: { isbn: cleanIsbn },
    limit: 1,
    useCache,
  });

  return results.items[0] ?? null;
}

/**
 * Search for books by author name
 *
 * @param author - Author name
 * @param options - Additional search options
 * @returns Search results
 *
 * @example
 * ```typescript
 * const results = await searchOpenLibraryByAuthor('Robert C. Martin', { limit: 20 });
 * ```
 */
export async function searchOpenLibraryByAuthor(
  author: string,
  options: Omit<OpenLibrarySearchOptions, "fields"> = {}
): Promise<OpenLibrarySearchResult> {
  return searchOpenLibrary("", {
    ...options,
    fields: { author },
  });
}

/**
 * Search for books by title
 *
 * @param title - Book title
 * @param options - Additional search options
 * @returns Search results
 *
 * @example
 * ```typescript
 * const results = await searchOpenLibraryByTitle('Clean Code');
 * ```
 */
export async function searchOpenLibraryByTitle(
  title: string,
  options: Omit<OpenLibrarySearchOptions, "fields"> = {}
): Promise<OpenLibrarySearchResult> {
  return searchOpenLibrary("", {
    ...options,
    fields: { title },
  });
}

/**
 * Get cover image URL for a book
 *
 * @param coverId - Cover ID from book metadata
 * @param size - Image size (S, M, L)
 * @returns Cover image URL
 *
 * @example
 * ```typescript
 * const coverUrl = getOpenLibraryCoverUrl(12345678, 'M');
 * ```
 */
export function getOpenLibraryCoverUrl(
  coverId: number,
  size: "S" | "M" | "L" = "M"
): string {
  return `${COVER_IMAGE_BASE}/b/id/${coverId}-${size}.jpg`;
}

/**
 * Get best cover URL from book metadata
 *
 * @param metadata - Book metadata
 * @param size - Image size (S, M, L)
 * @returns Cover URL or undefined if no covers
 */
export function getBestOpenLibraryCoverUrl(
  metadata: OpenLibraryBookMetadata,
  size: "S" | "M" | "L" = "M"
): string | undefined {
  const firstCoverId = metadata.coverIds?.[0];
  if (firstCoverId === undefined) {
    return undefined;
  }
  return getOpenLibraryCoverUrl(firstCoverId, size);
}

/**
 * Invalidate cached search results for a query
 *
 * @param query - Search query to invalidate
 */
export async function invalidateOpenLibrarySearchCache(
  query: string
): Promise<void> {
  const pattern = buildKey(
    CacheKeyPrefix.SEARCH,
    "openlib",
    query.toLowerCase().trim().replace(/\s+/g, "_"),
    "*"
  );
  await cache.invalidatePattern(pattern);
}

/**
 * Invalidate cached work details
 *
 * @param workId - Open Library Work ID
 */
export async function invalidateOpenLibraryWorkCache(
  workId: string
): Promise<void> {
  const cacheKey = buildWorkCacheKey(extractIdFromKey(workId));
  await cache.del(cacheKey);
}

/**
 * Invalidate cached edition details
 *
 * @param editionId - Open Library Edition ID
 */
export async function invalidateOpenLibraryEditionCache(
  editionId: string
): Promise<void> {
  const cacheKey = buildEditionCacheKey(extractIdFromKey(editionId));
  await cache.del(cacheKey);
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Main Open Library service object
 */
export const openLibrary = {
  // Search functions
  search: searchOpenLibrary,
  searchOpenLibrary,
  searchByISBN: searchOpenLibraryByISBN,
  searchByAuthor: searchOpenLibraryByAuthor,
  searchByTitle: searchOpenLibraryByTitle,

  // Details functions
  getWork: getOpenLibraryWork,
  getEdition: getOpenLibraryEdition,
  getBookContent: getOpenLibraryBookContent,

  // Utility functions
  getCoverUrl: getOpenLibraryCoverUrl,
  getBestCoverUrl: getBestOpenLibraryCoverUrl,

  // Cache invalidation
  invalidateSearchCache: invalidateOpenLibrarySearchCache,
  invalidateWorkCache: invalidateOpenLibraryWorkCache,
  invalidateEditionCache: invalidateOpenLibraryEditionCache,
} as const;

/**
 * Open Library service utilities
 */
export const openLibraryUtils = {
  getCoverUrl: getOpenLibraryCoverUrl,
  getBestCoverUrl: getBestOpenLibraryCoverUrl,
  extractIdFromKey,
  parseYear,
} as const;
