/**
 * Import Video Modal Component
 *
 * Modal for importing videos via URL
 */

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import type { VideoSource } from "@/hooks/useVideos";

export interface ImportVideoModalProps {
  /** Whether modal is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Submit handler */
  onSubmit: (data: {
    title: string;
    description?: string;
    videoUrl: string;
    thumbnailUrl?: string;
    duration: number;
    source: VideoSource;
  }) => Promise<void>;
  /** Whether submit is in progress */
  isLoading?: boolean;
}

/**
 * ImportVideoModal - Modal for importing videos
 */
export function ImportVideoModal({
  open,
  onClose,
  onSubmit,
  isLoading = false,
}: ImportVideoModalProps) {
  const { t } = useTranslation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [source, setSource] = useState<VideoSource>("URL");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!title.trim()) {
      setError(t("videos.errors.titleRequired", "Title is required"));
      return;
    }
    if (!videoUrl.trim()) {
      setError(t("videos.errors.urlRequired", "Video URL is required"));
      return;
    }
    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum) || durationNum <= 0) {
      setError(
        t(
          "videos.errors.durationRequired",
          "Valid duration (in seconds) is required"
        )
      );
      return;
    }

    try {
      const submitData: {
        title: string;
        description?: string;
        videoUrl: string;
        thumbnailUrl?: string;
        duration: number;
        source: VideoSource;
      } = {
        title: title.trim(),
        videoUrl: videoUrl.trim(),
        duration: durationNum,
        source,
      };

      const trimmedDescription = description.trim();
      const trimmedThumbnail = thumbnailUrl.trim();
      if (trimmedDescription) {
        submitData.description = trimmedDescription;
      }
      if (trimmedThumbnail) {
        submitData.thumbnailUrl = trimmedThumbnail;
      }

      await onSubmit(submitData);

      // Reset form
      setTitle("");
      setDescription("");
      setVideoUrl("");
      setThumbnailUrl("");
      setDuration("");
      setSource("URL");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("videos.errors.importFailed", "Failed to import video")
      );
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{t("videos.importVideo", "Import Video")}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label={t("videos.title", "Title")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              fullWidth
              disabled={isLoading}
            />

            <TextField
              label={t("videos.videoUrl", "Video URL")}
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              required
              fullWidth
              disabled={isLoading}
              placeholder="https://example.com/video.mp4"
              helperText={t(
                "videos.urlHelp",
                "Direct link to video file (MP4, WebM, etc.)"
              )}
            />

            <TextField
              label={t("videos.duration", "Duration (seconds)")}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
              fullWidth
              disabled={isLoading}
              type="number"
              inputProps={{ min: 1 }}
              helperText={t(
                "videos.durationHelp",
                "Video duration in seconds (e.g., 3600 for 1 hour)"
              )}
            />

            <FormControl fullWidth disabled={isLoading}>
              <InputLabel>{t("videos.source", "Source")}</InputLabel>
              <Select
                value={source}
                onChange={(e) => setSource(e.target.value as VideoSource)}
                label={t("videos.source", "Source")}
              >
                <MenuItem value="URL">
                  {t("videos.sources.url", "Direct URL")}
                </MenuItem>
                <MenuItem value="YOUTUBE">
                  {t("videos.sources.youtube", "YouTube")}
                </MenuItem>
                <MenuItem value="VIMEO">
                  {t("videos.sources.vimeo", "Vimeo")}
                </MenuItem>
                <MenuItem value="UPLOAD">
                  {t("videos.sources.upload", "Uploaded")}
                </MenuItem>
                <MenuItem value="RECORDING">
                  {t("videos.sources.recording", "Recording")}
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              label={t("videos.thumbnailUrl", "Thumbnail URL (optional)")}
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              fullWidth
              disabled={isLoading}
              placeholder="https://example.com/thumbnail.jpg"
            />

            <TextField
              label={t("videos.description", "Description (optional)")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              disabled={isLoading}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isLoading}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
          >
            {isLoading
              ? t("videos.importing", "Importing...")
              : t("videos.import", "Import")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default ImportVideoModal;
