/**
 * POST /api/payments/customer-portal
 *
 * Creates a Stripe Customer Portal session for subscription management
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { withAuth } from "../../src/middleware/auth.js";
import type { AuthenticatedRequest } from "../../src/middleware/auth.js";
import { sendError, sendSuccess, ErrorCodes } from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { createCustomerPortalSession, isStripeConfigured } from "../../src/services/stripe.js";
import { getUserByClerkId } from "../../src/services/db.js";

// ============================================================================
// Request Schema
// ============================================================================

const CustomerPortalSchema = z.object({
  returnUrl: z.string().url().optional(),
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
    return sendError(res, ErrorCodes.METHOD_NOT_ALLOWED, "Method not allowed", 405);
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
    const parseResult = CustomerPortalSchema.safeParse(req.body);

    if (!parseResult.success) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid request data",
        400,
        parseResult.error.errors
      );
    }

    const { returnUrl } = parseResult.data;

    // Get user details
    const user = await getUserByClerkId(userId);

    if (!user) {
      return sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    }

    // Check if user has a Stripe customer ID
    if (!user.stripeCustomerId) {
      return sendError(
        res,
        ErrorCodes.BAD_REQUEST,
        "No active subscription found",
        400
      );
    }

    // Default return URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5173";
    const defaultReturnUrl = `${baseUrl}/settings/subscription`;

    // Create customer portal session
    const portalUrl = await createCustomerPortalSession(
      user.stripeCustomerId,
      returnUrl || defaultReturnUrl
    );

    logger.info("Customer portal session created successfully", {
      userId,
      customerId: user.stripeCustomerId,
    });

    // Return portal URL to redirect user
    return sendSuccess(res, {
      url: portalUrl,
    });
  } catch (error) {
    logger.error("Failed to create customer portal session", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to create customer portal session",
      500
    );
  }
}

// ============================================================================
// Export
// ============================================================================

export default withAuth(handler);
