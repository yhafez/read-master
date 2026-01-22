/**
 * POST /api/ai/recommendations
 *
 * Generate personalized book recommendations based on reading history and comprehension.
 *
 * This endpoint:
 * - Requires authentication
 * - Checks if user has AI enabled
 * - Enforces tier-based rate limits
 * - Uses the personalized recommendations prompt template
 * - Analyzes reading patterns, comprehension scores, and preferences
 * - Provides intelligent book suggestions with confidence scores
 * - Logs AI usage for billing/monitoring
 *
 * @example
 * ```bash
 * curl -X POST /api/ai/recommendations \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "preferences": {
 *       "favoriteGenres": ["Science Fiction", "Philosophy"],
 *       "favoriteAuthors": ["Isaac Asimov"],
 *       "topics": ["AI", "Ethics"],
 *       "avoidTopics": ["Horror"]
 *     },
 *     "goals": {
 *       "skillDevelopment": ["improve vocabulary", "read faster"],
 *       "topicsToExplore": ["Quantum Physics"],
 *       "challengeLevel": "increase"
 *     },
 *     "recommendationCount": 5
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
  generatePersonalizedRecommendationsPrompt,
  parsePersonalizedRecommendationsResponse,
  validatePersonalizedRecommendationsInput,
  type PersonalizedRecommendationsInput,
  type PersonalizedRecommendationsOutput,
  type ReadingHistoryItem,
  type UserContext,
  type ReadingLevel,
} from "@read-master/ai";

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum reading history items required
 */
const MIN_HISTORY_ITEMS = 1;

/**
 * Maximum reading history items to analyze
 */
const MAX_HISTORY_ITEMS = 50;

/**
 * Minimum recommendation count
 */
const MIN_RECOMMENDATION_COUNT = 1;

/**
 * Maximum recommendation count
 */
const MAX_RECOMMENDATION_COUNT = 20;

/**
 * Maximum tokens for AI response
 */
const MAX_TOKENS = 4000;

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * User preferences schema
 */
const preferencesSchema = z.object({
  favoriteGenres: z.array(z.string()).max(10, "Maximum 10 favorite genres").optional(),
  favoriteAuthors: z.array(z.string()).max(20, "Maximum 20 favorite authors").optional(),
  topics: z.array(z.string()).max(20, "Maximum 20 topics").optional(),
  avoidTopics: z.array(z.string()).max(10, "Maximum 10 avoid topics").optional(),
});

/**
 * Reading goals schema
 */
const goalsSchema = z.object({
  skillDevelopment: z.array(z.string()).max(10, "Maximum 10 skill development goals").optional(),
  topicsToExplore: z.array(z.string()).max(10, "Maximum 10 topics to explore").optional(),
  challengeLevel: z.enum(["maintain", "increase", "decrease"]).optional(),
});

/**
 * Recommendations request schema
 */
const recommendationsRequestSchema = z.object({
  preferences: preferencesSchema.optional(),
  goals: goalsSchema.optional(),
  recommendationCount: z
    .number()
    .int()
    .min(MIN_RECOMMENDATION_COUNT, `Must request at least ${MIN_RECOMMENDATION_COUNT} recommendation`)
    .max(MAX_RECOMMENDATION_COUNT, `Cannot request more than ${MAX_RECOMMENDATION_COUNT} recommendations`)
    .default(5),
});

/**
 * Recommendations request type
 */
type RecommendationsRequest = z.infer<typeof recommendationsRequestSchema>;

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
 * Fetch user's reading history from database
 */
async function fetchReadingHistory(userId: string): Promise<ReadingHistoryItem[]> {
  // Get completed and currently reading books with their progress
  const books = await db.book.findMany({
    where: {
      userId,
      status: {
        in: ["READING", "COMPLETED"],
      },
      deletedAt: null,
    },
    include: {
      progress: {
        where: {
          userId,
        },
        take: 1,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: MAX_HISTORY_ITEMS,
  });

  return books.map((book) => {
    const progress = book.progress[0];
    
    const historyItem: ReadingHistoryItem = {
      book: {
        title: book.title,
        author: book.author ?? undefined,
        genre: book.genre ?? undefined,
        description: book.description ?? undefined,
      },
      completionDate: book.status === "COMPLETED" ? book.updatedAt.toISOString() : undefined,
      rating: undefined, // Could be added if book ratings exist
      comprehensionScore: undefined, // Could be calculated from assessment scores
      readingSpeed: progress?.averageWpm ?? undefined,
      notes: undefined, // Could be added from annotations
      difficulty: undefined, // Could be determined from actual difficulty
    };

    return historyItem;
  });
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle personalized recommendations request
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
    const validationResult = recommendationsRequestSchema.safeParse(req.body);
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
      preferences,
      goals,
      recommendationCount,
    }: RecommendationsRequest = validationResult.data;

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

    // Fetch user's reading history
    const readingHistory = await fetchReadingHistory(user.id);
    
    if (readingHistory.length === 0) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "You need to have at least one book in your reading history to get personalized recommendations. Start reading some books first!",
        400
      );
      return;
    }

    // Build personalized recommendations input
    const recommendationsInput: PersonalizedRecommendationsInput = {
      readingHistory,
      recommendationCount,
    };

    if (preferences) {
      recommendationsInput.preferences = preferences;
    }
    if (goals) {
      recommendationsInput.goals = goals;
    }

    // Validate prompt input
    const inputValidation = validatePersonalizedRecommendationsInput(recommendationsInput);
    if (!inputValidation.valid) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        inputValidation.error ?? "Invalid input for recommendations",
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
    const prompt = generatePersonalizedRecommendationsPrompt(
      recommendationsInput,
      userContext
    );

    // Call AI to generate recommendations
    const aiResult = await completion(
      [{ role: "user", content: prompt }],
      {
        system: undefined, // Prompt already includes system context
        maxTokens: MAX_TOKENS,
        temperature: 0.7, // Balanced creativity for recommendations
        userId: user.id,
        operation: "recommendations",
        metadata: {
          historyCount: readingHistory.length,
          requestedCount: recommendationCount,
          hasPreferences: !!preferences,
          hasGoals: !!goals,
          favoriteGenresCount: preferences?.favoriteGenres?.length ?? 0,
          favoriteAuthorsCount: preferences?.favoriteAuthors?.length ?? 0,
          readingLevel: userContext.readingLevel,
        },
      }
    );

    // Parse AI response
    const parsedResponse: PersonalizedRecommendationsOutput = 
      parsePersonalizedRecommendationsResponse(aiResult.text);

    // Log AI usage to AIUsageLog table
    await db.aIUsageLog.create({
      data: {
        userId: user.id,
        operation: "recommendations",
        model: aiResult.model,
        provider: "anthropic",
        promptTokens: aiResult.usage.promptTokens,
        completionTokens: aiResult.usage.completionTokens,
        totalTokens: aiResult.usage.totalTokens,
        cost: aiResult.cost.totalCost,
        durationMs: aiResult.durationMs,
        success: true,
        metadata: {
          historyCount: readingHistory.length,
          requestedCount: recommendationCount,
          recommendationsGenerated: parsedResponse.recommendations.length,
          hasPreferences: !!preferences,
          hasGoals: !!goals,
          favoriteGenresCount: preferences?.favoriteGenres?.length ?? 0,
          favoriteAuthorsCount: preferences?.favoriteAuthors?.length ?? 0,
          readingLevel: userContext.readingLevel,
          finishReason: aiResult.finishReason,
        },
      },
    });

    logger.info("Personalized recommendations generated", {
      userId: user.id,
      historyCount: readingHistory.length,
      recommendationsGenerated: parsedResponse.recommendations.length,
      tokensUsed: aiResult.usage.totalTokens,
      cost: aiResult.cost.totalCost,
      durationMs: aiResult.durationMs,
    });

    // Return the recommendations
    sendSuccess(res, {
      recommendations: parsedResponse.recommendations,
      readingPatterns: parsedResponse.readingPatterns,
      advice: parsedResponse.advice,
      levelProgression: parsedResponse.levelProgression,
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
    logger.error("Error generating recommendations", {
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
              operation: "recommendations",
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
      "Failed to generate recommendations. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  recommendationsRequestSchema,
  preferencesSchema,
  goalsSchema,
  mapReadingLevel,
  fetchReadingHistory,
  MIN_HISTORY_ITEMS,
  MAX_HISTORY_ITEMS,
  MIN_RECOMMENDATION_COUNT,
  MAX_RECOMMENDATION_COUNT,
  MAX_TOKENS,
};
