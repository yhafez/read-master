/**
 * SendGrid Webhook Handler
 *
 * Receives and processes email events from SendGrid:
 * - processed, delivered, opened, clicked, bounced, dropped, spam, unsubscribe
 *
 * Webhook URL: POST /api/email/webhook
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { db } from "../../src/services/db.js";
import { logger } from "../../src/utils/logger.js";
import { sendError, sendSuccess } from "../../src/utils/response.js";

const WEBHOOK_SECRET = process.env.SENDGRID_WEBHOOK_SECRET || "";

/**
 * SendGrid event types
 */
type SendGridEventType =
  | "processed"
  | "delivered"
  | "open"
  | "click"
  | "bounce"
  | "dropped"
  | "spamreport"
  | "unsubscribe"
  | "group_unsubscribe"
  | "group_resubscribe";

/**
 * SendGrid webhook event
 */
interface SendGridEvent {
  email: string; // Recipient email
  timestamp: number; // Unix timestamp
  event: SendGridEventType;
  "smtp-id"?: string; // SendGrid message ID
  sg_message_id?: string; // SendGrid message ID (alternative format)
  reason?: string; // Bounce/drop reason
  url?: string; // Clicked URL
  useragent?: string; // User agent for opens/clicks
  ip?: string; // IP address
  emailId?: string; // Our custom email ID (from customArgs)
  userId?: string; // Our custom user ID (from customArgs)
}

/**
 * Verify SendGrid webhook signature
 */
function verifyWebhookSignature(
  publicKey: string,
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  if (!WEBHOOK_SECRET) {
    logger.warn("SENDGRID_WEBHOOK_SECRET not configured");
    return false;
  }

  try {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(timestamp + payload);
    return verifier.verify(publicKey, signature, "base64");
  } catch (error) {
    logger.error("Webhook signature verification failed", { error });
    return false;
  }
}

/**
 * Process a single SendGrid event
 */
async function processEvent(event: SendGridEvent): Promise<void> {
  try {
    // Extract message ID (SendGrid uses different formats)
    const messageId = event.sg_message_id || event["smtp-id"];

    if (!messageId) {
      logger.warn("Event missing message ID", { event: event.event });
      return;
    }

    // Find email record by SendGrid message ID
    const email = await db.email.findUnique({
      where: { sendgridMessageId: messageId },
    });

    if (!email) {
      logger.warn("Email not found for SendGrid message ID", {
        messageId,
        event: event.event,
      });
      return;
    }

    // Update email record based on event type
    const updateData: Record<string, unknown> = {
      sendgridStatus: event.event,
      updatedAt: new Date(),
    };

    const eventDate = new Date(event.timestamp * 1000);

    switch (event.event) {
      case "delivered":
        updateData.deliveredAt = eventDate;
        break;

      case "open":
        // Only set openedAt on first open
        if (!email.openedAt) {
          updateData.openedAt = eventDate;
        }
        updateData.openCount = { increment: 1 };
        break;

      case "click":
        // Only set clickedAt on first click
        if (!email.clickedAt) {
          updateData.clickedAt = eventDate;
        }
        updateData.clickCount = { increment: 1 };

        // Log clicked URL in metadata
        if (event.url) {
          const metadata = email.metadata as Record<string, unknown>;
          const clickedUrls = (metadata.clickedUrls as string[]) || [];
          if (!clickedUrls.includes(event.url)) {
            clickedUrls.push(event.url);
            updateData.uniqueClickCount = { increment: 1 };
          }
          updateData.metadata = {
            ...metadata,
            clickedUrls,
            lastClickedUrl: event.url,
            lastClickedAt: eventDate.toISOString(),
          };
        }
        break;

      case "bounce":
        updateData.bouncedAt = eventDate;
        updateData.bounceReason = event.reason || "Unknown bounce reason";
        break;

      case "dropped":
        updateData.failedAt = eventDate;
        updateData.errorMessage = event.reason || "Email was dropped by SendGrid";
        break;

      case "spamreport":
        updateData.failedAt = eventDate;
        updateData.errorMessage = "Marked as spam by recipient";
        break;

      case "unsubscribe":
      case "group_unsubscribe":
        updateData.unsubscribedAt = eventDate;

        // Update user email preferences
        if (email.userId) {
          await db.userEmailPreferences.upsert({
            where: { userId: email.userId },
            create: {
              userId: email.userId,
              emailEnabled: false,
              unsubscribedAt: eventDate,
            },
            update: {
              emailEnabled: false,
              unsubscribedAt: eventDate,
            },
          });

          logger.info("User unsubscribed via email link", {
            userId: email.userId,
            emailId: email.id,
          });
        }
        break;

      case "group_resubscribe":
        // Handle resubscribe (rare)
        if (email.userId) {
          await db.userEmailPreferences.update({
            where: { userId: email.userId },
            data: {
              emailEnabled: true,
            },
          });

          logger.info("User resubscribed via email link", {
            userId: email.userId,
            emailId: email.id,
          });
        }
        break;

      default:
        logger.warn("Unknown event type", { event: event.event });
    }

    // Update email record
    await db.email.update({
      where: { id: email.id },
      data: updateData,
    });

    logger.info("Email event processed", {
      emailId: email.id,
      event: event.event,
      messageId,
    });
  } catch (error) {
    logger.error("Failed to process email event", {
      error: error instanceof Error ? error.message : String(error),
      event: event.event,
    });
  }
}

/**
 * Webhook handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only accept POST requests
  if (req.method !== "POST") {
    return sendError(res, "VALIDATION_ERROR", "Method not allowed", 405);
  }

  try {
    // Verify webhook signature (if configured)
    if (WEBHOOK_SECRET) {
      const signature = req.headers["x-twilio-email-event-webhook-signature"] as string;
      const timestamp = req.headers["x-twilio-email-event-webhook-timestamp"] as string;

      if (signature && timestamp) {
        const payload = JSON.stringify(req.body);
        const isValid = verifyWebhookSignature(
          WEBHOOK_SECRET,
          payload,
          signature,
          timestamp
        );

        if (!isValid) {
          logger.warn("Invalid webhook signature");
          return sendError(res, "UNAUTHORIZED", "Invalid signature", 401);
        }
      } else {
        logger.warn("Webhook signature headers missing");
      }
    }

    // SendGrid sends an array of events
    const events = Array.isArray(req.body) ? req.body : [req.body];

    logger.info("Received SendGrid webhook", {
      eventCount: events.length,
    });

    // Process each event (in parallel for performance)
    await Promise.all(events.map((event: SendGridEvent) => processEvent(event)));

    // Always return 200 OK to SendGrid (even if some events failed)
    sendSuccess(res, { received: events.length });
  } catch (error) {
    logger.error("Webhook handler error", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Still return 200 OK to prevent SendGrid from retrying
    sendSuccess(res, { received: 0, error: "Internal error" });
  }
}
