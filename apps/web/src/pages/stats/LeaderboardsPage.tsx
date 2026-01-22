/**
 * Leaderboards Page
 *
 * Shows global and friends leaderboards for different metrics and time periods.
 */

import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  Chip,
  Skeleton,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  alpha,
} from "@mui/material";
import {
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
  Public as GlobalIcon,
  People as FriendsIcon,
  MenuBook as BooksIcon,
  Timer as TimeIcon,
  LocalFireDepartment as StreakIcon,
  Star as XPIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import {
  useLeaderboard,
  type LeaderboardMetric,
  type LeaderboardPeriod,
  type LeaderboardType,
  type LeaderboardEntry,
} from "@/hooks/useNewLeaderboard";

// ============================================================================
// Constants
// ============================================================================

const RANK_COLORS = {
  1: "#FFD700", // Gold
  2: "#C0C0C0", // Silver
  3: "#CD7F32", // Bronze
};

const TIER_COLORS: Record<string, string> = {
  FREE: "#9e9e9e",
  PRO: "#2196f3",
  SCHOLAR: "#9c27b0",
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatScore(score: number, metric: LeaderboardMetric): string {
  switch (metric) {
    case "time": {
      // Convert seconds to hours
      const hours = Math.floor(score / 3600);
      const minutes = Math.floor((score % 3600) / 60);
      if (hours === 0) return `${minutes}m`;
      return `${hours}h ${minutes}m`;
    }
    case "xp":
      return score.toLocaleString();
    case "pages": {
      // Convert words to estimated pages (250 words per page)
      const pages = Math.floor(score / 250);
      return pages.toLocaleString();
    }
    default:
      return score.toLocaleString();
  }
}

function getRankIcon(rank: number): React.ReactNode {
  if (rank === 1) return <TrophyIcon sx={{ color: RANK_COLORS[1] }} />;
  if (rank === 2) return <TrophyIcon sx={{ color: RANK_COLORS[2] }} />;
  if (rank === 3) return <TrophyIcon sx={{ color: RANK_COLORS[3] }} />;
  return (
    <Typography variant="body2" fontWeight="bold">
      {rank}
    </Typography>
  );
}

function getChangeIcon(change: number): React.ReactNode {
  if (change > 0) return <TrendingUpIcon color="success" fontSize="small" />;
  if (change < 0) return <TrendingDownIcon color="error" fontSize="small" />;
  return <RemoveIcon color="disabled" fontSize="small" />;
}

// ============================================================================
// Components
// ============================================================================

interface LeaderboardTableProps {
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  type: LeaderboardType;
}

function LeaderboardTable({
  metric,
  period,
  type,
}: LeaderboardTableProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data, isLoading, error } = useLeaderboard({ metric, period, type });

  if (isLoading) {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t("leaderboards.rank")}</TableCell>
              <TableCell>{t("leaderboards.user")}</TableCell>
              <TableCell align="right">{t("leaderboards.score")}</TableCell>
              <TableCell align="center">{t("leaderboards.change")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(10)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton width={40} />
                </TableCell>
                <TableCell>
                  <Skeleton width={200} />
                </TableCell>
                <TableCell>
                  <Skeleton width={80} />
                </TableCell>
                <TableCell>
                  <Skeleton width={40} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {t("leaderboards.errorLoading", "Failed to load leaderboard")}
      </Alert>
    );
  }

  if (!data || data.leaderboard.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          {type === "friends"
            ? t("leaderboards.noFriends", "Follow users to see their rankings")
            : t("leaderboards.noData", "No data available")}
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={80}>{t("leaderboards.rank")}</TableCell>
              <TableCell>{t("leaderboards.user")}</TableCell>
              <TableCell align="right">{t("leaderboards.score")}</TableCell>
              <TableCell align="center" width={100}>
                {t("leaderboards.change")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.leaderboard.map((entry) => (
              <TableRow
                key={entry.userId}
                sx={{
                  ...(entry.isCurrentUser && {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    "& td": {
                      fontWeight: "bold",
                    },
                  }),
                  ...(entry.rank <= 3 && {
                    bgcolor: alpha(RANK_COLORS[entry.rank as 1 | 2 | 3], 0.05),
                  }),
                }}
              >
                {/* Rank */}
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {getRankIcon(entry.rank)}
                  </Box>
                </TableCell>

                {/* User */}
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar
                      src={entry.avatar ?? ""}
                      sx={{ width: 40, height: 40 }}
                    >
                      {entry.username?.[0]?.toUpperCase() ?? "?"}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {entry.displayName || entry.username}
                        {entry.isCurrentUser && (
                          <Chip
                            label={t("leaderboards.you", "You")}
                            size="small"
                            color="primary"
                            sx={{ ml: 1, height: 20 }}
                          />
                        )}
                      </Typography>
                      <Chip
                        label={entry.tier}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: "0.65rem",
                          bgcolor: TIER_COLORS[entry.tier] || TIER_COLORS.FREE,
                          color: "white",
                        }}
                      />
                    </Box>
                  </Box>
                </TableCell>

                {/* Score */}
                <TableCell align="right">
                  <Typography variant="h6" fontWeight="bold">
                    {formatScore(entry.score, metric)}
                  </Typography>
                </TableCell>

                {/* Change */}
                <TableCell align="center">
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.5,
                    }}
                  >
                    {getChangeIcon(entry.change)}
                    {entry.change !== 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {Math.abs(entry.change)}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Current user rank if not in top list */}
      {data.currentUser &&
        !data.leaderboard.find((e: LeaderboardEntry) => e.isCurrentUser) && (
          <Paper sx={{ mt: 2, p: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              {t("leaderboards.yourRank", "Your Rank")}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
              <Typography variant="h5" fontWeight="bold">
                #{data.currentUser.rank}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatScore(data.currentUser.score, metric)}
              </Typography>
            </Box>
          </Paper>
        )}
    </Box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LeaderboardsPage(): React.ReactElement {
  const { t } = useTranslation();
  const [type, setType] = useState<LeaderboardType>("global");
  const [metric, setMetric] = useState<LeaderboardMetric>("books");
  const [period, setPeriod] = useState<LeaderboardPeriod>("alltime");

  const handleTypeChange = (
    _event: React.SyntheticEvent,
    newValue: LeaderboardType
  ) => {
    if (newValue) setType(newValue);
  };

  const handleMetricChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMetric: LeaderboardMetric | null
  ) => {
    if (newMetric) setMetric(newMetric);
  };

  const handlePeriodChange = (
    _event: React.MouseEvent<HTMLElement>,
    newPeriod: LeaderboardPeriod | null
  ) => {
    if (newPeriod) setPeriod(newPeriod);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t("leaderboards.title", "Leaderboards")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t(
            "leaderboards.subtitle",
            "Compete with readers worldwide or challenge your friends"
          )}
        </Typography>
      </Box>

      {/* Tabs for Global/Friends */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={type} onChange={handleTypeChange} variant="fullWidth">
          <Tab
            value="global"
            label={t("leaderboards.global", "Global")}
            icon={<GlobalIcon />}
            iconPosition="start"
          />
          <Tab
            value="friends"
            label={t("leaderboards.friends", "Friends")}
            icon={<FriendsIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Metric selector */}
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              {t("leaderboards.metric", "Metric")}
            </Typography>
            <ToggleButtonGroup
              value={metric}
              exclusive
              onChange={handleMetricChange}
              size="small"
              fullWidth
              sx={{ mt: 0.5 }}
            >
              <ToggleButton value="books">
                <BooksIcon sx={{ mr: 0.5, fontSize: 18 }} />
                {t("leaderboards.metrics.books", "Books")}
              </ToggleButton>
              <ToggleButton value="time">
                <TimeIcon sx={{ mr: 0.5, fontSize: 18 }} />
                {t("leaderboards.metrics.time", "Time")}
              </ToggleButton>
              <ToggleButton value="streak">
                <StreakIcon sx={{ mr: 0.5, fontSize: 18 }} />
                {t("leaderboards.metrics.streak", "Streak")}
              </ToggleButton>
              <ToggleButton value="xp">
                <XPIcon sx={{ mr: 0.5, fontSize: 18 }} />
                {t("leaderboards.metrics.xp", "XP")}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Period selector */}
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              {t("leaderboards.period", "Period")}
            </Typography>
            <ToggleButtonGroup
              value={period}
              exclusive
              onChange={handlePeriodChange}
              size="small"
              fullWidth
              sx={{ mt: 0.5 }}
            >
              <ToggleButton value="daily">
                {t("leaderboards.periods.daily", "Daily")}
              </ToggleButton>
              <ToggleButton value="weekly">
                {t("leaderboards.periods.weekly", "Weekly")}
              </ToggleButton>
              <ToggleButton value="monthly">
                {t("leaderboards.periods.monthly", "Monthly")}
              </ToggleButton>
              <ToggleButton value="alltime">
                {t("leaderboards.periods.alltime", "All Time")}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </Paper>

      {/* Leaderboard table */}
      <LeaderboardTable metric={metric} period={period} type={type} />
    </Box>
  );
}

export default LeaderboardsPage;
