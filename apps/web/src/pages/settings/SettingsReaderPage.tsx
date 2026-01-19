/**
 * Reader Settings/Preferences page
 *
 * Allows users to configure default reader preferences including:
 * - Default reading mode (paginated, scroll, spread)
 * - Display options (page numbers, progress bar, estimated time)
 * - Auto-save progress toggle
 * - Page turn animation style
 * - Typography defaults (font family, size, line height)
 * - Visual preferences (margins, max width)
 */

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
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
import RestartAltIcon from "@mui/icons-material/RestartAlt";

import {
  useReaderPreferencesStore,
  type ReadingMode,
  type PageTurnAnimation,
  type FontFamily,
  MARGINS_RANGE,
  MAX_WIDTH_RANGE,
  AUTO_SCROLL_WPM_RANGE,
} from "@/stores";

/**
 * Reading mode options
 */
const READING_MODES: Array<{ value: ReadingMode; labelKey: string }> = [
  { value: "paginated", labelKey: "reader.settings.readingMode.paginated" },
  { value: "scroll", labelKey: "reader.settings.readingMode.scroll" },
  { value: "spread", labelKey: "reader.settings.readingMode.spread" },
];

/**
 * Page turn animation options
 */
const PAGE_TURN_ANIMATIONS: Array<{
  value: PageTurnAnimation;
  labelKey: string;
}> = [
  { value: "none", labelKey: "reader.settings.pageTurnAnimation.none" },
  { value: "slide", labelKey: "reader.settings.pageTurnAnimation.slide" },
  { value: "fade", labelKey: "reader.settings.pageTurnAnimation.fade" },
  { value: "flip", labelKey: "reader.settings.pageTurnAnimation.flip" },
];

/**
 * Font family options
 */
const FONT_FAMILIES: Array<{ value: string; labelKey: string }> = [
  { value: "system", labelKey: "reader.settings.fontFamily.system" },
  { value: "serif", labelKey: "reader.settings.fontFamily.serif" },
  { value: "sans-serif", labelKey: "reader.settings.fontFamily.sansSerif" },
  { value: "monospace", labelKey: "reader.settings.fontFamily.monospace" },
  {
    value: "opendyslexic",
    labelKey: "reader.settings.fontFamily.openDyslexic",
  },
];

/**
 * Font size range
 */
const FONT_SIZE_RANGE = {
  min: 12,
  max: 32,
  step: 1,
} as const;

/**
 * Line height range
 */
const LINE_HEIGHT_RANGE = {
  min: 1.0,
  max: 3.0,
  step: 0.1,
} as const;

/**
 * Format font size for display
 */
function formatFontSize(value: number): string {
  return `${value}px`;
}

/**
 * Format line height for display
 */
function formatLineHeight(value: number): string {
  return `${value.toFixed(1)}`;
}

/**
 * Format percentage for display
 */
function formatPercentage(value: number): string {
  return `${value}%`;
}

/**
 * Format WPM for display
 */
function formatWPM(value: number): string {
  return value === 0 ? "Off" : `${value} WPM`;
}

/**
 * Reader Settings/Preferences page component
 */
export function SettingsReaderPage(): React.ReactElement {
  const { t } = useTranslation();
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Store state and actions
  const autoSaveProgress = useReaderPreferencesStore(
    (state) => state.autoSaveProgress
  );
  const pageTurnAnimation = useReaderPreferencesStore(
    (state) => state.pageTurnAnimation
  );
  const defaultReaderSettings = useReaderPreferencesStore(
    (state) => state.defaultReaderSettings
  );

  const setAutoSaveProgress = useReaderPreferencesStore(
    (state) => state.setAutoSaveProgress
  );
  const setPageTurnAnimation = useReaderPreferencesStore(
    (state) => state.setPageTurnAnimation
  );
  const updateDefaultReaderSettings = useReaderPreferencesStore(
    (state) => state.updateDefaultReaderSettings
  );
  const setDefaultReadingMode = useReaderPreferencesStore(
    (state) => state.setDefaultReadingMode
  );
  const resetPreferences = useReaderPreferencesStore(
    (state) => state.resetPreferences
  );

  // Handlers
  const handleAutoSaveChange = useCallback(
    (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      setAutoSaveProgress(checked);
    },
    [setAutoSaveProgress]
  );

  const handlePageTurnAnimationChange = useCallback(
    (event: SelectChangeEvent) => {
      setPageTurnAnimation(event.target.value as PageTurnAnimation);
    },
    [setPageTurnAnimation]
  );

  const handleReadingModeChange = useCallback(
    (event: SelectChangeEvent) => {
      setDefaultReadingMode(event.target.value as ReadingMode);
    },
    [setDefaultReadingMode]
  );

  const handleFontFamilyChange = useCallback(
    (event: SelectChangeEvent) => {
      updateDefaultReaderSettings({
        typography: {
          ...defaultReaderSettings.typography,
          fontFamily: event.target.value as FontFamily,
        },
      });
    },
    [updateDefaultReaderSettings, defaultReaderSettings.typography]
  );

  const handleFontSizeChange = useCallback(
    (_event: Event, value: number | number[]) => {
      updateDefaultReaderSettings({
        typography: {
          ...defaultReaderSettings.typography,
          fontSize: value as number,
        },
      });
    },
    [updateDefaultReaderSettings, defaultReaderSettings.typography]
  );

  const handleLineHeightChange = useCallback(
    (_event: Event, value: number | number[]) => {
      updateDefaultReaderSettings({
        typography: {
          ...defaultReaderSettings.typography,
          lineHeight: value as number,
        },
      });
    },
    [updateDefaultReaderSettings, defaultReaderSettings.typography]
  );

  const handleMarginsChange = useCallback(
    (_event: Event, value: number | number[]) => {
      updateDefaultReaderSettings({
        margins: value as number,
      });
    },
    [updateDefaultReaderSettings]
  );

  const handleMaxWidthChange = useCallback(
    (_event: Event, value: number | number[]) => {
      updateDefaultReaderSettings({
        maxWidth: value as number,
      });
    },
    [updateDefaultReaderSettings]
  );

  const handleAutoScrollWpmChange = useCallback(
    (_event: Event, value: number | number[]) => {
      updateDefaultReaderSettings({
        autoScrollWpm: value as number,
      });
    },
    [updateDefaultReaderSettings]
  );

  const handleShowPageNumbersChange = useCallback(
    (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      updateDefaultReaderSettings({ showPageNumbers: checked });
    },
    [updateDefaultReaderSettings]
  );

  const handleShowProgressBarChange = useCallback(
    (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      updateDefaultReaderSettings({ showProgressBar: checked });
    },
    [updateDefaultReaderSettings]
  );

  const handleShowEstimatedTimeChange = useCallback(
    (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      updateDefaultReaderSettings({ showEstimatedTime: checked });
    },
    [updateDefaultReaderSettings]
  );

  const handleBionicReadingChange = useCallback(
    (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      updateDefaultReaderSettings({ bionicReadingEnabled: checked });
    },
    [updateDefaultReaderSettings]
  );

  const handleHighlightParagraphChange = useCallback(
    (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      updateDefaultReaderSettings({ highlightCurrentParagraph: checked });
    },
    [updateDefaultReaderSettings]
  );

  const handleReset = useCallback(() => {
    resetPreferences();
    setSnackbarOpen(true);
  }, [resetPreferences]);

  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
      <Typography variant="h4" gutterBottom>
        {t("settings.reader.title")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        {t("settings.reader.description")}
      </Typography>

      <Stack spacing={3}>
        {/* General Preferences */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.reader.generalPreferences")}
            </Typography>

            <Stack spacing={3}>
              {/* Auto-save progress */}
              <FormControlLabel
                control={
                  <Switch
                    checked={autoSaveProgress}
                    onChange={handleAutoSaveChange}
                  />
                }
                label={t("settings.reader.autoSaveProgress")}
              />
              <Typography variant="caption" color="text.secondary">
                {t("settings.reader.autoSaveProgressDescription")}
              </Typography>

              {/* Page turn animation */}
              <FormControl fullWidth>
                <InputLabel>
                  {t("settings.reader.pageTurnAnimation")}
                </InputLabel>
                <Select
                  value={pageTurnAnimation}
                  label={t("settings.reader.pageTurnAnimation")}
                  onChange={handlePageTurnAnimationChange}
                >
                  {PAGE_TURN_ANIMATIONS.map((anim) => (
                    <MenuItem key={anim.value} value={anim.value}>
                      {t(anim.labelKey)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        {/* Default Reader Settings */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.reader.defaultReaderSettings")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("settings.reader.defaultReaderSettingsDescription")}
            </Typography>

            <Stack spacing={3}>
              {/* Reading mode */}
              <FormControl fullWidth>
                <InputLabel>{t("settings.reader.readingMode")}</InputLabel>
                <Select
                  value={defaultReaderSettings.readingMode}
                  label={t("settings.reader.readingMode")}
                  onChange={handleReadingModeChange}
                >
                  {READING_MODES.map((mode) => (
                    <MenuItem key={mode.value} value={mode.value}>
                      {t(mode.labelKey)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Display toggles */}
              <FormControlLabel
                control={
                  <Switch
                    checked={defaultReaderSettings.showPageNumbers}
                    onChange={handleShowPageNumbersChange}
                  />
                }
                label={t("settings.reader.showPageNumbers")}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={defaultReaderSettings.showProgressBar}
                    onChange={handleShowProgressBarChange}
                  />
                }
                label={t("settings.reader.showProgressBar")}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={defaultReaderSettings.showEstimatedTime}
                    onChange={handleShowEstimatedTimeChange}
                  />
                }
                label={t("settings.reader.showEstimatedTime")}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={defaultReaderSettings.bionicReadingEnabled}
                    onChange={handleBionicReadingChange}
                  />
                }
                label={t("settings.reader.bionicReading")}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={defaultReaderSettings.highlightCurrentParagraph}
                    onChange={handleHighlightParagraphChange}
                  />
                }
                label={t("settings.reader.highlightParagraph")}
              />

              {/* Auto-scroll speed */}
              <Box>
                <Typography gutterBottom>
                  {t("settings.reader.autoScrollSpeed")}
                </Typography>
                <Slider
                  value={defaultReaderSettings.autoScrollWpm}
                  onChange={handleAutoScrollWpmChange}
                  min={AUTO_SCROLL_WPM_RANGE.min}
                  max={AUTO_SCROLL_WPM_RANGE.max}
                  step={AUTO_SCROLL_WPM_RANGE.step}
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatWPM}
                  marks={[
                    {
                      value: 0,
                      label: formatWPM(0),
                    },
                    {
                      value: 500,
                      label: formatWPM(500),
                    },
                    {
                      value: 1000,
                      label: formatWPM(1000),
                    },
                  ]}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Typography Settings */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.reader.typography")}
            </Typography>

            <Stack spacing={3}>
              {/* Font family */}
              <FormControl fullWidth>
                <InputLabel>{t("settings.reader.fontFamily")}</InputLabel>
                <Select
                  value={defaultReaderSettings.typography.fontFamily}
                  label={t("settings.reader.fontFamily")}
                  onChange={handleFontFamilyChange}
                >
                  {FONT_FAMILIES.map((font) => (
                    <MenuItem key={font.value} value={font.value}>
                      {t(font.labelKey)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Font size */}
              <Box>
                <Typography gutterBottom>
                  {t("settings.reader.fontSize")}
                </Typography>
                <Slider
                  value={defaultReaderSettings.typography.fontSize}
                  onChange={handleFontSizeChange}
                  min={FONT_SIZE_RANGE.min}
                  max={FONT_SIZE_RANGE.max}
                  step={FONT_SIZE_RANGE.step}
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatFontSize}
                  marks={[
                    {
                      value: 12,
                      label: formatFontSize(12),
                    },
                    {
                      value: 22,
                      label: formatFontSize(22),
                    },
                    {
                      value: 32,
                      label: formatFontSize(32),
                    },
                  ]}
                />
              </Box>

              {/* Line height */}
              <Box>
                <Typography gutterBottom>
                  {t("settings.reader.lineHeight")}
                </Typography>
                <Slider
                  value={defaultReaderSettings.typography.lineHeight}
                  onChange={handleLineHeightChange}
                  min={LINE_HEIGHT_RANGE.min}
                  max={LINE_HEIGHT_RANGE.max}
                  step={LINE_HEIGHT_RANGE.step}
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatLineHeight}
                  marks={[
                    {
                      value: 1.0,
                      label: formatLineHeight(1.0),
                    },
                    {
                      value: 2.0,
                      label: formatLineHeight(2.0),
                    },
                    {
                      value: 3.0,
                      label: formatLineHeight(3.0),
                    },
                  ]}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Visual Preferences */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.reader.visual")}
            </Typography>

            <Stack spacing={3}>
              {/* Margins */}
              <Box>
                <Typography gutterBottom>
                  {t("settings.reader.margins")}
                </Typography>
                <Slider
                  value={defaultReaderSettings.margins}
                  onChange={handleMarginsChange}
                  min={MARGINS_RANGE.min}
                  max={MARGINS_RANGE.max}
                  step={MARGINS_RANGE.step}
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatPercentage}
                  marks={[
                    {
                      value: 0,
                      label: formatPercentage(0),
                    },
                    {
                      value: 10,
                      label: formatPercentage(10),
                    },
                    {
                      value: 20,
                      label: formatPercentage(20),
                    },
                  ]}
                />
              </Box>

              {/* Max width */}
              <Box>
                <Typography gutterBottom>
                  {t("settings.reader.maxWidth")}
                </Typography>
                <Slider
                  value={defaultReaderSettings.maxWidth}
                  onChange={handleMaxWidthChange}
                  min={MAX_WIDTH_RANGE.min}
                  max={MAX_WIDTH_RANGE.max}
                  step={MAX_WIDTH_RANGE.step}
                  valueLabelDisplay="auto"
                  marks={[
                    {
                      value: 0,
                      label: t("settings.reader.fullWidth"),
                    },
                    {
                      value: 800,
                      label: "800px",
                    },
                    {
                      value: 1400,
                      label: "1400px",
                    },
                  ]}
                />
                <Typography variant="caption" color="text.secondary">
                  {t("settings.reader.maxWidthDescription")}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Reset button */}
        <Card>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography variant="h6" gutterBottom>
                  {t("settings.reader.reset")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("settings.reader.resetDescription")}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="error"
                startIcon={<RestartAltIcon />}
                onClick={handleReset}
              >
                {t("settings.reader.resetButton")}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Info alert */}
        <Alert severity="info">{t("settings.reader.infoMessage")}</Alert>
      </Stack>

      {/* Success snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        message={t("settings.reader.resetSuccess")}
      />
    </Box>
  );
}
