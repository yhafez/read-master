/**
 * POST /api/payments/create-checkout-session
 *
 * Creates a Stripe Checkout session for upgrading to Pro or Scholar tier
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";
import { withAuth } from "../../src/middleware/auth.js";
import type { AuthenticatedRequest } from "../../src/middleware/auth.js";
import {
  sendError,
  sendSuccess,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import {
  createCheckoutSession,
  isStripeConfigured,
} from "../../src/services/stripe.js";
import { getUserByClerkId } from "../../src/services/db.js";

// ============================================================================
// Request Schema
// ============================================================================

const CreateCheckoutSessionSchema = z.object({
  tier: z.enum(["PRO", "SCHOLAR"]),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

// ============================================================================
// Handler
// ============================================================================

async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== "POST") {
    return sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed",
      405
    );
  }

  const { userId } = req.auth;

  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      logger.error("Stripe not configured", { userId });
      return sendError(
        res,
        ErrorCodes.CONFIGURATION_ERROR,
        "Payment processing is not configured",
        503
      );
    }

    // Validate request body
    const parseResult = CreateCheckoutSessionSchema.safeParse(req.body);

    if (!parseResult.success) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid request data",
        400,
        parseResult.error.errors
      );
    }

    const { tier, successUrl, cancelUrl } = parseResult.data;

    // Get user details
    const user = await getUserByClerkId(userId);

    if (!user) {
      return sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    }

    // Check if user is already on this tier or higher
    if (user.tier === tier) {
      return sendError(
        res,
        ErrorCodes.BAD_REQUEST,
        `You are already subscribed to ${tier} tier`,
        400
      );
    }

    if (user.tier === "SCHOLAR") {
      return sendError(
        res,
        ErrorCodes.BAD_REQUEST,
        "You are already on the highest tier",
        400
      );
    }

    // Default URLs (frontend will override these)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5173";
    const defaultSuccessUrl = `${baseUrl}/settings/subscription?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${baseUrl}/settings/subscription`;

    // Create checkout session
    const session = await createCheckoutSession({
      userId,
      userEmail: user.email,
      tier,
      successUrl: successUrl || defaultSuccessUrl,
      cancelUrl: cancelUrl || defaultCancelUrl,
    });

    logger.info("Checkout session created successfully", {
      userId,
      tier,
      sessionId: session.id,
    });

    // Return session URL to redirect user
    return sendSuccess(res, {
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error("Failed to create checkout session", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to create checkout session",
      500
    );
  }
}

// ============================================================================
// Export
// ============================================================================

export default withAuth(handler);
