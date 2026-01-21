/**
 * PostHog Analytics
 *
 * Product analytics, event tracking, feature flags, and session recording
 */

import posthog from "posthog-js";
import { logger } from "./logger";

// ============================================================================
// Configuration
// ============================================================================

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || "";
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://app.posthog.com";
const IS_PRODUCTION = import.meta.env.PROD;
const IS_DEVELOPMENT = import.meta.env.DEV;

// ============================================================================
// Types
// ============================================================================

export type EventName =
  // User lifecycle
  | "user_signed_up"
  | "user_logged_in"
  | "user_logged_out"
  | "user_tier_changed"
  // Books
  | "book_added"
  | "book_opened"
  | "book_completed"
  | "book_deleted"
  // Reading
  | "reading_session_started"
  | "reading_session_paused"
  | "reading_session_resumed"
  | "reading_session_completed"
  | "chapter_completed"
  | "page_turned"
  // AI Features
  | "ai_explain_used"
  | "ai_chat_opened"
  | "ai_chat_message_sent"
  | "ai_assessment_started"
  | "ai_assessment_completed"
  | "flashcard_generated"
  // SRS
  | "flashcard_reviewed"
  | "flashcard_correct"
  | "flashcard_incorrect"
  | "streak_updated"
  // Social
  | "user_followed"
  | "user_unfollowed"
  | "group_joined"
  | "group_left"
  | "post_created"
  | "comment_created"
  // Conversion
  | "upgrade_initiated"
  | "upgrade_completed"
  | "subscription_cancelled"
  // TTS
  | "tts_started"
  | "tts_paused"
  | "tts_download_initiated"
  | "tts_download_completed";

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export interface UserProperties {
  email?: string;
  tier?: "FREE" | "PRO" | "SCHOLAR";
  reading_level?: string;
  streak?: number;
  books_count?: number;
  flashcards_count?: number;
}

// ============================================================================
// Initialization
// ============================================================================

let isInitialized = false;

/**
 * Initialize PostHog analytics
 * Call this early in your app's lifecycle
 */
export function initPostHog(): void {
  if (isInitialized) {
    logger.warn("PostHog already initialized");
    return;
  }

  if (!POSTHOG_KEY) {
    if (IS_PRODUCTION) {
      logger.error("PostHog key not configured in production");
    } else {
      logger.info("PostHog key not configured, skipping initialization");
    }
    return;
  }

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,

      // Autocapture
      autocapture: {
        dom_event_allowlist: ["click", "submit"], // Only capture clicks and form submissions
        url_allowlist: [window.location.origin], // Only our domain
        element_allowlist: ["button", "a"], // Only buttons and links
      },

      // Session recording
      session_recording: {
        enabled: true,
        maskAllInputs: true, // Mask all input fields for privacy
        maskTextSelector: '[data-sensitive]', // Mask elements with data-sensitive attribute
        recordCrossOriginIframes: false,
        sampleRate: IS_PRODUCTION ? 0.1 : 1.0, // 10% sampling in production, 100% in dev
        minimumDuration: 5000, // Only record sessions longer than 5 seconds
      },

      // Privacy
      mask_all_text: false, // Don't mask all text (too aggressive)
      mask_all_element_attributes: false,

      // Performance
      loaded: (ph) => {
        logger.info("PostHog loaded successfully");
        isInitialized = true;

        // Enable debug mode in development
        if (IS_DEVELOPMENT) {
          ph.debug();
        }
      },

      // Feature flags
      bootstrap: {
        featureFlags: {}, // Will be populated by server
      },

      // Other options
      persistence: "localStorage+cookie",
      disable_session_recording: false,
      disable_persistence: false,
      capture_pageview: true, // Automatically capture pageviews
      capture_pageleave: true, // Capture when user leaves page

      // Advanced options
      property_blacklist: ["$initial_referrer", "$initial_referring_domain"], // Don't track these
      sanitize_properties: (properties) => {
        // Remove any properties that look like sensitive data
        const sanitized = { ...properties };

        // Remove email-like properties
        Object.keys(sanitized).forEach((key) => {
          const value = String(sanitized[key]);
          if (value.includes("@") && value.includes(".")) {
            delete sanitized[key];
          }
          // Remove password-like properties
          if (key.toLowerCase().includes("password") || key.toLowerCase().includes("token")) {
            delete sanitized[key];
          }
        });

        return sanitized;
      },
    });

    logger.info("PostHog initialized", {
      environment: IS_PRODUCTION ? "production" : "development",
      host: POSTHOG_HOST,
    });
  } catch (error) {
    logger.error("Failed to initialize PostHog", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ============================================================================
// User Identification
// ============================================================================

/**
 * Identify a user in PostHog
 * Call this after user logs in
 */
export function identifyUser(
  userId: string,
  properties?: UserProperties
): void {
  if (!isInitialized || !posthog) {
    logger.warn("PostHog not initialized, skipping identify");
    return;
  }

  try {
    posthog.identify(userId, properties);
    logger.debug("User identified in PostHog", { userId });
  } catch (error) {
    logger.error("Failed to identify user in PostHog", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Update user properties
 */
export function setUserProperties(properties: UserProperties): void {
  if (!isInitialized || !posthog) {
    logger.warn("PostHog not initialized, skipping setUserProperties");
    return;
  }

  try {
    posthog.setPersonProperties(properties);
    logger.debug("User properties updated in PostHog", { properties });
  } catch (error) {
    logger.error("Failed to set user properties in PostHog", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Reset user identification (on logout)
 */
export function resetUser(): void {
  if (!isInitialized || !posthog) {
    logger.warn("PostHog not initialized, skipping reset");
    return;
  }

  try {
    posthog.reset();
    logger.debug("User reset in PostHog");
  } catch (error) {
    logger.error("Failed to reset user in PostHog", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ============================================================================
// Event Tracking
// ============================================================================

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: EventName,
  properties?: EventProperties
): void {
  if (!isInitialized || !posthog) {
    logger.warn("PostHog not initialized, skipping event tracking", {
      eventName,
    });
    return;
  }

  try {
    posthog.capture(eventName, properties);
    logger.debug("Event tracked in PostHog", { eventName, properties });
  } catch (error) {
    logger.error("Failed to track event in PostHog", {
      eventName,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Track a pageview (usually automatic, but can be called manually for SPAs)
 */
export function trackPageView(path?: string): void {
  if (!isInitialized || !posthog) {
    logger.warn("PostHog not initialized, skipping pageview");
    return;
  }

  try {
    posthog.capture("$pageview", {
      $current_url: path || window.location.href,
    });
    logger.debug("Pageview tracked in PostHog", { path });
  } catch (error) {
    logger.error("Failed to track pageview in PostHog", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flagKey: string): boolean {
  if (!isInitialized || !posthog) {
    logger.warn("PostHog not initialized, feature flag defaults to false", {
      flagKey,
    });
    return false;
  }

  try {
    const isEnabled = posthog.isFeatureEnabled(flagKey);
    logger.debug("Feature flag checked", { flagKey, isEnabled });
    return isEnabled || false;
  } catch (error) {
    logger.error("Failed to check feature flag", {
      flagKey,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Get the value of a feature flag (for multivariate flags)
 */
export function getFeatureFlagValue(
  flagKey: string
): string | boolean | undefined {
  if (!isInitialized || !posthog) {
    logger.warn("PostHog not initialized, feature flag value is undefined", {
      flagKey,
    });
    return undefined;
  }

  try {
    const value = posthog.getFeatureFlag(flagKey);
    logger.debug("Feature flag value retrieved", { flagKey, value });
    return value;
  } catch (error) {
    logger.error("Failed to get feature flag value", {
      flagKey,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return undefined;
  }
}

/**
 * Reload feature flags from the server
 */
export function reloadFeatureFlags(): void {
  if (!isInitialized || !posthog) {
    logger.warn("PostHog not initialized, skipping feature flag reload");
    return;
  }

  try {
    posthog.reloadFeatureFlags();
    logger.debug("Feature flags reloaded");
  } catch (error) {
    logger.error("Failed to reload feature flags", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ============================================================================
// Session Recording
// ============================================================================

/**
 * Start session recording (if not already started)
 */
export function startSessionRecording(): void {
  if (!isInitialized || !posthog) {
    logger.warn("PostHog not initialized, skipping session recording start");
    return;
  }

  try {
    posthog.startSessionRecording();
    logger.debug("Session recording started");
  } catch (error) {
    logger.error("Failed to start session recording", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Stop session recording
 */
export function stopSessionRecording(): void {
  if (!isInitialized || !posthog) {
    logger.warn("PostHog not initialized, skipping session recording stop");
    return;
  }

  try {
    posthog.stopSessionRecording();
    logger.debug("Session recording stopped");
  } catch (error) {
    logger.error("Failed to stop session recording", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if PostHog is initialized
 */
export function isPostHogInitialized(): boolean {
  return isInitialized;
}

/**
 * Get the PostHog instance (for advanced usage)
 */
export function getPostHog(): typeof posthog | null {
  return isInitialized ? posthog : null;
}

// ============================================================================
// Shutdown
// ============================================================================

/**
 * Shutdown PostHog (cleanup)
 */
export function shutdownPostHog(): void {
  if (!isInitialized || !posthog) {
    return;
  }

  try {
    // No explicit shutdown method in posthog-js
    // Just reset to clean up
    posthog.reset();
    isInitialized = false;
    logger.info("PostHog shutdown");
  } catch (error) {
    logger.error("Failed to shutdown PostHog", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
