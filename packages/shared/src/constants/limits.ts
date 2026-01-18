/**
 * Tier limits and configuration constants
 *
 * Defines the capabilities and restrictions for each subscription tier:
 * - FREE: Basic access with limitations
 * - PRO: Enhanced features for serious readers
 * - SCHOLAR: Unlimited access for power users
 *
 * @example
 * ```typescript
 * import { TIER_LIMITS, getTierLimits, canPerformAction } from '@read-master/shared/constants';
 *
 * const limits = getTierLimits('PRO');
 * limits.maxBooks; // Infinity (unlimited)
 *
 * if (canPerformAction('createCurriculum', 'FREE')) {
 *   // User cannot create curriculums on free tier
 * }
 * ```
 */

import type { UserTier } from "@read-master/database";

// ============================================================================
// Types
// ============================================================================

/**
 * Tier-specific limits and capabilities
 */
export type TierLimits = {
  /** Maximum number of books in library (Infinity = unlimited) */
  readonly maxBooks: number;
  /** Maximum AI interactions per day (Infinity = unlimited) */
  readonly maxAiInteractionsPerDay: number;
  /** Maximum active flashcards (Infinity = unlimited) */
  readonly maxActiveFlashcards: number;
  /** Maximum TTS downloads per month (0 = not available, Infinity = unlimited) */
  readonly maxTtsDownloadsPerMonth: number;
  /** TTS provider for this tier */
  readonly ttsProvider: "web_speech" | "openai" | "elevenlabs";
  /** Whether ads are shown */
  readonly showAds: boolean;
  /** Whether user can create reading groups */
  readonly canCreateReadingGroups: boolean;
  /** Whether user can create curriculums */
  readonly canCreateCurriculums: boolean;
  /** Whether user has API access */
  readonly hasApiAccess: boolean;
  /** Whether user gets priority support */
  readonly hasPrioritySupport: boolean;
  /** Whether user gets early access to features */
  readonly hasEarlyAccess: boolean;
  /** Whether full analytics dashboard is available */
  readonly hasFullAnalytics: boolean;
  /** Whether academic citation exports are available */
  readonly hasAcademicCitations: boolean;
  /** Whether bulk import tools are available */
  readonly hasBulkImport: boolean;
  /** AI guide depth (basic = shorter, full = comprehensive) */
  readonly aiGuideDepth: "basic" | "full";
  /** Maximum file upload size in bytes (50MB) */
  readonly maxUploadSize: number;
};

/**
 * Actions that can be checked for tier permissions
 */
export type TierAction =
  | "createReadingGroup"
  | "createCurriculum"
  | "downloadTts"
  | "useApiAccess"
  | "useBulkImport"
  | "useAcademicCitations"
  | "useFullAnalytics"
  | "usePremiumTts"
  | "useUnlimitedAi";

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum file upload size (50MB)
 */
export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Free tier limits
 * - 3 books in library
 * - 5 AI interactions/day
 * - Basic TTS (Web Speech API)
 * - 50 active flashcards max
 * - Basic analytics
 * - Can join reading groups (can't create)
 * - Ads shown
 */
export const FREE_TIER_LIMITS: TierLimits = {
  maxBooks: 3,
  maxAiInteractionsPerDay: 5,
  maxActiveFlashcards: 50,
  maxTtsDownloadsPerMonth: 0,
  ttsProvider: "web_speech",
  showAds: true,
  canCreateReadingGroups: false,
  canCreateCurriculums: false,
  hasApiAccess: false,
  hasPrioritySupport: false,
  hasEarlyAccess: false,
  hasFullAnalytics: false,
  hasAcademicCitations: false,
  hasBulkImport: false,
  aiGuideDepth: "basic",
  maxUploadSize: MAX_UPLOAD_SIZE_BYTES,
} as const;

/**
 * Pro tier limits ($9.99/month or $79.99/year)
 * - Unlimited library
 * - 100 AI interactions/day
 * - Premium TTS (OpenAI)
 * - 5 TTS downloads/month
 * - Unlimited flashcards
 * - Full analytics
 * - Can create reading groups & curriculums
 * - No ads
 * - Priority support
 */
export const PRO_TIER_LIMITS: TierLimits = {
  maxBooks: Infinity,
  maxAiInteractionsPerDay: 100,
  maxActiveFlashcards: Infinity,
  maxTtsDownloadsPerMonth: 5,
  ttsProvider: "openai",
  showAds: false,
  canCreateReadingGroups: true,
  canCreateCurriculums: true,
  hasApiAccess: false,
  hasPrioritySupport: true,
  hasEarlyAccess: false,
  hasFullAnalytics: true,
  hasAcademicCitations: false,
  hasBulkImport: false,
  aiGuideDepth: "full",
  maxUploadSize: MAX_UPLOAD_SIZE_BYTES,
} as const;

/**
 * Scholar tier limits ($19.99/month or $149.99/year)
 * - Everything in Pro
 * - Unlimited AI interactions
 * - Best TTS (ElevenLabs)
 * - Unlimited TTS downloads
 * - API access
 * - Early access to features
 * - Academic citation exports
 * - Bulk import tools
 */
export const SCHOLAR_TIER_LIMITS: TierLimits = {
  maxBooks: Infinity,
  maxAiInteractionsPerDay: Infinity,
  maxActiveFlashcards: Infinity,
  maxTtsDownloadsPerMonth: Infinity,
  ttsProvider: "elevenlabs",
  showAds: false,
  canCreateReadingGroups: true,
  canCreateCurriculums: true,
  hasApiAccess: true,
  hasPrioritySupport: true,
  hasEarlyAccess: true,
  hasFullAnalytics: true,
  hasAcademicCitations: true,
  hasBulkImport: true,
  aiGuideDepth: "full",
  maxUploadSize: MAX_UPLOAD_SIZE_BYTES,
} as const;

/**
 * All tier limits indexed by tier name
 */
export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  FREE: FREE_TIER_LIMITS,
  PRO: PRO_TIER_LIMITS,
  SCHOLAR: SCHOLAR_TIER_LIMITS,
} as const;

/**
 * Subscription pricing
 */
export const SUBSCRIPTION_PRICING = {
  PRO: {
    monthly: 9.99,
    yearly: 79.99,
    yearlySavingsPercent: 33,
  },
  SCHOLAR: {
    monthly: 19.99,
    yearly: 149.99,
    yearlySavingsPercent: 37,
  },
} as const;

/**
 * AI credits pricing for free tier users (pay-as-you-go)
 */
export const AI_CREDITS_PRICING = {
  /** Price in USD for credit package */
  priceUsd: 5,
  /** Number of AI interactions per package */
  creditsPerPackage: 100,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get tier limits for a specific tier
 */
export function getTierLimits(tier: UserTier): TierLimits {
  return TIER_LIMITS[tier];
}

/**
 * Check if a user on a given tier can perform a specific action
 */
export function canPerformAction(action: TierAction, tier: UserTier): boolean {
  const limits = getTierLimits(tier);

  switch (action) {
    case "createReadingGroup":
      return limits.canCreateReadingGroups;
    case "createCurriculum":
      return limits.canCreateCurriculums;
    case "downloadTts":
      return limits.maxTtsDownloadsPerMonth > 0;
    case "useApiAccess":
      return limits.hasApiAccess;
    case "useBulkImport":
      return limits.hasBulkImport;
    case "useAcademicCitations":
      return limits.hasAcademicCitations;
    case "useFullAnalytics":
      return limits.hasFullAnalytics;
    case "usePremiumTts":
      return limits.ttsProvider !== "web_speech";
    case "useUnlimitedAi":
      return limits.maxAiInteractionsPerDay === Infinity;
    default:
      return false;
  }
}

/**
 * Check if a value exceeds the tier limit (handles Infinity)
 */
export function isWithinLimit(
  current: number,
  tier: UserTier,
  limitKey: keyof Pick<
    TierLimits,
    | "maxBooks"
    | "maxAiInteractionsPerDay"
    | "maxActiveFlashcards"
    | "maxTtsDownloadsPerMonth"
  >
): boolean {
  const limit = TIER_LIMITS[tier][limitKey];
  return limit === Infinity || current < limit;
}

/**
 * Get remaining quota for a tier limit
 * Returns Infinity if limit is unlimited, otherwise returns remaining count
 */
export function getRemainingQuota(
  current: number,
  tier: UserTier,
  limitKey: keyof Pick<
    TierLimits,
    | "maxBooks"
    | "maxAiInteractionsPerDay"
    | "maxActiveFlashcards"
    | "maxTtsDownloadsPerMonth"
  >
): number {
  const limit = TIER_LIMITS[tier][limitKey];
  if (limit === Infinity) {
    return Infinity;
  }
  return Math.max(0, limit - current);
}

/**
 * Check if a tier is higher than another
 * Order: FREE < PRO < SCHOLAR
 */
export function isTierHigherOrEqual(
  userTier: UserTier,
  requiredTier: UserTier
): boolean {
  const tierOrder: Record<UserTier, number> = {
    FREE: 0,
    PRO: 1,
    SCHOLAR: 2,
  };
  return tierOrder[userTier] >= tierOrder[requiredTier];
}

/**
 * Get the minimum tier required for an action
 */
export function getMinimumTierForAction(action: TierAction): UserTier {
  // Check from lowest to highest
  if (canPerformAction(action, "FREE")) return "FREE";
  if (canPerformAction(action, "PRO")) return "PRO";
  return "SCHOLAR";
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Convenience object for importing all limit-related utilities
 */
export const limitUtils = {
  getTierLimits,
  canPerformAction,
  isWithinLimit,
  getRemainingQuota,
  isTierHigherOrEqual,
  getMinimumTierForAction,
} as const;
