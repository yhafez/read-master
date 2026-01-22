/**
 * Study Guide Generation Hook
 *
 * React Query hook for generating AI-powered study guides.
 */

import { useMutation } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

export type StudyGuideStyle =
  | "comprehensive"
  | "summary"
  | "exam-prep"
  | "discussion"
  | "visual";

export type StudyGuideSections = {
  includeOverview?: boolean;
  includeKeyPoints?: boolean;
  includeVocabulary?: boolean;
  includeQuestions?: boolean;
  includeTimeline?: boolean;
  includeThemes?: boolean;
  includeSummary?: boolean;
};

export type StudyGuideRequest = {
  bookId: string;
  style?: StudyGuideStyle;
  sections?: StudyGuideSections;
  targetAudience?: "high-school" | "college" | "graduate" | "general";
  includeAnnotations?: boolean;
};

export type StudyGuideResponse = {
  studyGuide: string; // Markdown formatted study guide
  metadata: {
    bookTitle: string;
    bookAuthor?: string;
    style: string;
    generatedAt: string;
    tokensUsed: number;
    cost: number;
  };
};

// ============================================================================
// API Functions
// ============================================================================

async function generateStudyGuide(
  request: StudyGuideRequest
): Promise<StudyGuideResponse> {
  const response = await fetch("/api/ai/study-guide", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to generate study guide");
  }

  return response.json();
}

// ============================================================================
// React Query Hook
// ============================================================================

/**
 * Hook for generating study guides with AI
 */
export function useStudyGuide() {
  return useMutation({
    mutationFn: generateStudyGuide,
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get default sections for study guide
 */
export function getDefaultSections(): StudyGuideSections {
  return {
    includeOverview: true,
    includeKeyPoints: true,
    includeVocabulary: true,
    includeQuestions: true,
    includeThemes: true,
    includeSummary: true,
    includeTimeline: false,
  };
}

/**
 * Get style display name
 */
export function getStyleDisplayName(style: StudyGuideStyle): string {
  switch (style) {
    case "comprehensive":
      return "Comprehensive";
    case "summary":
      return "Summary";
    case "exam-prep":
      return "Exam Prep";
    case "discussion":
      return "Discussion";
    case "visual":
      return "Visual";
    default:
      return style;
  }
}

/**
 * Get style description
 */
export function getStyleDescription(style: StudyGuideStyle): string {
  switch (style) {
    case "comprehensive":
      return "Detailed coverage with thorough explanations";
    case "summary":
      return "Brief overview focusing on key points";
    case "exam-prep":
      return "Test-focused with practice questions";
    case "discussion":
      return "Discussion questions and themes";
    case "visual":
      return "Includes diagram and chart suggestions";
    default:
      return "";
  }
}
