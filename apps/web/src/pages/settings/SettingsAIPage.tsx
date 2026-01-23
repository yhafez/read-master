/**
 * AI Settings page
 *
 * Allows users to configure AI feature preferences including:
 * - Global AI toggle
 * - Individual feature toggles
 * - Reading level preference
 * - Comprehension check frequency
 * - Usage statistics visibility
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
  Snackbar,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

import {
  useAISettingsStore,
  readingLevels,
  comprehensionFrequencies,
} from "@/stores";
import type {
  AIFeatureToggles,
  ReadingLevel,
  ComprehensionFrequency,
} from "@/stores";
import { AIPersonalitySection } from "./AIPersonalitySection";
import { AIModelSelector } from "@/components/ai";

/**
 * Feature toggle item component
 */
interface FeatureToggleProps {
  feature: keyof AIFeatureToggles;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (feature: keyof AIFeatureToggles, enabled: boolean) => void;
}

function FeatureToggle({
  feature,
  label,
  description,
  checked,
  disabled,
  onChange,
}: FeatureToggleProps): React.ReactElement {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(feature, event.target.checked);
    },
    [feature, onChange]
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
 * AI Settings page component
 */
export function SettingsAIPage(): React.ReactElement {
  const { t } = useTranslation();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Store state and actions
  const {
    aiEnabled,
    features,
    readingLevel,
    comprehensionFrequency,
    showUsageStats,
    setAIEnabled,
    setFeatureToggle,
    enableAllFeatures,
    disableAllFeatures,
    setReadingLevel,
    setComprehensionFrequency,
    setShowUsageStats,
    resetSettings,
  } = useAISettingsStore();

  // Handlers
  const handleGlobalToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setAIEnabled(event.target.checked);
      setSnackbarOpen(true);
    },
    [setAIEnabled]
  );

  const handleFeatureToggle = useCallback(
    (feature: keyof AIFeatureToggles, enabled: boolean) => {
      setFeatureToggle(feature, enabled);
      setSnackbarOpen(true);
    },
    [setFeatureToggle]
  );

  const handleEnableAll = useCallback(() => {
    enableAllFeatures();
    setSnackbarOpen(true);
  }, [enableAllFeatures]);

  const handleDisableAll = useCallback(() => {
    disableAllFeatures();
    setSnackbarOpen(true);
  }, [disableAllFeatures]);

  const handleReadingLevelChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      setReadingLevel(event.target.value as ReadingLevel);
      setSnackbarOpen(true);
    },
    [setReadingLevel]
  );

  const handleFrequencyChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      setComprehensionFrequency(event.target.value as ComprehensionFrequency);
      setSnackbarOpen(true);
    },
    [setComprehensionFrequency]
  );

  const handleUsageStatsToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setShowUsageStats(event.target.checked);
      setSnackbarOpen(true);
    },
    [setShowUsageStats]
  );

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

  // Feature toggle data
  const featureToggles: Array<{
    feature: keyof AIFeatureToggles;
    labelKey: string;
    descriptionKey: string;
  }> = [
    {
      feature: "preReadingGuides",
      labelKey: "settings.aiSettings.features.preReadingGuides.label",
      descriptionKey:
        "settings.aiSettings.features.preReadingGuides.description",
    },
    {
      feature: "explainThis",
      labelKey: "settings.aiSettings.features.explainThis.label",
      descriptionKey: "settings.aiSettings.features.explainThis.description",
    },
    {
      feature: "aiChat",
      labelKey: "settings.aiSettings.features.aiChat.label",
      descriptionKey: "settings.aiSettings.features.aiChat.description",
    },
    {
      feature: "comprehensionChecks",
      labelKey: "settings.aiSettings.features.comprehensionChecks.label",
      descriptionKey:
        "settings.aiSettings.features.comprehensionChecks.description",
    },
    {
      feature: "assessments",
      labelKey: "settings.aiSettings.features.assessments.label",
      descriptionKey: "settings.aiSettings.features.assessments.description",
    },
    {
      feature: "flashcardGeneration",
      labelKey: "settings.aiSettings.features.flashcardGeneration.label",
      descriptionKey:
        "settings.aiSettings.features.flashcardGeneration.description",
    },
  ];

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("settings.aiSettings.title")}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t("settings.aiSettings.description")}
      </Typography>

      <Stack spacing={3}>
        {/* Global AI Toggle */}
        <Card>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <Box>
                <Typography variant="h6" gutterBottom>
                  {t("settings.aiSettings.globalToggle.title")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("settings.aiSettings.globalToggle.description")}
                </Typography>
              </Box>
              <Switch
                checked={aiEnabled}
                onChange={handleGlobalToggle}
                inputProps={{
                  "aria-label": t("settings.aiSettings.globalToggle.title"),
                }}
                size="medium"
              />
            </Box>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
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
                  {t("settings.aiSettings.features.title")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("settings.aiSettings.features.description")}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  onClick={handleEnableAll}
                  disabled={!aiEnabled}
                >
                  {t("settings.aiSettings.features.enableAll")}
                </Button>
                <Button
                  size="small"
                  onClick={handleDisableAll}
                  disabled={!aiEnabled}
                >
                  {t("settings.aiSettings.features.disableAll")}
                </Button>
              </Stack>
            </Box>

            <Divider sx={{ mb: 1 }} />

            <Stack divider={<Divider />}>
              {featureToggles.map(({ feature, labelKey, descriptionKey }) => (
                <FeatureToggle
                  key={feature}
                  feature={feature}
                  label={t(labelKey)}
                  description={t(descriptionKey)}
                  checked={features[feature]}
                  disabled={!aiEnabled}
                  onChange={handleFeatureToggle}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>

        {/* Reading Level */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.aiSettings.readingLevel.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("settings.aiSettings.readingLevel.description")}
            </Typography>

            <FormControl fullWidth disabled={!aiEnabled}>
              <InputLabel id="reading-level-label">
                {t("settings.aiSettings.readingLevel.title")}
              </InputLabel>
              <Select
                labelId="reading-level-label"
                id="reading-level"
                value={readingLevel}
                label={t("settings.aiSettings.readingLevel.title")}
                onChange={handleReadingLevelChange}
              >
                {readingLevels.map((level) => (
                  <MenuItem key={level} value={level}>
                    {t(`settings.aiSettings.readingLevel.${level}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        {/* Comprehension Frequency */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.aiSettings.comprehensionFrequency.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("settings.aiSettings.comprehensionFrequency.description")}
            </Typography>

            <FormControl
              fullWidth
              disabled={!aiEnabled || !features.comprehensionChecks}
            >
              <InputLabel id="comprehension-frequency-label">
                {t("settings.aiSettings.comprehensionFrequency.title")}
              </InputLabel>
              <Select
                labelId="comprehension-frequency-label"
                id="comprehension-frequency"
                value={comprehensionFrequency}
                label={t("settings.aiSettings.comprehensionFrequency.title")}
                onChange={handleFrequencyChange}
              >
                {comprehensionFrequencies.map((freq) => (
                  <MenuItem key={freq} value={freq}>
                    {t(`settings.aiSettings.comprehensionFrequency.${freq}`)}
                  </MenuItem>
                ))}
              </Select>
              {(!aiEnabled || !features.comprehensionChecks) && (
                <FormHelperText>
                  {!aiEnabled
                    ? t("settings.aiSettings.globalToggle.description")
                    : t(
                        "settings.aiSettings.features.comprehensionChecks.description"
                      )}
                </FormHelperText>
              )}
            </FormControl>
          </CardContent>
        </Card>

        {/* Usage Stats Toggle */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.aiSettings.usageStats.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("settings.aiSettings.usageStats.description")}
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={showUsageStats}
                  onChange={handleUsageStatsToggle}
                  inputProps={{
                    "aria-label": t("settings.aiSettings.usageStats.showStats"),
                  }}
                />
              }
              label={t("settings.aiSettings.usageStats.showStats")}
            />
          </CardContent>
        </Card>

        {/* AI Personality Customization */}
        <AIPersonalitySection />

        {/* AI Model Selection */}
        <AIModelSelector userTier="free" />

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
                {t("settings.aiSettings.resetSettings")}
              </Typography>
              <Button
                variant="outlined"
                color="warning"
                onClick={handleResetClick}
              >
                {t("settings.aiSettings.resetSettings")}
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
          {t("settings.aiSettings.resetConfirm")}
        </Alert>
      )}

      {/* Saved Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        message={t("settings.aiSettings.saved")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}

export default SettingsAIPage;
