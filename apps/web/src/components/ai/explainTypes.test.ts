/**
 * Tests for Explain Types and Utilities
 */
import { describe, it, expect } from "vitest";
import {
  // Types
  type ExplanationData,
  type ExplainError,
  type ExplainContext,
  type FollowUpItem,
  type FollowUpState,
  type ExplainLoadingState,
  type ExplainApiRequest,
  type FollowUpApiRequest,
  type ExplainApiResponse,
  // Constants
  MIN_TEXT_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_CONTEXT_LENGTH,
  MAX_FOLLOW_UPS,
  INITIAL_FOLLOW_UP_STATE,
  // Functions
  createExplainError,
  getExplainErrorMessage,
  parseExplainApiError,
  validateSelectedText,
  truncateContext,
  buildExplainRequest,
  buildFollowUpRequest,
  canAddFollowUp,
  addFollowUp,
  setFollowUpLoading,
  updateFollowUpInput,
  clearFollowUps,
  generateExplanationId,
  createExplanationData,
  hasAdditionalContent,
  getReadingLevelLabel,
  countContextChars,
} from "./explainTypes";

// =============================================================================
// TYPE EXPORTS TESTS
// =============================================================================

describe("Type exports", () => {
  it("should export ExplanationData type", () => {
    const data: ExplanationData = {
      id: "test-id",
      bookId: "book-1",
      selectedText: "test text",
      explanation: "explanation",
      generatedAt: new Date().toISOString(),
    };
    expect(data.id).toBe("test-id");
  });

  it("should export ExplainError type", () => {
    const error: ExplainError = {
      type: "network_error",
      message: "Network error",
      retryable: true,
    };
    expect(error.type).toBe("network_error");
  });

  it("should export ExplainContext type", () => {
    const context: ExplainContext = {
      selectedText: "selected",
      textBefore: "before",
      textAfter: "after",
    };
    expect(context.selectedText).toBe("selected");
  });

  it("should export FollowUpItem type", () => {
    const item: FollowUpItem = {
      question: "Why?",
      answer: "Because",
      generatedAt: new Date().toISOString(),
    };
    expect(item.question).toBe("Why?");
  });

  it("should export FollowUpState type", () => {
    const state: FollowUpState = {
      items: [],
      isLoading: false,
      inputValue: "",
    };
    expect(state.items).toHaveLength(0);
  });

  it("should export ExplainLoadingState type", () => {
    const state: ExplainLoadingState = "loading";
    expect(state).toBe("loading");
  });

  it("should export ExplainApiRequest type", () => {
    const request: ExplainApiRequest = {
      bookId: "book-1",
      selectedText: "text",
    };
    expect(request.bookId).toBe("book-1");
  });

  it("should export FollowUpApiRequest type", () => {
    const request: FollowUpApiRequest = {
      bookId: "book-1",
      selectedText: "text",
      originalExplanation: "explanation",
      question: "why?",
    };
    expect(request.question).toBe("why?");
  });

  it("should export ExplainApiResponse type", () => {
    const response: ExplainApiResponse = {
      id: "id",
      bookId: "book-1",
      selectedText: "text",
      explanation: "explanation",
      generatedAt: new Date().toISOString(),
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    };
    expect(response.usage?.totalTokens).toBe(150);
  });
});

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Constants", () => {
  it("MIN_TEXT_LENGTH should be 2", () => {
    expect(MIN_TEXT_LENGTH).toBe(2);
  });

  it("MAX_TEXT_LENGTH should be 2000", () => {
    expect(MAX_TEXT_LENGTH).toBe(2000);
  });

  it("MAX_CONTEXT_LENGTH should be 500", () => {
    expect(MAX_CONTEXT_LENGTH).toBe(500);
  });

  it("MAX_FOLLOW_UPS should be 5", () => {
    expect(MAX_FOLLOW_UPS).toBe(5);
  });

  it("INITIAL_FOLLOW_UP_STATE should have empty items and false loading", () => {
    expect(INITIAL_FOLLOW_UP_STATE).toEqual({
      items: [],
      isLoading: false,
      inputValue: "",
    });
  });
});

// =============================================================================
// createExplainError TESTS
// =============================================================================

describe("createExplainError", () => {
  it("should create error with default message for network_error", () => {
    const error = createExplainError("network_error");
    expect(error.type).toBe("network_error");
    expect(error.message).toContain("internet connection");
    expect(error.retryable).toBe(true);
  });

  it("should create error with custom message", () => {
    const error = createExplainError("rate_limited", "Custom message");
    expect(error.message).toBe("Custom message");
    expect(error.retryable).toBe(true);
  });

  it("should mark ai_disabled as not retryable", () => {
    const error = createExplainError("ai_disabled");
    expect(error.retryable).toBe(false);
  });

  it("should mark text_too_long as not retryable", () => {
    const error = createExplainError("text_too_long");
    expect(error.retryable).toBe(false);
  });

  it("should mark text_too_short as not retryable", () => {
    const error = createExplainError("text_too_short");
    expect(error.retryable).toBe(false);
  });

  it("should mark generation_failed as retryable", () => {
    const error = createExplainError("generation_failed");
    expect(error.retryable).toBe(true);
  });

  it("should mark ai_unavailable as retryable", () => {
    const error = createExplainError("ai_unavailable");
    expect(error.retryable).toBe(true);
  });

  it("should mark unknown as not retryable", () => {
    const error = createExplainError("unknown");
    expect(error.retryable).toBe(false);
  });

  it("should have appropriate default message for text_too_long", () => {
    const error = createExplainError("text_too_long");
    expect(error.message).toContain("too long");
  });

  it("should have appropriate default message for text_too_short", () => {
    const error = createExplainError("text_too_short");
    expect(error.message).toContain("too short");
  });
});

// =============================================================================
// getExplainErrorMessage TESTS
// =============================================================================

describe("getExplainErrorMessage", () => {
  it("should return the error message", () => {
    const error = createExplainError("network_error", "Test message");
    expect(getExplainErrorMessage(error)).toBe("Test message");
  });

  it("should return default message when no custom message", () => {
    const error = createExplainError("rate_limited");
    expect(getExplainErrorMessage(error)).toContain("Too many requests");
  });
});

// =============================================================================
// parseExplainApiError TESTS
// =============================================================================

describe("parseExplainApiError", () => {
  it("should parse 429 as rate_limited", () => {
    const error = parseExplainApiError(429);
    expect(error.type).toBe("rate_limited");
  });

  it("should parse 403 with AI_DISABLED code as ai_disabled", () => {
    const error = parseExplainApiError(403, "AI_DISABLED");
    expect(error.type).toBe("ai_disabled");
  });

  it("should parse 403 with AI in message as ai_disabled", () => {
    const error = parseExplainApiError(403, undefined, "AI features disabled");
    expect(error.type).toBe("ai_disabled");
  });

  it("should parse 403 without AI context as unknown", () => {
    const error = parseExplainApiError(403);
    expect(error.type).toBe("unknown");
  });

  it("should parse 400 with TEXT_TOO_LONG code as text_too_long", () => {
    const error = parseExplainApiError(400, "TEXT_TOO_LONG");
    expect(error.type).toBe("text_too_long");
  });

  it("should parse 400 with too long message as text_too_long", () => {
    const error = parseExplainApiError(400, undefined, "Text is too long");
    expect(error.type).toBe("text_too_long");
  });

  it("should parse 400 with TEXT_TOO_SHORT code as text_too_short", () => {
    const error = parseExplainApiError(400, "TEXT_TOO_SHORT");
    expect(error.type).toBe("text_too_short");
  });

  it("should parse 400 with too short message as text_too_short", () => {
    const error = parseExplainApiError(400, undefined, "Text is too short");
    expect(error.type).toBe("text_too_short");
  });

  it("should parse 400 without specific code as unknown", () => {
    const error = parseExplainApiError(400);
    expect(error.type).toBe("unknown");
  });

  it("should parse 503 as ai_unavailable", () => {
    const error = parseExplainApiError(503);
    expect(error.type).toBe("ai_unavailable");
  });

  it("should parse 500 as generation_failed", () => {
    const error = parseExplainApiError(500);
    expect(error.type).toBe("generation_failed");
  });

  it("should parse 502 as generation_failed", () => {
    const error = parseExplainApiError(502);
    expect(error.type).toBe("generation_failed");
  });

  it("should parse 0 as network_error", () => {
    const error = parseExplainApiError(0);
    expect(error.type).toBe("network_error");
  });

  it("should parse other status codes as unknown", () => {
    const error = parseExplainApiError(418);
    expect(error.type).toBe("unknown");
  });

  it("should include custom message in error", () => {
    const error = parseExplainApiError(429, undefined, "Slow down");
    expect(error.message).toBe("Slow down");
  });
});

// =============================================================================
// validateSelectedText TESTS
// =============================================================================

describe("validateSelectedText", () => {
  it("should return valid for normal text", () => {
    const result = validateSelectedText("Hello world");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should return invalid for undefined", () => {
    const result = validateSelectedText(undefined);
    expect(result.valid).toBe(false);
    expect(result.error?.type).toBe("text_too_short");
  });

  it("should return invalid for null", () => {
    const result = validateSelectedText(null);
    expect(result.valid).toBe(false);
    expect(result.error?.type).toBe("text_too_short");
  });

  it("should return invalid for empty string", () => {
    const result = validateSelectedText("");
    expect(result.valid).toBe(false);
    expect(result.error?.type).toBe("text_too_short");
  });

  it("should return invalid for whitespace only", () => {
    const result = validateSelectedText("   ");
    expect(result.valid).toBe(false);
    expect(result.error?.type).toBe("text_too_short");
  });

  it("should return invalid for single character", () => {
    const result = validateSelectedText("a");
    expect(result.valid).toBe(false);
    expect(result.error?.type).toBe("text_too_short");
  });

  it("should return valid for minimum length", () => {
    const result = validateSelectedText("ab");
    expect(result.valid).toBe(true);
  });

  it("should return invalid for text over max length", () => {
    const longText = "a".repeat(MAX_TEXT_LENGTH + 1);
    const result = validateSelectedText(longText);
    expect(result.valid).toBe(false);
    expect(result.error?.type).toBe("text_too_long");
  });

  it("should return valid for text at max length", () => {
    const text = "a".repeat(MAX_TEXT_LENGTH);
    const result = validateSelectedText(text);
    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// truncateContext TESTS
// =============================================================================

describe("truncateContext", () => {
  it("should return undefined for undefined input", () => {
    expect(truncateContext(undefined)).toBeUndefined();
  });

  it("should return text as-is if under max length", () => {
    expect(truncateContext("short text")).toBe("short text");
  });

  it("should truncate text over max length", () => {
    const longText = "a".repeat(600);
    const result = truncateContext(longText);
    expect(result).toHaveLength(MAX_CONTEXT_LENGTH);
  });

  it("should use custom max length", () => {
    const text = "a".repeat(100);
    const result = truncateContext(text, 50);
    expect(result).toHaveLength(50);
  });

  it("should return text at exact max length unchanged", () => {
    const text = "a".repeat(MAX_CONTEXT_LENGTH);
    expect(truncateContext(text)).toBe(text);
  });
});

// =============================================================================
// buildExplainRequest TESTS
// =============================================================================

describe("buildExplainRequest", () => {
  it("should build request with minimal context", () => {
    const context: ExplainContext = {
      selectedText: "  test text  ",
    };
    const request = buildExplainRequest(context, "book-1");
    expect(request).toEqual({
      bookId: "book-1",
      selectedText: "test text",
      textBefore: undefined,
      textAfter: undefined,
      bookTitle: undefined,
      chapterTitle: undefined,
      readingLevel: undefined,
    });
  });

  it("should build request with full context", () => {
    const context: ExplainContext = {
      selectedText: "test text",
      textBefore: "before",
      textAfter: "after",
      bookTitle: "Book Title",
      chapterTitle: "Chapter 1",
      readingLevel: "intermediate",
    };
    const request = buildExplainRequest(context, "book-1");
    expect(request).toEqual({
      bookId: "book-1",
      selectedText: "test text",
      textBefore: "before",
      textAfter: "after",
      bookTitle: "Book Title",
      chapterTitle: "Chapter 1",
      readingLevel: "intermediate",
    });
  });

  it("should truncate long textBefore", () => {
    const context: ExplainContext = {
      selectedText: "test",
      textBefore: "a".repeat(600),
    };
    const request = buildExplainRequest(context, "book-1");
    expect(request.textBefore).toHaveLength(MAX_CONTEXT_LENGTH);
  });

  it("should truncate long textAfter", () => {
    const context: ExplainContext = {
      selectedText: "test",
      textAfter: "a".repeat(600),
    };
    const request = buildExplainRequest(context, "book-1");
    expect(request.textAfter).toHaveLength(MAX_CONTEXT_LENGTH);
  });
});

// =============================================================================
// buildFollowUpRequest TESTS
// =============================================================================

describe("buildFollowUpRequest", () => {
  it("should build follow-up request", () => {
    const request = buildFollowUpRequest(
      "book-1",
      "  selected  ",
      "explanation",
      "  why?  ",
      "beginner"
    );
    expect(request).toEqual({
      bookId: "book-1",
      selectedText: "selected",
      originalExplanation: "explanation",
      question: "why?",
      readingLevel: "beginner",
    });
  });

  it("should build request without reading level", () => {
    const request = buildFollowUpRequest(
      "book-1",
      "selected",
      "explanation",
      "why?"
    );
    expect(request.readingLevel).toBeUndefined();
  });
});

// =============================================================================
// FOLLOW-UP STATE MANAGEMENT TESTS
// =============================================================================

describe("canAddFollowUp", () => {
  it("should return true for empty state", () => {
    expect(canAddFollowUp(INITIAL_FOLLOW_UP_STATE)).toBe(true);
  });

  it("should return false when loading", () => {
    const state: FollowUpState = {
      items: [],
      isLoading: true,
      inputValue: "",
    };
    expect(canAddFollowUp(state)).toBe(false);
  });

  it("should return false when at max follow-ups", () => {
    const state: FollowUpState = {
      items: Array(MAX_FOLLOW_UPS).fill({
        question: "q",
        answer: "a",
        generatedAt: "",
      }),
      isLoading: false,
      inputValue: "",
    };
    expect(canAddFollowUp(state)).toBe(false);
  });

  it("should return true when under max follow-ups and not loading", () => {
    const state: FollowUpState = {
      items: [{ question: "q", answer: "a", generatedAt: "" }],
      isLoading: false,
      inputValue: "",
    };
    expect(canAddFollowUp(state)).toBe(true);
  });
});

describe("addFollowUp", () => {
  it("should add follow-up item to state", () => {
    const newState = addFollowUp(INITIAL_FOLLOW_UP_STATE, "Why?", "Because");
    expect(newState.items).toHaveLength(1);
    const firstItem = newState.items[0];
    expect(firstItem).toBeDefined();
    expect(firstItem?.question).toBe("Why?");
    expect(firstItem?.answer).toBe("Because");
    expect(firstItem?.generatedAt).toBeDefined();
    expect(newState.isLoading).toBe(false);
    expect(newState.inputValue).toBe("");
  });

  it("should preserve existing items", () => {
    const state: FollowUpState = {
      items: [{ question: "First", answer: "A1", generatedAt: "t1" }],
      isLoading: false,
      inputValue: "test",
    };
    const newState = addFollowUp(state, "Second", "A2");
    expect(newState.items).toHaveLength(2);
    expect(newState.items[0]?.question).toBe("First");
    expect(newState.items[1]?.question).toBe("Second");
  });
});

describe("setFollowUpLoading", () => {
  it("should set loading to true", () => {
    const newState = setFollowUpLoading(INITIAL_FOLLOW_UP_STATE, true);
    expect(newState.isLoading).toBe(true);
    expect(newState.items).toHaveLength(0);
  });

  it("should set loading to false", () => {
    const state: FollowUpState = {
      ...INITIAL_FOLLOW_UP_STATE,
      isLoading: true,
    };
    const newState = setFollowUpLoading(state, false);
    expect(newState.isLoading).toBe(false);
  });
});

describe("updateFollowUpInput", () => {
  it("should update input value", () => {
    const newState = updateFollowUpInput(INITIAL_FOLLOW_UP_STATE, "new value");
    expect(newState.inputValue).toBe("new value");
  });

  it("should preserve other state", () => {
    const state: FollowUpState = {
      items: [{ question: "q", answer: "a", generatedAt: "" }],
      isLoading: true,
      inputValue: "old",
    };
    const newState = updateFollowUpInput(state, "new");
    expect(newState.items).toHaveLength(1);
    expect(newState.isLoading).toBe(true);
    expect(newState.inputValue).toBe("new");
  });
});

describe("clearFollowUps", () => {
  it("should return initial state", () => {
    // Note: state is defined to show the function clears regardless of input
    const newState = clearFollowUps();
    expect(newState).toEqual(INITIAL_FOLLOW_UP_STATE);
  });
});

// =============================================================================
// EXPLANATION DATA UTILITIES TESTS
// =============================================================================

describe("generateExplanationId", () => {
  it("should generate unique IDs", () => {
    const id1 = generateExplanationId();
    const id2 = generateExplanationId();
    expect(id1).not.toBe(id2);
  });

  it("should start with exp_ prefix", () => {
    const id = generateExplanationId();
    expect(id.startsWith("exp_")).toBe(true);
  });

  it("should be a non-empty string", () => {
    const id = generateExplanationId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(4);
  });
});

describe("createExplanationData", () => {
  it("should create basic explanation data", () => {
    const data = createExplanationData("book-1", "selected", "explanation");
    expect(data.bookId).toBe("book-1");
    expect(data.selectedText).toBe("selected");
    expect(data.explanation).toBe("explanation");
    expect(data.id).toBeDefined();
    expect(data.generatedAt).toBeDefined();
    expect(data.simplifiedExplanation).toBeUndefined();
    expect(data.relatedConcepts).toBeUndefined();
    expect(data.examples).toBeUndefined();
  });

  it("should create explanation data with all fields", () => {
    const data = createExplanationData(
      "book-1",
      "selected",
      "explanation",
      "simple",
      ["concept1", "concept2"],
      ["example1"],
      true
    );
    expect(data.simplifiedExplanation).toBe("simple");
    expect(data.relatedConcepts).toEqual(["concept1", "concept2"]);
    expect(data.examples).toEqual(["example1"]);
    expect(data.cached).toBe(true);
  });
});

describe("hasAdditionalContent", () => {
  it("should return false for null", () => {
    expect(hasAdditionalContent(null)).toBe(false);
  });

  it("should return false for explanation with no additional content", () => {
    const data: ExplanationData = {
      id: "1",
      bookId: "b",
      selectedText: "t",
      explanation: "e",
      generatedAt: "",
    };
    expect(hasAdditionalContent(data)).toBe(false);
  });

  it("should return true for explanation with simplifiedExplanation", () => {
    const data: ExplanationData = {
      id: "1",
      bookId: "b",
      selectedText: "t",
      explanation: "e",
      simplifiedExplanation: "simple",
      generatedAt: "",
    };
    expect(hasAdditionalContent(data)).toBe(true);
  });

  it("should return true for explanation with relatedConcepts", () => {
    const data: ExplanationData = {
      id: "1",
      bookId: "b",
      selectedText: "t",
      explanation: "e",
      relatedConcepts: ["concept"],
      generatedAt: "",
    };
    expect(hasAdditionalContent(data)).toBe(true);
  });

  it("should return true for explanation with examples", () => {
    const data: ExplanationData = {
      id: "1",
      bookId: "b",
      selectedText: "t",
      explanation: "e",
      examples: ["example"],
      generatedAt: "",
    };
    expect(hasAdditionalContent(data)).toBe(true);
  });

  it("should return false for empty arrays", () => {
    const data: ExplanationData = {
      id: "1",
      bookId: "b",
      selectedText: "t",
      explanation: "e",
      relatedConcepts: [],
      examples: [],
      generatedAt: "",
    };
    expect(hasAdditionalContent(data)).toBe(false);
  });
});

// =============================================================================
// READING LEVEL UTILITIES TESTS
// =============================================================================

describe("getReadingLevelLabel", () => {
  it("should return Beginner for beginner", () => {
    expect(getReadingLevelLabel("beginner")).toBe("Beginner");
  });

  it("should return Intermediate for intermediate", () => {
    expect(getReadingLevelLabel("intermediate")).toBe("Intermediate");
  });

  it("should return Advanced for advanced", () => {
    expect(getReadingLevelLabel("advanced")).toBe("Advanced");
  });

  it("should return Default for undefined", () => {
    expect(getReadingLevelLabel(undefined)).toBe("Default");
  });
});

// =============================================================================
// countContextChars TESTS
// =============================================================================

describe("countContextChars", () => {
  it("should count only selectedText when others are undefined", () => {
    const context: ExplainContext = {
      selectedText: "12345",
    };
    expect(countContextChars(context)).toBe(5);
  });

  it("should count all text fields", () => {
    const context: ExplainContext = {
      selectedText: "12345",
      textBefore: "abc",
      textAfter: "de",
    };
    expect(countContextChars(context)).toBe(10);
  });

  it("should handle empty strings", () => {
    const context: ExplainContext = {
      selectedText: "",
      textBefore: "",
      textAfter: "",
    };
    expect(countContextChars(context)).toBe(0);
  });
});

// =============================================================================
// EDGE CASES AND INTEGRATION TESTS
// =============================================================================

describe("Edge cases", () => {
  it("should handle special characters in text", () => {
    const result = validateSelectedText("Hello! @#$%^&*() World");
    expect(result.valid).toBe(true);
  });

  it("should handle unicode text", () => {
    const result = validateSelectedText("你好世界 Привет мир");
    expect(result.valid).toBe(true);
  });

  it("should handle newlines in text", () => {
    const result = validateSelectedText("Hello\nWorld\n");
    expect(result.valid).toBe(true);
  });
});

describe("Integration scenarios", () => {
  it("should validate, build request, and parse error in sequence", () => {
    const context: ExplainContext = {
      selectedText: "test text",
      bookTitle: "Book",
    };

    // Validate
    const validation = validateSelectedText(context.selectedText);
    expect(validation.valid).toBe(true);

    // Build request
    const request = buildExplainRequest(context, "book-1");
    expect(request.selectedText).toBe("test text");

    // Parse error
    const error = parseExplainApiError(429, undefined, "Rate limited");
    expect(error.type).toBe("rate_limited");
    expect(error.retryable).toBe(true);
  });

  it("should manage follow-up state through full lifecycle", () => {
    let state = INITIAL_FOLLOW_UP_STATE;

    // Update input
    state = updateFollowUpInput(state, "Why?");
    expect(state.inputValue).toBe("Why?");

    // Set loading
    state = setFollowUpLoading(state, true);
    expect(state.isLoading).toBe(true);
    expect(canAddFollowUp(state)).toBe(false);

    // Add follow-up (simulating success)
    state = addFollowUp(state, "Why?", "Because");
    expect(state.items).toHaveLength(1);
    expect(state.isLoading).toBe(false);
    expect(state.inputValue).toBe("");

    // Clear all
    state = clearFollowUps();
    expect(state).toEqual(INITIAL_FOLLOW_UP_STATE);
  });

  it("should create and validate explanation data", () => {
    const data = createExplanationData(
      "book-1",
      "selected text",
      "This is the explanation",
      "Simple version",
      ["Concept A", "Concept B"],
      ["Example 1"]
    );

    expect(data.id).toBeDefined();
    expect(hasAdditionalContent(data)).toBe(true);
    expect(data.relatedConcepts).toHaveLength(2);
    expect(data.examples).toHaveLength(1);
  });
});
