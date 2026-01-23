import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryClient";

/**
 * Video source enum
 */
export type VideoSource = "UPLOAD" | "YOUTUBE" | "VIMEO" | "URL" | "RECORDING";

/**
 * Video status enum
 */
export type VideoStatus = "NEW" | "IN_PROGRESS" | "COMPLETED" | "BOOKMARKED";

/**
 * Video quality enum
 */
export type VideoQuality =
  | "AUTO"
  | "360P"
  | "480P"
  | "720P"
  | "1080P"
  | "1440P"
  | "4K";

/**
 * Transcript cue type
 */
export interface TranscriptCue {
  startTime: number;
  endTime: number;
  text: string;
}

/**
 * Video transcript type
 */
export interface VideoTranscript {
  language: string;
  label: string;
  cues: TranscriptCue[];
}

/**
 * Video annotation type
 */
export interface VideoAnnotation {
  id: string;
  videoId: string;
  userId: string;
  timestamp: number;
  content: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Video settings type
 */
export interface VideoSettings {
  defaultPlaybackSpeed: number;
  defaultVolume: number;
  defaultQuality: VideoQuality;
  autoplay: boolean;
  showCaptions: boolean;
  preferredCaptionLanguage?: string;
}

/**
 * Video type (summary)
 */
export interface Video {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoUrl: string;
  duration: number; // in seconds
  source: VideoSource;
  status: VideoStatus;
  position: number; // current playback position in seconds
  hasTranscript: boolean;
  annotationCount: number;
  createdAt: string;
  updatedAt: string;
  lastWatchedAt: string | null;
  completedAt: string | null;
}

/**
 * Video with details
 */
export interface VideoWithDetails extends Video {
  transcript: VideoTranscript | null;
  annotations: VideoAnnotation[];
  settings: VideoSettings | null;
}

/**
 * Video list filters
 */
export interface VideoListFilters {
  search?: string | undefined;
  status?: VideoStatus | undefined;
  source?: VideoSource | undefined;
  hasTranscript?: boolean | undefined;
  sortBy?:
    | "title"
    | "createdAt"
    | "updatedAt"
    | "duration"
    | "lastWatchedAt"
    | undefined;
  sortDirection?: "asc" | "desc" | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Import video input
 */
export interface ImportVideoInput {
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  source?: VideoSource;
  transcript?: VideoTranscript;
}

/**
 * Update video input
 */
export interface UpdateVideoInput {
  title?: string;
  description?: string | null;
  thumbnailUrl?: string | null;
}

/**
 * Update video progress input
 */
export interface UpdateVideoProgressInput {
  position: number;
  status?: VideoStatus;
}

/**
 * Create annotation input
 */
export interface CreateAnnotationInput {
  timestamp: number;
  content: string;
  color?: string;
}

/**
 * API client for videos endpoints
 */
const videosApi = {
  /**
   * Fetch list of videos
   */
  async getVideos(
    filters?: VideoListFilters
  ): Promise<PaginatedResponse<Video>> {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.source) params.set("source", filters.source);
    if (filters?.hasTranscript !== undefined)
      params.set("hasTranscript", String(filters.hasTranscript));
    if (filters?.sortBy) params.set("sortBy", filters.sortBy);
    if (filters?.sortDirection)
      params.set("sortDirection", filters.sortDirection);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));

    const response = await fetch(`/api/videos?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Failed to fetch videos");
    }
    return response.json();
  },

  /**
   * Fetch a single video by ID with details
   */
  async getVideo(id: string): Promise<VideoWithDetails> {
    const response = await fetch(`/api/videos/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch video");
    }
    return response.json();
  },

  /**
   * Import a new video
   */
  async importVideo(data: ImportVideoInput): Promise<Video> {
    const response = await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to import video");
    }
    return response.json();
  },

  /**
   * Update video metadata
   */
  async updateVideo(id: string, data: UpdateVideoInput): Promise<Video> {
    const response = await fetch(`/api/videos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to update video");
    }
    return response.json();
  },

  /**
   * Delete a video
   */
  async deleteVideo(id: string): Promise<void> {
    const response = await fetch(`/api/videos/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete video");
    }
  },

  /**
   * Update video progress
   */
  async updateProgress(
    videoId: string,
    data: UpdateVideoProgressInput
  ): Promise<Video> {
    const response = await fetch(`/api/videos/${videoId}/progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to update video progress");
    }
    return response.json();
  },

  /**
   * Mark video as completed
   */
  async markCompleted(videoId: string): Promise<Video> {
    const response = await fetch(`/api/videos/${videoId}/complete`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to mark video as completed");
    }
    return response.json();
  },

  /**
   * Create annotation
   */
  async createAnnotation(
    videoId: string,
    data: CreateAnnotationInput
  ): Promise<VideoAnnotation> {
    const response = await fetch(`/api/videos/${videoId}/annotations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to create annotation");
    }
    return response.json();
  },

  /**
   * Delete annotation
   */
  async deleteAnnotation(videoId: string, annotationId: string): Promise<void> {
    const response = await fetch(
      `/api/videos/${videoId}/annotations/${annotationId}`,
      {
        method: "DELETE",
      }
    );
    if (!response.ok) {
      throw new Error("Failed to delete annotation");
    }
  },
};

/**
 * Hook to fetch list of videos
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useVideos({ status: 'IN_PROGRESS' });
 * ```
 */
export function useVideos(
  filters?: VideoListFilters,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<Video>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.videos.list(filters as Record<string, unknown>),
    queryFn: () => videosApi.getVideos(filters),
    ...options,
  });
}

/**
 * Hook to fetch a single video with details
 *
 * @example
 * ```tsx
 * const { data: video, isLoading } = useVideo("video-123");
 * ```
 */
export function useVideo(
  id: string,
  options?: Omit<
    UseQueryOptions<VideoWithDetails, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.videos.detail(id),
    queryFn: () => videosApi.getVideo(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook to import a new video
 *
 * @example
 * ```tsx
 * const importVideo = useImportVideo();
 *
 * importVideo.mutate({
 *   title: "My Video",
 *   videoUrl: "https://example.com/video.mp4",
 *   duration: 3600,
 * });
 * ```
 */
export function useImportVideo(
  options?: Omit<
    UseMutationOptions<Video, Error, ImportVideoInput>,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => videosApi.importVideo(data),
    onSuccess: () => {
      // Invalidate video lists to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.lists() });
    },
    ...options,
  });
}

/**
 * Hook to update video metadata
 *
 * @example
 * ```tsx
 * const updateVideo = useUpdateVideo();
 *
 * updateVideo.mutate({
 *   id: "video-123",
 *   data: { title: "Updated Title" }
 * });
 * ```
 */
export function useUpdateVideo(
  options?: Omit<
    UseMutationOptions<Video, Error, { id: string; data: UpdateVideoInput }>,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => videosApi.updateVideo(id, data),
    onSuccess: (updatedVideo) => {
      // Update the single video query
      queryClient.setQueryData(
        queryKeys.videos.detail(updatedVideo.id),
        (old: VideoWithDetails | undefined) =>
          old ? { ...old, ...updatedVideo } : old
      );

      // Invalidate video lists to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.lists() });
    },
    ...options,
  });
}

/**
 * Hook to delete a video
 *
 * @example
 * ```tsx
 * const deleteVideo = useDeleteVideo();
 *
 * deleteVideo.mutate("video-123", {
 *   onSuccess: () => {
 *     navigate("/videos");
 *   }
 * });
 * ```
 */
export function useDeleteVideo(
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => videosApi.deleteVideo(id),
    onSuccess: (_data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.videos.detail(id) });

      // Invalidate video lists to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.lists() });
    },
    ...options,
  });
}

/**
 * Hook to update video progress
 *
 * @example
 * ```tsx
 * const updateProgress = useUpdateVideoProgress();
 *
 * updateProgress.mutate({
 *   videoId: "video-123",
 *   data: { position: 120, status: "IN_PROGRESS" }
 * });
 * ```
 */
export function useUpdateVideoProgress(
  options?: Omit<
    UseMutationOptions<
      Video,
      Error,
      { videoId: string; data: UpdateVideoProgressInput }
    >,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ videoId, data }) => videosApi.updateProgress(videoId, data),
    onSuccess: (updatedVideo) => {
      // Update the video detail if it's in cache
      queryClient.setQueryData(
        queryKeys.videos.detail(updatedVideo.id),
        (old: VideoWithDetails | undefined) =>
          old
            ? {
                ...old,
                position: updatedVideo.position,
                status: updatedVideo.status,
                lastWatchedAt: updatedVideo.lastWatchedAt,
              }
            : old
      );

      // Invalidate lists to update status
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.lists() });
    },
    ...options,
  });
}

/**
 * Hook to mark a video as completed
 *
 * @example
 * ```tsx
 * const markCompleted = useMarkVideoCompleted();
 *
 * markCompleted.mutate("video-123");
 * ```
 */
export function useMarkVideoCompleted(
  options?: Omit<UseMutationOptions<Video, Error, string>, "mutationFn">
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (videoId) => videosApi.markCompleted(videoId),
    onSuccess: (updatedVideo) => {
      // Update the video detail if it's in cache
      queryClient.setQueryData(
        queryKeys.videos.detail(updatedVideo.id),
        (old: VideoWithDetails | undefined) =>
          old
            ? {
                ...old,
                status: updatedVideo.status,
                completedAt: updatedVideo.completedAt,
              }
            : old
      );

      // Invalidate lists to update counts
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.lists() });
    },
    ...options,
  });
}

/**
 * Hook to create a video annotation
 *
 * @example
 * ```tsx
 * const createAnnotation = useCreateVideoAnnotation();
 *
 * createAnnotation.mutate({
 *   videoId: "video-123",
 *   data: { timestamp: 120, content: "Important point here!" }
 * });
 * ```
 */
export function useCreateVideoAnnotation(
  options?: Omit<
    UseMutationOptions<
      VideoAnnotation,
      Error,
      { videoId: string; data: CreateAnnotationInput }
    >,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ videoId, data }) =>
      videosApi.createAnnotation(videoId, data),
    onSuccess: (newAnnotation) => {
      // Invalidate the video detail to refetch with new annotation
      queryClient.invalidateQueries({
        queryKey: queryKeys.videos.detail(newAnnotation.videoId),
      });
    },
    ...options,
  });
}

/**
 * Hook to delete a video annotation
 *
 * @example
 * ```tsx
 * const deleteAnnotation = useDeleteVideoAnnotation();
 *
 * deleteAnnotation.mutate({
 *   videoId: "video-123",
 *   annotationId: "annotation-456"
 * });
 * ```
 */
export function useDeleteVideoAnnotation(
  options?: Omit<
    UseMutationOptions<void, Error, { videoId: string; annotationId: string }>,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ videoId, annotationId }) =>
      videosApi.deleteAnnotation(videoId, annotationId),
    onSuccess: (_data, variables) => {
      // Invalidate the video detail to refetch without deleted annotation
      queryClient.invalidateQueries({
        queryKey: queryKeys.videos.detail(variables.videoId),
      });
    },
    ...options,
  });
}

/**
 * Prefetch a video's data before navigation
 */
export function usePrefetchVideo() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.videos.detail(id),
      queryFn: () => videosApi.getVideo(id),
    });
  };
}
