/**
 * Tests for readerPreferencesStore
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  useReaderPreferencesStore,
  DEFAULT_READER_PREFERENCES,
  validatePageTurnAnimation,
  sanitizeReaderPreferences,
  type PageTurnAnimation,
} from "./readerPreferencesStore";
import { DEFAULT_READER_SETTINGS, type ReaderSettings } from "./readerStore";

describe("readerPreferencesStore", () => {
  beforeEach(() => {
    // Reset store to default state before each test
    useReaderPreferencesStore.setState({
      ...DEFAULT_READER_PREFERENCES,
      // Add required action methods (they will be replaced by actual methods)
      updatePreferences: useReaderPreferencesStore.getState().updatePreferences,
      setAutoSaveProgress:
        useReaderPreferencesStore.getState().setAutoSaveProgress,
      setPageTurnAnimation:
        useReaderPreferencesStore.getState().setPageTurnAnimation,
      updateDefaultReaderSettings:
        useReaderPreferencesStore.getState().updateDefaultReaderSettings,
      setDefaultReadingMode:
        useReaderPreferencesStore.getState().setDefaultReadingMode,
      resetPreferences: useReaderPreferencesStore.getState().resetPreferences,
      resetDefaultReaderSettings:
        useReaderPreferencesStore.getState().resetDefaultReaderSettings,
    });
  });

  describe("initial state", () => {
    it("should have correct default state", () => {
      const state = useReaderPreferencesStore.getState();

      expect(state.autoSaveProgress).toBe(true);
      expect(state.pageTurnAnimation).toBe("slide");
      expect(state.defaultReaderSettings).toEqual(DEFAULT_READER_SETTINGS);
    });
  });

  describe("updatePreferences", () => {
    it("should update preferences", () => {
      const { updatePreferences } = useReaderPreferencesStore.getState();

      updatePreferences({
        autoSaveProgress: false,
        pageTurnAnimation: "fade",
      });

      const state = useReaderPreferencesStore.getState();
      expect(state.autoSaveProgress).toBe(false);
      expect(state.pageTurnAnimation).toBe("fade");
    });

    it("should sanitize preferences when updating", () => {
      const { updatePreferences } = useReaderPreferencesStore.getState();

      updatePreferences({
        pageTurnAnimation: "invalid" as PageTurnAnimation,
      });

      const state = useReaderPreferencesStore.getState();
      expect(state.pageTurnAnimation).toBe("slide"); // Falls back to default
    });

    it("should update nested defaultReaderSettings", () => {
      const { updatePreferences } = useReaderPreferencesStore.getState();

      updatePreferences({
        defaultReaderSettings: {
          ...DEFAULT_READER_SETTINGS,
          readingMode: "scroll",
          showPageNumbers: false,
        } as ReaderSettings,
      });

      const state = useReaderPreferencesStore.getState();
      expect(state.defaultReaderSettings.readingMode).toBe("scroll");
      expect(state.defaultReaderSettings.showPageNumbers).toBe(false);
      // Other settings should remain unchanged
      expect(state.defaultReaderSettings.showProgressBar).toBe(true);
    });
  });

  describe("setAutoSaveProgress", () => {
    it("should set autoSaveProgress to true", () => {
      const { setAutoSaveProgress } = useReaderPreferencesStore.getState();
      useReaderPreferencesStore.setState({ autoSaveProgress: false });

      setAutoSaveProgress(true);

      const state = useReaderPreferencesStore.getState();
      expect(state.autoSaveProgress).toBe(true);
    });

    it("should set autoSaveProgress to false", () => {
      const { setAutoSaveProgress } = useReaderPreferencesStore.getState();

      setAutoSaveProgress(false);

      const state = useReaderPreferencesStore.getState();
      expect(state.autoSaveProgress).toBe(false);
    });
  });

  describe("setPageTurnAnimation", () => {
    it("should set page turn animation to none", () => {
      const { setPageTurnAnimation } = useReaderPreferencesStore.getState();

      setPageTurnAnimation("none");

      const state = useReaderPreferencesStore.getState();
      expect(state.pageTurnAnimation).toBe("none");
    });

    it("should set page turn animation to slide", () => {
      const { setPageTurnAnimation } = useReaderPreferencesStore.getState();

      setPageTurnAnimation("slide");

      const state = useReaderPreferencesStore.getState();
      expect(state.pageTurnAnimation).toBe("slide");
    });

    it("should set page turn animation to fade", () => {
      const { setPageTurnAnimation } = useReaderPreferencesStore.getState();

      setPageTurnAnimation("fade");

      const state = useReaderPreferencesStore.getState();
      expect(state.pageTurnAnimation).toBe("fade");
    });

    it("should set page turn animation to flip", () => {
      const { setPageTurnAnimation } = useReaderPreferencesStore.getState();

      setPageTurnAnimation("flip");

      const state = useReaderPreferencesStore.getState();
      expect(state.pageTurnAnimation).toBe("flip");
    });

    it("should validate invalid page turn animation", () => {
      const { setPageTurnAnimation } = useReaderPreferencesStore.getState();

      setPageTurnAnimation("invalid" as PageTurnAnimation);

      const state = useReaderPreferencesStore.getState();
      expect(state.pageTurnAnimation).toBe("slide"); // Falls back to default
    });
  });

  describe("updateDefaultReaderSettings", () => {
    it("should update default reading mode", () => {
      const { updateDefaultReaderSettings } =
        useReaderPreferencesStore.getState();

      updateDefaultReaderSettings({ readingMode: "scroll" });

      const state = useReaderPreferencesStore.getState();
      expect(state.defaultReaderSettings.readingMode).toBe("scroll");
    });

    it("should update display toggles", () => {
      const { updateDefaultReaderSettings } =
        useReaderPreferencesStore.getState();

      updateDefaultReaderSettings({
        showPageNumbers: false,
        showProgressBar: false,
        showEstimatedTime: false,
      });

      const state = useReaderPreferencesStore.getState();
      expect(state.defaultReaderSettings.showPageNumbers).toBe(false);
      expect(state.defaultReaderSettings.showProgressBar).toBe(false);
      expect(state.defaultReaderSettings.showEstimatedTime).toBe(false);
    });

    it("should update typography settings", () => {
      const { updateDefaultReaderSettings } =
        useReaderPreferencesStore.getState();

      updateDefaultReaderSettings({
        typography: {
          ...DEFAULT_READER_SETTINGS.typography,
          fontFamily: "serif",
          fontSize: 18,
          lineHeight: 2.0,
        },
      });

      const state = useReaderPreferencesStore.getState();
      expect(state.defaultReaderSettings.typography.fontFamily).toBe("serif");
      expect(state.defaultReaderSettings.typography.fontSize).toBe(18);
      expect(state.defaultReaderSettings.typography.lineHeight).toBe(2.0);
    });

    it("should update visual preferences", () => {
      const { updateDefaultReaderSettings } =
        useReaderPreferencesStore.getState();

      updateDefaultReaderSettings({
        margins: 10,
        maxWidth: 1000,
      });

      const state = useReaderPreferencesStore.getState();
      expect(state.defaultReaderSettings.margins).toBe(10);
      expect(state.defaultReaderSettings.maxWidth).toBe(1000);
    });

    it("should sanitize reader settings when updating", () => {
      const { updateDefaultReaderSettings } =
        useReaderPreferencesStore.getState();

      updateDefaultReaderSettings({
        margins: -5, // Invalid, should be clamped to 0
        maxWidth: 10000, // Invalid, should be clamped to 1200
      });

      const state = useReaderPreferencesStore.getState();
      expect(state.defaultReaderSettings.margins).toBe(0);
      expect(state.defaultReaderSettings.maxWidth).toBe(1200);
    });
  });

  describe("setDefaultReadingMode", () => {
    it("should set default reading mode to paginated", () => {
      const { setDefaultReadingMode } = useReaderPreferencesStore.getState();

      setDefaultReadingMode("paginated");

      const state = useReaderPreferencesStore.getState();
      expect(state.defaultReaderSettings.readingMode).toBe("paginated");
    });

    it("should set default reading mode to scroll", () => {
      const { setDefaultReadingMode } = useReaderPreferencesStore.getState();

      setDefaultReadingMode("scroll");

      const state = useReaderPreferencesStore.getState();
      expect(state.defaultReaderSettings.readingMode).toBe("scroll");
    });

    it("should set default reading mode to spread", () => {
      const { setDefaultReadingMode } = useReaderPreferencesStore.getState();

      setDefaultReadingMode("spread");

      const state = useReaderPreferencesStore.getState();
      expect(state.defaultReaderSettings.readingMode).toBe("spread");
    });
  });

  describe("resetPreferences", () => {
    it("should reset all preferences to defaults", () => {
      const { resetPreferences, updatePreferences } =
        useReaderPreferencesStore.getState();

      // Modify preferences
      updatePreferences({
        autoSaveProgress: false,
        pageTurnAnimation: "none",
        defaultReaderSettings: {
          ...DEFAULT_READER_SETTINGS,
          readingMode: "scroll",
          showPageNumbers: false,
        } as ReaderSettings,
      });

      // Reset
      resetPreferences();

      const state = useReaderPreferencesStore.getState();
      expect(state).toEqual({
        ...DEFAULT_READER_PREFERENCES,
        // Include action methods
        updatePreferences: expect.any(Function),
        setAutoSaveProgress: expect.any(Function),
        setPageTurnAnimation: expect.any(Function),
        updateDefaultReaderSettings: expect.any(Function),
        setDefaultReadingMode: expect.any(Function),
        resetPreferences: expect.any(Function),
        resetDefaultReaderSettings: expect.any(Function),
      });
    });
  });

  describe("resetDefaultReaderSettings", () => {
    it("should reset only default reader settings", () => {
      const {
        resetDefaultReaderSettings,
        updatePreferences,
        updateDefaultReaderSettings,
      } = useReaderPreferencesStore.getState();

      // Modify both general preferences and reader settings
      updatePreferences({
        autoSaveProgress: false,
        pageTurnAnimation: "flip",
      });
      updateDefaultReaderSettings({
        readingMode: "scroll",
        showPageNumbers: false,
      });

      // Reset only reader settings
      resetDefaultReaderSettings();

      const state = useReaderPreferencesStore.getState();
      // General preferences should remain unchanged
      expect(state.autoSaveProgress).toBe(false);
      expect(state.pageTurnAnimation).toBe("flip");
      // Reader settings should be reset
      expect(state.defaultReaderSettings).toEqual(DEFAULT_READER_SETTINGS);
    });
  });
});

describe("validatePageTurnAnimation", () => {
  it("should return valid animation values", () => {
    expect(validatePageTurnAnimation("none")).toBe("none");
    expect(validatePageTurnAnimation("slide")).toBe("slide");
    expect(validatePageTurnAnimation("fade")).toBe("fade");
    expect(validatePageTurnAnimation("flip")).toBe("flip");
  });

  it("should return default for invalid values", () => {
    expect(validatePageTurnAnimation("invalid")).toBe("slide");
    expect(validatePageTurnAnimation(null)).toBe("slide");
    expect(validatePageTurnAnimation(undefined)).toBe("slide");
    expect(validatePageTurnAnimation(123)).toBe("slide");
    expect(validatePageTurnAnimation({})).toBe("slide");
  });
});

describe("sanitizeReaderPreferences", () => {
  it("should sanitize autoSaveProgress to boolean", () => {
    expect(
      sanitizeReaderPreferences({ autoSaveProgress: true }).autoSaveProgress
    ).toBe(true);
    expect(
      sanitizeReaderPreferences({ autoSaveProgress: false }).autoSaveProgress
    ).toBe(false);
    expect(
      sanitizeReaderPreferences({ autoSaveProgress: 1 as unknown as boolean })
        .autoSaveProgress
    ).toBe(true);
    expect(
      sanitizeReaderPreferences({ autoSaveProgress: 0 as unknown as boolean })
        .autoSaveProgress
    ).toBe(false);
    expect(
      sanitizeReaderPreferences({
        autoSaveProgress: "yes" as unknown as boolean,
      }).autoSaveProgress
    ).toBe(true);
  });

  it("should sanitize pageTurnAnimation", () => {
    expect(
      sanitizeReaderPreferences({ pageTurnAnimation: "none" }).pageTurnAnimation
    ).toBe("none");
    expect(
      sanitizeReaderPreferences({
        pageTurnAnimation: "invalid" as PageTurnAnimation,
      }).pageTurnAnimation
    ).toBe("slide");
  });

  it("should sanitize defaultReaderSettings", () => {
    const result = sanitizeReaderPreferences({
      defaultReaderSettings: {
        ...DEFAULT_READER_SETTINGS,
        readingMode: "scroll",
        margins: -5, // Invalid
        maxWidth: 10000, // Invalid
      } as ReaderSettings,
    });

    expect(result.defaultReaderSettings?.readingMode).toBe("scroll");
    expect(result.defaultReaderSettings?.margins).toBe(0); // Clamped
    expect(result.defaultReaderSettings?.maxWidth).toBe(1200); // Clamped
  });

  it("should handle empty object", () => {
    const result = sanitizeReaderPreferences({});
    expect(result).toEqual({});
  });

  it("should handle partial updates", () => {
    const result = sanitizeReaderPreferences({
      autoSaveProgress: false,
    });

    expect(result.autoSaveProgress).toBe(false);
    expect(result.pageTurnAnimation).toBeUndefined();
    expect(result.defaultReaderSettings).toBeUndefined();
  });
});

describe("DEFAULT_READER_PREFERENCES", () => {
  it("should have correct structure", () => {
    expect(DEFAULT_READER_PREFERENCES).toEqual({
      autoSaveProgress: true,
      pageTurnAnimation: "slide",
      defaultReaderSettings: DEFAULT_READER_SETTINGS,
    });
  });
});
