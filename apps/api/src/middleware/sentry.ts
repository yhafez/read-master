/**
 * Sentry Middleware
 *
 * Integrates Sentry error tracking and performance monitoring into API routes.
 * Wraps handlers to automatically capture errors and track performance.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  addBreadcrumb,
  captureError,
  flushSentry,
  initSentry,
  setSentryContext,
  setSentryTag,
  setSentryUser,
  startTransaction,
} from "../utils/sentry.js";

/**
 * Request with Sentry tracking
 */
export type SentryRequest = VercelRequest & {
  sentryTransaction?: ReturnType<typeof startTransaction>;
};

/**
 * Higher-order function to wrap API handlers with Sentry error tracking
 * and performance monitoring
 *
 * @example
 * ```typescript
 * export default withSentry(async (req, res) => {
 *   // Your handler code
 *   return res.status(200).json({ success: true });
 * });
 * ```
 */
export function withSentry<
  TRequest extends VercelRequest = VercelRequest,
  TResponse extends VercelResponse = VercelResponse,
>(
  handler: (req: TRequest & SentryRequest, res: TResponse) => Promise<void>
): (req: TRequest, res: TResponse) => Promise<void> {
  return async (req: TRequest, res: TResponse): Promise<void> => {
    // Initialize Sentry
    initSentry();

    // Start performance transaction
    const transaction = startTransaction(
      `${req.method} ${req.url}`,
      "http.server"
    );

    // Add transaction to request for access in handler
    const sentryReq = req as TRequest & SentryRequest;
    sentryReq.sentryTransaction = transaction;

    // Set basic context
    setSentryContext("request", {
      method: req.method,
      url: req.url,
      headers: sanitizeHeaders(req.headers),
      query: req.query,
    });

    setSentryTag("method", req.method || "unknown");
    setSentryTag("endpoint", req.url || "unknown");

    // If user is authenticated, add user context
    // Check if the request has a user property (from auth middleware)
    if ("user" in req && req.user && typeof req.user === "object") {
      const user = req.user as {
        id: string;
        email?: string;
        tier?: string;
      };
      const sentryUserData: { id: string; email?: string; tier?: string } = {
        id: user.id,
      };
      if (user.email) {
        sentryUserData.email = user.email;
      }
      if (user.tier) {
        sentryUserData.tier = user.tier;
      }
      setSentryUser(sentryUserData);
    }

    // Add breadcrumb for request start
    addBreadcrumb(`Request started: ${req.method} ${req.url}`, "http", {
      method: req.method,
      url: req.url,
    });

    try {
      // Execute handler
      await handler(sentryReq, res);

      // Add breadcrumb for successful completion
      addBreadcrumb(`Request completed: ${req.method} ${req.url}`, "http", {
        statusCode: res.statusCode,
      });
    } catch (error) {
      // Capture error in Sentry
      if (error instanceof Error) {
        addBreadcrumb(`Request failed: ${req.method} ${req.url}`, "http", {
          error: error.message,
        });

        captureError(error, {
          method: req.method,
          url: req.url,
          query: req.query,
          headers: sanitizeHeaders(req.headers),
        });
      }

      // Re-throw so error handling middleware can handle it
      throw error;
    } finally {
      // Finish transaction
      if (transaction) {
        transaction.setHttpStatus(res.statusCode);
        transaction.finish();
      }

      // Flush Sentry events before function terminates
      await flushSentry();
    }
  };
}

/**
 * Sanitize headers to remove sensitive information
 */
function sanitizeHeaders(
  headers: VercelRequest["headers"]
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const sensitiveHeaders = [
    "authorization",
    "cookie",
    "x-clerk-secret-key",
    "x-api-key",
  ];

  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Combine Sentry with other middleware
 * Use this to wrap handlers with both error handling and Sentry tracking
 *
 * @example
 * ```typescript
 * import { withErrorHandling } from './error';
 * import { withSentry } from './sentry';
 *
 * export default compose(
 *   withSentry,
 *   withErrorHandling,
 *   async (req, res) => {
 *     // Your handler
 *   }
 * );
 * ```
 */
export function compose<
  TRequest extends VercelRequest = VercelRequest,
  TResponse extends VercelResponse = VercelResponse,
>(
  ...middlewares: Array<
    (
      handler: (req: TRequest, res: TResponse) => Promise<void>
    ) => (req: TRequest, res: TResponse) => Promise<void>
  >
): (
  handler: (req: TRequest, res: TResponse) => Promise<void>
) => (req: TRequest, res: TResponse) => Promise<void> {
  return (handler) => {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler
    );
  };
}
