/**
 * React Query hooks for subscription and usage tracking
 */

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type UserTier = "FREE" | "PRO" | "SCHOLAR";

export interface UsageStats {
  tier: UserTier;
  limits: {
    maxBooks: number;
    maxAiInteractionsPerDay: number;
    maxActiveFlashcards: number;
    maxTtsDownloadsPerMonth: number;
  };
  usage: {
    booksCount: number;
    aiInteractionsToday: number;
    activeFlashcardsCount: number;
    ttsDownloadsThisMonth: number;
  };
  remaining: {
    books: number;
    aiInteractions: number;
    flashcards: number;
    ttsDownloads: number;
  };
  percentages: {
    books: number;
    aiInteractions: number;
    flashcards: number;
    ttsDownloads: number;
  };
}

export interface InvoiceSummary {
  id: string;
  number: string | null;
  status: string | null;
  amount: string;
  amountCents: number;
  currency: string;
  description: string | null;
  pdfUrl: string | null;
  hostedUrl: string | null;
  createdAt: string;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface InvoicesResponse {
  invoices: InvoiceSummary[];
  hasMore: boolean;
}

// ============================================================================
// Query Key Factory
// ============================================================================

export const subscriptionQueryKeys = {
  all: ["subscription"] as const,
  usage: () => [...subscriptionQueryKeys.all, "usage"] as const,
  invoices: (limit?: number) =>
    [...subscriptionQueryKeys.all, "invoices", { limit }] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch current usage statistics
 */
export function useUsageStats(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  return useQuery<UsageStats, Error>({
    queryKey: subscriptionQueryKeys.usage(),
    queryFn: async (): Promise<UsageStats> => {
      logger.debug("Fetching usage stats");
      const response = await apiRequest<UsageStats>("/api/payments/usage");
      return response;
    },
    enabled: options?.enabled ?? true,
    ...(options?.refetchInterval !== undefined && {
      refetchInterval: options.refetchInterval,
    }),
    staleTime: 60 * 1000, // Consider data stale after 1 minute
  });
}

/**
 * Fetch invoice history
 */
export function useInvoices(options?: { limit?: number; enabled?: boolean }) {
  const limit = options?.limit ?? 10;

  return useQuery<InvoicesResponse, Error>({
    queryKey: subscriptionQueryKeys.invoices(limit),
    queryFn: async (): Promise<InvoicesResponse> => {
      logger.debug("Fetching invoices", { limit });
      const response = await apiRequest<InvoicesResponse>(
        `/api/payments/invoices?limit=${limit}`
      );
      return response;
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a limit is unlimited (-1 means unlimited from API)
 */
export function isUnlimited(value: number): boolean {
  return value === -1;
}

/**
 * Format limit display text
 */
export function formatLimit(value: number): string {
  return isUnlimited(value) ? "Unlimited" : value.toString();
}

/**
 * Format remaining count display text
 */
export function formatRemaining(remaining: number, limit: number): string {
  if (isUnlimited(remaining)) {
    return "Unlimited";
  }
  if (isUnlimited(limit)) {
    return "Unlimited";
  }
  return remaining.toString();
}

/**
 * Get usage status based on percentage
 */
export function getUsageStatus(
  percentage: number
): "low" | "medium" | "high" | "critical" {
  if (percentage >= 100) return "critical";
  if (percentage >= 80) return "high";
  if (percentage >= 50) return "medium";
  return "low";
}

/**
 * Get color for usage status
 */
export function getUsageStatusColor(
  status: "low" | "medium" | "high" | "critical"
): "success" | "info" | "warning" | "error" {
  switch (status) {
    case "low":
      return "success";
    case "medium":
      return "info";
    case "high":
      return "warning";
    case "critical":
      return "error";
    default:
      return "info";
  }
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: UserTier): string {
  switch (tier) {
    case "FREE":
      return "Free";
    case "PRO":
      return "Pro";
    case "SCHOLAR":
      return "Scholar";
    default:
      return tier;
  }
}

/**
 * Check if user can perform an action based on remaining quota
 */
export function canPerformAction(remaining: number, _limit: number): boolean {
  // Unlimited
  if (isUnlimited(remaining)) {
    return true;
  }
  return remaining > 0;
}

/**
 * Format invoice status for display
 */
export function formatInvoiceStatus(status: string | null): string {
  if (!status) return "Unknown";
  switch (status) {
    case "paid":
      return "Paid";
    case "open":
      return "Open";
    case "draft":
      return "Draft";
    case "void":
      return "Void";
    case "uncollectible":
      return "Uncollectible";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

/**
 * Get invoice status color
 */
export function getInvoiceStatusColor(
  status: string | null
): "success" | "warning" | "error" | "default" {
  switch (status) {
    case "paid":
      return "success";
    case "open":
      return "warning";
    case "void":
    case "uncollectible":
      return "error";
    default:
      return "default";
  }
}
