/**
 * Language and internationalization constants
 *
 * Defines supported languages, locale codes, and related utilities.
 *
 * Supported languages at launch:
 * - English (default)
 * - Arabic (RTL support)
 * - Spanish
 * - Japanese
 * - Chinese (Simplified)
 * - Tagalog
 *
 * @example
 * ```typescript
 * import {
 *   SUPPORTED_LANGUAGES,
 *   getLanguageInfo,
 *   isRtlLanguage
 * } from '@read-master/shared/constants';
 *
 * const lang = getLanguageInfo('ar');
 * lang?.nativeName; // العربية
 * isRtlLanguage('ar'); // true
 * ```
 */

// ============================================================================
// Types
// ============================================================================

/**
 * ISO 639-1 language code type for supported languages
 */
export type SupportedLanguageCode = "en" | "ar" | "es" | "ja" | "zh" | "tl";

/**
 * Language information
 */
export type LanguageInfo = {
  /** ISO 639-1 language code */
  readonly code: SupportedLanguageCode;
  /** English name of the language */
  readonly englishName: string;
  /** Native name of the language */
  readonly nativeName: string;
  /** Whether the language uses RTL text direction */
  readonly isRtl: boolean;
  /** Whether the language is enabled (can be disabled temporarily) */
  readonly isEnabled: boolean;
  /** Sort order in language selector */
  readonly sortOrder: number;
  /** Primary region code (for formatting) */
  readonly primaryRegion: string;
  /** Full locale code (e.g., en-US, ar-SA) */
  readonly fullLocale: string;
};

/**
 * Text direction
 */
export type TextDirection = "ltr" | "rtl";

// ============================================================================
// Language Definitions
// ============================================================================

/**
 * English language definition
 */
export const ENGLISH: LanguageInfo = {
  code: "en",
  englishName: "English",
  nativeName: "English",
  isRtl: false,
  isEnabled: true,
  sortOrder: 1,
  primaryRegion: "US",
  fullLocale: "en-US",
} as const;

/**
 * Arabic language definition
 */
export const ARABIC: LanguageInfo = {
  code: "ar",
  englishName: "Arabic",
  nativeName: "العربية",
  isRtl: true,
  isEnabled: true,
  sortOrder: 2,
  primaryRegion: "SA",
  fullLocale: "ar-SA",
} as const;

/**
 * Spanish language definition
 */
export const SPANISH: LanguageInfo = {
  code: "es",
  englishName: "Spanish",
  nativeName: "Español",
  isRtl: false,
  isEnabled: true,
  sortOrder: 3,
  primaryRegion: "ES",
  fullLocale: "es-ES",
} as const;

/**
 * Japanese language definition
 */
export const JAPANESE: LanguageInfo = {
  code: "ja",
  englishName: "Japanese",
  nativeName: "日本語",
  isRtl: false,
  isEnabled: true,
  sortOrder: 4,
  primaryRegion: "JP",
  fullLocale: "ja-JP",
} as const;

/**
 * Chinese (Simplified) language definition
 */
export const CHINESE: LanguageInfo = {
  code: "zh",
  englishName: "Chinese (Simplified)",
  nativeName: "简体中文",
  isRtl: false,
  isEnabled: true,
  sortOrder: 5,
  primaryRegion: "CN",
  fullLocale: "zh-CN",
} as const;

/**
 * Tagalog language definition
 */
export const TAGALOG: LanguageInfo = {
  code: "tl",
  englishName: "Tagalog",
  nativeName: "Tagalog",
  isRtl: false,
  isEnabled: true,
  sortOrder: 6,
  primaryRegion: "PH",
  fullLocale: "tl-PH",
} as const;

/**
 * All supported languages
 */
export const SUPPORTED_LANGUAGES: readonly LanguageInfo[] = [
  ENGLISH,
  ARABIC,
  SPANISH,
  JAPANESE,
  CHINESE,
  TAGALOG,
] as const;

/**
 * Supported language codes
 */
export const SUPPORTED_LANGUAGE_CODES: readonly SupportedLanguageCode[] =
  SUPPORTED_LANGUAGES.map((lang) => lang.code);

/**
 * Languages indexed by code
 */
export const LANGUAGES_BY_CODE: Record<SupportedLanguageCode, LanguageInfo> = {
  en: ENGLISH,
  ar: ARABIC,
  es: SPANISH,
  ja: JAPANESE,
  zh: CHINESE,
  tl: TAGALOG,
} as const;

/**
 * RTL language codes
 */
export const RTL_LANGUAGE_CODES: readonly SupportedLanguageCode[] =
  SUPPORTED_LANGUAGES.filter((lang) => lang.isRtl).map((lang) => lang.code);

/**
 * Default language code
 */
export const DEFAULT_LANGUAGE_CODE: SupportedLanguageCode = "en";

/**
 * Default locale
 */
export const DEFAULT_LOCALE = "en-US";

// ============================================================================
// Number and Date Formatting Defaults
// ============================================================================

/**
 * Date format styles for each language
 */
export const DATE_FORMAT_STYLES: Record<
  SupportedLanguageCode,
  {
    readonly short: Intl.DateTimeFormatOptions;
    readonly medium: Intl.DateTimeFormatOptions;
    readonly long: Intl.DateTimeFormatOptions;
  }
> = {
  en: {
    short: { month: "numeric", day: "numeric", year: "2-digit" },
    medium: { month: "short", day: "numeric", year: "numeric" },
    long: { month: "long", day: "numeric", year: "numeric", weekday: "long" },
  },
  ar: {
    short: { month: "numeric", day: "numeric", year: "2-digit" },
    medium: { month: "short", day: "numeric", year: "numeric" },
    long: { month: "long", day: "numeric", year: "numeric", weekday: "long" },
  },
  es: {
    short: { month: "numeric", day: "numeric", year: "2-digit" },
    medium: { month: "short", day: "numeric", year: "numeric" },
    long: { month: "long", day: "numeric", year: "numeric", weekday: "long" },
  },
  ja: {
    short: { year: "numeric", month: "numeric", day: "numeric" },
    medium: { year: "numeric", month: "short", day: "numeric" },
    long: {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    },
  },
  zh: {
    short: { year: "numeric", month: "numeric", day: "numeric" },
    medium: { year: "numeric", month: "short", day: "numeric" },
    long: {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    },
  },
  tl: {
    short: { month: "numeric", day: "numeric", year: "2-digit" },
    medium: { month: "short", day: "numeric", year: "numeric" },
    long: { month: "long", day: "numeric", year: "numeric", weekday: "long" },
  },
} as const;

/**
 * Time format styles for each language
 */
export const TIME_FORMAT_STYLES: Record<
  SupportedLanguageCode,
  {
    readonly short: Intl.DateTimeFormatOptions;
    readonly medium: Intl.DateTimeFormatOptions;
  }
> = {
  en: {
    short: { hour: "numeric", minute: "2-digit", hour12: true },
    medium: {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    },
  },
  ar: {
    short: { hour: "numeric", minute: "2-digit", hour12: true },
    medium: {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    },
  },
  es: {
    short: { hour: "numeric", minute: "2-digit", hour12: false },
    medium: {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    },
  },
  ja: {
    short: { hour: "numeric", minute: "2-digit", hour12: false },
    medium: {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    },
  },
  zh: {
    short: { hour: "numeric", minute: "2-digit", hour12: true },
    medium: {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    },
  },
  tl: {
    short: { hour: "numeric", minute: "2-digit", hour12: true },
    medium: {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    },
  },
} as const;

/**
 * Number format locales for each language
 */
export const NUMBER_LOCALES: Record<SupportedLanguageCode, string> = {
  en: "en-US",
  ar: "ar-SA",
  es: "es-ES",
  ja: "ja-JP",
  zh: "zh-CN",
  tl: "en-PH", // Tagalog uses English-style number formatting
} as const;

// ============================================================================
// Font Configuration
// ============================================================================

/**
 * Font stacks for each language
 */
export const FONT_STACKS: Record<SupportedLanguageCode, string> = {
  en: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  ar: '"Noto Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif',
  es: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  ja: '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif',
  zh: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
  tl: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

/**
 * Dyslexia-friendly font configuration
 */
export const DYSLEXIA_FONT = {
  name: "OpenDyslexic",
  fallback: "Comic Sans MS, Verdana, sans-serif",
  full: 'OpenDyslexic, "Comic Sans MS", Verdana, sans-serif',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a language code is supported
 */
export function isSupportedLanguage(
  code: string
): code is SupportedLanguageCode {
  return SUPPORTED_LANGUAGE_CODES.includes(code as SupportedLanguageCode);
}

/**
 * Get language info by code
 */
export function getLanguageInfo(code: string): LanguageInfo | undefined {
  if (isSupportedLanguage(code)) {
    return LANGUAGES_BY_CODE[code];
  }
  return undefined;
}

/**
 * Check if a language uses RTL text direction
 */
export function isRtlLanguage(code: string): boolean {
  const lang = getLanguageInfo(code);
  return lang?.isRtl ?? false;
}

/**
 * Get text direction for a language
 */
export function getTextDirection(code: string): TextDirection {
  return isRtlLanguage(code) ? "rtl" : "ltr";
}

/**
 * Get full locale for a language code
 */
export function getFullLocale(code: string): string {
  const lang = getLanguageInfo(code);
  return lang?.fullLocale ?? DEFAULT_LOCALE;
}

/**
 * Get all enabled languages (sorted by sortOrder)
 */
export function getEnabledLanguages(): readonly LanguageInfo[] {
  return SUPPORTED_LANGUAGES.filter((lang) => lang.isEnabled).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

/**
 * Get languages for display in a selector (with native names)
 */
export function getLanguageOptions(): readonly {
  readonly value: SupportedLanguageCode;
  readonly label: string;
  readonly nativeLabel: string;
}[] {
  return getEnabledLanguages().map((lang) => ({
    value: lang.code,
    label: lang.englishName,
    nativeLabel: lang.nativeName,
  }));
}

/**
 * Parse a language code from various formats (e.g., "en-US" -> "en")
 */
export function parseLanguageCode(input: string): SupportedLanguageCode | null {
  // Try exact match first
  if (isSupportedLanguage(input)) {
    return input;
  }

  // Try extracting the primary language code
  const primaryCode = input.split("-")[0]?.toLowerCase();
  if (primaryCode && isSupportedLanguage(primaryCode)) {
    return primaryCode;
  }

  return null;
}

/**
 * Get font stack for a language
 */
export function getFontStack(
  code: string,
  useDyslexiaFont: boolean = false
): string {
  if (useDyslexiaFont) {
    return DYSLEXIA_FONT.full;
  }

  if (isSupportedLanguage(code)) {
    return FONT_STACKS[code];
  }

  return FONT_STACKS.en;
}

/**
 * Format a number according to language conventions
 */
export function formatNumber(
  value: number,
  code: string,
  options?: Intl.NumberFormatOptions
): string {
  const locale = isSupportedLanguage(code)
    ? NUMBER_LOCALES[code]
    : NUMBER_LOCALES.en;
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format a date according to language conventions
 */
export function formatLocalizedDate(
  date: Date,
  code: string,
  style: "short" | "medium" | "long" = "medium"
): string {
  const lang = isSupportedLanguage(code) ? code : "en";
  const locale = LANGUAGES_BY_CODE[lang].fullLocale;
  const options = DATE_FORMAT_STYLES[lang][style];
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Format a time according to language conventions
 */
export function formatLocalizedTime(
  date: Date,
  code: string,
  style: "short" | "medium" = "short"
): string {
  const lang = isSupportedLanguage(code) ? code : "en";
  const locale = LANGUAGES_BY_CODE[lang].fullLocale;
  const options = TIME_FORMAT_STYLES[lang][style];
  return new Intl.DateTimeFormat(locale, options).format(date);
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Convenience object for importing all language-related utilities
 */
export const languageUtils = {
  isSupportedLanguage,
  getLanguageInfo,
  isRtlLanguage,
  getTextDirection,
  getFullLocale,
  getEnabledLanguages,
  getLanguageOptions,
  parseLanguageCode,
  getFontStack,
  formatNumber,
  formatLocalizedDate,
  formatLocalizedTime,
} as const;
