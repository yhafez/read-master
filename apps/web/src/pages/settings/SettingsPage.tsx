/**
 * General Settings page
 *
 * Allows users to configure general preferences including:
 * - Language selection
 * - Timezone configuration
 * - Display name
 * - Email notification preferences
 */

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  useGeneralSettingsStore,
  commonTimezones,
  languageNames,
  generalSettingsLanguages,
  formatTimezoneDisplay,
} from "@/stores";
import type {
  EmailNotificationSettings,
  GeneralSupportedLanguage,
} from "@/stores";

/**
 * Email notification toggle component
 */
interface NotificationToggleProps {
  setting: keyof EmailNotificationSettings;
  label: string;
  description: string;
  checked: boolean;
  onChange: (
    setting: keyof EmailNotificationSettings,
    enabled: boolean
  ) => void;
}

function NotificationToggle({
  setting,
  label,
  description,
  checked,
  onChange,
}: NotificationToggleProps): React.ReactElement {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(setting, event.target.checked);
    },
    [setting, onChange]
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
        inputProps={{ "aria-label": label }}
      />
    </Box>
  );
}

/**
 * General Settings page component
 */
export function SettingsPage(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [displayNameError, setDisplayNameError] = useState("");

  // Store state and actions
  const {
    language,
    timezone,
    displayName,
    emailNotifications,
    setLanguage,
    setTimezone,
    setDisplayName,
    setEmailNotification,
    enableAllEmailNotifications,
    disableAllEmailNotifications,
    resetSettings,
  } = useGeneralSettingsStore();

  // Initialize display name input from store
  useMemo(() => {
    setDisplayNameInput(displayName);
  }, [displayName]);

  // Language option type
  type LanguageOption = {
    value: GeneralSupportedLanguage;
    label: string;
    nativeName: string;
  };

  // Timezone option type
  type TimezoneOption = {
    value: string;
    label: string;
  };

  // Language options for autocomplete
  const languageOptions = useMemo((): LanguageOption[] => {
    return generalSettingsLanguages.map((lang) => ({
      value: lang,
      label: t(`languages.${lang}`),
      nativeName: languageNames[lang],
    }));
  }, [t]);

  // Timezone options for autocomplete with formatted display
  const timezoneOptions = useMemo((): TimezoneOption[] => {
    return commonTimezones.map((tz) => ({
      value: tz,
      label: formatTimezoneDisplay(tz),
    }));
  }, []);

  // Current language option - always returns a valid option
  const currentLanguageOption = useMemo((): LanguageOption => {
    const found = languageOptions.find((opt) => opt.value === language);
    // Always return a valid option - default to English if not found
    return (
      found ?? {
        value: "en" as GeneralSupportedLanguage,
        label: t("languages.en"),
        nativeName: languageNames.en,
      }
    );
  }, [language, languageOptions, t]);

  // Current timezone option - always returns a valid option
  const currentTimezoneOption = useMemo((): TimezoneOption => {
    const found = timezoneOptions.find((opt) => opt.value === timezone);
    const utcFallback = timezoneOptions.find((opt) => opt.value === "UTC");
    // Always return a valid option - default to UTC if not found
    return (
      found ??
      utcFallback ?? {
        value: "UTC",
        label: formatTimezoneDisplay("UTC"),
      }
    );
  }, [timezone, timezoneOptions]);

  // Handlers
  const handleLanguageChange = useCallback(
    (_event: React.SyntheticEvent, option: LanguageOption | null) => {
      if (option) {
        setLanguage(option.value);
        // Also update i18n language
        i18n.changeLanguage(option.value);
        setSnackbarOpen(true);
      }
    },
    [setLanguage, i18n]
  );

  const handleTimezoneChange = useCallback(
    (_event: React.SyntheticEvent, option: TimezoneOption | null) => {
      if (option) {
        setTimezone(option.value);
        setSnackbarOpen(true);
      }
    },
    [setTimezone]
  );

  const handleDisplayNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setDisplayNameInput(value);

      // Validate length
      if (value.length > 50) {
        setDisplayNameError(t("settings.general.displayName.tooLong"));
      } else {
        setDisplayNameError("");
      }
    },
    [t]
  );

  const handleDisplayNameBlur = useCallback(() => {
    if (!displayNameError && displayNameInput !== displayName) {
      setDisplayName(displayNameInput);
      setSnackbarOpen(true);
    }
  }, [displayNameInput, displayName, displayNameError, setDisplayName]);

  const handleDisplayNameKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter") {
        handleDisplayNameBlur();
      }
    },
    [handleDisplayNameBlur]
  );

  const handleNotificationToggle = useCallback(
    (setting: keyof EmailNotificationSettings, enabled: boolean) => {
      setEmailNotification(setting, enabled);
      setSnackbarOpen(true);
    },
    [setEmailNotification]
  );

  const handleEnableAll = useCallback(() => {
    enableAllEmailNotifications();
    setSnackbarOpen(true);
  }, [enableAllEmailNotifications]);

  const handleDisableAll = useCallback(() => {
    disableAllEmailNotifications();
    setSnackbarOpen(true);
  }, [disableAllEmailNotifications]);

  const handleResetClick = useCallback(() => {
    setResetDialogOpen(true);
  }, []);

  const handleResetConfirm = useCallback(() => {
    resetSettings();
    setDisplayNameInput("");
    i18n.changeLanguage("en");
    setResetDialogOpen(false);
    setSnackbarOpen(true);
  }, [resetSettings, i18n]);

  const handleResetCancel = useCallback(() => {
    setResetDialogOpen(false);
  }, []);

  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  // Notification toggle data
  const notificationToggles: Array<{
    setting: keyof EmailNotificationSettings;
    labelKey: string;
    descriptionKey: string;
  }> = [
    {
      setting: "srsReminders",
      labelKey: "settings.general.notifications.srsReminders.label",
      descriptionKey: "settings.general.notifications.srsReminders.description",
    },
    {
      setting: "weeklyProgress",
      labelKey: "settings.general.notifications.weeklyProgress.label",
      descriptionKey:
        "settings.general.notifications.weeklyProgress.description",
    },
    {
      setting: "achievements",
      labelKey: "settings.general.notifications.achievements.label",
      descriptionKey: "settings.general.notifications.achievements.description",
    },
    {
      setting: "groupActivity",
      labelKey: "settings.general.notifications.groupActivity.label",
      descriptionKey:
        "settings.general.notifications.groupActivity.description",
    },
    {
      setting: "forumReplies",
      labelKey: "settings.general.notifications.forumReplies.label",
      descriptionKey: "settings.general.notifications.forumReplies.description",
    },
    {
      setting: "marketing",
      labelKey: "settings.general.notifications.marketing.label",
      descriptionKey: "settings.general.notifications.marketing.description",
    },
  ];

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("settings.general.title")}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t("settings.general.description")}
      </Typography>

      <Stack spacing={3}>
        {/* Language Selection */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.general.language.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("settings.general.language.description")}
            </Typography>

            <Autocomplete<LanguageOption, false, true, false>
              value={currentLanguageOption}
              options={languageOptions}
              getOptionLabel={(option) =>
                `${option.label} (${option.nativeName})`
              }
              onChange={handleLanguageChange}
              isOptionEqualToValue={(option, value) =>
                option.value === value.value
              }
              disableClearable
              renderInput={(params) => (
                <TextField
                  inputRef={params.InputProps.ref}
                  inputProps={params.inputProps}
                  label={t("settings.general.language.title")}
                  disabled={params.disabled}
                  fullWidth={params.fullWidth}
                  InputProps={{
                    className: params.InputProps.className,
                    startAdornment: params.InputProps.startAdornment,
                    endAdornment: params.InputProps.endAdornment,
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key: _key, ...restProps } = props;
                return (
                  <Box component="li" key={option.value} {...restProps}>
                    <Box>
                      <Typography variant="body1">{option.label}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.nativeName}
                      </Typography>
                    </Box>
                  </Box>
                );
              }}
            />
          </CardContent>
        </Card>

        {/* Timezone Selection */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.general.timezone.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("settings.general.timezone.description")}
            </Typography>

            <Autocomplete<TimezoneOption, false, true, false>
              value={currentTimezoneOption}
              options={timezoneOptions}
              getOptionLabel={(option) => option.label}
              onChange={handleTimezoneChange}
              isOptionEqualToValue={(option, value) =>
                option.value === value.value
              }
              disableClearable
              renderInput={(params) => (
                <TextField
                  inputRef={params.InputProps.ref}
                  inputProps={params.inputProps}
                  label={t("settings.general.timezone.title")}
                  disabled={params.disabled}
                  fullWidth={params.fullWidth}
                  InputProps={{
                    className: params.InputProps.className,
                    startAdornment: params.InputProps.startAdornment,
                    endAdornment: params.InputProps.endAdornment,
                  }}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Display Name */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.general.displayName.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("settings.general.displayName.description")}
            </Typography>

            <TextField
              value={displayNameInput}
              onChange={handleDisplayNameChange}
              onBlur={handleDisplayNameBlur}
              onKeyDown={handleDisplayNameKeyDown}
              label={t("settings.general.displayName.title")}
              placeholder={t("settings.general.displayName.placeholder")}
              fullWidth
              error={!!displayNameError}
              helperText={
                displayNameError ||
                t("settings.general.displayName.helperText", {
                  count: displayNameInput.length,
                  max: 50,
                })
              }
              inputProps={{
                maxLength: 50,
                "aria-label": t("settings.general.displayName.title"),
              }}
            />
          </CardContent>
        </Card>

        {/* Email Notifications */}
        <Card>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h6">
                  {t("settings.general.notifications.title")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("settings.general.notifications.description")}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={handleEnableAll}>
                  {t("settings.general.notifications.enableAll")}
                </Button>
                <Button size="small" onClick={handleDisableAll}>
                  {t("settings.general.notifications.disableAll")}
                </Button>
              </Stack>
            </Box>

            <Divider sx={{ mb: 1 }} />

            <Stack divider={<Divider />}>
              {notificationToggles.map(
                ({ setting, labelKey, descriptionKey }) => (
                  <NotificationToggle
                    key={setting}
                    setting={setting}
                    label={t(labelKey)}
                    description={t(descriptionKey)}
                    checked={emailNotifications[setting]}
                    onChange={handleNotificationToggle}
                  />
                )
              )}
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
                {t("settings.general.resetSettings")}
              </Typography>
              <Button
                variant="outlined"
                color="warning"
                onClick={handleResetClick}
              >
                {t("settings.general.resetSettings")}
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
          {t("settings.general.resetConfirm")}
        </Alert>
      )}

      {/* Saved Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        message={t("settings.general.saved")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}

export default SettingsPage;
