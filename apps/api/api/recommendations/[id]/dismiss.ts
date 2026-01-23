/**
 * POST /api/recommendations/:id/dismiss - Dismiss a book recommendation
 *
 * Marks a recommendation as dismissed so it won't be shown again.
 *
 * @example
 * ```bash
 * curl -X POST "/api/recommendations/abc123/dismiss" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";

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
import { db, getUserByClerkId } from "../../../src/services/db.js";
import { cache, CacheKeyPrefix } from "../../../src/services/redis.js";

// ============================================================================
// Main Handler
// ============================================================================

async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use POST.",
      405
    );
    return;
  }

  const { userId: clerkUserId } = req.auth;
  const recommendationId = req.query.id as string;

  if (!recommendationId) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Recommendation ID is required",
      400
    );
    return;
  }

  try {
    const user = await getUserByClerkId(clerkUserId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Check if the recommendation exists and belongs to the user
    const recommendation = await db.bookRecommendation.findFirst({
      where: {
        id: recommendationId,
        userId: user.id,
      },
    });

    if (!recommendation) {
      sendError(res, ErrorCodes.NOT_FOUND, "Recommendation not found", 404);
      return;
    }

    if (recommendation.dismissed) {
      sendSuccess(res, {
        success: true,
        message: "Recommendation already dismissed",
      });
      return;
    }

    // Update the recommendation
    await db.bookRecommendation.update({
      where: { id: recommendationId },
      data: {
        dismissed: true,
        dismissedAt: new Date(),
      },
    });

    // Invalidate cache
    await cache.del(`${CacheKeyPrefix.USER}:${user.id}:book-recs:all`);
    await cache.del(`${CacheKeyPrefix.USER}:${user.id}:book-recs:social`);
    await cache.del(`${CacheKeyPrefix.USER}:${user.id}:book-recs:ai`);
    await cache.del(`${CacheKeyPrefix.USER}:${user.id}:book-recs:trending`);
    await cache.del(`${CacheKeyPrefix.USER}:${user.id}:book-recs:following`);

    logger.info("Recommendation dismissed", {
      userId: user.id,
      recommendationId,
      bookTitle: recommendation.bookTitle,
    });

    sendSuccess(res, {
      success: true,
      message: "Recommendation dismissed",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error dismissing recommendation", {
      userId: clerkUserId,
      recommendationId,
      error: message,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to dismiss recommendation. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
