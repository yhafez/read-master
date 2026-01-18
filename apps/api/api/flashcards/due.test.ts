/**
 * Tests for GET /api/flashcards/due endpoint
 *
 * Tests cover:
 * - getDailyCardLimit helper function
 * - calculateOverdueInfo helper function
 * - getStartOfTodayUTC helper function
 * - formatDueFlashcard helper function
 * - dueFlashcardsQuerySchema validation
 * - Constants validation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  getDailyCardLimit,
  calculateOverdueInfo,
  getStartOfTodayUTC,
  formatDueFlashcard,
  dueFlashcardsQuerySchema,
  DEFAULT_DAILY_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
} from "./due.js";

// ============================================================================
// getDailyCardLimit Tests
// ============================================================================

describe("getDailyCardLimit", () => {
  it("should return default limit when preferences is null", () => {
    expect(getDailyCardLimit(null)).toBe(DEFAULT_DAILY_LIMIT);
  });

  it("should return default limit when preferences is undefined", () => {
    expect(getDailyCardLimit(undefined)).toBe(DEFAULT_DAILY_LIMIT);
  });

  it("should return default limit when preferences is empty object", () => {
    expect(getDailyCardLimit({})).toBe(DEFAULT_DAILY_LIMIT);
  });

  it("should return default limit when reading preferences are missing", () => {
    expect(getDailyCardLimit({ notifications: {} })).toBe(DEFAULT_DAILY_LIMIT);
  });

  it("should return dailyCardLimit from valid preferences object", () => {
    const preferences = {
      reading: {
        dailyCardLimit: 100,
      },
    };
    expect(getDailyCardLimit(preferences)).toBe(100);
  });

  it("should return dailyCardLimit from JSON string preferences", () => {
    const preferences = JSON.stringify({
      reading: {
        dailyCardLimit: 75,
      },
    });
    expect(getDailyCardLimit(preferences)).toBe(75);
  });

  it("should return default when dailyCardLimit is not set", () => {
    const preferences = {
      reading: {
        fontSize: 16,
      },
    };
    // dailyCardLimit has a default in schema
    expect(getDailyCardLimit(preferences)).toBe(50); // Schema default
  });

  it("should return default limit when JSON parsing fails", () => {
    expect(getDailyCardLimit("invalid json {{{")).toBe(DEFAULT_DAILY_LIMIT);
  });

  it("should return default limit when reading has invalid structure", () => {
    expect(getDailyCardLimit({ reading: "not an object" })).toBe(
      DEFAULT_DAILY_LIMIT
    );
  });

  it("should handle deeply nested valid preferences", () => {
    const preferences = {
      reading: {
        theme: "DARK", // Must be uppercase to match schema
        font: "SERIF", // Must use valid font preference enum (SYSTEM, SERIF, SANS_SERIF, OPENDYSLEXIC)
        fontSize: 18,
        dailyCardLimit: 100, // Valid within schema limits (1-500)
        newCardsPerDay: 30,
      },
      notifications: {
        emailReminders: true,
      },
    };
    expect(getDailyCardLimit(preferences)).toBe(100);
  });
});

// ============================================================================
// calculateOverdueInfo Tests
// ============================================================================

describe("calculateOverdueInfo", () => {
  it("should return not overdue when dueDate is in the future", () => {
    const now = new Date("2024-01-15T12:00:00Z");
    const dueDate = new Date("2024-01-16T12:00:00Z");

    const result = calculateOverdueInfo(dueDate, now);

    expect(result.isOverdue).toBe(false);
    expect(result.overdueBy).toBe(0);
  });

  it("should return not overdue when dueDate is exactly now", () => {
    const now = new Date("2024-01-15T12:00:00Z");
    const dueDate = new Date("2024-01-15T12:00:00Z");

    const result = calculateOverdueInfo(dueDate, now);

    expect(result.isOverdue).toBe(false);
    expect(result.overdueBy).toBe(0);
  });

  it("should return overdue when dueDate is in the past", () => {
    const now = new Date("2024-01-15T12:00:00Z");
    const dueDate = new Date("2024-01-14T12:00:00Z");

    const result = calculateOverdueInfo(dueDate, now);

    expect(result.isOverdue).toBe(true);
    expect(result.overdueBy).toBe(1);
  });

  it("should calculate multiple days overdue correctly", () => {
    const now = new Date("2024-01-15T12:00:00Z");
    const dueDate = new Date("2024-01-10T12:00:00Z");

    const result = calculateOverdueInfo(dueDate, now);

    expect(result.isOverdue).toBe(true);
    expect(result.overdueBy).toBe(5);
  });

  it("should handle partial day overdue (less than 24 hours)", () => {
    const now = new Date("2024-01-15T18:00:00Z");
    const dueDate = new Date("2024-01-15T06:00:00Z");

    const result = calculateOverdueInfo(dueDate, now);

    expect(result.isOverdue).toBe(true);
    expect(result.overdueBy).toBe(0); // Less than 1 full day
  });

  it("should handle exactly 24 hours overdue", () => {
    const now = new Date("2024-01-15T12:00:00Z");
    const dueDate = new Date("2024-01-14T12:00:00Z");

    const result = calculateOverdueInfo(dueDate, now);

    expect(result.isOverdue).toBe(true);
    expect(result.overdueBy).toBe(1);
  });

  it("should use current date when now is not provided", () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

    const result = calculateOverdueInfo(pastDate);

    expect(result.isOverdue).toBe(true);
    expect(result.overdueBy).toBe(2);
  });

  it("should handle very old due dates", () => {
    const now = new Date("2024-01-15T12:00:00Z");
    const dueDate = new Date("2023-01-15T12:00:00Z"); // 1 year ago

    const result = calculateOverdueInfo(dueDate, now);

    expect(result.isOverdue).toBe(true);
    expect(result.overdueBy).toBe(365); // 365 days
  });
});

// ============================================================================
// getStartOfTodayUTC Tests
// ============================================================================

describe("getStartOfTodayUTC", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return start of day in UTC", () => {
    vi.setSystemTime(new Date("2024-01-15T14:30:45.123Z"));

    const result = getStartOfTodayUTC();

    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(0); // January
    expect(result.getUTCDate()).toBe(15);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  it("should handle midnight correctly", () => {
    vi.setSystemTime(new Date("2024-01-15T00:00:00.000Z"));

    const result = getStartOfTodayUTC();

    expect(result.toISOString()).toBe("2024-01-15T00:00:00.000Z");
  });

  it("should handle end of day correctly", () => {
    vi.setSystemTime(new Date("2024-01-15T23:59:59.999Z"));

    const result = getStartOfTodayUTC();

    expect(result.toISOString()).toBe("2024-01-15T00:00:00.000Z");
  });

  it("should handle month boundaries", () => {
    vi.setSystemTime(new Date("2024-02-01T05:00:00.000Z"));

    const result = getStartOfTodayUTC();

    expect(result.toISOString()).toBe("2024-02-01T00:00:00.000Z");
  });

  it("should handle year boundaries", () => {
    vi.setSystemTime(new Date("2024-01-01T03:00:00.000Z"));

    const result = getStartOfTodayUTC();

    expect(result.toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });
});

// ============================================================================
// formatDueFlashcard Tests
// ============================================================================

describe("formatDueFlashcard", () => {
  const baseFlashcard = {
    id: "cl123abc",
    userId: "user123",
    bookId: "book123",
    front: "What is photosynthesis?",
    back: "The process by which plants convert light energy into chemical energy",
    type: "CONCEPT" as const,
    status: "REVIEW" as const,
    tags: ["biology", "plants"],
    sourceChapterId: "chapter1",
    sourceOffset: 100,
    easeFactor: 2.5,
    interval: 7,
    repetitions: 3,
    dueDate: new Date("2024-01-15T10:00:00Z"),
    totalReviews: 10,
    correctReviews: 8,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-10T00:00:00Z"),
  };

  it("should format all basic fields correctly", () => {
    const now = new Date("2024-01-15T10:00:00Z");
    const result = formatDueFlashcard(baseFlashcard, now);

    expect(result.id).toBe("cl123abc");
    expect(result.userId).toBe("user123");
    expect(result.bookId).toBe("book123");
    expect(result.front).toBe("What is photosynthesis?");
    expect(result.back).toBe(
      "The process by which plants convert light energy into chemical energy"
    );
    expect(result.type).toBe("CONCEPT");
    expect(result.status).toBe("REVIEW");
    expect(result.tags).toEqual(["biology", "plants"]);
    expect(result.sourceChapterId).toBe("chapter1");
    expect(result.sourceOffset).toBe(100);
    expect(result.easeFactor).toBe(2.5);
    expect(result.interval).toBe(7);
    expect(result.repetitions).toBe(3);
    expect(result.totalReviews).toBe(10);
    expect(result.correctReviews).toBe(8);
  });

  it("should convert dates to ISO strings", () => {
    const now = new Date("2024-01-15T10:00:00Z");
    const result = formatDueFlashcard(baseFlashcard, now);

    expect(result.dueDate).toBe("2024-01-15T10:00:00.000Z");
    expect(result.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(result.updatedAt).toBe("2024-01-10T00:00:00.000Z");
  });

  it("should set isOverdue to false when card is due now", () => {
    const now = new Date("2024-01-15T10:00:00Z");
    const result = formatDueFlashcard(baseFlashcard, now);

    expect(result.isOverdue).toBe(false);
    expect(result.overdueBy).toBe(0);
  });

  it("should set isOverdue to true when card is overdue", () => {
    const now = new Date("2024-01-17T10:00:00Z"); // 2 days after due date
    const result = formatDueFlashcard(baseFlashcard, now);

    expect(result.isOverdue).toBe(true);
    expect(result.overdueBy).toBe(2);
  });

  it("should not include book property when book is not provided", () => {
    const now = new Date("2024-01-15T10:00:00Z");
    const result = formatDueFlashcard(baseFlashcard, now);

    expect(result.book).toBeUndefined();
  });

  it("should include book context when book is provided", () => {
    const flashcardWithBook = {
      ...baseFlashcard,
      book: {
        id: "book123",
        title: "Biology 101",
        author: "Dr. Smith",
        coverImage: "https://example.com/cover.jpg",
      },
    };

    const now = new Date("2024-01-15T10:00:00Z");
    const result = formatDueFlashcard(flashcardWithBook, now);

    expect(result.book).toBeDefined();
    expect(result.book?.id).toBe("book123");
    expect(result.book?.title).toBe("Biology 101");
    expect(result.book?.author).toBe("Dr. Smith");
    expect(result.book?.coverImage).toBe("https://example.com/cover.jpg");
  });

  it("should handle null bookId", () => {
    const flashcardNoBook = {
      ...baseFlashcard,
      bookId: null,
    };

    const now = new Date("2024-01-15T10:00:00Z");
    const result = formatDueFlashcard(flashcardNoBook, now);

    expect(result.bookId).toBeNull();
    expect(result.book).toBeUndefined();
  });

  it("should handle null book author", () => {
    const flashcardWithBook = {
      ...baseFlashcard,
      book: {
        id: "book123",
        title: "Anonymous Book",
        author: null,
        coverImage: null,
      },
    };

    const now = new Date("2024-01-15T10:00:00Z");
    const result = formatDueFlashcard(flashcardWithBook, now);

    expect(result.book?.author).toBeNull();
    expect(result.book?.coverImage).toBeNull();
  });

  it("should handle empty tags array", () => {
    const flashcardEmptyTags = {
      ...baseFlashcard,
      tags: [],
    };

    const now = new Date("2024-01-15T10:00:00Z");
    const result = formatDueFlashcard(flashcardEmptyTags, now);

    expect(result.tags).toEqual([]);
  });

  it("should handle null sourceChapterId and sourceOffset", () => {
    const flashcardNoSource = {
      ...baseFlashcard,
      sourceChapterId: null,
      sourceOffset: null,
    };

    const now = new Date("2024-01-15T10:00:00Z");
    const result = formatDueFlashcard(flashcardNoSource, now);

    expect(result.sourceChapterId).toBeNull();
    expect(result.sourceOffset).toBeNull();
  });

  it("should handle different flashcard statuses", () => {
    const statuses = ["NEW", "LEARNING", "REVIEW"] as const;

    for (const status of statuses) {
      const flashcard = { ...baseFlashcard, status };
      const result = formatDueFlashcard(flashcard, new Date());
      expect(result.status).toBe(status);
    }
  });

  it("should handle different flashcard types", () => {
    const types = [
      "VOCABULARY",
      "CONCEPT",
      "COMPREHENSION",
      "QUOTE",
      "CUSTOM",
    ] as const;

    for (const type of types) {
      const flashcard = { ...baseFlashcard, type };
      const result = formatDueFlashcard(flashcard, new Date());
      expect(result.type).toBe(type);
    }
  });
});

// ============================================================================
// dueFlashcardsQuerySchema Tests
// ============================================================================

describe("dueFlashcardsQuerySchema", () => {
  it("should accept empty query (all defaults)", () => {
    const result = dueFlashcardsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeBook).toBe(false);
      expect(result.data.limit).toBeUndefined();
      expect(result.data.bookId).toBeUndefined();
    }
  });

  it("should accept valid limit", () => {
    const result = dueFlashcardsQuerySchema.safeParse({ limit: "50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });

  it("should coerce limit from string to number", () => {
    const result = dueFlashcardsQuerySchema.safeParse({ limit: "100" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(100);
    }
  });

  it("should reject limit below minimum", () => {
    const result = dueFlashcardsQuerySchema.safeParse({ limit: "0" });
    expect(result.success).toBe(false);
  });

  it("should reject limit above maximum", () => {
    const result = dueFlashcardsQuerySchema.safeParse({ limit: "201" });
    expect(result.success).toBe(false);
  });

  it("should accept minimum limit", () => {
    const result = dueFlashcardsQuerySchema.safeParse({ limit: "1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(1);
    }
  });

  it("should accept maximum limit", () => {
    const result = dueFlashcardsQuerySchema.safeParse({ limit: "200" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(200);
    }
  });

  it("should accept includeBook as true", () => {
    const result = dueFlashcardsQuerySchema.safeParse({ includeBook: "true" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeBook).toBe(true);
    }
  });

  it("should accept includeBook as boolean false", () => {
    const result = dueFlashcardsQuerySchema.safeParse({ includeBook: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeBook).toBe(false);
    }
  });

  it("should accept includeBook string 'false' and parse to false", () => {
    const result = dueFlashcardsQuerySchema.safeParse({ includeBook: "false" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeBook).toBe(false);
    }
  });

  it("should accept valid bookId CUID", () => {
    const result = dueFlashcardsQuerySchema.safeParse({
      bookId: "clq1234567890abcdefghij",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bookId).toBe("clq1234567890abcdefghij");
    }
  });

  it("should reject invalid bookId format", () => {
    const result = dueFlashcardsQuerySchema.safeParse({ bookId: "invalid-id" });
    expect(result.success).toBe(false);
  });

  it("should accept all valid parameters together", () => {
    const result = dueFlashcardsQuerySchema.safeParse({
      limit: "30",
      includeBook: "true",
      bookId: "clq1234567890abcdefghij",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(30);
      expect(result.data.includeBook).toBe(true);
      expect(result.data.bookId).toBe("clq1234567890abcdefghij");
    }
  });

  it("should reject non-integer limit", () => {
    const result = dueFlashcardsQuerySchema.safeParse({ limit: "50.5" });
    expect(result.success).toBe(false);
  });

  it("should reject negative limit", () => {
    const result = dueFlashcardsQuerySchema.safeParse({ limit: "-10" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have DEFAULT_DAILY_LIMIT as 50", () => {
    expect(DEFAULT_DAILY_LIMIT).toBe(50);
  });

  it("should have MAX_LIMIT as 200", () => {
    expect(MAX_LIMIT).toBe(200);
  });

  it("should have MIN_LIMIT as 1", () => {
    expect(MIN_LIMIT).toBe(1);
  });

  it("should have reasonable limit constraints", () => {
    expect(MIN_LIMIT).toBeLessThan(MAX_LIMIT);
    expect(DEFAULT_DAILY_LIMIT).toBeLessThanOrEqual(MAX_LIMIT);
    expect(DEFAULT_DAILY_LIMIT).toBeGreaterThanOrEqual(MIN_LIMIT);
  });
});

// ============================================================================
// Integration-style Tests
// ============================================================================

describe("Integration: Query validation and flashcard formatting", () => {
  it("should validate query and format flashcard together", () => {
    // Validate query
    const query = dueFlashcardsQuerySchema.safeParse({
      limit: "10",
      includeBook: "true",
    });
    expect(query.success).toBe(true);

    // Format flashcard
    const flashcard = {
      id: "test123",
      userId: "user123",
      bookId: "book123",
      front: "Test question",
      back: "Test answer",
      type: "CONCEPT" as const,
      status: "REVIEW" as const,
      tags: ["test"],
      sourceChapterId: null,
      sourceOffset: null,
      easeFactor: 2.5,
      interval: 1,
      repetitions: 1,
      dueDate: new Date("2024-01-15T00:00:00Z"),
      totalReviews: 1,
      correctReviews: 1,
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-14T00:00:00Z"),
      book: {
        id: "book123",
        title: "Test Book",
        author: "Test Author",
        coverImage: null,
      },
    };

    const formatted = formatDueFlashcard(
      flashcard,
      new Date("2024-01-15T00:00:00Z")
    );

    expect(formatted.id).toBe("test123");
    expect(formatted.book?.title).toBe("Test Book");
    expect(formatted.isOverdue).toBe(false);
  });

  it("should correctly identify overdue flashcards in a batch", () => {
    const now = new Date("2024-01-15T12:00:00Z");

    const flashcards = [
      { dueDate: new Date("2024-01-10T00:00:00Z") }, // 5 days overdue
      { dueDate: new Date("2024-01-14T00:00:00Z") }, // 1 day overdue
      { dueDate: new Date("2024-01-15T12:00:00Z") }, // Due now
      { dueDate: new Date("2024-01-16T00:00:00Z") }, // Not due yet
    ];

    const overdueInfo = flashcards.map((f) =>
      calculateOverdueInfo(f.dueDate, now)
    );

    expect(overdueInfo[0]).toEqual({ isOverdue: true, overdueBy: 5 });
    expect(overdueInfo[1]).toEqual({ isOverdue: true, overdueBy: 1 });
    expect(overdueInfo[2]).toEqual({ isOverdue: false, overdueBy: 0 });
    expect(overdueInfo[3]).toEqual({ isOverdue: false, overdueBy: 0 });
  });

  it("should handle preferences from various sources consistently", () => {
    const testCases = [
      { input: null, expected: DEFAULT_DAILY_LIMIT },
      { input: {}, expected: DEFAULT_DAILY_LIMIT },
      { input: { reading: { dailyCardLimit: 75 } }, expected: 75 },
      {
        input: JSON.stringify({ reading: { dailyCardLimit: 100 } }),
        expected: 100,
      },
      { input: { reading: {} }, expected: 50 }, // Schema default
    ];

    for (const { input, expected } of testCases) {
      expect(getDailyCardLimit(input)).toBe(expected);
    }
  });
});
