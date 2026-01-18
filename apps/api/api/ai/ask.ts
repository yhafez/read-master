/**
 * POST /api/ai/ask
 *
 * Answer user questions about selected text or the book, maintaining context.
 *
 * This endpoint:
 * - Requires authentication
 * - Checks if user has AI enabled
 * - Enforces tier-based rate limits
 * - Uses the ask prompt template for contextual answers
 * - Supports multi-turn conversation via conversation history
 * - Streams AI response for better UX
 * - Logs AI usage for billing/monitoring
 *
 * @example
 * ```bash
 * curl -X POST /api/ai/ask \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "bookId": "clxyz...",
 *     "question": "What is the main theme of this chapter?",
 *     "selectedText": "The darkness enveloped...",
 *     "conversationHistory": [
 *       { "role": "user", "content": "Who is the main character?" },
 *       { "role": "assistant", "content": "The main character is..." }
 *     ]
 *   }'
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.js";
import {
  checkRateLimit,
  applyRateLimitHeaders,
  createRateLimitResponse,
} from "../../src/middleware/rateLimit.js";
import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { db, getUserByClerkId, getBookById } from "../../src/services/db.js";
import { completion, isAIAvailable } from "../../src/services/ai.js";
import {
  generateAskPrompt,
  parseAskResponse,
  validateAskInput,
  type AskInput,
  type AskOutput,
  type UserContext,
  type ReadingLevel,
  type BookContext,
} from "@read-master/ai";
import type { Book } from "@read-master/database";

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum question length
 */
const MIN_QUESTION_LENGTH = 1;

/**
 * Maximum question length
 */
const MAX_QUESTION_LENGTH = 1000;

/**
 * Maximum selected text length
 */
const MAX_TEXT_LENGTH = 10000;

/**
 * Maximum surrounding context length
 */
const MAX_CONTEXT_LENGTH = 2000;

/**
 * Maximum conversation history messages
 */
const MAX_HISTORY_MESSAGES = 10;

/**
 * Maximum tokens for AI response
 */
const MAX_TOKENS = 2048;

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Conversation message schema
 */
const conversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(5000),
});

/**
 * Ask request validation schema
 */
const askRequestSchema = z.object({
  bookId: z
    .string()
    .min(1, "Book ID is required")
    .regex(/^c[a-z0-9]+$/, "Invalid book ID format"),
  question: z
    .string()
    .min(MIN_QUESTION_LENGTH, "Question is required")
    .max(
      MAX_QUESTION_LENGTH,
      `Question must be at most ${MAX_QUESTION_LENGTH} characters`
    ),
  selectedText: z
    .string()
    .max(
      MAX_TEXT_LENGTH,
      `Selected text must be at most ${MAX_TEXT_LENGTH} characters`
    )
    .optional(),
  surroundingContext: z
    .string()
    .max(
      MAX_CONTEXT_LENGTH,
      `Context must be at most ${MAX_CONTEXT_LENGTH} characters`
    )
    .optional(),
  conversationHistory: z
    .array(conversationMessageSchema)
    .max(
      MAX_HISTORY_MESSAGES,
      `Conversation history must be at most ${MAX_HISTORY_MESSAGES} messages`
    )
    .optional(),
});

/**
 * Type for validated request
 */
type AskRequest = z.infer<typeof askRequestSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map user's reading level to AI prompt reading level
 */
function mapReadingLevel(userLevel: string | null): ReadingLevel {
  if (!userLevel) return "middle_school";

  const level = userLevel.toLowerCase();

  if (level.includes("beginner") || level.includes("k-2")) return "beginner";
  if (level.includes("elementary") || level.includes("3-5"))
    return "elementary";
  if (level.includes("middle") || level.includes("6-8")) return "middle_school";
  if (level.includes("high") || level.includes("9-12")) return "high_school";
  if (level.includes("college") || level.includes("undergraduate"))
    return "college";
  if (level.includes("advanced") || level.includes("graduate"))
    return "advanced";

  // Try to parse Lexile score
  const lexileMatch = userLevel.match(/(\d+)L?/i);
  if (lexileMatch) {
    const lexile = parseInt(lexileMatch[1] ?? "0", 10);
    if (lexile < 400) return "beginner";
    if (lexile < 700) return "elementary";
    if (lexile < 1000) return "middle_school";
    if (lexile < 1200) return "high_school";
    if (lexile < 1400) return "college";
    return "advanced";
  }

  return "middle_school";
}

/**
 * Build book context for AI prompt
 */
function buildBookContext(book: Book): BookContext {
  const context: BookContext = {
    title: book.title,
    author: book.author ?? "Unknown Author",
    content: book.description ?? "",
  };

  if (book.genre) {
    context.genre = book.genre;
  }
  if (book.description) {
    context.description = book.description;
  }

  return context;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle ask request
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== "POST") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use POST.",
      405
    );
    return;
  }

  const { userId } = req.auth;

  try {
    // Check if AI service is available
    if (!isAIAvailable()) {
      sendError(
        res,
        ErrorCodes.SERVICE_UNAVAILABLE,
        "AI service is not available. Please try again later.",
        503
      );
      return;
    }

    // Validate request body
    const validationResult = askRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid request body",
        400,
        validationResult.error.flatten()
      );
      return;
    }

    const {
      bookId,
      question,
      selectedText,
      surroundingContext,
      conversationHistory,
    }: AskRequest = validationResult.data;

    // Get user from database
    const user = await getUserByClerkId(userId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Check if user has AI enabled
    if (!user.aiEnabled) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "AI features are disabled for your account. Enable them in settings.",
        403
      );
      return;
    }

    // Check rate limits
    const rateLimitResult = await checkRateLimit("ai", user.id, user.tier);
    applyRateLimitHeaders(res, rateLimitResult, "ai");

    if (!rateLimitResult.success) {
      const rateLimitResponse = createRateLimitResponse(rateLimitResult, "ai");
      res.status(rateLimitResponse.statusCode).json(rateLimitResponse.body);
      return;
    }

    // Get the book
    const book = await getBookById(bookId, { includeChapters: false });
    if (!book) {
      sendError(res, ErrorCodes.NOT_FOUND, "Book not found", 404);
      return;
    }

    // Verify book belongs to user
    if (book.userId !== user.id) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "You do not have access to this book",
        403
      );
      return;
    }

    // Build book context for AI prompt
    const bookContext = buildBookContext(book);

    // Build ask input
    const askInput: AskInput = {
      question,
      book: bookContext,
    };

    if (selectedText) {
      askInput.selectedText = selectedText;
    }
    if (surroundingContext) {
      askInput.surroundingContext = surroundingContext;
    }
    if (conversationHistory && conversationHistory.length > 0) {
      askInput.conversationHistory = conversationHistory;
    }

    // Validate prompt input
    const inputValidation = validateAskInput(askInput);
    if (!inputValidation.valid) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        inputValidation.error ?? "Invalid input for question",
        400
      );
      return;
    }

    // Build user context for AI prompt
    const userContext: UserContext = {
      readingLevel: mapReadingLevel(user.readingLevel),
      language: user.preferredLang ?? "en",
    };
    if (user.firstName) {
      userContext.name = user.firstName;
    }

    // Generate prompts
    const prompts = generateAskPrompt(askInput, userContext);

    // Call AI to generate answer
    const aiResult = await completion(
      [{ role: "user", content: prompts.user }],
      {
        system: prompts.system,
        maxTokens: MAX_TOKENS,
        temperature: 0.7,
        userId: user.id,
        operation: "ask",
        metadata: {
          bookId,
          bookTitle: book.title,
          questionLength: question.length,
          hasSelectedText: !!selectedText,
          hasHistory: !!(conversationHistory && conversationHistory.length > 0),
          historyLength: conversationHistory?.length ?? 0,
          readingLevel: userContext.readingLevel,
        },
      }
    );

    // Parse AI response
    const parsedAnswer: AskOutput = parseAskResponse(aiResult.text);

    // Log AI usage to AIUsageLog table
    await db.aIUsageLog.create({
      data: {
        userId: user.id,
        operation: "ask",
        model: aiResult.model,
        provider: "anthropic",
        promptTokens: aiResult.usage.promptTokens,
        completionTokens: aiResult.usage.completionTokens,
        totalTokens: aiResult.usage.totalTokens,
        cost: aiResult.cost.totalCost,
        durationMs: aiResult.durationMs,
        success: true,
        bookId,
        metadata: {
          bookTitle: book.title,
          questionLength: question.length,
          hasSelectedText: !!selectedText,
          hasHistory: !!(conversationHistory && conversationHistory.length > 0),
          historyLength: conversationHistory?.length ?? 0,
          readingLevel: userContext.readingLevel,
          finishReason: aiResult.finishReason,
        },
      },
    });

    logger.info("Question answered", {
      userId: user.id,
      bookId,
      questionLength: question.length,
      hasSelectedText: !!selectedText,
      hasHistory: !!(conversationHistory && conversationHistory.length > 0),
      tokensUsed: aiResult.usage.totalTokens,
      cost: aiResult.cost.totalCost,
      durationMs: aiResult.durationMs,
    });

    // Return the answer
    sendSuccess(res, {
      answer: parsedAnswer.answer,
      supportingQuotes: parsedAnswer.supportingQuotes ?? [],
      additionalContext: parsedAnswer.additionalContext,
      relatedTopics: parsedAnswer.relatedTopics ?? [],
      suggestedFollowUps: parsedAnswer.suggestedFollowUps ?? [],
      bookId,
      question,
      usage: {
        promptTokens: aiResult.usage.promptTokens,
        completionTokens: aiResult.usage.completionTokens,
        totalTokens: aiResult.usage.totalTokens,
      },
      cost: {
        inputCost: aiResult.cost.inputCost,
        outputCost: aiResult.cost.outputCost,
        totalCost: aiResult.cost.totalCost,
      },
      durationMs: aiResult.durationMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error answering question", {
      userId,
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Log failed AI operation if it was an AI error
    if (message.includes("AI") || message.includes("anthropic")) {
      try {
        const user = await getUserByClerkId(userId);
        if (user) {
          await db.aIUsageLog.create({
            data: {
              userId: user.id,
              operation: "ask",
              model:
                process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022",
              provider: "anthropic",
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              cost: 0,
              durationMs: 0,
              success: false,
              errorCode: "AI_ERROR",
              errorMessage: message,
            },
          });
        }
      } catch {
        // Ignore logging errors
      }
    }

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to answer question. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  askRequestSchema,
  conversationMessageSchema,
  mapReadingLevel,
  buildBookContext,
  MIN_QUESTION_LENGTH,
  MAX_QUESTION_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_CONTEXT_LENGTH,
  MAX_HISTORY_MESSAGES,
  MAX_TOKENS,
  type AskRequest,
};
