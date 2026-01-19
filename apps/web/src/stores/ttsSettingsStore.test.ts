/**
 * Tests for TTS Settings store
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  useTTSSettingsStore,
  DEFAULT_TTS_SETTINGS,
  validateRate,
  validatePitch,
  validateVolume,
  validateProvider,
  validateHighlightColor,
  sanitizeTTSSettings,
  clampValue,
  RATE_RANGE,
  PITCH_RANGE,
  VOLUME_RANGE,
  type TTSSettings,
} from "./ttsSettingsStore";

describe("TTS Settings Store - Utilities", () => {
  describe("clampValue", () => {
    it("should clamp value within range", () => {
      expect(clampValue(0.5, 0, 1)).toBe(0.5);
      expect(clampValue(-1, 0, 1)).toBe(0);
      expect(clampValue(2, 0, 1)).toBe(1);
    });

    it("should handle edge cases", () => {
      expect(clampValue(0, 0, 1)).toBe(0);
      expect(clampValue(1, 0, 1)).toBe(1);
    });
  });

  describe("validateRate", () => {
    it("should accept valid rates", () => {
      expect(validateRate(1.0)).toBe(1.0);
      expect(validateRate(0.5)).toBe(0.5);
      expect(validateRate(2.0)).toBe(2.0);
    });

    it("should clamp invalid rates", () => {
      expect(validateRate(0.1)).toBe(RATE_RANGE.min);
      expect(validateRate(3.0)).toBe(RATE_RANGE.max);
    });
  });

  describe("validatePitch", () => {
    it("should accept valid pitches", () => {
      expect(validatePitch(1.0)).toBe(1.0);
      expect(validatePitch(0.5)).toBe(0.5);
      expect(validatePitch(2.0)).toBe(2.0);
    });

    it("should clamp invalid pitches", () => {
      expect(validatePitch(0.1)).toBe(PITCH_RANGE.min);
      expect(validatePitch(3.0)).toBe(PITCH_RANGE.max);
    });
  });

  describe("validateVolume", () => {
    it("should accept valid volumes", () => {
      expect(validateVolume(0.5)).toBe(0.5);
      expect(validateVolume(0)).toBe(0);
      expect(validateVolume(1)).toBe(1);
    });

    it("should clamp invalid volumes", () => {
      expect(validateVolume(-0.5)).toBe(VOLUME_RANGE.min);
      expect(validateVolume(2)).toBe(VOLUME_RANGE.max);
    });
  });

  describe("validateProvider", () => {
    it("should accept valid providers", () => {
      expect(validateProvider("web_speech")).toBe("web_speech");
      expect(validateProvider("openai")).toBe("openai");
      expect(validateProvider("elevenlabs")).toBe("elevenlabs");
    });

    it("should default to web_speech for invalid providers", () => {
      expect(validateProvider("invalid")).toBe("web_speech");
      expect(validateProvider("")).toBe("web_speech");
    });
  });

  describe("validateHighlightColor", () => {
    it("should accept valid hex colors", () => {
      expect(validateHighlightColor("#FFEB3B")).toBe("#FFEB3B");
      expect(validateHighlightColor("#ff0000")).toBe("#ff0000");
    });

    it("should accept valid rgba colors", () => {
      expect(validateHighlightColor("rgba(255, 235, 59, 0.3)")).toBe(
        "rgba(255, 235, 59, 0.3)"
      );
      expect(validateHighlightColor("rgb(255, 0, 0)")).toBe("rgb(255, 0, 0)");
    });

    it("should default to default color for invalid colors", () => {
      expect(validateHighlightColor("invalid")).toBe(
        DEFAULT_TTS_SETTINGS.highlightColor
      );
      expect(validateHighlightColor("")).toBe(
        DEFAULT_TTS_SETTINGS.highlightColor
      );
    });
  });

  describe("sanitizeTTSSettings", () => {
    it("should return default settings for empty input", () => {
      const result = sanitizeTTSSettings({});
      expect(result).toEqual(DEFAULT_TTS_SETTINGS);
    });

    it("should validate and sanitize all settings", () => {
      const result = sanitizeTTSSettings({
        enabled: true,
        rate: 3.0, // Should be clamped to 2.0
        pitch: 0.1, // Should be clamped to 0.5
        volume: -1, // Should be clamped to 0
        preferredProvider: "invalid" as never, // Should default to web_speech
        highlightColor: "invalid", // Should default
      });

      expect(result.enabled).toBe(true);
      expect(result.rate).toBe(2.0);
      expect(result.pitch).toBe(0.5);
      expect(result.volume).toBe(0);
      expect(result.preferredProvider).toBe("web_speech");
      expect(result.highlightColor).toBe(DEFAULT_TTS_SETTINGS.highlightColor);
    });

    it("should preserve valid settings", () => {
      const validSettings: Partial<TTSSettings> = {
        enabled: false,
        selectedVoiceId: "openai-alloy",
        preferredProvider: "openai",
        rate: 1.5,
        pitch: 1.2,
        volume: 0.8,
        preferredLanguage: "en-US",
        highlightText: false,
        highlightColor: "#FF0000",
        autoScroll: false,
        autoPlay: true,
      };

      const result = sanitizeTTSSettings(validSettings);
      expect(result.enabled).toBe(false);
      expect(result.selectedVoiceId).toBe("openai-alloy");
      expect(result.preferredProvider).toBe("openai");
      expect(result.rate).toBe(1.5);
      expect(result.pitch).toBe(1.2);
      expect(result.volume).toBe(0.8);
      expect(result.preferredLanguage).toBe("en-US");
      expect(result.highlightText).toBe(false);
      expect(result.highlightColor).toBe("#FF0000");
      expect(result.autoScroll).toBe(false);
      expect(result.autoPlay).toBe(true);
    });

    it("should handle null selectedVoiceId", () => {
      const result = sanitizeTTSSettings({ selectedVoiceId: null });
      expect(result.selectedVoiceId).toBe(null);
    });

    it("should handle invalid types gracefully", () => {
      const result = sanitizeTTSSettings({
        enabled: "true" as never, // Should default to true
        rate: "fast" as never, // Should default to 1.0
        pitch: {} as never, // Should default to 1.0
        volume: [] as never, // Should default to 1.0
        highlightText: 1 as never, // Should default to true
      });

      expect(result.enabled).toBe(DEFAULT_TTS_SETTINGS.enabled);
      expect(result.rate).toBe(DEFAULT_TTS_SETTINGS.rate);
      expect(result.pitch).toBe(DEFAULT_TTS_SETTINGS.pitch);
      expect(result.volume).toBe(DEFAULT_TTS_SETTINGS.volume);
      expect(result.highlightText).toBe(DEFAULT_TTS_SETTINGS.highlightText);
    });
  });
});

describe("TTS Settings Store - Zustand Store", () => {
  beforeEach(() => {
    // Reset to defaults before each test
    const { resetSettings } = useTTSSettingsStore.getState();
    resetSettings();
  });

  describe("Initial State", () => {
    it("should have default settings", () => {
      const { settings } = useTTSSettingsStore.getState();
      expect(settings).toEqual(DEFAULT_TTS_SETTINGS);
    });
  });

  describe("updateSettings", () => {
    it("should update multiple settings at once", () => {
      const { updateSettings, settings: initialSettings } =
        useTTSSettingsStore.getState();

      updateSettings({
        enabled: false,
        rate: 1.5,
        volume: 0.7,
      });

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.enabled).toBe(false);
      expect(settings.rate).toBe(1.5);
      expect(settings.volume).toBe(0.7);
      // Other settings should remain unchanged
      expect(settings.pitch).toBe(initialSettings.pitch);
      expect(settings.highlightText).toBe(initialSettings.highlightText);
    });

    it("should sanitize settings on update", () => {
      const { updateSettings } = useTTSSettingsStore.getState();

      updateSettings({
        rate: 5.0, // Should be clamped
        highlightColor: "invalid", // Should default
      });

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.rate).toBe(2.0);
      expect(settings.highlightColor).toBe(DEFAULT_TTS_SETTINGS.highlightColor);
    });
  });

  describe("Individual Setters", () => {
    it("should set enabled state", () => {
      const { setEnabled } = useTTSSettingsStore.getState();
      setEnabled(false);

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.enabled).toBe(false);
    });

    it("should set selected voice ID", () => {
      const { setSelectedVoiceId } = useTTSSettingsStore.getState();
      setSelectedVoiceId("openai-alloy");

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.selectedVoiceId).toBe("openai-alloy");
    });

    it("should set selected voice ID to null", () => {
      const { setSelectedVoiceId } = useTTSSettingsStore.getState();
      setSelectedVoiceId(null);

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.selectedVoiceId).toBe(null);
    });

    it("should set preferred provider", () => {
      const { setPreferredProvider } = useTTSSettingsStore.getState();
      setPreferredProvider("openai");

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.preferredProvider).toBe("openai");
    });

    it("should validate provider when setting", () => {
      const { setPreferredProvider } = useTTSSettingsStore.getState();
      setPreferredProvider("invalid" as never);

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.preferredProvider).toBe("web_speech");
    });

    it("should set rate", () => {
      const { setRate } = useTTSSettingsStore.getState();
      setRate(1.5);

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.rate).toBe(1.5);
    });

    it("should validate rate when setting", () => {
      const { setRate } = useTTSSettingsStore.getState();
      setRate(5.0);

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.rate).toBe(2.0);
    });

    it("should set pitch", () => {
      const { setPitch } = useTTSSettingsStore.getState();
      setPitch(1.2);

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.pitch).toBe(1.2);
    });

    it("should set volume", () => {
      const { setVolume } = useTTSSettingsStore.getState();
      setVolume(0.5);

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.volume).toBe(0.5);
    });

    it("should set preferred language", () => {
      const { setPreferredLanguage } = useTTSSettingsStore.getState();
      setPreferredLanguage("es-ES");

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.preferredLanguage).toBe("es-ES");
    });

    it("should set highlight text", () => {
      const { setHighlightText } = useTTSSettingsStore.getState();
      setHighlightText(false);

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.highlightText).toBe(false);
    });

    it("should set highlight color", () => {
      const { setHighlightColor } = useTTSSettingsStore.getState();
      setHighlightColor("#FF0000");

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.highlightColor).toBe("#FF0000");
    });

    it("should validate highlight color when setting", () => {
      const { setHighlightColor } = useTTSSettingsStore.getState();
      setHighlightColor("invalid");

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.highlightColor).toBe(DEFAULT_TTS_SETTINGS.highlightColor);
    });

    it("should set auto scroll", () => {
      const { setAutoScroll } = useTTSSettingsStore.getState();
      setAutoScroll(false);

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.autoScroll).toBe(false);
    });

    it("should set auto play", () => {
      const { setAutoPlay } = useTTSSettingsStore.getState();
      setAutoPlay(true);

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.autoPlay).toBe(true);
    });
  });

  describe("resetSettings", () => {
    it("should reset all settings to defaults", () => {
      const { updateSettings, resetSettings } = useTTSSettingsStore.getState();

      // Make some changes
      updateSettings({
        enabled: false,
        rate: 1.5,
        pitch: 1.2,
        volume: 0.5,
        highlightText: false,
        autoPlay: true,
      });

      // Reset
      resetSettings();

      const { settings } = useTTSSettingsStore.getState();
      expect(settings).toEqual(DEFAULT_TTS_SETTINGS);
    });
  });

  describe("State Persistence", () => {
    it("should maintain state between multiple calls", () => {
      const { setRate, setVolume, setPitch } = useTTSSettingsStore.getState();

      setRate(1.5);
      setVolume(0.7);
      setPitch(1.1);

      const { settings } = useTTSSettingsStore.getState();
      expect(settings.rate).toBe(1.5);
      expect(settings.volume).toBe(0.7);
      expect(settings.pitch).toBe(1.1);
    });
  });
});
