import { describe, it, expect } from "vitest";
import {
  // Constants
  PaginationDefaults,
  // Types (used for type checking)
  type PaginationParams,
  type PrismaPagination,
  type ParsePaginationOptions,
  type RawPaginationQuery,
  type CursorPaginationParams,
  type CursorPaginationResult,
  type PaginationResult,
  // Schemas
  paginationQuerySchema,
  offsetPaginationSchema,
  cursorPaginationSchema,
  // Core functions
  parseQueryNumber,
  parsePaginationParams,
  calculatePrismaPagination,
  calculatePrismaPaginationFromOffset,
  calculatePagination,
  calculatePaginationFromOffset,
  // Cursor functions
  encodeCursor,
  decodeCursor,
  parseCursorPaginationParams,
  buildCursorPaginationResult,
  // Utility functions
  isValidPage,
  getLastPage,
  clampPage,
  getPageNumbers,
  getItemRange,
  // Namespaced exports
  pagination,
  paginationSchemas,
} from "./pagination.js";

// ============================================================================
// PaginationDefaults Tests
// ============================================================================

describe("PaginationDefaults", () => {
  it("should have correct default values", () => {
    expect(PaginationDefaults.DEFAULT_PAGE).toBe(1);
    expect(PaginationDefaults.DEFAULT_LIMIT).toBe(20);
    expect(PaginationDefaults.MAX_LIMIT).toBe(100);
    expect(PaginationDefaults.MIN_PAGE).toBe(1);
    expect(PaginationDefaults.MIN_LIMIT).toBe(1);
  });

  it("should be immutable (const assertion)", () => {
    // TypeScript ensures this at compile time, but we verify the values exist
    expect(Object.keys(PaginationDefaults)).toHaveLength(5);
  });
});

// ============================================================================
// parseQueryNumber Tests
// ============================================================================

describe("parseQueryNumber", () => {
  it("should return default for undefined", () => {
    expect(parseQueryNumber(undefined, 10)).toBe(10);
  });

  it("should parse string numbers", () => {
    expect(parseQueryNumber("42", 10)).toBe(42);
    expect(parseQueryNumber("1", 10)).toBe(1);
    expect(parseQueryNumber("100", 10)).toBe(100);
  });

  it("should handle number input directly", () => {
    expect(parseQueryNumber(42, 10)).toBe(42);
    expect(parseQueryNumber(0, 10)).toBe(0);
  });

  it("should take first element of string array", () => {
    expect(parseQueryNumber(["42", "100"], 10)).toBe(42);
    expect(parseQueryNumber(["5"], 10)).toBe(5);
  });

  it("should return default for invalid strings", () => {
    expect(parseQueryNumber("invalid", 10)).toBe(10);
    expect(parseQueryNumber("", 10)).toBe(10);
    expect(parseQueryNumber("abc123", 10)).toBe(10);
  });

  it("should handle edge cases", () => {
    // Empty array takes first element which is undefined
    expect(parseQueryNumber([], 10)).toBe(10);
    // Float strings are truncated
    expect(parseQueryNumber("3.7", 10)).toBe(3);
    // Negative numbers work
    expect(parseQueryNumber("-5", 10)).toBe(-5);
  });

  it("should return default for non-finite numbers", () => {
    expect(parseQueryNumber(Infinity, 10)).toBe(10);
    expect(parseQueryNumber(-Infinity, 10)).toBe(10);
    expect(parseQueryNumber(NaN, 10)).toBe(10);
  });

  it("should floor floating point numbers", () => {
    expect(parseQueryNumber(3.7, 10)).toBe(3);
    expect(parseQueryNumber(3.1, 10)).toBe(3);
  });
});

// ============================================================================
// parsePaginationParams Tests
// ============================================================================

describe("parsePaginationParams", () => {
  it("should parse page and limit from query", () => {
    const result = parsePaginationParams({ page: "2", limit: "10" });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(10);
  });

  it("should use defaults when params missing", () => {
    const result = parsePaginationParams({});
    expect(result.page).toBe(PaginationDefaults.DEFAULT_PAGE);
    expect(result.limit).toBe(PaginationDefaults.DEFAULT_LIMIT);
    expect(result.offset).toBe(0);
  });

  it("should respect custom options", () => {
    const options: ParsePaginationOptions = {
      defaultLimit: 50,
      maxLimit: 200,
      defaultPage: 2,
    };
    const result = parsePaginationParams({}, options);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(50);
  });

  it("should cap limit at maxLimit", () => {
    const result = parsePaginationParams({ limit: "500" });
    expect(result.limit).toBe(PaginationDefaults.MAX_LIMIT);
  });

  it("should enforce minimum page number", () => {
    const result = parsePaginationParams({ page: "0" });
    expect(result.page).toBe(1);

    const result2 = parsePaginationParams({ page: "-1" });
    expect(result2.page).toBe(1);
  });

  it("should enforce minimum limit", () => {
    const result = parsePaginationParams({ limit: "0" });
    expect(result.limit).toBe(1);

    const result2 = parsePaginationParams({ limit: "-5" });
    expect(result2.limit).toBe(1);
  });

  it("should support alternative limit parameter names", () => {
    expect(parsePaginationParams({ per_page: "25" }).limit).toBe(25);
    expect(parsePaginationParams({ perPage: "25" }).limit).toBe(25);
    expect(parsePaginationParams({ pageSize: "25" }).limit).toBe(25);
    expect(parsePaginationParams({ page_size: "25" }).limit).toBe(25);
  });

  it("should prioritize limit over alternatives", () => {
    const result = parsePaginationParams({ limit: "10", per_page: "25" });
    expect(result.limit).toBe(10);
  });

  it("should calculate offset correctly for different pages", () => {
    expect(parsePaginationParams({ page: "1", limit: "10" }).offset).toBe(0);
    expect(parsePaginationParams({ page: "2", limit: "10" }).offset).toBe(10);
    expect(parsePaginationParams({ page: "3", limit: "10" }).offset).toBe(20);
    expect(parsePaginationParams({ page: "1", limit: "25" }).offset).toBe(0);
    expect(parsePaginationParams({ page: "2", limit: "25" }).offset).toBe(25);
  });

  it("should handle direct offset parameter", () => {
    const result = parsePaginationParams({ offset: "50", limit: "10" });
    expect(result.offset).toBe(50);
    // Page should be calculated from offset
    expect(result.page).toBe(6); // offset 50 / limit 10 + 1 = 6
  });

  it("should handle negative offset", () => {
    const result = parsePaginationParams({ offset: "-10", limit: "10" });
    expect(result.offset).toBe(0);
  });

  it("should handle number type inputs", () => {
    const result = parsePaginationParams({ page: 3, limit: 15 });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(15);
  });
});

// ============================================================================
// calculatePrismaPagination Tests
// ============================================================================

describe("calculatePrismaPagination", () => {
  it("should calculate skip and take correctly", () => {
    expect(calculatePrismaPagination(1, 10)).toEqual({ skip: 0, take: 10 });
    expect(calculatePrismaPagination(2, 10)).toEqual({ skip: 10, take: 10 });
    expect(calculatePrismaPagination(3, 25)).toEqual({ skip: 50, take: 25 });
  });

  it("should handle page 1", () => {
    const result = calculatePrismaPagination(1, 20);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it("should enforce minimum values", () => {
    expect(calculatePrismaPagination(0, 10)).toEqual({ skip: 0, take: 10 });
    expect(calculatePrismaPagination(-1, 10)).toEqual({ skip: 0, take: 10 });
    expect(calculatePrismaPagination(1, 0)).toEqual({ skip: 0, take: 1 });
    expect(calculatePrismaPagination(1, -5)).toEqual({ skip: 0, take: 1 });
  });

  it("should floor floating point inputs", () => {
    expect(calculatePrismaPagination(2.9, 10.5)).toEqual({
      skip: 10,
      take: 10,
    });
  });
});

// ============================================================================
// calculatePrismaPaginationFromOffset Tests
// ============================================================================

describe("calculatePrismaPaginationFromOffset", () => {
  it("should calculate skip and take from offset", () => {
    expect(calculatePrismaPaginationFromOffset(0, 10)).toEqual({
      skip: 0,
      take: 10,
    });
    expect(calculatePrismaPaginationFromOffset(20, 10)).toEqual({
      skip: 20,
      take: 10,
    });
    expect(calculatePrismaPaginationFromOffset(50, 25)).toEqual({
      skip: 50,
      take: 25,
    });
  });

  it("should enforce minimum values", () => {
    expect(calculatePrismaPaginationFromOffset(-10, 10)).toEqual({
      skip: 0,
      take: 10,
    });
    expect(calculatePrismaPaginationFromOffset(10, 0)).toEqual({
      skip: 10,
      take: 1,
    });
  });

  it("should floor floating point inputs", () => {
    expect(calculatePrismaPaginationFromOffset(10.7, 5.9)).toEqual({
      skip: 10,
      take: 5,
    });
  });
});

// ============================================================================
// calculatePagination Tests
// ============================================================================

describe("calculatePagination", () => {
  it("should calculate full pagination metadata", () => {
    const result = calculatePagination(2, 10, 95);

    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.total).toBe(95);
    expect(result.totalPages).toBe(10);
    expect(result.offset).toBe(10);
    expect(result.skip).toBe(10);
    expect(result.take).toBe(10);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrevious).toBe(true);
    expect(result.firstPage).toBe(1);
    expect(result.lastPage).toBe(10);
    expect(result.startItem).toBe(11);
    expect(result.endItem).toBe(20);
  });

  it("should handle first page", () => {
    const result = calculatePagination(1, 10, 50);

    expect(result.hasPrevious).toBe(false);
    expect(result.hasNext).toBe(true);
    expect(result.startItem).toBe(1);
    expect(result.endItem).toBe(10);
  });

  it("should handle last page", () => {
    const result = calculatePagination(5, 10, 50);

    expect(result.hasPrevious).toBe(true);
    expect(result.hasNext).toBe(false);
    expect(result.startItem).toBe(41);
    expect(result.endItem).toBe(50);
  });

  it("should handle partial last page", () => {
    const result = calculatePagination(3, 10, 25);

    expect(result.totalPages).toBe(3);
    expect(result.startItem).toBe(21);
    expect(result.endItem).toBe(25);
  });

  it("should handle empty results", () => {
    const result = calculatePagination(1, 10, 0);

    expect(result.totalPages).toBe(0);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrevious).toBe(false);
    expect(result.firstPage).toBe(0);
    expect(result.lastPage).toBe(0);
    expect(result.startItem).toBe(0);
    expect(result.endItem).toBe(0);
  });

  it("should handle single page", () => {
    const result = calculatePagination(1, 10, 5);

    expect(result.totalPages).toBe(1);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrevious).toBe(false);
  });

  it("should enforce minimum values", () => {
    const result = calculatePagination(-1, -5, -10);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(1);
    expect(result.total).toBe(0);
  });
});

// ============================================================================
// calculatePaginationFromOffset Tests
// ============================================================================

describe("calculatePaginationFromOffset", () => {
  it("should calculate pagination from offset", () => {
    const result = calculatePaginationFromOffset(20, 10, 95);

    expect(result.page).toBe(3); // offset 20 / limit 10 + 1 = 3
    expect(result.offset).toBe(20);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrevious).toBe(true);
  });

  it("should handle zero offset", () => {
    const result = calculatePaginationFromOffset(0, 10, 50);

    expect(result.page).toBe(1);
    expect(result.hasPrevious).toBe(false);
  });

  it("should handle negative offset", () => {
    const result = calculatePaginationFromOffset(-10, 10, 50);

    expect(result.page).toBe(1);
    expect(result.offset).toBe(0);
  });
});

// ============================================================================
// Cursor Pagination Tests
// ============================================================================

describe("encodeCursor", () => {
  it("should encode string values", () => {
    const cursor = encodeCursor("abc123");
    expect(cursor).toBeTruthy();
    expect(typeof cursor).toBe("string");
  });

  it("should encode number values", () => {
    const cursor = encodeCursor(12345);
    expect(cursor).toBeTruthy();
    expect(decodeCursor(cursor)).toBe("12345");
  });

  it("should encode Date values", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    const cursor = encodeCursor(date);
    expect(decodeCursor(cursor)).toBe("2024-01-15T10:30:00.000Z");
  });
});

describe("decodeCursor", () => {
  it("should decode valid cursors", () => {
    const original = "test-cursor-value";
    const encoded = encodeCursor(original);
    expect(decodeCursor(encoded)).toBe(original);
  });

  it("should decode cursors with unusual characters (base64url is lenient)", () => {
    // Note: base64url decoding is lenient and doesn't throw for most inputs.
    // It silently ignores invalid characters. The result may be garbage
    // but won't be undefined unless there's an actual decode error.
    const result = decodeCursor("!!!invalid!!!");
    // The function doesn't return undefined for this input because
    // base64url decoding handles it (albeit with garbage output)
    expect(typeof result).toBe("string");
  });

  it("should handle empty string", () => {
    const encoded = encodeCursor("");
    expect(decodeCursor(encoded)).toBe("");
  });
});

describe("parseCursorPaginationParams", () => {
  it("should parse cursor pagination params", () => {
    const result = parseCursorPaginationParams({
      cursor: "abc123",
      limit: "25",
      direction: "forward",
    });

    expect(result.cursor).toBe("abc123");
    expect(result.limit).toBe(25);
    expect(result.direction).toBe("forward");
  });

  it("should use defaults when params missing", () => {
    const result = parseCursorPaginationParams({});

    expect(result.cursor).toBeUndefined();
    expect(result.limit).toBe(PaginationDefaults.DEFAULT_LIMIT);
    expect(result.direction).toBe("forward");
  });

  it("should handle backward direction", () => {
    const result = parseCursorPaginationParams({ direction: "backward" });
    expect(result.direction).toBe("backward");
  });

  it("should cap limit at max", () => {
    const result = parseCursorPaginationParams({ limit: "500" });
    expect(result.limit).toBe(PaginationDefaults.MAX_LIMIT);
  });

  it("should enforce minimum limit", () => {
    const result = parseCursorPaginationParams({ limit: "0" });
    expect(result.limit).toBe(1);
  });
});

describe("buildCursorPaginationResult", () => {
  it("should build cursor result with hasMore=false when items <= limit", () => {
    const items = [{ id: "1" }, { id: "2" }, { id: "3" }];
    const result = buildCursorPaginationResult(items, 10, (item) => item.id);

    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeTruthy();
    expect(result.previousCursor).toBeTruthy();
  });

  it("should build cursor result with hasMore=true when items > limit", () => {
    const items = [
      { id: "1" },
      { id: "2" },
      { id: "3" },
      { id: "4" },
      { id: "5" },
      { id: "6" },
    ];
    const result = buildCursorPaginationResult(items, 5, (item) => item.id);

    expect(result.items).toHaveLength(5);
    expect(result.hasMore).toBe(true);
  });

  it("should handle empty results", () => {
    const result = buildCursorPaginationResult(
      [],
      10,
      (item: { id: string }) => item.id
    );

    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeUndefined();
    expect(result.previousCursor).toBeUndefined();
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe("isValidPage", () => {
  it("should return true for valid pages", () => {
    expect(isValidPage(1, 10, 50)).toBe(true);
    expect(isValidPage(5, 10, 50)).toBe(true);
    expect(isValidPage(3, 10, 25)).toBe(true);
  });

  it("should return false for invalid pages", () => {
    expect(isValidPage(0, 10, 50)).toBe(false);
    expect(isValidPage(-1, 10, 50)).toBe(false);
    expect(isValidPage(6, 10, 50)).toBe(false);
    expect(isValidPage(10, 10, 50)).toBe(false);
  });

  it("should handle page 1 with empty results", () => {
    expect(isValidPage(1, 10, 0)).toBe(true);
    expect(isValidPage(2, 10, 0)).toBe(false);
  });

  it("should return false for invalid limit", () => {
    expect(isValidPage(1, 0, 50)).toBe(false);
    expect(isValidPage(1, -1, 50)).toBe(false);
  });
});

describe("getLastPage", () => {
  it("should calculate last page correctly", () => {
    expect(getLastPage(10, 50)).toBe(5);
    expect(getLastPage(10, 55)).toBe(6);
    expect(getLastPage(25, 100)).toBe(4);
  });

  it("should return 1 for empty results", () => {
    expect(getLastPage(10, 0)).toBe(1);
  });

  it("should return 1 for invalid limit", () => {
    expect(getLastPage(0, 50)).toBe(1);
    expect(getLastPage(-5, 50)).toBe(1);
  });
});

describe("clampPage", () => {
  it("should return page if within valid range", () => {
    expect(clampPage(3, 10, 50)).toBe(3);
    expect(clampPage(1, 10, 50)).toBe(1);
    expect(clampPage(5, 10, 50)).toBe(5);
  });

  it("should clamp to first page if too low", () => {
    expect(clampPage(0, 10, 50)).toBe(1);
    expect(clampPage(-5, 10, 50)).toBe(1);
  });

  it("should clamp to last page if too high", () => {
    expect(clampPage(10, 10, 50)).toBe(5);
    expect(clampPage(100, 10, 50)).toBe(5);
  });

  it("should return 1 for empty results", () => {
    expect(clampPage(5, 10, 0)).toBe(1);
  });
});

describe("getPageNumbers", () => {
  it("should return all pages when total <= maxVisible", () => {
    expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageNumbers(3, 7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("should show ellipsis for large page counts", () => {
    const result = getPageNumbers(5, 20, 7);
    expect(result).toContain(1); // First page
    expect(result).toContain(20); // Last page
    expect(result).toContain(-1); // At least one ellipsis
  });

  it("should handle being near the start", () => {
    const result = getPageNumbers(2, 20, 7);
    expect(result[0]).toBe(1);
    expect(result[result.length - 1]).toBe(20);
  });

  it("should handle being near the end", () => {
    const result = getPageNumbers(19, 20, 7);
    expect(result[0]).toBe(1);
    expect(result[result.length - 1]).toBe(20);
  });

  it("should handle single page", () => {
    expect(getPageNumbers(1, 1)).toEqual([1]);
  });

  it("should handle two pages", () => {
    expect(getPageNumbers(1, 2)).toEqual([1, 2]);
  });
});

describe("getItemRange", () => {
  it("should calculate correct item range", () => {
    expect(getItemRange(1, 10, 50)).toEqual({ start: 1, end: 10 });
    expect(getItemRange(2, 10, 50)).toEqual({ start: 11, end: 20 });
    expect(getItemRange(5, 10, 50)).toEqual({ start: 41, end: 50 });
  });

  it("should handle partial last page", () => {
    expect(getItemRange(3, 10, 25)).toEqual({ start: 21, end: 25 });
  });

  it("should handle empty results", () => {
    expect(getItemRange(1, 10, 0)).toEqual({ start: 0, end: 0 });
  });
});

// ============================================================================
// Zod Schema Tests
// ============================================================================

describe("paginationQuerySchema", () => {
  it("should parse valid inputs", () => {
    expect(paginationQuerySchema.parse({ page: 2, limit: 25 })).toEqual({
      page: 2,
      limit: 25,
    });
  });

  it("should coerce string inputs", () => {
    expect(paginationQuerySchema.parse({ page: "3", limit: "50" })).toEqual({
      page: 3,
      limit: 50,
    });
  });

  it("should use defaults", () => {
    expect(paginationQuerySchema.parse({})).toEqual({
      page: PaginationDefaults.DEFAULT_PAGE,
      limit: PaginationDefaults.DEFAULT_LIMIT,
    });
  });

  it("should reject invalid page", () => {
    expect(() => paginationQuerySchema.parse({ page: 0 })).toThrow();
    expect(() => paginationQuerySchema.parse({ page: -1 })).toThrow();
  });

  it("should reject invalid limit", () => {
    expect(() => paginationQuerySchema.parse({ limit: 0 })).toThrow();
    expect(() => paginationQuerySchema.parse({ limit: 101 })).toThrow();
  });
});

describe("offsetPaginationSchema", () => {
  it("should parse valid inputs", () => {
    expect(offsetPaginationSchema.parse({ offset: 20, limit: 10 })).toEqual({
      offset: 20,
      limit: 10,
    });
  });

  it("should use defaults", () => {
    expect(offsetPaginationSchema.parse({})).toEqual({
      offset: 0,
      limit: PaginationDefaults.DEFAULT_LIMIT,
    });
  });

  it("should reject negative offset", () => {
    expect(() => offsetPaginationSchema.parse({ offset: -1 })).toThrow();
  });
});

describe("cursorPaginationSchema", () => {
  it("should parse valid inputs", () => {
    expect(
      cursorPaginationSchema.parse({
        cursor: "abc123",
        limit: 25,
        direction: "backward",
      })
    ).toEqual({
      cursor: "abc123",
      limit: 25,
      direction: "backward",
    });
  });

  it("should use defaults", () => {
    expect(cursorPaginationSchema.parse({})).toEqual({
      cursor: undefined,
      limit: PaginationDefaults.DEFAULT_LIMIT,
      direction: "forward",
    });
  });

  it("should reject invalid direction", () => {
    expect(() =>
      cursorPaginationSchema.parse({ direction: "invalid" })
    ).toThrow();
  });
});

// ============================================================================
// Namespaced Export Tests
// ============================================================================

describe("pagination namespace", () => {
  it("should export all parsing functions", () => {
    expect(pagination.parseParams).toBe(parsePaginationParams);
    expect(pagination.parseQuery).toBe(parseQueryNumber);
    expect(pagination.parseCursorParams).toBe(parseCursorPaginationParams);
  });

  it("should export all calculation functions", () => {
    expect(pagination.calculate).toBe(calculatePagination);
    expect(pagination.calculateFromOffset).toBe(calculatePaginationFromOffset);
    expect(pagination.toPrisma).toBe(calculatePrismaPagination);
    expect(pagination.toPrismaFromOffset).toBe(
      calculatePrismaPaginationFromOffset
    );
  });

  it("should export cursor functions", () => {
    expect(pagination.encodeCursor).toBe(encodeCursor);
    expect(pagination.decodeCursor).toBe(decodeCursor);
    expect(pagination.buildCursorResult).toBe(buildCursorPaginationResult);
  });

  it("should export utility functions", () => {
    expect(pagination.isValidPage).toBe(isValidPage);
    expect(pagination.getLastPage).toBe(getLastPage);
    expect(pagination.clampPage).toBe(clampPage);
    expect(pagination.getPageNumbers).toBe(getPageNumbers);
    expect(pagination.getItemRange).toBe(getItemRange);
  });
});

describe("paginationSchemas namespace", () => {
  it("should export all schemas", () => {
    expect(paginationSchemas.query).toBe(paginationQuerySchema);
    expect(paginationSchemas.offset).toBe(offsetPaginationSchema);
    expect(paginationSchemas.cursor).toBe(cursorPaginationSchema);
  });
});

// ============================================================================
// Type Tests (compile-time verification)
// ============================================================================

describe("Type exports", () => {
  it("should export PaginationParams type", () => {
    const params: PaginationParams = { page: 1, limit: 10, offset: 0 };
    expect(params).toBeDefined();
  });

  it("should export PrismaPagination type", () => {
    const prisma: PrismaPagination = { skip: 0, take: 10 };
    expect(prisma).toBeDefined();
  });

  it("should export ParsePaginationOptions type", () => {
    const options: ParsePaginationOptions = {
      defaultLimit: 25,
      maxLimit: 50,
      defaultPage: 1,
    };
    expect(options).toBeDefined();
  });

  it("should export RawPaginationQuery type", () => {
    const query: RawPaginationQuery = {
      page: "1",
      limit: "10",
      per_page: "20",
    };
    expect(query).toBeDefined();
  });

  it("should export CursorPaginationParams type", () => {
    const params: CursorPaginationParams = {
      cursor: "abc",
      limit: 10,
      direction: "forward",
    };
    expect(params).toBeDefined();
  });

  it("should export CursorPaginationResult type", () => {
    const result: CursorPaginationResult<{ id: string }> = {
      items: [{ id: "1" }],
      nextCursor: "abc",
      hasMore: true,
    };
    expect(result).toBeDefined();
  });

  it("should export PaginationResult type", () => {
    const result: PaginationResult = {
      page: 1,
      limit: 10,
      total: 100,
      totalPages: 10,
      offset: 0,
      skip: 0,
      take: 10,
      hasNext: true,
      hasPrevious: false,
      firstPage: 1,
      lastPage: 10,
      startItem: 1,
      endItem: 10,
    };
    expect(result).toBeDefined();
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Integration: Full pagination workflow", () => {
  it("should work end-to-end with page-based pagination", () => {
    // 1. Parse query params
    const query = { page: "2", limit: "25" };
    const params = parsePaginationParams(query);

    // 2. Convert to Prisma params
    const prisma = calculatePrismaPagination(params.page, params.limit);

    // 3. Simulate database query returning 25 items for page 2
    const mockTotal = 95;
    const mockItems = Array(prisma.take)
      .fill(null)
      .map((_, i) => ({ id: prisma.skip + i + 1 }));

    // 4. Calculate full pagination result
    const result = calculatePagination(params.page, params.limit, mockTotal);

    // Verify Prisma params
    expect(prisma).toEqual({ skip: 25, take: 25 });
    // Verify mock items match the expected page range
    expect(mockItems).toHaveLength(25);
    expect(mockItems[0]).toEqual({ id: 26 });
    expect(mockItems[24]).toEqual({ id: 50 });
    // Verify pagination result
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(4);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrevious).toBe(true);
    expect(result.startItem).toBe(26);
    expect(result.endItem).toBe(50);
  });

  it("should work end-to-end with cursor-based pagination", () => {
    // 1. Parse cursor params
    const query = { limit: "10" };
    const params = parseCursorPaginationParams(query);

    // 2. Simulate fetching limit + 1 items
    const mockItems = Array(11)
      .fill(null)
      .map((_, i) => ({ id: `item-${i}` }));

    // 3. Build cursor result
    const result = buildCursorPaginationResult(
      mockItems,
      params.limit,
      (item) => item.id
    );

    // Verify
    expect(result.items).toHaveLength(10);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBeTruthy();
  });
});
