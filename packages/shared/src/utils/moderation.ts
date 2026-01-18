/**
 * Content moderation utilities for profanity filtering
 *
 * These utilities are used to filter inappropriate content from
 * user-generated content that is publicly visible (forum posts,
 * reading group discussions, public profiles, curriculum titles).
 *
 * @example
 * ```typescript
 * import { containsProfanity, validateNoProfanity } from '@read-master/shared';
 *
 * // Check if text contains profanity
 * if (containsProfanity(userInput)) {
 *   throw new Error('Content contains inappropriate language');
 * }
 *
 * // Validate multiple fields
 * const result = validateFieldsNoProfanity([
 *   { value: title, name: 'Title' },
 *   { value: description, name: 'Description' },
 * ]);
 * if (!result.valid) {
 *   return res.status(400).json({ errors: result.errors });
 * }
 * ```
 */

/**
 * Profanity word list - only includes strong profanity
 * Words are checked as whole words to avoid false positives
 * (e.g., "class" should not match "ass")
 */
const PROFANITY_WORDS: Set<string> = new Set([
  // Strong profanity only - avoids false positives
  "fuck",
  "fucking",
  "fucker",
  "fucked",
  "fucks",
  "shit",
  "shitty",
  "shits",
  "asshole",
  "assholes",
  "bitch",
  "bitches",
  "bastard",
  "bastards",
  "dick",
  "dicks",
  "cock",
  "cocks",
  "pussy",
  "pussies",
  "cunt",
  "cunts",
  "whore",
  "whores",
  "slut",
  "sluts",
  // Slurs (always blocked)
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "retard",
  "retarded",
]);

/**
 * Compound profanity patterns (matched as substrings)
 * These are words that are always profane when found anywhere
 */
const COMPOUND_PROFANITY: string[] = [
  "motherfuck",
  "bullshit",
  "horseshit",
  "dumbfuck",
  "fuckwit",
  "shithead",
  "dickhead",
  "asshat",
];

/**
 * Characters that look like letters but are used to evade filters
 * Maps homoglyphs to their ASCII equivalents
 */
const HOMOGLYPH_MAP: Record<string, string> = {
  "@": "a",
  "4": "a",
  "8": "b",
  "3": "e",
  "!": "i",
  "1": "i",
  "|": "l",
  "0": "o",
  "5": "s",
  $: "s",
  "7": "t",
  "+": "t",
};

/**
 * Normalizes text for profanity checking (basic normalization)
 * - Converts to lowercase
 * - Replaces homoglyphs with ASCII equivalents
 * Does NOT collapse repeated characters to preserve legitimate words
 */
function normalizeText(text: string): string {
  let normalized = text.toLowerCase();

  // Replace homoglyphs
  for (const [char, replacement] of Object.entries(HOMOGLYPH_MAP)) {
    normalized = normalized.split(char).join(replacement);
  }

  return normalized;
}

/**
 * Collapses repeated characters for evasion detection
 * e.g., "fuuuuck" -> "fuck", "shiiiit" -> "shit"
 * Preserves double letters (aa->aa) but collapses 3+ (aaa->a)
 */
function collapseRepeatedChars(text: string): string {
  // Collapse 3+ repeated characters to single character
  return text.replace(/(.)\1{2,}/g, "$1");
}

/**
 * Extracts individual words from text, preserving word boundaries
 * Removes punctuation and splits on whitespace
 */
function extractWords(text: string): string[] {
  // Replace non-alphanumeric with spaces, then split
  return text
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

/**
 * Checks if text contains profanity
 *
 * @param text - The text to check
 * @returns true if the text contains profanity, false otherwise
 *
 * @example
 * ```typescript
 * containsProfanity('Hello world'); // false
 * containsProfanity('What the fuck'); // true
 * ```
 */
export function containsProfanity(text: string): boolean {
  if (!text || typeof text !== "string") {
    return false;
  }

  const normalized = normalizeText(text);
  const words = extractWords(normalized);

  // Check each word against the profanity list (exact match)
  for (const word of words) {
    if (PROFANITY_WORDS.has(word)) {
      return true;
    }
  }

  // Check for compound profanity anywhere in the normalized text
  const normalizedForCompound = normalized.replace(/[^a-z]/g, "");
  for (const compound of COMPOUND_PROFANITY) {
    if (normalizedForCompound.includes(compound)) {
      return true;
    }
  }

  // Check with collapsed repeated characters (for evasion like "fuuuuck")
  const collapsed = collapseRepeatedChars(normalized);
  const collapsedWords = extractWords(collapsed);

  for (const word of collapsedWords) {
    if (PROFANITY_WORDS.has(word)) {
      return true;
    }
  }

  // Check compound profanity with collapsed text
  const collapsedForCompound = collapsed.replace(/[^a-z]/g, "");
  for (const compound of COMPOUND_PROFANITY) {
    if (collapsedForCompound.includes(compound)) {
      return true;
    }
  }

  return false;
}

/**
 * Returns the list of profane words found in the text
 *
 * @param text - The text to check
 * @returns Array of profane words found
 *
 * @example
 * ```typescript
 * getProfaneWords('Hello fuck world'); // ['fuck']
 * ```
 */
export function getProfaneWords(text: string): string[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  const normalized = normalizeText(text);
  const words = extractWords(normalized);
  const found: Set<string> = new Set();

  // Check individual words (exact match)
  for (const word of words) {
    if (PROFANITY_WORDS.has(word)) {
      found.add(word);
    }
  }

  // Check for compound profanity
  const normalizedForCompound = normalized.replace(/[^a-z]/g, "");
  for (const compound of COMPOUND_PROFANITY) {
    if (normalizedForCompound.includes(compound)) {
      found.add(compound);
    }
  }

  // Check with collapsed repeated characters (for evasion like "fuuuuck")
  const collapsed = collapseRepeatedChars(normalized);
  const collapsedWords = extractWords(collapsed);

  for (const word of collapsedWords) {
    if (PROFANITY_WORDS.has(word)) {
      found.add(word);
    }
  }

  // Check compound profanity with collapsed text
  const collapsedForCompound = collapsed.replace(/[^a-z]/g, "");
  for (const compound of COMPOUND_PROFANITY) {
    if (collapsedForCompound.includes(compound)) {
      found.add(compound);
    }
  }

  return [...found];
}

/**
 * Validation result for profanity checking
 */
export type ProfanityValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * Field definition for batch validation
 */
export type FieldToValidate = {
  value: string;
  name: string;
};

/**
 * Validates that text does not contain profanity
 *
 * @param text - The text to validate
 * @param fieldName - The name of the field (for error messages)
 * @returns Validation result with errors if profanity found
 *
 * @example
 * ```typescript
 * const result = validateNoProfanity(userInput, 'Title');
 * if (!result.valid) {
 *   console.error(result.errors); // ['Title contains inappropriate language']
 * }
 * ```
 */
export function validateNoProfanity(
  text: string,
  fieldName: string = "Content"
): ProfanityValidationResult {
  if (containsProfanity(text)) {
    return {
      valid: false,
      errors: [`${fieldName} contains inappropriate language`],
    };
  }

  return {
    valid: true,
    errors: [],
  };
}

/**
 * Validates multiple fields for profanity
 *
 * @param fields - Array of field definitions to validate
 * @returns Validation result with all errors
 *
 * @example
 * ```typescript
 * const result = validateFieldsNoProfanity([
 *   { value: title, name: 'Title' },
 *   { value: description, name: 'Description' },
 * ]);
 *
 * if (!result.valid) {
 *   return res.status(400).json({ errors: result.errors });
 * }
 * ```
 */
export function validateFieldsNoProfanity(
  fields: FieldToValidate[]
): ProfanityValidationResult {
  const errors: string[] = [];

  for (const field of fields) {
    if (field.value && containsProfanity(field.value)) {
      errors.push(`${field.name} contains inappropriate language`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Cleans profanity from text by replacing with asterisks
 * Use cautiously - it's usually better to reject content than modify it
 *
 * @param text - The text to clean
 * @returns Text with profanity masked with asterisks
 *
 * @example
 * ```typescript
 * cleanProfanity('What the fuck'); // 'What the ****'
 * ```
 */
export function cleanProfanity(text: string): string {
  if (!text || typeof text !== "string") {
    return text;
  }

  let cleaned = text;

  // Replace individual profane words (case-insensitive, word boundaries)
  for (const profanity of PROFANITY_WORDS) {
    const regex = new RegExp(`\\b${profanity}\\b`, "gi");
    cleaned = cleaned.replace(regex, "*".repeat(profanity.length));
  }

  // Replace compound profanity
  for (const compound of COMPOUND_PROFANITY) {
    const regex = new RegExp(compound, "gi");
    cleaned = cleaned.replace(regex, "*".repeat(compound.length));
  }

  return cleaned;
}
