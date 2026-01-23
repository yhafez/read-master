/**
 * ForumImageUpload Component
 *
 * Provides image upload functionality for forum posts and replies.
 * Handles file selection, validation, upload progress, and error states.
 */

import React, { useRef, useState, useCallback } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  IconButton,
  Tooltip,
  Paper,
  Stack,
} from "@mui/material";
import {
  Image as ImageIcon,
  Close as CloseIcon,
  CloudUpload as UploadIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

// ============================================================================
// Constants
// ============================================================================

/** Maximum image file size: 5MB */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** Maximum number of images per post/reply */
export const MAX_IMAGES_PER_POST = 5;

/** Allowed MIME types for images */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** Allowed file extensions for display */
export const ALLOWED_EXTENSIONS = ["JPG", "PNG", "WebP", "GIF"];

// ============================================================================
// Types
// ============================================================================

export interface UploadedImage {
  /** Unique ID for this image */
  id: string;
  /** Public URL of the uploaded image */
  url: string;
  /** R2 storage key */
  key: string;
  /** Original filename */
  filename: string;
  /** MIME type */
  contentType: string;
  /** File size in bytes */
  size: number;
}

export interface ForumImageUploadProps {
  /** Callback when an image is uploaded successfully */
  onImageUploaded: (image: UploadedImage) => void;
  /** Whether the upload is disabled */
  disabled?: boolean;
  /** Current number of uploaded images (for limit checking) */
  currentImageCount?: number;
  /** Whether to show as icon button (for toolbar) or full button */
  variant?: "icon" | "button";
}

export interface ImageUploadState {
  /** Whether upload is in progress */
  isUploading: boolean;
  /** Error message if upload failed */
  error: string | null;
  /** Progress percentage (0-100) */
  progress: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate an image file before upload
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  if (
    !ALLOWED_IMAGE_TYPES.includes(
      file.type as (typeof ALLOWED_IMAGE_TYPES)[number]
    )
  ) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE) {
    const maxSizeMB = Math.round(MAX_IMAGE_SIZE / (1024 * 1024));
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSizeMB}MB`,
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      error: "File is empty",
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Create a unique ID for tracking uploaded images
 */
export function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Component
// ============================================================================

export function ForumImageUpload({
  onImageUploaded,
  disabled = false,
  currentImageCount = 0,
  variant = "icon",
}: ForumImageUploadProps): React.ReactElement {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImageUploadState>({
    isUploading: false,
    error: null,
    progress: 0,
  });

  const isAtLimit = currentImageCount >= MAX_IMAGES_PER_POST;
  const isDisabled = disabled || state.isUploading || isAtLimit;

  // Handle file selection
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Reset input so same file can be selected again
      event.target.value = "";

      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setState((prev) => ({ ...prev, error: validation.error ?? null }));
        return;
      }

      // Clear previous error
      setState({ isUploading: true, error: null, progress: 0 });

      try {
        // Create form data
        const formData = new FormData();
        formData.append("image", file);

        // Upload to API
        const response = await fetch("/api/forum/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            (errorData as { error?: string }).error ||
              `Upload failed: ${response.status}`
          );
        }

        const result = (await response.json()) as {
          success: boolean;
          url: string;
          key: string;
          filename: string;
          contentType: string;
          size: number;
        };

        if (!result.success) {
          throw new Error("Upload failed");
        }

        // Create uploaded image object
        const uploadedImage: UploadedImage = {
          id: generateImageId(),
          url: result.url,
          key: result.key,
          filename: result.filename,
          contentType: result.contentType,
          size: result.size,
        };

        // Notify parent
        onImageUploaded(uploadedImage);

        // Reset state
        setState({ isUploading: false, error: null, progress: 100 });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        setState({ isUploading: false, error: errorMessage, progress: 0 });
      }
    },
    [onImageUploaded]
  );

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Trigger file input click
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Get tooltip text
  const getTooltipText = (): string => {
    if (isAtLimit) {
      return t("forum.images.limitReached", {
        max: MAX_IMAGES_PER_POST,
        defaultValue: `Maximum ${MAX_IMAGES_PER_POST} images allowed`,
      });
    }
    if (state.isUploading) {
      return t("forum.images.uploading", { defaultValue: "Uploading..." });
    }
    return t("forum.images.addImage", { defaultValue: "Add image" });
  };

  return (
    <Box>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        onChange={handleFileSelect}
        style={{ display: "none" }}
        disabled={isDisabled}
      />

      {/* Upload button/icon */}
      {variant === "icon" ? (
        <Tooltip title={getTooltipText()}>
          <span>
            <IconButton
              size="small"
              onClick={handleClick}
              disabled={isDisabled}
              aria-label={t("forum.images.addImage", {
                defaultValue: "Add image",
              })}
            >
              {state.isUploading ? (
                <CircularProgress size={20} />
              ) : (
                <ImageIcon />
              )}
            </IconButton>
          </span>
        </Tooltip>
      ) : (
        <Button
          variant="outlined"
          startIcon={
            state.isUploading ? <CircularProgress size={20} /> : <UploadIcon />
          }
          onClick={handleClick}
          disabled={isDisabled}
        >
          {state.isUploading
            ? t("forum.images.uploading", { defaultValue: "Uploading..." })
            : t("forum.images.uploadImage", { defaultValue: "Upload Image" })}
        </Button>
      )}

      {/* Error display */}
      {state.error && (
        <Paper
          elevation={1}
          sx={{
            mt: 1,
            p: 1,
            backgroundColor: "error.light",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="caption" color="error.contrastText" flex={1}>
              {state.error}
            </Typography>
            <IconButton
              size="small"
              onClick={clearError}
              sx={{ color: "error.contrastText" }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}

// ============================================================================
// ImagePreviewList Component
// ============================================================================

export interface ImagePreviewListProps {
  /** List of uploaded images */
  images: UploadedImage[];
  /** Callback to remove an image */
  onRemove: (imageId: string) => void;
  /** Whether removal is disabled */
  disabled?: boolean;
}

/**
 * Displays a list of uploaded images with remove buttons
 */
export function ImagePreviewList({
  images,
  onRemove,
  disabled = false,
}: ImagePreviewListProps): React.ReactElement | null {
  const { t } = useTranslation();

  if (images.length === 0) {
    return null;
  }

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
      {images.map((image) => (
        <Paper
          key={image.id}
          elevation={1}
          sx={{
            position: "relative",
            width: 80,
            height: 80,
            overflow: "hidden",
            borderRadius: 1,
          }}
        >
          <Box
            component="img"
            src={image.url}
            alt={image.filename}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          {!disabled && (
            <IconButton
              size="small"
              onClick={() => onRemove(image.id)}
              aria-label={t("forum.images.removeImage", {
                defaultValue: "Remove image",
              })}
              sx={{
                position: "absolute",
                top: 2,
                right: 2,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                color: "white",
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                },
                padding: "2px",
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Paper>
      ))}
    </Stack>
  );
}

export default ForumImageUpload;
