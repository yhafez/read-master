/**
 * POST /api/ai/assess-difficulty
 *
 * Analyze book reading difficulty and provide reader level matching.
 *
 * This endpoint:
 * - Requires authentication
 * - Checks if user has AI enabled
 * - Enforces tier-based rate limits
 * - Uses the assess difficulty prompt template
 * - Analyzes vocabulary, syntax, concept density, and more
 * - Provides personalized reader matching and recommendations
 * - Logs AI usage for billing/monitoring
 *
 * @example
 * ```bash
 * curl -X POST /api/ai/assess-difficulty \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "bookId": "clxyz...",
 *     "sampleText": "The protagonist contemplated the existential ramifications...",
 *     "userReadingLevel": "college",
 *     "readingGoals": ["improve vocabulary", "challenge myself"]
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
  generateAssessDifficultyPrompt,
  parseAssessDifficultyResponse,
  validateAssessDifficultyInput,
  type AssessDifficultyInput,
  type AssessDifficultyOutput,
  type UserContext,
  type ReadingLevel,
  type BookContext,
} from "@read-master/ai";
import type { Book } from "@read-master/database";

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum sample text length
 */
const MIN_SAMPLE_LENGTH = 100;

/**
 * Maximum sample text length
 */
const MAX_SAMPLE_LENGTH = 5000;

/**
 * Maximum reading goals
 */
const MAX_READING_GOALS = 10;

/**
 * Maximum tokens for AI response
 */
const MAX_TOKENS = 2500;

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Assess difficulty request schema
 */
const assessDifficultyRequestSchema = z.object({
  bookId: z.string().min(1, "Book ID is required"),
  sampleText: z
    .string()
    .min(
      MIN_SAMPLE_LENGTH,
      `Sample text must be at least ${MIN_SAMPLE_LENGTH} characters for accurate analysis`
    )
    .max(
      MAX_SAMPLE_LENGTH,
      `Sample text cannot exceed ${MAX_SAMPLE_LENGTH} characters`
    ),
  userReadingLevel: z
    .enum([
      "beginner",
      "elementary",
      "middle_school",
      "high_school",
      "college",
      "advanced",
    ])
    .optional(),
  readingGoals: z
    .array(z.string().min(1).max(200))
    .max(
      MAX_READING_GOALS,
      `Maximum ${MAX_READING_GOALS} reading goals allowed`
    )
    .optional(),
});

/**
 * Assess difficulty request type
 */
type AssessDifficultyRequest = z.infer<typeof assessDifficultyRequestSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map request reading level to AI reading level (already matches)
 */
function mapRequestReadingLevel(
  reqLevel: string | undefined
): ReadingLevel | undefined {
  if (!reqLevel) return undefined;
  return reqLevel as ReadingLevel;
}

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
  const context: BookContext = {
    title: book.title,
    author: book.author ?? "Unknown Author",
    content: "", // Content will be fetched separately if needed
  };
  if (book.genre) context.genre = book.genre;
  if (book.description) context.description = book.description;
  return context;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle assess difficulty request
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
    const validationResult = assessDifficultyRequestSchema.safeParse(req.body);
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
      sampleText,
      userReadingLevel,
      readingGoals,
    }: AssessDifficultyRequest = validationResult.data;

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

    // Build assess difficulty input
    const assessDifficultyInput: AssessDifficultyInput = {
      book: bookContext,
      sampleText,
    };

    // Use provided user reading level, or fallback to user's profile level
    const effectiveUserLevel =
      mapRequestReadingLevel(userReadingLevel) ??
      mapReadingLevel(user.readingLevel);

    if (effectiveUserLevel) {
      assessDifficultyInput.userReadingLevel = effectiveUserLevel;
    }

    if (readingGoals && readingGoals.length > 0) {
      assessDifficultyInput.readingGoals = readingGoals;
    }

    // Validate prompt input
    const inputValidation = validateAssessDifficultyInput(
      assessDifficultyInput
    );
    if (!inputValidation.valid) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        inputValidation.error ?? "Invalid input for difficulty assessment",
        400
      );
      return;
    }

    // Build user context for AI prompt
    const userContext: UserContext = {
      readingLevel: effectiveUserLevel ?? "college",
      language: user.preferredLang ?? "en",
    };
    if (user.firstName) {
      userContext.name = user.firstName;
    }

    // Generate prompts
    const prompt = generateAssessDifficultyPrompt(
      assessDifficultyInput,
      userContext
    );

    // Call AI to assess difficulty
    const aiResult = await completion([{ role: "user", content: prompt }], {
      maxTokens: MAX_TOKENS,
      temperature: 0.5, // Lower temperature for more consistent analysis
      userId: user.id,
      operation: "assess-difficulty",
      metadata: {
        bookId,
        bookTitle: book.title,
        sampleLength: sampleText.length,
        hasUserLevel: !!effectiveUserLevel,
        userLevel: effectiveUserLevel ?? "unknown",
        hasGoals: !!(readingGoals && readingGoals.length > 0),
        goalsCount: readingGoals?.length ?? 0,
        readingLevel: userContext.readingLevel,
      },
    });

    // Parse AI response
    const parsedResponse: AssessDifficultyOutput =
      parseAssessDifficultyResponse(aiResult.text);

    // Log AI usage to AIUsageLog table
    await db.aIUsageLog.create({
      data: {
        userId: user.id,
        operation: "assess-difficulty",
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
          sampleLength: sampleText.length,
          suggestedLevel: parsedResponse.suggestedLevel,
          overallDifficulty: parsedResponse.metrics.overallDifficulty,
          hasUserLevel: !!effectiveUserLevel,
          userLevel: effectiveUserLevel ?? "unknown",
          hasGoals: !!(readingGoals && readingGoals.length > 0),
          goalsCount: readingGoals?.length ?? 0,
          readingLevel: userContext.readingLevel,
          finishReason: aiResult.finishReason,
        },
      },
    });

    logger.info("Difficulty assessment completed", {
      userId: user.id,
      bookId,
      suggestedLevel: parsedResponse.suggestedLevel,
      overallDifficulty: parsedResponse.metrics.overallDifficulty,
      tokensUsed: aiResult.usage.totalTokens,
      cost: aiResult.cost.totalCost,
      durationMs: aiResult.durationMs,
    });

    // Return the assessment
    sendSuccess(res, {
      metrics: parsedResponse.metrics,
      suggestedLevel: parsedResponse.suggestedLevel,
      estimatedReadingTime: parsedResponse.estimatedReadingTime,
      readerMatch: parsedResponse.readerMatch,
      challengingAspects: parsedResponse.challengingAspects,
      accessibleAspects: parsedResponse.accessibleAspects,
      recommendations: parsedResponse.recommendations,
      comparableBooks: parsedResponse.comparableBooks,
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
    logger.error("Error assessing difficulty", {
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
              operation: "assess-difficulty",
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
      "Failed to assess difficulty. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  assessDifficultyRequestSchema,
  mapRequestReadingLevel,
  mapReadingLevel,
  buildBookContext,
  MIN_SAMPLE_LENGTH,
  MAX_SAMPLE_LENGTH,
  MAX_READING_GOALS,
  MAX_TOKENS,
};
