import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryClient";

/**
 * Episode status enum
 */
export type EpisodeStatus = "NEW" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";

/**
 * Podcast episode type
 */
export interface PodcastEpisode {
  id: string;
  podcastId: string;
  title: string;
  description: string | null;
  audioUrl: string;
  duration: number; // in seconds
  publishedAt: string;
  status: EpisodeStatus;
  position: number; // current playback position in seconds
  completedAt: string | null;
}

/**
 * Podcast type
 */
export interface Podcast {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  coverImage: string | null;
  rssUrl: string;
  episodeCount: number;
  newEpisodeCount: number;
  subscribedAt: string;
  updatedAt: string;
  autoDownload: boolean;
  notifyNewEpisodes: boolean;
  playbackSpeed: number;
}

/**
 * Podcast with episodes
 */
export interface PodcastWithEpisodes extends Podcast {
  episodes: PodcastEpisode[];
}

/**
 * Podcast list filters
 */
export interface PodcastListFilters {
  search?: string | undefined;
  hasNewEpisodes?: boolean | undefined;
  sortBy?:
    | "title"
    | "author"
    | "subscribedAt"
    | "updatedAt"
    | "episodeCount"
    | undefined;
  sortDirection?: "asc" | "desc" | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

/**
 * Episode list filters
 */
export interface EpisodeListFilters {
  search?: string;
  status?: EpisodeStatus;
  unlistenedOnly?: boolean;
  sortBy?: "title" | "publishedAt" | "duration" | "status";
  sortDirection?: "asc" | "desc";
  page?: number;
  limit?: number;
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
 * Subscribe to podcast input
 */
export interface SubscribeToPodcastInput {
  rssUrl: string;
  source?: "RSS_FEED" | "APPLE_PODCASTS" | "SPOTIFY" | "MANUAL";
}

/**
 * Update podcast input
 */
export interface UpdatePodcastInput {
  autoDownload?: boolean;
  notifyNewEpisodes?: boolean;
  playbackSpeed?: number;
}

/**
 * Update episode progress input
 */
export interface UpdateEpisodeProgressInput {
  position: number;
  status?: EpisodeStatus;
}

/**
 * API client for podcasts endpoints
 */
const podcastsApi = {
  /**
   * Fetch list of subscribed podcasts
   */
  async getPodcasts(
    filters?: PodcastListFilters
  ): Promise<PaginatedResponse<Podcast>> {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.hasNewEpisodes !== undefined)
      params.set("hasNewEpisodes", String(filters.hasNewEpisodes));
    if (filters?.sortBy) params.set("sortBy", filters.sortBy);
    if (filters?.sortDirection)
      params.set("sortDirection", filters.sortDirection);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));

    const response = await fetch(`/api/podcasts?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Failed to fetch podcasts");
    }
    return response.json();
  },

  /**
   * Fetch a single podcast by ID with episodes
   */
  async getPodcast(id: string): Promise<PodcastWithEpisodes> {
    const response = await fetch(`/api/podcasts/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch podcast");
    }
    return response.json();
  },

  /**
   * Subscribe to a new podcast via RSS URL
   */
  async subscribeToPodcast(data: SubscribeToPodcastInput): Promise<Podcast> {
    const response = await fetch("/api/podcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to subscribe to podcast");
    }
    return response.json();
  },

  /**
   * Update podcast settings
   */
  async updatePodcast(id: string, data: UpdatePodcastInput): Promise<Podcast> {
    const response = await fetch(`/api/podcasts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to update podcast");
    }
    return response.json();
  },

  /**
   * Unsubscribe from a podcast
   */
  async unsubscribePodcast(id: string): Promise<void> {
    const response = await fetch(`/api/podcasts/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to unsubscribe from podcast");
    }
  },

  /**
   * Fetch episodes for a podcast
   */
  async getEpisodes(
    podcastId: string,
    filters?: EpisodeListFilters
  ): Promise<PaginatedResponse<PodcastEpisode>> {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.unlistenedOnly !== undefined)
      params.set("unlistenedOnly", String(filters.unlistenedOnly));
    if (filters?.sortBy) params.set("sortBy", filters.sortBy);
    if (filters?.sortDirection)
      params.set("sortDirection", filters.sortDirection);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));

    const response = await fetch(
      `/api/podcasts/${podcastId}/episodes?${params.toString()}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch episodes");
    }
    return response.json();
  },

  /**
   * Update episode progress
   */
  async updateEpisodeProgress(
    podcastId: string,
    episodeId: string,
    data: UpdateEpisodeProgressInput
  ): Promise<PodcastEpisode> {
    const response = await fetch(
      `/api/podcasts/${podcastId}/episodes/${episodeId}/progress`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      throw new Error("Failed to update episode progress");
    }
    return response.json();
  },

  /**
   * Mark episode as completed
   */
  async markEpisodeCompleted(
    podcastId: string,
    episodeId: string
  ): Promise<PodcastEpisode> {
    const response = await fetch(
      `/api/podcasts/${podcastId}/episodes/${episodeId}/complete`,
      {
        method: "POST",
      }
    );
    if (!response.ok) {
      throw new Error("Failed to mark episode as completed");
    }
    return response.json();
  },

  /**
   * Refresh podcast feed (fetch new episodes)
   */
  async refreshPodcast(id: string): Promise<Podcast> {
    const response = await fetch(`/api/podcasts/${id}/refresh`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to refresh podcast");
    }
    return response.json();
  },
};

/**
 * Hook to fetch list of subscribed podcasts
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = usePodcasts({ hasNewEpisodes: true });
 * ```
 */
export function usePodcasts(
  filters?: PodcastListFilters,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<Podcast>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.podcasts.list(filters as Record<string, unknown>),
    queryFn: () => podcastsApi.getPodcasts(filters),
    ...options,
  });
}

/**
 * Hook to fetch a single podcast with episodes
 *
 * @example
 * ```tsx
 * const { data: podcast, isLoading } = usePodcast("podcast-123");
 * ```
 */
export function usePodcast(
  id: string,
  options?: Omit<
    UseQueryOptions<PodcastWithEpisodes, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.podcasts.detail(id),
    queryFn: () => podcastsApi.getPodcast(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook to subscribe to a new podcast
 *
 * @example
 * ```tsx
 * const subscribe = useSubscribeToPodcast();
 *
 * subscribe.mutate({ rssUrl: "https://example.com/feed.xml" });
 * ```
 */
export function useSubscribeToPodcast(
  options?: Omit<
    UseMutationOptions<Podcast, Error, SubscribeToPodcastInput>,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => podcastsApi.subscribeToPodcast(data),
    onSuccess: () => {
      // Invalidate podcast lists to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.podcasts.lists() });
    },
    ...options,
  });
}

/**
 * Hook to update podcast settings
 *
 * @example
 * ```tsx
 * const updatePodcast = useUpdatePodcast();
 *
 * updatePodcast.mutate({
 *   id: "podcast-123",
 *   data: { playbackSpeed: 1.5 }
 * });
 * ```
 */
export function useUpdatePodcast(
  options?: Omit<
    UseMutationOptions<
      Podcast,
      Error,
      { id: string; data: UpdatePodcastInput }
    >,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => podcastsApi.updatePodcast(id, data),
    onSuccess: (updatedPodcast) => {
      // Update the single podcast query
      queryClient.setQueryData(
        queryKeys.podcasts.detail(updatedPodcast.id),
        (old: PodcastWithEpisodes | undefined) =>
          old ? { ...old, ...updatedPodcast } : old
      );

      // Invalidate podcast lists to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.podcasts.lists() });
    },
    ...options,
  });
}

/**
 * Hook to unsubscribe from a podcast
 *
 * @example
 * ```tsx
 * const unsubscribe = useUnsubscribePodcast();
 *
 * unsubscribe.mutate("podcast-123", {
 *   onSuccess: () => {
 *     navigate("/podcasts");
 *   }
 * });
 * ```
 */
export function useUnsubscribePodcast(
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => podcastsApi.unsubscribePodcast(id),
    onSuccess: (_data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.podcasts.detail(id) });

      // Invalidate podcast lists to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.podcasts.lists() });
    },
    ...options,
  });
}

/**
 * Hook to fetch episodes for a podcast
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useEpisodes("podcast-123", { unlistenedOnly: true });
 * ```
 */
export function useEpisodes(
  podcastId: string,
  filters?: EpisodeListFilters,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<PodcastEpisode>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: [
      ...queryKeys.podcasts.episodes(podcastId),
      filters as Record<string, unknown>,
    ],
    queryFn: () => podcastsApi.getEpisodes(podcastId, filters),
    enabled: !!podcastId,
    ...options,
  });
}

/**
 * Hook to update episode progress
 *
 * @example
 * ```tsx
 * const updateProgress = useUpdateEpisodeProgress();
 *
 * updateProgress.mutate({
 *   podcastId: "podcast-123",
 *   episodeId: "episode-456",
 *   data: { position: 120, status: "IN_PROGRESS" }
 * });
 * ```
 */
export function useUpdateEpisodeProgress(
  options?: Omit<
    UseMutationOptions<
      PodcastEpisode,
      Error,
      {
        podcastId: string;
        episodeId: string;
        data: UpdateEpisodeProgressInput;
      }
    >,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ podcastId, episodeId, data }) =>
      podcastsApi.updateEpisodeProgress(podcastId, episodeId, data),
    onSuccess: (updatedEpisode) => {
      // Invalidate episodes to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.podcasts.episodes(updatedEpisode.podcastId),
      });

      // Update the podcast detail if it's in cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.podcasts.detail(updatedEpisode.podcastId),
      });
    },
    ...options,
  });
}

/**
 * Hook to mark an episode as completed
 *
 * @example
 * ```tsx
 * const markCompleted = useMarkEpisodeCompleted();
 *
 * markCompleted.mutate({
 *   podcastId: "podcast-123",
 *   episodeId: "episode-456"
 * });
 * ```
 */
export function useMarkEpisodeCompleted(
  options?: Omit<
    UseMutationOptions<
      PodcastEpisode,
      Error,
      { podcastId: string; episodeId: string }
    >,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ podcastId, episodeId }) =>
      podcastsApi.markEpisodeCompleted(podcastId, episodeId),
    onSuccess: (updatedEpisode) => {
      // Invalidate episodes to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.podcasts.episodes(updatedEpisode.podcastId),
      });

      // Update the podcast detail if it's in cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.podcasts.detail(updatedEpisode.podcastId),
      });

      // Invalidate lists to update new episode counts
      queryClient.invalidateQueries({
        queryKey: queryKeys.podcasts.lists(),
      });
    },
    ...options,
  });
}

/**
 * Hook to refresh a podcast's feed
 *
 * @example
 * ```tsx
 * const refresh = useRefreshPodcast();
 *
 * refresh.mutate("podcast-123");
 * ```
 */
export function useRefreshPodcast(
  options?: Omit<UseMutationOptions<Podcast, Error, string>, "mutationFn">
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => podcastsApi.refreshPodcast(id),
    onSuccess: (updatedPodcast) => {
      // Invalidate the podcast detail and episodes
      queryClient.invalidateQueries({
        queryKey: queryKeys.podcasts.detail(updatedPodcast.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.podcasts.episodes(updatedPodcast.id),
      });

      // Invalidate lists to update episode counts
      queryClient.invalidateQueries({
        queryKey: queryKeys.podcasts.lists(),
      });
    },
    ...options,
  });
}

/**
 * Prefetch a podcast's data before navigation
 */
export function usePrefetchPodcast() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.podcasts.detail(id),
      queryFn: () => podcastsApi.getPodcast(id),
    });
  };
}
