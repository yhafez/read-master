/**
 * Live Session Page
 *
 * Displays a live reading session with:
 * - Session info (title, book, host)
 * - Synchronized reading view
 * - Real-time chat sidebar
 * - Participant list
 * - Host controls for page sync
 *
 * Features:
 * - Real-time updates via polling
 * - Page synchronization with host
 * - Chat messaging
 * - Join/leave session actions
 */

import React, { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Avatar,
  Stack,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Drawer,
  useTheme,
  useMediaQuery,
  Paper,
} from "@mui/material";
import {
  PlayArrowOutlined,
  PauseOutlined,
  StopOutlined,
  SyncOutlined,
  SyncDisabledOutlined,
  ChatOutlined,
  PeopleOutline,
  NavigateBeforeOutlined,
  NavigateNextOutlined,
  ArrowBackOutlined,
  BookOutlined,
  PersonOutlined,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow, format } from "date-fns";
import { SessionChat, SessionParticipants } from "@/components/sessions";
import { useSessionRealtime } from "@/hooks/useSessionRealtime";

// ============================================================================
// Types
// ============================================================================

type SessionDetailResponse = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  currentPage: number;
  currentSpeed: number | null;
  isPublic: boolean;
  allowChat: boolean;
  syncEnabled: boolean;
  maxParticipants: number;
  participantCount: number;
  host: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  book: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
  };
  isParticipant: boolean;
  isHost: boolean;
  createdAt: string;
  scheduledAt: string | null;
  startedAt: string | null;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get status color
 */
export function getStatusColor(
  status: string
): "success" | "warning" | "error" | "default" | "info" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "PAUSED":
      return "warning";
    case "SCHEDULED":
      return "info";
    case "ENDED":
    case "CANCELLED":
      return "error";
    default:
      return "default";
  }
}

/**
 * Get status label translation key
 */
export function getStatusLabelKey(status: string): string {
  const statusMap: Record<string, string> = {
    SCHEDULED: "liveSessions.status.scheduled",
    ACTIVE: "liveSessions.status.active",
    PAUSED: "liveSessions.status.paused",
    ENDED: "liveSessions.status.ended",
    CANCELLED: "liveSessions.status.cancelled",
  };
  return statusMap[status] ?? "common.unknown";
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Get host display name
 */
export function getHostDisplayName(
  host: SessionDetailResponse["host"]
): string {
  return host.displayName ?? host.username ?? "Unknown";
}

// ============================================================================
// Main Component
// ============================================================================

export function LiveSessionPage(): React.ReactElement {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { userId: clerkUserId, getToken } = useAuth();
  const queryClient = useQueryClient();

  // UI State
  const [showChat, setShowChat] = useState(!isMobile);
  const [showParticipants, setShowParticipants] = useState(!isMobile);
  const [localPage, setLocalPage] = useState(1);

  // Fetch session details
  const {
    data: session,
    isLoading: isLoadingSession,
    error: sessionError,
  } = useQuery<SessionDetailResponse, Error>({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch(`/api/sessions/${sessionId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Failed to load session");
      }

      const data = (await response.json()) as { data: SessionDetailResponse };
      return data.data;
    },
    enabled: !!sessionId,
    staleTime: 10000,
    refetchInterval: 30000, // Refetch every 30 seconds for session status
  });

  // Real-time hook for messages and sync
  const {
    messages,
    isLoadingMessages,
    participants,
    currentPage,
    isHost,
    isSynced,
    sendMessage,
    isSendingMessage,
    updatePage,
    isUpdatingPage,
    toggleSync,
  } = useSessionRealtime(sessionId ?? "", {
    enabled: !!sessionId && session?.status === "ACTIVE",
    pollInterval: 2000,
  });

  // Join session mutation
  const joinMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const response = await fetch(`/api/sessions/${sessionId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Failed to join session");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    },
  });

  // Leave session mutation
  const leaveMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const response = await fetch(`/api/sessions/${sessionId}/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Failed to leave session");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      navigate("/sessions");
    },
  });

  // Update session status (host only)
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const token = await getToken();
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Failed to update session");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    },
  });

  // Handlers
  const handleJoin = useCallback(() => {
    joinMutation.mutate();
  }, [joinMutation]);

  const handleLeave = useCallback(() => {
    leaveMutation.mutate();
  }, [leaveMutation]);

  const handlePageChange = useCallback(
    async (newPage: number) => {
      if (!isHost || isUpdatingPage) return;
      setLocalPage(newPage);
      await updatePage({ currentPage: newPage, eventType: "TURN" });
    },
    [isHost, isUpdatingPage, updatePage]
  );

  const handleToggleSync = useCallback(async () => {
    await toggleSync(!isSynced);
  }, [isSynced, toggleSync]);

  const handleStartSession = useCallback(() => {
    updateStatusMutation.mutate("ACTIVE");
  }, [updateStatusMutation]);

  const handlePauseSession = useCallback(() => {
    updateStatusMutation.mutate("PAUSED");
  }, [updateStatusMutation]);

  const handleResumeSession = useCallback(() => {
    updateStatusMutation.mutate("ACTIVE");
  }, [updateStatusMutation]);

  const handleEndSession = useCallback(() => {
    updateStatusMutation.mutate("ENDED");
  }, [updateStatusMutation]);

  // Sync local page with session page
  React.useEffect(() => {
    if (currentPage && (isSynced || isHost)) {
      setLocalPage(currentPage);
    }
  }, [currentPage, isSynced, isHost]);

  // Loading state
  if (isLoadingSession) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (sessionError) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {sessionError.message}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackOutlined />}
          onClick={() => navigate("/sessions")}
        >
          {t("common.back")}
        </Button>
      </Box>
    );
  }

  // Not found
  if (!session) {
    return (
      <Box p={3}>
        <Alert severity="info">{t("liveSessions.errors.notFound")}</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackOutlined />}
          onClick={() => navigate("/sessions")}
          sx={{ mt: 2 }}
        >
          {t("common.back")}
        </Button>
      </Box>
    );
  }

  const isActive = session.status === "ACTIVE";
  const isPaused = session.status === "PAUSED";
  const isScheduled = session.status === "SCHEDULED";
  const isEnded = session.status === "ENDED" || session.status === "CANCELLED";

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
        >
          {/* Session Info */}
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton onClick={() => navigate("/sessions")}>
              <ArrowBackOutlined />
            </IconButton>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h5" component="h1">
                  {session.title}
                </Typography>
                <Chip
                  label={t(getStatusLabelKey(session.status))}
                  color={getStatusColor(session.status)}
                  size="small"
                />
              </Stack>
              <Stack direction="row" spacing={2} mt={0.5}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <BookOutlined fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {session.book.title}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <PersonOutlined fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {getHostDisplayName(session.host)}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          </Stack>

          {/* Actions */}
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Host Controls */}
            {session.isHost && (
              <>
                {isScheduled && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<PlayArrowOutlined />}
                    onClick={handleStartSession}
                    disabled={updateStatusMutation.isPending}
                  >
                    {t("liveSessions.start")}
                  </Button>
                )}
                {isActive && (
                  <Button
                    variant="outlined"
                    startIcon={<PauseOutlined />}
                    onClick={handlePauseSession}
                    disabled={updateStatusMutation.isPending}
                  >
                    {t("liveSessions.pause")}
                  </Button>
                )}
                {isPaused && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<PlayArrowOutlined />}
                    onClick={handleResumeSession}
                    disabled={updateStatusMutation.isPending}
                  >
                    {t("liveSessions.resume")}
                  </Button>
                )}
                {(isActive || isPaused) && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<StopOutlined />}
                    onClick={handleEndSession}
                    disabled={updateStatusMutation.isPending}
                  >
                    {t("liveSessions.end")}
                  </Button>
                )}
              </>
            )}

            {/* Participant Controls */}
            {!session.isHost && !isEnded && (
              <>
                {!session.isParticipant ? (
                  <Button
                    variant="contained"
                    onClick={handleJoin}
                    disabled={joinMutation.isPending}
                  >
                    {t("liveSessions.join")}
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    onClick={handleLeave}
                    disabled={leaveMutation.isPending}
                  >
                    {t("liveSessions.leave")}
                  </Button>
                )}
              </>
            )}

            {/* Sync Toggle (for participants) */}
            {session.isParticipant &&
              !session.isHost &&
              session.syncEnabled && (
                <Tooltip
                  title={
                    isSynced
                      ? t("liveSessions.sync.unfollow")
                      : t("liveSessions.sync.follow")
                  }
                >
                  <IconButton
                    color={isSynced ? "primary" : "default"}
                    onClick={handleToggleSync}
                  >
                    {isSynced ? <SyncOutlined /> : <SyncDisabledOutlined />}
                  </IconButton>
                </Tooltip>
              )}

            {/* Mobile toggles */}
            {isMobile && (
              <>
                <IconButton
                  color={showChat ? "primary" : "default"}
                  onClick={() => setShowChat(!showChat)}
                >
                  <ChatOutlined />
                </IconButton>
                <IconButton
                  color={showParticipants ? "primary" : "default"}
                  onClick={() => setShowParticipants(!showParticipants)}
                >
                  <PeopleOutline />
                </IconButton>
              </>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: "flex", gap: 2, overflow: "hidden" }}>
        {/* Reading Area */}
        <Paper
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Page Controls */}
          {(isActive || isPaused) && (
            <Box
              sx={{
                p: 2,
                borderBottom: 1,
                borderColor: "divider",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 2,
              }}
            >
              <IconButton
                onClick={() => handlePageChange(localPage - 1)}
                disabled={!isHost || localPage <= 1 || isUpdatingPage}
              >
                <NavigateBeforeOutlined />
              </IconButton>
              <Typography variant="h6">
                {t("liveSessions.details.currentPage")}: {localPage}
              </Typography>
              <IconButton
                onClick={() => handlePageChange(localPage + 1)}
                disabled={!isHost || isUpdatingPage}
              >
                <NavigateNextOutlined />
              </IconButton>
              {isHost && (
                <Chip
                  icon={<SyncOutlined />}
                  label={t("liveSessions.sync.youAreHost")}
                  color="primary"
                  size="small"
                />
              )}
            </Box>
          )}

          {/* Reading Content Placeholder */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              p: 3,
            }}
          >
            {isEnded ? (
              <Alert severity="info" sx={{ maxWidth: 400 }}>
                {t("liveSessions.sessionEnded")}
              </Alert>
            ) : isScheduled ? (
              <Stack spacing={2} alignItems="center">
                <Typography variant="h6" color="text.secondary">
                  {t("liveSessions.status.scheduled")}
                </Typography>
                {session.scheduledAt && (
                  <Typography variant="body1">
                    {format(new Date(session.scheduledAt), "PPpp")}
                  </Typography>
                )}
                {session.isHost && (
                  <Button
                    variant="contained"
                    startIcon={<PlayArrowOutlined />}
                    onClick={handleStartSession}
                  >
                    {t("liveSessions.start")}
                  </Button>
                )}
              </Stack>
            ) : (
              <Stack spacing={2} alignItems="center">
                <Avatar
                  {...(session.book.coverImage
                    ? { src: session.book.coverImage }
                    : {})}
                  variant="rounded"
                  sx={{ width: 120, height: 180 }}
                >
                  <BookOutlined sx={{ fontSize: 60 }} />
                </Avatar>
                <Typography variant="h6">{session.book.title}</Typography>
                {session.book.author && (
                  <Typography variant="body2" color="text.secondary">
                    {t("common.by", "by")} {session.book.author}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  {t("liveSessions.details.currentPage")}: {localPage}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/books/${session.book.id}`)}
                >
                  {t("books.viewBook", "View Book")}
                </Button>
              </Stack>
            )}
          </Box>
        </Paper>

        {/* Chat Panel (Desktop) */}
        {!isMobile && showChat && session.allowChat && (
          <Box sx={{ width: 320, flexShrink: 0 }}>
            <SessionChat
              messages={messages}
              isLoadingMessages={isLoadingMessages}
              onSendMessage={sendMessage}
              isSendingMessage={isSendingMessage}
              allowChat={session.allowChat && session.isParticipant}
              currentPage={localPage}
            />
          </Box>
        )}

        {/* Participants Panel (Desktop) */}
        {!isMobile && showParticipants && (
          <Box sx={{ width: 280, flexShrink: 0 }}>
            <SessionParticipants
              participants={participants}
              {...(clerkUserId ? { currentUserId: clerkUserId } : {})}
              maxParticipants={session.maxParticipants}
            />
          </Box>
        )}
      </Box>

      {/* Mobile Chat Drawer */}
      {isMobile && (
        <Drawer
          anchor="right"
          open={showChat}
          onClose={() => setShowChat(false)}
          PaperProps={{ sx: { width: "85%", maxWidth: 360 } }}
        >
          <Box sx={{ height: "100%" }}>
            <SessionChat
              messages={messages}
              isLoadingMessages={isLoadingMessages}
              onSendMessage={sendMessage}
              isSendingMessage={isSendingMessage}
              allowChat={session.allowChat && session.isParticipant}
              currentPage={localPage}
            />
          </Box>
        </Drawer>
      )}

      {/* Mobile Participants Drawer */}
      {isMobile && (
        <Drawer
          anchor="right"
          open={showParticipants}
          onClose={() => setShowParticipants(false)}
          PaperProps={{ sx: { width: "85%", maxWidth: 320 } }}
        >
          <SessionParticipants
            participants={participants}
            {...(clerkUserId ? { currentUserId: clerkUserId } : {})}
            maxParticipants={session.maxParticipants}
          />
        </Drawer>
      )}
    </Box>
  );
}

export default LiveSessionPage;
