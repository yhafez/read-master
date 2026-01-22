/**
 * GET /api/challenges/:id/leaderboard - Get challenge leaderboard
 *
 * Returns ranked list of participants for a challenge
 * - Sorted by progress (highest first)
 * - Shows user info and completion status
 * - Supports pagination
 * - Public for public challenges
 *
 * @example
 * ```bash
 * curl -X GET "/api/challenges/challenge_123/leaderboard?page=1&limit=20"
 * ```
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";

import {
  optionalAuth,
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

const leaderboardQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  filter: z.enum(["all", "completed", "active"]).default("all"),
});

// ============================================================================
// Types
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  tier: string;
  progress: number;
  goalValue: number;
  percentComplete: number;
  isCompleted: boolean;
  completedAt: string | null;
  startedAt: string;
}

// ============================================================================
// Handler
// ============================================================================

async function handleGet(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const { id: challengeId } = req.query as { id: string };

  // Validate query parameters
  const validation = leaderboardQuerySchema.safeParse(req.query);
  if (!validation.success) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Invalid query parameters",
      400,
      validation.error.flatten()
    );
    return;
  }

  const query = validation.data;

  try {
    // Get challenge
    const challenge = await db.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      sendError(res, ErrorCodes.NOT_FOUND, "Challenge not found", 404);
      return;
    }

    // Build where clause for participants
    const where: Record<string, unknown> = {
      challengeId: challengeId,
      isPublic: true, // Only show public participants
    };

    if (query.filter === "completed") {
      where.isCompleted = true;
    } else if (query.filter === "active") {
      where.isCompleted = false;
    }

    // Get participants with pagination, sorted by progress
    const [participants, total] = await Promise.all([
      db.challengeParticipant.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              tier: true,
            },
          },
        },
        orderBy: [
          { isCompleted: "desc" }, // Completed first
          { progress: "desc" }, // Then by progress
          { completedAt: "asc" }, // Then by completion time (earlier is better)
        ],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.challengeParticipant.count({ where }),
    ]);

    // Format leaderboard entries with rank
    const leaderboard: LeaderboardEntry[] = participants.map((p, index) => ({
      rank: (query.page - 1) * query.limit + index + 1,
      userId: p.user.id,
      username: p.user.username,
      displayName: p.user.displayName,
      avatarUrl: p.user.avatarUrl,
      tier: p.user.tier,
      progress: p.progress,
      goalValue: p.goalValue,
      percentComplete: Math.round((p.progress / p.goalValue) * 100),
      isCompleted: p.isCompleted,
      completedAt: p.completedAt ? p.completedAt.toISOString() : null,
      startedAt: p.startedAt.toISOString(),
    }));

    // Get current user's rank if authenticated
    let currentUserRank = null;
    if (req.auth?.userId) {
      const user = await getUserByClerkId(req.auth.userId);
      if (user) {
        const participation = await db.challengeParticipant.findUnique({
          where: {
            userId_challengeId: {
              userId: user.id,
              challengeId: challengeId,
            },
          },
        });

        if (participation) {
          // Count how many participants have higher progress
          const higherRanked = await db.challengeParticipant.count({
            where: {
              challengeId: challengeId,
              isPublic: true,
              OR: [
                { progress: { gt: participation.progress } },
                {
                  progress: participation.progress,
                  isCompleted: true,
                  completedAt: {
                    lt: participation.completedAt || new Date(),
                  },
                },
              ],
            },
          });

          currentUserRank = higherRanked + 1;
        }
      }
    }

    logger.info("Challenge leaderboard retrieved", {
      challengeId: challengeId,
      participantCount: participants.length,
      total,
    });

    sendSuccess(res, {
      challenge: {
        id: challenge.id,
        title: challenge.title,
        goalType: challenge.goalType,
        goalValue: challenge.goalValue,
        goalUnit: challenge.goalUnit,
      },
      leaderboard,
      currentUserRank,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    logger.error("Failed to get challenge leaderboard", {
      challengeId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to get challenge leaderboard",
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
  } else {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET.",
      405
    );
  }
}

export default async function (req: VercelRequest, res: VercelResponse) {
  const authReq = await optionalAuth(req);
  return handler(authReq as unknown as AuthenticatedRequest, res);
}
