/**
 * Advanced Reading Types and Utilities
 *
 * Types, constants, and utility functions for advanced reading features:
 * - RSVP (Rapid Serial Visual Presentation) speed reading
 * - Focus mode overlay
 * - Bionic reading text transformation
 */

/**
 * Advanced reading mode types
 */
export type AdvancedReadingMode = "normal" | "rsvp" | "focus" | "bionic";

/**
 * WPM (Words Per Minute) range for RSVP speed reading
 */
export const WPM_RANGE = {
  min: 100,
  max: 1000,
  default: 300,
  step: 25,
} as const;

/**
 * RSVP display configuration
 */
export interface RSVPConfig {
  /** Words per minute reading speed */
  wpm: number;
  /** Whether to pause on punctuation */
  pauseOnPunctuation: boolean;
  /** Extra pause multiplier for punctuation (e.g., 2.0 = double pause) */
  punctuationPauseMultiplier: number;
  /** Extra pause multiplier for long words (>8 chars) */
  longWordPauseMultiplier: number;
  /** Number of words to display at once (1-3) */
  wordsPerFlash: number;
}

/**
 * Default RSVP configuration
 */
export const DEFAULT_RSVP_CONFIG: RSVPConfig = {
  wpm: WPM_RANGE.default,
  pauseOnPunctuation: true,
  punctuationPauseMultiplier: 2.0,
  longWordPauseMultiplier: 1.5,
  wordsPerFlash: 1,
};

/**
 * Focus mode configuration
 */
export interface FocusModeConfig {
  /** Opacity of the focus overlay (0-1) */
  overlayOpacity: number;
  /** Number of lines to keep visible above/below current line */
  visibleLines: number;
  /** Whether focus follows scroll automatically */
  autoFollow: boolean;
}

/**
 * Default focus mode configuration
 */
export const DEFAULT_FOCUS_CONFIG: FocusModeConfig = {
  overlayOpacity: 0.7,
  visibleLines: 1,
  autoFollow: true,
};

/**
 * Bionic reading configuration
 */
export interface BionicReadingConfig {
  /** Bold percentage of each word (0.3-0.7) */
  boldPercentage: number;
  /** Minimum characters to bold (1-3) */
  minBoldChars: number;
  /** Whether to bold first letter of short words */
  boldShortWords: boolean;
}

/**
 * Default bionic reading configuration
 */
export const DEFAULT_BIONIC_CONFIG: BionicReadingConfig = {
  boldPercentage: 0.4,
  minBoldChars: 1,
  boldShortWords: true,
};

/**
 * RSVP state for word-by-word display
 */
export interface RSVPState {
  /** Current word(s) being displayed */
  currentWord: string;
  /** Index of current word in the word array */
  currentIndex: number;
  /** Total number of words */
  totalWords: number;
  /** Whether RSVP is currently playing */
  isPlaying: boolean;
  /** Whether RSVP has finished */
  isComplete: boolean;
  /** Progress percentage (0-100) */
  progress: number;
}

/**
 * Initial RSVP state
 */
export const INITIAL_RSVP_STATE: RSVPState = {
  currentWord: "",
  currentIndex: 0,
  totalWords: 0,
  isPlaying: false,
  isComplete: false,
  progress: 0,
};

/**
 * Punctuation marks that trigger extra pause in RSVP
 */
export const PUNCTUATION_MARKS = /[.!?;:,]$/;

/**
 * Long word threshold (characters)
 */
export const LONG_WORD_THRESHOLD = 8;

/**
 * Calculate display time for a word in RSVP mode
 */
export function calculateWordDisplayTime(
  word: string,
  config: RSVPConfig
): number {
  // Base time per word in milliseconds
  const baseTime = 60000 / config.wpm;

  let multiplier = 1.0;

  // Add pause for punctuation
  if (config.pauseOnPunctuation && PUNCTUATION_MARKS.test(word)) {
    multiplier = config.punctuationPauseMultiplier;
  }

  // Add pause for long words
  if (word.length > LONG_WORD_THRESHOLD) {
    multiplier = Math.max(multiplier, config.longWordPauseMultiplier);
  }

  return baseTime * multiplier;
}

/**
 * Split text into words for RSVP display
 */
export function splitIntoWords(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

/**
 * Group words for RSVP display based on wordsPerFlash setting
 */
export function groupWordsForRSVP(
  words: string[],
  wordsPerFlash: number
): string[] {
  if (wordsPerFlash <= 1) {
    return words;
  }

  const groups: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerFlash) {
    const group = words.slice(i, i + wordsPerFlash).join(" ");
    groups.push(group);
  }
  return groups;
}

/**
 * Find the optimal recognition point (ORP) in a word
 * This is typically 30-40% into the word for English text
 */
export function findORP(word: string): number {
  // Remove punctuation for calculation
  const cleanWord = word.replace(/[^a-zA-Z]/g, "");
  if (cleanWord.length <= 1) return 0;

  // ORP is roughly at 35% of word length
  return Math.floor((cleanWord.length - 1) * 0.35);
}

/**
 * Apply bionic reading formatting to a word
 * Returns [boldPart, normalPart]
 */
export function applyBionicFormatting(
  word: string,
  config: BionicReadingConfig
): [string, string] {
  // Skip very short words unless configured to bold them
  if (word.length <= 2 && !config.boldShortWords) {
    return ["", word];
  }

  // Calculate how many characters to bold
  const boldChars = Math.max(
    config.minBoldChars,
    Math.ceil(word.length * config.boldPercentage)
  );

  // Don't bold more than the word length
  const actualBoldChars = Math.min(boldChars, word.length);

  const boldPart = word.slice(0, actualBoldChars);
  const normalPart = word.slice(actualBoldChars);

  return [boldPart, normalPart];
}

/**
 * Transform text to bionic reading format
 * Returns an array of [boldPart, normalPart] tuples for each word
 */
export function transformToBionic(
  text: string,
  config: BionicReadingConfig
): Array<{ bold: string; normal: string; space: string }> {
  const words = splitIntoWords(text);
  return words.map((word, index) => {
    const [bold, normal] = applyBionicFormatting(word, config);
    return {
      bold,
      normal,
      space: index < words.length - 1 ? " " : "",
    };
  });
}

/**
 * Validate WPM value and clamp to range
 */
export function validateWPM(wpm: number): number {
  return Math.max(WPM_RANGE.min, Math.min(WPM_RANGE.max, wpm));
}

/**
 * Format WPM for display
 */
export function formatWPM(wpm: number): string {
  return `${wpm} WPM`;
}

/**
 * Calculate estimated reading time based on WPM
 */
export function calculateEstimatedTime(wordCount: number, wpm: number): number {
  if (wpm <= 0) return 0;
  return Math.ceil(wordCount / wpm);
}

/**
 * Format time in minutes to human readable string
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) {
    return "< 1 min";
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
}

/**
 * Calculate progress percentage for RSVP
 */
export function calculateRSVPProgress(
  currentIndex: number,
  totalWords: number
): number {
  if (totalWords <= 0) return 0;
  return Math.round((currentIndex / totalWords) * 100);
}

/**
 * Check if a character is at a sentence end (for focus mode paragraph detection)
 */
export function isSentenceEnd(char: string): boolean {
  return /[.!?]/.test(char);
}

/**
 * Get the line height in pixels for calculating focus mode overlay
 */
export function getLineHeightPx(
  fontSize: number,
  lineHeightMultiplier: number
): number {
  return fontSize * lineHeightMultiplier;
}

/**
 * Calculate focus overlay positions
 * Returns top and bottom percentages for the visible area
 */
export function calculateFocusOverlay(
  currentLineIndex: number,
  totalLines: number,
  visibleLines: number
): { topOverlayHeight: number; bottomOverlayStart: number } {
  if (totalLines <= 0) {
    return { topOverlayHeight: 0, bottomOverlayStart: 100 };
  }

  const lineHeight = 100 / totalLines;
  const halfVisible = Math.floor(visibleLines / 2);

  // Top overlay covers lines 0 to (currentLineIndex - halfVisible - 1)
  const topLines = Math.max(0, currentLineIndex - halfVisible);
  const topOverlayHeight = topLines * lineHeight;

  // Bottom overlay starts after (currentLineIndex + halfVisible + 1)
  const bottomStartLine = Math.min(
    totalLines,
    currentLineIndex + halfVisible + 1
  );
  const bottomOverlayStart = bottomStartLine * lineHeight;

  return { topOverlayHeight, bottomOverlayStart };
}
