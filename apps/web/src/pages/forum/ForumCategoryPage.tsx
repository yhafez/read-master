/**
 * Forum Category Page
 *
 * Displays all posts within a specific forum category with:
 * - Category header and description
 * - Posts list with sorting (recent, popular, unanswered)
 * - Pagination
 * - Create post button
 * - Post metadata (replies, views, votes)
 */

import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  useTheme,
  useMediaQuery,
  Skeleton,
  Alert,
  Fab,
  Breadcrumbs,
  Link,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  ChatBubbleOutline as CommentIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  PushPin as PushPinIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";

// ============================================================================
// Types
// ============================================================================

type ForumCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  postsCount: number;
};

type ForumPost = {
  id: string;
  title: string;
  content: string;
  author: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  repliesCount: number;
  viewCount: number;
  upvotes: number;
  isPinned: boolean;
  isAnswered: boolean;
  createdAt: string;
};

type SortOption = "recent" | "popular" | "unanswered";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

// ============================================================================
// Main Component
// ============================================================================

export function ForumCategoryPage(): React.ReactElement {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // State
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch category info
  const {
    data: categoriesData,
    isLoading: categoryLoading,
  } = useQuery<{ categories: ForumCategory[]; total: number }, Error>({
    queryKey: ["forum", "categories"],
    queryFn: async () => {
      const response = await fetch("/api/forum/categories", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch forum categories");
      }

      return response.json();
    },
  });

  const category = categoriesData?.categories.find((c) => c.slug === slug);

  // Fetch posts for this category
  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
  } = useQuery<{
    posts: ForumPost[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }, Error>({
    queryKey: ["forum", "posts", slug, sortBy, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        categorySlug: slug || "",
        sortBy,
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/forum/posts?${params}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch forum posts");
      }

      return response.json();
    },
    enabled: !!slug,
  });

  // Handlers
  const handleBack = () => {
    navigate("/forum");
  };

  const handlePostClick = (postId: string) => {
    navigate(`/forum/post/${postId}`);
  };

  const handleCreatePost = () => {
    navigate(`/forum/create?category=${slug}`);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setPage(1); // Reset to first page when sorting changes
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Loading state
  if (categoryLoading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={100} sx={{ mb: 3 }} />
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={120} />
          ))}
        </Stack>
      </Box>
    );
  }

  // Category not found
  if (!category) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {t("forum.categoryNotFound")}
        </Alert>
        <Button variant="outlined" onClick={handleBack}>
          {t("common.back")}
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={handleBack}
          sx={{ cursor: "pointer" }}
        >
          {t("forum.community")}
        </Link>
        <Typography variant="body2" color="text.primary">
          {category.name}
        </Typography>
      </Breadcrumbs>

      {/* Category Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="start" spacing={2}>
            {!isMobile && (
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={handleBack}
              >
                {t("common.back")}
              </Button>
            )}
            <Box flex={1}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                {category.icon && (
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 1,
                      bgcolor: category.color || "primary.main",
                      color: "white",
                    }}
                  >
                    {category.icon}
                  </Box>
                )}
                <Typography variant="h4" component="h1">
                  {category.name}
                </Typography>
              </Stack>
              {category.description && (
                <Typography variant="body2" color="text.secondary">
                  {category.description}
                </Typography>
              )}
              <Stack direction="row" spacing={1} mt={1}>
                <Chip
                  icon={<CommentIcon />}
                  label={t("forum.postsCount", { count: category.postsCount })}
                  size="small"
                />
              </Stack>
            </Box>
            {!isMobile && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreatePost}
              >
                {t("forum.createPost")}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Sort and Filter Controls */}
      <Stack
        direction={isMobile ? "column" : "row"}
        justifyContent="space-between"
        alignItems={isMobile ? "stretch" : "center"}
        spacing={2}
        mb={3}
      >
        <Typography variant="h6">
          {t("forum.allPosts")}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{t("forum.sortBy")}</InputLabel>
          <Select
            value={sortBy}
            label={t("forum.sortBy")}
            onChange={(e) => handleSortChange(e.target.value as SortOption)}
          >
            <MenuItem value="recent">{t("forum.recent")}</MenuItem>
            <MenuItem value="popular">{t("forum.popular")}</MenuItem>
            <MenuItem value="unanswered">{t("forum.unanswered")}</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* Posts List */}
      {postsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t("forum.errorLoadingPosts")}
        </Alert>
      )}

      {postsLoading ? (
        <Stack spacing={2}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rectangular" height={120} />
          ))}
        </Stack>
      ) : postsData?.posts.length === 0 ? (
        <Alert severity="info">
          {t("forum.noPostsInCategory")}
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={handleCreatePost}
            sx={{ mt: 1 }}
          >
            {t("forum.createFirstPost")}
          </Button>
        </Alert>
      ) : (
        <>
          <List>
            {postsData?.posts.map((post) => (
              <ListItem
                key={post.id}
                disablePadding
                sx={{ mb: 2 }}
              >
                <Card sx={{ width: "100%" }}>
                  <ListItemButton onClick={() => handlePostClick(post.id)}>
                    <ListItemAvatar>
                      <Avatar {...(post.author.avatarUrl ? { src: post.author.avatarUrl } : {})}>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                          {post.isPinned && (
                            <PushPinIcon fontSize="small" color="primary" />
                          )}
                          <Typography variant="h6" component="span">
                            {post.title}
                          </Typography>
                          {post.isAnswered && (
                            <Chip
                              icon={<CheckCircleIcon />}
                              label={t("forum.answered")}
                              size="small"
                              color="success"
                            />
                          )}
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.5} mt={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            {t("forum.postedBy", {
                              username: post.author.displayName || post.author.username,
                              time: formatRelativeTime(new Date(post.createdAt)),
                            })}
                          </Typography>
                          <Stack direction="row" spacing={2} flexWrap="wrap">
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <CommentIcon fontSize="small" />
                              <Typography variant="caption">
                                {post.repliesCount} {t("forum.replies")}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <ViewIcon fontSize="small" />
                              <Typography variant="caption">
                                {post.viewCount} {t("forum.views")}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <TrendingIcon fontSize="small" />
                              <Typography variant="caption">
                                {post.upvotes} {t("forum.upvotes")}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Stack>
                      }
                    />
                  </ListItemButton>
                </Card>
              </ListItem>
            ))}
          </List>

          {/* Pagination */}
          {postsData && postsData.pagination.totalPages > 1 && (
            <Stack alignItems="center" mt={4}>
              <Pagination
                count={postsData.pagination.totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size={isMobile ? "small" : "medium"}
              />
            </Stack>
          )}
        </>
      )}

      {/* Mobile FAB */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label={t("forum.createPost")}
          sx={{ position: "fixed", bottom: 16, right: 16 }}
          onClick={handleCreatePost}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
}

export default ForumCategoryPage;
