/**
 * Reading Group Detail Page
 *
 * Displays full details of a reading group including:
 * - Group information (name, description, stats)
 * - Current book being read
 * - Member list
 * - Discussions preview
 * - Join/leave actions
 * - Edit/manage options for owners
 */

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardMedia,
  Avatar,
  Stack,
  Chip,
  Button,
  Grid,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  GroupOutlined,
  PeopleOutline,
  BookOutlined,
  EditOutlined,
  ExitToAppOutlined,
  PersonAddOutlined,
  LockOutlined,
  PublicOutlined,
  ShareOutlined,
  DeleteOutlined,
  ChatBubbleOutline,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";

// ============================================================================
// Types
// ============================================================================

type GroupUserInfo = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type GroupBookInfo = {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
};

type GroupDetailResponse = {
  id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  isPublic: boolean;
  maxMembers: number | null;
  inviteCode: string | null;
  membersCount: number;
  discussionsCount: number;
  owner: GroupUserInfo;
  currentBook: GroupBookInfo | null;
  isMember: boolean;
  memberRole: string | null;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

// ============================================================================
// Main Component
// ============================================================================

export function GroupDetailPage(): React.ReactElement {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { userId: clerkUserId } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch group data
  const {
    data: group,
    isLoading,
    error,
    refetch,
  } = useQuery<GroupDetailResponse, Error>({
    queryKey: ["readingGroup", groupId],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch group details");
      }

      return response.json();
    },
    enabled: !!groupId && !!clerkUserId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Join/leave mutation
  const joinLeaveMutation = useMutation({
    mutationFn: async (action: "join" | "leave") => {
      const response = await fetch(`/api/groups/${groupId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${action} group`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["readingGroup", groupId] });
      queryClient.invalidateQueries({ queryKey: ["readingGroups"] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete group");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["readingGroups"] });
      navigate("/groups");
    },
  });

  // Handlers
  const handleJoinLeave = async () => {
    if (!group) return;
    await joinLeaveMutation.mutateAsync(group.isMember ? "leave" : "join");
  };

  const handleEdit = () => {
    navigate(`/groups/${groupId}/edit`);
  };

  const handleShare = () => {
    if (!group) return;
    
    const url = `${window.location.origin}/groups/${groupId}`;
    
    if (navigator.share) {
      const shareData: ShareData = {
        title: group.name,
        url: url,
      };
      if (group.description) {
        shareData.text = group.description;
      }
      navigator.share(shareData).catch(() => {
        // User cancelled share or error occurred
      });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert("Link copied to clipboard!");
      });
    }
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync();
    setShowDeleteDialog(false);
  };

  const handleBookClick = () => {
    if (group?.currentBook) {
      navigate(`/books/${group.currentBook.id}`);
    }
  };

  const handleDiscussionsClick = () => {
    navigate(`/groups/${groupId}/discussions`);
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
          {t("groups.error")}
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

  // Not found
  if (!group) {
    return (
      <Box>
        <Alert severity="info">
          {t("groups.notFound")}
        </Alert>
        <Button variant="outlined" onClick={() => navigate("/groups")} sx={{ mt: 2 }}>
          {t("groups.backToGroups")}
        </Button>
      </Box>
    );
  }

  const isOwner = group.owner.id === clerkUserId;
  const isFull = group.maxMembers !== null && group.membersCount >= group.maxMembers;

  return (
    <Box>
      {/* Header Card */}
      <Card sx={{ mb: 3 }}>
        {group.coverImage && (
          <CardMedia
            component="img"
            height="200"
            image={group.coverImage}
            alt={group.name}
          />
        )}
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="flex-start" mb={2}>
            <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 64, height: 64 }}>
              <GroupOutlined sx={{ fontSize: 32 }} />
            </Avatar>
            <Box flex={1}>
              <Typography variant="h4" component="h1" gutterBottom>
                {group.name}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
                <Chip
                  icon={group.isPublic ? <PublicOutlined /> : <LockOutlined />}
                  label={group.isPublic ? t("common.public") : t("common.private")}
                  size="small"
                  color={group.isPublic ? "success" : "default"}
                />
                {group.isMember && (
                  <Chip label={t("groups.member")} size="small" color="primary" />
                )}
                {isOwner && (
                  <Chip label={t("groups.owner")} size="small" color="secondary" />
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {t("common.created")} {formatRelativeTime(new Date(group.createdAt))}
              </Typography>
            </Box>
          </Stack>

          {group.description && (
            <Typography variant="body1" color="text.secondary" paragraph>
              {group.description}
            </Typography>
          )}

          {/* Stats */}
          <Grid container spacing={2} mb={2}>
            <Grid item xs={4}>
              <Stack alignItems="center">
                <PeopleOutline fontSize="large" color="primary" />
                <Typography variant="h6">{group.membersCount}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("groups.members")}
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={4}>
              <Stack alignItems="center">
                <ChatBubbleOutline fontSize="large" color="primary" />
                <Typography variant="h6">{group.discussionsCount}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("groups.discussions")}
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={4}>
              <Stack alignItems="center">
                <BookOutlined fontSize="large" color="primary" />
                <Typography variant="h6">{group.currentBook ? "1" : "0"}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("groups.currentBook")}
                </Typography>
              </Stack>
            </Grid>
          </Grid>

          {/* Actions */}
          <Stack direction={isMobile ? "column" : "row"} spacing={2}>
            {!isOwner && (
              <Button
                variant={group.isMember ? "outlined" : "contained"}
                startIcon={group.isMember ? <ExitToAppOutlined /> : <PersonAddOutlined />}
                onClick={handleJoinLeave}
                disabled={joinLeaveMutation.isPending || (!group.isMember && isFull)}
                fullWidth={isMobile}
              >
                {group.isMember
                  ? t("groups.leave")
                  : isFull
                    ? t("groups.full")
                    : t("groups.join")}
              </Button>
            )}
            {isOwner && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<EditOutlined />}
                  onClick={handleEdit}
                  fullWidth={isMobile}
                >
                  {t("common.edit")}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlined />}
                  onClick={() => setShowDeleteDialog(true)}
                  fullWidth={isMobile}
                >
                  {t("common.delete")}
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              startIcon={<ShareOutlined />}
              onClick={handleShare}
              fullWidth={isMobile}
            >
              {t("common.share")}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Current Book */}
      {group.currentBook && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("groups.currentlyReading")}
            </Typography>
            <Stack
              direction="row"
              spacing={2}
              onClick={handleBookClick}
              sx={{ cursor: "pointer", "&:hover": { opacity: 0.8 } }}
            >
              {group.currentBook.coverImage && (
                <Box
                  component="img"
                  src={group.currentBook.coverImage}
                  alt={group.currentBook.title}
                  sx={{
                    width: 80,
                    height: 120,
                    objectFit: "cover",
                    borderRadius: 1,
                  }}
                />
              )}
              <Box>
                <Typography variant="h6">{group.currentBook.title}</Typography>
                {group.currentBook.author && (
                  <Typography variant="body2" color="text.secondary">
                    {t("common.by")} {group.currentBook.author}
                  </Typography>
                )}
                <Button
                  variant="text"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBookClick();
                  }}
                  sx={{ mt: 1 }}
                >
                  {t("books.viewBook")}
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Owner Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t("groups.organizer")}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              {...(group.owner.avatarUrl ? { src: group.owner.avatarUrl } : {})}
              sx={{ width: 48, height: 48 }}
            />
            <Box>
              <Typography variant="subtitle1">
                {group.owner.displayName || group.owner.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                @{group.owner.username}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Discussions Preview */}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              {t("groups.discussions")}
            </Typography>
            <Button
              variant="text"
              endIcon={<ChatBubbleOutline />}
              onClick={handleDiscussionsClick}
            >
              {t("groups.viewAll")}
            </Button>
          </Stack>
          {group.discussionsCount === 0 ? (
            <Alert severity="info">
              {t("groups.noDiscussions")}
            </Alert>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t("groups.discussionCount", { count: group.discussionsCount })}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>{t("groups.deleteGroup")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("groups.deleteConfirmation", { name: group.name })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? t("common.deleting") : t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default GroupDetailPage;
