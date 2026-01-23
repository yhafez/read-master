/**
 * Session Sync API
 *
 * GET /api/sessions/:id/sync - Get current sync state (page, participants)
 * POST /api/sessions/:id/sync - Update page position (host broadcasts to all)
 *
 * This endpoint provides real-time page synchronization for live reading sessions.
 * Participants poll this endpoint to stay in sync with the host's current page.
 *
 * @example
 * ```bash
 * # Get sync state
 * curl -X GET "/api/sessions/abc123/sync" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Update page (host only)
 * curl -X POST "/api/sessions/abc123/sync" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"currentPage":42,"eventType":"TURN"}'
 * ```
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";

import { authenticateRequest } from "../../../src/middleware/auth.js";
import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../../src/utils/response.js";
import { logger } from "../../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../../src/services/db.js";
import { cache, CacheKeyPrefix } from "../../../src/services/redis.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Cache TTL for sync state (5 seconds - very short for real-time)
 */
export const SYNC_CACHE_TTL = 5;

/**
 * Page event types
 */
export const PageEventTypes = {
  TURN: "TURN",
  JUMP: "JUMP",
  SYNC: "SYNC",
  START: "START",
  END: "END",
} as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Participant sync info
 */
export type ParticipantSyncInfo = {
  id: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isHost: boolean;
  isModerator: boolean;
  isSynced: boolean;
  currentPage: number;
  lastActiveAt: string;
};

/**
 * Sync state response
 */
export type SyncStateResponse = {
  sessionId: string;
  status: string;
  currentPage: number;
  currentSpeed: number | null;
  syncEnabled: boolean;
  totalPageTurns: number;
  lastPageUpdate: string | null;
  participants: ParticipantSyncInfo[];
  participantCount: number;
};

/**
 * Update sync response
 */
export type UpdateSyncResponse = {
  success: boolean;
  currentPage: number;
  totalPageTurns: number;
};

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for updating sync state
 */
export const updateSyncSchema = z.object({
  currentPage: z.number().int().min(0, "Page must be a positive number"),
  eventType: z.enum(["TURN", "JUMP", "SYNC"]).default("TURN"),
});

/**
 * Schema for participant sync update
 */
export const participantSyncSchema = z.object({
  currentPage: z.number().int().min(0),
  isSynced: z.boolean().optional(),
});

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
 * Format date as ISO string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Format optional date as ISO string
 */
export function formatOptionalDate(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

/**
 * Build cache key for sync state
 */
export function buildSyncCacheKey(sessionId: string): string {
  return `${CacheKeyPrefix.USER}:session:${sessionId}:sync`;
}

/**
 * Map participant to sync info
 */
export function mapToParticipantSyncInfo(participant: {
  id: string;
  userId: string;
  isHost: boolean;
  isModerator: boolean;
  isSynced: boolean;
  currentPage: number;
  lastActive: Date | null;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}): ParticipantSyncInfo {
  return {
    id: participant.id,
    userId: participant.userId,
    username: participant.user.username,
    displayName: participant.user.displayName,
    avatarUrl: participant.user.avatarUrl,
    isHost: participant.isHost,
    isModerator: participant.isModerator,
    isSynced: participant.isSynced,
    currentPage: participant.currentPage,
    lastActiveAt: formatDate(participant.lastActive ?? new Date()),
  };
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get session with sync details
 */
async function getSessionWithSync(sessionId: string) {
  return db.readingSession.findFirst({
    where: {
      id: sessionId,
      deletedAt: null,
    },
    select: {
      id: true,
      status: true,
      currentPage: true,
      currentSpeed: true,
      syncEnabled: true,
      isPublic: true,
      totalPageTurns: true,
      hostId: true,
      updatedAt: true,
      participants: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          userId: true,
          isHost: true,
          isModerator: true,
          isSynced: true,
          currentPage: true,
          lastActive: true,
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [{ isHost: "desc" }, { joinedAt: "asc" }],
      },
    },
  });
}

/**
 * Check if user is a participant
 */
async function getParticipant(sessionId: string, userId: string) {
  return db.sessionParticipant.findUnique({
    where: {
      sessionId_userId: {
        sessionId,
        userId,
      },
    },
    select: {
      id: true,
      isHost: true,
      isModerator: true,
      isActive: true,
    },
  });
}

// ============================================================================
// Request Handlers
// ============================================================================

/**
 * Handle GET requests - Get sync state
 */
async function handleGet(
  req: VercelRequest,
  res: VercelResponse,
  sessionId: string
): Promise<void> {
  const startTime = Date.now();

  try {
    // Try to authenticate (optional for public sessions)
    let userId: string | undefined;
    const authResult = await authenticateRequest(req);
    if (authResult.success) {
      const user = await getUserByClerkId(authResult.user.userId);
      userId = user?.id;
    }

    // Get session
    const session = await getSessionWithSync(sessionId);
    if (!session) {
      sendError(res, ErrorCodes.NOT_FOUND, "Session not found", 404);
      return;
    }

    // Check access for private sessions
    if (!session.isPublic && userId) {
      const participant = await getParticipant(sessionId, userId);
      if (!participant?.isActive && session.hostId !== userId) {
        sendError(
          res,
          ErrorCodes.FORBIDDEN,
          "You don't have access to this session",
          403
        );
        return;
      }
    } else if (!session.isPublic) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Authentication required for private sessions",
        403
      );
      return;
    }

    // Update participant's last active time if authenticated
    if (userId) {
      await db.sessionParticipant
        .update({
          where: {
            sessionId_userId: {
              sessionId,
              userId,
            },
          },
          data: {
            lastActive: new Date(),
          },
        })
        .catch(() => {
          // Ignore errors if participant doesn't exist
        });
    }

    const response: SyncStateResponse = {
      sessionId: session.id,
      status: session.status,
      currentPage: session.currentPage,
      currentSpeed: session.currentSpeed,
      syncEnabled: session.syncEnabled,
      totalPageTurns: session.totalPageTurns,
      lastPageUpdate: formatOptionalDate(session.updatedAt),
      participants: session.participants.map(mapToParticipantSyncInfo),
      participantCount: session.participants.length,
    };

    logger.debug("Sync state retrieved", {
      sessionId,
      currentPage: session.currentPage,
      participantCount: session.participants.length,
      durationMs: Date.now() - startTime,
    });

    sendSuccess(res, response);
  } catch (error) {
    logger.error("Failed to get sync state", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });
    sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to get sync state", 500);
  }
}

/**
 * Handle POST requests - Update page position
 */
async function handlePost(
  req: VercelRequest,
  res: VercelResponse,
  sessionId: string
): Promise<void> {
  const startTime = Date.now();

  // Require authentication
  const authResult = await authenticateRequest(req);
  if (!authResult.success) {
    sendError(res, ErrorCodes.UNAUTHORIZED, "Authentication required", 401);
    return;
  }

  try {
    const user = await getUserByClerkId(authResult.user.userId);
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
        hostId: true,
        syncEnabled: true,
        currentPage: true,
        totalPageTurns: true,
      },
    });

    if (!session) {
      sendError(res, ErrorCodes.NOT_FOUND, "Session not found", 404);
      return;
    }

    // Check if session is active
    if (session.status !== "ACTIVE" && session.status !== "PAUSED") {
      sendError(res, ErrorCodes.VALIDATION_ERROR, "Session is not active", 400);
      return;
    }

    // Get participant
    const participant = await getParticipant(sessionId, user.id);
    if (!participant?.isActive) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "You must be an active participant",
        403
      );
      return;
    }

    // Parse and validate request body
    const parseResult = updateSyncSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        firstError?.message ?? "Invalid input",
        400
      );
      return;
    }

    const input = parseResult.data;

    // Host can update session page, participants update their own
    if (participant.isHost || participant.isModerator) {
      // Update session page (broadcasts to all)
      await db.$transaction(async (tx) => {
        // Update session
        await tx.readingSession.update({
          where: { id: sessionId },
          data: {
            currentPage: input.currentPage,
            totalPageTurns: { increment: 1 },
          },
        });

        // Create page event
        await tx.sessionPageEvent.create({
          data: {
            sessionId,
            userId: user.id,
            eventType: input.eventType,
            toPage: input.currentPage,
            fromPage: session.currentPage,
          },
        });

        // Update synced participants to new page
        if (session.syncEnabled) {
          await tx.sessionParticipant.updateMany({
            where: {
              sessionId,
              isActive: true,
              isSynced: true,
            },
            data: {
              currentPage: input.currentPage,
              lastActive: new Date(),
            },
          });
        }
      });

      // Invalidate cache
      await cache.del(buildSyncCacheKey(sessionId));

      logger.info("Session page updated by host", {
        sessionId,
        userId: user.id,
        fromPage: session.currentPage,
        toPage: input.currentPage,
        eventType: input.eventType,
        durationMs: Date.now() - startTime,
      });

      const response: UpdateSyncResponse = {
        success: true,
        currentPage: input.currentPage,
        totalPageTurns: session.totalPageTurns + 1,
      };

      sendSuccess(res, response);
    } else {
      // Participant updates their own position
      await db.sessionParticipant.update({
        where: {
          sessionId_userId: {
            sessionId,
            userId: user.id,
          },
        },
        data: {
          currentPage: input.currentPage,
          lastActive: new Date(),
          // If they navigate away from host page, they're no longer synced
          isSynced: input.currentPage === session.currentPage,
        },
      });

      logger.debug("Participant page updated", {
        sessionId,
        userId: user.id,
        currentPage: input.currentPage,
        isSynced: input.currentPage === session.currentPage,
        durationMs: Date.now() - startTime,
      });

      const response: UpdateSyncResponse = {
        success: true,
        currentPage: input.currentPage,
        totalPageTurns: session.totalPageTurns,
      };

      sendSuccess(res, response);
    }
  } catch (error) {
    logger.error("Failed to update sync", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });
    sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to update sync", 500);
  }
}

/**
 * Handle PATCH requests - Update participant sync settings
 */
async function handlePatch(
  req: VercelRequest,
  res: VercelResponse,
  sessionId: string
): Promise<void> {
  const startTime = Date.now();

  // Require authentication
  const authResult = await authenticateRequest(req);
  if (!authResult.success) {
    sendError(res, ErrorCodes.UNAUTHORIZED, "Authentication required", 401);
    return;
  }

  try {
    const user = await getUserByClerkId(authResult.user.userId);
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
        currentPage: true,
      },
    });

    if (!session) {
      sendError(res, ErrorCodes.NOT_FOUND, "Session not found", 404);
      return;
    }

    // Parse request
    const parseResult = participantSyncSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        firstError?.message ?? "Invalid input",
        400
      );
      return;
    }

    const input = parseResult.data;

    // Update participant
    const updateData: Record<string, unknown> = {
      currentPage: input.currentPage,
      lastActive: new Date(),
    };

    if (input.isSynced !== undefined) {
      updateData.isSynced = input.isSynced;
      // If syncing, jump to session page
      if (input.isSynced) {
        updateData.currentPage = session.currentPage;
      }
    }

    await db.sessionParticipant.update({
      where: {
        sessionId_userId: {
          sessionId,
          userId: user.id,
        },
      },
      data: updateData,
    });

    logger.debug("Participant sync updated", {
      sessionId,
      userId: user.id,
      isSynced: input.isSynced,
      durationMs: Date.now() - startTime,
    });

    sendSuccess(res, {
      success: true,
      currentPage: updateData.currentPage as number,
      isSynced: updateData.isSynced as boolean | undefined,
    });
  } catch (error) {
    logger.error("Failed to update participant sync", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to update participant sync",
      500
    );
  }
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Main handler for /api/sessions/:id/sync
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const sessionId = validateSessionId(req.query.id);
  if (!sessionId) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "Invalid session ID", 400);
    return;
  }

  switch (req.method) {
    case "GET":
      await handleGet(req, res, sessionId);
      return;
    case "POST":
      await handlePost(req, res, sessionId);
      return;
    case "PATCH":
      await handlePatch(req, res, sessionId);
      return;
    default:
      sendError(
        res,
        ErrorCodes.METHOD_NOT_ALLOWED,
        `Method ${req.method} not allowed`,
        405
      );
  }
}

export default handler;
