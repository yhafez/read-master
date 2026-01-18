/**
 * Tests for UI store
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_UI_PREFERENCES,
  sanitizePreferences,
  UI_STORAGE_KEY,
  useUIStore,
  validateLanguage,
  validateReaderNavPanel,
  validateSidebarState,
} from "./uiStore";

// Reset store between tests
beforeEach(() => {
  useUIStore.setState({
    language: "en",
    sidebarState: "open",
    readerNavPanel: "none",
    preferences: DEFAULT_UI_PREFERENCES,
    mobileMenuOpen: false,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("uiStore", () => {
  describe("constants", () => {
    it("should export UI_STORAGE_KEY", () => {
      expect(UI_STORAGE_KEY).toBe("read-master-ui");
    });

    it("should export DEFAULT_UI_PREFERENCES", () => {
      expect(DEFAULT_UI_PREFERENCES).toEqual({
        showWelcomeModal: true,
        showReadingTips: true,
        enableKeyboardShortcuts: true,
        showProgressInSidebar: true,
        compactLibraryView: false,
      });
    });
  });

  describe("validateLanguage", () => {
    it("should accept valid language codes", () => {
      expect(validateLanguage("en")).toBe("en");
      expect(validateLanguage("ar")).toBe("ar");
      expect(validateLanguage("es")).toBe("es");
      expect(validateLanguage("ja")).toBe("ja");
      expect(validateLanguage("zh")).toBe("zh");
      expect(validateLanguage("tl")).toBe("tl");
    });

    it("should default to en for invalid language", () => {
      expect(validateLanguage("fr")).toBe("en");
      expect(validateLanguage("de")).toBe("en");
      expect(validateLanguage("invalid")).toBe("en");
      expect(validateLanguage("")).toBe("en");
    });
  });

  describe("validateSidebarState", () => {
    it("should accept valid sidebar states", () => {
      expect(validateSidebarState("open")).toBe("open");
      expect(validateSidebarState("closed")).toBe("closed");
      expect(validateSidebarState("collapsed")).toBe("collapsed");
    });

    it("should default to open for invalid state", () => {
      expect(validateSidebarState("invalid")).toBe("open");
      expect(validateSidebarState("")).toBe("open");
      expect(validateSidebarState("minimized")).toBe("open");
    });
  });

  describe("validateReaderNavPanel", () => {
    it("should accept valid reader nav panels", () => {
      expect(validateReaderNavPanel("none")).toBe("none");
      expect(validateReaderNavPanel("toc")).toBe("toc");
      expect(validateReaderNavPanel("notes")).toBe("notes");
      expect(validateReaderNavPanel("search")).toBe("search");
      expect(validateReaderNavPanel("settings")).toBe("settings");
    });

    it("should default to none for invalid panel", () => {
      expect(validateReaderNavPanel("invalid")).toBe("none");
      expect(validateReaderNavPanel("")).toBe("none");
      expect(validateReaderNavPanel("bookmarks")).toBe("none");
    });
  });

  describe("sanitizePreferences", () => {
    it("should accept valid boolean preferences", () => {
      expect(sanitizePreferences({ showWelcomeModal: false })).toEqual({
        showWelcomeModal: false,
      });
      expect(sanitizePreferences({ showReadingTips: false })).toEqual({
        showReadingTips: false,
      });
      expect(sanitizePreferences({ enableKeyboardShortcuts: false })).toEqual({
        enableKeyboardShortcuts: false,
      });
      expect(sanitizePreferences({ showProgressInSidebar: false })).toEqual({
        showProgressInSidebar: false,
      });
      expect(sanitizePreferences({ compactLibraryView: true })).toEqual({
        compactLibraryView: true,
      });
    });

    it("should ignore non-boolean values", () => {
      expect(
        sanitizePreferences({ showWelcomeModal: "true" as never })
      ).toEqual({});
      expect(sanitizePreferences({ showReadingTips: 1 as never })).toEqual({});
    });

    it("should handle empty object", () => {
      expect(sanitizePreferences({})).toEqual({});
    });

    it("should handle multiple preferences", () => {
      const result = sanitizePreferences({
        showWelcomeModal: false,
        compactLibraryView: true,
        showReadingTips: false,
      });
      expect(result).toEqual({
        showWelcomeModal: false,
        compactLibraryView: true,
        showReadingTips: false,
      });
    });
  });

  describe("useUIStore", () => {
    describe("initial state", () => {
      it("should have correct initial language", () => {
        expect(useUIStore.getState().language).toBe("en");
      });

      it("should have correct initial sidebar state", () => {
        expect(useUIStore.getState().sidebarState).toBe("open");
      });

      it("should have correct initial reader nav panel", () => {
        expect(useUIStore.getState().readerNavPanel).toBe("none");
      });

      it("should have default preferences", () => {
        expect(useUIStore.getState().preferences).toEqual(
          DEFAULT_UI_PREFERENCES
        );
      });

      it("should have mobile menu closed", () => {
        expect(useUIStore.getState().mobileMenuOpen).toBe(false);
      });
    });

    describe("setLanguage", () => {
      it("should update language to valid value", () => {
        useUIStore.getState().setLanguage("es");
        expect(useUIStore.getState().language).toBe("es");
      });

      it("should update language to Arabic", () => {
        useUIStore.getState().setLanguage("ar");
        expect(useUIStore.getState().language).toBe("ar");
      });

      it("should update language to Japanese", () => {
        useUIStore.getState().setLanguage("ja");
        expect(useUIStore.getState().language).toBe("ja");
      });

      it("should default to en for invalid language", () => {
        useUIStore.getState().setLanguage("fr" as never);
        expect(useUIStore.getState().language).toBe("en");
      });
    });

    describe("setSidebarState", () => {
      it("should update sidebar to closed", () => {
        useUIStore.getState().setSidebarState("closed");
        expect(useUIStore.getState().sidebarState).toBe("closed");
      });

      it("should update sidebar to collapsed", () => {
        useUIStore.getState().setSidebarState("collapsed");
        expect(useUIStore.getState().sidebarState).toBe("collapsed");
      });

      it("should default to open for invalid state", () => {
        useUIStore.getState().setSidebarState("invalid" as never);
        expect(useUIStore.getState().sidebarState).toBe("open");
      });
    });

    describe("toggleSidebar", () => {
      it("should toggle from open to closed", () => {
        useUIStore.setState({ sidebarState: "open" });
        useUIStore.getState().toggleSidebar();
        expect(useUIStore.getState().sidebarState).toBe("closed");
      });

      it("should toggle from closed to open", () => {
        useUIStore.setState({ sidebarState: "closed" });
        useUIStore.getState().toggleSidebar();
        expect(useUIStore.getState().sidebarState).toBe("open");
      });

      it("should toggle from collapsed to open", () => {
        useUIStore.setState({ sidebarState: "collapsed" });
        useUIStore.getState().toggleSidebar();
        expect(useUIStore.getState().sidebarState).toBe("open");
      });
    });

    describe("setReaderNavPanel", () => {
      it("should set to toc", () => {
        useUIStore.getState().setReaderNavPanel("toc");
        expect(useUIStore.getState().readerNavPanel).toBe("toc");
      });

      it("should set to notes", () => {
        useUIStore.getState().setReaderNavPanel("notes");
        expect(useUIStore.getState().readerNavPanel).toBe("notes");
      });

      it("should set to search", () => {
        useUIStore.getState().setReaderNavPanel("search");
        expect(useUIStore.getState().readerNavPanel).toBe("search");
      });

      it("should set to settings", () => {
        useUIStore.getState().setReaderNavPanel("settings");
        expect(useUIStore.getState().readerNavPanel).toBe("settings");
      });

      it("should default to none for invalid panel", () => {
        useUIStore.getState().setReaderNavPanel("invalid" as never);
        expect(useUIStore.getState().readerNavPanel).toBe("none");
      });
    });

    describe("toggleReaderNavPanel", () => {
      it("should toggle panel on when none is selected", () => {
        useUIStore.setState({ readerNavPanel: "none" });
        useUIStore.getState().toggleReaderNavPanel("toc");
        expect(useUIStore.getState().readerNavPanel).toBe("toc");
      });

      it("should toggle panel off when same panel is selected", () => {
        useUIStore.setState({ readerNavPanel: "toc" });
        useUIStore.getState().toggleReaderNavPanel("toc");
        expect(useUIStore.getState().readerNavPanel).toBe("none");
      });

      it("should switch panels when different panel is selected", () => {
        useUIStore.setState({ readerNavPanel: "toc" });
        useUIStore.getState().toggleReaderNavPanel("notes");
        expect(useUIStore.getState().readerNavPanel).toBe("notes");
      });
    });

    describe("updatePreferences", () => {
      it("should update single preference", () => {
        useUIStore.getState().updatePreferences({ showWelcomeModal: false });
        expect(useUIStore.getState().preferences.showWelcomeModal).toBe(false);
      });

      it("should update multiple preferences", () => {
        useUIStore.getState().updatePreferences({
          showWelcomeModal: false,
          compactLibraryView: true,
        });
        const prefs = useUIStore.getState().preferences;
        expect(prefs.showWelcomeModal).toBe(false);
        expect(prefs.compactLibraryView).toBe(true);
      });

      it("should preserve other preferences", () => {
        useUIStore.getState().updatePreferences({ showWelcomeModal: false });
        const prefs = useUIStore.getState().preferences;
        expect(prefs.showWelcomeModal).toBe(false);
        expect(prefs.showReadingTips).toBe(true); // Default preserved
        expect(prefs.enableKeyboardShortcuts).toBe(true); // Default preserved
      });

      it("should validate boolean values", () => {
        useUIStore.getState().updatePreferences({
          showWelcomeModal: "true" as never,
        });
        // Invalid value should be ignored
        expect(useUIStore.getState().preferences.showWelcomeModal).toBe(true);
      });
    });

    describe("resetPreferences", () => {
      it("should reset all preferences to defaults", () => {
        // Change all preferences
        useUIStore.getState().updatePreferences({
          showWelcomeModal: false,
          showReadingTips: false,
          enableKeyboardShortcuts: false,
          showProgressInSidebar: false,
          compactLibraryView: true,
        });

        // Reset
        useUIStore.getState().resetPreferences();

        expect(useUIStore.getState().preferences).toEqual(
          DEFAULT_UI_PREFERENCES
        );
      });
    });

    describe("setMobileMenuOpen", () => {
      it("should set mobile menu to open", () => {
        useUIStore.getState().setMobileMenuOpen(true);
        expect(useUIStore.getState().mobileMenuOpen).toBe(true);
      });

      it("should set mobile menu to closed", () => {
        useUIStore.setState({ mobileMenuOpen: true });
        useUIStore.getState().setMobileMenuOpen(false);
        expect(useUIStore.getState().mobileMenuOpen).toBe(false);
      });
    });

    describe("toggleMobileMenu", () => {
      it("should toggle from closed to open", () => {
        useUIStore.setState({ mobileMenuOpen: false });
        useUIStore.getState().toggleMobileMenu();
        expect(useUIStore.getState().mobileMenuOpen).toBe(true);
      });

      it("should toggle from open to closed", () => {
        useUIStore.setState({ mobileMenuOpen: true });
        useUIStore.getState().toggleMobileMenu();
        expect(useUIStore.getState().mobileMenuOpen).toBe(false);
      });
    });
  });

  describe("real-world scenarios", () => {
    it("should handle user changing language and sidebar preferences", () => {
      const store = useUIStore.getState();

      // User changes language to Spanish
      store.setLanguage("es");

      // User prefers sidebar collapsed
      store.setSidebarState("collapsed");

      // User disables welcome modal after seeing it
      store.updatePreferences({ showWelcomeModal: false });

      const state = useUIStore.getState();
      expect(state.language).toBe("es");
      expect(state.sidebarState).toBe("collapsed");
      expect(state.preferences.showWelcomeModal).toBe(false);
    });

    it("should handle reader navigation panel workflow", () => {
      const store = useUIStore.getState();

      // User opens table of contents
      store.setReaderNavPanel("toc");
      expect(useUIStore.getState().readerNavPanel).toBe("toc");

      // User switches to notes
      store.toggleReaderNavPanel("notes");
      expect(useUIStore.getState().readerNavPanel).toBe("notes");

      // User closes notes panel
      store.toggleReaderNavPanel("notes");
      expect(useUIStore.getState().readerNavPanel).toBe("none");
    });

    it("should handle mobile menu interactions", () => {
      const store = useUIStore.getState();

      // User opens mobile menu
      store.toggleMobileMenu();
      expect(useUIStore.getState().mobileMenuOpen).toBe(true);

      // User navigates and closes menu
      store.setMobileMenuOpen(false);
      expect(useUIStore.getState().mobileMenuOpen).toBe(false);
    });

    it("should handle RTL language switching", () => {
      const store = useUIStore.getState();

      // User switches to Arabic (RTL)
      store.setLanguage("ar");
      expect(useUIStore.getState().language).toBe("ar");

      // User switches back to English (LTR)
      store.setLanguage("en");
      expect(useUIStore.getState().language).toBe("en");
    });
  });
});
