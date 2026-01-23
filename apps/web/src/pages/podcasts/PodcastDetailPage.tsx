/**
 * Podcast Detail Page
 *
 * Displays podcast details and episodes with:
 * - Podcast info (title, author, description)
 * - Episode list with playback
 * - Integrated audio player
 * - Settings (playback speed, notifications)
 */

import { useState, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import UnsubscribeIcon from "@mui/icons-material/Unsubscribe";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import PodcastsIcon from "@mui/icons-material/Podcasts";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  usePodcast,
  useUpdatePodcast,
  useUnsubscribePodcast,
  useRefreshPodcast,
  useUpdateEpisodeProgress,
  useMarkEpisodeCompleted,
  type PodcastEpisode,
} from "@/hooks/usePodcasts";
import { PodcastPlayer, EpisodeList } from "@/components/podcasts";

/**
 * PodcastDetailPage - View and play podcast episodes
 */
export function PodcastDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // State
  const [currentEpisode, setCurrentEpisode] = useState<PodcastEpisode | null>(
    null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // Queries and mutations
  const { data: podcast, isLoading, error } = usePodcast(id || "");

  const updatePodcast = useUpdatePodcast();
  const unsubscribe = useUnsubscribePodcast({
    onSuccess: () => {
      navigate("/podcasts");
    },
  });
  const refreshPodcast = useRefreshPodcast();
  const updateProgress = useUpdateEpisodeProgress();
  const markCompleted = useMarkEpisodeCompleted();

  // Handlers
  const handleBack = useCallback(() => {
    navigate("/podcasts");
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    if (id) {
      refreshPodcast.mutate(id);
    }
  }, [id, refreshPodcast]);

  const handleUnsubscribe = useCallback(() => {
    if (id) {
      if (
        window.confirm(
          t(
            "podcasts.confirmUnsubscribe",
            "Are you sure you want to unsubscribe?"
          )
        )
      ) {
        unsubscribe.mutate(id);
      }
    }
    setMenuAnchor(null);
  }, [id, unsubscribe, t]);

  const handleToggleNotifications = useCallback(() => {
    if (id && podcast) {
      updatePodcast.mutate({
        id,
        data: { notifyNewEpisodes: !podcast.notifyNewEpisodes },
      });
    }
    setMenuAnchor(null);
  }, [id, podcast, updatePodcast]);

  const handlePlayEpisode = useCallback((episode: PodcastEpisode) => {
    setCurrentEpisode(episode);
    setIsPlaying(true);
  }, []);

  const handleProgressUpdate = useCallback(
    (position: number) => {
      if (id && currentEpisode) {
        updateProgress.mutate({
          podcastId: id,
          episodeId: currentEpisode.id,
          data: { position, status: "IN_PROGRESS" },
        });
      }
    },
    [id, currentEpisode, updateProgress]
  );

  const handleEpisodeComplete = useCallback(() => {
    if (id && currentEpisode) {
      markCompleted.mutate({
        podcastId: id,
        episodeId: currentEpisode.id,
      });
      // Auto-play next episode
      if (podcast?.episodes) {
        const currentIndex = podcast.episodes.findIndex(
          (ep) => ep.id === currentEpisode.id
        );
        if (currentIndex >= 0 && currentIndex < podcast.episodes.length - 1) {
          const nextEpisode = podcast.episodes[currentIndex + 1];
          if (nextEpisode) {
            setCurrentEpisode(nextEpisode);
          }
        } else {
          setCurrentEpisode(null);
          setIsPlaying(false);
        }
      }
    }
  }, [id, currentEpisode, markCompleted, podcast]);

  const handleSpeedChange = useCallback(
    (speed: number) => {
      if (id) {
        updatePodcast.mutate({
          id,
          data: { playbackSpeed: speed },
        });
      }
    },
    [id, updatePodcast]
  );

  const handleNextEpisode = useCallback(() => {
    if (podcast?.episodes && currentEpisode) {
      const currentIndex = podcast.episodes.findIndex(
        (ep) => ep.id === currentEpisode.id
      );
      if (currentIndex >= 0 && currentIndex < podcast.episodes.length - 1) {
        const nextEpisode = podcast.episodes[currentIndex + 1];
        if (nextEpisode) {
          setCurrentEpisode(nextEpisode);
        }
      }
    }
  }, [podcast, currentEpisode]);

  const handlePreviousEpisode = useCallback(() => {
    if (podcast?.episodes && currentEpisode) {
      const currentIndex = podcast.episodes.findIndex(
        (ep) => ep.id === currentEpisode.id
      );
      if (currentIndex > 0) {
        const prevEpisode = podcast.episodes[currentIndex - 1];
        if (prevEpisode) {
          setCurrentEpisode(prevEpisode);
        }
      }
    }
  }, [podcast, currentEpisode]);

  // Loading state
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Error state
  if (error || !podcast) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          {t("common.back", "Back")}
        </Button>
        <Alert severity="error">
          {t("podcasts.notFound", "Podcast not found")}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          {t("common.back", "Back")}
        </Button>

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {/* Cover image */}
            <Avatar
              src={podcast.coverImage ?? ""}
              variant="rounded"
              sx={{ width: 160, height: 160 }}
            >
              <PodcastsIcon sx={{ fontSize: 64 }} />
            </Avatar>

            {/* Info */}
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Box>
                  <Typography variant="h4" component="h1" gutterBottom>
                    {podcast.title}
                  </Typography>
                  {podcast.author && (
                    <Typography variant="subtitle1" color="text.secondary">
                      {podcast.author}
                    </Typography>
                  )}
                </Box>

                {/* Actions */}
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Tooltip title={t("podcasts.refresh", "Refresh feed")}>
                    <IconButton
                      onClick={handleRefresh}
                      disabled={refreshPodcast.isPending}
                    >
                      {refreshPodcast.isPending ? (
                        <CircularProgress size={24} />
                      ) : (
                        <RefreshIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                  <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
                    <MoreVertIcon />
                  </IconButton>
                  <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={() => setMenuAnchor(null)}
                  >
                    <MenuItem onClick={handleToggleNotifications}>
                      <ListItemIcon>
                        {podcast.notifyNewEpisodes ? (
                          <NotificationsOffIcon />
                        ) : (
                          <NotificationsIcon />
                        )}
                      </ListItemIcon>
                      <ListItemText>
                        {podcast.notifyNewEpisodes
                          ? t(
                              "podcasts.disableNotifications",
                              "Disable notifications"
                            )
                          : t(
                              "podcasts.enableNotifications",
                              "Enable notifications"
                            )}
                      </ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => setMenuAnchor(null)}>
                      <ListItemIcon>
                        <SettingsIcon />
                      </ListItemIcon>
                      <ListItemText>
                        {t("podcasts.settings", "Settings")}
                      </ListItemText>
                    </MenuItem>
                    <Divider />
                    <MenuItem
                      onClick={handleUnsubscribe}
                      sx={{ color: "error.main" }}
                    >
                      <ListItemIcon>
                        <UnsubscribeIcon color="error" />
                      </ListItemIcon>
                      <ListItemText>
                        {t("podcasts.unsubscribe", "Unsubscribe")}
                      </ListItemText>
                    </MenuItem>
                  </Menu>
                </Box>
              </Box>

              {/* Stats */}
              <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                <Chip
                  label={t("podcasts.episodeCount", "{{count}} episodes", {
                    count: podcast.episodeCount,
                  })}
                  size="small"
                />
                {podcast.newEpisodeCount > 0 && (
                  <Chip
                    color="primary"
                    label={t("podcasts.newCount", "{{count}} new", {
                      count: podcast.newEpisodeCount,
                    })}
                    size="small"
                  />
                )}
              </Box>

              {/* Description */}
              {podcast.description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 2,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {podcast.description}
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Episodes list */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t("podcasts.episodes", "Episodes")}
        </Typography>
        <EpisodeList
          episodes={podcast.episodes || []}
          playingEpisodeId={currentEpisode?.id}
          isPlaying={isPlaying}
          onPlayEpisode={handlePlayEpisode}
        />
      </Paper>

      {/* Player (fixed at bottom when episode is selected) */}
      {currentEpisode && (
        <Box
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
          }}
        >
          <PodcastPlayer
            episode={currentEpisode}
            coverImage={podcast.coverImage}
            podcastTitle={podcast.title}
            playbackSpeed={podcast.playbackSpeed}
            onComplete={handleEpisodeComplete}
            onProgressUpdate={handleProgressUpdate}
            onSpeedChange={handleSpeedChange}
            onNextEpisode={handleNextEpisode}
            onPreviousEpisode={handlePreviousEpisode}
          />
        </Box>
      )}

      {/* Spacer for fixed player */}
      {currentEpisode && <Box sx={{ height: 100 }} />}
    </Container>
  );
}

export default PodcastDetailPage;
