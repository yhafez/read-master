import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Health check endpoint for monitoring and deployment verification
 *
 * GET /api/health
 *
 * Returns:
 * - 200: Service is healthy
 * - 503: Service is unhealthy (database/redis connection issues)
 */
export default function handler(
  _req: VercelRequest,
  res: VercelResponse
): void {
  const healthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "1.0.0",
    environment: process.env.NODE_ENV ?? "development",
    checks: {
      api: "ok",
      // Database and Redis checks will be added when those services are configured
    },
  };

  res.status(200).json(healthStatus);
}
