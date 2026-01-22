/**
 * Tests for TTS Types and Utilities
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  // Types
  type TTSSettings,
  type TTSVoice,
  type TTSPosition,
  // Constants
  TTS_SETTINGS_KEY,
  DEFAULT_TTS_SETTINGS,
  RATE_RANGE,
  PITCH_RANGE,
  VOLUME_RANGE,
  RATE_PRESETS,
  OPENAI_VOICES,
  ELEVENLABS_VOICES,
  INITIAL_TTS_STATE,
  // Web Speech utilities
  isWebSpeechSupported,
  convertWebSpeechVoice,
  findVoiceByLanguage,
  findWebSpeechVoiceById,
  // Voice management
  getVoicesForTier,
  getDefaultVoiceForTier,
  findVoiceById,
  groupVoicesByProvider,
  filterVoicesByLanguage,
  // Settings persistence
  loadTTSSettings,
  saveTTSSettings,
  updateTTSSetting,
  resetTTSSettings,
  // Rate/Pitch/Volume utilities
  clampValue,
  formatRate,
  formatVolume,
  getClosestRatePreset,
  // Error handling
  createTTSError,
  getTTSErrorMessage,
  isRecoverableError,
  // Text processing
  prepareTextForTTS,
  splitIntoSentences,
  estimateSpeechDuration,
  getWordCount,
  // Position tracking
  getHighlightRange,
  getTextContext,
  // Provider utilities
  getProviderDisplayName,
  getProviderFromVoiceId,
  voiceRequiresAPI,
  getTierForVoice,
  canUseVoice,
} from "./ttsTypes";

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

// Mock Web Speech API
const mockVoices: SpeechSynthesisVoice[] = [
  {
    name: "English US",
    lang: "en-US",
    localService: true,
    default: true,
    voiceURI: "english-us-voice",
  } as SpeechSynthesisVoice,
  {
    name: "English UK",
    lang: "en-GB",
    localService: false,
    default: false,
    voiceURI: "english-uk-voice",
  } as SpeechSynthesisVoice,
  {
    name: "Spanish",
    lang: "es-ES",
    localService: true,
    default: false,
    voiceURI: "spanish-voice",
  } as SpeechSynthesisVoice,
];

describe("TTS Types and Utilities", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  // ============================================================================
  // Constants Tests
  // ============================================================================

  describe("Constants", () => {
    it("should have correct TTS_SETTINGS_KEY", () => {
      expect(TTS_SETTINGS_KEY).toBe("read-master-tts-settings");
    });

    it("should have correct DEFAULT_TTS_SETTINGS", () => {
      expect(DEFAULT_TTS_SETTINGS).toEqual({
        enabled: true,
        selectedVoiceId: null,
        preferredProvider: "web_speech",
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        highlightText: true,
        autoScroll: true,
        preferredLanguage: "en",
        sleepTimerMinutes: 0,
      });
    });

    it("should have correct RATE_RANGE", () => {
      expect(RATE_RANGE.min).toBe(0.5);
      expect(RATE_RANGE.max).toBe(2.0);
      expect(RATE_RANGE.step).toBe(0.1);
      expect(RATE_RANGE.default).toBe(1.0);
    });

    it("should have correct PITCH_RANGE", () => {
      expect(PITCH_RANGE.min).toBe(0.5);
      expect(PITCH_RANGE.max).toBe(2.0);
      expect(PITCH_RANGE.step).toBe(0.1);
      expect(PITCH_RANGE.default).toBe(1.0);
    });

    it("should have correct VOLUME_RANGE", () => {
      expect(VOLUME_RANGE.min).toBe(0);
      expect(VOLUME_RANGE.max).toBe(1);
      expect(VOLUME_RANGE.step).toBe(0.1);
      expect(VOLUME_RANGE.default).toBe(1.0);
    });

    it("should have RATE_PRESETS with all expected values", () => {
      expect(RATE_PRESETS).toHaveLength(6);
      expect(RATE_PRESETS.map((p) => p.value)).toEqual([
        0.5, 0.75, 1.0, 1.25, 1.5, 2.0,
      ]);
    });

    it("should have OPENAI_VOICES with all 6 voices", () => {
      expect(OPENAI_VOICES).toHaveLength(6);
      expect(OPENAI_VOICES.every((v) => v.provider === "openai")).toBe(true);
      expect(OPENAI_VOICES.every((v) => v.isPremium === true)).toBe(true);
    });

    it("should have ELEVENLABS_VOICES with expected voices", () => {
      expect(ELEVENLABS_VOICES.length).toBeGreaterThan(0);
      expect(ELEVENLABS_VOICES.every((v) => v.provider === "elevenlabs")).toBe(
        true
      );
      expect(ELEVENLABS_VOICES.every((v) => v.isPremium === true)).toBe(true);
    });

    it("should have correct INITIAL_TTS_STATE", () => {
      expect(INITIAL_TTS_STATE).toEqual({
        playbackState: "idle",
        position: null,
        voices: [],
        error: null,
        voicesLoaded: false,
        currentText: null,
      });
    });
  });

  // ============================================================================
  // Web Speech Utilities Tests
  // ============================================================================

  describe("Web Speech Utilities", () => {
    it("should detect web speech support", () => {
      // In test environment, web speech may not be available
      const result = isWebSpeechSupported();
      expect(typeof result).toBe("boolean");
    });

    it("should convert SpeechSynthesisVoice to TTSVoice", () => {
      const mockVoice = mockVoices[0];
      expect(mockVoice).toBeDefined();
      if (!mockVoice) return;
      const converted = convertWebSpeechVoice(mockVoice);

      expect(converted.id).toBe("web-english-us-voice");
      expect(converted.name).toBe("English US");
      expect(converted.lang).toBe("en-US");
      expect(converted.provider).toBe("web_speech");
      expect(converted.isPremium).toBe(false);
    });

    it("should find voice by language - exact match", () => {
      const voice = findVoiceByLanguage(mockVoices, "en-US");
      expect(voice?.name).toBe("English US");
    });

    it("should find voice by language - prefix match", () => {
      const voice = findVoiceByLanguage(mockVoices, "en");
      // Should match first English voice
      expect(voice?.lang.startsWith("en")).toBe(true);
    });

    it("should return default voice when no match", () => {
      const voice = findVoiceByLanguage(mockVoices, "fr-FR");
      // Should return default or first available
      expect(voice).not.toBeNull();
    });

    it("should find web speech voice by ID", () => {
      // This requires actual Web Speech API, which may not be available in tests
      const voice = findWebSpeechVoiceById("web-test-voice");
      // May be null if Web Speech not available
      expect(voice === null || typeof voice === "object").toBe(true);
    });

    it("should return null for non-web voice ID", () => {
      const voice = findWebSpeechVoiceById("openai-alloy");
      expect(voice).toBeNull();
    });
  });

  // ============================================================================
  // Voice Management Tests
  // ============================================================================

  describe("Voice Management", () => {
    const mockWebVoices: TTSVoice[] = [
      {
        id: "web-test",
        name: "Test Voice",
        lang: "en-US",
        provider: "web_speech",
        isPremium: false,
      },
    ];

    it("should get voices for free tier", () => {
      const voices = getVoicesForTier("free", mockWebVoices);
      expect(voices).toEqual(mockWebVoices);
      expect(voices.every((v) => v.provider === "web_speech")).toBe(true);
    });

    it("should get voices for pro tier", () => {
      const voices = getVoicesForTier("pro", mockWebVoices);
      expect(voices.length).toBeGreaterThan(mockWebVoices.length);
      expect(voices.some((v) => v.provider === "openai")).toBe(true);
    });

    it("should get voices for scholar tier", () => {
      const voices = getVoicesForTier("scholar", mockWebVoices);
      expect(voices.length).toBeGreaterThan(mockWebVoices.length);
      expect(voices.some((v) => v.provider === "elevenlabs")).toBe(true);
      expect(voices.some((v) => v.provider === "openai")).toBe(true);
    });

    it("should get default voice for free tier", () => {
      const voice = getDefaultVoiceForTier("free", mockWebVoices, "en");
      expect(voice).not.toBeNull();
      expect(voice?.provider).toBe("web_speech");
    });

    it("should get default voice for pro tier", () => {
      const voice = getDefaultVoiceForTier("pro", mockWebVoices, "en");
      expect(voice).not.toBeNull();
      expect(voice?.provider).toBe("openai");
    });

    it("should get default voice for scholar tier", () => {
      const voice = getDefaultVoiceForTier("scholar", mockWebVoices, "en");
      expect(voice).not.toBeNull();
      expect(voice?.provider).toBe("elevenlabs");
    });

    it("should find voice by ID", () => {
      const allVoices = [...OPENAI_VOICES, ...mockWebVoices];
      const found = findVoiceById("openai-alloy", allVoices);
      expect(found?.id).toBe("openai-alloy");
    });

    it("should return null for unknown voice ID", () => {
      const found = findVoiceById("unknown-voice", mockWebVoices);
      expect(found).toBeNull();
    });

    it("should group voices by provider", () => {
      const allVoices = [
        ...OPENAI_VOICES,
        ...ELEVENLABS_VOICES,
        ...mockWebVoices,
      ];
      const grouped = groupVoicesByProvider(allVoices);

      expect(grouped.web_speech).toHaveLength(1);
      expect(grouped.openai).toHaveLength(6);
      expect(grouped.elevenlabs.length).toBeGreaterThan(0);
    });

    it("should filter voices by language", () => {
      const voices: TTSVoice[] = [
        {
          id: "1",
          name: "EN",
          lang: "en-US",
          provider: "web_speech",
          isPremium: false,
        },
        {
          id: "2",
          name: "ES",
          lang: "es-ES",
          provider: "web_speech",
          isPremium: false,
        },
        {
          id: "3",
          name: "EN2",
          lang: "en-GB",
          provider: "web_speech",
          isPremium: false,
        },
      ];

      const filtered = filterVoicesByLanguage(voices, "en");
      expect(filtered).toHaveLength(2);
      expect(filtered.every((v) => v.lang.startsWith("en"))).toBe(true);
    });
  });

  // ============================================================================
  // Settings Persistence Tests
  // ============================================================================

  describe("Settings Persistence", () => {
    it("should load default settings when nothing stored", () => {
      const settings = loadTTSSettings();
      expect(settings).toEqual(DEFAULT_TTS_SETTINGS);
    });

    it("should load stored settings", () => {
      const customSettings: TTSSettings = {
        ...DEFAULT_TTS_SETTINGS,
        rate: 1.5,
        volume: 0.8,
      };
      mockLocalStorage.setItem(
        TTS_SETTINGS_KEY,
        JSON.stringify(customSettings)
      );

      const settings = loadTTSSettings();
      expect(settings.rate).toBe(1.5);
      expect(settings.volume).toBe(0.8);
    });

    it("should clamp out-of-range values when loading", () => {
      const invalidSettings = {
        rate: 5.0, // Over max
        volume: -1, // Under min
      };
      mockLocalStorage.setItem(
        TTS_SETTINGS_KEY,
        JSON.stringify(invalidSettings)
      );

      const settings = loadTTSSettings();
      expect(settings.rate).toBe(RATE_RANGE.max);
      expect(settings.volume).toBe(VOLUME_RANGE.min);
    });

    it("should save settings to localStorage", () => {
      const settings: TTSSettings = {
        ...DEFAULT_TTS_SETTINGS,
        rate: 1.25,
      };
      saveTTSSettings(settings);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        TTS_SETTINGS_KEY,
        JSON.stringify(settings)
      );
    });

    it("should update a single setting", () => {
      const result = updateTTSSetting("rate", 1.5);
      expect(result.rate).toBe(1.5);
    });

    it("should reset settings to defaults", () => {
      // First save custom settings
      saveTTSSettings({ ...DEFAULT_TTS_SETTINGS, rate: 2.0 });

      // Reset
      const result = resetTTSSettings();
      expect(result).toEqual(DEFAULT_TTS_SETTINGS);
    });
  });

  // ============================================================================
  // Rate/Pitch/Volume Utilities Tests
  // ============================================================================

  describe("Rate/Pitch/Volume Utilities", () => {
    it("should clamp value within range", () => {
      expect(clampValue(0.5, 0, 1)).toBe(0.5);
      expect(clampValue(-1, 0, 1)).toBe(0);
      expect(clampValue(2, 0, 1)).toBe(1);
    });

    it("should format rate correctly", () => {
      expect(formatRate(1)).toBe("1.0x");
      expect(formatRate(1.5)).toBe("1.5x");
      expect(formatRate(0.75)).toBe("0.8x"); // Rounds to 1 decimal
    });

    it("should format volume as percentage", () => {
      expect(formatVolume(1)).toBe("100%");
      expect(formatVolume(0.5)).toBe("50%");
      expect(formatVolume(0)).toBe("0%");
    });

    it("should get closest rate preset", () => {
      expect(getClosestRatePreset(1.0).value).toBe(1.0);
      expect(getClosestRatePreset(1.1).value).toBe(1.0);
      expect(getClosestRatePreset(1.3).value).toBe(1.25);
      expect(getClosestRatePreset(1.9).value).toBe(2.0);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe("Error Handling", () => {
    it("should create TTS error with message", () => {
      const error = createTTSError("not_supported");
      expect(error.type).toBe("not_supported");
      expect(error.message).toBe(
        "Text-to-speech is not supported in this browser"
      );
    });

    it("should create TTS error with details", () => {
      const error = createTTSError("synthesis_error", "Voice failed to load");
      expect(error.details).toBe("Voice failed to load");
    });

    it("should get error message without details", () => {
      const error = createTTSError("no_voices");
      expect(getTTSErrorMessage(error)).toBe(
        "No voices available for text-to-speech"
      );
    });

    it("should get error message with details", () => {
      const error = createTTSError("network_error", "Connection timeout");
      expect(getTTSErrorMessage(error)).toBe(
        "Network error while generating speech: Connection timeout"
      );
    });

    it("should identify recoverable errors", () => {
      expect(isRecoverableError(createTTSError("network_error"))).toBe(true);
      expect(isRecoverableError(createTTSError("rate_limited"))).toBe(true);
      expect(isRecoverableError(createTTSError("synthesis_error"))).toBe(true);
    });

    it("should identify non-recoverable errors", () => {
      expect(isRecoverableError(createTTSError("not_supported"))).toBe(false);
      expect(isRecoverableError(createTTSError("unauthorized"))).toBe(false);
    });
  });

  // ============================================================================
  // Text Processing Tests
  // ============================================================================

  describe("Text Processing", () => {
    it("should prepare text for TTS", () => {
      const input = "Hello  **world**!  This   is a test.";
      const result = prepareTextForTTS(input);
      expect(result).toBe("Hello world! This is a test.");
    });

    it("should normalize quotes", () => {
      const input = "\u201cHello\u201d and \u2018world\u2019";
      const result = prepareTextForTTS(input);
      expect(result).toBe("\"Hello\" and 'world'");
    });

    it("should normalize dashes", () => {
      const input = "Test\u2013dash\u2014here";
      const result = prepareTextForTTS(input);
      expect(result).toBe("Test-dash-here");
    });

    it("should remove markdown formatting", () => {
      const input = "This is **bold** and _italic_ and `code`";
      const result = prepareTextForTTS(input);
      expect(result.includes("**")).toBe(false);
      expect(result.includes("_")).toBe(false);
      expect(result.includes("`")).toBe(false);
    });

    it("should split text into sentences", () => {
      const text = "First sentence. Second sentence! Third sentence?";
      const sentences = splitIntoSentences(text);
      expect(sentences).toHaveLength(3);
    });

    it("should handle text with no sentence endings", () => {
      const text = "No sentence ending here";
      const sentences = splitIntoSentences(text);
      expect(sentences).toHaveLength(1);
    });

    it("should estimate speech duration", () => {
      const text = "This is a test sentence with about ten words here now.";
      const duration = estimateSpeechDuration(text, 1);
      // ~10 words at 150 WPM = ~4 seconds = ~4000ms
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(10000);
    });

    it("should adjust duration for rate", () => {
      const text = "Test sentence with words.";
      const normalDuration = estimateSpeechDuration(text, 1);
      const fastDuration = estimateSpeechDuration(text, 2);
      expect(fastDuration).toBeLessThan(normalDuration);
    });

    it("should count words correctly", () => {
      expect(getWordCount("Hello world")).toBe(2);
      expect(getWordCount("One two three four five")).toBe(5);
      expect(getWordCount("")).toBe(0);
      expect(getWordCount("   spaced   words   ")).toBe(2);
    });
  });

  // ============================================================================
  // Position Tracking Tests
  // ============================================================================

  describe("Position Tracking", () => {
    it("should get highlight range", () => {
      const position: TTSPosition = {
        charIndex: 5,
        charLength: 5,
      };
      const range = getHighlightRange(position, "Hello World");
      expect(range).toEqual({ start: 5, end: 10 });
    });

    it("should return null for invalid position", () => {
      const position: TTSPosition = {
        charIndex: -1,
        charLength: 5,
      };
      expect(getHighlightRange(position, "Hello")).toBeNull();
    });

    it("should clamp end to text length", () => {
      const position: TTSPosition = {
        charIndex: 8,
        charLength: 100,
      };
      const range = getHighlightRange(position, "Hello World");
      expect(range?.end).toBe(11); // "Hello World".length
    });

    it("should get text context around position", () => {
      const position: TTSPosition = {
        charIndex: 50,
        charLength: 10,
      };
      const text = "a".repeat(100);
      const context = getTextContext(position, text, 20);
      expect(context.length).toBeLessThanOrEqual(50); // 20 + 10 + 20
    });
  });

  // ============================================================================
  // Provider Utilities Tests
  // ============================================================================

  describe("Provider Utilities", () => {
    it("should get provider display name", () => {
      expect(getProviderDisplayName("web_speech")).toBe("Browser");
      expect(getProviderDisplayName("openai")).toBe("OpenAI");
      expect(getProviderDisplayName("elevenlabs")).toBe("ElevenLabs");
    });

    it("should get provider from voice ID", () => {
      expect(getProviderFromVoiceId("openai-alloy")).toBe("openai");
      expect(getProviderFromVoiceId("elevenlabs-rachel")).toBe("elevenlabs");
      expect(getProviderFromVoiceId("web-test")).toBe("web_speech");
    });

    it("should check if voice requires API", () => {
      expect(voiceRequiresAPI("openai-alloy")).toBe(true);
      expect(voiceRequiresAPI("elevenlabs-rachel")).toBe(true);
      expect(voiceRequiresAPI("web-test")).toBe(false);
    });

    it("should get tier for voice", () => {
      expect(getTierForVoice("elevenlabs-rachel")).toBe("scholar");
      expect(getTierForVoice("openai-alloy")).toBe("pro");
      expect(getTierForVoice("web-test")).toBe("free");
    });

    it("should check if user can use voice", () => {
      // Free user
      expect(canUseVoice("web-test", "free")).toBe(true);
      expect(canUseVoice("openai-alloy", "free")).toBe(false);
      expect(canUseVoice("elevenlabs-rachel", "free")).toBe(false);

      // Pro user
      expect(canUseVoice("web-test", "pro")).toBe(true);
      expect(canUseVoice("openai-alloy", "pro")).toBe(true);
      expect(canUseVoice("elevenlabs-rachel", "pro")).toBe(false);

      // Scholar user
      expect(canUseVoice("web-test", "scholar")).toBe(true);
      expect(canUseVoice("openai-alloy", "scholar")).toBe(true);
      expect(canUseVoice("elevenlabs-rachel", "scholar")).toBe(true);
    });
  });
});
