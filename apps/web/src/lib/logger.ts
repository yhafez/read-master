/**
 * Frontend Logger
 *
 * Simple logging utility for frontend with level filtering
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const IS_DEVELOPMENT = import.meta.env.DEV;
const LOG_LEVEL: LogLevel = IS_DEVELOPMENT ? "debug" : "warn";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[LOG_LEVEL];
}

function formatMessage(level: LogLevel, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
}

export const logger = {
  debug: (message: string, data?: unknown) => {
    if (shouldLog("debug")) {
      // eslint-disable-next-line no-console
      console.debug(formatMessage("debug", message, data));
    }
  },

  info: (message: string, data?: unknown) => {
    if (shouldLog("info")) {
      // eslint-disable-next-line no-console
      console.info(formatMessage("info", message, data));
    }
  },

  warn: (message: string, data?: unknown) => {
    if (shouldLog("warn")) {
      // eslint-disable-next-line no-console
      console.warn(formatMessage("warn", message, data));
    }
  },

  error: (message: string, data?: unknown) => {
    if (shouldLog("error")) {
      // eslint-disable-next-line no-console
      console.error(formatMessage("error", message, data));
    }
  },
};
