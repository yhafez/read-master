/**
 * Live Reading Session Detail API
 *
 * GET /api/sessions/:id - Get session details
 * PUT /api/sessions/:id - Update session (host only)
 * DELETE /api/sessions/:id - Cancel/end session (host only)
 *
 * @example
 * ```bash
 * # Get session
 * curl -X GET "/api/sessions/abc123" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";

import type { VercelRequest } from "@vercel/node";
import { authenticateRequest } from "../../src/middleware/auth.js";
import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../src/services/db.js";
import { cache, CacheKeyPrefix } from "../../src/services/redis.js";
import {
  formatDate,
  formatDateRequired,
  mapToSessionHostInfo,
  mapToSessionBookInfo,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_PARTICIPANTS,
} from "./index.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Participant info
 */
export type ParticipantInfo = {
  id: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isHost: boolean;
  isModerator: boolean;
  isSynced: boolean;
  currentPage: number;
  joinedAt: string;
};

/**
 * Session detail response
 */
export type SessionDetailResponse = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  currentPage: number;
  currentSpeed: number | null;
  isPublic: boolean;
  allowChat: boolean;
  syncEnabled: boolean;
  maxParticipants: number;
  participantCount: number;
  peakParticipants: number;
  totalMessages: number;
  totalPageTurns: number;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  host: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  book: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
  };
  participants: ParticipantInfo[];
  isParticipant: boolean;
  isHost: boolean;
  createdAt: string;
};

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for updating a session
 */
export const updateSessionSchema = z.object({
  title: z.string().trim().min(1).max(MAX_TITLE_LENGTH).optional(),
  description: z
    .string()
    .trim()
    .max(MAX_DESCRIPTION_LENGTH)
    .optional()
    .nullable(),
  status: z
    .enum(["SCHEDULED", "ACTIVE", "PAUSED", "ENDED", "CANCELLED"])
    .optional(),
  currentPage: z.number().int().min(0).optional(),
  maxParticipants: z.number().int().min(2).max(MAX_PARTICIPANTS).optional(),
  allowChat: z.boolean().optional(),
  syncEnabled: z.boolean().optional(),
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
 * Build cache key for session
 */
export function buildSessionCacheKey(sessionId: string): string {
  return `${CacheKeyPrefix.USER}:session:${sessionId}`;
}

/**
 * Map participant to response format
 */
export function mapToParticipantInfo(participant: {
  id: string;
  userId: string;
  isHost: boolean;
  isModerator: boolean;
  isSynced: boolean;
  currentPage: number;
  joinedAt: Date;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}): ParticipantInfo {
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
    joinedAt: formatDateRequired(participant.joinedAt),
  };
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get session by ID with full details
 */
async function getSessionById(sessionId: string) {
  return db.readingSession.findFirst({
    where: {
      id: sessionId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      currentPage: true,
      currentSpeed: true,
      isPublic: true,
      allowChat: true,
      syncEnabled: true,
      inviteCode: true,
      maxParticipants: true,
      participantCount: true,
      peakParticipants: true,
      totalMessages: true,
      totalPageTurns: true,
      scheduledAt: true,
      startedAt: true,
      endedAt: true,
      createdAt: true,
      hostId: true,
      host: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          coverImage: true,
        },
      },
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
          joinedAt: true,
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          joinedAt: "asc",
        },
      },
    },
  });
}

/**
 * Check if user is a participant
 */
async function checkParticipation(
  sessionId: string,
  userId: string
): Promise<{
  isParticipant: boolean;
  participantId: string | null;
  isHost: boolean;
}> {
  const participant = await db.sessionParticipant.findUnique({
    where: {
      sessionId_userId: {
        sessionId,
        userId,
      },
    },
    select: {
      id: true,
      isHost: true,
      isActive: true,
    },
  });

  return {
    isParticipant: participant?.isActive ?? false,
    participantId: participant?.id ?? null,
    isHost: participant?.isHost ?? false,
  };
}

// ============================================================================
// Request Handlers
// ============================================================================

/**
 * Handle GET requests - Get session details
 */
async function handleGet(
  req: VercelRequest,
  res: VercelResponse,
  sessionId: string
): Promise<void> {
  const startTime = Date.now();

  try {
    // Try to authenticate (optional)
    let userId: string | undefined;
    const authResult = await authenticateRequest(req);
    if (authResult.success) {
      const user = await getUserByClerkId(authResult.user.userId);
      userId = user?.id;
    }

    // Get session
    const session = await getSessionById(sessionId);
    if (!session) {
      sendError(res, ErrorCodes.NOT_FOUND, "Session not found", 404);
      return;
    }

    // Check access for private sessions
    if (!session.isPublic && userId !== session.hostId) {
      const { isParticipant } = userId
        ? await checkParticipation(sessionId, userId)
        : { isParticipant: false };

      if (!isParticipant) {
        sendError(
          res,
          ErrorCodes.FORBIDDEN,
          "You don't have access to this private session",
          403
        );
        return;
      }
    }

    // Check user participation status
    const { isParticipant, isHost } = userId
      ? await checkParticipation(sessionId, userId)
      : { isParticipant: false, isHost: false };

    const response: SessionDetailResponse = {
      id: session.id,
      title: session.title,
      description: session.description,
      status: session.status,
      currentPage: session.currentPage,
      currentSpeed: session.currentSpeed,
      isPublic: session.isPublic,
      allowChat: session.allowChat,
      syncEnabled: session.syncEnabled,
      maxParticipants: session.maxParticipants,
      participantCount: session.participantCount,
      peakParticipants: session.peakParticipants,
      totalMessages: session.totalMessages,
      totalPageTurns: session.totalPageTurns,
      scheduledAt: formatDate(session.scheduledAt),
      startedAt: formatDate(session.startedAt),
      endedAt: formatDate(session.endedAt),
      host: mapToSessionHostInfo(session.host),
      book: mapToSessionBookInfo(session.book),
      participants: session.participants.map(mapToParticipantInfo),
      isParticipant,
      isHost,
      createdAt: formatDateRequired(session.createdAt),
    };

    logger.info("Session retrieved", {
      sessionId,
      userId,
      durationMs: Date.now() - startTime,
    });

    sendSuccess(res, response);
  } catch (error) {
    logger.error("Failed to get session", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });
    sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to get session", 500);
  }
}

/**
 * Handle PUT requests - Update session
 */
async function handlePut(
  req: VercelRequest,
  res: VercelResponse,
  sessionId: string
): Promise<void> {
  const startTime = Date.now();

  // Require authentication for PUT
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
    const session = await getSessionById(sessionId);
    if (!session) {
      sendError(res, ErrorCodes.NOT_FOUND, "Session not found", 404);
      return;
    }

    // Check if host
    if (session.hostId !== user.id) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Only the host can update the session",
        403
      );
      return;
    }

    // Parse and validate request body
    const parseResult = updateSessionSchema.safeParse(req.body);
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

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.currentPage !== undefined)
      updateData.currentPage = input.currentPage;
    if (input.maxParticipants !== undefined)
      updateData.maxParticipants = input.maxParticipants;
    if (input.allowChat !== undefined) updateData.allowChat = input.allowChat;
    if (input.syncEnabled !== undefined)
      updateData.syncEnabled = input.syncEnabled;

    // Handle status transitions
    if (input.status !== undefined) {
      const currentStatus = session.status;
      const newStatus = input.status;

      // Validate transitions
      if (currentStatus === "ENDED" || currentStatus === "CANCELLED") {
        sendError(
          res,
          ErrorCodes.VALIDATION_ERROR,
          "Cannot update a finished session",
          400
        );
        return;
      }

      updateData.status = newStatus;

      // Handle status-specific updates
      if (newStatus === "ACTIVE" && !session.startedAt) {
        updateData.startedAt = new Date();
      }
      if (newStatus === "ENDED" || newStatus === "CANCELLED") {
        updateData.endedAt = new Date();
      }
    }

    // Update session
    await db.readingSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    // Invalidate cache
    await cache.del(buildSessionCacheKey(sessionId));
    await cache.invalidatePattern(`${CacheKeyPrefix.USER}:sessions:*`);

    logger.info("Session updated", {
      sessionId,
      userId: user.id,
      updates: Object.keys(updateData),
      durationMs: Date.now() - startTime,
    });

    sendSuccess(res, {
      success: true,
      message: "Session updated successfully",
    });
  } catch (error) {
    logger.error("Failed to update session", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });
    sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to update session", 500);
  }
}

/**
 * Handle DELETE requests - End/cancel session
 */
async function handleDelete(
  req: VercelRequest,
  res: VercelResponse,
  sessionId: string
): Promise<void> {
  const startTime = Date.now();

  // Require authentication for DELETE
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
    const session = await getSessionById(sessionId);
    if (!session) {
      sendError(res, ErrorCodes.NOT_FOUND, "Session not found", 404);
      return;
    }

    // Check if host
    if (session.hostId !== user.id) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Only the host can end the session",
        403
      );
      return;
    }

    // Determine new status
    const newStatus = session.startedAt ? "ENDED" : "CANCELLED";

    // End session
    await db.readingSession.update({
      where: { id: sessionId },
      data: {
        status: newStatus,
        endedAt: new Date(),
      },
    });

    // Mark all participants as inactive
    await db.sessionParticipant.updateMany({
      where: {
        sessionId,
        isActive: true,
      },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });

    // Invalidate cache
    await cache.del(buildSessionCacheKey(sessionId));
    await cache.invalidatePattern(`${CacheKeyPrefix.USER}:sessions:*`);

    logger.info("Session ended", {
      sessionId,
      userId: user.id,
      status: newStatus,
      durationMs: Date.now() - startTime,
    });

    sendSuccess(res, {
      success: true,
      message: `Session ${newStatus.toLowerCase()}`,
    });
  } catch (error) {
    logger.error("Failed to end session", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });
    sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to end session", 500);
  }
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Main handler for /api/sessions/:id
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
    case "PUT":
      await handlePut(req, res, sessionId);
      return;
    case "DELETE":
      await handleDelete(req, res, sessionId);
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
