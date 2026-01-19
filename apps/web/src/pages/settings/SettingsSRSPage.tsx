/**
 * SRS Settings page
 *
 * Allows users to configure spaced repetition system preferences including:
 * - Daily review and new card limits
 * - Notification settings and reminder times
 * - Review session preferences (card order, rating style, auto-play)
 */

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Snackbar,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

import {
  useSRSSettingsStore,
  reminderTimes,
  cardOrderOptions,
  ratingStyleOptions,
  DAILY_REVIEW_LIMIT_RANGE,
  DAILY_NEW_CARD_LIMIT_RANGE,
  AUTO_ADVANCE_DELAY_RANGE,
  formatReminderTime,
} from "@/stores";
import type { ReminderTime, CardOrder, RatingStyle } from "@/stores";

/**
 * Toggle item component for consistent styling
 */
interface ToggleItemProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
}

function ToggleItem({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: ToggleItemProps): React.ReactElement {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.checked);
    },
    [onChange]
  );

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        py: 1.5,
      }}
    >
      <Box sx={{ pr: 2 }}>
        <Typography variant="body1" fontWeight="medium">
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
      <Switch
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        inputProps={{ "aria-label": label }}
      />
    </Box>
  );
}

/**
 * SRS Settings page component
 */
export function SettingsSRSPage(): React.ReactElement {
  const { t } = useTranslation();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Store state and actions
  const {
    limits,
    notifications,
    reviewPreferences,
    setDailyReviewLimit,
    setDailyNewCardLimit,
    setNotificationsEnabled,
    setPushEnabled,
    setEmailEnabled,
    setReminderTime,
    setOnlyWhenDue,
    setCardOrder,
    setRatingStyle,
    setAutoPlayAudio,
    setShowProgress,
    setEnableUndo,
    setAutoAdvance,
    setAutoAdvanceDelay,
    resetSettings,
  } = useSRSSettingsStore();

  // Handlers for limits
  const handleDailyReviewLimitChange = useCallback(
    (_event: Event, value: number | number[]) => {
      setDailyReviewLimit(value as number);
      setSnackbarOpen(true);
    },
    [setDailyReviewLimit]
  );

  const handleDailyNewCardLimitChange = useCallback(
    (_event: Event, value: number | number[]) => {
      setDailyNewCardLimit(value as number);
      setSnackbarOpen(true);
    },
    [setDailyNewCardLimit]
  );

  // Handlers for notifications
  const handleNotificationsToggle = useCallback(
    (enabled: boolean) => {
      setNotificationsEnabled(enabled);
      setSnackbarOpen(true);
    },
    [setNotificationsEnabled]
  );

  const handlePushToggle = useCallback(
    (enabled: boolean) => {
      setPushEnabled(enabled);
      setSnackbarOpen(true);
    },
    [setPushEnabled]
  );

  const handleEmailToggle = useCallback(
    (enabled: boolean) => {
      setEmailEnabled(enabled);
      setSnackbarOpen(true);
    },
    [setEmailEnabled]
  );

  const handleReminderTimeChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      setReminderTime(event.target.value as ReminderTime);
      setSnackbarOpen(true);
    },
    [setReminderTime]
  );

  const handleOnlyWhenDueToggle = useCallback(
    (enabled: boolean) => {
      setOnlyWhenDue(enabled);
      setSnackbarOpen(true);
    },
    [setOnlyWhenDue]
  );

  // Handlers for review preferences
  const handleCardOrderChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      setCardOrder(event.target.value as CardOrder);
      setSnackbarOpen(true);
    },
    [setCardOrder]
  );

  const handleRatingStyleChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      setRatingStyle(event.target.value as RatingStyle);
      setSnackbarOpen(true);
    },
    [setRatingStyle]
  );

  const handleAutoPlayToggle = useCallback(
    (enabled: boolean) => {
      setAutoPlayAudio(enabled);
      setSnackbarOpen(true);
    },
    [setAutoPlayAudio]
  );

  const handleShowProgressToggle = useCallback(
    (enabled: boolean) => {
      setShowProgress(enabled);
      setSnackbarOpen(true);
    },
    [setShowProgress]
  );

  const handleEnableUndoToggle = useCallback(
    (enabled: boolean) => {
      setEnableUndo(enabled);
      setSnackbarOpen(true);
    },
    [setEnableUndo]
  );

  const handleAutoAdvanceToggle = useCallback(
    (enabled: boolean) => {
      setAutoAdvance(enabled);
      setSnackbarOpen(true);
    },
    [setAutoAdvance]
  );

  const handleAutoAdvanceDelayChange = useCallback(
    (_event: Event, value: number | number[]) => {
      setAutoAdvanceDelay(value as number);
      setSnackbarOpen(true);
    },
    [setAutoAdvanceDelay]
  );

  // Reset handlers
  const handleResetClick = useCallback(() => {
    setResetDialogOpen(true);
  }, []);

  const handleResetConfirm = useCallback(() => {
    resetSettings();
    setResetDialogOpen(false);
    setSnackbarOpen(true);
  }, [resetSettings]);

  const handleResetCancel = useCallback(() => {
    setResetDialogOpen(false);
  }, []);

  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  // Format limit value for display
  const formatLimitValue = (value: number, isUnlimited: boolean): string => {
    if (value === 0 && isUnlimited) {
      return t("settings.srs.limits.unlimited");
    }
    return value.toString();
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("settings.srs.title")}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t("settings.srs.description")}
      </Typography>

      <Stack spacing={3}>
        {/* Daily Limits */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.srs.limits.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t("settings.srs.limits.description")}
            </Typography>

            <Stack spacing={4}>
              {/* Daily Review Limit */}
              <Box>
                <Typography variant="body1" fontWeight="medium" gutterBottom>
                  {t("settings.srs.limits.dailyReviewLimit")}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {t("settings.srs.limits.dailyReviewLimitDescription")}
                </Typography>
                <Box sx={{ px: 2 }}>
                  <Slider
                    value={limits.dailyReviewLimit}
                    onChange={handleDailyReviewLimitChange}
                    min={DAILY_REVIEW_LIMIT_RANGE.min}
                    max={DAILY_REVIEW_LIMIT_RANGE.max}
                    step={10}
                    marks={[
                      { value: 0, label: t("settings.srs.limits.unlimited") },
                      { value: 100, label: "100" },
                      { value: 250, label: "250" },
                      { value: 500, label: "500" },
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => formatLimitValue(v, true)}
                    aria-label={t("settings.srs.limits.dailyReviewLimit")}
                  />
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {t("settings.srs.limits.currentValue", {
                    value: formatLimitValue(limits.dailyReviewLimit, true),
                  })}
                </Typography>
              </Box>

              <Divider />

              {/* Daily New Card Limit */}
              <Box>
                <Typography variant="body1" fontWeight="medium" gutterBottom>
                  {t("settings.srs.limits.dailyNewCardLimit")}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {t("settings.srs.limits.dailyNewCardLimitDescription")}
                </Typography>
                <Box sx={{ px: 2 }}>
                  <Slider
                    value={limits.dailyNewCardLimit}
                    onChange={handleDailyNewCardLimitChange}
                    min={DAILY_NEW_CARD_LIMIT_RANGE.min}
                    max={DAILY_NEW_CARD_LIMIT_RANGE.max}
                    step={5}
                    marks={[
                      { value: 0, label: "0" },
                      { value: 20, label: "20" },
                      { value: 50, label: "50" },
                      { value: 100, label: "100" },
                    ]}
                    valueLabelDisplay="auto"
                    aria-label={t("settings.srs.limits.dailyNewCardLimit")}
                  />
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {t("settings.srs.limits.currentValue", {
                    value: limits.dailyNewCardLimit.toString(),
                  })}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h6">
                  {t("settings.srs.notifications.title")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("settings.srs.notifications.description")}
                </Typography>
              </Box>
              <Switch
                checked={notifications.enabled}
                onChange={(e) => handleNotificationsToggle(e.target.checked)}
                inputProps={{
                  "aria-label": t("settings.srs.notifications.title"),
                }}
              />
            </Box>

            <Divider sx={{ mb: 1 }} />

            <Stack divider={<Divider />}>
              <ToggleItem
                label={t("settings.srs.notifications.pushEnabled")}
                description={t(
                  "settings.srs.notifications.pushEnabledDescription"
                )}
                checked={notifications.pushEnabled}
                disabled={!notifications.enabled}
                onChange={handlePushToggle}
              />

              <ToggleItem
                label={t("settings.srs.notifications.emailEnabled")}
                description={t(
                  "settings.srs.notifications.emailEnabledDescription"
                )}
                checked={notifications.emailEnabled}
                disabled={!notifications.enabled}
                onChange={handleEmailToggle}
              />

              <Box sx={{ py: 1.5 }}>
                <FormControl
                  fullWidth
                  disabled={!notifications.enabled}
                  sx={{ mt: 1 }}
                >
                  <InputLabel id="reminder-time-label">
                    {t("settings.srs.notifications.reminderTime")}
                  </InputLabel>
                  <Select
                    labelId="reminder-time-label"
                    id="reminder-time"
                    value={notifications.reminderTime}
                    label={t("settings.srs.notifications.reminderTime")}
                    onChange={handleReminderTimeChange}
                  >
                    {reminderTimes.map((time) => (
                      <MenuItem key={time} value={time}>
                        {formatReminderTime(time)}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {t("settings.srs.notifications.reminderTimeDescription")}
                  </FormHelperText>
                </FormControl>
              </Box>

              <ToggleItem
                label={t("settings.srs.notifications.onlyWhenDue")}
                description={t(
                  "settings.srs.notifications.onlyWhenDueDescription"
                )}
                checked={notifications.onlyWhenDue}
                disabled={!notifications.enabled}
                onChange={handleOnlyWhenDueToggle}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Review Preferences */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.srs.reviewPreferences.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t("settings.srs.reviewPreferences.description")}
            </Typography>

            <Stack spacing={3}>
              {/* Card Order */}
              <FormControl fullWidth>
                <InputLabel id="card-order-label">
                  {t("settings.srs.reviewPreferences.cardOrder.title")}
                </InputLabel>
                <Select
                  labelId="card-order-label"
                  id="card-order"
                  value={reviewPreferences.cardOrder}
                  label={t("settings.srs.reviewPreferences.cardOrder.title")}
                  onChange={handleCardOrderChange}
                >
                  {cardOrderOptions.map((order) => (
                    <MenuItem key={order} value={order}>
                      {t(`settings.srs.reviewPreferences.cardOrder.${order}`)}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {t("settings.srs.reviewPreferences.cardOrder.description")}
                </FormHelperText>
              </FormControl>

              {/* Rating Style */}
              <FormControl fullWidth>
                <InputLabel id="rating-style-label">
                  {t("settings.srs.reviewPreferences.ratingStyle.title")}
                </InputLabel>
                <Select
                  labelId="rating-style-label"
                  id="rating-style"
                  value={reviewPreferences.ratingStyle}
                  label={t("settings.srs.reviewPreferences.ratingStyle.title")}
                  onChange={handleRatingStyleChange}
                >
                  {ratingStyleOptions.map((style) => (
                    <MenuItem key={style} value={style}>
                      {t(`settings.srs.reviewPreferences.ratingStyle.${style}`)}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {t("settings.srs.reviewPreferences.ratingStyle.description")}
                </FormHelperText>
              </FormControl>

              <Divider />

              {/* Toggle preferences */}
              <Stack divider={<Divider />}>
                <ToggleItem
                  label={t("settings.srs.reviewPreferences.autoPlayAudio")}
                  description={t(
                    "settings.srs.reviewPreferences.autoPlayAudioDescription"
                  )}
                  checked={reviewPreferences.autoPlayAudio}
                  onChange={handleAutoPlayToggle}
                />

                <ToggleItem
                  label={t("settings.srs.reviewPreferences.showProgress")}
                  description={t(
                    "settings.srs.reviewPreferences.showProgressDescription"
                  )}
                  checked={reviewPreferences.showProgress}
                  onChange={handleShowProgressToggle}
                />

                <ToggleItem
                  label={t("settings.srs.reviewPreferences.enableUndo")}
                  description={t(
                    "settings.srs.reviewPreferences.enableUndoDescription"
                  )}
                  checked={reviewPreferences.enableUndo}
                  onChange={handleEnableUndoToggle}
                />

                <Box sx={{ py: 1.5 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={reviewPreferences.autoAdvance}
                        onChange={(e) =>
                          handleAutoAdvanceToggle(e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {t("settings.srs.reviewPreferences.autoAdvance")}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t(
                            "settings.srs.reviewPreferences.autoAdvanceDescription"
                          )}
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start", ml: 0 }}
                  />

                  {reviewPreferences.autoAdvance && (
                    <Box sx={{ mt: 2, px: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        {t("settings.srs.reviewPreferences.autoAdvanceDelay")}
                      </Typography>
                      <Slider
                        value={reviewPreferences.autoAdvanceDelay}
                        onChange={handleAutoAdvanceDelayChange}
                        min={AUTO_ADVANCE_DELAY_RANGE.min}
                        max={AUTO_ADVANCE_DELAY_RANGE.max}
                        step={AUTO_ADVANCE_DELAY_RANGE.step}
                        marks={[
                          { value: 500, label: "0.5s" },
                          { value: 1000, label: "1s" },
                          { value: 2000, label: "2s" },
                          { value: 3000, label: "3s" },
                        ]}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(v) => `${(v / 1000).toFixed(1)}s`}
                        aria-label={t(
                          "settings.srs.reviewPreferences.autoAdvanceDelay"
                        )}
                      />
                    </Box>
                  )}
                </Box>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Reset Settings */}
        <Card>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body1">
                {t("settings.srs.resetSettings")}
              </Typography>
              <Button
                variant="outlined"
                color="warning"
                onClick={handleResetClick}
              >
                {t("settings.srs.resetSettings")}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Stack>

      {/* Reset Confirmation Dialog */}
      {resetDialogOpen && (
        <Alert
          severity="warning"
          sx={{ mt: 2 }}
          action={
            <Stack direction="row" spacing={1}>
              <Button color="inherit" size="small" onClick={handleResetCancel}>
                {t("common.cancel")}
              </Button>
              <Button color="warning" size="small" onClick={handleResetConfirm}>
                {t("common.confirm")}
              </Button>
            </Stack>
          }
        >
          {t("settings.srs.resetConfirm")}
        </Alert>
      )}

      {/* Saved Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        message={t("settings.srs.saved")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}

export default SettingsSRSPage;
