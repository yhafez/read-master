/**
 * Revenue Over Time Chart Component
 *
 * Displays revenue trends over time including:
 * - Total revenue
 * - MRR (Monthly Recurring Revenue)
 * - Revenue by type (new subscriptions, renewals, upgrades)
 * - Growth rate indicators
 *
 * Features:
 * - Date range selector (7d, 30d, 90d, 1y)
 * - Stacked area chart for revenue breakdown
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
  Stack,
  Chip,
} from "@mui/material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

// ============================================================================
// Types
// ============================================================================

type DateRange = "7d" | "30d" | "90d" | "1y";

type RevenueAnalytics = {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueGrowth: number;
  mrr: number;
  arrProjection: number;
  dailyRevenue: Array<{
    date: string;
    totalRevenue: number;
    newSubscriptions: number;
    renewals: number;
    upgrades: number;
    refunds: number;
  }>;
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchRevenueAnalytics(): Promise<RevenueAnalytics> {
  const response = await fetch("/api/admin/analytics/revenue");

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to fetch revenue analytics",
    }));
    throw new Error(error.message || "Failed to fetch revenue analytics");
  }

  const data = await response.json();
  return data.data;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

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

// ============================================================================
// Component
// ============================================================================

export function RevenueOverTimeChart() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  // Fetch data
  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "analytics", "revenue"],
    queryFn: fetchRevenueAnalytics,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter data by date range
  const filteredData = analytics?.dailyRevenue.slice(
    -getDaysForRange(dateRange)
  );

  // Format data for the chart (convert cents to dollars)
  const chartData =
    filteredData?.map((day) => ({
      date: new Date(day.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      "New Subscriptions": day.newSubscriptions / 100,
      Renewals: day.renewals / 100,
      Upgrades: day.upgrades / 100,
      Refunds: -(day.refunds / 100), // Negative for visual clarity
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

  // Calculate growth indicator
  const growthRate = analytics?.revenueGrowth || 0;
  const isPositiveGrowth = growthRate >= 0;

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
            Failed to load revenue analytics. Please try again later.
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
          <Alert severity="info">No revenue data available yet.</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header with metrics */}
        <Box mb={3}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={2}
            mb={2}
          >
            <Typography variant="h6" component="h2">
              Revenue Over Time
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

          {/* Key metrics */}
          <Stack
            direction={isMobile ? "column" : "row"}
            spacing={2}
            flexWrap="wrap"
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                MRR
              </Typography>
              <Typography variant="h5">
                {formatCurrency(analytics?.mrr || 0)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                ARR Projection
              </Typography>
              <Typography variant="h5">
                {formatCurrency(analytics?.arrProjection || 0)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Growth Rate
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography
                  variant="h5"
                  color={isPositiveGrowth ? "success.main" : "error.main"}
                >
                  {growthRate > 0 ? "+" : ""}
                  {growthRate}%
                </Typography>
                <Chip
                  size="small"
                  icon={
                    isPositiveGrowth ? <TrendingUpIcon /> : <TrendingDownIcon />
                  }
                  label={isPositiveGrowth ? "Growing" : "Declining"}
                  color={isPositiveGrowth ? "success" : "error"}
                />
              </Box>
            </Box>
          </Stack>
        </Box>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
          <AreaChart
            data={chartData}
            margin={{
              top: 5,
              right: isMobile ? 5 : 30,
              left: isMobile ? -20 : 0,
              bottom: 5,
            }}
          >
            <defs>
              <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={theme.palette.primary.main}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={theme.palette.primary.main}
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="colorRenewals" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={theme.palette.success.main}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={theme.palette.success.main}
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="colorUpgrades" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={theme.palette.info.main}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={theme.palette.info.main}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
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
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: theme.shape.borderRadius,
              }}
              labelStyle={{ color: theme.palette.text.primary }}
              formatter={(value) =>
                typeof value === "number" ? `$${value.toFixed(2)}` : value
              }
            />
            <Legend
              wrapperStyle={{
                fontSize: isMobile ? "10px" : "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="New Subscriptions"
              stackId="1"
              stroke={theme.palette.primary.main}
              fillOpacity={1}
              fill="url(#colorNew)"
            />
            <Area
              type="monotone"
              dataKey="Renewals"
              stackId="1"
              stroke={theme.palette.success.main}
              fillOpacity={1}
              fill="url(#colorRenewals)"
            />
            <Area
              type="monotone"
              dataKey="Upgrades"
              stackId="1"
              stroke={theme.palette.info.main}
              fillOpacity={1}
              fill="url(#colorUpgrades)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
