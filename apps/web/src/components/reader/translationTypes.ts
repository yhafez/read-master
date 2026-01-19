/**
 * Types and utilities for text translation feature
 *
 * Note: Uses LibreTranslate API (free, open source) or falls back to
 * MyMemory Translation API (free tier: 5000 chars/day).
 * For production, consider Google Cloud Translation API.
 */

// =============================================================================
// TRANSLATION TYPES
// =============================================================================

/**
 * Translation state
 */
export type TranslationState = "idle" | "loading" | "success" | "error";

/**
 * Translation error types
 */
export type TranslationErrorType =
  | "network_error"
  | "rate_limited"
  | "invalid_text"
  | "unsupported_language"
  | "text_too_long"
  | "api_error";

/**
 * Translation result
 */
export interface TranslationResult {
  /** Success status */
  success: boolean;
  /** Original text */
  sourceText: string;
  /** Translated text */
  translatedText?: string;
  /** Source language code */
  sourceLanguage: string;
  /** Target language code */
  targetLanguage: string;
  /** Detected source language (if auto-detected) */
  detectedLanguage?: string;
  /** Error message if failed */
  error?: string;
  /** Error type for specific handling */
  errorType?: TranslationErrorType;
}

/**
 * Language option for selector
 */
export interface LanguageOption {
  /** ISO language code (e.g., "en", "es", "ar") */
  code: string;
  /** Display name in English */
  name: string;
  /** Native name (e.g., "Espa\u00f1ol" for Spanish) */
  nativeName: string;
  /** Whether it's RTL (right-to-left) */
  rtl?: boolean;
}

/**
 * Translation settings
 */
export interface TranslationSettings {
  /** Target language code */
  targetLanguage: string;
  /** Source language code (or "auto" for auto-detect) */
  sourceLanguage: string;
  /** Show original text alongside translation */
  showOriginal: boolean;
  /** Auto-translate on selection */
  autoTranslate: boolean;
}

/**
 * Cache entry for translations
 */
export interface TranslationCacheEntry {
  /** Cached translation result */
  data: TranslationResult;
  /** Timestamp when cached */
  timestamp: number;
  /** Time-to-live in milliseconds */
  ttl: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * MyMemory Translation API endpoint (free tier)
 * Limit: 5000 chars/day, max 500 chars per request
 */
export const MYMEMORY_API_URL = "https://api.mymemory.translated.net/get";

/**
 * Maximum text length for translation
 */
export const MAX_TRANSLATION_LENGTH = 500;

/**
 * Minimum text length for translation
 */
export const MIN_TRANSLATION_LENGTH = 1;

/**
 * Translation cache TTL (1 hour)
 */
export const TRANSLATION_CACHE_TTL = 60 * 60 * 1000;

/**
 * Maximum cache entries
 */
export const MAX_TRANSLATION_CACHE_ENTRIES = 200;

/**
 * Local storage keys
 */
export const TRANSLATION_CACHE_KEY = "readmaster_translation_cache";
export const TRANSLATION_SETTINGS_KEY = "readmaster_translation_settings";

/**
 * Supported languages for translation
 */
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Espa\u00f1ol" },
  { code: "fr", name: "French", nativeName: "Fran\u00e7ais" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "pt", name: "Portuguese", nativeName: "Portugu\u00eas" },
  {
    code: "ru",
    name: "Russian",
    nativeName: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
  },
  { code: "ja", name: "Japanese", nativeName: "\u65e5\u672c\u8a9e" },
  { code: "ko", name: "Korean", nativeName: "\ud55c\uad6d\uc5b4" },
  {
    code: "zh",
    name: "Chinese (Simplified)",
    nativeName: "\u7b80\u4f53\u4e2d\u6587",
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
    rtl: true,
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "\u0939\u093f\u0928\u094d\u0926\u0940",
  },
  { code: "tr", name: "Turkish", nativeName: "T\u00fcrk\u00e7e" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "vi", name: "Vietnamese", nativeName: "Ti\u1ebfng Vi\u1ec7t" },
  { code: "th", name: "Thai", nativeName: "\u0e44\u0e17\u0e22" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "tl", name: "Tagalog", nativeName: "Tagalog" },
  {
    code: "he",
    name: "Hebrew",
    nativeName: "\u05e2\u05d1\u05e8\u05d9\u05ea",
    rtl: true,
  },
  {
    code: "uk",
    name: "Ukrainian",
    nativeName: "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430",
  },
  { code: "cs", name: "Czech", nativeName: "\u010ce\u0161tina" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
  {
    code: "el",
    name: "Greek",
    nativeName: "\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac",
  },
];

/**
 * RTL language codes
 */
export const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

/**
 * Default translation settings
 */
export const DEFAULT_TRANSLATION_SETTINGS: TranslationSettings = {
  targetLanguage: "en",
  sourceLanguage: "auto",
  showOriginal: true,
  autoTranslate: false,
};

// =============================================================================
// UTILITY FUNCTIONS - VALIDATION
// =============================================================================

/**
 * Validate text for translation
 */
export function isValidTranslationText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < MIN_TRANSLATION_LENGTH) return false;
  if (trimmed.length > MAX_TRANSLATION_LENGTH) return false;
  // Must contain at least some letters
  if (!/\p{L}/u.test(trimmed)) return false;
  return true;
}

/**
 * Check if a language code is supported
 */
export function isSupportedLanguage(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code);
}

/**
 * Check if a language is RTL
 */
export function isRtlLanguage(code: string): boolean {
  return RTL_LANGUAGES.has(code);
}

/**
 * Get language by code
 */
export function getLanguageByCode(code: string): LanguageOption | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
}

/**
 * Get language display name
 */
export function getLanguageDisplayName(
  code: string,
  showNative: boolean = false
): string {
  const lang = getLanguageByCode(code);
  if (!lang) return code.toUpperCase();
  return showNative ? `${lang.name} (${lang.nativeName})` : lang.name;
}

/**
 * Prepare text for translation (clean and truncate)
 */
export function prepareTextForTranslation(text: string): string {
  let prepared = text.trim();
  // Normalize whitespace
  prepared = prepared.replace(/\s+/g, " ");
  // Truncate if too long
  if (prepared.length > MAX_TRANSLATION_LENGTH) {
    // Try to cut at word boundary
    const truncated = prepared.slice(0, MAX_TRANSLATION_LENGTH);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > MAX_TRANSLATION_LENGTH * 0.8) {
      return truncated.slice(0, lastSpace) + "...";
    }
    return truncated + "...";
  }
  return prepared;
}

// =============================================================================
// UTILITY FUNCTIONS - CACHE
// =============================================================================

/**
 * Generate cache key for a translation
 */
export function getTranslationCacheKey(
  text: string,
  sourceLang: string,
  targetLang: string
): string {
  const normalizedText = text.trim().toLowerCase();
  return `${sourceLang}:${targetLang}:${normalizedText}`;
}

/**
 * Create a cache entry
 */
export function createTranslationCacheEntry(
  data: TranslationResult,
  ttl: number = TRANSLATION_CACHE_TTL
): TranslationCacheEntry {
  return {
    data,
    timestamp: Date.now(),
    ttl,
  };
}

/**
 * Check if a cache entry is still valid
 */
export function isTranslationCacheValid(
  entry: TranslationCacheEntry | null
): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < entry.ttl;
}

/**
 * Get translation cache from localStorage
 */
export function getTranslationCache(): Record<string, TranslationCacheEntry> {
  try {
    const stored = localStorage.getItem(TRANSLATION_CACHE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, TranslationCacheEntry>;
    // Filter out expired entries
    const valid: Record<string, TranslationCacheEntry> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (isTranslationCacheValid(v)) {
        valid[k] = v;
      }
    }
    return valid;
  } catch {
    return {};
  }
}

/**
 * Set translation cache to localStorage
 */
export function setTranslationCache(
  cache: Record<string, TranslationCacheEntry>
): void {
  try {
    // Limit cache size
    const entries = Object.entries(cache);
    if (entries.length > MAX_TRANSLATION_CACHE_ENTRIES) {
      // Sort by timestamp (oldest first) and keep newest
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const trimmed = entries.slice(-MAX_TRANSLATION_CACHE_ENTRIES);
      cache = Object.fromEntries(trimmed);
    }
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or unavailable - ignore
  }
}

/**
 * Add translation to cache
 */
export function addTranslationToCache(
  text: string,
  sourceLang: string,
  targetLang: string,
  result: TranslationResult
): void {
  const cache = getTranslationCache();
  const key = getTranslationCacheKey(text, sourceLang, targetLang);
  cache[key] = createTranslationCacheEntry(result);
  setTranslationCache(cache);
}

/**
 * Get translation from cache
 */
export function getTranslationFromCache(
  text: string,
  sourceLang: string,
  targetLang: string
): TranslationResult | null {
  const cache = getTranslationCache();
  const key = getTranslationCacheKey(text, sourceLang, targetLang);
  const entry = cache[key];
  if (entry && isTranslationCacheValid(entry)) {
    return entry.data;
  }
  return null;
}

/**
 * Clear translation cache
 */
export function clearTranslationCache(): void {
  try {
    localStorage.removeItem(TRANSLATION_CACHE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Get translation cache size
 */
export function getTranslationCacheSize(): number {
  const cache = getTranslationCache();
  return Object.keys(cache).length;
}

// =============================================================================
// UTILITY FUNCTIONS - SETTINGS
// =============================================================================

/**
 * Load translation settings from localStorage
 */
export function loadTranslationSettings(): TranslationSettings {
  try {
    const stored = localStorage.getItem(TRANSLATION_SETTINGS_KEY);
    if (!stored) return { ...DEFAULT_TRANSLATION_SETTINGS };
    const parsed = JSON.parse(stored) as Partial<TranslationSettings>;
    return { ...DEFAULT_TRANSLATION_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_TRANSLATION_SETTINGS };
  }
}

/**
 * Save translation settings to localStorage
 */
export function saveTranslationSettings(settings: TranslationSettings): void {
  try {
    localStorage.setItem(TRANSLATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable
  }
}

/**
 * Update a single translation setting
 */
export function updateTranslationSetting<K extends keyof TranslationSettings>(
  key: K,
  value: TranslationSettings[K]
): TranslationSettings {
  const settings = loadTranslationSettings();
  settings[key] = value;
  saveTranslationSettings(settings);
  return settings;
}

// =============================================================================
// UTILITY FUNCTIONS - API
// =============================================================================

/**
 * Create translation error result
 */
export function createTranslationError(
  sourceText: string,
  sourceLang: string,
  targetLang: string,
  message: string,
  errorType: TranslationErrorType
): TranslationResult {
  return {
    success: false,
    sourceText,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
    error: message,
    errorType,
  };
}

/**
 * Create successful translation result
 */
export function createTranslationSuccess(
  sourceText: string,
  translatedText: string,
  sourceLang: string,
  targetLang: string,
  detectedLang?: string
): TranslationResult {
  const result: TranslationResult = {
    success: true,
    sourceText,
    translatedText,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
  };
  if (detectedLang) {
    result.detectedLanguage = detectedLang;
  }
  return result;
}

/**
 * Build MyMemory API URL
 */
export function buildMyMemoryUrl(
  text: string,
  sourceLang: string,
  targetLang: string
): string {
  const encodedText = encodeURIComponent(text);
  const langPair =
    sourceLang === "auto" ? targetLang : `${sourceLang}|${targetLang}`;
  return `${MYMEMORY_API_URL}?q=${encodedText}&langpair=${langPair}`;
}

/**
 * Parse MyMemory API response
 */
export function parseMyMemoryResponse(
  sourceText: string,
  sourceLang: string,
  targetLang: string,
  data: unknown
): TranslationResult {
  if (!data || typeof data !== "object") {
    return createTranslationError(
      sourceText,
      sourceLang,
      targetLang,
      "Invalid response format",
      "api_error"
    );
  }

  const obj = data as Record<string, unknown>;

  // Check for errors
  if (obj.responseStatus && obj.responseStatus !== 200) {
    const status = obj.responseStatus as number;
    if (status === 429) {
      return createTranslationError(
        sourceText,
        sourceLang,
        targetLang,
        "Translation limit reached. Please try again later.",
        "rate_limited"
      );
    }
    return createTranslationError(
      sourceText,
      sourceLang,
      targetLang,
      (obj.responseDetails as string) || "Translation failed",
      "api_error"
    );
  }

  // Extract translation
  const responseData = obj.responseData as Record<string, unknown> | undefined;
  if (!responseData) {
    return createTranslationError(
      sourceText,
      sourceLang,
      targetLang,
      "No translation data in response",
      "api_error"
    );
  }

  const translatedText = responseData.translatedText as string | undefined;
  if (!translatedText) {
    return createTranslationError(
      sourceText,
      sourceLang,
      targetLang,
      "No translated text in response",
      "api_error"
    );
  }

  // Extract detected language if auto-detected
  const detectedLang = responseData.detectedLanguage as string | undefined;

  return createTranslationSuccess(
    sourceText,
    translatedText,
    sourceLang,
    targetLang,
    detectedLang
  );
}

// =============================================================================
// UTILITY FUNCTIONS - ERROR MESSAGES
// =============================================================================

/**
 * Get user-friendly error message for translation error type
 */
export function getTranslationErrorMessage(
  errorType: TranslationErrorType
): string {
  switch (errorType) {
    case "network_error":
      return "Unable to connect to translation service. Check your internet connection.";
    case "rate_limited":
      return "Translation limit reached. Please try again later.";
    case "invalid_text":
      return "Please select valid text to translate.";
    case "unsupported_language":
      return "This language combination is not supported.";
    case "text_too_long":
      return `Text is too long. Maximum ${MAX_TRANSLATION_LENGTH} characters allowed.`;
    case "api_error":
      return "Translation service error. Please try again.";
    default:
      return "An error occurred while translating.";
  }
}

/**
 * Get language pair display string
 */
export function getLanguagePairDisplay(
  sourceLang: string,
  targetLang: string
): string {
  const source =
    sourceLang === "auto" ? "Auto-detect" : getLanguageDisplayName(sourceLang);
  const target = getLanguageDisplayName(targetLang);
  return `${source} \u2192 ${target}`;
}

/**
 * Swap source and target languages (if source is not auto)
 */
export function swapLanguages(
  settings: TranslationSettings
): TranslationSettings {
  if (settings.sourceLanguage === "auto") {
    // Can't swap if source is auto
    return settings;
  }
  return {
    ...settings,
    sourceLanguage: settings.targetLanguage,
    targetLanguage: settings.sourceLanguage,
  };
}

/**
 * Get popular languages (subset for quick selection)
 */
export function getPopularLanguages(): LanguageOption[] {
  const popularCodes = ["en", "es", "fr", "de", "zh", "ja", "ar", "pt", "ru"];
  return SUPPORTED_LANGUAGES.filter((lang) => popularCodes.includes(lang.code));
}

/**
 * Sort languages alphabetically by name
 */
export function getSortedLanguages(): LanguageOption[] {
  return [...SUPPORTED_LANGUAGES].sort((a, b) => a.name.localeCompare(b.name));
}
