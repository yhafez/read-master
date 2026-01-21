/**
 * Tests for POST /api/ai/assessment
 */

import { describe, it, expect } from "vitest";

import {
  assessmentRequestSchema,
  mapReadingLevel,
  buildBookContext,
  getQuestionCount,
  mapQuestionTypeToDb,
  buildQuestionsForDb,
  calculateBloomsBreakdown,
  ASSESSMENT_TYPES,
  BLOOM_LEVELS,
  DEFAULT_QUESTION_COUNTS,
  MAX_QUESTION_COUNT,
  MIN_QUESTION_COUNT,
  MAX_TOKENS,
  MIN_CONTENT_LENGTH,
  MAX_CONTENT_LENGTH,
} from "./assessment.js";
import type { Book } from "@read-master/database";
import type { AssessmentQuestion } from "@read-master/ai";

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("assessmentRequestSchema", () => {
  describe("bookId validation", () => {
    it("should accept valid book ID with minimal fields", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bookId).toBe("clxyz123abc456def789");
      }
    });

    it("should reject empty book ID", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain("required");
      }
    });

    it("should reject invalid book ID format", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "invalid-id-format",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain(
          "Invalid book ID format"
        );
      }
    });

    it("should reject missing book ID", () => {
      const result = assessmentRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should accept valid CUID formats", () => {
      const validCUIDs = [
        "clxyz123abc456def789",
        "cm1abc2def3ghi4jkl",
        "c123456789abcdefghij",
      ];

      for (const cuid of validCUIDs) {
        const result = assessmentRequestSchema.safeParse({
          bookId: cuid,
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
        const result = assessmentRequestSchema.safeParse({
          bookId: cuid,
        });
        expect(result.success).toBe(false);
      }
    });
  });

  describe("assessmentType validation", () => {
    it("should accept quick type", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        assessmentType: "quick",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assessmentType).toBe("quick");
      }
    });

    it("should accept standard type", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        assessmentType: "standard",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assessmentType).toBe("standard");
      }
    });

    it("should accept comprehensive type", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        assessmentType: "comprehensive",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assessmentType).toBe("comprehensive");
      }
    });

    it("should default to standard when not provided", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assessmentType).toBe("standard");
      }
    });

    it("should reject invalid assessment type", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        assessmentType: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("questionCount validation", () => {
    it("should accept valid question count", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        questionCount: 15,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.questionCount).toBe(15);
      }
    });

    it("should accept minimum question count", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        questionCount: MIN_QUESTION_COUNT,
      });
      expect(result.success).toBe(true);
    });

    it("should accept maximum question count", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        questionCount: MAX_QUESTION_COUNT,
      });
      expect(result.success).toBe(true);
    });

    it("should reject question count below minimum", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        questionCount: MIN_QUESTION_COUNT - 1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject question count above maximum", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        questionCount: MAX_QUESTION_COUNT + 1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-integer question count", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        questionCount: 10.5,
      });
      expect(result.success).toBe(false);
    });

    it("should accept request without questionCount", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.questionCount).toBeUndefined();
      }
    });
  });

  describe("focusLevels validation", () => {
    it("should accept valid single focus level", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        focusLevels: ["analyze"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.focusLevels).toEqual(["analyze"]);
      }
    });

    it("should accept multiple focus levels", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        focusLevels: ["analyze", "evaluate", "create"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.focusLevels).toEqual([
          "analyze",
          "evaluate",
          "create",
        ]);
      }
    });

    it("should accept all Bloom levels", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        focusLevels: [...BLOOM_LEVELS],
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty focus levels array", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        focusLevels: [],
      });
      expect(result.success).toBe(true);
    });

    it("should accept request without focusLevels", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.focusLevels).toBeUndefined();
      }
    });

    it("should reject invalid focus level", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        focusLevels: ["invalid_level"],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("chapterIds validation", () => {
    it("should accept valid chapter IDs", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        chapterIds: ["chapter1", "chapter2"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.chapterIds).toEqual(["chapter1", "chapter2"]);
      }
    });

    it("should accept empty chapter IDs array", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        chapterIds: [],
      });
      expect(result.success).toBe(true);
    });

    it("should accept request without chapterIds", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.chapterIds).toBeUndefined();
      }
    });
  });

  describe("full request validation", () => {
    it("should accept complete valid request", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
        assessmentType: "comprehensive",
        questionCount: 15,
        focusLevels: ["analyze", "evaluate"],
        chapterIds: ["ch1", "ch2", "ch3"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bookId).toBe("clxyz123abc456def789");
        expect(result.data.assessmentType).toBe("comprehensive");
        expect(result.data.questionCount).toBe(15);
        expect(result.data.focusLevels).toEqual(["analyze", "evaluate"]);
        expect(result.data.chapterIds).toEqual(["ch1", "ch2", "ch3"]);
      }
    });

    it("should strip extra fields", () => {
      const result = assessmentRequestSchema.safeParse({
        bookId: "clxyz123abc456def789",
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
    });

    it("should map high school levels", () => {
      expect(mapReadingLevel("high_school")).toBe("high_school");
      expect(mapReadingLevel("high school")).toBe("high_school");
      expect(mapReadingLevel("9-12")).toBe("high_school");
    });

    it("should map college levels", () => {
      expect(mapReadingLevel("college")).toBe("college");
      expect(mapReadingLevel("undergraduate")).toBe("college");
    });

    it("should map advanced levels", () => {
      expect(mapReadingLevel("advanced")).toBe("advanced");
      expect(mapReadingLevel("graduate")).toBe("advanced");
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
    const content = "This is the full book content for testing.";
    const context = buildBookContext(book, content);

    expect(context.title).toBe("Test Book");
    expect(context.author).toBe("Test Author");
    expect(context.content).toBe(content);
    expect(context.genre).toBe("Fiction");
    expect(context.description).toBe("A test book description");
  });

  it("should use Unknown Author when author is null", () => {
    const book = createBook({ author: null });
    const context = buildBookContext(book, "content");

    expect(context.author).toBe("Unknown Author");
  });

  it("should not include genre when null", () => {
    const book = createBook({ genre: null });
    const context = buildBookContext(book, "content");

    expect(context.genre).toBeUndefined();
  });

  it("should not include description field when null", () => {
    const book = createBook({ description: null });
    const context = buildBookContext(book, "content");

    expect(context.description).toBeUndefined();
  });

  it("should use provided content not description for content field", () => {
    const book = createBook({ description: "Short description" });
    const longContent = "This is a much longer content string for testing.";
    const context = buildBookContext(book, longContent);

    expect(context.content).toBe(longContent);
    expect(context.description).toBe("Short description");
  });
});

// ============================================================================
// getQuestionCount Tests
// ============================================================================

describe("getQuestionCount", () => {
  it("should return default for quick type", () => {
    expect(getQuestionCount("quick")).toBe(DEFAULT_QUESTION_COUNTS.quick);
    expect(getQuestionCount("quick")).toBe(5);
  });

  it("should return default for standard type", () => {
    expect(getQuestionCount("standard")).toBe(DEFAULT_QUESTION_COUNTS.standard);
    expect(getQuestionCount("standard")).toBe(10);
  });

  it("should return default for comprehensive type", () => {
    expect(getQuestionCount("comprehensive")).toBe(
      DEFAULT_QUESTION_COUNTS.comprehensive
    );
    expect(getQuestionCount("comprehensive")).toBe(20);
  });

  it("should use custom count when provided", () => {
    expect(getQuestionCount("quick", 8)).toBe(8);
    expect(getQuestionCount("standard", 15)).toBe(15);
    expect(getQuestionCount("comprehensive", 25)).toBe(25);
  });

  it("should clamp to minimum when custom is too low", () => {
    expect(getQuestionCount("standard", 1)).toBe(MIN_QUESTION_COUNT);
    expect(getQuestionCount("standard", 0)).toBe(MIN_QUESTION_COUNT);
    expect(getQuestionCount("standard", -5)).toBe(MIN_QUESTION_COUNT);
  });

  it("should clamp to maximum when custom is too high", () => {
    expect(getQuestionCount("standard", 100)).toBe(MAX_QUESTION_COUNT);
    expect(getQuestionCount("standard", 50)).toBe(MAX_QUESTION_COUNT);
  });

  it("should allow boundary values", () => {
    expect(getQuestionCount("standard", MIN_QUESTION_COUNT)).toBe(
      MIN_QUESTION_COUNT
    );
    expect(getQuestionCount("standard", MAX_QUESTION_COUNT)).toBe(
      MAX_QUESTION_COUNT
    );
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

  it("should map essay to ESSAY", () => {
    expect(mapQuestionTypeToDb("essay")).toBe("ESSAY");
  });

  it("should map fill_blank to FILL_BLANK", () => {
    expect(mapQuestionTypeToDb("fill_blank")).toBe("FILL_BLANK");
  });

  it("should default to MULTIPLE_CHOICE for unknown types", () => {
    expect(mapQuestionTypeToDb("unknown")).toBe("MULTIPLE_CHOICE");
    expect(mapQuestionTypeToDb("")).toBe("MULTIPLE_CHOICE");
    expect(mapQuestionTypeToDb("invalid")).toBe("MULTIPLE_CHOICE");
  });
});

// ============================================================================
// buildQuestionsForDb Tests
// ============================================================================

describe("buildQuestionsForDb", () => {
  it("should build question array for database", () => {
    const questions: AssessmentQuestion[] = [
      {
        id: "q1",
        question: "What is the main theme?",
        type: "multiple_choice",
        bloomLevel: "understand",
        difficulty: 2,
        options: [
          { id: "a", text: "Option A" },
          { id: "b", text: "Option B" },
        ],
        correctAnswer: "a",
        explanation: "Because...",
        points: 10,
      },
      {
        id: "q2",
        question: "Describe the protagonist",
        type: "essay",
        bloomLevel: "analyze",
        difficulty: 4,
        correctAnswer: "The protagonist is...",
        modelAnswer: "A model essay answer...",
        explanation: "Full explanation...",
        points: 25,
        rubric: [{ criterion: "Content", maxPoints: 15 }],
      },
    ];

    const result = buildQuestionsForDb(questions);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "q1",
      type: "MULTIPLE_CHOICE",
      question: "What is the main theme?",
      options: [
        { id: "a", text: "Option A" },
        { id: "b", text: "Option B" },
      ],
      correctAnswer: "a",
      modelAnswer: undefined,
      explanation: "Because...",
      difficulty: 2,
      bloomsLevel: "understand",
      points: 10,
      rubric: undefined,
    });
    expect(result[1]).toEqual({
      id: "q2",
      type: "ESSAY",
      question: "Describe the protagonist",
      options: undefined,
      correctAnswer: "The protagonist is...",
      modelAnswer: "A model essay answer...",
      explanation: "Full explanation...",
      difficulty: 4,
      bloomsLevel: "analyze",
      points: 25,
      rubric: [{ criterion: "Content", maxPoints: 15 }],
    });
  });

  it("should handle empty questions array", () => {
    const result = buildQuestionsForDb([]);
    expect(result).toEqual([]);
  });

  it("should handle questions without options", () => {
    const questions: AssessmentQuestion[] = [
      {
        id: "q1",
        question: "Explain the concept",
        type: "short_answer",
        bloomLevel: "understand",
        difficulty: 2,
        correctAnswer: "The concept is...",
        explanation: "Explanation",
        points: 10,
      },
    ];

    const result = buildQuestionsForDb(questions);
    expect(result[0]?.options).toBeUndefined();
  });
});

// ============================================================================
// calculateBloomsBreakdown Tests
// ============================================================================

describe("calculateBloomsBreakdown", () => {
  it("should calculate correct percentages", () => {
    const questions: AssessmentQuestion[] = [
      {
        id: "q1",
        question: "Q1",
        type: "multiple_choice",
        bloomLevel: "remember",
        difficulty: 1,
        correctAnswer: "a",
        explanation: "",
        points: 10,
      },
      {
        id: "q2",
        question: "Q2",
        type: "multiple_choice",
        bloomLevel: "remember",
        difficulty: 1,
        correctAnswer: "a",
        explanation: "",
        points: 10,
      },
      {
        id: "q3",
        question: "Q3",
        type: "multiple_choice",
        bloomLevel: "understand",
        difficulty: 2,
        correctAnswer: "a",
        explanation: "",
        points: 10,
      },
      {
        id: "q4",
        question: "Q4",
        type: "multiple_choice",
        bloomLevel: "analyze",
        difficulty: 3,
        correctAnswer: "a",
        explanation: "",
        points: 10,
      },
    ];

    const result = calculateBloomsBreakdown(questions);

    expect(result.remember).toBe(50); // 2/4 = 50%
    expect(result.understand).toBe(25); // 1/4 = 25%
    expect(result.analyze).toBe(25); // 1/4 = 25%
    expect(result.apply).toBeUndefined();
    expect(result.evaluate).toBeUndefined();
    expect(result.create).toBeUndefined();
  });

  it("should return empty object for empty questions", () => {
    const result = calculateBloomsBreakdown([]);
    expect(result).toEqual({});
  });

  it("should handle single question", () => {
    const questions: AssessmentQuestion[] = [
      {
        id: "q1",
        question: "Q1",
        type: "essay",
        bloomLevel: "create",
        difficulty: 5,
        correctAnswer: "",
        explanation: "",
        points: 50,
      },
    ];

    const result = calculateBloomsBreakdown(questions);
    expect(result.create).toBe(100);
    expect(Object.keys(result)).toHaveLength(1);
  });

  it("should round percentages correctly", () => {
    const questions: AssessmentQuestion[] = [
      {
        id: "q1",
        question: "Q1",
        type: "multiple_choice",
        bloomLevel: "remember",
        difficulty: 1,
        correctAnswer: "a",
        explanation: "",
        points: 10,
      },
      {
        id: "q2",
        question: "Q2",
        type: "multiple_choice",
        bloomLevel: "understand",
        difficulty: 2,
        correctAnswer: "a",
        explanation: "",
        points: 10,
      },
      {
        id: "q3",
        question: "Q3",
        type: "multiple_choice",
        bloomLevel: "analyze",
        difficulty: 3,
        correctAnswer: "a",
        explanation: "",
        points: 10,
      },
    ];

    const result = calculateBloomsBreakdown(questions);

    // Each should be 33.33...% rounded to 33%
    expect(result.remember).toBe(33);
    expect(result.understand).toBe(33);
    expect(result.analyze).toBe(33);
  });

  it("should handle all Bloom levels", () => {
    const questions: AssessmentQuestion[] = BLOOM_LEVELS.map((level, i) => ({
      id: `q${i}`,
      question: `Q${i}`,
      type: "multiple_choice" as const,
      bloomLevel: level,
      difficulty: i + 1,
      correctAnswer: "a",
      explanation: "",
      points: 10,
    }));

    const result = calculateBloomsBreakdown(questions);

    // 6 levels, each should be ~17%
    expect(result.remember).toBe(17);
    expect(result.understand).toBe(17);
    expect(result.apply).toBe(17);
    expect(result.analyze).toBe(17);
    expect(result.evaluate).toBe(17);
    expect(result.create).toBe(17);
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have all assessment types", () => {
    expect(ASSESSMENT_TYPES).toContain("quick");
    expect(ASSESSMENT_TYPES).toContain("standard");
    expect(ASSESSMENT_TYPES).toContain("comprehensive");
    expect(ASSESSMENT_TYPES.length).toBe(3);
  });

  it("should have all Bloom levels", () => {
    expect(BLOOM_LEVELS).toContain("remember");
    expect(BLOOM_LEVELS).toContain("understand");
    expect(BLOOM_LEVELS).toContain("apply");
    expect(BLOOM_LEVELS).toContain("analyze");
    expect(BLOOM_LEVELS).toContain("evaluate");
    expect(BLOOM_LEVELS).toContain("create");
    expect(BLOOM_LEVELS.length).toBe(6);
  });

  it("should have appropriate default question counts", () => {
    expect(DEFAULT_QUESTION_COUNTS.quick).toBe(5);
    expect(DEFAULT_QUESTION_COUNTS.standard).toBe(10);
    expect(DEFAULT_QUESTION_COUNTS.comprehensive).toBe(20);
  });

  it("should have reasonable question count limits", () => {
    expect(MIN_QUESTION_COUNT).toBe(3);
    expect(MAX_QUESTION_COUNT).toBe(30);
    expect(MAX_QUESTION_COUNT).toBeGreaterThan(MIN_QUESTION_COUNT);
  });

  it("should have appropriate MAX_TOKENS", () => {
    expect(MAX_TOKENS).toBe(8192);
    expect(MAX_TOKENS).toBeGreaterThan(0);
  });

  it("should have reasonable content length limits", () => {
    expect(MIN_CONTENT_LENGTH).toBe(100);
    expect(MAX_CONTENT_LENGTH).toBe(100000);
    expect(MAX_CONTENT_LENGTH).toBeGreaterThan(MIN_CONTENT_LENGTH);
  });

  it("should have default counts that are within limits", () => {
    for (const type of ASSESSMENT_TYPES) {
      const count = DEFAULT_QUESTION_COUNTS[type];
      expect(count).toBeGreaterThanOrEqual(MIN_QUESTION_COUNT);
      expect(count).toBeLessThanOrEqual(MAX_QUESTION_COUNT);
    }
  });
});

// ============================================================================
// Integration-like Tests
// ============================================================================

describe("Assessment handler helper integration", () => {
  describe("Complete request scenarios", () => {
    it("should validate a typical quick assessment request", () => {
      const request = {
        bookId: "clxyz123abc456def789",
        assessmentType: "quick",
      };

      const result = assessmentRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assessmentType).toBe("quick");
        expect(result.data.questionCount).toBeUndefined();
      }
    });

    it("should validate a comprehensive assessment with focus levels", () => {
      const request = {
        bookId: "clxyz123abc456def789",
        assessmentType: "comprehensive",
        questionCount: 25,
        focusLevels: ["analyze", "evaluate", "create"],
        chapterIds: ["ch1", "ch5", "ch10"],
      };

      const result = assessmentRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should validate minimal request with defaults", () => {
      const request = {
        bookId: "clxyz123abc456def789",
      };

      const result = assessmentRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assessmentType).toBe("standard");
        expect(result.data.questionCount).toBeUndefined();
        expect(result.data.focusLevels).toBeUndefined();
        expect(result.data.chapterIds).toBeUndefined();
      }
    });
  });

  describe("Book context and reading level integration", () => {
    it("should correctly process book for beginner reader", () => {
      const book: Book = {
        id: "clxyz123",
        userId: "user123",
        title: "The Very Hungry Caterpillar",
        author: "Eric Carle",
        description: "A story about a caterpillar who eats a lot.",
        coverImage: null,
        source: "UPLOAD",
        sourceId: null,
        sourceUrl: null,
        filePath: "/path/to/file.epub",
        fileType: "EPUB",
        language: "en",
        wordCount: 200,
        estimatedReadTime: 5,
        lexileScore: 460,
        rawContent: null,
        genre: "Picture Book",
        tags: [],
        status: "COMPLETED",
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const content =
        "On Monday he ate through one apple. But he was still hungry.";
      const context = buildBookContext(book, content);
      const level = mapReadingLevel("Elementary");

      expect(context.title).toBe("The Very Hungry Caterpillar");
      expect(context.author).toBe("Eric Carle");
      expect(context.content).toBe(content);
      expect(level).toBe("elementary");
    });

    it("should correctly process book for advanced reader", () => {
      const book: Book = {
        id: "clxyz456",
        userId: "user123",
        title: "Critique of Pure Reason",
        author: "Immanuel Kant",
        description: "A treatise on metaphysics and epistemology.",
        coverImage: null,
        source: "UPLOAD",
        sourceId: null,
        sourceUrl: null,
        filePath: "/path/to/file.pdf",
        fileType: "PDF",
        language: "en",
        wordCount: 200000,
        estimatedReadTime: 1200,
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

      const content = "Human reason has this peculiar fate...";
      const context = buildBookContext(book, content);
      const level = mapReadingLevel("graduate");

      expect(context.title).toBe("Critique of Pure Reason");
      expect(level).toBe("advanced");
    });
  });

  describe("Question count resolution", () => {
    it("should use default counts for all assessment types", () => {
      expect(getQuestionCount("quick")).toBe(5);
      expect(getQuestionCount("standard")).toBe(10);
      expect(getQuestionCount("comprehensive")).toBe(20);
    });

    it("should override with custom count", () => {
      expect(getQuestionCount("quick", 7)).toBe(7);
      expect(getQuestionCount("standard", 12)).toBe(12);
      expect(getQuestionCount("comprehensive", 18)).toBe(18);
    });

    it("should clamp extreme custom counts", () => {
      expect(getQuestionCount("standard", 1)).toBe(MIN_QUESTION_COUNT);
      expect(getQuestionCount("standard", 100)).toBe(MAX_QUESTION_COUNT);
    });
  });

  describe("Full workflow simulation", () => {
    it("should process a complete assessment workflow", () => {
      // 1. Validate request
      const request = {
        bookId: "clxyz123abc456def789",
        assessmentType: "standard" as const,
        questionCount: 10,
        focusLevels: ["analyze", "evaluate"] as const,
      };

      const validated = assessmentRequestSchema.safeParse(request);
      expect(validated.success).toBe(true);

      // 2. Build book context
      const book: Book = {
        id: "clxyz123abc456def789",
        userId: "user123",
        title: "Test Book",
        author: "Test Author",
        description: "A comprehensive test book.",
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
      };

      const content = "A long content string for the book...".repeat(100);
      const context = buildBookContext(book, content);
      expect(context.title).toBe("Test Book");

      // 3. Get question count
      const questionCount = getQuestionCount(
        request.assessmentType,
        request.questionCount
      );
      expect(questionCount).toBe(10);

      // 4. Map reading level
      const readingLevel = mapReadingLevel("High School");
      expect(readingLevel).toBe("high_school");

      // 5. Simulate questions and build for DB
      const mockQuestions: AssessmentQuestion[] = [
        {
          id: "q1",
          question: "What is the main theme?",
          type: "multiple_choice",
          bloomLevel: "analyze",
          difficulty: 3,
          options: [{ id: "a", text: "Theme A" }],
          correctAnswer: "a",
          explanation: "Because...",
          points: 10,
        },
        {
          id: "q2",
          question: "Evaluate the author's argument.",
          type: "essay",
          bloomLevel: "evaluate",
          difficulty: 4,
          correctAnswer: "",
          modelAnswer: "Model answer...",
          explanation: "Evaluation criteria...",
          points: 20,
          rubric: [{ criterion: "Analysis", maxPoints: 10 }],
        },
      ];

      const dbQuestions = buildQuestionsForDb(mockQuestions);
      expect(dbQuestions).toHaveLength(2);
      expect(dbQuestions[0]?.type).toBe("MULTIPLE_CHOICE");
      expect(dbQuestions[1]?.type).toBe("ESSAY");

      // 6. Calculate Bloom's breakdown
      const breakdown = calculateBloomsBreakdown(mockQuestions);
      expect(breakdown.analyze).toBe(50);
      expect(breakdown.evaluate).toBe(50);
    });
  });
});
