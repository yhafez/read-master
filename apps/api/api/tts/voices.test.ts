/**
 * Tests for GET /api/tts/voices endpoint
 *
 * Tests cover:
 * - Voice data constants
 * - Voice retrieval by provider
 * - Helper functions
 * - Response builders
 * - Type exports
 */

import { describe, it, expect } from "vitest";

import {
  OPENAI_VOICES,
  ELEVENLABS_VOICES,
  WEB_SPEECH_VOICES,
  DEFAULT_VOICES,
  getWebSpeechVoices,
  getOpenAIVoices,
  getElevenLabsVoices,
  getVoicesForProvider,
  getVoiceCount,
  findVoiceById,
  filterVoicesByGender,
  type TTSProvider,
  type VoiceOption,
  type WebSpeechVoicesResponse,
  type OpenAIVoicesResponse,
  type ElevenLabsVoicesResponse,
  type VoicesResponse,
} from "./voices.js";

// ============================================================================
// Voice Data Constants Tests
// ============================================================================

describe("Voice Data Constants", () => {
  describe("OPENAI_VOICES", () => {
    it("should have exactly 6 voices", () => {
      expect(OPENAI_VOICES).toHaveLength(6);
    });

    it("should include all OpenAI voice IDs", () => {
      const voiceIds = OPENAI_VOICES.map((v) => v.id);
      expect(voiceIds).toContain("alloy");
      expect(voiceIds).toContain("echo");
      expect(voiceIds).toContain("fable");
      expect(voiceIds).toContain("onyx");
      expect(voiceIds).toContain("nova");
      expect(voiceIds).toContain("shimmer");
    });

    it("should have required fields for each voice", () => {
      for (const voice of OPENAI_VOICES) {
        expect(voice.id).toBeDefined();
        expect(voice.name).toBeDefined();
        expect(voice.description).toBeDefined();
        expect(voice.gender).toBeDefined();
        expect(voice.language).toBe("en");
      }
    });

    it("should have unique voice IDs", () => {
      const voiceIds = OPENAI_VOICES.map((v) => v.id);
      const uniqueIds = new Set(voiceIds);
      expect(uniqueIds.size).toBe(voiceIds.length);
    });

    it("should have valid gender values", () => {
      const validGenders = ["male", "female", "neutral"];
      for (const voice of OPENAI_VOICES) {
        expect(validGenders).toContain(voice.gender);
      }
    });
  });

  describe("ELEVENLABS_VOICES", () => {
    it("should have at least 40 voices", () => {
      expect(ELEVENLABS_VOICES.length).toBeGreaterThanOrEqual(40);
    });

    it("should include expected voices", () => {
      const voiceIds = ELEVENLABS_VOICES.map((v) => v.id);
      expect(voiceIds).toContain("rachel");
      expect(voiceIds).toContain("drew");
      expect(voiceIds).toContain("bella");
      expect(voiceIds).toContain("thomas");
      expect(voiceIds).toContain("charlotte");
    });

    it("should have required fields for each voice", () => {
      for (const voice of ELEVENLABS_VOICES) {
        expect(voice.id).toBeDefined();
        expect(voice.name).toBeDefined();
        expect(voice.description).toBeDefined();
        expect(voice.gender).toBeDefined();
        expect(voice.language).toBe("en");
      }
    });

    it("should have unique voice IDs", () => {
      const voiceIds = ELEVENLABS_VOICES.map((v) => v.id);
      const uniqueIds = new Set(voiceIds);
      expect(uniqueIds.size).toBe(voiceIds.length);
    });

    it("should have valid gender values", () => {
      const validGenders = ["male", "female", "neutral"];
      for (const voice of ELEVENLABS_VOICES) {
        expect(validGenders).toContain(voice.gender);
      }
    });

    it("should include both male and female voices", () => {
      const maleVoices = ELEVENLABS_VOICES.filter((v) => v.gender === "male");
      const femaleVoices = ELEVENLABS_VOICES.filter(
        (v) => v.gender === "female"
      );
      expect(maleVoices.length).toBeGreaterThan(0);
      expect(femaleVoices.length).toBeGreaterThan(0);
    });
  });

  describe("WEB_SPEECH_VOICES", () => {
    it("should be an empty array (browser-provided)", () => {
      expect(WEB_SPEECH_VOICES).toEqual([]);
    });
  });

  describe("DEFAULT_VOICES", () => {
    it("should have default voice for OpenAI", () => {
      expect(DEFAULT_VOICES.openai).toBe("alloy");
    });

    it("should have default voice for ElevenLabs", () => {
      expect(DEFAULT_VOICES.elevenlabs).toBe("rachel");
    });

    it("should have null for Web Speech", () => {
      expect(DEFAULT_VOICES.web_speech).toBeNull();
    });
  });
});

// ============================================================================
// Voice Retrieval Functions Tests
// ============================================================================

describe("Voice Retrieval Functions", () => {
  describe("getWebSpeechVoices", () => {
    it("should return web_speech provider", () => {
      const result = getWebSpeechVoices();
      expect(result.provider).toBe("web_speech");
    });

    it("should return empty voices array", () => {
      const result = getWebSpeechVoices();
      expect(result.voices).toEqual([]);
    });

    it("should return null default", () => {
      const result = getWebSpeechVoices();
      expect(result.default).toBeNull();
    });

    it("should have a message explaining browser voices", () => {
      const result = getWebSpeechVoices();
      expect(result.message).toContain("Web Speech API");
      expect(result.message).toContain("browser");
    });

    it("should have a note about getting browser voices", () => {
      const result = getWebSpeechVoices();
      expect(result.note).toContain("window.speechSynthesis.getVoices()");
    });
  });

  describe("getOpenAIVoices", () => {
    it("should return openai provider", () => {
      const result = getOpenAIVoices();
      expect(result.provider).toBe("openai");
    });

    it("should return all 6 OpenAI voices", () => {
      const result = getOpenAIVoices();
      expect(result.voices).toHaveLength(6);
    });

    it("should return alloy as default", () => {
      const result = getOpenAIVoices();
      expect(result.default).toBe("alloy");
    });

    it("should have a message about OpenAI voices", () => {
      const result = getOpenAIVoices();
      expect(result.message).toContain("OpenAI TTS");
      expect(result.message).toContain("6");
    });

    it("should mention upgrade to Scholar", () => {
      const result = getOpenAIVoices();
      expect(result.message).toContain("Scholar");
    });
  });

  describe("getElevenLabsVoices", () => {
    it("should return elevenlabs provider", () => {
      const result = getElevenLabsVoices();
      expect(result.provider).toBe("elevenlabs");
    });

    it("should return at least 40 voices", () => {
      const result = getElevenLabsVoices();
      expect(result.voices.length).toBeGreaterThanOrEqual(40);
    });

    it("should return rachel as default", () => {
      const result = getElevenLabsVoices();
      expect(result.default).toBe("rachel");
    });

    it("should have a message about ElevenLabs voices", () => {
      const result = getElevenLabsVoices();
      expect(result.message).toContain("ElevenLabs");
      expect(result.message).toContain("40+");
    });
  });

  describe("getVoicesForProvider", () => {
    it("should return web speech voices for web_speech provider", () => {
      const result = getVoicesForProvider("web_speech");
      expect(result.provider).toBe("web_speech");
      expect(result.voices).toEqual([]);
    });

    it("should return OpenAI voices for openai provider", () => {
      const result = getVoicesForProvider("openai");
      expect(result.provider).toBe("openai");
      expect(result.voices).toHaveLength(6);
    });

    it("should return ElevenLabs voices for elevenlabs provider", () => {
      const result = getVoicesForProvider("elevenlabs");
      expect(result.provider).toBe("elevenlabs");
      expect(result.voices.length).toBeGreaterThanOrEqual(40);
    });

    it("should default to web speech for unknown provider", () => {
      const result = getVoicesForProvider("unknown" as TTSProvider);
      expect(result.provider).toBe("web_speech");
    });
  });
});

// ============================================================================
// Helper Functions Tests
// ============================================================================

describe("Helper Functions", () => {
  describe("getVoiceCount", () => {
    it("should return 6 for OpenAI", () => {
      expect(getVoiceCount("openai")).toBe(6);
    });

    it("should return 40+ for ElevenLabs", () => {
      expect(getVoiceCount("elevenlabs")).toBeGreaterThanOrEqual(40);
    });

    it("should return 0 for Web Speech (browser-dependent)", () => {
      expect(getVoiceCount("web_speech")).toBe(0);
    });

    it("should return 0 for unknown provider", () => {
      expect(getVoiceCount("unknown" as TTSProvider)).toBe(0);
    });
  });

  describe("findVoiceById", () => {
    it("should find OpenAI voice by ID", () => {
      const voice = findVoiceById("openai", "alloy");
      expect(voice).toBeDefined();
      expect(voice?.id).toBe("alloy");
      expect(voice?.name).toBe("Alloy");
    });

    it("should find ElevenLabs voice by ID", () => {
      const voice = findVoiceById("elevenlabs", "rachel");
      expect(voice).toBeDefined();
      expect(voice?.id).toBe("rachel");
      expect(voice?.name).toBe("Rachel");
    });

    it("should return undefined for non-existent OpenAI voice", () => {
      const voice = findVoiceById("openai", "nonexistent");
      expect(voice).toBeUndefined();
    });

    it("should return undefined for non-existent ElevenLabs voice", () => {
      const voice = findVoiceById("elevenlabs", "nonexistent");
      expect(voice).toBeUndefined();
    });

    it("should return undefined for Web Speech (no predefined voices)", () => {
      const voice = findVoiceById("web_speech", "any");
      expect(voice).toBeUndefined();
    });

    it("should return undefined for unknown provider", () => {
      const voice = findVoiceById("unknown" as TTSProvider, "alloy");
      expect(voice).toBeUndefined();
    });
  });

  describe("filterVoicesByGender", () => {
    it("should filter OpenAI voices by male gender", () => {
      const maleVoices = filterVoicesByGender(OPENAI_VOICES, "male");
      expect(maleVoices.length).toBeGreaterThan(0);
      for (const voice of maleVoices) {
        expect(voice.gender).toBe("male");
      }
    });

    it("should filter OpenAI voices by female gender", () => {
      const femaleVoices = filterVoicesByGender(OPENAI_VOICES, "female");
      expect(femaleVoices.length).toBeGreaterThan(0);
      for (const voice of femaleVoices) {
        expect(voice.gender).toBe("female");
      }
    });

    it("should filter OpenAI voices by neutral gender", () => {
      const neutralVoices = filterVoicesByGender(OPENAI_VOICES, "neutral");
      expect(neutralVoices.length).toBeGreaterThan(0);
      for (const voice of neutralVoices) {
        expect(voice.gender).toBe("neutral");
      }
    });

    it("should filter ElevenLabs voices by male gender", () => {
      const maleVoices = filterVoicesByGender(ELEVENLABS_VOICES, "male");
      expect(maleVoices.length).toBeGreaterThan(0);
      for (const voice of maleVoices) {
        expect(voice.gender).toBe("male");
      }
    });

    it("should filter ElevenLabs voices by female gender", () => {
      const femaleVoices = filterVoicesByGender(ELEVENLABS_VOICES, "female");
      expect(femaleVoices.length).toBeGreaterThan(0);
      for (const voice of femaleVoices) {
        expect(voice.gender).toBe("female");
      }
    });

    it("should return empty array for empty input", () => {
      const filtered = filterVoicesByGender([], "male");
      expect(filtered).toEqual([]);
    });
  });
});

// ============================================================================
// Response Structure Tests
// ============================================================================

describe("Response Structure", () => {
  describe("WebSpeechVoicesResponse", () => {
    it("should have correct structure", () => {
      const response = getWebSpeechVoices();
      expect(response).toHaveProperty("provider", "web_speech");
      expect(response).toHaveProperty("voices");
      expect(response).toHaveProperty("default");
      expect(response).toHaveProperty("message");
      expect(response).toHaveProperty("note");
    });
  });

  describe("OpenAIVoicesResponse", () => {
    it("should have correct structure", () => {
      const response = getOpenAIVoices();
      expect(response).toHaveProperty("provider", "openai");
      expect(response).toHaveProperty("voices");
      expect(response).toHaveProperty("default");
      expect(response).toHaveProperty("message");
    });

    it("should not have note property", () => {
      const response = getOpenAIVoices();
      expect(response).not.toHaveProperty("note");
    });
  });

  describe("ElevenLabsVoicesResponse", () => {
    it("should have correct structure", () => {
      const response = getElevenLabsVoices();
      expect(response).toHaveProperty("provider", "elevenlabs");
      expect(response).toHaveProperty("voices");
      expect(response).toHaveProperty("default");
      expect(response).toHaveProperty("message");
    });

    it("should not have note property", () => {
      const response = getElevenLabsVoices();
      expect(response).not.toHaveProperty("note");
    });
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export TTSProvider type", () => {
    const provider: TTSProvider = "openai";
    expect(["web_speech", "openai", "elevenlabs"]).toContain(provider);
  });

  it("should export VoiceOption type", () => {
    const voice: VoiceOption = {
      id: "test",
      name: "Test Voice",
      description: "A test voice",
      gender: "neutral",
      language: "en",
    };
    expect(voice.id).toBe("test");
    expect(voice.name).toBe("Test Voice");
  });

  it("should export WebSpeechVoicesResponse type", () => {
    const response: WebSpeechVoicesResponse = getWebSpeechVoices();
    expect(response.provider).toBe("web_speech");
  });

  it("should export OpenAIVoicesResponse type", () => {
    const response: OpenAIVoicesResponse = getOpenAIVoices();
    expect(response.provider).toBe("openai");
  });

  it("should export ElevenLabsVoicesResponse type", () => {
    const response: ElevenLabsVoicesResponse = getElevenLabsVoices();
    expect(response.provider).toBe("elevenlabs");
  });

  it("should export VoicesResponse union type", () => {
    const responses: VoicesResponse[] = [
      getWebSpeechVoices(),
      getOpenAIVoices(),
      getElevenLabsVoices(),
    ];
    expect(responses).toHaveLength(3);
  });
});

// ============================================================================
// Voice Quality Tests
// ============================================================================

describe("Voice Quality", () => {
  describe("Voice Descriptions", () => {
    it("should have non-empty descriptions for all OpenAI voices", () => {
      for (const voice of OPENAI_VOICES) {
        expect(voice.description).toBeTruthy();
        expect(voice.description).toBeDefined();
        if (voice.description) {
          expect(voice.description.length).toBeGreaterThan(5);
        }
      }
    });

    it("should have non-empty descriptions for all ElevenLabs voices", () => {
      for (const voice of ELEVENLABS_VOICES) {
        expect(voice.description).toBeTruthy();
        expect(voice.description).toBeDefined();
        if (voice.description) {
          expect(voice.description.length).toBeGreaterThan(5);
        }
      }
    });
  });

  describe("Voice Names", () => {
    it("should have capitalized names for all OpenAI voices", () => {
      for (const voice of OPENAI_VOICES) {
        const firstChar = voice.name[0];
        expect(firstChar).toBeDefined();
        expect(firstChar).toBe(firstChar?.toUpperCase());
      }
    });

    it("should have capitalized names for all ElevenLabs voices", () => {
      for (const voice of ELEVENLABS_VOICES) {
        const firstChar = voice.name[0];
        expect(firstChar).toBeDefined();
        expect(firstChar).toBe(firstChar?.toUpperCase());
      }
    });
  });

  describe("Voice ID Consistency", () => {
    it("should have lowercase IDs for all OpenAI voices", () => {
      for (const voice of OPENAI_VOICES) {
        expect(voice.id).toBe(voice.id.toLowerCase());
      }
    });

    it("should have lowercase IDs for all ElevenLabs voices", () => {
      for (const voice of ELEVENLABS_VOICES) {
        expect(voice.id).toBe(voice.id.toLowerCase());
      }
    });
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  it("should handle case sensitivity in findVoiceById", () => {
    const voice = findVoiceById("openai", "ALLOY");
    expect(voice).toBeUndefined(); // IDs are case-sensitive
  });

  it("should handle empty string voice ID", () => {
    const voice = findVoiceById("openai", "");
    expect(voice).toBeUndefined();
  });

  it("should handle whitespace voice ID", () => {
    const voice = findVoiceById("openai", "  ");
    expect(voice).toBeUndefined();
  });

  it("should handle special characters in voice ID", () => {
    const voice = findVoiceById("openai", "<script>");
    expect(voice).toBeUndefined();
  });

  it("should correctly sum male and female voices for OpenAI", () => {
    const maleVoices = filterVoicesByGender(OPENAI_VOICES, "male");
    const femaleVoices = filterVoicesByGender(OPENAI_VOICES, "female");
    const neutralVoices = filterVoicesByGender(OPENAI_VOICES, "neutral");
    expect(maleVoices.length + femaleVoices.length + neutralVoices.length).toBe(
      OPENAI_VOICES.length
    );
  });

  it("should correctly sum male and female voices for ElevenLabs", () => {
    const maleVoices = filterVoicesByGender(ELEVENLABS_VOICES, "male");
    const femaleVoices = filterVoicesByGender(ELEVENLABS_VOICES, "female");
    const neutralVoices = filterVoicesByGender(ELEVENLABS_VOICES, "neutral");
    expect(maleVoices.length + femaleVoices.length + neutralVoices.length).toBe(
      ELEVENLABS_VOICES.length
    );
  });
});

// ============================================================================
// Integration Scenario Tests
// ============================================================================

describe("Integration Scenarios", () => {
  it("should simulate Free tier user flow", () => {
    const provider: TTSProvider = "web_speech";
    const voices = getVoicesForProvider(provider);

    expect(voices.provider).toBe("web_speech");
    expect(voices.voices).toEqual([]);
    expect(voices.default).toBeNull();
    expect(getVoiceCount(provider)).toBe(0);
  });

  it("should simulate Pro tier user flow", () => {
    const provider: TTSProvider = "openai";
    const voices = getVoicesForProvider(provider);

    expect(voices.provider).toBe("openai");
    expect(voices.voices).toHaveLength(6);
    expect(voices.default).toBe("alloy");
    expect(getVoiceCount(provider)).toBe(6);

    // Can find specific voice
    const alloy = findVoiceById(provider, "alloy");
    expect(alloy).toBeDefined();
    expect(alloy?.name).toBe("Alloy");

    // Can filter by gender
    const femaleVoices = filterVoicesByGender(voices.voices, "female");
    expect(femaleVoices.length).toBeGreaterThan(0);
  });

  it("should simulate Scholar tier user flow", () => {
    const provider: TTSProvider = "elevenlabs";
    const voices = getVoicesForProvider(provider);

    expect(voices.provider).toBe("elevenlabs");
    expect(voices.voices.length).toBeGreaterThanOrEqual(40);
    expect(voices.default).toBe("rachel");
    expect(getVoiceCount(provider)).toBeGreaterThanOrEqual(40);

    // Can find specific voice
    const rachel = findVoiceById(provider, "rachel");
    expect(rachel).toBeDefined();
    expect(rachel?.name).toBe("Rachel");

    // Can filter by gender
    const maleVoices = filterVoicesByGender(voices.voices, "male");
    const femaleVoices = filterVoicesByGender(voices.voices, "female");
    expect(maleVoices.length).toBeGreaterThan(10);
    expect(femaleVoices.length).toBeGreaterThan(10);
  });

  it("should allow voice selection workflow", () => {
    // User wants to select a female voice for Scholar tier
    const provider: TTSProvider = "elevenlabs";
    const voices = getVoicesForProvider(provider);

    // Filter to female voices
    const femaleVoices = filterVoicesByGender(voices.voices, "female");

    // Find a specific voice
    const bella = femaleVoices.find((v) => v.id === "bella");
    expect(bella).toBeDefined();
    expect(bella?.description).toContain("Soft");

    // Verify the voice exists in the full list
    if (bella) {
      const found = findVoiceById(provider, bella.id);
      expect(found).toEqual(bella);
    }
  });
});
