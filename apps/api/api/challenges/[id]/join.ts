/**
 * POST /api/challenges/:id/join - Join a challenge
 * DELETE /api/challenges/:id/join - Leave a challenge
 *
 * POST endpoint:
 * - User joins a challenge
 * - Creates ChallengeParticipant record
 * - Cannot join if already participating
 *
 * DELETE endpoint:
 * - User leaves a challenge
 * - Soft deletes participation (marks as inactive)
 * - Can only leave if not completed
 *
 * @example
 * ```bash
 * # Join challenge
 * curl -X POST /api/challenges/challenge_123/join \
 *   -H "Authorization: Bearer <token>"
 *
 * # Leave challenge
 * curl -X DELETE /api/challenges/challenge_123/join \
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

// ============================================================================
// Handlers
// ============================================================================

async function handlePost(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const { userId: clerkUserId } = req.auth;
  const { id: challengeId } = req.query as { id: string };

  // Get user
  const user = await getUserByClerkId(clerkUserId);
  if (!user) {
    sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    return;
  }

  try {
    // Get challenge
    const challenge = await db.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      sendError(res, ErrorCodes.NOT_FOUND, "Challenge not found", 404);
      return;
    }

    if (!challenge.isActive) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Challenge is not active",
        400
      );
      return;
    }

    // Check if already participating
    const existingParticipation = await db.challengeParticipant.findUnique({
      where: {
        userId_challengeId: {
          userId: user.id,
          challengeId: challenge.id,
        },
      },
    });

    if (existingParticipation) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Already participating in this challenge",
        400
      );
      return;
    }

    // Create participation
    const participation = await db.challengeParticipant.create({
      data: {
        userId: user.id,
        challengeId: challenge.id,
        goalValue: challenge.goalValue,
        progress: 0,
        isCompleted: false,
      },
    });

    logger.info("User joined challenge", {
      userId: user.id,
      challengeId: challenge.id,
      participationId: participation.id,
    });

    sendSuccess(
      res,
      {
        id: participation.id,
        challengeId: challenge.id,
        progress: participation.progress,
        goalValue: participation.goalValue,
        isCompleted: participation.isCompleted,
        startedAt: participation.startedAt.toISOString(),
      },
      201
    );
  } catch (error) {
    logger.error("Failed to join challenge", {
      userId: user.id,
      challengeId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to join challenge", 500);
  }
}

async function handleDelete(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const { userId: clerkUserId } = req.auth;
  const { id: challengeId } = req.query as { id: string };

  // Get user
  const user = await getUserByClerkId(clerkUserId);
  if (!user) {
    sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    return;
  }

  try {
    // Get participation
    const participation = await db.challengeParticipant.findUnique({
      where: {
        userId_challengeId: {
          userId: user.id,
          challengeId: challengeId,
        },
      },
    });

    if (!participation) {
      sendError(
        res,
        ErrorCodes.NOT_FOUND,
        "Not participating in this challenge",
        404
      );
      return;
    }

    if (participation.isCompleted) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Cannot leave a completed challenge",
        400
      );
      return;
    }

    // Delete participation
    await db.challengeParticipant.delete({
      where: {
        id: participation.id,
      },
    });

    logger.info("User left challenge", {
      userId: user.id,
      challengeId: challengeId,
      participationId: participation.id,
    });

    sendSuccess(res, { message: "Left challenge successfully" });
  } catch (error) {
    logger.error("Failed to leave challenge", {
      userId: user.id,
      challengeId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to leave challenge", 500);
  }
}

// ============================================================================
// Main Handler
// ============================================================================

async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method === "POST") {
    await handlePost(req, res);
  } else if (req.method === "DELETE") {
    await handleDelete(req, res);
  } else {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use POST or DELETE.",
      405
    );
  }
}

export default withAuth(handler);
