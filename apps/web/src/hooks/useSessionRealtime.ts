/**
 * useSessionRealtime Hook
 *
 * Provides real-time updates for live reading sessions using polling.
 * Fetches messages and sync state at configurable intervals.
 *
 * Features:
 * - Automatic polling for messages and sync state
 * - Optimistic updates for sent messages
 * - Page sync following for participants
 * - Presence tracking for active participants
 *
 * @example
 * ```tsx
 * const {
 *   messages,
 *   participants,
 *   currentPage,
 *   sendMessage,
 *   updatePage,
 *   toggleSync,
 * } = useSessionRealtime(sessionId, { pollInterval: 2000 });
 * ```
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";

// ============================================================================
// Types
// ============================================================================

/**
 * User info in messages
 */
export type SessionUser = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Session message
 */
export type SessionMessage = {
  id: string;
  type: "CHAT" | "SYSTEM" | "HIGHLIGHT" | "QUESTION" | "ANNOTATION";
  content: string;
  pageNumber: number | null;
  user: SessionUser;
  createdAt: string;
};

/**
 * Participant sync info
 */
export type SessionParticipant = {
  id: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isHost: boolean;
  isModerator: boolean;
  isSynced: boolean;
  currentPage: number;
  lastActiveAt: string;
};

/**
 * Messages response from API
 */
export type MessagesResponse = {
  messages: SessionMessage[];
  hasMore: boolean;
  cursor: string | null;
};

/**
 * Sync state response from API
 */
export type SyncStateResponse = {
  sessionId: string;
  status: string;
  currentPage: number;
  currentSpeed: number | null;
  syncEnabled: boolean;
  totalPageTurns: number;
  lastPageUpdate: string | null;
  participants: SessionParticipant[];
  participantCount: number;
};

/**
 * Send message input
 */
export type SendMessageInput = {
  content: string;
  type?: "CHAT" | "HIGHLIGHT" | "QUESTION" | "ANNOTATION";
  pageNumber?: number | null;
};

/**
 * Update page input
 */
export type UpdatePageInput = {
  currentPage: number;
  eventType?: "TURN" | "JUMP" | "SYNC";
};

/**
 * Hook options
 */
export type UseSessionRealtimeOptions = {
  /** Polling interval in milliseconds (default: 2000) */
  pollInterval?: number;
  /** Whether to enable polling (default: true) */
  enabled?: boolean;
  /** Whether to auto-sync page with host (default: true) */
  autoSync?: boolean;
};

/**
 * Hook return type
 */
export type UseSessionRealtimeReturn = {
  // Messages
  messages: SessionMessage[];
  isLoadingMessages: boolean;
  messagesError: Error | null;
  hasMoreMessages: boolean;
  loadMoreMessages: () => void;

  // Sync state
  syncState: SyncStateResponse | null;
  isLoadingSync: boolean;
  syncError: Error | null;
  currentPage: number;
  participants: SessionParticipant[];
  isHost: boolean;
  isSynced: boolean;

  // Actions
  sendMessage: (input: SendMessageInput) => Promise<void>;
  isSendingMessage: boolean;
  updatePage: (input: UpdatePageInput) => Promise<void>;
  isUpdatingPage: boolean;
  toggleSync: (synced: boolean) => Promise<void>;

  // Status
  isConnected: boolean;
  sessionStatus: string | null;
};

// ============================================================================
// Constants
// ============================================================================

/**
 * Default polling interval (2 seconds)
 */
export const DEFAULT_POLL_INTERVAL = 2000;

/**
 * Minimum polling interval (500ms)
 */
export const MIN_POLL_INTERVAL = 500;

/**
 * Maximum messages to keep in memory
 */
export const MAX_MESSAGES_IN_MEMORY = 200;

/**
 * Stale time for messages (matches poll interval)
 */
export const MESSAGES_STALE_TIME = 1000;

/**
 * Stale time for sync state (shorter for responsiveness)
 */
export const SYNC_STALE_TIME = 500;

// ============================================================================
// Query Keys
// ============================================================================

export const sessionRealtimeKeys = {
  all: ["session-realtime"] as const,
  messages: (sessionId: string) =>
    [...sessionRealtimeKeys.all, "messages", sessionId] as const,
  sync: (sessionId: string) =>
    [...sessionRealtimeKeys.all, "sync", sessionId] as const,
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch messages from API
 */
export async function fetchMessages(
  sessionId: string,
  token: string | null,
  cursor?: string,
  since?: string
): Promise<MessagesResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (since) params.set("since", since);
  params.set("limit", "50");

  const url = `/api/sessions/${sessionId}/messages?${params.toString()}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch messages");
  }

  const data = (await response.json()) as { data: MessagesResponse };
  return data.data;
}

/**
 * Fetch sync state from API
 */
export async function fetchSyncState(
  sessionId: string,
  token: string | null
): Promise<SyncStateResponse> {
  const url = `/api/sessions/${sessionId}/sync`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch sync state");
  }

  const data = (await response.json()) as { data: SyncStateResponse };
  return data.data;
}

/**
 * Send a message
 */
export async function postMessage(
  sessionId: string,
  token: string,
  input: SendMessageInput
): Promise<SessionMessage> {
  const response = await fetch(`/api/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = (await response.json()) as { error?: string };
    throw new Error(error.error ?? "Failed to send message");
  }

  const data = (await response.json()) as {
    data: { message: SessionMessage };
  };
  return data.data.message;
}

/**
 * Update page position
 */
export async function postPageUpdate(
  sessionId: string,
  token: string,
  input: UpdatePageInput
): Promise<{ currentPage: number; totalPageTurns: number }> {
  const response = await fetch(`/api/sessions/${sessionId}/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = (await response.json()) as { error?: string };
    throw new Error(error.error ?? "Failed to update page");
  }

  const data = (await response.json()) as {
    data: { currentPage: number; totalPageTurns: number };
  };
  return data.data;
}

/**
 * Update participant sync status
 */
export async function patchParticipantSync(
  sessionId: string,
  token: string,
  isSynced: boolean,
  currentPage: number
): Promise<void> {
  const response = await fetch(`/api/sessions/${sessionId}/sync`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ isSynced, currentPage }),
  });

  if (!response.ok) {
    const error = (await response.json()) as { error?: string };
    throw new Error(error.error ?? "Failed to update sync status");
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Merge new messages with existing, deduplicating
 */
export function mergeMessages(
  existing: SessionMessage[],
  incoming: SessionMessage[]
): SessionMessage[] {
  const existingIds = new Set(existing.map((m) => m.id));
  const newMessages = incoming.filter((m) => !existingIds.has(m.id));

  const merged = [...existing, ...newMessages];

  // Sort by createdAt descending (newest first for display)
  merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Limit to MAX_MESSAGES_IN_MEMORY
  return merged.slice(0, MAX_MESSAGES_IN_MEMORY);
}

/**
 * Get latest message timestamp for polling
 */
export function getLatestMessageTime(
  messages: SessionMessage[]
): string | undefined {
  if (messages.length === 0) return undefined;
  // Messages are sorted newest first
  return messages[0]?.createdAt;
}

/**
 * Check if user is participant in session
 */
export function isUserParticipant(
  participants: SessionParticipant[],
  userId: string
): boolean {
  return participants.some((p) => p.userId === userId);
}

/**
 * Check if user is host
 */
export function isUserHost(
  participants: SessionParticipant[],
  userId: string
): boolean {
  return participants.some((p) => p.userId === userId && p.isHost);
}

/**
 * Get user's sync status
 */
export function getUserSyncStatus(
  participants: SessionParticipant[],
  userId: string
): boolean {
  const participant = participants.find((p) => p.userId === userId);
  return participant?.isSynced ?? false;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook for real-time session updates
 */
export function useSessionRealtime(
  sessionId: string,
  options: UseSessionRealtimeOptions = {}
): UseSessionRealtimeReturn {
  const {
    pollInterval = DEFAULT_POLL_INTERVAL,
    enabled = true,
    autoSync = true,
  } = options;

  const queryClient = useQueryClient();
  const { getToken, userId } = useAuth();
  const lastSyncPageRef = useRef<number>(0);

  // Ensure minimum poll interval
  const safePollInterval = Math.max(pollInterval, MIN_POLL_INTERVAL);

  // ============================================================================
  // Messages Query
  // ============================================================================

  const messagesQuery = useQuery({
    queryKey: sessionRealtimeKeys.messages(sessionId),
    queryFn: async () => {
      const token = await getToken();
      return fetchMessages(sessionId, token);
    },
    enabled,
    staleTime: MESSAGES_STALE_TIME,
    refetchInterval: safePollInterval,
    refetchIntervalInBackground: false,
  });

  // ============================================================================
  // Sync State Query
  // ============================================================================

  const syncQuery = useQuery({
    queryKey: sessionRealtimeKeys.sync(sessionId),
    queryFn: async () => {
      const token = await getToken();
      return fetchSyncState(sessionId, token);
    },
    enabled,
    staleTime: SYNC_STALE_TIME,
    refetchInterval: safePollInterval,
    refetchIntervalInBackground: false,
  });

  // ============================================================================
  // Auto-sync with host page
  // ============================================================================

  useEffect(() => {
    if (!autoSync || !syncQuery.data || !userId) return;

    const { currentPage, participants } = syncQuery.data;
    const participant = participants.find((p) => p.userId === userId);

    // If user is synced and host page changed, update our local state
    if (
      participant?.isSynced &&
      currentPage !== lastSyncPageRef.current &&
      !participant.isHost
    ) {
      lastSyncPageRef.current = currentPage;
      // Trigger any page sync callbacks here if needed
    }
  }, [syncQuery.data, userId, autoSync]);

  // ============================================================================
  // Send Message Mutation
  // ============================================================================

  const sendMessageMutation = useMutation({
    mutationFn: async (input: SendMessageInput) => {
      const token = await getToken();
      if (!token) throw new Error("Authentication required");
      return postMessage(sessionId, token, input);
    },
    onSuccess: (newMessage) => {
      // Optimistically add message to cache
      queryClient.setQueryData<MessagesResponse>(
        sessionRealtimeKeys.messages(sessionId),
        (old) => {
          if (!old)
            return { messages: [newMessage], hasMore: false, cursor: null };
          return {
            ...old,
            messages: mergeMessages(old.messages, [newMessage]),
          };
        }
      );
    },
  });

  // ============================================================================
  // Update Page Mutation
  // ============================================================================

  const updatePageMutation = useMutation({
    mutationFn: async (input: UpdatePageInput) => {
      const token = await getToken();
      if (!token) throw new Error("Authentication required");
      return postPageUpdate(sessionId, token, input);
    },
    onSuccess: (result) => {
      // Update sync state cache
      queryClient.setQueryData<SyncStateResponse>(
        sessionRealtimeKeys.sync(sessionId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            currentPage: result.currentPage,
            totalPageTurns: result.totalPageTurns,
          };
        }
      );
      lastSyncPageRef.current = result.currentPage;
    },
  });

  // ============================================================================
  // Toggle Sync Mutation
  // ============================================================================

  const toggleSyncMutation = useMutation({
    mutationFn: async (synced: boolean) => {
      const token = await getToken();
      if (!token) throw new Error("Authentication required");
      const currentPage = syncQuery.data?.currentPage ?? 0;
      return patchParticipantSync(sessionId, token, synced, currentPage);
    },
    onSuccess: () => {
      // Refetch sync state to get updated participant info
      queryClient.invalidateQueries({
        queryKey: sessionRealtimeKeys.sync(sessionId),
      });
    },
  });

  // ============================================================================
  // Load More Messages
  // ============================================================================

  const loadMoreMessages = useCallback(() => {
    const currentMessages = messagesQuery.data?.messages ?? [];
    const cursor = currentMessages[currentMessages.length - 1]?.id;

    if (!cursor || !messagesQuery.data?.hasMore) return;

    getToken().then((token) => {
      fetchMessages(sessionId, token, cursor).then((moreMessages) => {
        queryClient.setQueryData<MessagesResponse>(
          sessionRealtimeKeys.messages(sessionId),
          (old) => {
            if (!old) return moreMessages;
            return {
              messages: mergeMessages(old.messages, moreMessages.messages),
              hasMore: moreMessages.hasMore,
              cursor: moreMessages.cursor,
            };
          }
        );
      });
    });
  }, [messagesQuery.data, sessionId, getToken, queryClient]);

  // ============================================================================
  // Derived State
  // ============================================================================

  const messages = messagesQuery.data?.messages ?? [];
  const participants = syncQuery.data?.participants ?? [];
  const currentPage = syncQuery.data?.currentPage ?? 0;
  const isHost = userId ? isUserHost(participants, userId) : false;
  const isSynced = userId ? getUserSyncStatus(participants, userId) : false;
  const sessionStatus = syncQuery.data?.status ?? null;

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Messages
    messages,
    isLoadingMessages: messagesQuery.isLoading,
    messagesError: messagesQuery.error,
    hasMoreMessages: messagesQuery.data?.hasMore ?? false,
    loadMoreMessages,

    // Sync state
    syncState: syncQuery.data ?? null,
    isLoadingSync: syncQuery.isLoading,
    syncError: syncQuery.error,
    currentPage,
    participants,
    isHost,
    isSynced,

    // Actions
    sendMessage: async (input: SendMessageInput) => {
      await sendMessageMutation.mutateAsync(input);
    },
    isSendingMessage: sendMessageMutation.isPending,
    updatePage: async (input: UpdatePageInput) => {
      await updatePageMutation.mutateAsync(input);
    },
    isUpdatingPage: updatePageMutation.isPending,
    toggleSync: async (synced: boolean) => {
      await toggleSyncMutation.mutateAsync(synced);
    },

    // Status
    isConnected: !messagesQuery.isError && !syncQuery.isError,
    sessionStatus,
  };
}
