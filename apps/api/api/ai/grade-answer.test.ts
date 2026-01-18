/**
 * Tests for POST /api/ai/grade-answer endpoint
 *
 * Tests cover:
 * - Request validation schemas
 * - Helper functions for reading level mapping
 * - Input building for AI prompt
 * - Answer building for database storage
 * - Assessment score calculation
 * - Integration scenarios
 */

import { describe, it, expect } from "vitest";
import {
  gradeAnswerRequestSchema,
  rubricItemSchema,
  mapReadingLevel,
  buildGradeAnswerInput,
  buildAnswerForDb,
  calculateAssessmentScore,
  MAX_TOKENS,
  MIN_ANSWER_LENGTH,
  MAX_ANSWER_LENGTH,
  MIN_QUESTION_LENGTH,
  MAX_QUESTION_LENGTH,
  MAX_EXPECTED_ANSWER_LENGTH,
  MAX_POINTS,
  MIN_POINTS,
  MAX_RUBRIC_ITEMS,
} from "./grade-answer.js";
import type { GradeAnswerOutput } from "@read-master/ai";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have correct MAX_TOKENS value", () => {
    expect(MAX_TOKENS).toBe(2048);
  });

  it("should have correct answer length limits", () => {
    expect(MIN_ANSWER_LENGTH).toBe(1);
    expect(MAX_ANSWER_LENGTH).toBe(10000);
  });

  it("should have correct question length limits", () => {
    expect(MIN_QUESTION_LENGTH).toBe(5);
    expect(MAX_QUESTION_LENGTH).toBe(5000);
  });

  it("should have correct expected answer length limit", () => {
    expect(MAX_EXPECTED_ANSWER_LENGTH).toBe(10000);
  });

  it("should have correct points limits", () => {
    expect(MIN_POINTS).toBe(1);
    expect(MAX_POINTS).toBe(100);
  });

  it("should have correct rubric items limit", () => {
    expect(MAX_RUBRIC_ITEMS).toBe(10);
  });
});

// ============================================================================
// Rubric Item Schema Tests
// ============================================================================

describe("rubricItemSchema", () => {
  it("should accept valid rubric item", () => {
    const result = rubricItemSchema.safeParse({
      criterion: "Understanding of main concepts",
      maxPoints: 5,
    });
    expect(result.success).toBe(true);
  });

  it("should accept rubric item with description", () => {
    const result = rubricItemSchema.safeParse({
      criterion: "Critical analysis",
      maxPoints: 10,
      description: "Evaluates the ability to analyze and critique",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe(
        "Evaluates the ability to analyze and critique"
      );
    }
  });

  it("should reject empty criterion", () => {
    const result = rubricItemSchema.safeParse({
      criterion: "",
      maxPoints: 5,
    });
    expect(result.success).toBe(false);
  });

  it("should reject zero maxPoints", () => {
    const result = rubricItemSchema.safeParse({
      criterion: "Test",
      maxPoints: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject maxPoints exceeding limit", () => {
    const result = rubricItemSchema.safeParse({
      criterion: "Test",
      maxPoints: 101,
    });
    expect(result.success).toBe(false);
  });

  it("should reject criterion exceeding 500 characters", () => {
    const result = rubricItemSchema.safeParse({
      criterion: "a".repeat(501),
      maxPoints: 5,
    });
    expect(result.success).toBe(false);
  });

  it("should reject description exceeding 1000 characters", () => {
    const result = rubricItemSchema.safeParse({
      criterion: "Test",
      maxPoints: 5,
      description: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Grade Answer Request Schema Tests
// ============================================================================

describe("gradeAnswerRequestSchema", () => {
  const validRequest = {
    question: "What is the main theme of the book?",
    expectedAnswer: "The main theme is perseverance in the face of adversity.",
    userAnswer: "The book is about never giving up even when things get hard.",
    maxPoints: 10,
  };

  describe("required fields", () => {
    it("should accept valid minimal request", () => {
      const result = gradeAnswerRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it("should reject missing question", () => {
      const { question: _q, ...invalid } = validRequest;
      const result = gradeAnswerRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject missing expectedAnswer", () => {
      const { expectedAnswer: _e, ...invalid } = validRequest;
      const result = gradeAnswerRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject missing userAnswer", () => {
      const { userAnswer: _u, ...invalid } = validRequest;
      const result = gradeAnswerRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject missing maxPoints", () => {
      const { maxPoints: _m, ...invalid } = validRequest;
      const result = gradeAnswerRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("question validation", () => {
    it("should reject question shorter than minimum", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        question: "abc",
      });
      expect(result.success).toBe(false);
    });

    it("should accept question at minimum length", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        question: "abcde",
      });
      expect(result.success).toBe(true);
    });

    it("should reject question exceeding maximum", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        question: "a".repeat(5001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("userAnswer validation", () => {
    it("should accept single character answer", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        userAnswer: "a",
      });
      expect(result.success).toBe(true);
    });

    it("should reject answer exceeding maximum", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        userAnswer: "a".repeat(10001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("expectedAnswer validation", () => {
    it("should reject empty expectedAnswer", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        expectedAnswer: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject expectedAnswer exceeding maximum", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        expectedAnswer: "a".repeat(10001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("maxPoints validation", () => {
    it("should reject maxPoints below minimum", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        maxPoints: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should accept maxPoints at minimum", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        maxPoints: 1,
      });
      expect(result.success).toBe(true);
    });

    it("should accept maxPoints at maximum", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        maxPoints: 100,
      });
      expect(result.success).toBe(true);
    });

    it("should reject maxPoints exceeding maximum", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        maxPoints: 101,
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-integer maxPoints", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        maxPoints: 5.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("optional fields", () => {
    it("should accept valid assessmentId", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        assessmentId: "clxyz123abc",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid assessmentId format", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        assessmentId: "invalid-id",
      });
      expect(result.success).toBe(false);
    });

    it("should accept valid questionId", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        questionId: "q1",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty questionId", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        questionId: "",
      });
      expect(result.success).toBe(false);
    });

    it("should accept valid bookId", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        bookId: "cabc123xyz",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid bookId format", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        bookId: "book-123",
      });
      expect(result.success).toBe(false);
    });

    it("should accept bookTitle", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        bookTitle: "To Kill a Mockingbird",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bookTitle).toBe("To Kill a Mockingbird");
      }
    });

    it("should reject bookTitle exceeding 500 characters", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        bookTitle: "a".repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("rubric validation", () => {
    it("should accept valid rubric array", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        rubric: [
          { criterion: "Understanding", maxPoints: 5 },
          { criterion: "Analysis", maxPoints: 5 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty rubric array", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        rubric: [],
      });
      expect(result.success).toBe(true);
    });

    it("should reject rubric with more than 10 items", () => {
      const rubric = Array.from({ length: 11 }, (_, i) => ({
        criterion: `Criterion ${i}`,
        maxPoints: 5,
      }));
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        rubric,
      });
      expect(result.success).toBe(false);
    });

    it("should accept rubric with exactly 10 items", () => {
      const rubric = Array.from({ length: 10 }, (_, i) => ({
        criterion: `Criterion ${i}`,
        maxPoints: 5,
      }));
      const result = gradeAnswerRequestSchema.safeParse({
        ...validRequest,
        rubric,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("full request validation", () => {
    it("should accept complete request with all fields", () => {
      const result = gradeAnswerRequestSchema.safeParse({
        assessmentId: "clxyz123abc",
        questionId: "q1",
        question: "What is the main theme of the book?",
        expectedAnswer: "The main theme is perseverance.",
        userAnswer: "It is about never giving up.",
        maxPoints: 10,
        rubric: [
          {
            criterion: "Understanding",
            maxPoints: 5,
            description: "Core concepts",
          },
          { criterion: "Expression", maxPoints: 5 },
        ],
        bookTitle: "To Kill a Mockingbird",
        bookId: "cabc123xyz",
      });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// mapReadingLevel Tests
// ============================================================================

describe("mapReadingLevel", () => {
  describe("null and empty handling", () => {
    it("should return middle_school for null", () => {
      expect(mapReadingLevel(null)).toBe("middle_school");
    });

    it("should return middle_school for empty string", () => {
      expect(mapReadingLevel("")).toBe("middle_school");
    });
  });

  describe("keyword-based mapping", () => {
    it("should map beginner level", () => {
      expect(mapReadingLevel("beginner")).toBe("beginner");
      expect(mapReadingLevel("Beginner Level")).toBe("beginner");
      expect(mapReadingLevel("k-2")).toBe("beginner");
      expect(mapReadingLevel("K-2 Grade")).toBe("beginner");
    });

    it("should map elementary level", () => {
      expect(mapReadingLevel("elementary")).toBe("elementary");
      expect(mapReadingLevel("Elementary School")).toBe("elementary");
      expect(mapReadingLevel("3-5")).toBe("elementary");
      expect(mapReadingLevel("Grades 3-5")).toBe("elementary");
    });

    it("should map middle_school level", () => {
      expect(mapReadingLevel("middle")).toBe("middle_school");
      expect(mapReadingLevel("Middle School")).toBe("middle_school");
      expect(mapReadingLevel("6-8")).toBe("middle_school");
      expect(mapReadingLevel("Grades 6-8")).toBe("middle_school");
    });

    it("should map high_school level", () => {
      expect(mapReadingLevel("high")).toBe("high_school");
      expect(mapReadingLevel("High School")).toBe("high_school");
      expect(mapReadingLevel("9-12")).toBe("high_school");
      expect(mapReadingLevel("Grades 9-12")).toBe("high_school");
    });

    it("should map college level", () => {
      expect(mapReadingLevel("college")).toBe("college");
      expect(mapReadingLevel("College Level")).toBe("college");
      expect(mapReadingLevel("undergraduate")).toBe("college");
      expect(mapReadingLevel("Undergraduate")).toBe("college");
    });

    it("should map advanced level", () => {
      expect(mapReadingLevel("advanced")).toBe("advanced");
      expect(mapReadingLevel("Advanced Reader")).toBe("advanced");
      expect(mapReadingLevel("graduate")).toBe("advanced");
      expect(mapReadingLevel("Graduate Level")).toBe("advanced");
    });
  });

  describe("Lexile score mapping", () => {
    it("should map Lexile scores below 400 to beginner", () => {
      expect(mapReadingLevel("200L")).toBe("beginner");
      expect(mapReadingLevel("350")).toBe("beginner");
      expect(mapReadingLevel("399L")).toBe("beginner");
    });

    it("should map Lexile scores 400-699 to elementary", () => {
      expect(mapReadingLevel("400L")).toBe("elementary");
      expect(mapReadingLevel("500")).toBe("elementary");
      expect(mapReadingLevel("699L")).toBe("elementary");
    });

    it("should map Lexile scores 700-999 to middle_school", () => {
      expect(mapReadingLevel("700L")).toBe("middle_school");
      expect(mapReadingLevel("800")).toBe("middle_school");
      expect(mapReadingLevel("999L")).toBe("middle_school");
    });

    it("should map Lexile scores 1000-1199 to high_school", () => {
      expect(mapReadingLevel("1000L")).toBe("high_school");
      expect(mapReadingLevel("1100")).toBe("high_school");
      expect(mapReadingLevel("1199L")).toBe("high_school");
    });

    it("should map Lexile scores 1200-1399 to college", () => {
      expect(mapReadingLevel("1200L")).toBe("college");
      expect(mapReadingLevel("1300")).toBe("college");
      expect(mapReadingLevel("1399L")).toBe("college");
    });

    it("should map Lexile scores 1400+ to advanced", () => {
      expect(mapReadingLevel("1400L")).toBe("advanced");
      expect(mapReadingLevel("1500")).toBe("advanced");
      expect(mapReadingLevel("1600L")).toBe("advanced");
    });
  });

  describe("fallback handling", () => {
    it("should return middle_school for unknown levels", () => {
      expect(mapReadingLevel("unknown")).toBe("middle_school");
      expect(mapReadingLevel("random text")).toBe("middle_school");
      expect(mapReadingLevel("xyz")).toBe("middle_school");
    });
  });
});

// ============================================================================
// buildGradeAnswerInput Tests
// ============================================================================

describe("buildGradeAnswerInput", () => {
  it("should build input with required fields", () => {
    const request = {
      question: "What is the main theme?",
      expectedAnswer: "Perseverance",
      userAnswer: "Never giving up",
      maxPoints: 10,
    };

    const result = buildGradeAnswerInput(request);

    expect(result).toEqual({
      question: "What is the main theme?",
      expectedAnswer: "Perseverance",
      userAnswer: "Never giving up",
      maxPoints: 10,
      rubric: undefined,
      bookTitle: undefined,
    });
  });

  it("should build input with all fields", () => {
    const request = {
      question: "What is the main theme?",
      expectedAnswer: "Perseverance",
      userAnswer: "Never giving up",
      maxPoints: 10,
      rubric: [{ criterion: "Understanding", maxPoints: 5 }],
      bookTitle: "Test Book",
    };

    const result = buildGradeAnswerInput(request);

    expect(result).toEqual({
      question: "What is the main theme?",
      expectedAnswer: "Perseverance",
      userAnswer: "Never giving up",
      maxPoints: 10,
      rubric: [{ criterion: "Understanding", maxPoints: 5 }],
      bookTitle: "Test Book",
    });
  });

  it("should handle empty rubric", () => {
    const request = {
      question: "Test?",
      expectedAnswer: "Answer",
      userAnswer: "My answer",
      maxPoints: 5,
      rubric: [],
    };

    const result = buildGradeAnswerInput(request);

    // Empty rubric is not included (length > 0 check in implementation)
    expect(result.rubric).toBeUndefined();
  });
});

// ============================================================================
// buildAnswerForDb Tests
// ============================================================================

describe("buildAnswerForDb", () => {
  const baseGradingResult: GradeAnswerOutput = {
    pointsAwarded: 8,
    maxPoints: 10,
    percentage: 80,
    feedback: "Good understanding of the theme.",
    strengths: ["Clear expression", "Good examples"],
    improvements: ["Could expand more"],
    isCorrect: false,
    isPartiallyCorrect: true,
  };

  it("should build answer with all fields", () => {
    const result = buildAnswerForDb("q1", "My answer", baseGradingResult);

    expect(result.questionId).toBe("q1");
    expect(result.userAnswer).toBe("My answer");
    expect(result.isCorrect).toBe(false);
    expect(result.isPartiallyCorrect).toBe(true);
    expect(result.pointsAwarded).toBe(8);
    expect(result.maxPoints).toBe(10);
    expect(result.percentage).toBe(80);
    expect(result.feedback).toBe("Good understanding of the theme.");
    expect(result.strengths).toEqual(["Clear expression", "Good examples"]);
    expect(result.improvements).toEqual(["Could expand more"]);
    expect(result.gradedAt).toBeDefined();
  });

  it("should include suggestedRevision when present", () => {
    const gradingResult = {
      ...baseGradingResult,
      suggestedRevision: "Consider mentioning the setting.",
    };

    const result = buildAnswerForDb("q1", "My answer", gradingResult);

    expect(result.suggestedRevision).toBe("Consider mentioning the setting.");
  });

  it("should include rubricScores when present", () => {
    const gradingResult = {
      ...baseGradingResult,
      rubricScores: [
        {
          criterion: "Understanding",
          pointsAwarded: 4,
          maxPoints: 5,
          feedback: "Good",
        },
      ],
    };

    const result = buildAnswerForDb("q1", "My answer", gradingResult);

    expect(result.rubricScores).toEqual([
      {
        criterion: "Understanding",
        pointsAwarded: 4,
        maxPoints: 5,
        feedback: "Good",
      },
    ]);
  });

  it("should handle fully correct answer", () => {
    const gradingResult = {
      ...baseGradingResult,
      pointsAwarded: 10,
      percentage: 100,
      isCorrect: true,
      isPartiallyCorrect: false,
    };

    const result = buildAnswerForDb("q1", "Perfect answer", gradingResult);

    expect(result.isCorrect).toBe(true);
    expect(result.isPartiallyCorrect).toBe(false);
    expect(result.pointsAwarded).toBe(10);
    expect(result.percentage).toBe(100);
  });

  it("should handle incorrect answer", () => {
    const gradingResult = {
      ...baseGradingResult,
      pointsAwarded: 0,
      percentage: 0,
      isCorrect: false,
      isPartiallyCorrect: false,
    };

    const result = buildAnswerForDb("q1", "Wrong answer", gradingResult);

    expect(result.isCorrect).toBe(false);
    expect(result.isPartiallyCorrect).toBe(false);
    expect(result.pointsAwarded).toBe(0);
    expect(result.percentage).toBe(0);
  });
});

// ============================================================================
// calculateAssessmentScore Tests
// ============================================================================

describe("calculateAssessmentScore", () => {
  it("should calculate score for single answer", () => {
    const answers = [{ pointsAwarded: 8, maxPoints: 10 }];
    const result = calculateAssessmentScore(answers);

    expect(result.totalPoints).toBe(8);
    expect(result.maxPoints).toBe(10);
    expect(result.percentage).toBe(80);
  });

  it("should calculate score for multiple answers", () => {
    const answers = [
      { pointsAwarded: 8, maxPoints: 10 },
      { pointsAwarded: 5, maxPoints: 5 },
      { pointsAwarded: 3, maxPoints: 5 },
    ];
    const result = calculateAssessmentScore(answers);

    expect(result.totalPoints).toBe(16);
    expect(result.maxPoints).toBe(20);
    expect(result.percentage).toBe(80);
  });

  it("should handle empty answers array", () => {
    const result = calculateAssessmentScore([]);

    expect(result.totalPoints).toBe(0);
    expect(result.maxPoints).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it("should handle perfect score", () => {
    const answers = [
      { pointsAwarded: 10, maxPoints: 10 },
      { pointsAwarded: 10, maxPoints: 10 },
    ];
    const result = calculateAssessmentScore(answers);

    expect(result.totalPoints).toBe(20);
    expect(result.maxPoints).toBe(20);
    expect(result.percentage).toBe(100);
  });

  it("should handle zero score", () => {
    const answers = [
      { pointsAwarded: 0, maxPoints: 10 },
      { pointsAwarded: 0, maxPoints: 10 },
    ];
    const result = calculateAssessmentScore(answers);

    expect(result.totalPoints).toBe(0);
    expect(result.maxPoints).toBe(20);
    expect(result.percentage).toBe(0);
  });

  it("should skip answers without required fields", () => {
    const answers = [
      { pointsAwarded: 8, maxPoints: 10 },
      { userAnswer: "test" }, // Missing points fields
      { pointsAwarded: 5, maxPoints: 5 },
    ];
    const result = calculateAssessmentScore(
      answers as Array<{ pointsAwarded?: number; maxPoints?: number }>
    );

    expect(result.totalPoints).toBe(13);
    expect(result.maxPoints).toBe(15);
  });

  it("should round percentage to nearest integer", () => {
    const answers = [{ pointsAwarded: 1, maxPoints: 3 }];
    const result = calculateAssessmentScore(answers);

    expect(result.percentage).toBe(33); // 33.33... rounded
  });

  it("should handle fractional points resulting in exact percentage", () => {
    const answers = [{ pointsAwarded: 3, maxPoints: 4 }];
    const result = calculateAssessmentScore(answers);

    expect(result.percentage).toBe(75);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Integration tests", () => {
  it("should process complete grading workflow", () => {
    // 1. Validate request
    const request = {
      assessmentId: "clxyz123abc",
      questionId: "q1",
      question: "What is the main theme of the book?",
      expectedAnswer:
        "The main theme is perseverance in the face of adversity.",
      userAnswer:
        "The book is about never giving up even when things get hard.",
      maxPoints: 10,
      bookTitle: "To Kill a Mockingbird",
    };

    const validation = gradeAnswerRequestSchema.safeParse(request);
    expect(validation.success).toBe(true);

    // 2. Build grade input
    if (validation.success) {
      const gradeInput = buildGradeAnswerInput(validation.data);
      expect(gradeInput.question).toBe(request.question);
      expect(gradeInput.maxPoints).toBe(10);
    }

    // 3. Simulate grading result
    const gradingResult: GradeAnswerOutput = {
      pointsAwarded: 8,
      maxPoints: 10,
      percentage: 80,
      feedback: "Good understanding of the theme, but could be more specific.",
      strengths: ["Captures the essence of perseverance", "Clear expression"],
      improvements: ["Use more specific examples from the text"],
      isCorrect: false,
      isPartiallyCorrect: true,
    };

    // 4. Build answer for DB
    const answerForDb = buildAnswerForDb(
      "q1",
      request.userAnswer,
      gradingResult
    );
    expect(answerForDb.questionId).toBe("q1");
    expect(answerForDb.pointsAwarded).toBe(8);

    // 5. Calculate assessment score
    const existingAnswers = [{ pointsAwarded: 5, maxPoints: 5 }];
    const allAnswers = [
      ...existingAnswers,
      { pointsAwarded: 8, maxPoints: 10 },
    ];
    const scoreResult = calculateAssessmentScore(allAnswers);

    expect(scoreResult.totalPoints).toBe(13);
    expect(scoreResult.maxPoints).toBe(15);
    expect(scoreResult.percentage).toBe(87);
  });

  it("should handle rubric-based grading workflow", () => {
    const request = {
      question: "Analyze the character development in the novel.",
      expectedAnswer: "The protagonist undergoes significant transformation...",
      userAnswer: "The main character changes throughout the story.",
      maxPoints: 20,
      rubric: [
        { criterion: "Understanding of character arc", maxPoints: 10 },
        { criterion: "Use of textual evidence", maxPoints: 5 },
        { criterion: "Critical analysis", maxPoints: 5 },
      ],
    };

    const validation = gradeAnswerRequestSchema.safeParse(request);
    expect(validation.success).toBe(true);

    if (validation.success) {
      const gradeInput = buildGradeAnswerInput(validation.data);
      expect(gradeInput.rubric).toHaveLength(3);
      expect(gradeInput.maxPoints).toBe(20);
    }
  });

  it("should handle assessment completion scenario", () => {
    const answers = [
      { pointsAwarded: 8, maxPoints: 10 },
      { pointsAwarded: 9, maxPoints: 10 },
      { pointsAwarded: 7, maxPoints: 10 },
      { pointsAwarded: 10, maxPoints: 10 },
      { pointsAwarded: 6, maxPoints: 10 },
    ];

    const scoreResult = calculateAssessmentScore(answers);

    expect(scoreResult.totalPoints).toBe(40);
    expect(scoreResult.maxPoints).toBe(50);
    expect(scoreResult.percentage).toBe(80);
  });

  it("should map reading level and build input correctly", () => {
    const request = {
      question: "What lesson does the story teach?",
      expectedAnswer: "The story teaches about friendship and loyalty.",
      userAnswer: "It shows how friends help each other.",
      maxPoints: 5,
    };

    const validation = gradeAnswerRequestSchema.safeParse(request);
    expect(validation.success).toBe(true);

    // Test various reading levels
    expect(mapReadingLevel("elementary")).toBe("elementary");
    expect(mapReadingLevel("800L")).toBe("middle_school");
    expect(mapReadingLevel("graduate")).toBe("advanced");

    if (validation.success) {
      const gradeInput = buildGradeAnswerInput(validation.data);
      expect(gradeInput.maxPoints).toBe(5);
    }
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge cases", () => {
  it("should handle very long answers", () => {
    const longAnswer = "a".repeat(10000);
    const result = gradeAnswerRequestSchema.safeParse({
      question: "What is the theme?",
      expectedAnswer: "The theme is love.",
      userAnswer: longAnswer,
      maxPoints: 10,
    });
    expect(result.success).toBe(true);
  });

  it("should handle special characters in answer", () => {
    const result = gradeAnswerRequestSchema.safeParse({
      question: "What is the theme?",
      expectedAnswer: "The theme is perseverance.",
      userAnswer:
        "The book discusses \"love\" & 'friendship' — themes that are <important>.",
      maxPoints: 10,
    });
    expect(result.success).toBe(true);
  });

  it("should handle unicode characters", () => {
    const result = gradeAnswerRequestSchema.safeParse({
      question: "What is the theme?",
      expectedAnswer: "The theme is 愛 (love).",
      userAnswer: "The theme is about 友情 (friendship) and 勇気 (courage).",
      maxPoints: 10,
    });
    expect(result.success).toBe(true);
  });

  it("should handle whitespace in answers", () => {
    const result = gradeAnswerRequestSchema.safeParse({
      question: "What is the theme?",
      expectedAnswer: "  The theme is love.  ",
      userAnswer: "\n\tMy answer with whitespace\n\n",
      maxPoints: 10,
    });
    expect(result.success).toBe(true);
  });

  it("should calculate correct percentage for fractional division", () => {
    const answers = [{ pointsAwarded: 7, maxPoints: 9 }];
    const result = calculateAssessmentScore(answers);
    expect(result.percentage).toBe(78); // 77.77... rounds to 78
  });
});
