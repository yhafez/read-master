/**
 * React Query hooks for analytics charts data
 */

import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

export interface ReadingTimeDataPoint {
  date: string;
  minutes: number;
  sessions: number;
  avgWpm: number | null;
}

export interface ReadingTimeResponse {
  data: ReadingTimeDataPoint[];
  summary: {
    totalMinutes: number;
    totalHours: number;
    avgMinutesPerDay: number;
    totalSessions: number;
    avgWpm: number | null;
  };
  period: string;
  groupBy: string;
}

export interface SpeedDataPoint {
  date: string;
  avgWpm: number;
  minWpm: number | null;
  maxWpm: number | null;
  sessions: number;
}

export interface SpeedByGenre {
  genre: string;
  avgWpm: number;
  sessionsCount: number;
}

export interface ReadingSpeedResponse {
  trends: SpeedDataPoint[];
  byGenre: SpeedByGenre[];
  summary: {
    currentAvgWpm: number;
    overallAvgWpm: number;
    improvementPercent: number | null;
    fastestWpm: number | null;
    slowestWpm: number | null;
  };
  period: string;
}

export interface CompletionDataPoint {
  date: string;
  completed: number;
  started: number;
  abandoned: number;
}

export interface BooksByStatus {
  status: string;
  count: number;
  percentage: number;
}

export interface CompletionsResponse {
  monthlyData: CompletionDataPoint[];
  byStatus: BooksByStatus[];
  byGenre: {
    genre: string;
    completed: number;
    inProgress: number;
  }[];
  summary: {
    totalCompleted: number;
    totalInProgress: number;
    totalAbandoned: number;
    totalWantToRead: number;
    completionRate: number;
    avgTimeToComplete: number | null;
  };
  period: string;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchReadingTime(
  period: string,
  groupBy: string
): Promise<ReadingTimeResponse> {
  const response = await fetch(
    `/api/analytics/reading-time?period=${period}&groupBy=${groupBy}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch reading time analytics");
  }
  const result = await response.json();
  return result.data;
}

async function fetchReadingSpeed(
  period: string
): Promise<ReadingSpeedResponse> {
  const response = await fetch(`/api/analytics/reading-speed?period=${period}`);
  if (!response.ok) {
    throw new Error("Failed to fetch reading speed analytics");
  }
  const result = await response.json();
  return result.data;
}

async function fetchCompletions(period: string): Promise<CompletionsResponse> {
  const response = await fetch(`/api/analytics/completions?period=${period}`);
  if (!response.ok) {
    throw new Error("Failed to fetch completions analytics");
  }
  const result = await response.json();
  return result.data;
}

// ============================================================================
// React Query Hooks
// ============================================================================

export function useReadingTimeAnalytics(
  period: "7d" | "30d" | "90d" | "1y" = "30d",
  groupBy: "day" | "week" | "month" = "day"
) {
  return useQuery({
    queryKey: ["analytics", "reading-time", period, groupBy],
    queryFn: () => fetchReadingTime(period, groupBy),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useReadingSpeedAnalytics(
  period: "7d" | "30d" | "90d" | "1y" = "30d"
) {
  return useQuery({
    queryKey: ["analytics", "reading-speed", period],
    queryFn: () => fetchReadingSpeed(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCompletionsAnalytics(
  period: "7d" | "30d" | "90d" | "1y" | "all" = "1y"
) {
  return useQuery({
    queryKey: ["analytics", "completions", period],
    queryFn: () => fetchCompletions(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
