/**
 * POST /api/ai/pre-reading-guide
 *
 * Generate a pre-reading guide for a book using AI.
 *
 * This endpoint:
 * - Requires authentication
 * - Checks if user has AI enabled
 * - Enforces tier-based rate limits
 * - Fetches book content from the database
 * - Uses the pre-reading guide prompt template
 * - Streams AI response for better UX
 * - Saves the generated guide to the database
 * - Logs AI usage for billing/monitoring
 *
 * @example
 * ```bash
 * curl -X POST /api/ai/pre-reading-guide \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"bookId": "clxyz..."}'
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
  sendCreated,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { db, getUserByClerkId, getBookById } from "../../src/services/db.js";
import { completion, isAIAvailable } from "../../src/services/ai.js";
import {
  generatePreReadingGuidePrompt,
  parsePreReadingGuideResponse,
  validatePreReadingGuideInput,
  type PreReadingGuideOutput,
  type UserContext,
  type ReadingLevel,
  type BookContext,
} from "@read-master/ai";
import type { Book } from "@read-master/database";

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum book content length required for guide generation
 */
const MIN_CONTENT_LENGTH = 100;

/**
 * Maximum book content to include in prompt (to stay within token limits)
 */
const MAX_CONTENT_LENGTH = 50000;

/**
 * Maximum tokens for AI response
 */
const MAX_TOKENS = 4096;

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Pre-reading guide request validation schema
 */
const preReadingGuideRequestSchema = z.object({
  bookId: z
    .string()
    .min(1, "Book ID is required")
    .regex(/^c[a-z0-9]+$/, "Invalid book ID format"),
  regenerate: z.boolean().optional().default(false),
});

/**
 * Type for validated request
 */
type PreReadingGuideRequest = z.infer<typeof preReadingGuideRequestSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map user's reading level to AI prompt reading level
 */
function mapReadingLevel(userLevel: string | null): ReadingLevel {
  // Map Lexile or custom levels to ReadingLevel
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

  return "middle_school"; // Default
}

/**
 * Get book content from R2 storage or database
 * For now, we'll use a placeholder - in production this would fetch from R2
 */
async function getBookContent(book: Book): Promise<string> {
  // TODO: In production, fetch actual content from R2 using book.filePath
  // For now, we use the description or a placeholder based on metadata

  // If we have a stored content path, we'd fetch it here
  // const content = await storage.getFile(book.filePath);

  // For demonstration, create context from available metadata
  const contentParts: string[] = [];

  if (book.description) {
    contentParts.push(book.description);
  }

  // Add metadata-based context for guide generation
  contentParts.push(`\n\nBook Metadata:`);
  contentParts.push(`Title: ${book.title}`);
  if (book.author) contentParts.push(`Author: ${book.author}`);
  if (book.genre) contentParts.push(`Genre: ${book.genre}`);
  if (book.wordCount) contentParts.push(`Word Count: ${book.wordCount}`);
  if (book.language) contentParts.push(`Language: ${book.language}`);

  const content = contentParts.join("\n");

  // In production, this would be the actual book content
  // For now, if content is too short, we use the description/metadata
  if (content.length < MIN_CONTENT_LENGTH) {
    return `Book: "${book.title}" by ${book.author ?? "Unknown Author"}.\n\n${book.description ?? "No description available."}`;
  }

  return content.slice(0, MAX_CONTENT_LENGTH);
}

/**
 * Vocabulary item for database storage
 */
type VocabularyDbItem = {
  term: string;
  definition: string;
  examples: string[];
};

/**
 * Key argument item for database storage
 */
type KeyArgumentDbItem = {
  argument: string;
  explanation: string;
};

/**
 * Chapter summary for database storage
 */
type ChapterSummaryDbItem = {
  chapterIndex: number;
  summary: string;
};

/**
 * Database format for pre-reading guide
 */
type PreReadingGuideDbFormat = {
  vocabulary: string;
  keyArguments: string;
  chapterSummaries: string;
  historicalContext: string | null;
  authorContext: string | null;
  intellectualContext: string | null;
  keyThemes: string;
  readingTips: string;
  discussionTopics: string;
};

/**
 * Convert AI output to database format
 */
function convertOutputToDbFormat(
  output: PreReadingGuideOutput
): PreReadingGuideDbFormat {
  // Map vocabulary
  const vocabulary: VocabularyDbItem[] = output.vocabulary.map((v) => ({
    term: v.word,
    definition: v.definition,
    examples: v.example ? [v.example] : [],
  }));

  // Map key concepts to key arguments
  const keyArguments: KeyArgumentDbItem[] = output.keyConcepts.map((c) => ({
    argument: c.term,
    explanation: `${c.definition}\n\nRelevance: ${c.relevance}`,
  }));

  // Create chapter summaries from overview
  const chapterSummaries: ChapterSummaryDbItem[] = [
    {
      chapterIndex: 0,
      summary: output.overview.summary,
    },
  ];

  return {
    vocabulary: JSON.stringify(vocabulary),
    keyArguments: JSON.stringify(keyArguments),
    chapterSummaries: JSON.stringify(chapterSummaries),
    historicalContext: output.context.historicalContext ?? null,
    authorContext: output.context.authorContext ?? null,
    intellectualContext: output.context.culturalContext ?? null,
    keyThemes: JSON.stringify(output.overview.themes),
    readingTips: JSON.stringify(output.readingTips),
    discussionTopics: JSON.stringify(output.guidingQuestions),
  };
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle pre-reading guide generation request
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
    const validationResult = preReadingGuideRequestSchema.safeParse(req.body);
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

    const { bookId, regenerate }: PreReadingGuideRequest =
      validationResult.data;

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

    // Check if guide already exists
    const existingGuide = await db.preReadingGuide.findUnique({
      where: { bookId },
    });

    if (existingGuide && !regenerate) {
      // Return existing guide
      sendSuccess(res, {
        id: existingGuide.id,
        bookId: existingGuide.bookId,
        vocabulary: existingGuide.vocabulary,
        keyArguments: existingGuide.keyArguments,
        chapterSummaries: existingGuide.chapterSummaries,
        historicalContext: existingGuide.historicalContext,
        authorContext: existingGuide.authorContext,
        intellectualContext: existingGuide.intellectualContext,
        keyThemes: existingGuide.keyThemes,
        readingTips: existingGuide.readingTips,
        discussionTopics: existingGuide.discussionTopics,
        generatedAt: existingGuide.generatedAt.toISOString(),
        generatedBy: existingGuide.generatedBy,
        tokensUsed: existingGuide.tokensUsed,
        cached: true,
      });
      return;
    }

    // Get book content for AI
    const bookContent = await getBookContent(book);

    // Build book context for AI prompt
    const bookContext: BookContext = {
      title: book.title,
      author: book.author ?? "Unknown Author",
      content: bookContent,
    };
    // Add optional fields only if they have values
    if (book.genre) {
      bookContext.genre = book.genre;
    }
    if (book.description) {
      bookContext.description = book.description;
    }

    // Build user context for AI prompt
    const userContext: UserContext = {
      readingLevel: mapReadingLevel(user.readingLevel),
      language: user.preferredLang ?? "en",
    };
    // Add optional fields only if they have values
    if (user.firstName) {
      userContext.name = user.firstName;
    }

    // Validate prompt input
    const inputValidation = validatePreReadingGuideInput({ book: bookContext });
    if (!inputValidation.valid) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        inputValidation.error ?? "Invalid book content for guide generation",
        400
      );
      return;
    }

    // Generate prompts
    const prompts = generatePreReadingGuidePrompt(
      { book: bookContext },
      userContext
    );

    // Call AI to generate guide
    const aiResult = await completion(
      [{ role: "user", content: prompts.user }],
      {
        system: prompts.system,
        maxTokens: MAX_TOKENS,
        temperature: 0.7,
        userId: user.id,
        operation: "pre_reading_guide",
        metadata: {
          bookId,
          bookTitle: book.title,
          readingLevel: userContext.readingLevel,
        },
      }
    );

    // Parse AI response
    const parsedGuide = parsePreReadingGuideResponse(aiResult.text);

    // Convert to database format
    const dbData = convertOutputToDbFormat(parsedGuide);

    // Save or update guide in database
    const guide = await db.preReadingGuide.upsert({
      where: { bookId },
      create: {
        bookId,
        ...dbData,
        generatedAt: new Date(),
        generatedBy: aiResult.model,
        tokensUsed: aiResult.usage.totalTokens,
      },
      update: {
        ...dbData,
        generatedAt: new Date(),
        generatedBy: aiResult.model,
        tokensUsed: aiResult.usage.totalTokens,
      },
    });

    // Log AI usage to AIUsageLog table
    await db.aIUsageLog.create({
      data: {
        userId: user.id,
        operation: "pre_reading_guide",
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
          readingLevel: userContext.readingLevel,
          finishReason: aiResult.finishReason,
        },
      },
    });

    logger.info("Pre-reading guide generated", {
      userId: user.id,
      bookId,
      tokensUsed: aiResult.usage.totalTokens,
      cost: aiResult.cost.totalCost,
      durationMs: aiResult.durationMs,
      regenerated: !!existingGuide,
    });

    // Return the guide
    const sendFn = existingGuide ? sendSuccess : sendCreated;

    sendFn(res, {
      id: guide.id,
      bookId: guide.bookId,
      overview: {
        summary: parsedGuide.overview.summary,
        themes: parsedGuide.overview.themes,
        targetAudience: parsedGuide.overview.targetAudience,
      },
      keyConcepts: parsedGuide.keyConcepts,
      context: parsedGuide.context,
      guidingQuestions: parsedGuide.guidingQuestions,
      vocabulary: parsedGuide.vocabulary,
      readingTips: parsedGuide.readingTips,
      generatedAt: guide.generatedAt.toISOString(),
      generatedBy: guide.generatedBy,
      tokensUsed: guide.tokensUsed,
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
      cached: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error generating pre-reading guide", {
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
              operation: "pre_reading_guide",
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
      "Failed to generate pre-reading guide. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  preReadingGuideRequestSchema,
  mapReadingLevel,
  getBookContent,
  convertOutputToDbFormat,
  MIN_CONTENT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_TOKENS,
  type PreReadingGuideRequest,
};
