/**
 * Activity Feed Page
 *
 * Displays a social activity feed showing recent activity from followed users:
 * - Book completions
 * - Achievement unlocks
 * - Shared highlights/annotations
 *
 * Features:
 * - Real-time updates with React Query
 * - Pagination
 * - Activity type filters
 * - Pull-to-refresh
 * - Empty states
 * - Loading skeletons
 */

import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Alert,
  Card,
  CardContent,
  Avatar,
  Stack,
  Chip,
  Pagination,
  Button,
  ButtonGroup,
  Divider,
  useTheme,
  useMediaQuery,
  Skeleton,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  BookOutlined,
  EmojiEventsOutlined,
  FormatQuoteOutlined,
  RefreshOutlined,
  PersonOutline,
} from "@mui/icons-material";
import { useAuth } from "@clerk/clerk-react";
import { formatDistanceToNow } from "date-fns";

// Helper to format relative time
function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

// ============================================================================
// Types
// ============================================================================

type ActivityType = "book_completed" | "achievement_earned" | "highlight_shared";

type FeedUserInfo = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type BookInfo = {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
};

type AchievementInfo = {
  id: string;
  title: string;
  description: string;
  icon: string | null;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
};

type HighlightInfo = {
  id: string;
  text: string;
  note: string | null;
  bookId: string;
  bookTitle: string;
};

type FeedActivity = {
  id: string;
  type: ActivityType;
  user: FeedUserInfo;
  createdAt: string;
  book?: BookInfo;
  achievement?: AchievementInfo;
  highlight?: HighlightInfo;
};

type FeedResponse = {
  activities: FeedActivity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// ============================================================================
// Helper Functions
// ============================================================================

function getActivityIcon(type: ActivityType): React.ReactElement {
  switch (type) {
    case "book_completed":
      return <BookOutlined />;
    case "achievement_earned":
      return <EmojiEventsOutlined />;
    case "highlight_shared":
      return <FormatQuoteOutlined />;
  }
}

function getActivityColor(type: ActivityType): string {
  switch (type) {
    case "book_completed":
      return "success";
    case "achievement_earned":
      return "warning";
    case "highlight_shared":
      return "info";
  }
}

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case "COMMON":
      return "#9E9E9E";
    case "RARE":
      return "#2196F3";
    case "EPIC":
      return "#9C27B0";
    case "LEGENDARY":
      return "#FF9800";
    default:
      return "#9E9E9E";
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function FeedPage(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const { userId: clerkUserId } = useAuth();

  // State
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<ActivityType | "all">("all");
  const limit = 20;

  // Fetch feed data
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<FeedResponse, Error>({
    queryKey: ["activityFeed", page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/feed?${params}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch activity feed");
      }

      return response.json();
    },
    enabled: !!clerkUserId,
    staleTime: 1000 * 60, // 1 minute
  });

  // Filter activities by type
  const filteredActivities = useMemo(() => {
    if (!data?.activities) return [];
    if (filterType === "all") return data.activities;
    return data.activities.filter((activity) => activity.type === filterType);
  }, [data?.activities, filterType]);

  // Handlers
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleUserClick = (username: string) => {
    navigate(`/users/${username}`);
  };

  const handleBookClick = (bookId: string) => {
    navigate(`/books/${bookId}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          {t("social.activityFeed")}
        </Typography>
        <Stack spacing={2} mt={3}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Skeleton variant="circular" width={48} height={48} />
                  <Box flex={1}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          {t("social.activityFeed")}
        </Typography>
        <Alert severity="error" sx={{ mt: 3 }}>
          {error.message}
        </Alert>
        <Button variant="outlined" onClick={handleRefresh} sx={{ mt: 2 }}>
          {t("common.retry")}
        </Button>
      </Box>
    );
  }

  // Empty state
  if (!data || filteredActivities.length === 0) {
    return (
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            {t("social.activityFeed")}
          </Typography>
          <Tooltip title={t("common.refresh")}>
            <IconButton onClick={handleRefresh} disabled={isFetching}>
              <RefreshOutlined />
            </IconButton>
          </Tooltip>
        </Stack>

        <Alert severity="info">
          <Typography variant="body1">
            {filterType === "all"
              ? t("social.noActivityYet")
              : t("social.noActivityOfType")}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {t("social.followUsersToSeeActivity")}
          </Typography>
        </Alert>

        <Button
          variant="outlined"
          startIcon={<PersonOutline />}
          onClick={() => navigate("/users")}
          sx={{ mt: 2 }}
        >
          {t("social.findUsers")}
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          {t("social.activityFeed")}
        </Typography>
        <Tooltip title={t("common.refresh")}>
          <IconButton onClick={handleRefresh} disabled={isFetching}>
            <RefreshOutlined />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Filters */}
      <ButtonGroup
        variant="outlined"
        size={isMobile ? "small" : "medium"}
        sx={{ mb: 3 }}
        fullWidth={isMobile}
      >
        <Button
          variant={filterType === "all" ? "contained" : "outlined"}
          onClick={() => setFilterType("all")}
        >
          {t("common.all")}
        </Button>
        <Button
          variant={filterType === "book_completed" ? "contained" : "outlined"}
          onClick={() => setFilterType("book_completed")}
          startIcon={<BookOutlined />}
        >
          {isMobile ? "" : t("social.books")}
        </Button>
        <Button
          variant={filterType === "achievement_earned" ? "contained" : "outlined"}
          onClick={() => setFilterType("achievement_earned")}
          startIcon={<EmojiEventsOutlined />}
        >
          {isMobile ? "" : t("social.achievements")}
        </Button>
        <Button
          variant={filterType === "highlight_shared" ? "contained" : "outlined"}
          onClick={() => setFilterType("highlight_shared")}
          startIcon={<FormatQuoteOutlined />}
        >
          {isMobile ? "" : t("social.highlights")}
        </Button>
      </ButtonGroup>

      {/* Activity Feed */}
      <Stack spacing={2}>
        {filteredActivities.map((activity) => (
          <Card
            key={activity.id}
            sx={{
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: theme.shadows[4],
              },
            }}
          >
            <CardContent>
              {/* User Info */}
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                mb={2}
                onClick={() => handleUserClick(activity.user.username)}
                sx={{ cursor: "pointer" }}
              >
                <Avatar {...(activity.user.avatarUrl ? { src: activity.user.avatarUrl } : {})}>
                  <PersonOutline />
                </Avatar>
                <Box flex={1}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {activity.user.displayName || activity.user.username}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatRelativeTime(new Date(activity.createdAt))}
                  </Typography>
                </Box>
                <Chip
                  icon={getActivityIcon(activity.type)}
                  label={t(`social.activityType.${activity.type}`)}
                  size="small"
                  color={getActivityColor(activity.type) as any}
                />
              </Stack>

              <Divider sx={{ mb: 2 }} />

              {/* Activity Content */}
              {activity.type === "book_completed" && activity.book && (
                <Stack
                  direction="row"
                  spacing={2}
                  onClick={() => handleBookClick(activity.book!.id)}
                  sx={{ cursor: "pointer" }}
                >
                  {activity.book.coverImage && (
                    <Box
                      component="img"
                      src={activity.book.coverImage}
                      alt={activity.book.title}
                      sx={{
                        width: 60,
                        height: 90,
                        objectFit: "cover",
                        borderRadius: 1,
                      }}
                    />
                  )}
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      {t("social.completedBook")}
                    </Typography>
                    <Typography variant="h6">{activity.book.title}</Typography>
                    {activity.book.author && (
                      <Typography variant="body2" color="text.secondary">
                        {t("common.by")} {activity.book.author}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              )}

              {activity.type === "achievement_earned" && activity.achievement && (
                <Box>
                  <Typography variant="body1" fontWeight="medium" mb={1}>
                    {t("social.unlockedAchievement")}
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {activity.achievement.icon && (
                      <Box
                        sx={{
                          fontSize: 48,
                          color: getRarityColor(activity.achievement.rarity),
                        }}
                      >
                        {activity.achievement.icon}
                      </Box>
                    )}
                    <Box>
                      <Typography variant="h6">
                        {activity.achievement.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {activity.achievement.description}
                      </Typography>
                      <Chip
                        label={activity.achievement.rarity}
                        size="small"
                        sx={{
                          mt: 1,
                          bgcolor: getRarityColor(activity.achievement.rarity),
                          color: "white",
                        }}
                      />
                    </Box>
                  </Stack>
                </Box>
              )}

              {activity.type === "highlight_shared" && activity.highlight && (
                <Box>
                  <Typography variant="body1" fontWeight="medium" mb={1}>
                    {t("social.sharedHighlight")}
                  </Typography>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: theme.palette.action.hover,
                      borderRadius: 1,
                      borderLeft: `4px solid ${theme.palette.primary.main}`,
                    }}
                  >
                    <Typography variant="body1" fontStyle="italic" mb={1}>
                      "{activity.highlight.text}"
                    </Typography>
                    {activity.highlight.note && (
                      <Typography variant="body2" color="text.secondary">
                        {activity.highlight.note}
                      </Typography>
                    )}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1, display: "block" }}
                    >
                      {t("common.from")} {activity.highlight.bookTitle}
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={data.pagination.totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size={isMobile ? "small" : "medium"}
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
}

export default FeedPage;
