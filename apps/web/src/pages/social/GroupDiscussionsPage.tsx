/**
 * Group Discussions Page
 *
 * Displays discussions for a reading group with:
 * - List of discussion threads
 * - Create new discussion
 * - Sort and filter options
 * - Pagination
 * - Reply counts and activity indicators
 *
 * Note: Full discussion thread view with nested replies would be in a separate detail page
 */

import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Avatar,
  Stack,
  Chip,
  Button,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  useMediaQuery,
  Fab,
} from "@mui/material";
import {
  ChatBubbleOutline,
  Add as AddIcon,
  PushPin,
  Lock,
  PersonOutline,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";

// ============================================================================
// Types
// ============================================================================

type DiscussionUserInfo = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

type DiscussionBookInfo = {
  id: string;
  title: string;
  author: string | null;
};

type DiscussionSummary = {
  id: string;
  title: string;
  content: string;
  bookId: string | null;
  book: DiscussionBookInfo | null;
  isPinned: boolean;
  isLocked: boolean;
  repliesCount: number;
  lastReplyAt: string | null;
  user: DiscussionUserInfo;
  createdAt: string;
  updatedAt: string;
};

type DiscussionsResponse = {
  discussions: DiscussionSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type SortOption = "lastReplyAt" | "createdAt" | "repliesCount";

// ============================================================================
// Helper Functions
// ============================================================================

function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

// ============================================================================
// Main Component
// ============================================================================

export function GroupDiscussionsPage(): React.ReactElement {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { userId: clerkUserId } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("lastReplyAt");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const limit = 20;

  // Fetch discussions
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<DiscussionsResponse, Error>({
    queryKey: ["groupDiscussions", groupId, page, limit, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: sortBy,
        sortDirection: "desc",
      });

      const response = await fetch(`/api/groups/${groupId}/discussions?${params}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch discussions");
      }

      return response.json();
    },
    enabled: !!groupId && !!clerkUserId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Create discussion mutation
  const createMutation = useMutation({
    mutationFn: async (input: { title: string; content: string }) => {
      const response = await fetch(`/api/groups/${groupId}/discussions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create discussion");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupDiscussions", groupId] });
      setShowCreateDialog(false);
      setNewTitle("");
      setNewContent("");
      setPage(1); // Go to first page to see new discussion
    },
  });

  // Handlers
  const handleCreateDiscussion = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      return;
    }

    await createMutation.mutateAsync({
      title: newTitle.trim(),
      content: newContent.trim(),
    });
  };

  const handleDiscussionClick = (discussionId: string) => {
    // TODO: Navigate to discussion detail page
    // For now, just show an alert
    alert(`Discussion detail page would show here for discussion: ${discussionId}`);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
  if (error) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          {t("groups.discussions")}
        </Typography>
        <Alert severity="error" sx={{ mt: 3 }}>
          {error.message}
        </Alert>
        <Button variant="outlined" onClick={() => refetch()} sx={{ mt: 2 }}>
          {t("common.retry")}
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {t("groups.discussions")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("groups.discussionSubtitle")}
          </Typography>
        </Box>
        {!isMobile && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
            size="large"
          >
            {t("groups.newDiscussion")}
          </Button>
        )}
      </Stack>

      {/* Sort Filter */}
      <FormControl sx={{ mb: 3, minWidth: 200 }}>
        <InputLabel>{t("common.sortBy")}</InputLabel>
        <Select
          value={sortBy}
          label={t("common.sortBy")}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
        >
          <MenuItem value="lastReplyAt">{t("groups.sortByRecent")}</MenuItem>
          <MenuItem value="createdAt">{t("groups.sortByCreated")}</MenuItem>
          <MenuItem value="repliesCount">{t("groups.sortByReplies")}</MenuItem>
        </Select>
      </FormControl>

      {/* Discussions List */}
      {data && data.discussions.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body1">
            {t("groups.noDiscussionsYet")}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
            sx={{ mt: 2 }}
          >
            {t("groups.startFirstDiscussion")}
          </Button>
        </Alert>
      ) : (
        <>
          <Stack spacing={2}>
            {data?.discussions.map((discussion) => (
              <Card
                key={discussion.id}
                sx={{
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: theme.shadows[4],
                  },
                }}
                onClick={() => handleDiscussionClick(discussion.id)}
              >
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Avatar
                      {...(discussion.user.avatarUrl ? { src: discussion.user.avatarUrl } : {})}
                      sx={{ width: 48, height: 48 }}
                    >
                      <PersonOutline />
                    </Avatar>
                    <Box flex={1}>
                      {/* Title and Badges */}
                      <Stack direction="row" spacing={1} alignItems="center" mb={1} flexWrap="wrap">
                        <Typography variant="h6" component="h3">
                          {discussion.title}
                        </Typography>
                        {discussion.isPinned && (
                          <Chip
                            icon={<PushPin />}
                            label={t("groups.pinned")}
                            size="small"
                            color="primary"
                          />
                        )}
                        {discussion.isLocked && (
                          <Chip
                            icon={<Lock />}
                            label={t("groups.locked")}
                            size="small"
                            color="default"
                          />
                        )}
                      </Stack>

                      {/* Content Preview */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {discussion.content}
                      </Typography>

                      {/* Book Reference */}
                      {discussion.book && (
                        <Chip
                          label={`📚 ${discussion.book.title}`}
                          size="small"
                          variant="outlined"
                          sx={{ mb: 1 }}
                        />
                      )}

                      {/* Footer */}
                      <Stack
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        flexWrap="wrap"
                      >
                        <Typography variant="caption" color="text.secondary">
                          {discussion.user.displayName || discussion.user.username || "Anonymous"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatRelativeTime(new Date(discussion.createdAt))}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <ChatBubbleOutline fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {discussion.repliesCount} {t("groups.replies")}
                          </Typography>
                        </Stack>
                        {discussion.lastReplyAt && (
                          <>
                            <Typography variant="caption" color="text.secondary">
                              •
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {t("groups.lastReply")} {formatRelativeTime(new Date(discussion.lastReplyAt))}
                            </Typography>
                          </>
                        )}
                      </Stack>
                    </Box>
                  </Stack>
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
        </>
      )}

      {/* Mobile FAB */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label={t("groups.newDiscussion")}
          onClick={() => setShowCreateDialog(true)}
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Create Discussion Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>{t("groups.createDiscussion")}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              required
              label={t("groups.discussionTitle")}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              inputProps={{ maxLength: 300 }}
              helperText={`${newTitle.length}/300`}
            />
            <TextField
              fullWidth
              required
              multiline
              rows={6}
              label={t("groups.discussionContent")}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              inputProps={{ maxLength: 50000 }}
              helperText={`${newContent.length}/50000`}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateDiscussion}
            disabled={!newTitle.trim() || !newContent.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? t("common.creating") : t("common.create")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default GroupDiscussionsPage;
