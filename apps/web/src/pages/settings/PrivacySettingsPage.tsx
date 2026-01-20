/**
 * Privacy Settings Page
 *
 * Allows users to manage their privacy preferences including:
 * - Profile visibility
 * - Activity visibility
 * - Reading stats visibility
 * - Leaderboard participation
 * - Block list management
 *
 * Note: Backend integration needed to persist preferences and enforce privacy rules
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  FormGroup,
  Button,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import {
  Lock as LockIcon,
  Public as PublicIcon,
  Visibility as VisibilityIcon,
  Leaderboard as LeaderboardIcon,
  Block as BlockIcon,
  PersonOutline,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

// ============================================================================
// Types
// ============================================================================

type PrivacySettings = {
  profilePublic: boolean;
  showStats: boolean;
  showActivity: boolean;
  showReadingProgress: boolean;
  showInLeaderboard: boolean;
  allowFollowers: boolean;
  allowMessages: boolean;
};

type BlockedUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  blockedAt: string;
};

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SETTINGS: PrivacySettings = {
  profilePublic: true,
  showStats: true,
  showActivity: false,
  showReadingProgress: true,
  showInLeaderboard: true,
  allowFollowers: true,
  allowMessages: true,
};

// ============================================================================
// Main Component
// ============================================================================

export function PrivacySettingsPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // State
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockUsername, setBlockUsername] = useState("");
  const [blockError, setBlockError] = useState<string | null>(null);

  // Handlers
  const handleToggle = (field: keyof PrivacySettings) => {
    setSettings((prev) => {
      const newSettings = {
        ...prev,
        [field]: !prev[field],
      };

      // If profile is made private, disable dependent settings
      if (field === 'profilePublic' && !newSettings.profilePublic) {
        newSettings.showStats = false;
        newSettings.showActivity = false;
        newSettings.showReadingProgress = false;
      }

      return newSettings;
    });
    setSaveSuccess(false);
  };

  const handleBlockUser = async () => {
    if (!blockUsername.trim()) {
      setBlockError(t("settings.enterUsername"));
      return;
    }

    try {
      // TODO: Call API to block user
      // This would be a POST request to /api/users/me/block

      // Simulate adding blocked user
      const newBlockedUser: BlockedUser = {
        id: `blocked-${Date.now()}`,
        username: blockUsername.trim(),
        displayName: null,
        avatarUrl: null,
        blockedAt: new Date().toISOString(),
      };

      setBlockedUsers((prev) => [...prev, newBlockedUser]);
      setShowBlockDialog(false);
      setBlockUsername("");
      setBlockError(null);
    } catch (_error) {
      setBlockError(t("settings.blockUserFailed"));
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      // TODO: Call API to unblock user
      // This would be a DELETE request to /api/users/me/block/:userId

      setBlockedUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (_error) {
      setSaveError(t("settings.unblockUserFailed"));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // TODO: Save settings to backend API
      // This would be a PUT request to /api/users/me/privacy-settings

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSaveSuccess(true);

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : t("settings.saveFailed")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigate("/settings");
  };

  return (
    <Box maxWidth={800} mx="auto">
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <LockIcon fontSize="large" color="primary" />
        <Box>
          <Typography variant="h4" component="h1">
            {t("settings.privacySettings")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("settings.managePrivacy")}
          </Typography>
        </Box>
      </Stack>

      {/* Success Message */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {t("settings.preferencesSaved")}
        </Alert>
      )}

      {/* Error Message */}
      {saveError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}

      {/* Profile Visibility */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} mb={2}>
            {settings.profilePublic ? (
              <PublicIcon color="primary" />
            ) : (
              <LockIcon color="primary" />
            )}
            <Typography variant="h6">
              {t("settings.profileVisibility")}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t("settings.profileVisibilityDesc")}
          </Typography>

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.profilePublic}
                  onChange={() => handleToggle('profilePublic')}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    {t("settings.publicProfile")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {settings.profilePublic
                      ? t("settings.profilePublicDesc")
                      : t("settings.profilePrivateDesc")}
                  </Typography>
                </Box>
              }
            />

            <Divider sx={{ my: 2 }} />

            {/* Dependent settings */}
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showStats}
                    onChange={() => handleToggle('showStats')}
                    disabled={!settings.profilePublic}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <VisibilityIcon fontSize="small" />
                    <Typography variant="body2">
                      {t("settings.showReadingStats")}
                    </Typography>
                  </Stack>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showActivity}
                    onChange={() => handleToggle('showActivity')}
                    disabled={!settings.profilePublic}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <VisibilityIcon fontSize="small" />
                    <Typography variant="body2">
                      {t("settings.showActivityFeed")}
                    </Typography>
                  </Stack>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showReadingProgress}
                    onChange={() => handleToggle('showReadingProgress')}
                    disabled={!settings.profilePublic}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <VisibilityIcon fontSize="small" />
                    <Typography variant="body2">
                      {t("settings.showReadingProgress")}
                    </Typography>
                  </Stack>
                }
              />
            </Stack>
          </FormGroup>
        </CardContent>
      </Card>

      {/* Social Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} mb={2}>
            <PublicIcon color="primary" />
            <Typography variant="h6">
              {t("settings.socialSettings")}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t("settings.socialSettingsDesc")}
          </Typography>

          <FormGroup>
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showInLeaderboard}
                    onChange={() => handleToggle('showInLeaderboard')}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <LeaderboardIcon fontSize="small" />
                    <Box>
                      <Typography variant="body2">
                        {t("settings.showInLeaderboard")}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t("settings.showInLeaderboardDesc")}
                      </Typography>
                    </Box>
                  </Stack>
                }
              />

              <Divider sx={{ my: 1 }} />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.allowFollowers}
                    onChange={() => handleToggle('allowFollowers')}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">
                      {t("settings.allowFollowers")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("settings.allowFollowersDesc")}
                    </Typography>
                  </Box>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.allowMessages}
                    onChange={() => handleToggle('allowMessages')}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">
                      {t("settings.allowMessages")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("settings.allowMessagesDesc")}
                    </Typography>
                  </Box>
                }
              />
            </Stack>
          </FormGroup>
        </CardContent>
      </Card>

      {/* Blocked Users */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <BlockIcon color="primary" />
              <Typography variant="h6">
                {t("settings.blockedUsers")}
              </Typography>
            </Stack>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setShowBlockDialog(true)}
            >
              {t("settings.blockUser")}
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t("settings.blockedUsersDesc")}
          </Typography>

          {blockedUsers.length === 0 ? (
            <Alert severity="info">
              {t("settings.noBlockedUsers")}
            </Alert>
          ) : (
            <List>
              {blockedUsers.map((user) => (
                <ListItem
                  key={user.id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label={t("settings.unblock")}
                      onClick={() => handleUnblockUser(user.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemAvatar>
                    <Avatar {...(user.avatarUrl ? { src: user.avatarUrl } : {})}>
                      <PersonOutline />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.displayName || user.username}
                    secondary={`@${user.username}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Stack direction={isMobile ? "column" : "row"} spacing={2} mb={4}>
        <Button
          variant="contained"
          size="large"
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={isSaving}
          fullWidth={isMobile}
        >
          {isSaving ? t("common.saving") : t("common.saveChanges")}
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={handleBack}
          disabled={isSaving}
          fullWidth={isMobile}
        >
          {t("common.back")}
        </Button>
      </Stack>

      {/* Info Box */}
      <Alert severity="info">
        <Typography variant="body2">
          <strong>{t("common.note")}:</strong> {t("settings.privacyNote")}
        </Typography>
      </Alert>

      {/* Block User Dialog */}
      <Dialog
        open={showBlockDialog}
        onClose={() => {
          setShowBlockDialog(false);
          setBlockUsername("");
          setBlockError(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("settings.blockUser")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t("settings.blockUserDesc")}
          </Typography>
          <TextField
            fullWidth
            label={t("settings.username")}
            value={blockUsername}
            onChange={(e) => setBlockUsername(e.target.value)}
            placeholder="username"
            error={!!blockError}
            helperText={blockError}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowBlockDialog(false);
              setBlockUsername("");
              setBlockError(null);
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleBlockUser}
            disabled={!blockUsername.trim()}
          >
            {t("settings.blockUser")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PrivacySettingsPage;
