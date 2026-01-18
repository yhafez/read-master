/**
 * POST /api/ai/grade-answer
 *
 * AI-powered grading for short answer and essay responses with detailed feedback.
 *
 * This endpoint:
 * - Requires authentication
 * - Checks if user has AI enabled
 * - Enforces tier-based rate limits
 * - Uses the gradeAnswer prompt template
 * - Grades user answers fairly considering understanding over exact wording
 * - Provides detailed feedback with strengths and areas for improvement
 * - Updates assessment record with graded answer
 * - Updates user comprehension data (UserStats)
 * - Logs AI usage for billing/monitoring
 *
 * @example
 * ```bash
 * curl -X POST /api/ai/grade-answer \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "assessmentId": "clxyz...",
 *     "questionId": "q1",
 *     "question": "What is the main theme?",
 *     "expectedAnswer": "The main theme is perseverance.",
 *     "userAnswer": "It is about never giving up.",
 *     "maxPoints": 10
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
import { db, getUserByClerkId } from "../../src/services/db.js";
import { completion, isAIAvailable } from "../../src/services/ai.js";
import {
  generateGradeAnswerPrompt,
  parseGradeAnswerResponse,
  validateGradeAnswerInput,
  percentageToLetterGrade,
  type GradeAnswerInput,
  type GradeAnswerOutput,
  type UserContext,
  type ReadingLevel,
} from "@read-master/ai";
import type { Prisma, Assessment } from "@read-master/database";

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum tokens for AI response
 */
const MAX_TOKENS = 2048;

/**
 * Minimum user answer length
 */
const MIN_ANSWER_LENGTH = 1;

/**
 * Maximum user answer length
 */
const MAX_ANSWER_LENGTH = 10000;

/**
 * Minimum question length
 */
const MIN_QUESTION_LENGTH = 5;

/**
 * Maximum question length
 */
const MAX_QUESTION_LENGTH = 5000;

/**
 * Maximum expected answer length
 */
const MAX_EXPECTED_ANSWER_LENGTH = 10000;

/**
 * Maximum points allowed
 */
const MAX_POINTS = 100;

/**
 * Minimum points allowed
 */
const MIN_POINTS = 1;

/**
 * Maximum rubric items
 */
const MAX_RUBRIC_ITEMS = 10;

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Rubric item validation schema
 */
const rubricItemSchema = z.object({
  criterion: z.string().min(1, "Criterion is required").max(500),
  maxPoints: z.number().int().min(1).max(MAX_POINTS),
  description: z.string().max(1000).optional(),
});

/**
 * Grade answer request validation schema
 */
const gradeAnswerRequestSchema = z.object({
  assessmentId: z
    .string()
    .regex(/^c[a-z0-9]+$/, "Invalid assessment ID format")
    .optional(),
  questionId: z.string().min(1, "Question ID is required").optional(),
  question: z
    .string()
    .min(
      MIN_QUESTION_LENGTH,
      `Question must be at least ${MIN_QUESTION_LENGTH} characters`
    )
    .max(
      MAX_QUESTION_LENGTH,
      `Question cannot exceed ${MAX_QUESTION_LENGTH} characters`
    ),
  expectedAnswer: z
    .string()
    .min(1, "Expected answer is required")
    .max(
      MAX_EXPECTED_ANSWER_LENGTH,
      `Expected answer cannot exceed ${MAX_EXPECTED_ANSWER_LENGTH} characters`
    ),
  userAnswer: z
    .string()
    .min(
      MIN_ANSWER_LENGTH,
      `Answer must be at least ${MIN_ANSWER_LENGTH} character`
    )
    .max(
      MAX_ANSWER_LENGTH,
      `Answer cannot exceed ${MAX_ANSWER_LENGTH} characters`
    ),
  maxPoints: z
    .number()
    .int("Max points must be an integer")
    .min(MIN_POINTS, `Max points must be at least ${MIN_POINTS}`)
    .max(MAX_POINTS, `Max points cannot exceed ${MAX_POINTS}`),
  rubric: z
    .array(rubricItemSchema)
    .max(
      MAX_RUBRIC_ITEMS,
      `Rubric cannot have more than ${MAX_RUBRIC_ITEMS} items`
    )
    .optional(),
  bookTitle: z.string().max(500).optional(),
  bookId: z
    .string()
    .regex(/^c[a-z0-9]+$/, "Invalid book ID format")
    .optional(),
});

/**
 * Type for validated request
 */
type GradeAnswerRequest = z.infer<typeof gradeAnswerRequestSchema>;

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
 * Build GradeAnswerInput from validated request
 */
function buildGradeAnswerInput(request: GradeAnswerRequest): GradeAnswerInput {
  const input: GradeAnswerInput = {
    question: request.question,
    expectedAnswer: request.expectedAnswer,
    userAnswer: request.userAnswer,
    maxPoints: request.maxPoints,
  };

  if (request.rubric !== undefined && request.rubric.length > 0) {
    // Map rubric items, filtering out undefined descriptions
    input.rubric = request.rubric.map((item) => {
      const rubricItem: {
        criterion: string;
        maxPoints: number;
        description?: string;
      } = {
        criterion: item.criterion,
        maxPoints: item.maxPoints,
      };
      if (item.description !== undefined) {
        rubricItem.description = item.description;
      }
      return rubricItem;
    });
  }
  if (request.bookTitle !== undefined) {
    input.bookTitle = request.bookTitle;
  }

  return input;
}

/**
 * Build answer object for database storage
 */
function buildAnswerForDb(
  questionId: string,
  userAnswer: string,
  gradingResult: GradeAnswerOutput
): Record<string, unknown> {
  return {
    questionId,
    userAnswer,
    isCorrect: gradingResult.isCorrect,
    isPartiallyCorrect: gradingResult.isPartiallyCorrect,
    pointsAwarded: gradingResult.pointsAwarded,
    maxPoints: gradingResult.maxPoints,
    percentage: gradingResult.percentage,
    feedback: gradingResult.feedback,
    strengths: gradingResult.strengths,
    improvements: gradingResult.improvements,
    suggestedRevision: gradingResult.suggestedRevision,
    rubricScores: gradingResult.rubricScores,
    gradedAt: new Date().toISOString(),
  };
}

/**
 * Calculate updated assessment score from answers
 */
function calculateAssessmentScore(
  answers: Array<{ pointsAwarded?: number; maxPoints?: number }>
): { totalPoints: number; maxPoints: number; percentage: number } {
  let totalPoints = 0;
  let maxPoints = 0;

  for (const answer of answers) {
    if (
      typeof answer.pointsAwarded === "number" &&
      typeof answer.maxPoints === "number"
    ) {
      totalPoints += answer.pointsAwarded;
      maxPoints += answer.maxPoints;
    }
  }

  const percentage =
    maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

  return { totalPoints, maxPoints, percentage };
}

/**
 * Update user's comprehension statistics
 */
async function updateUserComprehensionStats(
  userId: string,
  newScore: number
): Promise<void> {
  // Get or create user stats
  const stats = await db.userStats.findUnique({
    where: { userId },
  });

  if (!stats) {
    // Create stats if not exists
    await db.userStats.create({
      data: {
        userId,
        assessmentsCompleted: 1,
        averageScore: newScore,
      },
    });
    return;
  }

  // Calculate new average score
  const totalAssessments = stats.assessmentsCompleted + 1;
  const currentAverage = stats.averageScore ?? 0;
  const newAverage =
    (currentAverage * stats.assessmentsCompleted + newScore) / totalAssessments;

  await db.userStats.update({
    where: { userId },
    data: {
      assessmentsCompleted: totalAssessments,
      averageScore: Math.round(newAverage * 100) / 100, // Round to 2 decimal places
    },
  });
}

/**
 * Get assessment by ID with validation
 */
async function getAssessmentById(
  assessmentId: string,
  userId: string
): Promise<Assessment | null> {
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
  });

  if (!assessment || assessment.userId !== userId) {
    return null;
  }

  return assessment;
}

/**
 * Update assessment with graded answer
 */
async function updateAssessmentWithAnswer(
  assessmentId: string,
  questionId: string,
  answerData: Record<string, unknown>,
  existingAnswers: unknown[]
): Promise<{ score: number; isComplete: boolean }> {
  // Find existing answer for this question or add new
  const updatedAnswers = [...existingAnswers];
  const existingIndex = updatedAnswers.findIndex(
    (a) => (a as Record<string, unknown>).questionId === questionId
  );

  if (existingIndex >= 0) {
    updatedAnswers[existingIndex] = answerData;
  } else {
    updatedAnswers.push(answerData);
  }

  // Calculate new score
  const scoreResult = calculateAssessmentScore(
    updatedAnswers as Array<{ pointsAwarded?: number; maxPoints?: number }>
  );

  // Get assessment to check total questions
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    select: { totalQuestions: true },
  });

  const isComplete = assessment
    ? updatedAnswers.length >= assessment.totalQuestions
    : false;

  // Update assessment
  await db.assessment.update({
    where: { id: assessmentId },
    data: {
      answers: updatedAnswers as Prisma.InputJsonValue,
      score: scoreResult.percentage,
      correctAnswers: updatedAnswers.filter(
        (a) => (a as Record<string, unknown>).isCorrect
      ).length,
      ...(isComplete ? { completedAt: new Date() } : {}),
    },
  });

  return { score: scoreResult.percentage, isComplete };
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle grade answer request
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
    const validationResult = gradeAnswerRequestSchema.safeParse(req.body);
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

    const request: GradeAnswerRequest = validationResult.data;

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

    // Validate assessment if provided
    let assessment: Assessment | null = null;
    if (request.assessmentId) {
      assessment = await getAssessmentById(request.assessmentId, user.id);
      if (!assessment) {
        sendError(
          res,
          ErrorCodes.NOT_FOUND,
          "Assessment not found or you do not have access",
          404
        );
        return;
      }
    }

    // Build input for AI prompt
    const gradeInput = buildGradeAnswerInput(request);

    // Validate prompt input
    const inputValidation = validateGradeAnswerInput(gradeInput);
    if (!inputValidation.valid) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        inputValidation.error ?? "Invalid input for grading",
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
    const prompts = generateGradeAnswerPrompt(gradeInput, userContext);

    // Call AI to grade answer
    const aiResult = await completion(
      [{ role: "user", content: prompts.user }],
      {
        system: prompts.system,
        maxTokens: MAX_TOKENS,
        temperature: 0.3, // Lower temperature for more consistent grading
        userId: user.id,
        operation: "grade_answer",
        metadata: {
          assessmentId: request.assessmentId,
          questionId: request.questionId,
          bookId: request.bookId,
          bookTitle: request.bookTitle,
          maxPoints: request.maxPoints,
          readingLevel: userContext.readingLevel,
        },
      }
    );

    // Parse AI response
    const gradingResult: GradeAnswerOutput = parseGradeAnswerResponse(
      aiResult.text
    );

    // Update assessment if provided
    let assessmentUpdate: { score: number; isComplete: boolean } | null = null;
    if (assessment && request.questionId) {
      const answerData = buildAnswerForDb(
        request.questionId,
        request.userAnswer,
        gradingResult
      );

      const existingAnswers = Array.isArray(assessment.answers)
        ? (assessment.answers as unknown[])
        : [];

      assessmentUpdate = await updateAssessmentWithAnswer(
        assessment.id,
        request.questionId,
        answerData,
        existingAnswers
      );

      // Update user comprehension stats if assessment is complete
      if (assessmentUpdate.isComplete) {
        await updateUserComprehensionStats(user.id, assessmentUpdate.score);
      }
    }

    // Log AI usage to AIUsageLog table
    await db.aIUsageLog.create({
      data: {
        userId: user.id,
        operation: "grade_answer",
        model: aiResult.model,
        provider: "anthropic",
        promptTokens: aiResult.usage.promptTokens,
        completionTokens: aiResult.usage.completionTokens,
        totalTokens: aiResult.usage.totalTokens,
        cost: aiResult.cost.totalCost,
        durationMs: aiResult.durationMs,
        success: true,
        bookId: request.bookId ?? null,
        metadata: {
          assessmentId: request.assessmentId,
          questionId: request.questionId,
          bookTitle: request.bookTitle,
          maxPoints: request.maxPoints,
          pointsAwarded: gradingResult.pointsAwarded,
          percentage: gradingResult.percentage,
          isCorrect: gradingResult.isCorrect,
          isPartiallyCorrect: gradingResult.isPartiallyCorrect,
          finishReason: aiResult.finishReason,
        },
      },
    });

    logger.info("Answer graded", {
      userId: user.id,
      assessmentId: request.assessmentId,
      questionId: request.questionId,
      pointsAwarded: gradingResult.pointsAwarded,
      maxPoints: gradingResult.maxPoints,
      percentage: gradingResult.percentage,
      isCorrect: gradingResult.isCorrect,
      tokensUsed: aiResult.usage.totalTokens,
      cost: aiResult.cost.totalCost,
      durationMs: aiResult.durationMs,
    });

    // Return the grading result
    sendSuccess(res, {
      pointsAwarded: gradingResult.pointsAwarded,
      maxPoints: gradingResult.maxPoints,
      percentage: gradingResult.percentage,
      letterGrade: percentageToLetterGrade(gradingResult.percentage),
      feedback: gradingResult.feedback,
      strengths: gradingResult.strengths,
      improvements: gradingResult.improvements,
      suggestedRevision: gradingResult.suggestedRevision,
      rubricScores: gradingResult.rubricScores,
      isCorrect: gradingResult.isCorrect,
      isPartiallyCorrect: gradingResult.isPartiallyCorrect,
      ...(assessmentUpdate
        ? {
            assessmentUpdate: {
              score: assessmentUpdate.score,
              isComplete: assessmentUpdate.isComplete,
            },
          }
        : {}),
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
    logger.error("Error grading answer", {
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
              operation: "grade_answer",
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
      "Failed to grade answer. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  gradeAnswerRequestSchema,
  rubricItemSchema,
  mapReadingLevel,
  buildGradeAnswerInput,
  buildAnswerForDb,
  calculateAssessmentScore,
  updateUserComprehensionStats,
  getAssessmentById,
  updateAssessmentWithAnswer,
  MAX_TOKENS,
  MIN_ANSWER_LENGTH,
  MAX_ANSWER_LENGTH,
  MIN_QUESTION_LENGTH,
  MAX_QUESTION_LENGTH,
  MAX_EXPECTED_ANSWER_LENGTH,
  MAX_POINTS,
  MIN_POINTS,
  MAX_RUBRIC_ITEMS,
  type GradeAnswerRequest,
};
