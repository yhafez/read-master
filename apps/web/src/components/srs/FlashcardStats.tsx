/**
 * FlashcardStats Component
 *
 * A comprehensive dashboard for displaying flashcard statistics including
 * retention rate, cards by status, review history, streaks, and due cards.
 */

import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid2 as Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  LocalFireDepartment as StreakIcon,
  Schedule as ScheduleIcon,
  School as SchoolIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";

import type {
  FlashcardStatsProps,
  FlashcardStats as FlashcardStatsType,
  StatsPreferences,
  StatsLoadingState,
  StatsError,
  ChartType,
  TimeRange,
} from "./flashcardStatsTypes";
import {
  createDefaultStats,
  createMockStats,
  loadStatsPreferences,
  saveStatsPreferences,
  formatRetentionRate as formatRetentionRate,
  formatStreakCount,
  formatStudyTime,
  formatCardCount as formatCardCount,
  formatDate,
  getRetentionBadgeColor as getRetentionBadgeColor,
  getTrendColor,
  getRetentionTrendDirection,
  filterHistoryByRange,
  getChartData,
  CHART_TYPES,
  TIME_RANGES,
} from "./flashcardStatsTypes";

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * FlashcardStats displays comprehensive flashcard statistics
 */
export function FlashcardStats({
  bookId,
  className,
  onStudyNow,
  compact = false,
}: FlashcardStatsProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  // State
  const [stats, setStats] = useState<FlashcardStatsType>(createDefaultStats());
  const [preferences, setPreferences] = useState<StatsPreferences>(
    loadStatsPreferences()
  );
  const [loadingState, setLoadingState] = useState<StatsLoadingState>("idle");
  const [error, setError] = useState<StatsError | null>(null);

  // Load stats handler (defined before useEffect)
  const loadStats = useCallback(async () => {
    setLoadingState("loading");
    setError(null);

    try {
      // For now, use mock data. In production, this would be an API call
      // const response = await fetch(`/api/flashcards/stats${bookId ? `?bookId=${bookId}` : ''}`);
      // const data = await response.json();
      // setStats(data);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      setStats(createMockStats());
      setLoadingState("success");
    } catch {
      setError({
        type: "unknown",
        message: t("flashcards.stats.errors.loadFailed"),
        retryable: true,
      });
      setLoadingState("error");
    }
  }, [bookId, t]);

  // Load stats on mount and when bookId changes
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Save preferences when they change
  useEffect(() => {
    saveStatsPreferences(preferences);
  }, [preferences]);

  const handleChartTypeChange = useCallback((event: SelectChangeEvent) => {
    setPreferences((prev) => ({
      ...prev,
      chartType: event.target.value as ChartType,
    }));
  }, []);

  const handleTimeRangeChange = useCallback((event: SelectChangeEvent) => {
    setPreferences((prev) => ({
      ...prev,
      timeRange: event.target.value as TimeRange,
    }));
  }, []);

  const handleRefresh = useCallback(() => {
    loadStats();
  }, [loadStats]);

  // Filter history data based on selected time range
  const filteredHistory = filterHistoryByRange(
    stats.history,
    preferences.timeRange
  );
  const chartData = getChartData(filteredHistory, preferences.chartType);

  // Loading state
  if (loadingState === "loading" && stats.summary.totalCards === 0) {
    return <StatsLoadingSkeleton compact={compact} />;
  }

  // Error state
  if (loadingState === "error" && error) {
    return (
      <Alert
        severity="error"
        action={
          error.retryable && (
            <IconButton
              color="inherit"
              size="small"
              onClick={handleRefresh}
              aria-label={t("common.retry")}
            >
              <RefreshIcon />
            </IconButton>
          )
        }
      >
        {error.message}
      </Alert>
    );
  }

  return (
    <Box className={className}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" component="h2">
          {t("flashcards.stats.title")}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {onStudyNow && stats.summary.dueToday > 0 && (
            <Chip
              icon={<PlayIcon />}
              label={t("flashcards.stats.studyNow", {
                count: stats.summary.dueToday,
              })}
              color="primary"
              onClick={onStudyNow}
              clickable
            />
          )}
          <Tooltip title={t("flashcards.stats.refresh")}>
            <IconButton
              onClick={handleRefresh}
              disabled={loadingState === "loading"}
              size="small"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Due Today Card */}
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            title={t("flashcards.stats.dueToday")}
            value={formatCardCount(stats.summary.dueToday)}
            subtitle={
              stats.summary.overdueCards > 0
                ? t("flashcards.stats.overdue", {
                    count: stats.summary.overdueCards,
                  })
                : undefined
            }
            color={stats.summary.overdueCards > 0 ? "error" : "primary"}
            icon={<ScheduleIcon />}
          />
        </Grid>

        {/* Retention Rate Card */}
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            title={t("flashcards.stats.retention")}
            value={formatRetentionRate(stats.retention.overall)}
            subtitle={<RetentionTrendIndicator stats={stats.retention} />}
            color={
              getRetentionBadgeColor(stats.retention.overall) as
                | "success"
                | "warning"
                | "error"
                | "primary"
            }
            icon={<SchoolIcon />}
          />
        </Grid>

        {/* Streak Card */}
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            title={t("flashcards.stats.streak")}
            value={formatStreakCount(stats.streak.currentStreak)}
            subtitle={
              stats.streak.longestStreak > stats.streak.currentStreak
                ? t("flashcards.stats.bestStreak", {
                    count: stats.streak.longestStreak,
                  })
                : undefined
            }
            color={stats.streak.studiedToday ? "success" : "warning"}
            icon={<StreakIcon />}
          />
        </Grid>

        {/* Total Cards Card */}
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            title={t("flashcards.stats.totalCards")}
            value={formatCardCount(stats.summary.totalCards)}
            subtitle={t("flashcards.stats.activeCards", {
              count: stats.summary.activeCards,
            })}
            color="primary"
            icon={<SchoolIcon />}
          />
        </Grid>
      </Grid>

      {!compact && (
        <>
          {/* Cards by Status */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t("flashcards.stats.cardsByStatus")}
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatusBar
                  label={t("flashcards.stats.status.new")}
                  count={stats.summary.newCards}
                  total={stats.summary.totalCards}
                  color={theme.palette.info.main}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatusBar
                  label={t("flashcards.stats.status.learning")}
                  count={stats.summary.learningCards}
                  total={stats.summary.totalCards}
                  color={theme.palette.warning.main}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatusBar
                  label={t("flashcards.stats.status.review")}
                  count={stats.summary.reviewCards}
                  total={stats.summary.totalCards}
                  color={theme.palette.success.main}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatusBar
                  label={t("flashcards.stats.status.suspended")}
                  count={stats.summary.suspendedCards}
                  total={stats.summary.totalCards}
                  color={theme.palette.grey[500]}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* History Chart */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">
                {t("flashcards.stats.history")}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={preferences.chartType}
                    onChange={handleChartTypeChange}
                    aria-label={t("flashcards.stats.chartType")}
                  >
                    {CHART_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {t(type.labelKey)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <Select
                    value={preferences.timeRange}
                    onChange={handleTimeRangeChange}
                    aria-label={t("flashcards.stats.timeRange")}
                  >
                    {TIME_RANGES.map((range) => (
                      <MenuItem key={range.value} value={range.value}>
                        {t(range.labelKey)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Simple bar chart visualization */}
            <HistoryChart data={chartData} chartType={preferences.chartType} />
          </Paper>

          {/* Study Time */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t("flashcards.stats.studyTime")}
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h5" color="primary">
                    {formatStudyTime(stats.studyTime.today)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("flashcards.stats.today")}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h5" color="primary">
                    {formatStudyTime(stats.studyTime.thisWeek)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("flashcards.stats.thisWeek")}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h5" color="primary">
                    {formatStudyTime(stats.studyTime.thisMonth)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("flashcards.stats.thisMonth")}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h5" color="primary">
                    {formatStudyTime(stats.studyTime.averagePerDay)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("flashcards.stats.averagePerDay")}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Forecast */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t("flashcards.stats.forecast")}
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h5" color="primary">
                    {formatCardCount(stats.forecast.today)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("flashcards.stats.today")}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h5" color="primary">
                    {formatCardCount(stats.forecast.tomorrow)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("flashcards.stats.tomorrow")}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h5" color="primary">
                    {formatCardCount(stats.forecast.next7Days)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("flashcards.stats.next7Days")}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h5" color="primary">
                    {formatCardCount(stats.forecast.next30Days)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("flashcards.stats.next30Days")}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}
    </Box>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Individual stat card component
 */
function StatCard({
  title,
  value,
  subtitle,
  color = "primary",
  icon,
}: {
  title: string;
  value: string | number;
  subtitle?: React.ReactNode;
  color?: "primary" | "success" | "warning" | "error" | "info";
  icon?: React.ReactNode;
}) {
  const theme = useTheme();
  const colorValue = theme.palette[color]?.main || theme.palette.primary.main;

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ color: colorValue }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && <Box sx={{ color: colorValue, opacity: 0.7 }}>{icon}</Box>}
        </Box>
      </CardContent>
    </Card>
  );
}

/**
 * Retention trend indicator
 */
function RetentionTrendIndicator({
  stats,
}: {
  stats: { trend: "improving" | "declining" | "stable"; trendChange: number };
}) {
  const direction = getRetentionTrendDirection(stats.trend);
  const color = getTrendColor(stats.trend);

  const Icon =
    direction === "up"
      ? TrendingUpIcon
      : direction === "down"
        ? TrendingDownIcon
        : TrendingFlatIcon;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Icon fontSize="small" color={color === "default" ? "inherit" : color} />
      <Typography variant="caption" color={`${color}.main`}>
        {stats.trendChange > 0 ? "+" : ""}
        {stats.trendChange}%
      </Typography>
    </Box>
  );
}

/**
 * Status progress bar
 */
function StatusBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 0.5,
        }}
      >
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" fontWeight="medium">
          {formatCardCount(count)}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: "grey.200",
          "& .MuiLinearProgress-bar": {
            backgroundColor: color,
            borderRadius: 4,
          },
        }}
      />
    </Box>
  );
}

/**
 * Simple history chart visualization
 */
function HistoryChart({
  data,
  chartType,
}: {
  data: Array<{ date: string; value: number; label: string }>;
  chartType: ChartType;
}) {
  const theme = useTheme();

  if (data.length === 0) {
    return (
      <Box
        sx={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography color="text.secondary">No data available</Typography>
      </Box>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const getBarColor = (value: number): string => {
    const badgeColor = getRetentionBadgeColor(value);
    switch (badgeColor) {
      case "success":
        return theme.palette.success.main;
      case "warning":
        return theme.palette.warning.main;
      case "error":
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <Box
      sx={{ height: 200, display: "flex", alignItems: "flex-end", gap: 0.5 }}
    >
      {data.map((item) => {
        const height = (item.value / maxValue) * 180;
        return (
          <Tooltip
            key={item.date}
            title={`${formatDate(item.date)}: ${item.label}`}
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 4,
                maxWidth: 20,
                height: Math.max(height, 4),
                backgroundColor:
                  chartType === "retention"
                    ? getBarColor(item.value)
                    : theme.palette.primary.main,
                borderRadius: "2px 2px 0 0",
                transition: "height 0.3s ease",
                cursor: "pointer",
                "&:hover": {
                  opacity: 0.8,
                },
              }}
            />
          </Tooltip>
        );
      })}
    </Box>
  );
}

/**
 * Loading skeleton for stats
 */
function StatsLoadingSkeleton({ compact }: { compact?: boolean }) {
  return (
    <Box>
      <Skeleton variant="text" width={200} height={40} sx={{ mb: 3 }} />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[1, 2, 3, 4].map((i) => (
          <Grid key={i} size={{ xs: 6, sm: 3 }}>
            <Skeleton variant="rounded" height={120} />
          </Grid>
        ))}
      </Grid>
      {!compact && (
        <>
          <Skeleton variant="rounded" height={150} sx={{ mb: 3 }} />
          <Skeleton variant="rounded" height={250} sx={{ mb: 3 }} />
          <Skeleton variant="rounded" height={100} />
        </>
      )}
    </Box>
  );
}

// Default export
export default FlashcardStats;
