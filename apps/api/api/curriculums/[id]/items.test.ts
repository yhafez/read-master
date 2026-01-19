/**
 * Tests for Curriculum Items API
 * GET, POST, PUT /api/curriculums/:id/items
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
  MAX_ITEMS_PER_CURRICULUM,
  // Types
  type ItemBookInfo,
  type CurriculumItemResponse,
  type AddItemInput,
  type ReorderItemsInput,
  // Schemas
  addItemSchema,
  reorderItemsSchema,
  // Helpers
  validateCurriculumId,
  formatDate,
  mapToItemBookInfo,
  mapToItemResponse,
  canAccessCurriculum,
  isOwner,
  buildItemsCacheKey,
  buildCurriculumCacheKey,
} from "./items.js";

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

  it("should have correct MAX_ITEMS_PER_CURRICULUM", () => {
    expect(MAX_ITEMS_PER_CURRICULUM).toBe(200);
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

  it("should export AddItemInput type", () => {
    const input: AddItemInput = {
      bookId: "book1",
      notes: "Notes",
    };
    expect(input).toBeDefined();
  });

  it("should export ReorderItemsInput type", () => {
    const input: ReorderItemsInput = {
      itemIds: ["item1", "item2"],
    };
    expect(input).toBeDefined();
  });
});

// ============================================================================
// addItemSchema Tests
// ============================================================================

describe("addItemSchema", () => {
  it("should accept valid input with bookId", () => {
    const result = addItemSchema.safeParse({
      bookId: "book123",
      notes: "Read chapters 1-5",
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid input with externalTitle", () => {
    const result = addItemSchema.safeParse({
      externalTitle: "External Article",
      externalUrl: "https://example.com/article",
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid input with all fields", () => {
    const result = addItemSchema.safeParse({
      externalTitle: "External Book",
      externalAuthor: "John Doe",
      externalUrl: "https://example.com/book",
      externalIsbn: "1234567890123",
      notes: "Great resource",
      estimatedTime: 120,
      isOptional: true,
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty input", () => {
    const result = addItemSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should reject input without bookId or externalTitle", () => {
    const result = addItemSchema.safeParse({
      notes: "Just notes",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty bookId", () => {
    const result = addItemSchema.safeParse({
      bookId: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty externalTitle", () => {
    const result = addItemSchema.safeParse({
      externalTitle: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject externalTitle exceeding max length", () => {
    const result = addItemSchema.safeParse({
      externalTitle: "a".repeat(MAX_EXTERNAL_TITLE_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should reject externalAuthor exceeding max length", () => {
    const result = addItemSchema.safeParse({
      externalTitle: "Title",
      externalAuthor: "a".repeat(MAX_EXTERNAL_AUTHOR_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid externalUrl", () => {
    const result = addItemSchema.safeParse({
      externalTitle: "Title",
      externalUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("should reject externalUrl exceeding max length", () => {
    const result = addItemSchema.safeParse({
      externalTitle: "Title",
      externalUrl: "https://example.com/" + "a".repeat(MAX_EXTERNAL_URL_LENGTH),
    });
    expect(result.success).toBe(false);
  });

  it("should reject externalIsbn exceeding max length", () => {
    const result = addItemSchema.safeParse({
      externalTitle: "Title",
      externalIsbn: "a".repeat(MAX_ISBN_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should reject notes exceeding max length", () => {
    const result = addItemSchema.safeParse({
      bookId: "book123",
      notes: "a".repeat(MAX_NOTES_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("should reject estimatedTime less than 1", () => {
    const result = addItemSchema.safeParse({
      bookId: "book123",
      estimatedTime: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject estimatedTime exceeding max", () => {
    const result = addItemSchema.safeParse({
      bookId: "book123",
      estimatedTime: MAX_ESTIMATED_TIME + 1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject non-integer estimatedTime", () => {
    const result = addItemSchema.safeParse({
      bookId: "book123",
      estimatedTime: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("should accept null values for optional fields", () => {
    const result = addItemSchema.safeParse({
      bookId: "book123",
      externalAuthor: null,
      externalUrl: null,
      notes: null,
      estimatedTime: null,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// reorderItemsSchema Tests
// ============================================================================

describe("reorderItemsSchema", () => {
  it("should accept valid item IDs array", () => {
    const result = reorderItemsSchema.safeParse({
      itemIds: ["item1", "item2", "item3"],
    });
    expect(result.success).toBe(true);
  });

  it("should accept single item ID", () => {
    const result = reorderItemsSchema.safeParse({
      itemIds: ["item1"],
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty array", () => {
    const result = reorderItemsSchema.safeParse({
      itemIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty item ID", () => {
    const result = reorderItemsSchema.safeParse({
      itemIds: ["item1", ""],
    });
    expect(result.success).toBe(false);
  });

  it("should reject array exceeding max items", () => {
    const result = reorderItemsSchema.safeParse({
      itemIds: Array.from(
        { length: MAX_ITEMS_PER_CURRICULUM + 1 },
        (_, i) => `item${i}`
      ),
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing itemIds", () => {
    const result = reorderItemsSchema.safeParse({});
    expect(result.success).toBe(false);
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
      externalIsbn: null,
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
    expect(result.isOptional).toBe(true);
  });
});

// ============================================================================
// canAccessCurriculum Tests
// ============================================================================

describe("canAccessCurriculum", () => {
  it("should allow access to PUBLIC curriculum", () => {
    const curriculum = {
      visibility: "PUBLIC" as const,
      userId: "user1",
    };
    expect(canAccessCurriculum(curriculum, "user2")).toBe(true);
  });

  it("should allow access to UNLISTED curriculum", () => {
    const curriculum = {
      visibility: "UNLISTED" as const,
      userId: "user1",
    };
    expect(canAccessCurriculum(curriculum, "user2")).toBe(true);
  });

  it("should allow owner to access PRIVATE curriculum", () => {
    const curriculum = {
      visibility: "PRIVATE" as const,
      userId: "user1",
    };
    expect(canAccessCurriculum(curriculum, "user1")).toBe(true);
  });

  it("should allow follower to access PRIVATE curriculum", () => {
    const curriculum = {
      visibility: "PRIVATE" as const,
      userId: "user1",
      followers: [{ userId: "user2" }],
    };
    expect(canAccessCurriculum(curriculum, "user2")).toBe(true);
  });

  it("should deny non-follower access to PRIVATE curriculum", () => {
    const curriculum = {
      visibility: "PRIVATE" as const,
      userId: "user1",
      followers: [{ userId: "user3" }],
    };
    expect(canAccessCurriculum(curriculum, "user2")).toBe(false);
  });

  it("should deny access when no followers array for PRIVATE curriculum", () => {
    const curriculum = {
      visibility: "PRIVATE" as const,
      userId: "user1",
    };
    expect(canAccessCurriculum(curriculum, "user2")).toBe(false);
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
  it("should handle item with all null optional fields", () => {
    const item = {
      id: "item1",
      orderIndex: 0,
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
  });

  it("should handle item at max orderIndex", () => {
    const item = {
      id: "item1",
      orderIndex: MAX_ITEMS_PER_CURRICULUM - 1,
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
    expect(result.orderIndex).toBe(MAX_ITEMS_PER_CURRICULUM - 1);
  });

  it("should validate estimatedTime at boundary values", () => {
    // Min boundary
    const minResult = addItemSchema.safeParse({
      bookId: "book1",
      estimatedTime: 1,
    });
    expect(minResult.success).toBe(true);

    // Max boundary
    const maxResult = addItemSchema.safeParse({
      bookId: "book1",
      estimatedTime: MAX_ESTIMATED_TIME,
    });
    expect(maxResult.success).toBe(true);
  });

  it("should accept valid URL with special characters", () => {
    const result = addItemSchema.safeParse({
      externalTitle: "Article",
      externalUrl: "https://example.com/path?query=value&foo=bar#section",
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Integration-style Tests
// ============================================================================

describe("Integration-style tests", () => {
  it("should handle complete book item scenario", () => {
    const input = {
      bookId: "book-uuid-1234",
      notes: "Focus on chapters 3 and 5",
      estimatedTime: 120,
      isOptional: false,
    };

    const validationResult = addItemSchema.safeParse(input);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.bookId).toBe("book-uuid-1234");
      expect(validationResult.data.notes).toBe("Focus on chapters 3 and 5");
      expect(validationResult.data.estimatedTime).toBe(120);
    }
  });

  it("should handle complete external resource scenario", () => {
    const input = {
      externalTitle: "Introduction to Machine Learning",
      externalAuthor: "Dr. Jane Smith",
      externalUrl: "https://ml-course.example.com/intro",
      externalIsbn: "978-0-123456-78-9",
      notes: "Excellent video series",
      estimatedTime: 180,
      isOptional: true,
    };

    const validationResult = addItemSchema.safeParse(input);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.externalTitle).toBe(
        "Introduction to Machine Learning"
      );
      expect(validationResult.data.externalAuthor).toBe("Dr. Jane Smith");
      expect(validationResult.data.isOptional).toBe(true);
    }
  });

  it("should handle reorder scenario correctly", () => {
    const input = {
      itemIds: ["item-c", "item-a", "item-b"],
    };

    const validationResult = reorderItemsSchema.safeParse(input);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.itemIds).toHaveLength(3);
      expect(validationResult.data.itemIds[0]).toBe("item-c");
    }
  });
});
