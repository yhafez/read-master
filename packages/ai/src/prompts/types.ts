/**
 * AI Prompt Template Types
 *
 * Shared types used by all AI prompt templates.
 */

// =============================================================================
// READING LEVEL TYPES
// =============================================================================

/**
 * Reading level for adapting AI responses
 */
export type ReadingLevel =
  | "beginner"
  | "elementary"
  | "middle_school"
  | "high_school"
  | "college"
  | "advanced";

/**
 * Bloom's Taxonomy cognitive levels for assessment questions
 */
export type BloomLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";

/**
 * Question types for assessments
 */
export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "essay"
  | "fill_blank";

/**
 * Flashcard types for generation
 */
export type FlashcardType =
  | "vocabulary"
  | "concept"
  | "comprehension"
  | "quote";

// =============================================================================
// PROMPT INPUT TYPES
// =============================================================================

/**
 * Book context provided to AI prompts
 */
export type BookContext = {
  /** Book title */
  title: string;
  /** Book author(s) */
  author: string;
  /** Book genre/category */
  genre?: string;
  /** Brief description or summary */
  description?: string;
  /** Sample or full text content */
  content: string;
  /** User's current position in the book (0-1) */
  progressPercentage?: number;
};

/**
 * User context for personalizing AI responses
 */
export type UserContext = {
  /** User's reading level */
  readingLevel: ReadingLevel;
  /** User's preferred language */
  language?: string;
  /** User's name for personalization */
  name?: string;
  /** Previous reading history context */
  readingHistory?: string;
};

// =============================================================================
// PROMPT TEMPLATE TYPES
// =============================================================================

/**
 * Base prompt template configuration
 */
export type PromptTemplate<TInput, TOutput> = {
  /** Unique template identifier */
  id: string;
  /** Template version */
  version: string;
  /** Template description */
  description: string;
  /** Generate system prompt */
  getSystemPrompt: (userContext: UserContext) => string;
  /** Generate user prompt from input */
  getUserPrompt: (input: TInput) => string;
  /** Parse AI response into structured output */
  parseResponse: (response: string) => TOutput;
  /** Validate input before generating prompt */
  validateInput: (input: TInput) => { valid: boolean; error?: string };
};

// =============================================================================
// READING LEVEL DESCRIPTIONS
// =============================================================================

/**
 * Descriptions for each reading level to include in prompts
 */
export const READING_LEVEL_DESCRIPTIONS: Record<ReadingLevel, string> = {
  beginner:
    "a beginner reader (grades K-2). Use very simple words, short sentences, and concrete examples. Avoid abstract concepts.",
  elementary:
    "an elementary reader (grades 3-5). Use clear language, simple vocabulary, and relatable examples. Explain any difficult words.",
  middle_school:
    "a middle school reader (grades 6-8). Use accessible language with some academic vocabulary. Include relevant examples and analogies.",
  high_school:
    "a high school reader (grades 9-12). Use academic language appropriately. Include analysis and critical thinking prompts.",
  college:
    "a college reader. Use sophisticated vocabulary and complex sentence structures. Encourage deep analysis and synthesis.",
  advanced:
    "an advanced/graduate reader. Use technical terminology freely. Encourage scholarly analysis and original insights.",
} as const;

/**
 * Get the reading level description for prompts
 */
export function getReadingLevelDescription(level: ReadingLevel): string {
  return READING_LEVEL_DESCRIPTIONS[level];
}

// =============================================================================
// BLOOM'S TAXONOMY DESCRIPTIONS
// =============================================================================

/**
 * Descriptions for Bloom's Taxonomy levels
 */
export const BLOOM_LEVEL_DESCRIPTIONS: Record<BloomLevel, string> = {
  remember: "Recall facts and basic concepts (define, list, memorize, repeat)",
  understand:
    "Explain ideas or concepts (classify, describe, explain, summarize)",
  apply:
    "Use information in new situations (execute, implement, solve, demonstrate)",
  analyze:
    "Draw connections among ideas (differentiate, organize, compare, contrast)",
  evaluate: "Justify a decision or course of action (argue, defend, critique)",
  create: "Produce new or original work (design, construct, develop, compose)",
} as const;

/**
 * Get Bloom's level description
 */
export function getBloomLevelDescription(level: BloomLevel): string {
  return BLOOM_LEVEL_DESCRIPTIONS[level];
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Truncate content to a maximum length with ellipsis
 */
export function truncateContent(
  content: string,
  maxLength: number = 10000
): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.slice(0, maxLength - 3) + "...";
}

/**
 * Format book context for prompts
 */
export function formatBookContext(book: BookContext): string {
  const parts: string[] = [`Title: "${book.title}"`, `Author: ${book.author}`];

  if (book.genre) {
    parts.push(`Genre: ${book.genre}`);
  }

  if (book.description) {
    parts.push(`Description: ${book.description}`);
  }

  if (book.progressPercentage !== undefined) {
    parts.push(
      `Reading Progress: ${Math.round(book.progressPercentage * 100)}%`
    );
  }

  return parts.join("\n");
}

/**
 * Validate that required fields are present
 */
export function validateRequired<T extends object>(
  input: T,
  requiredFields: (keyof T)[]
): { valid: boolean; error?: string } {
  for (const field of requiredFields) {
    const value = input[field];
    if (value === undefined || value === null || value === "") {
      return {
        valid: false,
        error: `Missing required field: ${String(field)}`,
      };
    }
  }
  return { valid: true };
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  minLength: number,
  maxLength: number,
  fieldName: string
): { valid: boolean; error?: string } {
  if (value.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }
  if (value.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} must be at most ${maxLength} characters`,
    };
  }
  return { valid: true };
}
