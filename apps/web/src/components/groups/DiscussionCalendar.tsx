/**
 * Discussion Calendar Component
 *
 * Displays scheduled discussions in a calendar view.
 * Features:
 * - Month navigation
 * - Discussion indicators on dates
 * - Click to view discussion details
 * - Today highlight
 * - Scheduled vs. started indicators
 */

import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Stack,
  Chip,
  useTheme,
  Skeleton,
  Alert,
  Tooltip,
  Badge,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  Today as TodayIcon,
  Schedule as ScheduleIcon,
  CheckCircle as StartedIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isFuture,
  parseISO,
} from "date-fns";

// ============================================================================
// Types
// ============================================================================

export type ScheduledDiscussion = {
  id: string;
  title: string;
  scheduledAt: string;
  isScheduled: boolean;
  book?: {
    id: string;
    title: string;
  } | null;
  user: {
    displayName: string | null;
    username: string | null;
  };
};

export type DiscussionCalendarProps = {
  discussions: ScheduledDiscussion[];
  isLoading?: boolean;
  error?: Error | null;
  onDiscussionClick?: (discussionId: string) => void;
  onDateClick?: (date: Date) => void;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get discussions for a specific date
 */
export function getDiscussionsForDate(
  discussions: ScheduledDiscussion[],
  date: Date
): ScheduledDiscussion[] {
  return discussions.filter((discussion) => {
    if (!discussion.scheduledAt) return false;
    const scheduledDate = parseISO(discussion.scheduledAt);
    return isSameDay(scheduledDate, date);
  });
}

/**
 * Generate calendar days for a month (including padding days from prev/next months)
 */
export function generateCalendarDays(currentDate: Date): Date[] {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = startDate;

  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  return days;
}

/**
 * Get day names for the calendar header
 */
export function getDayNames(): string[] {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
}

/**
 * Check if a discussion is upcoming (scheduled in the future)
 */
export function isUpcomingDiscussion(discussion: ScheduledDiscussion): boolean {
  if (!discussion.scheduledAt) return false;
  return isFuture(parseISO(discussion.scheduledAt));
}

// ============================================================================
// Sub-Components
// ============================================================================

type CalendarDayProps = {
  date: Date;
  currentMonth: Date;
  discussions: ScheduledDiscussion[];
  onDiscussionClick?: ((discussionId: string) => void) | undefined;
  onDateClick?: ((date: Date) => void) | undefined;
};

function CalendarDay({
  date,
  currentMonth,
  discussions,
  onDiscussionClick,
  onDateClick,
}: CalendarDayProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useTranslation();
  const dayDiscussions = getDiscussionsForDate(discussions, date);
  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isCurrentDay = isToday(date);
  const hasDiscussions = dayDiscussions.length > 0;

  const handleClick = () => {
    const firstDiscussion = dayDiscussions[0];
    if (
      hasDiscussions &&
      dayDiscussions.length === 1 &&
      firstDiscussion &&
      onDiscussionClick
    ) {
      onDiscussionClick(firstDiscussion.id);
    } else if (onDateClick) {
      onDateClick(date);
    }
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        minHeight: 80,
        p: 0.5,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: isCurrentMonth
          ? theme.palette.background.paper
          : theme.palette.action.disabledBackground,
        cursor: hasDiscussions || onDateClick ? "pointer" : "default",
        transition: "background-color 0.2s",
        "&:hover": hasDiscussions
          ? {
              backgroundColor: theme.palette.action.hover,
            }
          : {},
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          mb: 0.5,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            fontWeight: isCurrentDay ? 700 : 400,
            color: isCurrentMonth
              ? isCurrentDay
                ? theme.palette.primary.contrastText
                : theme.palette.text.primary
              : theme.palette.text.disabled,
            backgroundColor: isCurrentDay
              ? theme.palette.primary.main
              : "transparent",
          }}
        >
          {format(date, "d")}
        </Typography>
      </Box>

      {/* Discussion Indicators */}
      <Stack spacing={0.25}>
        {dayDiscussions.slice(0, 2).map((discussion) => {
          const isUpcoming = isUpcomingDiscussion(discussion);
          return (
            <Tooltip
              key={discussion.id}
              title={
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    {discussion.title}
                  </Typography>
                  <Typography variant="caption">
                    {format(parseISO(discussion.scheduledAt), "h:mm a")}
                  </Typography>
                  {discussion.book && (
                    <Typography variant="caption" display="block">
                      {discussion.book.title}
                    </Typography>
                  )}
                </Box>
              }
              arrow
            >
              <Chip
                size="small"
                icon={isUpcoming ? <ScheduleIcon /> : <StartedIcon />}
                label={discussion.title}
                color={isUpcoming ? "warning" : "success"}
                onClick={(e) => {
                  e.stopPropagation();
                  onDiscussionClick?.(discussion.id);
                }}
                sx={{
                  maxWidth: "100%",
                  height: 20,
                  fontSize: "0.65rem",
                  "& .MuiChip-label": {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    px: 0.5,
                  },
                  "& .MuiChip-icon": {
                    fontSize: 12,
                    ml: 0.25,
                  },
                }}
              />
            </Tooltip>
          );
        })}
        {dayDiscussions.length > 2 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ pl: 0.5, fontSize: "0.65rem" }}
          >
            {t("groups.calendar.moreDiscussions", {
              count: dayDiscussions.length - 2,
            })}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DiscussionCalendar({
  discussions,
  isLoading = false,
  error = null,
  onDiscussionClick,
  onDateClick,
}: DiscussionCalendarProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Filter to only scheduled discussions
  const scheduledDiscussions = useMemo(
    () => discussions.filter((d) => d.isScheduled && d.scheduledAt),
    [discussions]
  );

  const calendarDays = useMemo(
    () => generateCalendarDays(currentMonth),
    [currentMonth]
  );

  const dayNames = getDayNames();

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  // Count discussions this month
  const discussionsThisMonth = useMemo(() => {
    return scheduledDiscussions.filter((d) =>
      isSameMonth(parseISO(d.scheduledAt), currentMonth)
    ).length;
  }, [scheduledDiscussions, currentMonth]);

  // Loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Skeleton variant="rectangular" height={40} />
          <Skeleton variant="rectangular" height={300} />
        </Stack>
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error.message || t("common.error")}
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" component="h3">
            {format(currentMonth, "MMMM yyyy")}
          </Typography>
          {discussionsThisMonth > 0 && (
            <Badge badgeContent={discussionsThisMonth} color="primary">
              <ScheduleIcon color="action" fontSize="small" />
            </Badge>
          )}
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={t("groups.calendar.today")}>
            <IconButton size="small" onClick={handleToday}>
              <TodayIcon />
            </IconButton>
          </Tooltip>
          <IconButton
            size="small"
            onClick={handlePrevMonth}
            aria-label={t("groups.calendar.previousMonth")}
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleNextMonth}
            aria-label={t("groups.calendar.nextMonth")}
          >
            <ChevronRight />
          </IconButton>
        </Stack>
      </Stack>

      {/* Day Names Header */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          mb: 0.5,
        }}
      >
        {dayNames.map((day) => (
          <Typography
            key={day}
            variant="caption"
            align="center"
            fontWeight="bold"
            color="text.secondary"
            sx={{ py: 1 }}
          >
            {t(`groups.calendar.days.${day.toLowerCase()}`)}
          </Typography>
        ))}
      </Box>

      {/* Calendar Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        {calendarDays.map((day, index) => (
          <CalendarDay
            key={index}
            date={day}
            currentMonth={currentMonth}
            discussions={scheduledDiscussions}
            onDiscussionClick={onDiscussionClick}
            onDateClick={onDateClick}
          />
        ))}
      </Box>

      {/* Legend */}
      <Stack direction="row" spacing={2} mt={2} justifyContent="center">
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Chip
            size="small"
            icon={<ScheduleIcon />}
            label={t("groups.calendar.upcoming")}
            color="warning"
            sx={{ height: 24 }}
          />
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Chip
            size="small"
            icon={<StartedIcon />}
            label={t("groups.calendar.started")}
            color="success"
            sx={{ height: 24 }}
          />
        </Stack>
      </Stack>

      {/* Empty state */}
      {scheduledDiscussions.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t("groups.calendar.noScheduledDiscussions")}
        </Alert>
      )}
    </Paper>
  );
}

export default DiscussionCalendar;
