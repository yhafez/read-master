/**
 * Admin Dashboard Page
 *
 * Displays overview metrics for administrators including:
 * - Total users, active users, and growth
 * - MRR, ARR, and revenue growth
 * - DAU, MAU, and stickiness
 * - AI costs and projections
 *
 * Features:
 * - Auto-refresh every 60 seconds
 * - Manual refresh button
 * - Responsive grid layout
 * - Loading and error states
 */

import { useEffect, useMemo, useCallback, useState } from "react";
import {
  Box,
  Typography,
  Grid2 as Grid,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  Chip,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  ShowChart as ChartIcon,
  Psychology as AIIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import { MetricCard } from "./MetricCard";
import type { OverviewStats, MetricCardConfig } from "./adminDashboardTypes";
import { AUTO_REFRESH_INTERVAL } from "./adminDashboardTypes";

/**
 * Mock data for development/testing
 * In production, this would come from the API
 */
const MOCK_OVERVIEW_STATS: OverviewStats = {
  users: {
    total: 12847,
    active: 3421,
    newLast30Days: 856,
    growth: {
      percentChange: 12.5,
      netNew: 856,
    },
  },
  revenue: {
    mrrCents: 4523700, // $45,237
    arrCents: 54284400, // $542,844
    growthPercent: 8.3,
  },
  engagement: {
    dau: 1234,
    mau: 8765,
    stickiness: 0.141, // 14.1%
  },
  aiCosts: {
    totalCostCents: 234567, // $2,345.67
    projectedMonthlyCents: 312500, // $3,125.00
  },
};

/**
 * Hook to fetch and manage overview stats
 * Uses mock data for now - will integrate with real API
 */
function useOverviewStats(): {
  data: OverviewStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdated: Date | null;
} {
  const [data, setData] = useState<OverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call when admin-005 is complete
      // const response = await fetch('/api/admin/analytics/overview');
      // const result = await response.json();

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Use mock data for now
      setData(MOCK_OVERVIEW_STATS);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch analytics"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchData();
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData, lastUpdated };
}

/**
 * Section header component
 */
function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}): React.ReactElement {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      {icon}
      <Typography variant="h6" fontWeight={600}>
        {title}
      </Typography>
    </Box>
  );
}

/**
 * Hook to build metric card configurations from overview stats
 */
function useMetricCards(stats: OverviewStats | null): {
  users: MetricCardConfig[];
  revenue: MetricCardConfig[];
  engagement: MetricCardConfig[];
  aiCosts: MetricCardConfig[];
} | null {
  const { t } = useTranslation();

  return useMemo(() => {
    if (!stats) return null;

    return {
      users: [
        {
          id: "total-users",
          label: t("admin.metrics.totalUsers", "Total Users"),
          value: stats.users.total,
          type: "number" as const,
          color: "primary" as const,
          subtitle: t("admin.metrics.registered", "Registered"),
        },
        {
          id: "active-users",
          label: t("admin.metrics.activeUsers", "Active Users (30d)"),
          value: stats.users.active,
          type: "number" as const,
          color: "success" as const,
          trend: {
            value: stats.users.growth.percentChange,
            isPositive: true,
          },
        },
        {
          id: "new-users",
          label: t("admin.metrics.newUsers", "New Users (30d)"),
          value: stats.users.newLast30Days,
          type: "number" as const,
          color: "info" as const,
          subtitle: t("admin.metrics.netNew", "Net new"),
        },
      ],
      revenue: [
        {
          id: "mrr",
          label: t("admin.metrics.mrr", "Monthly Recurring Revenue"),
          value: stats.revenue.mrrCents,
          type: "currency" as const,
          color: "success" as const,
          trend: {
            value: stats.revenue.growthPercent,
            isPositive: true,
          },
        },
        {
          id: "arr",
          label: t("admin.metrics.arr", "Annual Recurring Revenue"),
          value: stats.revenue.arrCents,
          type: "currency" as const,
          color: "primary" as const,
        },
      ],
      engagement: [
        {
          id: "dau",
          label: t("admin.metrics.dau", "Daily Active Users"),
          value: stats.engagement.dau,
          type: "number" as const,
          color: "primary" as const,
          subtitle: t("admin.metrics.today", "Today"),
        },
        {
          id: "mau",
          label: t("admin.metrics.mau", "Monthly Active Users"),
          value: stats.engagement.mau,
          type: "number" as const,
          color: "secondary" as const,
          subtitle: t("admin.metrics.last30Days", "Last 30 days"),
        },
        {
          id: "stickiness",
          label: t("admin.metrics.stickiness", "Stickiness (DAU/MAU)"),
          value: stats.engagement.stickiness,
          type: "ratio" as const,
          color: "info" as const,
          subtitle: t("admin.metrics.userEngagement", "User engagement"),
        },
      ],
      aiCosts: [
        {
          id: "ai-cost-current",
          label: t("admin.metrics.aiCostCurrent", "AI Costs (30d)"),
          value: stats.aiCosts.totalCostCents,
          type: "currency" as const,
          color: "warning" as const,
          subtitle: t("admin.metrics.actualSpend", "Actual spend"),
        },
        {
          id: "ai-cost-projected",
          label: t("admin.metrics.aiCostProjected", "Projected Monthly"),
          value: stats.aiCosts.projectedMonthlyCents,
          type: "currency" as const,
          color: "error" as const,
          subtitle: t("admin.metrics.forecast", "Forecast"),
        },
      ],
    };
  }, [stats, t]);
}

export function AdminDashboardPage(): React.ReactElement {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch, lastUpdated } = useOverviewStats();
  const metricCards = useMetricCards(data);

  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return null;
    return lastUpdated.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [lastUpdated]);

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
            {t("admin.dashboard.title", "Admin Dashboard")}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t(
              "admin.dashboard.subtitle",
              "Overview of key platform metrics and performance"
            )}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {formattedLastUpdated && (
            <Chip
              icon={<ScheduleIcon sx={{ fontSize: 16 }} />}
              label={t("admin.dashboard.lastUpdated", "Updated {{time}}", {
                time: formattedLastUpdated,
              })}
              size="small"
              variant="outlined"
            />
          )}
          <Tooltip title={t("admin.dashboard.refresh", "Refresh data")}>
            <IconButton
              onClick={refetch}
              disabled={isLoading}
              color="primary"
              aria-label={t("admin.dashboard.refresh", "Refresh data")}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Users Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <SectionHeader
          icon={<PeopleIcon color="primary" />}
          title={t("admin.sections.users", "Users")}
        />
        <Grid container spacing={2}>
          {metricCards?.users.map((config) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={config.id}>
              <MetricCard config={config} isLoading={isLoading} />
            </Grid>
          )) ??
            [1, 2, 3].map((i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <MetricCard
                  config={{
                    id: `loading-${i}`,
                    label: "",
                    value: 0,
                    type: "number",
                  }}
                  isLoading={true}
                />
              </Grid>
            ))}
        </Grid>
      </Paper>

      {/* Revenue Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <SectionHeader
          icon={<MoneyIcon color="success" />}
          title={t("admin.sections.revenue", "Revenue")}
        />
        <Grid container spacing={2}>
          {metricCards?.revenue.map((config) => (
            <Grid size={{ xs: 12, sm: 6 }} key={config.id}>
              <MetricCard config={config} isLoading={isLoading} />
            </Grid>
          )) ??
            [1, 2].map((i) => (
              <Grid size={{ xs: 12, sm: 6 }} key={i}>
                <MetricCard
                  config={{
                    id: `loading-${i}`,
                    label: "",
                    value: 0,
                    type: "currency",
                  }}
                  isLoading={true}
                />
              </Grid>
            ))}
        </Grid>
      </Paper>

      {/* Engagement Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <SectionHeader
          icon={<ChartIcon color="secondary" />}
          title={t("admin.sections.engagement", "Engagement")}
        />
        <Grid container spacing={2}>
          {metricCards?.engagement.map((config) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={config.id}>
              <MetricCard config={config} isLoading={isLoading} />
            </Grid>
          )) ??
            [1, 2, 3].map((i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <MetricCard
                  config={{
                    id: `loading-${i}`,
                    label: "",
                    value: 0,
                    type: "number",
                  }}
                  isLoading={true}
                />
              </Grid>
            ))}
        </Grid>
      </Paper>

      {/* AI Costs Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <SectionHeader
          icon={<AIIcon color="warning" />}
          title={t("admin.sections.aiCosts", "AI Costs")}
        />
        <Grid container spacing={2}>
          {metricCards?.aiCosts.map((config) => (
            <Grid size={{ xs: 12, sm: 6 }} key={config.id}>
              <MetricCard config={config} isLoading={isLoading} />
            </Grid>
          )) ??
            [1, 2].map((i) => (
              <Grid size={{ xs: 12, sm: 6 }} key={i}>
                <MetricCard
                  config={{
                    id: `loading-${i}`,
                    label: "",
                    value: 0,
                    type: "currency",
                  }}
                  isLoading={true}
                />
              </Grid>
            ))}
        </Grid>
      </Paper>

      {/* Auto-refresh indicator */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          mt: 2,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {t(
            "admin.dashboard.autoRefresh",
            "Auto-refreshes every {{seconds}} seconds",
            { seconds: AUTO_REFRESH_INTERVAL / 1000 }
          )}
        </Typography>
      </Box>
    </Box>
  );
}

export default AdminDashboardPage;
