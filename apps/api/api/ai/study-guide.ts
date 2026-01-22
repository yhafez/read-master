/**
 * POST /api/ai/study-guide
 *
 * Generate comprehensive study guides from book content using AI.
 *
 * This endpoint:
 * - Requires authentication
 * - Checks if user has AI enabled
 * - Enforces tier-based rate limits
 * - Uses customizable study guide styles and sections
 * - Includes user annotations for personalization
 * - Logs AI usage for billing/monitoring
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
  buildStudyGuidePrompt,
  DEFAULT_STUDY_GUIDE_SECTIONS,
  type StudyGuideInput,
} from "@read-master/ai";

// ============================================================================
// Constants
// ============================================================================

const MAX_CONTENT_LENGTH = 15000;
const MAX_ANNOTATIONS = 50;
const MAX_TOKENS = 4000;

// ============================================================================
// Validation Schema
// ============================================================================

const studyGuideSectionsSchema = z.object({
  includeOverview: z.boolean().optional(),
  includeKeyPoints: z.boolean().optional(),
  includeVocabulary: z.boolean().optional(),
  includeQuestions: z.boolean().optional(),
  includeTimeline: z.boolean().optional(),
  includeThemes: z.boolean().optional(),
  includeSummary: z.boolean().optional(),
});

const studyGuideRequestSchema = z.object({
  bookId: z.string().min(1, "Book ID is required"),
  style: z
    .enum(["comprehensive", "summary", "exam-prep", "discussion", "visual"])
    .default("comprehensive"),
  sections: studyGuideSectionsSchema.optional(),
  targetAudience: z
    .enum(["high-school", "college", "graduate", "general"])
    .optional(),
  includeAnnotations: z.boolean().default(true),
});

type StudyGuideRequest = z.infer<typeof studyGuideRequestSchema>;

// ============================================================================
// Handler
// ============================================================================

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
    // Check AI availability
    if (!isAIAvailable()) {
      sendError(
        res,
        ErrorCodes.SERVICE_UNAVAILABLE,
        "AI service is not available. Please try again later.",
        503
      );
      return;
    }

    // Validate request
    const validationResult = studyGuideRequestSchema.safeParse(req.body);
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

    const data: StudyGuideRequest = validationResult.data;

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
    const book = await getBookById(data.bookId, { includeChapters: false });
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

    // Get content
    let content = book.rawContent || "";

    if (!content || content.length < 100) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Book content not available or too short for study guide generation",
        400
      );
      return;
    }

    // Truncate content if too long
    if (content.length > MAX_CONTENT_LENGTH) {
      content = content.slice(0, MAX_CONTENT_LENGTH);
    }

    // Fetch annotations if requested
    const annotations: Array<{
      type: "HIGHLIGHT" | "NOTE" | "BOOKMARK";
      text?: string;
      note?: string;
    }> = [];

    if (data.includeAnnotations) {
      const dbAnnotations = await db.annotation.findMany({
        where: {
          bookId: data.bookId,
          userId: user.id,
          deletedAt: null,
        },
        orderBy: {
          startOffset: "asc",
        },
        take: MAX_ANNOTATIONS,
        select: {
          type: true,
          selectedText: true,
          note: true,
        },
      });

      for (const ann of dbAnnotations) {
        const exportAnn: {
          type: "HIGHLIGHT" | "NOTE" | "BOOKMARK";
          text?: string;
          note?: string;
        } = {
          type: ann.type as "HIGHLIGHT" | "NOTE" | "BOOKMARK",
        };

        if (ann.selectedText) {
          exportAnn.text = ann.selectedText;
        }
        if (ann.note) {
          exportAnn.note = ann.note;
        }

        annotations.push(exportAnn);
      }
    }

    // Build sections with proper type handling for exactOptionalPropertyTypes
    const sections = data.sections || DEFAULT_STUDY_GUIDE_SECTIONS;
    const cleanSections: StudyGuideInput["sections"] = {};
    if (sections.includeOverview !== undefined)
      cleanSections.includeOverview = sections.includeOverview;
    if (sections.includeKeyPoints !== undefined)
      cleanSections.includeKeyPoints = sections.includeKeyPoints;
    if (sections.includeVocabulary !== undefined)
      cleanSections.includeVocabulary = sections.includeVocabulary;
    if (sections.includeQuestions !== undefined)
      cleanSections.includeQuestions = sections.includeQuestions;
    if (sections.includeTimeline !== undefined)
      cleanSections.includeTimeline = sections.includeTimeline;
    if (sections.includeThemes !== undefined)
      cleanSections.includeThemes = sections.includeThemes;
    if (sections.includeSummary !== undefined)
      cleanSections.includeSummary = sections.includeSummary;

    // Build prompt context
    const promptInput: StudyGuideInput = {
      bookTitle: book.title,
      content,
      annotations,
      style: data.style,
      sections: cleanSections,
    };

    // Add optional properties only if defined
    if (book.author) promptInput.bookAuthor = book.author;
    if (data.targetAudience) promptInput.targetAudience = data.targetAudience;

    const prompt = buildStudyGuidePrompt(promptInput);

    // Call AI
    const aiResult = await completion([{ role: "user", content: prompt }], {
      maxTokens: MAX_TOKENS,
      temperature: 0.7,
      userId: user.id,
      operation: "study-guide",
      metadata: {
        bookId: data.bookId,
        bookTitle: book.title,
        style: data.style,
        targetAudience: data.targetAudience,
        includeAnnotations: data.includeAnnotations,
        annotationsCount: annotations.length,
      },
    });

    // Log usage
    await db.aIUsageLog.create({
      data: {
        userId: user.id,
        operation: "study-guide",
        model: aiResult.model,
        provider: "anthropic",
        promptTokens: aiResult.usage.promptTokens,
        completionTokens: aiResult.usage.completionTokens,
        totalTokens: aiResult.usage.totalTokens,
        cost: aiResult.cost.totalCost,
        durationMs: aiResult.durationMs,
        success: true,
        bookId: data.bookId,
        metadata: {
          bookTitle: book.title,
          style: data.style,
          targetAudience: data.targetAudience,
          includeAnnotations: data.includeAnnotations,
          annotationsCount: annotations.length,
          finishReason: aiResult.finishReason,
        },
      },
    });

    logger.info("Study guide generated", {
      userId: user.id,
      bookId: data.bookId,
      style: data.style,
      tokensUsed: aiResult.usage.totalTokens,
      cost: aiResult.cost.totalCost,
      durationMs: aiResult.durationMs,
    });

    // Return response
    sendSuccess(res, {
      studyGuide: aiResult.text,
      metadata: {
        bookTitle: book.title,
        bookAuthor: book.author,
        style: data.style,
        generatedAt: new Date().toISOString(),
      },
      usage: {
        promptTokens: aiResult.usage.promptTokens,
        completionTokens: aiResult.usage.completionTokens,
        totalTokens: aiResult.usage.totalTokens,
      },
      cost: {
        totalCost: aiResult.cost.totalCost,
      },
    });
  } catch (error) {
    logger.error("Study guide generation error", {
      error,
      userId,
      bookId: req.body?.bookId,
    });

    // Log failed usage
    try {
      const user = await getUserByClerkId(userId);
      if (user) {
        await db.aIUsageLog.create({
          data: {
            userId: user.id,
            operation: "study-guide",
            model: "unknown",
            provider: "anthropic",
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            cost: 0,
            durationMs: 0,
            success: false,
            bookId: req.body?.bookId || null,
            metadata: {
              error: error instanceof Error ? error.message : "Unknown error",
            },
          },
        });
      }
    } catch {
      // Failed to log
    }

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : "Failed to generate study guide",
      500
    );
  }
}

// ============================================================================
// Export
// ============================================================================

export default withAuth(handler);

export {
  studyGuideRequestSchema,
  studyGuideSectionsSchema,
  MAX_CONTENT_LENGTH,
  MAX_ANNOTATIONS,
  MAX_TOKENS,
};
