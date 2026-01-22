/**
 * POST /api/ai/summarize-notes
 *
 * Generate intelligent summaries from user's book annotations and notes.
 *
 * This endpoint:
 * - Requires authentication
 * - Checks if user has AI enabled
 * - Enforces tier-based rate limits
 * - Uses the summarize notes prompt template
 * - Supports multiple summary styles (brief, structured, outline, synthesis)
 * - Identifies key themes and action items
 * - Logs AI usage for billing/monitoring
 *
 * @example
 * ```bash
 * curl -X POST /api/ai/summarize-notes \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "bookId": "clxyz...",
 *     "annotations": [
 *       {
 *         "text": "The author argues that...",
 *         "note": "Important point about motivation",
 *         "type": "highlight",
 *         "position": { "chapter": "Chapter 3", "page": 45 }
 *       }
 *     ],
 *     "summaryStyle": "structured",
 *     "focusAreas": ["themes", "key_quotes", "personal_insights"]
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
  generateSummarizeNotesPrompt,
  parseSummarizeNotesResponse,
  validateSummarizeNotesInput,
  type SummarizeNotesInput,
  type SummarizeNotesOutput,
  type UserContext,
  type ReadingLevel,
  type BookContext,
} from "@read-master/ai";
import type { Book } from "@read-master/database";

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum annotations required
 */
const MIN_ANNOTATIONS = 1;

/**
 * Maximum annotations allowed
 */
const MAX_ANNOTATIONS = 100;

/**
 * Maximum annotation text length
 */
const MAX_ANNOTATION_TEXT_LENGTH = 2000;

/**
 * Maximum note length
 */
const MAX_NOTE_LENGTH = 1000;

/**
 * Valid summary styles
 */
const VALID_SUMMARY_STYLES = [
  "brief",
  "structured",
  "outline",
  "synthesis",
] as const;

/**
 * Valid focus areas
 */
const VALID_FOCUS_AREAS = [
  "themes",
  "key_quotes",
  "personal_insights",
  "action_items",
  "connections",
  "questions",
] as const;

/**
 * Maximum tokens for AI response
 */
const MAX_TOKENS = 3000;

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Position schema
 */
const positionSchema = z.object({
  chapter: z.string().optional(),
  page: z.number().int().positive().optional(),
  section: z.string().optional(),
});

/**
 * Annotation schema for summarization
 */
const annotationSchema = z.object({
  text: z
    .string()
    .min(1, "Annotation text cannot be empty")
    .max(
      MAX_ANNOTATION_TEXT_LENGTH,
      `Annotation text cannot exceed ${MAX_ANNOTATION_TEXT_LENGTH} characters`
    ),
  note: z
    .string()
    .max(MAX_NOTE_LENGTH, `Note cannot exceed ${MAX_NOTE_LENGTH} characters`)
    .optional(),
  type: z.enum(["highlight", "note", "bookmark"]),
  color: z.string().optional(),
  page: z.number().int().positive().optional(),
  chapter: z.string().optional(),
  createdAt: z.string(),
});

/**
 * Summarize notes request schema
 */
const summarizeNotesRequestSchema = z.object({
  bookId: z.string().min(1, "Book ID is required"),
  annotations: z
    .array(annotationSchema)
    .min(MIN_ANNOTATIONS, `At least ${MIN_ANNOTATIONS} annotation is required`)
    .max(
      MAX_ANNOTATIONS,
      `Cannot summarize more than ${MAX_ANNOTATIONS} annotations at once`
    ),
  style: z.enum(["concise", "detailed", "study-guide"]).optional(),
  groupBy: z.enum(["chapter", "theme", "chronological"]).optional(),
  includeQuotes: z.boolean().optional(),
});

/**
 * Summarize notes request type
 */
type SummarizeNotesRequest = z.infer<typeof summarizeNotesRequestSchema>;

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
 * Handle summarize notes request
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
    const validationResult = summarizeNotesRequestSchema.safeParse(req.body);
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
      annotations,
      style,
      groupBy,
      includeQuotes,
    }: SummarizeNotesRequest = validationResult.data;

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

    // Build summarize notes input - map annotations to ensure proper types
    const mappedAnnotations = annotations.map((ann) => ({
      text: ann.text,
      ...(ann.note && { note: ann.note }),
      ...(ann.color && { color: ann.color }),
      ...(ann.page && { page: ann.page }),
      ...(ann.chapter && { chapter: ann.chapter }),
      createdAt: ann.createdAt,
      type: ann.type,
    }));

    const summarizeNotesInput: SummarizeNotesInput = {
      book: bookContext,
      annotations: mappedAnnotations,
    };

    if (style) {
      summarizeNotesInput.style = style;
    }
    if (groupBy) {
      summarizeNotesInput.groupBy = groupBy;
    }
    if (includeQuotes !== undefined) {
      summarizeNotesInput.includeQuotes = includeQuotes;
    }

    // Validate prompt input
    const inputValidation = validateSummarizeNotesInput(summarizeNotesInput);
    if (!inputValidation.valid) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        inputValidation.error ?? "Invalid input for note summarization",
        400
      );
      return;
    }

    // Build user context for AI prompt
    const userContext: UserContext = {
      readingLevel: mapReadingLevel(user.readingLevel) ?? "college",
      language: user.preferredLang ?? "en",
    };
    if (user.firstName) {
      userContext.name = user.firstName;
    }

    // Generate prompts
    const prompt = generateSummarizeNotesPrompt(
      summarizeNotesInput,
      userContext
    );

    // Calculate total annotation text length
    const totalTextLength = annotations.reduce(
      (sum, ann) => sum + ann.text.length + (ann.note?.length ?? 0),
      0
    );

    // Call AI to generate summary
    const aiResult = await completion([{ role: "user", content: prompt }], {
      maxTokens: MAX_TOKENS,
      temperature: 0.6, // Moderate creativity for summaries
      userId: user.id,
      operation: "summarize-notes",
      metadata: {
        bookId,
        bookTitle: book.title,
        annotationCount: annotations.length,
        totalTextLength,
        style: style ?? "concise",
        groupBy: groupBy ?? "chronological",
        includeQuotes: includeQuotes ?? true,
        readingLevel: userContext.readingLevel,
      },
    });

    // Parse AI response
    const parsedResponse: SummarizeNotesOutput = parseSummarizeNotesResponse(
      aiResult.text
    );

    // Log AI usage to AIUsageLog table
    await db.aIUsageLog.create({
      data: {
        userId: user.id,
        operation: "summarize-notes",
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
          annotationCount: annotations.length,
          totalTextLength,
          style: style ?? "concise",
          groupBy: groupBy ?? "chronological",
          includeQuotes: includeQuotes ?? true,
          keyThemesCount: parsedResponse.keyThemes?.length ?? 0,
          sectionsCount: parsedResponse.sections?.length ?? 0,
          readingLevel: userContext.readingLevel,
          finishReason: aiResult.finishReason,
        },
      },
    });

    logger.info("Notes summary generated", {
      userId: user.id,
      bookId,
      annotationCount: annotations.length,
      style: style ?? "concise",
      tokensUsed: aiResult.usage.totalTokens,
      cost: aiResult.cost.totalCost,
      durationMs: aiResult.durationMs,
    });

    // Return the summary
    sendSuccess(res, {
      overallSummary: parsedResponse.overallSummary,
      sections: parsedResponse.sections ?? [],
      keyThemes: parsedResponse.keyThemes ?? [],
      mainTakeaways: parsedResponse.mainTakeaways ?? [],
      reviewTopics: parsedResponse.reviewTopics ?? [],
      bookId,
      annotationCount: annotations.length,
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
    logger.error("Error generating notes summary", {
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
              operation: "summarize-notes",
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
      "Failed to generate notes summary. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  summarizeNotesRequestSchema,
  annotationSchema,
  positionSchema,
  mapReadingLevel,
  buildBookContext,
  MIN_ANNOTATIONS,
  MAX_ANNOTATIONS,
  MAX_ANNOTATION_TEXT_LENGTH,
  MAX_NOTE_LENGTH,
  VALID_SUMMARY_STYLES,
  VALID_FOCUS_AREAS,
  MAX_TOKENS,
};
