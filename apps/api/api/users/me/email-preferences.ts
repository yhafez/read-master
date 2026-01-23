/**
 * Email Preferences API
 *
 * GET /api/users/me/email-preferences - Get current user's email preferences
 * PUT /api/users/me/email-preferences - Update email preferences
 * DELETE /api/users/me/email-preferences - Unsubscribe from all emails
 *
 * @example
 * ```bash
 * # Get preferences
 * curl -X GET "/api/users/me/email-preferences" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Update preferences
 * curl -X PUT "/api/users/me/email-preferences" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"weeklyDigest": false, "marketingEmails": false}'
 *
 * # Unsubscribe from all
 * curl -X DELETE "/api/users/me/email-preferences" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../../src/middleware/auth.js";
import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../../src/utils/response.js";
import { logger } from "../../../src/utils/logger.js";
import { getUserByClerkId } from "../../../src/services/db.js";
import {
  getEmailPreferences,
  updateEmailPreferences,
  unsubscribeUser,
} from "../../../src/services/emailService.js";

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for updating email preferences
 */
export const updatePreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  productUpdates: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  achievementEmails: z.boolean().optional(),
  recommendationEmails: z.boolean().optional(),
  socialEmails: z.boolean().optional(),
  digestFrequency: z
    .enum(["weekly", "biweekly", "monthly", "never"])
    .optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

// ============================================================================
// Response Types
// ============================================================================

/**
 * Email preferences response
 */
export type EmailPreferencesResponse = {
  emailEnabled: boolean;
  marketingEmails: boolean;
  productUpdates: boolean;
  weeklyDigest: boolean;
  achievementEmails: boolean;
  recommendationEmails: boolean;
  socialEmails: boolean;
  digestFrequency: string;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map database preferences to response format
 */
export function mapToResponse(prefs: {
  emailEnabled: boolean;
  marketingEmails: boolean;
  productUpdates: boolean;
  weeklyDigest: boolean;
  achievementEmails: boolean;
  recommendationEmails: boolean;
  socialEmails: boolean;
  digestFrequency: string;
}): EmailPreferencesResponse {
  return {
    emailEnabled: prefs.emailEnabled,
    marketingEmails: prefs.marketingEmails,
    productUpdates: prefs.productUpdates,
    weeklyDigest: prefs.weeklyDigest,
    achievementEmails: prefs.achievementEmails,
    recommendationEmails: prefs.recommendationEmails,
    socialEmails: prefs.socialEmails,
    digestFrequency: prefs.digestFrequency,
  };
}

/**
 * Validate update request body
 */
export function validateUpdateRequest(
  body: unknown
):
  | { success: true; data: UpdatePreferencesInput }
  | { success: false; error: string } {
  const result = updatePreferencesSchema.safeParse(body);
  if (!result.success) {
    const errors = result.error.errors.map((e) => e.message).join(", ");
    return { success: false, error: errors };
  }
  return { success: true, data: result.data };
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET - Get email preferences
 */
async function handleGet(
  _req: AuthenticatedRequest,
  res: VercelResponse,
  userId: string
): Promise<void> {
  const prefs = await getEmailPreferences(userId);

  logger.info("Email preferences fetched", { userId });

  sendSuccess(res, mapToResponse(prefs));
}

/**
 * PUT - Update email preferences
 */
async function handlePut(
  req: AuthenticatedRequest,
  res: VercelResponse,
  userId: string
): Promise<void> {
  // Validate request body
  const validation = validateUpdateRequest(req.body);
  if (!validation.success) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, validation.error, 400);
    return;
  }

  const updates = validation.data;

  // Filter out undefined values to create a clean update object
  const cleanUpdates: {
    emailEnabled?: boolean;
    marketingEmails?: boolean;
    productUpdates?: boolean;
    weeklyDigest?: boolean;
    achievementEmails?: boolean;
    recommendationEmails?: boolean;
    socialEmails?: boolean;
    digestFrequency?: string;
  } = {};

  if (updates.emailEnabled !== undefined)
    cleanUpdates.emailEnabled = updates.emailEnabled;
  if (updates.marketingEmails !== undefined)
    cleanUpdates.marketingEmails = updates.marketingEmails;
  if (updates.productUpdates !== undefined)
    cleanUpdates.productUpdates = updates.productUpdates;
  if (updates.weeklyDigest !== undefined)
    cleanUpdates.weeklyDigest = updates.weeklyDigest;
  if (updates.achievementEmails !== undefined)
    cleanUpdates.achievementEmails = updates.achievementEmails;
  if (updates.recommendationEmails !== undefined)
    cleanUpdates.recommendationEmails = updates.recommendationEmails;
  if (updates.socialEmails !== undefined)
    cleanUpdates.socialEmails = updates.socialEmails;
  if (updates.digestFrequency !== undefined)
    cleanUpdates.digestFrequency = updates.digestFrequency;

  // Check if any fields to update
  if (Object.keys(cleanUpdates).length === 0) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "No fields to update provided",
      400
    );
    return;
  }

  // Update preferences
  await updateEmailPreferences(userId, cleanUpdates);

  // Get updated preferences
  const prefs = await getEmailPreferences(userId);

  logger.info("Email preferences updated", {
    userId,
    updates: Object.keys(updates),
  });

  sendSuccess(res, {
    message: "Email preferences updated successfully",
    preferences: mapToResponse(prefs),
  });
}

/**
 * DELETE - Unsubscribe from all emails
 */
async function handleDelete(
  _req: AuthenticatedRequest,
  res: VercelResponse,
  userId: string
): Promise<void> {
  await unsubscribeUser(userId);

  logger.info("User unsubscribed from all emails", { userId });

  sendSuccess(res, {
    message: "Successfully unsubscribed from all emails",
  });
}

// ============================================================================
// Main Handler
// ============================================================================

async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const { userId: clerkUserId } = req.auth;

  try {
    // Get current user
    const user = await getUserByClerkId(clerkUserId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Route to appropriate handler
    switch (req.method) {
      case "GET":
        await handleGet(req, res, user.id);
        break;
      case "PUT":
        await handlePut(req, res, user.id);
        break;
      case "DELETE":
        await handleDelete(req, res, user.id);
        break;
      default:
        sendError(
          res,
          ErrorCodes.VALIDATION_ERROR,
          "Method not allowed. Use GET, PUT, or DELETE.",
          405
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error handling email preferences", {
      userId: clerkUserId,
      method: req.method,
      error: message,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to process email preferences request",
      500
    );
  }
}

export default withAuth(handler);
