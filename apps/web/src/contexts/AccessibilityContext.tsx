/**
 * Accessibility Context
 *
 * Provides global accessibility settings and preferences:
 * - Dyslexia-friendly font
 * - High contrast mode
 * - Reduced motion
 * - Focus indicators
 * - Font size scaling
 * - Screen reader announcements
 * - Focus management
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import type { LiveRegionPoliteness } from "@/lib/accessibility";
import { LIVE_REGION_DEBOUNCE } from "@/lib/accessibility";

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
 * Announcement options for screen readers
 */
export interface AnnouncementOptions {
  /** Politeness level for the announcement */
  politeness?: LiveRegionPoliteness;
  /** Delay before announcing (ms) */
  delay?: number;
  /** Whether to clear the announcement after it's made */
  clearAfter?: number;
}

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
  // Screen reader announcements
  announce: (message: string, options?: AnnouncementOptions) => void;
  announcePolite: (message: string) => void;
  announceAssertive: (message: string) => void;
  announceLoading: (isLoading: boolean, context?: string) => void;
  announceNavigation: (pageName: string) => void;
  announceError: (message: string) => void;
  announceSuccess: (message: string) => void;
  // Focus management
  focusElement: (elementId: string) => void;
  focusMain: () => void;
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
  announceRouteChanges = true,
}: {
  children: React.ReactNode;
  announceRouteChanges?: boolean;
}) {
  const { t } = useTranslation();
  const location = useLocation();

  // Live region refs
  const politeRegionRef = useRef<HTMLDivElement>(null);
  const assertiveRegionRef = useRef<HTMLDivElement>(null);
  const pendingAnnouncementRef = useRef<NodeJS.Timeout | null>(null);

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

  // Screen reader announcement functions
  const announce = useCallback(
    (message: string, options: AnnouncementOptions = {}) => {
      const {
        politeness = "polite",
        delay = LIVE_REGION_DEBOUNCE,
        clearAfter,
      } = options;

      // Clear any pending announcement
      if (pendingAnnouncementRef.current) {
        clearTimeout(pendingAnnouncementRef.current);
      }

      const region =
        politeness === "assertive"
          ? assertiveRegionRef.current
          : politeRegionRef.current;

      if (!region) return;

      // Schedule announcement
      pendingAnnouncementRef.current = setTimeout(() => {
        // Clear then set to trigger screen reader
        region.textContent = "";
        requestAnimationFrame(() => {
          region.textContent = message;

          // Clear after if specified
          if (clearAfter) {
            setTimeout(() => {
              region.textContent = "";
            }, clearAfter);
          }
        });
      }, delay);
    },
    []
  );

  const announcePolite = useCallback(
    (message: string) => {
      announce(message, { politeness: "polite" });
    },
    [announce]
  );

  const announceAssertive = useCallback(
    (message: string) => {
      announce(message, { politeness: "assertive" });
    },
    [announce]
  );

  const announceLoading = useCallback(
    (isLoading: boolean, context?: string) => {
      if (isLoading) {
        const message = context
          ? t("accessibility.loadingContext", {
              context,
              defaultValue: `Loading ${context}, please wait`,
            })
          : t("accessibility.loading", "Loading content, please wait");
        announce(message, { politeness: "polite", delay: 500 });
      } else {
        announce(t("accessibility.loadingComplete", "Content loaded"), {
          politeness: "polite",
        });
      }
    },
    [announce, t]
  );

  const announceNavigation = useCallback(
    (pageName: string) => {
      announce(
        t("accessibility.navigatedTo", {
          page: pageName,
          defaultValue: `Navigated to ${pageName}`,
        }),
        { politeness: "polite", delay: 300 }
      );
    },
    [announce, t]
  );

  const announceError = useCallback(
    (message: string) => {
      announce(
        t("accessibility.error", {
          message,
          defaultValue: `Error: ${message}`,
        }),
        { politeness: "assertive" }
      );
    },
    [announce, t]
  );

  const announceSuccess = useCallback(
    (message: string) => {
      announce(
        t("accessibility.success", {
          message,
          defaultValue: `Success: ${message}`,
        }),
        { politeness: "polite" }
      );
    },
    [announce, t]
  );

  const focusElement = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.setAttribute("tabindex", "-1");
      element.focus();
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const focusMain = useCallback(() => {
    focusElement("main-content");
  }, [focusElement]);

  // Announce route changes
  useEffect(() => {
    if (!announceRouteChanges) return;

    // Get page title from route
    const getPageTitle = (): string => {
      const path = location.pathname;

      // Map routes to titles
      const routeTitles: Record<string, string> = {
        "/": t("nav.dashboard"),
        "/dashboard": t("nav.dashboard"),
        "/library": t("nav.library"),
        "/flashcards": t("nav.flashcards"),
        "/assessments": t("nav.assessments"),
        "/groups": t("nav.groups"),
        "/forum": t("nav.forum"),
        "/curriculums": t("nav.curriculums"),
        "/leaderboard": t("nav.leaderboard"),
        "/settings": t("nav.settings"),
        "/docs": t("docs.title", "Documentation"),
      };

      // Check for exact match
      if (routeTitles[path]) {
        return routeTitles[path];
      }

      // Check for partial matches
      for (const [route, title] of Object.entries(routeTitles)) {
        if (path.startsWith(route) && route !== "/") {
          return title;
        }
      }

      return t("common.page", "Page");
    };

    // Delay announcement to avoid interrupting page load
    const timer = setTimeout(() => {
      announceNavigation(getPageTitle());
    }, 500);

    return () => clearTimeout(timer);
  }, [location.pathname, announceRouteChanges, announceNavigation, t]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pendingAnnouncementRef.current) {
        clearTimeout(pendingAnnouncementRef.current);
      }
    };
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
    // Screen reader announcements
    announce,
    announcePolite,
    announceAssertive,
    announceLoading,
    announceNavigation,
    announceError,
    announceSuccess,
    // Focus management
    focusElement,
    focusMain,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}

      {/* Polite Live Region for screen reader announcements */}
      <Box
        ref={politeRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      />

      {/* Assertive Live Region for urgent announcements */}
      <Box
        ref={assertiveRegionRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        sx={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      />
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

// ============================================================================
// Utility Hooks for Common Patterns
// ============================================================================

/**
 * Hook for announcing loading states automatically
 *
 * @example
 * const { isLoading, data } = useQuery(...);
 * useLoadingAnnouncement(isLoading, 'books');
 */
export function useLoadingAnnouncement(
  isLoading: boolean,
  context?: string
): void {
  const { announceLoading } = useAccessibility();
  const previousLoadingRef = useRef<boolean>(isLoading);

  useEffect(() => {
    // Only announce on state change
    if (previousLoadingRef.current !== isLoading) {
      announceLoading(isLoading, context);
      previousLoadingRef.current = isLoading;
    }
  }, [isLoading, context, announceLoading]);
}

/**
 * Hook for announcing errors when they occur
 *
 * @example
 * const { error } = useQuery(...);
 * useErrorAnnouncement(error?.message);
 */
export function useErrorAnnouncement(error: string | null | undefined): void {
  const { announceError } = useAccessibility();
  const announcedErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (error && error !== announcedErrorRef.current) {
      announceError(error);
      announcedErrorRef.current = error;
    } else if (!error) {
      announcedErrorRef.current = null;
    }
  }, [error, announceError]);
}

/**
 * Hook for focus management on mount
 *
 * @example
 * useFocusOnMount('page-title');
 */
export function useFocusOnMount(elementId: string): void {
  const { focusElement } = useAccessibility();

  useEffect(() => {
    // Small delay to ensure element is rendered
    const timer = setTimeout(() => {
      focusElement(elementId);
    }, 100);

    return () => clearTimeout(timer);
  }, [elementId, focusElement]);
}

/**
 * Hook for announcing form validation errors
 *
 * @example
 * const { errors } = useForm();
 * useFormErrorAnnouncement(errors);
 */
export function useFormErrorAnnouncement(
  errors: Record<string, string | undefined> | null
): void {
  const { announceError } = useAccessibility();
  const previousErrorsRef = useRef<string>("");

  useEffect(() => {
    if (!errors) return;

    const errorMessages = Object.values(errors).filter(Boolean);
    const errorString = errorMessages.join(", ");

    // Only announce if errors changed
    if (errorString && errorString !== previousErrorsRef.current) {
      const count = errorMessages.length;
      const message =
        count === 1
          ? (errorMessages[0] ?? "Validation error")
          : `${count} validation errors: ${errorString}`;
      announceError(message);
      previousErrorsRef.current = errorString;
    } else if (!errorString) {
      previousErrorsRef.current = "";
    }
  }, [errors, announceError]);
}

/**
 * Hook for announcing successful actions
 *
 * @example
 * const { isSuccess, mutate } = useMutation(...);
 * useSuccessAnnouncement(isSuccess, 'Book saved successfully');
 */
export function useSuccessAnnouncement(
  isSuccess: boolean,
  message: string
): void {
  const { announceSuccess } = useAccessibility();
  const announcedRef = useRef<boolean>(false);

  useEffect(() => {
    if (isSuccess && !announcedRef.current) {
      announceSuccess(message);
      announcedRef.current = true;
    } else if (!isSuccess) {
      announcedRef.current = false;
    }
  }, [isSuccess, message, announceSuccess]);
}
