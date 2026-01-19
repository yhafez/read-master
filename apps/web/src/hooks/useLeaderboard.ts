/**
 * React Query hooks for leaderboard data
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryClient";

// ============================================================================
// Types
// ============================================================================

/**
 * Leaderboard entry
 * Note: This should match the type from @read-master/shared
 */
export type LeaderboardEntry = {
  rank: number;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  value: number;
  isCurrentUser: boolean;
};

/**
 * Leaderboard query parameters
 */
export type LeaderboardParams = {
  timeframe?: "weekly" | "monthly" | "all_time";
  metric?: "xp" | "books" | "streak" | "reading_time";
  friendsOnly?: boolean;
  page?: number;
  limit?: number;
};

/**
 * Full leaderboard response with pagination
 */
export type FullLeaderboardResponse = {
  entries: LeaderboardEntry[];
  currentUserRank: number | null;
  timeframe: "weekly" | "monthly" | "all_time";
  metric: "xp" | "books" | "streak" | "reading_time";
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

// ============================================================================
// API Client
// ============================================================================

/**
 * Fetch leaderboard data from API
 */
async function fetchLeaderboard(
  params: LeaderboardParams = {}
): Promise<FullLeaderboardResponse> {
  const searchParams = new URLSearchParams();

  if (params.timeframe) searchParams.set("timeframe", params.timeframe);
  if (params.metric) searchParams.set("metric", params.metric);
  if (params.friendsOnly !== undefined)
    searchParams.set("friendsOnly", String(params.friendsOnly));
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const response = await fetch(`/api/leaderboard?${searchParams.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to fetch leaderboard",
    }));
    throw new Error(error.message || "Failed to fetch leaderboard");
  }

  return response.json();
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook to fetch leaderboard data
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useLeaderboard({
 *   timeframe: 'weekly',
 *   metric: 'xp',
 *   friendsOnly: false,
 *   page: 1,
 *   limit: 50
 * });
 * ```
 */
export function useLeaderboard(
  params: LeaderboardParams = {}
): UseQueryResult<FullLeaderboardResponse, Error> {
  // Build query key based on params
  const queryKey = params.friendsOnly
    ? queryKeys.leaderboard.friends(params.timeframe)
    : queryKeys.leaderboard.global(params.timeframe);

  // Append additional params to query key
  const fullQueryKey = [...queryKey, params.metric, params.page, params.limit];

  return useQuery({
    queryKey: fullQueryKey,
    queryFn: () => fetchLeaderboard(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

// Types are already exported above
