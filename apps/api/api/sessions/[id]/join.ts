/**
 * Join Session API
 *
 * POST /api/sessions/:id/join - Join a reading session
 *
 * @example
 * ```bash
 * curl -X POST "/api/sessions/abc123/join" \
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
 * Join session response
 */
export type JoinSessionResponse = {
  success: boolean;
  message: string;
  participantId: string;
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
 * Handle POST requests - Join session
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
        isPublic: true,
        maxParticipants: true,
        participantCount: true,
        peakParticipants: true,
        currentPage: true,
        hostId: true,
      },
    });

    if (!session) {
      sendError(res, ErrorCodes.NOT_FOUND, "Session not found", 404);
      return;
    }

    // Check if session is joinable
    if (session.status === "ENDED" || session.status === "CANCELLED") {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "This session has ended and cannot be joined",
        400
      );
      return;
    }

    // Check participant limit
    if (session.participantCount >= session.maxParticipants) {
      sendError(res, ErrorCodes.VALIDATION_ERROR, "Session is full", 400);
      return;
    }

    // Check if already a participant
    const existing = await db.sessionParticipant.findUnique({
      where: {
        sessionId_userId: {
          sessionId: session.id,
          userId: user.id,
        },
      },
    });

    if (existing?.isActive) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "You are already in this session",
        400
      );
      return;
    }

    // Join or reactivate participant
    const participant = await db.$transaction(async (tx) => {
      let part;
      if (existing) {
        // Reactivate existing participant
        part = await tx.sessionParticipant.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            leftAt: null,
            joinedAt: new Date(),
          },
        });
      } else {
        // Create new participant
        part = await tx.sessionParticipant.create({
          data: {
            sessionId: session.id,
            userId: user.id,
            isActive: true,
            isHost: false,
            isModerator: false,
            currentPage: session.currentPage,
            isSynced: true,
          },
        });
      }

      // Update session participant count
      const newCount = session.participantCount + (existing?.isActive ? 0 : 1);
      await tx.readingSession.update({
        where: { id: session.id },
        data: {
          participantCount: { increment: existing?.isActive ? 0 : 1 },
          peakParticipants:
            newCount > session.peakParticipants
              ? newCount
              : session.peakParticipants,
        },
      });

      return part;
    });

    // Invalidate cache
    await cache.del(buildSessionCacheKey(session.id));
    await cache.invalidatePattern(`${CacheKeyPrefix.USER}:sessions:*`);

    logger.info("User joined session", {
      sessionId: session.id,
      userId: user.id,
      participantId: participant.id,
      durationMs: Date.now() - startTime,
    });

    const response: JoinSessionResponse = {
      success: true,
      message: "Successfully joined the session",
      participantId: participant.id,
    };

    sendSuccess(res, response);
  } catch (error) {
    logger.error("Failed to join session", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });
    sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to join session", 500);
  }
}

export default withAuth(handler);
