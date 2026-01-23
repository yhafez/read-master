/**
 * Session Messages API
 *
 * GET /api/sessions/:id/messages - Get messages for a session (with pagination)
 * POST /api/sessions/:id/messages - Send a message in a session
 *
 * @example
 * ```bash
 * # Get messages
 * curl -X GET "/api/sessions/abc123/messages?limit=50" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Send message
 * curl -X POST "/api/sessions/abc123/messages" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"content":"Hello everyone!"}'
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
 * Default limit for messages
 */
export const DEFAULT_LIMIT = 50;

/**
 * Maximum limit for messages
 */
export const MAX_LIMIT = 100;

/**
 * Maximum message content length
 */
export const MAX_MESSAGE_LENGTH = 2000;

/**
 * Cache TTL for messages (30 seconds - shorter for real-time feel)
 */
export const MESSAGES_CACHE_TTL = 30;

/**
 * Message types
 */
export const MessageTypes = {
  CHAT: "CHAT",
  SYSTEM: "SYSTEM",
  HIGHLIGHT: "HIGHLIGHT",
  QUESTION: "QUESTION",
  ANNOTATION: "ANNOTATION",
} as const;

// ============================================================================
// Types
// ============================================================================

/**
 * User info in message
 */
export type MessageUserInfo = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Message summary for response
 */
export type MessageSummary = {
  id: string;
  type: string;
  content: string;
  pageNumber: number | null;
  user: MessageUserInfo;
  createdAt: string;
};

/**
 * Messages list response
 */
export type MessagesListResponse = {
  messages: MessageSummary[];
  hasMore: boolean;
  cursor: string | null;
};

/**
 * Send message response
 */
export type SendMessageResponse = {
  success: boolean;
  message: MessageSummary;
};

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for sending a message
 */
export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message content is required")
    .max(
      MAX_MESSAGE_LENGTH,
      `Message must be at most ${MAX_MESSAGE_LENGTH} characters`
    ),
  type: z.enum(["CHAT", "HIGHLIGHT", "QUESTION", "ANNOTATION"]).default("CHAT"),
  pageNumber: z.number().int().min(0).optional().nullable(),
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
 * Parse limit from query
 */
export function parseLimit(value: unknown): number {
  if (typeof value === "string") {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= MAX_LIMIT) {
      return num;
    }
  }
  return DEFAULT_LIMIT;
}

/**
 * Parse cursor from query (message ID for pagination)
 */
export function parseCursor(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

/**
 * Parse since timestamp for polling
 */
export function parseSince(value: unknown): Date | undefined {
  if (typeof value === "string") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return undefined;
}

/**
 * Format date as ISO string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Build cache key for messages
 */
export function buildMessagesCacheKey(
  sessionId: string,
  cursor?: string
): string {
  const parts = [`${CacheKeyPrefix.USER}:session:${sessionId}:messages`];
  if (cursor) parts.push(`c${cursor}`);
  return parts.join(":");
}

/**
 * Map user to response format
 */
export function mapToUserInfo(user: {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}): MessageUserInfo {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

/**
 * Map database message to response format
 */
export function mapToMessageSummary(message: {
  id: string;
  type: string;
  content: string;
  pageNumber: number | null;
  createdAt: Date;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}): MessageSummary {
  return {
    id: message.id,
    type: message.type,
    content: message.content,
    pageNumber: message.pageNumber,
    user: mapToUserInfo(message.user),
    createdAt: formatDate(message.createdAt),
  };
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get session with basic validation
 */
async function getSession(sessionId: string) {
  return db.readingSession.findFirst({
    where: {
      id: sessionId,
      deletedAt: null,
    },
    select: {
      id: true,
      status: true,
      isPublic: true,
      allowChat: true,
      hostId: true,
    },
  });
}

/**
 * Check if user is a participant
 */
async function isParticipant(
  sessionId: string,
  userId: string
): Promise<boolean> {
  const participant = await db.sessionParticipant.findUnique({
    where: {
      sessionId_userId: {
        sessionId,
        userId,
      },
    },
    select: {
      isActive: true,
    },
  });
  return participant?.isActive ?? false;
}

/**
 * Get messages for a session
 */
async function getMessages(
  sessionId: string,
  limit: number,
  cursor?: string,
  since?: Date
): Promise<{ messages: MessageSummary[]; hasMore: boolean }> {
  const where: Record<string, unknown> = {
    sessionId,
    deletedAt: null,
  };

  // For polling - get messages after a timestamp
  if (since) {
    where.createdAt = { gt: since };
  }

  // For pagination - get messages before cursor
  if (cursor) {
    where.id = { lt: cursor };
  }

  const messages = await db.sessionMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1, // Get one extra to check for more
    select: {
      id: true,
      type: true,
      content: true,
      pageNumber: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  const hasMore = messages.length > limit;
  const results = hasMore ? messages.slice(0, limit) : messages;

  return {
    messages: results.map(mapToMessageSummary),
    hasMore,
  };
}

// ============================================================================
// Request Handlers
// ============================================================================

/**
 * Handle GET requests - List messages
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
    const session = await getSession(sessionId);
    if (!session) {
      sendError(res, ErrorCodes.NOT_FOUND, "Session not found", 404);
      return;
    }

    // Check access for private sessions
    if (!session.isPublic && userId) {
      const isParticipantCheck = await isParticipant(sessionId, userId);
      if (!isParticipantCheck && session.hostId !== userId) {
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

    // Parse query parameters
    const limit = parseLimit(req.query.limit);
    const cursor = parseCursor(req.query.cursor);
    const since = parseSince(req.query.since);

    // Get messages
    const { messages, hasMore } = await getMessages(
      sessionId,
      limit,
      cursor,
      since
    );

    const lastMessage = messages[messages.length - 1];
    const response: MessagesListResponse = {
      messages,
      hasMore,
      cursor: lastMessage ? lastMessage.id : null,
    };

    logger.debug("Messages retrieved", {
      sessionId,
      count: messages.length,
      hasMore,
      durationMs: Date.now() - startTime,
    });

    sendSuccess(res, response);
  } catch (error) {
    logger.error("Failed to get messages", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });
    sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to get messages", 500);
  }
}

/**
 * Handle POST requests - Send message
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
    const session = await getSession(sessionId);
    if (!session) {
      sendError(res, ErrorCodes.NOT_FOUND, "Session not found", 404);
      return;
    }

    // Check if chat is enabled
    if (!session.allowChat) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Chat is disabled for this session",
        403
      );
      return;
    }

    // Check if session is active
    if (session.status === "ENDED" || session.status === "CANCELLED") {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Cannot send messages to a finished session",
        400
      );
      return;
    }

    // Check if user is a participant
    const isParticipantCheck = await isParticipant(sessionId, user.id);
    if (!isParticipantCheck && session.hostId !== user.id) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "You must join the session to send messages",
        403
      );
      return;
    }

    // Parse and validate request body
    const parseResult = sendMessageSchema.safeParse(req.body);
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

    // Create message
    const message = await db.sessionMessage.create({
      data: {
        sessionId,
        userId: user.id,
        type: input.type,
        content: input.content,
        pageNumber: input.pageNumber ?? null,
      },
      select: {
        id: true,
        type: true,
        content: true,
        pageNumber: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update session message count
    await db.readingSession.update({
      where: { id: sessionId },
      data: {
        totalMessages: { increment: 1 },
      },
    });

    // Invalidate cache
    await cache.invalidatePattern(
      `${CacheKeyPrefix.USER}:session:${sessionId}:messages*`
    );

    logger.info("Message sent", {
      sessionId,
      userId: user.id,
      messageId: message.id,
      type: input.type,
      durationMs: Date.now() - startTime,
    });

    const response: SendMessageResponse = {
      success: true,
      message: mapToMessageSummary(message),
    };

    sendSuccess(res, response, 201);
  } catch (error) {
    logger.error("Failed to send message", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });
    sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to send message", 500);
  }
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Main handler for /api/sessions/:id/messages
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
