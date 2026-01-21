/**
 * Clerk User Created Webhook
 *
 * Receives webhook from Clerk when a new user signs up.
 * Creates user record in database and sends welcome email.
 *
 * Webhook URL: POST /api/webhooks/clerk-user-created
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Webhook } from "svix";
import { db } from "../../src/services/db.js";
import { sendWelcomeEmail } from "../../src/services/emailTriggers.js";
import { logger } from "../../src/utils/logger.js";
import { sendSuccess, sendError } from "../../src/utils/response.js";

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || "";

interface ClerkUserEvent {
  type: "user.created";
  data: {
    id: string;
    email_addresses: Array<{
      id: string;
      email_address: string;
      verification: { status: string };
    }>;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    profile_image_url: string | null;
    created_at: number;
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST requests
  if (req.method !== "POST") {
    return sendError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
  }

  try {
    // Verify webhook signature
    if (!CLERK_WEBHOOK_SECRET) {
      logger.error("CLERK_WEBHOOK_SECRET not configured");
      return sendError(
        res,
        500,
        "CONFIGURATION_ERROR",
        "Webhook secret not configured"
      );
    }

    const svix_id = req.headers["svix-id"] as string;
    const svix_timestamp = req.headers["svix-timestamp"] as string;
    const svix_signature = req.headers["svix-signature"] as string;

    if (!svix_id || !svix_timestamp || !svix_signature) {
      logger.warn("Missing svix headers");
      return sendError(res, 400, "BAD_REQUEST", "Missing svix headers");
    }

    // Create webhook instance
    const webhook = new Webhook(CLERK_WEBHOOK_SECRET);

    // Verify and parse the webhook payload
    const payload = webhook.verify(JSON.stringify(req.body), {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ClerkUserEvent;

    // Only handle user.created events
    if (payload.type !== "user.created") {
      logger.info("Ignoring non-user.created event", { type: payload.type });
      return sendSuccess(res, { message: "Event ignored" });
    }

    const clerkUser = payload.data;

    // Get primary email
    const primaryEmail = clerkUser.email_addresses.find(
      (e) => e.verification.status === "verified"
    ) || clerkUser.email_addresses[0];

    if (!primaryEmail) {
      logger.error("No email found for user", { clerkId: clerkUser.id });
      return sendError(res, 400, "BAD_REQUEST", "No email found");
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (existingUser) {
      logger.info("User already exists", { userId: existingUser.id });
      return sendSuccess(res, {
        message: "User already exists",
        userId: existingUser.id,
      });
    }

    // Create user in database
    const user = await db.user.create({
      data: {
        clerkId: clerkUser.id,
        email: primaryEmail.email_address,
        username: clerkUser.username,
        firstName: clerkUser.first_name,
        lastName: clerkUser.last_name,
        displayName:
          clerkUser.first_name ||
          clerkUser.username ||
          primaryEmail.email_address.split("@")[0],
        avatarUrl: clerkUser.profile_image_url,
        tier: "FREE", // Default to free tier
        role: "USER", // Default role
      },
    });

    logger.info("User created", {
      userId: user.id,
      clerkId: clerkUser.id,
      email: user.email,
    });

    // Send welcome email (async, don't wait for it)
    sendWelcomeEmail(user.id)
      .then((result) => {
        if (result.success) {
          logger.info("Welcome email queued", { userId: user.id });
        } else {
          logger.error("Failed to queue welcome email", {
            userId: user.id,
            error: result.error,
          });
        }
      })
      .catch((error) => {
        logger.error("Error queueing welcome email", {
          userId: user.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    sendSuccess(res, {
      message: "User created successfully",
      userId: user.id,
    });
  } catch (error) {
    logger.error("Clerk webhook error", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Always return 200 to Clerk to prevent retries
    sendSuccess(res, {
      message: "Webhook received",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
