/**
 * useAnnotations Hook
 *
 * React Query hooks for managing annotations (highlights, notes, bookmarks).
 * Provides CRUD operations with caching, optimistic updates, and automatic sync.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  Annotation,
  AnnotationType,
  CreateAnnotationInput,
  UpdateAnnotationInput,
} from "@/components/reader/annotationTypes";

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch annotations for a book
 */
async function fetchAnnotations(bookId: string): Promise<Annotation[]> {
  const response = await fetch(`/api/annotations?bookId=${bookId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch annotations");
  }
  const data = await response.json();
  return data.data || [];
}

/**
 * Create a new annotation
 */
async function createAnnotation(
  input: CreateAnnotationInput
): Promise<Annotation> {
  const response = await fetch("/api/annotations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to create annotation");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Update an existing annotation
 */
async function updateAnnotation(
  id: string,
  input: UpdateAnnotationInput
): Promise<Annotation> {
  const response = await fetch(`/api/annotations?id=${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to update annotation");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Delete an annotation
 */
async function deleteAnnotation(id: string): Promise<void> {
  const response = await fetch(`/api/annotations?id=${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete annotation");
  }
}

/**
 * Like an annotation
 */
async function likeAnnotation(id: string): Promise<void> {
  const response = await fetch(`/api/annotations/${id}/like`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to like annotation");
  }
}

/**
 * Unlike an annotation
 */
async function unlikeAnnotation(id: string): Promise<void> {
  const response = await fetch(`/api/annotations/${id}/like`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to unlike annotation");
  }
}

// ============================================================================
// React Query Hooks
// ============================================================================

const annotationKeys = {
  all: ["annotations"] as const,
  book: (bookId: string) => [...annotationKeys.all, bookId] as const,
  type: (bookId: string, type: AnnotationType) =>
    [...annotationKeys.book(bookId), type] as const,
};

/**
 * Hook to fetch annotations for a book
 */
export function useAnnotations(bookId: string) {
  return useQuery({
    queryKey: annotationKeys.book(bookId),
    queryFn: () => fetchAnnotations(bookId),
    enabled: !!bookId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to create a new annotation
 */
export function useCreateAnnotation(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAnnotation,
    onSuccess: () => {
      // Invalidate annotations query to refetch
      queryClient.invalidateQueries({
        queryKey: annotationKeys.book(bookId),
      });
    },
  });
}

/**
 * Hook to update an annotation
 */
export function useUpdateAnnotation(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAnnotationInput }) =>
      updateAnnotation(id, input),
    onSuccess: () => {
      // Invalidate annotations query to refetch
      queryClient.invalidateQueries({
        queryKey: annotationKeys.book(bookId),
      });
    },
  });
}

/**
 * Hook to delete an annotation
 */
export function useDeleteAnnotation(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAnnotation,
    onSuccess: () => {
      // Invalidate annotations query to refetch
      queryClient.invalidateQueries({
        queryKey: annotationKeys.book(bookId),
      });
    },
  });
}

/**
 * Hook to like an annotation
 */
export function useLikeAnnotation(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: likeAnnotation,
    onSuccess: () => {
      // Invalidate annotations query to refetch
      queryClient.invalidateQueries({
        queryKey: annotationKeys.book(bookId),
      });
    },
  });
}

/**
 * Hook to unlike an annotation
 */
export function useUnlikeAnnotation(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unlikeAnnotation,
    onSuccess: () => {
      // Invalidate annotations query to refetch
      queryClient.invalidateQueries({
        queryKey: annotationKeys.book(bookId),
      });
    },
  });
}

/**
 * Hook providing all annotation operations
 */
export function useAnnotationOperations(bookId: string) {
  const { data: annotations = [], isLoading, error } = useAnnotations(bookId);
  const createMutation = useCreateAnnotation(bookId);
  const updateMutation = useUpdateAnnotation(bookId);
  const deleteMutation = useDeleteAnnotation(bookId);
  const likeMutation = useLikeAnnotation(bookId);
  const unlikeMutation = useUnlikeAnnotation(bookId);

  return {
    // Data
    annotations,
    isLoading,
    error,

    // Operations
    create: createMutation.mutate,
    update: (id: string, input: UpdateAnnotationInput) =>
      updateMutation.mutate({ id, input }),
    remove: deleteMutation.mutate,
    like: likeMutation.mutate,
    unlike: unlikeMutation.mutate,

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isLiking: likeMutation.isPending,
    isUnliking: unlikeMutation.isPending,
  };
}
