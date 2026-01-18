import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClerkClient } from "@clerk/backend";
import { verifyToken } from "@clerk/backend";
import crypto from "crypto";
import { logger } from "../utils/logger.js";

/**
 * Clerk Authentication Middleware
 *
 * Provides authentication utilities for Vercel serverless functions:
 * - Token verification from Authorization header
 * - Webhook signature verification
 * - User info extraction from verified tokens
 */

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY ?? "",
});

/**
 * Authenticated user info extracted from Clerk token
 */
export type AuthenticatedUser = {
  /** Clerk user ID (unique identifier) */
  userId: string;
  /** User's email address (if available) */
  email: string | null;
  /** User's first name (if available) */
  firstName: string | null;
  /** User's last name (if available) */
  lastName: string | null;
  /** User's profile image URL (if available) */
  imageUrl: string | null;
  /** User's username (if available) */
  username: string | null;
  /** Session ID for the current session */
  sessionId: string;
  /** Organization ID if user is in an organization context */
  orgId: string | null;
  /** Role in the organization (if applicable) */
  orgRole: string | null;
};

/**
 * Extended request with authenticated user
 */
export type AuthenticatedRequest = VercelRequest & {
  auth: AuthenticatedUser;
};

/**
 * Result of authentication attempt
 */
export type AuthResult =
  | { success: true; user: AuthenticatedUser }
  | { success: false; error: string; statusCode: number };

/**
 * Webhook event payload from Clerk
 */
export type ClerkWebhookEvent = {
  type: string;
  data: Record<string, unknown>;
  object: string;
};

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  const scheme = parts[0];
  const token = parts[1];

  if (
    parts.length !== 2 ||
    !scheme ||
    scheme.toLowerCase() !== "bearer" ||
    !token
  ) {
    return null;
  }

  return token;
}

/**
 * Verify a Clerk JWT token and extract user info
 *
 * @param token - JWT token from Authorization header
 * @returns AuthResult with user info or error details
 */
export async function verifyClerkToken(token: string): Promise<AuthResult> {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    return {
      success: false,
      error: "Authentication service not configured",
      statusCode: 500,
    };
  }

  try {
    // Verify the token using Clerk's verification
    const payload = await verifyToken(token, {
      secretKey,
    });

    // Extract user info from verified token
    const user: AuthenticatedUser = {
      userId: payload.sub,
      email: null, // Will be fetched if needed
      firstName: null,
      lastName: null,
      imageUrl: null,
      username: null,
      sessionId: payload.sid ?? "",
      orgId: payload.org_id ?? null,
      orgRole: payload.org_role ?? null,
    };

    return { success: true, user };
  } catch (error) {
    // Handle specific Clerk errors
    if (error instanceof Error) {
      if (error.message.includes("expired")) {
        return {
          success: false,
          error: "Token expired",
          statusCode: 401,
        };
      }
      if (error.message.includes("invalid")) {
        return {
          success: false,
          error: "Invalid token",
          statusCode: 401,
        };
      }
    }

    return {
      success: false,
      error: "Authentication failed",
      statusCode: 401,
    };
  }
}

/**
 * Get full user details from Clerk API
 *
 * Use this when you need additional user info beyond what's in the JWT
 *
 * @param userId - Clerk user ID
 * @returns Full user details from Clerk
 */
export async function getClerkUser(userId: string) {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured");
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    return {
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      username: user.username,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
      publicMetadata: user.publicMetadata,
      privateMetadata: user.privateMetadata,
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch user: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Authenticate a request and extract user info
 *
 * @param req - Vercel request object
 * @returns AuthResult with user info or error details
 */
export async function authenticateRequest(
  req: VercelRequest
): Promise<AuthResult> {
  const authHeader = req.headers.authorization;
  const token = extractBearerToken(authHeader);

  if (!token) {
    return {
      success: false,
      error: "No authorization token provided",
      statusCode: 401,
    };
  }

  return verifyClerkToken(token);
}

/**
 * Verify Clerk webhook signature
 *
 * Clerk signs webhook payloads using Svix. This function verifies
 * that the webhook came from Clerk.
 *
 * @param payload - Raw request body (string)
 * @param headers - Request headers object
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  payload: string,
  headers: {
    "svix-id"?: string | undefined;
    "svix-timestamp"?: string | undefined;
    "svix-signature"?: string | undefined;
  }
): boolean {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error("CLERK_WEBHOOK_SECRET is not configured");
    return false;
  }

  const svixId = headers["svix-id"];
  const svixTimestamp = headers["svix-timestamp"];
  const svixSignature = headers["svix-signature"];

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  // Check timestamp is within tolerance (5 minutes)
  const timestamp = parseInt(svixTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    return false;
  }

  // Verify signature using HMAC-SHA256
  const signedPayload = `${svixId}.${svixTimestamp}.${payload}`;

  // Clerk webhook secret is prefixed with "whsec_"
  const secret = webhookSecret.startsWith("whsec_")
    ? webhookSecret.slice(6)
    : webhookSecret;

  const secretBytes = Buffer.from(secret, "base64");
  const expectedSignature = crypto
    .createHmac("sha256", secretBytes)
    .update(signedPayload)
    .digest("base64");

  // svix-signature can contain multiple signatures, check if any match
  const signatures = svixSignature.split(" ");
  return signatures.some((sig) => {
    const parts = sig.split(",");
    const version = parts[0];
    const signature = parts[1];

    // Only check v1 signatures
    if (version !== "v1" || !signature) {
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, "base64"),
        Buffer.from(expectedSignature, "base64")
      );
    } catch {
      return false;
    }
  });
}

/**
 * Higher-order function that wraps a handler with authentication
 *
 * Usage:
 * ```ts
 * export default withAuth(async (req, res) => {
 *   const { userId } = req.auth;
 *   // Handler logic here
 * });
 * ```
 *
 * @param handler - The handler function to wrap
 * @returns Wrapped handler that requires authentication
 */
export function withAuth(
  handler: (
    req: AuthenticatedRequest,
    res: VercelResponse
  ) => Promise<void> | void
) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    const authResult = await authenticateRequest(req);

    if (!authResult.success) {
      res.status(authResult.statusCode).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: authResult.error,
        },
      });
      return;
    }

    // Attach authenticated user to request
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.auth = authResult.user;

    await handler(authenticatedReq, res);
  };
}

/**
 * Higher-order function for webhook handlers with signature verification
 *
 * Usage:
 * ```ts
 * export default withWebhook(async (req, res, event) => {
 *   // Handle webhook event based on event.type
 *   // event.type could be 'user.created', 'user.updated', etc.
 * });
 * ```
 *
 * @param handler - The webhook handler function
 * @returns Wrapped handler that verifies webhook signature
 */
export function withWebhook(
  handler: (
    req: VercelRequest,
    res: VercelResponse,
    event: ClerkWebhookEvent
  ) => Promise<void> | void
) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    // Only allow POST requests for webhooks
    if (req.method !== "POST") {
      res.status(405).json({
        success: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only POST requests are allowed for webhooks",
        },
      });
      return;
    }

    // Get raw body for signature verification
    const rawBody =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    // Extract headers, converting string | string[] to string | undefined
    const getSvixHeader = (name: string): string | undefined => {
      const value = req.headers[name];
      if (typeof value === "string") return value;
      if (Array.isArray(value)) return value[0];
      return undefined;
    };

    const isValid = verifyWebhookSignature(rawBody, {
      "svix-id": getSvixHeader("svix-id"),
      "svix-timestamp": getSvixHeader("svix-timestamp"),
      "svix-signature": getSvixHeader("svix-signature"),
    });

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: {
          code: "INVALID_SIGNATURE",
          message: "Invalid webhook signature",
        },
      });
      return;
    }

    // Parse event
    const event =
      typeof req.body === "string"
        ? (JSON.parse(req.body) as ClerkWebhookEvent)
        : (req.body as ClerkWebhookEvent);

    await handler(req, res, event);
  };
}

/**
 * Optional authentication - returns user if authenticated, null otherwise
 *
 * Use this for endpoints that can work with or without authentication
 *
 * @param req - Vercel request object
 * @returns User info if authenticated, null otherwise
 */
export async function optionalAuth(
  req: VercelRequest
): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  const token = extractBearerToken(authHeader);

  if (!token) {
    return null;
  }

  const result = await verifyClerkToken(token);
  return result.success ? result.user : null;
}

// Re-export for convenience
export { clerkClient };
