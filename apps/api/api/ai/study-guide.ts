/**
 * Study Guide Generation API
 *
 * POST /api/ai/study-guide
 * Generates comprehensive study guides from book content using AI.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { getAuth } from "@clerk/nextjs/server";

import { prisma } from "@read-master/database";
import {
  studyGuidePrompt,
  type StudyGuideInput,
  type StudyGuideStyle,
  DEFAULT_STUDY_GUIDE_SECTIONS,
} from "@read-master/ai/prompts/studyGuidePrompt";
import { callAI } from "../../src/services/aiService";
import { logAIUsage } from "../../src/services/aiUsageLogger";

// ============================================================================
// Validation Schemas
// ============================================================================

const studyGuideRequestSchema = z.object({
  bookId: z.string().uuid(),
  style: z
    .enum(["comprehensive", "summary", "exam-prep", "discussion", "visual"])
    .default("comprehensive"),
  sections: z
    .object({
      includeOverview: z.boolean().optional(),
      includeKeyPoints: z.boolean().optional(),
      includeVocabulary: z.boolean().optional(),
      includeQuestions: z.boolean().optional(),
      includeTimeline: z.boolean().optional(),
      includeThemes: z.boolean().optional(),
      includeSummary: z.boolean().optional(),
    })
    .optional(),
  targetAudience: z
    .enum(["high-school", "college", "graduate", "general"])
    .optional(),
  includeAnnotations: z.boolean().default(true),
});

type StudyGuideRequest = z.infer<typeof studyGuideRequestSchema>;

// ============================================================================
// Main Handler
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Authenticate user
    const auth = getAuth(req);
    const userId = auth.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate request body
    const validationResult = studyGuideRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validationResult.error.errors,
      });
    }

    const data: StudyGuideRequest = validationResult.data;

    // Fetch book
    const book = await prisma.book.findFirst({
      where: {
        id: data.bookId,
        userId,
        deletedAt: null,
      },
    });

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    // Fetch book content
    let content = "";
    if (book.rawContentUrl) {
      // Fetch from R2 storage
      const response = await fetch(book.rawContentUrl);
      if (response.ok) {
        content = await response.text();
      }
    }

    if (!content) {
      return res.status(400).json({
        error: "Book content not available for study guide generation",
      });
    }

    // Fetch user annotations if requested
    let annotations: Array<{
      type: "HIGHLIGHT" | "NOTE" | "BOOKMARK";
      text?: string;
      note?: string;
    }> = [];

    if (data.includeAnnotations) {
      const dbAnnotations = await prisma.annotation.findMany({
        where: {
          bookId: data.bookId,
          userId,
          deletedAt: null,
        },
        orderBy: {
          startOffset: "asc",
        },
        take: 50, // Limit annotations
      });

      annotations = dbAnnotations.map((ann) => ({
        type: ann.type as "HIGHLIGHT" | "NOTE" | "BOOKMARK",
        text: ann.selectedText || undefined,
        note: ann.note || undefined,
      }));
    }

    // Build AI context
    const context: StudyGuideInput = {
      bookTitle: book.title,
      bookAuthor: book.author || undefined,
      content,
      annotations,
      style: data.style as StudyGuideStyle,
      sections: data.sections || DEFAULT_STUDY_GUIDE_SECTIONS,
      targetAudience: data.targetAudience,
    };

    // Generate prompt
    const userPrompt = studyGuidePrompt.buildPrompt(context);

    // Call AI
    const startTime = Date.now();
    const aiResponse = await callAI({
      systemPrompt: studyGuidePrompt.systemPrompt,
      userPrompt,
      temperature: studyGuidePrompt.temperature || 0.7,
      maxTokens: studyGuidePrompt.maxTokens || 4000,
    });
    const duration = Date.now() - startTime;

    // Log AI usage
    await logAIUsage({
      userId,
      operation: "STUDY_GUIDE",
      bookId: data.bookId,
      tokensUsed: aiResponse.tokensUsed,
      cost: aiResponse.cost,
      duration,
      success: true,
    });

    // Return study guide
    return res.status(200).json({
      studyGuide: aiResponse.content,
      metadata: {
        bookTitle: book.title,
        bookAuthor: book.author,
        style: data.style,
        generatedAt: new Date().toISOString(),
        tokensUsed: aiResponse.tokensUsed,
        cost: aiResponse.cost,
      },
    });
  } catch (error) {
    // Log failed AI usage
    try {
      const auth = getAuth(req);
      if (auth.userId && req.body?.bookId) {
        await logAIUsage({
          userId: auth.userId,
          operation: "STUDY_GUIDE",
          bookId: req.body.bookId,
          tokensUsed: 0,
          cost: 0,
          duration: 0,
          success: false,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        });
      }
    } catch {
      // Failed to log AI usage
    }

    if (error instanceof Error) {
      return res.status(500).json({
        error: "Failed to generate study guide",
        message: error.message,
      });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
}
