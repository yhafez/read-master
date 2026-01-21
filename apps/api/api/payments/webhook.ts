/**
 * POST /api/payments/webhook
 *
 * Handles Stripe webhook events for subscription management
 *
 * IMPORTANT: This endpoint must be configured in Stripe Dashboard
 * See docs/STRIPE_SETUP.md for setup instructions
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import type Stripe from "stripe";
import { constructWebhookEvent, getTierFromPriceId } from "../../src/services/stripe.js";
import { db } from "../../src/services/db.js";
import { logger } from "../../src/utils/logger.js";
import { sendError, sendSuccess, ErrorCodes } from "../../src/utils/response.js";

// ============================================================================
// Webhook Handler
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== "POST") {
    return sendError(res, ErrorCodes.METHOD_NOT_ALLOWED, "Method not allowed", 405);
  }

  // Get raw body and signature
  const signature = req.headers["stripe-signature"];

  if (!signature || typeof signature !== "string") {
    logger.error("Missing stripe-signature header");
    return sendError(
      res,
      ErrorCodes.BAD_REQUEST,
      "Missing stripe-signature header",
      400
    );
  }

  let event: Stripe.Event;

  try {
    // Get raw body (Vercel provides this as req.body when it's a Buffer)
    const rawBody = req.body;

    // Construct and verify webhook event
    event = constructWebhookEvent(rawBody, signature);

    logger.info("Webhook event received", {
      type: event.type,
      eventId: event.id,
    });
  } catch (error) {
    logger.error("Webhook signature verification failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return sendError(
      res,
      ErrorCodes.UNAUTHORIZED,
      "Invalid webhook signature",
      401
    );
  }

  // Process event based on type
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "customer.updated":
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      default:
        logger.debug("Unhandled webhook event type", { type: event.type });
    }

    // Return 200 to acknowledge receipt
    return sendSuccess(res, { received: true });
  } catch (error) {
    logger.error("Webhook event processing failed", {
      eventType: event.type,
      eventId: event.id,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Still return 200 to avoid Stripe retrying immediately
    // (we log the error for manual investigation)
    return sendSuccess(res, { received: true, error: "Processing failed" });
  }
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle checkout.session.completed
 * User completed payment checkout
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.client_reference_id || session.metadata?.userId;
  const tier = session.metadata?.tier as "PRO" | "SCHOLAR" | undefined;

  if (!userId) {
    logger.error("Missing userId in checkout session", { sessionId: session.id });
    return;
  }

  logger.info("Checkout session completed", {
    sessionId: session.id,
    userId,
    tier,
    customerId: session.customer,
    subscriptionId: session.subscription,
  });

  // Update user with Stripe customer ID and subscription ID
  await db.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      tier: tier || "PRO", // Default to PRO if not specified
      updatedAt: new Date(),
    },
  });

  logger.info("User tier upgraded after checkout", { userId, tier });
}

/**
 * Handle customer.subscription.created
 * New subscription created
 */
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.userId;
  const customerId = subscription.customer as string;

  if (!userId) {
    // Try to find user by customer ID
    const user = await db.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      logger.error("Cannot find user for subscription", {
        subscriptionId: subscription.id,
        customerId,
      });
      return;
    }
  }

  // Get tier from price ID
  const priceId = subscription.items.data[0]?.price.id;
  const tier = priceId ? getTierFromPriceId(priceId) : "FREE";

  logger.info("Subscription created", {
    subscriptionId: subscription.id,
    customerId,
    userId,
    tier,
    status: subscription.status,
  });

  // Update user tier
  await db.user.update({
    where: userId ? { id: userId } : { stripeCustomerId: customerId },
    data: {
      tier,
      stripeSubscriptionId: subscription.id,
      updatedAt: new Date(),
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      userId: userId || "",
      action: "SUBSCRIPTION_CREATED",
      entityType: "Subscription",
      entityId: subscription.id,
      metadata: {
        tier,
        status: subscription.status,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
      },
    },
  });
}

/**
 * Handle customer.subscription.updated
 * Subscription plan changed or status updated
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;

  // Find user by customer ID
  const user = await db.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    logger.error("Cannot find user for subscription update", {
      subscriptionId: subscription.id,
      customerId,
    });
    return;
  }

  // Get tier from price ID
  const priceId = subscription.items.data[0]?.price.id;
  const tier = priceId ? getTierFromPriceId(priceId) : user.tier;

  logger.info("Subscription updated", {
    subscriptionId: subscription.id,
    userId: user.id,
    tier,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  // Update user tier if changed
  if (tier !== user.tier) {
    await db.user.update({
      where: { id: user.id },
      data: {
        tier,
        updatedAt: new Date(),
      },
    });

    // Create audit log for tier change
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "TIER_CHANGED",
        entityType: "User",
        entityId: user.id,
        metadata: {
          oldTier: user.tier,
          newTier: tier,
          subscriptionId: subscription.id,
        },
      },
    });
  }

  // If subscription is cancelled (but still active until period end)
  if (subscription.cancel_at_period_end && subscription.status === "active") {
    logger.info("Subscription will cancel at period end", {
      subscriptionId: subscription.id,
      userId: user.id,
      cancelAt: subscription.cancel_at,
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "SUBSCRIPTION_CANCEL_SCHEDULED",
        entityType: "Subscription",
        entityId: subscription.id,
        metadata: {
          cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
          periodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
        },
      },
    });
  }
}

/**
 * Handle customer.subscription.deleted
 * Subscription cancelled or expired
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;

  // Find user by customer ID
  const user = await db.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    logger.error("Cannot find user for subscription deletion", {
      subscriptionId: subscription.id,
      customerId,
    });
    return;
  }

  logger.info("Subscription deleted", {
    subscriptionId: subscription.id,
    userId: user.id,
    previousTier: user.tier,
  });

  // Downgrade user to FREE tier
  await db.user.update({
    where: { id: user.id },
    data: {
      tier: "FREE",
      stripeSubscriptionId: null,
      updatedAt: new Date(),
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "SUBSCRIPTION_DELETED",
      entityType: "Subscription",
      entityId: subscription.id,
      metadata: {
        previousTier: user.tier,
        canceledAt: subscription.canceled_at,
        endedAt: subscription.ended_at,
      },
    },
  });

  logger.info("User downgraded to FREE tier after subscription deletion", {
    userId: user.id,
  });
}

/**
 * Handle invoice.payment_succeeded
 * Successful payment for subscription
 */
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = invoice.customer as string;
  const subscriptionId = (invoice as any).subscription as string;

  // Find user by customer ID
  const user = await db.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    logger.error("Cannot find user for payment success", {
      invoiceId: invoice.id,
      customerId,
    });
    return;
  }

  const amountPaid = invoice.amount_paid / 100; // Convert cents to dollars

  logger.info("Payment succeeded", {
    invoiceId: invoice.id,
    userId: user.id,
    subscriptionId,
    amount: amountPaid,
    currency: invoice.currency,
  });

  // Track revenue in daily analytics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await db.dailyAnalytics.upsert({
    where: {
      date: today,
    },
    create: {
      date: today,
      totalRevenueCents: amountPaid,
    },
    update: {
      totalRevenueCents: {
        increment: amountPaid,
      },
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "PAYMENT_SUCCEEDED",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: {
        amount: amountPaid,
        currency: invoice.currency,
        subscriptionId,
        invoiceNumber: invoice.number,
      },
    },
  });
}

/**
 * Handle invoice.payment_failed
 * Failed payment attempt
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = invoice.customer as string;

  // Find user by customer ID
  const user = await db.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    logger.error("Cannot find user for payment failure", {
      invoiceId: invoice.id,
      customerId,
    });
    return;
  }

  logger.warn("Payment failed", {
    invoiceId: invoice.id,
    userId: user.id,
    attemptCount: invoice.attempt_count,
    nextPaymentAttempt: invoice.next_payment_attempt,
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "PAYMENT_FAILED",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: {
        attemptCount: invoice.attempt_count,
        nextPaymentAttempt: invoice.next_payment_attempt,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      },
    },
  });

  // TODO: Send email notification to user about failed payment
  logger.info("Payment failed notification should be sent", { userId: user.id });
}

/**
 * Handle customer.updated
 * Customer details changed (e.g., email, payment method)
 */
async function handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
  // Find user by customer ID
  const user = await db.user.findFirst({
    where: { stripeCustomerId: customer.id },
  });

  if (!user) {
    logger.debug("Customer updated but no matching user found", {
      customerId: customer.id,
    });
    return;
  }

  logger.info("Customer updated", {
    customerId: customer.id,
    userId: user.id,
    email: customer.email,
  });

  // Update user email if it changed in Stripe
  if (customer.email && customer.email !== user.email) {
    await db.user.update({
      where: { id: user.id },
      data: {
        email: customer.email,
        updatedAt: new Date(),
      },
    });

    logger.info("User email synced from Stripe", {
      userId: user.id,
      newEmail: customer.email,
    });
  }
}

// ============================================================================
// Vercel Config (Disable body parsing for webhook signature verification)
// ============================================================================

export const config = {
  api: {
    bodyParser: false,
  },
};
