/**
 * Utility functions for AI prompt templates
 */

import type { BookContext, ReadingLevel } from "./types.js";

/**
 * Format book context information for use in prompts
 */
export function formatBookContext(book: BookContext): string {
  const parts: string[] = [];

  parts.push(`Title: ${book.title}`);
  if (book.author) parts.push(`Author: ${book.author}`);
  if (book.genre) parts.push(`Genre: ${book.genre}`);
  if (book.description) parts.push(`Description: ${book.description}`);

  return parts.join("\n");
}

/**
 * Get human-readable description of reading level
 */
export function getReadingLevelDescription(level: ReadingLevel): string {
  const descriptions: Record<ReadingLevel, string> = {
    beginner:
      "Beginner - New to reading, building basic fluency and vocabulary",
    elementary:
      "Elementary - Young reader (grades K-5), simple concepts and language",
    middle_school:
      "Middle School - Pre-teen reader (grades 6-8), moderate complexity",
    high_school:
      "High School - Teen reader (grades 9-12), more complex ideas and vocabulary",
    college:
      "College - Adult reader with academic background, sophisticated content",
    advanced:
      "Advanced - Experienced reader seeking intellectual challenge and expert-level material",
  };

  return descriptions[level] || level;
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Clean and normalize text for AI processing
 */
export function normalizeText(text: string): string {
  return (
    text
      .replace(/\s+/g, " ") // Normalize whitespace
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
      .trim()
  );
}

/**
 * Extract a meaningful excerpt from text
 */
export function extractExcerpt(text: string, maxLength: number = 500): string {
  const normalized = normalizeText(text);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  // Try to break at sentence boundary
  const truncated = normalized.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(".");
  const lastQuestion = truncated.lastIndexOf("?");
  const lastExclamation = truncated.lastIndexOf("!");

  const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);

  if (lastSentenceEnd > maxLength * 0.7) {
    // If we found a sentence boundary in the last 30%
    return truncated.slice(0, lastSentenceEnd + 1);
  }

  // Otherwise just truncate with ellipsis
  return truncateText(normalized, maxLength);
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Estimate reading time in minutes based on word count and WPM
 */
export function estimateReadingTime(
  text: string,
  wordsPerMinute: number = 250
): number {
  const wordCount = countWords(text);
  return Math.ceil(wordCount / wordsPerMinute);
}
