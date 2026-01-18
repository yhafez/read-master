/**
 * Pagination Utilities
 *
 * Comprehensive utilities for handling pagination in API endpoints.
 * Supports limit/offset, page-based, and cursor-based pagination patterns.
 *
 * Features:
 * - Parse and validate pagination query parameters
 * - Calculate Prisma skip/take values
 * - Support for multiple pagination styles
 * - Type-safe pagination options
 * - Default and maximum limit enforcement
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

/**
 * Default pagination configuration
 */
export const PaginationDefaults = {
  /** Default page number (1-indexed) */
  DEFAULT_PAGE: 1,
  /** Default items per page */
  DEFAULT_LIMIT: 20,
  /** Maximum allowed items per page */
  MAX_LIMIT: 100,
  /** Minimum page number */
  MIN_PAGE: 1,
  /** Minimum items per page */
  MIN_LIMIT: 1,
} as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Parsed pagination parameters
 */
export type PaginationParams = {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Offset for database query (calculated from page and limit) */
  offset: number;
};

/**
 * Prisma-compatible pagination parameters
 */
export type PrismaPagination = {
  /** Number of records to skip */
  skip: number;
  /** Number of records to take */
  take: number;
};

/**
 * Options for parsing pagination parameters
 */
export type ParsePaginationOptions = {
  /** Default items per page (defaults to DEFAULT_LIMIT) */
  defaultLimit?: number;
  /** Maximum allowed items per page (defaults to MAX_LIMIT) */
  maxLimit?: number;
  /** Default page number (defaults to DEFAULT_PAGE) */
  defaultPage?: number;
};

/**
 * Raw query parameters that might contain pagination values
 */
export type RawPaginationQuery = {
  page?: string | string[] | number;
  limit?: string | string[] | number;
  offset?: string | string[] | number;
  per_page?: string | string[] | number;
  perPage?: string | string[] | number;
  pageSize?: string | string[] | number;
  page_size?: string | string[] | number;
};

/**
 * Cursor-based pagination parameters
 */
export type CursorPaginationParams = {
  /** The cursor to start from (exclusive) */
  cursor?: string;
  /** Number of items to fetch */
  limit: number;
  /** Direction of pagination */
  direction: "forward" | "backward";
};

/**
 * Cursor-based pagination result
 */
export type CursorPaginationResult<T> = {
  /** The paginated items */
  items: T[];
  /** Cursor for the next page (if exists) */
  nextCursor?: string;
  /** Cursor for the previous page (if exists) */
  previousCursor?: string;
  /** Whether there are more items after current page */
  hasMore: boolean;
};

/**
 * Pagination calculation result with all metadata
 */
export type PaginationResult = {
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Offset for current page */
  offset: number;
  /** Prisma skip value */
  skip: number;
  /** Prisma take value */
  take: number;
  /** Whether there's a next page */
  hasNext: boolean;
  /** Whether there's a previous page */
  hasPrevious: boolean;
  /** First page number */
  firstPage: number;
  /** Last page number */
  lastPage: number;
  /** Start item index (1-indexed) */
  startItem: number;
  /** End item index (1-indexed) */
  endItem: number;
};

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Schema for validating page-based pagination query parameters
 */
export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(PaginationDefaults.MIN_PAGE)
    .default(PaginationDefaults.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(PaginationDefaults.MIN_LIMIT)
    .max(PaginationDefaults.MAX_LIMIT)
    .default(PaginationDefaults.DEFAULT_LIMIT),
});

/**
 * Schema for validating offset-based pagination query parameters
 */
export const offsetPaginationSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce
    .number()
    .int()
    .min(PaginationDefaults.MIN_LIMIT)
    .max(PaginationDefaults.MAX_LIMIT)
    .default(PaginationDefaults.DEFAULT_LIMIT),
});

/**
 * Schema for validating cursor-based pagination query parameters
 */
export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(PaginationDefaults.MIN_LIMIT)
    .max(PaginationDefaults.MAX_LIMIT)
    .default(PaginationDefaults.DEFAULT_LIMIT),
  direction: z.enum(["forward", "backward"]).default("forward"),
});

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Parse a single query parameter value to a number
 *
 * Handles string, string[], and number inputs.
 *
 * @param value - The query parameter value
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed number value
 */
export function parseQueryNumber(
  value: string | string[] | number | undefined,
  defaultValue: number
): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  // Handle array values (take first)
  if (Array.isArray(value)) {
    const first = value[0];
    if (first === undefined) {
      return defaultValue;
    }
    // Parse the first string element
    const parsed = parseInt(first, 10);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

  // Handle number values
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.floor(value) : defaultValue;
  }

  // Parse string value
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

/**
 * Parse pagination parameters from query object
 *
 * Supports multiple parameter name conventions:
 * - page/limit (standard)
 * - per_page, perPage, pageSize, page_size (alternatives for limit)
 * - offset (for offset-based pagination)
 *
 * @param query - Raw query parameters
 * @param options - Parsing options
 * @returns Validated pagination parameters
 */
export function parsePaginationParams(
  query: RawPaginationQuery,
  options: ParsePaginationOptions = {}
): PaginationParams {
  const {
    defaultLimit = PaginationDefaults.DEFAULT_LIMIT,
    maxLimit = PaginationDefaults.MAX_LIMIT,
    defaultPage = PaginationDefaults.DEFAULT_PAGE,
  } = options;

  // Parse page number
  let page = parseQueryNumber(query.page, defaultPage);
  page = Math.max(PaginationDefaults.MIN_PAGE, page);

  // Parse limit (check multiple parameter names)
  let limit = parseQueryNumber(
    query.limit ??
      query.per_page ??
      query.perPage ??
      query.pageSize ??
      query.page_size,
    defaultLimit
  );
  limit = Math.max(PaginationDefaults.MIN_LIMIT, Math.min(maxLimit, limit));

  // Handle direct offset if provided
  if (query.offset !== undefined) {
    const offset = parseQueryNumber(query.offset, 0);
    // When offset is provided directly, calculate page from it
    const calculatedPage = Math.floor(offset / limit) + 1;
    return {
      page: calculatedPage,
      limit,
      offset: Math.max(0, offset),
    };
  }

  // Calculate offset from page
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Calculate Prisma-compatible skip/take values
 *
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @returns Prisma pagination parameters
 */
export function calculatePrismaPagination(
  page: number,
  limit: number
): PrismaPagination {
  const safePage = Math.max(PaginationDefaults.MIN_PAGE, Math.floor(page));
  const safeLimit = Math.max(PaginationDefaults.MIN_LIMIT, Math.floor(limit));

  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

/**
 * Calculate skip/take from offset and limit
 *
 * Alternative to page-based calculation for APIs
 * that prefer offset-based pagination.
 *
 * @param offset - Number of items to skip
 * @param limit - Number of items to take
 * @returns Prisma pagination parameters
 */
export function calculatePrismaPaginationFromOffset(
  offset: number,
  limit: number
): PrismaPagination {
  return {
    skip: Math.max(0, Math.floor(offset)),
    take: Math.max(PaginationDefaults.MIN_LIMIT, Math.floor(limit)),
  };
}

/**
 * Calculate full pagination result with all metadata
 *
 * Provides comprehensive pagination information including
 * navigation helpers and item range.
 *
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Complete pagination result
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationResult {
  const safePage = Math.max(PaginationDefaults.MIN_PAGE, Math.floor(page));
  const safeLimit = Math.max(PaginationDefaults.MIN_LIMIT, Math.floor(limit));
  const safeTotal = Math.max(0, Math.floor(total));

  const totalPages = safeTotal > 0 ? Math.ceil(safeTotal / safeLimit) : 0;
  const offset = (safePage - 1) * safeLimit;

  // Calculate item range (1-indexed)
  const startItem = safeTotal > 0 ? offset + 1 : 0;
  const endItem = Math.min(offset + safeLimit, safeTotal);

  return {
    page: safePage,
    limit: safeLimit,
    total: safeTotal,
    totalPages,
    offset,
    skip: offset,
    take: safeLimit,
    hasNext: safePage < totalPages,
    hasPrevious: safePage > 1,
    firstPage: totalPages > 0 ? 1 : 0,
    lastPage: totalPages,
    startItem,
    endItem,
  };
}

/**
 * Calculate pagination from offset instead of page
 *
 * @param offset - Current offset
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Complete pagination result
 */
export function calculatePaginationFromOffset(
  offset: number,
  limit: number,
  total: number
): PaginationResult {
  const safeOffset = Math.max(0, Math.floor(offset));
  const safeLimit = Math.max(PaginationDefaults.MIN_LIMIT, Math.floor(limit));

  // Calculate page from offset
  const page = Math.floor(safeOffset / safeLimit) + 1;

  return calculatePagination(page, safeLimit, total);
}

// ============================================================================
// Cursor-Based Pagination Helpers
// ============================================================================

/**
 * Encode a cursor from an ID or timestamp
 *
 * @param value - The value to encode as a cursor
 * @returns Base64 encoded cursor string
 */
export function encodeCursor(value: string | number | Date): string {
  const stringValue =
    value instanceof Date ? value.toISOString() : String(value);
  return Buffer.from(stringValue).toString("base64url");
}

/**
 * Decode a cursor back to its original value
 *
 * @param cursor - Base64 encoded cursor string
 * @returns Decoded cursor value, or undefined if invalid
 */
export function decodeCursor(cursor: string): string | undefined {
  try {
    return Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    return undefined;
  }
}

/**
 * Parse cursor pagination parameters from query
 *
 * @param query - Query parameters with cursor, limit, direction
 * @returns Parsed cursor pagination params
 */
export function parseCursorPaginationParams(query: {
  cursor?: string;
  limit?: string | number;
  direction?: string;
}): CursorPaginationParams {
  const limit = parseQueryNumber(query.limit, PaginationDefaults.DEFAULT_LIMIT);

  const result: CursorPaginationParams = {
    limit: Math.min(PaginationDefaults.MAX_LIMIT, Math.max(1, limit)),
    direction:
      query.direction === "backward" || query.direction === "backward"
        ? "backward"
        : "forward",
  };

  if (query.cursor !== undefined) {
    result.cursor = query.cursor;
  }

  return result;
}

/**
 * Build cursor pagination result
 *
 * @param items - The fetched items
 * @param limit - The requested limit
 * @param getCursor - Function to extract cursor from an item
 * @returns Cursor pagination result
 */
export function buildCursorPaginationResult<T>(
  items: T[],
  limit: number,
  getCursor: (item: T) => string
): CursorPaginationResult<T> {
  // We fetched limit + 1 to check if there are more
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;

  const result: CursorPaginationResult<T> = {
    items: resultItems,
    hasMore,
  };

  if (resultItems.length > 0) {
    const lastItem = resultItems[resultItems.length - 1];
    const firstItem = resultItems[0];
    if (lastItem !== undefined) {
      result.nextCursor = encodeCursor(getCursor(lastItem));
    }
    if (firstItem !== undefined) {
      result.previousCursor = encodeCursor(getCursor(firstItem));
    }
  }

  return result;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a page number is valid for a given total
 *
 * @param page - Page number to check
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Whether the page is valid
 */
export function isValidPage(
  page: number,
  limit: number,
  total: number
): boolean {
  if (page < 1 || limit < 1) return false;
  if (total === 0) return page === 1;

  const totalPages = Math.ceil(total / limit);
  return page >= 1 && page <= totalPages;
}

/**
 * Get the last valid page for a given total
 *
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Last valid page number
 */
export function getLastPage(limit: number, total: number): number {
  if (total === 0 || limit < 1) return 1;
  return Math.ceil(total / limit);
}

/**
 * Clamp page number to valid range
 *
 * @param page - Requested page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Valid page number within range
 */
export function clampPage(page: number, limit: number, total: number): number {
  const lastPage = getLastPage(limit, total);
  return Math.max(1, Math.min(page, lastPage));
}

/**
 * Generate an array of page numbers for pagination UI
 *
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @param maxVisible - Maximum number of page numbers to show
 * @returns Array of page numbers (may include -1 for ellipsis)
 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible = 7
): number[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: number[] = [];
  const half = Math.floor(maxVisible / 2);

  // Always show first page
  pages.push(1);

  // Calculate start and end of visible range
  let start = Math.max(2, currentPage - half + 1);
  let end = Math.min(totalPages - 1, currentPage + half - 1);

  // Adjust if we're near the start
  if (currentPage <= half + 1) {
    end = maxVisible - 2;
  }

  // Adjust if we're near the end
  if (currentPage >= totalPages - half) {
    start = totalPages - maxVisible + 3;
  }

  // Add ellipsis or pages after first page
  if (start > 2) {
    pages.push(-1); // -1 represents ellipsis
  }

  // Add middle pages
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  // Add ellipsis or pages before last page
  if (end < totalPages - 1) {
    pages.push(-1); // -1 represents ellipsis
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

/**
 * Calculate the range of items being displayed
 *
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Object with start and end item indices (1-indexed)
 */
export function getItemRange(
  page: number,
  limit: number,
  total: number
): { start: number; end: number } {
  if (total === 0) {
    return { start: 0, end: 0 };
  }

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return { start, end };
}

// ============================================================================
// Namespaced Exports
// ============================================================================

/**
 * Pagination utilities namespace
 */
export const pagination = {
  // Parsing
  parseParams: parsePaginationParams,
  parseQuery: parseQueryNumber,
  parseCursorParams: parseCursorPaginationParams,

  // Calculation
  calculate: calculatePagination,
  calculateFromOffset: calculatePaginationFromOffset,
  toPrisma: calculatePrismaPagination,
  toPrismaFromOffset: calculatePrismaPaginationFromOffset,

  // Cursor-based
  encodeCursor,
  decodeCursor,
  buildCursorResult: buildCursorPaginationResult,

  // Utilities
  isValidPage,
  getLastPage,
  clampPage,
  getPageNumbers,
  getItemRange,
} as const;

/**
 * Pagination schemas namespace
 */
export const paginationSchemas = {
  query: paginationQuerySchema,
  offset: offsetPaginationSchema,
  cursor: cursorPaginationSchema,
} as const;
