import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  // Constants
  MYMEMORY_API_URL,
  MAX_TRANSLATION_LENGTH,
  MIN_TRANSLATION_LENGTH,
  TRANSLATION_CACHE_TTL,
  MAX_TRANSLATION_CACHE_ENTRIES,
  TRANSLATION_CACHE_KEY,
  TRANSLATION_SETTINGS_KEY,
  SUPPORTED_LANGUAGES,
  RTL_LANGUAGES,
  DEFAULT_TRANSLATION_SETTINGS,
  // Validation functions
  isValidTranslationText,
  isSupportedLanguage,
  isRtlLanguage,
  getLanguageByCode,
  getLanguageDisplayName,
  prepareTextForTranslation,
  // Cache functions
  getTranslationCacheKey,
  createTranslationCacheEntry,
  isTranslationCacheValid,
  getTranslationCache,
  setTranslationCache,
  addTranslationToCache,
  getTranslationFromCache,
  clearTranslationCache,
  getTranslationCacheSize,
  // Settings functions
  loadTranslationSettings,
  saveTranslationSettings,
  updateTranslationSetting,
  // API functions
  createTranslationError,
  createTranslationSuccess,
  buildMyMemoryUrl,
  parseMyMemoryResponse,
  // Error message functions
  getTranslationErrorMessage,
  getLanguagePairDisplay,
  swapLanguages,
  getPopularLanguages,
  getSortedLanguages,
  // Types
  type TranslationResult,
  type TranslationSettings,
  type TranslationCacheEntry,
} from "./translationTypes";

describe("translationTypes", () => {
  // =============================================================================
  // Constants Tests
  // =============================================================================

  describe("Constants", () => {
    it("should have correct API URL", () => {
      expect(MYMEMORY_API_URL).toBe("https://api.mymemory.translated.net/get");
    });

    it("should have correct translation length limits", () => {
      expect(MIN_TRANSLATION_LENGTH).toBe(1);
      expect(MAX_TRANSLATION_LENGTH).toBe(500);
    });

    it("should have correct cache settings", () => {
      expect(TRANSLATION_CACHE_TTL).toBe(60 * 60 * 1000); // 1 hour
      expect(MAX_TRANSLATION_CACHE_ENTRIES).toBe(200);
    });

    it("should have supported languages", () => {
      expect(SUPPORTED_LANGUAGES.length).toBeGreaterThan(0);
      const english = SUPPORTED_LANGUAGES.find((l) => l.code === "en");
      expect(english).toBeDefined();
      expect(english?.name).toBe("English");
    });

    it("should have RTL languages defined", () => {
      expect(RTL_LANGUAGES.has("ar")).toBe(true);
      expect(RTL_LANGUAGES.has("he")).toBe(true);
      expect(RTL_LANGUAGES.has("en")).toBe(false);
    });

    it("should have default settings defined", () => {
      expect(DEFAULT_TRANSLATION_SETTINGS.targetLanguage).toBe("en");
      expect(DEFAULT_TRANSLATION_SETTINGS.sourceLanguage).toBe("auto");
      expect(DEFAULT_TRANSLATION_SETTINGS.showOriginal).toBe(true);
      expect(DEFAULT_TRANSLATION_SETTINGS.autoTranslate).toBe(false);
    });
  });

  // =============================================================================
  // Validation Functions Tests
  // =============================================================================

  describe("isValidTranslationText", () => {
    it("should return true for valid text", () => {
      expect(isValidTranslationText("Hello")).toBe(true);
      expect(isValidTranslationText("Hello world")).toBe(true);
      expect(isValidTranslationText("Test")).toBe(true);
    });

    it("should return false for empty or whitespace-only text", () => {
      expect(isValidTranslationText("")).toBe(false);
      expect(isValidTranslationText("   ")).toBe(false);
    });

    it("should return false for text with only numbers", () => {
      expect(isValidTranslationText("12345")).toBe(false);
      expect(isValidTranslationText("   123   ")).toBe(false);
    });

    it("should return false for text exceeding max length", () => {
      const longText = "a".repeat(MAX_TRANSLATION_LENGTH + 1);
      expect(isValidTranslationText(longText)).toBe(false);
    });

    it("should return true for text at max length", () => {
      const exactText = "a".repeat(MAX_TRANSLATION_LENGTH);
      expect(isValidTranslationText(exactText)).toBe(true);
    });
  });

  describe("isSupportedLanguage", () => {
    it("should return true for supported languages", () => {
      expect(isSupportedLanguage("en")).toBe(true);
      expect(isSupportedLanguage("es")).toBe(true);
      expect(isSupportedLanguage("ar")).toBe(true);
      expect(isSupportedLanguage("ja")).toBe(true);
    });

    it("should return false for unsupported languages", () => {
      expect(isSupportedLanguage("xyz")).toBe(false);
      expect(isSupportedLanguage("invalid")).toBe(false);
    });
  });

  describe("isRtlLanguage", () => {
    it("should return true for RTL languages", () => {
      expect(isRtlLanguage("ar")).toBe(true);
      expect(isRtlLanguage("he")).toBe(true);
    });

    it("should return false for LTR languages", () => {
      expect(isRtlLanguage("en")).toBe(false);
      expect(isRtlLanguage("es")).toBe(false);
      expect(isRtlLanguage("ja")).toBe(false);
    });
  });

  describe("getLanguageByCode", () => {
    it("should return language for valid code", () => {
      const english = getLanguageByCode("en");
      expect(english).toBeDefined();
      expect(english?.name).toBe("English");
      expect(english?.nativeName).toBe("English");
    });

    it("should return RTL info for Arabic", () => {
      const arabic = getLanguageByCode("ar");
      expect(arabic).toBeDefined();
      expect(arabic?.rtl).toBe(true);
    });

    it("should return undefined for invalid code", () => {
      expect(getLanguageByCode("xyz")).toBeUndefined();
    });
  });

  describe("getLanguageDisplayName", () => {
    it("should return English name by default", () => {
      expect(getLanguageDisplayName("es")).toBe("Spanish");
      expect(getLanguageDisplayName("ja")).toBe("Japanese");
    });

    it("should return native name when requested", () => {
      expect(getLanguageDisplayName("es", true)).toBe("Spanish (Espa\u00f1ol)");
      expect(getLanguageDisplayName("ja", true)).toBe(
        "Japanese (\u65e5\u672c\u8a9e)"
      );
    });

    it("should return uppercase code for unknown language", () => {
      expect(getLanguageDisplayName("xyz")).toBe("XYZ");
    });
  });

  describe("prepareTextForTranslation", () => {
    it("should trim whitespace", () => {
      expect(prepareTextForTranslation("  Hello  ")).toBe("Hello");
    });

    it("should normalize whitespace", () => {
      expect(prepareTextForTranslation("Hello   world")).toBe("Hello world");
    });

    it("should truncate long text with ellipsis", () => {
      const longText = "word ".repeat(150);
      const prepared = prepareTextForTranslation(longText);
      expect(prepared.length).toBeLessThanOrEqual(MAX_TRANSLATION_LENGTH + 3);
      expect(prepared.endsWith("...")).toBe(true);
    });

    it("should preserve text under max length", () => {
      expect(prepareTextForTranslation("Hello world")).toBe("Hello world");
    });
  });

  // =============================================================================
  // Cache Functions Tests
  // =============================================================================

  describe("getTranslationCacheKey", () => {
    it("should generate consistent cache key", () => {
      const key = getTranslationCacheKey("Hello", "en", "es");
      expect(key).toBe("en:es:hello");
    });

    it("should normalize text to lowercase", () => {
      expect(getTranslationCacheKey("HELLO", "en", "es")).toBe("en:es:hello");
    });

    it("should trim whitespace", () => {
      expect(getTranslationCacheKey("  Hello  ", "en", "es")).toBe(
        "en:es:hello"
      );
    });
  });

  describe("createTranslationCacheEntry", () => {
    it("should create entry with timestamp", () => {
      const result: TranslationResult = {
        success: true,
        sourceText: "Hello",
        translatedText: "Hola",
        sourceLanguage: "en",
        targetLanguage: "es",
      };
      const entry = createTranslationCacheEntry(result);
      expect(entry.data).toEqual(result);
      expect(entry.timestamp).toBeDefined();
      expect(entry.ttl).toBe(TRANSLATION_CACHE_TTL);
    });

    it("should accept custom TTL", () => {
      const result: TranslationResult = {
        success: true,
        sourceText: "Test",
        sourceLanguage: "en",
        targetLanguage: "es",
      };
      const entry = createTranslationCacheEntry(result, 5000);
      expect(entry.ttl).toBe(5000);
    });
  });

  describe("isTranslationCacheValid", () => {
    it("should return false for null entry", () => {
      expect(isTranslationCacheValid(null)).toBe(false);
    });

    it("should return true for valid entry", () => {
      const entry: TranslationCacheEntry = {
        data: {
          success: true,
          sourceText: "Test",
          sourceLanguage: "en",
          targetLanguage: "es",
        },
        timestamp: Date.now(),
        ttl: TRANSLATION_CACHE_TTL,
      };
      expect(isTranslationCacheValid(entry)).toBe(true);
    });

    it("should return false for expired entry", () => {
      const entry: TranslationCacheEntry = {
        data: {
          success: true,
          sourceText: "Test",
          sourceLanguage: "en",
          targetLanguage: "es",
        },
        timestamp: Date.now() - TRANSLATION_CACHE_TTL - 1000,
        ttl: TRANSLATION_CACHE_TTL,
      };
      expect(isTranslationCacheValid(entry)).toBe(false);
    });
  });

  describe("Cache localStorage functions", () => {
    const mockStorage: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
      }),
      length: 0,
      key: vi.fn(),
    };

    beforeEach(() => {
      vi.stubGlobal("localStorage", mockLocalStorage);
      mockLocalStorage.clear();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should get empty cache when nothing stored", () => {
      const cache = getTranslationCache();
      expect(cache).toEqual({});
    });

    it("should set and get cache", () => {
      const entry: TranslationCacheEntry = {
        data: {
          success: true,
          sourceText: "Hello",
          translatedText: "Hola",
          sourceLanguage: "en",
          targetLanguage: "es",
        },
        timestamp: Date.now(),
        ttl: TRANSLATION_CACHE_TTL,
      };
      setTranslationCache({ "en:es:hello": entry });
      const cache = getTranslationCache();
      expect(cache["en:es:hello"]).toBeDefined();
    });

    it("should filter out expired entries on get", () => {
      const expiredEntry: TranslationCacheEntry = {
        data: {
          success: true,
          sourceText: "Old",
          sourceLanguage: "en",
          targetLanguage: "es",
        },
        timestamp: Date.now() - TRANSLATION_CACHE_TTL - 1000,
        ttl: TRANSLATION_CACHE_TTL,
      };
      mockStorage[TRANSLATION_CACHE_KEY] = JSON.stringify({
        "en:es:old": expiredEntry,
      });
      const cache = getTranslationCache();
      expect(cache["en:es:old"]).toBeUndefined();
    });

    it("should add translation to cache", () => {
      const result: TranslationResult = {
        success: true,
        sourceText: "Hello",
        translatedText: "Hola",
        sourceLanguage: "en",
        targetLanguage: "es",
      };
      addTranslationToCache("Hello", "en", "es", result);
      const cached = getTranslationFromCache("Hello", "en", "es");
      expect(cached).toBeDefined();
      expect(cached?.translatedText).toBe("Hola");
    });

    it("should return null for non-existent cache entry", () => {
      const cached = getTranslationFromCache("NonExistent", "en", "es");
      expect(cached).toBeNull();
    });

    it("should clear cache", () => {
      addTranslationToCache("Hello", "en", "es", {
        success: true,
        sourceText: "Hello",
        sourceLanguage: "en",
        targetLanguage: "es",
      });
      clearTranslationCache();
      expect(getTranslationCacheSize()).toBe(0);
    });

    it("should return correct cache size", () => {
      expect(getTranslationCacheSize()).toBe(0);
      addTranslationToCache("Hello", "en", "es", {
        success: true,
        sourceText: "Hello",
        sourceLanguage: "en",
        targetLanguage: "es",
      });
      expect(getTranslationCacheSize()).toBe(1);
    });
  });

  // =============================================================================
  // Settings Functions Tests
  // =============================================================================

  describe("Settings functions", () => {
    const mockStorage: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
      }),
      length: 0,
      key: vi.fn(),
    };

    beforeEach(() => {
      vi.stubGlobal("localStorage", mockLocalStorage);
      mockLocalStorage.clear();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should load default settings when nothing stored", () => {
      const settings = loadTranslationSettings();
      expect(settings).toEqual(DEFAULT_TRANSLATION_SETTINGS);
    });

    it("should save and load settings", () => {
      const customSettings: TranslationSettings = {
        targetLanguage: "es",
        sourceLanguage: "en",
        showOriginal: false,
        autoTranslate: true,
      };
      saveTranslationSettings(customSettings);
      const loaded = loadTranslationSettings();
      expect(loaded).toEqual(customSettings);
    });

    it("should merge partial stored settings with defaults", () => {
      localStorage.setItem(
        TRANSLATION_SETTINGS_KEY,
        JSON.stringify({ targetLanguage: "fr" })
      );
      const settings = loadTranslationSettings();
      expect(settings.targetLanguage).toBe("fr");
      expect(settings.sourceLanguage).toBe("auto");
    });

    it("should update single setting", () => {
      const settings = updateTranslationSetting("targetLanguage", "de");
      expect(settings.targetLanguage).toBe("de");
      const loaded = loadTranslationSettings();
      expect(loaded.targetLanguage).toBe("de");
    });
  });

  // =============================================================================
  // API Functions Tests
  // =============================================================================

  describe("createTranslationError", () => {
    it("should create error result", () => {
      const result = createTranslationError(
        "Hello",
        "en",
        "es",
        "Network error",
        "network_error"
      );
      expect(result.success).toBe(false);
      expect(result.sourceText).toBe("Hello");
      expect(result.sourceLanguage).toBe("en");
      expect(result.targetLanguage).toBe("es");
      expect(result.error).toBe("Network error");
      expect(result.errorType).toBe("network_error");
    });
  });

  describe("createTranslationSuccess", () => {
    it("should create success result", () => {
      const result = createTranslationSuccess("Hello", "Hola", "en", "es");
      expect(result.success).toBe(true);
      expect(result.sourceText).toBe("Hello");
      expect(result.translatedText).toBe("Hola");
      expect(result.sourceLanguage).toBe("en");
      expect(result.targetLanguage).toBe("es");
    });

    it("should include detected language when provided", () => {
      const result = createTranslationSuccess(
        "Hello",
        "Hola",
        "auto",
        "es",
        "en"
      );
      expect(result.detectedLanguage).toBe("en");
    });
  });

  describe("buildMyMemoryUrl", () => {
    it("should build correct URL with language pair", () => {
      const url = buildMyMemoryUrl("Hello", "en", "es");
      expect(url).toBe(
        "https://api.mymemory.translated.net/get?q=Hello&langpair=en|es"
      );
    });

    it("should use target language only when source is auto", () => {
      const url = buildMyMemoryUrl("Hello", "auto", "es");
      expect(url).toBe(
        "https://api.mymemory.translated.net/get?q=Hello&langpair=es"
      );
    });

    it("should encode special characters", () => {
      const url = buildMyMemoryUrl("Hello world!", "en", "es");
      expect(url).toContain("Hello%20world!");
    });
  });

  describe("parseMyMemoryResponse", () => {
    it("should parse successful response", () => {
      const data = {
        responseStatus: 200,
        responseData: {
          translatedText: "Hola",
        },
      };
      const result = parseMyMemoryResponse("Hello", "en", "es", data);
      expect(result.success).toBe(true);
      expect(result.translatedText).toBe("Hola");
    });

    it("should handle rate limited response", () => {
      const data = {
        responseStatus: 429,
        responseDetails: "Rate limited",
      };
      const result = parseMyMemoryResponse("Hello", "en", "es", data);
      expect(result.success).toBe(false);
      expect(result.errorType).toBe("rate_limited");
    });

    it("should handle error response", () => {
      const data = {
        responseStatus: 400,
        responseDetails: "Bad request",
      };
      const result = parseMyMemoryResponse("Hello", "en", "es", data);
      expect(result.success).toBe(false);
      expect(result.errorType).toBe("api_error");
    });

    it("should handle missing response data", () => {
      const data = {
        responseStatus: 200,
      };
      const result = parseMyMemoryResponse("Hello", "en", "es", data);
      expect(result.success).toBe(false);
    });

    it("should handle null response", () => {
      const result = parseMyMemoryResponse("Hello", "en", "es", null);
      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // Error Message Functions Tests
  // =============================================================================

  describe("getTranslationErrorMessage", () => {
    it("should return correct message for network error", () => {
      const message = getTranslationErrorMessage("network_error");
      expect(message).toContain("connect");
    });

    it("should return correct message for rate limited", () => {
      const message = getTranslationErrorMessage("rate_limited");
      expect(message).toContain("limit");
    });

    it("should return correct message for invalid text", () => {
      const message = getTranslationErrorMessage("invalid_text");
      expect(message).toContain("valid");
    });

    it("should return correct message for unsupported language", () => {
      const message = getTranslationErrorMessage("unsupported_language");
      expect(message).toContain("not supported");
    });

    it("should return correct message for text too long", () => {
      const message = getTranslationErrorMessage("text_too_long");
      expect(message).toContain(String(MAX_TRANSLATION_LENGTH));
    });

    it("should return generic message for unknown error type", () => {
      // @ts-expect-error - Testing unknown error type
      const message = getTranslationErrorMessage("unknown");
      expect(message).toContain("error");
    });
  });

  describe("getLanguagePairDisplay", () => {
    it("should display language pair", () => {
      const display = getLanguagePairDisplay("en", "es");
      expect(display).toBe("English \u2192 Spanish");
    });

    it("should show Auto-detect for auto source", () => {
      const display = getLanguagePairDisplay("auto", "es");
      expect(display).toBe("Auto-detect \u2192 Spanish");
    });
  });

  describe("swapLanguages", () => {
    it("should swap source and target languages", () => {
      const settings: TranslationSettings = {
        targetLanguage: "es",
        sourceLanguage: "en",
        showOriginal: true,
        autoTranslate: false,
      };
      const swapped = swapLanguages(settings);
      expect(swapped.sourceLanguage).toBe("es");
      expect(swapped.targetLanguage).toBe("en");
    });

    it("should not swap when source is auto", () => {
      const settings: TranslationSettings = {
        targetLanguage: "es",
        sourceLanguage: "auto",
        showOriginal: true,
        autoTranslate: false,
      };
      const swapped = swapLanguages(settings);
      expect(swapped.sourceLanguage).toBe("auto");
      expect(swapped.targetLanguage).toBe("es");
    });
  });

  describe("getPopularLanguages", () => {
    it("should return subset of languages", () => {
      const popular = getPopularLanguages();
      expect(popular.length).toBeLessThan(SUPPORTED_LANGUAGES.length);
      expect(popular.some((l) => l.code === "en")).toBe(true);
      expect(popular.some((l) => l.code === "es")).toBe(true);
    });
  });

  describe("getSortedLanguages", () => {
    it("should return languages sorted alphabetically", () => {
      const sorted = getSortedLanguages();
      expect(sorted.length).toBe(SUPPORTED_LANGUAGES.length);
      // Arabic should come before Chinese alphabetically
      const arabicIndex = sorted.findIndex((l) => l.code === "ar");
      const chineseIndex = sorted.findIndex((l) => l.code === "zh");
      expect(arabicIndex).toBeLessThan(chineseIndex);
    });
  });
});
