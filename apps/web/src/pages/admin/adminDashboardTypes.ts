/**
 * Admin Dashboard Types
 *
 * Type definitions for the admin analytics dashboard.
 * These types mirror the backend analytics service types.
 */

/**
 * Overview stats combining key metrics for the dashboard
 */
export type OverviewStats = {
  users: {
    total: number;
    active: number;
    newLast30Days: number;
    growth: {
      percentChange: number;
      netNew: number;
    };
  };
  revenue: {
    mrrCents: number;
    arrCents: number;
    growthPercent: number;
  };
  engagement: {
    dau: number;
    mau: number;
    stickiness: number;
  };
  aiCosts: {
    totalCostCents: number;
    projectedMonthlyCents: number;
  };
};

/**
 * Metric card types for display
 */
export type MetricType =
  | "number"
  | "currency"
  | "percentage"
  | "trend"
  | "ratio";

/**
 * Metric card display configuration
 */
export type MetricCardConfig = {
  id: string;
  label: string;
  value: number;
  type: MetricType;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "primary" | "secondary" | "success" | "warning" | "error" | "info";
};

/**
 * API response for overview stats
 */
export type OverviewStatsResponse = {
  data: OverviewStats;
  error?: string;
};

/**
 * Format cents to currency string
 */
export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

/**
 * Format large numbers with K/M suffixes
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * Format percentage with sign
 */
export function formatPercentage(value: number, includeSign = true): string {
  const formatted = `${Math.abs(value).toFixed(1)}%`;
  if (!includeSign || value === 0) return formatted;
  return value > 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Format stickiness ratio (DAU/MAU)
 */
export function formatStickiness(stickiness: number): string {
  return `${(stickiness * 100).toFixed(1)}%`;
}

/**
 * Calculate MRR from tier counts
 */
export const TIER_PRICES = {
  PRO_CENTS: 999, // $9.99
  SCHOLAR_CENTS: 1999, // $19.99
} as const;

/**
 * Auto-refresh interval in milliseconds (60 seconds)
 */
export const AUTO_REFRESH_INTERVAL = 60_000;
