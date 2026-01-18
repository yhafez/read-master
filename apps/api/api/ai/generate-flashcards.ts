/**
 * POST /api/ai/generate-flashcards
 *
 * AI-powered flashcard generation endpoint for vocabulary, concepts,
 * comprehension, and quote flashcards from book content.
 *
 * This endpoint:
 * - Requires authentication
 * - Checks if user has AI enabled
 * - Enforces tier-based rate limits
 * - Uses the generateFlashcards prompt template
 * - Checks for duplicate cards
 * - Creates Flashcard records in database
 * - Logs AI usage for billing/monitoring
 *
 * @example
 * ```bash
 * curl -X POST /api/ai/generate-flashcards \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "bookId": "clxyz...",
 *     "content": "Text to generate flashcards from...",
 *     "cardTypes": ["vocabulary", "concept"],
 *     "cardCount": 10
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
  generateFlashcardsPromptStrings,
  parseFlashcardsResponse,
  validateFlashcardsInput,
  type GenerateFlashcardsInput,
  type GenerateFlashcardsOutput,
  type GeneratedFlashcard,
  type FlashcardType,
  type UserContext,
  type ReadingLevel,
  type BookContext,
} from "@read-master/ai";
import type { Book, Flashcard, Prisma } from "@read-master/database";

// ============================================================================
// Constants
// ============================================================================

/**
 * Valid flashcard types
 */
const FLASHCARD_TYPES = [
  "vocabulary",
  "concept",
  "comprehension",
  "quote",
] as const;

/**
 * Default card count for generation
 */
const DEFAULT_CARD_COUNT = 10;

/**
 * Maximum card count per request
 */
const MAX_CARD_COUNT = 30;

/**
 * Minimum card count per request
 */
const MIN_CARD_COUNT = 1;

/**
 * Minimum content length required
 */
const MIN_CONTENT_LENGTH = 50;

/**
 * Maximum content length to send to AI
 */
const MAX_CONTENT_LENGTH = 50000;

/**
 * Maximum tokens for AI response
 */
const MAX_TOKENS = 8192;

/**
 * Maximum existing cards to check for duplicates
 */
const MAX_EXISTING_CARDS_CHECK = 100;

/**
 * Similarity threshold for duplicate detection (0-1)
 * Cards with similarity >= threshold are considered duplicates
 */
const DUPLICATE_SIMILARITY_THRESHOLD = 0.8;

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Flashcard generation request validation schema
 */
const generateFlashcardsRequestSchema = z.object({
  bookId: z
    .string()
    .min(1, "Book ID is required")
    .regex(/^c[a-z0-9]+$/, "Invalid book ID format"),
  content: z
    .string()
    .min(
      MIN_CONTENT_LENGTH,
      `Content must be at least ${MIN_CONTENT_LENGTH} characters`
    )
    .max(
      MAX_CONTENT_LENGTH,
      `Content must be at most ${MAX_CONTENT_LENGTH} characters`
    ),
  cardTypes: z
    .array(z.enum(FLASHCARD_TYPES))
    .min(1, "At least one card type is required")
    .default(["vocabulary", "concept"]),
  cardCount: z
    .number()
    .int()
    .min(MIN_CARD_COUNT)
    .max(MAX_CARD_COUNT)
    .default(DEFAULT_CARD_COUNT),
  chapterId: z.string().optional(),
  sourceOffset: z.number().int().nonnegative().optional(),
});

/**
 * Type for validated request
 */
type GenerateFlashcardsRequest = z.infer<
  typeof generateFlashcardsRequestSchema
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
function buildBookContext(book: Book, content: string): BookContext {
  const context: BookContext = {
    title: book.title,
    author: book.author ?? "Unknown Author",
    content,
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
 * Map AI flashcard type to database enum
 */
function mapFlashcardTypeToDb(
  type: FlashcardType
): "VOCABULARY" | "CONCEPT" | "COMPREHENSION" | "QUOTE" | "CUSTOM" {
  const typeMap: Record<
    FlashcardType,
    "VOCABULARY" | "CONCEPT" | "COMPREHENSION" | "QUOTE" | "CUSTOM"
  > = {
    vocabulary: "VOCABULARY",
    concept: "CONCEPT",
    comprehension: "COMPREHENSION",
    quote: "QUOTE",
  };
  return typeMap[type] ?? "CUSTOM";
}

/**
 * Get existing flashcard fronts for duplicate checking
 * Returns the front text of existing cards for the user's book
 */
async function getExistingCardFronts(
  userId: string,
  bookId: string
): Promise<string[]> {
  const existingCards = await db.flashcard.findMany({
    where: {
      userId,
      bookId,
      deletedAt: null,
    },
    select: {
      front: true,
    },
    take: MAX_EXISTING_CARDS_CHECK,
    orderBy: {
      createdAt: "desc",
    },
  });

  return existingCards.map((card) => card.front);
}

/**
 * Calculate simple text similarity using Jaccard index
 * Returns a value between 0 (no similarity) and 1 (identical)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(Boolean));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(Boolean));

  if (words1.size === 0 && words2.size === 0) return 1;
  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter((word) => words2.has(word)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Check if a generated card is a duplicate of existing cards
 */
function isDuplicateCard(
  newCard: GeneratedFlashcard,
  existingFronts: string[]
): boolean {
  for (const existingFront of existingFronts) {
    const similarity = calculateSimilarity(newCard.front, existingFront);
    if (similarity >= DUPLICATE_SIMILARITY_THRESHOLD) {
      return true;
    }
  }
  return false;
}

/**
 * Filter out duplicate cards from generated cards
 */
function filterDuplicates(
  generatedCards: GeneratedFlashcard[],
  existingFronts: string[]
): { uniqueCards: GeneratedFlashcard[]; duplicatesRemoved: number } {
  const uniqueCards: GeneratedFlashcard[] = [];
  const seenFronts: string[] = [...existingFronts];
  let duplicatesRemoved = 0;

  for (const card of generatedCards) {
    if (isDuplicateCard(card, seenFronts)) {
      duplicatesRemoved++;
    } else {
      uniqueCards.push(card);
      seenFronts.push(card.front);
    }
  }

  return { uniqueCards, duplicatesRemoved };
}

/**
 * Build flashcard data for database creation
 * Returns data in format suitable for Prisma.FlashcardCreateInput
 */
function buildFlashcardForDb(
  card: GeneratedFlashcard,
  userId: string,
  bookId: string,
  chapterId?: string,
  sourceOffset?: number
): Prisma.FlashcardCreateInput {
  const data: Prisma.FlashcardCreateInput = {
    user: { connect: { id: userId } },
    front: card.front,
    back: card.back + (card.context ? `\n\n${card.context}` : ""),
    type: mapFlashcardTypeToDb(card.type),
    status: "NEW",
    tags: card.tags,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: new Date(),
    totalReviews: 0,
    correctReviews: 0,
  };

  // Connect to book
  data.book = { connect: { id: bookId } };

  // Optional source reference
  if (chapterId) {
    data.sourceChapterId = chapterId;
  }
  if (sourceOffset !== undefined) {
    data.sourceOffset = sourceOffset;
  }

  return data;
}

/**
 * Calculate summary statistics for generated cards
 */
function calculateCardSummary(cards: GeneratedFlashcard[]): {
  totalCards: number;
  byType: Partial<Record<FlashcardType, number>>;
  averageDifficulty: number;
} {
  if (cards.length === 0) {
    return {
      totalCards: 0,
      byType: {},
      averageDifficulty: 0,
    };
  }

  const byType: Partial<Record<FlashcardType, number>> = {};
  let totalDifficulty = 0;

  for (const card of cards) {
    byType[card.type] = (byType[card.type] ?? 0) + 1;
    totalDifficulty += card.difficulty;
  }

  return {
    totalCards: cards.length,
    byType,
    averageDifficulty: Math.round((totalDifficulty / cards.length) * 10) / 10,
  };
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle flashcard generation request
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
    const validationResult = generateFlashcardsRequestSchema.safeParse(
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
      content,
      cardTypes,
      cardCount,
      chapterId,
      sourceOffset,
    }: GenerateFlashcardsRequest = validationResult.data;

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

    // Get existing cards for duplicate checking
    const existingFronts = await getExistingCardFronts(user.id, bookId);

    // Build book context for AI prompt
    const bookContext = buildBookContext(book, content);

    // Build flashcard generation input
    const flashcardInput: GenerateFlashcardsInput = {
      content,
      book: bookContext,
      cardTypes: cardTypes as FlashcardType[],
      cardCount,
      existingCards: existingFronts.slice(0, 20), // Pass first 20 for context
    };

    // Validate prompt input
    const inputValidation = validateFlashcardsInput(flashcardInput);
    if (!inputValidation.valid) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        inputValidation.error ?? "Invalid input for flashcard generation",
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
    const prompts = generateFlashcardsPromptStrings(
      flashcardInput,
      userContext
    );

    // Call AI to generate flashcards
    const aiResult = await completion(
      [{ role: "user", content: prompts.user }],
      {
        system: prompts.system,
        maxTokens: MAX_TOKENS,
        temperature: 0.7,
        userId: user.id,
        operation: "generate_flashcards",
        metadata: {
          bookId,
          bookTitle: book.title,
          cardTypes,
          cardCount,
          readingLevel: userContext.readingLevel,
        },
      }
    );

    // Parse AI response
    const parsedResult: GenerateFlashcardsOutput = parseFlashcardsResponse(
      aiResult.text
    );

    // Validate we got flashcards
    if (!parsedResult.flashcards || parsedResult.flashcards.length === 0) {
      logger.error("Flashcard generation returned no cards", {
        userId: user.id,
        bookId,
        cardTypes,
        cardCount,
        rawResponse: aiResult.text.slice(0, 500),
      });
      sendError(
        res,
        ErrorCodes.INTERNAL_ERROR,
        "Failed to generate flashcards. Please try again.",
        500
      );
      return;
    }

    // Filter out duplicates
    const { uniqueCards, duplicatesRemoved } = filterDuplicates(
      parsedResult.flashcards,
      existingFronts
    );

    // Create flashcard records in database
    const createdCards: Flashcard[] = [];

    if (uniqueCards.length > 0) {
      // Batch create flashcards
      const flashcardData = uniqueCards.map((card) =>
        buildFlashcardForDb(card, user.id, bookId, chapterId, sourceOffset)
      );

      // Create all cards in a transaction
      const createPromises = flashcardData.map((data) =>
        db.flashcard.create({ data })
      );

      const results = await Promise.all(createPromises);
      createdCards.push(...results);
    }

    // Log AI usage to AIUsageLog table
    await db.aIUsageLog.create({
      data: {
        userId: user.id,
        operation: "generate_flashcards",
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
          cardTypes,
          requestedCount: cardCount,
          generatedCount: parsedResult.flashcards.length,
          savedCount: createdCards.length,
          duplicatesRemoved,
          finishReason: aiResult.finishReason,
          readingLevel: userContext.readingLevel,
          averageDifficulty: parsedResult.summary.averageDifficulty,
        },
      },
    });

    // Calculate summary for response
    const responseSummary = calculateCardSummary(uniqueCards);

    logger.info("Flashcards generated", {
      userId: user.id,
      bookId,
      requestedCount: cardCount,
      generatedCount: parsedResult.flashcards.length,
      savedCount: createdCards.length,
      duplicatesRemoved,
      tokensUsed: aiResult.usage.totalTokens,
      cost: aiResult.cost.totalCost,
      durationMs: aiResult.durationMs,
    });

    // Return the generated flashcards
    sendSuccess(res, {
      flashcards: createdCards.map((card) => ({
        id: card.id,
        front: card.front,
        back: card.back,
        type: card.type,
        tags: card.tags,
        dueDate: card.dueDate,
      })),
      summary: {
        ...responseSummary,
        duplicatesRemoved,
        requestedCount: cardCount,
        generatedCount: parsedResult.flashcards.length,
        savedCount: createdCards.length,
      },
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
    logger.error("Error generating flashcards", {
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
              operation: "generate_flashcards",
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
      "Failed to generate flashcards. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  generateFlashcardsRequestSchema,
  mapReadingLevel,
  buildBookContext,
  mapFlashcardTypeToDb,
  getExistingCardFronts,
  calculateSimilarity,
  isDuplicateCard,
  filterDuplicates,
  buildFlashcardForDb,
  calculateCardSummary,
  FLASHCARD_TYPES,
  DEFAULT_CARD_COUNT,
  MAX_CARD_COUNT,
  MIN_CARD_COUNT,
  MIN_CONTENT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_TOKENS,
  MAX_EXISTING_CARDS_CHECK,
  DUPLICATE_SIMILARITY_THRESHOLD,
  type GenerateFlashcardsRequest,
};
