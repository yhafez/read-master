/**
 * RSVP Display Component
 *
 * Rapid Serial Visual Presentation display for speed reading.
 * Shows words one at a time at a configurable speed.
 */

import { useCallback, useEffect, useRef, useState, memo } from "react";
import {
  Box,
  Typography,
  IconButton,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Replay as ReplayIcon,
  SkipPrevious as PrevIcon,
  SkipNext as NextIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  type RSVPConfig,
  type RSVPState,
  INITIAL_RSVP_STATE,
  calculateWordDisplayTime,
  splitIntoWords,
  groupWordsForRSVP,
  findORP,
  calculateRSVPProgress,
  formatReadingTime,
  calculateEstimatedTime,
} from "./advancedReadingTypes";

export interface RSVPDisplayProps {
  /** Text content to display */
  text: string;
  /** RSVP configuration */
  config: RSVPConfig;
  /** Whether RSVP is currently active */
  isActive: boolean;
  /** Callback when RSVP completes */
  onComplete?: () => void;
  /** Callback when word index changes */
  onIndexChange?: (index: number) => void;
  /** Initial word index to start from */
  initialIndex?: number;
}

/**
 * RSVPDisplay component for speed reading
 */
export const RSVPDisplay = memo(function RSVPDisplay({
  text,
  config,
  isActive,
  onComplete,
  onIndexChange,
  initialIndex = 0,
}: RSVPDisplayProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<RSVPState>(INITIAL_RSVP_STATE);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wordsRef = useRef<string[]>([]);

  // Process text into words
  useEffect(() => {
    const rawWords = splitIntoWords(text);
    wordsRef.current = groupWordsForRSVP(rawWords, config.wordsPerFlash);

    const startIndex = Math.min(initialIndex, wordsRef.current.length - 1);
    setState({
      currentWord: wordsRef.current[startIndex] || "",
      currentIndex: startIndex,
      totalWords: wordsRef.current.length,
      isPlaying: false,
      isComplete: false,
      progress: calculateRSVPProgress(startIndex, wordsRef.current.length),
    });
  }, [text, config.wordsPerFlash, initialIndex]);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Handle playing/pausing
  const playNextWord = useCallback(() => {
    setState((prev) => {
      if (!prev.isPlaying || prev.isComplete) return prev;

      const nextIndex = prev.currentIndex + 1;

      if (nextIndex >= wordsRef.current.length) {
        onComplete?.();
        return {
          ...prev,
          isPlaying: false,
          isComplete: true,
          progress: 100,
        };
      }

      const nextWord = wordsRef.current[nextIndex] ?? "";
      onIndexChange?.(nextIndex);

      // Schedule next word
      const displayTime = calculateWordDisplayTime(nextWord, config);
      timerRef.current = setTimeout(playNextWord, displayTime);

      return {
        ...prev,
        currentWord: nextWord,
        currentIndex: nextIndex,
        progress: calculateRSVPProgress(nextIndex, wordsRef.current.length),
      };
    });
  }, [config, onComplete, onIndexChange]);

  // Handle play/pause state changes
  useEffect(() => {
    if (state.isPlaying && !state.isComplete) {
      const currentWord = wordsRef.current[state.currentIndex] ?? "";
      const displayTime = calculateWordDisplayTime(currentWord, config);
      timerRef.current = setTimeout(playNextWord, displayTime);
    } else if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [
    state.isPlaying,
    state.isComplete,
    state.currentIndex,
    config,
    playNextWord,
  ]);

  // Control functions
  const handlePlay = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPlaying: true,
      isComplete: false,
    }));
  }, []);

  const handlePause = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPlaying: false,
    }));
  }, []);

  const handleRestart = useCallback(() => {
    const firstWord = wordsRef.current[0] || "";
    setState({
      currentWord: firstWord,
      currentIndex: 0,
      totalWords: wordsRef.current.length,
      isPlaying: false,
      isComplete: false,
      progress: 0,
    });
    onIndexChange?.(0);
  }, [onIndexChange]);

  const handlePrevWord = useCallback(() => {
    setState((prev) => {
      if (prev.currentIndex <= 0) return prev;
      const newIndex = prev.currentIndex - 1;
      onIndexChange?.(newIndex);
      return {
        ...prev,
        currentWord: wordsRef.current[newIndex] ?? "",
        currentIndex: newIndex,
        progress: calculateRSVPProgress(newIndex, wordsRef.current.length),
        isComplete: false,
      };
    });
  }, [onIndexChange]);

  const handleNextWord = useCallback(() => {
    setState((prev) => {
      if (prev.currentIndex >= wordsRef.current.length - 1) return prev;
      const newIndex = prev.currentIndex + 1;
      onIndexChange?.(newIndex);
      return {
        ...prev,
        currentWord: wordsRef.current[newIndex] ?? "",
        currentIndex: newIndex,
        progress: calculateRSVPProgress(newIndex, wordsRef.current.length),
      };
    });
  }, [onIndexChange]);

  // Calculate estimated remaining time
  const wordsRemaining = state.totalWords - state.currentIndex;
  const estimatedMinutes = calculateEstimatedTime(wordsRemaining, config.wpm);

  // Find ORP for current word (for highlighting)
  const orpIndex = findORP(state.currentWord);
  const beforeORP = state.currentWord.slice(0, orpIndex);
  const atORP = state.currentWord[orpIndex] || "";
  const afterORP = state.currentWord.slice(orpIndex + 1);

  if (!isActive) {
    return null;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 300,
        p: 4,
        bgcolor: "background.paper",
        borderRadius: 2,
        boxShadow: 3,
      }}
    >
      {/* Word display with ORP highlight */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 100,
          mb: 4,
        }}
      >
        {state.isComplete ? (
          <Typography variant="h4" color="text.secondary">
            {t("reader.advancedReading.rsvpComplete")}
          </Typography>
        ) : (
          <Typography
            variant="h2"
            component="div"
            sx={{
              fontFamily: "monospace",
              letterSpacing: "0.05em",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ opacity: 0.7 }}>{beforeORP}</span>
            <span style={{ color: "red", fontWeight: "bold" }}>{atORP}</span>
            <span style={{ opacity: 0.7 }}>{afterORP}</span>
          </Typography>
        )}
      </Box>

      {/* Progress bar */}
      <Box sx={{ width: "100%", maxWidth: 400, mb: 2 }}>
        <LinearProgress
          variant="determinate"
          value={state.progress}
          sx={{ height: 8, borderRadius: 1 }}
        />
      </Box>

      {/* Status info */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          mb: 3,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {state.currentIndex + 1} / {state.totalWords}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {config.wpm} WPM
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("reader.advancedReading.remaining")}:{" "}
          {formatReadingTime(estimatedMinutes)}
        </Typography>
      </Box>

      {/* Controls */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Tooltip title={t("reader.advancedReading.restart")}>
          <IconButton
            onClick={handleRestart}
            aria-label={t("reader.advancedReading.restart")}
          >
            <ReplayIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={t("common.previous")}>
          <span>
            <IconButton
              onClick={handlePrevWord}
              disabled={state.currentIndex <= 0 || state.isPlaying}
              aria-label={t("common.previous")}
            >
              <PrevIcon />
            </IconButton>
          </span>
        </Tooltip>

        {state.isPlaying ? (
          <Tooltip title={t("common.pause")}>
            <IconButton
              onClick={handlePause}
              color="primary"
              size="large"
              aria-label={t("common.pause")}
              sx={{
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              <PauseIcon fontSize="large" />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title={t("common.play")}>
            <IconButton
              onClick={handlePlay}
              color="primary"
              size="large"
              aria-label={t("common.play")}
              disabled={state.isComplete}
              sx={{
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              <PlayIcon fontSize="large" />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title={t("common.next")}>
          <span>
            <IconButton
              onClick={handleNextWord}
              disabled={
                state.currentIndex >= state.totalWords - 1 || state.isPlaying
              }
              aria-label={t("common.next")}
            >
              <NextIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Keyboard shortcut hints */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
        {t("reader.advancedReading.rsvpKeyboardHint")}
      </Typography>
    </Box>
  );
});

export default RSVPDisplay;
