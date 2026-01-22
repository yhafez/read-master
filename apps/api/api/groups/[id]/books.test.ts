/**
 * Tests for /api/groups/:id/books endpoint
 * Tests group book management including adding, listing, updating, and removing books
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  ADMIN_ROLES,
  VALID_STATUSES,
  listGroupBooksQuerySchema,
  addGroupBookSchema,
  updateGroupBookSchema,
  hasAdminPermission,
  buildGroupBooksCacheKey,
  mapToGroupBookInfo,
  mapToGroupBookResponse,
  validateGroupId,
  formatDate,
  type GroupBookInfo,
  type GroupBookResponse,
  type AddGroupBookInput,
  type UpdateGroupBookInput,
} from "./books.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have DEFAULT_LIMIT as 20", () => {
    expect(DEFAULT_LIMIT).toBe(20);
  });

  it("should have MAX_LIMIT as 50", () => {
    expect(MAX_LIMIT).toBe(50);
  });

  it("should have ADMIN_ROLES with OWNER and ADMIN", () => {
    expect(ADMIN_ROLES).toContain("OWNER");
    expect(ADMIN_ROLES).toContain("ADMIN");
    expect(ADMIN_ROLES.length).toBe(2);
  });

  it("should have VALID_STATUSES with all group book statuses", () => {
    expect(VALID_STATUSES).toContain("UPCOMING");
    expect(VALID_STATUSES).toContain("CURRENT");
    expect(VALID_STATUSES).toContain("COMPLETED");
    expect(VALID_STATUSES).toContain("SKIPPED");
    expect(VALID_STATUSES.length).toBe(4);
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export GroupBookInfo type", () => {
    const bookInfo: GroupBookInfo = {
      id: "book-1",
      title: "Test Book",
      author: "Test Author",
      coverImage: "https://example.com/cover.jpg",
      wordCount: 50000,
    };
    expect(bookInfo.id).toBe("book-1");
    expect(bookInfo.title).toBe("Test Book");
    expect(bookInfo.author).toBe("Test Author");
  });

  it("should allow null values in GroupBookInfo", () => {
    const bookInfo: GroupBookInfo = {
      id: "book-1",
      title: "Test Book",
      author: null,
      coverImage: null,
      wordCount: null,
    };
    expect(bookInfo.author).toBeNull();
    expect(bookInfo.coverImage).toBeNull();
    expect(bookInfo.wordCount).toBeNull();
  });

  it("should export GroupBookResponse type", () => {
    const response: GroupBookResponse = {
      id: "gb-1",
      groupId: "group-1",
      book: {
        id: "book-1",
        title: "Test Book",
        author: "Test Author",
        coverImage: null,
        wordCount: 50000,
      },
      status: "CURRENT",
      startDate: "2026-01-15T00:00:00.000Z",
      endDate: "2026-02-15T00:00:00.000Z",
      targetPage: 100,
      orderIndex: 0,
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-01-10T00:00:00.000Z",
    };
    expect(response.status).toBe("CURRENT");
    expect(response.orderIndex).toBe(0);
  });

  it("should allow null dates in GroupBookResponse", () => {
    const response: GroupBookResponse = {
      id: "gb-1",
      groupId: "group-1",
      book: {
        id: "book-1",
        title: "Test Book",
        author: null,
        coverImage: null,
        wordCount: null,
      },
      status: "UPCOMING",
      startDate: null,
      endDate: null,
      targetPage: null,
      orderIndex: 0,
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-01-10T00:00:00.000Z",
    };
    expect(response.startDate).toBeNull();
    expect(response.endDate).toBeNull();
    expect(response.targetPage).toBeNull();
  });

  it("should export AddGroupBookInput type", () => {
    const input: AddGroupBookInput = {
      bookId: "book-123",
      startDate: "2026-01-15T00:00:00.000Z",
      endDate: "2026-02-15T00:00:00.000Z",
      targetPage: 100,
      status: "UPCOMING",
    };
    expect(input.bookId).toBe("book-123");
    expect(input.status).toBe("UPCOMING");
  });

  it("should export UpdateGroupBookInput type", () => {
    const input: UpdateGroupBookInput = {
      startDate: "2026-01-20T00:00:00.000Z",
      status: "CURRENT",
      orderIndex: 1,
    };
    expect(input.status).toBe("CURRENT");
    expect(input.orderIndex).toBe(1);
  });
});

// ============================================================================
// listGroupBooksQuerySchema Tests
// ============================================================================

describe("listGroupBooksQuerySchema", () => {
  it("should accept empty query with defaults", () => {
    const result = listGroupBooksQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(DEFAULT_LIMIT);
    }
  });

  it("should accept valid status filter", () => {
    const result = listGroupBooksQuerySchema.safeParse({ status: "CURRENT" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("CURRENT");
    }
  });

  it("should accept all valid statuses", () => {
    for (const status of ["UPCOMING", "CURRENT", "COMPLETED", "SKIPPED"]) {
      const result = listGroupBooksQuerySchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid status", () => {
    const result = listGroupBooksQuerySchema.safeParse({ status: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("should accept valid page number", () => {
    const result = listGroupBooksQuerySchema.safeParse({ page: 5 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(5);
    }
  });

  it("should reject page less than 1", () => {
    const result = listGroupBooksQuerySchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it("should accept valid limit", () => {
    const result = listGroupBooksQuerySchema.safeParse({ limit: 30 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(30);
    }
  });

  it("should reject limit greater than MAX_LIMIT", () => {
    const result = listGroupBooksQuerySchema.safeParse({ limit: 100 });
    expect(result.success).toBe(false);
  });

  it("should reject limit less than 1", () => {
    const result = listGroupBooksQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it("should coerce string numbers to numbers", () => {
    const result = listGroupBooksQuerySchema.safeParse({
      page: "3",
      limit: "25",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(25);
    }
  });
});

// ============================================================================
// addGroupBookSchema Tests
// ============================================================================

describe("addGroupBookSchema", () => {
  it("should accept valid input with required fields only", () => {
    const result = addGroupBookSchema.safeParse({
      bookId: "book-123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bookId).toBe("book-123");
      expect(result.data.status).toBe("UPCOMING"); // default
    }
  });

  it("should accept valid input with all fields", () => {
    const result = addGroupBookSchema.safeParse({
      bookId: "book-123",
      startDate: "2026-01-15T00:00:00.000Z",
      endDate: "2026-02-15T00:00:00.000Z",
      targetPage: 100,
      status: "CURRENT",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("CURRENT");
      expect(result.data.targetPage).toBe(100);
    }
  });

  it("should reject missing bookId", () => {
    const result = addGroupBookSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should reject empty bookId", () => {
    const result = addGroupBookSchema.safeParse({ bookId: "" });
    expect(result.success).toBe(false);
  });

  it("should accept null dates", () => {
    const result = addGroupBookSchema.safeParse({
      bookId: "book-123",
      startDate: null,
      endDate: null,
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid datetime format", () => {
    const result = addGroupBookSchema.safeParse({
      bookId: "book-123",
      startDate: "2026-01-15", // Missing time part
    });
    expect(result.success).toBe(false);
  });

  it("should accept all valid statuses", () => {
    for (const status of ["UPCOMING", "CURRENT", "COMPLETED", "SKIPPED"]) {
      const result = addGroupBookSchema.safeParse({ bookId: "book-1", status });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid status", () => {
    const result = addGroupBookSchema.safeParse({
      bookId: "book-123",
      status: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("should reject targetPage less than 1", () => {
    const result = addGroupBookSchema.safeParse({
      bookId: "book-123",
      targetPage: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should accept null targetPage", () => {
    const result = addGroupBookSchema.safeParse({
      bookId: "book-123",
      targetPage: null,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// updateGroupBookSchema Tests
// ============================================================================

describe("updateGroupBookSchema", () => {
  it("should accept empty input (no updates)", () => {
    const result = updateGroupBookSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should accept valid startDate update", () => {
    const result = updateGroupBookSchema.safeParse({
      startDate: "2026-01-20T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid status update", () => {
    const result = updateGroupBookSchema.safeParse({
      status: "COMPLETED",
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid orderIndex update", () => {
    const result = updateGroupBookSchema.safeParse({
      orderIndex: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderIndex).toBe(5);
    }
  });

  it("should reject negative orderIndex", () => {
    const result = updateGroupBookSchema.safeParse({
      orderIndex: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should accept orderIndex of 0", () => {
    const result = updateGroupBookSchema.safeParse({
      orderIndex: 0,
    });
    expect(result.success).toBe(true);
  });

  it("should accept null for optional fields", () => {
    const result = updateGroupBookSchema.safeParse({
      startDate: null,
      endDate: null,
      targetPage: null,
    });
    expect(result.success).toBe(true);
  });

  it("should accept multiple field updates", () => {
    const result = updateGroupBookSchema.safeParse({
      startDate: "2026-01-20T00:00:00.000Z",
      endDate: "2026-02-20T00:00:00.000Z",
      status: "CURRENT",
      targetPage: 150,
      orderIndex: 0,
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid datetime format", () => {
    const result = updateGroupBookSchema.safeParse({
      startDate: "invalid-date",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// hasAdminPermission Tests
// ============================================================================

describe("hasAdminPermission", () => {
  it("should return true for OWNER role", () => {
    expect(hasAdminPermission("OWNER")).toBe(true);
  });

  it("should return true for ADMIN role", () => {
    expect(hasAdminPermission("ADMIN")).toBe(true);
  });

  it("should return false for MEMBER role", () => {
    expect(hasAdminPermission("MEMBER")).toBe(false);
  });

  it("should return false for null role", () => {
    expect(hasAdminPermission(null)).toBe(false);
  });

  it("should return false for empty string role", () => {
    expect(hasAdminPermission("")).toBe(false);
  });

  it("should return false for unknown role", () => {
    expect(hasAdminPermission("UNKNOWN")).toBe(false);
  });

  it("should be case-sensitive", () => {
    expect(hasAdminPermission("owner")).toBe(false);
    expect(hasAdminPermission("admin")).toBe(false);
  });
});

// ============================================================================
// buildGroupBooksCacheKey Tests
// ============================================================================

describe("buildGroupBooksCacheKey", () => {
  it("should build correct cache key without status", () => {
    const key = buildGroupBooksCacheKey("group-123");
    expect(key).toBe("user:group:group-123:books");
  });

  it("should build correct cache key with status", () => {
    const key = buildGroupBooksCacheKey("group-123", "CURRENT");
    expect(key).toBe("user:group:group-123:books:CURRENT");
  });

  it("should handle CUID-like group IDs", () => {
    const key = buildGroupBooksCacheKey("clxyz123abc456");
    expect(key).toContain("clxyz123abc456");
  });

  it("should produce different keys for different groups", () => {
    const key1 = buildGroupBooksCacheKey("group-1");
    const key2 = buildGroupBooksCacheKey("group-2");
    expect(key1).not.toBe(key2);
  });

  it("should produce different keys for different statuses", () => {
    const key1 = buildGroupBooksCacheKey("group-1", "CURRENT");
    const key2 = buildGroupBooksCacheKey("group-1", "COMPLETED");
    expect(key1).not.toBe(key2);
  });
});

// ============================================================================
// mapToGroupBookInfo Tests
// ============================================================================

describe("mapToGroupBookInfo", () => {
  it("should map book data correctly", () => {
    const book = {
      id: "book-1",
      title: "Test Book",
      author: "Test Author",
      coverImage: "https://example.com/cover.jpg",
      wordCount: 50000,
    };
    const result = mapToGroupBookInfo(book);
    expect(result.id).toBe("book-1");
    expect(result.title).toBe("Test Book");
    expect(result.author).toBe("Test Author");
    expect(result.coverImage).toBe("https://example.com/cover.jpg");
    expect(result.wordCount).toBe(50000);
  });

  it("should handle null values", () => {
    const book = {
      id: "book-1",
      title: "Test Book",
      author: null,
      coverImage: null,
      wordCount: null,
    };
    const result = mapToGroupBookInfo(book);
    expect(result.author).toBeNull();
    expect(result.coverImage).toBeNull();
    expect(result.wordCount).toBeNull();
  });

  it("should preserve all required fields", () => {
    const book = {
      id: "book-123",
      title: "My Book",
      author: "Author Name",
      coverImage: "cover.jpg",
      wordCount: 10000,
    };
    const result = mapToGroupBookInfo(book);
    expect(Object.keys(result)).toEqual([
      "id",
      "title",
      "author",
      "coverImage",
      "wordCount",
    ]);
  });
});

// ============================================================================
// mapToGroupBookResponse Tests
// ============================================================================

describe("mapToGroupBookResponse", () => {
  const baseGroupBook = {
    id: "gb-1",
    groupId: "group-1",
    status: "CURRENT" as const,
    startDate: new Date("2026-01-15T00:00:00.000Z"),
    endDate: new Date("2026-02-15T00:00:00.000Z"),
    targetPage: 100,
    orderIndex: 0,
    createdAt: new Date("2026-01-10T00:00:00.000Z"),
    updatedAt: new Date("2026-01-10T00:00:00.000Z"),
    book: {
      id: "book-1",
      title: "Test Book",
      author: "Test Author",
      coverImage: "https://example.com/cover.jpg",
      wordCount: 50000,
    },
  };

  it("should map group book data correctly", () => {
    const result = mapToGroupBookResponse(baseGroupBook);
    expect(result.id).toBe("gb-1");
    expect(result.groupId).toBe("group-1");
    expect(result.status).toBe("CURRENT");
    expect(result.orderIndex).toBe(0);
  });

  it("should format dates as ISO strings", () => {
    const result = mapToGroupBookResponse(baseGroupBook);
    expect(result.startDate).toBe("2026-01-15T00:00:00.000Z");
    expect(result.endDate).toBe("2026-02-15T00:00:00.000Z");
    expect(result.createdAt).toBe("2026-01-10T00:00:00.000Z");
    expect(result.updatedAt).toBe("2026-01-10T00:00:00.000Z");
  });

  it("should handle null dates", () => {
    const groupBook = {
      ...baseGroupBook,
      startDate: null,
      endDate: null,
    };
    const result = mapToGroupBookResponse(groupBook);
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
  });

  it("should handle null targetPage", () => {
    const groupBook = {
      ...baseGroupBook,
      targetPage: null,
    };
    const result = mapToGroupBookResponse(groupBook);
    expect(result.targetPage).toBeNull();
  });

  it("should map book info correctly", () => {
    const result = mapToGroupBookResponse(baseGroupBook);
    expect(result.book.id).toBe("book-1");
    expect(result.book.title).toBe("Test Book");
    expect(result.book.author).toBe("Test Author");
  });

  it("should include all expected fields", () => {
    const result = mapToGroupBookResponse(baseGroupBook);
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("groupId");
    expect(result).toHaveProperty("book");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("startDate");
    expect(result).toHaveProperty("endDate");
    expect(result).toHaveProperty("targetPage");
    expect(result).toHaveProperty("orderIndex");
    expect(result).toHaveProperty("createdAt");
    expect(result).toHaveProperty("updatedAt");
  });
});

// ============================================================================
// validateGroupId Tests
// ============================================================================

describe("validateGroupId", () => {
  it("should return trimmed string for valid ID", () => {
    expect(validateGroupId("group-123")).toBe("group-123");
  });

  it("should trim whitespace from ID", () => {
    expect(validateGroupId("  group-123  ")).toBe("group-123");
  });

  it("should return null for empty string", () => {
    expect(validateGroupId("")).toBeNull();
  });

  it("should return null for whitespace-only string", () => {
    expect(validateGroupId("   ")).toBeNull();
  });

  it("should return null for null input", () => {
    expect(validateGroupId(null)).toBeNull();
  });

  it("should return null for undefined input", () => {
    expect(validateGroupId(undefined)).toBeNull();
  });

  it("should return null for number input", () => {
    expect(validateGroupId(123)).toBeNull();
  });

  it("should return null for object input", () => {
    expect(validateGroupId({ id: "test" })).toBeNull();
  });
});

// ============================================================================
// formatDate Tests
// ============================================================================

describe("formatDate", () => {
  it("should format date as ISO string", () => {
    const date = new Date("2026-01-18T12:30:45.000Z");
    expect(formatDate(date)).toBe("2026-01-18T12:30:45.000Z");
  });

  it("should handle midnight date", () => {
    const date = new Date("2026-01-18T00:00:00.000Z");
    expect(formatDate(date)).toBe("2026-01-18T00:00:00.000Z");
  });

  it("should handle end of day date", () => {
    const date = new Date("2026-01-18T23:59:59.999Z");
    expect(formatDate(date)).toBe("2026-01-18T23:59:59.999Z");
  });
});

// ============================================================================
// Integration Scenarios Tests
// ============================================================================

describe("Integration Scenarios", () => {
  it("should validate complete add book flow", () => {
    // Step 1: Validate group ID
    const groupId = validateGroupId("group-123");
    expect(groupId).toBe("group-123");

    // Step 2: Check admin permission
    expect(hasAdminPermission("OWNER")).toBe(true);

    // Step 3: Validate input
    const input = addGroupBookSchema.safeParse({
      bookId: "book-123",
      startDate: "2026-01-15T00:00:00.000Z",
      endDate: "2026-02-15T00:00:00.000Z",
      status: "UPCOMING",
    });
    expect(input.success).toBe(true);

    // Step 4: Build cache key for invalidation
    const cacheKey = buildGroupBooksCacheKey("group-123");
    expect(cacheKey).toContain("group-123");
  });

  it("should validate update book status to CURRENT flow", () => {
    // Step 1: Check admin permission
    expect(hasAdminPermission("ADMIN")).toBe(true);

    // Step 2: Validate update input
    const input = updateGroupBookSchema.safeParse({
      status: "CURRENT",
    });
    expect(input.success).toBe(true);
  });

  it("should reject non-admin from modifying books", () => {
    expect(hasAdminPermission("MEMBER")).toBe(false);
    expect(hasAdminPermission(null)).toBe(false);
  });

  it("should validate listing books with status filter", () => {
    const query = listGroupBooksQuerySchema.safeParse({
      status: "CURRENT",
      page: 1,
      limit: 10,
    });
    expect(query.success).toBe(true);
    if (query.success) {
      expect(query.data.status).toBe("CURRENT");
    }
  });

  it("should handle book scheduling scenario", () => {
    // Add a book as upcoming with schedule
    const addInput = addGroupBookSchema.safeParse({
      bookId: "book-new",
      startDate: "2026-02-01T00:00:00.000Z",
      endDate: "2026-03-01T00:00:00.000Z",
      targetPage: 50,
      status: "UPCOMING",
    });
    expect(addInput.success).toBe(true);

    // Later, update it to current when reading starts
    const updateInput = updateGroupBookSchema.safeParse({
      status: "CURRENT",
    });
    expect(updateInput.success).toBe(true);
  });

  it("should handle reordering books", () => {
    const updateInput = updateGroupBookSchema.safeParse({
      orderIndex: 2,
    });
    expect(updateInput.success).toBe(true);
    if (updateInput.success) {
      expect(updateInput.data.orderIndex).toBe(2);
    }
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  it("should handle very large page numbers", () => {
    const result = listGroupBooksQuerySchema.safeParse({ page: 99999 });
    expect(result.success).toBe(true);
  });

  it("should handle string coercion for page", () => {
    const result = listGroupBooksQuerySchema.safeParse({ page: "10" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(10);
    }
  });

  it("should handle string coercion for targetPage", () => {
    const result = addGroupBookSchema.safeParse({
      bookId: "book-1",
      targetPage: "100",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetPage).toBe(100);
    }
  });

  it("should handle very large targetPage", () => {
    const result = addGroupBookSchema.safeParse({
      bookId: "book-1",
      targetPage: 10000,
    });
    expect(result.success).toBe(true);
  });

  it("should handle boundary limit values", () => {
    const minLimit = listGroupBooksQuerySchema.safeParse({ limit: 1 });
    expect(minLimit.success).toBe(true);

    const maxLimit = listGroupBooksQuerySchema.safeParse({ limit: 50 });
    expect(maxLimit.success).toBe(true);

    const overLimit = listGroupBooksQuerySchema.safeParse({ limit: 51 });
    expect(overLimit.success).toBe(false);
  });

  it("should handle datetime at different timezones", () => {
    const result = addGroupBookSchema.safeParse({
      bookId: "book-1",
      startDate: "2026-01-15T12:00:00+05:30",
    });
    // This should fail as we expect ISO 8601 format with Z
    expect(result.success).toBe(false);
  });

  it("should handle empty book data for null fields", () => {
    const groupBook = {
      id: "gb-1",
      groupId: "group-1",
      status: "UPCOMING" as const,
      startDate: null,
      endDate: null,
      targetPage: null,
      orderIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      book: {
        id: "book-1",
        title: "Untitled",
        author: null,
        coverImage: null,
        wordCount: null,
      },
    };
    const result = mapToGroupBookResponse(groupBook);
    expect(result.book.author).toBeNull();
    expect(result.startDate).toBeNull();
    expect(result.targetPage).toBeNull();
  });
});

// ============================================================================
// Status Workflow Tests
// ============================================================================

describe("Status Workflow", () => {
  it("should support UPCOMING status for scheduled books", () => {
    const input = addGroupBookSchema.safeParse({
      bookId: "book-1",
      status: "UPCOMING",
      startDate: "2026-03-01T00:00:00.000Z",
    });
    expect(input.success).toBe(true);
  });

  it("should support CURRENT status for active reading", () => {
    const input = updateGroupBookSchema.safeParse({
      status: "CURRENT",
    });
    expect(input.success).toBe(true);
  });

  it("should support COMPLETED status for finished books", () => {
    const input = updateGroupBookSchema.safeParse({
      status: "COMPLETED",
    });
    expect(input.success).toBe(true);
  });

  it("should support SKIPPED status for books not read", () => {
    const input = updateGroupBookSchema.safeParse({
      status: "SKIPPED",
    });
    expect(input.success).toBe(true);
  });

  it("should allow updating targetPage during reading", () => {
    const input = updateGroupBookSchema.safeParse({
      status: "CURRENT",
      targetPage: 75,
    });
    expect(input.success).toBe(true);
    if (input.success) {
      expect(input.data.targetPage).toBe(75);
    }
  });

  it("should allow clearing dates when marking as skipped", () => {
    const input = updateGroupBookSchema.safeParse({
      status: "SKIPPED",
      startDate: null,
      endDate: null,
    });
    expect(input.success).toBe(true);
  });
});
