/**
 * Podcast Player Component
 *
 * Audio player for podcast episodes with:
 * - Play/Pause/Skip controls
 * - Progress slider with time display
 * - Playback speed control
 * - Volume control
 * - Progress persistence
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  IconButton,
  Slider,
  Typography,
  Stack,
  Tooltip,
  Menu,
  MenuItem,
  Paper,
  Avatar,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import Replay10Icon from "@mui/icons-material/Replay10";
import Forward30Icon from "@mui/icons-material/Forward30";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import SpeedIcon from "@mui/icons-material/Speed";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import { useTranslation } from "react-i18next";
import type { PodcastEpisode } from "@/hooks/usePodcasts";

/**
 * Speed presets for playback
 */
const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

/**
 * Format seconds to mm:ss or hh:mm:ss
 */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export interface PodcastPlayerProps {
  /** Current episode to play */
  episode: PodcastEpisode;
  /** Podcast cover image */
  coverImage?: string | null;
  /** Podcast title */
  podcastTitle: string;
  /** Initial playback speed */
  playbackSpeed?: number;
  /** Callback when episode completes */
  onComplete?: () => void;
  /** Callback to update progress (debounced) */
  onProgressUpdate?: (position: number) => void;
  /** Callback when playback speed changes */
  onSpeedChange?: (speed: number) => void;
  /** Callback to skip to next episode */
  onNextEpisode?: () => void;
  /** Callback to skip to previous episode */
  onPreviousEpisode?: () => void;
  /** Compact mode for minimal UI */
  compact?: boolean;
  /** Whether player is disabled */
  disabled?: boolean;
}

/**
 * PodcastPlayer - Audio player for podcast episodes
 */
export function PodcastPlayer({
  episode,
  coverImage,
  podcastTitle,
  playbackSpeed = 1,
  onComplete,
  onProgressUpdate,
  onSpeedChange,
  onNextEpisode,
  onPreviousEpisode,
  compact = false,
  disabled = false,
}: PodcastPlayerProps) {
  const { t } = useTranslation();

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(episode.position || 0);
  const [duration, setDuration] = useState(episode.duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(playbackSpeed);
  const [isLoading, setIsLoading] = useState(false);
  const [speedMenuAnchor, setSpeedMenuAnchor] = useState<null | HTMLElement>(
    null
  );

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastReportedPositionRef = useRef<number>(0);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(episode.audioUrl);
    audioRef.current = audio;

    // Set initial values
    audio.volume = volume;
    audio.playbackRate = speed;
    audio.currentTime = episode.position || 0;

    // Event listeners
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || episode.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onComplete?.();
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setIsPlaying(false);
      setIsLoading(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audio.src = "";
    };
  }, [
    episode.audioUrl,
    episode.duration,
    episode.position,
    volume,
    speed,
    onComplete,
  ]);

  // Report progress periodically (every 10 seconds if position changed)
  useEffect(() => {
    if (!onProgressUpdate) return;

    progressUpdateTimerRef.current = setInterval(() => {
      const position = Math.floor(currentTime);
      if (
        isPlaying &&
        Math.abs(position - lastReportedPositionRef.current) >= 10
      ) {
        lastReportedPositionRef.current = position;
        onProgressUpdate(position);
      }
    }, 10000);

    return () => {
      if (progressUpdateTimerRef.current) {
        clearInterval(progressUpdateTimerRef.current);
      }
    };
  }, [currentTime, isPlaying, onProgressUpdate]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || disabled) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      // Report progress when pausing
      if (onProgressUpdate) {
        onProgressUpdate(Math.floor(audio.currentTime));
      }
    } else {
      audio.play().catch(() => {
        // Handle autoplay restrictions
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  }, [isPlaying, disabled, onProgressUpdate]);

  // Skip backward 10 seconds
  const skipBackward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || disabled) return;
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  }, [disabled]);

  // Skip forward 30 seconds
  const skipForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || disabled) return;
    audio.currentTime = Math.min(duration, audio.currentTime + 30);
  }, [disabled, duration]);

  // Handle seek
  const handleSeek = useCallback(
    (_event: Event, value: number | number[]) => {
      const audio = audioRef.current;
      if (!audio || disabled) return;
      const time = Array.isArray(value) ? (value[0] ?? 0) : value;
      audio.currentTime = time;
      setCurrentTime(time);
    },
    [disabled]
  );

  // Handle volume change
  const handleVolumeChange = useCallback(
    (_event: Event, value: number | number[]) => {
      const audio = audioRef.current;
      if (!audio) return;
      const vol = Array.isArray(value) ? (value[0] ?? 1) : value;
      audio.volume = vol;
      setVolume(vol);
      if (vol > 0 && isMuted) {
        setIsMuted(false);
      }
    },
    [isMuted]
  );

  // Toggle mute
  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.volume = volume || 1;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // Handle speed change
  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      const audio = audioRef.current;
      if (audio) {
        audio.playbackRate = newSpeed;
      }
      setSpeed(newSpeed);
      setSpeedMenuAnchor(null);
      onSpeedChange?.(newSpeed);
    },
    [onSpeedChange]
  );

  // Get volume icon
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeOffIcon />;
    if (volume < 0.5) return <VolumeDownIcon />;
    return <VolumeUpIcon />;
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: compact ? 1 : 2,
        backgroundColor: "background.paper",
      }}
    >
      <Stack direction={compact ? "column" : "row"} spacing={2}>
        {/* Episode info with cover */}
        {!compact && (
          <Box sx={{ display: "flex", gap: 2, flex: 1, minWidth: 0 }}>
            <Avatar
              src={coverImage ?? ""}
              variant="rounded"
              sx={{ width: 56, height: 56 }}
            >
              {podcastTitle.charAt(0)}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="subtitle2"
                noWrap
                title={episode.title}
                sx={{ fontWeight: 600 }}
              >
                {episode.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {podcastTitle}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Controls section */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: compact ? 1 : 2,
            minWidth: 0,
          }}
        >
          {/* Progress bar */}
          <Box sx={{ px: 1, mb: 1 }}>
            <Slider
              value={currentTime}
              min={0}
              max={duration || 100}
              onChange={handleSeek}
              disabled={disabled || isLoading}
              size="small"
              sx={{
                "& .MuiSlider-thumb": {
                  width: 12,
                  height: 12,
                },
              }}
            />
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mt: -0.5,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {formatTime(currentTime)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTime(duration)}
              </Typography>
            </Box>
          </Box>

          {/* Main controls row */}
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            justifyContent="center"
          >
            {/* Previous episode */}
            {onPreviousEpisode && (
              <Tooltip
                title={t("podcasts.previousEpisode", "Previous episode")}
              >
                <span>
                  <IconButton
                    onClick={onPreviousEpisode}
                    disabled={disabled}
                    size="small"
                  >
                    <SkipPreviousIcon />
                  </IconButton>
                </span>
              </Tooltip>
            )}

            {/* Skip back 10s */}
            <Tooltip title={t("podcasts.skipBack", "Skip back 10 seconds")}>
              <span>
                <IconButton
                  onClick={skipBackward}
                  disabled={disabled}
                  size="small"
                >
                  <Replay10Icon />
                </IconButton>
              </span>
            </Tooltip>

            {/* Play/Pause */}
            <Tooltip
              title={
                isPlaying
                  ? t("podcasts.pause", "Pause")
                  : t("podcasts.play", "Play")
              }
            >
              <span>
                <IconButton
                  onClick={togglePlayPause}
                  disabled={disabled}
                  color="primary"
                  sx={{
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "&:hover": {
                      bgcolor: "primary.dark",
                    },
                    "&.Mui-disabled": {
                      bgcolor: "action.disabledBackground",
                    },
                  }}
                >
                  {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
              </span>
            </Tooltip>

            {/* Skip forward 30s */}
            <Tooltip
              title={t("podcasts.skipForward", "Skip forward 30 seconds")}
            >
              <span>
                <IconButton
                  onClick={skipForward}
                  disabled={disabled}
                  size="small"
                >
                  <Forward30Icon />
                </IconButton>
              </span>
            </Tooltip>

            {/* Next episode */}
            {onNextEpisode && (
              <Tooltip title={t("podcasts.nextEpisode", "Next episode")}>
                <span>
                  <IconButton
                    onClick={onNextEpisode}
                    disabled={disabled}
                    size="small"
                  >
                    <SkipNextIcon />
                  </IconButton>
                </span>
              </Tooltip>
            )}

            {/* Spacer */}
            <Box sx={{ flex: 1 }} />

            {/* Speed control */}
            <Tooltip title={t("podcasts.speed", "Playback speed")}>
              <IconButton
                onClick={(e) => setSpeedMenuAnchor(e.currentTarget)}
                size="small"
              >
                <SpeedIcon />
                <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 600 }}>
                  {speed}x
                </Typography>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={speedMenuAnchor}
              open={Boolean(speedMenuAnchor)}
              onClose={() => setSpeedMenuAnchor(null)}
            >
              {SPEED_PRESETS.map((preset) => (
                <MenuItem
                  key={preset}
                  onClick={() => handleSpeedChange(preset)}
                  selected={speed === preset}
                >
                  {preset}x
                </MenuItem>
              ))}
            </Menu>

            {/* Volume control */}
            {!compact && (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ width: 120 }}
              >
                <Tooltip
                  title={
                    isMuted
                      ? t("podcasts.unmute", "Unmute")
                      : t("podcasts.mute", "Mute")
                  }
                >
                  <IconButton onClick={toggleMute} size="small">
                    {getVolumeIcon()}
                  </IconButton>
                </Tooltip>
                <Slider
                  value={isMuted ? 0 : volume}
                  min={0}
                  max={1}
                  step={0.1}
                  onChange={handleVolumeChange}
                  size="small"
                  sx={{ width: 80 }}
                />
              </Stack>
            )}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

export default PodcastPlayer;
