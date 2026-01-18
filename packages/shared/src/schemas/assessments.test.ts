/**
 * Tests for Assessment Zod schemas
 *
 * This test suite validates:
 * - Enum schemas (assessmentType, bloomsLevel, questionType)
 * - ID schemas (assessmentId, questionId)
 * - Question and answer schemas
 * - Bloom's taxonomy schemas
 * - Generate and submit assessment schemas
 * - Query and statistics schemas
 * - Comprehension check schemas
 */

import { describe, expect, it } from "vitest";
import {
  // Enums
  assessmentTypeSchema,
  bloomsLevelSchema,
  questionTypeSchema,

  // IDs
  assessmentIdSchema,
  assessmentBookIdSchema,
  chapterIdsSchema,
  questionIdSchema,

  // Scores and counts
  scoreSchema,
  questionCountSchema,

  // Question schemas
  multipleChoiceOptionSchema,
  questionSchema,
  questionWithAnswerSchema,

  // Answer schemas
  answerSubmissionSchema,
  gradedAnswerSchema,

  // Bloom's schemas
  bloomsBreakdownSchema,
  bloomsDistributionSchema,

  // Create/submit schemas
  generateAssessmentSchema,
  submitAssessmentSchema,
  gradeAnswerSchema,

  // Query schemas
  assessmentSortFieldSchema,
  assessmentSortDirectionSchema,
  assessmentQuerySchema,

  // ID params
  assessmentIdParamsSchema,
  bookAssessmentIdParamsSchema,

  // Response schemas
  assessmentSummarySchema,
  assessmentResponseSchema,

  // Statistics schemas
  assessmentStatsSchema,
  assessmentStatsQuerySchema,

  // Comprehension check schemas
  comprehensionCheckSchema,
  comprehensionCheckResponseSchema,
  answerComprehensionCheckSchema,

  // Collection
  assessmentSchemas,
} from "./assessments";

// =============================================================================
// ENUM VALIDATION TESTS
// =============================================================================

describe("Assessment Enum Schemas", () => {
  describe("assessmentTypeSchema", () => {
    it("should accept valid assessment types", () => {
      expect(assessmentTypeSchema.parse("CHAPTER_CHECK")).toBe("CHAPTER_CHECK");
      expect(assessmentTypeSchema.parse("BOOK_ASSESSMENT")).toBe(
        "BOOK_ASSESSMENT"
      );
      expect(assessmentTypeSchema.parse("CUSTOM")).toBe("CUSTOM");
    });

    it("should reject invalid assessment types", () => {
      expect(() => assessmentTypeSchema.parse("QUIZ")).toThrow();
      expect(() => assessmentTypeSchema.parse("chapter_check")).toThrow();
      expect(() => assessmentTypeSchema.parse("")).toThrow();
    });
  });

  describe("bloomsLevelSchema", () => {
    it("should accept valid Bloom's taxonomy levels", () => {
      expect(bloomsLevelSchema.parse("REMEMBER")).toBe("REMEMBER");
      expect(bloomsLevelSchema.parse("UNDERSTAND")).toBe("UNDERSTAND");
      expect(bloomsLevelSchema.parse("APPLY")).toBe("APPLY");
      expect(bloomsLevelSchema.parse("ANALYZE")).toBe("ANALYZE");
      expect(bloomsLevelSchema.parse("EVALUATE")).toBe("EVALUATE");
      expect(bloomsLevelSchema.parse("CREATE")).toBe("CREATE");
    });

    it("should reject invalid Bloom's levels", () => {
      expect(() => bloomsLevelSchema.parse("remember")).toThrow();
      expect(() => bloomsLevelSchema.parse("KNOWLEDGE")).toThrow();
      expect(() => bloomsLevelSchema.parse("")).toThrow();
    });
  });

  describe("questionTypeSchema", () => {
    it("should accept valid question types", () => {
      expect(questionTypeSchema.parse("MULTIPLE_CHOICE")).toBe(
        "MULTIPLE_CHOICE"
      );
      expect(questionTypeSchema.parse("TRUE_FALSE")).toBe("TRUE_FALSE");
      expect(questionTypeSchema.parse("SHORT_ANSWER")).toBe("SHORT_ANSWER");
      expect(questionTypeSchema.parse("ESSAY")).toBe("ESSAY");
      expect(questionTypeSchema.parse("FILL_IN_BLANK")).toBe("FILL_IN_BLANK");
    });

    it("should reject invalid question types", () => {
      expect(() => questionTypeSchema.parse("multiple_choice")).toThrow();
      expect(() => questionTypeSchema.parse("MATCHING")).toThrow();
      expect(() => questionTypeSchema.parse("")).toThrow();
    });
  });
});

// =============================================================================
// ID SCHEMA TESTS
// =============================================================================

describe("Assessment ID Schemas", () => {
  describe("assessmentIdSchema", () => {
    it("should accept valid CUID format", () => {
      expect(assessmentIdSchema.parse("clh1234567890abcdef")).toBe(
        "clh1234567890abcdef"
      );
      expect(assessmentIdSchema.parse("c123")).toBe("c123");
    });

    it("should reject invalid formats", () => {
      expect(() => assessmentIdSchema.parse("")).toThrow();
      expect(() => assessmentIdSchema.parse("abc123")).toThrow();
      expect(() => assessmentIdSchema.parse("CLH1234")).toThrow();
      expect(() => assessmentIdSchema.parse("c-123")).toThrow();
    });
  });

  describe("assessmentBookIdSchema", () => {
    it("should accept valid book IDs", () => {
      expect(assessmentBookIdSchema.parse("clhbook123")).toBe("clhbook123");
    });

    it("should reject invalid book IDs", () => {
      expect(() => assessmentBookIdSchema.parse("")).toThrow();
      expect(() => assessmentBookIdSchema.parse("invalid-id")).toThrow();
    });
  });

  describe("chapterIdsSchema", () => {
    it("should accept valid chapter ID arrays", () => {
      const result = chapterIdsSchema.parse(["clhchapter1", "clhchapter2"]);
      expect(result).toEqual(["clhchapter1", "clhchapter2"]);
    });

    it("should default to empty array", () => {
      expect(chapterIdsSchema.parse(undefined)).toEqual([]);
    });

    it("should accept empty array", () => {
      expect(chapterIdsSchema.parse([])).toEqual([]);
    });

    it("should reject invalid chapter IDs in array", () => {
      expect(() => chapterIdsSchema.parse(["invalid"])).toThrow();
    });
  });

  describe("questionIdSchema", () => {
    it("should accept valid question IDs", () => {
      expect(questionIdSchema.parse("q123abc")).toBe("q123abc");
      expect(questionIdSchema.parse("clhquestion123")).toBe("clhquestion123");
    });

    it("should reject invalid question IDs", () => {
      expect(() => questionIdSchema.parse("")).toThrow();
      expect(() => questionIdSchema.parse("invalid")).toThrow();
    });
  });
});

// =============================================================================
// SCORE AND COUNT SCHEMA TESTS
// =============================================================================

describe("Score and Count Schemas", () => {
  describe("scoreSchema", () => {
    it("should accept valid scores (0-100)", () => {
      expect(scoreSchema.parse(0)).toBe(0);
      expect(scoreSchema.parse(50)).toBe(50);
      expect(scoreSchema.parse(100)).toBe(100);
      expect(scoreSchema.parse(75.5)).toBe(75.5);
    });

    it("should reject scores outside range", () => {
      expect(() => scoreSchema.parse(-1)).toThrow();
      expect(() => scoreSchema.parse(101)).toThrow();
    });
  });

  describe("questionCountSchema", () => {
    it("should accept valid question counts", () => {
      expect(questionCountSchema.parse(1)).toBe(1);
      expect(questionCountSchema.parse(10)).toBe(10);
      expect(questionCountSchema.parse(50)).toBe(50);
    });

    it("should default to 10", () => {
      expect(questionCountSchema.parse(undefined)).toBe(10);
    });

    it("should reject invalid counts", () => {
      expect(() => questionCountSchema.parse(0)).toThrow();
      expect(() => questionCountSchema.parse(-1)).toThrow();
      expect(() => questionCountSchema.parse(51)).toThrow();
      expect(() => questionCountSchema.parse(10.5)).toThrow();
    });
  });
});

// =============================================================================
// QUESTION SCHEMA TESTS
// =============================================================================

describe("Question Schemas", () => {
  describe("multipleChoiceOptionSchema", () => {
    it("should accept valid options", () => {
      const result = multipleChoiceOptionSchema.parse({
        id: "opt1",
        text: "Option text",
      });
      expect(result.id).toBe("opt1");
      expect(result.text).toBe("Option text");
    });

    it("should accept options with isCorrect", () => {
      const result = multipleChoiceOptionSchema.parse({
        id: "opt1",
        text: "Correct answer",
        isCorrect: true,
      });
      expect(result.isCorrect).toBe(true);
    });

    it("should reject empty id or text", () => {
      expect(() =>
        multipleChoiceOptionSchema.parse({ id: "", text: "Text" })
      ).toThrow();
      expect(() =>
        multipleChoiceOptionSchema.parse({ id: "id", text: "" })
      ).toThrow();
    });
  });

  describe("questionSchema", () => {
    it("should accept valid question", () => {
      const result = questionSchema.parse({
        id: "q123",
        type: "MULTIPLE_CHOICE",
        question: "What is the capital of France?",
        options: [
          { id: "a", text: "Paris" },
          { id: "b", text: "London" },
        ],
        bloomsLevel: "REMEMBER",
        points: 1,
      });
      expect(result.id).toBe("q123");
      expect(result.type).toBe("MULTIPLE_CHOICE");
    });

    it("should accept question without options (for non-MC types)", () => {
      const result = questionSchema.parse({
        id: "q456",
        type: "SHORT_ANSWER",
        question: "Explain the main theme of the book.",
        bloomsLevel: "UNDERSTAND",
      });
      expect(result.options).toBeUndefined();
    });

    it("should accept optional difficulty", () => {
      const result = questionSchema.parse({
        id: "q789",
        type: "ESSAY",
        question: "Analyze the protagonist's journey.",
        bloomsLevel: "ANALYZE",
        difficulty: 4,
      });
      expect(result.difficulty).toBe(4);
    });

    it("should reject difficulty outside range", () => {
      expect(() =>
        questionSchema.parse({
          id: "q123",
          type: "TRUE_FALSE",
          question: "Is this true?",
          bloomsLevel: "REMEMBER",
          difficulty: 6,
        })
      ).toThrow();
    });
  });

  describe("questionWithAnswerSchema", () => {
    it("should accept question with correct answer", () => {
      const result = questionWithAnswerSchema.parse({
        id: "q123",
        type: "MULTIPLE_CHOICE",
        question: "What is 2 + 2?",
        bloomsLevel: "REMEMBER",
        correctAnswer: "4",
        explanation: "Basic arithmetic: 2 + 2 = 4",
      });
      expect(result.correctAnswer).toBe("4");
      expect(result.explanation).toBe("Basic arithmetic: 2 + 2 = 4");
    });
  });
});

// =============================================================================
// ANSWER SCHEMA TESTS
// =============================================================================

describe("Answer Schemas", () => {
  describe("answerSubmissionSchema", () => {
    it("should accept valid answer submission", () => {
      const result = answerSubmissionSchema.parse({
        questionId: "q123",
        answer: "My answer",
      });
      expect(result.questionId).toBe("q123");
      expect(result.answer).toBe("My answer");
    });

    it("should accept answer with time spent", () => {
      const result = answerSubmissionSchema.parse({
        questionId: "q123",
        answer: "My answer",
        timeSpentMs: 5000,
      });
      expect(result.timeSpentMs).toBe(5000);
    });

    it("should reject empty answer", () => {
      expect(() =>
        answerSubmissionSchema.parse({
          questionId: "q123",
          answer: "",
        })
      ).toThrow();
    });
  });

  describe("gradedAnswerSchema", () => {
    it("should accept valid graded answer", () => {
      const result = gradedAnswerSchema.parse({
        questionId: "q123",
        userAnswer: "My answer",
        isCorrect: true,
        score: 100,
      });
      expect(result.isCorrect).toBe(true);
      expect(result.score).toBe(100);
    });

    it("should accept partial credit scores", () => {
      const result = gradedAnswerSchema.parse({
        questionId: "q123",
        userAnswer: "Partial answer",
        isCorrect: false,
        score: 75,
        feedback: "Good attempt but missing key points",
      });
      expect(result.score).toBe(75);
      expect(result.feedback).toBe("Good attempt but missing key points");
    });
  });
});

// =============================================================================
// BLOOM'S TAXONOMY SCHEMA TESTS
// =============================================================================

describe("Bloom's Taxonomy Schemas", () => {
  describe("bloomsBreakdownSchema", () => {
    it("should accept valid breakdown with defaults", () => {
      const result = bloomsBreakdownSchema.parse({});
      expect(result.remember).toBe(0);
      expect(result.understand).toBe(0);
      expect(result.apply).toBe(0);
      expect(result.analyze).toBe(0);
      expect(result.evaluate).toBe(0);
      expect(result.create).toBe(0);
    });

    it("should accept custom percentages", () => {
      const result = bloomsBreakdownSchema.parse({
        remember: 20,
        understand: 30,
        apply: 20,
        analyze: 15,
        evaluate: 10,
        create: 5,
      });
      expect(result.remember).toBe(20);
      expect(result.understand).toBe(30);
    });

    it("should reject percentages outside 0-100", () => {
      expect(() =>
        bloomsBreakdownSchema.parse({
          remember: -5,
        })
      ).toThrow();
      expect(() =>
        bloomsBreakdownSchema.parse({
          understand: 101,
        })
      ).toThrow();
    });
  });

  describe("bloomsDistributionSchema", () => {
    it("should accept valid distribution", () => {
      const result = bloomsDistributionSchema.parse({
        remember: 2,
        understand: 3,
        apply: 2,
        analyze: 2,
        evaluate: 1,
      });
      expect(result?.remember).toBe(2);
    });

    it("should be optional", () => {
      expect(bloomsDistributionSchema.parse(undefined)).toBeUndefined();
    });

    it("should reject counts over 20", () => {
      expect(() =>
        bloomsDistributionSchema.parse({
          remember: 21,
        })
      ).toThrow();
    });
  });
});

// =============================================================================
// GENERATE ASSESSMENT SCHEMA TESTS
// =============================================================================

describe("Generate Assessment Schema", () => {
  describe("generateAssessmentSchema", () => {
    it("should accept minimal valid request", () => {
      const result = generateAssessmentSchema.parse({
        bookId: "clhbook123",
      });
      expect(result.bookId).toBe("clhbook123");
      expect(result.type).toBe("BOOK_ASSESSMENT");
      expect(result.questionCount).toBe(10);
      expect(result.difficulty).toBe(3);
    });

    it("should accept full request", () => {
      const result = generateAssessmentSchema.parse({
        bookId: "clhbook123",
        type: "CHAPTER_CHECK",
        chapterIds: ["clhchap1", "clhchap2"],
        questionCount: 5,
        questionTypes: ["MULTIPLE_CHOICE", "TRUE_FALSE"],
        bloomsDistribution: {
          remember: 2,
          understand: 3,
        },
        difficulty: 4,
        focusAreas: ["Characters", "Plot"],
      });
      expect(result.type).toBe("CHAPTER_CHECK");
      expect(result.questionCount).toBe(5);
      expect(result.chapterIds).toHaveLength(2);
      expect(result.focusAreas).toEqual(["Characters", "Plot"]);
    });

    it("should apply default question types", () => {
      const result = generateAssessmentSchema.parse({
        bookId: "clhbook123",
      });
      expect(result.questionTypes).toEqual(["MULTIPLE_CHOICE", "SHORT_ANSWER"]);
    });

    it("should reject too many focus areas", () => {
      const focusAreas = Array.from({ length: 11 }, (_, i) => `Area ${i}`);
      expect(() =>
        generateAssessmentSchema.parse({
          bookId: "clhbook123",
          focusAreas,
        })
      ).toThrow();
    });
  });
});

// =============================================================================
// SUBMIT ASSESSMENT SCHEMA TESTS
// =============================================================================

describe("Submit Assessment Schema", () => {
  describe("submitAssessmentSchema", () => {
    it("should accept valid submission", () => {
      const result = submitAssessmentSchema.parse({
        assessmentId: "classessment123",
        answers: [
          { questionId: "q1", answer: "Answer 1" },
          { questionId: "q2", answer: "Answer 2" },
        ],
      });
      expect(result.assessmentId).toBe("classessment123");
      expect(result.answers).toHaveLength(2);
    });

    it("should accept optional time spent", () => {
      const result = submitAssessmentSchema.parse({
        assessmentId: "classessment123",
        answers: [{ questionId: "q1", answer: "Answer" }],
        timeSpent: 300,
      });
      expect(result.timeSpent).toBe(300);
    });

    it("should reject empty answers array", () => {
      expect(() =>
        submitAssessmentSchema.parse({
          assessmentId: "classessment123",
          answers: [],
        })
      ).toThrow(/at least one/i);
    });

    it("should reject too many answers", () => {
      const answers = Array.from({ length: 101 }, (_, i) => ({
        questionId: `q${i}`,
        answer: "Answer",
      }));
      expect(() =>
        submitAssessmentSchema.parse({
          assessmentId: "classessment123",
          answers,
        })
      ).toThrow(/100/);
    });
  });

  describe("gradeAnswerSchema", () => {
    it("should accept valid grading request", () => {
      const result = gradeAnswerSchema.parse({
        assessmentId: "classessment123",
        questionId: "q123",
        question: "What is the theme?",
        correctAnswer: "The theme is redemption",
        userAnswer: "Redemption is the main theme",
        questionType: "SHORT_ANSWER",
        bloomsLevel: "UNDERSTAND",
      });
      expect(result.questionType).toBe("SHORT_ANSWER");
    });
  });
});

// =============================================================================
// QUERY SCHEMA TESTS
// =============================================================================

describe("Assessment Query Schemas", () => {
  describe("assessmentQuerySchema", () => {
    it("should apply defaults", () => {
      const result = assessmentQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe("createdAt");
      expect(result.sortDirection).toBe("desc");
    });

    it("should coerce string numbers", () => {
      const result = assessmentQuerySchema.parse({
        page: "3",
        limit: "50",
      });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
    });

    it("should accept all filter options", () => {
      const result = assessmentQuerySchema.parse({
        bookId: "clhbook123",
        type: "CHAPTER_CHECK",
        completed: true,
        minScore: 70,
        maxScore: 100,
      });
      expect(result.bookId).toBe("clhbook123");
      expect(result.type).toBe("CHAPTER_CHECK");
      expect(result.completed).toBe(true);
    });

    it("should accept date filters", () => {
      const result = assessmentQuerySchema.parse({
        fromDate: "2024-01-01",
        toDate: "2024-12-31",
      });
      expect(result.fromDate).toBeInstanceOf(Date);
      expect(result.toDate).toBeInstanceOf(Date);
    });

    it("should reject limit over 100", () => {
      expect(() =>
        assessmentQuerySchema.parse({
          limit: 101,
        })
      ).toThrow();
    });
  });

  describe("assessmentSortFieldSchema", () => {
    it("should accept valid sort fields", () => {
      expect(assessmentSortFieldSchema.parse("createdAt")).toBe("createdAt");
      expect(assessmentSortFieldSchema.parse("completedAt")).toBe(
        "completedAt"
      );
      expect(assessmentSortFieldSchema.parse("score")).toBe("score");
      expect(assessmentSortFieldSchema.parse("type")).toBe("type");
    });

    it("should reject invalid sort fields", () => {
      expect(() => assessmentSortFieldSchema.parse("invalid")).toThrow();
    });
  });

  describe("assessmentSortDirectionSchema", () => {
    it("should accept valid directions", () => {
      expect(assessmentSortDirectionSchema.parse("asc")).toBe("asc");
      expect(assessmentSortDirectionSchema.parse("desc")).toBe("desc");
    });
  });
});

// =============================================================================
// ID PARAMS SCHEMA TESTS
// =============================================================================

describe("Assessment ID Params Schemas", () => {
  describe("assessmentIdParamsSchema", () => {
    it("should accept valid assessment ID", () => {
      const result = assessmentIdParamsSchema.parse({
        id: "classessment123",
      });
      expect(result.id).toBe("classessment123");
    });

    it("should reject invalid ID", () => {
      expect(() => assessmentIdParamsSchema.parse({ id: "invalid" })).toThrow();
    });
  });

  describe("bookAssessmentIdParamsSchema", () => {
    it("should accept valid nested params", () => {
      const result = bookAssessmentIdParamsSchema.parse({
        bookId: "clhbook123",
        assessmentId: "classessment456",
      });
      expect(result.bookId).toBe("clhbook123");
      expect(result.assessmentId).toBe("classessment456");
    });
  });
});

// =============================================================================
// RESPONSE SCHEMA TESTS
// =============================================================================

describe("Assessment Response Schemas", () => {
  describe("assessmentSummarySchema", () => {
    it("should accept valid summary", () => {
      const result = assessmentSummarySchema.parse({
        id: "classessment123",
        bookId: "clhbook123",
        type: "BOOK_ASSESSMENT",
        score: 85,
        totalQuestions: 10,
        correctAnswers: 8,
        startedAt: "2024-01-15T10:00:00Z",
        completedAt: "2024-01-15T10:30:00Z",
        timeSpent: 1800,
      });
      expect(result.score).toBe(85);
      expect(result.correctAnswers).toBe(8);
    });

    it("should accept null values for incomplete assessments", () => {
      const result = assessmentSummarySchema.parse({
        id: "classessment123",
        bookId: "clhbook123",
        type: "CHAPTER_CHECK",
        score: null,
        totalQuestions: 5,
        correctAnswers: 0,
        startedAt: "2024-01-15T10:00:00Z",
        completedAt: null,
        timeSpent: null,
      });
      expect(result.score).toBeNull();
      expect(result.completedAt).toBeNull();
    });
  });

  describe("assessmentResponseSchema", () => {
    it("should accept full response with questions", () => {
      const result = assessmentResponseSchema.parse({
        id: "classessment123",
        bookId: "clhbook123",
        type: "BOOK_ASSESSMENT",
        score: 90,
        totalQuestions: 2,
        correctAnswers: 2,
        startedAt: "2024-01-15T10:00:00Z",
        completedAt: "2024-01-15T10:30:00Z",
        timeSpent: 1800,
        questions: [
          {
            id: "q1",
            type: "MULTIPLE_CHOICE",
            question: "Question 1?",
            bloomsLevel: "REMEMBER",
            points: 1,
          },
          {
            id: "q2",
            type: "SHORT_ANSWER",
            question: "Question 2?",
            bloomsLevel: "UNDERSTAND",
            points: 1,
          },
        ],
      });
      expect(result.questions).toHaveLength(2);
    });
  });
});

// =============================================================================
// STATISTICS SCHEMA TESTS
// =============================================================================

describe("Assessment Statistics Schemas", () => {
  describe("assessmentStatsSchema", () => {
    it("should accept valid stats", () => {
      const result = assessmentStatsSchema.parse({
        totalAssessments: 50,
        completedAssessments: 45,
        averageScore: 82.5,
        bestScore: 100,
        worstScore: 55,
        totalTimeSpent: 36000,
      });
      expect(result.averageScore).toBe(82.5);
    });

    it("should accept nullable score fields", () => {
      const result = assessmentStatsSchema.parse({
        totalAssessments: 0,
        completedAssessments: 0,
        averageScore: null,
        bestScore: null,
        worstScore: null,
        totalTimeSpent: 0,
      });
      expect(result.averageScore).toBeNull();
    });

    it("should accept optional breakdowns", () => {
      const result = assessmentStatsSchema.parse({
        totalAssessments: 10,
        completedAssessments: 10,
        averageScore: 75,
        bestScore: 95,
        worstScore: 60,
        totalTimeSpent: 7200,
        bloomsPerformance: {
          remember: 90,
          understand: 80,
          apply: 70,
          analyze: 65,
          evaluate: 60,
          create: 55,
        },
        byType: {
          chapterCheck: 5,
          bookAssessment: 3,
          custom: 2,
        },
      });
      expect(result.bloomsPerformance?.remember).toBe(90);
      expect(result.byType?.chapterCheck).toBe(5);
    });
  });

  describe("assessmentStatsQuerySchema", () => {
    it("should accept empty query for all stats", () => {
      const result = assessmentStatsQuerySchema.parse({});
      expect(result).toEqual({});
    });

    it("should accept filter options", () => {
      const result = assessmentStatsQuerySchema.parse({
        bookId: "clhbook123",
        type: "BOOK_ASSESSMENT",
        fromDate: "2024-01-01",
      });
      expect(result.bookId).toBe("clhbook123");
    });
  });
});

// =============================================================================
// COMPREHENSION CHECK SCHEMA TESTS
// =============================================================================

describe("Comprehension Check Schemas", () => {
  describe("comprehensionCheckSchema", () => {
    it("should accept valid comprehension check request", () => {
      const result = comprehensionCheckSchema.parse({
        bookId: "clhbook123",
        recentText:
          "This is the recent text that was being read. It should be at least 50 characters long to be valid.",
      });
      expect(result.bookId).toBe("clhbook123");
    });

    it("should accept optional chapter ID and position", () => {
      const result = comprehensionCheckSchema.parse({
        bookId: "clhbook123",
        chapterId: "clhchapter456",
        recentText:
          "This is enough text content to pass the minimum length requirement for validation.",
        position: 5000,
      });
      expect(result.chapterId).toBe("clhchapter456");
      expect(result.position).toBe(5000);
    });

    it("should reject text under 50 characters", () => {
      expect(() =>
        comprehensionCheckSchema.parse({
          bookId: "clhbook123",
          recentText: "Too short",
        })
      ).toThrow();
    });

    it("should reject text over 10000 characters", () => {
      const longText = "a".repeat(10001);
      expect(() =>
        comprehensionCheckSchema.parse({
          bookId: "clhbook123",
          recentText: longText,
        })
      ).toThrow();
    });
  });

  describe("comprehensionCheckResponseSchema", () => {
    it("should accept valid response", () => {
      const result = comprehensionCheckResponseSchema.parse({
        question: {
          id: "q123",
          type: "MULTIPLE_CHOICE",
          question: "What happened in the passage?",
          bloomsLevel: "REMEMBER",
          points: 1,
        },
      });
      expect(result.question.type).toBe("MULTIPLE_CHOICE");
    });

    it("should accept optional hints", () => {
      const result = comprehensionCheckResponseSchema.parse({
        question: {
          id: "q123",
          type: "SHORT_ANSWER",
          question: "Explain the meaning.",
          bloomsLevel: "UNDERSTAND",
          points: 1,
        },
        hints: ["Think about the context", "Consider the character's motive"],
      });
      expect(result.hints).toHaveLength(2);
    });
  });

  describe("answerComprehensionCheckSchema", () => {
    it("should accept valid answer", () => {
      const result = answerComprehensionCheckSchema.parse({
        questionId: "q123",
        answer: "My answer to the question",
      });
      expect(result.answer).toBe("My answer to the question");
    });

    it("should accept optional response time", () => {
      const result = answerComprehensionCheckSchema.parse({
        questionId: "q123",
        answer: "Quick answer",
        responseTimeMs: 15000,
      });
      expect(result.responseTimeMs).toBe(15000);
    });
  });
});

// =============================================================================
// SCHEMA COLLECTION EXPORT TESTS
// =============================================================================

describe("assessmentSchemas collection", () => {
  it("should export all enum schemas", () => {
    expect(assessmentSchemas.assessmentType).toBeDefined();
    expect(assessmentSchemas.bloomsLevel).toBeDefined();
    expect(assessmentSchemas.questionType).toBeDefined();
  });

  it("should export all ID schemas", () => {
    expect(assessmentSchemas.assessmentId).toBeDefined();
    expect(assessmentSchemas.bookId).toBeDefined();
    expect(assessmentSchemas.chapterIds).toBeDefined();
    expect(assessmentSchemas.questionId).toBeDefined();
  });

  it("should export all question schemas", () => {
    expect(assessmentSchemas.question).toBeDefined();
    expect(assessmentSchemas.questionWithAnswer).toBeDefined();
    expect(assessmentSchemas.multipleChoiceOption).toBeDefined();
  });

  it("should export all answer schemas", () => {
    expect(assessmentSchemas.answerSubmission).toBeDefined();
    expect(assessmentSchemas.gradedAnswer).toBeDefined();
  });

  it("should export all Bloom's schemas", () => {
    expect(assessmentSchemas.bloomsBreakdown).toBeDefined();
    expect(assessmentSchemas.bloomsDistribution).toBeDefined();
  });

  it("should export all create/submit schemas", () => {
    expect(assessmentSchemas.generate).toBeDefined();
    expect(assessmentSchemas.submit).toBeDefined();
    expect(assessmentSchemas.gradeAnswer).toBeDefined();
  });

  it("should export all query schemas", () => {
    expect(assessmentSchemas.query).toBeDefined();
    expect(assessmentSchemas.sortField).toBeDefined();
    expect(assessmentSchemas.sortDirection).toBeDefined();
  });

  it("should export all ID params schemas", () => {
    expect(assessmentSchemas.idParams).toBeDefined();
    expect(assessmentSchemas.bookAssessmentIdParams).toBeDefined();
  });

  it("should export all response schemas", () => {
    expect(assessmentSchemas.summary).toBeDefined();
    expect(assessmentSchemas.response).toBeDefined();
  });

  it("should export all statistics schemas", () => {
    expect(assessmentSchemas.stats).toBeDefined();
    expect(assessmentSchemas.statsQuery).toBeDefined();
  });

  it("should export all comprehension check schemas", () => {
    expect(assessmentSchemas.comprehensionCheck).toBeDefined();
    expect(assessmentSchemas.comprehensionCheckResponse).toBeDefined();
    expect(assessmentSchemas.answerComprehensionCheck).toBeDefined();
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe("Edge Cases", () => {
  describe("Unicode and special characters", () => {
    it("should accept unicode in question text", () => {
      const result = questionSchema.parse({
        id: "q123",
        type: "SHORT_ANSWER",
        question: "什么是这本书的主题？",
        bloomsLevel: "UNDERSTAND",
        points: 1,
      });
      expect(result.question).toBe("什么是这本书的主题？");
    });

    it("should accept unicode in answers", () => {
      const result = answerSubmissionSchema.parse({
        questionId: "q123",
        answer: "この本のテーマは愛です。",
      });
      expect(result.answer).toContain("テーマ");
    });

    it("should accept RTL content", () => {
      const result = questionSchema.parse({
        id: "q123",
        type: "ESSAY",
        question: "ما هو موضوع هذا الكتاب؟",
        bloomsLevel: "ANALYZE",
        points: 1,
      });
      expect(result.question).toContain("موضوع");
    });
  });

  describe("Boundary conditions", () => {
    it("should accept score of exactly 0", () => {
      expect(scoreSchema.parse(0)).toBe(0);
    });

    it("should accept score of exactly 100", () => {
      expect(scoreSchema.parse(100)).toBe(100);
    });

    it("should accept question count of exactly 50", () => {
      expect(questionCountSchema.parse(50)).toBe(50);
    });

    it("should accept exactly 100 answers", () => {
      const answers = Array.from({ length: 100 }, (_, i) => ({
        questionId: `q${i}`,
        answer: "Answer",
      }));
      const result = submitAssessmentSchema.parse({
        assessmentId: "classessment123",
        answers,
      });
      expect(result.answers).toHaveLength(100);
    });

    it("should accept text of exactly 50 characters", () => {
      const exactText = "a".repeat(50);
      const result = comprehensionCheckSchema.parse({
        bookId: "clhbook123",
        recentText: exactText,
      });
      expect(result.recentText.length).toBe(50);
    });
  });
});
