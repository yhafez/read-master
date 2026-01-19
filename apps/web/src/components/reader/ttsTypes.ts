/**
 * TTS (Text-to-Speech) Types and Utilities
 *
 * Provides client-side TTS functionality using:
 * - Web Speech API (free tier - browser-based)
 * - API-backed TTS for OpenAI/ElevenLabs (Pro/Scholar tiers)
 *
 * Features:
 * - Play/pause/stop controls
 * - Voice selection with Web Speech fallback
 * - Speed control (0.5x - 2x)
 * - Text highlighting during speech
 * - Settings persistence
 */

// ============================================================================
// Types
// ============================================================================

/**
 * TTS provider types matching backend
 */
export type TTSProvider = "web_speech" | "openai" | "elevenlabs";

/**
 * TTS playback state
 */
export type TTSPlaybackState = "idle" | "loading" | "playing" | "paused";

/**
 * Voice source information
 */
export interface TTSVoice {
  /** Unique voice ID */
  id: string;
  /** Display name */
  name: string;
  /** Language code (e.g., 'en-US') */
  lang: string;
  /** Provider this voice belongs to */
  provider: TTSProvider;
  /** Whether this is a premium voice */
  isPremium: boolean;
  /** Optional description */
  description?: string;
}

/**
 * Web Speech API voice wrapper
 */
export interface WebSpeechVoiceInfo {
  /** SpeechSynthesisVoice name */
  name: string;
  /** Language */
  lang: string;
  /** Whether it's a local voice */
  localService: boolean;
  /** Whether it's the default voice */
  default: boolean;
  /** Voice URI */
  voiceURI: string;
}

/**
 * TTS settings persisted to localStorage
 */
export interface TTSSettings {
  /** Whether TTS is enabled */
  enabled: boolean;
  /** Selected voice ID */
  selectedVoiceId: string | null;
  /** Preferred provider */
  preferredProvider: TTSProvider;
  /** Speech rate (0.5 - 2.0) */
  rate: number;
  /** Pitch (0.5 - 2.0) */
  pitch: number;
  /** Volume (0 - 1) */
  volume: number;
  /** Whether to highlight text during speech */
  highlightText: boolean;
  /** Auto-scroll to keep highlighted text visible */
  autoScroll: boolean;
  /** Preferred language code for voice selection */
  preferredLanguage: string;
}

/**
 * TTS playback position for highlighting
 */
export interface TTSPosition {
  /** Character offset in text */
  charIndex: number;
  /** Length of current utterance segment */
  charLength: number;
  /** Word being spoken (if available) */
  currentWord?: string;
  /** Sentence being spoken (if available) */
  currentSentence?: string;
}

/**
 * TTS error types
 */
export type TTSErrorType =
  | "not_supported"
  | "no_voices"
  | "voice_not_found"
  | "synthesis_error"
  | "network_error"
  | "rate_limited"
  | "unauthorized"
  | "cancelled";

/**
 * TTS error information
 */
export interface TTSError {
  type: TTSErrorType;
  message: string;
  details?: string;
}

/**
 * TTS state for the controls component
 */
export interface TTSState {
  /** Current playback state */
  playbackState: TTSPlaybackState;
  /** Current position in text */
  position: TTSPosition | null;
  /** Available voices */
  voices: TTSVoice[];
  /** Error if any */
  error: TTSError | null;
  /** Whether voices have been loaded */
  voicesLoaded: boolean;
  /** Text currently being spoken */
  currentText: string | null;
}

/**
 * TTS controls props
 */
export interface TTSControlsProps {
  /** Text to speak */
  text: string;
  /** User's subscription tier */
  tier?: "free" | "pro" | "scholar";
  /** Callback when playback state changes */
  onPlaybackChange?: (state: TTSPlaybackState) => void;
  /** Callback when position changes (for highlighting) */
  onPositionChange?: (position: TTSPosition | null) => void;
  /** Callback when error occurs */
  onError?: (error: TTSError) => void;
  /** Optional CSS class */
  className?: string;
  /** Whether to show as compact controls */
  compact?: boolean;
  /** Whether controls are disabled */
  disabled?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * LocalStorage key for TTS settings
 */
export const TTS_SETTINGS_KEY = "read-master-tts-settings";

/**
 * Default TTS settings
 */
export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  enabled: true,
  selectedVoiceId: null,
  preferredProvider: "web_speech",
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  highlightText: true,
  autoScroll: true,
  preferredLanguage: "en",
};

/**
 * Speech rate range
 */
export const RATE_RANGE = {
  min: 0.5,
  max: 2.0,
  step: 0.1,
  default: 1.0,
} as const;

/**
 * Pitch range
 */
export const PITCH_RANGE = {
  min: 0.5,
  max: 2.0,
  step: 0.1,
  default: 1.0,
} as const;

/**
 * Volume range
 */
export const VOLUME_RANGE = {
  min: 0,
  max: 1,
  step: 0.1,
  default: 1.0,
} as const;

/**
 * Rate preset labels for display
 */
export const RATE_PRESETS = [
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1.0, label: "1x" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
  { value: 2.0, label: "2x" },
] as const;

/**
 * OpenAI voice options (for Pro tier)
 */
export const OPENAI_VOICES: TTSVoice[] = [
  {
    id: "openai-alloy",
    name: "Alloy",
    lang: "en",
    provider: "openai",
    isPremium: true,
    description: "Neutral and balanced",
  },
  {
    id: "openai-echo",
    name: "Echo",
    lang: "en",
    provider: "openai",
    isPremium: true,
    description: "Warm and confident",
  },
  {
    id: "openai-fable",
    name: "Fable",
    lang: "en",
    provider: "openai",
    isPremium: true,
    description: "Expressive and dramatic",
  },
  {
    id: "openai-onyx",
    name: "Onyx",
    lang: "en",
    provider: "openai",
    isPremium: true,
    description: "Deep and authoritative",
  },
  {
    id: "openai-nova",
    name: "Nova",
    lang: "en",
    provider: "openai",
    isPremium: true,
    description: "Youthful and bright",
  },
  {
    id: "openai-shimmer",
    name: "Shimmer",
    lang: "en",
    provider: "openai",
    isPremium: true,
    description: "Clear and pleasant",
  },
];

/**
 * ElevenLabs voice options (for Scholar tier)
 */
export const ELEVENLABS_VOICES: TTSVoice[] = [
  {
    id: "elevenlabs-rachel",
    name: "Rachel",
    lang: "en",
    provider: "elevenlabs",
    isPremium: true,
    description: "American female",
  },
  {
    id: "elevenlabs-drew",
    name: "Drew",
    lang: "en",
    provider: "elevenlabs",
    isPremium: true,
    description: "American male",
  },
  {
    id: "elevenlabs-clyde",
    name: "Clyde",
    lang: "en",
    provider: "elevenlabs",
    isPremium: true,
    description: "War veteran",
  },
  {
    id: "elevenlabs-paul",
    name: "Paul",
    lang: "en",
    provider: "elevenlabs",
    isPremium: true,
    description: "Ground reporter",
  },
  {
    id: "elevenlabs-domi",
    name: "Domi",
    lang: "en",
    provider: "elevenlabs",
    isPremium: true,
    description: "Strong female",
  },
  {
    id: "elevenlabs-dave",
    name: "Dave",
    lang: "en",
    provider: "elevenlabs",
    isPremium: true,
    description: "British Essex",
  },
  {
    id: "elevenlabs-fin",
    name: "Fin",
    lang: "en",
    provider: "elevenlabs",
    isPremium: true,
    description: "Irish male",
  },
  {
    id: "elevenlabs-bella",
    name: "Bella",
    lang: "en",
    provider: "elevenlabs",
    isPremium: true,
    description: "Soft female",
  },
];

/**
 * Initial TTS state
 */
export const INITIAL_TTS_STATE: TTSState = {
  playbackState: "idle",
  position: null,
  voices: [],
  error: null,
  voicesLoaded: false,
  currentText: null,
};

// ============================================================================
// Web Speech API Utilities
// ============================================================================

/**
 * Check if Web Speech API is supported
 */
export function isWebSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

/**
 * Get available Web Speech voices
 */
export function getWebSpeechVoices(): SpeechSynthesisVoice[] {
  if (!isWebSpeechSupported()) return [];
  return window.speechSynthesis.getVoices();
}

/**
 * Convert Web Speech voice to TTSVoice
 */
export function convertWebSpeechVoice(voice: SpeechSynthesisVoice): TTSVoice {
  return {
    id: `web-${voice.voiceURI}`,
    name: voice.name,
    lang: voice.lang,
    provider: "web_speech",
    isPremium: false,
    description: voice.localService ? "Local" : "Network",
  };
}

/**
 * Get all Web Speech voices as TTSVoice array
 */
export function getAllWebSpeechVoices(): TTSVoice[] {
  return getWebSpeechVoices().map(convertWebSpeechVoice);
}

/**
 * Find Web Speech voice by language preference
 */
export function findVoiceByLanguage(
  voices: SpeechSynthesisVoice[],
  lang: string
): SpeechSynthesisVoice | null {
  // Try exact match first
  const exactMatch = voices.find((v) => v.lang === lang);
  if (exactMatch) return exactMatch;

  // Try language prefix match (e.g., 'en' matches 'en-US')
  const langPrefix = lang.split("-")[0];
  const prefixMatch = voices.find((v) => v.lang.startsWith(langPrefix ?? ""));
  if (prefixMatch) return prefixMatch;

  // Return default or first available
  const defaultVoice = voices.find((v) => v.default);
  return defaultVoice ?? voices[0] ?? null;
}

/**
 * Find SpeechSynthesisVoice by voice ID
 */
export function findWebSpeechVoiceById(
  voiceId: string
): SpeechSynthesisVoice | null {
  if (!voiceId.startsWith("web-")) return null;
  const voiceURI = voiceId.replace("web-", "");
  return getWebSpeechVoices().find((v) => v.voiceURI === voiceURI) ?? null;
}

// ============================================================================
// Voice Management Utilities
// ============================================================================

/**
 * Get voices available for a specific tier
 */
export function getVoicesForTier(
  tier: "free" | "pro" | "scholar",
  webSpeechVoices: TTSVoice[]
): TTSVoice[] {
  switch (tier) {
    case "scholar":
      return [...ELEVENLABS_VOICES, ...OPENAI_VOICES, ...webSpeechVoices];
    case "pro":
      return [...OPENAI_VOICES, ...webSpeechVoices];
    case "free":
    default:
      return webSpeechVoices;
  }
}

/**
 * Get default voice for tier
 */
export function getDefaultVoiceForTier(
  tier: "free" | "pro" | "scholar",
  webSpeechVoices: TTSVoice[],
  preferredLanguage: string
): TTSVoice | null {
  const voices = getVoicesForTier(tier, webSpeechVoices);
  if (voices.length === 0) return null;

  // For paid tiers, prefer their premium voices
  if (tier === "scholar" && ELEVENLABS_VOICES.length > 0) {
    return ELEVENLABS_VOICES[0] ?? null;
  }
  if (tier === "pro" && OPENAI_VOICES.length > 0) {
    return OPENAI_VOICES[0] ?? null;
  }

  // For free tier, try to match language
  const langMatch = voices.find((v) => v.lang.startsWith(preferredLanguage));
  return langMatch ?? voices[0] ?? null;
}

/**
 * Find voice by ID from all available voices
 */
export function findVoiceById(
  voiceId: string,
  allVoices: TTSVoice[]
): TTSVoice | null {
  return allVoices.find((v) => v.id === voiceId) ?? null;
}

/**
 * Group voices by provider
 */
export function groupVoicesByProvider(
  voices: TTSVoice[]
): Record<TTSProvider, TTSVoice[]> {
  const grouped: Record<TTSProvider, TTSVoice[]> = {
    web_speech: [],
    openai: [],
    elevenlabs: [],
  };

  for (const voice of voices) {
    grouped[voice.provider].push(voice);
  }

  return grouped;
}

/**
 * Filter voices by language
 */
export function filterVoicesByLanguage(
  voices: TTSVoice[],
  lang: string
): TTSVoice[] {
  const langPrefix = lang.split("-")[0] ?? "";
  return voices.filter((v) => v.lang === lang || v.lang.startsWith(langPrefix));
}

// ============================================================================
// Settings Persistence
// ============================================================================

/**
 * Load TTS settings from localStorage
 */
export function loadTTSSettings(): TTSSettings {
  if (typeof window === "undefined") return { ...DEFAULT_TTS_SETTINGS };

  try {
    const stored = localStorage.getItem(TTS_SETTINGS_KEY);
    if (!stored) return { ...DEFAULT_TTS_SETTINGS };

    const parsed = JSON.parse(stored) as Partial<TTSSettings>;
    return {
      ...DEFAULT_TTS_SETTINGS,
      ...parsed,
      // Ensure values are in valid ranges
      rate: clampValue(
        parsed.rate ?? DEFAULT_TTS_SETTINGS.rate,
        RATE_RANGE.min,
        RATE_RANGE.max
      ),
      pitch: clampValue(
        parsed.pitch ?? DEFAULT_TTS_SETTINGS.pitch,
        PITCH_RANGE.min,
        PITCH_RANGE.max
      ),
      volume: clampValue(
        parsed.volume ?? DEFAULT_TTS_SETTINGS.volume,
        VOLUME_RANGE.min,
        VOLUME_RANGE.max
      ),
    };
  } catch {
    return { ...DEFAULT_TTS_SETTINGS };
  }
}

/**
 * Save TTS settings to localStorage
 */
export function saveTTSSettings(settings: TTSSettings): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage may be full or disabled
  }
}

/**
 * Update a single TTS setting
 */
export function updateTTSSetting<K extends keyof TTSSettings>(
  key: K,
  value: TTSSettings[K]
): TTSSettings {
  const settings = loadTTSSettings();
  settings[key] = value;
  saveTTSSettings(settings);
  return settings;
}

/**
 * Reset TTS settings to defaults
 */
export function resetTTSSettings(): TTSSettings {
  saveTTSSettings({ ...DEFAULT_TTS_SETTINGS });
  return { ...DEFAULT_TTS_SETTINGS };
}

// ============================================================================
// Rate/Pitch/Volume Utilities
// ============================================================================

/**
 * Clamp a value within a range
 */
export function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Format rate for display
 */
export function formatRate(rate: number): string {
  return `${rate.toFixed(1)}x`;
}

/**
 * Format volume for display (as percentage)
 */
export function formatVolume(volume: number): string {
  return `${Math.round(volume * 100)}%`;
}

/**
 * Rate preset type
 */
export type RatePreset = { value: number; label: string };

/**
 * Get closest rate preset
 */
export function getClosestRatePreset(rate: number): RatePreset {
  let closest: RatePreset = { value: 1.0, label: "1x" };
  let minDiff = Math.abs(closest.value - rate);

  for (const preset of RATE_PRESETS) {
    const diff = Math.abs(preset.value - rate);
    if (diff < minDiff) {
      minDiff = diff;
      closest = { value: preset.value, label: preset.label };
    }
  }

  return closest;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Create TTS error object
 */
export function createTTSError(type: TTSErrorType, details?: string): TTSError {
  const messages: Record<TTSErrorType, string> = {
    not_supported: "Text-to-speech is not supported in this browser",
    no_voices: "No voices available for text-to-speech",
    voice_not_found: "Selected voice is not available",
    synthesis_error: "Failed to synthesize speech",
    network_error: "Network error while generating speech",
    rate_limited: "Too many requests, please try again later",
    unauthorized: "Not authorized to use this TTS service",
    cancelled: "Speech was cancelled",
  };

  const error: TTSError = {
    type,
    message: messages[type],
  };

  if (details !== undefined) {
    error.details = details;
  }

  return error;
}

/**
 * Get error message for display
 */
export function getTTSErrorMessage(error: TTSError): string {
  if (error.details) {
    return `${error.message}: ${error.details}`;
  }
  return error.message;
}

/**
 * Check if error is recoverable (can retry)
 */
export function isRecoverableError(error: TTSError): boolean {
  return ["network_error", "rate_limited", "synthesis_error"].includes(
    error.type
  );
}

// ============================================================================
// Text Processing for TTS
// ============================================================================

/**
 * Prepare text for TTS by cleaning and normalizing
 */
export function prepareTextForTTS(text: string): string {
  return (
    text
      // Remove excessive whitespace
      .replace(/\s+/g, " ")
      // Remove special characters that cause issues
      .replace(/[*#_`~^]/g, "")
      // Normalize curly quotes to straight quotes
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      // Normalize dashes
      .replace(/[\u2013\u2014]/g, "-")
      // Remove zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim()
  );
}

/**
 * Split text into sentences for better TTS handling
 */
export function splitIntoSentences(text: string): string[] {
  // Split on sentence endings followed by space or end of text
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.filter((s) => s.trim().length > 0);
}

/**
 * Estimate speech duration in milliseconds
 * Average speaking rate is about 150 words per minute
 */
export function estimateSpeechDuration(text: string, rate: number = 1): number {
  const words = text.split(/\s+/).length;
  const baseWpm = 150;
  const adjustedWpm = baseWpm * rate;
  const minutes = words / adjustedWpm;
  return Math.round(minutes * 60 * 1000);
}

/**
 * Get word count for text
 */
export function getWordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

// ============================================================================
// Position Tracking Utilities
// ============================================================================

/**
 * Create position from boundary event
 */
export function createPositionFromBoundary(
  event: SpeechSynthesisEvent
): TTSPosition {
  const position: TTSPosition = {
    charIndex: event.charIndex,
    charLength: event.charLength ?? 0,
  };

  if (event.name === "word") {
    position.currentWord = event.utterance.text.slice(
      event.charIndex,
      event.charIndex + (event.charLength ?? 0)
    );
  }

  return position;
}

/**
 * Get the text range for highlighting
 */
export function getHighlightRange(
  position: TTSPosition,
  fullText: string
): { start: number; end: number } | null {
  if (position.charIndex < 0 || position.charIndex >= fullText.length) {
    return null;
  }

  const start = position.charIndex;
  const end = Math.min(start + position.charLength, fullText.length);

  return { start, end };
}

/**
 * Extract text segment around position for context
 */
export function getTextContext(
  position: TTSPosition,
  fullText: string,
  contextSize: number = 50
): string {
  const start = Math.max(0, position.charIndex - contextSize);
  const end = Math.min(
    fullText.length,
    position.charIndex + position.charLength + contextSize
  );
  return fullText.slice(start, end);
}

// ============================================================================
// Provider Utilities
// ============================================================================

/**
 * Get provider display name
 */
export function getProviderDisplayName(provider: TTSProvider): string {
  const names: Record<TTSProvider, string> = {
    web_speech: "Browser",
    openai: "OpenAI",
    elevenlabs: "ElevenLabs",
  };
  return names[provider];
}

/**
 * Get provider from voice ID
 */
export function getProviderFromVoiceId(voiceId: string): TTSProvider {
  if (voiceId.startsWith("openai-")) return "openai";
  if (voiceId.startsWith("elevenlabs-")) return "elevenlabs";
  return "web_speech";
}

/**
 * Check if voice requires API (not web speech)
 */
export function voiceRequiresAPI(voiceId: string): boolean {
  return voiceId.startsWith("openai-") || voiceId.startsWith("elevenlabs-");
}

/**
 * Get tier required for voice
 */
export function getTierForVoice(voiceId: string): "free" | "pro" | "scholar" {
  if (voiceId.startsWith("elevenlabs-")) return "scholar";
  if (voiceId.startsWith("openai-")) return "pro";
  return "free";
}

/**
 * Check if user can use voice
 */
export function canUseVoice(
  voiceId: string,
  userTier: "free" | "pro" | "scholar"
): boolean {
  const requiredTier = getTierForVoice(voiceId);
  const tierRank = { free: 0, pro: 1, scholar: 2 };
  return tierRank[userTier] >= tierRank[requiredTier];
}
