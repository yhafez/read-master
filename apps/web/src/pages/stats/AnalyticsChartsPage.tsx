/**
 * Enhanced Analytics Charts Page
 *
 * Displays reading time, speed, and completion charts
 */

import { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";
import {
  useReadingTimeAnalytics,
  useReadingSpeedAnalytics,
  useCompletionsAnalytics,
} from "@/hooks/useAnalyticsCharts";

// ============================================================================
// Chart Colors
// ============================================================================

const COLORS = {
  primary: "#1976d2",
  secondary: "#dc004e",
  success: "#4caf50",
  warning: "#ff9800",
  error: "#f44336",
  info: "#2196f3",
  purple: "#9c27b0",
  teal: "#009688",
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: COLORS.success,
  READING: COLORS.info,
  WANT_TO_READ: COLORS.warning,
  ABANDONED: COLORS.error,
};

// ============================================================================
// Component
// ============================================================================

export function AnalyticsChartsPage() {
  const { t } = useTranslation();

  // Period state
  const [timePeriod, setTimePeriod] = useState<"7d" | "30d" | "90d" | "1y">(
    "30d"
  );
  const [speedPeriod, setSpeedPeriod] = useState<"7d" | "30d" | "90d" | "1y">(
    "30d"
  );
  const [completionPeriod, setCompletionPeriod] = useState<
    "7d" | "30d" | "90d" | "1y" | "all"
  >("1y");

  // Fetch data
  const {
    data: readingTimeData,
    isLoading: isLoadingTime,
    error: timeError,
  } = useReadingTimeAnalytics(timePeriod, "day");

  const {
    data: speedData,
    isLoading: isLoadingSpeed,
    error: speedError,
  } = useReadingSpeedAnalytics(speedPeriod);

  const {
    data: completionsData,
    isLoading: isLoadingCompletions,
    error: completionsError,
  } = useCompletionsAnalytics(completionPeriod);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        {t("stats.analytics.title", "Enhanced Analytics")}
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {t(
          "stats.analytics.description",
          "Track your reading habits with detailed charts and insights"
        )}
      </Typography>

      {/* Reading Time Chart */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6">
            {t("stats.analytics.readingTime", "Reading Time")}
          </Typography>
          <ToggleButtonGroup
            value={timePeriod}
            exclusive
            onChange={(_, value) => value && setTimePeriod(value)}
            size="small"
          >
            <ToggleButton value="7d">7d</ToggleButton>
            <ToggleButton value="30d">30d</ToggleButton>
            <ToggleButton value="90d">90d</ToggleButton>
            <ToggleButton value="1y">1y</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {isLoadingTime && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {timeError && (
          <Alert severity="error">
            {t("stats.analytics.errorLoading", "Failed to load analytics data")}
          </Alert>
        )}

        {readingTimeData && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      {t("stats.analytics.totalTime", "Total Time")}
                    </Typography>
                    <Typography variant="h5">
                      {readingTimeData.summary.totalHours}h
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      {t("stats.analytics.avgPerDay", "Avg Per Day")}
                    </Typography>
                    <Typography variant="h5">
                      {readingTimeData.summary.avgMinutesPerDay} min
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      {t("stats.analytics.sessions", "Sessions")}
                    </Typography>
                    <Typography variant="h5">
                      {readingTimeData.summary.totalSessions}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      {t("stats.analytics.avgWpm", "Avg WPM")}
                    </Typography>
                    <Typography variant="h5">
                      {readingTimeData.summary.avgWpm || "—"}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={readingTimeData.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis
                  label={{
                    value: "Minutes",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="minutes"
                  fill={COLORS.primary}
                  name="Reading Time (min)"
                />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </Paper>

      {/* Reading Speed Chart */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6">
            {t("stats.analytics.readingSpeed", "Reading Speed Trends")}
          </Typography>
          <ToggleButtonGroup
            value={speedPeriod}
            exclusive
            onChange={(_, value) => value && setSpeedPeriod(value)}
            size="small"
          >
            <ToggleButton value="7d">7d</ToggleButton>
            <ToggleButton value="30d">30d</ToggleButton>
            <ToggleButton value="90d">90d</ToggleButton>
            <ToggleButton value="1y">1y</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {isLoadingSpeed && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {speedError && (
          <Alert severity="error">
            {t("stats.analytics.errorLoading", "Failed to load analytics data")}
          </Alert>
        )}

        {speedData && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      {t("stats.analytics.currentWpm", "Current Avg WPM")}
                    </Typography>
                    <Typography variant="h5">
                      {speedData.summary.currentAvgWpm}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      {t("stats.analytics.overallWpm", "Overall Avg WPM")}
                    </Typography>
                    <Typography variant="h5">
                      {speedData.summary.overallAvgWpm}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      {t("stats.analytics.improvement", "Improvement")}
                    </Typography>
                    <Typography
                      variant="h5"
                      color={
                        speedData.summary.improvementPercent &&
                        speedData.summary.improvementPercent > 0
                          ? "success.main"
                          : "text.primary"
                      }
                    >
                      {speedData.summary.improvementPercent !== null
                        ? `${speedData.summary.improvementPercent > 0 ? "+" : ""}${speedData.summary.improvementPercent}%`
                        : "—"}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      {t("stats.analytics.fastestWpm", "Fastest WPM")}
                    </Typography>
                    <Typography variant="h5">
                      {speedData.summary.fastestWpm || "—"}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={speedData.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis
                  label={{ value: "WPM", angle: -90, position: "insideLeft" }}
                />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgWpm"
                  stroke={COLORS.primary}
                  name="Avg WPM"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="maxWpm"
                  stroke={COLORS.success}
                  strokeDasharray="5 5"
                  name="Max WPM"
                  strokeWidth={1}
                />
              </LineChart>
            </ResponsiveContainer>

            {speedData.byGenre.length > 0 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="subtitle1" gutterBottom>
                  {t("stats.analytics.speedByGenre", "Speed by Genre")}
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={speedData.byGenre.slice(0, 5)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="genre" type="category" width={100} />
                    <Tooltip />
                    <Bar
                      dataKey="avgWpm"
                      fill={COLORS.secondary}
                      name="Avg WPM"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </>
        )}
      </Paper>

      {/* Completions Chart */}
      <Paper sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6">
            {t("stats.analytics.completions", "Book Completions")}
          </Typography>
          <ToggleButtonGroup
            value={completionPeriod}
            exclusive
            onChange={(_, value) => value && setCompletionPeriod(value)}
            size="small"
          >
            <ToggleButton value="30d">30d</ToggleButton>
            <ToggleButton value="90d">90d</ToggleButton>
            <ToggleButton value="1y">1y</ToggleButton>
            <ToggleButton value="all">All</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {isLoadingCompletions && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {completionsError && (
          <Alert severity="error">
            {t("stats.analytics.errorLoading", "Failed to load analytics data")}
          </Alert>
        )}

        {completionsData && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      {t("stats.analytics.completed", "Completed")}
                    </Typography>
                    <Typography variant="h5">
                      {completionsData.summary.totalCompleted}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      {t("stats.analytics.inProgress", "In Progress")}
                    </Typography>
                    <Typography variant="h5">
                      {completionsData.summary.totalInProgress}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      {t("stats.analytics.completionRate", "Completion Rate")}
                    </Typography>
                    <Typography variant="h5">
                      {completionsData.summary.completionRate}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      {t("stats.analytics.avgTimeToComplete", "Avg Time")}
                    </Typography>
                    <Typography variant="h5">
                      {completionsData.summary.avgTimeToComplete !== null
                        ? `${completionsData.summary.avgTimeToComplete}d`
                        : "—"}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {completionsData.monthlyData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={completionsData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke={COLORS.success}
                    name="Completed"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="started"
                    stroke={COLORS.info}
                    name="Started"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="abandoned"
                    stroke={COLORS.error}
                    name="Abandoned"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            {completionsData.byStatus.length > 0 && (
              <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    {t("stats.analytics.booksByStatus", "Books by Status")}
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={completionsData.byStatus as never}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {completionsData.byStatus.map((entry) => (
                          <Cell
                            key={entry.status}
                            fill={STATUS_COLORS[entry.status] || COLORS.info}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Grid>
                {completionsData.byGenre.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      {t("stats.analytics.topGenres", "Top Genres")}
                    </Typography>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={completionsData.byGenre.slice(0, 5)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="genre" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="completed"
                          stackId="a"
                          fill={COLORS.success}
                          name="Completed"
                        />
                        <Bar
                          dataKey="inProgress"
                          stackId="a"
                          fill={COLORS.info}
                          name="In Progress"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Grid>
                )}
              </Grid>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
}
