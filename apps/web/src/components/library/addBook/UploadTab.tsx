/**
 * Upload tab component for file upload with drag-and-drop
 */

import { useState, useCallback, useRef, type DragEvent } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  IconButton,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import {
  validateFile,
  validateTitle,
  getFormatFromFile,
  formatFileSize,
  ALLOWED_FILE_EXTENSIONS,
  MAX_FILE_SIZE_MB,
  INITIAL_UPLOAD_STATE,
  type TabPanelProps,
  type UploadTabState,
  type AddBookFormData,
} from "./types";

export type UploadTabProps = TabPanelProps;

/**
 * Upload tab with drag-and-drop file upload
 */
export function UploadTab({
  isActive,
  isLoading,
  onSubmit,
}: UploadTabProps): React.ReactElement | null {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadTabState>(INITIAL_UPLOAD_STATE);

  // Handle file selection (from input or drop)
  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setState((prev) => ({ ...prev, error: error.message, file: null }));
      return;
    }

    // Auto-fill title from filename (without extension)
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    const format = getFormatFromFile(file);

    setState((prev) => ({
      ...prev,
      file,
      title: prev.title || nameWithoutExt,
      error: null,
    }));

    // Log format for debugging (remove in production)
    if (format) {
      // Format detected successfully
    }
  }, []);

  // Handle input change
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Handle drag events
  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setState((prev) => ({ ...prev, isDragging: true }));
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setState((prev) => ({ ...prev, isDragging: false }));
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setState((prev) => ({ ...prev, isDragging: false }));

      const file = event.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Handle click to browse
  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle clear file
  const handleClearFile = useCallback(() => {
    setState(INITIAL_UPLOAD_STATE);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Handle text field changes
  const handleTitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setState((prev) => ({ ...prev, title: event.target.value, error: null }));
    },
    []
  );

  const handleAuthorChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setState((prev) => ({ ...prev, author: event.target.value }));
    },
    []
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    // Validate title
    const titleError = validateTitle(state.title);
    if (titleError) {
      setState((prev) => ({ ...prev, error: titleError.message }));
      return;
    }

    // Validate file is selected
    if (!state.file) {
      setState((prev) => ({
        ...prev,
        error: t("library.addBook.errors.noFile"),
      }));
      return;
    }

    const data: AddBookFormData = {
      title: state.title.trim(),
      author: state.author.trim(),
      file: state.file,
    };

    onSubmit(data);
  }, [state, onSubmit, t]);

  // Don't render if not active
  if (!isActive) {
    return null;
  }

  const canSubmit = state.file && state.title.trim() && !isLoading;

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      role="tabpanel"
      aria-labelledby="upload-tab"
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

      {/* Drop Zone */}
      <Paper
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={!state.file ? handleBrowseClick : undefined}
        sx={{
          p: 4,
          border: "2px dashed",
          borderColor: state.isDragging
            ? "primary.main"
            : state.file
              ? "success.main"
              : "divider",
          borderRadius: 2,
          bgcolor: state.isDragging
            ? "action.hover"
            : state.file
              ? "success.light"
              : "background.default",
          cursor: state.file ? "default" : "pointer",
          transition: "all 0.2s ease",
          "&:hover": state.file
            ? {}
            : {
                borderColor: "primary.main",
                bgcolor: "action.hover",
              },
        }}
      >
        {state.file ? (
          /* File Selected State */
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <FileIcon color="success" sx={{ fontSize: 48 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap>
                {state.file.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatFileSize(state.file.size)} &bull;{" "}
                {getFormatFromFile(state.file)?.toUpperCase() || "Unknown"}
              </Typography>
            </Box>
            <IconButton
              onClick={handleClearFile}
              aria-label={t("common.delete")}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        ) : (
          /* Empty Drop Zone State */
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <UploadIcon
              sx={{
                fontSize: 48,
                color: state.isDragging ? "primary.main" : "text.secondary",
              }}
            />
            <Typography variant="h6" color="text.primary">
              {state.isDragging
                ? t("library.addBook.dropHere")
                : t("library.addBook.dragOrClick")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("library.addBook.supportedFormats")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("library.addBook.maxSize", { size: MAX_FILE_SIZE_MB })}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_FILE_EXTENSIONS}
        onChange={handleInputChange}
        style={{ display: "none" }}
        aria-hidden="true"
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
        startIcon={<UploadIcon />}
        sx={{ alignSelf: "flex-end" }}
      >
        {isLoading
          ? t("library.addBook.uploading")
          : t("library.addBook.uploadButton")}
      </Button>
    </Box>
  );
}

export default UploadTab;
