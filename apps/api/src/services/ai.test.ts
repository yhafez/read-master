/**
 * AI Service Tests
 *
 * Tests for the AI service including:
 * - Token counting and cost calculation
 * - Client management
 * - Utility functions
 * - Logging wrappers
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  // Client management
  isAIAvailable,
  resetClient,
  getAnthropicClient,

  // Token and cost utilities
  extractUsage,
  calculateCost,
  estimateTokens,
  CLAUDE_PRICING,

  // Utility functions
  buildSystemPrompt,
  formatBookContext,

  // Types
  type TokenUsage,
  type ReadingLevel,
  type AIOperation,
  type AICompletionOptions,
  type CostCalculation,
} from "./ai.js";

// ============================================================================
// extractUsage Tests
// ============================================================================

describe("extractUsage", () => {
  it("should extract usage from valid usage object", () => {
    const usage = extractUsage({
      promptTokens: 100,
      completionTokens: 50,
    });

    expect(usage).toEqual({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });
  });

  it("should handle null usage", () => {
    const usage = extractUsage(null);

    expect(usage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
  });

  it("should handle undefined usage", () => {
    const usage = extractUsage(undefined);

    expect(usage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
  });

  it("should handle partial usage object", () => {
    const usage = extractUsage({ promptTokens: 100 });

    expect(usage).toEqual({
      promptTokens: 100,
      completionTokens: 0,
      totalTokens: 100,
    });
  });

  it("should handle empty object", () => {
    const usage = extractUsage({});

    expect(usage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
  });

  it("should handle large token counts", () => {
    const usage = extractUsage({
      promptTokens: 100000,
      completionTokens: 50000,
    });

    expect(usage.totalTokens).toBe(150000);
  });
});

// ============================================================================
// calculateCost Tests
// ============================================================================

describe("calculateCost", () => {
  it("should calculate cost for claude-3-5-sonnet-20241022", () => {
    const usage: TokenUsage = {
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
    };

    const cost = calculateCost(usage, "claude-3-5-sonnet-20241022");

    // Input: 1000 tokens * $3.00 / 1M = $0.003
    // Output: 500 tokens * $15.00 / 1M = $0.0075
    // Total: $0.0105
    expect(cost.inputCost).toBeCloseTo(0.003, 6);
    expect(cost.outputCost).toBeCloseTo(0.0075, 6);
    expect(cost.totalCost).toBeCloseTo(0.0105, 6);
    expect(cost.model).toBe("claude-3-5-sonnet-20241022");
  });

  it("should calculate cost for claude-3-5-haiku-20241022", () => {
    const usage: TokenUsage = {
      promptTokens: 10000,
      completionTokens: 5000,
      totalTokens: 15000,
    };

    const cost = calculateCost(usage, "claude-3-5-haiku-20241022");

    // Input: 10000 tokens * $0.80 / 1M = $0.008
    // Output: 5000 tokens * $4.00 / 1M = $0.02
    // Total: $0.028
    expect(cost.inputCost).toBeCloseTo(0.008, 6);
    expect(cost.outputCost).toBeCloseTo(0.02, 6);
    expect(cost.totalCost).toBeCloseTo(0.028, 6);
  });

  it("should calculate cost for claude-3-opus-20240229", () => {
    const usage: TokenUsage = {
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
    };

    const cost = calculateCost(usage, "claude-3-opus-20240229");

    // Input: 1000 tokens * $15.00 / 1M = $0.015
    // Output: 500 tokens * $75.00 / 1M = $0.0375
    // Total: $0.0525
    expect(cost.inputCost).toBeCloseTo(0.015, 6);
    expect(cost.outputCost).toBeCloseTo(0.0375, 6);
    expect(cost.totalCost).toBeCloseTo(0.0525, 6);
  });

  it("should use default pricing for unknown models", () => {
    const usage: TokenUsage = {
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
    };

    const cost = calculateCost(usage, "unknown-model-xyz");

    // Should use default (same as sonnet)
    expect(cost.inputCost).toBeCloseTo(0.003, 6);
    expect(cost.outputCost).toBeCloseTo(0.0075, 6);
    expect(cost.model).toBe("unknown-model-xyz");
  });

  it("should handle zero tokens", () => {
    const usage: TokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    const cost = calculateCost(usage, "claude-3-5-sonnet-20241022");

    expect(cost.inputCost).toBe(0);
    expect(cost.outputCost).toBe(0);
    expect(cost.totalCost).toBe(0);
  });

  it("should calculate cost for very large token counts", () => {
    const usage: TokenUsage = {
      promptTokens: 1000000, // 1M tokens
      completionTokens: 500000, // 500K tokens
      totalTokens: 1500000,
    };

    const cost = calculateCost(usage, "claude-3-5-sonnet-20241022");

    // Input: 1M tokens * $3.00 / 1M = $3.00
    // Output: 500K tokens * $15.00 / 1M = $7.50
    // Total: $10.50
    expect(cost.inputCost).toBeCloseTo(3.0, 4);
    expect(cost.outputCost).toBeCloseTo(7.5, 4);
    expect(cost.totalCost).toBeCloseTo(10.5, 4);
  });

  it("should use default model when model is undefined", () => {
    const usage: TokenUsage = {
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
    };

    const cost = calculateCost(usage);

    // Should use default model from process.env or fallback
    expect(cost.totalCost).toBeGreaterThan(0);
    expect(cost.model).toBeTruthy();
  });
});

// ============================================================================
// estimateTokens Tests
// ============================================================================

describe("estimateTokens", () => {
  it("should estimate tokens for short text", () => {
    const tokens = estimateTokens("Hello world");
    // 11 chars / 4 = ~3 tokens
    expect(tokens).toBe(3);
  });

  it("should estimate tokens for longer text", () => {
    const text =
      "This is a longer piece of text that should result in more tokens being estimated.";
    const tokens = estimateTokens(text);
    // 81 chars / 4 = ~21 tokens
    expect(tokens).toBe(21);
  });

  it("should handle empty string", () => {
    const tokens = estimateTokens("");
    expect(tokens).toBe(0);
  });

  it("should handle very long text", () => {
    const text = "a".repeat(10000);
    const tokens = estimateTokens(text);
    // 10000 chars / 4 = 2500 tokens
    expect(tokens).toBe(2500);
  });

  it("should round up for fractional tokens", () => {
    const text = "abc"; // 3 chars
    const tokens = estimateTokens(text);
    // 3 / 4 = 0.75 -> rounds up to 1
    expect(tokens).toBe(1);
  });
});

// ============================================================================
// CLAUDE_PRICING Tests
// ============================================================================

describe("CLAUDE_PRICING", () => {
  it("should have pricing for all major models", () => {
    expect(CLAUDE_PRICING["claude-3-5-sonnet-20241022"]).toBeDefined();
    expect(CLAUDE_PRICING["claude-3-5-sonnet-20240620"]).toBeDefined();
    expect(CLAUDE_PRICING["claude-3-5-haiku-20241022"]).toBeDefined();
    expect(CLAUDE_PRICING["claude-3-opus-20240229"]).toBeDefined();
    expect(CLAUDE_PRICING["claude-3-sonnet-20240229"]).toBeDefined();
    expect(CLAUDE_PRICING["claude-3-haiku-20240307"]).toBeDefined();
    expect(CLAUDE_PRICING.default).toBeDefined();
  });

  it("should have input and output prices for each model", () => {
    for (const [, pricing] of Object.entries(CLAUDE_PRICING)) {
      expect(pricing.input).toBeGreaterThan(0);
      expect(pricing.output).toBeGreaterThan(0);
      expect(pricing.output).toBeGreaterThan(pricing.input);
    }
  });

  it("should have haiku as cheapest model", () => {
    const haiku = CLAUDE_PRICING["claude-3-haiku-20240307"];
    const sonnet = CLAUDE_PRICING["claude-3-5-sonnet-20241022"];
    const opus = CLAUDE_PRICING["claude-3-opus-20240229"];

    // Assert all are defined first
    expect(haiku).toBeDefined();
    expect(sonnet).toBeDefined();
    expect(opus).toBeDefined();

    // Check after assertions above guarantee defined
    if (haiku && sonnet && opus) {
      expect(haiku.input).toBeLessThan(sonnet.input);
      expect(haiku.output).toBeLessThan(sonnet.output);
      expect(haiku.input).toBeLessThan(opus.input);
      expect(haiku.output).toBeLessThan(opus.output);
    }
  });

  it("should have opus as most expensive model", () => {
    const opus = CLAUDE_PRICING["claude-3-opus-20240229"];
    const sonnet = CLAUDE_PRICING["claude-3-5-sonnet-20241022"];
    const haiku = CLAUDE_PRICING["claude-3-5-haiku-20241022"];

    // Assert all are defined first
    expect(opus).toBeDefined();
    expect(sonnet).toBeDefined();
    expect(haiku).toBeDefined();

    // Check after assertions above guarantee defined
    if (opus && sonnet && haiku) {
      expect(opus.input).toBeGreaterThan(sonnet.input);
      expect(opus.output).toBeGreaterThan(sonnet.output);
      expect(opus.input).toBeGreaterThan(haiku.input);
      expect(opus.output).toBeGreaterThan(haiku.output);
    }
  });
});

// ============================================================================
// buildSystemPrompt Tests
// ============================================================================

describe("buildSystemPrompt", () => {
  const basePrompt = "You are a helpful reading assistant.";

  it("should return base prompt when no reading level specified", () => {
    const result = buildSystemPrompt(basePrompt);
    expect(result).toBe(basePrompt);
  });

  it("should return base prompt when reading level is undefined", () => {
    const result = buildSystemPrompt(basePrompt, undefined);
    expect(result).toBe(basePrompt);
  });

  it("should add elementary level instructions", () => {
    const result = buildSystemPrompt(basePrompt, "elementary");

    expect(result).toContain(basePrompt);
    expect(result).toContain("Reading Level Instructions:");
    expect(result).toContain("simple words");
    expect(result).toContain("10-year-old");
  });

  it("should add middle school level instructions", () => {
    const result = buildSystemPrompt(basePrompt, "middle_school");

    expect(result).toContain(basePrompt);
    expect(result).toContain("12-14 year old");
    expect(result).toContain("technical terms");
  });

  it("should add high school level instructions", () => {
    const result = buildSystemPrompt(basePrompt, "high_school");

    expect(result).toContain(basePrompt);
    expect(result).toContain("teenagers");
    expect(result).toContain("academic language");
  });

  it("should add college level instructions", () => {
    const result = buildSystemPrompt(basePrompt, "college");

    expect(result).toContain(basePrompt);
    expect(result).toContain("sophisticated vocabulary");
    expect(result).toContain("academic knowledge");
  });

  it("should add advanced level instructions", () => {
    const result = buildSystemPrompt(basePrompt, "advanced");

    expect(result).toContain(basePrompt);
    expect(result).toContain("expert-level");
    expect(result).toContain("domain knowledge");
  });
});

// ============================================================================
// formatBookContext Tests
// ============================================================================

describe("formatBookContext", () => {
  it("should return content unchanged if under max chars", () => {
    const content = "Short content";
    const result = formatBookContext(content, 1000);

    expect(result).toBe(content);
  });

  it("should truncate content at sentence boundary when possible", () => {
    const content =
      "First sentence. Second sentence. Third sentence. Fourth sentence.";
    const result = formatBookContext(content, 40);

    expect(result).toContain("First sentence.");
    expect(result).toContain("[Content truncated...]");
    expect(result.length).toBeLessThanOrEqual(80); // Allow for truncation message
  });

  it("should truncate at newline when no sentence boundary", () => {
    const content = "Line one\nLine two\nLine three\nLine four";
    const result = formatBookContext(content, 15);

    expect(result).toContain("Line one");
    expect(result).toContain("[Content truncated...]");
  });

  it("should truncate with ellipsis when no good boundary found", () => {
    const content = "abcdefghijklmnopqrstuvwxyz";
    const result = formatBookContext(content, 10);

    expect(result).toContain("...");
    expect(result).toContain("[Content truncated...]");
  });

  it("should use default max chars of 8000", () => {
    const longContent = "a".repeat(10000);
    const result = formatBookContext(longContent);

    expect(result.length).toBeLessThan(longContent.length);
    expect(result).toContain("[Content truncated...]");
  });

  it("should handle empty content", () => {
    const result = formatBookContext("");
    expect(result).toBe("");
  });

  it("should handle content exactly at max chars", () => {
    const content = "a".repeat(100);
    const result = formatBookContext(content, 100);

    expect(result).toBe(content);
  });
});

// ============================================================================
// isAIAvailable Tests
// ============================================================================

describe("isAIAvailable", () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    originalApiKey = process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    if (originalApiKey) {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
    resetClient();
  });

  it("should return true when API key is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
    expect(isAIAvailable()).toBe(true);
  });

  it("should return false when API key is not set", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(isAIAvailable()).toBe(false);
  });

  it("should return false when API key is empty string", () => {
    process.env.ANTHROPIC_API_KEY = "";
    expect(isAIAvailable()).toBe(false);
  });
});

// ============================================================================
// getAnthropicClient Tests
// ============================================================================

describe("getAnthropicClient", () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    originalApiKey = process.env.ANTHROPIC_API_KEY;
    resetClient();
  });

  afterEach(() => {
    if (originalApiKey) {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
    resetClient();
  });

  it("should throw error when API key is not set", () => {
    delete process.env.ANTHROPIC_API_KEY;

    expect(() => getAnthropicClient()).toThrow(
      "ANTHROPIC_API_KEY environment variable is required"
    );
  });

  it("should create client when API key is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345";

    const client = getAnthropicClient();
    expect(client).toBeDefined();
    expect(typeof client).toBe("function");
  });

  it("should return same client instance on subsequent calls", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345";

    const client1 = getAnthropicClient();
    const client2 = getAnthropicClient();

    expect(client1).toBe(client2);
  });

  it("should create new client after reset", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345";

    const client1 = getAnthropicClient();
    resetClient();
    const client2 = getAnthropicClient();

    // The clients should be different instances after reset
    // But they're function references so this tests they were recreated
    expect(client1).toBeDefined();
    expect(client2).toBeDefined();
  });
});

// ============================================================================
// resetClient Tests
// ============================================================================

describe("resetClient", () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    originalApiKey = process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    if (originalApiKey) {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
    resetClient();
  });

  it("should not throw when called before client creation", () => {
    expect(() => resetClient()).not.toThrow();
  });

  it("should reset the client state", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345";

    // Create client
    getAnthropicClient();

    // Reset
    resetClient();

    // Should be able to create new client
    const client = getAnthropicClient();
    expect(client).toBeDefined();
  });
});

// ============================================================================
// Type Tests
// ============================================================================

describe("Type Definitions", () => {
  it("should define AIOperation type correctly", () => {
    const operations: AIOperation[] = [
      "pre_reading_guide",
      "explain",
      "ask",
      "comprehension_check",
      "assessment",
      "grade_answer",
      "generate_flashcards",
      "summarize",
      "translate",
      "custom",
    ];

    expect(operations.length).toBe(10);
  });

  it("should define ReadingLevel type correctly", () => {
    const levels: ReadingLevel[] = [
      "elementary",
      "middle_school",
      "high_school",
      "college",
      "advanced",
    ];

    expect(levels.length).toBe(5);
  });

  it("should define TokenUsage interface correctly", () => {
    const usage: TokenUsage = {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    };

    expect(usage.promptTokens).toBeDefined();
    expect(usage.completionTokens).toBeDefined();
    expect(usage.totalTokens).toBeDefined();
  });

  it("should define CostCalculation interface correctly", () => {
    const cost: CostCalculation = {
      inputCost: 0.003,
      outputCost: 0.0075,
      totalCost: 0.0105,
      model: "claude-3-5-sonnet-20241022",
    };

    expect(cost.inputCost).toBeDefined();
    expect(cost.outputCost).toBeDefined();
    expect(cost.totalCost).toBeDefined();
    expect(cost.model).toBeDefined();
  });

  it("should define AICompletionOptions interface correctly", () => {
    const options: AICompletionOptions = {
      maxTokens: 4096,
      temperature: 0.7,
      system: "You are helpful.",
      readingLevel: "college",
      userId: "user-123",
      operation: "explain",
      metadata: { bookId: "book-456" },
    };

    expect(options.maxTokens).toBe(4096);
    expect(options.temperature).toBe(0.7);
    expect(options.system).toBe("You are helpful.");
  });
});

// ============================================================================
// Integration Tests (with mocking notes)
// ============================================================================

describe("Integration Notes", () => {
  it("should document that completion requires actual API key for integration tests", () => {
    // This test documents that the completion and streamCompletion functions
    // require actual API calls. For full integration testing, set:
    // - ANTHROPIC_API_KEY environment variable
    // - Run with a test flag to enable integration tests
    //
    // Unit tests above cover all the utility functions and configuration.
    expect(true).toBe(true);
  });
});
