/**
 * React Query hooks for TTS download management
 *
 * Provides hooks for:
 * - Fetching user's TTS downloads
 * - Creating new TTS downloads
 * - Fetching individual download details
 * - Deleting downloads
 * - Polling download status
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

export type DownloadStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";
export type TTSProvider = "WEB_SPEECH" | "OPENAI" | "ELEVENLABS";
export type AudioFormat = "MP3" | "OPUS" | "AAC" | "FLAC" | "WAV" | "PCM";

export interface TTSDownload {
  id: string;
  bookId: string;
  bookTitle: string;
  status: DownloadStatus;
  provider: TTSProvider;
  voice: string;
  format: AudioFormat;
  totalChunks: number;
  processedChunks: number;
  progress: number;
  totalCharacters: number;
  estimatedCost: number;
  actualCost: number;
  fileSize?: number;
  downloadUrl?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
}

export interface DownloadQuota {
  used: number;
  limit: number | "unlimited";
  remaining: number | "unlimited";
}

export interface DownloadsListResponse {
  success: boolean;
  downloads: TTSDownload[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  quota: DownloadQuota;
}

export interface CreateDownloadRequest {
  bookId: string;
  bookTitle: string;
  text: string;
  voice?: string;
  format?: AudioFormat;
}

export interface CreateDownloadResponse {
  success: boolean;
  download: {
    id: string;
    status: DownloadStatus;
    provider: TTSProvider;
    voice: string;
    format: AudioFormat;
    totalChunks: number;
    totalCharacters: number;
    estimatedCost: number;
    expiresAt: string;
    createdAt: string;
  };
  quota: {
    used: number;
    limit: number | "unlimited";
    remaining: number | "unlimited";
  };
}

// ============================================================================
// Query Keys
// ============================================================================

export const ttsDownloadKeys = {
  all: ["tts-downloads"] as const,
  lists: () => [...ttsDownloadKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...ttsDownloadKeys.lists(), filters] as const,
  details: () => [...ttsDownloadKeys.all, "detail"] as const,
  detail: (id: string) => [...ttsDownloadKeys.details(), id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch all TTS downloads for the current user
 */
export function useTTSDownloads(
  options?: {
    limit?: number;
    offset?: number;
    status?: DownloadStatus;
  },
  queryOptions?: Omit<
    UseQueryOptions<DownloadsListResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  const params = new URLSearchParams();
  if (options?.limit) params.append("limit", options.limit.toString());
  if (options?.offset) params.append("offset", options.offset.toString());
  if (options?.status) params.append("status", options.status);

  const queryString = params.toString();
  const url = `/api/tts/downloads${queryString ? `?${queryString}` : ""}`;

  return useQuery<DownloadsListResponse, Error>({
    queryKey: ttsDownloadKeys.list(options),
    queryFn: () => apiRequest<DownloadsListResponse>(url),
    ...queryOptions,
  });
}

/**
 * Fetch a single TTS download by ID
 */
export function useTTSDownload(
  downloadId: string,
  options?: Omit<
    UseQueryOptions<{ success: boolean; download: TTSDownload }, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<{ success: boolean; download: TTSDownload }, Error>({
    queryKey: ttsDownloadKeys.detail(downloadId),
    queryFn: () =>
      apiRequest<{ success: boolean; download: TTSDownload }>(
        `/api/tts/downloads/${downloadId}`
      ),
    enabled: !!downloadId,
    ...options,
  });
}

/**
 * Poll download status with automatic refetching
 *
 * Polls every 5 seconds while download is PENDING or PROCESSING
 * Stops polling when download is COMPLETED, FAILED, or CANCELLED
 */
export function useTTSDownloadStatus(
  downloadId: string,
  options?: Omit<
    UseQueryOptions<{ success: boolean; download: TTSDownload }, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useTTSDownload(downloadId, {
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const status = data.download.status;
      // Poll every 5 seconds if still processing
      if (status === "PENDING" || status === "PROCESSING") {
        return 5000;
      }
      // Stop polling if completed, failed, or cancelled
      return false;
    },
    ...options,
  });
}

/**
 * Create a new TTS download
 */
export function useCreateTTSDownload(
  options?: UseMutationOptions<
    CreateDownloadResponse,
    Error,
    CreateDownloadRequest
  >
) {
  const queryClient = useQueryClient();

  return useMutation<CreateDownloadResponse, Error, CreateDownloadRequest>({
    mutationFn: (request) =>
      apiRequest<CreateDownloadResponse>("/api/tts/download", {
        method: "POST",
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      // Invalidate downloads list to show new download
      queryClient.invalidateQueries({ queryKey: ttsDownloadKeys.lists() });
    },
    ...options,
  });
}

/**
 * Delete a TTS download
 */
export function useDeleteTTSDownload(
  options?: UseMutationOptions<
    { success: boolean; message: string; downloadId: string },
    Error,
    string
  >
) {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string; downloadId: string },
    Error,
    string
  >({
    mutationFn: (downloadId) =>
      apiRequest<{ success: boolean; message: string; downloadId: string }>(
        `/api/tts/downloads/${downloadId}`,
        {
          method: "DELETE",
        }
      ),
    onSuccess: (_data, downloadId) => {
      // Invalidate lists and remove specific download from cache
      queryClient.invalidateQueries({ queryKey: ttsDownloadKeys.lists() });
      queryClient.removeQueries({
        queryKey: ttsDownloadKeys.detail(downloadId),
      });
    },
    ...options,
  });
}
