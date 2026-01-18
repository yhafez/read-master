/**
 * POST /api/ai/assessment
 *
 * Generate comprehensive post-reading assessments covering all Bloom's
 * Taxonomy levels to measure reading comprehension.
 *
 * This endpoint:
 * - Requires authentication
 * - Checks if user has AI enabled
 * - Enforces tier-based rate limits
 * - Uses the assessment prompt template
 * - Generates questions at all Bloom's levels (remember, understand, apply, analyze, evaluate, create)
 * - Adapts difficulty to user's reading level
 * - Saves to Assessment table
 * - Logs AI usage for billing/monitoring
 *
 * @example
 * ```bash
 * curl -X POST /api/ai/assessment \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "bookId": "clxyz...",
 *     "assessmentType": "standard",
 *     "questionCount": 10,
 *     "focusLevels": ["analyze", "evaluate"]
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
  generateAssessmentPrompt,
  parseAssessmentResponse,
  validateAssessmentInput,
  type AssessmentInput,
  type AssessmentOutput,
  type AssessmentQuestion,
  type UserContext,
  type ReadingLevel,
  type BookContext,
  type BloomLevel,
} from "@read-master/ai";
import type { Book, Prisma } from "@read-master/database";

// ============================================================================
// Constants
// ============================================================================

/**
 * Valid assessment types
 */
const ASSESSMENT_TYPES = ["quick", "standard", "comprehensive"] as const;

/**
 * Valid Bloom's levels
 */
const BLOOM_LEVELS = [
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
  "create",
] as const;

/**
 * Default question counts by assessment type
 */
const DEFAULT_QUESTION_COUNTS: Record<
  (typeof ASSESSMENT_TYPES)[number],
  number
> = {
  quick: 5,
  standard: 10,
  comprehensive: 20,
};

/**
 * Maximum custom question count
 */
const MAX_QUESTION_COUNT = 30;

/**
 * Minimum custom question count
 */
const MIN_QUESTION_COUNT = 3;

/**
 * Maximum tokens for AI response
 */
const MAX_TOKENS = 8192;

/**
 * Minimum book content length for assessment
 */
const MIN_CONTENT_LENGTH = 100;

/**
 * Maximum book content length to send to AI
 */
const MAX_CONTENT_LENGTH = 100000;

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Assessment request validation schema
 */
const assessmentRequestSchema = z.object({
  bookId: z
    .string()
    .min(1, "Book ID is required")
    .regex(/^c[a-z0-9]+$/, "Invalid book ID format"),
  assessmentType: z.enum(ASSESSMENT_TYPES).default("standard"),
  questionCount: z
    .number()
    .int()
    .min(MIN_QUESTION_COUNT)
    .max(MAX_QUESTION_COUNT)
    .optional(),
  focusLevels: z.array(z.enum(BLOOM_LEVELS)).optional(),
  chapterIds: z.array(z.string()).optional(),
});

/**
 * Type for validated request
 */
type AssessmentRequest = z.infer<typeof assessmentRequestSchema>;

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
function buildBookContext(book: Book, bookContent: string): BookContext {
  const context: BookContext = {
    title: book.title,
    author: book.author ?? "Unknown Author",
    content: bookContent,
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
 * Get the effective question count based on type and custom value
 */
function getQuestionCount(
  assessmentType: (typeof ASSESSMENT_TYPES)[number],
  customCount?: number
): number {
  if (customCount !== undefined) {
    return Math.min(
      Math.max(customCount, MIN_QUESTION_COUNT),
      MAX_QUESTION_COUNT
    );
  }
  return DEFAULT_QUESTION_COUNTS[assessmentType];
}

/**
 * Map question type string to database enum format
 */
function mapQuestionTypeToDb(
  type: string
): "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY" | "FILL_BLANK" {
  const typeMap: Record<
    string,
    "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY" | "FILL_BLANK"
  > = {
    multiple_choice: "MULTIPLE_CHOICE",
    true_false: "TRUE_FALSE",
    short_answer: "SHORT_ANSWER",
    essay: "ESSAY",
    fill_blank: "FILL_BLANK",
  };
  return typeMap[type] ?? "MULTIPLE_CHOICE";
}

/**
 * Build question objects for database storage
 */
function buildQuestionsForDb(
  questions: AssessmentQuestion[]
): Record<string, unknown>[] {
  return questions.map((q) => ({
    id: q.id,
    type: mapQuestionTypeToDb(q.type),
    question: q.question,
    options: q.options?.map((opt) => ({
      id: opt.id,
      text: opt.text,
    })),
    correctAnswer: q.correctAnswer,
    modelAnswer: q.modelAnswer,
    explanation: q.explanation,
    difficulty: q.difficulty,
    bloomsLevel: q.bloomLevel,
    points: q.points,
    rubric: q.rubric,
  }));
}

/**
 * Calculate Bloom's breakdown as percentages
 */
function calculateBloomsBreakdown(
  questions: AssessmentQuestion[]
): Record<string, number> {
  if (questions.length === 0) return {};

  const counts: Record<string, number> = {};
  for (const q of questions) {
    counts[q.bloomLevel] = (counts[q.bloomLevel] ?? 0) + 1;
  }

  const breakdown: Record<string, number> = {};
  for (const [level, count] of Object.entries(counts)) {
    breakdown[level] = Math.round((count / questions.length) * 100);
  }

  return breakdown;
}

/**
 * Fetch book content from database or storage
 * For now, uses description as content. In production, would fetch from R2.
 */
async function fetchBookContent(book: Book): Promise<string> {
  // In a real implementation, this would:
  // 1. Check if book content is cached
  // 2. Fetch from R2 storage if needed
  // 3. Parse EPUB/PDF to extract text
  // For now, we use the description as a placeholder
  // This should be replaced with actual content fetching

  let content = book.description ?? "";

  // If we have chapters, we could fetch their content here
  // For now, just use what we have
  if (content.length < MIN_CONTENT_LENGTH) {
    content = `Book: "${book.title}" by ${book.author ?? "Unknown Author"}. ${content}`;
  }

  // Truncate if too long
  if (content.length > MAX_CONTENT_LENGTH) {
    content = content.slice(0, MAX_CONTENT_LENGTH);
  }

  return content;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle assessment generation request
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
    const validationResult = assessmentRequestSchema.safeParse(req.body);
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
      assessmentType,
      questionCount: customQuestionCount,
      focusLevels,
      chapterIds,
    }: AssessmentRequest = validationResult.data;

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
    const book = await getBookById(bookId, { includeChapters: true });
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

    // Fetch book content
    const bookContent = await fetchBookContent(book);

    if (bookContent.length < MIN_CONTENT_LENGTH) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        `Book content is too short for assessment generation. Need at least ${MIN_CONTENT_LENGTH} characters.`,
        400
      );
      return;
    }

    // Build book context for AI prompt
    const bookContext = buildBookContext(book, bookContent);

    // Determine question count
    const questionCount = getQuestionCount(assessmentType, customQuestionCount);

    // Build assessment input
    const assessmentInput: AssessmentInput = {
      book: bookContext,
      assessmentType,
      questionCount,
      ...(focusLevels && focusLevels.length > 0
        ? { focusLevels: focusLevels as BloomLevel[] }
        : {}),
    };

    // Validate prompt input
    const inputValidation = validateAssessmentInput(assessmentInput);
    if (!inputValidation.valid) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        inputValidation.error ?? "Invalid input for assessment generation",
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
    const prompts = generateAssessmentPrompt(assessmentInput, userContext);

    // Call AI to generate assessment
    const aiResult = await completion(
      [{ role: "user", content: prompts.user }],
      {
        system: prompts.system,
        maxTokens: MAX_TOKENS,
        temperature: 0.7,
        userId: user.id,
        operation: "assessment",
        metadata: {
          bookId,
          bookTitle: book.title,
          assessmentType,
          questionCount,
          focusLevels,
          readingLevel: userContext.readingLevel,
        },
      }
    );

    // Parse AI response
    const parsedAssessment: AssessmentOutput = parseAssessmentResponse(
      aiResult.text
    );

    // Validate we got questions
    if (
      !parsedAssessment.questions ||
      parsedAssessment.questions.length === 0
    ) {
      logger.error("Assessment generation returned no questions", {
        userId: user.id,
        bookId,
        assessmentType,
        rawResponse: aiResult.text.slice(0, 500),
      });
      sendError(
        res,
        ErrorCodes.INTERNAL_ERROR,
        "Failed to generate assessment questions. Please try again.",
        500
      );
      return;
    }

    // Build questions for database storage
    const questionsForDb = buildQuestionsForDb(parsedAssessment.questions);

    // Calculate Bloom's breakdown
    const bloomsBreakdown = calculateBloomsBreakdown(
      parsedAssessment.questions
    );

    // Store in Assessment table
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        bookId,
        type: "BOOK_ASSESSMENT",
        chapterIds: chapterIds ?? [],
        questions: questionsForDb as Prisma.InputJsonValue,
        answers: [] as Prisma.InputJsonValue,
        totalQuestions: parsedAssessment.questions.length,
        correctAnswers: 0,
        bloomsBreakdown: bloomsBreakdown as Prisma.InputJsonValue,
        generatedBy: aiResult.model,
        tokensUsed: aiResult.usage.totalTokens,
      },
    });

    // Log AI usage to AIUsageLog table
    await db.aIUsageLog.create({
      data: {
        userId: user.id,
        operation: "assessment",
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
          assessmentType,
          questionCount: parsedAssessment.questions.length,
          focusLevels,
          readingLevel: userContext.readingLevel,
          assessmentId: assessment.id,
          finishReason: aiResult.finishReason,
          bloomsBreakdown,
          totalPoints: parsedAssessment.totalPoints,
          estimatedTime: parsedAssessment.estimatedTime,
        },
      },
    });

    logger.info("Assessment generated", {
      userId: user.id,
      bookId,
      assessmentId: assessment.id,
      assessmentType,
      questionCount: parsedAssessment.questions.length,
      tokensUsed: aiResult.usage.totalTokens,
      cost: aiResult.cost.totalCost,
      durationMs: aiResult.durationMs,
      bloomsBreakdown,
    });

    // Return the assessment
    sendSuccess(res, {
      id: assessment.id,
      title: parsedAssessment.title,
      description: parsedAssessment.description,
      estimatedTime: parsedAssessment.estimatedTime,
      totalPoints: parsedAssessment.totalPoints,
      questions: parsedAssessment.questions.map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        bloomLevel: q.bloomLevel,
        difficulty: q.difficulty,
        points: q.points,
        options: q.options,
        // Do not include correctAnswer or explanation in response
        // These are revealed after submission
      })),
      bloomDistribution: parsedAssessment.bloomDistribution,
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
    logger.error("Error generating assessment", {
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
              operation: "assessment",
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
      "Failed to generate assessment. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  assessmentRequestSchema,
  mapReadingLevel,
  buildBookContext,
  getQuestionCount,
  mapQuestionTypeToDb,
  buildQuestionsForDb,
  calculateBloomsBreakdown,
  fetchBookContent,
  ASSESSMENT_TYPES,
  BLOOM_LEVELS,
  DEFAULT_QUESTION_COUNTS,
  MAX_QUESTION_COUNT,
  MIN_QUESTION_COUNT,
  MAX_TOKENS,
  MIN_CONTENT_LENGTH,
  MAX_CONTENT_LENGTH,
  type AssessmentRequest,
};
