/**
 * Tests for keyboard shortcuts and gestures types and utilities
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  // Constants
  SHORTCUT_PREFERENCES_KEY,
  SHORTCUT_CATEGORIES,
  MODIFIER_KEYS,
  SPECIAL_KEYS,
  GESTURE_TYPES,
  MIN_SWIPE_DISTANCE,
  MIN_SWIPE_VELOCITY,
  LONG_PRESS_DURATION,
  DOUBLE_TAP_INTERVAL,
  PINCH_THRESHOLD,
  // Default data
  DEFAULT_SHORTCUTS,
  DEFAULT_GESTURES,
  DEFAULT_SHORTCUT_PREFERENCES,
  // Utility functions
  getKeyDisplayString,
  getModifierDisplayString,
  formatShortcutDisplay,
  isMacPlatform,
  eventMatchesShortcut,
  getShortcutsByCategory,
  getGesturesByCategory,
  getGroupedShortcuts,
  findShortcutById,
  findGestureById,
  // Preferences persistence
  loadShortcutPreferences,
  saveShortcutPreferences,
  updateShortcutPreference,
  toggleShortcutEnabled,
  toggleGestureEnabled,
  setCustomBinding,
  clearCustomBinding,
  resetShortcutPreferences,
  // Touch gesture detection
  createInitialTouchState,
  calculateDistance,
  calculateVelocity,
  detectSwipeGesture,
  detectPinchGesture,
  shouldPreventGesture,
  isShortcutEnabled,
  isGestureEnabled,
  getEffectiveBinding,
  validateCustomBinding,
  getCategoryLabelKey,
  getGestureIconName,
  // Types
  type ShortcutDefinition,
  type ShortcutPreferences,
  type TouchPosition,
} from "./keyboardShortcutTypes";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("keyboardShortcutTypes", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  // =========================================================================
  // Constants Tests
  // =========================================================================

  describe("Constants", () => {
    it("has correct SHORTCUT_PREFERENCES_KEY", () => {
      expect(SHORTCUT_PREFERENCES_KEY).toBe("reader_shortcut_preferences");
    });

    it("has all shortcut categories", () => {
      expect(SHORTCUT_CATEGORIES).toContain("navigation");
      expect(SHORTCUT_CATEGORIES).toContain("annotation");
      expect(SHORTCUT_CATEGORIES).toContain("reader");
      expect(SHORTCUT_CATEGORIES).toContain("ai");
      expect(SHORTCUT_CATEGORIES).toHaveLength(4);
    });

    it("has all modifier keys", () => {
      expect(MODIFIER_KEYS).toContain("ctrl");
      expect(MODIFIER_KEYS).toContain("alt");
      expect(MODIFIER_KEYS).toContain("shift");
      expect(MODIFIER_KEYS).toContain("meta");
      expect(MODIFIER_KEYS).toHaveLength(4);
    });

    it("has special keys mapped", () => {
      expect(SPECIAL_KEYS["ArrowLeft"]).toBe("←");
      expect(SPECIAL_KEYS["ArrowRight"]).toBe("→");
      expect(SPECIAL_KEYS[" "]).toBe("Space");
      expect(SPECIAL_KEYS["Escape"]).toBe("Esc");
    });

    it("has all gesture types", () => {
      expect(GESTURE_TYPES).toContain("swipeLeft");
      expect(GESTURE_TYPES).toContain("swipeRight");
      expect(GESTURE_TYPES).toContain("tap");
      expect(GESTURE_TYPES).toContain("doubleTap");
      expect(GESTURE_TYPES).toContain("longPress");
      expect(GESTURE_TYPES).toContain("pinchIn");
      expect(GESTURE_TYPES).toContain("pinchOut");
    });

    it("has reasonable touch constants", () => {
      expect(MIN_SWIPE_DISTANCE).toBe(50);
      expect(MIN_SWIPE_VELOCITY).toBe(0.3);
      expect(LONG_PRESS_DURATION).toBe(500);
      expect(DOUBLE_TAP_INTERVAL).toBe(300);
      expect(PINCH_THRESHOLD).toBe(0.1);
    });
  });

  // =========================================================================
  // Default Data Tests
  // =========================================================================

  describe("DEFAULT_SHORTCUTS", () => {
    it("contains navigation shortcuts", () => {
      const navShortcuts = DEFAULT_SHORTCUTS.filter(
        (s) => s.category === "navigation"
      );
      expect(navShortcuts.length).toBeGreaterThan(0);
      expect(navShortcuts.some((s) => s.id === "nextPage")).toBe(true);
      expect(navShortcuts.some((s) => s.id === "prevPage")).toBe(true);
    });

    it("contains annotation shortcuts", () => {
      const annotationShortcuts = DEFAULT_SHORTCUTS.filter(
        (s) => s.category === "annotation"
      );
      expect(annotationShortcuts.length).toBeGreaterThan(0);
      expect(annotationShortcuts.some((s) => s.id === "highlight")).toBe(true);
      expect(annotationShortcuts.some((s) => s.id === "addNote")).toBe(true);
    });

    it("contains reader shortcuts", () => {
      const readerShortcuts = DEFAULT_SHORTCUTS.filter(
        (s) => s.category === "reader"
      );
      expect(readerShortcuts.length).toBeGreaterThan(0);
      expect(readerShortcuts.some((s) => s.id === "zoomIn")).toBe(true);
      expect(readerShortcuts.some((s) => s.id === "toggleFullscreen")).toBe(
        true
      );
    });

    it("contains AI shortcuts", () => {
      const aiShortcuts = DEFAULT_SHORTCUTS.filter((s) => s.category === "ai");
      expect(aiShortcuts.length).toBeGreaterThan(0);
      expect(aiShortcuts.some((s) => s.id === "explain")).toBe(true);
      expect(aiShortcuts.some((s) => s.id === "lookup")).toBe(true);
    });

    it("has valid shortcut structure", () => {
      for (const shortcut of DEFAULT_SHORTCUTS) {
        expect(shortcut.id).toBeTruthy();
        expect(shortcut.key).toBeTruthy();
        expect(Array.isArray(shortcut.modifiers)).toBe(true);
        expect(shortcut.labelKey).toBeTruthy();
        expect(shortcut.descriptionKey).toBeTruthy();
        expect(SHORTCUT_CATEGORIES).toContain(shortcut.category);
        expect(typeof shortcut.customizable).toBe("boolean");
        expect(typeof shortcut.enabledByDefault).toBe("boolean");
      }
    });
  });

  describe("DEFAULT_GESTURES", () => {
    it("contains gesture definitions", () => {
      expect(DEFAULT_GESTURES.length).toBeGreaterThan(0);
    });

    it("has valid gesture structure", () => {
      for (const gesture of DEFAULT_GESTURES) {
        expect(gesture.id).toBeTruthy();
        expect(GESTURE_TYPES).toContain(gesture.type);
        expect(gesture.labelKey).toBeTruthy();
        expect(gesture.descriptionKey).toBeTruthy();
        expect(SHORTCUT_CATEGORIES).toContain(gesture.category);
        expect(typeof gesture.enabledByDefault).toBe("boolean");
      }
    });
  });

  describe("DEFAULT_SHORTCUT_PREFERENCES", () => {
    it("has all required fields", () => {
      expect(Array.isArray(DEFAULT_SHORTCUT_PREFERENCES.enabledShortcuts)).toBe(
        true
      );
      expect(Array.isArray(DEFAULT_SHORTCUT_PREFERENCES.enabledGestures)).toBe(
        true
      );
      expect(typeof DEFAULT_SHORTCUT_PREFERENCES.customBindings).toBe("object");
      expect(DEFAULT_SHORTCUT_PREFERENCES.shortcutsEnabled).toBe(true);
      expect(DEFAULT_SHORTCUT_PREFERENCES.gesturesEnabled).toBe(true);
    });

    it("has shortcuts enabled by default", () => {
      const defaultEnabled = DEFAULT_SHORTCUTS.filter(
        (s) => s.enabledByDefault
      ).map((s) => s.id);
      expect(DEFAULT_SHORTCUT_PREFERENCES.enabledShortcuts).toEqual(
        defaultEnabled
      );
    });
  });

  // =========================================================================
  // Utility Functions Tests
  // =========================================================================

  describe("getKeyDisplayString", () => {
    it("returns arrow symbol for arrow keys", () => {
      expect(getKeyDisplayString("ArrowLeft")).toBe("←");
      expect(getKeyDisplayString("ArrowRight")).toBe("→");
      expect(getKeyDisplayString("ArrowUp")).toBe("↑");
      expect(getKeyDisplayString("ArrowDown")).toBe("↓");
    });

    it("returns Space for space key", () => {
      expect(getKeyDisplayString(" ")).toBe("Space");
    });

    it("returns Esc for Escape key", () => {
      expect(getKeyDisplayString("Escape")).toBe("Esc");
    });

    it("returns uppercase for single letters", () => {
      expect(getKeyDisplayString("h")).toBe("H");
      expect(getKeyDisplayString("n")).toBe("N");
    });

    it("returns key as-is for other keys", () => {
      expect(getKeyDisplayString("Enter")).toBe("Enter");
      expect(getKeyDisplayString("Tab")).toBe("Tab");
    });
  });

  describe("getModifierDisplayString", () => {
    it("returns correct symbols for Mac", () => {
      expect(getModifierDisplayString("ctrl", true)).toBe("⌘");
      expect(getModifierDisplayString("alt", true)).toBe("⌥");
      expect(getModifierDisplayString("shift", true)).toBe("⇧");
      expect(getModifierDisplayString("meta", true)).toBe("⌘");
    });

    it("returns correct strings for non-Mac", () => {
      expect(getModifierDisplayString("ctrl", false)).toBe("Ctrl");
      expect(getModifierDisplayString("alt", false)).toBe("Alt");
      expect(getModifierDisplayString("shift", false)).toBe("Shift");
      expect(getModifierDisplayString("meta", false)).toBe("Win");
    });
  });

  describe("formatShortcutDisplay", () => {
    it("formats shortcut without modifiers", () => {
      const shortcut: ShortcutDefinition = {
        id: "test",
        key: "h",
        modifiers: [],
        labelKey: "test",
        descriptionKey: "test",
        category: "navigation",
        customizable: true,
        enabledByDefault: true,
      };
      expect(formatShortcutDisplay(shortcut, false)).toBe("H");
    });

    it("formats shortcut with single modifier", () => {
      const shortcut: ShortcutDefinition = {
        id: "test",
        key: "s",
        modifiers: ["ctrl"],
        labelKey: "test",
        descriptionKey: "test",
        category: "navigation",
        customizable: true,
        enabledByDefault: true,
      };
      expect(formatShortcutDisplay(shortcut, false)).toBe("Ctrl + S");
    });

    it("formats shortcut with multiple modifiers", () => {
      const shortcut: ShortcutDefinition = {
        id: "test",
        key: "s",
        modifiers: ["ctrl", "shift"],
        labelKey: "test",
        descriptionKey: "test",
        category: "navigation",
        customizable: true,
        enabledByDefault: true,
      };
      expect(formatShortcutDisplay(shortcut, false)).toBe("Ctrl + Shift + S");
    });

    it("uses correct Mac symbols", () => {
      const shortcut: ShortcutDefinition = {
        id: "test",
        key: "s",
        modifiers: ["ctrl", "shift"],
        labelKey: "test",
        descriptionKey: "test",
        category: "navigation",
        customizable: true,
        enabledByDefault: true,
      };
      expect(formatShortcutDisplay(shortcut, true)).toBe("⌘⇧S");
    });
  });

  describe("isMacPlatform", () => {
    it("returns false when navigator is undefined", () => {
      const originalNavigator = global.navigator;
      // @ts-expect-error Testing undefined navigator
      delete global.navigator;
      expect(isMacPlatform()).toBe(false);
      global.navigator = originalNavigator;
    });
  });

  describe("eventMatchesShortcut", () => {
    it("matches simple key press", () => {
      const shortcut: ShortcutDefinition = {
        id: "test",
        key: "h",
        modifiers: [],
        labelKey: "test",
        descriptionKey: "test",
        category: "navigation",
        customizable: true,
        enabledByDefault: true,
      };

      const event = new KeyboardEvent("keydown", {
        key: "h",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
      });

      expect(eventMatchesShortcut(event, shortcut)).toBe(true);
    });

    it("matches key with modifier", () => {
      const shortcut: ShortcutDefinition = {
        id: "test",
        key: "s",
        modifiers: ["ctrl"],
        labelKey: "test",
        descriptionKey: "test",
        category: "navigation",
        customizable: true,
        enabledByDefault: true,
      };

      const event = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
      });

      expect(eventMatchesShortcut(event, shortcut)).toBe(true);
    });

    it("does not match when modifier is missing", () => {
      const shortcut: ShortcutDefinition = {
        id: "test",
        key: "s",
        modifiers: ["ctrl"],
        labelKey: "test",
        descriptionKey: "test",
        category: "navigation",
        customizable: true,
        enabledByDefault: true,
      };

      const event = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
      });

      expect(eventMatchesShortcut(event, shortcut)).toBe(false);
    });

    it("does not match wrong key", () => {
      const shortcut: ShortcutDefinition = {
        id: "test",
        key: "h",
        modifiers: [],
        labelKey: "test",
        descriptionKey: "test",
        category: "navigation",
        customizable: true,
        enabledByDefault: true,
      };

      const event = new KeyboardEvent("keydown", {
        key: "j",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
      });

      expect(eventMatchesShortcut(event, shortcut)).toBe(false);
    });

    it("matches with custom binding", () => {
      const shortcut: ShortcutDefinition = {
        id: "test",
        key: "h",
        modifiers: [],
        labelKey: "test",
        descriptionKey: "test",
        category: "navigation",
        customizable: true,
        enabledByDefault: true,
      };

      const customBinding = { key: "j", modifiers: ["ctrl" as const] };

      const event = new KeyboardEvent("keydown", {
        key: "j",
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
      });

      expect(eventMatchesShortcut(event, shortcut, customBinding)).toBe(true);
    });
  });

  describe("getShortcutsByCategory", () => {
    it("returns navigation shortcuts", () => {
      const shortcuts = getShortcutsByCategory("navigation");
      expect(shortcuts.every((s) => s.category === "navigation")).toBe(true);
      expect(shortcuts.length).toBeGreaterThan(0);
    });

    it("returns annotation shortcuts", () => {
      const shortcuts = getShortcutsByCategory("annotation");
      expect(shortcuts.every((s) => s.category === "annotation")).toBe(true);
    });
  });

  describe("getGesturesByCategory", () => {
    it("returns gestures for category", () => {
      const gestures = getGesturesByCategory("navigation");
      expect(gestures.every((g) => g.category === "navigation")).toBe(true);
    });
  });

  describe("getGroupedShortcuts", () => {
    it("returns all categories", () => {
      const grouped = getGroupedShortcuts();
      expect(grouped.navigation).toBeDefined();
      expect(grouped.annotation).toBeDefined();
      expect(grouped.reader).toBeDefined();
      expect(grouped.ai).toBeDefined();
    });

    it("groups shortcuts correctly", () => {
      const grouped = getGroupedShortcuts();
      expect(
        grouped.navigation.shortcuts.every((s) => s.category === "navigation")
      ).toBe(true);
      expect(
        grouped.annotation.shortcuts.every((s) => s.category === "annotation")
      ).toBe(true);
    });
  });

  describe("findShortcutById", () => {
    it("finds existing shortcut", () => {
      const shortcut = findShortcutById("nextPage");
      expect(shortcut).toBeDefined();
      expect(shortcut?.id).toBe("nextPage");
    });

    it("returns undefined for non-existent shortcut", () => {
      const shortcut = findShortcutById("nonExistent");
      expect(shortcut).toBeUndefined();
    });
  });

  describe("findGestureById", () => {
    it("finds existing gesture", () => {
      const gesture = findGestureById("swipeLeftNav");
      expect(gesture).toBeDefined();
      expect(gesture?.id).toBe("swipeLeftNav");
    });

    it("returns undefined for non-existent gesture", () => {
      const gesture = findGestureById("nonExistent");
      expect(gesture).toBeUndefined();
    });
  });

  // =========================================================================
  // Preferences Persistence Tests
  // =========================================================================

  describe("loadShortcutPreferences", () => {
    it("returns defaults when nothing stored", () => {
      const prefs = loadShortcutPreferences();
      expect(prefs).toEqual(DEFAULT_SHORTCUT_PREFERENCES);
    });

    it("loads stored preferences", () => {
      const customPrefs: ShortcutPreferences = {
        ...DEFAULT_SHORTCUT_PREFERENCES,
        shortcutsEnabled: false,
      };
      localStorage.setItem(
        SHORTCUT_PREFERENCES_KEY,
        JSON.stringify(customPrefs)
      );

      const prefs = loadShortcutPreferences();
      expect(prefs.shortcutsEnabled).toBe(false);
    });

    it("handles invalid JSON gracefully", () => {
      localStorage.setItem(SHORTCUT_PREFERENCES_KEY, "invalid json");
      const prefs = loadShortcutPreferences();
      expect(prefs).toEqual(DEFAULT_SHORTCUT_PREFERENCES);
    });

    it("fills missing fields with defaults", () => {
      localStorage.setItem(
        SHORTCUT_PREFERENCES_KEY,
        JSON.stringify({ shortcutsEnabled: false })
      );
      const prefs = loadShortcutPreferences();
      expect(prefs.shortcutsEnabled).toBe(false);
      expect(prefs.enabledShortcuts).toEqual(
        DEFAULT_SHORTCUT_PREFERENCES.enabledShortcuts
      );
    });
  });

  describe("saveShortcutPreferences", () => {
    it("saves preferences to localStorage", () => {
      const prefs: ShortcutPreferences = {
        ...DEFAULT_SHORTCUT_PREFERENCES,
        shortcutsEnabled: false,
      };
      saveShortcutPreferences(prefs);

      const stored = JSON.parse(
        localStorage.getItem(SHORTCUT_PREFERENCES_KEY) || "{}"
      );
      expect(stored.shortcutsEnabled).toBe(false);
    });
  });

  describe("updateShortcutPreference", () => {
    it("updates single preference", () => {
      const result = updateShortcutPreference("shortcutsEnabled", false);
      expect(result.shortcutsEnabled).toBe(false);

      const loaded = loadShortcutPreferences();
      expect(loaded.shortcutsEnabled).toBe(false);
    });
  });

  describe("toggleShortcutEnabled", () => {
    it("disables enabled shortcut", () => {
      // Start fresh - nextPage should be enabled by default
      const initialPrefs = loadShortcutPreferences();
      expect(initialPrefs.enabledShortcuts).toContain("nextPage");

      // Toggle should disable it
      const prefs = toggleShortcutEnabled("nextPage");
      expect(prefs.enabledShortcuts).not.toContain("nextPage");

      // Verify it was saved
      const savedPrefs = loadShortcutPreferences();
      expect(savedPrefs.enabledShortcuts).not.toContain("nextPage");
    });

    it("enables disabled shortcut", () => {
      // Start with nextPage disabled by saving prefs without it
      const prefsWithoutNextPage = {
        ...DEFAULT_SHORTCUT_PREFERENCES,
        enabledShortcuts: DEFAULT_SHORTCUT_PREFERENCES.enabledShortcuts.filter(
          (id) => id !== "nextPage"
        ),
      };
      saveShortcutPreferences(prefsWithoutNextPage);

      // Verify it's disabled
      const beforeToggle = loadShortcutPreferences();
      expect(beforeToggle.enabledShortcuts).not.toContain("nextPage");

      // Toggle should enable it
      const prefs = toggleShortcutEnabled("nextPage");
      expect(prefs.enabledShortcuts).toContain("nextPage");
    });
  });

  describe("toggleGestureEnabled", () => {
    it("disables enabled gesture", () => {
      // Start fresh - swipeLeftNav should be enabled by default
      const initialPrefs = loadShortcutPreferences();
      expect(initialPrefs.enabledGestures).toContain("swipeLeftNav");

      // Toggle should disable it
      const prefs = toggleGestureEnabled("swipeLeftNav");
      expect(prefs.enabledGestures).not.toContain("swipeLeftNav");

      // Verify it was saved
      const savedPrefs = loadShortcutPreferences();
      expect(savedPrefs.enabledGestures).not.toContain("swipeLeftNav");
    });

    it("enables disabled gesture", () => {
      // Start with swipeLeftNav disabled by saving prefs without it
      const prefsWithoutGesture = {
        ...DEFAULT_SHORTCUT_PREFERENCES,
        enabledGestures: DEFAULT_SHORTCUT_PREFERENCES.enabledGestures.filter(
          (id) => id !== "swipeLeftNav"
        ),
      };
      saveShortcutPreferences(prefsWithoutGesture);

      // Verify it's disabled
      const beforeToggle = loadShortcutPreferences();
      expect(beforeToggle.enabledGestures).not.toContain("swipeLeftNav");

      // Toggle should enable it
      const prefs = toggleGestureEnabled("swipeLeftNav");
      expect(prefs.enabledGestures).toContain("swipeLeftNav");
    });
  });

  describe("setCustomBinding", () => {
    it("sets custom binding", () => {
      const prefs = setCustomBinding("nextPage", { key: "j" });
      expect(prefs.customBindings["nextPage"]).toEqual({ key: "j" });
    });
  });

  describe("clearCustomBinding", () => {
    it("clears custom binding", () => {
      setCustomBinding("nextPage", { key: "j" });
      const prefs = clearCustomBinding("nextPage");
      expect(prefs.customBindings["nextPage"]).toBeUndefined();
    });
  });

  describe("resetShortcutPreferences", () => {
    it("resets to defaults", () => {
      updateShortcutPreference("shortcutsEnabled", false);
      const prefs = resetShortcutPreferences();
      expect(prefs).toEqual(DEFAULT_SHORTCUT_PREFERENCES);
    });
  });

  // =========================================================================
  // Touch Gesture Detection Tests
  // =========================================================================

  describe("createInitialTouchState", () => {
    it("creates initial state with correct defaults", () => {
      const state = createInitialTouchState();
      expect(state.startPositions).toEqual([]);
      expect(state.currentPositions).toEqual([]);
      expect(state.isActive).toBe(false);
      expect(state.longPressTimer).toBeNull();
      expect(state.lastTapTime).toBe(0);
      expect(state.initialPinchDistance).toBeNull();
    });
  });

  describe("calculateDistance", () => {
    it("calculates distance between two points", () => {
      const p1: TouchPosition = { x: 0, y: 0, timestamp: 0 };
      const p2: TouchPosition = { x: 3, y: 4, timestamp: 100 };
      expect(calculateDistance(p1, p2)).toBe(5); // 3-4-5 triangle
    });

    it("returns 0 for same point", () => {
      const p1: TouchPosition = { x: 10, y: 10, timestamp: 0 };
      const p2: TouchPosition = { x: 10, y: 10, timestamp: 100 };
      expect(calculateDistance(p1, p2)).toBe(0);
    });
  });

  describe("calculateVelocity", () => {
    it("calculates velocity correctly", () => {
      const start: TouchPosition = { x: 0, y: 0, timestamp: 0 };
      const end: TouchPosition = { x: 100, y: 0, timestamp: 100 };
      expect(calculateVelocity(start, end)).toBe(1); // 100px / 100ms = 1 px/ms
    });

    it("returns 0 when no time passed", () => {
      const start: TouchPosition = { x: 0, y: 0, timestamp: 100 };
      const end: TouchPosition = { x: 100, y: 0, timestamp: 100 };
      expect(calculateVelocity(start, end)).toBe(0);
    });
  });

  describe("detectSwipeGesture", () => {
    it("detects horizontal swipe right", () => {
      const start: TouchPosition = { x: 0, y: 100, timestamp: 0 };
      const end: TouchPosition = { x: 100, y: 100, timestamp: 100 };
      const gesture = detectSwipeGesture(start, end);
      expect(gesture?.type).toBe("swipeRight");
    });

    it("detects horizontal swipe left", () => {
      const start: TouchPosition = { x: 100, y: 100, timestamp: 0 };
      const end: TouchPosition = { x: 0, y: 100, timestamp: 100 };
      const gesture = detectSwipeGesture(start, end);
      expect(gesture?.type).toBe("swipeLeft");
    });

    it("detects vertical swipe down", () => {
      const start: TouchPosition = { x: 100, y: 0, timestamp: 0 };
      const end: TouchPosition = { x: 100, y: 100, timestamp: 100 };
      const gesture = detectSwipeGesture(start, end);
      expect(gesture?.type).toBe("swipeDown");
    });

    it("detects vertical swipe up", () => {
      const start: TouchPosition = { x: 100, y: 100, timestamp: 0 };
      const end: TouchPosition = { x: 100, y: 0, timestamp: 100 };
      const gesture = detectSwipeGesture(start, end);
      expect(gesture?.type).toBe("swipeUp");
    });

    it("returns null for short movement", () => {
      const start: TouchPosition = { x: 0, y: 0, timestamp: 0 };
      const end: TouchPosition = { x: 10, y: 0, timestamp: 100 };
      const gesture = detectSwipeGesture(start, end);
      expect(gesture).toBeNull();
    });

    it("returns null for slow movement", () => {
      const start: TouchPosition = { x: 0, y: 0, timestamp: 0 };
      const end: TouchPosition = { x: 100, y: 0, timestamp: 10000 };
      const gesture = detectSwipeGesture(start, end);
      expect(gesture).toBeNull();
    });
  });

  describe("detectPinchGesture", () => {
    it("detects pinch out (zoom in)", () => {
      const gesture = detectPinchGesture(100, 150);
      expect(gesture?.type).toBe("pinchOut");
      expect(gesture?.scale).toBe(1.5);
    });

    it("detects pinch in (zoom out)", () => {
      const gesture = detectPinchGesture(100, 50);
      expect(gesture?.type).toBe("pinchIn");
      expect(gesture?.scale).toBe(0.5);
    });

    it("returns null for small change", () => {
      const gesture = detectPinchGesture(100, 105);
      expect(gesture).toBeNull();
    });
  });

  describe("shouldPreventGesture", () => {
    it("returns false for null target", () => {
      expect(shouldPreventGesture(null)).toBe(false);
    });

    it("returns true for input elements", () => {
      const input = document.createElement("input");
      expect(shouldPreventGesture(input)).toBe(true);
    });

    it("returns true for textarea elements", () => {
      const textarea = document.createElement("textarea");
      expect(shouldPreventGesture(textarea)).toBe(true);
    });

    it("returns false for div elements", () => {
      const div = document.createElement("div");
      expect(shouldPreventGesture(div)).toBe(false);
    });
  });

  // =========================================================================
  // Helper Functions Tests
  // =========================================================================

  describe("isShortcutEnabled", () => {
    it("returns true for enabled shortcut", () => {
      const prefs: ShortcutPreferences = {
        ...DEFAULT_SHORTCUT_PREFERENCES,
        enabledShortcuts: ["nextPage"],
      };
      expect(isShortcutEnabled("nextPage", prefs)).toBe(true);
    });

    it("returns false for disabled shortcut", () => {
      const prefs: ShortcutPreferences = {
        ...DEFAULT_SHORTCUT_PREFERENCES,
        enabledShortcuts: [],
      };
      expect(isShortcutEnabled("nextPage", prefs)).toBe(false);
    });

    it("returns false when shortcuts globally disabled", () => {
      const prefs: ShortcutPreferences = {
        ...DEFAULT_SHORTCUT_PREFERENCES,
        shortcutsEnabled: false,
      };
      expect(isShortcutEnabled("nextPage", prefs)).toBe(false);
    });
  });

  describe("isGestureEnabled", () => {
    it("returns true for enabled gesture", () => {
      const prefs: ShortcutPreferences = {
        ...DEFAULT_SHORTCUT_PREFERENCES,
        enabledGestures: ["swipeLeftNav"],
      };
      expect(isGestureEnabled("swipeLeftNav", prefs)).toBe(true);
    });

    it("returns false when gestures globally disabled", () => {
      const prefs: ShortcutPreferences = {
        ...DEFAULT_SHORTCUT_PREFERENCES,
        gesturesEnabled: false,
      };
      expect(isGestureEnabled("swipeLeftNav", prefs)).toBe(false);
    });
  });

  describe("getEffectiveBinding", () => {
    it("returns default binding when no custom binding", () => {
      const shortcut = findShortcutById("nextPage")!;
      const prefs = DEFAULT_SHORTCUT_PREFERENCES;
      const binding = getEffectiveBinding(shortcut, prefs);
      expect(binding.key).toBe(shortcut.key);
      expect(binding.modifiers).toEqual(shortcut.modifiers);
    });

    it("returns custom binding when set", () => {
      const shortcut = findShortcutById("nextPage")!;
      const prefs: ShortcutPreferences = {
        ...DEFAULT_SHORTCUT_PREFERENCES,
        customBindings: { nextPage: { key: "j", modifiers: ["ctrl"] } },
      };
      const binding = getEffectiveBinding(shortcut, prefs);
      expect(binding.key).toBe("j");
      expect(binding.modifiers).toEqual(["ctrl"]);
    });
  });

  describe("validateCustomBinding", () => {
    it("returns valid for non-conflicting binding", () => {
      const result = validateCustomBinding(
        "nextPage",
        { key: "x" },
        DEFAULT_SHORTCUT_PREFERENCES
      );
      expect(result.valid).toBe(true);
    });

    it("returns invalid for conflicting binding", () => {
      const result = validateCustomBinding(
        "nextPage",
        { key: "h", modifiers: [] },
        DEFAULT_SHORTCUT_PREFERENCES
      );
      expect(result.valid).toBe(false);
      expect(result.conflictingId).toBe("highlight");
    });

    it("returns valid when key is empty", () => {
      const result = validateCustomBinding(
        "nextPage",
        {},
        DEFAULT_SHORTCUT_PREFERENCES
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("getCategoryLabelKey", () => {
    it("returns correct label key", () => {
      expect(getCategoryLabelKey("navigation")).toBe(
        "reader.shortcuts.categories.navigation"
      );
      expect(getCategoryLabelKey("annotation")).toBe(
        "reader.shortcuts.categories.annotation"
      );
    });
  });

  describe("getGestureIconName", () => {
    it("returns correct icon for swipe gestures", () => {
      expect(getGestureIconName("swipeLeft")).toBe("swipe_left");
      expect(getGestureIconName("swipeRight")).toBe("swipe_right");
    });

    it("returns correct icon for tap gestures", () => {
      expect(getGestureIconName("tap")).toBe("touch_app");
      expect(getGestureIconName("doubleTap")).toBe("ads_click");
    });

    it("returns correct icon for pinch gestures", () => {
      expect(getGestureIconName("pinchIn")).toBe("pinch");
      expect(getGestureIconName("pinchOut")).toBe("pinch");
    });
  });
});
