import type { VercelRequest, VercelResponse } from "@vercel/node";
import winston from "winston";

/**
 * Winston Logging Middleware
 *
 * Provides structured logging for the API with:
 * - Environment-appropriate transports (JSON in production, colorized in dev)
 * - Request/response logging middleware
 * - Contextual logging with userId, requestId, timestamp
 * - Different log levels for different environments
 * - Helper functions for common logging patterns
 */

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// ============================================================================
// Types
// ============================================================================

/**
 * Log levels in order of severity (most to least severe)
 */
export type LogLevel = "error" | "warn" | "info" | "http" | "debug";

/**
 * Request context for logging
 */
export interface RequestContext {
  requestId?: string | undefined;
  userId?: string | undefined;
  method?: string | undefined;
  path?: string | undefined;
  userAgent?: string | undefined;
  ip?: string | undefined;
  sessionId?: string | undefined;
}

/**
 * Request with logging context attached
 */
export interface RequestWithLogger extends VercelRequest {
  logger?: Logger;
  requestId?: string;
}

/**
 * AI usage logging data
 */
export interface AIUsageLogData {
  operation: string;
  model?: string;
  provider?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens: number;
  cost?: number;
  durationMs?: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  bookId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Performance metric logging data
 */
export interface PerformanceLogData {
  operation: string;
  durationMs: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Audit event logging data
 */
export interface AuditLogData {
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get log level from environment
 */
function getLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  const validLevels: LogLevel[] = ["error", "warn", "info", "http", "debug"];
  if (envLevel && validLevels.includes(envLevel as LogLevel)) {
    return envLevel as LogLevel;
  }
  // Default: info in production, debug in development
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

/**
 * Check if we're in production environment
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

// ============================================================================
// Formats
// ============================================================================

/**
 * Custom format for development - human readable with colors
 */
const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const contextStr = formatContext(meta);
  return `${timestamp} [${level}]: ${message}${contextStr}`;
});

/**
 * Format context object for dev output
 */
function formatContext(meta: Record<string, unknown>): string {
  // Remove Winston internal properties
  const {
    service: _service,
    splat: _splat,
    ...rest
  } = meta as Record<string, unknown> & {
    service?: string;
    splat?: unknown;
  };

  if (Object.keys(rest).length === 0) {
    return "";
  }

  // Format specific fields specially
  const { error, ...otherMeta } = rest as Record<string, unknown> & {
    error?: { message?: string; stack?: string };
  };

  let result = "";

  if (Object.keys(otherMeta).length > 0) {
    result = ` ${JSON.stringify(otherMeta)}`;
  }

  if (error) {
    result += `\n  Error: ${error.message}`;
    if (error.stack) {
      // Only show first 3 lines of stack in dev format
      const stackLines = error.stack.split("\n").slice(0, 3);
      result += `\n  ${stackLines.join("\n  ")}`;
    }
  }

  return result;
}

// ============================================================================
// Logger Instance
// ============================================================================

/**
 * Winston logger instance configured for the API
 */
const baseLogger = winston.createLogger({
  level: getLogLevel(),
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    errors({ stack: true })
  ),
  defaultMeta: { service: "read-master-api" },
  transports: [
    new winston.transports.Console({
      format: isProduction()
        ? combine(timestamp(), json())
        : combine(
            colorize({ all: true }),
            timestamp({ format: "HH:mm:ss.SSS" }),
            devFormat
          ),
    }),
  ],
});

// Add custom colors for log levels
winston.addColors({
  error: "red bold",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "cyan",
});

// ============================================================================
// Logger Class
// ============================================================================

/**
 * Logger class with request context
 */
export class Logger {
  private context: RequestContext;

  constructor(context: RequestContext = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Partial<RequestContext>): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Log at error level
   */
  error(message: string, meta?: Record<string, unknown>): void {
    baseLogger.error(message, { ...this.context, ...meta });
  }

  /**
   * Log at warn level
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    baseLogger.warn(message, { ...this.context, ...meta });
  }

  /**
   * Log at info level
   */
  info(message: string, meta?: Record<string, unknown>): void {
    baseLogger.info(message, { ...this.context, ...meta });
  }

  /**
   * Log at http level (for request/response logging)
   */
  http(message: string, meta?: Record<string, unknown>): void {
    baseLogger.log("http", message, { ...this.context, ...meta });
  }

  /**
   * Log at debug level
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    baseLogger.debug(message, { ...this.context, ...meta });
  }

  /**
   * Log an error with full details
   */
  logError(
    message: string,
    error: unknown,
    additionalMeta?: Record<string, unknown>
  ): void {
    const errorDetails =
      error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : { message: String(error) };

    this.error(message, {
      error: errorDetails,
      ...additionalMeta,
    });
  }

  /**
   * Get the current context
   */
  getContext(): RequestContext {
    return { ...this.context };
  }
}

// ============================================================================
// Global Logger Instance
// ============================================================================

/**
 * Global logger for use outside of request context
 */
export const logger = new Logger({
  service: "read-master-api",
} as unknown as RequestContext);

// ============================================================================
// Request ID Generation
// ============================================================================

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `req_${timestamp}_${random}`;
}

// ============================================================================
// Context Extraction
// ============================================================================

/**
 * Extract context from a Vercel request
 */
export function extractRequestContext(req: VercelRequest): RequestContext {
  const requestId =
    (req as RequestWithLogger).requestId ??
    (req.headers["x-request-id"] as string) ??
    generateRequestId();

  return {
    requestId,
    method: req.method,
    path: req.url ?? "",
    userAgent: req.headers["user-agent"] as string | undefined,
    ip:
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
      (req.headers["x-real-ip"] as string) ??
      undefined,
  };
}

/**
 * Create a logger with request context
 */
export function createRequestLogger(req: VercelRequest): Logger {
  const context = extractRequestContext(req);
  return new Logger(context);
}

// ============================================================================
// Logging Helper Functions
// ============================================================================

/**
 * Log an API request
 */
export function logRequest(
  method: string,
  path: string,
  context?: Partial<RequestContext>
): void {
  const requestLogger = new Logger(context);
  requestLogger.http("API Request", { method, path });
}

/**
 * Log an API response
 */
export function logResponse(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  context?: Partial<RequestContext>
): void {
  const requestLogger = new Logger(context);
  const level =
    statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "http";

  requestLogger[level]("API Response", {
    method,
    path,
    statusCode,
    durationMs,
  });
}

/**
 * Log an error with context
 */
export function logError(
  message: string,
  error: unknown,
  context?: Partial<RequestContext> & Record<string, unknown>
): void {
  const requestLogger = new Logger(context);
  requestLogger.logError(message, error);
}

/**
 * Log AI usage for cost tracking
 */
export function logAIUsage(
  data: AIUsageLogData & Partial<RequestContext>
): void {
  const { requestId, userId, ...rest } = data;
  const requestLogger = new Logger({ requestId, userId });

  requestLogger.info("AI Usage", {
    ...rest,
    type: "ai_usage",
  });
}

/**
 * Log a performance metric
 */
export function logPerformance(
  data: PerformanceLogData & Partial<RequestContext>
): void {
  const { requestId, userId, ...rest } = data;
  const requestLogger = new Logger({ requestId, userId });

  requestLogger.info("Performance", {
    ...rest,
    type: "performance",
  });
}

/**
 * Log an audit event
 */
export function logAudit(data: AuditLogData & Partial<RequestContext>): void {
  const { requestId, userId, ...rest } = data;
  const requestLogger = new Logger({ requestId, userId });

  requestLogger.info("Audit", {
    ...rest,
    type: "audit",
  });
}

/**
 * Log a security event
 */
export function logSecurity(
  event: string,
  details: Record<string, unknown> & Partial<RequestContext>
): void {
  const { requestId, userId, ...rest } = details;
  const requestLogger = new Logger({ requestId, userId });

  requestLogger.warn("Security Event", {
    event,
    ...rest,
    type: "security",
  });
}

// ============================================================================
// Request Logging Middleware
// ============================================================================

/**
 * Handler type for Vercel functions
 */
type VercelHandler = (
  req: VercelRequest,
  res: VercelResponse
) => Promise<VercelResponse | void> | VercelResponse | void;

/**
 * Higher-order function to add request logging
 */
export function withRequestLogging<T extends VercelHandler>(handler: T): T {
  return (async (req: VercelRequest, res: VercelResponse) => {
    const startTime = Date.now();
    const requestId = generateRequestId();

    // Attach requestId and logger to request
    const reqWithLogger = req as RequestWithLogger;
    reqWithLogger.requestId = requestId;
    reqWithLogger.logger = createRequestLogger(req);

    // Add request ID to response headers
    res.setHeader("X-Request-ID", requestId);

    // Log incoming request
    const context = extractRequestContext(req);
    const requestLogger = new Logger(context);
    requestLogger.http("Request started", {
      method: req.method,
      path: req.url,
      query: Object.keys(req.query ?? {}).length > 0 ? req.query : undefined,
    });

    // Track original end function
    const originalEnd = res.end.bind(res);
    let responseLogged = false;

    // Override end to log response
    res.end = function (...args: Parameters<typeof res.end>) {
      if (!responseLogged) {
        responseLogged = true;
        const durationMs = Date.now() - startTime;
        const statusCode = res.statusCode;

        const level =
          statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "http";
        requestLogger[level]("Request completed", {
          method: req.method,
          path: req.url,
          statusCode,
          durationMs,
        });
      }

      return originalEnd(...args);
    } as typeof res.end;

    try {
      return await handler(reqWithLogger as VercelRequest, res);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      requestLogger.logError("Request failed", error, {
        method: req.method,
        path: req.url,
        durationMs,
      });
      throw error;
    }
  }) as T;
}

// ============================================================================
// Utilities Export Object
// ============================================================================

/**
 * All logger utilities bundled for convenient importing
 */
export const loggerUtils = {
  // Logger class
  Logger,
  logger,

  // Request utilities
  generateRequestId,
  extractRequestContext,
  createRequestLogger,

  // Logging functions
  logRequest,
  logResponse,
  logError,
  logAIUsage,
  logPerformance,
  logAudit,
  logSecurity,

  // Middleware
  withRequestLogging,
};

// ============================================================================
// Base Logger Export (for direct Winston access)
// ============================================================================

export { baseLogger };
