/**
 * Rate Limiting Middleware
 *
 * Implements tier-based rate limiting using Upstash Redis for tracking.
 * Different limits apply based on user subscription tier (FREE, PRO, SCHOLAR).
 *
 * Rate limits from specification:
 * - FREE: 5 AI calls/day
 * - PRO: 100 AI calls/day
 * - SCHOLAR: Unlimited AI calls
 *
 * @example
 * ```typescript
 * import { withRateLimit, checkRateLimit } from './middleware/rateLimit';
 *
 * // Using as higher-order middleware
 * export default withAuth(withRateLimit('ai', async (req, res) => {
 *   // Rate-limited AI handler
 * }));
 *
 * // Manual rate limit check
 * const result = await checkRateLimit('ai', userId, tier);
 * if (!result.success) {
 *   return res.status(429).json({ error: 'Rate limit exceeded' });
 * }
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import type { UserTier } from "@read-master/database";
import { logger } from "../utils/logger.js";
import type { AuthenticatedRequest } from "./auth.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Types of rate-limited operations
 */
export type RateLimitOperation =
  | "ai" // AI interactions (pre-reading guide, explain, ask, etc.)
  | "tts" // Text-to-speech requests
  | "ttsDownload" // TTS full book downloads
  | "api" // General API requests
  | "upload"; // File uploads

/**
 * Rate limit configuration per operation
 */
export type RateLimitConfig = {
  /** Maximum requests allowed */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
  /** Whether this is a daily limit */
  isDaily: boolean;
};

/**
 * Result of a rate limit check
 */
export type RateLimitResult = {
  /** Whether the request is allowed */
  success: boolean;
  /** Requests remaining in current window */
  remaining: number;
  /** Maximum requests allowed */
  limit: number;
  /** Unix timestamp when the rate limit resets */
  reset: number;
  /** Error message if rate limited */
  error?: string;
};

/**
 * Rate limit info to include in response headers
 */
export type RateLimitHeaders = {
  "X-RateLimit-Limit": string;
  "X-RateLimit-Remaining": string;
  "X-RateLimit-Reset": string;
  "X-RateLimit-Operation": string;
};

// ============================================================================
// Redis Client
// ============================================================================

/**
 * Get Redis client instance
 * Uses Upstash Redis with REST API (serverless-friendly)
 */
function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    logger.warn("Redis not configured - rate limiting disabled", {
      hasUrl: !!url,
      hasToken: !!token,
    });
    return null;
  }

  return new Redis({
    url,
    token,
  });
}

/**
 * Lazy-initialized Redis client
 */
let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient === undefined) {
    redisClient = getRedisClient();
  }
  return redisClient;
}

// ============================================================================
// Rate Limit Configuration
// ============================================================================

/**
 * Seconds in a day (for daily limits)
 */
const SECONDS_PER_DAY = 24 * 60 * 60;

/**
 * Seconds in a month (for monthly limits)
 */
const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;

/**
 * Get rate limit configuration for an operation and tier
 */
export function getRateLimitConfig(
  operation: RateLimitOperation,
  tier: UserTier
): RateLimitConfig {
  switch (operation) {
    case "ai":
      // AI interactions: tier-based daily limits
      switch (tier) {
        case "SCHOLAR":
          // Unlimited (set very high limit)
          return {
            limit: 10000,
            windowSeconds: SECONDS_PER_DAY,
            isDaily: true,
          };
        case "PRO":
          return { limit: 100, windowSeconds: SECONDS_PER_DAY, isDaily: true };
        case "FREE":
        default:
          return { limit: 5, windowSeconds: SECONDS_PER_DAY, isDaily: true };
      }

    case "tts":
      // TTS requests: per-minute rate limit to prevent abuse
      switch (tier) {
        case "SCHOLAR":
          return { limit: 60, windowSeconds: 60, isDaily: false };
        case "PRO":
          return { limit: 30, windowSeconds: 60, isDaily: false };
        case "FREE":
        default:
          return { limit: 10, windowSeconds: 60, isDaily: false };
      }

    case "ttsDownload":
      // TTS full book downloads: monthly limits
      switch (tier) {
        case "SCHOLAR":
          // Unlimited (set very high)
          return {
            limit: 10000,
            windowSeconds: SECONDS_PER_MONTH,
            isDaily: false,
          };
        case "PRO":
          return { limit: 5, windowSeconds: SECONDS_PER_MONTH, isDaily: false };
        case "FREE":
        default:
          // Free tier cannot download TTS
          return { limit: 0, windowSeconds: SECONDS_PER_MONTH, isDaily: false };
      }

    case "upload":
      // File uploads: hourly limits
      switch (tier) {
        case "SCHOLAR":
          return { limit: 50, windowSeconds: 3600, isDaily: false };
        case "PRO":
          return { limit: 20, windowSeconds: 3600, isDaily: false };
        case "FREE":
        default:
          return { limit: 5, windowSeconds: 3600, isDaily: false };
      }

    case "api":
    default:
      // General API: per-minute rate limit
      switch (tier) {
        case "SCHOLAR":
          return { limit: 1000, windowSeconds: 60, isDaily: false };
        case "PRO":
          return { limit: 300, windowSeconds: 60, isDaily: false };
        case "FREE":
        default:
          return { limit: 60, windowSeconds: 60, isDaily: false };
      }
  }
}

// ============================================================================
// Rate Limit Functions
// ============================================================================

/**
 * Create a rate limiter key for a user and operation
 */
function createRateLimitKey(
  operation: RateLimitOperation,
  userId: string,
  tier: UserTier
): string {
  const config = getRateLimitConfig(operation, tier);

  // For daily limits, include the date in the key
  if (config.isDaily) {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return `ratelimit:${operation}:${userId}:${today}`;
  }

  // For non-daily limits, just use operation and user
  return `ratelimit:${operation}:${userId}`;
}

/**
 * Check rate limit for a user and operation
 *
 * @param operation - Type of operation being rate limited
 * @param userId - User's unique identifier
 * @param tier - User's subscription tier
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  operation: RateLimitOperation,
  userId: string,
  tier: UserTier
): Promise<RateLimitResult> {
  const redis = getRedis();
  const config = getRateLimitConfig(operation, tier);

  // If limit is 0, always reject
  if (config.limit === 0) {
    return {
      success: false,
      remaining: 0,
      limit: 0,
      reset: Date.now() + config.windowSeconds * 1000,
      error: `This feature is not available on the ${tier} tier`,
    };
  }

  // If Redis is not configured, allow the request (fail-open)
  if (!redis) {
    logger.warn("Rate limiting bypassed - Redis not configured", {
      operation,
      userId,
      tier,
    });
    return {
      success: true,
      remaining: config.limit,
      limit: config.limit,
      reset: Date.now() + config.windowSeconds * 1000,
    };
  }

  try {
    // Create rate limiter for this operation
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        config.limit,
        `${config.windowSeconds} s`
      ),
      analytics: true,
      prefix: "@read-master",
    });

    // Create identifier for this user and operation
    const identifier = createRateLimitKey(operation, userId, tier);

    // Check the rate limit
    const result = await ratelimit.limit(identifier);

    // Log rate limit check
    if (!result.success) {
      logger.warn("Rate limit exceeded", {
        operation,
        userId,
        tier,
        limit: config.limit,
        remaining: result.remaining,
        reset: new Date(result.reset).toISOString(),
      });
    }

    if (result.success) {
      return {
        success: true,
        remaining: result.remaining,
        limit: result.limit,
        reset: result.reset,
      };
    }

    return {
      success: false,
      remaining: result.remaining,
      limit: result.limit,
      reset: result.reset,
      error: "Rate limit exceeded",
    };
  } catch (error) {
    // If rate limiting fails, allow the request (fail-open for availability)
    logger.error("Rate limit check failed", {
      operation,
      userId,
      tier,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: true,
      remaining: config.limit,
      limit: config.limit,
      reset: Date.now() + config.windowSeconds * 1000,
    };
  }
}

/**
 * Get current rate limit usage without consuming a request
 *
 * @param operation - Type of operation
 * @param userId - User's unique identifier
 * @param tier - User's subscription tier
 * @returns Current rate limit status
 */
export async function getRateLimitStatus(
  operation: RateLimitOperation,
  userId: string,
  tier: UserTier
): Promise<RateLimitResult> {
  const redis = getRedis();
  const config = getRateLimitConfig(operation, tier);

  // If limit is 0, return as exceeded
  if (config.limit === 0) {
    return {
      success: false,
      remaining: 0,
      limit: 0,
      reset: Date.now() + config.windowSeconds * 1000,
      error: `This feature is not available on the ${tier} tier`,
    };
  }

  // If Redis is not configured, return full quota
  if (!redis) {
    return {
      success: true,
      remaining: config.limit,
      limit: config.limit,
      reset: Date.now() + config.windowSeconds * 1000,
    };
  }

  try {
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        config.limit,
        `${config.windowSeconds} s`
      ),
      analytics: true,
      prefix: "@read-master",
    });

    const identifier = createRateLimitKey(operation, userId, tier);

    // Use getRemaining to check without consuming
    const result = await ratelimit.getRemaining(identifier);

    if (result.remaining > 0) {
      return {
        success: true,
        remaining: result.remaining,
        limit: result.limit,
        reset: result.reset,
      };
    }

    return {
      success: false,
      remaining: result.remaining,
      limit: result.limit,
      reset: result.reset,
      error: "Rate limit exceeded",
    };
  } catch (error) {
    // If check fails, assume full quota
    logger.error("Rate limit status check failed", {
      operation,
      userId,
      tier,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: true,
      remaining: config.limit,
      limit: config.limit,
      reset: Date.now() + config.windowSeconds * 1000,
    };
  }
}

/**
 * Reset rate limit for a user and operation
 * Useful for testing or when upgrading tiers
 *
 * @param operation - Type of operation
 * @param userId - User's unique identifier
 * @param tier - User's subscription tier (for key generation)
 */
export async function resetRateLimit(
  operation: RateLimitOperation,
  userId: string,
  tier: UserTier
): Promise<boolean> {
  const redis = getRedis();

  if (!redis) {
    return false;
  }

  try {
    const key = createRateLimitKey(operation, userId, tier);
    // Use resetUsedTokens from ratelimit
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, "1 s"), // Dummy, just need the reset
      prefix: "@read-master",
    });
    await ratelimit.resetUsedTokens(`@read-master:${key}`);
    return true;
  } catch (error) {
    logger.error("Failed to reset rate limit", {
      operation,
      userId,
      tier,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(
  result: RateLimitResult,
  operation: RateLimitOperation
): RateLimitHeaders {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
    "X-RateLimit-Operation": operation,
  };
}

/**
 * Apply rate limit headers to response
 */
export function applyRateLimitHeaders(
  res: VercelResponse,
  result: RateLimitResult,
  operation: RateLimitOperation
): void {
  const headers = createRateLimitHeaders(result, operation);

  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

/**
 * Create a 429 Too Many Requests response
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  operation: RateLimitOperation
): {
  statusCode: 429;
  body: {
    success: false;
    error: {
      code: string;
      message: string;
      operation: RateLimitOperation;
      retryAfter: number;
      limit: number;
      remaining: number;
      reset: number;
    };
  };
} {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

  return {
    statusCode: 429,
    body: {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: result.error ?? "Rate limit exceeded. Please try again later.",
        operation,
        retryAfter: Math.max(0, retryAfter),
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      },
    },
  };
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Extended request with rate limit info
 */
export type RateLimitedRequest = AuthenticatedRequest & {
  rateLimit: RateLimitResult;
};

/**
 * Higher-order function that wraps a handler with rate limiting
 *
 * Requires authentication to be applied first (for userId and tier)
 *
 * Usage:
 * ```ts
 * export default withAuth(withRateLimit('ai', async (req, res) => {
 *   const { remaining } = req.rateLimit;
 *   // Handler logic here
 * }));
 * ```
 *
 * @param operation - Type of operation to rate limit
 * @param handler - The handler function to wrap
 * @param getTier - Optional function to get user tier (defaults to FREE)
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit(
  operation: RateLimitOperation,
  handler: (
    req: RateLimitedRequest,
    res: VercelResponse
  ) => Promise<void> | void,
  getTier?: (req: AuthenticatedRequest) => UserTier | Promise<UserTier>
) {
  return async (
    req: AuthenticatedRequest,
    res: VercelResponse
  ): Promise<void> => {
    // Get user tier (default to FREE if not provided)
    let tier: UserTier = "FREE";

    if (getTier) {
      tier = await getTier(req);
    }

    // Check rate limit
    const result = await checkRateLimit(operation, req.auth.userId, tier);

    // Apply rate limit headers
    applyRateLimitHeaders(res, result, operation);

    // If rate limited, return 429
    if (!result.success) {
      const response = createRateLimitResponse(result, operation);
      res.setHeader(
        "Retry-After",
        String(Math.ceil((result.reset - Date.now()) / 1000))
      );
      res.status(response.statusCode).json(response.body);
      return;
    }

    // Attach rate limit info to request
    const rateLimitedReq = req as RateLimitedRequest;
    rateLimitedReq.rateLimit = result;

    await handler(rateLimitedReq, res);
  };
}

/**
 * Create a simple rate limit checker for use in handlers
 *
 * Usage:
 * ```ts
 * const checkAiLimit = createRateLimitChecker('ai');
 *
 * export default withAuth(async (req, res) => {
 *   const result = await checkAiLimit(req.auth.userId, 'PRO');
 *   if (!result.success) {
 *     return res.status(429).json({ error: result.error });
 *   }
 *   // Continue with handler
 * });
 * ```
 */
export function createRateLimitChecker(
  operation: RateLimitOperation
): (userId: string, tier: UserTier) => Promise<RateLimitResult> {
  return (userId: string, tier: UserTier) =>
    checkRateLimit(operation, userId, tier);
}

// ============================================================================
// Exports
// ============================================================================

/**
 * All rate limit utilities
 */
export const rateLimitUtils = {
  checkRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  getRateLimitConfig,
  createRateLimitHeaders,
  applyRateLimitHeaders,
  createRateLimitResponse,
  createRateLimitChecker,
} as const;

/**
 * Export Redis client getter for testing
 */
export { getRedis as _getRedisClient };
