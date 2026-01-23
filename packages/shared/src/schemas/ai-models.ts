/**
 * Zod schemas for AI Model selection and management
 *
 * These schemas validate AI model-related API requests for:
 * - Model selection and preferences
 * - Provider configuration
 * - Cost estimation and calculation
 * - Usage tracking
 *
 * Supported Providers:
 * - Anthropic (Claude models)
 * - OpenAI (GPT models)
 * - Google (Gemini models)
 * - Ollama (local/open-source models)
 *
 * @example
 * ```typescript
 * import { aiModelSchema, updateModelPreferencesSchema } from '@read-master/shared/schemas';
 *
 * // Validate model selection
 * const result = aiModelSchema.safeParse(requestBody);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.error.flatten() });
 * }
 * ```
 */

import { z } from "zod";

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Supported AI providers
 */
export const aiProviderSchema = z.enum([
  "anthropic", // Claude models
  "openai", // GPT models
  "google", // Gemini models
  "ollama", // Local/open-source models
]);
export type AIProvider = z.infer<typeof aiProviderSchema>;

/**
 * Anthropic Claude models
 */
export const claudeModelSchema = z.enum([
  // Claude 3.5 models
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-5-haiku-20241022",
  // Claude 3 models
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "claude-3-haiku-20240307",
]);
export type ClaudeModel = z.infer<typeof claudeModelSchema>;

/**
 * OpenAI GPT models
 */
export const openaiModelSchema = z.enum([
  "gpt-4-turbo",
  "gpt-4-turbo-preview",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4",
  "gpt-3.5-turbo",
]);
export type OpenAIModel = z.infer<typeof openaiModelSchema>;

/**
 * Google Gemini models
 */
export const geminiModelSchema = z.enum([
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-1.0-pro",
]);
export type GeminiModel = z.infer<typeof geminiModelSchema>;

/**
 * Model capability categories
 */
export const modelCapabilitySchema = z.enum([
  "general", // General purpose
  "analysis", // Deep analysis and reasoning
  "creative", // Creative writing
  "coding", // Code generation
  "fast", // Fast responses
  "efficient", // Cost-efficient
]);
export type ModelCapability = z.infer<typeof modelCapabilitySchema>;

/**
 * Model tier (affects availability based on user subscription)
 */
export const modelTierSchema = z.enum([
  "free", // Available to free users
  "pro", // Requires Pro subscription
  "scholar", // Requires Scholar subscription
]);
export type ModelTier = z.infer<typeof modelTierSchema>;

// =============================================================================
// PRICING SCHEMAS
// =============================================================================

/**
 * Model pricing structure (per 1M tokens in USD)
 */
export const modelPricingSchema = z.object({
  /** Input/prompt token cost per 1M tokens */
  input: z.number().nonnegative(),
  /** Output/completion token cost per 1M tokens */
  output: z.number().nonnegative(),
  /** Currency (defaults to USD) */
  currency: z.literal("USD").default("USD"),
});
export type ModelPricing = z.infer<typeof modelPricingSchema>;

// =============================================================================
// MODEL DEFINITION SCHEMAS
// =============================================================================

/**
 * AI model definition with all metadata
 */
export const aiModelDefinitionSchema = z.object({
  /** Unique model identifier (e.g., "claude-3-5-sonnet-20241022") */
  id: z.string().min(1),
  /** Display name (e.g., "Claude 3.5 Sonnet") */
  name: z.string().min(1).max(100),
  /** Provider name */
  provider: aiProviderSchema,
  /** Short description */
  description: z.string().max(500),
  /** Detailed description/capabilities */
  longDescription: z.string().max(2000).optional(),
  /** Pricing per 1M tokens */
  pricing: modelPricingSchema,
  /** Maximum context window in tokens */
  contextWindow: z.number().int().positive(),
  /** Maximum output tokens */
  maxOutputTokens: z.number().int().positive(),
  /** Model capabilities */
  capabilities: z.array(modelCapabilitySchema),
  /** Required subscription tier */
  tier: modelTierSchema,
  /** Whether model is currently available */
  available: z.boolean().default(true),
  /** Whether model is recommended */
  recommended: z.boolean().default(false),
  /** Release/update date */
  releaseDate: z.string().optional(),
  /** Deprecation date if scheduled */
  deprecationDate: z.string().optional(),
});
export type AIModelDefinition = z.infer<typeof aiModelDefinitionSchema>;

// =============================================================================
// USER PREFERENCE SCHEMAS
// =============================================================================

/**
 * User's AI model preferences
 */
export const aiModelPreferencesSchema = z.object({
  /** Preferred provider */
  provider: aiProviderSchema.default("anthropic"),
  /** Preferred model ID */
  modelId: z.string().min(1).default("claude-3-5-sonnet-20241022"),
  /** Whether to auto-select model based on task */
  autoSelect: z.boolean().default(false),
  /** Fallback model if preferred is unavailable */
  fallbackModelId: z.string().optional(),
  /** Maximum cost per request in USD (soft limit) */
  maxCostPerRequest: z.number().nonnegative().max(10).optional(),
  /** Whether to show cost warnings */
  showCostWarnings: z.boolean().default(true),
  /** Ollama server URL (for local models) */
  ollamaServerUrl: z.string().url().optional(),
  /** Custom API key for provider (encrypted) */
  customApiKey: z.string().max(500).optional(),
});
export type AIModelPreferences = z.infer<typeof aiModelPreferencesSchema>;

/**
 * Update AI model preferences
 */
export const updateModelPreferencesSchema = aiModelPreferencesSchema.partial();
export type UpdateModelPreferencesInput = z.infer<
  typeof updateModelPreferencesSchema
>;

// =============================================================================
// COST ESTIMATION SCHEMAS
// =============================================================================

/**
 * Cost estimation request
 */
export const costEstimationRequestSchema = z.object({
  /** Model ID to estimate for */
  modelId: z.string().min(1),
  /** Estimated input tokens */
  inputTokens: z.number().int().nonnegative(),
  /** Estimated output tokens */
  outputTokens: z.number().int().nonnegative(),
});
export type CostEstimationRequest = z.infer<typeof costEstimationRequestSchema>;

/**
 * Cost estimation response
 */
export const costEstimationResponseSchema = z.object({
  /** Model used for estimation */
  modelId: z.string(),
  /** Input token count */
  inputTokens: z.number(),
  /** Output token count */
  outputTokens: z.number(),
  /** Total tokens */
  totalTokens: z.number(),
  /** Cost breakdown */
  costs: z.object({
    /** Input cost in USD */
    inputCost: z.number(),
    /** Output cost in USD */
    outputCost: z.number(),
    /** Total cost in USD */
    totalCost: z.number(),
  }),
  /** Formatted cost string */
  formattedCost: z.string(),
});
export type CostEstimationResponse = z.infer<
  typeof costEstimationResponseSchema
>;

// =============================================================================
// MODEL COMPARISON SCHEMAS
// =============================================================================

/**
 * Model comparison request
 */
export const modelComparisonRequestSchema = z.object({
  /** Model IDs to compare */
  modelIds: z.array(z.string().min(1)).min(2).max(5),
  /** Comparison criteria */
  criteria: z
    .array(
      z.enum([
        "cost",
        "speed",
        "context",
        "capabilities",
        "quality",
        "availability",
      ])
    )
    .optional(),
});
export type ModelComparisonRequest = z.infer<
  typeof modelComparisonRequestSchema
>;

/**
 * Model comparison item
 */
export const modelComparisonItemSchema = z.object({
  modelId: z.string(),
  name: z.string(),
  provider: aiProviderSchema,
  pricing: modelPricingSchema,
  contextWindow: z.number(),
  maxOutputTokens: z.number(),
  capabilities: z.array(modelCapabilitySchema),
  tier: modelTierSchema,
  /** Cost score (lower is better, 1-10) */
  costScore: z.number().min(1).max(10),
  /** Speed score (higher is better, 1-10) */
  speedScore: z.number().min(1).max(10),
  /** Quality score (higher is better, 1-10) */
  qualityScore: z.number().min(1).max(10),
});
export type ModelComparisonItem = z.infer<typeof modelComparisonItemSchema>;

/**
 * Model comparison response
 */
export const modelComparisonResponseSchema = z.object({
  models: z.array(modelComparisonItemSchema),
  recommendation: z.object({
    bestOverall: z.string(),
    bestValue: z.string(),
    bestQuality: z.string(),
    bestSpeed: z.string(),
  }),
});
export type ModelComparisonResponse = z.infer<
  typeof modelComparisonResponseSchema
>;

// =============================================================================
// USAGE TRACKING SCHEMAS
// =============================================================================

/**
 * Model usage summary
 */
export const modelUsageSummarySchema = z.object({
  /** Model ID */
  modelId: z.string(),
  /** Provider */
  provider: aiProviderSchema,
  /** Period (day, week, month) */
  period: z.enum(["day", "week", "month"]),
  /** Total requests */
  totalRequests: z.number().int().nonnegative(),
  /** Total input tokens */
  totalInputTokens: z.number().int().nonnegative(),
  /** Total output tokens */
  totalOutputTokens: z.number().int().nonnegative(),
  /** Total cost in USD */
  totalCost: z.number().nonnegative(),
  /** Average response time in ms */
  avgResponseTimeMs: z.number().nonnegative(),
  /** Success rate (0-1) */
  successRate: z.number().min(0).max(1),
});
export type ModelUsageSummary = z.infer<typeof modelUsageSummarySchema>;

/**
 * User's model usage query
 */
export const modelUsageQuerySchema = z.object({
  /** Period to query */
  period: z.enum(["day", "week", "month", "all"]).default("month"),
  /** Group by model or provider */
  groupBy: z.enum(["model", "provider"]).default("model"),
  /** Include only specific providers */
  providers: z.array(aiProviderSchema).optional(),
});
export type ModelUsageQuery = z.infer<typeof modelUsageQuerySchema>;

// =============================================================================
// API SCHEMAS
// =============================================================================

/**
 * List available models request
 */
export const listModelsQuerySchema = z.object({
  /** Filter by provider */
  provider: aiProviderSchema.optional(),
  /** Filter by tier */
  tier: modelTierSchema.optional(),
  /** Filter by capability */
  capability: modelCapabilitySchema.optional(),
  /** Include unavailable models */
  includeUnavailable: z.coerce.boolean().default(false),
});
export type ListModelsQuery = z.infer<typeof listModelsQuerySchema>;

/**
 * Set active model request
 */
export const setActiveModelSchema = z.object({
  /** Model ID to set as active */
  modelId: z.string().min(1),
  /** Provider (for validation) */
  provider: aiProviderSchema.optional(),
});
export type SetActiveModelInput = z.infer<typeof setActiveModelSchema>;

/**
 * Test model connection request
 */
export const testModelConnectionSchema = z.object({
  /** Model ID to test */
  modelId: z.string().min(1),
  /** Provider */
  provider: aiProviderSchema,
  /** Custom API key (optional, for testing user's key) */
  apiKey: z.string().optional(),
  /** Ollama server URL (for local models) */
  ollamaUrl: z.string().url().optional(),
});
export type TestModelConnectionInput = z.infer<
  typeof testModelConnectionSchema
>;

/**
 * Test model connection response
 */
export const testModelConnectionResponseSchema = z.object({
  /** Whether connection was successful */
  success: z.boolean(),
  /** Response time in ms */
  responseTimeMs: z.number().optional(),
  /** Error message if failed */
  error: z.string().optional(),
  /** Model info if successful */
  modelInfo: z
    .object({
      name: z.string(),
      contextWindow: z.number().optional(),
      available: z.boolean(),
    })
    .optional(),
});
export type TestModelConnectionResponse = z.infer<
  typeof testModelConnectionResponseSchema
>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Available models response
 */
export const availableModelsResponseSchema = z.object({
  models: z.array(aiModelDefinitionSchema),
  defaultModelId: z.string(),
  userPreferences: aiModelPreferencesSchema.optional(),
});
export type AvailableModelsResponse = z.infer<
  typeof availableModelsResponseSchema
>;

/**
 * Model preferences response
 */
export const modelPreferencesResponseSchema = z.object({
  preferences: aiModelPreferencesSchema,
  activeModel: aiModelDefinitionSchema.optional(),
  usage: modelUsageSummarySchema.optional(),
});
export type ModelPreferencesResponse = z.infer<
  typeof modelPreferencesResponseSchema
>;

// =============================================================================
// SCHEMA COLLECTION
// =============================================================================

/**
 * All AI model-related schemas for convenient importing
 */
export const aiModelSchemas = {
  // Enums
  provider: aiProviderSchema,
  claudeModel: claudeModelSchema,
  openaiModel: openaiModelSchema,
  geminiModel: geminiModelSchema,
  capability: modelCapabilitySchema,
  tier: modelTierSchema,

  // Pricing
  pricing: modelPricingSchema,

  // Model definition
  definition: aiModelDefinitionSchema,

  // Preferences
  preferences: aiModelPreferencesSchema,
  updatePreferences: updateModelPreferencesSchema,

  // Cost estimation
  costEstimationRequest: costEstimationRequestSchema,
  costEstimationResponse: costEstimationResponseSchema,

  // Comparison
  comparisonRequest: modelComparisonRequestSchema,
  comparisonItem: modelComparisonItemSchema,
  comparisonResponse: modelComparisonResponseSchema,

  // Usage
  usageSummary: modelUsageSummarySchema,
  usageQuery: modelUsageQuerySchema,

  // API
  listModelsQuery: listModelsQuerySchema,
  setActiveModel: setActiveModelSchema,
  testConnection: testModelConnectionSchema,
  testConnectionResponse: testModelConnectionResponseSchema,

  // Responses
  availableModelsResponse: availableModelsResponseSchema,
  preferencesResponse: modelPreferencesResponseSchema,
} as const;
