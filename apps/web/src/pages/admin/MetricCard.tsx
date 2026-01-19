/**
 * MetricCard Component
 *
 * Displays a single metric in a card format for the admin dashboard.
 * Supports different value types (currency, percentage, number) and trend indicators.
 */

import {
  Card,
  CardContent,
  Box,
  Typography,
  Skeleton,
  useTheme,
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from "@mui/icons-material";

import type { MetricCardConfig } from "./adminDashboardTypes";
import {
  formatCurrency,
  formatLargeNumber,
  formatPercentage,
  formatStickiness,
} from "./adminDashboardTypes";

type MetricCardProps = {
  config: MetricCardConfig;
  isLoading?: boolean;
};

/**
 * Format value based on metric type
 */
function formatValue(value: number, type: MetricCardConfig["type"]): string {
  switch (type) {
    case "currency":
      return formatCurrency(value);
    case "percentage":
      return formatPercentage(value, false);
    case "ratio":
      return formatStickiness(value);
    case "trend":
      return formatPercentage(value, true);
    case "number":
    default:
      return formatLargeNumber(value);
  }
}

/**
 * Get trend icon based on value
 */
function TrendIcon({
  value,
  isPositive,
}: {
  value: number;
  isPositive: boolean;
}): React.ReactElement {
  const theme = useTheme();

  if (value === 0) {
    return (
      <TrendingFlatIcon
        sx={{ fontSize: 16, color: theme.palette.text.secondary }}
      />
    );
  }

  if (value > 0) {
    return (
      <TrendingUpIcon
        sx={{
          fontSize: 16,
          color: isPositive
            ? theme.palette.success.main
            : theme.palette.error.main,
        }}
      />
    );
  }

  return (
    <TrendingDownIcon
      sx={{
        fontSize: 16,
        color: isPositive
          ? theme.palette.error.main
          : theme.palette.success.main,
      }}
    />
  );
}

export function MetricCard({
  config,
  isLoading = false,
}: MetricCardProps): React.ReactElement {
  const { label, value, type, subtitle, trend, color = "primary" } = config;
  const theme = useTheme();

  if (isLoading) {
    return (
      <Card sx={{ height: "100%" }}>
        <CardContent>
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="80%" height={48} sx={{ mt: 1 }} />
          <Skeleton variant="text" width="40%" height={16} sx={{ mt: 1 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 500, mb: 1 }}
        >
          {label}
        </Typography>

        <Typography
          variant="h4"
          component="div"
          sx={{
            fontWeight: 700,
            color: theme.palette[color].main,
          }}
        >
          {formatValue(value, type)}
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            mt: 1,
          }}
        >
          {trend && (
            <>
              <TrendIcon value={trend.value} isPositive={trend.isPositive} />
              <Typography
                variant="body2"
                sx={{
                  color:
                    trend.value > 0
                      ? trend.isPositive
                        ? theme.palette.success.main
                        : theme.palette.error.main
                      : trend.value < 0
                        ? trend.isPositive
                          ? theme.palette.error.main
                          : theme.palette.success.main
                        : theme.palette.text.secondary,
                  fontWeight: 500,
                }}
              >
                {formatPercentage(trend.value, true)}
              </Typography>
            </>
          )}
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {trend ? ` \u2022 ${subtitle}` : subtitle}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default MetricCard;
