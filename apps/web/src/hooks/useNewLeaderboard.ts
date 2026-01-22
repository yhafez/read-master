/**
 * Leaderboards React Query hook
 *
 * Fetches leaderboard data with caching and real-time updates
 */

import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";

import { apiRequest } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

export type LeaderboardMetric =
  | "books"
  | "pages"
  | "time"
  | "streak"
  | "xp"
  | "assessments";

export type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "alltime";

export type LeaderboardType = "global" | "friends";

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  tier: string;
  score: number;
  change: number;
  isCurrentUser: boolean;
};

export type LeaderboardData = {
  leaderboard: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  type: LeaderboardType;
};

// ============================================================================
// Hook
// ============================================================================

export type UseLeaderboardOptions = {
  metric?: LeaderboardMetric;
  period?: LeaderboardPeriod;
  type?: LeaderboardType;
  limit?: number;
  enabled?: boolean;
};

export function useLeaderboard(
  options: UseLeaderboardOptions = {}
): UseQueryResult<LeaderboardData> {
  const {
    metric = "books",
    period = "alltime",
    type = "global",
    limit = 100,
    enabled = true,
  } = options;

  return useQuery({
    queryKey: ["leaderboard", metric, period, type, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        metric,
        period,
        type,
        limit: limit.toString(),
      });

      const response = await apiRequest<LeaderboardData>(
        `/api/leaderboards?${params}`,
        { method: "GET" }
      );
      return response;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for global leaderboard
 */
export function useGlobalLeaderboard(
  metric: LeaderboardMetric,
  period: LeaderboardPeriod
): UseQueryResult<LeaderboardData> {
  return useLeaderboard({ metric, period, type: "global" });
}

/**
 * Hook for friends leaderboard
 */
export function useFriendsLeaderboard(
  metric: LeaderboardMetric,
  period: LeaderboardPeriod
): UseQueryResult<LeaderboardData> {
  return useLeaderboard({ metric, period, type: "friends" });
}
