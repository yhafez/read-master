/**
 * Screen Reader Announcement Hook
 *
 * Provides easy-to-use hooks for announcing messages to screen readers.
 */

import { useCallback, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  announceToScreenReader,
  announceAssertive,
  type LiveRegionPoliteness,
} from "@/lib/accessibility";

/**
 * Hook to announce messages to screen readers
 *
 * @example
 * const announce = useScreenReaderAnnouncement();
 * announce('New message received');
 * announce('Critical alert', 'assertive');
 */
export function useScreenReaderAnnouncement() {
  const announceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (announceTimeoutRef.current) {
        clearTimeout(announceTimeoutRef.current);
      }
    };
  }, []);

  const announce = useCallback(
    (message: string, politeness: LiveRegionPoliteness = "polite") => {
      // Cancel any pending announcements
      if (announceTimeoutRef.current) {
        clearTimeout(announceTimeoutRef.current);
      }

      // Debounce rapid announcements
      announceTimeoutRef.current = setTimeout(() => {
        if (politeness === "assertive") {
          announceAssertive(message);
        } else {
          announceToScreenReader(message, politeness);
        }
      }, 100);
    },
    []
  );

  return announce;
}

/**
 * Hook to announce route changes to screen readers
 *
 * Automatically announces page title when route changes
 *
 * @example
 * useRouteAnnouncements();
 */
export function useRouteAnnouncements() {
  const location = useLocation();
  const { t } = useTranslation();
  const announce = useScreenReaderAnnouncement();
  const previousPathnameRef = useRef<string>("");

  useEffect(() => {
    // Only announce if pathname actually changed (not just search params or hash)
    if (location.pathname !== previousPathnameRef.current) {
      previousPathnameRef.current = location.pathname;

      // Get page title from document or route
      const pageTitle =
        document.title || getPageTitleFromPath(location.pathname, t);

      // Announce navigation
      announce(t("accessibility.navigatedTo", { page: pageTitle }), "polite");

      // Also update document title if not already set
      if (!document.title && pageTitle) {
        document.title = `${pageTitle} - Read Master`;
      }
    }
  }, [location.pathname, announce, t]);
}

/**
 * Get human-readable page title from pathname
 */
function getPageTitleFromPath(
  pathname: string,
  t: (key: string) => string
): string {
  // Remove leading slash and split by slash
  const segments = pathname.slice(1).split("/");
  const firstSegment = segments[0] || "home";

  // Map common routes to translations
  const routeTitleMap: Record<string, string> = {
    "": "common.home",
    library: "common.library",
    reader: "common.reader",
    dashboard: "common.dashboard",
    flashcards: "common.flashcards",
    assessments: "common.assessments",
    profile: "common.profile",
    feed: "social.feed",
    leaderboard: "social.leaderboard",
    groups: "social.groups",
    forum: "forum.title",
    curriculums: "curriculum.title",
    settings: "settings.title",
    stats: "stats.title",
    achievements: "achievements.title",
    admin: "admin.title",
  };

  const titleKey = routeTitleMap[firstSegment];
  return titleKey ? t(titleKey) : capitalize(firstSegment);
}

/**
 * Capitalize first letter of string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Hook to announce loading states to screen readers
 *
 * @example
 * const announceLoading = useLoadingAnnouncements();
 * announceLoading(true, 'Loading books');
 * announceLoading(false, 'Books loaded');
 */
export function useLoadingAnnouncements() {
  const announce = useScreenReaderAnnouncement();
  const { t } = useTranslation();

  const announceLoading = useCallback(
    (isLoading: boolean, customMessage?: string) => {
      if (isLoading) {
        announce(customMessage || t("accessibility.loading"), "polite");
      } else {
        announce(customMessage || t("accessibility.loadingComplete"), "polite");
      }
    },
    [announce, t]
  );

  return announceLoading;
}

/**
 * Hook to announce errors to screen readers
 *
 * @example
 * const announceError = useErrorAnnouncements();
 * announceError('Failed to save book');
 */
export function useErrorAnnouncements() {
  const announce = useScreenReaderAnnouncement();
  const { t } = useTranslation();

  const announceError = useCallback(
    (errorMessage: string) => {
      announce(
        t("accessibility.error", { message: errorMessage }),
        "assertive"
      );
    },
    [announce, t]
  );

  return announceError;
}

/**
 * Hook to announce success messages to screen readers
 *
 * @example
 * const announceSuccess = useSuccessAnnouncements();
 * announceSuccess('Book saved successfully');
 */
export function useSuccessAnnouncements() {
  const announce = useScreenReaderAnnouncement();
  const { t } = useTranslation();

  const announceSuccess = useCallback(
    (successMessage: string) => {
      announce(
        t("accessibility.success", { message: successMessage }),
        "polite"
      );
    },
    [announce, t]
  );

  return announceSuccess;
}

/**
 * Hook to announce dynamic content changes
 *
 * Useful for announcing when new content is loaded/updated
 *
 * @example
 * const announceContentChange = useContentChangeAnnouncements();
 * announceContentChange('5 new messages');
 */
export function useContentChangeAnnouncements() {
  const announce = useScreenReaderAnnouncement();

  return useCallback(
    (message: string, politeness: LiveRegionPoliteness = "polite") => {
      announce(message, politeness);
    },
    [announce]
  );
}
