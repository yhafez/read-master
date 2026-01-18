/**
 * Google Books API Service
 *
 * Provides search and book details functionality using the Google Books API.
 * Includes caching, rate limit handling, and response normalization.
 *
 * @see https://developers.google.com/books/docs/v1/reference
 *
 * @example
 * ```typescript
 * import { googleBooks, searchBooks, getBookDetails } from './services/googleBooks';
 *
 * // Search for books
 * const results = await searchBooks('clean code', { maxResults: 10 });
 *
 * // Get book details by Google Books ID
 * const book = await getBookDetails('xxxxxxxx');
 * ```
 */

import { logger } from "../utils/logger.js";
import { cache, CacheTTL, CacheKeyPrefix, buildKey } from "./redis.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Normalized book metadata from Google Books API
 */
export type GoogleBookMetadata = {
  /** Google Books volume ID */
  id: string;
  /** Book title */
  title: string;
  /** Book subtitle (if available) */
  subtitle?: string;
  /** List of authors */
  authors: string[];
  /** Book publisher */
  publisher?: string;
  /** Publication date (may be partial, e.g., "2020" or "2020-01-15") */
  publishedDate?: string;
  /** Book description (may contain HTML) */
  description?: string;
  /** ISBN-10 identifier */
  isbn10?: string;
  /** ISBN-13 identifier */
  isbn13?: string;
  /** Number of pages */
  pageCount?: number;
  /** Book categories/genres */
  categories: string[];
  /** Average rating (0-5) */
  averageRating?: number;
  /** Number of ratings */
  ratingsCount?: number;
  /** Language code (e.g., "en") */
  language?: string;
  /** Preview link to Google Books */
  previewLink?: string;
  /** Information link to Google Books */
  infoLink?: string;
  /** Book cover image URLs */
  imageLinks?: {
    /** Small thumbnail (approx. 80px) */
    smallThumbnail?: string;
    /** Regular thumbnail (approx. 128px) */
    thumbnail?: string;
    /** Small preview (approx. 240px) */
    small?: string;
    /** Medium preview (approx. 400px) */
    medium?: string;
    /** Large preview (approx. 575px) */
    large?: string;
    /** Extra large preview */
    extraLarge?: string;
  };
  /** Maturity rating (e.g., "NOT_MATURE") */
  maturityRating?: string;
  /** Content version */
  contentVersion?: string;
  /** Whether the book is an ebook */
  isEbook?: boolean;
  /** Whether the book is available for sale */
  saleability?: string;
  /** Sale price if available */
  price?: {
    amount: number;
    currencyCode: string;
  };
  /** Whether text can be read in the preview */
  isTextReadable?: boolean;
  /** Whether a PDF is available */
  isPdfAvailable?: boolean;
  /** Whether an EPUB is available */
  isEpubAvailable?: boolean;
};

/**
 * Search options for Google Books API
 */
export type GoogleBooksSearchOptions = {
  /** Maximum number of results (1-40, default: 10) */
  maxResults?: number;
  /** Start index for pagination (0-based) */
  startIndex?: number;
  /** Filter by language (ISO 639-1 code) */
  langRestrict?: string;
  /** Order results by relevance or newest */
  orderBy?: "relevance" | "newest";
  /** Filter by print type */
  printType?: "all" | "books" | "magazines";
  /** Filter by available download formats */
  filter?: "partial" | "full" | "free-ebooks" | "paid-ebooks" | "ebooks";
  /** Search in specific fields */
  inField?: {
    /** Search in title */
    title?: string;
    /** Search by author */
    author?: string;
    /** Search by publisher */
    publisher?: string;
    /** Search by subject/category */
    subject?: string;
    /** Search by ISBN */
    isbn?: string;
  };
  /** Whether to use cache (default: true) */
  useCache?: boolean;
};

/**
 * Search result from Google Books API
 */
export type GoogleBooksSearchResult = {
  /** Total number of items matching the query */
  totalItems: number;
  /** List of books in this result page */
  items: GoogleBookMetadata[];
  /** Whether more results are available */
  hasMore: boolean;
  /** Start index of this result set */
  startIndex: number;
  /** Search query that was used */
  query: string;
};

/**
 * Raw volume item from Google Books API
 */
type GoogleBooksVolumeRaw = {
  kind: string;
  id: string;
  etag?: string;
  selfLink?: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    language?: string;
    previewLink?: string;
    infoLink?: string;
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
    maturityRating?: string;
    contentVersion?: string;
  };
  saleInfo?: {
    isEbook?: boolean;
    saleability?: string;
    listPrice?: {
      amount: number;
      currencyCode: string;
    };
    retailPrice?: {
      amount: number;
      currencyCode: string;
    };
  };
  accessInfo?: {
    textToSpeechPermission?: string;
    epub?: {
      isAvailable?: boolean;
      acsTokenLink?: string;
    };
    pdf?: {
      isAvailable?: boolean;
      acsTokenLink?: string;
    };
    webReaderLink?: string;
    accessViewStatus?: string;
    quoteSharingAllowed?: boolean;
  };
};

/**
 * Raw search response from Google Books API
 */
type GoogleBooksSearchResponseRaw = {
  kind: string;
  totalItems: number;
  items?: GoogleBooksVolumeRaw[];
};

/**
 * Error response from Google Books API
 */
type GoogleBooksErrorResponse = {
  error?: {
    code: number;
    message: string;
    errors?: Array<{
      domain: string;
      reason: string;
      message: string;
    }>;
  };
};

/**
 * Custom error for Google Books API errors
 */
export class GoogleBooksError extends Error {
  /** HTTP status code */
  statusCode: number;
  /** Error code from API */
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
    this.name = "GoogleBooksError";
    this.statusCode = statusCode;
    this.code = code;
    this.retryable = retryable;
  }
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Google Books API base URL
 */
export const GOOGLE_BOOKS_API_BASE = "https://www.googleapis.com/books/v1";

/**
 * Default search options
 */
export const DEFAULT_SEARCH_OPTIONS: Required<
  Pick<
    GoogleBooksSearchOptions,
    "maxResults" | "startIndex" | "orderBy" | "printType" | "useCache"
  >
> = {
  maxResults: 10,
  startIndex: 0,
  orderBy: "relevance",
  printType: "books",
  useCache: true,
};

/**
 * Maximum results per request (API limit)
 */
export const MAX_RESULTS_LIMIT = 40;

/**
 * Cache TTL for search results (15 minutes)
 */
export const SEARCH_CACHE_TTL = CacheTTL.MEDIUM;

/**
 * Cache TTL for book details (1 hour)
 */
export const DETAILS_CACHE_TTL = CacheTTL.LONG;

/**
 * Rate limit: requests per second
 */
export const RATE_LIMIT_RPS = 1;

/**
 * Rate limit: max retries on 429
 */
export const RATE_LIMIT_MAX_RETRIES = 3;

/**
 * Base delay for exponential backoff (ms)
 */
export const RATE_LIMIT_BASE_DELAY = 1000;

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
 * Get the Google Books API key from environment
 */
function getApiKey(): string | null {
  return process.env.GOOGLE_BOOKS_API_KEY || null;
}

/**
 * Check if Google Books API is configured
 */
export function isGoogleBooksConfigured(): boolean {
  return getApiKey() !== null;
}

/**
 * Build cache key for search results
 */
function buildSearchCacheKey(
  query: string,
  options: GoogleBooksSearchOptions
): string {
  const parts = [
    query.toLowerCase().trim().replace(/\s+/g, "_"),
    `s${options.startIndex ?? 0}`,
    `m${options.maxResults ?? 10}`,
    options.langRestrict ?? "",
    options.orderBy ?? "",
    options.filter ?? "",
  ].filter(Boolean);

  return buildKey(CacheKeyPrefix.SEARCH, "google", ...parts);
}

/**
 * Build cache key for book details
 */
function buildDetailsCacheKey(volumeId: string): string {
  return buildKey(CacheKeyPrefix.BOOK, "google", volumeId);
}

/**
 * Rate limit enforcement - ensures we don't exceed API rate limits
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const minDelay = 1000 / RATE_LIMIT_RPS;
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
  retries: number = RATE_LIMIT_MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await rateLimitedFetch(url);

      if (response.status === 429 && attempt < retries) {
        // Rate limited - exponential backoff
        const delay = RATE_LIMIT_BASE_DELAY * Math.pow(2, attempt);
        logger.warn("Google Books API rate limited, retrying", {
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
        const delay = RATE_LIMIT_BASE_DELAY * Math.pow(2, attempt);
        logger.warn("Google Books API request failed, retrying", {
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
 * Parse API error response
 */
async function parseErrorResponse(
  response: Response
): Promise<GoogleBooksError> {
  let errorMessage = `Google Books API error: ${response.status} ${response.statusText}`;
  let errorCode: string | undefined;

  try {
    const errorData = (await response.json()) as GoogleBooksErrorResponse;
    if (errorData.error) {
      errorMessage = errorData.error.message;
      errorCode = errorData.error.errors?.[0]?.reason;
    }
  } catch {
    // Ignore JSON parse errors
  }

  const retryable = response.status === 429 || response.status >= 500;

  return new GoogleBooksError(
    errorMessage,
    response.status,
    errorCode,
    retryable
  );
}

/**
 * Upgrade image URL to HTTPS and higher quality
 */
function upgradeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  // Upgrade to HTTPS
  let upgraded = url.replace(/^http:/, "https:");

  // Try to get higher quality image by adjusting zoom parameter
  upgraded = upgraded.replace(/&zoom=\d/, "&zoom=1");

  return upgraded;
}

/**
 * Normalize raw volume data to GoogleBookMetadata
 */
function normalizeVolume(raw: GoogleBooksVolumeRaw): GoogleBookMetadata {
  const volumeInfo = raw.volumeInfo ?? {};
  const saleInfo = raw.saleInfo ?? {};
  const accessInfo = raw.accessInfo ?? {};

  // Extract ISBN identifiers
  const industryIds = volumeInfo.industryIdentifiers ?? [];
  const isbn10 = industryIds.find((id) => id.type === "ISBN_10")?.identifier;
  const isbn13 = industryIds.find((id) => id.type === "ISBN_13")?.identifier;

  // Upgrade image URLs to HTTPS and higher quality
  // Filter out undefined values to satisfy exactOptionalPropertyTypes
  let imageLinks: GoogleBookMetadata["imageLinks"];
  if (volumeInfo.imageLinks) {
    const links: NonNullable<GoogleBookMetadata["imageLinks"]> = {};
    const smallThumbnail = upgradeImageUrl(
      volumeInfo.imageLinks.smallThumbnail
    );
    const thumbnail = upgradeImageUrl(volumeInfo.imageLinks.thumbnail);
    const small = upgradeImageUrl(volumeInfo.imageLinks.small);
    const medium = upgradeImageUrl(volumeInfo.imageLinks.medium);
    const large = upgradeImageUrl(volumeInfo.imageLinks.large);
    const extraLarge = upgradeImageUrl(volumeInfo.imageLinks.extraLarge);

    if (smallThumbnail) links.smallThumbnail = smallThumbnail;
    if (thumbnail) links.thumbnail = thumbnail;
    if (small) links.small = small;
    if (medium) links.medium = medium;
    if (large) links.large = large;
    if (extraLarge) links.extraLarge = extraLarge;

    imageLinks = Object.keys(links).length > 0 ? links : undefined;
  }

  // Build result object, only including defined values for optional properties
  const result: GoogleBookMetadata = {
    id: raw.id,
    title: volumeInfo.title ?? "Unknown Title",
    authors: volumeInfo.authors ?? [],
    categories: volumeInfo.categories ?? [],
  };

  // Add optional string properties only if defined
  if (volumeInfo.subtitle !== undefined) result.subtitle = volumeInfo.subtitle;
  if (volumeInfo.publisher !== undefined)
    result.publisher = volumeInfo.publisher;
  if (volumeInfo.publishedDate !== undefined)
    result.publishedDate = volumeInfo.publishedDate;
  if (volumeInfo.description !== undefined)
    result.description = volumeInfo.description;
  if (isbn10 !== undefined) result.isbn10 = isbn10;
  if (isbn13 !== undefined) result.isbn13 = isbn13;
  if (volumeInfo.pageCount !== undefined)
    result.pageCount = volumeInfo.pageCount;
  if (volumeInfo.averageRating !== undefined)
    result.averageRating = volumeInfo.averageRating;
  if (volumeInfo.ratingsCount !== undefined)
    result.ratingsCount = volumeInfo.ratingsCount;
  if (volumeInfo.language !== undefined) result.language = volumeInfo.language;
  if (volumeInfo.previewLink !== undefined)
    result.previewLink = volumeInfo.previewLink;
  if (volumeInfo.infoLink !== undefined) result.infoLink = volumeInfo.infoLink;
  if (imageLinks !== undefined) result.imageLinks = imageLinks;
  if (volumeInfo.maturityRating !== undefined)
    result.maturityRating = volumeInfo.maturityRating;
  if (volumeInfo.contentVersion !== undefined)
    result.contentVersion = volumeInfo.contentVersion;

  // Add optional boolean/object properties from saleInfo
  if (saleInfo.isEbook !== undefined) result.isEbook = saleInfo.isEbook;
  if (saleInfo.saleability !== undefined)
    result.saleability = saleInfo.saleability;
  const price = saleInfo.retailPrice ?? saleInfo.listPrice;
  if (price !== undefined) result.price = price;

  // Add optional boolean properties from accessInfo
  const isTextReadable =
    accessInfo.accessViewStatus === "SAMPLE" ||
    accessInfo.accessViewStatus === "FULL";
  if (isTextReadable) result.isTextReadable = true;
  if (accessInfo.pdf?.isAvailable !== undefined)
    result.isPdfAvailable = accessInfo.pdf.isAvailable;
  if (accessInfo.epub?.isAvailable !== undefined)
    result.isEpubAvailable = accessInfo.epub.isAvailable;

  return result;
}

/**
 * Build search query with field-specific parameters
 */
function buildSearchQuery(
  query: string,
  options: GoogleBooksSearchOptions
): string {
  const parts: string[] = [];

  // Add main query if no field-specific searches
  if (!options.inField) {
    parts.push(query);
  } else {
    // Add field-specific searches
    const { inField } = options;

    if (inField.title) {
      parts.push(`intitle:${inField.title}`);
    }
    if (inField.author) {
      parts.push(`inauthor:${inField.author}`);
    }
    if (inField.publisher) {
      parts.push(`inpublisher:${inField.publisher}`);
    }
    if (inField.subject) {
      parts.push(`subject:${inField.subject}`);
    }
    if (inField.isbn) {
      parts.push(`isbn:${inField.isbn}`);
    }

    // Add general query if provided along with field searches
    if (query && query.trim()) {
      parts.push(query);
    }
  }

  return parts.join("+");
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Search for books using Google Books API
 *
 * @param query - Search query string
 * @param options - Search options
 * @returns Search results with normalized book metadata
 *
 * @throws {GoogleBooksError} If API request fails
 *
 * @example
 * ```typescript
 * // Simple search
 * const results = await searchBooks('clean code');
 *
 * // Search with options
 * const results = await searchBooks('javascript', {
 *   maxResults: 20,
 *   langRestrict: 'en',
 *   orderBy: 'newest',
 *   filter: 'free-ebooks',
 * });
 *
 * // Search by author
 * const results = await searchBooks('', {
 *   inField: { author: 'Robert Martin' },
 * });
 *
 * // Search by ISBN
 * const results = await searchBooks('', {
 *   inField: { isbn: '9780132350884' },
 * });
 * ```
 */
export async function searchBooks(
  query: string,
  options: GoogleBooksSearchOptions = {}
): Promise<GoogleBooksSearchResult> {
  const apiKey = getApiKey();

  // Merge with defaults
  const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };

  // Validate options
  if (opts.maxResults > MAX_RESULTS_LIMIT) {
    opts.maxResults = MAX_RESULTS_LIMIT;
  }
  if (opts.maxResults < 1) {
    opts.maxResults = 1;
  }
  if (opts.startIndex < 0) {
    opts.startIndex = 0;
  }

  // Build search query
  const searchQuery = buildSearchQuery(query, opts);

  if (!searchQuery.trim()) {
    return {
      totalItems: 0,
      items: [],
      hasMore: false,
      startIndex: opts.startIndex,
      query,
    };
  }

  // Check cache first
  const cacheKey = buildSearchCacheKey(query, opts);

  if (opts.useCache) {
    const cached = await cache.get<GoogleBooksSearchResult>(cacheKey);
    if (cached) {
      logger.debug("Google Books search cache hit", { query, cacheKey });
      return cached;
    }
  }

  // Build URL
  const params = new URLSearchParams({
    q: searchQuery,
    maxResults: String(opts.maxResults),
    startIndex: String(opts.startIndex),
    orderBy: opts.orderBy,
    printType: opts.printType,
  });

  if (opts.langRestrict) {
    params.set("langRestrict", opts.langRestrict);
  }
  if (opts.filter) {
    params.set("filter", opts.filter);
  }
  if (apiKey) {
    params.set("key", apiKey);
  }

  const url = `${GOOGLE_BOOKS_API_BASE}/volumes?${params.toString()}`;

  logger.debug("Google Books API search request", {
    query,
    startIndex: opts.startIndex,
    maxResults: opts.maxResults,
  });

  // Make request
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    logger.error("Google Books API search failed", {
      query,
      statusCode: error.statusCode,
      message: error.message,
    });
    throw error;
  }

  const data = (await response.json()) as GoogleBooksSearchResponseRaw;

  // Normalize results
  const items = (data.items ?? []).map(normalizeVolume);

  const result: GoogleBooksSearchResult = {
    totalItems: data.totalItems,
    items,
    hasMore: opts.startIndex + items.length < data.totalItems,
    startIndex: opts.startIndex,
    query,
  };

  // Cache the result
  if (opts.useCache) {
    cache.set(cacheKey, result, { ttl: SEARCH_CACHE_TTL }).catch((error) => {
      logger.warn("Failed to cache Google Books search result", {
        cacheKey,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    });
  }

  logger.info("Google Books search completed", {
    query,
    totalItems: data.totalItems,
    returnedItems: items.length,
  });

  return result;
}

/**
 * Get detailed information about a specific book
 *
 * @param volumeId - Google Books volume ID
 * @param useCache - Whether to use cache (default: true)
 * @returns Book metadata or null if not found
 *
 * @throws {GoogleBooksError} If API request fails (except 404)
 *
 * @example
 * ```typescript
 * const book = await getBookDetails('xxxxxxxx');
 * if (book) {
 *   // Use book.title and book.authors
 * }
 * ```
 */
export async function getBookDetails(
  volumeId: string,
  useCache: boolean = true
): Promise<GoogleBookMetadata | null> {
  if (!volumeId || !volumeId.trim()) {
    return null;
  }

  const apiKey = getApiKey();

  // Check cache first
  const cacheKey = buildDetailsCacheKey(volumeId);

  if (useCache) {
    const cached = await cache.get<GoogleBookMetadata>(cacheKey);
    if (cached) {
      logger.debug("Google Books details cache hit", { volumeId, cacheKey });
      return cached;
    }
  }

  // Build URL
  const params = new URLSearchParams();
  if (apiKey) {
    params.set("key", apiKey);
  }

  const queryString = params.toString();
  const url = `${GOOGLE_BOOKS_API_BASE}/volumes/${encodeURIComponent(volumeId)}${queryString ? `?${queryString}` : ""}`;

  logger.debug("Google Books API details request", { volumeId });

  // Make request
  const response = await fetchWithRetry(url);

  if (response.status === 404) {
    logger.debug("Google Books volume not found", { volumeId });
    return null;
  }

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    logger.error("Google Books API details failed", {
      volumeId,
      statusCode: error.statusCode,
      message: error.message,
    });
    throw error;
  }

  const data = (await response.json()) as GoogleBooksVolumeRaw;

  // Normalize the result
  const book = normalizeVolume(data);

  // Cache the result
  if (useCache) {
    cache.set(cacheKey, book, { ttl: DETAILS_CACHE_TTL }).catch((error) => {
      logger.warn("Failed to cache Google Books details", {
        cacheKey,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    });
  }

  logger.info("Google Books details retrieved", {
    volumeId,
    title: book.title,
  });

  return book;
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
 * const book = await searchByISBN('9780132350884');
 * ```
 */
export async function searchByISBN(
  isbn: string,
  useCache: boolean = true
): Promise<GoogleBookMetadata | null> {
  // Clean ISBN (remove hyphens and spaces)
  const cleanIsbn = isbn.replace(/[-\s]/g, "");

  if (!cleanIsbn || (cleanIsbn.length !== 10 && cleanIsbn.length !== 13)) {
    return null;
  }

  const results = await searchBooks("", {
    inField: { isbn: cleanIsbn },
    maxResults: 1,
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
 * const results = await searchByAuthor('Robert C. Martin', { maxResults: 20 });
 * ```
 */
export async function searchByAuthor(
  author: string,
  options: Omit<GoogleBooksSearchOptions, "inField"> = {}
): Promise<GoogleBooksSearchResult> {
  return searchBooks("", {
    ...options,
    inField: { author },
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
 * const results = await searchByTitle('Clean Code');
 * ```
 */
export async function searchByTitle(
  title: string,
  options: Omit<GoogleBooksSearchOptions, "inField"> = {}
): Promise<GoogleBooksSearchResult> {
  return searchBooks("", {
    ...options,
    inField: { title },
  });
}

/**
 * Get best available image URL for a book
 *
 * @param imageLinks - Image links from book metadata
 * @param preferredSize - Preferred image size
 * @returns Best available image URL or undefined
 */
export function getBestImageUrl(
  imageLinks: GoogleBookMetadata["imageLinks"],
  preferredSize: "small" | "medium" | "large" = "medium"
): string | undefined {
  if (!imageLinks) return undefined;

  // Order of preference based on requested size
  const sizePriorities: Record<
    string,
    (keyof NonNullable<typeof imageLinks>)[]
  > = {
    small: [
      "small",
      "thumbnail",
      "smallThumbnail",
      "medium",
      "large",
      "extraLarge",
    ],
    medium: [
      "medium",
      "large",
      "small",
      "thumbnail",
      "extraLarge",
      "smallThumbnail",
    ],
    large: [
      "large",
      "extraLarge",
      "medium",
      "small",
      "thumbnail",
      "smallThumbnail",
    ],
  };

  const priority = sizePriorities[preferredSize];
  if (!priority) return undefined;

  for (const size of priority) {
    const url = imageLinks[size];
    if (url) return url;
  }

  return undefined;
}

/**
 * Invalidate cached search results for a query
 *
 * @param query - Search query to invalidate
 */
export async function invalidateSearchCache(query: string): Promise<void> {
  const pattern = buildKey(
    CacheKeyPrefix.SEARCH,
    "google",
    query.toLowerCase().trim().replace(/\s+/g, "_"),
    "*"
  );
  await cache.invalidatePattern(pattern);
}

/**
 * Invalidate cached book details
 *
 * @param volumeId - Google Books volume ID
 */
export async function invalidateDetailsCache(volumeId: string): Promise<void> {
  const cacheKey = buildDetailsCacheKey(volumeId);
  await cache.del(cacheKey);
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Main Google Books service object
 */
export const googleBooks = {
  // Search functions
  search: searchBooks,
  searchBooks,
  searchByISBN,
  searchByAuthor,
  searchByTitle,

  // Details function
  getDetails: getBookDetails,
  getBookDetails,

  // Utility functions
  getBestImageUrl,
  isConfigured: isGoogleBooksConfigured,

  // Cache invalidation
  invalidateSearchCache,
  invalidateDetailsCache,
} as const;

/**
 * Google Books service utilities
 */
export const googleBooksUtils = {
  isConfigured: isGoogleBooksConfigured,
  getBestImageUrl,
  normalizeVolume,
  buildSearchQuery,
} as const;
