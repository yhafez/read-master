/**
 * React Query hooks for AI Model management
 *
 * Provides hooks for:
 * - Listing available AI models
 * - Managing model preferences
 * - Cost estimation and calculation
 * - Model comparison
 * - Usage tracking
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryClient";

// =============================================================================
// Types
// =============================================================================

/**
 * AI provider type
 */
export type AIProvider = "anthropic" | "openai" | "google" | "ollama";

/**
 * Model capability type
 */
export type ModelCapability =
  | "general"
  | "analysis"
  | "creative"
  | "coding"
  | "fast"
  | "efficient";

/**
 * Model tier type
 */
export type ModelTier = "free" | "pro" | "scholar";

/**
 * Model pricing structure
 */
export interface ModelPricing {
  input: number;
  output: number;
  currency: "USD";
}

/**
 * AI model definition
 */
export interface AIModelDefinition {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  longDescription?: string;
  pricing: ModelPricing;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelCapability[];
  tier: ModelTier;
  available: boolean;
  recommended: boolean;
  releaseDate?: string;
  deprecationDate?: string;
}

/**
 * AI model preferences
 */
export interface AIModelPreferences {
  provider: AIProvider;
  modelId: string;
  autoSelect: boolean;
  fallbackModelId?: string;
  maxCostPerRequest?: number;
  showCostWarnings: boolean;
  ollamaServerUrl?: string;
  customApiKey?: string;
}

/**
 * Cost estimation response
 */
export interface CostEstimation {
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costs: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
  formattedCost: string;
}

/**
 * Model comparison item
 */
export interface ModelComparisonItem {
  modelId: string;
  name: string;
  provider: AIProvider;
  pricing: ModelPricing;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelCapability[];
  tier: ModelTier;
  costScore: number;
  speedScore: number;
  qualityScore: number;
}

/**
 * Model comparison response
 */
export interface ModelComparisonResponse {
  models: ModelComparisonItem[];
  recommendation: {
    bestOverall: string;
    bestValue: string;
    bestQuality: string;
    bestSpeed: string;
  };
}

/**
 * Model usage summary
 */
export interface ModelUsageSummary {
  modelId: string;
  provider: AIProvider;
  period: "day" | "week" | "month";
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  avgResponseTimeMs: number;
  successRate: number;
}

/**
 * Test model connection response
 */
export interface TestModelConnectionResponse {
  success: boolean;
  responseTimeMs?: number;
  error?: string;
  modelInfo?: {
    name: string;
    contextWindow?: number;
    available: boolean;
  };
}

/**
 * List models query params
 */
export interface ListModelsParams {
  provider?: AIProvider;
  tier?: ModelTier;
  capability?: ModelCapability;
  includeUnavailable?: boolean;
}

/**
 * Model usage query params
 */
export interface ModelUsageQueryParams {
  period?: "day" | "week" | "month" | "all";
  groupBy?: "model" | "provider";
  providers?: AIProvider[];
}

// =============================================================================
// Static Model Data (client-side catalog)
// =============================================================================

/**
 * Available AI models catalog
 * This data is used client-side for model selection UI
 * Server validates model availability and user permissions
 */
export const AI_MODELS_CATALOG: AIModelDefinition[] = [
  // Anthropic Claude Models
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    description: "Best balance of speed and intelligence for most tasks",
    longDescription:
      "Claude 3.5 Sonnet delivers excellent performance across analysis, coding, and creative tasks with fast response times.",
    pricing: { input: 3.0, output: 15.0, currency: "USD" },
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: ["general", "analysis", "creative", "coding"],
    tier: "free",
    available: true,
    recommended: true,
    releaseDate: "2024-10-22",
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    description: "Fast and cost-efficient for simpler tasks",
    longDescription:
      "Claude 3.5 Haiku offers quick responses at a lower cost, ideal for straightforward tasks like explanations and summaries.",
    pricing: { input: 0.8, output: 4.0, currency: "USD" },
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: ["general", "fast", "efficient"],
    tier: "free",
    available: true,
    recommended: false,
    releaseDate: "2024-10-22",
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    provider: "anthropic",
    description: "Most capable model for complex reasoning",
    longDescription:
      "Claude 3 Opus excels at highly complex analysis, research, and nuanced tasks requiring deep reasoning.",
    pricing: { input: 15.0, output: 75.0, currency: "USD" },
    contextWindow: 200000,
    maxOutputTokens: 4096,
    capabilities: ["general", "analysis", "creative", "coding"],
    tier: "scholar",
    available: true,
    recommended: false,
    releaseDate: "2024-02-29",
  },
  {
    id: "claude-3-sonnet-20240229",
    name: "Claude 3 Sonnet",
    provider: "anthropic",
    description: "Balanced performance and cost",
    longDescription:
      "Claude 3 Sonnet provides strong performance for everyday tasks with reasonable costs.",
    pricing: { input: 3.0, output: 15.0, currency: "USD" },
    contextWindow: 200000,
    maxOutputTokens: 4096,
    capabilities: ["general", "analysis", "creative"],
    tier: "pro",
    available: true,
    recommended: false,
    releaseDate: "2024-02-29",
  },
  {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    provider: "anthropic",
    description: "Fastest and most affordable Claude model",
    longDescription:
      "Claude 3 Haiku is extremely fast and cost-effective for high-volume simple tasks.",
    pricing: { input: 0.25, output: 1.25, currency: "USD" },
    contextWindow: 200000,
    maxOutputTokens: 4096,
    capabilities: ["general", "fast", "efficient"],
    tier: "free",
    available: true,
    recommended: false,
    releaseDate: "2024-03-07",
  },
  // OpenAI GPT Models
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    description: "OpenAI's flagship multimodal model",
    longDescription:
      "GPT-4o combines text and vision capabilities with fast performance.",
    pricing: { input: 2.5, output: 10.0, currency: "USD" },
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: ["general", "analysis", "creative", "coding"],
    tier: "pro",
    available: true,
    recommended: false,
    releaseDate: "2024-05-13",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    description: "Fast and affordable GPT-4 variant",
    longDescription:
      "GPT-4o Mini provides good performance at a fraction of the cost.",
    pricing: { input: 0.15, output: 0.6, currency: "USD" },
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: ["general", "fast", "efficient"],
    tier: "free",
    available: true,
    recommended: false,
    releaseDate: "2024-07-18",
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    description: "High capability with improved speed",
    longDescription:
      "GPT-4 Turbo offers enhanced performance with a large context window.",
    pricing: { input: 10.0, output: 30.0, currency: "USD" },
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: ["general", "analysis", "creative", "coding"],
    tier: "scholar",
    available: true,
    recommended: false,
    releaseDate: "2024-04-09",
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    description: "Fast and cost-effective for simpler tasks",
    longDescription:
      "GPT-3.5 Turbo is ideal for straightforward tasks requiring quick responses.",
    pricing: { input: 0.5, output: 1.5, currency: "USD" },
    contextWindow: 16385,
    maxOutputTokens: 4096,
    capabilities: ["general", "fast", "efficient"],
    tier: "free",
    available: true,
    recommended: false,
    releaseDate: "2023-11-06",
  },
  // Google Gemini Models
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "google",
    description: "Google's most capable model with huge context",
    longDescription:
      "Gemini 1.5 Pro offers exceptional context length and strong reasoning.",
    pricing: { input: 3.5, output: 10.5, currency: "USD" },
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    capabilities: ["general", "analysis", "creative", "coding"],
    tier: "pro",
    available: true,
    recommended: false,
    releaseDate: "2024-02-15",
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "google",
    description: "Fast and efficient multimodal model",
    longDescription:
      "Gemini 1.5 Flash provides quick responses for everyday tasks.",
    pricing: { input: 0.075, output: 0.3, currency: "USD" },
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    capabilities: ["general", "fast", "efficient"],
    tier: "free",
    available: true,
    recommended: false,
    releaseDate: "2024-05-14",
  },
];

/**
 * Get model by ID from catalog
 */
export function getModelById(modelId: string): AIModelDefinition | undefined {
  return AI_MODELS_CATALOG.find((m) => m.id === modelId);
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: AIProvider): AIModelDefinition[] {
  return AI_MODELS_CATALOG.filter((m) => m.provider === provider);
}

/**
 * Get models available for a tier
 */
export function getModelsForTier(tier: ModelTier): AIModelDefinition[] {
  const tierOrder = { free: 0, pro: 1, scholar: 2 };
  const userTierLevel = tierOrder[tier];
  return AI_MODELS_CATALOG.filter(
    (m) => tierOrder[m.tier] <= userTierLevel && m.available
  );
}

/**
 * Calculate cost for token usage
 */
export function calculateModelCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): CostEstimation {
  const model = getModelById(modelId);
  const pricing = model?.pricing ?? {
    input: 3.0,
    output: 15.0,
    currency: "USD" as const,
  };

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    modelId,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    costs: {
      inputCost,
      outputCost,
      totalCost,
    },
    formattedCost:
      totalCost < 0.01
        ? `< $0.01`
        : `$${totalCost.toFixed(totalCost < 1 ? 4 : 2)}`,
  };
}

/**
 * Format cost as currency string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) return "< $0.01";
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Estimate tokens for text (rough approximation)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to get list of available AI models
 */
export function useAIModels(
  params?: ListModelsParams,
  options?: Omit<
    UseQueryOptions<AIModelDefinition[], Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.ai.modelsList(
      params as Record<string, unknown> | undefined
    ),
    queryFn: async (): Promise<AIModelDefinition[]> => {
      // Client-side filtering from catalog
      // In production, this would fetch from API which validates availability
      let models = [...AI_MODELS_CATALOG];

      if (params?.provider) {
        models = models.filter((m) => m.provider === params.provider);
      }
      if (params?.tier) {
        const tierOrder = { free: 0, pro: 1, scholar: 2 };
        const userTierLevel = tierOrder[params.tier];
        models = models.filter((m) => tierOrder[m.tier] <= userTierLevel);
      }
      if (params?.capability) {
        const capability = params.capability;
        models = models.filter((m) => m.capabilities.includes(capability));
      }
      if (!params?.includeUnavailable) {
        models = models.filter((m) => m.available);
      }

      return models;
    },
    staleTime: 1000 * 60 * 60, // 1 hour - model catalog changes infrequently
    ...options,
  });
}

/**
 * Hook to get a single AI model by ID
 */
export function useAIModel(
  modelId: string,
  options?: Omit<
    UseQueryOptions<AIModelDefinition | null, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.ai.modelDetail(modelId),
    queryFn: async (): Promise<AIModelDefinition | null> => {
      return getModelById(modelId) ?? null;
    },
    enabled: !!modelId,
    staleTime: 1000 * 60 * 60, // 1 hour
    ...options,
  });
}

/**
 * Hook to get user's AI model preferences
 */
export function useAIModelPreferences(
  options?: Omit<
    UseQueryOptions<AIModelPreferences, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.ai.preferences(),
    queryFn: async (): Promise<AIModelPreferences> => {
      // TODO: Fetch from API in production
      // For now, return defaults (would be stored in user preferences)
      const stored = localStorage.getItem("ai-model-preferences");
      if (stored) {
        try {
          return JSON.parse(stored) as AIModelPreferences;
        } catch {
          // Fall through to defaults
        }
      }
      return {
        provider: "anthropic",
        modelId: "claude-3-5-sonnet-20241022",
        autoSelect: false,
        showCostWarnings: true,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Hook to get cost estimation
 */
export function useCostEstimation(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  options?: Omit<UseQueryOptions<CostEstimation, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.ai.costEstimate({ modelId, inputTokens, outputTokens }),
    queryFn: async (): Promise<CostEstimation> => {
      return calculateModelCost(modelId, inputTokens, outputTokens);
    },
    enabled: !!modelId && inputTokens >= 0 && outputTokens >= 0,
    staleTime: Infinity, // Pure calculation, never stale
    ...options,
  });
}

/**
 * Hook to get model comparison
 */
export function useModelComparison(
  modelIds: string[],
  options?: Omit<
    UseQueryOptions<ModelComparisonResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.ai.comparison(modelIds),
    queryFn: async (): Promise<ModelComparisonResponse> => {
      const models = modelIds
        .map((id) => getModelById(id))
        .filter((m): m is AIModelDefinition => m !== undefined);

      // Calculate scores based on pricing and capabilities
      const items: ModelComparisonItem[] = models.map((model) => {
        // Cost score: lower cost = higher score (1-10)
        const avgCost = (model.pricing.input + model.pricing.output) / 2;
        const costScore = Math.max(
          1,
          Math.min(10, 11 - Math.log2(avgCost + 1))
        );

        // Speed score based on capabilities
        const speedScore = model.capabilities.includes("fast")
          ? 9
          : model.capabilities.includes("efficient")
            ? 7
            : 5;

        // Quality score based on tier and capabilities
        const qualityScore =
          model.tier === "scholar"
            ? 10
            : model.tier === "pro"
              ? 8
              : model.capabilities.includes("analysis")
                ? 7
                : 6;

        return {
          modelId: model.id,
          name: model.name,
          provider: model.provider,
          pricing: model.pricing,
          contextWindow: model.contextWindow,
          maxOutputTokens: model.maxOutputTokens,
          capabilities: model.capabilities,
          tier: model.tier,
          costScore: Math.round(costScore * 10) / 10,
          speedScore,
          qualityScore,
        };
      });

      // Find best in each category
      const defaultModel = modelIds[0] ?? "";
      const bestOverall =
        [...items].sort(
          (a, b) =>
            b.costScore +
            b.speedScore +
            b.qualityScore -
            (a.costScore + a.speedScore + a.qualityScore)
        )[0]?.modelId ?? defaultModel;
      const bestValue =
        [...items].sort((a, b) => b.costScore - a.costScore)[0]?.modelId ??
        defaultModel;
      const bestQuality =
        [...items].sort((a, b) => b.qualityScore - a.qualityScore)[0]
          ?.modelId ?? defaultModel;
      const bestSpeed =
        [...items].sort((a, b) => b.speedScore - a.speedScore)[0]?.modelId ??
        defaultModel;

      return {
        models: items,
        recommendation: {
          bestOverall,
          bestValue,
          bestQuality,
          bestSpeed,
        },
      };
    },
    enabled: modelIds.length >= 2,
    staleTime: 1000 * 60 * 60, // 1 hour
    ...options,
  });
}

/**
 * Hook to get model usage summary
 */
export function useModelUsageSummary(
  params?: ModelUsageQueryParams,
  options?: Omit<
    UseQueryOptions<ModelUsageSummary[], Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.ai.usageSummary(params?.period),
    queryFn: async (): Promise<ModelUsageSummary[]> => {
      // TODO: Fetch from API in production
      // Return mock data for now
      return [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook to update AI model preferences
 */
export function useUpdateModelPreferences(
  options?: Omit<
    UseMutationOptions<AIModelPreferences, Error, Partial<AIModelPreferences>>,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updates: Partial<AIModelPreferences>
    ): Promise<AIModelPreferences> => {
      // TODO: Send to API in production
      const current = await queryClient.fetchQuery({
        queryKey: queryKeys.ai.preferences(),
        queryFn: async () => {
          const stored = localStorage.getItem("ai-model-preferences");
          if (stored) {
            return JSON.parse(stored) as AIModelPreferences;
          }
          return {
            provider: "anthropic" as const,
            modelId: "claude-3-5-sonnet-20241022",
            autoSelect: false,
            showCostWarnings: true,
          };
        },
      });

      const updated = { ...current, ...updates };
      localStorage.setItem("ai-model-preferences", JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.ai.preferences(), data);
    },
    ...options,
  });
}

/**
 * Hook to set active AI model
 */
export function useSetActiveModel(
  options?: Omit<
    UseMutationOptions<
      AIModelPreferences,
      Error,
      { modelId: string; provider?: AIProvider }
    >,
    "mutationFn"
  >
) {
  const updatePreferences = useUpdateModelPreferences();

  return useMutation({
    mutationFn: async ({
      modelId,
      provider,
    }: {
      modelId: string;
      provider?: AIProvider;
    }): Promise<AIModelPreferences> => {
      const model = getModelById(modelId);
      const actualProvider = provider ?? model?.provider ?? "anthropic";

      return updatePreferences.mutateAsync({
        modelId,
        provider: actualProvider,
      });
    },
    ...options,
  });
}

/**
 * Hook to test model connection
 */
export function useTestModelConnection(
  options?: Omit<
    UseMutationOptions<
      TestModelConnectionResponse,
      Error,
      {
        modelId: string;
        provider: AIProvider;
        apiKey?: string;
        ollamaUrl?: string;
      }
    >,
    "mutationFn"
  >
) {
  return useMutation({
    mutationFn: async ({
      modelId,
      provider: _provider,
    }: {
      modelId: string;
      provider: AIProvider;
      apiKey?: string;
      ollamaUrl?: string;
    }): Promise<TestModelConnectionResponse> => {
      // TODO: Call API endpoint to test connection using _provider
      // For now, simulate connection test based on model availability
      const model = getModelById(modelId);

      if (!model) {
        return {
          success: false,
          error: `Unknown model: ${modelId}`,
        };
      }

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // For now, return success for available models
      if (model.available) {
        return {
          success: true,
          responseTimeMs: Math.floor(Math.random() * 500) + 100,
          modelInfo: {
            name: model.name,
            contextWindow: model.contextWindow,
            available: true,
          },
        };
      }

      return {
        success: false,
        error: `Model ${model.name} is currently unavailable`,
      };
    },
    ...options,
  });
}

/**
 * Hook to prefetch model data
 */
export function usePrefetchAIModels() {
  const queryClient = useQueryClient();

  return {
    prefetchModels: (params?: ListModelsParams) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.ai.modelsList(
          params as Record<string, unknown> | undefined
        ),
        queryFn: async () => {
          let models = [...AI_MODELS_CATALOG];
          if (params?.provider) {
            models = models.filter((m) => m.provider === params.provider);
          }
          if (!params?.includeUnavailable) {
            models = models.filter((m) => m.available);
          }
          return models;
        },
      });
    },
    prefetchModel: (modelId: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.ai.modelDetail(modelId),
        queryFn: async () => getModelById(modelId) ?? null,
      });
    },
  };
}
