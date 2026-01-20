/**
 * AI Costs Breakdown Component
 *
 * Comprehensive dashboard for tracking AI usage costs including:
 * - Total costs and cost per user metrics
 * - Cost breakdown by feature (pie chart)
 * - Cost trends over time (line chart)
 * - Tokens used by feature
 * - Cost efficiency metrics
 * - Alerts for unusual cost spikes
 *
 * Features:
 * - Multiple visualization types (pie, line, bar)
 * - Date range selector
 * - Responsive design
 * - Cost spike detection
 */

import { useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  Button,
  ButtonGroup,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
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
import WarningIcon from "@mui/icons-material/Warning";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

// ============================================================================
// Types
// ============================================================================

type DateRange = "7d" | "30d" | "90d";

type AICostsAnalytics = {
  totalCosts: number; // In dollars
  totalTokens: number;
  totalRequests: number;
  avgCostPerUser: number;
  avgCostPerRequest: number;
  costByFeature: {
    feature: string;
    cost: number;
    tokens: number;
    requests: number;
  }[];
  dailyCosts: {
    date: string; // ISO date
    cost: number;
    tokens: number;
    requests: number;
  }[];
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchAICostsAnalytics(range: DateRange): Promise<AICostsAnalytics> {
  const response = await fetch(`/api/admin/analytics/ai-costs?range=${range}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to fetch AI costs analytics",
    }));
    throw new Error(error.message || "Failed to fetch AI costs analytics");
  }

  const data = await response.json();
  return data.data;
}

// ============================================================================
// Helper Functions
// ============================================================================

const COLORS = [
  "#8884d8", // Blue
  "#82ca9d", // Green
  "#ffc658", // Yellow
  "#ff8042", // Orange
  "#a4de6c", // Light green
  "#d0ed57", // Lime
  "#8dd1e1", // Cyan
  "#c492b1", // Pink
];

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatLargeNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

function detectCostSpike(dailyCosts: AICostsAnalytics["dailyCosts"]): boolean {
  if (dailyCosts.length < 2) return false;

  const recent = dailyCosts.slice(-3).map((d) => d.cost);
  const average = recent.reduce((a, b) => a + b, 0) / recent.length;

  const previous = dailyCosts.slice(0, -3).map((d) => d.cost);
  const prevAverage = previous.reduce((a, b) => a + b, 0) / previous.length;

  // Alert if recent costs are 50% higher than previous average
  return average > prevAverage * 1.5;
}

// ============================================================================
// Component
// ============================================================================

export function AICostsBreakdown() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [range, setRange] = useState<DateRange>("30d");

  // Fetch data
  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "analytics", "ai-costs", range],
    queryFn: () => fetchAICostsAnalytics(range),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Detect cost spike
  const hasCostSpike = useMemo(() => {
    if (!analytics) return false;
    return detectCostSpike(analytics.dailyCosts);
  }, [analytics]);

  // Calculate cost trend
  const costTrend = useMemo(() => {
    if (!analytics || analytics.dailyCosts.length < 2) return 0;

    const recent = analytics.dailyCosts.slice(-7).reduce((sum, d) => sum + d.cost, 0);
    const previous = analytics.dailyCosts.slice(-14, -7).reduce((sum, d) => sum + d.cost, 0);

    if (previous === 0) return 0;
    return ((recent - previous) / previous) * 100;
  }, [analytics]);

  // Format chart data
  const pieChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.costByFeature.map((item) => ({
      name: item.feature,
      value: item.cost,
      tokens: item.tokens,
      requests: item.requests,
    }));
  }, [analytics]);

  const lineChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.dailyCosts.map((item) => {
      const date = new Date(item.date);
      const month = date.toLocaleString("default", { month: "short" });
      const day = date.getDate();
      return {
        date: `${month} ${day}`,
        cost: item.cost / 100, // Convert cents to dollars
        tokens: item.tokens / 1000, // Convert to thousands
      };
    });
  }, [analytics]);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
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
            Failed to load AI costs analytics. Please try again later.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!analytics) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">No AI costs data available yet.</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header with date range selector */}
      <Stack
        direction={isMobile ? "column" : "row"}
        justifyContent="space-between"
        alignItems={isMobile ? "flex-start" : "center"}
        mb={3}
        spacing={2}
      >
        <Box>
          <Typography variant="h5" component="h1" gutterBottom>
            AI Costs Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track AI usage costs, trends, and efficiency metrics
          </Typography>
        </Box>

        <ButtonGroup size="small" variant="outlined">
          <Button onClick={() => setRange("7d")} disabled={range === "7d"}>
            7D
          </Button>
          <Button onClick={() => setRange("30d")} disabled={range === "30d"}>
            30D
          </Button>
          <Button onClick={() => setRange("90d")} disabled={range === "90d"}>
            90D
          </Button>
        </ButtonGroup>
      </Stack>

      {/* Cost Spike Alert */}
      {hasCostSpike && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Cost Spike Detected!</strong> Recent AI costs are significantly higher than
            average. Review usage patterns and consider optimization.
          </Typography>
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Costs
              </Typography>
              <Typography variant="h5" component="div">
                {formatCurrency(analytics.totalCosts)}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.5} mt={1}>
                {costTrend >= 0 ? (
                  <TrendingUpIcon fontSize="small" color="error" />
                ) : (
                  <TrendingDownIcon fontSize="small" color="success" />
                )}
                <Typography
                  variant="caption"
                  color={costTrend >= 0 ? "error.main" : "success.main"}
                >
                  {Math.abs(costTrend).toFixed(1)}% {costTrend >= 0 ? "increase" : "decrease"}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Cost Per User
              </Typography>
              <Typography variant="h5" component="div">
                {formatCurrency(analytics.avgCostPerUser)}
              </Typography>
              <Typography variant="caption" color="text.secondary" mt={1}>
                Average per active user
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Tokens
              </Typography>
              <Typography variant="h5" component="div">
                {formatLargeNumber(analytics.totalTokens)}
              </Typography>
              <Typography variant="caption" color="text.secondary" mt={1}>
                {analytics.totalRequests.toLocaleString()} requests
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Cost Per Request
              </Typography>
              <Typography variant="h5" component="div">
                {formatCurrency(analytics.avgCostPerRequest)}
              </Typography>
              <Typography variant="caption" color="text.secondary" mt={1}>
                Average efficiency
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} mb={3}>
        {/* Cost Breakdown by Feature (Pie Chart) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cost Breakdown by Feature
              </Typography>
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => {
                      if (!percent || percent <= 0.05) return "";
                      return `${name} ${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={isMobile ? 80 : 100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((_item, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Cost Trends Over Time (Line Chart) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cost Trends Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis
                    dataKey="date"
                    stroke={theme.palette.text.secondary}
                    style={{ fontSize: isMobile ? 10 : 12 }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke={theme.palette.text.secondary}
                    style={{ fontSize: isMobile ? 10 : 12 }}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke={theme.palette.text.secondary}
                    style={{ fontSize: isMobile ? 10 : 12 }}
                    tickFormatter={(value) => `${value.toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                    formatter={(value, name) => {
                      if (name === "cost") {
                        return [`$${Number(value).toFixed(2)}`, "Cost"];
                      }
                      return [`${Number(value).toFixed(0)}K`, "Tokens"];
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cost"
                    stroke={theme.palette.primary.main}
                    name="Cost ($)"
                    strokeWidth={2}
                    dot={!isMobile}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="tokens"
                    stroke={theme.palette.secondary.main}
                    name="Tokens (K)"
                    strokeWidth={2}
                    dot={!isMobile}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Feature Details Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Detailed Breakdown by Feature
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size={isMobile ? "small" : "medium"}>
              <TableHead>
                <TableRow>
                  <TableCell>Feature</TableCell>
                  <TableCell align="right">Cost</TableCell>
                  <TableCell align="right">Tokens</TableCell>
                  <TableCell align="right">Requests</TableCell>
                  {!isMobile && <TableCell align="right">Cost/Request</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {analytics.costByFeature.map((item) => (
                  <TableRow key={item.feature}>
                    <TableCell component="th" scope="row">
                      {item.feature}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        component="span"
                        sx={{
                          fontWeight: "bold",
                          color: theme.palette.primary.main,
                        }}
                      >
                        {formatCurrency(item.cost)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{formatLargeNumber(item.tokens)}</TableCell>
                    <TableCell align="right">{item.requests.toLocaleString()}</TableCell>
                    {!isMobile && (
                      <TableCell align="right">
                        {formatCurrency(item.requests > 0 ? item.cost / item.requests : 0)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
