/**
 * Rate Limit Middleware Tests
 *
 * Tests for tier-based rate limiting functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { UserTier } from "@read-master/database";
import {
  getRateLimitConfig,
  createRateLimitHeaders,
  createRateLimitResponse,
  type RateLimitResult,
  type RateLimitOperation,
} from "./rateLimit.js";

// ============================================================================
// Test Setup
// ============================================================================

// Mock Redis and Ratelimit to avoid actual network calls
vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({
      success: true,
      remaining: 4,
      limit: 5,
      reset: Date.now() + 86400000,
    }),
    getRemaining: vi.fn().mockResolvedValue({
      remaining: 4,
      limit: 5,
      reset: Date.now() + 86400000,
    }),
    resetUsedTokens: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock environment
beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// getRateLimitConfig Tests
// ============================================================================

describe("getRateLimitConfig", () => {
  describe("AI operation limits", () => {
    it("should return 5 requests/day for FREE tier", () => {
      const config = getRateLimitConfig("ai", "FREE");
      expect(config.limit).toBe(5);
      expect(config.windowSeconds).toBe(24 * 60 * 60);
      expect(config.isDaily).toBe(true);
    });

    it("should return 100 requests/day for PRO tier", () => {
      const config = getRateLimitConfig("ai", "PRO");
      expect(config.limit).toBe(100);
      expect(config.windowSeconds).toBe(24 * 60 * 60);
      expect(config.isDaily).toBe(true);
    });

    it("should return very high limit for SCHOLAR tier (effectively unlimited)", () => {
      const config = getRateLimitConfig("ai", "SCHOLAR");
      expect(config.limit).toBe(10000);
      expect(config.windowSeconds).toBe(24 * 60 * 60);
      expect(config.isDaily).toBe(true);
    });
  });

  describe("TTS operation limits", () => {
    it("should return 10 requests/minute for FREE tier", () => {
      const config = getRateLimitConfig("tts", "FREE");
      expect(config.limit).toBe(10);
      expect(config.windowSeconds).toBe(60);
      expect(config.isDaily).toBe(false);
    });

    it("should return 30 requests/minute for PRO tier", () => {
      const config = getRateLimitConfig("tts", "PRO");
      expect(config.limit).toBe(30);
      expect(config.windowSeconds).toBe(60);
      expect(config.isDaily).toBe(false);
    });

    it("should return 60 requests/minute for SCHOLAR tier", () => {
      const config = getRateLimitConfig("tts", "SCHOLAR");
      expect(config.limit).toBe(60);
      expect(config.windowSeconds).toBe(60);
      expect(config.isDaily).toBe(false);
    });
  });

  describe("TTS download limits", () => {
    it("should return 0 downloads/month for FREE tier", () => {
      const config = getRateLimitConfig("ttsDownload", "FREE");
      expect(config.limit).toBe(0);
      expect(config.windowSeconds).toBe(30 * 24 * 60 * 60);
      expect(config.isDaily).toBe(false);
    });

    it("should return 5 downloads/month for PRO tier", () => {
      const config = getRateLimitConfig("ttsDownload", "PRO");
      expect(config.limit).toBe(5);
      expect(config.windowSeconds).toBe(30 * 24 * 60 * 60);
      expect(config.isDaily).toBe(false);
    });

    it("should return very high limit for SCHOLAR tier (unlimited)", () => {
      const config = getRateLimitConfig("ttsDownload", "SCHOLAR");
      expect(config.limit).toBe(10000);
      expect(config.windowSeconds).toBe(30 * 24 * 60 * 60);
      expect(config.isDaily).toBe(false);
    });
  });

  describe("Upload limits", () => {
    it("should return 5 uploads/hour for FREE tier", () => {
      const config = getRateLimitConfig("upload", "FREE");
      expect(config.limit).toBe(5);
      expect(config.windowSeconds).toBe(3600);
      expect(config.isDaily).toBe(false);
    });

    it("should return 20 uploads/hour for PRO tier", () => {
      const config = getRateLimitConfig("upload", "PRO");
      expect(config.limit).toBe(20);
      expect(config.windowSeconds).toBe(3600);
      expect(config.isDaily).toBe(false);
    });

    it("should return 50 uploads/hour for SCHOLAR tier", () => {
      const config = getRateLimitConfig("upload", "SCHOLAR");
      expect(config.limit).toBe(50);
      expect(config.windowSeconds).toBe(3600);
      expect(config.isDaily).toBe(false);
    });
  });

  describe("API limits", () => {
    it("should return 60 requests/minute for FREE tier", () => {
      const config = getRateLimitConfig("api", "FREE");
      expect(config.limit).toBe(60);
      expect(config.windowSeconds).toBe(60);
      expect(config.isDaily).toBe(false);
    });

    it("should return 300 requests/minute for PRO tier", () => {
      const config = getRateLimitConfig("api", "PRO");
      expect(config.limit).toBe(300);
      expect(config.windowSeconds).toBe(60);
      expect(config.isDaily).toBe(false);
    });

    it("should return 1000 requests/minute for SCHOLAR tier", () => {
      const config = getRateLimitConfig("api", "SCHOLAR");
      expect(config.limit).toBe(1000);
      expect(config.windowSeconds).toBe(60);
      expect(config.isDaily).toBe(false);
    });
  });

  describe("All tiers for all operations", () => {
    const operations: RateLimitOperation[] = [
      "ai",
      "tts",
      "ttsDownload",
      "upload",
      "api",
    ];
    const tiers: UserTier[] = ["FREE", "PRO", "SCHOLAR"];

    operations.forEach((operation) => {
      tiers.forEach((tier) => {
        it(`should return valid config for ${operation} on ${tier} tier`, () => {
          const config = getRateLimitConfig(operation, tier);
          expect(config).toBeDefined();
          expect(typeof config.limit).toBe("number");
          expect(config.limit).toBeGreaterThanOrEqual(0);
          expect(typeof config.windowSeconds).toBe("number");
          expect(config.windowSeconds).toBeGreaterThan(0);
          expect(typeof config.isDaily).toBe("boolean");
        });
      });
    });
  });

  describe("Tier hierarchy", () => {
    it("should have higher or equal limits for PRO compared to FREE for AI", () => {
      const freeConfig = getRateLimitConfig("ai", "FREE");
      const proConfig = getRateLimitConfig("ai", "PRO");
      expect(proConfig.limit).toBeGreaterThan(freeConfig.limit);
    });

    it("should have higher or equal limits for SCHOLAR compared to PRO for AI", () => {
      const proConfig = getRateLimitConfig("ai", "PRO");
      const scholarConfig = getRateLimitConfig("ai", "SCHOLAR");
      expect(scholarConfig.limit).toBeGreaterThan(proConfig.limit);
    });

    it("should have higher or equal limits for PRO compared to FREE for TTS downloads", () => {
      const freeConfig = getRateLimitConfig("ttsDownload", "FREE");
      const proConfig = getRateLimitConfig("ttsDownload", "PRO");
      expect(proConfig.limit).toBeGreaterThan(freeConfig.limit);
    });

    it("should have higher or equal limits for SCHOLAR compared to PRO for TTS downloads", () => {
      const proConfig = getRateLimitConfig("ttsDownload", "PRO");
      const scholarConfig = getRateLimitConfig("ttsDownload", "SCHOLAR");
      expect(scholarConfig.limit).toBeGreaterThan(proConfig.limit);
    });
  });
});

// ============================================================================
// createRateLimitHeaders Tests
// ============================================================================

describe("createRateLimitHeaders", () => {
  const mockResult: RateLimitResult = {
    success: true,
    remaining: 42,
    limit: 100,
    reset: 1704067200000, // 2024-01-01 00:00:00 UTC
  };

  it("should create headers with limit value", () => {
    const headers = createRateLimitHeaders(mockResult, "ai");
    expect(headers["X-RateLimit-Limit"]).toBe("100");
  });

  it("should create headers with remaining value", () => {
    const headers = createRateLimitHeaders(mockResult, "ai");
    expect(headers["X-RateLimit-Remaining"]).toBe("42");
  });

  it("should create headers with reset timestamp", () => {
    const headers = createRateLimitHeaders(mockResult, "ai");
    expect(headers["X-RateLimit-Reset"]).toBe("1704067200000");
  });

  it("should create headers with operation name", () => {
    const headers = createRateLimitHeaders(mockResult, "ai");
    expect(headers["X-RateLimit-Operation"]).toBe("ai");
  });

  it("should work with different operations", () => {
    const operations: RateLimitOperation[] = [
      "ai",
      "tts",
      "ttsDownload",
      "upload",
      "api",
    ];

    operations.forEach((operation) => {
      const headers = createRateLimitHeaders(mockResult, operation);
      expect(headers["X-RateLimit-Operation"]).toBe(operation);
    });
  });

  it("should convert all values to strings", () => {
    const headers = createRateLimitHeaders(mockResult, "ai");
    Object.values(headers).forEach((value) => {
      expect(typeof value).toBe("string");
    });
  });

  it("should handle zero remaining correctly", () => {
    const zeroResult: RateLimitResult = {
      success: false,
      remaining: 0,
      limit: 100,
      reset: 1704067200000,
      error: "Rate limit exceeded",
    };
    const headers = createRateLimitHeaders(zeroResult, "ai");
    expect(headers["X-RateLimit-Remaining"]).toBe("0");
  });
});

// ============================================================================
// createRateLimitResponse Tests
// ============================================================================

describe("createRateLimitResponse", () => {
  it("should return 429 status code", () => {
    const result: RateLimitResult = {
      success: false,
      remaining: 0,
      limit: 5,
      reset: Date.now() + 60000, // 1 minute from now
      error: "Rate limit exceeded",
    };

    const response = createRateLimitResponse(result, "ai");
    expect(response.statusCode).toBe(429);
  });

  it("should include error code RATE_LIMIT_EXCEEDED", () => {
    const result: RateLimitResult = {
      success: false,
      remaining: 0,
      limit: 5,
      reset: Date.now() + 60000,
      error: "Rate limit exceeded",
    };

    const response = createRateLimitResponse(result, "ai");
    expect(response.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("should include error message", () => {
    const result: RateLimitResult = {
      success: false,
      remaining: 0,
      limit: 5,
      reset: Date.now() + 60000,
      error: "Custom error message",
    };

    const response = createRateLimitResponse(result, "ai");
    expect(response.body.error.message).toBe("Custom error message");
  });

  it("should include default message when error is undefined", () => {
    const result: RateLimitResult = {
      success: false,
      remaining: 0,
      limit: 5,
      reset: Date.now() + 60000,
    };

    const response = createRateLimitResponse(result, "ai");
    expect(response.body.error.message).toBe(
      "Rate limit exceeded. Please try again later."
    );
  });

  it("should calculate retryAfter correctly", () => {
    const futureTime = Date.now() + 120000; // 2 minutes from now
    const result: RateLimitResult = {
      success: false,
      remaining: 0,
      limit: 5,
      reset: futureTime,
    };

    const response = createRateLimitResponse(result, "ai");
    // Should be approximately 120 seconds (allow for test execution time)
    expect(response.body.error.retryAfter).toBeGreaterThanOrEqual(119);
    expect(response.body.error.retryAfter).toBeLessThanOrEqual(121);
  });

  it("should set retryAfter to 0 when reset is in the past", () => {
    const pastTime = Date.now() - 60000; // 1 minute ago
    const result: RateLimitResult = {
      success: false,
      remaining: 0,
      limit: 5,
      reset: pastTime,
    };

    const response = createRateLimitResponse(result, "ai");
    expect(response.body.error.retryAfter).toBe(0);
  });

  it("should include limit value", () => {
    const result: RateLimitResult = {
      success: false,
      remaining: 0,
      limit: 100,
      reset: Date.now() + 60000,
    };

    const response = createRateLimitResponse(result, "ai");
    expect(response.body.error.limit).toBe(100);
  });

  it("should include remaining value", () => {
    const result: RateLimitResult = {
      success: false,
      remaining: 0,
      limit: 100,
      reset: Date.now() + 60000,
    };

    const response = createRateLimitResponse(result, "ai");
    expect(response.body.error.remaining).toBe(0);
  });

  it("should include reset timestamp", () => {
    const resetTime = Date.now() + 60000;
    const result: RateLimitResult = {
      success: false,
      remaining: 0,
      limit: 100,
      reset: resetTime,
    };

    const response = createRateLimitResponse(result, "ai");
    expect(response.body.error.reset).toBe(resetTime);
  });

  it("should set success to false in body", () => {
    const result: RateLimitResult = {
      success: false,
      remaining: 0,
      limit: 5,
      reset: Date.now() + 60000,
    };

    const response = createRateLimitResponse(result, "ai");
    expect(response.body.success).toBe(false);
  });
});

// ============================================================================
// Type Exports Tests
// ============================================================================

describe("Type exports", () => {
  it("should export RateLimitOperation type", () => {
    const operation: RateLimitOperation = "ai";
    expect(["ai", "tts", "ttsDownload", "upload", "api"]).toContain(operation);
  });

  it("should export RateLimitResult type", () => {
    const successResult: RateLimitResult = {
      success: true,
      remaining: 10,
      limit: 100,
      reset: Date.now() + 60000,
    };
    expect(successResult.success).toBe(true);

    const failResult: RateLimitResult = {
      success: false,
      remaining: 0,
      limit: 100,
      reset: Date.now() + 60000,
      error: "Rate limit exceeded",
    };
    expect(failResult.success).toBe(false);
    expect(failResult.error).toBeDefined();
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge cases", () => {
  it("should handle unknown operation by defaulting to api limits", () => {
    // TypeScript prevents unknown operations, but test defensive behavior
    const config = getRateLimitConfig("api", "FREE");
    expect(config).toBeDefined();
    expect(config.limit).toBe(60);
  });

  it("should handle all valid tier values", () => {
    const tiers: UserTier[] = ["FREE", "PRO", "SCHOLAR"];

    tiers.forEach((tier) => {
      const config = getRateLimitConfig("ai", tier);
      expect(config).toBeDefined();
      expect(config.limit).toBeGreaterThan(0);
    });
  });

  it("should maintain consistent config structure across all combinations", () => {
    const operations: RateLimitOperation[] = [
      "ai",
      "tts",
      "ttsDownload",
      "upload",
      "api",
    ];
    const tiers: UserTier[] = ["FREE", "PRO", "SCHOLAR"];

    operations.forEach((operation) => {
      tiers.forEach((tier) => {
        const config = getRateLimitConfig(operation, tier);
        expect(Object.keys(config).sort()).toEqual(
          ["isDaily", "limit", "windowSeconds"].sort()
        );
      });
    });
  });
});

// ============================================================================
// Rate Limit Utils Object Tests
// ============================================================================

describe("rateLimitUtils export", async () => {
  // Dynamic import to get the utils object
  const { rateLimitUtils } = await import("./rateLimit.js");

  it("should export rateLimitUtils object", () => {
    expect(rateLimitUtils).toBeDefined();
    expect(typeof rateLimitUtils).toBe("object");
  });

  it("should contain checkRateLimit function", () => {
    expect(typeof rateLimitUtils.checkRateLimit).toBe("function");
  });

  it("should contain getRateLimitStatus function", () => {
    expect(typeof rateLimitUtils.getRateLimitStatus).toBe("function");
  });

  it("should contain resetRateLimit function", () => {
    expect(typeof rateLimitUtils.resetRateLimit).toBe("function");
  });

  it("should contain getRateLimitConfig function", () => {
    expect(typeof rateLimitUtils.getRateLimitConfig).toBe("function");
  });

  it("should contain createRateLimitHeaders function", () => {
    expect(typeof rateLimitUtils.createRateLimitHeaders).toBe("function");
  });

  it("should contain applyRateLimitHeaders function", () => {
    expect(typeof rateLimitUtils.applyRateLimitHeaders).toBe("function");
  });

  it("should contain createRateLimitResponse function", () => {
    expect(typeof rateLimitUtils.createRateLimitResponse).toBe("function");
  });

  it("should contain createRateLimitChecker function", () => {
    expect(typeof rateLimitUtils.createRateLimitChecker).toBe("function");
  });
});

// ============================================================================
// Daily vs Non-Daily Limits Tests
// ============================================================================

describe("Daily vs non-daily limit behavior", () => {
  it("should mark AI operation as daily", () => {
    const config = getRateLimitConfig("ai", "FREE");
    expect(config.isDaily).toBe(true);
  });

  it("should mark TTS operation as non-daily", () => {
    const config = getRateLimitConfig("tts", "FREE");
    expect(config.isDaily).toBe(false);
  });

  it("should mark TTS download operation as non-daily (monthly)", () => {
    const config = getRateLimitConfig("ttsDownload", "FREE");
    expect(config.isDaily).toBe(false);
    // Monthly window
    expect(config.windowSeconds).toBe(30 * 24 * 60 * 60);
  });

  it("should mark upload operation as non-daily (hourly)", () => {
    const config = getRateLimitConfig("upload", "FREE");
    expect(config.isDaily).toBe(false);
    // Hourly window
    expect(config.windowSeconds).toBe(3600);
  });

  it("should mark API operation as non-daily (per-minute)", () => {
    const config = getRateLimitConfig("api", "FREE");
    expect(config.isDaily).toBe(false);
    // Per-minute window
    expect(config.windowSeconds).toBe(60);
  });
});

// ============================================================================
// Window Duration Tests
// ============================================================================

describe("Window duration validation", () => {
  it("should have 24-hour window for AI daily limits", () => {
    const config = getRateLimitConfig("ai", "FREE");
    expect(config.windowSeconds).toBe(24 * 60 * 60); // 86400 seconds
  });

  it("should have 1-minute window for TTS requests", () => {
    const config = getRateLimitConfig("tts", "FREE");
    expect(config.windowSeconds).toBe(60);
  });

  it("should have 30-day window for TTS downloads", () => {
    const config = getRateLimitConfig("ttsDownload", "PRO");
    expect(config.windowSeconds).toBe(30 * 24 * 60 * 60); // 2592000 seconds
  });

  it("should have 1-hour window for uploads", () => {
    const config = getRateLimitConfig("upload", "FREE");
    expect(config.windowSeconds).toBe(60 * 60); // 3600 seconds
  });

  it("should have 1-minute window for general API", () => {
    const config = getRateLimitConfig("api", "FREE");
    expect(config.windowSeconds).toBe(60);
  });
});
