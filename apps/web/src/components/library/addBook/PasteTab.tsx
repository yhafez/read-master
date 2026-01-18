/**
 * Paste text tab component
 */

import { useState, useCallback } from "react";
import { Box, TextField, Button, Alert, Typography } from "@mui/material";
import { ContentPaste as PasteIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import {
  validatePastedContent,
  validateTitle,
  INITIAL_PASTE_STATE,
  type TabPanelProps,
  type PasteTabState,
  type AddBookFormData,
} from "./types";

export type PasteTabProps = TabPanelProps;

/**
 * Paste tab for adding content via text paste
 */
export function PasteTab({
  isActive,
  isLoading,
  onSubmit,
}: PasteTabProps): React.ReactElement | null {
  const { t } = useTranslation();
  const [state, setState] = useState<PasteTabState>(INITIAL_PASTE_STATE);

  // Handle content change
  const handleContentChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setState((prev) => ({
        ...prev,
        content: event.target.value,
        error: null,
      }));
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
    // Validate content
    const contentError = validatePastedContent(state.content);
    if (contentError) {
      setState((prev) => ({ ...prev, error: contentError.message }));
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
      content: state.content.trim(),
    };

    onSubmit(data);
  }, [state, onSubmit]);

  // Don't render if not active
  if (!isActive) {
    return null;
  }

  const canSubmit = state.content.trim() && state.title.trim() && !isLoading;
  const wordCount = state.content
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      role="tabpanel"
      aria-labelledby="paste-tab"
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
        {t("library.addBook.pasteDescription")}
      </Typography>

      {/* Content Field */}
      <TextField
        label={t("library.addBook.contentLabel")}
        value={state.content}
        onChange={handleContentChange}
        fullWidth
        required
        disabled={isLoading}
        multiline
        minRows={6}
        maxRows={12}
        placeholder={t("library.addBook.contentPlaceholder")}
        helperText={
          state.content.trim()
            ? t("library.addBook.wordCount", { count: wordCount })
            : t("library.addBook.minLength")
        }
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
        startIcon={<PasteIcon />}
        sx={{ alignSelf: "flex-end" }}
      >
        {isLoading
          ? t("library.addBook.saving")
          : t("library.addBook.saveButton")}
      </Button>
    </Box>
  );
}

export default PasteTab;
