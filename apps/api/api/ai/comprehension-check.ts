/**
 * POST /api/ai/comprehension-check
 *
 * Generate quick comprehension check questions during reading
 * to help readers verify their understanding.
 *
 * This endpoint:
 * - Requires authentication
 * - Checks if user has AI enabled
 * - Enforces tier-based rate limits
 * - Uses the comprehension-check prompt template
 * - Tracks questions in the Assessment table (CHAPTER_CHECK type)
 * - Logs AI usage for billing/monitoring
 *
 * @example
 * ```bash
 * curl -X POST /api/ai/comprehension-check \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "bookId": "clxyz...",
 *     "recentContent": "The protagonist walked through the forest...",
 *     "questionType": "multiple_choice"
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
  generateComprehensionCheckPrompt,
  parseComprehensionCheckResponse,
  validateComprehensionCheckInput,
  type ComprehensionCheckInput,
  type ComprehensionCheckOutput,
  type UserContext,
  type ReadingLevel,
  type BookContext,
} from "@read-master/ai";
import type { Book, Prisma } from "@read-master/database";

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum content length for comprehension check
 */
const MIN_CONTENT_LENGTH = 50;

/**
 * Maximum content length
 */
const MAX_CONTENT_LENGTH = 10000;

/**
 * Maximum tokens for AI response
 */
const MAX_TOKENS = 1024;

/**
 * Valid question types
 */
const QUESTION_TYPES = [
  "multiple_choice",
  "true_false",
  "short_answer",
] as const;

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Comprehension check request validation schema
 */
const comprehensionCheckRequestSchema = z.object({
  bookId: z
    .string()
    .min(1, "Book ID is required")
    .regex(/^c[a-z0-9]+$/, "Invalid book ID format"),
  recentContent: z
    .string()
    .min(
      MIN_CONTENT_LENGTH,
      `Content must be at least ${MIN_CONTENT_LENGTH} characters`
    )
    .max(
      MAX_CONTENT_LENGTH,
      `Content must be at most ${MAX_CONTENT_LENGTH} characters`
    ),
  questionType: z.enum(QUESTION_TYPES).optional().default("multiple_choice"),
  chapterId: z.string().optional(),
});

/**
 * Type for validated request
 */
type ComprehensionCheckRequest = z.infer<
  typeof comprehensionCheckRequestSchema
>;

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

/**
 * Map question type to uppercase enum format for database storage
 */
function mapQuestionTypeToDb(
  type: string
): "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" {
  const typeMap: Record<
    string,
    "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER"
  > = {
    multiple_choice: "MULTIPLE_CHOICE",
    true_false: "TRUE_FALSE",
    short_answer: "SHORT_ANSWER",
  };
  return typeMap[type] ?? "MULTIPLE_CHOICE";
}

/**
 * Build question object for Assessment storage
 */
function buildQuestionObject(
  parsed: ComprehensionCheckOutput
): Record<string, unknown> {
  return {
    id: "q1",
    type: mapQuestionTypeToDb(parsed.type),
    question: parsed.question,
    options: parsed.options?.map((opt) => ({
      id: opt.id,
      text: opt.text,
    })),
    correctAnswer: parsed.correctAnswer,
    explanation: parsed.explanation,
    difficulty: parsed.difficulty,
    textReference: parsed.textReference,
    bloomsLevel: "understand", // Comprehension checks focus on understanding
  };
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle comprehension check request
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
    const validationResult = comprehensionCheckRequestSchema.safeParse(
      req.body
    );
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
      recentContent,
      questionType,
      chapterId,
    }: ComprehensionCheckRequest = validationResult.data;

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

    // Build comprehension check input
    const checkInput: ComprehensionCheckInput = {
      recentContent,
      book: bookContext,
      questionType: questionType ?? "multiple_choice",
    };

    // Validate prompt input
    const inputValidation = validateComprehensionCheckInput(checkInput);
    if (!inputValidation.valid) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        inputValidation.error ?? "Invalid input for comprehension check",
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
    const prompts = generateComprehensionCheckPrompt(checkInput, userContext);

    // Call AI to generate comprehension check
    const aiResult = await completion(
      [{ role: "user", content: prompts.user }],
      {
        system: prompts.system,
        maxTokens: MAX_TOKENS,
        temperature: 0.7,
        userId: user.id,
        operation: "comprehension_check",
        metadata: {
          bookId,
          bookTitle: book.title,
          contentLength: recentContent.length,
          questionType,
          readingLevel: userContext.readingLevel,
        },
      }
    );

    // Parse AI response
    const parsedQuestion: ComprehensionCheckOutput =
      parseComprehensionCheckResponse(aiResult.text);

    // Build question object for storage
    const questionObject = buildQuestionObject(parsedQuestion);

    // Store in Assessment table with CHAPTER_CHECK type
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        bookId,
        type: "CHAPTER_CHECK",
        chapterIds: chapterId ? [chapterId] : [],
        questions: [questionObject] as Prisma.InputJsonValue,
        answers: [] as Prisma.InputJsonValue,
        totalQuestions: 1,
        correctAnswers: 0,
        bloomsBreakdown: { understand: 100 } as Prisma.InputJsonValue,
        generatedBy: aiResult.model,
        tokensUsed: aiResult.usage.totalTokens,
      },
    });

    // Log AI usage to AIUsageLog table
    await db.aIUsageLog.create({
      data: {
        userId: user.id,
        operation: "comprehension_check",
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
          contentLength: recentContent.length,
          questionType,
          readingLevel: userContext.readingLevel,
          assessmentId: assessment.id,
          finishReason: aiResult.finishReason,
        },
      },
    });

    logger.info("Comprehension check generated", {
      userId: user.id,
      bookId,
      assessmentId: assessment.id,
      questionType: parsedQuestion.type,
      contentLength: recentContent.length,
      tokensUsed: aiResult.usage.totalTokens,
      cost: aiResult.cost.totalCost,
      durationMs: aiResult.durationMs,
    });

    // Return the comprehension check
    sendSuccess(res, {
      id: assessment.id,
      question: parsedQuestion.question,
      type: parsedQuestion.type,
      options: parsedQuestion.options ?? [],
      difficulty: parsedQuestion.difficulty,
      textReference: parsedQuestion.textReference,
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
    logger.error("Error generating comprehension check", {
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
              operation: "comprehension_check",
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
      "Failed to generate comprehension check. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  comprehensionCheckRequestSchema,
  mapReadingLevel,
  buildBookContext,
  mapQuestionTypeToDb,
  buildQuestionObject,
  MIN_CONTENT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_TOKENS,
  QUESTION_TYPES,
  type ComprehensionCheckRequest,
};
