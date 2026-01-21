/**
 * Tests for POST /api/ai/ask
 */

import { describe, it, expect } from "vitest";

import {
  askRequestSchema,
  conversationMessageSchema,
  mapReadingLevel,
  buildBookContext,
  MIN_QUESTION_LENGTH,
  MAX_QUESTION_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_CONTEXT_LENGTH,
  MAX_HISTORY_MESSAGES,
  MAX_TOKENS,
} from "./ask.js";
import type { Book } from "@read-master/database";

// ============================================================================
// conversationMessageSchema Tests
// ============================================================================

describe("conversationMessageSchema", () => {
  it("should accept valid user message", () => {
    const result = conversationMessageSchema.safeParse({
      role: "user",
      content: "What is the main theme?",
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid assistant message", () => {
    const result = conversationMessageSchema.safeParse({
      role: "assistant",
      content: "The main theme is about perseverance.",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid role", () => {
    const result = conversationMessageSchema.safeParse({
      role: "system",
      content: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty content", () => {
    const result = conversationMessageSchema.safeParse({
      role: "user",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject content exceeding max length", () => {
    const result = conversationMessageSchema.safeParse({
      role: "user",
      content: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("should accept content at max length", () => {
    const result = conversationMessageSchema.safeParse({
      role: "user",
      content: "a".repeat(5000),
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("askRequestSchema", () => {
  describe("bookId validation", () => {
    it("should accept valid book ID with minimal fields", () => {
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What is the main theme?",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bookId).toBe("clxyz123abc456def789");
      }
    });

    it("should reject empty book ID", () => {
      const result = askRequestSchema.safeParse({
        bookId: "",
        question: "Some question",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("required");
      }
    });

    it("should reject invalid book ID format", () => {
      const result = askRequestSchema.safeParse({
        bookId: "invalid-id-format",
        question: "Some question",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain(
          "Invalid book ID format"
        );
      }
    });

    it("should reject missing book ID", () => {
      const result = askRequestSchema.safeParse({
        question: "Some question",
      });
      expect(result.success).toBe(false);
    });

    it("should accept valid CUID formats", () => {
      const validCUIDs = [
        "clxyz123abc456def789",
        "cm1abc2def3ghi4jkl",
        "c123456789abcdefghij",
      ];

      for (const cuid of validCUIDs) {
        const result = askRequestSchema.safeParse({
          bookId: cuid,
          question: "What is this?",
        });
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid CUID formats", () => {
      const invalidCUIDs = [
        "not-a-cuid",
        "123abc",
        "C123abc", // uppercase C
        "cABC123", // uppercase in ID
      ];

      for (const cuid of invalidCUIDs) {
        const result = askRequestSchema.safeParse({
          bookId: cuid,
          question: "What is this?",
        });
        expect(result.success).toBe(false);
      }
    });
  });

  describe("question validation", () => {
    it("should accept valid question", () => {
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What is the main theme of this book?",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty question", () => {
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("required");
      }
    });

    it("should reject missing question", () => {
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
      });
      expect(result.success).toBe(false);
    });

    it("should accept question up to max length", () => {
      const maxQuestion = "a".repeat(MAX_QUESTION_LENGTH);
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: maxQuestion,
      });
      expect(result.success).toBe(true);
    });

    it("should reject question exceeding max length", () => {
      const tooLongQuestion = "a".repeat(MAX_QUESTION_LENGTH + 1);
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: tooLongQuestion,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("at most");
      }
    });

    it("should accept minimum length question", () => {
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "?",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("selectedText validation", () => {
    it("should accept request with selected text", () => {
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What does this mean?",
        selectedText: "The protagonist struggled with inner demons",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.selectedText).toBe(
          "The protagonist struggled with inner demons"
        );
      }
    });

    it("should accept request without selected text", () => {
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What is the main theme?",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.selectedText).toBeUndefined();
      }
    });

    it("should accept selected text up to max length", () => {
      const maxText = "b".repeat(MAX_TEXT_LENGTH);
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What is this?",
        selectedText: maxText,
      });
      expect(result.success).toBe(true);
    });

    it("should reject selected text exceeding max length", () => {
      const tooLongText = "b".repeat(MAX_TEXT_LENGTH + 1);
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What is this?",
        selectedText: tooLongText,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("at most");
      }
    });

    it("should accept empty string as selected text", () => {
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What is the theme?",
        selectedText: "",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("surroundingContext validation", () => {
    it("should accept request with surrounding context", () => {
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What does this mean?",
        surroundingContext:
          "This is the context before and after the selection",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.surroundingContext).toBe(
          "This is the context before and after the selection"
        );
      }
    });

    it("should accept request without surrounding context", () => {
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What is this?",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.surroundingContext).toBeUndefined();
      }
    });

    it("should accept context up to max length", () => {
      const maxContext = "c".repeat(MAX_CONTEXT_LENGTH);
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What is this?",
        surroundingContext: maxContext,
      });
      expect(result.success).toBe(true);
    });

    it("should reject context exceeding max length", () => {
      const tooLongContext = "c".repeat(MAX_CONTEXT_LENGTH + 1);
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What is this?",
        surroundingContext: tooLongContext,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("at most");
      }
    });
  });

  describe("conversationHistory validation", () => {
    it("should accept request with conversation history", () => {
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What happens next?",
        conversationHistory: [
          { role: "user", content: "Who is the main character?" },
          { role: "assistant", content: "The main character is John." },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.conversationHistory).toHaveLength(2);
      }
    });

    it("should accept request without conversation history", () => {
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What is this?",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.conversationHistory).toBeUndefined();
      }
    });

    it("should accept empty conversation history", () => {
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What is this?",
        conversationHistory: [],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.conversationHistory).toHaveLength(0);
      }
    });

    it("should accept history up to max messages", () => {
      const history = Array.from({ length: MAX_HISTORY_MESSAGES }, (_, i) => ({
        role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
        content: `Message ${i}`,
      }));
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What is this?",
        conversationHistory: history,
      });
      expect(result.success).toBe(true);
    });

    it("should reject history exceeding max messages", () => {
      const history = Array.from(
        { length: MAX_HISTORY_MESSAGES + 1 },
        (_, i) => ({
          role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
          content: `Message ${i}`,
        })
      );
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What is this?",
        conversationHistory: history,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("at most");
      }
    });

    it("should reject history with invalid message", () => {
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What is this?",
        conversationHistory: [{ role: "system", content: "Invalid role" }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("full request validation", () => {
    it("should accept complete valid request", () => {
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What is the significance of the red rose?",
        selectedText:
          "She held the red rose close to her heart, remembering...",
        surroundingContext:
          "The garden was full of flowers, but only one caught her eye.",
        conversationHistory: [
          { role: "user", content: "What happens in chapter 5?" },
          { role: "assistant", content: "In chapter 5, the protagonist..." },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bookId).toBe("clxyz123abc456def789");
        expect(result.data.question).toBe(
          "What is the significance of the red rose?"
        );
        expect(result.data.selectedText).toBe(
          "She held the red rose close to her heart, remembering..."
        );
        expect(result.data.surroundingContext).toBe(
          "The garden was full of flowers, but only one caught her eye."
        );
        expect(result.data.conversationHistory).toHaveLength(2);
      }
    });

    it("should strip extra fields", () => {
      const result = askRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        question: "What is this?",
        extraField: "should be ignored",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(
          (result.data as Record<string, unknown>).extraField
        ).toBeUndefined();
      }
    });
  });
});

// ============================================================================
// mapReadingLevel Tests
// ============================================================================

describe("mapReadingLevel", () => {
  it("should return middle_school for null input", () => {
    expect(mapReadingLevel(null)).toBe("middle_school");
  });

  it("should return middle_school for empty string", () => {
    expect(mapReadingLevel("")).toBe("middle_school");
  });

  describe("keyword-based levels", () => {
    it("should map beginner levels", () => {
      expect(mapReadingLevel("beginner")).toBe("beginner");
      expect(mapReadingLevel("K-2")).toBe("beginner");
      expect(mapReadingLevel("BEGINNER")).toBe("beginner");
    });

    it("should map elementary levels", () => {
      expect(mapReadingLevel("elementary")).toBe("elementary");
      expect(mapReadingLevel("3-5")).toBe("elementary");
      expect(mapReadingLevel("ELEMENTARY")).toBe("elementary");
    });

    it("should map middle school levels", () => {
      expect(mapReadingLevel("middle_school")).toBe("middle_school");
      expect(mapReadingLevel("middle school")).toBe("middle_school");
      expect(mapReadingLevel("6-8")).toBe("middle_school");
      expect(mapReadingLevel("MIDDLE")).toBe("middle_school");
    });

    it("should map high school levels", () => {
      expect(mapReadingLevel("high_school")).toBe("high_school");
      expect(mapReadingLevel("high school")).toBe("high_school");
      expect(mapReadingLevel("9-12")).toBe("high_school");
      expect(mapReadingLevel("HIGH")).toBe("high_school");
    });

    it("should map college levels", () => {
      expect(mapReadingLevel("college")).toBe("college");
      expect(mapReadingLevel("undergraduate")).toBe("college");
      expect(mapReadingLevel("COLLEGE")).toBe("college");
    });

    it("should map advanced levels", () => {
      expect(mapReadingLevel("advanced")).toBe("advanced");
      expect(mapReadingLevel("graduate")).toBe("advanced");
      expect(mapReadingLevel("ADVANCED")).toBe("advanced");
    });
  });

  describe("Lexile score mapping", () => {
    it("should map low Lexile to beginner", () => {
      expect(mapReadingLevel("200L")).toBe("beginner");
      expect(mapReadingLevel("300")).toBe("beginner");
      expect(mapReadingLevel("399L")).toBe("beginner");
    });

    it("should map elementary Lexile to elementary", () => {
      expect(mapReadingLevel("400L")).toBe("elementary");
      expect(mapReadingLevel("500")).toBe("elementary");
      expect(mapReadingLevel("699L")).toBe("elementary");
    });

    it("should map middle school Lexile to middle_school", () => {
      expect(mapReadingLevel("700L")).toBe("middle_school");
      expect(mapReadingLevel("850")).toBe("middle_school");
      expect(mapReadingLevel("999L")).toBe("middle_school");
    });

    it("should map high school Lexile to high_school", () => {
      expect(mapReadingLevel("1000L")).toBe("high_school");
      expect(mapReadingLevel("1100")).toBe("high_school");
      expect(mapReadingLevel("1199L")).toBe("high_school");
    });

    it("should map college Lexile to college", () => {
      expect(mapReadingLevel("1200L")).toBe("college");
      expect(mapReadingLevel("1300")).toBe("college");
      expect(mapReadingLevel("1399L")).toBe("college");
    });

    it("should map advanced Lexile to advanced", () => {
      expect(mapReadingLevel("1400L")).toBe("advanced");
      expect(mapReadingLevel("1500")).toBe("advanced");
      expect(mapReadingLevel("1600L")).toBe("advanced");
    });
  });

  describe("edge cases", () => {
    it("should handle mixed case input", () => {
      expect(mapReadingLevel("BeGiNnEr")).toBe("beginner");
      expect(mapReadingLevel("MIDDLE_SCHOOL")).toBe("middle_school");
      expect(mapReadingLevel("High School")).toBe("high_school");
    });

    it("should handle Lexile with different formats", () => {
      expect(mapReadingLevel("800L")).toBe("middle_school");
      expect(mapReadingLevel("800")).toBe("middle_school");
      expect(mapReadingLevel("800l")).toBe("middle_school");
    });

    it("should return default for unknown values", () => {
      expect(mapReadingLevel("unknown")).toBe("middle_school");
      expect(mapReadingLevel("gibberish")).toBe("middle_school");
      // level5 matches "5" as a Lexile score (< 400), returning beginner
      expect(mapReadingLevel("level5")).toBe("beginner");
      // Values with no numbers default to middle_school
      expect(mapReadingLevel("something")).toBe("middle_school");
    });
  });
});

// ============================================================================
// buildBookContext Tests
// ============================================================================

describe("buildBookContext", () => {
  const createBook = (overrides: Partial<Book> = {}): Book => ({
    id: "clxyz123",
    userId: "user123",
    title: "Test Book",
    author: "Test Author",
    description: "A test book description",
    coverImage: null,
    source: "UPLOAD",
    sourceId: null,
    sourceUrl: null,
    filePath: "/path/to/file.epub",
    fileType: "EPUB",
    language: "en",
    wordCount: 50000,
    estimatedReadTime: 200,
    lexileScore: null,
    rawContent: null,
    genre: "Fiction",
    tags: [],
    status: "READING",
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });

  it("should build context with all fields", () => {
    const book = createBook();
    const context = buildBookContext(book);

    expect(context.title).toBe("Test Book");
    expect(context.author).toBe("Test Author");
    expect(context.content).toBe("A test book description");
    expect(context.genre).toBe("Fiction");
    expect(context.description).toBe("A test book description");
  });

  it("should use Unknown Author when author is null", () => {
    const book = createBook({ author: null });
    const context = buildBookContext(book);

    expect(context.author).toBe("Unknown Author");
  });

  it("should use empty string when description is null", () => {
    const book = createBook({ description: null });
    const context = buildBookContext(book);

    expect(context.content).toBe("");
  });

  it("should not include genre when null", () => {
    const book = createBook({ genre: null });
    const context = buildBookContext(book);

    expect(context.genre).toBeUndefined();
  });

  it("should not include description field when null", () => {
    const book = createBook({ description: null });
    const context = buildBookContext(book);

    expect(context.description).toBeUndefined();
  });

  it("should handle book with all optional fields null", () => {
    const book = createBook({
      author: null,
      description: null,
      genre: null,
    });
    const context = buildBookContext(book);

    expect(context.title).toBe("Test Book");
    expect(context.author).toBe("Unknown Author");
    expect(context.content).toBe("");
    expect(context.genre).toBeUndefined();
    expect(context.description).toBeUndefined();
  });

  it("should include genre when present", () => {
    const book = createBook({ genre: "Science Fiction" });
    const context = buildBookContext(book);

    expect(context.genre).toBe("Science Fiction");
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have appropriate MIN_QUESTION_LENGTH", () => {
    expect(MIN_QUESTION_LENGTH).toBe(1);
    expect(MIN_QUESTION_LENGTH).toBeGreaterThan(0);
  });

  it("should have appropriate MAX_QUESTION_LENGTH", () => {
    expect(MAX_QUESTION_LENGTH).toBe(1000);
    expect(MAX_QUESTION_LENGTH).toBeGreaterThan(MIN_QUESTION_LENGTH);
  });

  it("should have appropriate MAX_TEXT_LENGTH", () => {
    expect(MAX_TEXT_LENGTH).toBe(10000);
    expect(MAX_TEXT_LENGTH).toBeGreaterThan(0);
  });

  it("should have appropriate MAX_CONTEXT_LENGTH", () => {
    expect(MAX_CONTEXT_LENGTH).toBe(2000);
    expect(MAX_CONTEXT_LENGTH).toBeGreaterThan(0);
  });

  it("should have appropriate MAX_HISTORY_MESSAGES", () => {
    expect(MAX_HISTORY_MESSAGES).toBe(10);
    expect(MAX_HISTORY_MESSAGES).toBeGreaterThan(0);
  });

  it("should have appropriate MAX_TOKENS", () => {
    expect(MAX_TOKENS).toBe(2048);
    expect(MAX_TOKENS).toBeGreaterThan(0);
  });

  it("should have consistent length relationships", () => {
    // MAX_TEXT_LENGTH should be larger than MAX_CONTEXT_LENGTH
    expect(MAX_TEXT_LENGTH).toBeGreaterThan(MAX_CONTEXT_LENGTH);
    // MAX_CONTEXT_LENGTH should be larger than MAX_QUESTION_LENGTH
    expect(MAX_CONTEXT_LENGTH).toBeGreaterThan(MAX_QUESTION_LENGTH);
  });
});

// ============================================================================
// Integration-like Tests
// ============================================================================

describe("Ask handler helper integration", () => {
  describe("Complete request scenarios", () => {
    it("should validate a typical ask request", () => {
      const request = {
        bookId: "clxyz123abc456def789",
        question: "What is the main theme of this chapter?",
        selectedText:
          "The darkness enveloped everything, leaving only silence.",
        surroundingContext:
          "After the storm passed, the village was left in ruins.",
      };

      const result = askRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should validate a minimal ask request", () => {
      const request = {
        bookId: "clxyz123abc456def789",
        question: "Why?",
      };

      const result = askRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should validate request with conversation history", () => {
      const request = {
        bookId: "clxyz123abc456def789",
        question: "Can you elaborate on that?",
        conversationHistory: [
          { role: "user", content: "Who is the antagonist?" },
          {
            role: "assistant",
            content: "The antagonist is Lord Voldemort, a dark wizard...",
          },
          { role: "user", content: "What are his motivations?" },
          {
            role: "assistant",
            content: "His main motivation is to achieve immortality...",
          },
        ],
      };

      const result = askRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.conversationHistory).toHaveLength(4);
      }
    });

    it("should validate request with all fields", () => {
      const request = {
        bookId: "clxyz123abc456def789",
        question: "What literary devices are used here?",
        selectedText: "The wind whispered secrets through the ancient trees.",
        surroundingContext:
          "As night fell, the forest came alive with mysterious sounds.",
        conversationHistory: [
          { role: "user", content: "What genre is this book?" },
          { role: "assistant", content: "This book is a fantasy novel..." },
        ],
      };

      const result = askRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });

  describe("Reading level and book context integration", () => {
    it("should correctly process book for beginner reader", () => {
      const book: Book = {
        id: "clxyz123",
        userId: "user123",
        title: "The Cat in the Hat",
        author: "Dr. Seuss",
        description: "A fun story about a mischievous cat.",
        coverImage: null,
        source: "UPLOAD",
        sourceId: null,
        sourceUrl: null,
        filePath: "/path/to/file.epub",
        fileType: "EPUB",
        language: "en",
        wordCount: 1600,
        estimatedReadTime: 10,
        lexileScore: 260,
        rawContent: null,
        genre: "Children's Fiction",
        tags: [],
        status: "READING",
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const context = buildBookContext(book);
      const level = mapReadingLevel("K-2");

      expect(context.title).toBe("The Cat in the Hat");
      expect(context.author).toBe("Dr. Seuss");
      expect(context.genre).toBe("Children's Fiction");
      expect(level).toBe("beginner");
    });

    it("should correctly process book for college reader", () => {
      const book: Book = {
        id: "clxyz456",
        userId: "user123",
        title: "Crime and Punishment",
        author: "Fyodor Dostoevsky",
        description:
          "A psychological drama about guilt and redemption in 19th century Russia.",
        coverImage: null,
        source: "UPLOAD",
        sourceId: null,
        sourceUrl: null,
        filePath: "/path/to/file.epub",
        fileType: "EPUB",
        language: "en",
        wordCount: 211000,
        estimatedReadTime: 844,
        lexileScore: 1300,
        rawContent: null,
        genre: "Literary Fiction",
        tags: [],
        status: "READING",
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const context = buildBookContext(book);
      const level = mapReadingLevel("undergraduate");

      expect(context.title).toBe("Crime and Punishment");
      expect(context.author).toBe("Fyodor Dostoevsky");
      expect(context.genre).toBe("Literary Fiction");
      expect(level).toBe("college");
    });

    it("should handle book with conversation context", () => {
      const book: Book = {
        id: "clxyz789",
        userId: "user123",
        title: "1984",
        author: "George Orwell",
        description:
          "A dystopian novel about totalitarianism and surveillance.",
        coverImage: null,
        source: "UPLOAD",
        sourceId: null,
        sourceUrl: null,
        filePath: "/path/to/file.epub",
        fileType: "EPUB",
        language: "en",
        wordCount: 88942,
        estimatedReadTime: 356,
        lexileScore: 1090,
        rawContent: null,
        genre: "Dystopian Fiction",
        tags: [],
        status: "READING",
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const context = buildBookContext(book);
      const level = mapReadingLevel("high school");

      expect(context.title).toBe("1984");
      expect(context.author).toBe("George Orwell");
      expect(context.genre).toBe("Dystopian Fiction");
      expect(context.description).toBe(
        "A dystopian novel about totalitarianism and surveillance."
      );
      expect(level).toBe("high_school");

      // Validate a typical ask request for this book
      const request = {
        bookId: book.id,
        question: "What does Big Brother represent?",
        selectedText: "Big Brother is watching you.",
        conversationHistory: [
          { role: "user", content: "What is the Party?" },
          { role: "assistant", content: "The Party is the ruling power..." },
        ],
      };
      const result = askRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });
});
