/**
 * Podcast Card Component
 *
 * Displays podcast summary with:
 * - Cover image
 * - Title and author
 * - Episode count and new episode badge
 * - Click to view podcast details
 */

import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  Avatar,
} from "@mui/material";
import PodcastsIcon from "@mui/icons-material/Podcasts";
import { useTranslation } from "react-i18next";
import type { Podcast } from "@/hooks/usePodcasts";

export interface PodcastCardProps {
  /** Podcast data */
  podcast: Podcast;
  /** Click handler */
  onClick?: () => void;
  /** View mode: grid (card) or list (row) */
  viewMode?: "grid" | "list";
}

/**
 * PodcastCard - Displays a podcast in the library
 */
export function PodcastCard({
  podcast,
  onClick,
  viewMode = "grid",
}: PodcastCardProps) {
  const { t } = useTranslation();

  if (viewMode === "list") {
    return (
      <Card
        sx={{
          display: "flex",
          alignItems: "center",
          p: 1,
          cursor: onClick ? "pointer" : "default",
          "&:hover": onClick
            ? {
                bgcolor: "action.hover",
              }
            : undefined,
        }}
        onClick={onClick}
      >
        {/* Cover image */}
        <Avatar
          src={podcast.coverImage ?? ""}
          variant="rounded"
          sx={{ width: 56, height: 56, mr: 2 }}
        >
          <PodcastsIcon />
        </Avatar>

        {/* Info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
            {podcast.title}
          </Typography>
          {podcast.author && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {podcast.author}
            </Typography>
          )}
        </Box>

        {/* Episode counts */}
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary">
            {t("podcasts.episodeCount", "{{count}} episodes", {
              count: podcast.episodeCount,
            })}
          </Typography>
          {podcast.newEpisodeCount > 0 && (
            <Chip
              size="small"
              color="primary"
              label={t("podcasts.newCount", "{{count}} new", {
                count: podcast.newEpisodeCount,
              })}
            />
          )}
        </Box>
      </Card>
    );
  }

  // Grid view (default)
  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardActionArea onClick={onClick} sx={{ flex: 1 }}>
        {/* Cover image */}
        {podcast.coverImage ? (
          <CardMedia
            component="img"
            height={160}
            image={podcast.coverImage}
            alt={podcast.title}
            sx={{ objectFit: "cover" }}
          />
        ) : (
          <Box
            sx={{
              height: 160,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "action.hover",
            }}
          >
            <PodcastsIcon sx={{ fontSize: 64, color: "action.disabled" }} />
          </Box>
        )}

        <CardContent>
          {/* Title */}
          <Typography
            variant="subtitle1"
            component="h3"
            noWrap
            title={podcast.title}
            sx={{ fontWeight: 600, mb: 0.5 }}
          >
            {podcast.title}
          </Typography>

          {/* Author */}
          {podcast.author && (
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              sx={{ mb: 1 }}
            >
              {podcast.author}
            </Typography>
          )}

          {/* Episode info */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {t("podcasts.episodeCount", "{{count}} episodes", {
                count: podcast.episodeCount,
              })}
            </Typography>
            {podcast.newEpisodeCount > 0 && (
              <Chip
                size="small"
                color="primary"
                label={t("podcasts.newCount", "{{count}} new", {
                  count: podcast.newEpisodeCount,
                })}
              />
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default PodcastCard;
