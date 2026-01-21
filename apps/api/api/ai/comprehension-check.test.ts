/**
 * Tests for POST /api/ai/comprehension-check
 */

import { describe, it, expect } from "vitest";

import {
  comprehensionCheckRequestSchema,
  mapReadingLevel,
  buildBookContext,
  mapQuestionTypeToDb,
  buildQuestionObject,
  MIN_CONTENT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_TOKENS,
  QUESTION_TYPES,
} from "./comprehension-check.js";
import type { Book } from "@read-master/database";
import type { ComprehensionCheckOutput } from "@read-master/ai";

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("comprehensionCheckRequestSchema", () => {
  // Sample content that meets minimum length
  const validContent = "The protagonist walked through the forest. ".repeat(5);

  describe("bookId validation", () => {
    it("should accept valid book ID with minimal fields", () => {
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        recentContent: validContent,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bookId).toBe("clxyz123abc456def789");
      }
    });

    it("should reject empty book ID", () => {
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "",
        recentContent: validContent,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("required");
      }
    });

    it("should reject invalid book ID format", () => {
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "invalid-id-format",
        recentContent: validContent,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain(
          "Invalid book ID format"
        );
      }
    });

    it("should reject missing book ID", () => {
      const result = comprehensionCheckRequestSchema.safeParse({
        recentContent: validContent,
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
        const result = comprehensionCheckRequestSchema.safeParse({
          bookId: cuid,
          recentContent: validContent,
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
        const result = comprehensionCheckRequestSchema.safeParse({
          bookId: cuid,
          recentContent: validContent,
        });
        expect(result.success).toBe(false);
      }
    });
  });

  describe("recentContent validation", () => {
    it("should accept valid content at minimum length", () => {
      const minContent = "a".repeat(MIN_CONTENT_LENGTH);
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        recentContent: minContent,
      });
      expect(result.success).toBe(true);
    });

    it("should reject content below minimum length", () => {
      const shortContent = "a".repeat(MIN_CONTENT_LENGTH - 1);
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        recentContent: shortContent,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("at least");
      }
    });

    it("should reject empty content", () => {
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        recentContent: "",
      });
      expect(result.success).toBe(false);
    });

    it("should accept content up to max length", () => {
      const maxContent = "a".repeat(MAX_CONTENT_LENGTH);
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        recentContent: maxContent,
      });
      expect(result.success).toBe(true);
    });

    it("should reject content exceeding max length", () => {
      const tooLongContent = "a".repeat(MAX_CONTENT_LENGTH + 1);
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        recentContent: tooLongContent,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("at most");
      }
    });

    it("should reject missing content", () => {
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("questionType validation", () => {
    it("should accept multiple_choice type", () => {
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        recentContent: validContent,
        questionType: "multiple_choice",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.questionType).toBe("multiple_choice");
      }
    });

    it("should accept true_false type", () => {
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        recentContent: validContent,
        questionType: "true_false",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.questionType).toBe("true_false");
      }
    });

    it("should accept short_answer type", () => {
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        recentContent: validContent,
        questionType: "short_answer",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.questionType).toBe("short_answer");
      }
    });

    it("should default to multiple_choice when not provided", () => {
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        recentContent: validContent,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.questionType).toBe("multiple_choice");
      }
    });

    it("should reject invalid question type", () => {
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        recentContent: validContent,
        questionType: "essay",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("chapterId validation", () => {
    it("should accept request with chapterId", () => {
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        recentContent: validContent,
        chapterId: "chapter123",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.chapterId).toBe("chapter123");
      }
    });

    it("should accept request without chapterId", () => {
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        recentContent: validContent,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.chapterId).toBeUndefined();
      }
    });
  });

  describe("full request validation", () => {
    it("should accept complete valid request", () => {
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        recentContent: validContent,
        questionType: "multiple_choice",
        chapterId: "chapter1",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bookId).toBe("clxyz123abc456def789");
        expect(result.data.recentContent).toBe(validContent);
        expect(result.data.questionType).toBe("multiple_choice");
        expect(result.data.chapterId).toBe("chapter1");
      }
    });

    it("should strip extra fields", () => {
      const result = comprehensionCheckRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        recentContent: validContent,
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
// mapQuestionTypeToDb Tests
// ============================================================================

describe("mapQuestionTypeToDb", () => {
  it("should map multiple_choice to MULTIPLE_CHOICE", () => {
    expect(mapQuestionTypeToDb("multiple_choice")).toBe("MULTIPLE_CHOICE");
  });

  it("should map true_false to TRUE_FALSE", () => {
    expect(mapQuestionTypeToDb("true_false")).toBe("TRUE_FALSE");
  });

  it("should map short_answer to SHORT_ANSWER", () => {
    expect(mapQuestionTypeToDb("short_answer")).toBe("SHORT_ANSWER");
  });

  it("should default to MULTIPLE_CHOICE for unknown types", () => {
    expect(mapQuestionTypeToDb("unknown")).toBe("MULTIPLE_CHOICE");
    expect(mapQuestionTypeToDb("essay")).toBe("MULTIPLE_CHOICE");
    expect(mapQuestionTypeToDb("")).toBe("MULTIPLE_CHOICE");
  });
});

// ============================================================================
// buildQuestionObject Tests
// ============================================================================

describe("buildQuestionObject", () => {
  it("should build question object for multiple choice", () => {
    const parsed: ComprehensionCheckOutput = {
      question: "What is the main theme?",
      type: "multiple_choice",
      options: [
        { id: "a", text: "Option A", isCorrect: false },
        { id: "b", text: "Option B", isCorrect: true },
        { id: "c", text: "Option C", isCorrect: false },
        { id: "d", text: "Option D", isCorrect: false },
      ],
      correctAnswer: "b",
      explanation: "Option B is correct because...",
      difficulty: 2,
      textReference: "The text says...",
    };

    const result = buildQuestionObject(parsed);

    expect(result.id).toBe("q1");
    expect(result.type).toBe("MULTIPLE_CHOICE");
    expect(result.question).toBe("What is the main theme?");
    expect(result.correctAnswer).toBe("b");
    expect(result.explanation).toBe("Option B is correct because...");
    expect(result.difficulty).toBe(2);
    expect(result.textReference).toBe("The text says...");
    expect(result.bloomsLevel).toBe("understand");
    expect(result.options).toEqual([
      { id: "a", text: "Option A" },
      { id: "b", text: "Option B" },
      { id: "c", text: "Option C" },
      { id: "d", text: "Option D" },
    ]);
  });

  it("should build question object for true/false", () => {
    const parsed: ComprehensionCheckOutput = {
      question: "The protagonist is brave.",
      type: "true_false",
      options: [
        { id: "true", text: "True", isCorrect: true },
        { id: "false", text: "False", isCorrect: false },
      ],
      correctAnswer: "true",
      explanation: "True because the text shows...",
      difficulty: 1,
    };

    const result = buildQuestionObject(parsed);

    expect(result.type).toBe("TRUE_FALSE");
    expect(result.correctAnswer).toBe("true");
    expect(result.options).toEqual([
      { id: "true", text: "True" },
      { id: "false", text: "False" },
    ]);
  });

  it("should build question object for short answer", () => {
    const parsed: ComprehensionCheckOutput = {
      question: "Describe the main character's motivation.",
      type: "short_answer",
      correctAnswer: "The main character is motivated by revenge",
      explanation: "The text reveals this through...",
      difficulty: 3,
    };

    const result = buildQuestionObject(parsed);

    expect(result.type).toBe("SHORT_ANSWER");
    expect(result.options).toBeUndefined();
    expect(result.correctAnswer).toBe(
      "The main character is motivated by revenge"
    );
  });

  it("should handle missing textReference", () => {
    const parsed: ComprehensionCheckOutput = {
      question: "What happens next?",
      type: "multiple_choice",
      correctAnswer: "a",
      explanation: "Explanation",
      difficulty: 2,
    };

    const result = buildQuestionObject(parsed);

    expect(result.textReference).toBeUndefined();
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have appropriate MIN_CONTENT_LENGTH", () => {
    expect(MIN_CONTENT_LENGTH).toBe(50);
    expect(MIN_CONTENT_LENGTH).toBeGreaterThan(0);
  });

  it("should have appropriate MAX_CONTENT_LENGTH", () => {
    expect(MAX_CONTENT_LENGTH).toBe(10000);
    expect(MAX_CONTENT_LENGTH).toBeGreaterThan(MIN_CONTENT_LENGTH);
  });

  it("should have appropriate MAX_TOKENS", () => {
    expect(MAX_TOKENS).toBe(1024);
    expect(MAX_TOKENS).toBeGreaterThan(0);
  });

  it("should have all question types", () => {
    expect(QUESTION_TYPES).toContain("multiple_choice");
    expect(QUESTION_TYPES).toContain("true_false");
    expect(QUESTION_TYPES).toContain("short_answer");
    expect(QUESTION_TYPES.length).toBe(3);
  });

  it("should have consistent length relationships", () => {
    // MAX_CONTENT_LENGTH should be reasonable for comprehension checks
    expect(MAX_CONTENT_LENGTH).toBeGreaterThanOrEqual(1000);
    // MIN should be enough to generate meaningful questions
    expect(MIN_CONTENT_LENGTH).toBeGreaterThanOrEqual(50);
  });
});

// ============================================================================
// Integration-like Tests
// ============================================================================

describe("Comprehension check handler helper integration", () => {
  describe("Complete request scenarios", () => {
    it("should validate a typical comprehension check request", () => {
      const request = {
        bookId: "clxyz123abc456def789",
        recentContent:
          "The protagonist walked through the forest, uncertain of what lay ahead. " +
          "The trees seemed to whisper secrets, and the path grew darker with each step. " +
          "She clutched her lantern tightly, knowing that her choices would determine " +
          "the fate of the kingdom. The prophecy had spoken of this moment, and now " +
          "there was no turning back.",
        questionType: "multiple_choice",
        chapterId: "chapter-3",
      };

      const result = comprehensionCheckRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should validate a minimal comprehension check request", () => {
      const minContent =
        "The story begins with a young hero on a quest. ".repeat(2);
      const request = {
        bookId: "clxyz123abc456def789",
        recentContent: minContent,
      };

      const result = comprehensionCheckRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should validate request with long content", () => {
      const longContent =
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(100);
      const request = {
        bookId: "clxyz123abc456def789",
        recentContent: longContent.slice(0, MAX_CONTENT_LENGTH),
      };

      const result = comprehensionCheckRequestSchema.safeParse(request);
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
        rawContent: null,
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

  describe("Question type handling", () => {
    it("should handle all valid question types", () => {
      const validContent = "a".repeat(MIN_CONTENT_LENGTH);

      for (const qType of QUESTION_TYPES) {
        const result = comprehensionCheckRequestSchema.safeParse({
          bookId: "clxyz123abc456def789",
          recentContent: validContent,
          questionType: qType,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.questionType).toBe(qType);
        }
      }
    });

    it("should correctly map all question types to database format", () => {
      expect(mapQuestionTypeToDb("multiple_choice")).toBe("MULTIPLE_CHOICE");
      expect(mapQuestionTypeToDb("true_false")).toBe("TRUE_FALSE");
      expect(mapQuestionTypeToDb("short_answer")).toBe("SHORT_ANSWER");
    });
  });
});
