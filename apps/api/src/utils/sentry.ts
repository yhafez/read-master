import * as Sentry from "@sentry/node";

let sentryInitialized = false;

/**
 * Initialize Sentry for API error tracking
 * Call this at the start of each serverless function
 */
export function initSentry(): void {
  // Only initialize once per cold start
  if (sentryInitialized) {
    return;
  }

  const dsn = process.env.SENTRY_DSN;

  // Only initialize if DSN is configured
  if (!dsn) {
    // Sentry DSN not configured - error tracking is disabled
    // This is expected in development without Sentry setup
    return;
  }

  const environment = process.env.NODE_ENV || "development";
  const release = process.env.VERCEL_GIT_COMMIT_SHA || "unknown";

  Sentry.init({
    dsn,
    environment,
    release: `read-master-api@${release}`,

    // Performance Monitoring
    tracesSampleRate: environment === "production" ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Configure which errors to ignore
    ignoreErrors: [
      // Auth errors (handled by middleware)
      "Unauthorized",
      "Invalid token",
      "Token expired",
      // Validation errors (expected user errors)
      "Validation error",
      "Invalid input",
      // Rate limiting (expected)
      "Rate limit exceeded",
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
        app: "api",
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

  sentryInitialized = true;
}

/**
 * Set user context for Sentry error tracking
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  tier?: string;
}): void {
  const sentryUser: Record<string, string> = {
    id: user.id,
  };

  if (user.email) {
    sentryUser.email = user.email;
  }
  if (user.tier) {
    sentryUser.tier = user.tier;
  }

  Sentry.setUser(sentryUser);
}

/**
 * Clear user context
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Set custom context for errors
 */
export function setSentryContext(
  context: string,
  data: Record<string, unknown>
): void {
  Sentry.setContext(context, data);
}

/**
 * Set custom tag for filtering
 */
export function setSentryTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/**
 * Add breadcrumb for debugging
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
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info"
): void {
  Sentry.captureMessage(message, level);
}

/**
 * Start a transaction for performance monitoring
 * Note: This is a placeholder for compatibility.
 * In Sentry v8+, transactions are handled differently.
 */
export function startTransaction(
  _name: string,
  _op: string
): { finish: () => void; setHttpStatus: (status: number) => void } | undefined {
  // In newer Sentry versions, use startSpan instead
  // For now, return a no-op object for compatibility
  return {
    finish: () => {
      // No-op
    },
    setHttpStatus: () => {
      // No-op
    },
  };
}

/**
 * Wrap async handler with Sentry error tracking
 * Use this to wrap all API route handlers
 */
export function withSentry<T>(
  handler: (...args: unknown[]) => Promise<T>
): (...args: unknown[]) => Promise<T> {
  return async (...args: unknown[]): Promise<T> => {
    try {
      // Initialize Sentry for this invocation
      initSentry();

      // Execute the handler
      return await handler(...args);
    } catch (error) {
      // Capture error in Sentry
      if (error instanceof Error) {
        captureError(error);
      }

      // Re-throw so API can handle response
      throw error;
    }
  };
}

/**
 * Flush Sentry events before serverless function terminates
 * Call this at the end of each function
 */
export async function flushSentry(): Promise<void> {
  await Sentry.flush(2000); // Wait up to 2 seconds
}

// Export Sentry namespace for advanced usage
export { Sentry };
