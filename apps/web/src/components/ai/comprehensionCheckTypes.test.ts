/**
 * Comprehension Check-In Types Tests
 *
 * Comprehensive tests for the comprehension check-in utility functions.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  type ComprehensionQuestion,
  type CheckInProgress,
  CHECK_IN_FREQUENCY_CONFIG,
  CHECK_IN_STORAGE_KEY,
  CHECK_IN_FREQUENCY_KEY,
  MIN_CONTENT_LENGTH,
  createCheckInError,
  parseCheckInApiError,
  isAnswerCorrect,
  calculateNextMilestone,
  shouldTriggerCheckIn,
  getCurrentMilestone,
  loadCheckInProgress,
  saveCheckInProgress,
  markMilestoneCompleted,
  loadCheckInFrequency,
  saveCheckInFrequency,
  buildCheckInApiRequest,
  parseApiResponseToQuestion,
  getDifficultyLabel,
  getQuestionTypeLabel,
  validateContentLength,
} from "./comprehensionCheckTypes";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("comprehensionCheckTypes", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // =========================================================================
  // Constants
  // =========================================================================
  describe("constants", () => {
    it("CHECK_IN_FREQUENCY_CONFIG has correct intervals", () => {
      expect(CHECK_IN_FREQUENCY_CONFIG.never.interval).toBe(0);
      expect(CHECK_IN_FREQUENCY_CONFIG.sometimes.interval).toBe(25);
      expect(CHECK_IN_FREQUENCY_CONFIG.always.interval).toBe(10);
    });

    it("CHECK_IN_FREQUENCY_CONFIG has labels", () => {
      expect(CHECK_IN_FREQUENCY_CONFIG.never.label).toBeDefined();
      expect(CHECK_IN_FREQUENCY_CONFIG.sometimes.label).toBeDefined();
      expect(CHECK_IN_FREQUENCY_CONFIG.always.label).toBeDefined();
    });

    it("MIN_CONTENT_LENGTH is a positive number", () => {
      expect(MIN_CONTENT_LENGTH).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // createCheckInError
  // =========================================================================
  describe("createCheckInError", () => {
    it("creates error with default message", () => {
      const error = createCheckInError("network_error");
      expect(error.type).toBe("network_error");
      expect(error.message).toContain("connect");
      expect(error.retryable).toBe(true);
    });

    it("creates error with custom message", () => {
      const error = createCheckInError("network_error", "Custom message");
      expect(error.message).toBe("Custom message");
    });

    it("marks rate_limited as retryable", () => {
      const error = createCheckInError("rate_limited");
      expect(error.retryable).toBe(true);
    });

    it("marks ai_disabled as not retryable", () => {
      const error = createCheckInError("ai_disabled");
      expect(error.retryable).toBe(false);
    });

    it("marks ai_unavailable as retryable", () => {
      const error = createCheckInError("ai_unavailable");
      expect(error.retryable).toBe(true);
    });

    it("marks content_too_short as not retryable", () => {
      const error = createCheckInError("content_too_short");
      expect(error.retryable).toBe(false);
    });

    it("marks generation_failed as retryable", () => {
      const error = createCheckInError("generation_failed");
      expect(error.retryable).toBe(true);
    });

    it("marks unknown as not retryable", () => {
      const error = createCheckInError("unknown");
      expect(error.retryable).toBe(false);
    });
  });

  // =========================================================================
  // parseCheckInApiError
  // =========================================================================
  describe("parseCheckInApiError", () => {
    it("parses 429 as rate_limited", () => {
      const error = parseCheckInApiError(429);
      expect(error.type).toBe("rate_limited");
    });

    it("parses 403 with AI_DISABLED code", () => {
      const error = parseCheckInApiError(403, "AI_DISABLED");
      expect(error.type).toBe("ai_disabled");
    });

    it("parses 403 with AI in message", () => {
      const error = parseCheckInApiError(
        403,
        undefined,
        "AI features disabled"
      );
      expect(error.type).toBe("ai_disabled");
    });

    it("parses 403 without AI as unknown", () => {
      const error = parseCheckInApiError(403, undefined, "Forbidden");
      expect(error.type).toBe("unknown");
    });

    it("parses 400 with content error", () => {
      const error = parseCheckInApiError(400, undefined, "content too short");
      expect(error.type).toBe("content_too_short");
    });

    it("parses 400 without content error as unknown", () => {
      const error = parseCheckInApiError(400, undefined, "Bad request");
      expect(error.type).toBe("unknown");
    });

    it("parses 503 as ai_unavailable", () => {
      const error = parseCheckInApiError(503);
      expect(error.type).toBe("ai_unavailable");
    });

    it("parses 500+ as generation_failed", () => {
      const error = parseCheckInApiError(500);
      expect(error.type).toBe("generation_failed");
    });

    it("parses 0 as network_error", () => {
      const error = parseCheckInApiError(0);
      expect(error.type).toBe("network_error");
    });

    it("parses other codes as unknown", () => {
      const error = parseCheckInApiError(404);
      expect(error.type).toBe("unknown");
    });
  });

  // =========================================================================
  // isAnswerCorrect
  // =========================================================================
  describe("isAnswerCorrect", () => {
    const multipleChoiceQuestion: ComprehensionQuestion = {
      id: "q1",
      question: "Test question?",
      type: "multiple_choice",
      options: [
        { id: "a", text: "Option A", isCorrect: false },
        { id: "b", text: "Option B", isCorrect: true },
        { id: "c", text: "Option C", isCorrect: false },
      ],
      correctAnswer: "b",
      explanation: "B is correct",
      difficulty: 2,
    };

    it("returns true for correct multiple choice answer", () => {
      expect(isAnswerCorrect(multipleChoiceQuestion, "b")).toBe(true);
    });

    it("returns false for incorrect multiple choice answer", () => {
      expect(isAnswerCorrect(multipleChoiceQuestion, "a")).toBe(false);
    });

    it("returns false for non-existent option", () => {
      expect(isAnswerCorrect(multipleChoiceQuestion, "z")).toBe(false);
    });

    const trueFalseQuestion: ComprehensionQuestion = {
      id: "q2",
      question: "Is this true?",
      type: "true_false",
      correctAnswer: "true",
      explanation: "Yes it is true",
      difficulty: 1,
    };

    it("returns true for correct true/false answer (case insensitive)", () => {
      expect(isAnswerCorrect(trueFalseQuestion, "true")).toBe(true);
      expect(isAnswerCorrect(trueFalseQuestion, "TRUE")).toBe(true);
      expect(isAnswerCorrect(trueFalseQuestion, "True")).toBe(true);
    });

    it("returns false for incorrect true/false answer", () => {
      expect(isAnswerCorrect(trueFalseQuestion, "false")).toBe(false);
    });

    const shortAnswerQuestion: ComprehensionQuestion = {
      id: "q3",
      question: "What is the capital?",
      type: "short_answer",
      correctAnswer: "Paris",
      explanation: "Paris is the capital of France",
      difficulty: 2,
    };

    it("returns true for correct short answer (case insensitive)", () => {
      expect(isAnswerCorrect(shortAnswerQuestion, "Paris")).toBe(true);
      expect(isAnswerCorrect(shortAnswerQuestion, "paris")).toBe(true);
      expect(isAnswerCorrect(shortAnswerQuestion, "PARIS")).toBe(true);
    });

    it("returns true for short answer with whitespace", () => {
      expect(isAnswerCorrect(shortAnswerQuestion, "  Paris  ")).toBe(true);
    });

    it("returns false for incorrect short answer", () => {
      expect(isAnswerCorrect(shortAnswerQuestion, "London")).toBe(false);
    });
  });

  // =========================================================================
  // calculateNextMilestone
  // =========================================================================
  describe("calculateNextMilestone", () => {
    it("returns null for never frequency", () => {
      const result = calculateNextMilestone(50, "never", []);
      expect(result).toBeNull();
    });

    it("returns next uncompleted milestone for sometimes", () => {
      const result = calculateNextMilestone(30, "sometimes", []);
      expect(result).toBe(25);
    });

    it("returns next uncompleted milestone for always", () => {
      const result = calculateNextMilestone(15, "always", []);
      expect(result).toBe(10);
    });

    it("skips completed milestones", () => {
      const result = calculateNextMilestone(30, "sometimes", [25]);
      expect(result).toBeNull();
    });

    it("returns null when all milestones are complete", () => {
      const result = calculateNextMilestone(
        100,
        "sometimes",
        [25, 50, 75, 100]
      );
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // shouldTriggerCheckIn
  // =========================================================================
  describe("shouldTriggerCheckIn", () => {
    it("returns false for never frequency", () => {
      expect(shouldTriggerCheckIn(50, "never", [])).toBe(false);
    });

    it("returns true when milestone reached and not completed", () => {
      expect(shouldTriggerCheckIn(26, "sometimes", [])).toBe(true);
    });

    it("returns false when milestone already completed", () => {
      expect(shouldTriggerCheckIn(26, "sometimes", [25])).toBe(false);
    });

    it("returns false when no milestone reached yet", () => {
      expect(shouldTriggerCheckIn(5, "sometimes", [])).toBe(false);
    });

    it("returns true at 10% for always frequency", () => {
      expect(shouldTriggerCheckIn(12, "always", [])).toBe(true);
    });

    it("returns true at 50% for sometimes frequency", () => {
      expect(shouldTriggerCheckIn(52, "sometimes", [25])).toBe(true);
    });
  });

  // =========================================================================
  // getCurrentMilestone
  // =========================================================================
  describe("getCurrentMilestone", () => {
    it("returns 0 for never frequency", () => {
      expect(getCurrentMilestone(50, "never")).toBe(0);
    });

    it("returns correct milestone for sometimes", () => {
      expect(getCurrentMilestone(30, "sometimes")).toBe(25);
      expect(getCurrentMilestone(50, "sometimes")).toBe(50);
      expect(getCurrentMilestone(74, "sometimes")).toBe(50);
      expect(getCurrentMilestone(75, "sometimes")).toBe(75);
    });

    it("returns correct milestone for always", () => {
      expect(getCurrentMilestone(15, "always")).toBe(10);
      expect(getCurrentMilestone(25, "always")).toBe(20);
      expect(getCurrentMilestone(100, "always")).toBe(100);
    });
  });

  // =========================================================================
  // loadCheckInProgress / saveCheckInProgress
  // =========================================================================
  describe("loadCheckInProgress / saveCheckInProgress", () => {
    it("returns empty progress for new book", () => {
      const progress = loadCheckInProgress("book-123");
      expect(progress.bookId).toBe("book-123");
      expect(progress.completedMilestones).toEqual([]);
      expect(progress.lastCheckInAt).toBeNull();
    });

    it("saves and loads progress correctly", () => {
      const progress: CheckInProgress = {
        bookId: "book-123",
        completedMilestones: [25, 50],
        lastCheckInAt: "2024-01-01T00:00:00Z",
      };

      saveCheckInProgress(progress);
      const loaded = loadCheckInProgress("book-123");

      expect(loaded.bookId).toBe("book-123");
      expect(loaded.completedMilestones).toEqual([25, 50]);
      expect(loaded.lastCheckInAt).toBe("2024-01-01T00:00:00Z");
    });

    it("handles multiple books", () => {
      const progress1: CheckInProgress = {
        bookId: "book-1",
        completedMilestones: [10],
        lastCheckInAt: null,
      };
      const progress2: CheckInProgress = {
        bookId: "book-2",
        completedMilestones: [25, 50],
        lastCheckInAt: "2024-01-01T00:00:00Z",
      };

      saveCheckInProgress(progress1);
      saveCheckInProgress(progress2);

      expect(loadCheckInProgress("book-1").completedMilestones).toEqual([10]);
      expect(loadCheckInProgress("book-2").completedMilestones).toEqual([
        25, 50,
      ]);
    });

    it("handles invalid JSON in storage", () => {
      localStorageMock.setItem(CHECK_IN_STORAGE_KEY, "invalid json{");
      const progress = loadCheckInProgress("book-123");
      expect(progress.completedMilestones).toEqual([]);
    });
  });

  // =========================================================================
  // markMilestoneCompleted
  // =========================================================================
  describe("markMilestoneCompleted", () => {
    it("adds milestone to completed list", () => {
      const progress: CheckInProgress = {
        bookId: "book-123",
        completedMilestones: [25],
        lastCheckInAt: null,
      };

      const updated = markMilestoneCompleted(progress, 50);

      expect(updated.completedMilestones).toContain(25);
      expect(updated.completedMilestones).toContain(50);
      expect(updated.lastCheckInAt).not.toBeNull();
    });

    it("preserves bookId", () => {
      const progress: CheckInProgress = {
        bookId: "book-123",
        completedMilestones: [],
        lastCheckInAt: null,
      };

      const updated = markMilestoneCompleted(progress, 10);
      expect(updated.bookId).toBe("book-123");
    });
  });

  // =========================================================================
  // loadCheckInFrequency / saveCheckInFrequency
  // =========================================================================
  describe("loadCheckInFrequency / saveCheckInFrequency", () => {
    it("returns sometimes as default", () => {
      const frequency = loadCheckInFrequency();
      expect(frequency).toBe("sometimes");
    });

    it("saves and loads frequency correctly", () => {
      saveCheckInFrequency("always");
      expect(loadCheckInFrequency()).toBe("always");

      saveCheckInFrequency("never");
      expect(loadCheckInFrequency()).toBe("never");
    });

    it("returns default for invalid stored value", () => {
      localStorageMock.setItem(CHECK_IN_FREQUENCY_KEY, "invalid");
      expect(loadCheckInFrequency()).toBe("sometimes");
    });
  });

  // =========================================================================
  // buildCheckInApiRequest
  // =========================================================================
  describe("buildCheckInApiRequest", () => {
    it("builds request with required fields", () => {
      const request = buildCheckInApiRequest("book-123", "Test content");
      expect(request.bookId).toBe("book-123");
      expect(request.recentContent).toBe("Test content");
      expect(request.questionType).toBe("multiple_choice");
    });

    it("includes chapterId when provided", () => {
      const request = buildCheckInApiRequest(
        "book-123",
        "Test content",
        "multiple_choice",
        "chapter-1"
      );
      expect(request.chapterId).toBe("chapter-1");
    });

    it("truncates long content", () => {
      const longContent = "x".repeat(20000);
      const request = buildCheckInApiRequest("book-123", longContent);
      expect(request.recentContent.length).toBe(10000);
    });

    it("uses custom question type", () => {
      const request = buildCheckInApiRequest(
        "book-123",
        "Test content",
        "true_false"
      );
      expect(request.questionType).toBe("true_false");
    });
  });

  // =========================================================================
  // parseApiResponseToQuestion
  // =========================================================================
  describe("parseApiResponseToQuestion", () => {
    it("parses response correctly", () => {
      const response = {
        id: "q1",
        question: "What is the answer?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Option A", isCorrect: false },
          { id: "b", text: "Option B", isCorrect: true },
        ],
        difficulty: 3,
        textReference: "Page 5",
        bookId: "book-123",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        cost: { inputCost: 0.01, outputCost: 0.02, totalCost: 0.03 },
        durationMs: 1000,
      };

      const question = parseApiResponseToQuestion(response);

      expect(question.id).toBe("q1");
      expect(question.question).toBe("What is the answer?");
      expect(question.type).toBe("multiple_choice");
      expect(question.correctAnswer).toBe("b");
      expect(question.difficulty).toBe(3);
      expect(question.textReference).toBe("Page 5");
    });

    it("handles missing correct option", () => {
      const response = {
        id: "q1",
        question: "What is the answer?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Option A", isCorrect: false },
          { id: "b", text: "Option B", isCorrect: false },
        ],
        difficulty: 2,
        bookId: "book-123",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        cost: { inputCost: 0.01, outputCost: 0.02, totalCost: 0.03 },
        durationMs: 1000,
      };

      const question = parseApiResponseToQuestion(response);
      expect(question.correctAnswer).toBe("");
    });
  });

  // =========================================================================
  // getDifficultyLabel
  // =========================================================================
  describe("getDifficultyLabel", () => {
    it("returns Easy for difficulty 1", () => {
      expect(getDifficultyLabel(1)).toBe("Easy");
    });

    it("returns Moderate for difficulty 2", () => {
      expect(getDifficultyLabel(2)).toBe("Moderate");
    });

    it("returns Medium for difficulty 3", () => {
      expect(getDifficultyLabel(3)).toBe("Medium");
    });

    it("returns Challenging for difficulty 4", () => {
      expect(getDifficultyLabel(4)).toBe("Challenging");
    });

    it("returns Hard for difficulty 5+", () => {
      expect(getDifficultyLabel(5)).toBe("Hard");
      expect(getDifficultyLabel(10)).toBe("Hard");
    });
  });

  // =========================================================================
  // getQuestionTypeLabel
  // =========================================================================
  describe("getQuestionTypeLabel", () => {
    it("returns correct label for multiple_choice", () => {
      expect(getQuestionTypeLabel("multiple_choice")).toBe("Multiple Choice");
    });

    it("returns correct label for true_false", () => {
      expect(getQuestionTypeLabel("true_false")).toBe("True/False");
    });

    it("returns correct label for short_answer", () => {
      expect(getQuestionTypeLabel("short_answer")).toBe("Short Answer");
    });
  });

  // =========================================================================
  // validateContentLength
  // =========================================================================
  describe("validateContentLength", () => {
    it("returns valid for sufficient content", () => {
      const content = "x".repeat(MIN_CONTENT_LENGTH + 10);
      const result = validateContentLength(content);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("returns invalid for empty content", () => {
      const result = validateContentLength("");
      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("content_too_short");
    });

    it("returns invalid for short content", () => {
      const content = "x".repeat(MIN_CONTENT_LENGTH - 10);
      const result = validateContentLength(content);
      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("content_too_short");
    });

    it("returns valid for exact minimum length", () => {
      const content = "x".repeat(MIN_CONTENT_LENGTH);
      const result = validateContentLength(content);
      expect(result.valid).toBe(true);
    });
  });
});
