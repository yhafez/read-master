/**
 * AI Prompt Templates
 *
 * Exports all prompt templates and types for Read Master AI features.
 */

// Shared types
export {
  type ReadingLevel,
  type BloomLevel,
  type QuestionType,
  type FlashcardType,
  type BookContext,
  type UserContext,
  type PromptTemplate,
  READING_LEVEL_DESCRIPTIONS,
  BLOOM_LEVEL_DESCRIPTIONS,
  getReadingLevelDescription,
  getBloomLevelDescription,
  truncateContent,
  formatBookContext,
  validateRequired,
  validateLength,
} from "./types.js";

// V1 Prompt Templates (current version)
export * from "./v1/index.js";
