/**
 * Reading Settings page
 *
 * Allows users to configure reader preferences including:
 * - Default theme (visual appearance)
 * - Font family and size
 * - Typography settings (line height, spacing)
 * - Reading mode (paginated, scroll, spread)
 * - Auto-save progress
 * - Page turn animation
 */

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
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

import { useThemeStore } from "@/stores/themeStore";
import {
  useReaderStore,
  FONT_FAMILIES,
  FONT_SIZE_RANGE,
  LINE_HEIGHT_RANGE,
  MARGINS_RANGE,
  MAX_WIDTH_RANGE,
} from "@/stores/readerStore";
import type { FontFamily, ReadingMode } from "@/stores/readerStore";
import type { ThemeMode, FontFamily as ThemeFontFamily } from "@/theme/types";
import { FONT_SIZE_RANGE as THEME_FONT_SIZE_RANGE } from "@/theme/types";

/**
 * Theme mode options for the reader
 */
const themeModes: ThemeMode[] = ["light", "dark", "sepia", "high-contrast"];

/**
 * Reading mode options
 */
const readingModes: ReadingMode[] = ["paginated", "scroll", "spread"];

/**
 * Font family options
 */
const fontFamilies: FontFamily[] = [
  "system",
  "serif",
  "sans-serif",
  "monospace",
  "openDyslexic",
];

/**
 * Text alignment options
 */
const textAlignments = ["left", "justify", "center"] as const;

/**
 * Reading Settings page component
 */
export function SettingsReadingPage(): React.ReactElement {
  const { t } = useTranslation();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Theme store state and actions
  const themeSettings = useThemeStore((state) => state.settings);
  const setThemeMode = useThemeStore((state) => state.setMode);
  const setThemeFontFamily = useThemeStore((state) => state.setFontFamily);
  const setThemeFontSize = useThemeStore((state) => state.setFontSize);
  const resetThemeSettings = useThemeStore((state) => state.resetSettings);

  // Reader store state and actions
  const readerSettings = useReaderStore((state) => state.settings);
  const updateSettings = useReaderStore((state) => state.updateSettings);
  const updateTypography = useReaderStore((state) => state.updateTypography);
  const resetSettings = useReaderStore((state) => state.resetSettings);

  // Handlers for theme settings
  const handleThemeModeChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      setThemeMode(event.target.value as ThemeMode);
      setSnackbarOpen(true);
    },
    [setThemeMode]
  );

  const handleThemeFontFamilyChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      setThemeFontFamily(event.target.value as ThemeFontFamily);
      setSnackbarOpen(true);
    },
    [setThemeFontFamily]
  );

  const handleThemeFontSizeChange = useCallback(
    (_event: Event, value: number | number[]) => {
      setThemeFontSize(value as number);
      setSnackbarOpen(true);
    },
    [setThemeFontSize]
  );

  // Handlers for reader settings
  const handleReadingModeChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      updateSettings({ readingMode: event.target.value as ReadingMode });
      setSnackbarOpen(true);
    },
    [updateSettings]
  );

  const handleFontFamilyChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      updateTypography({ fontFamily: event.target.value as FontFamily });
      setSnackbarOpen(true);
    },
    [updateTypography]
  );

  const handleFontSizeChange = useCallback(
    (_event: Event, value: number | number[]) => {
      updateTypography({ fontSize: value as number });
      setSnackbarOpen(true);
    },
    [updateTypography]
  );

  const handleLineHeightChange = useCallback(
    (_event: Event, value: number | number[]) => {
      updateTypography({ lineHeight: value as number });
      setSnackbarOpen(true);
    },
    [updateTypography]
  );

  const handleTextAlignChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      updateTypography({
        textAlign: event.target.value as "left" | "justify" | "center",
      });
      setSnackbarOpen(true);
    },
    [updateTypography]
  );

  const handleMarginsChange = useCallback(
    (_event: Event, value: number | number[]) => {
      updateSettings({ margins: value as number });
      setSnackbarOpen(true);
    },
    [updateSettings]
  );

  const handleMaxWidthChange = useCallback(
    (_event: Event, value: number | number[]) => {
      updateSettings({ maxWidth: value as number });
      setSnackbarOpen(true);
    },
    [updateSettings]
  );

  const handleBooleanToggle = useCallback(
    (
      setting:
        | "showPageNumbers"
        | "showProgressBar"
        | "showEstimatedTime"
        | "bionicReadingEnabled"
        | "highlightCurrentParagraph"
    ) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        updateSettings({ [setting]: event.target.checked });
        setSnackbarOpen(true);
      },
    [updateSettings]
  );

  // Reset handlers
  const handleResetClick = useCallback(() => {
    setResetDialogOpen(true);
  }, []);

  const handleResetConfirm = useCallback(() => {
    resetSettings();
    resetThemeSettings();
    setResetDialogOpen(false);
    setSnackbarOpen(true);
  }, [resetSettings, resetThemeSettings]);

  const handleResetCancel = useCallback(() => {
    setResetDialogOpen(false);
  }, []);

  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("settings.readingSettings.title", "Reading Settings")}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t(
          "settings.readingSettings.description",
          "Configure your default reader preferences. These settings will be applied when you open any book."
        )}
      </Typography>

      <Stack spacing={3}>
        {/* Appearance Settings */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.readingSettings.appearance.title", "Appearance")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t(
                "settings.readingSettings.appearance.description",
                "Customize the visual appearance of the reader."
              )}
            </Typography>

            <Stack spacing={3}>
              {/* Theme Mode */}
              <FormControl fullWidth>
                <InputLabel id="theme-mode-label">
                  {t("settings.readingSettings.appearance.theme", "Theme")}
                </InputLabel>
                <Select
                  labelId="theme-mode-label"
                  id="theme-mode"
                  value={themeSettings.mode}
                  label={t(
                    "settings.readingSettings.appearance.theme",
                    "Theme"
                  )}
                  onChange={handleThemeModeChange}
                >
                  {themeModes.map((mode) => (
                    <MenuItem key={mode} value={mode}>
                      {t(
                        `settings.appearance.themes.${mode === "high-contrast" ? "highContrast" : mode}`,
                        mode
                      )}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Theme Font Family */}
              <FormControl fullWidth>
                <InputLabel id="theme-font-family-label">
                  {t(
                    "settings.readingSettings.appearance.fontFamily",
                    "App Font"
                  )}
                </InputLabel>
                <Select
                  labelId="theme-font-family-label"
                  id="theme-font-family"
                  value={themeSettings.fontFamily}
                  label={t(
                    "settings.readingSettings.appearance.fontFamily",
                    "App Font"
                  )}
                  onChange={handleThemeFontFamilyChange}
                >
                  <MenuItem value="system">
                    {t(
                      "settings.readingSettings.fonts.system",
                      "System Default"
                    )}
                  </MenuItem>
                  <MenuItem value="serif">
                    {t("settings.readingSettings.fonts.serif", "Serif")}
                  </MenuItem>
                  <MenuItem value="opendyslexic">
                    {t(
                      "settings.readingSettings.fonts.openDyslexic",
                      "OpenDyslexic"
                    )}
                  </MenuItem>
                </Select>
              </FormControl>

              {/* Theme Font Size */}
              <Box>
                <Typography gutterBottom>
                  {t(
                    "settings.readingSettings.appearance.fontSize",
                    "App Font Size"
                  )}
                  : {themeSettings.fontSize}px
                </Typography>
                <Slider
                  value={themeSettings.fontSize}
                  onChange={handleThemeFontSizeChange}
                  min={THEME_FONT_SIZE_RANGE.min}
                  max={THEME_FONT_SIZE_RANGE.max}
                  step={1}
                  marks={[
                    { value: THEME_FONT_SIZE_RANGE.min, label: "12px" },
                    { value: 16, label: "16px" },
                    { value: THEME_FONT_SIZE_RANGE.max, label: "24px" },
                  ]}
                  valueLabelDisplay="auto"
                  aria-label={t(
                    "settings.readingSettings.appearance.fontSize",
                    "App Font Size"
                  )}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Typography Settings */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t(
                "settings.readingSettings.typography.title",
                "Reader Typography"
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t(
                "settings.readingSettings.typography.description",
                "Configure text appearance in the book reader."
              )}
            </Typography>

            <Stack spacing={3}>
              {/* Reader Font Family */}
              <FormControl fullWidth>
                <InputLabel id="reader-font-family-label">
                  {t(
                    "settings.readingSettings.typography.fontFamily",
                    "Reader Font"
                  )}
                </InputLabel>
                <Select
                  labelId="reader-font-family-label"
                  id="reader-font-family"
                  value={readerSettings.typography.fontFamily}
                  label={t(
                    "settings.readingSettings.typography.fontFamily",
                    "Reader Font"
                  )}
                  onChange={handleFontFamilyChange}
                >
                  {fontFamilies.map((font) => (
                    <MenuItem key={font} value={font}>
                      {FONT_FAMILIES[font].name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Reader Font Size */}
              <Box>
                <Typography gutterBottom>
                  {t(
                    "settings.readingSettings.typography.fontSize",
                    "Reader Font Size"
                  )}
                  : {readerSettings.typography.fontSize}px
                </Typography>
                <Slider
                  value={readerSettings.typography.fontSize}
                  onChange={handleFontSizeChange}
                  min={FONT_SIZE_RANGE.min}
                  max={FONT_SIZE_RANGE.max}
                  step={FONT_SIZE_RANGE.step}
                  marks={[
                    { value: FONT_SIZE_RANGE.min, label: "12px" },
                    { value: 18, label: "18px" },
                    { value: FONT_SIZE_RANGE.max, label: "32px" },
                  ]}
                  valueLabelDisplay="auto"
                  aria-label={t(
                    "settings.readingSettings.typography.fontSize",
                    "Reader Font Size"
                  )}
                />
              </Box>

              {/* Line Height */}
              <Box>
                <Typography gutterBottom>
                  {t(
                    "settings.readingSettings.typography.lineHeight",
                    "Line Height"
                  )}
                  : {readerSettings.typography.lineHeight.toFixed(1)}
                </Typography>
                <Slider
                  value={readerSettings.typography.lineHeight}
                  onChange={handleLineHeightChange}
                  min={LINE_HEIGHT_RANGE.min}
                  max={LINE_HEIGHT_RANGE.max}
                  step={LINE_HEIGHT_RANGE.step}
                  marks={[
                    { value: LINE_HEIGHT_RANGE.min, label: "1.0" },
                    { value: 1.6, label: "1.6" },
                    { value: LINE_HEIGHT_RANGE.max, label: "3.0" },
                  ]}
                  valueLabelDisplay="auto"
                  aria-label={t(
                    "settings.readingSettings.typography.lineHeight",
                    "Line Height"
                  )}
                />
              </Box>

              {/* Text Alignment */}
              <FormControl fullWidth>
                <InputLabel id="text-align-label">
                  {t(
                    "settings.readingSettings.typography.textAlign",
                    "Text Alignment"
                  )}
                </InputLabel>
                <Select
                  labelId="text-align-label"
                  id="text-align"
                  value={readerSettings.typography.textAlign}
                  label={t(
                    "settings.readingSettings.typography.textAlign",
                    "Text Alignment"
                  )}
                  onChange={handleTextAlignChange}
                >
                  {textAlignments.map((align) => (
                    <MenuItem key={align} value={align}>
                      {t(
                        `settings.readingSettings.typography.alignments.${align}`,
                        align
                      )}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        {/* Layout Settings */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.readingSettings.layout.title", "Layout")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t(
                "settings.readingSettings.layout.description",
                "Configure the reader layout and navigation style."
              )}
            </Typography>

            <Stack spacing={3}>
              {/* Reading Mode */}
              <FormControl fullWidth>
                <InputLabel id="reading-mode-label">
                  {t(
                    "settings.readingSettings.layout.readingMode",
                    "Reading Mode"
                  )}
                </InputLabel>
                <Select
                  labelId="reading-mode-label"
                  id="reading-mode"
                  value={readerSettings.readingMode}
                  label={t(
                    "settings.readingSettings.layout.readingMode",
                    "Reading Mode"
                  )}
                  onChange={handleReadingModeChange}
                >
                  {readingModes.map((mode) => (
                    <MenuItem key={mode} value={mode}>
                      {t(`settings.readingSettings.layout.modes.${mode}`, mode)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Margins */}
              <Box>
                <Typography gutterBottom>
                  {t("settings.readingSettings.layout.margins", "Margins")}:{" "}
                  {readerSettings.margins}%
                </Typography>
                <Slider
                  value={readerSettings.margins}
                  onChange={handleMarginsChange}
                  min={MARGINS_RANGE.min}
                  max={MARGINS_RANGE.max}
                  step={MARGINS_RANGE.step}
                  marks={[
                    { value: MARGINS_RANGE.min, label: "0%" },
                    { value: 10, label: "10%" },
                    { value: MARGINS_RANGE.max, label: "20%" },
                  ]}
                  valueLabelDisplay="auto"
                  aria-label={t(
                    "settings.readingSettings.layout.margins",
                    "Margins"
                  )}
                />
              </Box>

              {/* Max Width */}
              <Box>
                <Typography gutterBottom>
                  {t("settings.readingSettings.layout.maxWidth", "Max Width")}:{" "}
                  {readerSettings.maxWidth === 0
                    ? t("settings.readingSettings.layout.fullWidth", "Full")
                    : `${readerSettings.maxWidth}px`}
                </Typography>
                <Slider
                  value={readerSettings.maxWidth}
                  onChange={handleMaxWidthChange}
                  min={MAX_WIDTH_RANGE.min}
                  max={MAX_WIDTH_RANGE.max}
                  step={MAX_WIDTH_RANGE.step}
                  marks={[
                    {
                      value: MAX_WIDTH_RANGE.min,
                      label: t(
                        "settings.readingSettings.layout.fullWidth",
                        "Full"
                      ),
                    },
                    { value: 800, label: "800px" },
                    { value: MAX_WIDTH_RANGE.max, label: "1200px" },
                  ]}
                  valueLabelDisplay="auto"
                  aria-label={t(
                    "settings.readingSettings.layout.maxWidth",
                    "Max Width"
                  )}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Display Features */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("settings.readingSettings.display.title", "Display Features")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t(
                "settings.readingSettings.display.description",
                "Toggle various display elements and reading aids."
              )}
            </Typography>

            <Divider sx={{ mb: 1 }} />

            <Stack divider={<Divider />}>
              {/* Show Page Numbers */}
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
                    {t(
                      "settings.readingSettings.display.showPageNumbers",
                      "Page Numbers"
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(
                      "settings.readingSettings.display.showPageNumbersDesc",
                      "Display page numbers at the bottom of the reader"
                    )}
                  </Typography>
                </Box>
                <Switch
                  checked={readerSettings.showPageNumbers}
                  onChange={handleBooleanToggle("showPageNumbers")}
                  inputProps={{ "aria-label": "Show page numbers" }}
                />
              </Box>

              {/* Show Progress Bar */}
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
                    {t(
                      "settings.readingSettings.display.showProgressBar",
                      "Progress Bar"
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(
                      "settings.readingSettings.display.showProgressBarDesc",
                      "Show reading progress bar at the top of the reader"
                    )}
                  </Typography>
                </Box>
                <Switch
                  checked={readerSettings.showProgressBar}
                  onChange={handleBooleanToggle("showProgressBar")}
                  inputProps={{ "aria-label": "Show progress bar" }}
                />
              </Box>

              {/* Show Estimated Time */}
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
                    {t(
                      "settings.readingSettings.display.showEstimatedTime",
                      "Estimated Read Time"
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(
                      "settings.readingSettings.display.showEstimatedTimeDesc",
                      "Display estimated time remaining to finish the book"
                    )}
                  </Typography>
                </Box>
                <Switch
                  checked={readerSettings.showEstimatedTime}
                  onChange={handleBooleanToggle("showEstimatedTime")}
                  inputProps={{ "aria-label": "Show estimated time" }}
                />
              </Box>

              {/* Highlight Current Paragraph */}
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
                    {t(
                      "settings.readingSettings.display.highlightParagraph",
                      "Highlight Current Paragraph"
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(
                      "settings.readingSettings.display.highlightParagraphDesc",
                      "Subtly highlight the paragraph you're currently reading"
                    )}
                  </Typography>
                </Box>
                <Switch
                  checked={readerSettings.highlightCurrentParagraph}
                  onChange={handleBooleanToggle("highlightCurrentParagraph")}
                  inputProps={{ "aria-label": "Highlight current paragraph" }}
                />
              </Box>

              {/* Bionic Reading */}
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
                    {t(
                      "settings.readingSettings.display.bionicReading",
                      "Bionic Reading"
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(
                      "settings.readingSettings.display.bionicReadingDesc",
                      "Bold the beginning of words to guide eye movement and improve reading speed"
                    )}
                  </Typography>
                </Box>
                <Switch
                  checked={readerSettings.bionicReadingEnabled}
                  onChange={handleBooleanToggle("bionicReadingEnabled")}
                  inputProps={{ "aria-label": "Enable bionic reading" }}
                />
              </Box>
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
                {t(
                  "settings.readingSettings.resetSettings",
                  "Reset to Defaults"
                )}
              </Typography>
              <Button
                variant="outlined"
                color="warning"
                onClick={handleResetClick}
              >
                {t(
                  "settings.readingSettings.resetSettings",
                  "Reset to Defaults"
                )}
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
                {t("common.cancel", "Cancel")}
              </Button>
              <Button color="warning" size="small" onClick={handleResetConfirm}>
                {t("common.confirm", "Confirm")}
              </Button>
            </Stack>
          }
        >
          {t(
            "settings.readingSettings.resetConfirm",
            "Are you sure you want to reset all reading settings to defaults?"
          )}
        </Alert>
      )}

      {/* Saved Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        message={t("settings.readingSettings.saved", "Reading settings saved")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}

export default SettingsReadingPage;
