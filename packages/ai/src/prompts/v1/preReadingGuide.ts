/**
 * Pre-Reading Guide Prompt Template v1
 *
 * Generates a comprehensive pre-reading guide to help readers
 * prepare for and understand a book before they begin reading.
 */

import {
  type BookContext,
  type UserContext,
  type PromptTemplate,
  getReadingLevelDescription,
  formatBookContext,
  truncateContent,
  validateRequired,
  validateLength,
} from "../types.js";

// =============================================================================
// INPUT/OUTPUT TYPES
// =============================================================================

/**
 * Input for pre-reading guide generation
 */
export type PreReadingGuideInput = {
  /** Book context including title, author, and sample content */
  book: BookContext;
};

/**
 * Output structure for pre-reading guide
 */
export type PreReadingGuideOutput = {
  /** Overview section of the guide */
  overview: {
    /** Brief summary of what the book is about */
    summary: string;
    /** Main themes to look for while reading */
    themes: string[];
    /** Who this book is ideal for */
    targetAudience: string;
  };
  /** Key concepts to understand before reading */
  keyConcepts: Array<{
    /** Concept name or term */
    term: string;
    /** Explanation of the concept */
    definition: string;
    /** Why this concept matters for understanding the book */
    relevance: string;
  }>;
  /** Historical or cultural context needed */
  context: {
    /** Historical period or setting */
    historicalContext?: string;
    /** Cultural background relevant to the book */
    culturalContext?: string;
    /** Author's background that influences the work */
    authorContext?: string;
  };
  /** Questions to think about while reading */
  guidingQuestions: string[];
  /** Vocabulary words that may be unfamiliar */
  vocabulary: Array<{
    /** The word */
    word: string;
    /** Definition */
    definition: string;
    /** Example usage */
    example?: string;
  }>;
  /** Tips for getting the most out of reading this book */
  readingTips: string[];
};

// =============================================================================
// PROMPT TEMPLATE
// =============================================================================

/**
 * Pre-reading guide prompt template
 */
export const preReadingGuidePrompt: PromptTemplate<
  PreReadingGuideInput,
  PreReadingGuideOutput
> = {
  id: "pre-reading-guide",
  version: "1.0.0",
  description:
    "Generate a comprehensive pre-reading guide to help readers prepare for a book",

  getSystemPrompt: (userContext: UserContext): string => {
    const levelDesc = getReadingLevelDescription(userContext.readingLevel);

    return `You are an expert reading coach helping readers prepare for a new book.
Your task is to create a comprehensive pre-reading guide.

IMPORTANT GUIDELINES:
- Adapt all content for ${levelDesc}
- Be encouraging and create excitement about the reading
- Explain complex concepts in accessible terms
- Focus on enhancing comprehension, not spoiling the story
- Include context that will help the reader connect with the material
${userContext.language ? `- Respond in ${userContext.language}` : ""}

OUTPUT FORMAT:
You must respond with a valid JSON object matching this structure:
{
  "overview": {
    "summary": "Brief summary of what the book is about (2-3 sentences)",
    "themes": ["theme1", "theme2", "theme3"],
    "targetAudience": "Who this book is ideal for"
  },
  "keyConcepts": [
    {
      "term": "concept name",
      "definition": "clear explanation",
      "relevance": "why this matters for the book"
    }
  ],
  "context": {
    "historicalContext": "relevant historical background (optional)",
    "culturalContext": "relevant cultural background (optional)",
    "authorContext": "relevant author background (optional)"
  },
  "guidingQuestions": [
    "Question to think about while reading"
  ],
  "vocabulary": [
    {
      "word": "difficult word",
      "definition": "clear definition",
      "example": "example sentence (optional)"
    }
  ],
  "readingTips": [
    "Tip for getting the most out of this book"
  ]
}

Ensure all content is appropriate for the reader's level and genuinely helpful for understanding the book.`;
  },

  getUserPrompt: (input: PreReadingGuideInput): string => {
    const bookInfo = formatBookContext(input.book);
    const contentSample = truncateContent(input.book.content, 8000);

    return `Please create a pre-reading guide for the following book:

${bookInfo}

CONTENT SAMPLE:
${contentSample}

Generate a comprehensive pre-reading guide that will help the reader:
1. Understand what to expect from this book
2. Learn key concepts and vocabulary beforehand
3. Understand the relevant context
4. Have guiding questions to think about while reading
5. Get tips for maximizing their reading experience

Respond with a valid JSON object following the specified format.`;
  },

  parseResponse: (response: string): PreReadingGuideOutput => {
    // Try to extract JSON from the response
    let jsonStr = response.trim();

    // Handle markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr) as PreReadingGuideOutput;

      // Validate required fields
      if (!parsed.overview?.summary) {
        throw new Error("Missing overview.summary");
      }

      // Set defaults for optional arrays
      parsed.overview.themes = parsed.overview.themes ?? [];
      parsed.keyConcepts = parsed.keyConcepts ?? [];
      parsed.guidingQuestions = parsed.guidingQuestions ?? [];
      parsed.vocabulary = parsed.vocabulary ?? [];
      parsed.readingTips = parsed.readingTips ?? [];
      parsed.context = parsed.context ?? {};

      return parsed;
    } catch {
      // If parsing fails, create a basic structure from the text
      return {
        overview: {
          summary: response.slice(0, 500),
          themes: [],
          targetAudience: "General readers",
        },
        keyConcepts: [],
        context: {},
        guidingQuestions: [],
        vocabulary: [],
        readingTips: [],
      };
    }
  },

  validateInput: (
    input: PreReadingGuideInput
  ): { valid: boolean; error?: string } => {
    // Check required fields
    const requiredCheck = validateRequired(input.book, [
      "title",
      "author",
      "content",
    ]);
    if (!requiredCheck.valid) {
      return requiredCheck;
    }

    // Check content length
    const lengthCheck = validateLength(
      input.book.content,
      100,
      100000,
      "Book content"
    );
    if (!lengthCheck.valid) {
      return lengthCheck;
    }

    return { valid: true };
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate pre-reading guide prompt strings
 */
export function generatePreReadingGuidePrompt(
  input: PreReadingGuideInput,
  userContext: UserContext
): { system: string; user: string } {
  return {
    system: preReadingGuidePrompt.getSystemPrompt(userContext),
    user: preReadingGuidePrompt.getUserPrompt(input),
  };
}

/**
 * Parse pre-reading guide response
 */
export function parsePreReadingGuideResponse(
  response: string
): PreReadingGuideOutput {
  return preReadingGuidePrompt.parseResponse(response);
}

/**
 * Validate pre-reading guide input
 */
export function validatePreReadingGuideInput(input: PreReadingGuideInput): {
  valid: boolean;
  error?: string;
} {
  return preReadingGuidePrompt.validateInput(input);
}
