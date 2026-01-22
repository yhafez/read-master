/**
 * Reading Difficulty Assessment Prompt Template
 *
 * Analyzes book content to determine reading difficulty level
 * and provides personalized recommendations for reader level matching.
 */

import type {
  BookContext,
  UserContext,
  PromptTemplate,
  ReadingLevel,
} from "../types.js";
import { formatBookContext, getReadingLevelDescription } from "../utils.js";

// =============================================================================
// TYPES
// =============================================================================

export type AssessDifficultyInput = {
  /** Book context information */
  book: BookContext;

  /** Sample text from the book for analysis */
  sampleText: string;

  /** User's current reading level (for comparison) */
  userReadingLevel?: ReadingLevel;

  /** User's reading goals */
  readingGoals?: string[];
};

export type DifficultyMetrics = {
  /** Overall difficulty rating (1-10) */
  overallDifficulty: number;

  /** Vocabulary complexity (1-10) */
  vocabularyLevel: number;

  /** Sentence structure complexity (1-10) */
  sentenceComplexity: number;

  /** Concept density (1-10) */
  conceptDensity: number;

  /** Prior knowledge required (1-10) */
  priorKnowledgeRequired: number;
};

export type ReaderMatch = {
  /** How well this book matches the reader (1-10) */
  matchScore: number;

  /** Is this book appropriate for the reader? */
  isAppropriate: boolean;

  /** Recommendation */
  recommendation:
    | "perfect"
    | "good-fit"
    | "challenging"
    | "too-difficult"
    | "too-easy";

  /** Explanation of the match */
  explanation: string;
};

export type AssessDifficultyOutput = {
  /** Difficulty metrics */
  metrics: DifficultyMetrics;

  /** Suggested reader level */
  suggestedLevel: ReadingLevel;

  /** Estimated reading time for average reader (minutes per page) */
  estimatedReadingTime: {
    fast: number; // WPM 300+
    average: number; // WPM 200-300
    careful: number; // WPM 150-200
  };

  /** Reader match analysis (if userReadingLevel provided) */
  readerMatch?: ReaderMatch;

  /** Challenging aspects */
  challengingAspects: string[];

  /** Accessible aspects */
  accessibleAspects: string[];

  /** Recommendations for readers */
  recommendations: {
    /** Who this book is best for */
    bestFor: string[];

    /** Preparation tips */
    preparationTips: string[];

    /** Support strategies */
    supportStrategies: string[];
  };

  /** Comparable books at similar difficulty */
  comparableBooks?: string[];
};

// =============================================================================
// PROMPT TEMPLATE
// =============================================================================

export const assessDifficultyPrompt: PromptTemplate<
  AssessDifficultyInput,
  AssessDifficultyOutput
> = {
  id: "assess-difficulty",
  version: "1.0.0",
  description:
    "Analyze reading difficulty and provide personalized reader level matching",

  getSystemPrompt: (userContext: UserContext): string => {
    return `You are an expert reading specialist and literacy educator analyzing book difficulty.

YOUR GOAL:
Provide comprehensive reading difficulty assessment including:
- Objective difficulty metrics
- Reader level recommendations
- Personalized matching for specific readers
- Practical support strategies

ASSESSMENT CRITERIA:

1. **Vocabulary Level** (1-10)
   - Word complexity and rarity
   - Domain-specific terminology
   - Academic vs. conversational language

2. **Sentence Complexity** (1-10)
   - Sentence length and structure
   - Use of subordinate clauses
   - Grammatical sophistication

3. **Concept Density** (1-10)
   - Ideas per page
   - Abstract vs. concrete concepts
   - Cognitive load

4. **Prior Knowledge Required** (1-10)
   - Background knowledge needed
   - Cultural/historical references
   - Domain expertise required

5. **Overall Difficulty** (1-10)
   - Synthesized assessment
   - Holistic evaluation

READER LEVELS:
- **Beginner**: New to the genre/topic, building fluency
- **Intermediate**: Comfortable reader, some background knowledge
- **Advanced**: Experienced reader, seeks intellectual challenge
- **Expert**: Scholar/professional level, deep expertise

IMPORTANT GUIDELINES:
- Be objective and evidence-based
- Consider multiple dimensions of difficulty
- Provide actionable recommendations
- Balance challenge with accessibility
- Consider the specific reader's context
${userContext.language ? `- Respond in ${userContext.language}` : ""}

OUTPUT FORMAT:
Respond with a valid JSON object:
{
  "metrics": {
    "overallDifficulty": 7,
    "vocabularyLevel": 8,
    "sentenceComplexity": 7,
    "conceptDensity": 6,
    "priorKnowledgeRequired": 5
  },
  "suggestedLevel": "advanced",
  "estimatedReadingTime": {
    "fast": 2,
    "average": 3,
    "careful": 4
  },
  "readerMatch": {
    "matchScore": 8,
    "isAppropriate": true,
    "recommendation": "challenging",
    "explanation": "This book will stretch your skills..."
  },
  "challengingAspects": ["Dense philosophical concepts", "Complex sentence structures"],
  "accessibleAspects": ["Clear narrative structure", "Concrete examples"],
  "recommendations": {
    "bestFor": ["Philosophy students", "Advanced readers interested in ethics"],
    "preparationTips": ["Review basic philosophical terms", "Read author's earlier work"],
    "supportStrategies": ["Take notes on key concepts", "Discuss with study group"]
  },
  "comparableBooks": ["Book 1 by Author", "Similar Book by Other Author"]
}`;
  },

  getUserPrompt: (input: AssessDifficultyInput): string => {
    const bookInfo = formatBookContext(input.book);
    const parts: string[] = [];

    parts.push(`BOOK INFORMATION:\n${bookInfo}`);

    parts.push(`\nSAMPLE TEXT FOR ANALYSIS:\n"${input.sampleText}"`);

    if (input.userReadingLevel) {
      const levelDesc = getReadingLevelDescription(input.userReadingLevel);
      parts.push(`\nREADER'S CURRENT LEVEL: ${levelDesc}`);
      parts.push(
        `Please include detailed reader match analysis for this specific reader level.`
      );
    }

    if (input.readingGoals && input.readingGoals.length > 0) {
      parts.push(
        `\nREADER'S GOALS:\n${input.readingGoals.map((g) => `- ${g}`).join("\n")}`
      );
    }

    parts.push(`\n====================`);
    parts.push(`Analyze the difficulty of this book comprehensively.`);
    parts.push(`Provide objective metrics and personalized recommendations.`);

    return parts.join("\n");
  },

  parseResponse: (response: string): AssessDifficultyOutput => {
    try {
      const parsed = JSON.parse(response);

      // Validate and normalize
      return {
        metrics: {
          overallDifficulty: parsed.metrics?.overallDifficulty || 5,
          vocabularyLevel: parsed.metrics?.vocabularyLevel || 5,
          sentenceComplexity: parsed.metrics?.sentenceComplexity || 5,
          conceptDensity: parsed.metrics?.conceptDensity || 5,
          priorKnowledgeRequired: parsed.metrics?.priorKnowledgeRequired || 5,
        },
        suggestedLevel: parsed.suggestedLevel || "college",
        estimatedReadingTime: parsed.estimatedReadingTime || {
          fast: 2,
          average: 3,
          careful: 4,
        },
        readerMatch: parsed.readerMatch,
        challengingAspects: parsed.challengingAspects || [],
        accessibleAspects: parsed.accessibleAspects || [],
        recommendations: {
          bestFor: parsed.recommendations?.bestFor || [],
          preparationTips: parsed.recommendations?.preparationTips || [],
          supportStrategies: parsed.recommendations?.supportStrategies || [],
        },
        comparableBooks: parsed.comparableBooks || [],
      };
    } catch (_error) {
      // Fallback with default values
      return {
        metrics: {
          overallDifficulty: 5,
          vocabularyLevel: 5,
          sentenceComplexity: 5,
          conceptDensity: 5,
          priorKnowledgeRequired: 5,
        },
        suggestedLevel: "college",
        estimatedReadingTime: {
          fast: 2,
          average: 3,
          careful: 4,
        },
        challengingAspects: [],
        accessibleAspects: [],
        recommendations: {
          bestFor: [],
          preparationTips: [],
          supportStrategies: [],
        },
      };
    }
  },

  validateInput: (
    input: AssessDifficultyInput
  ): { valid: boolean; error?: string } => {
    if (!input.book) {
      return { valid: false, error: "Book context is required" };
    }

    if (!input.sampleText || input.sampleText.length < 100) {
      return {
        valid: false,
        error:
          "Sample text must be at least 100 characters for accurate analysis",
      };
    }

    if (input.sampleText.length > 5000) {
      return {
        valid: false,
        error: "Sample text is too long (max 5000 characters)",
      };
    }

    return { valid: true };
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function generateAssessDifficultyPrompt(
  input: AssessDifficultyInput,
  userContext: UserContext
): string {
  return `${assessDifficultyPrompt.getSystemPrompt(userContext)}\n\n${assessDifficultyPrompt.getUserPrompt(input)}`;
}

export function parseAssessDifficultyResponse(
  response: string
): AssessDifficultyOutput {
  return assessDifficultyPrompt.parseResponse(response);
}

export function validateAssessDifficultyInput(input: AssessDifficultyInput): {
  valid: boolean;
  error?: string;
} {
  return assessDifficultyPrompt.validateInput(input);
}
