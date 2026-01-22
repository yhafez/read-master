/**
 * Accessibility Context
 *
 * Provides global accessibility settings and preferences:
 * - Dyslexia-friendly font
 * - High contrast mode
 * - Reduced motion
 * - Focus indicators
 * - Font size scaling
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

/**
 * Accessibility settings
 */
export interface AccessibilitySettings {
  /** Enable dyslexia-friendly font */
  dyslexiaFont: boolean;
  /** Enable high contrast mode */
  highContrast: boolean;
  /** Respect reduced motion preference */
  reducedMotion: boolean;
  /** Enhanced focus indicators */
  enhancedFocus: boolean;
  /** Font size scaling (1.0 = 100%) */
  fontScale: number;
  /** Line spacing multiplier */
  lineSpacing: number;
  /** Letter spacing in em */
  letterSpacing: number;
  /** Word spacing in em */
  wordSpacing: number;
}

/**
 * Default accessibility settings
 */
const DEFAULT_SETTINGS: AccessibilitySettings = {
  dyslexiaFont: false,
  highContrast: false,
  reducedMotion: false,
  enhancedFocus: true,
  fontScale: 1.0,
  lineSpacing: 1.5,
  letterSpacing: 0,
  wordSpacing: 0,
};

/**
 * Accessibility context type
 */
interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
  toggleDyslexiaFont: () => void;
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  toggleEnhancedFocus: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
}

const AccessibilityContext = createContext<
  AccessibilityContextType | undefined
>(undefined);

/**
 * Local storage key for accessibility settings
 */
const STORAGE_KEY = "read-master-accessibility-settings";

/**
 * Accessibility Provider Component
 */
export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore localStorage errors
    }

    // Check system preferences
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const prefersHighContrast = window.matchMedia(
      "(prefers-contrast: high)"
    ).matches;

    return {
      ...DEFAULT_SETTINGS,
      reducedMotion: prefersReducedMotion,
      highContrast: prefersHighContrast,
    };
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore localStorage errors
    }
  }, [settings]);

  // Apply settings to document
  useEffect(() => {
    const root = document.documentElement;

    // Dyslexia font
    if (settings.dyslexiaFont) {
      root.classList.add("dyslexia-font");
    } else {
      root.classList.remove("dyslexia-font");
    }

    // High contrast
    if (settings.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add("reduced-motion");
    } else {
      root.classList.remove("reduced-motion");
    }

    // Enhanced focus
    if (settings.enhancedFocus) {
      root.classList.add("enhanced-focus");
    } else {
      root.classList.remove("enhanced-focus");
    }

    // Font scale
    root.style.setProperty(
      "--accessibility-font-scale",
      String(settings.fontScale)
    );
    root.style.setProperty(
      "--accessibility-line-spacing",
      String(settings.lineSpacing)
    );
    root.style.setProperty(
      "--accessibility-letter-spacing",
      `${settings.letterSpacing}em`
    );
    root.style.setProperty(
      "--accessibility-word-spacing",
      `${settings.wordSpacing}em`
    );
  }, [settings]);

  const updateSettings = useCallback(
    (updates: Partial<AccessibilitySettings>) => {
      setSettings((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const toggleDyslexiaFont = useCallback(() => {
    setSettings((prev) => ({ ...prev, dyslexiaFont: !prev.dyslexiaFont }));
  }, []);

  const toggleHighContrast = useCallback(() => {
    setSettings((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  }, []);

  const toggleReducedMotion = useCallback(() => {
    setSettings((prev) => ({ ...prev, reducedMotion: !prev.reducedMotion }));
  }, []);

  const toggleEnhancedFocus = useCallback(() => {
    setSettings((prev) => ({ ...prev, enhancedFocus: !prev.enhancedFocus }));
  }, []);

  const increaseFontSize = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      fontScale: Math.min(prev.fontScale + 0.1, 2.0),
    }));
  }, []);

  const decreaseFontSize = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      fontScale: Math.max(prev.fontScale - 0.1, 0.8),
    }));
  }, []);

  const value: AccessibilityContextType = {
    settings,
    updateSettings,
    resetSettings,
    toggleDyslexiaFont,
    toggleHighContrast,
    toggleReducedMotion,
    toggleEnhancedFocus,
    increaseFontSize,
    decreaseFontSize,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

/**
 * Hook to use accessibility context
 */
export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      "useAccessibility must be used within AccessibilityProvider"
    );
  }
  return context;
}
