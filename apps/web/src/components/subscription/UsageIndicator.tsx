/**
 * Usage Indicator Component
 *
 * Displays current usage against tier limits with visual progress bars
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Stack,
  Tooltip,
  Skeleton,
  Alert,
  Chip,
} from "@mui/material";
import {
  MenuBook as BooksIcon,
  Psychology as AiIcon,
  School as FlashcardsIcon,
  RecordVoiceOver as TtsIcon,
  AllInclusive as UnlimitedIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  useUsageStats,
  isUnlimited,
  formatLimit,
  getUsageStatus,
  getUsageStatusColor,
} from "@/hooks/useSubscription";

// ============================================================================
// Types
// ============================================================================

export interface UsageItemProps {
  icon: React.ReactElement;
  label: string;
  used: number;
  limit: number;
  percentage: number;
  remaining: number;
}

export interface UsageIndicatorProps {
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Whether to show all items or just key ones */
  showAll?: boolean;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Individual usage item with progress bar
 */
export function UsageItem({
  icon,
  label,
  used,
  limit,
  percentage,
  remaining,
}: UsageItemProps): React.ReactElement {
  const { t } = useTranslation();
  const unlimited = isUnlimited(limit);
  const status = unlimited ? "low" : getUsageStatus(percentage);
  const color = getUsageStatusColor(status);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Box sx={{ color: `${color}.main`, display: "flex" }}>{icon}</Box>
        <Typography variant="body2" fontWeight="medium" sx={{ flex: 1 }}>
          {label}
        </Typography>
        {unlimited ? (
          <Tooltip title={t("subscription.usage.unlimited", "Unlimited")}>
            <Chip
              size="small"
              icon={<UnlimitedIcon sx={{ fontSize: 14 }} />}
              label={t("subscription.usage.unlimited", "Unlimited")}
              color="success"
              variant="outlined"
            />
          </Tooltip>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {used} / {formatLimit(limit)}
          </Typography>
        )}
      </Stack>

      {!unlimited && (
        <>
          <LinearProgress
            variant="determinate"
            value={Math.min(percentage, 100)}
            color={color}
            sx={{ height: 6, borderRadius: 1 }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.5 }}
          >
            {remaining === 0
              ? t("subscription.usage.limitReached", "Limit reached")
              : t("subscription.usage.remaining", "{{count}} remaining", {
                  count: remaining,
                })}
          </Typography>
        </>
      )}
    </Box>
  );
}

/**
 * Loading skeleton for usage indicator
 */
export function UsageIndicatorSkeleton(): React.ReactElement {
  return (
    <Card>
      <CardContent>
        <Skeleton variant="text" width={120} height={28} sx={{ mb: 2 }} />
        <Stack spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Box key={i}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 0.5 }}
              >
                <Skeleton variant="circular" width={24} height={24} />
                <Skeleton variant="text" width={80} />
                <Box sx={{ flex: 1 }} />
                <Skeleton variant="text" width={50} />
              </Stack>
              <Skeleton
                variant="rectangular"
                height={6}
                sx={{ borderRadius: 1 }}
              />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function UsageIndicator({
  compact = false,
  showAll = true,
}: UsageIndicatorProps): React.ReactElement {
  const { t } = useTranslation();
  const { data: usage, isLoading, error } = useUsageStats();

  if (isLoading) {
    return <UsageIndicatorSkeleton />;
  }

  if (error) {
    return (
      <Alert severity="error">
        {t("subscription.usage.error", "Failed to load usage data")}
      </Alert>
    );
  }

  if (!usage) {
    return (
      <Alert severity="info">
        {t("subscription.usage.noData", "No usage data available")}
      </Alert>
    );
  }

  const usageItems: UsageItemProps[] = [
    {
      icon: <BooksIcon fontSize="small" />,
      label: t("subscription.usage.books", "Books"),
      used: usage.usage.booksCount,
      limit: usage.limits.maxBooks,
      percentage: usage.percentages.books,
      remaining: usage.remaining.books,
    },
    {
      icon: <AiIcon fontSize="small" />,
      label: t("subscription.usage.aiInteractions", "AI Interactions (today)"),
      used: usage.usage.aiInteractionsToday,
      limit: usage.limits.maxAiInteractionsPerDay,
      percentage: usage.percentages.aiInteractions,
      remaining: usage.remaining.aiInteractions,
    },
    {
      icon: <FlashcardsIcon fontSize="small" />,
      label: t("subscription.usage.flashcards", "Flashcards"),
      used: usage.usage.activeFlashcardsCount,
      limit: usage.limits.maxActiveFlashcards,
      percentage: usage.percentages.flashcards,
      remaining: usage.remaining.flashcards,
    },
    {
      icon: <TtsIcon fontSize="small" />,
      label: t("subscription.usage.ttsDownloads", "TTS Downloads (month)"),
      used: usage.usage.ttsDownloadsThisMonth,
      limit: usage.limits.maxTtsDownloadsPerMonth,
      percentage: usage.percentages.ttsDownloads,
      remaining: usage.remaining.ttsDownloads,
    },
  ];

  // In compact mode or if not showing all, only show items with limits
  const itemsToShow = showAll
    ? usageItems
    : usageItems.filter((item) => !isUnlimited(item.limit));

  if (compact) {
    return (
      <Stack spacing={1}>
        {itemsToShow.slice(0, 2).map((item) => (
          <UsageItem key={item.label} {...item} />
        ))}
      </Stack>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {t("subscription.usage.title", "Usage")}
        </Typography>
        <Stack spacing={2}>
          {itemsToShow.map((item) => (
            <UsageItem key={item.label} {...item} />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default UsageIndicator;
