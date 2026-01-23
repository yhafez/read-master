/**
 * Episode List Component
 *
 * Displays list of podcast episodes with:
 * - Episode title and description
 * - Duration and publish date
 * - Play/status indicators
 * - Progress tracking
 */

import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PauseIcon from "@mui/icons-material/Pause";
import { useTranslation } from "react-i18next";
import type { PodcastEpisode } from "@/hooks/usePodcasts";

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

/**
 * Format date to relative or absolute string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export interface EpisodeListProps {
  /** Episodes to display */
  episodes: PodcastEpisode[];
  /** Currently playing episode ID */
  playingEpisodeId?: string | undefined;
  /** Whether currently playing */
  isPlaying?: boolean | undefined;
  /** Callback when episode is selected to play */
  onPlayEpisode?: ((episode: PodcastEpisode) => void) | undefined;
  /** Show compact view */
  compact?: boolean | undefined;
}

/**
 * EpisodeList - Displays list of podcast episodes
 */
export function EpisodeList({
  episodes,
  playingEpisodeId,
  isPlaying,
  onPlayEpisode,
  compact = false,
}: EpisodeListProps) {
  const { t } = useTranslation();

  if (episodes.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          {t("podcasts.noEpisodes", "No episodes found")}
        </Typography>
      </Box>
    );
  }

  return (
    <List disablePadding>
      {episodes.map((episode) => {
        const isCurrentlyPlaying = playingEpisodeId === episode.id;
        const progress =
          episode.duration > 0
            ? (episode.position / episode.duration) * 100
            : 0;
        const isCompleted = episode.status === "COMPLETED";
        const isNew = episode.status === "NEW";
        const isInProgress = episode.status === "IN_PROGRESS";

        return (
          <ListItem
            key={episode.id}
            disablePadding
            secondaryAction={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {/* Duration */}
                <Typography variant="caption" color="text.secondary">
                  {formatDuration(episode.duration)}
                </Typography>

                {/* Status indicators */}
                {isCompleted && (
                  <Tooltip title={t("podcasts.completed", "Completed")}>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </Tooltip>
                )}
                {isNew && (
                  <Chip
                    size="small"
                    color="primary"
                    label={t("podcasts.new", "New")}
                    sx={{ height: 20 }}
                  />
                )}
              </Box>
            }
          >
            <ListItemButton
              onClick={() => onPlayEpisode?.(episode)}
              selected={isCurrentlyPlaying}
              sx={{
                borderRadius: 1,
                mr: 1,
              }}
            >
              {/* Play indicator */}
              <ListItemIcon sx={{ minWidth: 40 }}>
                <IconButton
                  size="small"
                  color={isCurrentlyPlaying ? "primary" : "default"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayEpisode?.(episode);
                  }}
                >
                  {isCurrentlyPlaying && isPlaying ? (
                    <PauseIcon />
                  ) : (
                    <PlayArrowIcon />
                  )}
                </IconButton>
              </ListItemIcon>

              {/* Episode info */}
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      variant={compact ? "body2" : "subtitle2"}
                      noWrap
                      sx={{
                        fontWeight: isNew ? 600 : 400,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {episode.title}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box>
                    {/* Date */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      component="span"
                    >
                      {formatDate(episode.publishedAt)}
                    </Typography>

                    {/* Description (truncated) */}
                    {!compact && episode.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        component="p"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          mt: 0.5,
                        }}
                      >
                        {episode.description}
                      </Typography>
                    )}

                    {/* Progress bar for in-progress episodes */}
                    {isInProgress && progress > 0 && progress < 100 && (
                      <Box sx={{ mt: 0.5, width: "100%", maxWidth: 200 }}>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{ height: 4, borderRadius: 2 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {Math.round(progress)}%{" "}
                          {t("podcasts.complete", "complete")}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                }
              />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
}

export default EpisodeList;
