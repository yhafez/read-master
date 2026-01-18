/**
 * Tests for POST /api/tts/speak endpoint
 *
 * Tests TTS tier-based providers:
 * - FREE: Web Speech API configuration
 * - PRO: OpenAI TTS configuration
 * - SCHOLAR: ElevenLabs TTS configuration
 */

import { describe, it, expect } from "vitest";
import {
  // Constants
  MIN_TEXT_LENGTH,
  MAX_TEXT_LENGTH,
  DEFAULT_SPEED,
  MIN_SPEED,
  MAX_SPEED,
  OPENAI_VOICES,
  ELEVENLABS_VOICES,
  DEFAULT_OPENAI_VOICE,
  DEFAULT_ELEVENLABS_VOICE,
  // Types
  type OpenAIVoice,
  type ElevenLabsVoice,
  type TTSProvider,
  type WebSpeechConfig,
  type OpenAITTSResponse,
  type ElevenLabsTTSResponse,
  type TTSRequest,
  // Functions
  speakRequestSchema,
  isValidOpenAIVoice,
  isValidElevenLabsVoice,
  getDefaultVoice,
  normalizeVoice,
  buildWebSpeechConfig,
  buildOpenAIResponse,
  buildElevenLabsResponse,
  buildTTSResponse,
  calculateTTSCost,
} from "./speak.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("TTS Constants", () => {
  describe("Text length limits", () => {
    it("should have MIN_TEXT_LENGTH of 1", () => {
      expect(MIN_TEXT_LENGTH).toBe(1);
    });

    it("should have MAX_TEXT_LENGTH of 4096", () => {
      expect(MAX_TEXT_LENGTH).toBe(4096);
    });
  });

  describe("Speed limits", () => {
    it("should have DEFAULT_SPEED of 1.0", () => {
      expect(DEFAULT_SPEED).toBe(1.0);
    });

    it("should have MIN_SPEED of 0.25", () => {
      expect(MIN_SPEED).toBe(0.25);
    });

    it("should have MAX_SPEED of 4.0", () => {
      expect(MAX_SPEED).toBe(4.0);
    });
  });

  describe("OpenAI voices", () => {
    it("should have 6 OpenAI voices", () => {
      expect(OPENAI_VOICES).toHaveLength(6);
    });

    it("should include all expected OpenAI voices", () => {
      const expectedVoices = [
        "alloy",
        "echo",
        "fable",
        "onyx",
        "nova",
        "shimmer",
      ];
      expectedVoices.forEach((voice) => {
        expect(OPENAI_VOICES).toContain(voice);
      });
    });

    it("should have 'alloy' as default OpenAI voice", () => {
      expect(DEFAULT_OPENAI_VOICE).toBe("alloy");
    });
  });

  describe("ElevenLabs voices", () => {
    it("should have ElevenLabs voices defined", () => {
      expect(ELEVENLABS_VOICES.length).toBeGreaterThan(0);
    });

    it("should include common ElevenLabs voices", () => {
      const commonVoices = ["rachel", "drew", "bella", "adam"];
      commonVoices.forEach((voice) => {
        expect(ELEVENLABS_VOICES).toContain(voice);
      });
    });

    it("should have 'rachel' as default ElevenLabs voice", () => {
      expect(DEFAULT_ELEVENLABS_VOICE).toBe("rachel");
    });
  });
});

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("speakRequestSchema", () => {
  describe("text validation", () => {
    it("should accept valid text", () => {
      const result = speakRequestSchema.safeParse({ text: "Hello world" });
      expect(result.success).toBe(true);
    });

    it("should reject empty text", () => {
      const result = speakRequestSchema.safeParse({ text: "" });
      expect(result.success).toBe(false);
    });

    it("should reject text that is too long", () => {
      const longText = "a".repeat(MAX_TEXT_LENGTH + 1);
      const result = speakRequestSchema.safeParse({ text: longText });
      expect(result.success).toBe(false);
    });

    it("should accept text at maximum length", () => {
      const maxText = "a".repeat(MAX_TEXT_LENGTH);
      const result = speakRequestSchema.safeParse({ text: maxText });
      expect(result.success).toBe(true);
    });

    it("should accept single character text", () => {
      const result = speakRequestSchema.safeParse({ text: "a" });
      expect(result.success).toBe(true);
    });
  });

  describe("voice validation", () => {
    it("should accept valid voice string", () => {
      const result = speakRequestSchema.safeParse({
        text: "Hello",
        voice: "alloy",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.voice).toBe("alloy");
      }
    });

    it("should accept undefined voice", () => {
      const result = speakRequestSchema.safeParse({ text: "Hello" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.voice).toBeUndefined();
      }
    });

    it("should accept any string as voice (validation happens in normalizeVoice)", () => {
      const result = speakRequestSchema.safeParse({
        text: "Hello",
        voice: "custom-voice",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("speed validation", () => {
    it("should use default speed when not provided", () => {
      const result = speakRequestSchema.safeParse({ text: "Hello" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.speed).toBe(DEFAULT_SPEED);
      }
    });

    it("should accept valid speed value", () => {
      const result = speakRequestSchema.safeParse({
        text: "Hello",
        speed: 1.5,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.speed).toBe(1.5);
      }
    });

    it("should reject speed below minimum", () => {
      const result = speakRequestSchema.safeParse({
        text: "Hello",
        speed: MIN_SPEED - 0.1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject speed above maximum", () => {
      const result = speakRequestSchema.safeParse({
        text: "Hello",
        speed: MAX_SPEED + 0.1,
      });
      expect(result.success).toBe(false);
    });

    it("should accept minimum speed", () => {
      const result = speakRequestSchema.safeParse({
        text: "Hello",
        speed: MIN_SPEED,
      });
      expect(result.success).toBe(true);
    });

    it("should accept maximum speed", () => {
      const result = speakRequestSchema.safeParse({
        text: "Hello",
        speed: MAX_SPEED,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("language validation", () => {
    it("should use default language when not provided", () => {
      const result = speakRequestSchema.safeParse({ text: "Hello" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.language).toBe("en");
      }
    });

    it("should accept custom language", () => {
      const result = speakRequestSchema.safeParse({
        text: "Hola",
        language: "es",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.language).toBe("es");
      }
    });
  });

  describe("full request validation", () => {
    it("should parse complete valid request", () => {
      const request = {
        text: "Hello, world!",
        voice: "alloy",
        speed: 1.25,
        language: "en-US",
      };
      const result = speakRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(request);
      }
    });

    it("should reject request with missing text", () => {
      const result = speakRequestSchema.safeParse({
        voice: "alloy",
        speed: 1.0,
      });
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// Voice Validation Tests
// ============================================================================

describe("isValidOpenAIVoice", () => {
  it("should return true for valid OpenAI voices", () => {
    OPENAI_VOICES.forEach((voice) => {
      expect(isValidOpenAIVoice(voice)).toBe(true);
    });
  });

  it("should return false for invalid voices", () => {
    expect(isValidOpenAIVoice("invalid")).toBe(false);
    expect(isValidOpenAIVoice("rachel")).toBe(false);
    expect(isValidOpenAIVoice("")).toBe(false);
  });

  it("should be case-sensitive", () => {
    expect(isValidOpenAIVoice("ALLOY")).toBe(false);
    expect(isValidOpenAIVoice("Alloy")).toBe(false);
  });
});

describe("isValidElevenLabsVoice", () => {
  it("should return true for valid ElevenLabs voices", () => {
    const testVoices: ElevenLabsVoice[] = ["rachel", "drew", "bella", "adam"];
    testVoices.forEach((voice) => {
      expect(isValidElevenLabsVoice(voice)).toBe(true);
    });
  });

  it("should return false for invalid voices", () => {
    expect(isValidElevenLabsVoice("invalid")).toBe(false);
    expect(isValidElevenLabsVoice("alloy")).toBe(false);
    expect(isValidElevenLabsVoice("")).toBe(false);
  });
});

// ============================================================================
// Voice Default and Normalization Tests
// ============================================================================

describe("getDefaultVoice", () => {
  it("should return null for web_speech", () => {
    expect(getDefaultVoice("web_speech")).toBeNull();
  });

  it("should return alloy for openai", () => {
    expect(getDefaultVoice("openai")).toBe("alloy");
  });

  it("should return rachel for elevenlabs", () => {
    expect(getDefaultVoice("elevenlabs")).toBe("rachel");
  });
});

describe("normalizeVoice", () => {
  describe("web_speech provider", () => {
    it("should return null for undefined voice", () => {
      expect(normalizeVoice("web_speech", undefined)).toBeNull();
    });

    it("should return provided voice as-is", () => {
      expect(normalizeVoice("web_speech", "custom-voice")).toBe("custom-voice");
    });
  });

  describe("openai provider", () => {
    it("should return default voice for undefined", () => {
      expect(normalizeVoice("openai", undefined)).toBe(DEFAULT_OPENAI_VOICE);
    });

    it("should return valid voice unchanged", () => {
      expect(normalizeVoice("openai", "echo")).toBe("echo");
      expect(normalizeVoice("openai", "nova")).toBe("nova");
    });

    it("should return default for invalid voice", () => {
      expect(normalizeVoice("openai", "invalid")).toBe(DEFAULT_OPENAI_VOICE);
    });
  });

  describe("elevenlabs provider", () => {
    it("should return default voice for undefined", () => {
      expect(normalizeVoice("elevenlabs", undefined)).toBe(
        DEFAULT_ELEVENLABS_VOICE
      );
    });

    it("should return valid voice unchanged", () => {
      expect(normalizeVoice("elevenlabs", "bella")).toBe("bella");
      expect(normalizeVoice("elevenlabs", "adam")).toBe("adam");
    });

    it("should return default for invalid voice", () => {
      expect(normalizeVoice("elevenlabs", "invalid")).toBe(
        DEFAULT_ELEVENLABS_VOICE
      );
    });
  });
});

// ============================================================================
// Response Builder Tests
// ============================================================================

describe("buildWebSpeechConfig", () => {
  it("should build correct config with all parameters", () => {
    const config = buildWebSpeechConfig("Hello", 1.5, "en-US", "voice-1");
    expect(config).toEqual({
      provider: "web_speech",
      text: "Hello",
      language: "en-US",
      rate: 1.5,
      pitch: 1.0,
      volume: 1.0,
      voice: "voice-1",
      message: expect.any(String),
    });
  });

  it("should set voice to null when not provided", () => {
    const config = buildWebSpeechConfig("Hello", 1.0, "en");
    expect(config.voice).toBeNull();
  });

  it("should include upgrade message", () => {
    const config = buildWebSpeechConfig("Hello", 1.0, "en");
    expect(config.message).toContain("Web Speech API");
    expect(config.message).toContain("Upgrade");
  });
});

describe("buildOpenAIResponse", () => {
  it("should build correct response with all parameters", () => {
    const response = buildOpenAIResponse("Hello", "echo", 1.25);
    expect(response).toEqual({
      provider: "openai",
      text: "Hello",
      voice: "echo",
      speed: 1.25,
      format: "mp3",
      message: expect.any(String),
    });
  });

  it("should use mp3 format", () => {
    const response = buildOpenAIResponse("Hello", "alloy", 1.0);
    expect(response.format).toBe("mp3");
  });

  it("should mention Scholar upgrade", () => {
    const response = buildOpenAIResponse("Hello", "alloy", 1.0);
    expect(response.message).toContain("Scholar");
  });
});

describe("buildElevenLabsResponse", () => {
  it("should build correct response with all parameters", () => {
    const response = buildElevenLabsResponse("Hello", "bella", 1.5);
    expect(response).toEqual({
      provider: "elevenlabs",
      text: "Hello",
      voice: "bella",
      speed: 1.5,
      format: "mp3",
      stability: 0.5,
      similarityBoost: 0.75,
      message: expect.any(String),
    });
  });

  it("should include stability and similarityBoost", () => {
    const response = buildElevenLabsResponse("Hello", "rachel", 1.0);
    expect(response.stability).toBe(0.5);
    expect(response.similarityBoost).toBe(0.75);
  });
});

describe("buildTTSResponse", () => {
  it("should build web_speech response for free tier", () => {
    const response = buildTTSResponse(
      "web_speech",
      "Hello",
      undefined,
      1.0,
      "en"
    );
    expect(response.provider).toBe("web_speech");
  });

  it("should build openai response for pro tier", () => {
    const response = buildTTSResponse("openai", "Hello", "nova", 1.0, "en");
    expect(response.provider).toBe("openai");
    expect((response as OpenAITTSResponse).voice).toBe("nova");
  });

  it("should build elevenlabs response for scholar tier", () => {
    const response = buildTTSResponse("elevenlabs", "Hello", "adam", 1.0, "en");
    expect(response.provider).toBe("elevenlabs");
    expect((response as ElevenLabsTTSResponse).voice).toBe("adam");
  });

  it("should normalize invalid voices", () => {
    const response = buildTTSResponse("openai", "Hello", "invalid", 1.0, "en");
    expect((response as OpenAITTSResponse).voice).toBe(DEFAULT_OPENAI_VOICE);
  });

  it("should use default voices when not provided", () => {
    const openaiResponse = buildTTSResponse(
      "openai",
      "Hello",
      undefined,
      1.0,
      "en"
    );
    expect((openaiResponse as OpenAITTSResponse).voice).toBe(
      DEFAULT_OPENAI_VOICE
    );

    const elevenResponse = buildTTSResponse(
      "elevenlabs",
      "Hello",
      undefined,
      1.0,
      "en"
    );
    expect((elevenResponse as ElevenLabsTTSResponse).voice).toBe(
      DEFAULT_ELEVENLABS_VOICE
    );
  });
});

// ============================================================================
// Cost Calculation Tests
// ============================================================================

describe("calculateTTSCost", () => {
  describe("web_speech provider", () => {
    it("should return 0 for any text length", () => {
      expect(calculateTTSCost("web_speech", 0)).toBe(0);
      expect(calculateTTSCost("web_speech", 1000)).toBe(0);
      expect(calculateTTSCost("web_speech", 1000000)).toBe(0);
    });
  });

  describe("openai provider", () => {
    it("should calculate cost at $15/1M characters", () => {
      // 1M characters = $15
      expect(calculateTTSCost("openai", 1_000_000)).toBe(15);
    });

    it("should calculate proportional cost", () => {
      // 100K characters = $1.50
      expect(calculateTTSCost("openai", 100_000)).toBeCloseTo(1.5);
    });

    it("should return 0 for empty text", () => {
      expect(calculateTTSCost("openai", 0)).toBe(0);
    });
  });

  describe("elevenlabs provider", () => {
    it("should calculate cost at $0.30/1K characters", () => {
      // 1K characters = $0.30
      expect(calculateTTSCost("elevenlabs", 1000)).toBeCloseTo(0.3);
    });

    it("should calculate proportional cost", () => {
      // 10K characters = $3.00
      expect(calculateTTSCost("elevenlabs", 10000)).toBeCloseTo(3.0);
    });

    it("should return 0 for empty text", () => {
      expect(calculateTTSCost("elevenlabs", 0)).toBe(0);
    });
  });

  describe("cost comparisons", () => {
    it("should have elevenlabs more expensive than openai for same text", () => {
      const textLength = 1000;
      const openaiCost = calculateTTSCost("openai", textLength);
      const elevenLabsCost = calculateTTSCost("elevenlabs", textLength);
      expect(elevenLabsCost).toBeGreaterThan(openaiCost);
    });
  });
});

// ============================================================================
// Type Tests
// ============================================================================

describe("Type exports", () => {
  it("should export OpenAIVoice type", () => {
    const voice: OpenAIVoice = "alloy";
    expect(OPENAI_VOICES).toContain(voice);
  });

  it("should export ElevenLabsVoice type", () => {
    const voice: ElevenLabsVoice = "rachel";
    expect(ELEVENLABS_VOICES).toContain(voice);
  });

  it("should export TTSProvider type", () => {
    const providers: TTSProvider[] = ["web_speech", "openai", "elevenlabs"];
    providers.forEach((provider) => {
      expect(["web_speech", "openai", "elevenlabs"]).toContain(provider);
    });
  });

  it("should export WebSpeechConfig type", () => {
    const config: WebSpeechConfig = {
      provider: "web_speech",
      text: "Hello",
      language: "en",
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      voice: null,
      message: "Test",
    };
    expect(config.provider).toBe("web_speech");
  });

  it("should export OpenAITTSResponse type", () => {
    const response: OpenAITTSResponse = {
      provider: "openai",
      text: "Hello",
      voice: "alloy",
      speed: 1.0,
      format: "mp3",
      message: "Test",
    };
    expect(response.provider).toBe("openai");
  });

  it("should export ElevenLabsTTSResponse type", () => {
    const response: ElevenLabsTTSResponse = {
      provider: "elevenlabs",
      text: "Hello",
      voice: "rachel",
      speed: 1.0,
      format: "mp3",
      stability: 0.5,
      similarityBoost: 0.75,
      message: "Test",
    };
    expect(response.provider).toBe("elevenlabs");
  });

  it("should export TTSRequest type", () => {
    const request: TTSRequest = {
      text: "Hello",
      voice: "alloy",
      speed: 1.0,
      language: "en",
    };
    expect(request.text).toBe("Hello");
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge cases", () => {
  describe("special characters in text", () => {
    it("should accept text with special characters", () => {
      const result = speakRequestSchema.safeParse({
        text: "Hello! @#$%^&*() World?",
      });
      expect(result.success).toBe(true);
    });

    it("should accept text with unicode characters", () => {
      const result = speakRequestSchema.safeParse({
        text: "Здравствуй мир 你好世界 🌍",
      });
      expect(result.success).toBe(true);
    });

    it("should accept text with newlines", () => {
      const result = speakRequestSchema.safeParse({
        text: "Hello\nWorld\n!",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("boundary values", () => {
    it("should accept exact minimum speed", () => {
      const result = speakRequestSchema.safeParse({
        text: "Hello",
        speed: MIN_SPEED,
      });
      expect(result.success).toBe(true);
    });

    it("should accept exact maximum speed", () => {
      const result = speakRequestSchema.safeParse({
        text: "Hello",
        speed: MAX_SPEED,
      });
      expect(result.success).toBe(true);
    });

    it("should accept speed slightly above minimum", () => {
      const result = speakRequestSchema.safeParse({
        text: "Hello",
        speed: MIN_SPEED + 0.01,
      });
      expect(result.success).toBe(true);
    });

    it("should accept speed slightly below maximum", () => {
      const result = speakRequestSchema.safeParse({
        text: "Hello",
        speed: MAX_SPEED - 0.01,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("voice provider mismatches", () => {
    it("should normalize ElevenLabs voice to OpenAI default", () => {
      const voice = normalizeVoice("openai", "rachel"); // ElevenLabs voice
      expect(voice).toBe(DEFAULT_OPENAI_VOICE);
    });

    it("should normalize OpenAI voice to ElevenLabs default", () => {
      const voice = normalizeVoice("elevenlabs", "alloy"); // OpenAI voice
      expect(voice).toBe(DEFAULT_ELEVENLABS_VOICE);
    });
  });
});

// ============================================================================
// Integration Scenarios Tests
// ============================================================================

describe("Integration scenarios", () => {
  describe("Free tier user flow", () => {
    it("should return web_speech config for free tier", () => {
      const response = buildTTSResponse(
        "web_speech",
        "Hello, world!",
        undefined,
        1.0,
        "en"
      );
      expect(response.provider).toBe("web_speech");
      expect((response as WebSpeechConfig).text).toBe("Hello, world!");
      expect((response as WebSpeechConfig).voice).toBeNull();
    });
  });

  describe("Pro tier user flow", () => {
    it("should return openai config for pro tier with voice selection", () => {
      const response = buildTTSResponse(
        "openai",
        "Hello, world!",
        "nova",
        1.25,
        "en"
      );
      expect(response.provider).toBe("openai");
      expect((response as OpenAITTSResponse).voice).toBe("nova");
      expect((response as OpenAITTSResponse).speed).toBe(1.25);
    });
  });

  describe("Scholar tier user flow", () => {
    it("should return elevenlabs config for scholar tier", () => {
      const response = buildTTSResponse(
        "elevenlabs",
        "Hello, world!",
        "bella",
        1.5,
        "en-US"
      );
      expect(response.provider).toBe("elevenlabs");
      expect((response as ElevenLabsTTSResponse).voice).toBe("bella");
      expect((response as ElevenLabsTTSResponse).stability).toBe(0.5);
    });
  });

  describe("Complete request validation", () => {
    it("should validate and parse a complete request", () => {
      const input = {
        text: "This is a test message for text-to-speech conversion.",
        voice: "alloy",
        speed: 1.0,
        language: "en-US",
      };

      const result = speakRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.text).toBe(input.text);
        expect(result.data.voice).toBe(input.voice);
        expect(result.data.speed).toBe(input.speed);
        expect(result.data.language).toBe(input.language);
      }
    });
  });
});
