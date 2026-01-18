import { z } from "zod";

/**
 * Environment variable schemas for Read Master
 * These schemas validate and type environment variables at runtime
 */

/**
 * Base environment schema - shared across all environments
 */
export const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

/**
 * Database environment schema
 */
export const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url().describe("PostgreSQL connection string"),
  DIRECT_DATABASE_URL: z
    .string()
    .url()
    .optional()
    .describe("Direct PostgreSQL connection (for migrations)"),
});

/**
 * Redis cache environment schema
 */
export const redisEnvSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().url().describe("Upstash Redis REST URL"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).describe("Upstash Redis token"),
});

/**
 * Clerk authentication environment schema (server-side)
 */
export const clerkServerEnvSchema = z.object({
  CLERK_SECRET_KEY: z
    .string()
    .startsWith("sk_")
    .describe("Clerk secret key (backend only)"),
});

/**
 * Clerk authentication environment schema (client-side)
 */
export const clerkClientEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .startsWith("pk_")
    .describe("Clerk publishable key"),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/"),
});

/**
 * Anthropic Claude AI environment schema
 */
export const anthropicEnvSchema = z.object({
  ANTHROPIC_API_KEY: z
    .string()
    .startsWith("sk-ant-")
    .describe("Anthropic API key"),
  ANTHROPIC_MODEL: z.string().default("claude-3-5-sonnet-20241022"),
});

/**
 * OpenAI environment schema (optional - for TTS)
 */
export const openaiEnvSchema = z.object({
  OPENAI_API_KEY: z
    .string()
    .startsWith("sk-")
    .optional()
    .describe("OpenAI API key"),
});

/**
 * ElevenLabs environment schema (optional - for premium TTS)
 */
export const elevenlabsEnvSchema = z.object({
  ELEVENLABS_API_KEY: z.string().optional().describe("ElevenLabs API key"),
});

/**
 * Cloudflare R2 storage environment schema
 */
export const r2EnvSchema = z.object({
  R2_BUCKET_NAME: z.string().min(1).describe("R2 bucket name"),
  R2_ACCOUNT_ID: z.string().min(1).describe("Cloudflare account ID"),
  R2_ACCESS_KEY_ID: z.string().min(1).describe("R2 access key ID"),
  R2_SECRET_ACCESS_KEY: z.string().min(1).describe("R2 secret access key"),
  R2_PUBLIC_URL: z.string().url().optional().describe("R2 public bucket URL"),
});

/**
 * External APIs environment schema
 */
export const externalApisEnvSchema = z.object({
  GOOGLE_BOOKS_API_KEY: z.string().optional().describe("Google Books API key"),
});

/**
 * Rate limiting environment schema
 */
export const rateLimitEnvSchema = z.object({
  AI_RATE_LIMIT_FREE: z.coerce.number().positive().default(100),
  AI_RATE_LIMIT_PRO: z.coerce.number().positive().default(500),
  AI_RATE_LIMIT_SCHOLAR: z.coerce.number().positive().default(2000),
  MAX_UPLOAD_SIZE: z.coerce.number().positive().default(52428800), // 50MB
});

/**
 * Feature flags environment schema
 */
export const featureFlagsEnvSchema = z.object({
  ENABLE_AI_FEATURES: z.coerce.boolean().default(true),
  ENABLE_TTS: z.coerce.boolean().default(true),
  ENABLE_BETA_FEATURES: z.coerce.boolean().default(false),
});

/**
 * Monitoring environment schema
 */
export const monitoringEnvSchema = z.object({
  SENTRY_DSN: z
    .string()
    .url()
    .optional()
    .describe("Sentry DSN for error tracking"),
});

/**
 * App URLs environment schema
 */
export const appUrlsEnvSchema = z.object({
  APP_URL: z.string().url().default("http://localhost:3000"),
  API_URL: z.string().url().default("http://localhost:3001"),
});

/**
 * Complete server environment schema
 * Used by apps/api and server-side code
 */
export const serverEnvSchema = baseEnvSchema
  .merge(appUrlsEnvSchema)
  .merge(databaseEnvSchema)
  .merge(redisEnvSchema)
  .merge(clerkServerEnvSchema)
  .merge(anthropicEnvSchema)
  .merge(openaiEnvSchema)
  .merge(elevenlabsEnvSchema)
  .merge(r2EnvSchema)
  .merge(externalApisEnvSchema)
  .merge(rateLimitEnvSchema)
  .merge(featureFlagsEnvSchema)
  .merge(monitoringEnvSchema);

/**
 * Client environment schema
 * Used by apps/web client-side code
 * Only includes NEXT_PUBLIC_* variables that are safe to expose
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .startsWith("pk_")
    .describe("Clerk publishable key"),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
});

/**
 * Type exports for use in application code
 */
export type BaseEnv = z.infer<typeof baseEnvSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type RedisEnv = z.infer<typeof redisEnvSchema>;
export type ClerkServerEnv = z.infer<typeof clerkServerEnvSchema>;
export type ClerkClientEnv = z.infer<typeof clerkClientEnvSchema>;
export type AnthropicEnv = z.infer<typeof anthropicEnvSchema>;
export type OpenAIEnv = z.infer<typeof openaiEnvSchema>;
export type ElevenLabsEnv = z.infer<typeof elevenlabsEnvSchema>;
export type R2Env = z.infer<typeof r2EnvSchema>;
export type ExternalApisEnv = z.infer<typeof externalApisEnvSchema>;
export type RateLimitEnv = z.infer<typeof rateLimitEnvSchema>;
export type FeatureFlagsEnv = z.infer<typeof featureFlagsEnvSchema>;
export type MonitoringEnv = z.infer<typeof monitoringEnvSchema>;
export type AppUrlsEnv = z.infer<typeof appUrlsEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
