import winston from "winston";

/**
 * Structured logger for API requests and operations
 *
 * Uses Winston for consistent, structured logging across the API.
 * In production, logs are formatted as JSON for easy parsing.
 * In development, logs are human-readable with colorization.
 */

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

// Create logger with environment-appropriate settings
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), json()),
  defaultMeta: { service: "read-master-api" },
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === "production"
          ? combine(timestamp(), json())
          : combine(colorize(), timestamp({ format: "HH:mm:ss" }), devFormat),
    }),
  ],
});

/**
 * Log an API request with context
 */
export function logRequest(
  method: string,
  path: string,
  userId?: string,
  requestId?: string
): void {
  logger.info("API Request", {
    method,
    path,
    userId,
    requestId,
  });
}

/**
 * Log an error with context
 */
export function logError(
  message: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const errorDetails =
    error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: String(error) };

  logger.error(message, {
    error: errorDetails,
    ...context,
  });
}

/**
 * Log AI usage for cost tracking
 */
export function logAIUsage(
  operation: string,
  tokens: number,
  cost: number,
  userId: string,
  duration?: number
): void {
  logger.info("AI Usage", {
    operation,
    tokens,
    cost,
    userId,
    duration,
  });
}

export { logger };
