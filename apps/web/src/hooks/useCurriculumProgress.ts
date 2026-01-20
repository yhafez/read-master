/**
 * Curriculum Progress Hook
 *
 * Custom hook for managing curriculum progress tracking including:
 * - Fetching current progress
 * - Updating current item index
 * - Marking items as complete
 * - Calculating completion percentage
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

export type CurriculumProgress = {
  curriculumId: string;
  curriculumTitle: string;
  userId: string;
  currentItemIndex: number;
  completedItems: number;
  totalItems: number;
  percentComplete: number;
  startedAt: string;
  lastProgressAt: string | null;
  completedAt: string | null;
  isComplete: boolean;
};

export type UpdateProgressInput = {
  currentItemIndex?: number;
  completedItems?: number;
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchProgress(curriculumId: string): Promise<CurriculumProgress | null> {
  const response = await fetch(`/api/curriculums/${curriculumId}/progress`);

  if (response.status === 404) {
    // User hasn't started this curriculum yet
    return null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to fetch progress",
    }));
    throw new Error(error.message || "Failed to fetch progress");
  }

  const data = await response.json();
  return data.data;
}

async function updateProgress(
  curriculumId: string,
  input: UpdateProgressInput
): Promise<CurriculumProgress> {
  const response = await fetch(`/api/curriculums/${curriculumId}/progress`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to update progress",
    }));
    throw new Error(error.message || "Failed to update progress");
  }

  const data = await response.json();
  return data.data;
}

// ============================================================================
// Hook
// ============================================================================

export type UseCurriculumProgressResult = {
  progress: CurriculumProgress | null;
  isLoading: boolean;
  error: Error | null;
  updateProgress: (input: UpdateProgressInput) => Promise<void>;
  markItemComplete: (itemIndex: number) => Promise<void>;
  moveToNextItem: () => Promise<void>;
  moveToPreviousItem: () => Promise<void>;
  isUpdating: boolean;
};

export function useCurriculumProgress(
  curriculumId: string,
  totalItems: number,
  enabled = true
): UseCurriculumProgressResult {
  const queryClient = useQueryClient();

  // Fetch progress
  const {
    data: progress,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["curriculumProgress", curriculumId],
    queryFn: () => fetchProgress(curriculumId),
    enabled: enabled && !!curriculumId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Update progress mutation
  const updateMutation = useMutation({
    mutationFn: (input: UpdateProgressInput) => updateProgress(curriculumId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["curriculumProgress", curriculumId],
      });
      queryClient.invalidateQueries({
        queryKey: ["curriculum", curriculumId],
      });
    },
  });

  // Helper: Update progress
  const handleUpdateProgress = async (input: UpdateProgressInput): Promise<void> => {
    await updateMutation.mutateAsync(input);
  };

  // Helper: Mark item complete
  const markItemComplete = async (itemIndex: number): Promise<void> => {
    const currentCompleted = progress?.completedItems ?? 0;
    await handleUpdateProgress({
      completedItems: Math.max(currentCompleted, itemIndex + 1),
    });
  };

  // Helper: Move to next item
  const moveToNextItem = async (): Promise<void> => {
    const currentIndex = progress?.currentItemIndex ?? 0;
    if (currentIndex < totalItems - 1) {
      await handleUpdateProgress({
        currentItemIndex: currentIndex + 1,
      });
    }
  };

  // Helper: Move to previous item
  const moveToPreviousItem = async (): Promise<void> => {
    const currentIndex = progress?.currentItemIndex ?? 0;
    if (currentIndex > 0) {
      await handleUpdateProgress({
        currentItemIndex: currentIndex - 1,
      });
    }
  };

  return {
    progress: progress ?? null,
    isLoading,
    error: error as Error | null,
    updateProgress: handleUpdateProgress,
    markItemComplete,
    moveToNextItem,
    moveToPreviousItem,
    isUpdating: updateMutation.isPending,
  };
}
