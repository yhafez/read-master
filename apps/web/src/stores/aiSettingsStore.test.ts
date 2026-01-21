/**
 * Tests for AI Settings store
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AI_SETTINGS_STORAGE_KEY,
  comprehensionFrequencies,
  DEFAULT_AI_SETTINGS,
  DEFAULT_FEATURE_TOGGLES,
  isFeatureEnabled,
  readingLevels,
  sanitizeAISettings,
  sanitizeFeatureToggles,
  useAISettingsStore,
  validateComprehensionFrequency,
  validateReadingLevel,
} from "./aiSettingsStore";
import type {
  AIFeatureToggles,
  ComprehensionFrequency,
  ReadingLevel,
} from "./aiSettingsStore";

// Reset store between tests
beforeEach(() => {
  useAISettingsStore.setState({
    ...DEFAULT_AI_SETTINGS,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("aiSettingsStore", () => {
  describe("constants", () => {
    it("should export AI_SETTINGS_STORAGE_KEY", () => {
      expect(AI_SETTINGS_STORAGE_KEY).toBe("read-master-ai-settings");
    });

    it("should export readingLevels array", () => {
      expect(readingLevels).toEqual([
        "beginner",
        "intermediate",
        "advanced",
        "expert",
      ]);
    });

    it("should export comprehensionFrequencies array", () => {
      expect(comprehensionFrequencies).toEqual([
        "never",
        "rarely",
        "sometimes",
        "often",
        "always",
      ]);
    });

    it("should export DEFAULT_FEATURE_TOGGLES with all features enabled", () => {
      expect(DEFAULT_FEATURE_TOGGLES).toEqual({
        preReadingGuides: true,
        explainThis: true,
        aiChat: true,
        comprehensionChecks: true,
        assessments: true,
        flashcardGeneration: true,
      });
    });

    it("should export DEFAULT_AI_SETTINGS", () => {
      expect(DEFAULT_AI_SETTINGS).toEqual({
        aiEnabled: true,
        features: DEFAULT_FEATURE_TOGGLES,
        readingLevel: "intermediate",
        comprehensionFrequency: "sometimes",
        showUsageStats: true,
        personality: expect.any(Object), // DEFAULT_PERSONALITY_SETTINGS
      });
    });
  });

  describe("validateReadingLevel", () => {
    it("should accept valid reading levels", () => {
      expect(validateReadingLevel("beginner")).toBe("beginner");
      expect(validateReadingLevel("intermediate")).toBe("intermediate");
      expect(validateReadingLevel("advanced")).toBe("advanced");
      expect(validateReadingLevel("expert")).toBe("expert");
    });

    it("should default to intermediate for invalid level", () => {
      expect(validateReadingLevel("invalid")).toBe("intermediate");
      expect(validateReadingLevel("")).toBe("intermediate");
      expect(validateReadingLevel("novice")).toBe("intermediate");
    });
  });

  describe("validateComprehensionFrequency", () => {
    it("should accept valid frequencies", () => {
      expect(validateComprehensionFrequency("never")).toBe("never");
      expect(validateComprehensionFrequency("rarely")).toBe("rarely");
      expect(validateComprehensionFrequency("sometimes")).toBe("sometimes");
      expect(validateComprehensionFrequency("often")).toBe("often");
      expect(validateComprehensionFrequency("always")).toBe("always");
    });

    it("should default to sometimes for invalid frequency", () => {
      expect(validateComprehensionFrequency("invalid")).toBe("sometimes");
      expect(validateComprehensionFrequency("")).toBe("sometimes");
      expect(validateComprehensionFrequency("daily")).toBe("sometimes");
    });
  });

  describe("sanitizeFeatureToggles", () => {
    it("should accept valid boolean toggles", () => {
      expect(sanitizeFeatureToggles({ preReadingGuides: false })).toEqual({
        preReadingGuides: false,
      });
      expect(sanitizeFeatureToggles({ explainThis: true })).toEqual({
        explainThis: true,
      });
      expect(sanitizeFeatureToggles({ aiChat: false })).toEqual({
        aiChat: false,
      });
    });

    it("should accept multiple toggles", () => {
      expect(
        sanitizeFeatureToggles({
          preReadingGuides: false,
          explainThis: false,
          comprehensionChecks: true,
        })
      ).toEqual({
        preReadingGuides: false,
        explainThis: false,
        comprehensionChecks: true,
      });
    });

    it("should ignore non-boolean values", () => {
      expect(
        sanitizeFeatureToggles({
          preReadingGuides: "yes" as unknown as boolean,
          explainThis: 1 as unknown as boolean,
        })
      ).toEqual({});
    });

    it("should return empty object for empty input", () => {
      expect(sanitizeFeatureToggles({})).toEqual({});
    });
  });

  describe("sanitizeAISettings", () => {
    it("should accept valid aiEnabled boolean", () => {
      expect(sanitizeAISettings({ aiEnabled: false })).toEqual({
        aiEnabled: false,
      });
      expect(sanitizeAISettings({ aiEnabled: true })).toEqual({
        aiEnabled: true,
      });
    });

    it("should sanitize features with defaults", () => {
      const result = sanitizeAISettings({
        features: { preReadingGuides: false } as AIFeatureToggles,
      });
      expect(result.features).toEqual({
        ...DEFAULT_FEATURE_TOGGLES,
        preReadingGuides: false,
      });
    });

    it("should validate reading level", () => {
      expect(sanitizeAISettings({ readingLevel: "expert" })).toEqual({
        readingLevel: "expert",
      });
      expect(
        sanitizeAISettings({ readingLevel: "invalid" as ReadingLevel })
      ).toEqual({
        readingLevel: "intermediate",
      });
    });

    it("should validate comprehension frequency", () => {
      expect(sanitizeAISettings({ comprehensionFrequency: "always" })).toEqual({
        comprehensionFrequency: "always",
      });
      expect(
        sanitizeAISettings({
          comprehensionFrequency: "invalid" as ComprehensionFrequency,
        })
      ).toEqual({
        comprehensionFrequency: "sometimes",
      });
    });

    it("should accept showUsageStats boolean", () => {
      expect(sanitizeAISettings({ showUsageStats: false })).toEqual({
        showUsageStats: false,
      });
    });

    it("should ignore non-boolean aiEnabled", () => {
      expect(
        sanitizeAISettings({ aiEnabled: "yes" as unknown as boolean })
      ).toEqual({});
    });
  });

  describe("isFeatureEnabled", () => {
    it("should return true when AI enabled and feature enabled", () => {
      const settings = {
        ...DEFAULT_AI_SETTINGS,
        aiEnabled: true,
        features: { ...DEFAULT_FEATURE_TOGGLES, preReadingGuides: true },
      };
      expect(isFeatureEnabled(settings, "preReadingGuides")).toBe(true);
    });

    it("should return false when AI disabled", () => {
      const settings = {
        ...DEFAULT_AI_SETTINGS,
        aiEnabled: false,
        features: { ...DEFAULT_FEATURE_TOGGLES, preReadingGuides: true },
      };
      expect(isFeatureEnabled(settings, "preReadingGuides")).toBe(false);
    });

    it("should return false when feature disabled", () => {
      const settings = {
        ...DEFAULT_AI_SETTINGS,
        aiEnabled: true,
        features: { ...DEFAULT_FEATURE_TOGGLES, preReadingGuides: false },
      };
      expect(isFeatureEnabled(settings, "preReadingGuides")).toBe(false);
    });

    it("should check each feature individually", () => {
      const settings = {
        ...DEFAULT_AI_SETTINGS,
        aiEnabled: true,
        features: {
          preReadingGuides: true,
          explainThis: false,
          aiChat: true,
          comprehensionChecks: false,
          assessments: true,
          flashcardGeneration: false,
        },
      };
      expect(isFeatureEnabled(settings, "preReadingGuides")).toBe(true);
      expect(isFeatureEnabled(settings, "explainThis")).toBe(false);
      expect(isFeatureEnabled(settings, "aiChat")).toBe(true);
      expect(isFeatureEnabled(settings, "comprehensionChecks")).toBe(false);
      expect(isFeatureEnabled(settings, "assessments")).toBe(true);
      expect(isFeatureEnabled(settings, "flashcardGeneration")).toBe(false);
    });
  });

  describe("store actions", () => {
    it("should toggle AI enabled state", () => {
      expect(useAISettingsStore.getState().aiEnabled).toBe(true);
      useAISettingsStore.getState().toggleAI();
      expect(useAISettingsStore.getState().aiEnabled).toBe(false);
      useAISettingsStore.getState().toggleAI();
      expect(useAISettingsStore.getState().aiEnabled).toBe(true);
    });

    it("should set AI enabled state directly", () => {
      useAISettingsStore.getState().setAIEnabled(false);
      expect(useAISettingsStore.getState().aiEnabled).toBe(false);
      useAISettingsStore.getState().setAIEnabled(true);
      expect(useAISettingsStore.getState().aiEnabled).toBe(true);
    });

    it("should set individual feature toggles", () => {
      useAISettingsStore.getState().setFeatureToggle("preReadingGuides", false);
      expect(useAISettingsStore.getState().features.preReadingGuides).toBe(
        false
      );
      useAISettingsStore.getState().setFeatureToggle("preReadingGuides", true);
      expect(useAISettingsStore.getState().features.preReadingGuides).toBe(
        true
      );
    });

    it("should update multiple features at once", () => {
      useAISettingsStore.getState().updateFeatures({
        preReadingGuides: false,
        aiChat: false,
      });
      const { features } = useAISettingsStore.getState();
      expect(features.preReadingGuides).toBe(false);
      expect(features.aiChat).toBe(false);
      expect(features.explainThis).toBe(true); // unchanged
    });

    it("should enable all features", () => {
      // First disable some
      useAISettingsStore.getState().updateFeatures({
        preReadingGuides: false,
        aiChat: false,
      });
      // Then enable all
      useAISettingsStore.getState().enableAllFeatures();
      const { features } = useAISettingsStore.getState();
      expect(features.preReadingGuides).toBe(true);
      expect(features.explainThis).toBe(true);
      expect(features.aiChat).toBe(true);
      expect(features.comprehensionChecks).toBe(true);
      expect(features.assessments).toBe(true);
      expect(features.flashcardGeneration).toBe(true);
    });

    it("should disable all features", () => {
      useAISettingsStore.getState().disableAllFeatures();
      const { features } = useAISettingsStore.getState();
      expect(features.preReadingGuides).toBe(false);
      expect(features.explainThis).toBe(false);
      expect(features.aiChat).toBe(false);
      expect(features.comprehensionChecks).toBe(false);
      expect(features.assessments).toBe(false);
      expect(features.flashcardGeneration).toBe(false);
    });

    it("should set reading level", () => {
      useAISettingsStore.getState().setReadingLevel("expert");
      expect(useAISettingsStore.getState().readingLevel).toBe("expert");
      useAISettingsStore.getState().setReadingLevel("beginner");
      expect(useAISettingsStore.getState().readingLevel).toBe("beginner");
    });

    it("should validate reading level on set", () => {
      useAISettingsStore
        .getState()
        .setReadingLevel("invalid" as unknown as "beginner");
      expect(useAISettingsStore.getState().readingLevel).toBe("intermediate");
    });

    it("should set comprehension frequency", () => {
      useAISettingsStore.getState().setComprehensionFrequency("always");
      expect(useAISettingsStore.getState().comprehensionFrequency).toBe(
        "always"
      );
      useAISettingsStore.getState().setComprehensionFrequency("never");
      expect(useAISettingsStore.getState().comprehensionFrequency).toBe(
        "never"
      );
    });

    it("should validate comprehension frequency on set", () => {
      useAISettingsStore
        .getState()
        .setComprehensionFrequency("invalid" as unknown as "never");
      expect(useAISettingsStore.getState().comprehensionFrequency).toBe(
        "sometimes"
      );
    });

    it("should set show usage stats", () => {
      useAISettingsStore.getState().setShowUsageStats(false);
      expect(useAISettingsStore.getState().showUsageStats).toBe(false);
      useAISettingsStore.getState().setShowUsageStats(true);
      expect(useAISettingsStore.getState().showUsageStats).toBe(true);
    });

    it("should reset all settings to defaults", () => {
      // Modify various settings
      useAISettingsStore.getState().setAIEnabled(false);
      useAISettingsStore.getState().disableAllFeatures();
      useAISettingsStore.getState().setReadingLevel("expert");
      useAISettingsStore.getState().setComprehensionFrequency("never");
      useAISettingsStore.getState().setShowUsageStats(false);

      // Reset
      useAISettingsStore.getState().resetSettings();

      // Verify defaults
      const state = useAISettingsStore.getState();
      expect(state.aiEnabled).toBe(true);
      expect(state.features).toEqual(DEFAULT_FEATURE_TOGGLES);
      expect(state.readingLevel).toBe("intermediate");
      expect(state.comprehensionFrequency).toBe("sometimes");
      expect(state.showUsageStats).toBe(true);
    });

    it("should check if feature is enabled via store method", () => {
      expect(
        useAISettingsStore.getState().isFeatureEnabled("preReadingGuides")
      ).toBe(true);

      useAISettingsStore.getState().setAIEnabled(false);
      expect(
        useAISettingsStore.getState().isFeatureEnabled("preReadingGuides")
      ).toBe(false);

      useAISettingsStore.getState().setAIEnabled(true);
      useAISettingsStore.getState().setFeatureToggle("preReadingGuides", false);
      expect(
        useAISettingsStore.getState().isFeatureEnabled("preReadingGuides")
      ).toBe(false);
    });
  });

  describe("store initial state", () => {
    it("should initialize with default values", () => {
      const state = useAISettingsStore.getState();
      expect(state.aiEnabled).toBe(true);
      expect(state.features).toEqual(DEFAULT_FEATURE_TOGGLES);
      expect(state.readingLevel).toBe("intermediate");
      expect(state.comprehensionFrequency).toBe("sometimes");
      expect(state.showUsageStats).toBe(true);
    });
  });
});
