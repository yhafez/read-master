/**
 * ProgressTracker Component
 *
 * Displays reading progress including percentage complete, time remaining,
 * and reading speed (WPM).
 */

import {
  Box,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SpeedIcon from "@mui/icons-material/Speed";
import { useTranslation } from "react-i18next";
import { useMemo, useCallback } from "react";

import type { ProgressTrackerProps, ProgressData } from "./progressTypes";
import {
  calculateProgressData,
  formatDuration,
  formatPercentage,
  formatWpm,
  getDisplaySettings,
  validateProgressProps,
} from "./progressTypes";

/**
 * ProgressTracker displays reading progress with percentage, time, and speed
 */
export function ProgressTracker({
  currentPosition,
  totalPositions,
  totalWords,
  wordsRead,
  timeSpentMs,
  averageWpm,
  displayMode = "standard",
  showProgressBar: showProgressBarOverride,
  showPercentage: showPercentageOverride,
  showTimeRemaining: showTimeRemainingOverride,
  showSpeed: showSpeedOverride,
  compact = false,
  onNavigate,
}: ProgressTrackerProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  // Build props for validation (handle undefined properly)
  const propsForValidation = useMemo(() => {
    const props: ProgressTrackerProps = {
      currentPosition,
      totalPositions,
      totalWords,
      wordsRead,
      timeSpentMs,
    };
    if (averageWpm !== undefined) {
      props.averageWpm = averageWpm;
    }
    return props;
  }, [
    currentPosition,
    totalPositions,
    totalWords,
    wordsRead,
    timeSpentMs,
    averageWpm,
  ]);

  // Validate props
  const validation = useMemo(
    () => validateProgressProps(propsForValidation),
    [propsForValidation]
  );

  // Calculate progress data
  const progressData: ProgressData = useMemo(() => {
    if (!validation.valid) {
      return {
        currentPosition: 0,
        totalPositions: 1,
        percentage: 0,
        wordsRead: 0,
        totalWords: 1,
        timeSpentMs: 0,
        timeRemainingMs: 0,
        wpm: 0,
        averageWpm: 0,
      };
    }

    // Build params for progress calculation (handle undefined properly)
    const params: {
      currentPosition: number;
      totalPositions: number;
      totalWords: number;
      wordsRead: number;
      timeSpentMs: number;
      averageWpm?: number;
    } = {
      currentPosition,
      totalPositions,
      totalWords,
      wordsRead,
      timeSpentMs,
    };
    if (averageWpm !== undefined) {
      params.averageWpm = averageWpm;
    }
    return calculateProgressData(params);
  }, [
    currentPosition,
    totalPositions,
    totalWords,
    wordsRead,
    timeSpentMs,
    averageWpm,
    validation.valid,
  ]);

  // Get display settings
  const displaySettings = useMemo(() => {
    // Build overrides object (handle undefined properly)
    const overrides: Partial<{
      showProgressBar: boolean;
      showPercentage: boolean;
      showTimeRemaining: boolean;
      showSpeed: boolean;
    }> = {};
    if (showProgressBarOverride !== undefined) {
      overrides.showProgressBar = showProgressBarOverride;
    }
    if (showPercentageOverride !== undefined) {
      overrides.showPercentage = showPercentageOverride;
    }
    if (showTimeRemainingOverride !== undefined) {
      overrides.showTimeRemaining = showTimeRemainingOverride;
    }
    if (showSpeedOverride !== undefined) {
      overrides.showSpeed = showSpeedOverride;
    }
    return getDisplaySettings(displayMode, overrides);
  }, [
    displayMode,
    showProgressBarOverride,
    showPercentageOverride,
    showTimeRemainingOverride,
    showSpeedOverride,
  ]);

  // Handle progress bar click for navigation
  const handleProgressClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!onNavigate) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = (clickX / rect.width) * 100;

      onNavigate(Math.min(Math.max(percentage, 0), 100));
    },
    [onNavigate]
  );

  // Format time remaining
  const timeRemainingText = useMemo(() => {
    if (progressData.timeRemainingMs <= 0) {
      return t("reader.progress.complete");
    }
    return formatDuration(
      progressData.timeRemainingMs,
      compact ? "compact" : "short"
    );
  }, [progressData.timeRemainingMs, compact, t]);

  // Format percentage
  const percentageText = useMemo(
    () => formatPercentage(progressData.percentage, compact ? 0 : 1),
    [progressData.percentage, compact]
  );

  // Format WPM
  const wpmText = useMemo(
    () => formatWpm(progressData.wpm),
    [progressData.wpm]
  );

  // Compact layout
  if (compact) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          minWidth: 0,
        }}
      >
        {displaySettings.showProgressBar && (
          <LinearProgress
            variant="determinate"
            value={progressData.percentage}
            sx={{
              flex: 1,
              minWidth: 60,
              height: 4,
              borderRadius: 2,
              cursor: onNavigate ? "pointer" : "default",
            }}
            onClick={handleProgressClick}
          />
        )}

        {displaySettings.showPercentage && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ whiteSpace: "nowrap" }}
          >
            {percentageText}
          </Typography>
        )}

        {displaySettings.showTimeRemaining &&
          progressData.timeRemainingMs > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ whiteSpace: "nowrap" }}
            >
              {timeRemainingText}
            </Typography>
          )}
      </Box>
    );
  }

  // Standard layout
  return (
    <Box sx={{ width: "100%" }}>
      {/* Progress bar with percentage */}
      {displaySettings.showProgressBar && (
        <Box sx={{ mb: 1 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 0.5,
            }}
          >
            {displaySettings.showPercentage && (
              <Typography variant="body2" color="text.secondary">
                {t("reader.progress.progress")}: {percentageText}
              </Typography>
            )}

            {displaySettings.showPercentage && (
              <Typography variant="caption" color="text.secondary">
                {progressData.currentPosition.toLocaleString()} /{" "}
                {progressData.totalPositions.toLocaleString()}
              </Typography>
            )}
          </Box>

          <Tooltip
            title={
              onNavigate
                ? t("reader.progress.clickToNavigate")
                : `${progressData.percentage.toFixed(1)}%`
            }
            placement="top"
          >
            <LinearProgress
              variant="determinate"
              value={progressData.percentage}
              sx={{
                height: 8,
                borderRadius: 4,
                cursor: onNavigate ? "pointer" : "default",
                backgroundColor: theme.palette.action.hover,
                "& .MuiLinearProgress-bar": {
                  borderRadius: 4,
                },
              }}
              onClick={handleProgressClick}
            />
          </Tooltip>
        </Box>
      )}

      {/* Stats row */}
      {(displaySettings.showTimeRemaining || displaySettings.showSpeed) && (
        <Stack
          direction="row"
          spacing={2}
          sx={{
            justifyContent: "flex-start",
            flexWrap: "wrap",
          }}
        >
          {displaySettings.showTimeRemaining && (
            <Tooltip title={t("reader.progress.timeRemainingTooltip")}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <AccessTimeIcon
                  sx={{ fontSize: 16, color: "text.secondary" }}
                />
                <Typography variant="body2" color="text.secondary">
                  {progressData.timeRemainingMs > 0
                    ? t("reader.progress.timeRemaining", {
                        time: timeRemainingText,
                      })
                    : t("reader.progress.complete")}
                </Typography>
              </Box>
            </Tooltip>
          )}

          {displaySettings.showSpeed && (
            <Tooltip title={t("reader.progress.readingSpeedTooltip")}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <SpeedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  {wpmText}
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Stack>
      )}

      {/* Detailed mode: additional stats */}
      {displayMode === "detailed" && (
        <Box
          sx={{
            mt: 1,
            pt: 1,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Stack direction="row" spacing={3} flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">
              {t("reader.progress.wordsRead", {
                current: progressData.wordsRead.toLocaleString(),
                total: progressData.totalWords.toLocaleString(),
              })}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              {t("reader.progress.timeSpent", {
                time: formatDuration(progressData.timeSpentMs, "short"),
              })}
            </Typography>

            {progressData.averageWpm > 0 && (
              <Typography variant="caption" color="text.secondary">
                {t("reader.progress.averageSpeed", {
                  wpm: Math.round(progressData.averageWpm),
                })}
              </Typography>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

export default ProgressTracker;
