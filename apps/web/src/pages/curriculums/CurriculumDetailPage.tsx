/**
 * Curriculum Detail Page
 *
 * Display full curriculum information with:
 * - Curriculum info (title, description, cover, category, tags, difficulty)
 * - Ordered list of items (books/resources)
 * - Progress indicator
 * - Follow/unfollow functionality
 * - Start/continue reading actions
 * - Creator information
 * - Stats (followers, items count)
 */

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurriculumProgress } from "@/hooks";
import {
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  Card,
  CardContent,
  CardMedia,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  LinearProgress,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PersonIcon from "@mui/icons-material/Person";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import EditIcon from "@mui/icons-material/Edit";
import ShareIcon from "@mui/icons-material/Share";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LinkIcon from "@mui/icons-material/Link";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";

// ============================================================================
// Types
// ============================================================================

type CurriculumItem = {
  id: string;
  orderIndex: number;
  bookId: string | null;
  book: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
  } | null;
  externalTitle: string | null;
  externalAuthor: string | null;
  externalUrl: string | null;
  externalIsbn: string | null;
  notes: string | null;
  estimatedTime: number | null;
  isOptional: boolean;
};

type Curriculum = {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  category: string | null;
  tags: string[];
  difficulty: string | null;
  visibility: string;
  totalItems: number;
  followersCount: number;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  isOwner: boolean;
  isFollowing: boolean;
  items: CurriculumItem[];
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchCurriculum(id: string): Promise<Curriculum> {
  const response = await fetch(`/api/curriculums/${id}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to fetch curriculum",
    }));
    throw new Error(error.message || "Failed to fetch curriculum");
  }

  const data = await response.json();
  return data.data;
}

async function followCurriculum(id: string): Promise<void> {
  const response = await fetch(`/api/curriculums/${id}/follow`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to follow curriculum");
  }
}

async function unfollowCurriculum(id: string): Promise<void> {
  const response = await fetch(`/api/curriculums/${id}/follow`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to unfollow curriculum");
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function CurriculumDetailPage(): React.ReactElement {
  const { curriculumId } = useParams<{ curriculumId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const queryClient = useQueryClient();

  // Fetch curriculum
  const {
    data: curriculum,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["curriculum", curriculumId],
    queryFn: () => fetchCurriculum(curriculumId!),
    enabled: !!curriculumId,
  });

  // Fetch and manage progress
  const {
    progress,
    markItemComplete,
    moveToNextItem,
    moveToPreviousItem,
    isUpdating,
  } = useCurriculumProgress(
    curriculumId || "",
    curriculum?.totalItems || 0,
    !!curriculum && curriculum.isFollowing
  );

  // Follow/unfollow mutations
  const followMutation = useMutation({
    mutationFn: followCurriculum,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculum", curriculumId] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: unfollowCurriculum,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculum", curriculumId] });
    },
  });

  // Handlers
  const handleFollowToggle = () => {
    if (!curriculum) return;

    if (curriculum.isFollowing) {
      unfollowMutation.mutate(curriculum.id);
    } else {
      followMutation.mutate(curriculum.id);
    }
  };

  const handleEdit = () => {
    navigate(`/curriculums/${curriculumId}/edit`);
  };

  const handleStartReading = () => {
    if (curriculum && curriculum.items.length > 0) {
      // Start from current item or first item
      const startIndex = progress?.currentItemIndex ?? 0;
      const sortedItems = curriculum.items.sort((a, b) => a.orderIndex - b.orderIndex);
      const item = sortedItems[startIndex];
      
      if (item) {
        if (item.bookId) {
          navigate(`/books/${item.bookId}`);
        } else if (item.externalUrl) {
          window.open(item.externalUrl, "_blank");
        }
      }
    }
  };

  const handleItemClick = (item: CurriculumItem) => {
    if (item.bookId) {
      navigate(`/books/${item.bookId}`);
    } else if (item.externalUrl) {
      window.open(item.externalUrl, "_blank");
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        const shareData: ShareData = { url };
        if (curriculum?.title) shareData.title = curriculum.title;
        if (curriculum?.description) shareData.text = curriculum.description;
        await navigator.share(shareData);
      } catch (_error) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      // TODO: Show toast notification
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error || !curriculum) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : "Curriculum not found"}
        </Alert>
        <Button variant="outlined" onClick={() => navigate("/curriculums/browse")}>
          Browse Curriculums
        </Button>
      </Box>
    );
  }

  // Calculate progress from API
  const percentComplete = progress?.percentComplete ?? 0;
  const completedItems = progress?.completedItems ?? 0;

  return (
    <Box>
      {/* Header Card */}
      <Card sx={{ mb: 3 }}>
        <Grid container>
          {/* Cover Image */}
          {curriculum.coverImage && (
            <Grid item xs={12} md={4}>
              <CardMedia
                component="img"
                image={curriculum.coverImage}
                alt={curriculum.title}
                sx={{
                  height: { xs: 200, md: "100%" },
                  objectFit: "cover",
                }}
              />
            </Grid>
          )}

          {/* Content */}
          <Grid item xs={12} md={curriculum.coverImage ? 8 : 12}>
            <CardContent>
              {/* Title and Actions */}
              <Stack
                direction={isMobile ? "column" : "row"}
                justifyContent="space-between"
                alignItems={isMobile ? "flex-start" : "center"}
                spacing={2}
                mb={2}
              >
                <Typography variant="h4" component="h1">
                  {curriculum.title}
                </Typography>

                <Stack direction="row" spacing={1}>
                  {curriculum.isOwner && (
                    <Tooltip title="Edit">
                      <IconButton onClick={handleEdit} color="primary">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Share">
                    <IconButton onClick={handleShare}>
                      <ShareIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>

              {/* Tags */}
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mb={2}>
                {curriculum.difficulty && (
                  <Chip label={curriculum.difficulty} color="primary" size="small" />
                )}
                {curriculum.category && (
                  <Chip label={curriculum.category} variant="outlined" size="small" />
                )}
                {curriculum.tags.map((tag) => (
                  <Chip key={tag} label={tag} variant="outlined" size="small" />
                ))}
              </Stack>

              {/* Description */}
              <Typography variant="body1" paragraph>
                {curriculum.description}
              </Typography>

              {/* Stats */}
              <Grid container spacing={2} mb={2}>
                <Grid item xs={6} sm={3}>
                  <Stack alignItems="center">
                    <Typography variant="h5">{curriculum.totalItems}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Items
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Stack alignItems="center">
                    <Typography variant="h5">{curriculum.followersCount}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Followers
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Stack alignItems="center">
                    <Typography variant="h5">{completedItems}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Completed
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Stack alignItems="center">
                    <Typography variant="h5">{percentComplete}%</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Progress
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>

              {/* Progress Bar */}
              {percentComplete > 0 && (
                <Box mb={2}>
                  <LinearProgress variant="determinate" value={percentComplete} />
                </Box>
              )}

              {/* Creator */}
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <Avatar
                  {...(curriculum.creator.avatarUrl
                    ? { src: curriculum.creator.avatarUrl }
                    : {})}
                  sx={{ width: 32, height: 32 }}
                >
                  <PersonIcon />
                </Avatar>
                <Typography variant="body2" color="text.secondary">
                  Created by{" "}
                  <Typography component="span" color="text.primary">
                    {curriculum.creator.displayName || curriculum.creator.username}
                  </Typography>
                </Typography>
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Action Buttons */}
              <Stack direction={isMobile ? "column" : "row"} spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleStartReading}
                  fullWidth={isMobile}
                  disabled={curriculum.totalItems === 0}
                >
                  {percentComplete > 0 ? "Continue" : "Start"}
                </Button>
                <Button
                  variant={curriculum.isFollowing ? "outlined" : "contained"}
                  size="large"
                  startIcon={
                    curriculum.isFollowing ? <FavoriteIcon /> : <FavoriteBorderIcon />
                  }
                  onClick={handleFollowToggle}
                  color={curriculum.isFollowing ? "error" : "primary"}
                  fullWidth={isMobile}
                  disabled={
                    followMutation.isPending || unfollowMutation.isPending
                  }
                >
                  {curriculum.isFollowing ? "Following" : "Follow"}
                </Button>
              </Stack>
              
              {/* Navigation Buttons (when following and in progress) */}
              {curriculum.isFollowing && progress && (
                <Stack direction="row" spacing={1} mt={2}>
                  <Button
                    variant="outlined"
                    startIcon={<NavigateBeforeIcon />}
                    onClick={() => moveToPreviousItem()}
                    disabled={progress.currentItemIndex === 0 || isUpdating}
                    size="small"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outlined"
                    endIcon={<NavigateNextIcon />}
                    onClick={() => moveToNextItem()}
                    disabled={
                      progress.currentItemIndex >= curriculum.totalItems - 1 ||
                      isUpdating
                    }
                    size="small"
                  >
                    Next
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Grid>
        </Grid>
      </Card>

      {/* Items List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Curriculum Items
          </Typography>

          {curriculum.items.length === 0 ? (
            <Alert severity="info">
              This curriculum doesn't have any items yet.
              {curriculum.isOwner && " Add some items to get started!"}
            </Alert>
          ) : (
            <List>
              {curriculum.items
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((item, index) => (
                  <React.Fragment key={item.id}>
                    {index > 0 && <Divider />}
                    <ListItem disablePadding>
                      <ListItemButton onClick={() => handleItemClick(item)}>
                      {/* Order Number */}
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          bgcolor: theme.palette.primary.main,
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mr: 2,
                          fontWeight: "bold",
                        }}
                      >
                        {index + 1}
                      </Box>

                      {/* Book Cover/Icon */}
                      <ListItemAvatar>
                        <Avatar
                          variant="rounded"
                          {...(item.book?.coverImage
                            ? { src: item.book.coverImage }
                            : {})}
                          sx={{ width: 56, height: 80 }}
                        >
                          <MenuBookIcon />
                        </Avatar>
                      </ListItemAvatar>

                      {/* Content */}
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle1">
                              {item.book?.title || item.externalTitle || "Untitled"}
                            </Typography>
                            {item.isOptional && (
                              <Chip label="Optional" size="small" variant="outlined" />
                            )}
                            {item.externalUrl && (
                              <Tooltip title="External resource">
                                <LinkIcon fontSize="small" color="action" />
                              </Tooltip>
                            )}
                          </Stack>
                        }
                        secondary={
                          <Stack spacing={0.5}>
                            {(item.book?.author || item.externalAuthor) && (
                              <Typography variant="body2" color="text.secondary">
                                by {item.book?.author || item.externalAuthor}
                              </Typography>
                            )}
                            {item.notes && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {item.notes}
                              </Typography>
                            )}
                            {item.estimatedTime && (
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <AccessTimeIcon sx={{ fontSize: 16 }} />
                                <Typography variant="caption">
                                  {Math.floor(item.estimatedTime / 60)}h{" "}
                                  {item.estimatedTime % 60}m
                                </Typography>
                              </Stack>
                            )}
                          </Stack>
                        }
                      />

                      {/* Completion Status and Actions */}
                      <Stack direction="row" spacing={1} alignItems="center">
                        {/* Completion Icon */}
                        <Tooltip
                          title={
                            progress && index < progress.completedItems
                              ? "Completed"
                              : progress && index === progress.currentItemIndex
                              ? "Current"
                              : "Not started"
                          }
                        >
                          {progress && index < progress.completedItems ? (
                            <CheckCircleIcon color="success" />
                          ) : progress && index === progress.currentItemIndex ? (
                            <Box
                              sx={{
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                border: `2px solid ${theme.palette.primary.main}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: "50%",
                                  bgcolor: theme.palette.primary.main,
                                }}
                              />
                            </Box>
                          ) : (
                            <RadioButtonUncheckedIcon color="action" />
                          )}
                        </Tooltip>

                        {/* Mark Complete Button (for current/completed items when following) */}
                        {curriculum.isFollowing &&
                          progress &&
                          index <= progress.currentItemIndex && (
                            <Tooltip
                              title={
                                index < progress.completedItems
                                  ? "Already completed"
                                  : "Mark as complete"
                              }
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markItemComplete(index);
                                  }}
                                  disabled={
                                    index < progress.completedItems || isUpdating
                                  }
                                  color="primary"
                                >
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                      </Stack>
                      </ListItemButton>
                    </ListItem>
                  </React.Fragment>
                ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default CurriculumDetailPage;
