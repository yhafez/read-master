import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Should be called once at app startup, before React renders
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // Only initialize if DSN is configured
  if (!dsn) {
    // Sentry DSN not configured - error tracking is disabled
    // This is expected in development without Sentry setup
    return;
  }

  const environment = import.meta.env.MODE || "development";
  const release = import.meta.env.VITE_APP_VERSION || "unknown";

  Sentry.init({
    dsn,
    environment,
    release: `read-master-web@${release}`,

    // Integrations
    integrations: [
      // React Router integration for better error tracking
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),

      // Session Replay for debugging user sessions
      Sentry.replayIntegration({
        // Mask all text and images for privacy
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: environment === "production" ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session Replay sampling
    replaysSessionSampleRate: environment === "production" ? 0.1 : 1.0, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Configure which errors to ignore
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      "chrome-extension://",
      "moz-extension://",
      // Network errors (handled by user-facing messages)
      "Network request failed",
      "Failed to fetch",
      "NetworkError",
      // Random plugins/extensions
      "fb_xd_fragment",
      "bmi_SafeAddOnload",
      "EBCallBackMessageReceived",
      // Clerk auth errors (handled by Clerk UI)
      "ClerkJS",
    ],

    // Configure which URLs to trace
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/[^/]*\.vercel\.app/,
      /^https:\/\/readmaster\.com/,
      /^https:\/\/api\.readmaster\.com/,
    ],

    // Before sending error to Sentry, add custom context
    beforeSend(event, hint) {
      // Filter out development errors if in production
      if (environment === "production" && event.exception) {
        const error = hint.originalException;
        if (error instanceof Error && error.stack?.includes("localhost")) {
          return null; // Don't send to Sentry
        }
      }

      // Add custom tags for filtering in Sentry UI
      event.tags = {
        ...event.tags,
        app: "web",
      };

      return event;
    },

    // Before sending transaction to Sentry
    beforeSendTransaction(event) {
      // Don't send dev transactions to save quota
      if (environment === "development") {
        return null;
      }
      return event;
    },
  });
}

/**
 * Set user context for Sentry error tracking
 * Call this after user authentication
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  username?: string;
  tier?: string;
}): void {
  const sentryUser: Record<string, string> = {
    id: user.id,
  };

  if (user.email) {
    sentryUser.email = user.email;
  }
  if (user.username) {
    sentryUser.username = user.username;
  }
  if (user.tier) {
    sentryUser.tier = user.tier;
  }

  Sentry.setUser(sentryUser);
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for user actions
 * Helps understand what user did before error occurred
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  const breadcrumb: {
    message: string;
    category: string;
    level: "info";
    timestamp: number;
    data?: Record<string, unknown>;
  } = {
    message,
    category,
    level: "info",
    timestamp: Date.now() / 1000,
  };

  if (data) {
    breadcrumb.data = data;
  }

  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Manually capture an error
 * Use when catching errors that should still be reported
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>
): void {
  if (context) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Manually capture a message
 * Use for non-error events that should be tracked
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info"
): void {
  Sentry.captureMessage(message, level);
}

/**
 * Set custom context for errors
 * Useful for debugging specific features
 */
export function setSentryContext(
  context: string,
  data: Record<string, unknown>
): void {
  Sentry.setContext(context, data);
}

/**
 * Set custom tags for filtering in Sentry
 */
export function setSentryTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/**
 * Start a new transaction for performance monitoring
 * Note: This is a placeholder for compatibility.
 * In Sentry v8+, transactions are handled differently.
 */
export function startTransaction(
  _name: string,
  _op: string
): { finish: () => void } | undefined {
  // In newer Sentry versions, use startSpan instead
  // For now, return a no-op object for compatibility
  return {
    finish: () => {
      // No-op
    },
  };
}

// Export Sentry ErrorBoundary for wrapping React components
export const ErrorBoundary = Sentry.ErrorBoundary;

// Export profiler for performance monitoring
export const Profiler = Sentry.Profiler;

// Re-export commonly used types
export type { ErrorBoundaryProps } from "@sentry/react";
