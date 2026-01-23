/**
 * Leave Session API
 *
 * POST /api/sessions/:id/leave - Leave a reading session
 *
 * @example
 * ```bash
 * curl -X POST "/api/sessions/abc123/leave" \
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
// Types
// ============================================================================

/**
 * Leave session response
 */
export type LeaveSessionResponse = {
  success: boolean;
  message: string;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate session ID format
 */
export function validateSessionId(id: unknown): string | null {
  if (typeof id !== "string" || id.trim().length === 0) {
    return null;
  }
  return id.trim();
}

/**
 * Build cache key for session
 */
export function buildSessionCacheKey(sessionId: string): string {
  return `${CacheKeyPrefix.USER}:session:${sessionId}`;
}

// ============================================================================
// Request Handler
// ============================================================================

/**
 * Handle POST requests - Leave session
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    sendError(
      res,
      ErrorCodes.METHOD_NOT_ALLOWED,
      `Method ${req.method} not allowed`,
      405
    );
    return;
  }

  const startTime = Date.now();
  const clerkId = req.auth?.userId;

  if (!clerkId) {
    sendError(res, ErrorCodes.UNAUTHORIZED, "Authentication required", 401);
    return;
  }

  const sessionId = validateSessionId(req.query.id);
  if (!sessionId) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "Invalid session ID", 400);
    return;
  }

  try {
    const user = await getUserByClerkId(clerkId);
    if (!user) {
      sendError(res, ErrorCodes.UNAUTHORIZED, "User not found", 401);
      return;
    }

    // Get session
    const session = await db.readingSession.findFirst({
      where: {
        id: sessionId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!session) {
      sendError(res, ErrorCodes.NOT_FOUND, "Session not found", 404);
      return;
    }

    // Check if participant
    const participant = await db.sessionParticipant.findUnique({
      where: {
        sessionId_userId: {
          sessionId: session.id,
          userId: user.id,
        },
      },
    });

    if (!participant || !participant.isActive) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "You are not in this session",
        400
      );
      return;
    }

    // Host cannot leave, they must end the session
    if (participant.isHost) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Host cannot leave. Use the end session action instead.",
        400
      );
      return;
    }

    // Mark participant as inactive
    await db.$transaction(async (tx) => {
      await tx.sessionParticipant.update({
        where: { id: participant.id },
        data: {
          isActive: false,
          leftAt: new Date(),
        },
      });

      await tx.readingSession.update({
        where: { id: session.id },
        data: {
          participantCount: { decrement: 1 },
        },
      });
    });

    // Invalidate cache
    await cache.del(buildSessionCacheKey(session.id));
    await cache.invalidatePattern(`${CacheKeyPrefix.USER}:sessions:*`);

    logger.info("User left session", {
      sessionId: session.id,
      userId: user.id,
      durationMs: Date.now() - startTime,
    });

    const response: LeaveSessionResponse = {
      success: true,
      message: "Successfully left the session",
    };

    sendSuccess(res, response);
  } catch (error) {
    logger.error("Failed to leave session", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });
    sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to leave session", 500);
  }
}

export default withAuth(handler);
