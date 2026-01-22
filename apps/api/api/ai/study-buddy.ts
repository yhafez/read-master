/**
 * POST /api/ai/study-buddy
 *
 * Contextual AI chat assistant while reading.
 *
 * This endpoint:
 * - Requires authentication
 * - Checks if user has AI enabled
 * - Enforces tier-based rate limits
 * - Uses the study buddy prompt template for contextual conversation
 * - Maintains conversation history
 * - Aware of reading position and recent annotations
 * - Logs AI usage for billing/monitoring
 *
 * @example
 * ```bash
 * curl -X POST /api/ai/study-buddy \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "bookId": "clxyz...",
 *     "userMessage": "Can you explain this chapter in simple terms?",
 *     "currentText": "The author discusses...",
 *     "currentPosition": { "chapter": "Chapter 5", "page": 42, "percentage": 35 },
 *     "conversationHistory": [
 *       { "role": "user", "content": "What's the theme?", "timestamp": "2026-01-21T..." },
 *       { "role": "assistant", "content": "The theme is...", "timestamp": "2026-01-21T..." }
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
  generateStudyBuddyPrompt,
  parseStudyBuddyResponse,
  validateStudyBuddyInput,
  type StudyBuddyInput,
  type StudyBuddyOutput,
  type UserContext,
  type ReadingLevel,
  type BookContext,
} from "@read-master/ai";
import type { Book } from "@read-master/database";

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum message length
 */
const MIN_MESSAGE_LENGTH = 1;

/**
 * Maximum message length
 */
const MAX_MESSAGE_LENGTH = 1000;

/**
 * Maximum current text length
 */
const MAX_CURRENT_TEXT_LENGTH = 5000;

/**
 * Maximum conversation history messages
 */
const MAX_HISTORY_MESSAGES = 20; // 10 exchanges

/**
 * Maximum recent annotations
 */
const MAX_ANNOTATIONS = 10;

/**
 * Maximum tokens for AI response
 */
const MAX_TOKENS = 1500;

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Reading position schema
 */
const readingPositionSchema = z.object({
  chapter: z.string().optional(),
  page: z.number().int().positive().optional(),
  percentage: z.number().min(0).max(100).optional(),
});

/**
 * Conversation message schema
 */
const conversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(5000),
  timestamp: z.string(),
});

/**
 * Recent annotation schema
 */
const recentAnnotationSchema = z.object({
  text: z.string().min(1).max(1000),
  note: z.string().max(1000).optional(),
  type: z.enum(["highlight", "note"]),
});

/**
 * Study buddy request schema
 */
const studyBuddyRequestSchema = z.object({
  bookId: z.string().min(1, "Book ID is required"),
  userMessage: z
    .string()
    .min(MIN_MESSAGE_LENGTH, `Message must be at least ${MIN_MESSAGE_LENGTH} character`)
    .max(MAX_MESSAGE_LENGTH, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`),
  currentPosition: readingPositionSchema.optional(),
  currentText: z
    .string()
    .max(
      MAX_CURRENT_TEXT_LENGTH,
      `Current text cannot exceed ${MAX_CURRENT_TEXT_LENGTH} characters`
    )
    .optional(),
  conversationHistory: z
    .array(conversationMessageSchema)
    .max(MAX_HISTORY_MESSAGES, `Maximum ${MAX_HISTORY_MESSAGES} conversation messages allowed`)
    .optional(),
  recentAnnotations: z
    .array(recentAnnotationSchema)
    .max(MAX_ANNOTATIONS, `Maximum ${MAX_ANNOTATIONS} annotations allowed`)
    .optional(),
});

/**
 * Study buddy request type
 */
type StudyBuddyRequest = z.infer<typeof studyBuddyRequestSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map database reading level to AI reading level
 */
function mapReadingLevel(
  dbLevel: string | null | undefined
): ReadingLevel | undefined {
  if (!dbLevel) return undefined;

  const levelMap: Record<string, ReadingLevel> = {
    beginner: "beginner",
    elementary: "elementary",
    middle_school: "middle_school",
    high_school: "high_school",
    college: "college",
    advanced: "advanced",
  };

  return levelMap[dbLevel.toLowerCase()];
}

/**
 * Build book context from database book
 */
function buildBookContext(book: Book): BookContext {
  return {
    title: book.title,
    author: book.author ?? "Unknown Author",
    content: "", // Content will be fetched separately if needed
    genre: book.genre ?? undefined,
    description: book.description ?? undefined,
  };
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle study buddy request
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
    const validationResult = studyBuddyRequestSchema.safeParse(req.body);
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
      userMessage,
      currentPosition,
      currentText,
      conversationHistory,
      recentAnnotations,
    }: StudyBuddyRequest = validationResult.data;

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

    // Build study buddy input
    const studyBuddyInput: StudyBuddyInput = {
      book: bookContext,
      userMessage,
    };

    if (currentPosition) {
      studyBuddyInput.currentPosition = currentPosition;
    }
    if (currentText) {
      studyBuddyInput.currentText = currentText;
    }
    if (conversationHistory && conversationHistory.length > 0) {
      studyBuddyInput.conversationHistory = conversationHistory;
    }
    if (recentAnnotations && recentAnnotations.length > 0) {
      studyBuddyInput.recentAnnotations = recentAnnotations;
    }

    // Validate prompt input
    const inputValidation = validateStudyBuddyInput(studyBuddyInput);
    if (!inputValidation.valid) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        inputValidation.error ?? "Invalid input for study buddy",
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
    const prompt = generateStudyBuddyPrompt(studyBuddyInput, userContext);

    // Call AI to generate response
    const aiResult = await completion(
      [{ role: "user", content: prompt }],
      {
        system: undefined, // Prompt already includes system context
        maxTokens: MAX_TOKENS,
        temperature: 0.7,
        userId: user.id,
        operation: "study-buddy",
        metadata: {
          bookId,
          bookTitle: book.title,
          messageLength: userMessage.length,
          hasPosition: !!currentPosition,
          hasCurrentText: !!currentText,
          hasHistory: !!(conversationHistory && conversationHistory.length > 0),
          historyLength: conversationHistory?.length ?? 0,
          hasAnnotations: !!(recentAnnotations && recentAnnotations.length > 0),
          annotationsCount: recentAnnotations?.length ?? 0,
          readingLevel: userContext.readingLevel,
        },
      }
    );

    // Parse AI response
    const parsedResponse: StudyBuddyOutput = parseStudyBuddyResponse(
      aiResult.text
    );

    // Log AI usage to AIUsageLog table
    await db.aIUsageLog.create({
      data: {
        userId: user.id,
        operation: "study-buddy",
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
          messageLength: userMessage.length,
          hasPosition: !!currentPosition,
          hasCurrentText: !!currentText,
          hasHistory: !!(conversationHistory && conversationHistory.length > 0),
          historyLength: conversationHistory?.length ?? 0,
          hasAnnotations: !!(recentAnnotations && recentAnnotations.length > 0),
          annotationsCount: recentAnnotations?.length ?? 0,
          readingLevel: userContext.readingLevel,
          finishReason: aiResult.finishReason,
        },
      },
    });

    logger.info("Study buddy response generated", {
      userId: user.id,
      bookId,
      messageLength: userMessage.length,
      hasHistory: !!(conversationHistory && conversationHistory.length > 0),
      tokensUsed: aiResult.usage.totalTokens,
      cost: aiResult.cost.totalCost,
      durationMs: aiResult.durationMs,
    });

    // Return the response
    sendSuccess(res, {
      response: parsedResponse.response,
      suggestedTopics: parsedResponse.suggestedTopics ?? [],
      relatedPassages: parsedResponse.relatedPassages ?? [],
      discussionPrompts: parsedResponse.discussionPrompts ?? [],
      containsSpoilers: parsedResponse.containsSpoilers ?? false,
      bookId,
      userMessage,
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
    logger.error("Error generating study buddy response", {
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
              operation: "study-buddy",
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
      "Failed to generate study buddy response. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  studyBuddyRequestSchema,
  conversationMessageSchema,
  readingPositionSchema,
  recentAnnotationSchema,
  mapReadingLevel,
  buildBookContext,
  MIN_MESSAGE_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_CURRENT_TEXT_LENGTH,
  MAX_HISTORY_MESSAGES,
  MAX_ANNOTATIONS,
  MAX_TOKENS,
};
