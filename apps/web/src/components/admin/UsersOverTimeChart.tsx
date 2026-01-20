/**
 * Users Over Time Chart Component
 *
 * Displays user growth trends over time including:
 * - Total users
 * - Active users
 * - New users
 * - Churned users
 *
 * Features:
 * - Date range selector (7d, 30d, 90d, 1y)
 * - Interactive tooltips
 * - Responsive design
 * - Loading and error states
 */

import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

type DateRange = "7d" | "30d" | "90d" | "1y";

type UserAnalytics = {
  dailyGrowth: Array<{
    date: string;
    newUsers: number;
    totalUsers: number;
    activeUsers: number;
    churned: number;
  }>;
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchUserAnalytics(): Promise<UserAnalytics> {
  const response = await fetch("/api/admin/analytics/users");

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to fetch user analytics",
    }));
    throw new Error(error.message || "Failed to fetch user analytics");
  }

  const data = await response.json();
  return data.data; // API returns { success: true, data: {...} }
}

// ============================================================================
// Component
// ============================================================================

export function UsersOverTimeChart() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  // Fetch data
  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "analytics", "users"],
    queryFn: fetchUserAnalytics,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter data by date range
  const filteredData = analytics?.dailyGrowth.slice(
    -getDaysForRange(dateRange)
  );

  // Format data for the chart
  const chartData =
    filteredData?.map((day) => ({
      date: new Date(day.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      "Total Users": day.totalUsers,
      "Active Users": day.activeUsers,
      "New Users": day.newUsers,
      Churned: day.churned,
    })) || [];

  // Handle date range change
  const handleDateRangeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newRange: DateRange | null
  ) => {
    if (newRange !== null) {
      setDateRange(newRange);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight={400}
          >
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            Failed to load user analytics. Please try again later.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">No user data available yet.</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
          mb={3}
        >
          <Typography variant="h6" component="h2">
            Users Over Time
          </Typography>

          {/* Date Range Selector */}
          <ToggleButtonGroup
            value={dateRange}
            exclusive
            onChange={handleDateRangeChange}
            size={isMobile ? "small" : "medium"}
            aria-label="date range"
          >
            <ToggleButton value="7d" aria-label="7 days">
              7D
            </ToggleButton>
            <ToggleButton value="30d" aria-label="30 days">
              30D
            </ToggleButton>
            <ToggleButton value="90d" aria-label="90 days">
              90D
            </ToggleButton>
            <ToggleButton value="1y" aria-label="1 year">
              1Y
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: isMobile ? 5 : 30,
              left: isMobile ? -20 : 0,
              bottom: 5,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.palette.divider}
            />
            <XAxis
              dataKey="date"
              stroke={theme.palette.text.secondary}
              style={{
                fontSize: isMobile ? "10px" : "12px",
              }}
            />
            <YAxis
              stroke={theme.palette.text.secondary}
              style={{
                fontSize: isMobile ? "10px" : "12px",
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: theme.shape.borderRadius,
              }}
              labelStyle={{ color: theme.palette.text.primary }}
            />
            <Legend
              wrapperStyle={{
                fontSize: isMobile ? "10px" : "12px",
              }}
            />
            <Line
              type="monotone"
              dataKey="Total Users"
              stroke={theme.palette.primary.main}
              strokeWidth={2}
              dot={!isMobile}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Active Users"
              stroke={theme.palette.success.main}
              strokeWidth={2}
              dot={!isMobile}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="New Users"
              stroke={theme.palette.info.main}
              strokeWidth={2}
              dot={!isMobile}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Churned"
              stroke={theme.palette.error.main}
              strokeWidth={2}
              dot={!isMobile}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDaysForRange(range: DateRange): number {
  switch (range) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "1y":
      return 365;
    default:
      return 30;
  }
}
