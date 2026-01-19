/**
 * User Stats Page - Dashboard displaying user gamification statistics
 *
 * Shows:
 * - XP and level progression
 * - Reading streak
 * - Books read and reading time
 * - Flashcard and assessment stats
 * - Activity charts
 */

import { useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid2 as Grid,
  LinearProgress,
  Chip,
  Divider,
  Card,
  CardContent,
  useTheme,
} from "@mui/material";
import {
  EmojiEvents as TrophyIcon,
  LocalFireDepartment as StreakIcon,
  MenuBook as BookIcon,
  AccessTime as TimeIcon,
  School as FlashcardIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Star as StarIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import {
  useUserStatsStore,
  formatReadingTime,
  getCurrentLevelProgress,
  MAX_LEVEL,
} from "@/stores/userStatsStore";

/**
 * Stat card component for displaying individual statistics
 */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string | undefined;
  color?: "primary" | "secondary" | "warning" | "error" | "success" | "info";
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  color = "primary",
}: StatCardProps): React.ReactElement {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Box sx={{ color: `${color}.main` }}>{icon}</Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
        <Typography variant="h4" component="div" fontWeight="bold">
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Activity bar chart component for the last 7 days
 */
function ActivityChart(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const getRecentActivity = useUserStatsStore((s) => s.getRecentActivity);

  const chartData = useMemo(() => {
    const activity = getRecentActivity(7);
    const today = new Date();
    const days: Array<{
      label: string;
      date: string;
      minutes: number;
    }> = [];

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const parts = date.toISOString().split("T");
      const dateString = parts[0] ?? "";
      const dayName = date.toLocaleDateString(undefined, { weekday: "short" });

      const activityForDay = activity.find((a) => a.date === dateString);
      days.push({
        label: dayName,
        date: dateString,
        minutes: activityForDay?.minutesRead ?? 0,
      });
    }

    return days;
  }, [getRecentActivity]);

  const maxMinutes = useMemo(
    () => Math.max(...chartData.map((d) => d.minutes), 30), // Minimum of 30 for scale
    [chartData]
  );

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {t("userStats.weeklyActivity", "Weekly Activity")}
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          height: 120,
          gap: 1,
          mt: 2,
        }}
      >
        {chartData.map((day) => {
          const height = maxMinutes > 0 ? (day.minutes / maxMinutes) * 100 : 0;
          return (
            <Box
              key={day.date}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 0.5 }}
              >
                {day.minutes > 0 ? `${day.minutes}m` : ""}
              </Typography>
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 40,
                  height: `${Math.max(height, 4)}%`,
                  minHeight: 4,
                  bgcolor: day.minutes > 0 ? "primary.main" : "action.disabled",
                  borderRadius: 1,
                  transition: theme.transitions.create("height"),
                }}
              />
              <Typography variant="caption" sx={{ mt: 0.5 }}>
                {day.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

/**
 * Level progress component
 */
function LevelProgress(): React.ReactElement {
  const { t } = useTranslation();
  const totalXP = useUserStatsStore((s) => s.totalXP);
  const level = useUserStatsStore((s) => s.level);

  const progress = useMemo(() => getCurrentLevelProgress(totalXP), [totalXP]);

  return (
    <Paper sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TrophyIcon color="warning" fontSize="large" />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {t("userStats.level", "Level")} {level}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {totalXP.toLocaleString()} {t("userStats.totalXP", "Total XP")}
            </Typography>
          </Box>
        </Box>
        {level < MAX_LEVEL && (
          <Chip
            icon={<StarIcon />}
            label={t("userStats.nextLevel", "Next: Level {{level}}", {
              level: level + 1,
            })}
            color="primary"
            variant="outlined"
          />
        )}
      </Box>

      {level < MAX_LEVEL ? (
        <>
          <LinearProgress
            variant="determinate"
            value={progress.progressPercent}
            sx={{ height: 10, borderRadius: 5, mb: 1 }}
          />
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              {progress.currentLevelXP.toLocaleString()} XP
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {progress.xpToNextLevel.toLocaleString()} XP{" "}
              {t("userStats.needed", "needed")}
            </Typography>
          </Box>
        </>
      ) : (
        <Typography variant="body1" color="success.main" fontWeight="bold">
          {t("userStats.maxLevel", "Maximum level reached!")}
        </Typography>
      )}
    </Paper>
  );
}

/**
 * Streak display component
 */
function StreakDisplay(): React.ReactElement {
  const { t } = useTranslation();
  const currentStreak = useUserStatsStore((s) => s.currentStreak);
  const longestStreak = useUserStatsStore((s) => s.longestStreak);

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <StreakIcon
          sx={{
            fontSize: 48,
            color: currentStreak > 0 ? "warning.main" : "action.disabled",
          }}
        />
        <Box>
          <Typography variant="h4" fontWeight="bold">
            {currentStreak}{" "}
            <Typography component="span" variant="h6" color="text.secondary">
              {t("userStats.days", "days")}
            </Typography>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("userStats.currentStreak", "Current Streak")}
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="body2" color="text.secondary">
          {t("userStats.longestStreak", "Longest Streak")}
        </Typography>
        <Typography variant="body2" fontWeight="bold">
          {longestStreak} {t("userStats.days", "days")}
        </Typography>
      </Box>
    </Paper>
  );
}

export function UserStatsPage(): React.ReactElement {
  const { t } = useTranslation();

  const totalReadingMinutes = useUserStatsStore((s) => s.totalReadingMinutes);
  const booksCompleted = useUserStatsStore((s) => s.booksCompleted);
  const averageWPM = useUserStatsStore((s) => s.averageWPM);
  const flashcardsReviewed = useUserStatsStore((s) => s.flashcardsReviewed);
  const assessmentsCompleted = useUserStatsStore((s) => s.assessmentsCompleted);
  const averageAssessmentScore = useUserStatsStore(
    (s) => s.averageAssessmentScore
  );
  const getTotalForPeriod = useUserStatsStore((s) => s.getTotalForPeriod);

  const weeklyMinutes = useMemo(
    () => getTotalForPeriod(7, "minutesRead"),
    [getTotalForPeriod]
  );
  const weeklyBooks = useMemo(
    () => getTotalForPeriod(7, "booksCompleted"),
    [getTotalForPeriod]
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t("userStats.title", "Your Statistics")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t(
            "userStats.subtitle",
            "Track your reading progress and achievements"
          )}
        </Typography>
      </Box>

      {/* Level and Streak section */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <LevelProgress />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <StreakDisplay />
        </Grid>
      </Grid>

      {/* Main stats cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            icon={<BookIcon />}
            label={t("userStats.booksCompleted", "Books Completed")}
            value={booksCompleted}
            subtitle={t("userStats.thisWeek", "This week: {{count}}", {
              count: weeklyBooks,
            })}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            icon={<TimeIcon />}
            label={t("userStats.totalReadingTime", "Total Reading Time")}
            value={formatReadingTime(totalReadingMinutes)}
            subtitle={t("userStats.thisWeekTime", "This week: {{time}}", {
              time: formatReadingTime(weeklyMinutes),
            })}
            color="secondary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            icon={<SpeedIcon />}
            label={t("userStats.averageSpeed", "Average Speed")}
            value={`${averageWPM} WPM`}
            subtitle={t("userStats.wordsPerMinute", "Words per minute")}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            icon={<FlashcardIcon />}
            label={t("userStats.flashcardsReviewed", "Flashcards Reviewed")}
            value={flashcardsReviewed}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            icon={<AssessmentIcon />}
            label={t("userStats.assessmentsTaken", "Assessments Taken")}
            value={assessmentsCompleted}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            icon={<TrendingUpIcon />}
            label={t("userStats.averageScore", "Average Score")}
            value={
              assessmentsCompleted > 0
                ? `${averageAssessmentScore}%`
                : t("userStats.noData", "N/A")
            }
            subtitle={
              assessmentsCompleted > 0
                ? t("userStats.acrossAssessments", "Across all assessments")
                : undefined
            }
            color="error"
          />
        </Grid>
      </Grid>

      {/* Activity Chart */}
      <ActivityChart />
    </Box>
  );
}

export default UserStatsPage;
