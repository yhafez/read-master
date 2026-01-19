/**
 * Types and utilities for dictionary and Wikipedia lookup
 */

// =============================================================================
// DICTIONARY TYPES
// =============================================================================

/**
 * Source for lookup
 */
export type LookupSource = "dictionary" | "wikipedia";

/**
 * Lookup state
 */
export type LookupState = "idle" | "loading" | "success" | "error";

/**
 * Dictionary phonetic entry
 */
export interface DictionaryPhonetic {
  /** Phonetic text (e.g., "/wɜːrd/") */
  text?: string;
  /** Audio URL for pronunciation */
  audio?: string;
  /** Source license */
  sourceUrl?: string;
}

/**
 * Dictionary definition
 */
export interface DictionaryDefinition {
  /** Definition text */
  definition: string;
  /** Usage example */
  example?: string;
  /** Synonyms */
  synonyms?: string[];
  /** Antonyms */
  antonyms?: string[];
}

/**
 * Dictionary meaning (grouped by part of speech)
 */
export interface DictionaryMeaning {
  /** Part of speech (noun, verb, adjective, etc.) */
  partOfSpeech: string;
  /** List of definitions */
  definitions: DictionaryDefinition[];
  /** Synonyms for this part of speech */
  synonyms?: string[];
  /** Antonyms for this part of speech */
  antonyms?: string[];
}

/**
 * Dictionary entry (response from Free Dictionary API)
 */
export interface DictionaryEntry {
  /** The word */
  word: string;
  /** Phonetics information */
  phonetics?: DictionaryPhonetic[];
  /** Meanings grouped by part of speech */
  meanings: DictionaryMeaning[];
  /** Origin/etymology */
  origin?: string;
  /** Source URLs */
  sourceUrls?: string[];
}

/**
 * Dictionary lookup result
 */
export interface DictionaryResult {
  /** Success status */
  success: boolean;
  /** The queried word */
  word: string;
  /** Dictionary entry data */
  entry?: DictionaryEntry;
  /** Error message if failed */
  error?: string;
  /** Error type for specific handling */
  errorType?: DictionaryErrorType;
}

/**
 * Dictionary error types
 */
export type DictionaryErrorType =
  | "not_found"
  | "network_error"
  | "rate_limited"
  | "invalid_word";

// =============================================================================
// WIKIPEDIA TYPES
// =============================================================================

/**
 * Wikipedia article summary (from REST API)
 */
export interface WikipediaSummary {
  /** Article title */
  title: string;
  /** Display title (may have formatting) */
  displayTitle: string;
  /** Plain text extract/summary */
  extract: string;
  /** HTML extract (for rich formatting) */
  extractHtml?: string;
  /** Full article URL */
  url: string;
  /** Thumbnail image */
  thumbnail?: WikipediaThumbnail;
  /** Original image */
  originalImage?: WikipediaImage;
  /** Article description */
  description?: string;
  /** Wikidata ID */
  wikibaseItem?: string;
  /** Last modification timestamp */
  timestamp?: string;
}

/**
 * Wikipedia thumbnail
 */
export interface WikipediaThumbnail {
  /** Source URL */
  source: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * Wikipedia full image
 */
export interface WikipediaImage {
  /** Source URL */
  source: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * Wikipedia lookup result
 */
export interface WikipediaResult {
  /** Success status */
  success: boolean;
  /** The queried term */
  query: string;
  /** Article summary */
  summary?: WikipediaSummary;
  /** Error message if failed */
  error?: string;
  /** Error type for specific handling */
  errorType?: WikipediaErrorType;
}

/**
 * Wikipedia error types
 */
export type WikipediaErrorType =
  | "not_found"
  | "disambiguation"
  | "network_error"
  | "rate_limited";

// =============================================================================
// COMBINED LOOKUP TYPES
// =============================================================================

/**
 * Combined lookup result
 */
export interface LookupResult {
  /** The queried text */
  query: string;
  /** Active source tab */
  activeSource: LookupSource;
  /** Dictionary result */
  dictionary?: DictionaryResult;
  /** Wikipedia result */
  wikipedia?: WikipediaResult;
}

/**
 * Lookup popover position
 */
export interface LookupPosition {
  /** X coordinate (left) */
  x: number;
  /** Y coordinate (top) */
  y: number;
  /** Anchor width (selection width) */
  anchorWidth?: number;
}

/**
 * Cache entry for lookups
 */
export interface LookupCacheEntry<T> {
  /** Cached data */
  data: T;
  /** Timestamp when cached */
  timestamp: number;
  /** Time-to-live in milliseconds */
  ttl: number;
}

/**
 * Lookup settings
 */
export interface LookupSettings {
  /** Auto-lookup on selection */
  autoLookup: boolean;
  /** Preferred source */
  preferredSource: LookupSource;
  /** Show phonetics */
  showPhonetics: boolean;
  /** Show examples */
  showExamples: boolean;
  /** Show synonyms/antonyms */
  showSynonyms: boolean;
  /** Wikipedia language code */
  wikipediaLanguage: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Free Dictionary API base URL
 */
export const DICTIONARY_API_URL =
  "https://api.dictionaryapi.dev/api/v2/entries/en";

/**
 * Wikipedia REST API base URL (English)
 */
export const WIKIPEDIA_API_URL = "https://en.wikipedia.org/api/rest_v1";

/**
 * Supported Wikipedia languages
 */
export const WIKIPEDIA_LANGUAGES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  ar: "Arabic",
  ja: "Japanese",
  zh: "Chinese",
  tl: "Tagalog",
} as const;

/**
 * Cache time-to-live (1 hour)
 */
export const CACHE_TTL = 60 * 60 * 1000;

/**
 * Maximum cache entries to keep
 */
export const MAX_CACHE_ENTRIES = 100;

/**
 * Minimum word length for lookup
 */
export const MIN_WORD_LENGTH = 2;

/**
 * Maximum word length for lookup
 */
export const MAX_WORD_LENGTH = 100;

/**
 * Local storage keys
 */
export const DICTIONARY_CACHE_KEY = "readmaster_dictionary_cache";
export const WIKIPEDIA_CACHE_KEY = "readmaster_wikipedia_cache";
export const LOOKUP_SETTINGS_KEY = "readmaster_lookup_settings";

/**
 * Default lookup settings
 */
export const DEFAULT_LOOKUP_SETTINGS: LookupSettings = {
  autoLookup: false,
  preferredSource: "dictionary",
  showPhonetics: true,
  showExamples: true,
  showSynonyms: true,
  wikipediaLanguage: "en",
};

// =============================================================================
// UTILITY FUNCTIONS - WORD VALIDATION
// =============================================================================

/**
 * Clean and normalize a word for lookup
 */
export function normalizeWord(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, "") // Remove non-letter/number chars except space, hyphen, apostrophe
    .replace(/\s+/g, " "); // Normalize whitespace
}

/**
 * Validate if a word is suitable for lookup
 */
export function isValidLookupWord(word: string): boolean {
  const normalized = normalizeWord(word);
  if (normalized.length < MIN_WORD_LENGTH) return false;
  if (normalized.length > MAX_WORD_LENGTH) return false;
  // Must contain at least one letter
  if (!/\p{L}/u.test(normalized)) return false;
  return true;
}

/**
 * Extract the first word from a selection (for dictionary lookup)
 */
export function extractFirstWord(text: string): string {
  const normalized = normalizeWord(text);
  const words = normalized.split(/\s+/);
  return words[0] || "";
}

/**
 * Check if text is likely a phrase (for Wikipedia)
 */
export function isPhrase(text: string): boolean {
  const normalized = normalizeWord(text);
  const words = normalized.split(/\s+/);
  return words.length > 1;
}

// =============================================================================
// UTILITY FUNCTIONS - CACHE
// =============================================================================

/**
 * Create a cache entry
 */
export function createCacheEntry<T>(
  data: T,
  ttl: number = CACHE_TTL
): LookupCacheEntry<T> {
  return {
    data,
    timestamp: Date.now(),
    ttl,
  };
}

/**
 * Check if a cache entry is still valid
 */
export function isCacheValid<T>(entry: LookupCacheEntry<T> | null): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < entry.ttl;
}

/**
 * Get cache from localStorage
 */
export function getCache<T>(key: string): Record<string, LookupCacheEntry<T>> {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, LookupCacheEntry<T>>;
    // Filter out expired entries
    const valid: Record<string, LookupCacheEntry<T>> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (isCacheValid(v)) {
        valid[k] = v;
      }
    }
    return valid;
  } catch {
    return {};
  }
}

/**
 * Set cache to localStorage
 */
export function setCache<T>(
  key: string,
  cache: Record<string, LookupCacheEntry<T>>
): void {
  try {
    // Limit cache size
    const entries = Object.entries(cache);
    if (entries.length > MAX_CACHE_ENTRIES) {
      // Sort by timestamp (oldest first) and keep newest
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const trimmed = entries.slice(-MAX_CACHE_ENTRIES);
      cache = Object.fromEntries(trimmed);
    }
    localStorage.setItem(key, JSON.stringify(cache));
  } catch {
    // Storage full or unavailable - ignore
  }
}

/**
 * Add entry to cache
 */
export function addToCache<T>(
  key: string,
  cacheKey: string,
  data: T,
  ttl?: number
): void {
  const cache = getCache<T>(key);
  cache[cacheKey] = createCacheEntry(data, ttl);
  setCache(key, cache);
}

/**
 * Get entry from cache
 */
export function getFromCache<T>(key: string, cacheKey: string): T | null {
  const cache = getCache<T>(key);
  const entry = cache[cacheKey];
  if (entry && isCacheValid(entry)) {
    return entry.data;
  }
  return null;
}

/**
 * Clear cache
 */
export function clearCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

/**
 * Get cache size
 */
export function getCacheSize(key: string): number {
  const cache = getCache<unknown>(key);
  return Object.keys(cache).length;
}

// =============================================================================
// UTILITY FUNCTIONS - DICTIONARY API
// =============================================================================

/**
 * Create dictionary error result
 */
export function createDictionaryError(
  word: string,
  message: string,
  errorType: DictionaryErrorType
): DictionaryResult {
  return {
    success: false,
    word,
    error: message,
    errorType,
  };
}

/**
 * Parse Free Dictionary API response
 */
export function parseDictionaryResponse(
  word: string,
  data: unknown[]
): DictionaryResult {
  if (!Array.isArray(data) || data.length === 0) {
    return createDictionaryError(word, "No definitions found", "not_found");
  }

  const first = data[0] as Record<string, unknown>;
  if (!first || typeof first !== "object") {
    return createDictionaryError(word, "Invalid response format", "not_found");
  }

  const entry: DictionaryEntry = {
    word: (first.word as string) || word,
    phonetics: parseDictionaryPhonetics(first.phonetics),
    meanings: parseDictionaryMeanings(first.meanings),
  };

  // Only add optional properties if they exist
  if (first.origin && typeof first.origin === "string") {
    entry.origin = first.origin;
  }
  if (Array.isArray(first.sourceUrls)) {
    entry.sourceUrls = first.sourceUrls as string[];
  }

  return {
    success: true,
    word,
    entry,
  };
}

/**
 * Parse phonetics array
 */
export function parseDictionaryPhonetics(
  phonetics: unknown
): DictionaryPhonetic[] {
  if (!Array.isArray(phonetics)) return [];

  return phonetics
    .filter(
      (p): p is Record<string, unknown> => p !== null && typeof p === "object"
    )
    .map((p) => {
      const phonetic: DictionaryPhonetic = {};
      if (p.text && typeof p.text === "string") {
        phonetic.text = p.text;
      }
      if (p.audio && typeof p.audio === "string") {
        phonetic.audio = p.audio;
      }
      if (p.sourceUrl && typeof p.sourceUrl === "string") {
        phonetic.sourceUrl = p.sourceUrl;
      }
      return phonetic;
    })
    .filter((p) => p.text || p.audio);
}

/**
 * Parse meanings array
 */
export function parseDictionaryMeanings(
  meanings: unknown
): DictionaryMeaning[] {
  if (!Array.isArray(meanings)) return [];

  return meanings
    .filter(
      (m): m is Record<string, unknown> => m !== null && typeof m === "object"
    )
    .map((m) => {
      const meaning: DictionaryMeaning = {
        partOfSpeech: (m.partOfSpeech as string) || "unknown",
        definitions: parseDictionaryDefinitions(m.definitions),
      };
      if (Array.isArray(m.synonyms) && m.synonyms.length > 0) {
        meaning.synonyms = m.synonyms as string[];
      }
      if (Array.isArray(m.antonyms) && m.antonyms.length > 0) {
        meaning.antonyms = m.antonyms as string[];
      }
      return meaning;
    })
    .filter((m) => m.definitions.length > 0);
}

/**
 * Parse definitions array
 */
export function parseDictionaryDefinitions(
  definitions: unknown
): DictionaryDefinition[] {
  if (!Array.isArray(definitions)) return [];

  return definitions
    .filter(
      (d): d is Record<string, unknown> => d !== null && typeof d === "object"
    )
    .map((d) => {
      const def: DictionaryDefinition = {
        definition: (d.definition as string) || "",
      };
      if (d.example && typeof d.example === "string") {
        def.example = d.example;
      }
      if (Array.isArray(d.synonyms) && d.synonyms.length > 0) {
        def.synonyms = d.synonyms as string[];
      }
      if (Array.isArray(d.antonyms) && d.antonyms.length > 0) {
        def.antonyms = d.antonyms as string[];
      }
      return def;
    })
    .filter((d) => d.definition.length > 0);
}

/**
 * Get first phonetic text
 */
export function getPhoneticText(entry: DictionaryEntry): string | null {
  if (!entry.phonetics || entry.phonetics.length === 0) return null;
  for (const p of entry.phonetics) {
    if (p.text) return p.text;
  }
  return null;
}

/**
 * Get first phonetic audio URL
 */
export function getPhoneticAudio(entry: DictionaryEntry): string | null {
  if (!entry.phonetics || entry.phonetics.length === 0) return null;
  for (const p of entry.phonetics) {
    if (p.audio) return p.audio;
  }
  return null;
}

/**
 * Get all synonyms from an entry
 */
export function getAllSynonyms(entry: DictionaryEntry): string[] {
  const synonyms = new Set<string>();
  for (const meaning of entry.meanings) {
    if (meaning.synonyms) {
      for (const syn of meaning.synonyms) {
        synonyms.add(syn);
      }
    }
    for (const def of meaning.definitions) {
      if (def.synonyms) {
        for (const syn of def.synonyms) {
          synonyms.add(syn);
        }
      }
    }
  }
  return Array.from(synonyms);
}

/**
 * Get all antonyms from an entry
 */
export function getAllAntonyms(entry: DictionaryEntry): string[] {
  const antonyms = new Set<string>();
  for (const meaning of entry.meanings) {
    if (meaning.antonyms) {
      for (const ant of meaning.antonyms) {
        antonyms.add(ant);
      }
    }
    for (const def of meaning.definitions) {
      if (def.antonyms) {
        for (const ant of def.antonyms) {
          antonyms.add(ant);
        }
      }
    }
  }
  return Array.from(antonyms);
}

/**
 * Count total definitions
 */
export function countDefinitions(entry: DictionaryEntry): number {
  return entry.meanings.reduce((sum, m) => sum + m.definitions.length, 0);
}

// =============================================================================
// UTILITY FUNCTIONS - WIKIPEDIA API
// =============================================================================

/**
 * Create Wikipedia error result
 */
export function createWikipediaError(
  query: string,
  message: string,
  errorType: WikipediaErrorType
): WikipediaResult {
  return {
    success: false,
    query,
    error: message,
    errorType,
  };
}

/**
 * Build Wikipedia API URL for a query
 */
export function buildWikipediaUrl(
  query: string,
  language: string = "en"
): string {
  const encoded = encodeURIComponent(query.replace(/\s+/g, "_"));
  return `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
}

/**
 * Parse Wikipedia REST API response
 */
export function parseWikipediaResponse(
  query: string,
  data: unknown
): WikipediaResult {
  if (!data || typeof data !== "object") {
    return createWikipediaError(query, "Invalid response format", "not_found");
  }

  const obj = data as Record<string, unknown>;

  // Check for disambiguation page
  if (obj.type === "disambiguation") {
    return createWikipediaError(
      query,
      "Multiple results found. Please be more specific.",
      "disambiguation"
    );
  }

  // Check for not found
  if (obj.type === "https://mediawiki.org/wiki/HyperSwitch/errors/not_found") {
    return createWikipediaError(query, "Article not found", "not_found");
  }

  // Parse summary - build URL carefully
  const contentUrls = obj.content_urls as
    | Record<string, Record<string, string>>
    | undefined;
  const desktopUrl = contentUrls?.desktop?.page;
  const articleUrl =
    desktopUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`;

  const summary: WikipediaSummary = {
    title: (obj.title as string) || query,
    displayTitle:
      (obj.displaytitle as string) || (obj.title as string) || query,
    extract: (obj.extract as string) || "",
    url: articleUrl,
  };

  // Add optional properties only if they exist
  if (obj.extract_html && typeof obj.extract_html === "string") {
    summary.extractHtml = obj.extract_html;
  }
  if (obj.description && typeof obj.description === "string") {
    summary.description = obj.description;
  }
  if (obj.wikibase_item && typeof obj.wikibase_item === "string") {
    summary.wikibaseItem = obj.wikibase_item;
  }
  if (obj.timestamp && typeof obj.timestamp === "string") {
    summary.timestamp = obj.timestamp;
  }

  // Parse thumbnail
  if (obj.thumbnail && typeof obj.thumbnail === "object") {
    const thumb = obj.thumbnail as Record<string, unknown>;
    summary.thumbnail = {
      source: thumb.source as string,
      width: thumb.width as number,
      height: thumb.height as number,
    };
  }

  // Parse original image
  if (obj.originalimage && typeof obj.originalimage === "object") {
    const img = obj.originalimage as Record<string, unknown>;
    summary.originalImage = {
      source: img.source as string,
      width: img.width as number,
      height: img.height as number,
    };
  }

  return {
    success: true,
    query,
    summary,
  };
}

/**
 * Truncate extract to a maximum length
 */
export function truncateExtract(
  extract: string,
  maxLength: number = 500
): string {
  if (extract.length <= maxLength) return extract;

  // Find a good break point (end of sentence)
  const truncated = extract.slice(0, maxLength);
  const lastSentence = truncated.lastIndexOf(". ");
  if (lastSentence > maxLength * 0.6) {
    return truncated.slice(0, lastSentence + 1);
  }

  // Fall back to word boundary
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.8) {
    return truncated.slice(0, lastSpace) + "...";
  }

  return truncated + "...";
}

// =============================================================================
// UTILITY FUNCTIONS - SETTINGS
// =============================================================================

/**
 * Load lookup settings from localStorage
 */
export function loadLookupSettings(): LookupSettings {
  try {
    const stored = localStorage.getItem(LOOKUP_SETTINGS_KEY);
    if (!stored) return { ...DEFAULT_LOOKUP_SETTINGS };
    const parsed = JSON.parse(stored) as Partial<LookupSettings>;
    return { ...DEFAULT_LOOKUP_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_LOOKUP_SETTINGS };
  }
}

/**
 * Save lookup settings to localStorage
 */
export function saveLookupSettings(settings: LookupSettings): void {
  try {
    localStorage.setItem(LOOKUP_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable
  }
}

/**
 * Update a single setting
 */
export function updateLookupSetting<K extends keyof LookupSettings>(
  key: K,
  value: LookupSettings[K]
): LookupSettings {
  const settings = loadLookupSettings();
  settings[key] = value;
  saveLookupSettings(settings);
  return settings;
}

// =============================================================================
// UTILITY FUNCTIONS - LOOKUP HELPERS
// =============================================================================

/**
 * Get error message for dictionary error type
 */
export function getDictionaryErrorMessage(
  errorType: DictionaryErrorType
): string {
  switch (errorType) {
    case "not_found":
      return "Word not found in dictionary";
    case "network_error":
      return "Unable to connect to dictionary. Check your internet connection.";
    case "rate_limited":
      return "Too many requests. Please try again later.";
    case "invalid_word":
      return "Invalid word. Please select a valid word.";
    default:
      return "An error occurred while looking up the word.";
  }
}

/**
 * Get error message for Wikipedia error type
 */
export function getWikipediaErrorMessage(
  errorType: WikipediaErrorType
): string {
  switch (errorType) {
    case "not_found":
      return "Article not found on Wikipedia";
    case "disambiguation":
      return "Multiple articles found. Try a more specific search.";
    case "network_error":
      return "Unable to connect to Wikipedia. Check your internet connection.";
    case "rate_limited":
      return "Too many requests. Please try again later.";
    default:
      return "An error occurred while searching Wikipedia.";
  }
}

/**
 * Get part of speech abbreviation
 */
export function getPartOfSpeechAbbrev(partOfSpeech: string): string {
  const abbrevs: Record<string, string> = {
    noun: "n.",
    verb: "v.",
    adjective: "adj.",
    adverb: "adv.",
    pronoun: "pron.",
    preposition: "prep.",
    conjunction: "conj.",
    interjection: "interj.",
    determiner: "det.",
    exclamation: "excl.",
  };
  return abbrevs[partOfSpeech.toLowerCase()] || partOfSpeech;
}

/**
 * Format part of speech for display
 */
export function formatPartOfSpeech(partOfSpeech: string): string {
  return (
    partOfSpeech.charAt(0).toUpperCase() + partOfSpeech.slice(1).toLowerCase()
  );
}

/**
 * Build Wikipedia URL for a language
 */
export function getWikipediaUrlForLanguage(
  title: string,
  language: string = "en"
): string {
  const encoded = encodeURIComponent(title.replace(/\s+/g, "_"));
  return `https://${language}.wikipedia.org/wiki/${encoded}`;
}
