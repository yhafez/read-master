/**
 * Video Player Component
 *
 * HTML5 video player with:
 * - Play/Pause/Seek controls
 * - Progress bar with time display
 * - Playback speed control
 * - Volume control
 * - Fullscreen support
 * - Captions/subtitles support
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
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import Replay10Icon from "@mui/icons-material/Replay10";
import Forward30Icon from "@mui/icons-material/Forward30";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import SpeedIcon from "@mui/icons-material/Speed";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import ClosedCaptionIcon from "@mui/icons-material/ClosedCaption";
import ClosedCaptionDisabledIcon from "@mui/icons-material/ClosedCaptionDisabled";
import { useTranslation } from "react-i18next";
import type { VideoTranscript } from "@/hooks/useVideos";

/**
 * Speed presets for playback
 */
const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

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

export interface VideoPlayerProps {
  /** Video URL to play */
  videoUrl: string;
  /** Video title */
  title: string;
  /** Poster/thumbnail image */
  posterUrl?: string | null;
  /** Initial playback position in seconds */
  initialPosition?: number;
  /** Initial playback speed */
  playbackSpeed?: number;
  /** Available transcripts/captions */
  transcripts?: VideoTranscript[];
  /** Callback when video completes */
  onComplete?: () => void;
  /** Callback to update progress (debounced) */
  onProgressUpdate?: (position: number) => void;
  /** Callback when playback speed changes */
  onSpeedChange?: (speed: number) => void;
  /** Whether player is disabled */
  disabled?: boolean;
  /** Auto-play video */
  autoPlay?: boolean;
}

/**
 * VideoPlayer - Full-featured video player
 */
export function VideoPlayer({
  videoUrl,
  title,
  posterUrl,
  initialPosition = 0,
  playbackSpeed = 1,
  transcripts = [],
  onComplete,
  onProgressUpdate,
  onSpeedChange,
  disabled = false,
  autoPlay = false,
}: VideoPlayerProps) {
  const { t } = useTranslation();

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(playbackSpeed);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const [selectedCaptionTrack, setSelectedCaptionTrack] = useState<number>(0);
  const [speedMenuAnchor, setSpeedMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [captionMenuAnchor, setCaptionMenuAnchor] =
    useState<null | HTMLElement>(null);
  const [showControls, setShowControls] = useState(true);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastReportedPositionRef = useRef<number>(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = volume;
    video.playbackRate = speed;

    if (initialPosition > 0) {
      video.currentTime = initialPosition;
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);

      if (initialPosition > 0) {
        video.currentTime = initialPosition;
      }

      if (autoPlay) {
        video.play().catch(() => {
          setIsPlaying(false);
        });
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
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

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [videoUrl, initialPosition, volume, speed, autoPlay, onComplete]);

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

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Auto-hide controls after inactivity
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video || disabled) return;

    if (isPlaying) {
      video.pause();
      if (onProgressUpdate) {
        onProgressUpdate(Math.floor(video.currentTime));
      }
    } else {
      video.play().catch(() => {
        setIsPlaying(false);
      });
    }
    resetControlsTimeout();
  }, [isPlaying, disabled, onProgressUpdate, resetControlsTimeout]);

  // Skip backward 10 seconds
  const skipBackward = useCallback(() => {
    const video = videoRef.current;
    if (!video || disabled) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
    resetControlsTimeout();
  }, [disabled, resetControlsTimeout]);

  // Skip forward 30 seconds
  const skipForward = useCallback(() => {
    const video = videoRef.current;
    if (!video || disabled) return;
    video.currentTime = Math.min(duration, video.currentTime + 30);
    resetControlsTimeout();
  }, [disabled, duration, resetControlsTimeout]);

  // Handle seek
  const handleSeek = useCallback(
    (_event: Event, value: number | number[]) => {
      const video = videoRef.current;
      if (!video || disabled) return;
      const time = Array.isArray(value) ? (value[0] ?? 0) : value;
      video.currentTime = time;
      setCurrentTime(time);
      resetControlsTimeout();
    },
    [disabled, resetControlsTimeout]
  );

  // Handle volume change
  const handleVolumeChange = useCallback(
    (_event: Event, value: number | number[]) => {
      const video = videoRef.current;
      if (!video) return;
      const vol = Array.isArray(value) ? (value[0] ?? 1) : value;
      video.volume = vol;
      setVolume(vol);
      if (vol > 0 && isMuted) {
        setIsMuted(false);
        video.muted = false;
      }
    },
    [isMuted]
  );

  // Toggle mute
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  }, [isMuted]);

  // Handle speed change
  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = newSpeed;
      }
      setSpeed(newSpeed);
      setSpeedMenuAnchor(null);
      onSpeedChange?.(newSpeed);
    },
    [onSpeedChange]
  );

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (isFullscreen) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch {
      // Fullscreen not supported or user denied
    }
  }, [isFullscreen]);

  // Toggle captions
  const toggleCaptions = useCallback(() => {
    if (transcripts.length > 0) {
      setShowCaptions((prev) => !prev);
    }
  }, [transcripts.length]);

  // Get current caption text
  const getCurrentCaption = useCallback((): string | null => {
    if (!showCaptions || transcripts.length === 0) return null;

    const transcript = transcripts[selectedCaptionTrack];
    if (!transcript) return null;

    const cue = transcript.cues.find(
      (c) => currentTime >= c.startTime && currentTime <= c.endTime
    );
    return cue?.text ?? null;
  }, [showCaptions, transcripts, selectedCaptionTrack, currentTime]);

  // Get volume icon
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeOffIcon />;
    if (volume < 0.5) return <VolumeDownIcon />;
    return <VolumeUpIcon />;
  };

  const currentCaption = getCurrentCaption();

  return (
    <Paper
      ref={containerRef}
      elevation={2}
      sx={{
        position: "relative",
        width: "100%",
        backgroundColor: "black",
        overflow: "hidden",
        aspectRatio: "16/9",
      }}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={videoUrl}
        poster={posterUrl ?? undefined}
        onClick={togglePlayPause}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          cursor: disabled ? "default" : "pointer",
        }}
      />

      {/* Caption overlay */}
      {currentCaption && (
        <Box
          sx={{
            position: "absolute",
            bottom: showControls ? 100 : 40,
            left: 0,
            right: 0,
            textAlign: "center",
            px: 2,
            transition: "bottom 0.2s",
          }}
        >
          <Typography
            component="span"
            sx={{
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              color: "white",
              px: 2,
              py: 0.5,
              borderRadius: 1,
              fontSize: { xs: "0.875rem", sm: "1rem" },
            }}
          >
            {currentCaption}
          </Typography>
        </Box>
      )}

      {/* Loading overlay */}
      {isLoading && (
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
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <Typography color="white">
            {t("videos.loading", "Loading...")}
          </Typography>
        </Box>
      )}

      {/* Controls overlay */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background:
            "linear-gradient(transparent, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.9))",
          p: { xs: 1, sm: 2 },
          opacity: showControls ? 1 : 0,
          transition: "opacity 0.3s",
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
              color: "primary.main",
              "& .MuiSlider-thumb": {
                width: 12,
                height: 12,
                transition: "0.2s",
                "&:hover, &.Mui-focusVisible": {
                  boxShadow: "0 0 0 8px rgba(255, 255, 255, 0.16)",
                },
              },
              "& .MuiSlider-rail": {
                backgroundColor: "rgba(255, 255, 255, 0.3)",
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
            <Typography variant="caption" sx={{ color: "white" }}>
              {formatTime(currentTime)}
            </Typography>
            <Typography variant="caption" sx={{ color: "white" }}>
              {formatTime(duration)}
            </Typography>
          </Box>
        </Box>

        {/* Control buttons */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          {/* Play/Pause */}
          <Tooltip
            title={
              isPlaying ? t("videos.pause", "Pause") : t("videos.play", "Play")
            }
          >
            <span>
              <IconButton
                onClick={togglePlayPause}
                disabled={disabled}
                sx={{ color: "white" }}
              >
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
            </span>
          </Tooltip>

          {/* Skip back */}
          <Tooltip title={t("videos.skipBack", "Skip back 10 seconds")}>
            <span>
              <IconButton
                onClick={skipBackward}
                disabled={disabled}
                size="small"
                sx={{ color: "white" }}
              >
                <Replay10Icon />
              </IconButton>
            </span>
          </Tooltip>

          {/* Skip forward */}
          <Tooltip title={t("videos.skipForward", "Skip forward 30 seconds")}>
            <span>
              <IconButton
                onClick={skipForward}
                disabled={disabled}
                size="small"
                sx={{ color: "white" }}
              >
                <Forward30Icon />
              </IconButton>
            </span>
          </Tooltip>

          {/* Volume */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ width: { xs: 80, sm: 120 } }}
          >
            <Tooltip
              title={
                isMuted
                  ? t("videos.unmute", "Unmute")
                  : t("videos.mute", "Mute")
              }
            >
              <IconButton
                onClick={toggleMute}
                size="small"
                sx={{ color: "white" }}
              >
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
              sx={{
                width: { xs: 40, sm: 80 },
                color: "white",
                "& .MuiSlider-rail": {
                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                },
              }}
            />
          </Stack>

          {/* Spacer */}
          <Box sx={{ flex: 1 }} />

          {/* Captions */}
          {transcripts.length > 0 && (
            <>
              <Tooltip
                title={
                  showCaptions
                    ? t("videos.hideCaptions", "Hide captions")
                    : t("videos.showCaptions", "Show captions")
                }
              >
                <IconButton
                  onClick={toggleCaptions}
                  size="small"
                  sx={{ color: showCaptions ? "primary.main" : "white" }}
                >
                  {showCaptions ? (
                    <ClosedCaptionIcon />
                  ) : (
                    <ClosedCaptionDisabledIcon />
                  )}
                </IconButton>
              </Tooltip>
              {transcripts.length > 1 && (
                <>
                  <IconButton
                    onClick={(e) => setCaptionMenuAnchor(e.currentTarget)}
                    size="small"
                    sx={{ color: "white" }}
                  >
                    <Typography variant="caption">
                      {transcripts[selectedCaptionTrack]?.label ?? "CC"}
                    </Typography>
                  </IconButton>
                  <Menu
                    anchorEl={captionMenuAnchor}
                    open={Boolean(captionMenuAnchor)}
                    onClose={() => setCaptionMenuAnchor(null)}
                  >
                    {transcripts.map((transcript, index) => (
                      <MenuItem
                        key={`${transcript.language}-${index}`}
                        onClick={() => {
                          setSelectedCaptionTrack(index);
                          setCaptionMenuAnchor(null);
                        }}
                        selected={selectedCaptionTrack === index}
                      >
                        {transcript.label}
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )}
            </>
          )}

          {/* Speed */}
          <Tooltip title={t("videos.speed", "Playback speed")}>
            <IconButton
              onClick={(e) => setSpeedMenuAnchor(e.currentTarget)}
              size="small"
              sx={{ color: "white" }}
            >
              <SpeedIcon />
              <Typography variant="caption" sx={{ ml: 0.5 }}>
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

          {/* Fullscreen */}
          <Tooltip
            title={
              isFullscreen
                ? t("videos.exitFullscreen", "Exit fullscreen")
                : t("videos.fullscreen", "Fullscreen")
            }
          >
            <IconButton
              onClick={toggleFullscreen}
              size="small"
              sx={{ color: "white" }}
            >
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Title (in fullscreen) */}
        {isFullscreen && (
          <Typography
            variant="subtitle2"
            sx={{
              color: "white",
              mt: 1,
              textAlign: "center",
              opacity: 0.8,
            }}
          >
            {title}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

export default VideoPlayer;
