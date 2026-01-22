/**
 * AI Service - Vercel AI SDK with Anthropic Claude
 *
 * Provides AI completion capabilities with:
 * - Anthropic Claude integration via Vercel AI SDK
 * - Streaming support for real-time responses
 * - Token counting and cost calculation
 * - Comprehensive logging for monitoring and billing
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, streamText } from "ai";
import type { ModelMessage, LanguageModel, LanguageModelUsage } from "ai";

import { logAIUsage, logError, logger } from "../utils/logger.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Supported AI operations for tracking and billing
 */
export type AIOperation =
  | "pre_reading_guide"
  | "explain"
  | "ask"
  | "comprehension_check"
  | "assessment"
  | "grade_answer"
  | "generate_flashcards"
  | "summarize"
  | "translate"
  | "study-buddy"
  | "discussion-questions"
  | "summarize-notes"
  | "assess-difficulty"
  | "recommendations"
  | "custom";

/**
 * User reading level for adapting AI responses
 */
export type ReadingLevel =
  | "elementary"
  | "middle_school"
  | "high_school"
  | "college"
  | "advanced";

/**
 * Options for AI completion requests
 */
export interface AICompletionOptions {
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for response variability (0-1) */
  temperature?: number;
  /** System prompt to set context */
  system?: string;
  /** User's reading level for response adaptation */
  readingLevel?: ReadingLevel;
  /** User ID for logging and billing */
  userId?: string;
  /** Operation type for tracking */
  operation?: AIOperation;
  /** Additional metadata for logging */
  metadata?: Record<string, unknown>;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
}

/**
 * Token usage information from AI responses
 */
export interface TokenUsage {
  /** Input/prompt tokens */
  promptTokens: number;
  /** Output/completion tokens */
  completionTokens: number;
  /** Total tokens */
  totalTokens: number;
}

/**
 * Cost calculation result
 */
export interface CostCalculation {
  /** Cost of input tokens in USD */
  inputCost: number;
  /** Cost of output tokens in USD */
  outputCost: number;
  /** Total cost in USD */
  totalCost: number;
  /** Model used for calculation */
  model: string;
}

/**
 * AI completion result
 */
export interface AICompletionResult {
  /** Generated text response */
  text: string;
  /** Token usage information */
  usage: TokenUsage;
  /** Cost calculation */
  cost: CostCalculation;
  /** Duration in milliseconds */
  durationMs: number;
  /** Model used */
  model: string;
  /** Finish reason */
  finishReason: string;
}

/**
 * AI stream result for async iteration
 */
export interface AIStreamResult {
  /** Async iterable of text chunks */
  textStream: AsyncIterable<string>;
  /** Promise resolving to final usage and cost */
  usage: Promise<TokenUsage>;
  /** Promise resolving to cost calculation */
  cost: Promise<CostCalculation>;
}

// ============================================================================
// Constants
// ============================================================================

/** Default model to use */
const DEFAULT_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022";

/** Default max tokens */
const DEFAULT_MAX_TOKENS = 4096;

/** Default temperature */
const DEFAULT_TEMPERATURE = 0.7;

/**
 * Claude model pricing (per 1M tokens in USD)
 * Updated as of January 2025
 */
export const CLAUDE_PRICING: Record<string, { input: number; output: number }> =
  {
    // Claude 3.5 models
    "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
    "claude-3-5-sonnet-20240620": { input: 3.0, output: 15.0 },
    "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0 },
    // Claude 3 models
    "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
    "claude-3-sonnet-20240229": { input: 3.0, output: 15.0 },
    "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
    // Fallback pricing for unknown models
    default: { input: 3.0, output: 15.0 },
  };

// ============================================================================
// Client Management
// ============================================================================

let anthropicClient: ReturnType<typeof createAnthropic> | null = null;

/**
 * Get or create the Anthropic client instance
 */
export function getAnthropicClient(): ReturnType<typeof createAnthropic> {
  if (anthropicClient) {
    return anthropicClient;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is required for AI features"
    );
  }

  anthropicClient = createAnthropic({
    apiKey,
  });

  return anthropicClient;
}

/**
 * Get the Claude model to use
 */
export function getModel(modelId?: string): LanguageModel {
  const client = getAnthropicClient();
  return client(modelId ?? DEFAULT_MODEL);
}

/**
 * Check if AI service is configured and available
 */
export function isAIAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Reset the client (useful for testing)
 */
export function resetClient(): void {
  anthropicClient = null;
}

// ============================================================================
// Token Counting & Cost Calculation
// ============================================================================

/**
 * Extract token usage from AI SDK result
 */
export function extractUsage(
  usage?:
    | LanguageModelUsage
    | { promptTokens?: number; completionTokens?: number }
    | null
): TokenUsage {
  if (!usage) {
    return {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
  }

  const promptTokens = "promptTokens" in usage ? (usage.promptTokens ?? 0) : 0;
  const completionTokens =
    "completionTokens" in usage ? (usage.completionTokens ?? 0) : 0;

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

/**
 * Calculate cost based on token usage and model
 */
export function calculateCost(
  usage: TokenUsage,
  model?: string
): CostCalculation {
  const modelId = model ?? DEFAULT_MODEL;
  const pricing = CLAUDE_PRICING[modelId] ?? CLAUDE_PRICING.default;

  // Ensure pricing is defined (TypeScript safety)
  if (!pricing) {
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      model: modelId,
    };
  }

  // Convert to cost per token (pricing is per 1M tokens)
  const inputCostPerToken = pricing.input / 1_000_000;
  const outputCostPerToken = pricing.output / 1_000_000;

  const inputCost = usage.promptTokens * inputCostPerToken;
  const outputCost = usage.completionTokens * outputCostPerToken;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    model: modelId,
  };
}

/**
 * Estimate tokens for a string (rough approximation)
 * Claude uses ~4 characters per token on average
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// ============================================================================
// Logging Wrapper
// ============================================================================

/**
 * Log an AI operation with all relevant metadata
 */
export function logAIOperation(
  operation: AIOperation,
  usage: TokenUsage,
  cost: CostCalculation,
  userId: string | undefined,
  durationMs: number,
  metadata?: Record<string, unknown>
): void {
  // Log to structured logger
  logger.info("AI Operation Completed", {
    operation,
    usage,
    cost,
    userId,
    durationMs,
    ...metadata,
  });

  // Log to AI usage tracker for billing
  logAIUsage(
    operation,
    usage.totalTokens,
    cost.totalCost,
    userId ?? "anonymous",
    durationMs
  );
}

/**
 * Log an AI operation error
 */
export function logAIError(
  operation: AIOperation,
  error: unknown,
  userId?: string,
  metadata?: Record<string, unknown>
): void {
  logError(`AI Operation Failed: ${operation}`, error, {
    operation,
    userId,
    ...metadata,
  });
}

// ============================================================================
// Core AI Functions
// ============================================================================

/**
 * Generate a completion using Claude
 *
 * @param messages - Array of messages for the conversation
 * @param options - Configuration options
 * @returns Promise resolving to completion result
 */
export async function completion(
  messages: ModelMessage[],
  options: AICompletionOptions = {}
): Promise<AICompletionResult> {
  const {
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    system,
    userId,
    operation = "custom",
    metadata,
    abortSignal,
  } = options;

  const startTime = Date.now();
  const model = getModel();

  try {
    const result = await generateText({
      model,
      messages,
      ...(system ? { system } : {}),
      maxOutputTokens: maxTokens,
      temperature,
      ...(abortSignal ? { abortSignal } : {}),
    });

    const durationMs = Date.now() - startTime;
    const usage = extractUsage(result.usage);
    const cost = calculateCost(usage, DEFAULT_MODEL);

    // Log the operation
    logAIOperation(operation, usage, cost, userId, durationMs, metadata);

    return {
      text: result.text,
      usage,
      cost,
      durationMs,
      model: DEFAULT_MODEL,
      finishReason: result.finishReason ?? "unknown",
    };
  } catch (error) {
    logAIError(operation, error, userId, metadata);
    throw error;
  }
}

/**
 * Stream a completion using Claude
 *
 * @param messages - Array of messages for the conversation
 * @param options - Configuration options
 * @returns AI stream result with text stream and usage promises
 */
export async function streamCompletion(
  messages: ModelMessage[],
  options: AICompletionOptions = {}
): Promise<AIStreamResult> {
  const {
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    system,
    userId,
    operation = "custom",
    metadata,
    abortSignal,
  } = options;

  const startTime = Date.now();
  const model = getModel();

  try {
    const result = streamText({
      model,
      messages,
      ...(system ? { system } : {}),
      maxOutputTokens: maxTokens,
      temperature,
      ...(abortSignal ? { abortSignal } : {}),
    });

    // Create promises for final usage and cost
    const usagePromise = (async (): Promise<TokenUsage> => {
      const finalResult = await result;
      const usage = await finalResult.usage;
      return extractUsage(usage);
    })();

    const costPromise = (async (): Promise<CostCalculation> => {
      const usage = await usagePromise;
      const cost = calculateCost(usage, DEFAULT_MODEL);
      const durationMs = Date.now() - startTime;

      // Log when stream completes
      logAIOperation(operation, usage, cost, userId, durationMs, metadata);

      return cost;
    })();

    // Create text stream
    const textStream = (async function* () {
      const stream = await result;
      for await (const chunk of stream.textStream) {
        yield chunk;
      }
    })();

    return {
      textStream,
      usage: usagePromise,
      cost: costPromise,
    };
  } catch (error) {
    logAIError(operation, error, userId, metadata);
    throw error;
  }
}

/**
 * Simple text completion helper
 *
 * @param prompt - Single prompt string
 * @param options - Configuration options
 * @returns Promise resolving to generated text
 */
export async function complete(
  prompt: string,
  options: AICompletionOptions = {}
): Promise<string> {
  const result = await completion([{ role: "user", content: prompt }], options);
  return result.text;
}

/**
 * Simple streaming helper
 *
 * @param prompt - Single prompt string
 * @param options - Configuration options
 * @returns Async iterable of text chunks
 */
export async function stream(
  prompt: string,
  options: AICompletionOptions = {}
): Promise<AsyncIterable<string>> {
  const result = await streamCompletion(
    [{ role: "user", content: prompt }],
    options
  );
  return result.textStream;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Build a system prompt that includes reading level adaptation
 */
export function buildSystemPrompt(
  basePrompt: string,
  readingLevel?: ReadingLevel
): string {
  if (!readingLevel) return basePrompt;

  const levelInstructions: Record<ReadingLevel, string> = {
    elementary:
      "Use simple words and short sentences. Explain concepts as if talking to a 10-year-old.",
    middle_school:
      "Use clear language appropriate for a 12-14 year old. Define technical terms when used.",
    high_school:
      "Use standard academic language appropriate for teenagers. Provide context for complex ideas.",
    college:
      "Use sophisticated vocabulary and assume basic academic knowledge. Be thorough and precise.",
    advanced:
      "Use expert-level language and assume deep domain knowledge. Be concise and precise.",
  };

  return `${basePrompt}\n\nReading Level Instructions: ${levelInstructions[readingLevel]}`;
}

/**
 * Format a context window with book content
 */
export function formatBookContext(
  content: string,
  maxChars: number = 8000
): string {
  if (content.length <= maxChars) return content;

  // Truncate to max chars, trying to end at a sentence boundary
  const truncated = content.slice(0, maxChars);
  const lastPeriod = truncated.lastIndexOf(".");
  const lastNewline = truncated.lastIndexOf("\n");
  const cutPoint = Math.max(lastPeriod, lastNewline);

  return cutPoint > 0
    ? truncated.slice(0, cutPoint + 1) + "\n\n[Content truncated...]"
    : truncated + "...\n\n[Content truncated...]";
}

// ============================================================================
// Exports
// ============================================================================

/**
 * AI service namespace for convenient imports
 */
export const ai = {
  // Core functions
  completion,
  streamCompletion,
  complete,
  stream,

  // Client management
  getAnthropicClient,
  getModel,
  isAIAvailable,
  resetClient,

  // Token and cost utilities
  extractUsage,
  calculateCost,
  estimateTokens,

  // Logging
  logAIOperation,
  logAIError,

  // Utility functions
  buildSystemPrompt,
  formatBookContext,

  // Constants
  CLAUDE_PRICING,
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
} as const;

export default ai;
