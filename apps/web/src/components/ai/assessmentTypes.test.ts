/**
 * @vitest-environment jsdom
 */

/**
 * Assessment Types and Utilities Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  // Types
  type AssessmentQuestion,
  type UserAnswer,
  type GradedAnswer,
  // Constants
  ASSESSMENT_TYPE_OPTIONS,
  BLOOM_LEVELS_ORDER,
  QUESTION_TYPE_DISPLAY,
  DEFAULT_QUESTION_COUNTS,
  TIME_PER_QUESTION,
  MIN_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
  BLOOM_LEVEL_COLORS,
  BLOOM_LEVEL_DISPLAY,
  DIFFICULTY_LABELS,
  // Validation functions
  isValidAssessmentType,
  isValidBloomLevel,
  isValidQuestionType,
  isValidQuestionCount,
  isValidAnswer,
  // Timer functions
  formatTime,
  formatTimeReadable,
  parseTime,
  calculateEstimatedTime,
  getTimeWarningStatus,
  // Scoring functions
  calculatePercentage,
  getGradeLetter,
  getGradeColor,
  calculateBloomsBreakdown,
  // Question navigation functions
  createInitialAnswers,
  areAllQuestionsAnswered,
  getAnsweredCount,
  getUnansweredIndices,
  // Display helper functions
  getAssessmentTypeDisplay,
  getAssessmentTypeDescription,
  getDifficultyDisplay,
  getBloomLevelDescription,
  getQuestionTypeIcon,
  // Storage functions
  saveAssessmentProgress,
  loadAssessmentProgress,
  clearAssessmentProgress,
  // API response helpers
  parseAssessmentError,
  getAssessmentErrorMessage,
} from "./assessmentTypes";

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Constants", () => {
  it("ASSESSMENT_TYPE_OPTIONS should contain all assessment types", () => {
    expect(ASSESSMENT_TYPE_OPTIONS).toEqual([
      "quick",
      "standard",
      "comprehensive",
    ]);
  });

  it("BLOOM_LEVELS_ORDER should be in correct order", () => {
    expect(BLOOM_LEVELS_ORDER).toEqual([
      "remember",
      "understand",
      "apply",
      "analyze",
      "evaluate",
      "create",
    ]);
  });

  it("QUESTION_TYPE_DISPLAY should have all question types", () => {
    expect(Object.keys(QUESTION_TYPE_DISPLAY)).toHaveLength(5);
    expect(QUESTION_TYPE_DISPLAY.multiple_choice).toBe("Multiple Choice");
    expect(QUESTION_TYPE_DISPLAY.essay).toBe("Essay");
  });

  it("DEFAULT_QUESTION_COUNTS should have correct values", () => {
    expect(DEFAULT_QUESTION_COUNTS.quick).toBe(5);
    expect(DEFAULT_QUESTION_COUNTS.standard).toBe(10);
    expect(DEFAULT_QUESTION_COUNTS.comprehensive).toBe(20);
  });

  it("TIME_PER_QUESTION should have reasonable times", () => {
    expect(TIME_PER_QUESTION.multiple_choice).toBe(1);
    expect(TIME_PER_QUESTION.true_false).toBe(0.5);
    expect(TIME_PER_QUESTION.essay).toBe(5);
  });

  it("MIN_QUESTION_COUNT and MAX_QUESTION_COUNT should be reasonable", () => {
    expect(MIN_QUESTION_COUNT).toBe(3);
    expect(MAX_QUESTION_COUNT).toBe(30);
  });

  it("BLOOM_LEVEL_COLORS should have colors for all levels", () => {
    BLOOM_LEVELS_ORDER.forEach((level) => {
      expect(BLOOM_LEVEL_COLORS[level]).toBeDefined();
      expect(BLOOM_LEVEL_COLORS[level]).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it("BLOOM_LEVEL_DISPLAY should have display names", () => {
    expect(BLOOM_LEVEL_DISPLAY.remember).toBe("Remember");
    expect(BLOOM_LEVEL_DISPLAY.create).toBe("Create");
  });

  it("DIFFICULTY_LABELS should have labels for 1-5", () => {
    expect(DIFFICULTY_LABELS[1]).toBe("Very Easy");
    expect(DIFFICULTY_LABELS[5]).toBe("Very Hard");
  });
});

// =============================================================================
// VALIDATION FUNCTIONS TESTS
// =============================================================================

describe("isValidAssessmentType", () => {
  it("should return true for valid assessment types", () => {
    expect(isValidAssessmentType("quick")).toBe(true);
    expect(isValidAssessmentType("standard")).toBe(true);
    expect(isValidAssessmentType("comprehensive")).toBe(true);
  });

  it("should return false for invalid assessment types", () => {
    expect(isValidAssessmentType("invalid")).toBe(false);
    expect(isValidAssessmentType("")).toBe(false);
    expect(isValidAssessmentType("QUICK")).toBe(false);
  });
});

describe("isValidBloomLevel", () => {
  it("should return true for valid Bloom levels", () => {
    expect(isValidBloomLevel("remember")).toBe(true);
    expect(isValidBloomLevel("create")).toBe(true);
  });

  it("should return false for invalid Bloom levels", () => {
    expect(isValidBloomLevel("invalid")).toBe(false);
    expect(isValidBloomLevel("REMEMBER")).toBe(false);
  });
});

describe("isValidQuestionType", () => {
  it("should return true for valid question types", () => {
    expect(isValidQuestionType("multiple_choice")).toBe(true);
    expect(isValidQuestionType("essay")).toBe(true);
  });

  it("should return false for invalid question types", () => {
    expect(isValidQuestionType("invalid")).toBe(false);
    expect(isValidQuestionType("MULTIPLE_CHOICE")).toBe(false);
  });
});

describe("isValidQuestionCount", () => {
  it("should return true for valid question counts", () => {
    expect(isValidQuestionCount(3)).toBe(true);
    expect(isValidQuestionCount(10)).toBe(true);
    expect(isValidQuestionCount(30)).toBe(true);
  });

  it("should return false for invalid question counts", () => {
    expect(isValidQuestionCount(2)).toBe(false);
    expect(isValidQuestionCount(31)).toBe(false);
    expect(isValidQuestionCount(0)).toBe(false);
    expect(isValidQuestionCount(-1)).toBe(false);
    expect(isValidQuestionCount(5.5)).toBe(false);
  });
});

describe("isValidAnswer", () => {
  it("should return true for valid answers", () => {
    expect(isValidAnswer("A")).toBe(true);
    expect(isValidAnswer("This is my answer")).toBe(true);
    expect(isValidAnswer("  answer  ")).toBe(true);
  });

  it("should return false for invalid answers", () => {
    expect(isValidAnswer("")).toBe(false);
    expect(isValidAnswer("   ")).toBe(false);
    expect(isValidAnswer(undefined)).toBe(false);
  });
});

// =============================================================================
// TIMER FUNCTIONS TESTS
// =============================================================================

describe("formatTime", () => {
  it("should format seconds to MM:SS", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(59)).toBe("00:59");
    expect(formatTime(60)).toBe("01:00");
    expect(formatTime(90)).toBe("01:30");
    expect(formatTime(3661)).toBe("61:01");
  });

  it("should handle negative values", () => {
    expect(formatTime(-10)).toBe("00:00");
  });
});

describe("formatTimeReadable", () => {
  it("should format seconds to readable format", () => {
    expect(formatTimeReadable(0)).toBe("0 seconds");
    expect(formatTimeReadable(1)).toBe("1 second");
    expect(formatTimeReadable(30)).toBe("30 seconds");
    expect(formatTimeReadable(60)).toBe("1 minute");
    expect(formatTimeReadable(120)).toBe("2 minutes");
    expect(formatTimeReadable(90)).toBe("1 minute 30 seconds");
    expect(formatTimeReadable(125)).toBe("2 minutes 5 seconds");
    expect(formatTimeReadable(121)).toBe("2 minutes 1 second");
  });

  it("should handle negative values", () => {
    expect(formatTimeReadable(-10)).toBe("0 seconds");
  });
});

describe("parseTime", () => {
  it("should parse MM:SS format", () => {
    expect(parseTime("00:00")).toBe(0);
    expect(parseTime("01:30")).toBe(90);
    expect(parseTime("10:00")).toBe(600);
  });

  it("should handle invalid formats", () => {
    expect(parseTime("")).toBe(0);
    expect(parseTime("invalid")).toBe(0);
    expect(parseTime("1:2:3")).toBe(0);
    expect(parseTime("abc:def")).toBe(0);
  });
});

describe("calculateEstimatedTime", () => {
  it("should calculate total estimated time", () => {
    const questions: AssessmentQuestion[] = [
      {
        id: "1",
        question: "Q1",
        type: "multiple_choice",
        bloomLevel: "remember",
        difficulty: 1,
        points: 1,
      },
      {
        id: "2",
        question: "Q2",
        type: "essay",
        bloomLevel: "create",
        difficulty: 5,
        points: 5,
      },
    ];
    expect(calculateEstimatedTime(questions)).toBe(6); // 1 + 5
  });

  it("should return 0 for empty questions", () => {
    expect(calculateEstimatedTime([])).toBe(0);
  });
});

describe("getTimeWarningStatus", () => {
  it("should return normal when under estimated time", () => {
    expect(getTimeWarningStatus(300, 10)).toBe("normal"); // 5 mins of 10
  });

  it("should return warning when at estimated time", () => {
    expect(getTimeWarningStatus(600, 10)).toBe("warning"); // 10 mins of 10
  });

  it("should return critical when significantly over", () => {
    expect(getTimeWarningStatus(900, 10)).toBe("critical"); // 15 mins of 10
  });
});

// =============================================================================
// SCORING FUNCTIONS TESTS
// =============================================================================

describe("calculatePercentage", () => {
  it("should calculate percentage correctly", () => {
    expect(calculatePercentage(8, 10)).toBe(80);
    expect(calculatePercentage(0, 10)).toBe(0);
    expect(calculatePercentage(10, 10)).toBe(100);
    expect(calculatePercentage(1, 3)).toBe(33);
  });

  it("should handle division by zero", () => {
    expect(calculatePercentage(5, 0)).toBe(0);
  });
});

describe("getGradeLetter", () => {
  it("should return correct grade letters", () => {
    expect(getGradeLetter(95)).toBe("A");
    expect(getGradeLetter(90)).toBe("A");
    expect(getGradeLetter(85)).toBe("B");
    expect(getGradeLetter(75)).toBe("C");
    expect(getGradeLetter(65)).toBe("D");
    expect(getGradeLetter(55)).toBe("F");
    expect(getGradeLetter(0)).toBe("F");
  });
});

describe("getGradeColor", () => {
  it("should return correct colors", () => {
    expect(getGradeColor(95)).toBe("#4caf50"); // green
    expect(getGradeColor(85)).toBe("#8bc34a"); // light green
    expect(getGradeColor(75)).toBe("#ff9800"); // orange
    expect(getGradeColor(65)).toBe("#ff5722"); // deep orange
    expect(getGradeColor(55)).toBe("#f44336"); // red
  });
});

describe("calculateBloomsBreakdown", () => {
  it("should calculate breakdown correctly", () => {
    const questions: AssessmentQuestion[] = [
      {
        id: "1",
        question: "Q1",
        type: "multiple_choice",
        bloomLevel: "remember",
        difficulty: 1,
        points: 1,
      },
      {
        id: "2",
        question: "Q2",
        type: "multiple_choice",
        bloomLevel: "remember",
        difficulty: 1,
        points: 1,
      },
      {
        id: "3",
        question: "Q3",
        type: "multiple_choice",
        bloomLevel: "apply",
        difficulty: 3,
        points: 1,
      },
    ];
    const gradedAnswers: GradedAnswer[] = [
      { questionId: "1", userAnswer: "A", isCorrect: true, score: 100 },
      { questionId: "2", userAnswer: "B", isCorrect: false, score: 0 },
      { questionId: "3", userAnswer: "C", isCorrect: true, score: 100 },
    ];
    const breakdown = calculateBloomsBreakdown(questions, gradedAnswers);
    expect(breakdown.remember).toBe(50); // 1 of 2
    expect(breakdown.apply).toBe(100); // 1 of 1
    expect(breakdown.understand).toBe(0); // 0 of 0
  });
});

// =============================================================================
// QUESTION NAVIGATION FUNCTIONS TESTS
// =============================================================================

describe("createInitialAnswers", () => {
  it("should create map with empty answers", () => {
    const questions: AssessmentQuestion[] = [
      {
        id: "1",
        question: "Q1",
        type: "multiple_choice",
        bloomLevel: "remember",
        difficulty: 1,
        points: 1,
      },
      {
        id: "2",
        question: "Q2",
        type: "essay",
        bloomLevel: "create",
        difficulty: 5,
        points: 5,
      },
    ];
    const answers = createInitialAnswers(questions);
    expect(answers.size).toBe(2);
    expect(answers.get("1")?.answer).toBe("");
    expect(answers.get("2")?.answer).toBe("");
  });
});

describe("areAllQuestionsAnswered", () => {
  const questions: AssessmentQuestion[] = [
    {
      id: "1",
      question: "Q1",
      type: "multiple_choice",
      bloomLevel: "remember",
      difficulty: 1,
      points: 1,
    },
    {
      id: "2",
      question: "Q2",
      type: "essay",
      bloomLevel: "create",
      difficulty: 5,
      points: 5,
    },
  ];

  it("should return true when all answered", () => {
    const answers = new Map<string, UserAnswer>([
      ["1", { questionId: "1", answer: "A", timeSpentMs: 1000 }],
      ["2", { questionId: "2", answer: "Essay answer", timeSpentMs: 5000 }],
    ]);
    expect(areAllQuestionsAnswered(questions, answers)).toBe(true);
  });

  it("should return false when some unanswered", () => {
    const answers = new Map<string, UserAnswer>([
      ["1", { questionId: "1", answer: "A", timeSpentMs: 1000 }],
      ["2", { questionId: "2", answer: "", timeSpentMs: 0 }],
    ]);
    expect(areAllQuestionsAnswered(questions, answers)).toBe(false);
  });
});

describe("getAnsweredCount", () => {
  const questions: AssessmentQuestion[] = [
    {
      id: "1",
      question: "Q1",
      type: "multiple_choice",
      bloomLevel: "remember",
      difficulty: 1,
      points: 1,
    },
    {
      id: "2",
      question: "Q2",
      type: "multiple_choice",
      bloomLevel: "understand",
      difficulty: 2,
      points: 1,
    },
    {
      id: "3",
      question: "Q3",
      type: "multiple_choice",
      bloomLevel: "apply",
      difficulty: 3,
      points: 1,
    },
  ];

  it("should count answered questions", () => {
    const answers = new Map<string, UserAnswer>([
      ["1", { questionId: "1", answer: "A", timeSpentMs: 1000 }],
      ["2", { questionId: "2", answer: "", timeSpentMs: 0 }],
      ["3", { questionId: "3", answer: "C", timeSpentMs: 2000 }],
    ]);
    expect(getAnsweredCount(questions, answers)).toBe(2);
  });
});

describe("getUnansweredIndices", () => {
  const questions: AssessmentQuestion[] = [
    {
      id: "1",
      question: "Q1",
      type: "multiple_choice",
      bloomLevel: "remember",
      difficulty: 1,
      points: 1,
    },
    {
      id: "2",
      question: "Q2",
      type: "multiple_choice",
      bloomLevel: "understand",
      difficulty: 2,
      points: 1,
    },
    {
      id: "3",
      question: "Q3",
      type: "multiple_choice",
      bloomLevel: "apply",
      difficulty: 3,
      points: 1,
    },
  ];

  it("should return indices of unanswered questions", () => {
    const answers = new Map<string, UserAnswer>([
      ["1", { questionId: "1", answer: "A", timeSpentMs: 1000 }],
      ["2", { questionId: "2", answer: "", timeSpentMs: 0 }],
      ["3", { questionId: "3", answer: "", timeSpentMs: 0 }],
    ]);
    expect(getUnansweredIndices(questions, answers)).toEqual([1, 2]);
  });
});

// =============================================================================
// DISPLAY HELPER FUNCTIONS TESTS
// =============================================================================

describe("getAssessmentTypeDisplay", () => {
  it("should return correct display names", () => {
    expect(getAssessmentTypeDisplay("quick")).toBe("Quick Check");
    expect(getAssessmentTypeDisplay("standard")).toBe("Standard");
    expect(getAssessmentTypeDisplay("comprehensive")).toBe("Comprehensive");
  });
});

describe("getAssessmentTypeDescription", () => {
  it("should return correct descriptions", () => {
    expect(getAssessmentTypeDescription("quick")).toContain("5 questions");
    expect(getAssessmentTypeDescription("standard")).toContain("10 questions");
    expect(getAssessmentTypeDescription("comprehensive")).toContain(
      "20 questions"
    );
  });
});

describe("getDifficultyDisplay", () => {
  it("should return correct difficulty labels", () => {
    expect(getDifficultyDisplay(1)).toBe("Very Easy");
    expect(getDifficultyDisplay(3)).toBe("Medium");
    expect(getDifficultyDisplay(5)).toBe("Very Hard");
    expect(getDifficultyDisplay(99)).toBe("Unknown");
  });
});

describe("getBloomLevelDescription", () => {
  it("should return descriptions for Bloom levels", () => {
    expect(getBloomLevelDescription("remember")).toContain("Recall");
    expect(getBloomLevelDescription("create")).toContain("Produce");
  });
});

describe("getQuestionTypeIcon", () => {
  it("should return icon names for question types", () => {
    expect(getQuestionTypeIcon("multiple_choice")).toBe("RadioButtonChecked");
    expect(getQuestionTypeIcon("essay")).toBe("Notes");
  });
});

// =============================================================================
// STORAGE FUNCTIONS TESTS
// =============================================================================

describe("saveAssessmentProgress", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should save progress to localStorage", () => {
    const answers = new Map<string, UserAnswer>([
      ["1", { questionId: "1", answer: "A", timeSpentMs: 1000 }],
    ]);
    saveAssessmentProgress("test-id", 2, answers, 120);

    const saved = localStorage.getItem("assessment_test-id");
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved ?? "{}");
    expect(parsed.assessmentId).toBe("test-id");
    expect(parsed.currentQuestionIndex).toBe(2);
    expect(parsed.elapsedSeconds).toBe(120);
  });
});

describe("loadAssessmentProgress", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should load progress from localStorage", () => {
    const data = {
      assessmentId: "test-id",
      currentQuestionIndex: 3,
      answers: [["1", { questionId: "1", answer: "A", timeSpentMs: 1000 }]],
      elapsedSeconds: 180,
      savedAt: Date.now(),
    };
    localStorage.setItem("assessment_test-id", JSON.stringify(data));

    const progress = loadAssessmentProgress("test-id");
    expect(progress).not.toBeNull();
    expect(progress?.currentQuestionIndex).toBe(3);
    expect(progress?.elapsedSeconds).toBe(180);
    expect(progress?.answers.get("1")?.answer).toBe("A");
  });

  it("should return null for non-existent progress", () => {
    expect(loadAssessmentProgress("non-existent")).toBeNull();
  });

  it("should return null for expired progress", () => {
    const data = {
      assessmentId: "test-id",
      currentQuestionIndex: 3,
      answers: [],
      elapsedSeconds: 180,
      savedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
    };
    localStorage.setItem("assessment_test-id", JSON.stringify(data));

    expect(loadAssessmentProgress("test-id")).toBeNull();
  });
});

describe("clearAssessmentProgress", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should clear progress from localStorage", () => {
    localStorage.setItem("assessment_test-id", "data");
    clearAssessmentProgress("test-id");
    expect(localStorage.getItem("assessment_test-id")).toBeNull();
  });
});

// =============================================================================
// API RESPONSE HELPERS TESTS
// =============================================================================

describe("parseAssessmentError", () => {
  it("should parse error with code and message", () => {
    const error = { code: "AI_DISABLED", message: "AI is disabled" };
    const parsed = parseAssessmentError(error);
    expect(parsed.code).toBe("AI_DISABLED");
    expect(parsed.message).toBe("AI is disabled");
  });

  it("should handle Error instances", () => {
    const error = new Error("Something went wrong");
    const parsed = parseAssessmentError(error);
    expect(parsed.code).toBe("UNKNOWN_ERROR");
    expect(parsed.message).toBe("Something went wrong");
  });

  it("should handle unknown errors", () => {
    const parsed = parseAssessmentError("string error");
    expect(parsed.code).toBe("UNKNOWN_ERROR");
    expect(parsed.message).toBe("An error occurred");
  });
});

describe("getAssessmentErrorMessage", () => {
  it("should return user-friendly messages", () => {
    expect(
      getAssessmentErrorMessage({ code: "AI_DISABLED", message: "" })
    ).toContain("disabled");
    expect(
      getAssessmentErrorMessage({ code: "RATE_LIMIT_EXCEEDED", message: "" })
    ).toContain("Rate limit");
    expect(
      getAssessmentErrorMessage({ code: "BOOK_NOT_FOUND", message: "" })
    ).toContain("not found");
  });

  it("should fall back to message for unknown codes", () => {
    expect(
      getAssessmentErrorMessage({
        code: "CUSTOM_ERROR",
        message: "Custom message",
      })
    ).toBe("Custom message");
  });
});
