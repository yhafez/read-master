/**
 * Tests for Flashcard CRUD endpoints
 *
 * Tests cover:
 * - formatFlashcardResponse function
 * - buildWhereClause function with all filter combinations
 * - buildOrderByClause function with all sort options
 * - Request validation schemas
 * - Constants verification
 */

import { describe, it, expect } from "vitest";
import {
  formatFlashcard,
  buildWhereClause,
  buildOrderByClause,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  SUPPORTED_METHODS,
  VALID_TYPES,
  VALID_STATUSES,
  type FlashcardResponse,
} from "./index.js";
import {
  createFlashcardSchema,
  updateFlashcardSchema,
  flashcardQuerySchema,
  flashcardIdSchema,
} from "@read-master/shared/schemas";

// ============================================================================
// Test Data
// ============================================================================

const mockFlashcard = {
  id: "clflashcard123456789",
  userId: "cluser123456789012",
  bookId: "clbook123456789012",
  front: "What is photosynthesis?",
  back: "The process by which plants convert light energy into chemical energy",
  type: "CONCEPT" as const,
  status: "NEW" as const,
  tags: ["biology", "plants"],
  sourceChapterId: "clchapter12345678",
  sourceOffset: 1500,
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
  dueDate: new Date("2026-01-18T10:00:00Z"),
  totalReviews: 0,
  correctReviews: 0,
  createdAt: new Date("2026-01-15T10:00:00Z"),
  updatedAt: new Date("2026-01-15T10:00:00Z"),
};

const mockFlashcardNoBook = {
  ...mockFlashcard,
  id: "clflashcardnobook123",
  bookId: null,
  sourceChapterId: null,
  sourceOffset: null,
};

// ============================================================================
// formatFlashcardResponse Tests
// ============================================================================

describe("formatFlashcardResponse", () => {
  it("formats flashcard with all fields correctly", () => {
    const result = formatFlashcard(mockFlashcard);

    expect(result).toEqual({
      id: "clflashcard123456789",
      userId: "cluser123456789012",
      bookId: "clbook123456789012",
      front: "What is photosynthesis?",
      back: "The process by which plants convert light energy into chemical energy",
      type: "CONCEPT",
      status: "NEW",
      tags: ["biology", "plants"],
      sourceChapterId: "clchapter12345678",
      sourceOffset: 1500,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      dueDate: "2026-01-18T10:00:00.000Z",
      totalReviews: 0,
      correctReviews: 0,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    } satisfies FlashcardResponse);
  });

  it("handles flashcard without book association", () => {
    const result = formatFlashcard(mockFlashcardNoBook);

    expect(result.bookId).toBeNull();
    expect(result.sourceChapterId).toBeNull();
    expect(result.sourceOffset).toBeNull();
  });

  it("converts dates to ISO strings", () => {
    const result = formatFlashcard(mockFlashcard);

    expect(result.dueDate).toBe("2026-01-18T10:00:00.000Z");
    expect(result.createdAt).toBe("2026-01-15T10:00:00.000Z");
    expect(result.updatedAt).toBe("2026-01-15T10:00:00.000Z");
  });

  it("preserves SM-2 algorithm fields", () => {
    const reviewedFlashcard = {
      ...mockFlashcard,
      easeFactor: 2.2,
      interval: 6,
      repetitions: 3,
      totalReviews: 5,
      correctReviews: 4,
    };

    const result = formatFlashcard(reviewedFlashcard);

    expect(result.easeFactor).toBe(2.2);
    expect(result.interval).toBe(6);
    expect(result.repetitions).toBe(3);
    expect(result.totalReviews).toBe(5);
    expect(result.correctReviews).toBe(4);
  });

  it("handles different flashcard types", () => {
    const types = [
      "VOCABULARY",
      "CONCEPT",
      "COMPREHENSION",
      "QUOTE",
      "CUSTOM",
    ] as const;

    for (const type of types) {
      const flashcard = { ...mockFlashcard, type };
      const result = formatFlashcard(flashcard);
      expect(result.type).toBe(type);
    }
  });

  it("handles different flashcard statuses", () => {
    const statuses = ["NEW", "LEARNING", "REVIEW", "SUSPENDED"] as const;

    for (const status of statuses) {
      const flashcard = { ...mockFlashcard, status };
      const result = formatFlashcard(flashcard);
      expect(result.status).toBe(status);
    }
  });

  it("handles empty tags array", () => {
    const flashcard = { ...mockFlashcard, tags: [] };
    const result = formatFlashcard(flashcard);

    expect(result.tags).toEqual([]);
  });
});

// ============================================================================
// buildWhereClause Tests
// ============================================================================

describe("buildWhereClause", () => {
  const userId = "cluser123456789012";

  // Helper function to create base query with required fields
  const baseQuery = (overrides = {}) => ({
    page: 1,
    limit: 20,
    sortBy: "dueDate" as const,
    sortDirection: "asc" as const,
    dueOnly: false,
    includeDeleted: false,
    ...overrides,
  });

  it("builds basic where clause with userId", () => {
    const query = baseQuery();
    const result = buildWhereClause(userId, query);

    expect(result).toEqual({
      userId,
      deletedAt: null,
    });
  });

  it("includes bookId filter", () => {
    const query = baseQuery({ bookId: "clbook123456789012" });
    const result = buildWhereClause(userId, query);

    expect(result.bookId).toBe("clbook123456789012");
  });

  it("includes status filter", () => {
    const query = baseQuery({ status: "NEW" as const });
    const result = buildWhereClause(userId, query);

    expect(result.status).toBe("NEW");
  });

  it("includes type filter", () => {
    const query = baseQuery({ type: "VOCABULARY" as const });
    const result = buildWhereClause(userId, query);

    expect(result.type).toBe("VOCABULARY");
  });

  it("includes tags filter with hasEvery", () => {
    const query = baseQuery({ tags: ["biology", "science"] });
    const result = buildWhereClause(userId, query);

    expect(result.tags).toEqual({
      hasEvery: ["biology", "science"],
    });
  });

  it("handles dueOnly filter", () => {
    const query = baseQuery({ dueOnly: true });
    const result = buildWhereClause(userId, query);

    expect(result.dueDate).toBeDefined();
    expect(result.status).toEqual({ not: "SUSPENDED" });
  });

  it("includes dueBefore filter", () => {
    const dueDate = new Date("2026-01-20T00:00:00Z");
    const query = baseQuery({ dueBefore: dueDate });
    const result = buildWhereClause(userId, query);

    expect(result.dueDate).toEqual({ lte: dueDate });
  });

  it("includes search filter with OR clause", () => {
    const query = baseQuery({ search: "photosynthesis" });
    const result = buildWhereClause(userId, query);

    expect(result.OR).toEqual([
      { front: { contains: "photosynthesis", mode: "insensitive" } },
      { back: { contains: "photosynthesis", mode: "insensitive" } },
    ]);
  });

  it("includes deleted when includeDeleted is true", () => {
    const query = baseQuery({ includeDeleted: true });
    const result = buildWhereClause(userId, query);

    expect(result.deletedAt).toBeUndefined();
  });

  it("excludes deleted by default", () => {
    const query = baseQuery({ includeDeleted: false });
    const result = buildWhereClause(userId, query);

    expect(result.deletedAt).toBeNull();
  });

  it("combines multiple filters", () => {
    const query = baseQuery({
      bookId: "clbook123456789012",
      status: "LEARNING" as const,
      type: "CONCEPT" as const,
      tags: ["science"],
    });
    const result = buildWhereClause(userId, query);

    expect(result.userId).toBe(userId);
    expect(result.bookId).toBe("clbook123456789012");
    expect(result.status).toBe("LEARNING");
    expect(result.type).toBe("CONCEPT");
    expect(result.tags).toEqual({ hasEvery: ["science"] });
    expect(result.deletedAt).toBeNull();
  });

  it("does not add empty tags filter", () => {
    const query = baseQuery({ tags: [] });
    const result = buildWhereClause(userId, query);

    expect(result.tags).toBeUndefined();
  });
});

// ============================================================================
// buildOrderByClause Tests
// ============================================================================

describe("buildOrderByClause", () => {
  it("sorts by createdAt", () => {
    expect(buildOrderByClause("createdAt", "asc")).toEqual({
      createdAt: "asc",
    });
    expect(buildOrderByClause("createdAt", "desc")).toEqual({
      createdAt: "desc",
    });
  });

  it("sorts by updatedAt", () => {
    expect(buildOrderByClause("updatedAt", "asc")).toEqual({
      updatedAt: "asc",
    });
    expect(buildOrderByClause("updatedAt", "desc")).toEqual({
      updatedAt: "desc",
    });
  });

  it("sorts by dueDate", () => {
    expect(buildOrderByClause("dueDate", "asc")).toEqual({ dueDate: "asc" });
    expect(buildOrderByClause("dueDate", "desc")).toEqual({ dueDate: "desc" });
  });

  it("sorts by easeFactor", () => {
    expect(buildOrderByClause("easeFactor", "asc")).toEqual({
      easeFactor: "asc",
    });
    expect(buildOrderByClause("easeFactor", "desc")).toEqual({
      easeFactor: "desc",
    });
  });

  it("sorts by interval", () => {
    expect(buildOrderByClause("interval", "asc")).toEqual({ interval: "asc" });
    expect(buildOrderByClause("interval", "desc")).toEqual({
      interval: "desc",
    });
  });

  it("sorts by front", () => {
    expect(buildOrderByClause("front", "asc")).toEqual({ front: "asc" });
    expect(buildOrderByClause("front", "desc")).toEqual({ front: "desc" });
  });

  it("defaults to dueDate ascending for unknown sort field", () => {
    expect(buildOrderByClause("unknown", "asc")).toEqual({ dueDate: "asc" });
    expect(buildOrderByClause("invalid", "desc")).toEqual({ dueDate: "asc" });
  });
});

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("createFlashcardSchema", () => {
  it("validates minimal valid input", () => {
    const result = createFlashcardSchema.safeParse({
      front: "What is a variable?",
      back: "A named storage location in computer memory",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.front).toBe("What is a variable?");
      expect(result.data.back).toBe(
        "A named storage location in computer memory"
      );
      expect(result.data.type).toBe("CUSTOM"); // Default value
    }
  });

  it("validates full input with all fields", () => {
    const result = createFlashcardSchema.safeParse({
      front: "What is photosynthesis?",
      back: "The process by which plants convert light energy into chemical energy",
      type: "CONCEPT",
      bookId: "clbook123456789012",
      tags: ["biology", "plants"],
      sourceChapterId: "clchapter12345678",
      sourceOffset: 1500,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("CONCEPT");
      expect(result.data.bookId).toBe("clbook123456789012");
      expect(result.data.tags).toEqual(["biology", "plants"]);
    }
  });

  it("rejects empty front", () => {
    const result = createFlashcardSchema.safeParse({
      front: "",
      back: "Some answer",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty back", () => {
    const result = createFlashcardSchema.safeParse({
      front: "Some question",
      back: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects front exceeding 1000 characters", () => {
    const result = createFlashcardSchema.safeParse({
      front: "x".repeat(1001),
      back: "Some answer",
    });

    expect(result.success).toBe(false);
  });

  it("rejects back exceeding 5000 characters", () => {
    const result = createFlashcardSchema.safeParse({
      front: "Some question",
      back: "x".repeat(5001),
    });

    expect(result.success).toBe(false);
  });

  it("accepts all valid flashcard types", () => {
    const types = ["VOCABULARY", "CONCEPT", "COMPREHENSION", "QUOTE", "CUSTOM"];

    for (const type of types) {
      const result = createFlashcardSchema.safeParse({
        front: "Question",
        back: "Answer",
        type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid flashcard type", () => {
    const result = createFlashcardSchema.safeParse({
      front: "Question",
      back: "Answer",
      type: "INVALID_TYPE",
    });

    expect(result.success).toBe(false);
  });

  it("validates tags array", () => {
    const result = createFlashcardSchema.safeParse({
      front: "Question",
      back: "Answer",
      tags: ["tag1", "tag2", "tag-with-hyphen", "tag_with_underscore"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects more than 20 tags", () => {
    const result = createFlashcardSchema.safeParse({
      front: "Question",
      back: "Answer",
      tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid bookId format", () => {
    const result = createFlashcardSchema.safeParse({
      front: "Question",
      back: "Answer",
      bookId: "invalid-id",
    });

    expect(result.success).toBe(false);
  });

  it("accepts null bookId", () => {
    const result = createFlashcardSchema.safeParse({
      front: "Question",
      back: "Answer",
      bookId: null,
    });

    expect(result.success).toBe(true);
  });
});

describe("updateFlashcardSchema", () => {
  it("validates update with front only", () => {
    const result = updateFlashcardSchema.safeParse({
      front: "Updated question?",
    });

    expect(result.success).toBe(true);
  });

  it("validates update with back only", () => {
    const result = updateFlashcardSchema.safeParse({
      back: "Updated answer",
    });

    expect(result.success).toBe(true);
  });

  it("validates update with tags only", () => {
    const result = updateFlashcardSchema.safeParse({
      tags: ["new-tag"],
    });

    expect(result.success).toBe(true);
  });

  it("validates update with status only", () => {
    const result = updateFlashcardSchema.safeParse({
      status: "SUSPENDED",
    });

    expect(result.success).toBe(true);
  });

  it("validates update with multiple fields", () => {
    const result = updateFlashcardSchema.safeParse({
      front: "Updated question?",
      back: "Updated answer",
      type: "VOCABULARY",
      tags: ["updated"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty update object", () => {
    const result = updateFlashcardSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("accepts all valid statuses for update", () => {
    const statuses = ["NEW", "LEARNING", "REVIEW", "SUSPENDED"];

    for (const status of statuses) {
      const result = updateFlashcardSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = updateFlashcardSchema.safeParse({
      status: "INVALID",
    });

    expect(result.success).toBe(false);
  });
});

describe("flashcardQuerySchema", () => {
  it("provides default values", () => {
    const result = flashcardQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sortBy).toBe("dueDate");
      expect(result.data.sortDirection).toBe("asc");
      expect(result.data.dueOnly).toBe(false);
      expect(result.data.includeDeleted).toBe(false);
    }
  });

  it("parses page as number", () => {
    const result = flashcardQuerySchema.safeParse({ page: "5" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(5);
    }
  });

  it("parses limit as number", () => {
    const result = flashcardQuerySchema.safeParse({ limit: "50" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });

  it("rejects limit over 100", () => {
    const result = flashcardQuerySchema.safeParse({ limit: "150" });

    expect(result.success).toBe(false);
  });

  it("parses tags from comma-separated string", () => {
    const result = flashcardQuerySchema.safeParse({ tags: "tag1,tag2,tag3" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(["tag1", "tag2", "tag3"]);
    }
  });

  it("parses dueOnly as boolean", () => {
    const result = flashcardQuerySchema.safeParse({ dueOnly: "true" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dueOnly).toBe(true);
    }
  });

  it("validates sortBy field", () => {
    const validSortFields = [
      "createdAt",
      "updatedAt",
      "dueDate",
      "easeFactor",
      "interval",
      "front",
    ];

    for (const sortBy of validSortFields) {
      const result = flashcardQuerySchema.safeParse({ sortBy });
      expect(result.success).toBe(true);
    }
  });

  it("validates sortDirection", () => {
    const result1 = flashcardQuerySchema.safeParse({ sortDirection: "asc" });
    const result2 = flashcardQuerySchema.safeParse({ sortDirection: "desc" });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it("validates status filter", () => {
    const statuses = ["NEW", "LEARNING", "REVIEW", "SUSPENDED"];

    for (const status of statuses) {
      const result = flashcardQuerySchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("validates type filter", () => {
    const types = ["VOCABULARY", "CONCEPT", "COMPREHENSION", "QUOTE", "CUSTOM"];

    for (const type of types) {
      const result = flashcardQuerySchema.safeParse({ type });
      expect(result.success).toBe(true);
    }
  });

  it("validates bookId format", () => {
    const result = flashcardQuerySchema.safeParse({
      bookId: "clbook123456789012",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid bookId format", () => {
    const result = flashcardQuerySchema.safeParse({ bookId: "invalid" });

    expect(result.success).toBe(false);
  });

  it("validates search length", () => {
    const result = flashcardQuerySchema.safeParse({ search: "valid search" });

    expect(result.success).toBe(true);
  });

  it("rejects search over 200 characters", () => {
    const result = flashcardQuerySchema.safeParse({ search: "x".repeat(201) });

    expect(result.success).toBe(false);
  });
});

describe("flashcardIdSchema", () => {
  it("validates valid CUID", () => {
    const result = flashcardIdSchema.safeParse("clflashcard123456789");

    expect(result.success).toBe(true);
  });

  it("rejects empty string", () => {
    const result = flashcardIdSchema.safeParse("");

    expect(result.success).toBe(false);
  });

  it("rejects invalid format", () => {
    const result = flashcardIdSchema.safeParse("invalid-id");

    expect(result.success).toBe(false);
  });

  it("rejects IDs not starting with 'c'", () => {
    const result = flashcardIdSchema.safeParse("xflashcard123456789");

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("has correct DEFAULT_LIMIT", () => {
    expect(DEFAULT_LIMIT).toBe(20);
  });

  it("has correct MAX_LIMIT", () => {
    expect(MAX_LIMIT).toBe(100);
  });

  it("has all supported methods", () => {
    expect(SUPPORTED_METHODS).toContain("GET");
    expect(SUPPORTED_METHODS).toContain("POST");
    expect(SUPPORTED_METHODS).toContain("PUT");
    expect(SUPPORTED_METHODS).toContain("DELETE");
    expect(SUPPORTED_METHODS).toHaveLength(4);
  });

  it("has all valid flashcard types", () => {
    expect(VALID_TYPES).toContain("VOCABULARY");
    expect(VALID_TYPES).toContain("CONCEPT");
    expect(VALID_TYPES).toContain("COMPREHENSION");
    expect(VALID_TYPES).toContain("QUOTE");
    expect(VALID_TYPES).toContain("CUSTOM");
    expect(VALID_TYPES).toHaveLength(5);
  });

  it("has all valid flashcard statuses", () => {
    expect(VALID_STATUSES).toContain("NEW");
    expect(VALID_STATUSES).toContain("LEARNING");
    expect(VALID_STATUSES).toContain("REVIEW");
    expect(VALID_STATUSES).toContain("SUSPENDED");
    expect(VALID_STATUSES).toHaveLength(4);
  });
});

// ============================================================================
// Integration-like Tests (Testing Schema + Helper Function Interaction)
// ============================================================================

describe("Integration: Query Validation and Where Clause Building", () => {
  const userId = "cluser123456789012";

  it("builds correct where clause from validated query with all filters", () => {
    const rawQuery = {
      page: "1",
      limit: "20",
      sortBy: "dueDate",
      sortDirection: "asc",
      bookId: "clbook123456789012",
      status: "LEARNING",
      type: "CONCEPT",
      tags: "biology,plants",
      search: "photosynthesis",
    };

    const validationResult = flashcardQuerySchema.safeParse(rawQuery);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      const where = buildWhereClause(userId, validationResult.data);

      expect(where.userId).toBe(userId);
      expect(where.bookId).toBe("clbook123456789012");
      expect(where.status).toBe("LEARNING");
      expect(where.type).toBe("CONCEPT");
      expect(where.tags).toEqual({ hasEvery: ["biology", "plants"] });
      expect(where.OR).toEqual([
        { front: { contains: "photosynthesis", mode: "insensitive" } },
        { back: { contains: "photosynthesis", mode: "insensitive" } },
      ]);
      expect(where.deletedAt).toBeNull();
    }
  });

  it("builds correct where clause for due cards only", () => {
    const rawQuery = {
      dueOnly: "true",
    };

    const validationResult = flashcardQuerySchema.safeParse(rawQuery);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      const where = buildWhereClause(userId, validationResult.data);

      expect(where.dueDate).toBeDefined();
      expect(where.status).toEqual({ not: "SUSPENDED" });
    }
  });

  it("builds correct orderBy from validated query", () => {
    const rawQuery = {
      sortBy: "easeFactor",
      sortDirection: "desc",
    };

    const validationResult = flashcardQuerySchema.safeParse(rawQuery);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      const orderBy = buildOrderByClause(
        validationResult.data.sortBy,
        validationResult.data.sortDirection
      );

      expect(orderBy).toEqual({ easeFactor: "desc" });
    }
  });
});

describe("Integration: Create Schema and Response Formatting", () => {
  it("creates flashcard data that formats correctly", () => {
    const rawInput = {
      front: "What is a variable?",
      back: "A named storage location",
      type: "VOCABULARY",
      tags: ["programming"],
    };

    const validationResult = createFlashcardSchema.safeParse(rawInput);
    expect(validationResult.success).toBe(true);

    // Simulate what the database would return
    const dbResult = {
      id: "clnewflashcard12345",
      userId: "cluser123456789012",
      bookId: null,
      front: validationResult.success ? validationResult.data.front : "",
      back: validationResult.success ? validationResult.data.back : "",
      type: (validationResult.success
        ? validationResult.data.type
        : "CUSTOM") as "VOCABULARY",
      status: "NEW" as const,
      tags: validationResult.success ? (validationResult.data.tags ?? []) : [],
      sourceChapterId: null,
      sourceOffset: null,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      dueDate: new Date(),
      totalReviews: 0,
      correctReviews: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const response = formatFlashcard(dbResult);

    expect(response.front).toBe("What is a variable?");
    expect(response.back).toBe("A named storage location");
    expect(response.type).toBe("VOCABULARY");
    expect(response.tags).toEqual(["programming"]);
    expect(response.status).toBe("NEW");
  });
});
