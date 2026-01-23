/**
 * Stripe Service
 *
 * Manages Stripe SDK initialization and payment operations
 */

import Stripe from "stripe";
import { logger } from "../utils/logger.js";

// ============================================================================
// Configuration
// ============================================================================

const STRIPE_API_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

if (!STRIPE_API_KEY && process.env.NODE_ENV !== "test") {
  logger.warn(
    "STRIPE_SECRET_KEY not set - Stripe functionality will be disabled"
  );
}

// ============================================================================
// Stripe Client
// ============================================================================

// Use a dummy key for test environment to prevent Stripe SDK from throwing
// during module initialization. Actual Stripe calls are mocked in tests.
const stripeApiKey =
  STRIPE_API_KEY ||
  (process.env.NODE_ENV === "test" ? "sk_test_dummy_key_for_testing" : "");

export const stripe = new Stripe(stripeApiKey, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
  appInfo: {
    name: "Read Master",
    version: "1.0.0",
  },
});

// ============================================================================
// Product & Price IDs (Set these after creating products in Stripe Dashboard)
// ============================================================================

export const STRIPE_PRODUCTS = {
  PRO: {
    priceId: process.env.STRIPE_PRO_PRICE_ID || "price_pro_monthly",
    name: "Pro",
    tier: "PRO" as const,
  },
  SCHOLAR: {
    priceId: process.env.STRIPE_SCHOLAR_PRICE_ID || "price_scholar_monthly",
    name: "Scholar",
    tier: "SCHOLAR" as const,
  },
} as const;

// ============================================================================
// Types
// ============================================================================

export type SubscriptionTier = "FREE" | "PRO" | "SCHOLAR";

export interface CreateCheckoutSessionParams {
  userId: string;
  userEmail: string;
  tier: "PRO" | "SCHOLAR";
  successUrl: string;
  cancelUrl: string;
}

export interface StripeWebhookEvent {
  type: string;
  data: {
    object: Stripe.Subscription | Stripe.Invoice | Stripe.PaymentIntent;
  };
}

// ============================================================================
// Checkout Session
// ============================================================================

/**
 * Create a Stripe Checkout session for subscription purchase
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<Stripe.Checkout.Session> {
  const { userId, userEmail, tier, successUrl, cancelUrl } = params;

  logger.info("Creating Stripe checkout session", { userId, tier });

  const product = STRIPE_PRODUCTS[tier];

  if (!product) {
    throw new Error(`Invalid tier: ${tier}`);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail,
      client_reference_id: userId, // Link back to our user
      line_items: [
        {
          price: product.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          userId,
          tier,
        },
      },
      metadata: {
        userId,
        tier,
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      payment_method_types: ["card"],
      automatic_tax: {
        enabled: true,
      },
    });

    logger.info("Checkout session created", {
      sessionId: session.id,
      userId,
      tier,
    });

    return session;
  } catch (error) {
    logger.error("Failed to create checkout session", {
      userId,
      tier,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

// ============================================================================
// Customer Portal
// ============================================================================

/**
 * Create a link to Stripe Customer Portal for subscription management
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  logger.info("Creating customer portal session", { customerId });

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    logger.info("Customer portal session created", {
      customerId,
      sessionId: session.id,
    });

    return session.url;
  } catch (error) {
    logger.error("Failed to create customer portal session", {
      customerId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

// ============================================================================
// Subscription Management
// ============================================================================

/**
 * Get subscription details for a customer
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    logger.error("Failed to retrieve subscription", {
      subscriptionId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  logger.info("Cancelling subscription", { subscriptionId });

  try {
    // Cancel at period end (don't immediately revoke access)
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    logger.info("Subscription cancelled at period end", {
      subscriptionId,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    return subscription;
  } catch (error) {
    logger.error("Failed to cancel subscription", {
      subscriptionId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Reactivate a cancelled subscription (before period end)
 */
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  logger.info("Reactivating subscription", { subscriptionId });

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    logger.info("Subscription reactivated", { subscriptionId });

    return subscription;
  } catch (error) {
    logger.error("Failed to reactivate subscription", {
      subscriptionId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

// ============================================================================
// Webhook Verification
// ============================================================================

/**
 * Construct and verify a Stripe webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      STRIPE_WEBHOOK_SECRET
    );

    logger.debug("Webhook event verified", { type: event.type });

    return event;
  } catch (error) {
    logger.error("Webhook signature verification failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

// ============================================================================
// Invoice Management
// ============================================================================

/**
 * Get invoices for a customer
 */
export async function getCustomerInvoices(
  customerId: string,
  limit = 10
): Promise<Stripe.Invoice[]> {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data;
  } catch (error) {
    logger.error("Failed to retrieve customer invoices", {
      customerId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Map Stripe price ID to our subscription tier
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier {
  if (priceId === STRIPE_PRODUCTS.PRO.priceId) {
    return "PRO";
  }
  if (priceId === STRIPE_PRODUCTS.SCHOLAR.priceId) {
    return "SCHOLAR";
  }
  return "FREE";
}

/**
 * Format amount from Stripe (cents) to dollars
 */
export function formatAmount(cents: number, currency = "usd"): string {
  const amount = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!STRIPE_API_KEY && !!STRIPE_WEBHOOK_SECRET;
}

// ============================================================================
// Export webhook secret for use in webhook handler
// ============================================================================

export { STRIPE_WEBHOOK_SECRET };
