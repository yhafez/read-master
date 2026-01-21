/**
 * Invite to Group Dialog Component
 *
 * Allows group owners/admins to invite users via:
 * - Search by username or email
 * - Select from followers
 * - Send invitation
 * - Copy invite link
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Box,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Close as CloseIcon,
  Person as PersonIcon,
  ContentCopy as CopyIcon,
  Send as SendIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

export interface InviteToGroupDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Group ID to invite to */
  groupId: string;
  /** Group name for display */
  groupName: string;
}

type SearchResult = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  isFollowing: boolean;
};

export function InviteToGroupDialog({
  open,
  onClose,
  groupId,
  groupName,
}: InviteToGroupDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showCopied, setShowCopied] = useState(false);
  const [showSent, setShowSent] = useState(false);

  // Generate invite link
  const inviteLink = `${window.location.origin}/groups/${groupId}/join?invite=true`;

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // TODO: Call actual search API
      // const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      // const data = await response.json();
      // setSearchResults(data.results);

      // Mock data for now
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSearchResults([
        {
          id: "1",
          username: "johndoe",
          displayName: "John Doe",
          avatar: null,
          isFollowing: true,
        },
        {
          id: "2",
          username: "janedoe",
          displayName: "Jane Doe",
          avatar: null,
          isFollowing: false,
        },
      ]);
    } catch (_error) {
      // Error searching users
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSendInvites = async () => {
    if (selectedUsers.length === 0) return;

    try {
      // TODO: Call actual invite API
      // await Promise.all(
      //   selectedUsers.map((userId) =>
      //     fetch(`/api/groups/${groupId}/invite`, {
      //       method: "POST",
      //       headers: { "Content-Type": "application/json" },
      //       body: JSON.stringify({ userId }),
      //     })
      //   )
      // );

      // Mock success
      await new Promise((resolve) => setTimeout(resolve, 500));
      setShowSent(true);
      setSelectedUsers([]);
      setSearchResults([]);
      setSearchQuery("");
    } catch (_error) {
      // Error sending invites
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setShowCopied(true);
    } catch (_error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setShowCopied(true);
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUsers([]);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">
              {t("groups.invite.title")}
            </Typography>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3}>
            {/* Group Info */}
            <Box>
              <Typography variant="body2" color="text.secondary">
                {t("groups.invite.invitingTo")}
              </Typography>
              <Typography variant="subtitle1" fontWeight="bold">
                {groupName}
              </Typography>
            </Box>

            {/* Search Users */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t("groups.invite.searchLabel")}
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  placeholder={t("groups.invite.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  size="small"
                />
                <Button
                  variant="contained"
                  startIcon={isSearching ? <CircularProgress size={16} /> : <SearchIcon />}
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                >
                  {t("common.search")}
                </Button>
              </Stack>
            </Box>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {t("groups.invite.results")}
                </Typography>
                <List>
                  {searchResults.map((user) => {
                    const isSelected = selectedUsers.includes(user.id);
                    return (
                      <ListItem
                        key={user.id}
                        onClick={() => handleToggleUser(user.id)}
                        sx={{
                          cursor: "pointer",
                          bgcolor: isSelected ? "action.selected" : undefined,
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar src={user.avatar || ""}>
                            {!user.avatar && <PersonIcon />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={user.displayName}
                          secondary={`@${user.username}`}
                        />
                        {user.isFollowing && (
                          <Chip label={t("groups.invite.following")} size="small" />
                        )}
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            )}

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {t("groups.invite.selected", { count: selectedUsers.length })}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {selectedUsers.map((userId) => {
                    const user = searchResults.find((u) => u.id === userId);
                    return (
                      <Chip
                        key={userId}
                        label={user?.displayName || userId}
                        onDelete={() => handleToggleUser(userId)}
                        size="small"
                      />
                    );
                  })}
                </Stack>
              </Box>
            )}

            {/* Invite Link */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t("groups.invite.linkLabel")}
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  value={inviteLink}
                  InputProps={{
                    readOnly: true,
                  }}
                  size="small"
                />
                <Button
                  variant="outlined"
                  startIcon={<CopyIcon />}
                  onClick={handleCopyLink}
                >
                  {t("common.copy")}
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                {t("groups.invite.linkHint")}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSendInvites}
            disabled={selectedUsers.length === 0}
          >
            {t("groups.invite.send", { count: selectedUsers.length })}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbars */}
      <Snackbar
        open={showCopied}
        autoHideDuration={3000}
        onClose={() => setShowCopied(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setShowCopied(false)}>
          {t("groups.invite.copied")}
        </Alert>
      </Snackbar>

      <Snackbar
        open={showSent}
        autoHideDuration={3000}
        onClose={() => setShowSent(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setShowSent(false)}>
          {t("groups.invite.sent", { count: selectedUsers.length })}
        </Alert>
      </Snackbar>
    </>
  );
}

export default InviteToGroupDialog;
