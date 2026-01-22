/**
 * React Query hooks for Reading Challenges
 * Provides hooks for challenges, participation, progress tracking, and leaderboards
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";

// ============================================================================
// Types
// ============================================================================

export type ChallengeType = "OFFICIAL" | "COMMUNITY" | "PERSONAL" | "SEASONAL";
export type ChallengeGoalType =
  | "BOOKS_READ"
  | "PAGES_READ"
  | "TIME_READING"
  | "WORDS_READ"
  | "STREAK_DAYS"
  | "BOOKS_IN_GENRE"
  | "FLASHCARDS_CREATED"
  | "ASSESSMENTS_COMPLETED";

export type ChallengeStatus = "active" | "upcoming" | "past";
export type ChallengeTier =
  | "COMMON"
  | "UNCOMMON"
  | "RARE"
  | "EPIC"
  | "LEGENDARY";
export type Visibility = "PUBLIC" | "PRIVATE" | "UNLISTED";

export interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string | null;
  badgeColor: string | null;
  type: ChallengeType;
  goalType: ChallengeGoalType;
  goalValue: number;
  goalUnit: string;
  startDate: string | null;
  endDate: string | null;
  duration: number | null;
  xpReward: number;
  badgeIcon: string | null;
  isOfficial: boolean;
  isRecurring: boolean;
  tier: ChallengeTier;
  visibility: Visibility;
  participantCount: number;
  isParticipating: boolean;
  userProgress: number | null;
  isCompleted: boolean;
  createdAt: string;
}

export interface ChallengeProgress {
  id: string;
  challengeId: string;
  progress: number;
  goalValue: number;
  isCompleted: boolean;
  completedAt: string | null;
  startedAt: string;
  rank: number;
  percentComplete: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  tier: string;
  progress: number;
  goalValue: number;
  percentComplete: number;
  isCompleted: boolean;
  completedAt: string | null;
  startedAt: string;
}

export interface LeaderboardResponse {
  challenge: {
    id: string;
    title: string;
    goalType: ChallengeGoalType;
    goalValue: number;
    goalUnit: string;
  };
  leaderboard: LeaderboardEntry[];
  currentUserRank: number | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateChallengeInput {
  title: string;
  description: string;
  icon?: string;
  badgeColor?: string;
  type: ChallengeType;
  goalType: ChallengeGoalType;
  goalValue: number;
  goalUnit: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  xpReward?: number;
  badgeIcon?: string;
  tier?: ChallengeTier;
  visibility?: Visibility;
}

export interface UpdateProgressInput {
  increment?: number;
  setValue?: number;
}

// ============================================================================
// API Functions
// ============================================================================

const API_BASE = "/api";

async function fetchChallenges(
  type?: ChallengeType,
  status?: ChallengeStatus,
  page = 1,
  limit = 20
): Promise<{ challenges: Challenge[]; pagination: Record<string, number> }> {
  const params = new URLSearchParams();
  if (type) params.append("type", type);
  if (status) params.append("status", status);
  params.append("page", page.toString());
  params.append("limit", limit.toString());

  const response = await fetch(`${API_BASE}/challenges?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch challenges");
  }

  return response.json();
}

async function createChallenge(
  input: CreateChallengeInput
): Promise<Challenge> {
  const response = await fetch(`${API_BASE}/challenges`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to create challenge");
  }

  return response.json();
}

async function joinChallenge(
  challengeId: string
): Promise<{ id: string; challengeId: string; progress: number }> {
  const response = await fetch(`${API_BASE}/challenges/${challengeId}/join`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to join challenge");
  }

  return response.json();
}

async function leaveChallenge(challengeId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/challenges/${challengeId}/join`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to leave challenge");
  }
}

async function fetchChallengeProgress(
  challengeId: string
): Promise<ChallengeProgress> {
  const response = await fetch(
    `${API_BASE}/challenges/${challengeId}/progress`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch challenge progress");
  }

  return response.json();
}

async function updateChallengeProgress(
  challengeId: string,
  input: UpdateProgressInput
): Promise<ChallengeProgress & { xpAwarded?: number }> {
  const response = await fetch(
    `${API_BASE}/challenges/${challengeId}/progress`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update challenge progress");
  }

  return response.json();
}

async function fetchLeaderboard(
  challengeId: string,
  filter: "all" | "completed" | "active" = "all",
  page = 1,
  limit = 50
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams();
  params.append("filter", filter);
  params.append("page", page.toString());
  params.append("limit", limit.toString());

  const response = await fetch(
    `${API_BASE}/challenges/${challengeId}/leaderboard?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch leaderboard");
  }

  return response.json();
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook to fetch challenges list
 */
export function useChallenges(
  type?: ChallengeType,
  status?: ChallengeStatus,
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: ["challenges", type, status, page, limit],
    queryFn: () => fetchChallenges(type, status, page, limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to create a new challenge
 */
export function useCreateChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createChallenge,
    onSuccess: () => {
      // Invalidate challenges list
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
  });
}

/**
 * Hook to join a challenge
 */
export function useJoinChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: joinChallenge,
    onSuccess: (_, challengeId) => {
      // Invalidate challenges list and specific challenge
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({
        queryKey: ["challenge-progress", challengeId],
      });
    },
  });
}

/**
 * Hook to leave a challenge
 */
export function useLeaveChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: leaveChallenge,
    onSuccess: (_, challengeId) => {
      // Invalidate challenges list and specific challenge
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({
        queryKey: ["challenge-progress", challengeId],
      });
    },
  });
}

/**
 * Hook to fetch challenge progress for current user
 */
export function useChallengeProgress(challengeId: string) {
  const { isSignedIn } = useAuth();

  return useQuery({
    queryKey: ["challenge-progress", challengeId],
    queryFn: () => fetchChallengeProgress(challengeId),
    enabled: Boolean(isSignedIn && challengeId),
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to update challenge progress
 */
export function useUpdateChallengeProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      challengeId,
      input,
    }: {
      challengeId: string;
      input: UpdateProgressInput;
    }) => updateChallengeProgress(challengeId, input),
    onSuccess: (_, { challengeId }) => {
      // Invalidate progress, challenges list, and leaderboard
      queryClient.invalidateQueries({
        queryKey: ["challenge-progress", challengeId],
      });
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({
        queryKey: ["leaderboard", challengeId],
      });
    },
  });
}

/**
 * Hook to fetch challenge leaderboard
 */
export function useLeaderboard(
  challengeId: string,
  filter: "all" | "completed" | "active" = "all",
  page = 1,
  limit = 50
) {
  return useQuery({
    queryKey: ["leaderboard", challengeId, filter, page, limit],
    queryFn: () => fetchLeaderboard(challengeId, filter, page, limit),
    enabled: !!challengeId,
    staleTime: 1000 * 30, // 30 seconds (leaderboards update frequently)
  });
}

/**
 * Hook for getting active challenges user is participating in
 */
export function useActiveChallenges() {
  const { data, isLoading, error } = useChallenges(undefined, "active");

  const activeChallenges =
    data?.challenges.filter((c) => c.isParticipating && !c.isCompleted) || [];

  return {
    challenges: activeChallenges,
    isLoading,
    error,
  };
}

/**
 * Hook for getting completed challenges
 */
export function useCompletedChallenges() {
  const { data, isLoading, error } = useChallenges(undefined, "active");

  const completedChallenges =
    data?.challenges.filter((c) => c.isParticipating && c.isCompleted) || [];

  return {
    challenges: completedChallenges,
    isLoading,
    error,
  };
}
