/**
 * Tests for POST /api/ai/explain
 */

import { describe, it, expect } from "vitest";

import {
  explainRequestSchema,
  mapReadingLevel,
  buildBookContext,
  MIN_TEXT_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_CONTEXT_LENGTH,
  MAX_QUESTION_LENGTH,
  MAX_TOKENS,
} from "./explain.js";
import type { Book } from "@read-master/database";

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("explainRequestSchema", () => {
  describe("bookId validation", () => {
    it("should accept valid book ID with minimal fields", () => {
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: "This is the text to explain",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bookId).toBe("clxyz123abc456def789");
      }
    });

    it("should reject empty book ID", () => {
      const result = explainRequestSchema.safeParse({
        bookId: "",
        selectedText: "Some text",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("required");
      }
    });

    it("should reject invalid book ID format", () => {
      const result = explainRequestSchema.safeParse({
        bookId: "invalid-id-format",
        selectedText: "Some text",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain(
          "Invalid book ID format"
        );
      }
    });

    it("should reject missing book ID", () => {
      const result = explainRequestSchema.safeParse({
        selectedText: "Some text",
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
        const result = explainRequestSchema.safeParse({
          bookId: cuid,
          selectedText: "Some text",
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
        const result = explainRequestSchema.safeParse({
          bookId: cuid,
          selectedText: "Some text",
        });
        expect(result.success).toBe(false);
      }
    });
  });

  describe("selectedText validation", () => {
    it("should accept valid selected text", () => {
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: "This is a normal text to explain",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty selected text", () => {
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("required");
      }
    });

    it("should reject missing selected text", () => {
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
      });
      expect(result.success).toBe(false);
    });

    it("should accept text up to max length", () => {
      const longText = "a".repeat(MAX_TEXT_LENGTH);
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: longText,
      });
      expect(result.success).toBe(true);
    });

    it("should reject text exceeding max length", () => {
      const tooLongText = "a".repeat(MAX_TEXT_LENGTH + 1);
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: tooLongText,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("at most");
      }
    });

    it("should accept minimum length text", () => {
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: "a",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("surroundingContext validation", () => {
    it("should accept request with surrounding context", () => {
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: "Selected text",
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
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: "Selected text",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.surroundingContext).toBeUndefined();
      }
    });

    it("should accept context up to max length", () => {
      const maxContext = "b".repeat(MAX_CONTEXT_LENGTH);
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: "Selected text",
        surroundingContext: maxContext,
      });
      expect(result.success).toBe(true);
    });

    it("should reject context exceeding max length", () => {
      const tooLongContext = "b".repeat(MAX_CONTEXT_LENGTH + 1);
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: "Selected text",
        surroundingContext: tooLongContext,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("at most");
      }
    });

    it("should accept empty string as context", () => {
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: "Selected text",
        surroundingContext: "",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("question validation", () => {
    it("should accept request with question", () => {
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: "Selected text",
        question: "What does this mean?",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.question).toBe("What does this mean?");
      }
    });

    it("should accept request without question", () => {
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: "Selected text",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.question).toBeUndefined();
      }
    });

    it("should accept question up to max length", () => {
      const maxQuestion = "q".repeat(MAX_QUESTION_LENGTH);
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: "Selected text",
        question: maxQuestion,
      });
      expect(result.success).toBe(true);
    });

    it("should reject question exceeding max length", () => {
      const tooLongQuestion = "q".repeat(MAX_QUESTION_LENGTH + 1);
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: "Selected text",
        question: tooLongQuestion,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("at most");
      }
    });

    it("should accept empty string as question", () => {
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: "Selected text",
        question: "",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("full request validation", () => {
    it("should accept complete valid request", () => {
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: "The protagonist faced a moral dilemma",
        surroundingContext:
          "In this chapter, the protagonist had to choose between loyalty and truth.",
        question: "What is a moral dilemma?",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bookId).toBe("clxyz123abc456def789");
        expect(result.data.selectedText).toBe(
          "The protagonist faced a moral dilemma"
        );
        expect(result.data.surroundingContext).toBe(
          "In this chapter, the protagonist had to choose between loyalty and truth."
        );
        expect(result.data.question).toBe("What is a moral dilemma?");
      }
    });

    it("should strip extra fields", () => {
      const result = explainRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        selectedText: "Some text",
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
  it("should have appropriate MIN_TEXT_LENGTH", () => {
    expect(MIN_TEXT_LENGTH).toBe(1);
    expect(MIN_TEXT_LENGTH).toBeGreaterThan(0);
  });

  it("should have appropriate MAX_TEXT_LENGTH", () => {
    expect(MAX_TEXT_LENGTH).toBe(5000);
    expect(MAX_TEXT_LENGTH).toBeGreaterThan(MIN_TEXT_LENGTH);
  });

  it("should have appropriate MAX_CONTEXT_LENGTH", () => {
    expect(MAX_CONTEXT_LENGTH).toBe(2000);
    expect(MAX_CONTEXT_LENGTH).toBeGreaterThan(0);
  });

  it("should have appropriate MAX_QUESTION_LENGTH", () => {
    expect(MAX_QUESTION_LENGTH).toBe(500);
    expect(MAX_QUESTION_LENGTH).toBeGreaterThan(0);
  });

  it("should have appropriate MAX_TOKENS", () => {
    expect(MAX_TOKENS).toBe(2048);
    expect(MAX_TOKENS).toBeGreaterThan(0);
  });

  it("should have consistent length relationships", () => {
    // MAX_TEXT_LENGTH should be larger than MAX_CONTEXT_LENGTH (since context is supplementary)
    expect(MAX_TEXT_LENGTH).toBeGreaterThan(MAX_CONTEXT_LENGTH);
    // MAX_CONTEXT_LENGTH should be larger than MAX_QUESTION_LENGTH
    expect(MAX_CONTEXT_LENGTH).toBeGreaterThan(MAX_QUESTION_LENGTH);
  });
});

// ============================================================================
// Integration-like Tests
// ============================================================================

describe("Explain handler helper integration", () => {
  describe("Complete request scenarios", () => {
    it("should validate a typical explain request", () => {
      const request = {
        bookId: "clxyz123abc456def789",
        selectedText:
          "The character's internal monologue revealed deep-seated fears about mortality and the passage of time.",
        surroundingContext:
          "As she sat by the window watching the autumn leaves fall, memories of her childhood flooded back.",
        question: "What literary device is being used here?",
      };

      const result = explainRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should validate a minimal explain request", () => {
      const request = {
        bookId: "clxyz123abc456def789",
        selectedText: "Why?",
      };

      const result = explainRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should validate request with long selected text", () => {
      const longText =
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(50);
      const request = {
        bookId: "clxyz123abc456def789",
        selectedText: longText.slice(0, MAX_TEXT_LENGTH),
      };

      const result = explainRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });

  describe("Reading level and book context integration", () => {
    it("should correctly process book for beginner reader", () => {
      const book: Book = {
        id: "clxyz123",
        userId: "user123",
        title: "Charlotte's Web",
        author: "E.B. White",
        description:
          "A story about a pig named Wilbur and his friendship with a spider.",
        coverImage: null,
        source: "UPLOAD",
        sourceId: null,
        sourceUrl: null,
        filePath: "/path/to/file.epub",
        fileType: "EPUB",
        language: "en",
        wordCount: 32000,
        estimatedReadTime: 120,
        lexileScore: 680,
        genre: "Children's Fiction",
        tags: [],
        status: "READING",
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const context = buildBookContext(book);
      // User's reading level would come from user profile, not book
      const level = mapReadingLevel("Elementary");

      expect(context.title).toBe("Charlotte's Web");
      expect(context.author).toBe("E.B. White");
      expect(context.genre).toBe("Children's Fiction");
      expect(level).toBe("elementary");
    });

    it("should correctly process book for advanced reader", () => {
      const book: Book = {
        id: "clxyz456",
        userId: "user123",
        title: "Being and Time",
        author: "Martin Heidegger",
        description: "A philosophical treatise on the nature of being.",
        coverImage: null,
        source: "UPLOAD",
        sourceId: null,
        sourceUrl: null,
        filePath: "/path/to/file.pdf",
        fileType: "PDF",
        language: "en",
        wordCount: 150000,
        estimatedReadTime: 600,
        lexileScore: 1500,
        genre: "Philosophy",
        tags: [],
        status: "READING",
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const context = buildBookContext(book);
      // User's reading level would come from user profile, not book
      const level = mapReadingLevel("graduate");

      expect(context.title).toBe("Being and Time");
      expect(context.author).toBe("Martin Heidegger");
      expect(context.genre).toBe("Philosophy");
      expect(level).toBe("advanced");
    });
  });
});
