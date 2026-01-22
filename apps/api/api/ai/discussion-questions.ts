/**
 * POST /api/ai/discussion-questions
 *
 * Generate thought-provoking discussion questions based on book content.
 *
 * This endpoint:
 * - Requires authentication
 * - Checks if user has AI enabled
 * - Enforces tier-based rate limits
 * - Uses the discussion questions prompt template
 * - Supports multiple question categories and difficulty levels
 * - Logs AI usage for billing/monitoring
 *
 * @example
 * ```bash
 * curl -X POST /api/ai/discussion-questions \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "bookId": "clxyz...",
 *     "contentFocus": "Chapter 5 explores the protagonist's moral dilemma...",
 *     "questionCount": 5,
 *     "categories": ["analysis", "reflection", "application"],
 *     "difficultyRange": { "min": 2, "max": 4 }
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
  generateDiscussionQuestionsPrompt,
  parseDiscussionQuestionsResponse,
  validateDiscussionQuestionsInput,
  type DiscussionQuestionsInput,
  type DiscussionQuestionsOutput,
  type UserContext,
  type ReadingLevel,
  type BookContext,
} from "@read-master/ai";
import type { Book } from "@read-master/database";

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum content focus length
 */
const MIN_CONTENT_LENGTH = 10;

/**
 * Maximum content focus length
 */
const MAX_CONTENT_LENGTH = 10000;

/**
 * Minimum question count
 */
const MIN_QUESTION_COUNT = 1;

/**
 * Maximum question count
 */
const MAX_QUESTION_COUNT = 15;

/**
 * Valid question categories
 */
const VALID_CATEGORIES = [
  "comprehension",
  "analysis",
  "application",
  "reflection",
  "creative",
] as const;

/**
 * Maximum tokens for AI response
 */
const MAX_TOKENS = 3000;

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Difficulty range schema
 */
const difficultyRangeSchema = z.object({
  min: z.number().int().min(1).max(5),
  max: z.number().int().min(1).max(5),
}).refine((data) => data.min <= data.max, {
  message: "Minimum difficulty must be less than or equal to maximum",
});

/**
 * Discussion questions request schema
 */
const discussionQuestionsRequestSchema = z.object({
  bookId: z.string().min(1, "Book ID is required"),
  contentFocus: z
    .string()
    .min(MIN_CONTENT_LENGTH, `Content must be at least ${MIN_CONTENT_LENGTH} characters`)
    .max(MAX_CONTENT_LENGTH, `Content cannot exceed ${MAX_CONTENT_LENGTH} characters`),
  questionCount: z
    .number()
    .int()
    .min(MIN_QUESTION_COUNT, `Must generate at least ${MIN_QUESTION_COUNT} question`)
    .max(MAX_QUESTION_COUNT, `Cannot generate more than ${MAX_QUESTION_COUNT} questions`)
    .default(5),
  categories: z
    .array(z.enum(VALID_CATEGORIES))
    .min(1, "At least one category is required")
    .optional(),
  difficultyRange: difficultyRangeSchema.optional(),
  specificTopics: z.array(z.string()).max(10, "Maximum 10 topics allowed").optional(),
});

/**
 * Discussion questions request type
 */
type DiscussionQuestionsRequest = z.infer<typeof discussionQuestionsRequestSchema>;

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
 * Handle discussion questions request
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
    const validationResult = discussionQuestionsRequestSchema.safeParse(req.body);
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
      contentFocus,
      questionCount,
      categories,
      difficultyRange,
      specificTopics,
    }: DiscussionQuestionsRequest = validationResult.data;

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

    // Build discussion questions input
    const discussionQuestionsInput: DiscussionQuestionsInput = {
      book: bookContext,
      contentFocus,
      questionCount,
    };

    if (categories && categories.length > 0) {
      discussionQuestionsInput.categories = categories;
    }
    if (difficultyRange) {
      discussionQuestionsInput.difficultyRange = difficultyRange;
    }
    if (specificTopics && specificTopics.length > 0) {
      discussionQuestionsInput.specificTopics = specificTopics;
    }

    // Validate prompt input
    const inputValidation = validateDiscussionQuestionsInput(discussionQuestionsInput);
    if (!inputValidation.valid) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        inputValidation.error ?? "Invalid input for discussion questions",
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
    const prompt = generateDiscussionQuestionsPrompt(
      discussionQuestionsInput,
      userContext
    );

    // Call AI to generate questions
    const aiResult = await completion(
      [{ role: "user", content: prompt }],
      {
        system: undefined, // Prompt already includes system context
        maxTokens: MAX_TOKENS,
        temperature: 0.8, // Higher temperature for more creative questions
        userId: user.id,
        operation: "discussion-questions",
        metadata: {
          bookId,
          bookTitle: book.title,
          contentLength: contentFocus.length,
          questionCount,
          categories: categories?.join(",") ?? "all",
          hasDifficultyRange: !!difficultyRange,
          hasTopics: !!(specificTopics && specificTopics.length > 0),
          topicsCount: specificTopics?.length ?? 0,
          readingLevel: userContext.readingLevel,
        },
      }
    );

    // Parse AI response
    const parsedResponse: DiscussionQuestionsOutput = parseDiscussionQuestionsResponse(
      aiResult.text
    );

    // Log AI usage to AIUsageLog table
    await db.aIUsageLog.create({
      data: {
        userId: user.id,
        operation: "discussion-questions",
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
          contentLength: contentFocus.length,
          questionCount,
          questionsGenerated: parsedResponse.questions.length,
          categories: categories?.join(",") ?? "all",
          hasDifficultyRange: !!difficultyRange,
          hasTopics: !!(specificTopics && specificTopics.length > 0),
          topicsCount: specificTopics?.length ?? 0,
          readingLevel: userContext.readingLevel,
          finishReason: aiResult.finishReason,
        },
      },
    });

    logger.info("Discussion questions generated", {
      userId: user.id,
      bookId,
      questionCount,
      questionsGenerated: parsedResponse.questions.length,
      tokensUsed: aiResult.usage.totalTokens,
      cost: aiResult.cost.totalCost,
      durationMs: aiResult.durationMs,
    });

    // Return the questions
    sendSuccess(res, {
      questions: parsedResponse.questions,
      guidanceNotes: parsedResponse.guidanceNotes ?? [],
      bookId,
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
    logger.error("Error generating discussion questions", {
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
              operation: "discussion-questions",
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
      "Failed to generate discussion questions. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  discussionQuestionsRequestSchema,
  difficultyRangeSchema,
  mapReadingLevel,
  buildBookContext,
  MIN_CONTENT_LENGTH,
  MAX_CONTENT_LENGTH,
  MIN_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
  VALID_CATEGORIES,
  MAX_TOKENS,
};
