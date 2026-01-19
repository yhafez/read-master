/**
 * Forum Post Detail Page
 *
 * Displays a single forum post with:
 * - Post content with markdown formatting
 * - Author info and timestamp
 * - View count
 * - Voting (upvote/downvote)
 * - Reply form
 * - Threaded replies with nesting
 * - Best answer marking (for OP)
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  ThumbUp as ThumbUpIcon,
  ThumbUpOutlined as ThumbUpOutlinedIcon,
  ThumbDown as ThumbDownIcon,
  ThumbDownOutlined as ThumbDownOutlinedIcon,
  Visibility as ViewIcon,
  Reply as ReplyIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Send as SendIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";

import { routeHelpers } from "@/router/routes";
import {
  applyVote,
  buildReplyTree,
  calculateVoteScore,
  canEditPost,
  canEditReply,
  canMarkBestAnswer,
  formatRelativeTime,
  formatVoteScore,
  getRelativeTime,
  getVoteScoreColor,
  renderMarkdownContent,
  sortReplies,
  MAX_REPLY_DEPTH,
  type ForumPostDetail,
  type ForumReply,
  type ReplySortOrder,
  type VoteState,
  type VoteType,
} from "./forumPostUtils";

// =============================================================================
// MOCK DATA (Will be replaced with API calls)
// =============================================================================

const MOCK_CURRENT_USER_ID = "user-1";

const MOCK_POST: ForumPostDetail = {
  id: "post-1",
  title: "Best practices for improving reading comprehension?",
  content: `I've been using Read Master for a few weeks now and I'm amazed at how much it has helped my comprehension.

**Here are some tips I've discovered:**

1. Use the pre-reading guides before starting any book
2. Take notes as you read using the annotation feature
3. Review flashcards daily - even just 10 minutes helps

Has anyone else found other techniques that work well?

I'm particularly interested in:
- Speed reading techniques
- How to handle difficult vocabulary
- Best practices for non-fiction vs fiction

Looking forward to hearing your thoughts!`,
  categoryId: "c1",
  categoryName: "General Discussion",
  categorySlug: "general-discussion",
  authorId: "user-1",
  authorName: "BookLover42",
  authorAvatar: null,
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: null,
  viewCount: 156,
  upvotes: 23,
  downvotes: 2,
  userVote: null,
  replyCount: 8,
  isOwnPost: true,
  bestAnswerId: "reply-2",
};

const MOCK_REPLIES: ForumReply[] = [
  {
    id: "reply-1",
    content:
      "Great tips! I also find that using the AI explain feature helps a lot with complex passages.",
    authorId: "user-2",
    authorName: "ReadingEnthusiast",
    authorAvatar: null,
    createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: null,
    upvotes: 12,
    downvotes: 0,
    userVote: "up",
    parentReplyId: null,
    isBestAnswer: false,
  },
  {
    id: "reply-2",
    content: `For **speed reading**, I recommend:

- Practice with easier texts first
- Use a pointer (finger or cursor) to guide your eyes
- Chunk words together instead of reading word-by-word

The comprehension checks in Read Master are really helpful for making sure you're not sacrificing understanding for speed.`,
    authorId: "user-3",
    authorName: "SpeedReader101",
    authorAvatar: null,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: null,
    upvotes: 28,
    downvotes: 1,
    userVote: null,
    parentReplyId: null,
    isBestAnswer: true,
  },
  {
    id: "reply-3",
    content: "Thanks for sharing these tips! Very helpful.",
    authorId: "user-4",
    authorName: "NewReader",
    authorAvatar: null,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: null,
    upvotes: 3,
    downvotes: 0,
    userVote: null,
    parentReplyId: "reply-1",
    isBestAnswer: false,
  },
  {
    id: "reply-4",
    content: "I second this! The AI explanations are game-changing.",
    authorId: "user-5",
    authorName: "BookwormPro",
    authorAvatar: null,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: null,
    upvotes: 5,
    downvotes: 0,
    userVote: null,
    parentReplyId: "reply-1",
    isBestAnswer: false,
  },
];

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface VoteButtonsProps {
  state: VoteState;
  onVote: (vote: VoteType) => void;
  disabled?: boolean;
  size?: "small" | "medium";
}

function VoteButtons({
  state,
  onVote,
  disabled = false,
  size = "medium",
}: VoteButtonsProps): React.ReactElement {
  const { t } = useTranslation();
  const scoreColor = getVoteScoreColor(state.score);

  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Tooltip title={t("forum.post.upvote")}>
        <span>
          <IconButton
            size={size}
            onClick={() => onVote("up")}
            disabled={disabled}
            color={state.userVote === "up" ? "primary" : "default"}
            aria-label={t("forum.post.upvote")}
          >
            {state.userVote === "up" ? (
              <ThumbUpIcon fontSize={size} />
            ) : (
              <ThumbUpOutlinedIcon fontSize={size} />
            )}
          </IconButton>
        </span>
      </Tooltip>
      <Typography
        variant={size === "small" ? "body2" : "body1"}
        fontWeight="medium"
        color={scoreColor === "inherit" ? "text.primary" : `${scoreColor}.main`}
        sx={{ minWidth: 32, textAlign: "center" }}
      >
        {formatVoteScore(state.score)}
      </Typography>
      <Tooltip title={t("forum.post.downvote")}>
        <span>
          <IconButton
            size={size}
            onClick={() => onVote("down")}
            disabled={disabled}
            color={state.userVote === "down" ? "error" : "default"}
            aria-label={t("forum.post.downvote")}
          >
            {state.userVote === "down" ? (
              <ThumbDownIcon fontSize={size} />
            ) : (
              <ThumbDownOutlinedIcon fontSize={size} />
            )}
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

interface ReplyFormProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

function ReplyForm({
  onSubmit,
  onCancel,
  placeholder,
  autoFocus = false,
}: ReplyFormProps): React.ReactElement {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError(t("forum.post.reply.contentRequired"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(content);
      setContent("");
    } catch {
      setError(t("forum.post.reply.submitError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      <TextField
        multiline
        minRows={3}
        maxRows={10}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder ?? t("forum.post.reply.placeholder")}
        disabled={isSubmitting}
        error={Boolean(error)}
        helperText={error}
        autoFocus={autoFocus}
        fullWidth
      />
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button
          variant="outlined"
          size="small"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t("common.cancel")}
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
          startIcon={
            isSubmitting ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SendIcon />
            )
          }
        >
          {isSubmitting ? t("common.submitting") : t("forum.post.reply.submit")}
        </Button>
      </Stack>
    </Stack>
  );
}

interface ReplyItemProps {
  reply: ForumReply;
  depth: number;
  postAuthorId: string;
  currentUserId: string;
  canMarkBest: boolean;
  onVote: (replyId: string, vote: VoteType) => void;
  onReply: (replyId: string, content: string) => Promise<void>;
  onMarkBestAnswer: (replyId: string) => void;
}

function ReplyItem({
  reply,
  depth,
  postAuthorId,
  currentUserId,
  canMarkBest,
  onVote,
  onReply,
  onMarkBestAnswer,
}: ReplyItemProps): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);

  const voteState: VoteState = useMemo(
    () => ({
      upvotes: reply.upvotes,
      downvotes: reply.downvotes,
      userVote: reply.userVote,
      score: calculateVoteScore(reply.upvotes, reply.downvotes),
    }),
    [reply.upvotes, reply.downvotes, reply.userVote]
  );

  const relativeTime = useMemo(
    () => getRelativeTime(reply.createdAt),
    [reply.createdAt]
  );

  const timeDisplay = useMemo(
    () =>
      formatRelativeTime(relativeTime, (key, opts) =>
        t(key, opts as Record<string, string>)
      ),
    [relativeTime, t]
  );

  const renderedContent = useMemo(
    () => renderMarkdownContent(reply.content),
    [reply.content]
  );

  const canEdit = canEditReply(reply, currentUserId);
  const canReplyNested = depth < MAX_REPLY_DEPTH;
  const hasNestedReplies = reply.replies && reply.replies.length > 0;

  const handleReplySubmit = async (content: string) => {
    await onReply(reply.id, content);
    setShowReplyForm(false);
  };

  return (
    <Box
      sx={{
        pl: depth > 0 ? 2 : 0,
        borderLeft: depth > 0 ? 2 : 0,
        borderColor: "divider",
      }}
    >
      <Paper
        variant={reply.isBestAnswer ? "outlined" : "elevation"}
        elevation={0}
        sx={{
          p: 2,
          mb: 1,
          bgcolor: reply.isBestAnswer
            ? "success.main"
            : depth % 2 === 0
              ? "background.paper"
              : "action.hover",
          borderColor: reply.isBestAnswer ? "success.main" : undefined,
          ...(reply.isBestAnswer && {
            "& .MuiTypography-root": { color: "success.contrastText" },
            "& .MuiIconButton-root": { color: "success.contrastText" },
          }),
        }}
      >
        {/* Best Answer Badge */}
        {reply.isBestAnswer && (
          <Chip
            icon={<CheckCircleIcon />}
            label={t("forum.post.bestAnswer")}
            color="success"
            size="small"
            sx={{ mb: 1 }}
          />
        )}

        {/* Author Row */}
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Avatar sx={{ width: 28, height: 28 }} src={reply.authorAvatar || ""}>
            {reply.authorName[0]}
          </Avatar>
          <Typography variant="subtitle2" fontWeight="medium">
            {reply.authorName}
          </Typography>
          {reply.authorId === postAuthorId && (
            <Chip
              label={t("forum.post.op")}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ height: 20 }}
            />
          )}
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <ScheduleIcon sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">
              {timeDisplay}
            </Typography>
          </Stack>
        </Stack>

        {/* Content */}
        <Box
          sx={{
            "& p": { my: 0.5 },
            "& strong": { fontWeight: 600 },
            "& code": {
              bgcolor: "action.selected",
              px: 0.5,
              borderRadius: 0.5,
              fontFamily: "monospace",
            },
            "& pre": {
              bgcolor: "action.selected",
              p: 1.5,
              borderRadius: 1,
              overflow: "auto",
            },
            "& blockquote": {
              borderLeft: 3,
              borderColor: "divider",
              pl: 2,
              ml: 0,
              color: "text.secondary",
              fontStyle: "italic",
            },
            "& a": { color: "primary.main" },
            "& ul, & ol": { pl: 2.5, my: 0.5 },
          }}
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />

        {/* Actions */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mt: 1.5 }}
          flexWrap="wrap"
        >
          <VoteButtons
            state={voteState}
            onVote={(vote) => onVote(reply.id, vote)}
            size="small"
          />

          {canReplyNested && (
            <Button
              size="small"
              startIcon={<ReplyIcon />}
              onClick={() => setShowReplyForm(!showReplyForm)}
            >
              {t("forum.post.reply.action")}
            </Button>
          )}

          {canEdit && (
            <IconButton
              size="small"
              onClick={() => navigate(routeHelpers.forumEdit(reply.id))}
              aria-label={t("common.edit")}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          )}

          {canMarkBest && !reply.isBestAnswer && (
            <Tooltip title={t("forum.post.markBestAnswer")}>
              <IconButton
                size="small"
                onClick={() => onMarkBestAnswer(reply.id)}
                aria-label={t("forum.post.markBestAnswer")}
              >
                <CheckCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {hasNestedReplies && (
            <Button
              size="small"
              onClick={() => setIsCollapsed(!isCollapsed)}
              endIcon={isCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            >
              {isCollapsed
                ? t("forum.post.showReplies", {
                    count: reply.replies?.length ?? 0,
                  })
                : t("forum.post.hideReplies")}
            </Button>
          )}
        </Stack>

        {/* Reply Form */}
        <Collapse in={showReplyForm}>
          <Box sx={{ mt: 2 }}>
            <ReplyForm
              onSubmit={handleReplySubmit}
              onCancel={() => setShowReplyForm(false)}
              placeholder={t("forum.post.reply.replyTo", {
                name: reply.authorName,
              })}
              autoFocus
            />
          </Box>
        </Collapse>
      </Paper>

      {/* Nested Replies */}
      <Collapse in={!isCollapsed}>
        {hasNestedReplies &&
          reply.replies!.map((nestedReply) => (
            <ReplyItem
              key={nestedReply.id}
              reply={nestedReply}
              depth={depth + 1}
              postAuthorId={postAuthorId}
              currentUserId={currentUserId}
              canMarkBest={canMarkBest}
              onVote={onVote}
              onReply={onReply}
              onMarkBestAnswer={onMarkBestAnswer}
            />
          ))}
      </Collapse>
    </Box>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ForumPostPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();

  // State
  const [post, setPost] = useState<ForumPostDetail | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<ReplySortOrder>("best");
  const [showMainReplyForm, setShowMainReplyForm] = useState(false);

  // Load post data
  useEffect(() => {
    const loadPost = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // TODO: Replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 500));
        setPost(MOCK_POST);
        setReplies(MOCK_REPLIES);
      } catch {
        setError(t("forum.post.loadError"));
      } finally {
        setIsLoading(false);
      }
    };

    if (postId) {
      loadPost();
    }
  }, [postId, t]);

  // Derived state
  const postVoteState: VoteState = useMemo(() => {
    if (!post) {
      return { upvotes: 0, downvotes: 0, userVote: null, score: 0 };
    }
    return {
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      userVote: post.userVote,
      score: calculateVoteScore(post.upvotes, post.downvotes),
    };
  }, [post]);

  const nestedReplies = useMemo(() => {
    const tree = buildReplyTree(replies);
    return sortReplies(tree, sortOrder);
  }, [replies, sortOrder]);

  const bestAnswer = useMemo(
    () =>
      post?.bestAnswerId
        ? replies.find((r) => r.id === post.bestAnswerId)
        : null,
    [post?.bestAnswerId, replies]
  );

  const postRelativeTime = useMemo(
    () => (post ? getRelativeTime(post.createdAt) : null),
    [post]
  );

  const postTimeDisplay = useMemo(
    () =>
      postRelativeTime
        ? formatRelativeTime(postRelativeTime, (key, opts) =>
            t(key, opts as Record<string, string>)
          )
        : "",
    [postRelativeTime, t]
  );

  const renderedPostContent = useMemo(
    () => (post ? renderMarkdownContent(post.content) : ""),
    [post]
  );

  // Handlers
  const handlePostVote = useCallback(
    (vote: VoteType) => {
      if (!post) return;
      const newState = applyVote(postVoteState, vote);
      setPost({
        ...post,
        upvotes: newState.upvotes,
        downvotes: newState.downvotes,
        userVote: newState.userVote,
      });
      // TODO: API call
    },
    [post, postVoteState]
  );

  const handleReplyVote = useCallback((replyId: string, vote: VoteType) => {
    setReplies((prev) =>
      prev.map((reply) => {
        if (reply.id === replyId) {
          const currentState: VoteState = {
            upvotes: reply.upvotes,
            downvotes: reply.downvotes,
            userVote: reply.userVote,
            score: calculateVoteScore(reply.upvotes, reply.downvotes),
          };
          const newState = applyVote(currentState, vote);
          return {
            ...reply,
            upvotes: newState.upvotes,
            downvotes: newState.downvotes,
            userVote: newState.userVote,
          };
        }
        return reply;
      })
    );
    // TODO: API call
  }, []);

  const handleMainReply = useCallback(async (content: string) => {
    // TODO: API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    const newReply: ForumReply = {
      id: `reply-${Date.now()}`,
      content,
      authorId: MOCK_CURRENT_USER_ID,
      authorName: "You",
      authorAvatar: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      upvotes: 0,
      downvotes: 0,
      userVote: null,
      parentReplyId: null,
      isBestAnswer: false,
    };
    setReplies((prev) => [newReply, ...prev]);
    setShowMainReplyForm(false);
  }, []);

  const handleNestedReply = useCallback(
    async (parentReplyId: string, content: string) => {
      // TODO: API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      const newReply: ForumReply = {
        id: `reply-${Date.now()}`,
        content,
        authorId: MOCK_CURRENT_USER_ID,
        authorName: "You",
        authorAvatar: null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        upvotes: 0,
        downvotes: 0,
        userVote: null,
        parentReplyId,
        isBestAnswer: false,
      };
      setReplies((prev) => [...prev, newReply]);
    },
    []
  );

  const handleMarkBestAnswer = useCallback(
    (replyId: string) => {
      if (!post) return;
      // Update post's best answer
      setPost({ ...post, bestAnswerId: replyId });
      // Update replies
      setReplies((prev) =>
        prev.map((reply) => ({
          ...reply,
          isBestAnswer: reply.id === replyId,
        }))
      );
      // TODO: API call
    },
    [post]
  );

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 900, mx: "auto", px: 2, py: 3 }}>
        <Stack spacing={3}>
          <Skeleton variant="rectangular" height={40} width={200} />
          <Skeleton variant="rectangular" height={200} />
          <Skeleton variant="rectangular" height={100} />
          <Skeleton variant="rectangular" height={100} />
        </Stack>
      </Box>
    );
  }

  // Error state
  if (error || !post) {
    return (
      <Box sx={{ maxWidth: 900, mx: "auto", px: 2, py: 3 }}>
        <Alert severity="error">{error ?? t("forum.post.notFound")}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          {t("common.goBack")}
        </Button>
      </Box>
    );
  }

  const canEdit = canEditPost(post, MOCK_CURRENT_USER_ID);
  const canMarkBest = canMarkBestAnswer(post, MOCK_CURRENT_USER_ID);

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", px: 2, py: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={handleBack} aria-label={t("common.back")}>
          <ArrowBackIcon />
        </IconButton>
        <Chip
          label={post.categoryName}
          size="small"
          component={RouterLink}
          to={routeHelpers.forumCategory(post.categorySlug)}
          clickable
        />
      </Stack>

      {/* Post Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {/* Title */}
          <Typography
            variant="h5"
            component="h1"
            gutterBottom
            fontWeight="bold"
          >
            {post.title}
          </Typography>

          {/* Meta Row */}
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            flexWrap="wrap"
            sx={{ mb: 2 }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar
                sx={{ width: 32, height: 32 }}
                src={post.authorAvatar || ""}
              >
                {post.authorName[0]}
              </Avatar>
              <Typography variant="body2" fontWeight="medium">
                {post.authorName}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <ScheduleIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {postTimeDisplay}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <ViewIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {t("forum.views", { count: post.viewCount })}
              </Typography>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* Content */}
          <Box
            sx={{
              "& p": { my: 1 },
              "& strong": { fontWeight: 600 },
              "& code": {
                bgcolor: "action.hover",
                px: 0.5,
                borderRadius: 0.5,
                fontFamily: "monospace",
              },
              "& pre": {
                bgcolor: "action.hover",
                p: 2,
                borderRadius: 1,
                overflow: "auto",
              },
              "& blockquote": {
                borderLeft: 4,
                borderColor: "divider",
                pl: 2,
                ml: 0,
                color: "text.secondary",
                fontStyle: "italic",
              },
              "& a": { color: "primary.main" },
              "& ul, & ol": { pl: 3, my: 1 },
              "& li": { my: 0.5 },
            }}
            dangerouslySetInnerHTML={{ __html: renderedPostContent }}
          />

          <Divider sx={{ my: 2 }} />

          {/* Actions Row */}
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <VoteButtons state={postVoteState} onVote={handlePostVote} />
              <Button
                startIcon={<ReplyIcon />}
                onClick={() => setShowMainReplyForm(!showMainReplyForm)}
              >
                {t("forum.reply")}
              </Button>
            </Stack>
            {canEdit && (
              <Button
                startIcon={<EditIcon />}
                onClick={() => navigate(routeHelpers.forumEdit(post.id))}
              >
                {t("common.edit")}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Main Reply Form */}
      <Collapse in={showMainReplyForm}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            {t("forum.post.reply.writeReply")}
          </Typography>
          <ReplyForm
            onSubmit={handleMainReply}
            onCancel={() => setShowMainReplyForm(false)}
          />
        </Paper>
      </Collapse>

      {/* Best Answer (shown first if exists) */}
      {bestAnswer && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            {t("forum.post.bestAnswer")}
          </Typography>
          <ReplyItem
            reply={bestAnswer}
            depth={0}
            postAuthorId={post.authorId}
            currentUserId={MOCK_CURRENT_USER_ID}
            canMarkBest={false}
            onVote={handleReplyVote}
            onReply={handleNestedReply}
            onMarkBestAnswer={handleMarkBestAnswer}
          />
        </Box>
      )}

      {/* Replies Section */}
      <Box>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Typography variant="h6">
            {t("forum.replies", { count: replies.length })}
          </Typography>
          <Stack direction="row" spacing={1}>
            {(["best", "newest", "oldest"] as ReplySortOrder[]).map((order) => (
              <Chip
                key={order}
                label={t(`forum.post.sort.${order}`)}
                size="small"
                variant={sortOrder === order ? "filled" : "outlined"}
                onClick={() => setSortOrder(order)}
                clickable
              />
            ))}
          </Stack>
        </Stack>

        {/* Reply List */}
        {nestedReplies.length > 0 ? (
          <Stack spacing={1}>
            {nestedReplies
              .filter((r) => r.id !== post.bestAnswerId)
              .map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  depth={0}
                  postAuthorId={post.authorId}
                  currentUserId={MOCK_CURRENT_USER_ID}
                  canMarkBest={canMarkBest}
                  onVote={handleReplyVote}
                  onReply={handleNestedReply}
                  onMarkBestAnswer={handleMarkBestAnswer}
                />
              ))}
          </Stack>
        ) : (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              {t("forum.post.noReplies")}
            </Typography>
            <Button
              variant="contained"
              startIcon={<ReplyIcon />}
              onClick={() => setShowMainReplyForm(true)}
              sx={{ mt: 2 }}
            >
              {t("forum.post.beFirstToReply")}
            </Button>
          </Paper>
        )}
      </Box>
    </Box>
  );
}

export default ForumPostPage;
