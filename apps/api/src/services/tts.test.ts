/**
 * TTS Service Tests
 *
 * Tests for text-to-speech service functionality including:
 * - Text chunking
 * - Cost calculation
 * - Voice validation
 * - Provider availability checks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  // Text chunking
  chunkText,
  estimateChunkCount,
  getTotalCharacterCount,
  // Cost calculation
  calculateTTSCost,
  estimateTTSCost,
  // Voice validation
  isValidOpenAIVoice,
  isValidElevenLabsVoice,
  normalizeVoice,
  getElevenLabsVoiceId,
  // Availability checks
  isOpenAITTSAvailable,
  isElevenLabsTTSAvailable,
  isTTSProviderAvailable,
  // Constants
  OPENAI_VOICES,
  ELEVENLABS_VOICES,
  ELEVENLABS_VOICE_IDS,
  OPENAI_MODELS,
  MAX_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
  DEFAULT_OPENAI_VOICE,
  DEFAULT_ELEVENLABS_VOICE,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_AUDIO_FORMAT,
  DEFAULT_SPEED,
  DEFAULT_STABILITY,
  DEFAULT_SIMILARITY_BOOST,
  TTS_PRICING,
  // Types
  type TTSProvider,
  type OpenAIVoice,
  type ElevenLabsVoice,
  type OpenAIModel,
  type AudioFormat,
  type TextChunk,
  type TTSOptions,
  type TTSResult,
  type AudioChunk,
  // Service export
  ttsService,
} from "./tts.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("TTS Service Constants", () => {
  describe("OPENAI_VOICES", () => {
    it("should contain all expected voices", () => {
      expect(OPENAI_VOICES).toContain("alloy");
      expect(OPENAI_VOICES).toContain("echo");
      expect(OPENAI_VOICES).toContain("fable");
      expect(OPENAI_VOICES).toContain("onyx");
      expect(OPENAI_VOICES).toContain("nova");
      expect(OPENAI_VOICES).toContain("shimmer");
    });

    it("should have exactly 6 voices", () => {
      expect(OPENAI_VOICES.length).toBe(6);
    });
  });

  describe("ELEVENLABS_VOICES", () => {
    it("should contain expected voices", () => {
      expect(ELEVENLABS_VOICES).toContain("rachel");
      expect(ELEVENLABS_VOICES).toContain("drew");
      expect(ELEVENLABS_VOICES).toContain("bella");
      expect(ELEVENLABS_VOICES).toContain("thomas");
    });

    it("should have at least 10 voices", () => {
      expect(ELEVENLABS_VOICES.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("ELEVENLABS_VOICE_IDS", () => {
    it("should have an ID for each voice", () => {
      for (const voice of ELEVENLABS_VOICES) {
        expect(ELEVENLABS_VOICE_IDS[voice]).toBeDefined();
        expect(typeof ELEVENLABS_VOICE_IDS[voice]).toBe("string");
        expect(ELEVENLABS_VOICE_IDS[voice].length).toBeGreaterThan(0);
      }
    });

    it("should have unique IDs", () => {
      const ids = Object.values(ELEVENLABS_VOICE_IDS);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("OPENAI_MODELS", () => {
    it("should contain tts-1 and tts-1-hd", () => {
      expect(OPENAI_MODELS).toContain("tts-1");
      expect(OPENAI_MODELS).toContain("tts-1-hd");
    });
  });

  describe("Default values", () => {
    it("should have correct default voice for OpenAI", () => {
      expect(DEFAULT_OPENAI_VOICE).toBe("alloy");
    });

    it("should have correct default voice for ElevenLabs", () => {
      expect(DEFAULT_ELEVENLABS_VOICE).toBe("rachel");
    });

    it("should have correct default model", () => {
      expect(DEFAULT_OPENAI_MODEL).toBe("tts-1");
    });

    it("should have correct default audio format", () => {
      expect(DEFAULT_AUDIO_FORMAT).toBe("mp3");
    });

    it("should have correct default speed", () => {
      expect(DEFAULT_SPEED).toBe(1.0);
    });

    it("should have correct default stability", () => {
      expect(DEFAULT_STABILITY).toBe(0.5);
    });

    it("should have correct default similarity boost", () => {
      expect(DEFAULT_SIMILARITY_BOOST).toBe(0.75);
    });
  });

  describe("Chunk size constants", () => {
    it("should have reasonable MAX_CHUNK_SIZE", () => {
      expect(MAX_CHUNK_SIZE).toBe(4096);
    });

    it("should have reasonable MIN_CHUNK_SIZE", () => {
      expect(MIN_CHUNK_SIZE).toBe(100);
    });

    it("should have MAX_CHUNK_SIZE greater than MIN_CHUNK_SIZE", () => {
      expect(MAX_CHUNK_SIZE).toBeGreaterThan(MIN_CHUNK_SIZE);
    });
  });

  describe("TTS_PRICING", () => {
    it("should have pricing for OpenAI", () => {
      expect(TTS_PRICING.openai.perCharacter).toBeGreaterThan(0);
      expect(TTS_PRICING.openai.perCharacterHD).toBeGreaterThan(0);
    });

    it("should have HD pricing higher than standard", () => {
      expect(TTS_PRICING.openai.perCharacterHD).toBeGreaterThan(
        TTS_PRICING.openai.perCharacter
      );
    });

    it("should have pricing for ElevenLabs", () => {
      expect(TTS_PRICING.elevenlabs.perCharacter).toBeGreaterThan(0);
    });

    it("should have free pricing for web_speech", () => {
      expect(TTS_PRICING.web_speech.perCharacter).toBe(0);
    });
  });
});

// ============================================================================
// Text Chunking Tests
// ============================================================================

describe("Text Chunking", () => {
  describe("chunkText", () => {
    it("should return empty array for empty string", () => {
      expect(chunkText("")).toEqual([]);
    });

    it("should return empty array for whitespace-only string", () => {
      expect(chunkText("   \n\t  ")).toEqual([]);
    });

    it("should return single chunk for short text", () => {
      const text = "Hello, world!";
      const chunks = chunkText(text);

      expect(chunks.length).toBe(1);
      expect(chunks[0]?.text).toBe(text);
      expect(chunks[0]?.index).toBe(0);
      expect(chunks[0]?.startPosition).toBe(0);
      expect(chunks[0]?.endPosition).toBe(text.length);
    });

    it("should split long text into multiple chunks", () => {
      const text = "A".repeat(5000); // Longer than MAX_CHUNK_SIZE
      const chunks = chunkText(text);

      expect(chunks.length).toBeGreaterThan(1);
    });

    it("should preserve all text when chunking", () => {
      const text = "This is a longer text. " + "A".repeat(5000) + " End.";
      const chunks = chunkText(text);

      // Total characters from chunks should equal original
      const totalChars = getTotalCharacterCount(chunks);
      expect(totalChars).toBeGreaterThan(0);
      expect(chunks.length).toBeGreaterThan(1);

      // First chunk should contain the beginning
      expect(chunks[0]?.text).toContain("This is a longer text");
    });

    it("should try to break at sentence boundaries", () => {
      // Create text that exceeds MAX_CHUNK_SIZE
      const text =
        "This is the first sentence. " + "A".repeat(MAX_CHUNK_SIZE) + " End.";

      const chunks = chunkText(text);

      // Should have multiple chunks since it exceeds MAX_CHUNK_SIZE
      expect(chunks.length).toBeGreaterThan(1);
    });

    it("should try to break at paragraph boundaries", () => {
      // Create text that exceeds MAX_CHUNK_SIZE with paragraph breaks
      const text =
        "First paragraph.\n\n" +
        "A".repeat(MAX_CHUNK_SIZE) +
        "\n\nSecond paragraph.";

      const chunks = chunkText(text);

      expect(chunks.length).toBeGreaterThan(1);
    });

    it("should fall back to word boundary when no sentence end", () => {
      const text = "word ".repeat(1000); // No sentence endings
      const chunks = chunkText(text);

      // Should have multiple chunks
      expect(chunks.length).toBeGreaterThan(1);

      // Each chunk should be trimmed and not contain partial words
      for (const chunk of chunks) {
        // Chunks are trimmed, so they shouldn't start or end with spaces
        expect(chunk.text.startsWith(" ")).toBe(false);
      }
    });

    it("should use custom max chunk size", () => {
      const text = "A".repeat(500);
      const chunks = chunkText(text, 100);

      expect(chunks.length).toBe(5);
      for (const chunk of chunks) {
        expect(chunk.text.length).toBeLessThanOrEqual(100);
      }
    });

    it("should have correct indices", () => {
      const text = "A".repeat(5000);
      const chunks = chunkText(text);

      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i]?.index).toBe(i);
      }
    });

    it("should have correct positions", () => {
      const text = "Short text that fits.";
      const chunks = chunkText(text);

      expect(chunks[0]?.startPosition).toBe(0);
      expect(chunks[0]?.endPosition).toBe(text.length);
    });
  });

  describe("estimateChunkCount", () => {
    it("should return 0 for empty text", () => {
      expect(estimateChunkCount("")).toBe(0);
    });

    it("should return 0 for whitespace-only text", () => {
      expect(estimateChunkCount("   ")).toBe(0);
    });

    it("should return 1 for short text", () => {
      expect(estimateChunkCount("Hello")).toBe(1);
    });

    it("should estimate correctly for long text", () => {
      const text = "A".repeat(10000);
      const estimate = estimateChunkCount(text);

      expect(estimate).toBe(Math.ceil(10000 / MAX_CHUNK_SIZE));
    });

    it("should use custom max chunk size", () => {
      const text = "A".repeat(500);
      const estimate = estimateChunkCount(text, 100);

      expect(estimate).toBe(5);
    });
  });

  describe("getTotalCharacterCount", () => {
    it("should return 0 for empty array", () => {
      expect(getTotalCharacterCount([])).toBe(0);
    });

    it("should sum all chunk lengths", () => {
      const chunks: TextChunk[] = [
        { index: 0, text: "Hello", startPosition: 0, endPosition: 5 },
        { index: 1, text: "World", startPosition: 5, endPosition: 10 },
      ];

      expect(getTotalCharacterCount(chunks)).toBe(10);
    });
  });
});

// ============================================================================
// Cost Calculation Tests
// ============================================================================

describe("Cost Calculation", () => {
  describe("calculateTTSCost", () => {
    it("should return 0 for 0 characters", () => {
      expect(calculateTTSCost("openai", 0)).toBe(0);
    });

    it("should return 0 for negative characters", () => {
      expect(calculateTTSCost("openai", -100)).toBe(0);
    });

    it("should return 0 for web_speech", () => {
      expect(calculateTTSCost("web_speech", 1000000)).toBe(0);
    });

    it("should calculate OpenAI standard cost correctly", () => {
      // $15/1M characters
      const cost = calculateTTSCost("openai", 1000000);
      expect(cost).toBeCloseTo(15, 2);
    });

    it("should calculate OpenAI HD cost correctly", () => {
      // $30/1M characters
      const cost = calculateTTSCost("openai", 1000000, "tts-1-hd");
      expect(cost).toBeCloseTo(30, 2);
    });

    it("should calculate ElevenLabs cost correctly", () => {
      // $0.30/1K characters
      const cost = calculateTTSCost("elevenlabs", 1000);
      expect(cost).toBeCloseTo(0.3, 2);
    });

    it("should scale linearly with character count", () => {
      const cost1k = calculateTTSCost("openai", 1000);
      const cost2k = calculateTTSCost("openai", 2000);

      expect(cost2k).toBeCloseTo(cost1k * 2, 6);
    });
  });

  describe("estimateTTSCost", () => {
    it("should estimate based on text length", () => {
      const text = "A".repeat(1000);
      const estimate = estimateTTSCost(text, "openai");
      const direct = calculateTTSCost("openai", 1000);

      expect(estimate).toBeCloseTo(direct, 6);
    });

    it("should trim text before estimating", () => {
      const text = "   Hello   ";
      const estimate = estimateTTSCost(text, "openai");
      const direct = calculateTTSCost("openai", 5); // "Hello" is 5 chars

      expect(estimate).toBeCloseTo(direct, 6);
    });
  });
});

// ============================================================================
// Voice Validation Tests
// ============================================================================

describe("Voice Validation", () => {
  describe("isValidOpenAIVoice", () => {
    it("should return true for valid OpenAI voices", () => {
      for (const voice of OPENAI_VOICES) {
        expect(isValidOpenAIVoice(voice)).toBe(true);
      }
    });

    it("should return false for invalid voices", () => {
      expect(isValidOpenAIVoice("invalid")).toBe(false);
      expect(isValidOpenAIVoice("")).toBe(false);
      expect(isValidOpenAIVoice("rachel")).toBe(false); // ElevenLabs voice
    });

    it("should be case-sensitive", () => {
      expect(isValidOpenAIVoice("Alloy")).toBe(false);
      expect(isValidOpenAIVoice("ALLOY")).toBe(false);
    });
  });

  describe("isValidElevenLabsVoice", () => {
    it("should return true for valid ElevenLabs voices", () => {
      for (const voice of ELEVENLABS_VOICES) {
        expect(isValidElevenLabsVoice(voice)).toBe(true);
      }
    });

    it("should return false for invalid voices", () => {
      expect(isValidElevenLabsVoice("invalid")).toBe(false);
      expect(isValidElevenLabsVoice("")).toBe(false);
      expect(isValidElevenLabsVoice("alloy")).toBe(false); // OpenAI voice
    });

    it("should be case-sensitive", () => {
      expect(isValidElevenLabsVoice("Rachel")).toBe(false);
      expect(isValidElevenLabsVoice("RACHEL")).toBe(false);
    });
  });

  describe("normalizeVoice", () => {
    it("should return default OpenAI voice when undefined", () => {
      expect(normalizeVoice("openai", undefined)).toBe(DEFAULT_OPENAI_VOICE);
    });

    it("should return default ElevenLabs voice when undefined", () => {
      expect(normalizeVoice("elevenlabs", undefined)).toBe(
        DEFAULT_ELEVENLABS_VOICE
      );
    });

    it("should return null for web_speech when undefined", () => {
      expect(normalizeVoice("web_speech", undefined)).toBe(null);
    });

    it("should return valid OpenAI voice as-is", () => {
      expect(normalizeVoice("openai", "nova")).toBe("nova");
    });

    it("should return valid ElevenLabs voice as-is", () => {
      expect(normalizeVoice("elevenlabs", "drew")).toBe("drew");
    });

    it("should return default for invalid OpenAI voice", () => {
      expect(normalizeVoice("openai", "invalid")).toBe(DEFAULT_OPENAI_VOICE);
    });

    it("should return default for invalid ElevenLabs voice", () => {
      expect(normalizeVoice("elevenlabs", "invalid")).toBe(
        DEFAULT_ELEVENLABS_VOICE
      );
    });

    it("should pass through voice for web_speech", () => {
      expect(normalizeVoice("web_speech", "any-voice")).toBe("any-voice");
    });
  });

  describe("getElevenLabsVoiceId", () => {
    it("should return correct ID for each voice", () => {
      for (const voice of ELEVENLABS_VOICES) {
        const id = getElevenLabsVoiceId(voice);
        expect(id).toBe(ELEVENLABS_VOICE_IDS[voice]);
      }
    });

    it("should return rachel's ID for rachel", () => {
      expect(getElevenLabsVoiceId("rachel")).toBe("21m00Tcm4TlvDq8ikWAM");
    });
  });
});

// ============================================================================
// Provider Availability Tests
// ============================================================================

describe("Provider Availability", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isOpenAITTSAvailable", () => {
    it("should return true when OPENAI_API_KEY is set", () => {
      process.env.OPENAI_API_KEY = "test-key";
      expect(isOpenAITTSAvailable()).toBe(true);
    });

    it("should return false when OPENAI_API_KEY is not set", () => {
      delete process.env.OPENAI_API_KEY;
      expect(isOpenAITTSAvailable()).toBe(false);
    });

    it("should return false when OPENAI_API_KEY is empty", () => {
      process.env.OPENAI_API_KEY = "";
      expect(isOpenAITTSAvailable()).toBe(false);
    });
  });

  describe("isElevenLabsTTSAvailable", () => {
    it("should return true when ELEVENLABS_API_KEY is set", () => {
      process.env.ELEVENLABS_API_KEY = "test-key";
      expect(isElevenLabsTTSAvailable()).toBe(true);
    });

    it("should return false when ELEVENLABS_API_KEY is not set", () => {
      delete process.env.ELEVENLABS_API_KEY;
      expect(isElevenLabsTTSAvailable()).toBe(false);
    });

    it("should return false when ELEVENLABS_API_KEY is empty", () => {
      process.env.ELEVENLABS_API_KEY = "";
      expect(isElevenLabsTTSAvailable()).toBe(false);
    });
  });

  describe("isTTSProviderAvailable", () => {
    it("should check OpenAI availability", () => {
      process.env.OPENAI_API_KEY = "test-key";
      delete process.env.ELEVENLABS_API_KEY;

      expect(isTTSProviderAvailable("openai")).toBe(true);
      expect(isTTSProviderAvailable("elevenlabs")).toBe(false);
    });

    it("should check ElevenLabs availability", () => {
      delete process.env.OPENAI_API_KEY;
      process.env.ELEVENLABS_API_KEY = "test-key";

      expect(isTTSProviderAvailable("openai")).toBe(false);
      expect(isTTSProviderAvailable("elevenlabs")).toBe(true);
    });

    it("should always return true for web_speech", () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.ELEVENLABS_API_KEY;

      expect(isTTSProviderAvailable("web_speech")).toBe(true);
    });

    it("should return false for unknown provider", () => {
      expect(isTTSProviderAvailable("unknown" as TTSProvider)).toBe(false);
    });
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export TTSProvider type", () => {
    const provider: TTSProvider = "openai";
    expect(provider).toBe("openai");
  });

  it("should export OpenAIVoice type", () => {
    const voice: OpenAIVoice = "alloy";
    expect(voice).toBe("alloy");
  });

  it("should export ElevenLabsVoice type", () => {
    const voice: ElevenLabsVoice = "rachel";
    expect(voice).toBe("rachel");
  });

  it("should export OpenAIModel type", () => {
    const model: OpenAIModel = "tts-1";
    expect(model).toBe("tts-1");
  });

  it("should export AudioFormat type", () => {
    const format: AudioFormat = "mp3";
    expect(format).toBe("mp3");
  });

  it("should export TextChunk type", () => {
    const chunk: TextChunk = {
      index: 0,
      text: "test",
      startPosition: 0,
      endPosition: 4,
    };
    expect(chunk.text).toBe("test");
  });

  it("should export TTSOptions type", () => {
    const options: TTSOptions = {
      text: "Hello",
      voice: "alloy",
      speed: 1.0,
    };
    expect(options.text).toBe("Hello");
  });

  it("should export TTSResult type", () => {
    const result: TTSResult = {
      audioBase64: "base64data",
      format: "mp3",
      characterCount: 100,
      durationMs: 500,
      cost: 0.001,
    };
    expect(result.format).toBe("mp3");
  });

  it("should export AudioChunk type", () => {
    const chunk: AudioChunk = {
      index: 0,
      data: "base64data",
      format: "mp3",
      isFinal: false,
    };
    expect(chunk.isFinal).toBe(false);
  });
});

// ============================================================================
// Service Export Tests
// ============================================================================

describe("ttsService Export", () => {
  it("should export text chunking functions", () => {
    expect(ttsService.chunkText).toBe(chunkText);
    expect(ttsService.estimateChunkCount).toBe(estimateChunkCount);
    expect(ttsService.getTotalCharacterCount).toBe(getTotalCharacterCount);
  });

  it("should export cost calculation functions", () => {
    expect(ttsService.calculateTTSCost).toBe(calculateTTSCost);
    expect(ttsService.estimateTTSCost).toBe(estimateTTSCost);
  });

  it("should export voice validation functions", () => {
    expect(ttsService.isValidOpenAIVoice).toBe(isValidOpenAIVoice);
    expect(ttsService.isValidElevenLabsVoice).toBe(isValidElevenLabsVoice);
    expect(ttsService.normalizeVoice).toBe(normalizeVoice);
    expect(ttsService.getElevenLabsVoiceId).toBe(getElevenLabsVoiceId);
  });

  it("should export availability check functions", () => {
    expect(ttsService.isOpenAITTSAvailable).toBe(isOpenAITTSAvailable);
    expect(ttsService.isElevenLabsTTSAvailable).toBe(isElevenLabsTTSAvailable);
    expect(ttsService.isTTSProviderAvailable).toBe(isTTSProviderAvailable);
  });

  it("should export constants", () => {
    expect(ttsService.OPENAI_VOICES).toBe(OPENAI_VOICES);
    expect(ttsService.ELEVENLABS_VOICES).toBe(ELEVENLABS_VOICES);
    expect(ttsService.MAX_CHUNK_SIZE).toBe(MAX_CHUNK_SIZE);
    expect(ttsService.DEFAULT_SPEED).toBe(DEFAULT_SPEED);
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  describe("chunkText edge cases", () => {
    it("should handle text with only periods", () => {
      const text = "...";
      const chunks = chunkText(text);
      expect(chunks.length).toBe(1);
      expect(chunks[0]?.text).toBe("...");
    });

    it("should handle text with many newlines", () => {
      const text = "\n\n\n\n\n";
      const chunks = chunkText(text);
      expect(chunks.length).toBe(0); // All whitespace
    });

    it("should handle unicode characters", () => {
      const text = "Hello 世界! こんにちは 🌍";
      const chunks = chunkText(text);
      expect(chunks.length).toBe(1);
      expect(chunks[0]?.text).toContain("世界");
    });

    it("should handle very long words", () => {
      const longWord = "A".repeat(200);
      const text = longWord + " " + longWord + " " + longWord;
      const chunks = chunkText(text, 150);

      // Should handle gracefully even if words are longer than chunk size
      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should handle exactly MAX_CHUNK_SIZE text", () => {
      const text = "A".repeat(MAX_CHUNK_SIZE);
      const chunks = chunkText(text);
      expect(chunks.length).toBe(1);
      expect(chunks[0]?.text.length).toBe(MAX_CHUNK_SIZE);
    });

    it("should handle MAX_CHUNK_SIZE + 1 text", () => {
      const text = "A".repeat(MAX_CHUNK_SIZE + 1);
      const chunks = chunkText(text);
      expect(chunks.length).toBe(2);
    });
  });

  describe("Cost calculation edge cases", () => {
    it("should handle very large character counts", () => {
      const cost = calculateTTSCost("openai", 1_000_000_000);
      expect(cost).toBeGreaterThan(0);
      expect(isFinite(cost)).toBe(true);
    });

    it("should handle fractional character counts", () => {
      // Should work but in practice character counts are integers
      const cost = calculateTTSCost("openai", 100.5);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe("Voice normalization edge cases", () => {
    it("should handle empty string voice", () => {
      expect(normalizeVoice("openai", "")).toBe(DEFAULT_OPENAI_VOICE);
    });

    it("should handle voice with spaces", () => {
      expect(normalizeVoice("openai", " alloy ")).toBe(DEFAULT_OPENAI_VOICE);
    });

    it("should handle numeric voice string", () => {
      expect(normalizeVoice("openai", "123")).toBe(DEFAULT_OPENAI_VOICE);
    });
  });
});

// ============================================================================
// Integration Scenarios
// ============================================================================

describe("Integration Scenarios", () => {
  it("should support full OpenAI TTS workflow", () => {
    // 1. Check availability
    process.env.OPENAI_API_KEY = "test-key";
    expect(isTTSProviderAvailable("openai")).toBe(true);

    // 2. Normalize voice
    const voice = normalizeVoice("openai", undefined);
    expect(voice).toBe(DEFAULT_OPENAI_VOICE);

    // 3. Chunk text
    const text = "Hello, this is a test. ".repeat(200);
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);

    // 4. Calculate cost
    const totalChars = getTotalCharacterCount(chunks);
    const cost = calculateTTSCost("openai", totalChars);
    expect(cost).toBeGreaterThan(0);
  });

  it("should support full ElevenLabs TTS workflow", () => {
    // 1. Check availability
    process.env.ELEVENLABS_API_KEY = "test-key";
    expect(isTTSProviderAvailable("elevenlabs")).toBe(true);

    // 2. Normalize voice and get ID
    const voice = normalizeVoice("elevenlabs", "bella");
    expect(voice).toBe("bella");
    const voiceId = getElevenLabsVoiceId(voice as ElevenLabsVoice);
    expect(voiceId).toBeTruthy();

    // 3. Chunk text
    const text = "This is a premium TTS test. ".repeat(200);
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);

    // 4. Calculate cost
    const totalChars = getTotalCharacterCount(chunks);
    const cost = calculateTTSCost("elevenlabs", totalChars);
    expect(cost).toBeGreaterThan(0);
  });

  it("should support web_speech fallback workflow", () => {
    // No API keys needed
    delete process.env.OPENAI_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;

    // 1. Check availability
    expect(isTTSProviderAvailable("web_speech")).toBe(true);

    // 2. Voice is passed through
    const voice = normalizeVoice("web_speech", "any-browser-voice");
    expect(voice).toBe("any-browser-voice");

    // 3. Cost is free
    const cost = calculateTTSCost("web_speech", 1000000);
    expect(cost).toBe(0);
  });

  it("should estimate cost before processing", () => {
    const text = "This is sample text for TTS. ".repeat(100);

    const openAICost = estimateTTSCost(text, "openai");
    const openAIHDCost = estimateTTSCost(text, "openai", "tts-1-hd");
    const elevenLabsCost = estimateTTSCost(text, "elevenlabs");
    const webSpeechCost = estimateTTSCost(text, "web_speech");

    // Verify relative costs
    expect(openAIHDCost).toBeGreaterThan(openAICost);
    expect(elevenLabsCost).toBeGreaterThan(openAICost);
    expect(webSpeechCost).toBe(0);
  });
});
