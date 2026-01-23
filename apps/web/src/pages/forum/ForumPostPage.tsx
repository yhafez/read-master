/**
 * Forum Post Detail Page
 *
 * Displays a single forum post with:
 * - Post content and metadata
 * - Nested replies (up to 3 levels)
 * - Reply creation
 * - Collapse/expand threads
 * - Edit/delete own posts and replies
 */

import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Avatar,
  Button,
  IconButton,
  Divider,
  Breadcrumbs,
  Link,
  Collapse,
  useTheme,
  useMediaQuery,
  Skeleton,
  Alert,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Reply as ReplyIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Visibility as ViewIcon,
  ChatBubbleOutline as CommentIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import {
  VoteButtons,
  MarkdownPreview,
  MarkdownEditor,
} from "@/components/forum";

// ============================================================================
// Types
// ============================================================================

type ForumReply = {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  parentReplyId: string | null;
  upvotes: number;
  isBestAnswer: boolean;
  createdAt: string;
  updatedAt: string;
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
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  repliesCount: number;
  viewCount: number;
  upvotes: number;
  isPinned: boolean;
  isLocked: boolean;
  isAnswered: boolean;
  isBestAnswer: boolean;
  replies: ForumReply[];
  createdAt: string;
};

const MAX_NESTING_LEVEL = 3;

// ============================================================================
// Helper Functions
// ============================================================================

function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Build a nested reply tree from flat reply list
 */
function buildReplyTree(
  replies: ForumReply[]
): Map<string | null, ForumReply[]> {
  const tree = new Map<string | null, ForumReply[]>();

  replies.forEach((reply) => {
    const parentId = reply.parentReplyId;
    if (!tree.has(parentId)) {
      tree.set(parentId, []);
    }
    tree.get(parentId)!.push(reply);
  });

  return tree;
}

// ============================================================================
// Reply Component
// ============================================================================

type ReplyItemProps = {
  reply: ForumReply;
  level: number;
  replyTree: Map<string | null, ForumReply[]>;
  onReply: (replyId: string) => void;
  onEdit: (reply: ForumReply) => void;
  onDelete: (replyId: string) => void;
  onMarkBestAnswer?: ((replyId: string) => void) | undefined;
  isPostAuthor?: boolean | undefined;
  currentUserId?: string | undefined;
};

function ReplyItem({
  reply,
  level,
  replyTree,
  onReply,
  onEdit,
  onDelete,
  onMarkBestAnswer,
  isPostAuthor = false,
  currentUserId,
}: ReplyItemProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const childReplies = replyTree.get(reply.id) || [];
  const hasChildren = childReplies.length > 0;
  const canNest = level < MAX_NESTING_LEVEL;
  const isAuthor = currentUserId === reply.author.id;
  const canMarkBestAnswer = isPostAuthor && !reply.isBestAnswer;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    onEdit(reply);
    handleMenuClose();
  };

  const handleDelete = () => {
    if (window.confirm(t("forum.confirmDeleteReply"))) {
      onDelete(reply.id);
    }
    handleMenuClose();
  };

  const handleMarkBestAnswer = () => {
    onMarkBestAnswer?.(reply.id);
    handleMenuClose();
  };

  return (
    <Box
      sx={{
        ml: level > 0 ? 4 : 0,
        borderLeft: level > 0 ? `2px solid ${theme.palette.divider}` : "none",
        pl: level > 0 ? 2 : 0,
      }}
    >
      <Card
        sx={{
          mb: 2,
          ...(reply.isBestAnswer && {
            borderColor: "success.main",
            borderWidth: 2,
            borderStyle: "solid",
            backgroundColor: "success.50",
          }),
        }}
      >
        <CardContent>
          <Stack direction="row" alignItems="start" spacing={2}>
            {/* Avatar */}
            <Avatar
              {...(reply.author.avatarUrl
                ? { src: reply.author.avatarUrl }
                : {})}
            >
              <PersonIcon />
            </Avatar>

            {/* Content */}
            <Box flex={1}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {reply.author.displayName || reply.author.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  •
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatRelativeTime(new Date(reply.createdAt))}
                </Typography>
                {reply.isBestAnswer && (
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={t("forum.bestAnswer")}
                    size="small"
                    color="success"
                  />
                )}
              </Stack>

              <Stack direction="row" spacing={2}>
                {/* Vote Buttons */}
                <VoteButtons
                  voteScore={reply.upvotes}
                  upvotes={reply.upvotes}
                  userVote={0} // TODO: Get user's vote from API response
                  onVote={async () => {
                    // TODO: Implement reply voting API
                    // POST /api/forum/posts/:postId/replies/:replyId/vote
                  }}
                  size="small"
                />

                {/* Reply Content and Actions */}
                <Box flex={1}>
                  <Box sx={{ mb: 2 }}>
                    <MarkdownPreview content={reply.content} variant="body2" />
                  </Box>

                  <Stack direction="row" spacing={2} alignItems="center">
                    {canNest && (
                      <Button
                        size="small"
                        startIcon={<ReplyIcon />}
                        onClick={() => onReply(reply.id)}
                      >
                        {t("forum.reply")}
                      </Button>
                    )}

                    {hasChildren && (
                      <Button
                        size="small"
                        startIcon={
                          collapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />
                        }
                        onClick={() => setCollapsed(!collapsed)}
                      >
                        {collapsed
                          ? t("forum.showReplies", {
                              count: childReplies.length,
                            })
                          : t("forum.hideReplies")}
                      </Button>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Box>

            {/* Actions Menu */}
            {(isAuthor || canMarkBestAnswer) && (
              <Box>
                <IconButton size="small" onClick={handleMenuOpen}>
                  <MoreVertIcon />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  {canMarkBestAnswer && (
                    <MenuItem onClick={handleMarkBestAnswer}>
                      <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
                      {t("forum.markBestAnswer")}
                    </MenuItem>
                  )}
                  {isAuthor && (
                    <>
                      <MenuItem onClick={handleEdit}>
                        <EditIcon fontSize="small" sx={{ mr: 1 }} />
                        {t("common.edit")}
                      </MenuItem>
                      <MenuItem
                        onClick={handleDelete}
                        sx={{ color: "error.main" }}
                      >
                        <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                        {t("common.delete")}
                      </MenuItem>
                    </>
                  )}
                </Menu>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Nested Replies */}
      {hasChildren && (
        <Collapse in={!collapsed}>
          <Box>
            {childReplies.map((childReply) => (
              <ReplyItem
                key={childReply.id}
                reply={childReply}
                level={level + 1}
                replyTree={replyTree}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onMarkBestAnswer={onMarkBestAnswer}
                isPostAuthor={isPostAuthor}
                currentUserId={currentUserId}
              />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ForumPostPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const queryClient = useQueryClient();

  // State
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingReply, setEditingReply] = useState<ForumReply | null>(null);

  // Fetch post data
  const {
    data: postData,
    isLoading,
    error,
  } = useQuery<{ post: ForumPost }, Error>({
    queryKey: ["forumPost", id],
    queryFn: async () => {
      const response = await fetch(`/api/forum/posts/${id}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch forum post");
      }

      return response.json();
    },
    enabled: !!id,
  });

  const post = postData?.post;

  // Build reply tree
  const replyTree = post ? buildReplyTree(post.replies) : new Map();
  const topLevelReplies = replyTree.get(null) || [];

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ value }: { value: number }) => {
      const method = value === 0 ? "DELETE" : "POST";
      const url = `/api/forum/posts/${id}/vote`;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        ...(value !== 0 && { body: JSON.stringify({ value }) }),
      });

      if (!response.ok) {
        throw new Error("Failed to vote");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forumPost", id] });
    },
  });

  // Handlers
  const handleBack = () => {
    if (post) {
      navigate(`/forum/category/${post.category.slug}`);
    } else {
      navigate("/forum");
    }
  };

  const handleMarkBestAnswer = async (replyId: string) => {
    if (!id) return;

    try {
      const response = await fetch(
        `/api/forum/posts/${id}/replies/${replyId}/best`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark best answer");
      }

      // Refresh post data
      queryClient.invalidateQueries({ queryKey: ["forumPost", id] });
    } catch (_error) {
      // Error marking best answer - silently fail for now
      // TODO: Add proper error handling with toast notification
    }
  };

  const handleReply = (parentReplyId: string | null) => {
    setReplyingTo(parentReplyId);
    setEditingReply(null);
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return;

    // TODO: Call API to create reply
    // POST /api/forum/posts/:id/replies
    // with { content: replyContent, parentReplyId: replyingTo }

    setReplyContent("");
    setReplyingTo(null);
  };

  const handleEditReply = (reply: ForumReply) => {
    setEditingReply(reply);
    setReplyContent(reply.content);
    setReplyingTo(null);
  };

  const handleUpdateReply = async () => {
    if (!editingReply || !replyContent.trim()) return;

    // TODO: Call API to update reply
    // PUT /api/forum/posts/:postId/replies/:replyId
    // with { content: replyContent }

    setReplyContent("");
    setEditingReply(null);
  };

  const handleDeleteReply = async (_replyId: string) => {
    // TODO: Call API to delete reply
    // DELETE /api/forum/posts/:postId/replies/:replyId
  };

  const handleCancelReply = () => {
    setReplyContent("");
    setReplyingTo(null);
    setEditingReply(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 3 }} />
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={150} />
          ))}
        </Stack>
      </Box>
    );
  }

  // Error state
  if (error || !post) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {t("forum.postNotFound")}
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
          onClick={() => navigate("/forum")}
          sx={{ cursor: "pointer" }}
        >
          {t("forum.community")}
        </Link>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate(`/forum/category/${post.category.slug}`)}
          sx={{ cursor: "pointer" }}
        >
          {post.category.name}
        </Link>
        <Typography variant="body2" color="text.primary">
          {post.title}
        </Typography>
      </Breadcrumbs>

      {/* Back Button (Mobile) */}
      {isMobile && (
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          {t("common.back")}
        </Button>
      )}

      {/* Post Content */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {/* Header */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            mb={2}
            flexWrap="wrap"
          >
            <Typography variant="h4" component="h1" sx={{ flex: 1 }}>
              {post.title}
            </Typography>
            {post.isPinned && (
              <Chip label={t("forum.pinned")} size="small" color="primary" />
            )}
            {post.isAnswered && (
              <Chip
                icon={<CheckCircleIcon />}
                label={t("forum.answered")}
                size="small"
                color="success"
              />
            )}
            {post.isLocked && (
              <Chip label={t("forum.locked")} size="small" color="default" />
            )}
          </Stack>

          {/* Author Info */}
          <Stack direction="row" alignItems="center" spacing={2} mb={2}>
            <Avatar
              {...(post.author.avatarUrl ? { src: post.author.avatarUrl } : {})}
            >
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                {post.author.displayName || post.author.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatRelativeTime(new Date(post.createdAt))}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* Post Content and Voting */}
          <Stack direction="row" spacing={2}>
            {/* Vote Buttons */}
            <VoteButtons
              voteScore={post.upvotes}
              upvotes={post.upvotes}
              userVote={0} // TODO: Get user's vote from API response
              onVote={(value) => voteMutation.mutate({ value })}
              size="large"
            />

            {/* Post Content */}
            <Box flex={1}>
              <Box sx={{ mb: 2 }}>
                <MarkdownPreview content={post.content} variant="body1" />
              </Box>

              {/* Post Stats */}
              <Stack direction="row" spacing={3} flexWrap="wrap">
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <ViewIcon fontSize="small" />
                  <Typography variant="caption">
                    {post.viewCount} {t("forum.views")}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <CommentIcon fontSize="small" />
                  <Typography variant="caption">
                    {post.repliesCount} {t("forum.replies")}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Replies Section */}
      <Typography variant="h5" component="h2" mb={2}>
        {t("forum.replies")} ({post.repliesCount})
      </Typography>

      {/* Reply Form */}
      {!post.isLocked && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" mb={2}>
              {editingReply
                ? t("forum.editReply")
                : replyingTo
                  ? t("forum.replyToComment")
                  : t("forum.addReply")}
            </Typography>
            <Box sx={{ mb: 2 }}>
              <MarkdownEditor
                value={replyContent}
                onChange={setReplyContent}
                placeholder={t("forum.replyPlaceholder")}
                rows={4}
                maxLength={50000}
                showCharCount={true}
                showPreviewToggle={true}
              />
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={editingReply ? handleUpdateReply : handleSubmitReply}
                disabled={!replyContent.trim()}
              >
                {editingReply ? t("common.update") : t("forum.postReply")}
              </Button>
              {(replyingTo || editingReply) && (
                <Button variant="outlined" onClick={handleCancelReply}>
                  {t("common.cancel")}
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Replies List */}
      {topLevelReplies.length === 0 ? (
        <Alert severity="info">{t("forum.noRepliesYet")}</Alert>
      ) : (
        <Box>
          {/* Best Answer First */}
          {topLevelReplies
            .filter((r: ForumReply) => r.isBestAnswer)
            .map((reply: ForumReply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                level={0}
                replyTree={replyTree}
                onReply={handleReply}
                onEdit={handleEditReply}
                onDelete={handleDeleteReply}
                onMarkBestAnswer={handleMarkBestAnswer}
                isPostAuthor={post.author.id === post.author.id} // TODO: Compare with actual current user ID
                currentUserId={post.author.id} // TODO: Get actual current user ID
              />
            ))}
          {/* Other Replies */}
          {topLevelReplies
            .filter((r: ForumReply) => !r.isBestAnswer)
            .map((reply: ForumReply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                level={0}
                replyTree={replyTree}
                onReply={handleReply}
                onEdit={handleEditReply}
                onDelete={handleDeleteReply}
                onMarkBestAnswer={handleMarkBestAnswer}
                isPostAuthor={post.author.id === post.author.id} // TODO: Compare with actual current user ID
                currentUserId={post.author.id} // TODO: Get actual current user ID
              />
            ))}
        </Box>
      )}
    </Box>
  );
}

export default ForumPostPage;
