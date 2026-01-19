/**
 * Leaderboard page - displays user rankings for various metrics
 */

import { useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Avatar,
  Chip,
  Stack,
  Skeleton,
  Alert,
  useTheme,
  useMediaQuery,
  type SelectChangeEvent,
} from "@mui/material";
import {
  EmojiEvents as TrophyIcon,
  MenuBook as BookIcon,
  Whatshot as StreakIcon,
  Timer as TimeIcon,
  Star as StarIcon,
  People as PeopleIcon,
  Public as GlobalIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import { useLeaderboard, type LeaderboardEntry } from "@/hooks/useLeaderboard";

// ============================================================================
// Constants
// ============================================================================

const ITEMS_PER_PAGE = 50;

/**
 * Metric configuration
 */
const METRICS = [
  {
    value: "xp" as const,
    label: "XP",
    icon: StarIcon,
    color: "#FFD700",
    description: "Total experience points earned",
  },
  {
    value: "books" as const,
    label: "Books",
    icon: BookIcon,
    color: "#4CAF50",
    description: "Total books completed",
  },
  {
    value: "streak" as const,
    label: "Streak",
    icon: StreakIcon,
    color: "#FF5722",
    description: "Current reading streak (days)",
  },
  {
    value: "reading_time" as const,
    label: "Reading Time",
    icon: TimeIcon,
    color: "#2196F3",
    description: "Total reading time (minutes)",
  },
] as const;

/**
 * Timeframe configuration
 */
const TIMEFRAMES = [
  { value: "weekly" as const, label: "This Week" },
  { value: "monthly" as const, label: "This Month" },
  { value: "all_time" as const, label: "All Time" },
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format value based on metric type
 */
function formatValue(
  value: number,
  metric: "xp" | "books" | "streak" | "reading_time"
): string {
  switch (metric) {
    case "xp":
      return value.toLocaleString();
    case "books":
      return value.toString();
    case "streak":
      return `${value} ${value === 1 ? "day" : "days"}`;
    case "reading_time": {
      const hours = Math.floor(value / 60);
      const minutes = value % 60;
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    }
    default:
      return value.toString();
  }
}

/**
 * Get medal emoji for top 3 ranks
 */
function getMedalEmoji(rank: number): string | null {
  switch (rank) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return null;
  }
}

// ============================================================================
// Components
// ============================================================================

/**
 * Leaderboard entry row component
 */
function LeaderboardEntryRow({
  entry,
  metric,
}: {
  entry: LeaderboardEntry;
  metric: "xp" | "books" | "streak" | "reading_time";
}): React.ReactElement {
  const theme = useTheme();
  const medal = getMedalEmoji(entry.rank);
  const isTopThree = entry.rank <= 3;

  return (
    <Paper
      sx={{
        p: 2,
        display: "flex",
        alignItems: "center",
        gap: 2,
        backgroundColor: entry.isCurrentUser
          ? theme.palette.mode === "dark"
            ? "rgba(144, 202, 249, 0.08)"
            : "rgba(25, 118, 210, 0.08)"
          : isTopThree
            ? theme.palette.mode === "dark"
              ? "rgba(255, 215, 0, 0.05)"
              : "rgba(255, 215, 0, 0.08)"
            : "background.paper",
        border: entry.isCurrentUser ? 2 : 1,
        borderColor: entry.isCurrentUser
          ? "primary.main"
          : isTopThree
            ? "rgba(255, 215, 0, 0.3)"
            : "divider",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: theme.shadows[4],
        },
      }}
    >
      {/* Rank */}
      <Box
        sx={{
          minWidth: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {medal ? (
          <Typography variant="h4" component="span">
            {medal}
          </Typography>
        ) : (
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ fontWeight: "bold" }}
          >
            #{entry.rank}
          </Typography>
        )}
      </Box>

      {/* User info */}
      <Avatar
        {...(entry.user.avatarUrl ? { src: entry.user.avatarUrl } : {})}
        alt={entry.user.displayName ?? entry.user.username}
        sx={{ width: 48, height: 48 }}
      >
        {(entry.user.displayName ?? entry.user.username)
          .charAt(0)
          .toUpperCase()}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" noWrap sx={{ fontWeight: "medium" }}>
          {entry.user.displayName || entry.user.username}
          {entry.isCurrentUser && (
            <Chip
              label="You"
              size="small"
              color="primary"
              sx={{ ml: 1, height: 20, fontSize: "0.75rem" }}
            />
          )}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          @{entry.user.username}
        </Typography>
      </Box>

      {/* Value */}
      <Box sx={{ textAlign: "right" }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: "bold",
            color: isTopThree ? "#FFD700" : "text.primary",
          }}
        >
          {formatValue(entry.value, metric)}
        </Typography>
      </Box>
    </Paper>
  );
}

/**
 * Loading skeleton for leaderboard entries
 */
function LeaderboardSkeleton(): React.ReactElement {
  return (
    <Stack spacing={2}>
      {Array.from({ length: 10 }).map((_, index) => (
        <Paper key={index} sx={{ p: 2, display: "flex", gap: 2 }}>
          <Skeleton variant="circular" width={48} height={48} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </Box>
          <Skeleton variant="text" width={80} />
        </Paper>
      ))}
    </Stack>
  );
}

/**
 * Current user rank badge
 */
function CurrentUserRankBadge({
  rank,
  metric,
}: {
  rank: number | null;
  metric: "xp" | "books" | "streak" | "reading_time";
}): React.ReactElement | null {
  const { t } = useTranslation();
  const metricConfig = METRICS.find((m) => m.value === metric);

  if (!rank || !metricConfig) return null;

  const Icon = metricConfig.icon;

  return (
    <Paper
      sx={{
        p: 2,
        mb: 3,
        display: "flex",
        alignItems: "center",
        gap: 2,
        backgroundColor: "primary.main",
        color: "primary.contrastText",
      }}
    >
      <Icon sx={{ fontSize: 32 }} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          {t("leaderboard.yourRank", "Your Rank")}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          {metricConfig.description}
        </Typography>
      </Box>
      <Typography variant="h4" sx={{ fontWeight: "bold" }}>
        #{rank}
      </Typography>
    </Paper>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Leaderboard page component
 */
export function LeaderboardPage(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // State
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly" | "all_time">(
    "weekly"
  );
  const [metric, setMetric] = useState<
    "xp" | "books" | "streak" | "reading_time"
  >("xp");
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Fetch leaderboard data
  const {
    data: leaderboardData,
    isLoading,
    isError,
    error,
  } = useLeaderboard({
    timeframe,
    metric,
    friendsOnly,
    page,
    limit: ITEMS_PER_PAGE,
  });

  // Get metric configuration
  const metricConfig = useMemo(
    () => METRICS.find((m) => m.value === metric),
    [metric]
  );

  // Handlers
  const handleTimeframeChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newTimeframe: string | null) => {
      if (newTimeframe) {
        setTimeframe(newTimeframe as "weekly" | "monthly" | "all_time");
        setPage(1); // Reset to first page
      }
    },
    []
  );

  const handleMetricChange = useCallback((event: SelectChangeEvent) => {
    setMetric(event.target.value as "xp" | "books" | "streak" | "reading_time");
    setPage(1); // Reset to first page
  }, []);

  const handleScopeToggle = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newScope: string | null) => {
      if (newScope !== null) {
        setFriendsOnly(newScope === "friends");
        setPage(1); // Reset to first page
      }
    },
    []
  );

  const handlePageChange = useCallback(
    (_event: React.ChangeEvent<unknown>, newPage: number) => {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    []
  );

  // Unused but kept for potential future use
  // const timeframeLabel = useMemo(
  //   () => TIMEFRAMES.find((t) => t.value === timeframe)?.label || "This Week",
  //   [timeframe]
  // );

  // const MetricIcon = metricConfig?.icon || StarIcon;

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            mb: 1,
          }}
        >
          <TrophyIcon sx={{ fontSize: 40, color: "#FFD700" }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
            {t("leaderboard.title", "Leaderboard")}
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          {t("leaderboard.subtitle", "Compete with readers around the world")}
        </Typography>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          {/* Timeframe selector */}
          <Box>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              {t("leaderboard.timeframe", "Timeframe")}
            </Typography>
            <ToggleButtonGroup
              value={timeframe}
              exclusive
              onChange={handleTimeframeChange}
              fullWidth={isMobile}
              size={isMobile ? "small" : "medium"}
            >
              {TIMEFRAMES.map((tf) => (
                <ToggleButton key={tf.value} value={tf.value}>
                  {tf.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Metric and scope row */}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            {/* Metric selector */}
            <FormControl fullWidth>
              <InputLabel id="metric-select-label">
                {t("leaderboard.metric", "Metric")}
              </InputLabel>
              <Select
                labelId="metric-select-label"
                value={metric}
                label={t("leaderboard.metric", "Metric")}
                onChange={handleMetricChange}
              >
                {METRICS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <MenuItem key={m.value} value={m.value}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Icon sx={{ fontSize: 20, color: m.color }} />
                        {m.label}
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* Global/Friends toggle */}
            <ToggleButtonGroup
              value={friendsOnly ? "friends" : "global"}
              exclusive
              onChange={handleScopeToggle}
              fullWidth={isMobile}
              size={isMobile ? "small" : "medium"}
              sx={{ minWidth: { sm: 200 } }}
            >
              <ToggleButton value="global">
                <GlobalIcon sx={{ mr: 0.5, fontSize: 20 }} />
                {t("leaderboard.global", "Global")}
              </ToggleButton>
              <ToggleButton value="friends">
                <PeopleIcon sx={{ mr: 0.5, fontSize: 20 }} />
                {t("leaderboard.friends", "Friends")}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Stack>
      </Paper>

      {/* Current user rank badge */}
      {!isLoading &&
        !isError &&
        leaderboardData?.currentUserRank &&
        metricConfig && (
          <CurrentUserRankBadge
            rank={leaderboardData.currentUserRank}
            metric={metric}
          />
        )}

      {/* Leaderboard entries */}
      {isLoading && <LeaderboardSkeleton />}

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error?.message ||
            t(
              "leaderboard.error",
              "Failed to load leaderboard. Please try again."
            )}
        </Alert>
      )}

      {!isLoading && !isError && leaderboardData && (
        <>
          {leaderboardData.entries.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {friendsOnly
                  ? t("leaderboard.noFriends", "No friends on the leaderboard")
                  : t("leaderboard.noEntries", "No entries yet")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {friendsOnly
                  ? t(
                      "leaderboard.noFriendsHint",
                      "Follow other readers to see them here"
                    )
                  : t(
                      "leaderboard.noEntriesHint",
                      "Start reading to appear on the leaderboard"
                    )}
              </Typography>
            </Paper>
          ) : (
            <>
              {/* Entries list */}
              <Stack spacing={2} sx={{ mb: 3 }}>
                {leaderboardData.entries.map((entry: LeaderboardEntry) => (
                  <LeaderboardEntryRow
                    key={entry.user.id}
                    entry={entry}
                    metric={metric}
                  />
                ))}
              </Stack>

              {/* Pagination */}
              {leaderboardData.pagination.totalPages > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                  <Pagination
                    count={leaderboardData.pagination.totalPages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    size={isMobile ? "small" : "medium"}
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </>
          )}
        </>
      )}

      {/* Info footer */}
      <Paper sx={{ p: 2, mt: 4, backgroundColor: "action.hover" }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {t(
            "leaderboard.privacyNote",
            "Only users who have opted in to share their stats are shown on the leaderboard."
          )}
        </Typography>
      </Paper>
    </Box>
  );
}

export default LeaderboardPage;
