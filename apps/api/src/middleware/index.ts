/**
 * API Middleware
 *
 * Re-exports all middleware utilities for convenient importing.
 */

export {
  // Types
  type AuthenticatedUser,
  type AuthenticatedRequest,
  type AuthResult,
  type ClerkWebhookEvent,
  // Authentication functions
  verifyClerkToken,
  getClerkUser,
  authenticateRequest,
  optionalAuth,
  // Webhook functions
  verifyWebhookSignature,
  // Higher-order middleware
  withAuth,
  withWebhook,
  // Clerk client (for advanced usage)
  clerkClient,
} from "./auth.js";
