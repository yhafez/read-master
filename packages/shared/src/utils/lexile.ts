/**
 * Lexile Reading Level Utilities
 *
 * This module provides utilities for working with reading levels,
 * including Lexile score estimation, grade level mapping, and text
 * difficulty analysis.
 *
 * Lexile measures are based on two factors:
 * 1. Word frequency (how common the words are)
 * 2. Sentence length (syntactic complexity)
 *
 * Note: True Lexile scores require proprietary analysis. This module
 * provides estimates based on readability formulas and heuristics.
 *
 * @example
 * ```typescript
 * import {
 *   estimateTextDifficulty,
 *   lexileToGradeLevel,
 *   getReadingLevelLabel,
 *   isTextAppropriate,
 * } from '@read-master/shared/utils';
 *
 * // Estimate difficulty of a text
 * const difficulty = estimateTextDifficulty("The quick brown fox jumps over the lazy dog.");
 * // { lexile: 450, gradeLevel: 3, label: "Elementary" }
 *
 * // Check if text is appropriate for a reader
 * const appropriate = isTextAppropriate(800, 650, 950);
 * // true (800 is within 650-950 range)
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Reading level category labels
 */
export type ReadingLevelCategory =
  | "BEGINNING_READER"
  | "EARLY_ELEMENTARY"
  | "ELEMENTARY"
  | "MIDDLE_SCHOOL"
  | "HIGH_SCHOOL"
  | "COLLEGE"
  | "ADVANCED";

/**
 * Result of text difficulty analysis
 */
export type TextDifficultyResult = {
  /** Estimated Lexile score (typically 0-2000) */
  lexile: number;
  /** Estimated grade level (1-16, where 13+ is college) */
  gradeLevel: number;
  /** Human-readable level label */
  label: string;
  /** Reading level category */
  category: ReadingLevelCategory;
  /** Confidence in the estimate (0-1) */
  confidence: number;
  /** Raw metrics used for calculation */
  metrics: TextMetrics;
};

/**
 * Raw text metrics extracted for analysis
 */
export type TextMetrics = {
  /** Total word count */
  wordCount: number;
  /** Total sentence count */
  sentenceCount: number;
  /** Total syllable count */
  syllableCount: number;
  /** Average words per sentence */
  avgWordsPerSentence: number;
  /** Average syllables per word */
  avgSyllablesPerWord: number;
  /** Percentage of complex words (3+ syllables) */
  complexWordPercentage: number;
  /** Total character count (excluding spaces) */
  characterCount: number;
  /** Average characters per word */
  avgCharactersPerWord: number;
};

/**
 * Grade level range information
 */
export type GradeLevelInfo = {
  grade: number;
  name: string;
  lexileMin: number;
  lexileMax: number;
  category: ReadingLevelCategory;
  description: string;
};

/**
 * Reading level recommendation result
 */
export type ReadingLevelRecommendation = {
  /** Recommended Lexile range minimum */
  minLexile: number;
  /** Recommended Lexile range maximum */
  maxLexile: number;
  /** Recommended grade level range */
  gradeRange: string;
  /** Category of recommended texts */
  category: ReadingLevelCategory;
  /** Description of the recommendation */
  description: string;
};

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Grade level to Lexile mapping
 * Based on MetaMetrics Lexile Framework research
 */
export const GRADE_LEVEL_LEXILE_MAP: readonly GradeLevelInfo[] = [
  {
    grade: 1,
    name: "1st Grade",
    lexileMin: 0,
    lexileMax: 300,
    category: "BEGINNING_READER",
    description: "Beginning reader with simple sentences and common words",
  },
  {
    grade: 2,
    name: "2nd Grade",
    lexileMin: 140,
    lexileMax: 500,
    category: "EARLY_ELEMENTARY",
    description: "Early elementary with basic vocabulary and short sentences",
  },
  {
    grade: 3,
    name: "3rd Grade",
    lexileMin: 330,
    lexileMax: 700,
    category: "ELEMENTARY",
    description: "Elementary reader with expanding vocabulary",
  },
  {
    grade: 4,
    name: "4th Grade",
    lexileMin: 445,
    lexileMax: 810,
    category: "ELEMENTARY",
    description: "Elementary reader with more complex ideas",
  },
  {
    grade: 5,
    name: "5th Grade",
    lexileMin: 565,
    lexileMax: 910,
    category: "ELEMENTARY",
    description: "Upper elementary with varied sentence structures",
  },
  {
    grade: 6,
    name: "6th Grade",
    lexileMin: 665,
    lexileMax: 1000,
    category: "MIDDLE_SCHOOL",
    description: "Middle school reader with abstract concepts",
  },
  {
    grade: 7,
    name: "7th Grade",
    lexileMin: 735,
    lexileMax: 1065,
    category: "MIDDLE_SCHOOL",
    description: "Middle school with increasingly complex texts",
  },
  {
    grade: 8,
    name: "8th Grade",
    lexileMin: 805,
    lexileMax: 1120,
    category: "MIDDLE_SCHOOL",
    description: "Late middle school with challenging vocabulary",
  },
  {
    grade: 9,
    name: "9th Grade",
    lexileMin: 855,
    lexileMax: 1165,
    category: "HIGH_SCHOOL",
    description: "High school reader with analytical texts",
  },
  {
    grade: 10,
    name: "10th Grade",
    lexileMin: 905,
    lexileMax: 1195,
    category: "HIGH_SCHOOL",
    description: "High school with sophisticated content",
  },
  {
    grade: 11,
    name: "11th Grade",
    lexileMin: 940,
    lexileMax: 1210,
    category: "HIGH_SCHOOL",
    description: "Advanced high school with complex arguments",
  },
  {
    grade: 12,
    name: "12th Grade",
    lexileMin: 970,
    lexileMax: 1230,
    category: "HIGH_SCHOOL",
    description: "Senior high school, college-ready texts",
  },
  {
    grade: 13,
    name: "College Freshman",
    lexileMin: 1000,
    lexileMax: 1300,
    category: "COLLEGE",
    description: "College-level academic texts",
  },
  {
    grade: 14,
    name: "College Sophomore",
    lexileMin: 1050,
    lexileMax: 1400,
    category: "COLLEGE",
    description: "Advanced college texts",
  },
  {
    grade: 15,
    name: "College Junior/Senior",
    lexileMin: 1100,
    lexileMax: 1500,
    category: "COLLEGE",
    description: "Upper-division college texts",
  },
  {
    grade: 16,
    name: "Graduate Level",
    lexileMin: 1200,
    lexileMax: 2000,
    category: "ADVANCED",
    description: "Graduate and professional texts",
  },
] as const;

/**
 * Reading level category labels with descriptions
 */
export const READING_LEVEL_CATEGORIES: Record<
  ReadingLevelCategory,
  { name: string; description: string; lexileRange: string }
> = {
  BEGINNING_READER: {
    name: "Beginning Reader",
    description: "Just learning to read with simple words and basic sentences",
    lexileRange: "BR-300L",
  },
  EARLY_ELEMENTARY: {
    name: "Early Elementary",
    description: "Building reading skills with common vocabulary",
    lexileRange: "140L-500L",
  },
  ELEMENTARY: {
    name: "Elementary",
    description: "Confident reader with expanding vocabulary",
    lexileRange: "330L-910L",
  },
  MIDDLE_SCHOOL: {
    name: "Middle School",
    description: "Reading complex texts with abstract concepts",
    lexileRange: "665L-1120L",
  },
  HIGH_SCHOOL: {
    name: "High School",
    description: "Analytical reading with sophisticated vocabulary",
    lexileRange: "855L-1230L",
  },
  COLLEGE: {
    name: "College",
    description: "Academic reading with specialized terminology",
    lexileRange: "1000L-1500L",
  },
  ADVANCED: {
    name: "Advanced",
    description: "Graduate and professional level texts",
    lexileRange: "1200L-2000L+",
  },
} as const;

/**
 * Common words list for frequency analysis (Dale-Chall inspired)
 * These are words familiar to most 4th graders
 */
const COMMON_WORDS: ReadonlySet<string> = new Set([
  "a",
  "about",
  "above",
  "after",
  "again",
  "air",
  "all",
  "along",
  "also",
  "always",
  "am",
  "an",
  "and",
  "animal",
  "another",
  "answer",
  "any",
  "are",
  "around",
  "as",
  "ask",
  "at",
  "away",
  "back",
  "be",
  "because",
  "been",
  "before",
  "began",
  "begin",
  "being",
  "below",
  "between",
  "big",
  "book",
  "both",
  "boy",
  "but",
  "by",
  "call",
  "came",
  "can",
  "car",
  "carry",
  "change",
  "children",
  "city",
  "close",
  "come",
  "could",
  "country",
  "cut",
  "day",
  "did",
  "different",
  "do",
  "does",
  "done",
  "door",
  "down",
  "draw",
  "during",
  "each",
  "early",
  "earth",
  "eat",
  "end",
  "enough",
  "even",
  "every",
  "example",
  "eye",
  "face",
  "fall",
  "family",
  "far",
  "father",
  "feet",
  "few",
  "find",
  "first",
  "follow",
  "food",
  "for",
  "form",
  "found",
  "four",
  "from",
  "gave",
  "get",
  "girl",
  "give",
  "go",
  "good",
  "got",
  "great",
  "group",
  "grow",
  "had",
  "hand",
  "hard",
  "has",
  "have",
  "he",
  "head",
  "hear",
  "help",
  "her",
  "here",
  "high",
  "him",
  "his",
  "home",
  "house",
  "how",
  "however",
  "i",
  "idea",
  "if",
  "important",
  "in",
  "into",
  "is",
  "it",
  "its",
  "just",
  "keep",
  "kind",
  "know",
  "land",
  "large",
  "last",
  "later",
  "learn",
  "leave",
  "left",
  "let",
  "letter",
  "life",
  "light",
  "like",
  "line",
  "list",
  "little",
  "live",
  "long",
  "look",
  "made",
  "make",
  "man",
  "many",
  "may",
  "me",
  "men",
  "might",
  "mile",
  "miss",
  "money",
  "more",
  "most",
  "mother",
  "mountain",
  "move",
  "much",
  "must",
  "my",
  "name",
  "near",
  "need",
  "never",
  "new",
  "next",
  "night",
  "no",
  "not",
  "now",
  "number",
  "of",
  "off",
  "often",
  "old",
  "on",
  "once",
  "one",
  "only",
  "open",
  "or",
  "order",
  "other",
  "our",
  "out",
  "over",
  "own",
  "page",
  "paper",
  "part",
  "people",
  "picture",
  "place",
  "plant",
  "play",
  "point",
  "put",
  "question",
  "quick",
  "quite",
  "read",
  "really",
  "right",
  "river",
  "run",
  "said",
  "same",
  "saw",
  "say",
  "school",
  "sea",
  "second",
  "see",
  "seem",
  "sentence",
  "set",
  "she",
  "should",
  "show",
  "side",
  "small",
  "so",
  "some",
  "something",
  "sometimes",
  "song",
  "soon",
  "sound",
  "spell",
  "start",
  "state",
  "still",
  "stop",
  "story",
  "study",
  "such",
  "sun",
  "sure",
  "take",
  "talk",
  "tell",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "thing",
  "think",
  "this",
  "those",
  "thought",
  "three",
  "through",
  "time",
  "to",
  "together",
  "too",
  "took",
  "top",
  "toward",
  "tree",
  "true",
  "try",
  "turn",
  "two",
  "under",
  "until",
  "up",
  "us",
  "use",
  "very",
  "walk",
  "want",
  "was",
  "watch",
  "water",
  "way",
  "we",
  "well",
  "went",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "white",
  "who",
  "why",
  "will",
  "with",
  "without",
  "word",
  "work",
  "world",
  "would",
  "write",
  "year",
  "yes",
  "yet",
  "you",
  "young",
  "your",
]);

/**
 * Minimum text length for reliable analysis
 */
export const MIN_TEXT_LENGTH_FOR_ANALYSIS = 100;

/**
 * Minimum sentence count for reliable analysis
 */
export const MIN_SENTENCES_FOR_ANALYSIS = 3;

// =============================================================================
// TEXT ANALYSIS HELPERS
// =============================================================================

/**
 * Count syllables in a word using a heuristic approach
 */
export function countSyllables(word: string): number {
  const lowerWord = word.toLowerCase().replace(/[^a-z]/g, "");

  if (lowerWord.length === 0) {
    return 0;
  }

  if (lowerWord.length <= 3) {
    return 1;
  }

  // Count vowel groups
  let count = 0;
  let prevVowel = false;

  for (let i = 0; i < lowerWord.length; i++) {
    const isVowel = "aeiouy".includes(lowerWord[i] ?? "");

    if (isVowel && !prevVowel) {
      count++;
    }
    prevVowel = isVowel;
  }

  // Handle silent 'e' at end
  if (lowerWord.endsWith("e") && !lowerWord.endsWith("le")) {
    count = Math.max(1, count - 1);
  }

  // Handle common suffixes
  if (lowerWord.endsWith("les") || lowerWord.endsWith("es")) {
    count = Math.max(1, count - 1);
  }

  // Handle 'ed' endings
  if (
    lowerWord.endsWith("ed") &&
    !lowerWord.endsWith("ted") &&
    !lowerWord.endsWith("ded")
  ) {
    count = Math.max(1, count - 1);
  }

  return Math.max(1, count);
}

/**
 * Check if a word is a complex word (3+ syllables and not common)
 */
export function isComplexWord(word: string): boolean {
  const lowerWord = word.toLowerCase().replace(/[^a-z]/g, "");
  if (lowerWord.length === 0) {
    return false;
  }

  // Common words are not complex even if they have 3+ syllables
  if (COMMON_WORDS.has(lowerWord)) {
    return false;
  }

  return countSyllables(lowerWord) >= 3;
}

/**
 * Check if a word is a common/easy word
 */
export function isCommonWord(word: string): boolean {
  const lowerWord = word.toLowerCase().replace(/[^a-z]/g, "");
  return COMMON_WORDS.has(lowerWord);
}

/**
 * Extract words from text
 */
export function extractWords(text: string): string[] {
  return text
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0 && /[a-zA-Z]/.test(word));
}

/**
 * Extract sentences from text
 */
export function extractSentences(text: string): string[] {
  // Split on sentence-ending punctuation
  const sentences = text
    .replace(/([.!?])\s+/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /[a-zA-Z]/.test(s));

  return sentences;
}

/**
 * Calculate text metrics for analysis
 */
export function calculateTextMetrics(text: string): TextMetrics {
  const words = extractWords(text);
  const sentences = extractSentences(text);

  const wordCount = words.length;
  const sentenceCount = Math.max(1, sentences.length);

  let syllableCount = 0;
  let complexWordCount = 0;
  let characterCount = 0;

  for (const word of words) {
    const cleanWord = word.replace(/[^a-zA-Z]/g, "");
    syllableCount += countSyllables(cleanWord);
    characterCount += cleanWord.length;
    if (isComplexWord(cleanWord)) {
      complexWordCount++;
    }
  }

  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = wordCount > 0 ? syllableCount / wordCount : 0;
  const avgCharactersPerWord = wordCount > 0 ? characterCount / wordCount : 0;
  const complexWordPercentage =
    wordCount > 0 ? (complexWordCount / wordCount) * 100 : 0;

  return {
    wordCount,
    sentenceCount,
    syllableCount,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 100) / 100,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
    complexWordPercentage: Math.round(complexWordPercentage * 100) / 100,
    characterCount,
    avgCharactersPerWord: Math.round(avgCharactersPerWord * 100) / 100,
  };
}

// =============================================================================
// READABILITY FORMULAS
// =============================================================================

/**
 * Calculate Flesch-Kincaid Grade Level
 * Formula: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
 */
export function calculateFleschKincaidGradeLevel(metrics: TextMetrics): number {
  const grade =
    0.39 * metrics.avgWordsPerSentence +
    11.8 * metrics.avgSyllablesPerWord -
    15.59;

  return Math.max(0, Math.round(grade * 10) / 10);
}

/**
 * Calculate Flesch Reading Ease Score
 * Formula: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
 * Returns 0-100 where higher = easier
 */
export function calculateFleschReadingEase(metrics: TextMetrics): number {
  const score =
    206.835 -
    1.015 * metrics.avgWordsPerSentence -
    84.6 * metrics.avgSyllablesPerWord;

  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

/**
 * Calculate Gunning Fog Index
 * Formula: 0.4 * ((words/sentences) + 100 * (complex words/words))
 */
export function calculateGunningFog(metrics: TextMetrics): number {
  const index =
    0.4 * (metrics.avgWordsPerSentence + metrics.complexWordPercentage);
  return Math.max(0, Math.round(index * 10) / 10);
}

/**
 * Calculate SMOG Index (Simple Measure of Gobbledygook)
 * Requires at least 30 sentences for accuracy
 * Formula: 1.0430 * sqrt(30 * (complex words / sentences)) + 3.1291
 */
export function calculateSmogIndex(metrics: TextMetrics): number {
  if (metrics.sentenceCount < 3) {
    // Fallback to Flesch-Kincaid for very short texts
    return calculateFleschKincaidGradeLevel(metrics);
  }

  // Estimate complex words per 30 sentences
  const complexWordsPerThirty =
    (metrics.complexWordPercentage / 100) *
    metrics.wordCount *
    (30 / metrics.sentenceCount);

  const index = 1.043 * Math.sqrt(complexWordsPerThirty) + 3.1291;
  return Math.max(0, Math.round(index * 10) / 10);
}

/**
 * Calculate Coleman-Liau Index
 * Formula: 0.0588 * L - 0.296 * S - 15.8
 * Where L = avg letters per 100 words, S = avg sentences per 100 words
 */
export function calculateColemanLiauIndex(metrics: TextMetrics): number {
  const L = metrics.avgCharactersPerWord * 100;
  const S =
    metrics.sentenceCount > 0
      ? (metrics.sentenceCount / metrics.wordCount) * 100
      : 1;

  const index = 0.0588 * L - 0.296 * S - 15.8;
  return Math.max(0, Math.round(index * 10) / 10);
}

/**
 * Calculate Automated Readability Index (ARI)
 * Formula: 4.71 * (characters/words) + 0.5 * (words/sentences) - 21.43
 */
export function calculateAri(metrics: TextMetrics): number {
  const index =
    4.71 * metrics.avgCharactersPerWord +
    0.5 * metrics.avgWordsPerSentence -
    21.43;

  return Math.max(0, Math.round(index * 10) / 10);
}

// =============================================================================
// LEXILE ESTIMATION
// =============================================================================

/**
 * Convert grade level to estimated Lexile score
 */
export function gradeLevelToLexile(gradeLevel: number): number {
  // Find the matching grade level info
  const clampedGrade = Math.max(1, Math.min(16, Math.round(gradeLevel)));

  const gradeInfo = GRADE_LEVEL_LEXILE_MAP.find(
    (g) => g.grade === clampedGrade
  );

  if (!gradeInfo) {
    // Fallback calculation
    if (clampedGrade <= 1) return 150;
    if (clampedGrade >= 16) return 1600;
    return 100 + clampedGrade * 80;
  }

  // Return midpoint of the range
  return Math.round((gradeInfo.lexileMin + gradeInfo.lexileMax) / 2);
}

/**
 * Convert Lexile score to estimated grade level
 */
export function lexileToGradeLevel(lexile: number): number {
  const clampedLexile = Math.max(0, Math.min(2000, lexile));

  // Find the best matching grade level
  for (let i = GRADE_LEVEL_LEXILE_MAP.length - 1; i >= 0; i--) {
    const gradeInfo = GRADE_LEVEL_LEXILE_MAP[i];
    if (gradeInfo && clampedLexile >= gradeInfo.lexileMin) {
      // Interpolate within the grade range
      const range = gradeInfo.lexileMax - gradeInfo.lexileMin;
      const position = (clampedLexile - gradeInfo.lexileMin) / range;
      return Math.round((gradeInfo.grade + position * 0.9) * 10) / 10;
    }
  }

  return 1;
}

/**
 * Estimate Lexile score from multiple readability metrics
 * Uses a weighted average of different formulas for better accuracy
 */
export function estimateLexileFromMetrics(metrics: TextMetrics): number {
  // Calculate multiple grade level estimates
  const fleschKincaid = calculateFleschKincaidGradeLevel(metrics);
  const gunningFog = calculateGunningFog(metrics);
  const smog = calculateSmogIndex(metrics);
  const colemanLiau = calculateColemanLiauIndex(metrics);
  const ari = calculateAri(metrics);

  // Weight the formulas (Flesch-Kincaid and Coleman-Liau are generally most accurate)
  const weightedGrade =
    (fleschKincaid * 0.3 +
      colemanLiau * 0.25 +
      smog * 0.2 +
      ari * 0.15 +
      gunningFog * 0.1) /
    1.0;

  // Convert to Lexile
  const lexile = gradeLevelToLexile(weightedGrade);

  // Clamp to valid range
  return Math.max(0, Math.min(2000, Math.round(lexile)));
}

/**
 * Get reading level category from Lexile score
 */
export function getLexileCategory(lexile: number): ReadingLevelCategory {
  if (lexile < 140) return "BEGINNING_READER";
  if (lexile < 500) return "EARLY_ELEMENTARY";
  if (lexile < 700) return "ELEMENTARY";
  if (lexile < 900) return "MIDDLE_SCHOOL";
  if (lexile < 1100) return "HIGH_SCHOOL";
  if (lexile < 1400) return "COLLEGE";
  return "ADVANCED";
}

/**
 * Get human-readable label for a Lexile score
 */
export function getReadingLevelLabel(lexile: number): string {
  const category = getLexileCategory(lexile);
  return READING_LEVEL_CATEGORIES[category].name;
}

/**
 * Format Lexile score for display (e.g., "850L")
 */
export function formatLexileScore(lexile: number): string {
  if (lexile < 0) return "BR";
  return `${Math.round(lexile)}L`;
}

// =============================================================================
// MAIN ESTIMATION FUNCTIONS
// =============================================================================

/**
 * Estimate text difficulty with comprehensive metrics
 *
 * @param text - The text to analyze
 * @returns Complete difficulty analysis result
 */
export function estimateTextDifficulty(text: string): TextDifficultyResult {
  const metrics = calculateTextMetrics(text);

  // Calculate confidence based on text length
  let confidence = 1.0;
  if (metrics.wordCount < MIN_TEXT_LENGTH_FOR_ANALYSIS) {
    confidence = metrics.wordCount / MIN_TEXT_LENGTH_FOR_ANALYSIS;
  }
  if (metrics.sentenceCount < MIN_SENTENCES_FOR_ANALYSIS) {
    confidence *= metrics.sentenceCount / MIN_SENTENCES_FOR_ANALYSIS;
  }
  confidence = Math.max(0.1, Math.min(1, confidence));

  const lexile = estimateLexileFromMetrics(metrics);
  const gradeLevel = lexileToGradeLevel(lexile);
  const category = getLexileCategory(lexile);
  const label = getReadingLevelLabel(lexile);

  return {
    lexile,
    gradeLevel: Math.round(gradeLevel * 10) / 10,
    label,
    category,
    confidence: Math.round(confidence * 100) / 100,
    metrics,
  };
}

/**
 * Quick difficulty estimate returning just the Lexile score
 */
export function quickLexileEstimate(text: string): number {
  const metrics = calculateTextMetrics(text);
  return estimateLexileFromMetrics(metrics);
}

// =============================================================================
// COMPARISON AND RECOMMENDATION FUNCTIONS
// =============================================================================

/**
 * Check if a text is appropriate for a reader's level
 *
 * @param textLexile - The Lexile score of the text
 * @param readerMin - The reader's minimum comfortable Lexile
 * @param readerMax - The reader's maximum comfortable Lexile
 * @returns Whether the text is within the reader's range
 */
export function isTextAppropriate(
  textLexile: number,
  readerMin: number,
  readerMax: number
): boolean {
  return textLexile >= readerMin && textLexile <= readerMax;
}

/**
 * Compare two Lexile scores
 *
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function compareLexileScores(a: number, b: number): number {
  return a - b;
}

/**
 * Calculate the Lexile difference between text and reader
 *
 * @returns Object with difference value and direction
 */
export function calculateLexileDifference(
  textLexile: number,
  readerLexile: number
): { difference: number; direction: "easier" | "harder" | "matched" } {
  const diff = textLexile - readerLexile;

  return {
    difference: Math.abs(diff),
    direction: diff < -50 ? "easier" : diff > 50 ? "harder" : "matched",
  };
}

/**
 * Get reading level recommendation for a user based on their current level
 *
 * @param currentLexile - The user's current Lexile score
 * @param stretch - Whether to recommend slightly challenging texts (default: true)
 * @returns Reading level recommendation
 */
export function getReadingLevelRecommendation(
  currentLexile: number,
  stretch: boolean = true
): ReadingLevelRecommendation {
  // Typical comfort range is current level ±50-100L
  const comfortRange = 100;

  // Stretch range pushes slightly higher
  const stretchBonus = stretch ? 50 : 0;

  const minLexile = Math.max(0, currentLexile - comfortRange);
  const maxLexile = Math.min(2000, currentLexile + comfortRange + stretchBonus);

  const gradeMin = lexileToGradeLevel(minLexile);
  const gradeMax = lexileToGradeLevel(maxLexile);

  const gradeRange = `Grade ${Math.floor(gradeMin)}-${Math.ceil(gradeMax)}`;
  const category = getLexileCategory((minLexile + maxLexile) / 2);
  const description = stretch
    ? `Texts between ${formatLexileScore(minLexile)} and ${formatLexileScore(maxLexile)} will be comfortable while providing some challenge.`
    : `Texts between ${formatLexileScore(minLexile)} and ${formatLexileScore(maxLexile)} will be comfortable at your current level.`;

  return {
    minLexile,
    maxLexile,
    gradeRange,
    category,
    description,
  };
}

/**
 * Get the grade level info for a given grade
 */
export function getGradeLevelInfo(grade: number): GradeLevelInfo | null {
  const roundedGrade = Math.max(1, Math.min(16, Math.round(grade)));
  return GRADE_LEVEL_LEXILE_MAP.find((g) => g.grade === roundedGrade) ?? null;
}

/**
 * Get all grade levels within a Lexile range
 */
export function getGradeLevelsInRange(
  minLexile: number,
  maxLexile: number
): GradeLevelInfo[] {
  return GRADE_LEVEL_LEXILE_MAP.filter(
    (grade) => grade.lexileMax >= minLexile && grade.lexileMin <= maxLexile
  );
}

/**
 * Validate a Lexile score
 */
export function isValidLexile(value: unknown): value is number {
  return (
    typeof value === "number" && !isNaN(value) && value >= 0 && value <= 2000
  );
}

/**
 * Parse a Lexile string (e.g., "850L") to a number
 */
export function parseLexileString(lexileStr: string): number | null {
  const cleaned = lexileStr.trim().toUpperCase();

  // Handle "BR" (Beginning Reader)
  if (cleaned === "BR") {
    return 0;
  }

  // Handle standard format "850L"
  const match = cleaned.match(/^(\d+)L?$/);
  if (match && match[1]) {
    const value = parseInt(match[1], 10);
    if (isValidLexile(value)) {
      return value;
    }
  }

  return null;
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * All Lexile utilities for convenient importing
 */
export const lexileUtils = {
  // Constants
  GRADE_LEVEL_MAP: GRADE_LEVEL_LEXILE_MAP,
  CATEGORIES: READING_LEVEL_CATEGORIES,
  MIN_TEXT_LENGTH: MIN_TEXT_LENGTH_FOR_ANALYSIS,
  MIN_SENTENCES: MIN_SENTENCES_FOR_ANALYSIS,

  // Text analysis
  countSyllables,
  isComplexWord,
  isCommonWord,
  extractWords,
  extractSentences,
  calculateMetrics: calculateTextMetrics,

  // Readability formulas
  fleschKincaidGrade: calculateFleschKincaidGradeLevel,
  fleschReadingEase: calculateFleschReadingEase,
  gunningFog: calculateGunningFog,
  smogIndex: calculateSmogIndex,
  colemanLiauIndex: calculateColemanLiauIndex,
  ari: calculateAri,

  // Lexile estimation
  gradeLevelToLexile,
  lexileToGradeLevel,
  estimateLexile: estimateLexileFromMetrics,
  quickEstimate: quickLexileEstimate,
  estimateDifficulty: estimateTextDifficulty,

  // Categorization
  getCategory: getLexileCategory,
  getLabel: getReadingLevelLabel,
  formatScore: formatLexileScore,

  // Comparison
  isAppropriate: isTextAppropriate,
  compare: compareLexileScores,
  calculateDifference: calculateLexileDifference,

  // Recommendations
  getRecommendation: getReadingLevelRecommendation,
  getGradeLevelInfo,
  getGradeLevelsInRange,

  // Validation
  isValid: isValidLexile,
  parse: parseLexileString,
} as const;
