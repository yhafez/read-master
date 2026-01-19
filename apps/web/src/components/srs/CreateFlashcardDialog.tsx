/**
 * Create Flashcard Dialog
 *
 * Dialog component for manually creating flashcards with front/back content,
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
} from "@mui/material";
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import { useBooks } from "@/hooks/useBooks";

import type { FlashcardType } from "./flashcardDeckTypes";
import {
  type CreateFlashcardDialogProps,
  type CreateFlashcardFormData,
  type ValidationResult,
  type DialogState,
  type BookOption,
  type SubmissionError,
  MAX_FRONT_LENGTH,
  MAX_BACK_LENGTH,
  MAX_TAGS,
  FLASHCARD_TYPE_CONFIGS,
  DEFAULT_FORM_DATA,
  createFormData,
  validateFormData,
  getFieldError,
  addTag,
  removeTag,
  loadPreferences,
  savePreferences,
  updateRecentTags,
  buildCreateRequest,
  parseCreateApiError,
  getCharacterCount,
  isNearLimit,
} from "./createFlashcardTypes";

/**
 * CreateFlashcardDialog component for manual flashcard creation.
 */
export function CreateFlashcardDialog({
  open,
  onClose,
  onSuccess,
  initialBookId,
  initialFront = "",
  initialBack = "",
}: CreateFlashcardDialogProps): React.ReactElement {
  const { t } = useTranslation();

  // Form state
  const [formData, setFormData] = useState<CreateFlashcardFormData>(() =>
    createFormData({
      front: initialFront,
      back: initialBack,
      bookId: initialBookId ?? null,
    })
  );
  const [tagInput, setTagInput] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [dialogState, setDialogState] = useState<DialogState>("idle");
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

  // Load preferences on mount
  useEffect(() => {
    if (open) {
      const prefs = loadPreferences();
      setFormData(
        createFormData({
          front: initialFront,
          back: initialBack,
          bookId: initialBookId ?? prefs.lastBookId ?? null,
          type: prefs.defaultType,
        })
      );
      setValidation(null);
      setDialogState("idle");
      setError(null);
      setTagInput("");
    }
  }, [open, initialFront, initialBack, initialBookId]);

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
      setFormData((prev) => addTag(prev, tagInput));
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
    setFormData((prev) => removeTag(prev, tag));
  }, []);

  // Form submission
  const handleSubmit = useCallback(async () => {
    // Validate
    const result = validateFormData(formData);
    setValidation(result);

    if (!result.valid) {
      return;
    }

    setDialogState("submitting");
    setError(null);

    try {
      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCreateRequest(formData)),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw { status: response.status, message: errorData.message };
      }

      const createdCard = await response.json();

      // Update preferences
      const prefs = loadPreferences();
      const updatedPrefs = {
        ...prefs,
        defaultType: formData.type,
        lastBookId: formData.bookId,
        recentTags: updateRecentTags(prefs, formData.tags).recentTags,
      };
      savePreferences(updatedPrefs);

      setDialogState("success");

      // Notify parent after brief delay for success feedback
      setTimeout(() => {
        onSuccess?.(createdCard);
        onClose();
      }, 1000);
    } catch (err) {
      const apiError = err as { status?: number; message?: string };
      setError(parseCreateApiError(apiError.status ?? 500, apiError.message));
      setDialogState("error");
    }
  }, [formData, onSuccess, onClose]);

  // Reset and close
  const handleClose = useCallback(() => {
    if (dialogState !== "submitting") {
      setFormData(DEFAULT_FORM_DATA);
      setValidation(null);
      setDialogState("idle");
      setError(null);
      onClose();
    }
  }, [dialogState, onClose]);

  // Get selected book for display
  const selectedBook = useMemo(
    () => bookOptions.find((b) => b.id === formData.bookId) ?? null,
    [bookOptions, formData.bookId]
  );

  // Get field errors
  const frontError = validation
    ? getFieldError(validation, "front")
    : undefined;
  const backError = validation ? getFieldError(validation, "back") : undefined;
  const tagsError = validation ? getFieldError(validation, "tags") : undefined;

  const isSubmitting = dialogState === "submitting";
  const isSuccess = dialogState === "success";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="create-flashcard-title"
    >
      <DialogTitle id="create-flashcard-title">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6" component="span">
            {t("flashcards.create.title")}
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
        {isSuccess ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 4,
            }}
          >
            <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h6">
              {t("flashcards.create.success")}
            </Typography>
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
              label={t("flashcards.create.front")}
              placeholder={t("flashcards.create.frontPlaceholder")}
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
              label={t("flashcards.create.back")}
              placeholder={t("flashcards.create.backPlaceholder")}
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
              <InputLabel id="flashcard-type-label">
                {t("flashcards.create.type")}
              </InputLabel>
              <Select
                labelId="flashcard-type-label"
                value={formData.type}
                onChange={handleTypeChange}
                label={t("flashcards.create.type")}
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
                  label={t("flashcards.create.book")}
                  placeholder={t("flashcards.create.bookPlaceholder")}
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
                label={t("flashcards.create.tags")}
                placeholder={t("flashcards.create.tagsPlaceholder")}
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
                        {t("flashcards.create.addTag")}
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
                {t("flashcards.create.tagsCount", {
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
          disabled={isSubmitting || isSuccess}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
        >
          {isSubmitting
            ? t("flashcards.create.creating")
            : t("flashcards.create.createButton")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateFlashcardDialog;
