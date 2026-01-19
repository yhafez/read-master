/**
 * Keyboard shortcuts and gestures types and utilities for the reader.
 * Provides comprehensive support for navigation, annotations, and reader actions.
 */

// ============================================================================
// Constants
// ============================================================================

/** Storage key for shortcut preferences */
export const SHORTCUT_PREFERENCES_KEY = "reader_shortcut_preferences";

/** Categories of keyboard shortcuts */
export const SHORTCUT_CATEGORIES = [
  "navigation",
  "annotation",
  "reader",
  "ai",
] as const;

/** Modifier keys */
export const MODIFIER_KEYS = ["ctrl", "alt", "shift", "meta"] as const;

/** Special keys that need display translation */
export const SPECIAL_KEYS: Record<string, string> = {
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  " ": "Space",
  Enter: "Enter",
  Escape: "Esc",
  Backspace: "Backspace",
  Delete: "Delete",
  Tab: "Tab",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
};

/** Touch gesture types */
export const GESTURE_TYPES = [
  "swipeLeft",
  "swipeRight",
  "swipeUp",
  "swipeDown",
  "tap",
  "doubleTap",
  "longPress",
  "pinchIn",
  "pinchOut",
] as const;

/** Minimum swipe distance in pixels */
export const MIN_SWIPE_DISTANCE = 50;

/** Minimum swipe velocity in pixels/ms */
export const MIN_SWIPE_VELOCITY = 0.3;

/** Long press duration in milliseconds */
export const LONG_PRESS_DURATION = 500;

/** Double tap max interval in milliseconds */
export const DOUBLE_TAP_INTERVAL = 300;

/** Pinch threshold for zoom detection */
export const PINCH_THRESHOLD = 0.1;

// ============================================================================
// Types
// ============================================================================

/** Shortcut category type */
export type ShortcutCategory = (typeof SHORTCUT_CATEGORIES)[number];

/** Modifier key type */
export type ModifierKey = (typeof MODIFIER_KEYS)[number];

/** Gesture type */
export type GestureType = (typeof GESTURE_TYPES)[number];

/**
 * A keyboard shortcut definition
 */
export interface ShortcutDefinition {
  /** Unique identifier for the shortcut */
  id: string;
  /** Primary key to press (e.g., "ArrowLeft", "h", "1") */
  key: string;
  /** Required modifier keys */
  modifiers: ModifierKey[];
  /** i18n key for the action label */
  labelKey: string;
  /** i18n key for the action description */
  descriptionKey: string;
  /** Category of the shortcut */
  category: ShortcutCategory;
  /** Whether this shortcut can be customized */
  customizable: boolean;
  /** Whether this shortcut is enabled by default */
  enabledByDefault: boolean;
}

/**
 * A touch gesture definition
 */
export interface GestureDefinition {
  /** Unique identifier for the gesture */
  id: string;
  /** Type of gesture */
  type: GestureType;
  /** i18n key for the action label */
  labelKey: string;
  /** i18n key for the action description */
  descriptionKey: string;
  /** Category of the gesture */
  category: ShortcutCategory;
  /** Whether this gesture is enabled by default */
  enabledByDefault: boolean;
}

/**
 * User preferences for shortcuts and gestures
 */
export interface ShortcutPreferences {
  /** Enabled shortcut IDs */
  enabledShortcuts: string[];
  /** Enabled gesture IDs */
  enabledGestures: string[];
  /** Custom key bindings (shortcut ID -> custom definition) */
  customBindings: Record<
    string,
    Partial<Pick<ShortcutDefinition, "key" | "modifiers">>
  >;
  /** Whether shortcuts are globally enabled */
  shortcutsEnabled: boolean;
  /** Whether gestures are globally enabled */
  gesturesEnabled: boolean;
}

/**
 * Touch position for gesture tracking
 */
export interface TouchPosition {
  x: number;
  y: number;
  timestamp: number;
}

/**
 * Touch state for gesture detection
 */
export interface TouchState {
  /** Start position(s) of touch(es) */
  startPositions: TouchPosition[];
  /** Current position(s) of touch(es) */
  currentPositions: TouchPosition[];
  /** Whether a gesture is in progress */
  isActive: boolean;
  /** ID of the long press timer */
  longPressTimer: ReturnType<typeof setTimeout> | null;
  /** Last tap timestamp for double-tap detection */
  lastTapTime: number;
  /** Initial distance between two fingers (for pinch) */
  initialPinchDistance: number | null;
}

/**
 * Detected gesture result
 */
export interface DetectedGesture {
  type: GestureType;
  /** Velocity for swipe gestures */
  velocity?: number;
  /** Direction delta */
  delta?: { x: number; y: number };
  /** Scale factor for pinch gestures */
  scale?: number;
}

/**
 * Props for the keyboard shortcuts help dialog
 */
export interface ShortcutsHelpDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
}

/**
 * Props for the useKeyboardShortcuts hook
 */
export interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Callbacks for each shortcut action */
  handlers: ShortcutHandlers;
  /** Ref to the element to attach shortcuts to (defaults to document) */
  targetRef?: React.RefObject<HTMLElement>;
}

/**
 * Props for the useTouchGestures hook
 */
export interface UseTouchGesturesOptions {
  /** Whether gestures are enabled */
  enabled?: boolean;
  /** Callbacks for each gesture action */
  handlers: GestureHandlers;
  /** Ref to the element to attach gestures to */
  targetRef: React.RefObject<HTMLElement>;
}

/**
 * Handler functions for keyboard shortcuts
 */
export interface ShortcutHandlers {
  // Navigation
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onFirstPage?: () => void;
  onLastPage?: () => void;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  onGoToPage?: () => void;
  onToggleToc?: () => void;

  // Annotation
  onHighlight?: () => void;
  onAddNote?: () => void;
  onAddBookmark?: () => void;
  onCopyText?: () => void;

  // Reader
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onIncreaseFontSize?: () => void;
  onDecreaseFontSize?: () => void;
  onToggleFullscreen?: () => void;
  onToggleTheme?: () => void;
  onToggleSettings?: () => void;
  onShowHelp?: () => void;
  onEscape?: () => void;

  // AI
  onExplain?: () => void;
  onAskQuestion?: () => void;
  onToggleChat?: () => void;
  onLookup?: () => void;
  onTranslate?: () => void;
}

/**
 * Handler functions for touch gestures
 */
export interface GestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: (position: { x: number; y: number }) => void;
  onDoubleTap?: (position: { x: number; y: number }) => void;
  onLongPress?: (position: { x: number; y: number }) => void;
  onPinchIn?: (scale: number) => void;
  onPinchOut?: (scale: number) => void;
}

// ============================================================================
// Default Shortcut Definitions
// ============================================================================

/** Default keyboard shortcuts */
export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // Navigation shortcuts
  {
    id: "nextPage",
    key: "ArrowRight",
    modifiers: [],
    labelKey: "reader.shortcuts.nextPage",
    descriptionKey: "reader.shortcuts.nextPageDesc",
    category: "navigation",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "prevPage",
    key: "ArrowLeft",
    modifiers: [],
    labelKey: "reader.shortcuts.prevPage",
    descriptionKey: "reader.shortcuts.prevPageDesc",
    category: "navigation",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "nextPageAlt",
    key: " ",
    modifiers: [],
    labelKey: "reader.shortcuts.nextPage",
    descriptionKey: "reader.shortcuts.nextPageSpaceDesc",
    category: "navigation",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "prevPageAlt",
    key: " ",
    modifiers: ["shift"],
    labelKey: "reader.shortcuts.prevPage",
    descriptionKey: "reader.shortcuts.prevPageShiftSpaceDesc",
    category: "navigation",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "firstPage",
    key: "Home",
    modifiers: [],
    labelKey: "reader.shortcuts.firstPage",
    descriptionKey: "reader.shortcuts.firstPageDesc",
    category: "navigation",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "lastPage",
    key: "End",
    modifiers: [],
    labelKey: "reader.shortcuts.lastPage",
    descriptionKey: "reader.shortcuts.lastPageDesc",
    category: "navigation",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "nextChapter",
    key: "ArrowRight",
    modifiers: ["ctrl"],
    labelKey: "reader.shortcuts.nextChapter",
    descriptionKey: "reader.shortcuts.nextChapterDesc",
    category: "navigation",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "prevChapter",
    key: "ArrowLeft",
    modifiers: ["ctrl"],
    labelKey: "reader.shortcuts.prevChapter",
    descriptionKey: "reader.shortcuts.prevChapterDesc",
    category: "navigation",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "goToPage",
    key: "g",
    modifiers: ["ctrl"],
    labelKey: "reader.shortcuts.goToPage",
    descriptionKey: "reader.shortcuts.goToPageDesc",
    category: "navigation",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "toggleToc",
    key: "t",
    modifiers: [],
    labelKey: "reader.shortcuts.toggleToc",
    descriptionKey: "reader.shortcuts.toggleTocDesc",
    category: "navigation",
    customizable: true,
    enabledByDefault: true,
  },

  // Annotation shortcuts
  {
    id: "highlight",
    key: "h",
    modifiers: [],
    labelKey: "reader.shortcuts.highlight",
    descriptionKey: "reader.shortcuts.highlightDesc",
    category: "annotation",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "addNote",
    key: "n",
    modifiers: [],
    labelKey: "reader.shortcuts.addNote",
    descriptionKey: "reader.shortcuts.addNoteDesc",
    category: "annotation",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "addBookmark",
    key: "b",
    modifiers: [],
    labelKey: "reader.shortcuts.addBookmark",
    descriptionKey: "reader.shortcuts.addBookmarkDesc",
    category: "annotation",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "copyText",
    key: "c",
    modifiers: ["ctrl"],
    labelKey: "reader.shortcuts.copyText",
    descriptionKey: "reader.shortcuts.copyTextDesc",
    category: "annotation",
    customizable: false,
    enabledByDefault: true,
  },

  // Reader shortcuts
  {
    id: "zoomIn",
    key: "=",
    modifiers: ["ctrl"],
    labelKey: "reader.shortcuts.zoomIn",
    descriptionKey: "reader.shortcuts.zoomInDesc",
    category: "reader",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "zoomOut",
    key: "-",
    modifiers: ["ctrl"],
    labelKey: "reader.shortcuts.zoomOut",
    descriptionKey: "reader.shortcuts.zoomOutDesc",
    category: "reader",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "resetZoom",
    key: "0",
    modifiers: ["ctrl"],
    labelKey: "reader.shortcuts.resetZoom",
    descriptionKey: "reader.shortcuts.resetZoomDesc",
    category: "reader",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "increaseFontSize",
    key: "=",
    modifiers: ["ctrl", "shift"],
    labelKey: "reader.shortcuts.increaseFontSize",
    descriptionKey: "reader.shortcuts.increaseFontSizeDesc",
    category: "reader",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "decreaseFontSize",
    key: "-",
    modifiers: ["ctrl", "shift"],
    labelKey: "reader.shortcuts.decreaseFontSize",
    descriptionKey: "reader.shortcuts.decreaseFontSizeDesc",
    category: "reader",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "toggleFullscreen",
    key: "f",
    modifiers: [],
    labelKey: "reader.shortcuts.toggleFullscreen",
    descriptionKey: "reader.shortcuts.toggleFullscreenDesc",
    category: "reader",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "toggleTheme",
    key: "d",
    modifiers: [],
    labelKey: "reader.shortcuts.toggleTheme",
    descriptionKey: "reader.shortcuts.toggleThemeDesc",
    category: "reader",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "toggleSettings",
    key: ",",
    modifiers: ["ctrl"],
    labelKey: "reader.shortcuts.toggleSettings",
    descriptionKey: "reader.shortcuts.toggleSettingsDesc",
    category: "reader",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "showHelp",
    key: "?",
    modifiers: ["shift"],
    labelKey: "reader.shortcuts.showHelp",
    descriptionKey: "reader.shortcuts.showHelpDesc",
    category: "reader",
    customizable: false,
    enabledByDefault: true,
  },
  {
    id: "escape",
    key: "Escape",
    modifiers: [],
    labelKey: "reader.shortcuts.escape",
    descriptionKey: "reader.shortcuts.escapeDesc",
    category: "reader",
    customizable: false,
    enabledByDefault: true,
  },

  // AI shortcuts
  {
    id: "explain",
    key: "e",
    modifiers: [],
    labelKey: "reader.shortcuts.explain",
    descriptionKey: "reader.shortcuts.explainDesc",
    category: "ai",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "askQuestion",
    key: "a",
    modifiers: [],
    labelKey: "reader.shortcuts.askQuestion",
    descriptionKey: "reader.shortcuts.askQuestionDesc",
    category: "ai",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "toggleChat",
    key: "c",
    modifiers: [],
    labelKey: "reader.shortcuts.toggleChat",
    descriptionKey: "reader.shortcuts.toggleChatDesc",
    category: "ai",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "lookup",
    key: "l",
    modifiers: [],
    labelKey: "reader.shortcuts.lookup",
    descriptionKey: "reader.shortcuts.lookupDesc",
    category: "ai",
    customizable: true,
    enabledByDefault: true,
  },
  {
    id: "translate",
    key: "r",
    modifiers: [],
    labelKey: "reader.shortcuts.translate",
    descriptionKey: "reader.shortcuts.translateDesc",
    category: "ai",
    customizable: true,
    enabledByDefault: true,
  },
];

/** Default gesture definitions */
export const DEFAULT_GESTURES: GestureDefinition[] = [
  {
    id: "swipeLeftNav",
    type: "swipeLeft",
    labelKey: "reader.gestures.swipeLeft",
    descriptionKey: "reader.gestures.swipeLeftDesc",
    category: "navigation",
    enabledByDefault: true,
  },
  {
    id: "swipeRightNav",
    type: "swipeRight",
    labelKey: "reader.gestures.swipeRight",
    descriptionKey: "reader.gestures.swipeRightDesc",
    category: "navigation",
    enabledByDefault: true,
  },
  {
    id: "doubleTapZoom",
    type: "doubleTap",
    labelKey: "reader.gestures.doubleTap",
    descriptionKey: "reader.gestures.doubleTapDesc",
    category: "reader",
    enabledByDefault: true,
  },
  {
    id: "longPressMenu",
    type: "longPress",
    labelKey: "reader.gestures.longPress",
    descriptionKey: "reader.gestures.longPressDesc",
    category: "annotation",
    enabledByDefault: true,
  },
  {
    id: "pinchZoom",
    type: "pinchIn",
    labelKey: "reader.gestures.pinch",
    descriptionKey: "reader.gestures.pinchDesc",
    category: "reader",
    enabledByDefault: true,
  },
];

/** Default shortcut preferences */
export const DEFAULT_SHORTCUT_PREFERENCES: ShortcutPreferences = {
  enabledShortcuts: DEFAULT_SHORTCUTS.filter((s) => s.enabledByDefault).map(
    (s) => s.id
  ),
  enabledGestures: DEFAULT_GESTURES.filter((g) => g.enabledByDefault).map(
    (g) => g.id
  ),
  customBindings: {},
  shortcutsEnabled: true,
  gesturesEnabled: true,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the display string for a key
 */
export function getKeyDisplayString(key: string): string {
  const specialKey = SPECIAL_KEYS[key];
  if (specialKey !== undefined) {
    return specialKey;
  }
  // Return uppercase for single letters
  if (key.length === 1) {
    return key.toUpperCase();
  }
  return key;
}

/**
 * Get the display string for modifier keys based on OS
 */
export function getModifierDisplayString(
  modifier: ModifierKey,
  isMac: boolean = false
): string {
  switch (modifier) {
    case "ctrl":
      return isMac ? "⌘" : "Ctrl";
    case "alt":
      return isMac ? "⌥" : "Alt";
    case "shift":
      return isMac ? "⇧" : "Shift";
    case "meta":
      return isMac ? "⌘" : "Win";
    default:
      return modifier;
  }
}

/**
 * Format a shortcut for display (e.g., "Ctrl + →")
 */
export function formatShortcutDisplay(
  shortcut: ShortcutDefinition,
  isMac: boolean = false
): string {
  const parts: string[] = [];

  // Add modifiers in consistent order
  const modifierOrder: ModifierKey[] = ["ctrl", "alt", "shift", "meta"];
  for (const mod of modifierOrder) {
    if (shortcut.modifiers.includes(mod)) {
      parts.push(getModifierDisplayString(mod, isMac));
    }
  }

  // Add the key
  parts.push(getKeyDisplayString(shortcut.key));

  return parts.join(isMac ? "" : " + ");
}

/**
 * Check if the current platform is macOS
 */
export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.platform.toLowerCase().includes("mac");
}

/**
 * Check if a keyboard event matches a shortcut definition
 */
export function eventMatchesShortcut(
  event: KeyboardEvent,
  shortcut: ShortcutDefinition,
  customBinding?: Partial<Pick<ShortcutDefinition, "key" | "modifiers">>
): boolean {
  const key = customBinding?.key ?? shortcut.key;
  const modifiers = customBinding?.modifiers ?? shortcut.modifiers;

  // Check key match (case-insensitive for letters)
  const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const shortcutKey = key.length === 1 ? key.toLowerCase() : key;

  if (eventKey !== shortcutKey) {
    return false;
  }

  // Check modifier matches
  const isMac = isMacPlatform();
  const ctrlRequired = modifiers.includes("ctrl") || modifiers.includes("meta");
  const altRequired = modifiers.includes("alt");
  const shiftRequired = modifiers.includes("shift");

  const ctrlPressed = isMac ? event.metaKey : event.ctrlKey;
  const altPressed = event.altKey;
  const shiftPressed = event.shiftKey;

  return (
    ctrlRequired === ctrlPressed &&
    altRequired === altPressed &&
    shiftRequired === shiftPressed
  );
}

/**
 * Get shortcuts by category
 */
export function getShortcutsByCategory(
  category: ShortcutCategory
): ShortcutDefinition[] {
  return DEFAULT_SHORTCUTS.filter((s) => s.category === category);
}

/**
 * Get gestures by category
 */
export function getGesturesByCategory(
  category: ShortcutCategory
): GestureDefinition[] {
  return DEFAULT_GESTURES.filter((g) => g.category === category);
}

/**
 * Get all categories with their shortcuts and gestures
 */
export function getGroupedShortcuts(): Record<
  ShortcutCategory,
  { shortcuts: ShortcutDefinition[]; gestures: GestureDefinition[] }
> {
  const result: Record<
    ShortcutCategory,
    { shortcuts: ShortcutDefinition[]; gestures: GestureDefinition[] }
  > = {
    navigation: { shortcuts: [], gestures: [] },
    annotation: { shortcuts: [], gestures: [] },
    reader: { shortcuts: [], gestures: [] },
    ai: { shortcuts: [], gestures: [] },
  };

  for (const shortcut of DEFAULT_SHORTCUTS) {
    result[shortcut.category].shortcuts.push(shortcut);
  }

  for (const gesture of DEFAULT_GESTURES) {
    result[gesture.category].gestures.push(gesture);
  }

  return result;
}

/**
 * Find a shortcut by ID
 */
export function findShortcutById(id: string): ShortcutDefinition | undefined {
  return DEFAULT_SHORTCUTS.find((s) => s.id === id);
}

/**
 * Find a gesture by ID
 */
export function findGestureById(id: string): GestureDefinition | undefined {
  return DEFAULT_GESTURES.find((g) => g.id === id);
}

// ============================================================================
// Preferences Persistence
// ============================================================================

/**
 * Create a fresh copy of default preferences (prevents mutation of defaults)
 */
function createDefaultPreferences(): ShortcutPreferences {
  return {
    enabledShortcuts: [...DEFAULT_SHORTCUT_PREFERENCES.enabledShortcuts],
    enabledGestures: [...DEFAULT_SHORTCUT_PREFERENCES.enabledGestures],
    customBindings: { ...DEFAULT_SHORTCUT_PREFERENCES.customBindings },
    shortcutsEnabled: DEFAULT_SHORTCUT_PREFERENCES.shortcutsEnabled,
    gesturesEnabled: DEFAULT_SHORTCUT_PREFERENCES.gesturesEnabled,
  };
}

/**
 * Load shortcut preferences from localStorage
 */
export function loadShortcutPreferences(): ShortcutPreferences {
  if (typeof window === "undefined") {
    return createDefaultPreferences();
  }

  try {
    const stored = localStorage.getItem(SHORTCUT_PREFERENCES_KEY);
    if (!stored) {
      return createDefaultPreferences();
    }

    const parsed = JSON.parse(stored) as Partial<ShortcutPreferences>;
    const defaults = createDefaultPreferences();
    return {
      enabledShortcuts: parsed.enabledShortcuts ?? defaults.enabledShortcuts,
      enabledGestures: parsed.enabledGestures ?? defaults.enabledGestures,
      customBindings: parsed.customBindings ?? defaults.customBindings,
      shortcutsEnabled: parsed.shortcutsEnabled ?? defaults.shortcutsEnabled,
      gesturesEnabled: parsed.gesturesEnabled ?? defaults.gesturesEnabled,
    };
  } catch {
    return createDefaultPreferences();
  }
}

/**
 * Save shortcut preferences to localStorage
 */
export function saveShortcutPreferences(
  preferences: ShortcutPreferences
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(SHORTCUT_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Update a single preference
 */
export function updateShortcutPreference<K extends keyof ShortcutPreferences>(
  key: K,
  value: ShortcutPreferences[K]
): ShortcutPreferences {
  const current = loadShortcutPreferences();
  const updated = { ...current, [key]: value };
  saveShortcutPreferences(updated);
  return updated;
}

/**
 * Toggle a shortcut enabled/disabled
 */
export function toggleShortcutEnabled(shortcutId: string): ShortcutPreferences {
  const prefs = loadShortcutPreferences();
  const index = prefs.enabledShortcuts.indexOf(shortcutId);

  if (index === -1) {
    prefs.enabledShortcuts.push(shortcutId);
  } else {
    prefs.enabledShortcuts.splice(index, 1);
  }

  saveShortcutPreferences(prefs);
  return prefs;
}

/**
 * Toggle a gesture enabled/disabled
 */
export function toggleGestureEnabled(gestureId: string): ShortcutPreferences {
  const prefs = loadShortcutPreferences();
  const index = prefs.enabledGestures.indexOf(gestureId);

  if (index === -1) {
    prefs.enabledGestures.push(gestureId);
  } else {
    prefs.enabledGestures.splice(index, 1);
  }

  saveShortcutPreferences(prefs);
  return prefs;
}

/**
 * Set a custom binding for a shortcut
 */
export function setCustomBinding(
  shortcutId: string,
  binding: Partial<Pick<ShortcutDefinition, "key" | "modifiers">>
): ShortcutPreferences {
  const prefs = loadShortcutPreferences();
  prefs.customBindings[shortcutId] = binding;
  saveShortcutPreferences(prefs);
  return prefs;
}

/**
 * Clear a custom binding
 */
export function clearCustomBinding(shortcutId: string): ShortcutPreferences {
  const prefs = loadShortcutPreferences();
  delete prefs.customBindings[shortcutId];
  saveShortcutPreferences(prefs);
  return prefs;
}

/**
 * Reset preferences to defaults
 */
export function resetShortcutPreferences(): ShortcutPreferences {
  saveShortcutPreferences(DEFAULT_SHORTCUT_PREFERENCES);
  return DEFAULT_SHORTCUT_PREFERENCES;
}

// ============================================================================
// Touch Gesture Detection
// ============================================================================

/**
 * Create initial touch state
 */
export function createInitialTouchState(): TouchState {
  return {
    startPositions: [],
    currentPositions: [],
    isActive: false,
    longPressTimer: null,
    lastTapTime: 0,
    initialPinchDistance: null,
  };
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(
  p1: TouchPosition,
  p2: TouchPosition
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate velocity between two positions
 */
export function calculateVelocity(
  start: TouchPosition,
  end: TouchPosition
): number {
  const distance = calculateDistance(start, end);
  const duration = end.timestamp - start.timestamp;
  return duration > 0 ? distance / duration : 0;
}

/**
 * Detect the type of swipe gesture from positions
 */
export function detectSwipeGesture(
  start: TouchPosition,
  end: TouchPosition
): DetectedGesture | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.abs(dx) > Math.abs(dy) ? Math.abs(dx) : Math.abs(dy);
  const velocity = calculateVelocity(start, end);

  if (distance < MIN_SWIPE_DISTANCE || velocity < MIN_SWIPE_VELOCITY) {
    return null;
  }

  // Determine direction
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal swipe
    return {
      type: dx > 0 ? "swipeRight" : "swipeLeft",
      velocity,
      delta: { x: dx, y: dy },
    };
  } else {
    // Vertical swipe
    return {
      type: dy > 0 ? "swipeDown" : "swipeUp",
      velocity,
      delta: { x: dx, y: dy },
    };
  }
}

/**
 * Detect pinch gesture from two-finger touch
 */
export function detectPinchGesture(
  initialDistance: number,
  currentDistance: number
): DetectedGesture | null {
  const scale = currentDistance / initialDistance;
  const change = Math.abs(scale - 1);

  if (change < PINCH_THRESHOLD) {
    return null;
  }

  return {
    type: scale > 1 ? "pinchOut" : "pinchIn",
    scale,
  };
}

/**
 * Check if the target element should prevent gesture handling
 * (e.g., input fields, scrollable elements)
 */
export function shouldPreventGesture(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  const isInput = ["input", "textarea", "select"].includes(tagName);
  const isContentEditable = target.isContentEditable;
  const hasOverflow = ["scroll", "auto"].includes(
    window.getComputedStyle(target).overflowY
  );

  return isInput || isContentEditable || hasOverflow;
}

/**
 * Check if a shortcut is enabled
 */
export function isShortcutEnabled(
  shortcutId: string,
  preferences: ShortcutPreferences
): boolean {
  return (
    preferences.shortcutsEnabled &&
    preferences.enabledShortcuts.includes(shortcutId)
  );
}

/**
 * Check if a gesture is enabled
 */
export function isGestureEnabled(
  gestureId: string,
  preferences: ShortcutPreferences
): boolean {
  return (
    preferences.gesturesEnabled &&
    preferences.enabledGestures.includes(gestureId)
  );
}

/**
 * Get the effective binding for a shortcut (custom or default)
 */
export function getEffectiveBinding(
  shortcut: ShortcutDefinition,
  preferences: ShortcutPreferences
): Pick<ShortcutDefinition, "key" | "modifiers"> {
  const custom = preferences.customBindings[shortcut.id];
  return {
    key: custom?.key ?? shortcut.key,
    modifiers: custom?.modifiers ?? shortcut.modifiers,
  };
}

/**
 * Validate that a custom binding doesn't conflict with existing shortcuts
 */
export function validateCustomBinding(
  shortcutId: string,
  binding: Partial<Pick<ShortcutDefinition, "key" | "modifiers">>,
  preferences: ShortcutPreferences
): { valid: boolean; conflictingId?: string } {
  const newKey = binding.key;
  const newModifiers = binding.modifiers ?? [];

  if (!newKey) {
    return { valid: true };
  }

  for (const shortcut of DEFAULT_SHORTCUTS) {
    if (shortcut.id === shortcutId) continue;

    const effective = getEffectiveBinding(shortcut, preferences);

    if (
      effective.key.toLowerCase() === newKey.toLowerCase() &&
      effective.modifiers.length === newModifiers.length &&
      effective.modifiers.every((m) => newModifiers.includes(m))
    ) {
      return { valid: false, conflictingId: shortcut.id };
    }
  }

  return { valid: true };
}

/**
 * Get i18n key for a category label
 */
export function getCategoryLabelKey(category: ShortcutCategory): string {
  return `reader.shortcuts.categories.${category}`;
}

/**
 * Get gesture icon name based on type
 */
export function getGestureIconName(type: GestureType): string {
  switch (type) {
    case "swipeLeft":
      return "swipe_left";
    case "swipeRight":
      return "swipe_right";
    case "swipeUp":
      return "swipe_up";
    case "swipeDown":
      return "swipe_down";
    case "tap":
      return "touch_app";
    case "doubleTap":
      return "ads_click";
    case "longPress":
      return "pan_tool";
    case "pinchIn":
    case "pinchOut":
      return "pinch";
    default:
      return "gesture";
  }
}
