/**
 * Video Card Component
 *
 * Displays a video in a card format for list views
 */

import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  LinearProgress,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ClosedCaptionIcon from "@mui/icons-material/ClosedCaption";
import { useTranslation } from "react-i18next";
import type { Video, VideoStatus } from "@/hooks/useVideos";

/**
 * Format seconds to readable duration
 */
function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get status color
 */
function getStatusColor(
  status: VideoStatus
): "default" | "primary" | "success" | "info" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "IN_PROGRESS":
      return "primary";
    case "BOOKMARKED":
      return "info";
    default:
      return "default";
  }
}

export interface VideoCardProps {
  /** Video data */
  video: Video;
  /** Click handler */
  onClick?: () => void;
  /** View variant: grid or list */
  variant?: "grid" | "list";
}

/**
 * VideoCard - Card display for video items
 */
export function VideoCard({
  video,
  onClick,
  variant = "grid",
}: VideoCardProps) {
  const { t } = useTranslation();

  const progress =
    video.duration > 0 ? (video.position / video.duration) * 100 : 0;

  if (variant === "list") {
    return (
      <Card
        sx={{
          display: "flex",
          cursor: onClick ? "pointer" : "default",
          "&:hover": onClick
            ? {
                backgroundColor: "action.hover",
              }
            : undefined,
        }}
        onClick={onClick}
      >
        {/* Thumbnail */}
        <Box sx={{ position: "relative", width: 160, flexShrink: 0 }}>
          <CardMedia
            component="img"
            image={video.thumbnailUrl ?? "/images/video-placeholder.png"}
            alt={video.title}
            sx={{
              width: 160,
              height: 90,
              objectFit: "cover",
            }}
          />
          {/* Duration badge */}
          <Box
            sx={{
              position: "absolute",
              bottom: 4,
              right: 4,
              bgcolor: "rgba(0, 0, 0, 0.8)",
              color: "white",
              px: 0.5,
              borderRadius: 0.5,
            }}
          >
            <Typography variant="caption">
              {formatDuration(video.duration)}
            </Typography>
          </Box>
          {/* Progress bar */}
          {video.status === "IN_PROGRESS" && progress > 0 && (
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 3,
              }}
            />
          )}
        </Box>

        <CardContent sx={{ flex: 1, py: 1, "&:last-child": { pb: 1 } }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
            {video.title}
          </Typography>
          {video.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {video.description}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.5 }}>
            {video.status !== "NEW" && (
              <Chip
                label={t(
                  `videos.status.${video.status.toLowerCase()}`,
                  video.status
                )}
                size="small"
                color={getStatusColor(video.status)}
                variant="outlined"
              />
            )}
            {video.hasTranscript && (
              <Chip
                icon={<ClosedCaptionIcon />}
                label={t("videos.hasTranscript", "CC")}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Grid variant
  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": onClick
          ? {
              transform: "translateY(-4px)",
              boxShadow: 6,
            }
          : undefined,
      }}
      onClick={onClick}
    >
      {/* Thumbnail with overlay */}
      <Box sx={{ position: "relative" }}>
        <CardMedia
          component="img"
          image={video.thumbnailUrl ?? "/images/video-placeholder.png"}
          alt={video.title}
          sx={{
            aspectRatio: "16/9",
            objectFit: "cover",
          }}
        />

        {/* Play overlay */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            opacity: 0,
            transition: "opacity 0.2s",
            "&:hover": {
              opacity: 1,
            },
          }}
        >
          <PlayArrowIcon sx={{ fontSize: 64, color: "white" }} />
        </Box>

        {/* Duration badge */}
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            right: 8,
            bgcolor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            px: 1,
            py: 0.25,
            borderRadius: 1,
          }}
        >
          <Typography variant="caption" fontWeight={500}>
            {formatDuration(video.duration)}
          </Typography>
        </Box>

        {/* Transcript indicator */}
        {video.hasTranscript && (
          <Box
            sx={{
              position: "absolute",
              top: 8,
              left: 8,
              bgcolor: "rgba(0, 0, 0, 0.8)",
              color: "white",
              px: 0.5,
              borderRadius: 0.5,
              display: "flex",
              alignItems: "center",
            }}
          >
            <ClosedCaptionIcon fontSize="small" />
          </Box>
        )}

        {/* Progress bar */}
        {video.status === "IN_PROGRESS" && progress > 0 && (
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 4,
              backgroundColor: "rgba(255, 255, 255, 0.3)",
            }}
          />
        )}
      </Box>

      <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            mb: 0.5,
          }}
        >
          {video.title}
        </Typography>

        {video.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              flex: 1,
            }}
          >
            {video.description}
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
          {video.status !== "NEW" && (
            <Chip
              label={t(
                `videos.status.${video.status.toLowerCase()}`,
                video.status
              )}
              size="small"
              color={getStatusColor(video.status)}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default VideoCard;
