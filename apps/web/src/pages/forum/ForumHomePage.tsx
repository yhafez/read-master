/**
 * Forum Home Page
 *
 * Main forum landing page that displays:
 * - Forum categories with post counts and recent activity
 * - Popular posts section
 * - Recent posts section
 * - Search bar
 * - Create post button
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Skeleton,
  Alert,
  Fab,
} from "@mui/material";
import {
  Forum as ForumIcon,
  Add as AddIcon,
  Search as SearchIcon,
  TrendingUp as TrendingIcon,
  Schedule as RecentIcon,
  ChatBubbleOutline as CommentIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
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
  lastPostAt: string | null;
  lastPost: {
    id: string;
    title: string;
    author: {
      username: string;
    };
    createdAt: string;
  } | null;
};

type ForumPost = {
  id: string;
  title: string;
  content: string;
  category: {
    slug: string;
    name: string;
    color: string | null;
  };
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

export function ForumHomePage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"popular" | "recent">("popular");

  // Fetch categories
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError,
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

  // Fetch posts based on active tab
  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
  } = useQuery<{
    posts: ForumPost[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }, Error>({
    queryKey: ["forum", "posts", activeTab],
    queryFn: async () => {
      const sortBy = activeTab === "popular" ? "popular" : "recent";
      const response = await fetch(`/api/forum/posts?sortBy=${sortBy}&limit=10`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch forum posts");
      }

      return response.json();
    },
  });

  // Handlers
  const handleCategoryClick = (slug: string) => {
    navigate(`/forum/category/${slug}`);
  };

  const handlePostClick = (postId: string) => {
    navigate(`/forum/post/${postId}`);
  };

  const handleCreatePost = () => {
    navigate("/forum/create");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/forum/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <ForumIcon fontSize="large" color="primary" />
          <Box>
            <Typography variant="h4" component="h1">
              {t("forum.community")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("forum.discussAndShare")}
            </Typography>
          </Box>
        </Stack>
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

      {/* Search Bar */}
      <Box component="form" onSubmit={handleSearch} mb={3}>
        <TextField
          fullWidth
          placeholder={t("forum.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Categories Section */}
      <Typography variant="h5" component="h2" mb={2}>
        {t("forum.categories")}
      </Typography>

      {categoriesError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t("forum.errorLoadingCategories")}
        </Alert>
      )}

      {categoriesLoading ? (
        <Grid container spacing={2} mb={4}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={150} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2} mb={4}>
          {categoriesData?.categories.map((category) => (
            <Grid item xs={12} sm={6} md={3} key={category.id}>
              <Card
                sx={{
                  cursor: "pointer",
                  height: "100%",
                  "&:hover": {
                    boxShadow: theme.shadows[4],
                  },
                }}
                onClick={() => handleCategoryClick(category.slug)}
              >
                <CardContent>
                  <Stack spacing={1}>
                    {/* Category Header */}
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {category.icon && (
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
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
                      <Typography variant="h6" component="h3">
                        {category.name}
                      </Typography>
                    </Stack>

                    {/* Description */}
                    {category.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {category.description}
                      </Typography>
                    )}

                    {/* Stats */}
                    <Stack direction="row" spacing={2}>
                      <Chip
                        icon={<CommentIcon />}
                        label={t("forum.postsCount", { count: category.postsCount })}
                        size="small"
                      />
                    </Stack>

                    {/* Last Post */}
                    {category.lastPost && (
                      <Typography variant="caption" color="text.secondary">
                        {t("forum.lastPostBy", {
                          username: category.lastPost.author.username,
                          time: formatRelativeTime(new Date(category.lastPost.createdAt)),
                        })}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Posts Section */}
      <Box>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h5" component="h2">
            {t("forum.recentActivity")}
          </Typography>
          <Tabs
            value={activeTab}
            onChange={(_e, value) => setActiveTab(value)}
            aria-label={t("forum.postsSortBy")}
          >
            <Tab
              icon={<TrendingIcon />}
              iconPosition="start"
              label={t("forum.popular")}
              value="popular"
            />
            <Tab
              icon={<RecentIcon />}
              iconPosition="start"
              label={t("forum.recent")}
              value="recent"
            />
          </Tabs>
        </Stack>

        {postsError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {t("forum.errorLoadingPosts")}
          </Alert>
        )}

        {postsLoading ? (
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={100} />
            ))}
          </Stack>
        ) : postsData?.posts.length === 0 ? (
          <Alert severity="info">
            {t("forum.noPostsYet")}
          </Alert>
        ) : (
          <List>
            {postsData?.posts.map((post) => (
              <ListItem
                key={post.id}
                disablePadding
                sx={{ mb: 1 }}
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
                          <Typography variant="h6" component="span">
                            {post.title}
                          </Typography>
                          {post.isPinned && (
                            <Chip label={t("forum.pinned")} size="small" color="primary" />
                          )}
                          {post.isAnswered && (
                            <Chip label={t("forum.answered")} size="small" color="success" />
                          )}
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            {t("forum.postedBy", {
                              username: post.author.displayName || post.author.username,
                              time: formatRelativeTime(new Date(post.createdAt)),
                            })}
                          </Typography>
                          <Stack direction="row" spacing={2} flexWrap="wrap">
                            <Chip
                              label={post.category.name}
                              size="small"
                              sx={{
                                bgcolor: post.category.color || "grey.200",
                                color: "white",
                              }}
                            />
                            <Stack direction="row" spacing={1} alignItems="center">
                              <CommentIcon fontSize="small" />
                              <Typography variant="caption">
                                {post.repliesCount}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <ViewIcon fontSize="small" />
                              <Typography variant="caption">
                                {post.viewCount}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <TrendingIcon fontSize="small" />
                              <Typography variant="caption">
                                {post.upvotes}
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
        )}
      </Box>

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

export default ForumHomePage;
