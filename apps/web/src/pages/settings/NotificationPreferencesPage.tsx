/**
 * Notification Preferences Page
 *
 * Allows users to manage their notification preferences including:
 * - Email notifications
 * - Push notifications (PWA)
 * - Different notification categories (achievements, social, reading, etc.)
 *
 * Note: Backend integration needed to persist preferences
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
  Chip,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  Smartphone as SmartphoneIcon,
  EmojiEvents as AchievementsIcon,
  People as PeopleIcon,
  MenuBook as ReadingIcon,
  Group as GroupIcon,
  Forum as ForumIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

// ============================================================================
// Types
// ============================================================================

type NotificationPreferences = {
  // Email notifications
  emailEnabled: boolean;
  emailAchievements: boolean;
  emailSocial: boolean;
  emailReadingReminders: boolean;
  emailGroups: boolean;
  emailForum: boolean;
  emailWeeklySummary: boolean;
  
  // Push notifications
  pushEnabled: boolean;
  pushAchievements: boolean;
  pushSocial: boolean;
  pushReadingReminders: boolean;
  pushGroups: boolean;
  pushForum: boolean;
};

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailEnabled: true,
  emailAchievements: true,
  emailSocial: true,
  emailReadingReminders: true,
  emailGroups: true,
  emailForum: true,
  emailWeeklySummary: true,
  
  pushEnabled: false,
  pushAchievements: false,
  pushSocial: false,
  pushReadingReminders: false,
  pushGroups: false,
  pushForum: false,
};

// ============================================================================
// Main Component
// ============================================================================

export function NotificationPreferencesPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // State
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pushSupported, setPushSupported] = useState(false);

  // Check if push notifications are supported
  React.useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setPushSupported(supported);
  }, []);

  // Handlers
  const handleToggle = (field: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
    setSaveSuccess(false);
  };

  const handleEmailMasterToggle = (checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      emailEnabled: checked,
      emailAchievements: checked ? prev.emailAchievements : false,
      emailSocial: checked ? prev.emailSocial : false,
      emailReadingReminders: checked ? prev.emailReadingReminders : false,
      emailGroups: checked ? prev.emailGroups : false,
      emailForum: checked ? prev.emailForum : false,
      emailWeeklySummary: checked ? prev.emailWeeklySummary : false,
    }));
    setSaveSuccess(false);
  };

  const handlePushMasterToggle = async (checked: boolean) => {
    if (checked && pushSupported) {
      // Request permission for push notifications
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setPreferences((prev) => ({
            ...prev,
            pushEnabled: true,
          }));
        } else {
          setSaveError('Push notifications permission denied. Please enable in your browser settings.');
          return;
        }
      } catch (_error) {
        setSaveError('Failed to request push notification permission.');
        return;
      }
    } else {
      setPreferences((prev) => ({
        ...prev,
        pushEnabled: checked,
        pushAchievements: checked ? prev.pushAchievements : false,
        pushSocial: checked ? prev.pushSocial : false,
        pushReadingReminders: checked ? prev.pushReadingReminders : false,
        pushGroups: checked ? prev.pushGroups : false,
        pushForum: checked ? prev.pushForum : false,
      }));
    }
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // TODO: Save preferences to backend API
      // This would be a PUT request to /api/users/me/notification-preferences
      
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
          : "Failed to save notification preferences. Please try again."
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
        <NotificationsIcon fontSize="large" color="primary" />
        <Box>
          <Typography variant="h4" component="h1">
            {t("settings.notificationPreferences")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("settings.manageNotifications")}
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

      {/* Email Notifications */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} mb={2}>
            <EmailIcon color="primary" />
            <Typography variant="h6">
              {t("settings.emailNotifications")}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t("settings.emailNotificationsDesc")}
          </Typography>

          <FormGroup>
            {/* Master toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.emailEnabled}
                  onChange={(e) => handleEmailMasterToggle(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    {t("settings.enableEmailNotifications")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t("settings.masterToggle")}
                  </Typography>
                </Box>
              }
            />

            <Divider sx={{ my: 2 }} />

            {/* Individual toggles */}
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.emailAchievements}
                    onChange={() => handleToggle('emailAchievements')}
                    disabled={!preferences.emailEnabled}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <AchievementsIcon fontSize="small" />
                    <Typography variant="body2">
                      {t("settings.achievementUnlocks")}
                    </Typography>
                  </Stack>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.emailSocial}
                    onChange={() => handleToggle('emailSocial')}
                    disabled={!preferences.emailEnabled}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <PeopleIcon fontSize="small" />
                    <Typography variant="body2">
                      {t("settings.socialInteractions")}
                    </Typography>
                  </Stack>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.emailReadingReminders}
                    onChange={() => handleToggle('emailReadingReminders')}
                    disabled={!preferences.emailEnabled}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <ReadingIcon fontSize="small" />
                    <Typography variant="body2">
                      {t("settings.readingReminders")}
                    </Typography>
                  </Stack>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.emailGroups}
                    onChange={() => handleToggle('emailGroups')}
                    disabled={!preferences.emailEnabled}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <GroupIcon fontSize="small" />
                    <Typography variant="body2">
                      {t("settings.groupActivity")}
                    </Typography>
                  </Stack>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.emailForum}
                    onChange={() => handleToggle('emailForum')}
                    disabled={!preferences.emailEnabled}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <ForumIcon fontSize="small" />
                    <Typography variant="body2">
                      {t("settings.forumReplies")}
                    </Typography>
                  </Stack>
                }
              />

              <Divider sx={{ my: 1 }} />

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.emailWeeklySummary}
                    onChange={() => handleToggle('emailWeeklySummary')}
                    disabled={!preferences.emailEnabled}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">
                      {t("settings.weeklySummary")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("settings.weeklySummaryDesc")}
                    </Typography>
                  </Box>
                }
              />
            </Stack>
          </FormGroup>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} mb={2}>
            <SmartphoneIcon color="primary" />
            <Typography variant="h6">
              {t("settings.pushNotifications")}
            </Typography>
            {pushSupported && (
              <Chip label="PWA" size="small" color="success" />
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {pushSupported
              ? t("settings.pushNotificationsDesc")
              : t("settings.pushNotSupported")}
          </Typography>

          {!pushSupported && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t("settings.pushNotSupportedInfo")}
            </Alert>
          )}

          <FormGroup>
            {/* Master toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.pushEnabled}
                  onChange={(e) => handlePushMasterToggle(e.target.checked)}
                  disabled={!pushSupported}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    {t("settings.enablePushNotifications")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t("settings.masterToggle")}
                  </Typography>
                </Box>
              }
            />

            <Divider sx={{ my: 2 }} />

            {/* Individual toggles */}
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.pushAchievements}
                    onChange={() => handleToggle('pushAchievements')}
                    disabled={!preferences.pushEnabled || !pushSupported}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <AchievementsIcon fontSize="small" />
                    <Typography variant="body2">
                      {t("settings.achievementUnlocks")}
                    </Typography>
                  </Stack>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.pushSocial}
                    onChange={() => handleToggle('pushSocial')}
                    disabled={!preferences.pushEnabled || !pushSupported}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <PeopleIcon fontSize="small" />
                    <Typography variant="body2">
                      {t("settings.socialInteractions")}
                    </Typography>
                  </Stack>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.pushReadingReminders}
                    onChange={() => handleToggle('pushReadingReminders')}
                    disabled={!preferences.pushEnabled || !pushSupported}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <ReadingIcon fontSize="small" />
                    <Typography variant="body2">
                      {t("settings.readingReminders")}
                    </Typography>
                  </Stack>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.pushGroups}
                    onChange={() => handleToggle('pushGroups')}
                    disabled={!preferences.pushEnabled || !pushSupported}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <GroupIcon fontSize="small" />
                    <Typography variant="body2">
                      {t("settings.groupActivity")}
                    </Typography>
                  </Stack>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.pushForum}
                    onChange={() => handleToggle('pushForum')}
                    disabled={!preferences.pushEnabled || !pushSupported}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <ForumIcon fontSize="small" />
                    <Typography variant="body2">
                      {t("settings.forumReplies")}
                    </Typography>
                  </Stack>
                }
              />
            </Stack>
          </FormGroup>
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
          <strong>{t("common.note")}:</strong> {t("settings.notificationNote")}
        </Typography>
      </Alert>
    </Box>
  );
}

export default NotificationPreferencesPage;
