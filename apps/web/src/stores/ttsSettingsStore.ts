/**
 * TTS Settings store for Read Master
 *
 * Manages Text-to-Speech preferences with localStorage persistence.
 * Controls voice selection, playback speed, volume, highlighting, and auto-play settings.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TTSProvider } from "@/components/reader/ttsTypes";

export const TTS_SETTINGS_STORAGE_KEY = "read-master-tts-settings-v2";

/**
 * TTS settings interface
 */
export interface TTSSettings {
  /** Whether TTS is enabled globally */
  enabled: boolean;
  /** Selected voice ID (e.g., "web-Google_US_English", "openai-alloy", "elevenlabs-rachel") */
  selectedVoiceId: string | null;
  /** Preferred provider (web_speech, openai, elevenlabs) */
  preferredProvider: TTSProvider;
  /** Speech rate (0.5 - 2.0) */
  rate: number;
  /** Pitch (0.5 - 2.0, only for web_speech) */
  pitch: number;
  /** Volume (0 - 1) */
  volume: number;
  /** Preferred language code for voice selection (e.g., "en-US") */
  preferredLanguage: string;
  /** Whether to highlight text during speech */
  highlightText: boolean;
  /** Custom highlight color (hex or rgba) */
  highlightColor: string;
  /** Auto-scroll to keep highlighted text visible */
  autoScroll: boolean;
  /** Auto-play TTS when opening a book */
  autoPlay: boolean;
}

/**
 * Partial TTS settings for updates
 */
export type PartialTTSSettings = Partial<TTSSettings>;

/**
 * Rate range constants
 */
export const RATE_RANGE = {
  min: 0.5,
  max: 2.0,
  step: 0.1,
  default: 1.0,
} as const;

/**
 * Pitch range constants
 */
export const PITCH_RANGE = {
  min: 0.5,
  max: 2.0,
  step: 0.1,
  default: 1.0,
} as const;

/**
 * Volume range constants
 */
export const VOLUME_RANGE = {
  min: 0,
  max: 1,
  step: 0.1,
  default: 1.0,
} as const;

/**
 * Default TTS settings
 */
export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  enabled: true,
  selectedVoiceId: null,
  preferredProvider: "web_speech",
  rate: RATE_RANGE.default,
  pitch: PITCH_RANGE.default,
  volume: VOLUME_RANGE.default,
  preferredLanguage: "en-US",
  highlightText: true,
  highlightColor: "rgba(255, 235, 59, 0.3)", // Yellow highlight
  autoScroll: true,
  autoPlay: false,
};

/**
 * Highlight color presets
 */
export const HIGHLIGHT_COLOR_PRESETS = [
  { name: "Yellow", value: "rgba(255, 235, 59, 0.3)" },
  { name: "Green", value: "rgba(139, 195, 74, 0.3)" },
  { name: "Blue", value: "rgba(33, 150, 243, 0.3)" },
  { name: "Orange", value: "rgba(255, 152, 0, 0.3)" },
  { name: "Pink", value: "rgba(233, 30, 99, 0.3)" },
  { name: "Purple", value: "rgba(156, 39, 176, 0.3)" },
] as const;

/**
 * Validation functions
 */

/**
 * Clamp a value within a range
 */
export function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Validate rate value
 */
export function validateRate(rate: number): number {
  return clampValue(rate, RATE_RANGE.min, RATE_RANGE.max);
}

/**
 * Validate pitch value
 */
export function validatePitch(pitch: number): number {
  return clampValue(pitch, PITCH_RANGE.min, PITCH_RANGE.max);
}

/**
 * Validate volume value
 */
export function validateVolume(volume: number): number {
  return clampValue(volume, VOLUME_RANGE.min, VOLUME_RANGE.max);
}

/**
 * Validate TTS provider
 */
export function validateProvider(provider: string): TTSProvider {
  const validProviders: TTSProvider[] = ["web_speech", "openai", "elevenlabs"];
  return validProviders.includes(provider as TTSProvider)
    ? (provider as TTSProvider)
    : "web_speech";
}

/**
 * Validate highlight color (basic check for hex or rgba)
 */
export function validateHighlightColor(color: string): string {
  const hexPattern = /^#[0-9A-Fa-f]{6}$/;
  const rgbaPattern =
    /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)$/;
  return hexPattern.test(color) || rgbaPattern.test(color)
    ? color
    : DEFAULT_TTS_SETTINGS.highlightColor;
}

/**
 * Sanitize TTS settings - ensure all values are valid
 */
export function sanitizeTTSSettings(
  settings: Partial<TTSSettings>
): TTSSettings {
  return {
    enabled:
      typeof settings.enabled === "boolean"
        ? settings.enabled
        : DEFAULT_TTS_SETTINGS.enabled,
    selectedVoiceId:
      typeof settings.selectedVoiceId === "string" ||
      settings.selectedVoiceId === null
        ? settings.selectedVoiceId
        : DEFAULT_TTS_SETTINGS.selectedVoiceId,
    preferredProvider:
      typeof settings.preferredProvider === "string"
        ? validateProvider(settings.preferredProvider)
        : DEFAULT_TTS_SETTINGS.preferredProvider,
    rate:
      typeof settings.rate === "number"
        ? validateRate(settings.rate)
        : DEFAULT_TTS_SETTINGS.rate,
    pitch:
      typeof settings.pitch === "number"
        ? validatePitch(settings.pitch)
        : DEFAULT_TTS_SETTINGS.pitch,
    volume:
      typeof settings.volume === "number"
        ? validateVolume(settings.volume)
        : DEFAULT_TTS_SETTINGS.volume,
    preferredLanguage:
      typeof settings.preferredLanguage === "string"
        ? settings.preferredLanguage
        : DEFAULT_TTS_SETTINGS.preferredLanguage,
    highlightText:
      typeof settings.highlightText === "boolean"
        ? settings.highlightText
        : DEFAULT_TTS_SETTINGS.highlightText,
    highlightColor:
      typeof settings.highlightColor === "string"
        ? validateHighlightColor(settings.highlightColor)
        : DEFAULT_TTS_SETTINGS.highlightColor,
    autoScroll:
      typeof settings.autoScroll === "boolean"
        ? settings.autoScroll
        : DEFAULT_TTS_SETTINGS.autoScroll,
    autoPlay:
      typeof settings.autoPlay === "boolean"
        ? settings.autoPlay
        : DEFAULT_TTS_SETTINGS.autoPlay,
  };
}

/**
 * TTS Settings store interface
 */
interface TTSSettingsStore {
  /** Current TTS settings */
  settings: TTSSettings;

  /** Update multiple settings at once */
  updateSettings: (updates: PartialTTSSettings) => void;

  /** Set TTS enabled/disabled */
  setEnabled: (enabled: boolean) => void;

  /** Set selected voice */
  setSelectedVoiceId: (voiceId: string | null) => void;

  /** Set preferred provider */
  setPreferredProvider: (provider: TTSProvider) => void;

  /** Set speech rate */
  setRate: (rate: number) => void;

  /** Set pitch */
  setPitch: (pitch: number) => void;

  /** Set volume */
  setVolume: (volume: number) => void;

  /** Set preferred language */
  setPreferredLanguage: (language: string) => void;

  /** Set highlight text enabled */
  setHighlightText: (enabled: boolean) => void;

  /** Set highlight color */
  setHighlightColor: (color: string) => void;

  /** Set auto-scroll enabled */
  setAutoScroll: (enabled: boolean) => void;

  /** Set auto-play enabled */
  setAutoPlay: (enabled: boolean) => void;

  /** Reset all settings to defaults */
  resetSettings: () => void;
}

/**
 * TTS Settings Zustand store
 */
export const useTTSSettingsStore = create<TTSSettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_TTS_SETTINGS,

      updateSettings: (updates) =>
        set((state) => ({
          settings: sanitizeTTSSettings({ ...state.settings, ...updates }),
        })),

      setEnabled: (enabled) =>
        set((state) => ({
          settings: { ...state.settings, enabled },
        })),

      setSelectedVoiceId: (voiceId) =>
        set((state) => ({
          settings: { ...state.settings, selectedVoiceId: voiceId },
        })),

      setPreferredProvider: (provider) =>
        set((state) => ({
          settings: {
            ...state.settings,
            preferredProvider: validateProvider(provider),
          },
        })),

      setRate: (rate) =>
        set((state) => ({
          settings: { ...state.settings, rate: validateRate(rate) },
        })),

      setPitch: (pitch) =>
        set((state) => ({
          settings: { ...state.settings, pitch: validatePitch(pitch) },
        })),

      setVolume: (volume) =>
        set((state) => ({
          settings: { ...state.settings, volume: validateVolume(volume) },
        })),

      setPreferredLanguage: (language) =>
        set((state) => ({
          settings: { ...state.settings, preferredLanguage: language },
        })),

      setHighlightText: (enabled) =>
        set((state) => ({
          settings: { ...state.settings, highlightText: enabled },
        })),

      setHighlightColor: (color) =>
        set((state) => ({
          settings: {
            ...state.settings,
            highlightColor: validateHighlightColor(color),
          },
        })),

      setAutoScroll: (enabled) =>
        set((state) => ({
          settings: { ...state.settings, autoScroll: enabled },
        })),

      setAutoPlay: (enabled) =>
        set((state) => ({
          settings: { ...state.settings, autoPlay: enabled },
        })),

      resetSettings: () =>
        set({
          settings: { ...DEFAULT_TTS_SETTINGS },
        }),
    }),
    {
      name: TTS_SETTINGS_STORAGE_KEY,
      version: 1,
      // Migration function for future versions
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          // Sanitize old settings
          return sanitizeTTSSettings(persistedState as Partial<TTSSettings>);
        }
        return persistedState as TTSSettingsStore;
      },
    }
  )
);
