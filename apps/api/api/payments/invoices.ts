/**
 * GET /api/payments/invoices
 *
 * Returns invoice history for the authenticated user from Stripe
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
import { getUserByClerkId } from "../../src/services/db.js";
import {
  getCustomerInvoices,
  isStripeConfigured,
  formatAmount,
} from "../../src/services/stripe.js";
import type Stripe from "stripe";

// ============================================================================
// Types
// ============================================================================

export interface InvoiceSummary {
  id: string;
  number: string | null;
  status: string | null;
  amount: string;
  amountCents: number;
  currency: string;
  description: string | null;
  pdfUrl: string | null;
  hostedUrl: string | null;
  createdAt: string;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface InvoicesResponse {
  invoices: InvoiceSummary[];
  hasMore: boolean;
}

// ============================================================================
// Query Schema
// ============================================================================

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map Stripe invoice to our summary format
 */
export function mapInvoiceToSummary(invoice: Stripe.Invoice): InvoiceSummary {
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amount: formatAmount(invoice.amount_paid, invoice.currency),
    amountCents: invoice.amount_paid,
    currency: invoice.currency.toUpperCase(),
    description: invoice.description,
    pdfUrl: invoice.invoice_pdf ?? null,
    hostedUrl: invoice.hosted_invoice_url ?? null,
    createdAt: new Date(invoice.created * 1000).toISOString(),
    paidAt: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : null,
    periodStart: invoice.period_start
      ? new Date(invoice.period_start * 1000).toISOString()
      : null,
    periodEnd: invoice.period_end
      ? new Date(invoice.period_end * 1000).toISOString()
      : null,
  };
}

/**
 * Parse limit from query params
 */
export function parseLimit(value: unknown): number {
  const parsed = querySchema.shape.limit.safeParse(value);
  return parsed.success ? parsed.data : 10;
}

// ============================================================================
// Handler
// ============================================================================

async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET
  if (req.method !== "GET") {
    return sendError(
      res,
      ErrorCodes.METHOD_NOT_ALLOWED,
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

    // Parse query parameters
    const limit = parseLimit(req.query?.limit);

    // Get user details
    const user = await getUserByClerkId(userId);

    if (!user) {
      return sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    }

    // Check if user has a Stripe customer ID
    if (!user.stripeCustomerId) {
      // Return empty invoices for users without Stripe customer
      return sendSuccess(res, {
        invoices: [],
        hasMore: false,
      });
    }

    // Get invoices from Stripe
    const stripeInvoices = await getCustomerInvoices(
      user.stripeCustomerId,
      limit + 1 // Request one more to check if there are more
    );

    // Check if there are more invoices
    const hasMore = stripeInvoices.length > limit;
    const invoicesToReturn = hasMore
      ? stripeInvoices.slice(0, limit)
      : stripeInvoices;

    // Map to our format
    const invoices = invoicesToReturn.map(mapInvoiceToSummary);

    logger.debug("Invoices retrieved", {
      userId,
      count: invoices.length,
      hasMore,
    });

    const response: InvoicesResponse = {
      invoices,
      hasMore,
    };

    return sendSuccess(res, response);
  } catch (error) {
    logger.error("Failed to retrieve invoices", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to retrieve invoice history",
      500
    );
  }
}

// ============================================================================
// Export
// ============================================================================

export default withAuth(handler);
