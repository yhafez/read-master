/**
 * GET /api/challenges/:id/progress - Get user's progress in a challenge
 * PUT /api/challenges/:id/progress - Update progress (called automatically by system)
 *
 * GET endpoint:
 * - Returns current progress for authenticated user
 * - Shows completion status and rank
 *
 * PUT endpoint:
 * - Updates progress value
 * - Automatically marks as complete if goal reached
 * - Awards XP on completion
 * - Usually called internally when user completes books, flashcards, etc.
 *
 * @example
 * ```bash
 * # Get progress
 * curl -X GET /api/challenges/challenge_123/progress \
 *   -H "Authorization: Bearer <token>"
 *
 * # Update progress (internal use)
 * curl -X PUT /api/challenges/challenge_123/progress \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"increment": 1}'
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
import { db, getUserByClerkId } from "../../../src/services/db.js";

// ============================================================================
// Validation Schemas
// ============================================================================

const updateProgressSchema = z.object({
  increment: z.number().int(), // Can be positive or negative
  setValue: z.number().int().nonnegative().optional(), // Directly set progress value
});

// ============================================================================
// Handlers
// ============================================================================

async function handleGet(
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
      include: {
        challenge: true,
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

    // Calculate rank (users with higher progress rank higher)
    const rank = await db.challengeParticipant.count({
      where: {
        challengeId: challengeId,
        progress: {
          gt: participation.progress,
        },
      },
    });

    logger.info("Challenge progress retrieved", {
      userId: user.id,
      challengeId: challengeId,
      progress: participation.progress,
      rank: rank + 1,
    });

    sendSuccess(res, {
      id: participation.id,
      challengeId: participation.challengeId,
      progress: participation.progress,
      goalValue: participation.goalValue,
      isCompleted: participation.isCompleted,
      completedAt: participation.completedAt
        ? participation.completedAt.toISOString()
        : null,
      startedAt: participation.startedAt.toISOString(),
      rank: rank + 1,
      percentComplete: Math.round(
        (participation.progress / participation.goalValue) * 100
      ),
    });
  } catch (error) {
    logger.error("Failed to get challenge progress", {
      userId: user.id,
      challengeId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to get challenge progress",
      500
    );
  }
}

async function handlePut(
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

  // Validate request body
  const validation = updateProgressSchema.safeParse(req.body);
  if (!validation.success) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Invalid request body",
      400,
      validation.error.flatten()
    );
    return;
  }

  const input = validation.data;

  try {
    // Get participation
    const participation = await db.challengeParticipant.findUnique({
      where: {
        userId_challengeId: {
          userId: user.id,
          challengeId: challengeId,
        },
      },
      include: {
        challenge: true,
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
        "Challenge already completed",
        400
      );
      return;
    }

    // Calculate new progress
    let newProgress: number;
    if (input.setValue !== undefined) {
      newProgress = input.setValue;
    } else {
      newProgress = Math.max(0, participation.progress + input.increment);
    }

    // Check if goal reached
    const isCompleted = newProgress >= participation.goalValue;
    const completedAt = isCompleted ? new Date() : null;

    // Update participation in a transaction (to handle XP award atomically)
    const [updatedParticipation, updatedStats] = await db.$transaction(
      async (tx) => {
        const updated = await tx.challengeParticipant.update({
          where: {
            id: participation.id,
          },
          data: {
            progress: newProgress,
            isCompleted,
            completedAt,
          },
        });

        // Award XP if completed
        let stats = null;
        if (isCompleted && participation.challenge.xpReward > 0) {
          stats = await tx.userStats.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              totalXP: participation.challenge.xpReward,
              level: 1,
              currentStreak: 0,
              longestStreak: 0,
              booksCompleted: 0,
              totalReadingTime: 0,
              flashcardsCreated: 0,
              assessmentsCompleted: 0,
            },
            update: {
              totalXP: {
                increment: participation.challenge.xpReward,
              },
            },
          });
        }

        return [updated, stats];
      }
    );

    logger.info("Challenge progress updated", {
      userId: user.id,
      challengeId: challengeId,
      progress: newProgress,
      isCompleted,
      xpAwarded: isCompleted ? participation.challenge.xpReward : 0,
    });

    sendSuccess(res, {
      id: updatedParticipation.id,
      challengeId: updatedParticipation.challengeId,
      progress: updatedParticipation.progress,
      goalValue: updatedParticipation.goalValue,
      isCompleted: updatedParticipation.isCompleted,
      completedAt: updatedParticipation.completedAt
        ? updatedParticipation.completedAt.toISOString()
        : null,
      startedAt: updatedParticipation.startedAt.toISOString(),
      xpAwarded: isCompleted ? participation.challenge.xpReward : 0,
      newTotalXp: updatedStats ? updatedStats.totalXP : null,
    });
  } catch (error) {
    logger.error("Failed to update challenge progress", {
      userId: user.id,
      challengeId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to update challenge progress",
      500
    );
  }
}

// ============================================================================
// Main Handler
// ============================================================================

async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method === "GET") {
    await handleGet(req, res);
  } else if (req.method === "PUT") {
    await handlePut(req, res);
  } else {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET or PUT.",
      405
    );
  }
}

export default withAuth(handler);
