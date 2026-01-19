/**
 * Tests for Curriculum Item API
 * PUT, DELETE /api/curriculums/:id/items/:itemId
 */

import { describe, it, expect } from "vitest";
import {
  // Constants
  MAX_NOTES_LENGTH,
  MAX_EXTERNAL_TITLE_LENGTH,
  MAX_EXTERNAL_AUTHOR_LENGTH,
  MAX_EXTERNAL_URL_LENGTH,
  MAX_ISBN_LENGTH,
  MAX_ESTIMATED_TIME,
  // Types
  type ItemBookInfo,
  type CurriculumItemResponse,
  type UpdateItemInput,
  // Schemas
  updateItemSchema,
  // Helpers
  validateCurriculumId,
  validateItemId,
  formatDate,
  mapToItemBookInfo,
  mapToItemResponse,
  isOwner,
  buildItemsCacheKey,
  buildCurriculumCacheKey,
} from "./[itemId].js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have correct MAX_NOTES_LENGTH", () => {
    expect(MAX_NOTES_LENGTH).toBe(5000);
  });

  it("should have correct MAX_EXTERNAL_TITLE_LENGTH", () => {
    expect(MAX_EXTERNAL_TITLE_LENGTH).toBe(500);
  });

  it("should have correct MAX_EXTERNAL_AUTHOR_LENGTH", () => {
    expect(MAX_EXTERNAL_AUTHOR_LENGTH).toBe(200);
  });

  it("should have correct MAX_EXTERNAL_URL_LENGTH", () => {
    expect(MAX_EXTERNAL_URL_LENGTH).toBe(2000);
  });

  it("should have correct MAX_ISBN_LENGTH", () => {
    expect(MAX_ISBN_LENGTH).toBe(20);
  });

  it("should have correct MAX_ESTIMATED_TIME", () => {
    expect(MAX_ESTIMATED_TIME).toBe(1440);
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type exports", () => {
  it("should export ItemBookInfo type", () => {
    const info: ItemBookInfo = {
      id: "book1",
      title: "Test Book",
      author: "Author",
      coverImage: "https://example.com/cover.jpg",
    };
    expect(info).toBeDefined();
  });

  it("should export CurriculumItemResponse type", () => {
    const item: CurriculumItemResponse = {
      id: "item1",
      orderIndex: 0,
      bookId: "book1",
      book: null,
      externalTitle: null,
      externalAuthor: null,
      externalUrl: null,
      externalIsbn: null,
      notes: "Notes",
      estimatedTime: 60,
      isOptional: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(item).toBeDefined();
  });

  it("should export UpdateItemInput type", () => {
    const input: UpdateItemInput = {
      notes: "Updated notes",
      isOptional: true,
    };
    expect(input).toBeDefined();
  });
});

// ============================================================================
// updateItemSchema Tests
// ============================================================================

describe("updateItemSchema", () => {
  it("should accept valid update with notes only", () => {
    const result = updateItemSchema.safeParse({
      notes: "Updated notes",
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid update with isOptional only", () => {
    const result = updateItemSchema.safeParse({
      isOptional: true,
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid update with estimatedTime only", () => {
    const result = updateItemSchema.safeParse({
      estimatedTime: 90,
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid update with bookId", () => {
    const result = updateItemSchema.safeParse({
      bookId: "new-book-id",
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid update with externalTitle", () => {
    const result = updateItemSchema.safeParse({
      externalTitle: "New External Title",
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid update with all fields", () => {
    const result = updateItemSchema.safeParse({
      bookId: null,
      externalTitle: "New Title",
      externalAuthor: "New Author",
      externalUrl: "https://example.com/new",
      externalIsbn: "1234567890",
      notes: "New notes",
      estimatedTime: 120,
      isOptional: true,
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty input", () => {
    const result = updateItemSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should reject empty bookId", () => {
    const result = updateItemSchema.safeParse({
      bookId: "",
    });
    expect(result.success).toBe(false);
  });

  it("should accept null bookId", () => {
    const result = updateItemSchema.safeParse({
      bookId: null,
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty externalTitle", () => {
    const result = updateItemSchema.safeParse({
      externalTitle: "",
    });
    expect(result.success).toBe(false);
  });

  it("should accept null externalTitle", () => {
    const result = updateItemSchema.safeParse({
      externalTitle: null,
    });
    expect(result.success).toBe(true);
  });

  it("should reject externalTitle exceeding max length", () => {
    const result = updateItemSchema.safeParse({
      externalTitle: "a".repeat(MAX_EXTERNAL_TITLE_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should reject externalAuthor exceeding max length", () => {
    const result = updateItemSchema.safeParse({
      externalAuthor: "a".repeat(MAX_EXTERNAL_AUTHOR_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid externalUrl", () => {
    const result = updateItemSchema.safeParse({
      externalUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("should reject externalUrl exceeding max length", () => {
    const result = updateItemSchema.safeParse({
      externalUrl: "https://example.com/" + "a".repeat(MAX_EXTERNAL_URL_LENGTH),
    });
    expect(result.success).toBe(false);
  });

  it("should reject externalIsbn exceeding max length", () => {
    const result = updateItemSchema.safeParse({
      externalIsbn: "a".repeat(MAX_ISBN_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should reject notes exceeding max length", () => {
    const result = updateItemSchema.safeParse({
      notes: "a".repeat(MAX_NOTES_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should reject estimatedTime less than 1", () => {
    const result = updateItemSchema.safeParse({
      estimatedTime: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative estimatedTime", () => {
    const result = updateItemSchema.safeParse({
      estimatedTime: -10,
    });
    expect(result.success).toBe(false);
  });

  it("should reject estimatedTime exceeding max", () => {
    const result = updateItemSchema.safeParse({
      estimatedTime: MAX_ESTIMATED_TIME + 1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject non-integer estimatedTime", () => {
    const result = updateItemSchema.safeParse({
      estimatedTime: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("should accept null estimatedTime", () => {
    const result = updateItemSchema.safeParse({
      estimatedTime: null,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// validateCurriculumId Tests
// ============================================================================

describe("validateCurriculumId", () => {
  it("should return trimmed ID for valid string", () => {
    expect(validateCurriculumId("  abc123  ")).toBe("abc123");
  });

  it("should return ID for normal string", () => {
    expect(validateCurriculumId("curriculum-id")).toBe("curriculum-id");
  });

  it("should return null for empty string", () => {
    expect(validateCurriculumId("")).toBeNull();
  });

  it("should return null for whitespace-only string", () => {
    expect(validateCurriculumId("   ")).toBeNull();
  });

  it("should return null for non-string", () => {
    expect(validateCurriculumId(123)).toBeNull();
  });

  it("should return null for null", () => {
    expect(validateCurriculumId(null)).toBeNull();
  });

  it("should return null for undefined", () => {
    expect(validateCurriculumId(undefined)).toBeNull();
  });
});

// ============================================================================
// validateItemId Tests
// ============================================================================

describe("validateItemId", () => {
  it("should return trimmed ID for valid string", () => {
    expect(validateItemId("  item123  ")).toBe("item123");
  });

  it("should return ID for normal string", () => {
    expect(validateItemId("item-id")).toBe("item-id");
  });

  it("should return null for empty string", () => {
    expect(validateItemId("")).toBeNull();
  });

  it("should return null for whitespace-only string", () => {
    expect(validateItemId("   ")).toBeNull();
  });

  it("should return null for non-string", () => {
    expect(validateItemId(123)).toBeNull();
  });

  it("should return null for null", () => {
    expect(validateItemId(null)).toBeNull();
  });

  it("should return null for undefined", () => {
    expect(validateItemId(undefined)).toBeNull();
  });
});

// ============================================================================
// formatDate Tests
// ============================================================================

describe("formatDate", () => {
  it("should format date as ISO string", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    expect(formatDate(date)).toBe("2024-01-15T10:30:00.000Z");
  });

  it("should handle different dates", () => {
    const date = new Date("2023-06-30T23:59:59.999Z");
    expect(formatDate(date)).toBe("2023-06-30T23:59:59.999Z");
  });
});

// ============================================================================
// mapToItemBookInfo Tests
// ============================================================================

describe("mapToItemBookInfo", () => {
  it("should return null for null input", () => {
    expect(mapToItemBookInfo(null)).toBeNull();
  });

  it("should map book data correctly", () => {
    const book = {
      id: "book1",
      title: "Test Book",
      author: "Test Author",
      coverImage: "https://example.com/cover.jpg",
    };
    expect(mapToItemBookInfo(book)).toEqual({
      id: "book1",
      title: "Test Book",
      author: "Test Author",
      coverImage: "https://example.com/cover.jpg",
    });
  });

  it("should handle null author and coverImage", () => {
    const book = {
      id: "book1",
      title: "Test Book",
      author: null,
      coverImage: null,
    };
    expect(mapToItemBookInfo(book)).toEqual({
      id: "book1",
      title: "Test Book",
      author: null,
      coverImage: null,
    });
  });
});

// ============================================================================
// mapToItemResponse Tests
// ============================================================================

describe("mapToItemResponse", () => {
  it("should map item with book", () => {
    const item = {
      id: "item1",
      orderIndex: 0,
      bookId: "book1",
      book: {
        id: "book1",
        title: "Test Book",
        author: "Author",
        coverImage: "https://example.com/cover.jpg",
      },
      externalTitle: null,
      externalAuthor: null,
      externalUrl: null,
      externalIsbn: null,
      notes: "Notes",
      estimatedTime: 60,
      isOptional: false,
      createdAt: new Date("2024-01-15T10:00:00.000Z"),
      updatedAt: new Date("2024-01-15T11:00:00.000Z"),
    };

    const result = mapToItemResponse(item);

    expect(result.id).toBe("item1");
    expect(result.orderIndex).toBe(0);
    expect(result.bookId).toBe("book1");
    expect(result.book).toEqual({
      id: "book1",
      title: "Test Book",
      author: "Author",
      coverImage: "https://example.com/cover.jpg",
    });
    expect(result.externalTitle).toBeNull();
    expect(result.notes).toBe("Notes");
    expect(result.estimatedTime).toBe(60);
    expect(result.isOptional).toBe(false);
    expect(result.createdAt).toBe("2024-01-15T10:00:00.000Z");
    expect(result.updatedAt).toBe("2024-01-15T11:00:00.000Z");
  });

  it("should map item with external resource", () => {
    const item = {
      id: "item2",
      orderIndex: 1,
      bookId: null,
      book: null,
      externalTitle: "External Article",
      externalAuthor: "John Doe",
      externalUrl: "https://example.com/article",
      externalIsbn: "1234567890",
      notes: null,
      estimatedTime: null,
      isOptional: true,
      createdAt: new Date("2024-01-15T10:00:00.000Z"),
      updatedAt: new Date("2024-01-15T11:00:00.000Z"),
    };

    const result = mapToItemResponse(item);

    expect(result.bookId).toBeNull();
    expect(result.book).toBeNull();
    expect(result.externalTitle).toBe("External Article");
    expect(result.externalAuthor).toBe("John Doe");
    expect(result.externalUrl).toBe("https://example.com/article");
    expect(result.externalIsbn).toBe("1234567890");
    expect(result.isOptional).toBe(true);
  });

  it("should map item with all null optional fields", () => {
    const item = {
      id: "item3",
      orderIndex: 2,
      bookId: "book1",
      book: null,
      externalTitle: null,
      externalAuthor: null,
      externalUrl: null,
      externalIsbn: null,
      notes: null,
      estimatedTime: null,
      isOptional: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = mapToItemResponse(item);

    expect(result.notes).toBeNull();
    expect(result.estimatedTime).toBeNull();
    expect(result.externalTitle).toBeNull();
  });
});

// ============================================================================
// isOwner Tests
// ============================================================================

describe("isOwner", () => {
  it("should return true for matching IDs", () => {
    expect(isOwner("user1", "user1")).toBe(true);
  });

  it("should return false for different IDs", () => {
    expect(isOwner("user1", "user2")).toBe(false);
  });

  it("should handle empty strings", () => {
    expect(isOwner("", "")).toBe(true);
    expect(isOwner("user1", "")).toBe(false);
  });
});

// ============================================================================
// buildItemsCacheKey Tests
// ============================================================================

describe("buildItemsCacheKey", () => {
  it("should build correct cache key", () => {
    const key = buildItemsCacheKey("curriculum123");
    expect(key).toContain("curriculum123");
    expect(key).toContain("items");
  });

  it("should include curriculum ID", () => {
    const key = buildItemsCacheKey("abc-def-123");
    expect(key).toContain("abc-def-123");
  });
});

// ============================================================================
// buildCurriculumCacheKey Tests
// ============================================================================

describe("buildCurriculumCacheKey", () => {
  it("should build correct cache key", () => {
    const key = buildCurriculumCacheKey("curriculum123");
    expect(key).toContain("curriculum123");
  });

  it("should include curriculum ID", () => {
    const key = buildCurriculumCacheKey("xyz-789");
    expect(key).toContain("xyz-789");
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge cases", () => {
  it("should accept updating only isOptional to false", () => {
    const result = updateItemSchema.safeParse({
      isOptional: false,
    });
    expect(result.success).toBe(true);
  });

  it("should handle boundary value for estimatedTime min", () => {
    const result = updateItemSchema.safeParse({
      estimatedTime: 1,
    });
    expect(result.success).toBe(true);
  });

  it("should handle boundary value for estimatedTime max", () => {
    const result = updateItemSchema.safeParse({
      estimatedTime: MAX_ESTIMATED_TIME,
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid URL with special characters", () => {
    const result = updateItemSchema.safeParse({
      externalUrl: "https://example.com/path?query=value&foo=bar#section",
    });
    expect(result.success).toBe(true);
  });

  it("should validate all null values as valid update", () => {
    const result = updateItemSchema.safeParse({
      bookId: null,
      externalTitle: null,
      notes: null,
      estimatedTime: null,
    });
    expect(result.success).toBe(true);
  });

  it("should handle item ID with special characters", () => {
    expect(validateItemId("item_abc-123")).toBe("item_abc-123");
    expect(validateItemId("cuid-format-id")).toBe("cuid-format-id");
  });

  it("should handle curriculum ID with special characters", () => {
    expect(validateCurriculumId("curr_abc-123")).toBe("curr_abc-123");
    expect(validateCurriculumId("cuid-format-id")).toBe("cuid-format-id");
  });
});

// ============================================================================
// Integration-style Tests
// ============================================================================

describe("Integration-style tests", () => {
  it("should handle updating item to book reference", () => {
    const input = {
      bookId: "new-book-id",
    };

    const validationResult = updateItemSchema.safeParse(input);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.bookId).toBe("new-book-id");
    }
  });

  it("should handle updating item to external resource", () => {
    const input = {
      bookId: null,
      externalTitle: "New External Resource",
      externalUrl: "https://example.com/resource",
    };

    const validationResult = updateItemSchema.safeParse(input);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.bookId).toBeNull();
      expect(validationResult.data.externalTitle).toBe("New External Resource");
    }
  });

  it("should handle updating item metadata", () => {
    const input = {
      notes: "Updated study notes",
      estimatedTime: 45,
      isOptional: true,
    };

    const validationResult = updateItemSchema.safeParse(input);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.notes).toBe("Updated study notes");
      expect(validationResult.data.estimatedTime).toBe(45);
      expect(validationResult.data.isOptional).toBe(true);
    }
  });

  it("should handle clearing notes by setting to null", () => {
    const input = {
      notes: null,
    };

    const validationResult = updateItemSchema.safeParse(input);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.notes).toBeNull();
    }
  });
});
