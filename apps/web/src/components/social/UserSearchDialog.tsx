/**
 * User Search Dialog
 *
 * Search for users to view their profiles or follow them
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Avatar,
  CircularProgress,
  Typography,
  Box,
  Chip,
  Button,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUserSearch } from "@/hooks/useUserSearch";
import { useFollowUser } from "@/hooks/useUsers";
import { useDebounce } from "@/hooks/useDebounce";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface UserSearchDialogProps {
  open: boolean;
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function UserSearchDialog({
  open,
  onClose,
}: UserSearchDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  // Search query
  const { data, isLoading, isError } = useUserSearch(
    { q: debouncedQuery, limit: 20 },
    { enabled: open && debouncedQuery.length >= 2 }
  );

  // Follow/unfollow mutation
  const followMutation = useFollowUser();

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleUserClick = (userId: string) => {
    logger.info("Navigating to user profile", { userId });
    navigate(`/social/profile/${userId}`);
    onClose();
  };

  const handleFollowToggle = async (
    event: React.MouseEvent,
    userId: string,
    isCurrentlyFollowing: boolean
  ) => {
    event.stopPropagation(); // Prevent navigation to profile

    try {
      await followMutation.mutateAsync({
        userId,
        action: isCurrentlyFollowing ? "unfollow" : "follow",
      });
    } catch (error) {
      logger.error("Failed to toggle follow", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderSearchResults = () => {
    if (isLoading) {
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (isError) {
      return (
        <Box p={2}>
          <Typography color="error" align="center">
            {t("social.search.error", "Failed to search users")}
          </Typography>
        </Box>
      );
    }

    if (debouncedQuery.length < 2) {
      return (
        <Box p={2}>
          <Typography color="text.secondary" align="center">
            {t(
              "social.search.minChars",
              "Enter at least 2 characters to search"
            )}
          </Typography>
        </Box>
      );
    }

    if (!data || data.users.length === 0) {
      return (
        <Box p={2}>
          <Typography color="text.secondary" align="center">
            {t("social.search.noResults", "No users found")}
          </Typography>
        </Box>
      );
    }

    return (
      <List sx={{ maxHeight: 400, overflow: "auto" }}>
        {data.users.map((user) => (
          <ListItem
            key={user.id}
            disablePadding
            secondaryAction={
              <Button
                size="small"
                variant={user.isFollowing ? "outlined" : "contained"}
                onClick={(e) =>
                  handleFollowToggle(e, user.id, user.isFollowing)
                }
                disabled={followMutation.isPending}
              >
                {user.isFollowing
                  ? t("social.following", "Following")
                  : t("social.follow", "Follow")}
              </Button>
            }
          >
            <ListItemButton onClick={() => handleUserClick(user.id)}>
              <ListItemAvatar>
                {user.avatar ? (
                  <Avatar src={user.avatar} />
                ) : (
                  <Avatar>
                    <PersonIcon />
                  </Avatar>
                )}
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography>{user.displayName || user.username}</Typography>
                    {user.tier !== "FREE" && (
                      <Chip
                        label={user.tier}
                        size="small"
                        color={
                          user.tier === "SCHOLAR" ? "secondary" : "primary"
                        }
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      @{user.username}
                    </Typography>
                    {user.bio && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {user.bio}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {user.followersCount} {t("social.followers", "followers")}{" "}
                      • {user.followingCount}{" "}
                      {t("social.following", "following")}
                    </Typography>
                  </Box>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("social.search.title", "Search Users")}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          placeholder={t(
            "social.search.placeholder",
            "Search by username or name..."
          )}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {renderSearchResults()}

        {data && data.hasMore && (
          <Box p={2} textAlign="center">
            <Typography variant="caption" color="text.secondary">
              {t(
                "social.search.moreResults",
                "Showing {{count}} of {{total}} results",
                {
                  count: data.users.length,
                  total: data.total,
                }
              )}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default UserSearchDialog;
