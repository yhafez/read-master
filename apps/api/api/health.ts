import type { VercelRequest, VercelResponse } from "@vercel/node";

import { db } from "../src/services/db.js";
import { getRedisClient, isRedisAvailable } from "../src/services/redis.js";

/**
 * Health check result for a service
 */
type ServiceCheck = {
  status: "ok" | "error";
  latency?: number;
  error?: string;
};

/**
 * Complete health check response
 */
type HealthResponse = {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    api: ServiceCheck;
    database: ServiceCheck;
    redis: ServiceCheck;
  };
};

/**
 * Check database connection by executing a simple query
 */
async function checkDatabase(): Promise<ServiceCheck> {
  const start = Date.now();

  try {
    // Execute a simple query to verify database connectivity
    await db.$queryRaw`SELECT 1`;
    return {
      status: "ok",
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: "error",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

/**
 * Check Redis connection by executing a ping
 */
async function checkRedis(): Promise<ServiceCheck> {
  const start = Date.now();

  // First check if Redis is configured
  if (!isRedisAvailable()) {
    return {
      status: "ok",
      latency: 0,
      // Redis being unavailable is not an error if it's not configured
      // It just means caching is disabled
    };
  }

  try {
    const redis = getRedisClient();
    if (!redis) {
      return {
        status: "ok",
        latency: 0,
      };
    }

    // Execute a ping to verify Redis connectivity
    const response = await redis.ping();
    if (response === "PONG") {
      return {
        status: "ok",
        latency: Date.now() - start,
      };
    }

    return {
      status: "error",
      latency: Date.now() - start,
      error: `Unexpected ping response: ${response}`,
    };
  } catch (error) {
    return {
      status: "error",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown Redis error",
    };
  }
}

/**
 * Determine overall health status based on individual checks
 */
function determineOverallStatus(
  checks: HealthResponse["checks"]
): HealthResponse["status"] {
  const allOk = Object.values(checks).every((check) => check.status === "ok");
  if (allOk) {
    return "healthy";
  }

  // If database is down, system is unhealthy (critical service)
  if (checks.database.status === "error") {
    return "unhealthy";
  }

  // If only Redis is down, system is degraded (non-critical, caching disabled)
  if (checks.redis.status === "error") {
    return "degraded";
  }

  return "unhealthy";
}

/**
 * Health check endpoint for monitoring and deployment verification
 *
 * GET /api/health
 *
 * Returns:
 * - 200: Service is healthy or degraded (operating but with reduced functionality)
 * - 503: Service is unhealthy (critical service failure)
 *
 * Response body includes:
 * - status: "healthy" | "degraded" | "unhealthy"
 * - timestamp: ISO 8601 timestamp
 * - version: Application version
 * - environment: Current environment (development/production)
 * - checks: Individual service health checks with latency
 */
export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Run all health checks in parallel
  const [databaseCheck, redisCheck] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);

  const checks: HealthResponse["checks"] = {
    api: { status: "ok" },
    database: databaseCheck,
    redis: redisCheck,
  };

  const overallStatus = determineOverallStatus(checks);

  const healthResponse: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "1.0.0",
    environment: process.env.NODE_ENV ?? "development",
    checks,
  };

  // Return 503 if unhealthy, 200 otherwise (healthy or degraded)
  const statusCode = overallStatus === "unhealthy" ? 503 : 200;

  res.status(statusCode).json(healthResponse);
}
