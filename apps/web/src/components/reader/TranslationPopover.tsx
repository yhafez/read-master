import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Popover,
  Select,
  type SelectChangeEvent,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  SwapHoriz as SwapIcon,
  Translate as TranslateIcon,
} from "@mui/icons-material";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  type TranslationResult,
  type TranslationSettings,
  type TranslationState,
  addTranslationToCache,
  buildMyMemoryUrl,
  createTranslationError,
  getLanguageByCode,
  getTranslationErrorMessage,
  getTranslationFromCache,
  isRtlLanguage,
  isValidTranslationText,
  loadTranslationSettings,
  parseMyMemoryResponse,
  prepareTextForTranslation,
  saveTranslationSettings,
  SUPPORTED_LANGUAGES,
  swapLanguages,
} from "./translationTypes";

/**
 * Props for TranslationPopover component
 */
export interface TranslationPopoverProps {
  /** Selected text to translate */
  selectedText: string;
  /** Anchor element for popover positioning */
  anchorEl: HTMLElement | null;
  /** Whether the popover is open */
  open: boolean;
  /** Callback when popover should close */
  onClose: () => void;
  /** Optional callback when translation completes */
  onTranslate?: (result: TranslationResult) => void;
}

/**
 * Translation popover component
 * Displays translation of selected text with language selection
 */
export function TranslationPopover({
  selectedText,
  anchorEl,
  open,
  onClose,
  onTranslate,
}: TranslationPopoverProps) {
  const { t } = useTranslation();

  // State
  const [settings, setSettings] = useState<TranslationSettings>(
    loadTranslationSettings
  );
  const [state, setState] = useState<TranslationState>("idle");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Prepared text for translation
  const preparedText = useMemo(
    () => prepareTextForTranslation(selectedText),
    [selectedText]
  );

  // Translate function
  const translate = useCallback(async () => {
    if (!isValidTranslationText(preparedText)) {
      setResult(
        createTranslationError(
          preparedText,
          settings.sourceLanguage,
          settings.targetLanguage,
          t("reader.translation.invalidText"),
          "invalid_text"
        )
      );
      setState("error");
      return;
    }

    // Check cache first
    const cached = getTranslationFromCache(
      preparedText,
      settings.sourceLanguage,
      settings.targetLanguage
    );
    if (cached) {
      setResult(cached);
      setState("success");
      onTranslate?.(cached);
      return;
    }

    setState("loading");

    try {
      const url = buildMyMemoryUrl(
        preparedText,
        settings.sourceLanguage,
        settings.targetLanguage
      );

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as unknown;
      const translationResult = parseMyMemoryResponse(
        preparedText,
        settings.sourceLanguage,
        settings.targetLanguage,
        data
      );

      setResult(translationResult);
      setState(translationResult.success ? "success" : "error");

      // Cache successful translations
      if (translationResult.success) {
        addTranslationToCache(
          preparedText,
          settings.sourceLanguage,
          settings.targetLanguage,
          translationResult
        );
        onTranslate?.(translationResult);
      }
    } catch (error) {
      const errorResult = createTranslationError(
        preparedText,
        settings.sourceLanguage,
        settings.targetLanguage,
        error instanceof Error ? error.message : "Network error",
        "network_error"
      );
      setResult(errorResult);
      setState("error");
    }
  }, [
    preparedText,
    settings.sourceLanguage,
    settings.targetLanguage,
    t,
    onTranslate,
  ]);

  // Auto-translate when popover opens
  useEffect(() => {
    if (open && preparedText) {
      translate();
    }
  }, [open, preparedText, translate]);

  // Reset state when popover closes
  useEffect(() => {
    if (!open) {
      setState("idle");
      setResult(null);
      setCopySuccess(false);
    }
  }, [open]);

  // Handle source language change
  const handleSourceChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      const newSettings = {
        ...settings,
        sourceLanguage: event.target.value,
      };
      setSettings(newSettings);
      saveTranslationSettings(newSettings);
      // Re-translate with new settings
      setState("idle");
      setResult(null);
    },
    [settings]
  );

  // Handle target language change
  const handleTargetChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      const newSettings = {
        ...settings,
        targetLanguage: event.target.value,
      };
      setSettings(newSettings);
      saveTranslationSettings(newSettings);
      // Re-translate with new settings
      setState("idle");
      setResult(null);
    },
    [settings]
  );

  // Handle language swap
  const handleSwapLanguages = useCallback(() => {
    if (settings.sourceLanguage === "auto") return;
    const newSettings = swapLanguages(settings);
    setSettings(newSettings);
    saveTranslationSettings(newSettings);
    // Re-translate with swapped settings
    setState("idle");
    setResult(null);
  }, [settings]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!result?.translatedText) return;
    try {
      await navigator.clipboard.writeText(result.translatedText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [result?.translatedText]);

  // Re-translate when settings change
  useEffect(() => {
    if (open && state === "idle" && preparedText) {
      translate();
    }
  }, [open, state, preparedText, translate]);

  // Get text direction for translated text
  const translatedTextDir = isRtlLanguage(settings.targetLanguage)
    ? "rtl"
    : "ltr";

  // Get source language display
  const sourceLang = getLanguageByCode(settings.sourceLanguage);
  const targetLang = getLanguageByCode(settings.targetLanguage);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
      slotProps={{
        paper: {
          sx: {
            maxWidth: 400,
            minWidth: 320,
            p: 0,
            overflow: "hidden",
          },
        },
      }}
    >
      <Paper elevation={0} sx={{ p: 0 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.default",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TranslateIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2">
              {t("reader.translation.title")}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Language Selectors */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <FormControl size="small" sx={{ minWidth: 100, flex: 1 }}>
            <InputLabel id="source-lang-label">
              {t("reader.translation.from")}
            </InputLabel>
            <Select
              labelId="source-lang-label"
              id="source-lang-select"
              value={settings.sourceLanguage}
              label={t("reader.translation.from")}
              onChange={handleSourceChange}
            >
              <MenuItem value="auto">
                {t("reader.translation.autoDetect")}
              </MenuItem>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip
            title={
              settings.sourceLanguage === "auto"
                ? t("reader.translation.cannotSwapAuto")
                : t("reader.translation.swapLanguages")
            }
          >
            <span>
              <IconButton
                size="small"
                onClick={handleSwapLanguages}
                disabled={settings.sourceLanguage === "auto"}
                aria-label={t("reader.translation.swapLanguages")}
              >
                <SwapIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <FormControl size="small" sx={{ minWidth: 100, flex: 1 }}>
            <InputLabel id="target-lang-label">
              {t("reader.translation.to")}
            </InputLabel>
            <Select
              labelId="target-lang-label"
              id="target-lang-select"
              value={settings.targetLanguage}
              label={t("reader.translation.to")}
              onChange={handleTargetChange}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Content */}
        <Box sx={{ p: 2 }}>
          {/* Original text (if showOriginal is enabled) */}
          {settings.showOriginal && (
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 0.5 }}
              >
                {t("reader.translation.original")} (
                {result?.detectedLanguage
                  ? getLanguageByCode(result.detectedLanguage)?.name ||
                    result.detectedLanguage
                  : sourceLang?.name || t("reader.translation.autoDetect")}
                )
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  p: 1.5,
                  bgcolor: "action.hover",
                  borderRadius: 1,
                  fontStyle: "italic",
                }}
              >
                {preparedText}
              </Typography>
            </Box>
          )}

          {/* Loading state */}
          {state === "loading" && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 3,
              }}
            >
              <CircularProgress size={24} sx={{ mr: 1.5 }} />
              <Typography color="text.secondary">
                {t("reader.translation.translating")}
              </Typography>
            </Box>
          )}

          {/* Error state */}
          {state === "error" && result && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {result.error ||
                getTranslationErrorMessage(result.errorType || "api_error")}
            </Alert>
          )}

          {/* Success state */}
          {state === "success" && result?.translatedText && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {t("reader.translation.translated")} ({targetLang?.name})
                </Typography>
                <Tooltip
                  title={
                    copySuccess
                      ? t("reader.translation.copied")
                      : t("reader.translation.copy")
                  }
                >
                  <IconButton
                    size="small"
                    onClick={handleCopy}
                    aria-label={t("reader.translation.copy")}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography
                variant="body1"
                dir={translatedTextDir}
                sx={{
                  p: 1.5,
                  bgcolor: "primary.50",
                  borderRadius: 1,
                  border: 1,
                  borderColor: "primary.200",
                }}
              >
                {result.translatedText}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Footer with attribution */}
        <Box
          sx={{
            px: 2,
            py: 1,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "background.default",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            component="a"
            href="https://mymemory.translated.net/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {t("reader.translation.poweredBy")}
          </Typography>
        </Box>
      </Paper>
    </Popover>
  );
}

export default TranslationPopover;
