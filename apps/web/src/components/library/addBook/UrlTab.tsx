/**
 * URL import tab component
 */

import { useState, useCallback } from "react";
import { Box, TextField, Button, Alert, Typography } from "@mui/material";
import { Link as LinkIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import {
  validateUrl,
  validateTitle,
  INITIAL_URL_STATE,
  type TabPanelProps,
  type UrlTabState,
  type AddBookFormData,
} from "./types";

export type UrlTabProps = TabPanelProps;

/**
 * URL import tab for importing content from web URLs
 */
export function UrlTab({
  isActive,
  isLoading,
  onSubmit,
}: UrlTabProps): React.ReactElement | null {
  const { t } = useTranslation();
  const [state, setState] = useState<UrlTabState>(INITIAL_URL_STATE);

  // Handle URL change
  const handleUrlChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setState((prev) => ({ ...prev, url: event.target.value, error: null }));
    },
    []
  );

  // Handle title change
  const handleTitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setState((prev) => ({ ...prev, title: event.target.value, error: null }));
    },
    []
  );

  // Handle author change
  const handleAuthorChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setState((prev) => ({ ...prev, author: event.target.value }));
    },
    []
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    // Validate URL
    const urlError = validateUrl(state.url);
    if (urlError) {
      setState((prev) => ({ ...prev, error: urlError.message }));
      return;
    }

    // Validate title
    const titleError = validateTitle(state.title);
    if (titleError) {
      setState((prev) => ({ ...prev, error: titleError.message }));
      return;
    }

    const data: AddBookFormData = {
      title: state.title.trim(),
      author: state.author.trim(),
      url: state.url.trim(),
    };

    onSubmit(data);
  }, [state, onSubmit]);

  // Don't render if not active
  if (!isActive) {
    return null;
  }

  const canSubmit = state.url.trim() && state.title.trim() && !isLoading;

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      role="tabpanel"
      aria-labelledby="url-tab"
    >
      {/* Error Alert */}
      {state.error && (
        <Alert
          severity="error"
          onClose={() => setState((prev) => ({ ...prev, error: null }))}
        >
          {state.error}
        </Alert>
      )}

      {/* Description */}
      <Typography variant="body2" color="text.secondary">
        {t("library.addBook.urlDescription")}
      </Typography>

      {/* URL Field */}
      <TextField
        label={t("library.addBook.urlLabel")}
        value={state.url}
        onChange={handleUrlChange}
        fullWidth
        required
        disabled={isLoading}
        placeholder="https://example.com/article"
        type="url"
        autoComplete="url"
        inputProps={{ maxLength: 2048 }}
      />

      {/* Title Field */}
      <TextField
        label={t("library.addBook.titleLabel")}
        value={state.title}
        onChange={handleTitleChange}
        fullWidth
        required
        disabled={isLoading}
        placeholder={t("library.addBook.titlePlaceholder")}
        inputProps={{ maxLength: 200 }}
      />

      {/* Author Field */}
      <TextField
        label={t("library.addBook.authorLabel")}
        value={state.author}
        onChange={handleAuthorChange}
        fullWidth
        disabled={isLoading}
        placeholder={t("library.addBook.authorPlaceholder")}
        inputProps={{ maxLength: 200 }}
      />

      {/* Submit Button */}
      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={!canSubmit}
        startIcon={<LinkIcon />}
        sx={{ alignSelf: "flex-end" }}
      >
        {isLoading
          ? t("library.addBook.importing")
          : t("library.addBook.importButton")}
      </Button>
    </Box>
  );
}

export default UrlTab;
