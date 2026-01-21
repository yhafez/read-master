/**
 * AI Settings store for Read Master
 *
 * Manages AI feature preferences with localStorage persistence.
 * Controls global AI toggle, feature-specific settings, and comprehension check frequency.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const AI_SETTINGS_STORAGE_KEY = "read-master-ai-settings";

/**
 * Reading level for AI-generated content
 */
export const readingLevels = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
] as const;
export type ReadingLevel = (typeof readingLevels)[number];

/**
 * Comprehension check frequency options
 */
export const comprehensionFrequencies = [
  "never",
  "rarely",
  "sometimes",
  "often",
  "always",
] as const;
export type ComprehensionFrequency = (typeof comprehensionFrequencies)[number];

/**
 * AI personality types
 */
export const aiPersonalities = [
  "encouraging_tutor",
  "neutral_assistant",
  "socratic_guide",
] as const;
export type AIPersonality = (typeof aiPersonalities)[number];

/**
 * Verbosity levels for AI responses
 */
export const verbosityLevels = [
  "concise",
  "balanced",
  "detailed",
  "comprehensive",
] as const;
export type VerbosityLevel = (typeof verbosityLevels)[number];

/**
 * Language complexity preferences
 */
export const languageComplexities = [
  "simplify",
  "match_level",
  "challenge_me",
] as const;
export type LanguageComplexity = (typeof languageComplexities)[number];

/**
 * AI feature toggles
 */
export interface AIFeatureToggles {
  /** Enable pre-reading guide generation */
  preReadingGuides: boolean;
  /** Enable "Explain this" feature in reader */
  explainThis: boolean;
  /** Enable AI chat sidebar */
  aiChat: boolean;
  /** Enable comprehension check-ins during reading */
  comprehensionChecks: boolean;
  /** Enable AI-generated assessments */
  assessments: boolean;
  /** Enable AI flashcard generation */
  flashcardGeneration: boolean;
}

/**
 * AI personality settings
 */
export interface AIPersonalitySettings {
  /** Selected AI personality */
  personality: AIPersonality;
  /** Custom tone instructions (optional) */
  customTone?: string;
  /** Verbosity level for responses */
  verbosity: VerbosityLevel;
  /** Language complexity preference */
  languageComplexity: LanguageComplexity;
  /** Enable proactive suggestions */
  proactiveSuggestions: boolean;
}

/**
 * AI settings interface
 */
export interface AISettings {
  /** Global AI toggle - disables all AI features when false */
  aiEnabled: boolean;
  /** Individual feature toggles */
  features: AIFeatureToggles;
  /** Preferred reading level for AI responses */
  readingLevel: ReadingLevel;
  /** How often to show comprehension check-ins */
  comprehensionFrequency: ComprehensionFrequency;
  /** Whether to show usage statistics in settings */
  showUsageStats: boolean;
  /** AI personality customization */
  personality: AIPersonalitySettings;
}

/**
 * Default AI feature toggles
 */
export const DEFAULT_FEATURE_TOGGLES: AIFeatureToggles = {
  preReadingGuides: true,
  explainThis: true,
  aiChat: true,
  comprehensionChecks: true,
  assessments: true,
  flashcardGeneration: true,
};

/**
 * Default personality settings
 */
export const DEFAULT_PERSONALITY_SETTINGS: AIPersonalitySettings = {
  personality: "encouraging_tutor",
  verbosity: "balanced",
  languageComplexity: "match_level",
  proactiveSuggestions: true,
};

/**
 * Default AI settings
 */
export const DEFAULT_AI_SETTINGS: AISettings = {
  aiEnabled: true,
  features: DEFAULT_FEATURE_TOGGLES,
  readingLevel: "intermediate",
  comprehensionFrequency: "sometimes",
  showUsageStats: true,
  personality: DEFAULT_PERSONALITY_SETTINGS,
};

/**
 * Validate reading level
 */
export function validateReadingLevel(level: string): ReadingLevel {
  return readingLevels.includes(level as ReadingLevel)
    ? (level as ReadingLevel)
    : "intermediate";
}

/**
 * Validate comprehension frequency
 */
export function validateComprehensionFrequency(
  freq: string
): ComprehensionFrequency {
  return comprehensionFrequencies.includes(freq as ComprehensionFrequency)
    ? (freq as ComprehensionFrequency)
    : "sometimes";
}

/**
 * Sanitize feature toggles
 */
export function sanitizeFeatureToggles(
  toggles: Partial<AIFeatureToggles>
): Partial<AIFeatureToggles> {
  const sanitized: Partial<AIFeatureToggles> = {};

  if (typeof toggles.preReadingGuides === "boolean") {
    sanitized.preReadingGuides = toggles.preReadingGuides;
  }

  if (typeof toggles.explainThis === "boolean") {
    sanitized.explainThis = toggles.explainThis;
  }

  if (typeof toggles.aiChat === "boolean") {
    sanitized.aiChat = toggles.aiChat;
  }

  if (typeof toggles.comprehensionChecks === "boolean") {
    sanitized.comprehensionChecks = toggles.comprehensionChecks;
  }

  if (typeof toggles.assessments === "boolean") {
    sanitized.assessments = toggles.assessments;
  }

  if (typeof toggles.flashcardGeneration === "boolean") {
    sanitized.flashcardGeneration = toggles.flashcardGeneration;
  }

  return sanitized;
}

/**
 * Sanitize AI settings
 */
export function sanitizeAISettings(
  settings: Partial<AISettings>
): Partial<AISettings> {
  const sanitized: Partial<AISettings> = {};

  if (typeof settings.aiEnabled === "boolean") {
    sanitized.aiEnabled = settings.aiEnabled;
  }

  if (settings.features) {
    sanitized.features = {
      ...DEFAULT_FEATURE_TOGGLES,
      ...sanitizeFeatureToggles(settings.features),
    };
  }

  if (typeof settings.readingLevel === "string") {
    sanitized.readingLevel = validateReadingLevel(settings.readingLevel);
  }

  if (typeof settings.comprehensionFrequency === "string") {
    sanitized.comprehensionFrequency = validateComprehensionFrequency(
      settings.comprehensionFrequency
    );
  }

  if (typeof settings.showUsageStats === "boolean") {
    sanitized.showUsageStats = settings.showUsageStats;
  }

  return sanitized;
}

/**
 * Check if a specific AI feature is enabled (respects global toggle)
 */
export function isFeatureEnabled(
  settings: AISettings,
  feature: keyof AIFeatureToggles
): boolean {
  return settings.aiEnabled && settings.features[feature];
}

interface AISettingsState extends AISettings {
  /** Set global AI enabled state */
  setAIEnabled: (enabled: boolean) => void;
  /** Toggle global AI on/off */
  toggleAI: () => void;
  /** Update a specific feature toggle */
  setFeatureToggle: (feature: keyof AIFeatureToggles, enabled: boolean) => void;
  /** Update multiple feature toggles */
  updateFeatures: (features: Partial<AIFeatureToggles>) => void;
  /** Enable all features */
  enableAllFeatures: () => void;
  /** Disable all features */
  disableAllFeatures: () => void;
  /** Set reading level */
  setReadingLevel: (level: ReadingLevel) => void;
  /** Set comprehension check frequency */
  setComprehensionFrequency: (freq: ComprehensionFrequency) => void;
  /** Set show usage stats preference */
  setShowUsageStats: (show: boolean) => void;
  /** Set AI personality */
  setPersonality: (personality: AIPersonality) => void;
  /** Set custom tone */
  setCustomTone: (tone: string | undefined) => void;
  /** Set verbosity level */
  setVerbosity: (verbosity: VerbosityLevel) => void;
  /** Set language complexity */
  setLanguageComplexity: (complexity: LanguageComplexity) => void;
  /** Set proactive suggestions toggle */
  setProactiveSuggestions: (enabled: boolean) => void;
  /** Update all personality settings */
  updatePersonalitySettings: (settings: Partial<AIPersonalitySettings>) => void;
  /** Reset all settings to defaults */
  resetSettings: () => void;
  /** Check if a feature is enabled (respects global toggle) */
  isFeatureEnabled: (feature: keyof AIFeatureToggles) => boolean;
}

export const useAISettingsStore = create<AISettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_AI_SETTINGS,

      // Actions
      setAIEnabled: (enabled) =>
        set(() => ({
          aiEnabled: enabled,
        })),

      toggleAI: () =>
        set((state) => ({
          aiEnabled: !state.aiEnabled,
        })),

      setFeatureToggle: (feature, enabled) =>
        set((state) => ({
          features: {
            ...state.features,
            [feature]: enabled,
          },
        })),

      updateFeatures: (features) =>
        set((state) => ({
          features: {
            ...state.features,
            ...sanitizeFeatureToggles(features),
          },
        })),

      enableAllFeatures: () =>
        set(() => ({
          features: {
            preReadingGuides: true,
            explainThis: true,
            aiChat: true,
            comprehensionChecks: true,
            assessments: true,
            flashcardGeneration: true,
          },
        })),

      disableAllFeatures: () =>
        set(() => ({
          features: {
            preReadingGuides: false,
            explainThis: false,
            aiChat: false,
            comprehensionChecks: false,
            assessments: false,
            flashcardGeneration: false,
          },
        })),

      setReadingLevel: (level) =>
        set(() => ({
          readingLevel: validateReadingLevel(level),
        })),

      setComprehensionFrequency: (freq) =>
        set(() => ({
          comprehensionFrequency: validateComprehensionFrequency(freq),
        })),

      setShowUsageStats: (show) =>
        set(() => ({
          showUsageStats: show,
        })),

      setPersonality: (personality) =>
        set((state) => ({
          personality: {
            ...state.personality,
            personality,
          },
        })),

      setCustomTone: (tone) => {
        set((state) => {
          const newPersonality = { ...state.personality };
          if (tone) {
            newPersonality.customTone = tone;
          } else {
            delete newPersonality.customTone;
          }
          return { personality: newPersonality };
        });
      },

      setVerbosity: (verbosity) =>
        set((state) => ({
          personality: {
            ...state.personality,
            verbosity,
          },
        })),

      setLanguageComplexity: (complexity) =>
        set((state) => ({
          personality: {
            ...state.personality,
            languageComplexity: complexity,
          },
        })),

      setProactiveSuggestions: (enabled) =>
        set((state) => ({
          personality: {
            ...state.personality,
            proactiveSuggestions: enabled,
          },
        })),

      updatePersonalitySettings: (settings) =>
        set((state) => ({
          personality: {
            ...state.personality,
            ...settings,
          },
        })),

      resetSettings: () =>
        set(() => ({
          ...DEFAULT_AI_SETTINGS,
        })),

      isFeatureEnabled: (feature) => {
        const state = get();
        return isFeatureEnabled(state, feature);
      },
    }),
    {
      name: AI_SETTINGS_STORAGE_KEY,
    }
  )
);
