/**
 * Tests for Flashcard Zod schemas
 *
 * These tests verify that flashcard validation schemas correctly:
 * - Validate flashcard types (VOCABULARY, CONCEPT, COMPREHENSION, QUOTE, CUSTOM)
 * - Validate flashcard statuses (NEW, LEARNING, REVIEW, SUSPENDED)
 * - Enforce field constraints (front 1-1000 chars, back 1-5000 chars)
 * - Validate SRS rating (1-4)
 * - Handle edge cases and boundary conditions
 */

import { describe, expect, it } from "vitest";

import {
  flashcardTypeSchema,
  flashcardStatusSchema,
  srsRatingSchema,
  flashcardIdSchema,
  flashcardBookIdSchema,
  flashcardFrontSchema,
  flashcardBackSchema,
  flashcardTagSchema,
  flashcardTagsArraySchema,
  easeFactorSchema,
  intervalSchema,
  repetitionsSchema,
  responseTimeMsSchema,
  createFlashcardSchema,
  createFlashcardsSchema,
  updateFlashcardSchema,
  reviewFlashcardSchema,
  reviewFlashcardResponseSchema,
  flashcardQuerySchema,
  flashcardSortFieldSchema,
  dueFlashcardsQuerySchema,
  flashcardIdParamsSchema,
  bookFlashcardIdParamsSchema,
  bulkUpdateFlashcardStatusSchema,
  bulkDeleteFlashcardsSchema,
  flashcardStatsSchema,
  flashcardStatsQuerySchema,
  generateFlashcardsSchema,
  flashcardSchemas,
} from "./flashcards";

// =============================================================================
// ENUM SCHEMAS
// =============================================================================

describe("flashcardTypeSchema", () => {
  it("should accept valid flashcard types", () => {
    expect(flashcardTypeSchema.parse("VOCABULARY")).toBe("VOCABULARY");
    expect(flashcardTypeSchema.parse("CONCEPT")).toBe("CONCEPT");
    expect(flashcardTypeSchema.parse("COMPREHENSION")).toBe("COMPREHENSION");
    expect(flashcardTypeSchema.parse("QUOTE")).toBe("QUOTE");
    expect(flashcardTypeSchema.parse("CUSTOM")).toBe("CUSTOM");
  });

  it("should reject invalid flashcard types", () => {
    expect(() => flashcardTypeSchema.parse("INVALID")).toThrow();
    expect(() => flashcardTypeSchema.parse("vocabulary")).toThrow();
    expect(() => flashcardTypeSchema.parse("")).toThrow();
    expect(() => flashcardTypeSchema.parse(null)).toThrow();
  });
});

describe("flashcardStatusSchema", () => {
  it("should accept valid flashcard statuses", () => {
    expect(flashcardStatusSchema.parse("NEW")).toBe("NEW");
    expect(flashcardStatusSchema.parse("LEARNING")).toBe("LEARNING");
    expect(flashcardStatusSchema.parse("REVIEW")).toBe("REVIEW");
    expect(flashcardStatusSchema.parse("SUSPENDED")).toBe("SUSPENDED");
  });

  it("should reject invalid flashcard statuses", () => {
    expect(() => flashcardStatusSchema.parse("ACTIVE")).toThrow();
    expect(() => flashcardStatusSchema.parse("new")).toThrow();
    expect(() => flashcardStatusSchema.parse("")).toThrow();
  });
});

describe("srsRatingSchema", () => {
  it("should accept valid ratings 1-4", () => {
    expect(srsRatingSchema.parse(1)).toBe(1);
    expect(srsRatingSchema.parse(2)).toBe(2);
    expect(srsRatingSchema.parse(3)).toBe(3);
    expect(srsRatingSchema.parse(4)).toBe(4);
  });

  it("should reject ratings outside 1-4 range", () => {
    expect(() => srsRatingSchema.parse(0)).toThrow("Rating must be at least 1");
    expect(() => srsRatingSchema.parse(5)).toThrow("Rating must be at most 4");
    expect(() => srsRatingSchema.parse(-1)).toThrow();
  });

  it("should reject non-integer ratings", () => {
    expect(() => srsRatingSchema.parse(2.5)).toThrow(
      "Rating must be an integer"
    );
    expect(() => srsRatingSchema.parse(3.14)).toThrow();
  });

  it("should reject non-number ratings", () => {
    expect(() => srsRatingSchema.parse("3")).toThrow();
    expect(() => srsRatingSchema.parse(null)).toThrow();
  });
});

// =============================================================================
// ID SCHEMAS
// =============================================================================

describe("flashcardIdSchema", () => {
  it("should accept valid CUID format", () => {
    expect(flashcardIdSchema.parse("cjld2cjxh0000qzrmn831i7rn")).toBe(
      "cjld2cjxh0000qzrmn831i7rn"
    );
    expect(flashcardIdSchema.parse("cm5abc123def456")).toBe("cm5abc123def456");
  });

  it("should reject invalid flashcard IDs", () => {
    expect(() => flashcardIdSchema.parse("")).toThrow(
      "Flashcard ID is required"
    );
    expect(() => flashcardIdSchema.parse("abc123")).toThrow(
      "Invalid flashcard ID format"
    );
    expect(() => flashcardIdSchema.parse("C123abc")).toThrow(
      "Invalid flashcard ID format"
    );
    expect(() => flashcardIdSchema.parse("123")).toThrow();
  });
});

describe("flashcardBookIdSchema", () => {
  it("should accept valid CUID format", () => {
    expect(flashcardBookIdSchema.parse("cjld2cjxh0000qzrmn831i7rn")).toBe(
      "cjld2cjxh0000qzrmn831i7rn"
    );
  });

  it("should accept null and undefined (optional field)", () => {
    expect(flashcardBookIdSchema.parse(null)).toBe(null);
    expect(flashcardBookIdSchema.parse(undefined)).toBe(undefined);
  });

  it("should reject invalid book IDs", () => {
    expect(() => flashcardBookIdSchema.parse("invalid")).toThrow(
      "Invalid book ID format"
    );
  });
});

// =============================================================================
// CONTENT FIELD SCHEMAS
// =============================================================================

describe("flashcardFrontSchema", () => {
  it("should accept valid front content", () => {
    expect(flashcardFrontSchema.parse("What is React?")).toBe("What is React?");
    expect(flashcardFrontSchema.parse("a")).toBe("a"); // 1 char minimum
  });

  it("should trim whitespace", () => {
    expect(flashcardFrontSchema.parse("  trimmed  ")).toBe("trimmed");
  });

  it("should reject empty front content", () => {
    expect(() => flashcardFrontSchema.parse("")).toThrow(
      "Front side content is required"
    );
    expect(() => flashcardFrontSchema.parse("   ")).toThrow(
      "Front side content is required"
    );
  });

  it("should reject front content exceeding 1000 characters", () => {
    const longContent = "a".repeat(1001);
    expect(() => flashcardFrontSchema.parse(longContent)).toThrow(
      "Front must be at most 1,000 characters"
    );
  });

  it("should accept front content at exactly 1000 characters", () => {
    const maxContent = "a".repeat(1000);
    expect(flashcardFrontSchema.parse(maxContent)).toBe(maxContent);
  });
});

describe("flashcardBackSchema", () => {
  it("should accept valid back content", () => {
    expect(
      flashcardBackSchema.parse(
        "React is a JavaScript library for building UIs"
      )
    ).toBe("React is a JavaScript library for building UIs");
    expect(flashcardBackSchema.parse("a")).toBe("a"); // 1 char minimum
  });

  it("should trim whitespace", () => {
    expect(flashcardBackSchema.parse("  answer  ")).toBe("answer");
  });

  it("should reject empty back content", () => {
    expect(() => flashcardBackSchema.parse("")).toThrow(
      "Back side content is required"
    );
    expect(() => flashcardBackSchema.parse("   ")).toThrow(
      "Back side content is required"
    );
  });

  it("should reject back content exceeding 5000 characters", () => {
    const longContent = "a".repeat(5001);
    expect(() => flashcardBackSchema.parse(longContent)).toThrow(
      "Back must be at most 5,000 characters"
    );
  });

  it("should accept back content at exactly 5000 characters", () => {
    const maxContent = "a".repeat(5000);
    expect(flashcardBackSchema.parse(maxContent)).toBe(maxContent);
  });
});

// =============================================================================
// TAG SCHEMAS
// =============================================================================

describe("flashcardTagSchema", () => {
  it("should accept valid tags", () => {
    expect(flashcardTagSchema.parse("javascript")).toBe("javascript");
    expect(flashcardTagSchema.parse("react-hooks")).toBe("react-hooks");
    expect(flashcardTagSchema.parse("chapter_1")).toBe("chapter_1");
    expect(flashcardTagSchema.parse("Web Development")).toBe("Web Development");
  });

  it("should trim whitespace", () => {
    expect(flashcardTagSchema.parse("  tag  ")).toBe("tag");
  });

  it("should reject empty tags", () => {
    expect(() => flashcardTagSchema.parse("")).toThrow("Tag cannot be empty");
  });

  it("should reject tags exceeding 50 characters", () => {
    const longTag = "a".repeat(51);
    expect(() => flashcardTagSchema.parse(longTag)).toThrow(
      "Tag must be at most 50 characters"
    );
  });

  it("should reject tags with special characters", () => {
    expect(() => flashcardTagSchema.parse("tag@here")).toThrow();
    expect(() => flashcardTagSchema.parse("tag#1")).toThrow();
    expect(() => flashcardTagSchema.parse("tag!")).toThrow();
  });
});

describe("flashcardTagsArraySchema", () => {
  it("should accept valid tags array", () => {
    expect(flashcardTagsArraySchema.parse(["tag1", "tag2"])).toEqual([
      "tag1",
      "tag2",
    ]);
  });

  it("should default to empty array", () => {
    expect(flashcardTagsArraySchema.parse(undefined)).toEqual([]);
  });

  it("should reject arrays exceeding 20 tags", () => {
    const manyTags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    expect(() => flashcardTagsArraySchema.parse(manyTags)).toThrow(
      "Maximum 20 tags allowed"
    );
  });

  it("should accept exactly 20 tags", () => {
    const twentyTags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
    expect(flashcardTagsArraySchema.parse(twentyTags)).toHaveLength(20);
  });
});

// =============================================================================
// SM-2 ALGORITHM FIELD SCHEMAS
// =============================================================================

describe("easeFactorSchema", () => {
  it("should accept valid ease factors", () => {
    expect(easeFactorSchema.parse(2.5)).toBe(2.5);
    expect(easeFactorSchema.parse(1.3)).toBe(1.3); // Minimum
    expect(easeFactorSchema.parse(3.0)).toBe(3.0);
  });

  it("should default to 2.5", () => {
    expect(easeFactorSchema.parse(undefined)).toBe(2.5);
  });

  it("should reject ease factors below 1.3", () => {
    expect(() => easeFactorSchema.parse(1.2)).toThrow(
      "Ease factor must be at least 1.3"
    );
    expect(() => easeFactorSchema.parse(0)).toThrow();
    expect(() => easeFactorSchema.parse(-1)).toThrow();
  });
});

describe("intervalSchema", () => {
  it("should accept valid intervals", () => {
    expect(intervalSchema.parse(0)).toBe(0);
    expect(intervalSchema.parse(1)).toBe(1);
    expect(intervalSchema.parse(30)).toBe(30);
    expect(intervalSchema.parse(365)).toBe(365);
  });

  it("should default to 0", () => {
    expect(intervalSchema.parse(undefined)).toBe(0);
  });

  it("should reject negative intervals", () => {
    expect(() => intervalSchema.parse(-1)).toThrow(
      "Interval must be non-negative"
    );
  });

  it("should reject non-integer intervals", () => {
    expect(() => intervalSchema.parse(1.5)).toThrow(
      "Interval must be an integer"
    );
  });
});

describe("repetitionsSchema", () => {
  it("should accept valid repetition counts", () => {
    expect(repetitionsSchema.parse(0)).toBe(0);
    expect(repetitionsSchema.parse(5)).toBe(5);
    expect(repetitionsSchema.parse(100)).toBe(100);
  });

  it("should default to 0", () => {
    expect(repetitionsSchema.parse(undefined)).toBe(0);
  });

  it("should reject negative repetitions", () => {
    expect(() => repetitionsSchema.parse(-1)).toThrow(
      "Repetitions must be non-negative"
    );
  });
});

describe("responseTimeMsSchema", () => {
  it("should accept valid response times", () => {
    expect(responseTimeMsSchema.parse(1000)).toBe(1000);
    expect(responseTimeMsSchema.parse(1)).toBe(1); // 1ms minimum
    expect(responseTimeMsSchema.parse(60000)).toBe(60000); // 1 minute
  });

  it("should accept null and undefined (optional)", () => {
    expect(responseTimeMsSchema.parse(null)).toBe(null);
    expect(responseTimeMsSchema.parse(undefined)).toBe(undefined);
  });

  it("should reject zero and negative values", () => {
    expect(() => responseTimeMsSchema.parse(0)).toThrow(
      "Response time must be positive"
    );
    expect(() => responseTimeMsSchema.parse(-100)).toThrow();
  });

  it("should reject non-integer values", () => {
    expect(() => responseTimeMsSchema.parse(1500.5)).toThrow(
      "Response time must be an integer"
    );
  });
});

// =============================================================================
// CREATE FLASHCARD SCHEMAS
// =============================================================================

describe("createFlashcardSchema", () => {
  const validFlashcard = {
    front: "What is React?",
    back: "A JavaScript library for building user interfaces",
  };

  it("should accept valid flashcard creation data", () => {
    const result = createFlashcardSchema.parse(validFlashcard);
    expect(result.front).toBe("What is React?");
    expect(result.back).toBe(
      "A JavaScript library for building user interfaces"
    );
    expect(result.type).toBe("CUSTOM"); // Default type
  });

  it("should accept flashcard with all optional fields", () => {
    const fullFlashcard = {
      ...validFlashcard,
      type: "VOCABULARY",
      bookId: "cjld2cjxh0000qzrmn831i7rn",
      tags: ["react", "javascript"],
      sourceChapterId: "cm5abc123def456",
      sourceOffset: 1234,
    };
    const result = createFlashcardSchema.parse(fullFlashcard);
    expect(result.type).toBe("VOCABULARY");
    expect(result.bookId).toBe("cjld2cjxh0000qzrmn831i7rn");
    expect(result.tags).toEqual(["react", "javascript"]);
  });

  it("should reject missing required fields", () => {
    expect(() => createFlashcardSchema.parse({ front: "Question" })).toThrow();
    expect(() => createFlashcardSchema.parse({ back: "Answer" })).toThrow();
    expect(() => createFlashcardSchema.parse({})).toThrow();
  });

  it("should reject invalid field values", () => {
    expect(() =>
      createFlashcardSchema.parse({
        front: "",
        back: "Answer",
      })
    ).toThrow("Front side content is required");

    expect(() =>
      createFlashcardSchema.parse({
        front: "Question",
        back: "",
      })
    ).toThrow("Back side content is required");
  });
});

describe("createFlashcardsSchema", () => {
  const validFlashcard = {
    front: "What is React?",
    back: "A JavaScript library",
  };

  it("should accept batch creation with multiple flashcards", () => {
    const result = createFlashcardsSchema.parse({
      flashcards: [
        validFlashcard,
        { ...validFlashcard, front: "What is Vue?" },
      ],
      bookId: "cjld2cjxh0000qzrmn831i7rn",
    });
    expect(result.flashcards).toHaveLength(2);
    expect(result.bookId).toBe("cjld2cjxh0000qzrmn831i7rn");
  });

  it("should reject empty flashcards array", () => {
    expect(() =>
      createFlashcardsSchema.parse({
        flashcards: [],
      })
    ).toThrow("At least one flashcard is required");
  });

  it("should reject more than 50 flashcards", () => {
    const manyFlashcards = Array.from({ length: 51 }, () => validFlashcard);
    expect(() =>
      createFlashcardsSchema.parse({
        flashcards: manyFlashcards,
      })
    ).toThrow("Maximum 50 flashcards can be created at once");
  });
});

// =============================================================================
// UPDATE FLASHCARD SCHEMA
// =============================================================================

describe("updateFlashcardSchema", () => {
  it("should accept valid update with single field", () => {
    expect(updateFlashcardSchema.parse({ front: "Updated question" })).toEqual({
      front: "Updated question",
    });
    expect(updateFlashcardSchema.parse({ back: "Updated answer" })).toEqual({
      back: "Updated answer",
    });
    expect(updateFlashcardSchema.parse({ status: "SUSPENDED" })).toEqual({
      status: "SUSPENDED",
    });
  });

  it("should accept valid update with multiple fields", () => {
    const result = updateFlashcardSchema.parse({
      front: "New question",
      back: "New answer",
      type: "CONCEPT",
      tags: ["updated"],
    });
    expect(result.front).toBe("New question");
    expect(result.back).toBe("New answer");
    expect(result.type).toBe("CONCEPT");
    expect(result.tags).toEqual(["updated"]);
  });

  it("should reject empty update (no fields provided)", () => {
    expect(() => updateFlashcardSchema.parse({})).toThrow(
      "At least one field must be provided for update"
    );
  });

  it("should reject update with all undefined values", () => {
    expect(() =>
      updateFlashcardSchema.parse({
        front: undefined,
        back: undefined,
      })
    ).toThrow("At least one field must be provided for update");
  });
});

// =============================================================================
// REVIEW FLASHCARD SCHEMAS
// =============================================================================

describe("reviewFlashcardSchema", () => {
  it("should accept valid review with rating only", () => {
    expect(reviewFlashcardSchema.parse({ rating: 3 })).toEqual({ rating: 3 });
  });

  it("should accept all valid ratings", () => {
    expect(reviewFlashcardSchema.parse({ rating: 1 }).rating).toBe(1); // Again
    expect(reviewFlashcardSchema.parse({ rating: 2 }).rating).toBe(2); // Hard
    expect(reviewFlashcardSchema.parse({ rating: 3 }).rating).toBe(3); // Good
    expect(reviewFlashcardSchema.parse({ rating: 4 }).rating).toBe(4); // Easy
  });

  it("should accept review with response time", () => {
    const result = reviewFlashcardSchema.parse({
      rating: 3,
      responseTimeMs: 2500,
    });
    expect(result.rating).toBe(3);
    expect(result.responseTimeMs).toBe(2500);
  });

  it("should reject missing rating", () => {
    expect(() => reviewFlashcardSchema.parse({})).toThrow();
    expect(() =>
      reviewFlashcardSchema.parse({ responseTimeMs: 1000 })
    ).toThrow();
  });

  it("should reject invalid ratings", () => {
    expect(() => reviewFlashcardSchema.parse({ rating: 0 })).toThrow();
    expect(() => reviewFlashcardSchema.parse({ rating: 5 })).toThrow();
    expect(() => reviewFlashcardSchema.parse({ rating: 2.5 })).toThrow();
  });
});

describe("reviewFlashcardResponseSchema", () => {
  it("should accept valid review response", () => {
    const response = {
      flashcardId: "cjld2cjxh0000qzrmn831i7rn",
      previousEaseFactor: 2.5,
      previousInterval: 1,
      previousRepetitions: 2,
      newEaseFactor: 2.6,
      newInterval: 6,
      newRepetitions: 3,
      newDueDate: "2024-01-20T00:00:00.000Z",
      newStatus: "REVIEW",
    };
    const result = reviewFlashcardResponseSchema.parse(response);
    expect(result.flashcardId).toBe("cjld2cjxh0000qzrmn831i7rn");
    expect(result.newEaseFactor).toBe(2.6);
    expect(result.newStatus).toBe("REVIEW");
  });

  it("should accept response with optional xpAwarded", () => {
    const response = {
      flashcardId: "cjld2cjxh0000qzrmn831i7rn",
      previousEaseFactor: 2.5,
      previousInterval: 1,
      previousRepetitions: 2,
      newEaseFactor: 2.6,
      newInterval: 6,
      newRepetitions: 3,
      newDueDate: "2024-01-20T00:00:00.000Z",
      newStatus: "REVIEW",
      xpAwarded: 10,
    };
    const result = reviewFlashcardResponseSchema.parse(response);
    expect(result.xpAwarded).toBe(10);
  });
});

// =============================================================================
// QUERY SCHEMAS
// =============================================================================

describe("flashcardQuerySchema", () => {
  it("should apply default values", () => {
    const result = flashcardQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortBy).toBe("dueDate");
    expect(result.sortDirection).toBe("asc");
    expect(result.dueOnly).toBe(false);
    expect(result.includeDeleted).toBe(false);
  });

  it("should accept custom pagination", () => {
    const result = flashcardQuerySchema.parse({ page: "3", limit: "50" });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it("should accept filters", () => {
    const result = flashcardQuerySchema.parse({
      bookId: "cjld2cjxh0000qzrmn831i7rn",
      status: "NEW",
      type: "VOCABULARY",
      dueOnly: "true",
    });
    expect(result.bookId).toBe("cjld2cjxh0000qzrmn831i7rn");
    expect(result.status).toBe("NEW");
    expect(result.type).toBe("VOCABULARY");
    expect(result.dueOnly).toBe(true);
  });

  it("should parse comma-separated tags", () => {
    const result = flashcardQuerySchema.parse({
      tags: "react, javascript, hooks",
    });
    expect(result.tags).toEqual(["react", "javascript", "hooks"]);
  });

  it("should reject limit exceeding 100", () => {
    expect(() => flashcardQuerySchema.parse({ limit: "101" })).toThrow();
  });
});

describe("flashcardSortFieldSchema", () => {
  it("should accept valid sort fields", () => {
    expect(flashcardSortFieldSchema.parse("createdAt")).toBe("createdAt");
    expect(flashcardSortFieldSchema.parse("updatedAt")).toBe("updatedAt");
    expect(flashcardSortFieldSchema.parse("dueDate")).toBe("dueDate");
    expect(flashcardSortFieldSchema.parse("easeFactor")).toBe("easeFactor");
    expect(flashcardSortFieldSchema.parse("interval")).toBe("interval");
    expect(flashcardSortFieldSchema.parse("front")).toBe("front");
  });

  it("should reject invalid sort fields", () => {
    expect(() => flashcardSortFieldSchema.parse("back")).toThrow();
    expect(() => flashcardSortFieldSchema.parse("rating")).toThrow();
  });
});

describe("dueFlashcardsQuerySchema", () => {
  it("should apply default values", () => {
    const result = dueFlashcardsQuerySchema.parse({});
    expect(result.limit).toBe(20);
    expect(result.prioritizeOverdue).toBe(true);
  });

  it("should accept custom limit and bookId", () => {
    const result = dueFlashcardsQuerySchema.parse({
      limit: "50",
      bookId: "cjld2cjxh0000qzrmn831i7rn",
    });
    expect(result.limit).toBe(50);
    expect(result.bookId).toBe("cjld2cjxh0000qzrmn831i7rn");
  });
});

// =============================================================================
// ID PARAMS SCHEMAS
// =============================================================================

describe("flashcardIdParamsSchema", () => {
  it("should accept valid flashcard ID params", () => {
    const result = flashcardIdParamsSchema.parse({
      id: "cjld2cjxh0000qzrmn831i7rn",
    });
    expect(result.id).toBe("cjld2cjxh0000qzrmn831i7rn");
  });

  it("should reject invalid flashcard ID", () => {
    expect(() => flashcardIdParamsSchema.parse({ id: "" })).toThrow();
    expect(() => flashcardIdParamsSchema.parse({ id: "invalid" })).toThrow();
  });
});

describe("bookFlashcardIdParamsSchema", () => {
  it("should accept valid book and flashcard IDs", () => {
    const result = bookFlashcardIdParamsSchema.parse({
      bookId: "cjld2cjxh0000qzrmn831i7rn",
      flashcardId: "cm5abc123def456",
    });
    expect(result.bookId).toBe("cjld2cjxh0000qzrmn831i7rn");
    expect(result.flashcardId).toBe("cm5abc123def456");
  });

  it("should reject invalid IDs", () => {
    expect(() =>
      bookFlashcardIdParamsSchema.parse({
        bookId: "invalid",
        flashcardId: "cm5abc123def456",
      })
    ).toThrow();
  });
});

// =============================================================================
// BULK OPERATIONS SCHEMAS
// =============================================================================

describe("bulkUpdateFlashcardStatusSchema", () => {
  it("should accept valid bulk status update", () => {
    const result = bulkUpdateFlashcardStatusSchema.parse({
      flashcardIds: ["cjld2cjxh0000qzrmn831i7rn", "cm5abc123def456"],
      status: "SUSPENDED",
    });
    expect(result.flashcardIds).toHaveLength(2);
    expect(result.status).toBe("SUSPENDED");
  });

  it("should reject empty flashcard IDs array", () => {
    expect(() =>
      bulkUpdateFlashcardStatusSchema.parse({
        flashcardIds: [],
        status: "SUSPENDED",
      })
    ).toThrow("At least one flashcard ID is required");
  });

  it("should reject more than 100 flashcard IDs", () => {
    const manyIds = Array.from(
      { length: 101 },
      (_, i) => `c${i.toString().padStart(20, "0")}`
    );
    expect(() =>
      bulkUpdateFlashcardStatusSchema.parse({
        flashcardIds: manyIds,
        status: "SUSPENDED",
      })
    ).toThrow("Maximum 100 flashcards can be updated at once");
  });
});

describe("bulkDeleteFlashcardsSchema", () => {
  it("should accept valid bulk delete", () => {
    const result = bulkDeleteFlashcardsSchema.parse({
      flashcardIds: ["cjld2cjxh0000qzrmn831i7rn"],
    });
    expect(result.flashcardIds).toHaveLength(1);
  });

  it("should reject empty array", () => {
    expect(() =>
      bulkDeleteFlashcardsSchema.parse({ flashcardIds: [] })
    ).toThrow("At least one flashcard ID is required");
  });
});

// =============================================================================
// STATISTICS SCHEMAS
// =============================================================================

describe("flashcardStatsSchema", () => {
  it("should accept valid statistics", () => {
    const stats = {
      totalCards: 100,
      newCards: 20,
      learningCards: 15,
      reviewCards: 50,
      suspendedCards: 15,
      dueToday: 25,
      overdue: 5,
      reviewedToday: 10,
      correctToday: 8,
      retentionRate: 85.5,
      averageEaseFactor: 2.4,
      averageInterval: 7.5,
      currentStreak: 5,
      longestStreak: 30,
    };
    const result = flashcardStatsSchema.parse(stats);
    expect(result.totalCards).toBe(100);
    expect(result.retentionRate).toBe(85.5);
  });

  it("should reject invalid retention rate", () => {
    expect(() =>
      flashcardStatsSchema.parse({
        totalCards: 100,
        newCards: 0,
        learningCards: 0,
        reviewCards: 100,
        suspendedCards: 0,
        dueToday: 0,
        overdue: 0,
        reviewedToday: 0,
        correctToday: 0,
        retentionRate: 150, // Invalid - over 100
        currentStreak: 0,
        longestStreak: 0,
      })
    ).toThrow();
  });
});

describe("flashcardStatsQuerySchema", () => {
  it("should accept valid stats query", () => {
    const result = flashcardStatsQuerySchema.parse({
      bookId: "cjld2cjxh0000qzrmn831i7rn",
    });
    expect(result.bookId).toBe("cjld2cjxh0000qzrmn831i7rn");
  });

  it("should accept empty query", () => {
    const result = flashcardStatsQuerySchema.parse({});
    expect(result.bookId).toBeUndefined();
  });
});

// =============================================================================
// AI GENERATION SCHEMA
// =============================================================================

describe("generateFlashcardsSchema", () => {
  it("should accept valid generation request", () => {
    const result = generateFlashcardsSchema.parse({
      bookId: "cjld2cjxh0000qzrmn831i7rn",
      count: 10,
    });
    expect(result.bookId).toBe("cjld2cjxh0000qzrmn831i7rn");
    expect(result.count).toBe(10);
    expect(result.types).toEqual(["VOCABULARY", "CONCEPT"]); // Default
  });

  it("should accept custom types and count", () => {
    const result = generateFlashcardsSchema.parse({
      bookId: "cjld2cjxh0000qzrmn831i7rn",
      types: ["QUOTE", "COMPREHENSION"],
      count: 5,
    });
    expect(result.types).toEqual(["QUOTE", "COMPREHENSION"]);
    expect(result.count).toBe(5);
  });

  it("should accept with optional text and chapterId", () => {
    const result = generateFlashcardsSchema.parse({
      bookId: "cjld2cjxh0000qzrmn831i7rn",
      chapterId: "cm5abc123def456",
      text: "This is some text that is at least fifty characters long for generation.",
    });
    expect(result.chapterId).toBe("cm5abc123def456");
    expect(result.text).toContain("fifty characters");
  });

  it("should reject text shorter than 50 characters", () => {
    expect(() =>
      generateFlashcardsSchema.parse({
        bookId: "cjld2cjxh0000qzrmn831i7rn",
        text: "Too short",
      })
    ).toThrow("Text must be at least 50 characters");
  });

  it("should reject count exceeding 20", () => {
    expect(() =>
      generateFlashcardsSchema.parse({
        bookId: "cjld2cjxh0000qzrmn831i7rn",
        count: 25,
      })
    ).toThrow();
  });

  it("should reject missing bookId", () => {
    expect(() => generateFlashcardsSchema.parse({ count: 5 })).toThrow();
  });
});

// =============================================================================
// SCHEMA INDEX
// =============================================================================

describe("flashcardSchemas", () => {
  it("should export all enum schemas", () => {
    expect(flashcardSchemas.flashcardType).toBeDefined();
    expect(flashcardSchemas.flashcardStatus).toBeDefined();
    expect(flashcardSchemas.srsRating).toBeDefined();
  });

  it("should export all field schemas", () => {
    expect(flashcardSchemas.flashcardId).toBeDefined();
    expect(flashcardSchemas.front).toBeDefined();
    expect(flashcardSchemas.back).toBeDefined();
    expect(flashcardSchemas.tags).toBeDefined();
    expect(flashcardSchemas.easeFactor).toBeDefined();
    expect(flashcardSchemas.interval).toBeDefined();
    expect(flashcardSchemas.repetitions).toBeDefined();
  });

  it("should export all create schemas", () => {
    expect(flashcardSchemas.create).toBeDefined();
    expect(flashcardSchemas.createBatch).toBeDefined();
  });

  it("should export update and review schemas", () => {
    expect(flashcardSchemas.update).toBeDefined();
    expect(flashcardSchemas.review).toBeDefined();
    expect(flashcardSchemas.reviewResponse).toBeDefined();
  });

  it("should export query schemas", () => {
    expect(flashcardSchemas.query).toBeDefined();
    expect(flashcardSchemas.dueQuery).toBeDefined();
    expect(flashcardSchemas.sortField).toBeDefined();
    expect(flashcardSchemas.sortDirection).toBeDefined();
  });

  it("should export ID params schemas", () => {
    expect(flashcardSchemas.idParams).toBeDefined();
    expect(flashcardSchemas.bookFlashcardIdParams).toBeDefined();
  });

  it("should export bulk operation schemas", () => {
    expect(flashcardSchemas.bulkUpdateStatus).toBeDefined();
    expect(flashcardSchemas.bulkDelete).toBeDefined();
  });

  it("should export statistics schemas", () => {
    expect(flashcardSchemas.stats).toBeDefined();
    expect(flashcardSchemas.statsQuery).toBeDefined();
  });

  it("should export AI generation schema", () => {
    expect(flashcardSchemas.generate).toBeDefined();
  });
});
