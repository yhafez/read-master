/**
 * Tests for dictionary and Wikipedia lookup types and utilities
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  // Constants
  DICTIONARY_API_URL,
  WIKIPEDIA_API_URL,
  WIKIPEDIA_LANGUAGES,
  CACHE_TTL,
  MAX_CACHE_ENTRIES,
  MIN_WORD_LENGTH,
  MAX_WORD_LENGTH,
  DICTIONARY_CACHE_KEY,
  WIKIPEDIA_CACHE_KEY,
  LOOKUP_SETTINGS_KEY,
  DEFAULT_LOOKUP_SETTINGS,
  // Word validation
  normalizeWord,
  isValidLookupWord,
  extractFirstWord,
  isPhrase,
  // Cache utilities
  createCacheEntry,
  isCacheValid,
  getCache,
  setCache,
  addToCache,
  getFromCache,
  clearCache,
  getCacheSize,
  // Dictionary utilities
  createDictionaryError,
  parseDictionaryResponse,
  parseDictionaryPhonetics,
  parseDictionaryMeanings,
  parseDictionaryDefinitions,
  getPhoneticText,
  getPhoneticAudio,
  getAllSynonyms,
  getAllAntonyms,
  countDefinitions,
  // Wikipedia utilities
  createWikipediaError,
  buildWikipediaUrl,
  parseWikipediaResponse,
  truncateExtract,
  // Settings utilities
  loadLookupSettings,
  saveLookupSettings,
  updateLookupSetting,
  // Helper utilities
  getDictionaryErrorMessage,
  getWikipediaErrorMessage,
  getPartOfSpeechAbbrev,
  formatPartOfSpeech,
  getWikipediaUrlForLanguage,
  // Types
  type DictionaryEntry,
  type LookupCacheEntry,
  type LookupSettings,
} from "./dictionaryTypes";

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Constants", () => {
  it("should have correct dictionary API URL", () => {
    expect(DICTIONARY_API_URL).toBe(
      "https://api.dictionaryapi.dev/api/v2/entries/en"
    );
  });

  it("should have correct Wikipedia API URL", () => {
    expect(WIKIPEDIA_API_URL).toBe("https://en.wikipedia.org/api/rest_v1");
  });

  it("should have all supported Wikipedia languages", () => {
    expect(WIKIPEDIA_LANGUAGES).toHaveProperty("en", "English");
    expect(WIKIPEDIA_LANGUAGES).toHaveProperty("es", "Spanish");
    expect(WIKIPEDIA_LANGUAGES).toHaveProperty("ar", "Arabic");
    expect(WIKIPEDIA_LANGUAGES).toHaveProperty("ja", "Japanese");
    expect(WIKIPEDIA_LANGUAGES).toHaveProperty("zh", "Chinese");
    expect(WIKIPEDIA_LANGUAGES).toHaveProperty("tl", "Tagalog");
  });

  it("should have correct cache TTL (1 hour)", () => {
    expect(CACHE_TTL).toBe(60 * 60 * 1000);
  });

  it("should have correct max cache entries", () => {
    expect(MAX_CACHE_ENTRIES).toBe(100);
  });

  it("should have correct word length limits", () => {
    expect(MIN_WORD_LENGTH).toBe(2);
    expect(MAX_WORD_LENGTH).toBe(100);
  });

  it("should have correct storage keys", () => {
    expect(DICTIONARY_CACHE_KEY).toBe("readmaster_dictionary_cache");
    expect(WIKIPEDIA_CACHE_KEY).toBe("readmaster_wikipedia_cache");
    expect(LOOKUP_SETTINGS_KEY).toBe("readmaster_lookup_settings");
  });

  it("should have correct default lookup settings", () => {
    expect(DEFAULT_LOOKUP_SETTINGS).toEqual({
      autoLookup: false,
      preferredSource: "dictionary",
      showPhonetics: true,
      showExamples: true,
      showSynonyms: true,
      wikipediaLanguage: "en",
    });
  });
});

// =============================================================================
// WORD VALIDATION TESTS
// =============================================================================

describe("normalizeWord", () => {
  it("should trim whitespace", () => {
    expect(normalizeWord("  hello  ")).toBe("hello");
  });

  it("should convert to lowercase", () => {
    expect(normalizeWord("HELLO")).toBe("hello");
    expect(normalizeWord("HeLLo")).toBe("hello");
  });

  it("should remove special characters", () => {
    expect(normalizeWord("hello!")).toBe("hello");
    expect(normalizeWord("hello?")).toBe("hello");
    expect(normalizeWord("hello.")).toBe("hello");
  });

  it("should preserve hyphens and apostrophes", () => {
    expect(normalizeWord("don't")).toBe("don't");
    expect(normalizeWord("self-aware")).toBe("self-aware");
  });

  it("should normalize multiple spaces", () => {
    expect(normalizeWord("hello   world")).toBe("hello world");
  });

  it("should handle empty string", () => {
    expect(normalizeWord("")).toBe("");
  });

  it("should handle unicode letters", () => {
    expect(normalizeWord("café")).toBe("café");
    expect(normalizeWord("日本語")).toBe("日本語");
  });
});

describe("isValidLookupWord", () => {
  it("should return true for valid words", () => {
    expect(isValidLookupWord("hello")).toBe(true);
    expect(isValidLookupWord("test")).toBe(true);
    expect(isValidLookupWord("word")).toBe(true);
  });

  it("should return false for words too short", () => {
    expect(isValidLookupWord("a")).toBe(false);
    expect(isValidLookupWord("")).toBe(false);
  });

  it("should return false for words too long", () => {
    const longWord = "a".repeat(101);
    expect(isValidLookupWord(longWord)).toBe(false);
  });

  it("should return false for numbers only", () => {
    expect(isValidLookupWord("123")).toBe(false);
    expect(isValidLookupWord("42")).toBe(false);
  });

  it("should return true for words with numbers", () => {
    expect(isValidLookupWord("test123")).toBe(true);
    expect(isValidLookupWord("h2o")).toBe(true);
  });

  it("should return true for phrases", () => {
    expect(isValidLookupWord("hello world")).toBe(true);
    expect(isValidLookupWord("artificial intelligence")).toBe(true);
  });
});

describe("extractFirstWord", () => {
  it("should extract first word from phrase", () => {
    expect(extractFirstWord("hello world")).toBe("hello");
    expect(extractFirstWord("artificial intelligence")).toBe("artificial");
  });

  it("should return single word as is", () => {
    expect(extractFirstWord("hello")).toBe("hello");
  });

  it("should handle empty string", () => {
    expect(extractFirstWord("")).toBe("");
  });

  it("should normalize the extracted word", () => {
    expect(extractFirstWord("  HELLO  world")).toBe("hello");
  });
});

describe("isPhrase", () => {
  it("should return true for phrases", () => {
    expect(isPhrase("hello world")).toBe(true);
    expect(isPhrase("artificial intelligence")).toBe(true);
  });

  it("should return false for single words", () => {
    expect(isPhrase("hello")).toBe(false);
    expect(isPhrase("test")).toBe(false);
  });

  it("should handle empty string", () => {
    expect(isPhrase("")).toBe(false);
  });
});

// =============================================================================
// CACHE UTILITIES TESTS
// =============================================================================

describe("createCacheEntry", () => {
  it("should create cache entry with default TTL", () => {
    const data = { test: "data" };
    const entry = createCacheEntry(data);
    expect(entry.data).toEqual(data);
    expect(entry.ttl).toBe(CACHE_TTL);
    expect(entry.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it("should create cache entry with custom TTL", () => {
    const data = { test: "data" };
    const customTTL = 5000;
    const entry = createCacheEntry(data, customTTL);
    expect(entry.ttl).toBe(customTTL);
  });
});

describe("isCacheValid", () => {
  it("should return false for null entry", () => {
    expect(isCacheValid(null)).toBe(false);
  });

  it("should return true for fresh entry", () => {
    const entry: LookupCacheEntry<string> = {
      data: "test",
      timestamp: Date.now(),
      ttl: CACHE_TTL,
    };
    expect(isCacheValid(entry)).toBe(true);
  });

  it("should return false for expired entry", () => {
    const entry: LookupCacheEntry<string> = {
      data: "test",
      timestamp: Date.now() - CACHE_TTL - 1000,
      ttl: CACHE_TTL,
    };
    expect(isCacheValid(entry)).toBe(false);
  });
});

describe("Cache localStorage operations", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should get empty cache when nothing stored", () => {
    const cache = getCache<string>("test_cache");
    expect(cache).toEqual({});
  });

  it("should set and get cache", () => {
    const cache = {
      test: createCacheEntry("data"),
    };
    setCache("test_cache", cache);
    const retrieved = getCache<string>("test_cache");
    expect(retrieved).toHaveProperty("test");
    expect(retrieved["test"]?.data).toBe("data");
  });

  it("should filter expired entries on get", () => {
    const cache = {
      valid: createCacheEntry("valid"),
      expired: {
        data: "expired",
        timestamp: Date.now() - CACHE_TTL - 1000,
        ttl: CACHE_TTL,
      },
    };
    localStorage.setItem("test_cache", JSON.stringify(cache));
    const retrieved = getCache<string>("test_cache");
    expect(retrieved).toHaveProperty("valid");
    expect(retrieved).not.toHaveProperty("expired");
  });

  it("should handle invalid JSON gracefully", () => {
    localStorage.setItem("test_cache", "invalid json");
    const cache = getCache<string>("test_cache");
    expect(cache).toEqual({});
  });
});

describe("addToCache and getFromCache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should add and retrieve from cache", () => {
    addToCache("test_cache", "key1", "value1");
    const result = getFromCache<string>("test_cache", "key1");
    expect(result).toBe("value1");
  });

  it("should return null for non-existent key", () => {
    const result = getFromCache<string>("test_cache", "nonexistent");
    expect(result).toBeNull();
  });
});

describe("clearCache and getCacheSize", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should clear cache", () => {
    addToCache("test_cache", "key1", "value1");
    clearCache("test_cache");
    const result = getFromCache<string>("test_cache", "key1");
    expect(result).toBeNull();
  });

  it("should get cache size", () => {
    addToCache("test_cache", "key1", "value1");
    addToCache("test_cache", "key2", "value2");
    expect(getCacheSize("test_cache")).toBe(2);
  });

  it("should return 0 for empty cache", () => {
    expect(getCacheSize("empty_cache")).toBe(0);
  });
});

// =============================================================================
// DICTIONARY UTILITIES TESTS
// =============================================================================

describe("createDictionaryError", () => {
  it("should create error result for not found", () => {
    const result = createDictionaryError("test", "Not found", "not_found");
    expect(result.success).toBe(false);
    expect(result.word).toBe("test");
    expect(result.error).toBe("Not found");
    expect(result.errorType).toBe("not_found");
  });

  it("should create error result for network error", () => {
    const result = createDictionaryError(
      "test",
      "Network failed",
      "network_error"
    );
    expect(result.errorType).toBe("network_error");
  });

  it("should create error result for rate limited", () => {
    const result = createDictionaryError(
      "test",
      "Rate limited",
      "rate_limited"
    );
    expect(result.errorType).toBe("rate_limited");
  });
});

describe("parseDictionaryResponse", () => {
  it("should parse valid response", () => {
    const mockResponse = [
      {
        word: "test",
        phonetics: [{ text: "/test/", audio: "https://example.com/audio.mp3" }],
        meanings: [
          {
            partOfSpeech: "noun",
            definitions: [
              { definition: "A procedure for testing", example: "Take a test" },
            ],
            synonyms: ["exam"],
          },
        ],
        origin: "From Latin testum",
      },
    ];

    const result = parseDictionaryResponse("test", mockResponse);
    expect(result.success).toBe(true);
    expect(result.entry).toBeDefined();
    expect(result.entry!.word).toBe("test");
    expect(result.entry!.phonetics).toHaveLength(1);
    expect(result.entry!.meanings).toHaveLength(1);
  });

  it("should return error for empty array", () => {
    const result = parseDictionaryResponse("test", []);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe("not_found");
  });

  it("should return error for invalid format", () => {
    const result = parseDictionaryResponse("test", [null]);
    expect(result.success).toBe(false);
  });
});

describe("parseDictionaryPhonetics", () => {
  it("should parse valid phonetics", () => {
    const phonetics = [
      { text: "/test/", audio: "https://example.com/audio.mp3" },
      { text: "/tɛst/" },
    ];
    const result = parseDictionaryPhonetics(phonetics);
    expect(result).toHaveLength(2);
    expect(result[0]?.text).toBe("/test/");
    expect(result[0]?.audio).toBe("https://example.com/audio.mp3");
  });

  it("should filter empty phonetics", () => {
    const phonetics = [{ text: "" }, { text: "/test/" }];
    const result = parseDictionaryPhonetics(phonetics);
    expect(result).toHaveLength(1);
  });

  it("should return empty array for non-array", () => {
    const result = parseDictionaryPhonetics(null);
    expect(result).toEqual([]);
  });
});

describe("parseDictionaryMeanings", () => {
  it("should parse valid meanings", () => {
    const meanings = [
      {
        partOfSpeech: "noun",
        definitions: [{ definition: "A test" }],
      },
    ];
    const result = parseDictionaryMeanings(meanings);
    expect(result).toHaveLength(1);
    expect(result[0]?.partOfSpeech).toBe("noun");
  });

  it("should filter meanings without definitions", () => {
    const meanings = [
      { partOfSpeech: "noun", definitions: [] },
      { partOfSpeech: "verb", definitions: [{ definition: "To test" }] },
    ];
    const result = parseDictionaryMeanings(meanings);
    expect(result).toHaveLength(1);
    expect(result[0]?.partOfSpeech).toBe("verb");
  });

  it("should return empty array for non-array", () => {
    const result = parseDictionaryMeanings(null);
    expect(result).toEqual([]);
  });
});

describe("parseDictionaryDefinitions", () => {
  it("should parse valid definitions", () => {
    const definitions = [
      { definition: "First definition", example: "Example 1" },
      { definition: "Second definition" },
    ];
    const result = parseDictionaryDefinitions(definitions);
    expect(result).toHaveLength(2);
    expect(result[0]?.example).toBe("Example 1");
    expect(result[1]?.example).toBeUndefined();
  });

  it("should filter empty definitions", () => {
    const definitions = [{ definition: "" }, { definition: "Valid" }];
    const result = parseDictionaryDefinitions(definitions);
    expect(result).toHaveLength(1);
  });

  it("should return empty array for non-array", () => {
    const result = parseDictionaryDefinitions(null);
    expect(result).toEqual([]);
  });
});

describe("getPhoneticText", () => {
  it("should get first phonetic text", () => {
    const entry: DictionaryEntry = {
      word: "test",
      phonetics: [{ text: "/test/" }, { text: "/tɛst/" }],
      meanings: [],
    };
    expect(getPhoneticText(entry)).toBe("/test/");
  });

  it("should skip empty phonetic text", () => {
    const entry: DictionaryEntry = {
      word: "test",
      phonetics: [{ audio: "audio.mp3" }, { text: "/test/" }],
      meanings: [],
    };
    expect(getPhoneticText(entry)).toBe("/test/");
  });

  it("should return null when no phonetics", () => {
    const entry: DictionaryEntry = {
      word: "test",
      phonetics: [],
      meanings: [],
    };
    expect(getPhoneticText(entry)).toBeNull();
  });
});

describe("getPhoneticAudio", () => {
  it("should get first phonetic audio", () => {
    const entry: DictionaryEntry = {
      word: "test",
      phonetics: [{ audio: "https://example.com/audio.mp3" }],
      meanings: [],
    };
    expect(getPhoneticAudio(entry)).toBe("https://example.com/audio.mp3");
  });

  it("should return null when no audio", () => {
    const entry: DictionaryEntry = {
      word: "test",
      phonetics: [{ text: "/test/" }],
      meanings: [],
    };
    expect(getPhoneticAudio(entry)).toBeNull();
  });
});

describe("getAllSynonyms", () => {
  it("should collect all synonyms", () => {
    const entry: DictionaryEntry = {
      word: "test",
      meanings: [
        {
          partOfSpeech: "noun",
          definitions: [{ definition: "Test", synonyms: ["exam", "quiz"] }],
          synonyms: ["trial"],
        },
      ],
    };
    const synonyms = getAllSynonyms(entry);
    expect(synonyms).toContain("exam");
    expect(synonyms).toContain("quiz");
    expect(synonyms).toContain("trial");
  });

  it("should return empty array when no synonyms", () => {
    const entry: DictionaryEntry = {
      word: "test",
      meanings: [
        { partOfSpeech: "noun", definitions: [{ definition: "Test" }] },
      ],
    };
    expect(getAllSynonyms(entry)).toEqual([]);
  });
});

describe("getAllAntonyms", () => {
  it("should collect all antonyms", () => {
    const entry: DictionaryEntry = {
      word: "good",
      meanings: [
        {
          partOfSpeech: "adjective",
          definitions: [{ definition: "Good", antonyms: ["bad"] }],
          antonyms: ["evil"],
        },
      ],
    };
    const antonyms = getAllAntonyms(entry);
    expect(antonyms).toContain("bad");
    expect(antonyms).toContain("evil");
  });

  it("should return empty array when no antonyms", () => {
    const entry: DictionaryEntry = {
      word: "test",
      meanings: [
        { partOfSpeech: "noun", definitions: [{ definition: "Test" }] },
      ],
    };
    expect(getAllAntonyms(entry)).toEqual([]);
  });
});

describe("countDefinitions", () => {
  it("should count all definitions", () => {
    const entry: DictionaryEntry = {
      word: "test",
      meanings: [
        {
          partOfSpeech: "noun",
          definitions: [{ definition: "Def 1" }, { definition: "Def 2" }],
        },
        {
          partOfSpeech: "verb",
          definitions: [{ definition: "Def 3" }],
        },
      ],
    };
    expect(countDefinitions(entry)).toBe(3);
  });

  it("should return 0 for no meanings", () => {
    const entry: DictionaryEntry = {
      word: "test",
      meanings: [],
    };
    expect(countDefinitions(entry)).toBe(0);
  });
});

// =============================================================================
// WIKIPEDIA UTILITIES TESTS
// =============================================================================

describe("createWikipediaError", () => {
  it("should create error result for not found", () => {
    const result = createWikipediaError("test", "Not found", "not_found");
    expect(result.success).toBe(false);
    expect(result.query).toBe("test");
    expect(result.errorType).toBe("not_found");
  });

  it("should create error result for disambiguation", () => {
    const result = createWikipediaError(
      "test",
      "Disambiguation",
      "disambiguation"
    );
    expect(result.errorType).toBe("disambiguation");
  });
});

describe("buildWikipediaUrl", () => {
  it("should build URL for English Wikipedia", () => {
    const url = buildWikipediaUrl("Albert Einstein", "en");
    expect(url).toBe(
      "https://en.wikipedia.org/api/rest_v1/page/summary/Albert_Einstein"
    );
  });

  it("should build URL for Spanish Wikipedia", () => {
    const url = buildWikipediaUrl("Albert Einstein", "es");
    expect(url).toBe(
      "https://es.wikipedia.org/api/rest_v1/page/summary/Albert_Einstein"
    );
  });

  it("should encode special characters", () => {
    const url = buildWikipediaUrl("C++", "en");
    expect(url).toContain("C%2B%2B");
  });

  it("should use English as default language", () => {
    const url = buildWikipediaUrl("Test");
    expect(url).toContain("en.wikipedia.org");
  });
});

describe("parseWikipediaResponse", () => {
  it("should parse valid response", () => {
    const mockResponse = {
      title: "Albert Einstein",
      displaytitle: "Albert Einstein",
      extract: "Albert Einstein was a German-born theoretical physicist.",
      content_urls: {
        desktop: { page: "https://en.wikipedia.org/wiki/Albert_Einstein" },
      },
      description: "German-born theoretical physicist (1879–1955)",
    };

    const result = parseWikipediaResponse("Albert Einstein", mockResponse);
    expect(result.success).toBe(true);
    expect(result.summary).toBeDefined();
    expect(result.summary!.title).toBe("Albert Einstein");
    expect(result.summary!.extract).toContain("theoretical physicist");
  });

  it("should handle disambiguation page", () => {
    const mockResponse = { type: "disambiguation" };
    const result = parseWikipediaResponse("test", mockResponse);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe("disambiguation");
  });

  it("should handle not found response", () => {
    const mockResponse = {
      type: "https://mediawiki.org/wiki/HyperSwitch/errors/not_found",
    };
    const result = parseWikipediaResponse("nonexistent", mockResponse);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe("not_found");
  });

  it("should parse thumbnail", () => {
    const mockResponse = {
      title: "Test",
      extract: "Test article",
      thumbnail: {
        source: "https://example.com/thumb.jpg",
        width: 100,
        height: 100,
      },
    };
    const result = parseWikipediaResponse("test", mockResponse);
    expect(result.summary!.thumbnail).toBeDefined();
    expect(result.summary!.thumbnail!.source).toBe(
      "https://example.com/thumb.jpg"
    );
  });
});

describe("truncateExtract", () => {
  it("should not truncate short text", () => {
    const text = "Short text";
    expect(truncateExtract(text, 500)).toBe(text);
  });

  it("should truncate long text at sentence boundary", () => {
    const text =
      "First sentence. Second sentence. Third sentence that is very long and exceeds the limit.";
    const result = truncateExtract(text, 50);
    expect(result).toBe("First sentence. Second sentence.");
  });

  it("should truncate at word boundary when no sentence break", () => {
    const text =
      "A very long sentence without any periods that needs truncation";
    const result = truncateExtract(text, 30);
    expect(result).toContain("...");
    expect(result.length).toBeLessThanOrEqual(33); // 30 + "..."
  });
});

// =============================================================================
// SETTINGS UTILITIES TESTS
// =============================================================================

describe("loadLookupSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return default settings when nothing stored", () => {
    const settings = loadLookupSettings();
    expect(settings).toEqual(DEFAULT_LOOKUP_SETTINGS);
  });

  it("should load stored settings", () => {
    const customSettings: LookupSettings = {
      ...DEFAULT_LOOKUP_SETTINGS,
      autoLookup: true,
      preferredSource: "wikipedia",
    };
    localStorage.setItem(LOOKUP_SETTINGS_KEY, JSON.stringify(customSettings));
    const settings = loadLookupSettings();
    expect(settings.autoLookup).toBe(true);
    expect(settings.preferredSource).toBe("wikipedia");
  });

  it("should merge partial settings with defaults", () => {
    localStorage.setItem(
      LOOKUP_SETTINGS_KEY,
      JSON.stringify({ autoLookup: true })
    );
    const settings = loadLookupSettings();
    expect(settings.autoLookup).toBe(true);
    expect(settings.showPhonetics).toBe(true); // Default
  });

  it("should handle invalid JSON", () => {
    localStorage.setItem(LOOKUP_SETTINGS_KEY, "invalid json");
    const settings = loadLookupSettings();
    expect(settings).toEqual(DEFAULT_LOOKUP_SETTINGS);
  });
});

describe("saveLookupSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should save settings to localStorage", () => {
    const settings: LookupSettings = {
      ...DEFAULT_LOOKUP_SETTINGS,
      autoLookup: true,
    };
    saveLookupSettings(settings);
    const stored = JSON.parse(localStorage.getItem(LOOKUP_SETTINGS_KEY)!);
    expect(stored.autoLookup).toBe(true);
  });
});

describe("updateLookupSetting", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should update a single setting", () => {
    const result = updateLookupSetting("autoLookup", true);
    expect(result.autoLookup).toBe(true);
    const stored = loadLookupSettings();
    expect(stored.autoLookup).toBe(true);
  });

  it("should preserve other settings", () => {
    saveLookupSettings({ ...DEFAULT_LOOKUP_SETTINGS, showPhonetics: false });
    const result = updateLookupSetting("autoLookup", true);
    expect(result.showPhonetics).toBe(false);
    expect(result.autoLookup).toBe(true);
  });
});

// =============================================================================
// HELPER UTILITIES TESTS
// =============================================================================

describe("getDictionaryErrorMessage", () => {
  it("should return correct message for not_found", () => {
    expect(getDictionaryErrorMessage("not_found")).toBe(
      "Word not found in dictionary"
    );
  });

  it("should return correct message for network_error", () => {
    expect(getDictionaryErrorMessage("network_error")).toContain(
      "Unable to connect"
    );
  });

  it("should return correct message for rate_limited", () => {
    expect(getDictionaryErrorMessage("rate_limited")).toContain("Too many");
  });

  it("should return correct message for invalid_word", () => {
    expect(getDictionaryErrorMessage("invalid_word")).toContain("Invalid word");
  });
});

describe("getWikipediaErrorMessage", () => {
  it("should return correct message for not_found", () => {
    expect(getWikipediaErrorMessage("not_found")).toContain("not found");
  });

  it("should return correct message for disambiguation", () => {
    expect(getWikipediaErrorMessage("disambiguation")).toContain(
      "Multiple articles"
    );
  });

  it("should return correct message for network_error", () => {
    expect(getWikipediaErrorMessage("network_error")).toContain(
      "Unable to connect"
    );
  });

  it("should return correct message for rate_limited", () => {
    expect(getWikipediaErrorMessage("rate_limited")).toContain("Too many");
  });
});

describe("getPartOfSpeechAbbrev", () => {
  it("should return correct abbreviations", () => {
    expect(getPartOfSpeechAbbrev("noun")).toBe("n.");
    expect(getPartOfSpeechAbbrev("verb")).toBe("v.");
    expect(getPartOfSpeechAbbrev("adjective")).toBe("adj.");
    expect(getPartOfSpeechAbbrev("adverb")).toBe("adv.");
    expect(getPartOfSpeechAbbrev("pronoun")).toBe("pron.");
    expect(getPartOfSpeechAbbrev("preposition")).toBe("prep.");
    expect(getPartOfSpeechAbbrev("conjunction")).toBe("conj.");
    expect(getPartOfSpeechAbbrev("interjection")).toBe("interj.");
  });

  it("should return original for unknown parts of speech", () => {
    expect(getPartOfSpeechAbbrev("unknown")).toBe("unknown");
  });

  it("should be case-insensitive", () => {
    expect(getPartOfSpeechAbbrev("NOUN")).toBe("n.");
    expect(getPartOfSpeechAbbrev("Verb")).toBe("v.");
  });
});

describe("formatPartOfSpeech", () => {
  it("should capitalize first letter", () => {
    expect(formatPartOfSpeech("noun")).toBe("Noun");
    expect(formatPartOfSpeech("verb")).toBe("Verb");
    expect(formatPartOfSpeech("adjective")).toBe("Adjective");
  });

  it("should lowercase rest of the word", () => {
    expect(formatPartOfSpeech("NOUN")).toBe("Noun");
    expect(formatPartOfSpeech("VERB")).toBe("Verb");
  });
});

describe("getWikipediaUrlForLanguage", () => {
  it("should build correct URL for English", () => {
    const url = getWikipediaUrlForLanguage("Albert Einstein", "en");
    expect(url).toBe("https://en.wikipedia.org/wiki/Albert_Einstein");
  });

  it("should build correct URL for Spanish", () => {
    const url = getWikipediaUrlForLanguage("Albert Einstein", "es");
    expect(url).toBe("https://es.wikipedia.org/wiki/Albert_Einstein");
  });

  it("should encode special characters", () => {
    const url = getWikipediaUrlForLanguage("C++ programming", "en");
    expect(url).toContain("C%2B%2B");
  });

  it("should use English as default", () => {
    const url = getWikipediaUrlForLanguage("Test");
    expect(url).toContain("en.wikipedia.org");
  });
});
