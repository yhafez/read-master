/**
 * Summarize Notes Prompt Template
 *
 * Automatically summarizes user's highlights and notes into
 * coherent, organized summaries for review and study.
 */

import type { BookContext, UserContext, PromptTemplate } from "../types.js";
import { formatBookContext, getReadingLevelDescription } from "../utils.js";

// =============================================================================
// TYPES
// =============================================================================

export type Annotation = {
  text: string;
  note?: string;
  color?: string;
  page?: number;
  chapter?: string;
  createdAt: string;
  type: "highlight" | "note" | "bookmark";
};

export type SummarizeNotesInput = {
  /** Book context information */
  book: BookContext;

  /** User's annotations to summarize */
  annotations: Annotation[];

  /** Summarization style */
  style?: "concise" | "detailed" | "study-guide";

  /** Group by */
  groupBy?: "chapter" | "theme" | "chronological";

  /** Include original quotes */
  includeQuotes?: boolean;
};

export type NoteSummary = {
  /** Section title */
  title: string;

  /** Summary of notes in this section */
  summary: string;

  /** Key insights extracted */
  keyInsights: string[];

  /** Related annotations */
  annotations: number[]; // Indices of annotations in this section

  /** Key terms/concepts */
  concepts?: string[];
};

export type SummarizeNotesOutput = {
  /** Overall summary */
  overallSummary: string;

  /** Summaries by section */
  sections: NoteSummary[];

  /** Key themes across all notes */
  keyThemes: string[];

  /** Main takeaways */
  mainTakeaways: string[];

  /** Suggested review topics */
  reviewTopics?: string[];
};

// =============================================================================
// PROMPT TEMPLATE
// =============================================================================

export const summarizeNotesPrompt: PromptTemplate<
  SummarizeNotesInput,
  SummarizeNotesOutput
> = {
  id: "summarize-notes",
  version: "1.0.0",
  description:
    "Automatically summarize user's highlights and notes into organized, coherent summaries",

  getSystemPrompt: (userContext: UserContext): string => {
    const levelDesc = getReadingLevelDescription(userContext.readingLevel);

    return `You are an expert note-taking assistant creating organized summaries from reading annotations.

YOUR GOAL:
Transform scattered highlights and notes into:
- Coherent, organized summaries
- Clear identification of key themes and insights
- Connections between related ideas
- Actionable takeaways

SUMMARIZATION PRINCIPLES:
- Synthesize, don't just list: combine related ideas
- Identify patterns and themes across annotations
- Highlight the most important insights
- Maintain the user's voice in their own notes
- Create logical flow between sections
- Be concise but comprehensive
- Appropriate for ${levelDesc}
${userContext.language ? `- Respond in ${userContext.language}` : ""}

OUTPUT FORMAT:
Respond with a valid JSON object:
{
  "overallSummary": "2-3 paragraph synthesis of all notes",
  "sections": [
    {
      "title": "Section/theme title",
      "summary": "Coherent summary of notes in this section",
      "keyInsights": ["Insight 1", "Insight 2"],
      "annotations": [0, 3, 7],
      "concepts": ["concept1", "concept2"]
    }
  ],
  "keyThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "mainTakeaways": ["Takeaway 1", "Takeaway 2"],
  "reviewTopics": ["Topic to review 1", "Topic 2"]
}`;
  },

  getUserPrompt: (input: SummarizeNotesInput): string => {
    const bookInfo = formatBookContext(input.book);
    const style = input.style || "detailed";
    const groupBy = input.groupBy || "theme";
    const includeQuotes = input.includeQuotes !== false;

    const parts: string[] = [];

    parts.push(`BOOK INFORMATION:\n${bookInfo}`);

    parts.push(`\nSUMMARIZATION REQUIREMENTS:`);
    parts.push(`- Style: ${style}`);
    parts.push(`- Group by: ${groupBy}`);
    parts.push(`- Include quotes: ${includeQuotes ? "Yes" : "No"}`);

    // Format annotations
    parts.push(`\nUSER'S ANNOTATIONS (${input.annotations.length} total):\n`);

    input.annotations.forEach((ann, index) => {
      const parts_ann: string[] = [];
      parts_ann.push(`[${index}] ${ann.type.toUpperCase()}`);

      if (ann.chapter) parts_ann.push(`Chapter: ${ann.chapter}`);
      if (ann.page) parts_ann.push(`Page: ${ann.page}`);

      parts.push(parts_ann.join(" | "));
      parts.push(`Text: "${ann.text}"`);
      if (ann.note) parts.push(`Note: "${ann.note}"`);
      parts.push(``); // Empty line between annotations
    });

    parts.push(`\n====================`);
    parts.push(
      `Create an organized, coherent summary that synthesizes these annotations.`
    );
    parts.push(`Focus on extracting key themes, insights, and connections.`);

    return parts.join("\n");
  },

  parseResponse: (response: string): SummarizeNotesOutput => {
    try {
      const parsed = JSON.parse(response);

      return {
        overallSummary: parsed.overallSummary || "",
        sections: parsed.sections || [],
        keyThemes: parsed.keyThemes || [],
        mainTakeaways: parsed.mainTakeaways || [],
        reviewTopics: parsed.reviewTopics || [],
      };
    } catch (_error) {
      // Fallback: treat as plain text summary
      return {
        overallSummary: response.trim(),
        sections: [],
        keyThemes: [],
        mainTakeaways: [],
        reviewTopics: [],
      };
    }
  },

  validateInput: (
    input: SummarizeNotesInput
  ): { valid: boolean; error?: string } => {
    if (!input.book) {
      return { valid: false, error: "Book context is required" };
    }

    if (!input.annotations || input.annotations.length === 0) {
      return { valid: false, error: "At least one annotation is required" };
    }

    if (input.annotations.length > 200) {
      return {
        valid: false,
        error: "Too many annotations (max 200 at a time)",
      };
    }

    return { valid: true };
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function generateSummarizeNotesPrompt(
  input: SummarizeNotesInput,
  userContext: UserContext
): string {
  return `${summarizeNotesPrompt.getSystemPrompt(userContext)}\n\n${summarizeNotesPrompt.getUserPrompt(input)}`;
}

export function parseSummarizeNotesResponse(
  response: string
): SummarizeNotesOutput {
  return summarizeNotesPrompt.parseResponse(response);
}

export function validateSummarizeNotesInput(input: SummarizeNotesInput): {
  valid: boolean;
  error?: string;
} {
  return summarizeNotesPrompt.validateInput(input);
}
