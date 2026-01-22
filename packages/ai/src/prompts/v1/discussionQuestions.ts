/**
 * Discussion Questions Prompt Template
 *
 * Generates thought-provoking discussion questions based on book content.
 * Perfect for book clubs, study groups, or personal reflection.
 */

import type { BookContext, UserContext, PromptTemplate } from "../types.js";
import { formatBookContext, getReadingLevelDescription } from "../utils.js";

// =============================================================================
// TYPES
// =============================================================================

export type DiscussionQuestionsInput = {
  /** Book context information */
  book: BookContext;

  /** Specific section/chapter to focus on (optional) */
  section?: {
    title?: string;
    startPage?: number;
    endPage?: number;
    summary?: string;
  };

  /** User's reading progress (to avoid spoilers) */
  progress?: {
    percentage?: number;
    currentChapter?: string;
  };

  /** Type of questions to generate */
  questionType?:
    | "comprehension" // Understanding plot/characters
    | "analysis" // Deep analysis of themes/motifs
    | "application" // Connecting to real life
    | "creative" // Creative thinking/what-if scenarios
    | "mixed"; // Mix of all types

  /** Number of questions to generate */
  questionCount?: number; // Default: 5-8
};

export type DiscussionQuestion = {
  /** The question text */
  question: string;

  /** Question category */
  category:
    | "comprehension"
    | "analysis"
    | "application"
    | "reflection"
    | "creative";

  /** Difficulty level (1-5) */
  difficulty: number;

  /** Why this question is valuable */
  purpose: string;

  /** Key themes/topics this question explores */
  themes: string[];

  /** Starter hints to help answer (optional) */
  hints?: string[];

  /** Related passages to reference */
  relatedPassages?: string[];
};

export type DiscussionQuestionsOutput = {
  /** Generated discussion questions */
  questions: DiscussionQuestion[];

  /** Overall themes covered */
  themes: string[];

  /** Suggested discussion format */
  format?: {
    estimatedTime: number; // minutes
    groupSize?: string; // "2-4 people", "5-8 people", etc.
    tips: string[];
  };
};

// =============================================================================
// PROMPT TEMPLATE
// =============================================================================

/**
 * Discussion Questions prompt template
 */
export const discussionQuestionsPrompt: PromptTemplate<
  DiscussionQuestionsInput,
  DiscussionQuestionsOutput
> = {
  id: "discussion-questions",
  version: "1.0.0",
  description:
    "Generate thought-provoking discussion questions for book clubs and study groups",

  getSystemPrompt: (userContext: UserContext): string => {
    const levelDesc = getReadingLevelDescription(userContext.readingLevel);

    return `You are an expert discussion facilitator and literary analyst creating engaging discussion questions.

YOUR GOAL:
Generate thought-provoking questions that:
- Spark meaningful conversation and debate
- Explore themes, characters, and literary devices
- Connect the book to broader ideas and personal experience
- Encourage different perspectives and interpretations
- Balance accessibility with depth

QUESTION TYPES TO INCLUDE:

1. **Comprehension** (20-30%)
   - Understanding plot, characters, and basic concepts
   - "What happened when..." "Who is..." "Why did..."

2. **Analysis** (30-40%)
   - Deep exploration of themes, symbolism, motifs
   - "How does the author use..." "What's the significance of..."
   - "How does X relate to Y..."

3. **Application** (20-30%)
   - Connecting to real life and contemporary issues
   - "How would you..." "In what ways does this relate to..."
   - "What can we learn from..."

4. **Reflection** (10-20%)
   - Personal response and emotional connection
   - "How did you feel when..." "What surprised you..."
   - "Did this change your perspective on..."

5. **Creative** (10-15%)
   - Imagination and alternative scenarios
   - "What if..." "How would the story change if..."
   - "Imagine you're the character..."

IMPORTANT GUIDELINES:
- Design questions appropriate for ${levelDesc}
- Avoid simple yes/no questions
- Create open-ended prompts that allow multiple valid answers
- Include both specific and broad questions
- Balance easier and more challenging questions
- NO SPOILERS beyond the reader's current position
${userContext.language ? `- Generate questions in ${userContext.language}` : ""}

OUTPUT FORMAT:
Respond with a valid JSON object:
{
  "questions": [
    {
      "question": "The actual discussion question",
      "category": "analysis",
      "difficulty": 3,
      "purpose": "Why this question matters",
      "themes": ["theme1", "theme2"],
      "hints": ["Hint to help answer"],
      "relatedPassages": ["Quote or reference from the book"]
    }
  ],
  "themes": ["overarching theme1", "theme2", "theme3"],
  "format": {
    "estimatedTime": 45,
    "groupSize": "4-8 people",
    "tips": ["Discussion facilitation tip 1", "tip 2"]
  }
}`;
  },

  getUserPrompt: (input: DiscussionQuestionsInput): string => {
    const bookInfo = formatBookContext(input.book);
    const parts: string[] = [];

    // Book context
    parts.push(`BOOK INFORMATION:\n${bookInfo}`);

    // Specific section if provided
    if (input.section) {
      const section = input.section;
      const sectionInfo: string[] = [];
      if (section.title) sectionInfo.push(`Title: ${section.title}`);
      if (section.startPage && section.endPage) {
        sectionInfo.push(`Pages: ${section.startPage}-${section.endPage}`);
      }
      if (section.summary) sectionInfo.push(`Summary: ${section.summary}`);

      if (sectionInfo.length > 0) {
        parts.push(
          `\nSPECIFIC SECTION TO FOCUS ON:\n${sectionInfo.join("\n")}`
        );
      }
    }

    // Reader's progress (to avoid spoilers)
    if (input.progress) {
      const prog = input.progress;
      const progInfo: string[] = [];
      if (prog.percentage) {
        progInfo.push(`Reader is ${prog.percentage}% through the book`);
      }
      if (prog.currentChapter) {
        progInfo.push(`Currently reading: ${prog.currentChapter}`);
      }

      if (progInfo.length > 0) {
        parts.push(`\nREADER'S PROGRESS:\n${progInfo.join("\n")}`);
        parts.push(
          `⚠️ IMPORTANT: Do NOT include questions that reveal plot points beyond this position.`
        );
      }
    }

    // Question type preference
    const questionType = input.questionType || "mixed";
    const questionCount = input.questionCount || 7;

    parts.push(`\nQUESTION REQUIREMENTS:`);
    parts.push(`- Type: ${questionType}`);
    parts.push(`- Number of questions: ${questionCount}`);

    if (questionType === "mixed") {
      parts.push(
        `- Include a balanced mix of comprehension, analysis, application, reflection, and creative questions`
      );
    } else {
      parts.push(`- Focus primarily on ${questionType} questions`);
    }

    parts.push(
      `\n====================\nGenerate ${questionCount} engaging discussion questions that will spark meaningful conversation about this book.`
    );

    return parts.join("\n");
  },

  parseResponse: (response: string): DiscussionQuestionsOutput => {
    try {
      const parsed = JSON.parse(response);

      // Validate required fields
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error("Missing or invalid questions array");
      }

      return {
        questions: parsed.questions.map((q: DiscussionQuestion) => ({
          question: q.question,
          category: q.category || "analysis",
          difficulty: q.difficulty || 3,
          purpose: q.purpose || "",
          themes: q.themes || [],
          hints: q.hints || [],
          relatedPassages: q.relatedPassages || [],
        })),
        themes: parsed.themes || [],
        format: parsed.format || undefined,
      };
    } catch (_error) {
      // Fallback: parse as plain text
      const lines = response.split("\n").filter((line) => line.trim());
      const questions: DiscussionQuestion[] = lines
        .filter((line) => line.match(/^\d+\.|^-|\?$/))
        .map((line, _index) => ({
          question: line.replace(/^\d+\.|-/, "").trim(),
          category: "analysis" as const,
          difficulty: 3,
          purpose: "Discussion prompt",
          themes: [],
        }));

      return {
        questions:
          questions.length > 0
            ? questions
            : [
                {
                  question: response.trim(),
                  category: "analysis",
                  difficulty: 3,
                  purpose: "Discussion prompt",
                  themes: [],
                },
              ],
        themes: [],
      };
    }
  },

  validateInput: (
    input: DiscussionQuestionsInput
  ): { valid: boolean; error?: string } => {
    if (!input.book) {
      return { valid: false, error: "Book context is required" };
    }

    if (
      input.questionCount &&
      (input.questionCount < 1 || input.questionCount > 20)
    ) {
      return {
        valid: false,
        error: "Question count must be between 1 and 20",
      };
    }

    return { valid: true };
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate Discussion Questions prompt from input
 */
export function generateDiscussionQuestionsPrompt(
  input: DiscussionQuestionsInput,
  userContext: UserContext
): string {
  return `${discussionQuestionsPrompt.getSystemPrompt(userContext)}\n\n${discussionQuestionsPrompt.getUserPrompt(input)}`;
}

/**
 * Parse Discussion Questions response
 */
export function parseDiscussionQuestionsResponse(
  response: string
): DiscussionQuestionsOutput {
  return discussionQuestionsPrompt.parseResponse(response);
}

/**
 * Validate Discussion Questions input
 */
export function validateDiscussionQuestionsInput(
  input: DiscussionQuestionsInput
): { valid: boolean; error?: string } {
  return discussionQuestionsPrompt.validateInput(input);
}
