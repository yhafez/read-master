/**
 * Edit Flashcard Dialog
 *
 * Dialog component for editing existing flashcards with front/back content,
 * type selection, tags, and optional book linking.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Autocomplete,
  Alert,
  CircularProgress,
  IconButton,
  FormHelperText,
  Stack,
  Divider,
  Skeleton,
} from "@mui/material";
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import { useBooks } from "@/hooks/useBooks";

import type { FlashcardType } from "./flashcardDeckTypes";
import {
  FLASHCARD_TYPE_CONFIGS,
  getCharacterCount,
  isNearLimit,
} from "./createFlashcardTypes";
import {
  type EditFlashcardDialogProps,
  type EditFlashcardFormData,
  type ValidationResult,
  type EditDialogState,
  type BookOption,
  type SubmissionError,
  type ExistingFlashcard,
  MAX_FRONT_LENGTH,
  MAX_BACK_LENGTH,
  MAX_TAGS,
  createEditFormData,
  createEmptyEditFormData,
  validateEditFormData,
  getEditFieldError,
  addEditTag,
  removeEditTag,
  hasFormChanged,
  buildUpdateRequest,
  parseUpdateApiError,
  parseLoadApiError,
  getBookOptionFromFlashcard,
} from "./editFlashcardTypes";

/**
 * EditFlashcardDialog component for editing existing flashcards.
 */
export function EditFlashcardDialog({
  open,
  onClose,
  onSuccess,
  flashcardId,
}: EditFlashcardDialogProps): React.ReactElement {
  const { t } = useTranslation();

  // Original data for change detection
  const [originalData, setOriginalData] = useState<ExistingFlashcard | null>(
    null
  );
  const [originalBookOption, setOriginalBookOption] =
    useState<BookOption | null>(null);

  // Form state
  const [formData, setFormData] = useState<EditFlashcardFormData>(
    createEmptyEditFormData()
  );
  const [tagInput, setTagInput] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [dialogState, setDialogState] = useState<EditDialogState>("loading");
  const [error, setError] = useState<SubmissionError | null>(null);

  // Load books for dropdown
  const { data: booksData, isLoading: booksLoading } = useBooks(
    { limit: 100 },
    { enabled: open }
  );

  // Convert books to options
  const bookOptions: BookOption[] = useMemo(() => {
    if (!booksData?.data) return [];
    return booksData.data.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl ?? null,
    }));
  }, [booksData]);

  // Load flashcard data when dialog opens
  useEffect(() => {
    if (open && flashcardId) {
      setDialogState("loading");
      setError(null);
      setValidation(null);
      setTagInput("");

      fetch(`/api/flashcards/${flashcardId}`)
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw { status: response.status, message: errorData.message };
          }
          return response.json();
        })
        .then((flashcard: ExistingFlashcard) => {
          setOriginalData(flashcard);
          setFormData(createEditFormData(flashcard));
          setOriginalBookOption(getBookOptionFromFlashcard(flashcard));
          setDialogState("idle");
        })
        .catch((err) => {
          const apiError = err as { status?: number; message?: string };
          setError(parseLoadApiError(apiError.status ?? 500, apiError.message));
          setDialogState("load-error");
        });
    } else if (!open) {
      // Reset state when closed
      setOriginalData(null);
      setOriginalBookOption(null);
      setFormData(createEmptyEditFormData());
      setValidation(null);
      setError(null);
      setTagInput("");
    }
  }, [open, flashcardId]);

  // Field change handlers
  const handleFrontChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value.length <= MAX_FRONT_LENGTH) {
        setFormData((prev) => ({ ...prev, front: value }));
        setValidation(null);
      }
    },
    []
  );

  const handleBackChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value.length <= MAX_BACK_LENGTH) {
        setFormData((prev) => ({ ...prev, back: value }));
        setValidation(null);
      }
    },
    []
  );

  const handleTypeChange = useCallback((e: { target: { value: string } }) => {
    setFormData((prev) => ({
      ...prev,
      type: e.target.value as FlashcardType,
    }));
  }, []);

  const handleBookChange = useCallback(
    (_event: unknown, value: BookOption | null) => {
      setFormData((prev) => ({ ...prev, bookId: value?.id ?? null }));
    },
    []
  );

  const handleAddTag = useCallback(() => {
    if (tagInput.trim() && formData.tags.length < MAX_TAGS) {
      setFormData((prev) => addEditTag(prev, tagInput));
      setTagInput("");
    }
  }, [tagInput, formData.tags.length]);

  const handleTagInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag]
  );

  const handleRemoveTag = useCallback((tag: string) => {
    setFormData((prev) => removeEditTag(prev, tag));
  }, []);

  // Form submission
  const handleSubmit = useCallback(async () => {
    // Validate
    const result = validateEditFormData(formData);
    setValidation(result);

    if (!result.valid) {
      return;
    }

    // Check if anything changed
    if (originalData && !hasFormChanged(originalData, formData)) {
      // No changes, just close
      onClose();
      return;
    }

    setDialogState("submitting");
    setError(null);

    try {
      const response = await fetch(`/api/flashcards/${formData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildUpdateRequest(formData)),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw { status: response.status, message: errorData.message };
      }

      const updatedCard = await response.json();

      setDialogState("success");

      // Notify parent after brief delay for success feedback
      setTimeout(() => {
        onSuccess?.(updatedCard);
        onClose();
      }, 1000);
    } catch (err) {
      const apiError = err as { status?: number; message?: string };
      setError(parseUpdateApiError(apiError.status ?? 500, apiError.message));
      setDialogState("error");
    }
  }, [formData, originalData, onSuccess, onClose]);

  // Close handler
  const handleClose = useCallback(() => {
    if (dialogState !== "submitting") {
      onClose();
    }
  }, [dialogState, onClose]);

  // Get selected book for display
  const selectedBook = useMemo(() => {
    // First try to find in book options
    const fromOptions = bookOptions.find((b) => b.id === formData.bookId);
    if (fromOptions) return fromOptions;
    // Fall back to original book option (for books not in first 100)
    if (originalBookOption && originalBookOption.id === formData.bookId) {
      return originalBookOption;
    }
    return null;
  }, [bookOptions, formData.bookId, originalBookOption]);

  // Get field errors
  const frontError = validation
    ? getEditFieldError(validation, "front")
    : undefined;
  const backError = validation
    ? getEditFieldError(validation, "back")
    : undefined;
  const tagsError = validation
    ? getEditFieldError(validation, "tags")
    : undefined;

  const isLoading = dialogState === "loading";
  const isSubmitting = dialogState === "submitting";
  const isSuccess = dialogState === "success";
  const isLoadError = dialogState === "load-error";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="edit-flashcard-title"
    >
      <DialogTitle id="edit-flashcard-title">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6" component="span">
            {t("flashcards.edit.title")}
          </Typography>
          <IconButton
            aria-label={t("common.close")}
            onClick={handleClose}
            disabled={isSubmitting}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading ? (
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Skeleton variant="rounded" height={100} />
            <Skeleton variant="rounded" height={140} />
            <Divider />
            <Skeleton variant="rounded" height={56} />
            <Skeleton variant="rounded" height={56} />
            <Skeleton variant="rounded" height={56} />
          </Stack>
        ) : isLoadError ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 4,
            }}
          >
            <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
              {error
                ? t(error.messageKey)
                : t("flashcards.edit.errors.loadUnknown")}
            </Alert>
            {error?.retryable && (
              <Button
                variant="outlined"
                onClick={() => {
                  // Re-trigger load by changing state
                  setDialogState("loading");
                  setError(null);
                }}
              >
                {t("common.retry")}
              </Button>
            )}
          </Box>
        ) : isSuccess ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 4,
            }}
          >
            <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h6">{t("flashcards.edit.success")}</Typography>
          </Box>
        ) : (
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Error Alert */}
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {t(error.messageKey)}
              </Alert>
            )}

            {/* Front Content */}
            <TextField
              label={t("flashcards.edit.front")}
              placeholder={t("flashcards.edit.frontPlaceholder")}
              multiline
              rows={3}
              value={formData.front}
              onChange={handleFrontChange}
              error={!!frontError}
              helperText={
                frontError
                  ? t(frontError.messageKey, frontError.params ?? {})
                  : getCharacterCount(formData.front, MAX_FRONT_LENGTH)
              }
              disabled={isSubmitting}
              fullWidth
              slotProps={{
                htmlInput: { maxLength: MAX_FRONT_LENGTH },
                formHelperText: {
                  sx: {
                    color: isNearLimit(formData.front, MAX_FRONT_LENGTH)
                      ? "warning.main"
                      : undefined,
                  },
                },
              }}
            />

            {/* Back Content */}
            <TextField
              label={t("flashcards.edit.back")}
              placeholder={t("flashcards.edit.backPlaceholder")}
              multiline
              rows={4}
              value={formData.back}
              onChange={handleBackChange}
              error={!!backError}
              helperText={
                backError
                  ? t(backError.messageKey, backError.params ?? {})
                  : getCharacterCount(formData.back, MAX_BACK_LENGTH)
              }
              disabled={isSubmitting}
              fullWidth
              slotProps={{
                htmlInput: { maxLength: MAX_BACK_LENGTH },
                formHelperText: {
                  sx: {
                    color: isNearLimit(formData.back, MAX_BACK_LENGTH)
                      ? "warning.main"
                      : undefined,
                  },
                },
              }}
            />

            <Divider />

            {/* Type Selector */}
            <FormControl fullWidth disabled={isSubmitting}>
              <InputLabel id="edit-flashcard-type-label">
                {t("flashcards.edit.type")}
              </InputLabel>
              <Select
                labelId="edit-flashcard-type-label"
                value={formData.type}
                onChange={handleTypeChange}
                label={t("flashcards.edit.type")}
              >
                {FLASHCARD_TYPE_CONFIGS.map((config) => (
                  <MenuItem key={config.value} value={config.value}>
                    <Box>
                      <Typography variant="body2">
                        {t(config.labelKey)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t(config.descriptionKey)}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Book Selector */}
            <Autocomplete
              value={selectedBook}
              onChange={handleBookChange}
              options={bookOptions}
              getOptionLabel={(option) => option.title}
              loading={booksLoading}
              disabled={isSubmitting}
              renderInput={(params) => (
                <TextField
                  inputRef={params.InputProps.ref}
                  inputProps={params.inputProps}
                  label={t("flashcards.edit.book")}
                  placeholder={t("flashcards.edit.bookPlaceholder")}
                  disabled={params.disabled}
                  fullWidth={params.fullWidth}
                  InputProps={{
                    className: params.InputProps.className,
                    startAdornment: params.InputProps.startAdornment,
                    endAdornment: (
                      <>
                        {booksLoading ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Typography variant="body2">{option.title}</Typography>
                    {option.author && (
                      <Typography variant="caption" color="text.secondary">
                        {option.author}
                      </Typography>
                    )}
                  </Box>
                </li>
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
            />

            {/* Tags Input */}
            <Box>
              <TextField
                label={t("flashcards.edit.tags")}
                placeholder={t("flashcards.edit.tagsPlaceholder")}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                disabled={isSubmitting || formData.tags.length >= MAX_TAGS}
                error={!!tagsError}
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: (
                      <Button
                        size="small"
                        onClick={handleAddTag}
                        disabled={
                          !tagInput.trim() ||
                          formData.tags.length >= MAX_TAGS ||
                          isSubmitting
                        }
                      >
                        {t("flashcards.edit.addTag")}
                      </Button>
                    ),
                  },
                }}
              />
              {tagsError && (
                <FormHelperText error>
                  {t(tagsError.messageKey, tagsError.params ?? {})}
                </FormHelperText>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block" }}
              >
                {t("flashcards.edit.tagsCount", {
                  count: formData.tags.length,
                  max: MAX_TAGS,
                })}
              </Typography>

              {/* Tags Display */}
              {formData.tags.length > 0 && (
                <Box
                  sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}
                >
                  {formData.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      onDelete={() => handleRemoveTag(tag)}
                      disabled={isSubmitting}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isLoading || isLoadError || isSubmitting || isSuccess}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
        >
          {isSubmitting
            ? t("flashcards.edit.saving")
            : t("flashcards.edit.saveButton")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditFlashcardDialog;
