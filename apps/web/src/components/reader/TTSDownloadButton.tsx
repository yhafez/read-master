/**
 * TTS Download Button Component
 *
 * Provides a button to download the current book as an audiobook
 * - Shows download status and progress
 * - Tier-based access (Pro/Scholar only)
 * - Quota management
 * - Error handling
 */

import { useState } from "react";
import {
  Button,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  LinearProgress,
  type SelectChangeEvent,
} from "@mui/material";
import {
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  useCreateTTSDownload,
  useTTSDownloadStatus,
  type AudioFormat,
} from "@/hooks/useTTSDownloads";

// ============================================================================
// Types
// ============================================================================

interface TTSDownloadButtonProps {
  bookId: string;
  bookTitle: string;
  bookText: string;
  userTier: "FREE" | "PRO" | "SCHOLAR";
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function TTSDownloadButton({
  bookId,
  bookTitle,
  bookText,
  userTier,
  disabled = false,
}: TTSDownloadButtonProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [format, setFormat] = useState<AudioFormat>("MP3");
  const [createdDownloadId, setCreatedDownloadId] = useState<string | null>(
    null
  );

  const createMutation = useCreateTTSDownload({
    onSuccess: (data) => {
      setCreatedDownloadId(data.download.id);
      // Keep dialog open to show progress
    },
    onError: () => {
      // Dialog will show error message
    },
  });

  // Poll status if we have a download in progress
  const { data: statusData } = useTTSDownloadStatus(createdDownloadId || "", {
    enabled: !!createdDownloadId,
  });

  const download = statusData?.download;

  // Check if user can download
  const canDownload = userTier === "PRO" || userTier === "SCHOLAR";

  const handleOpenDialog = () => {
    if (!canDownload) {
      return;
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    // Only allow closing if not currently creating
    if (!createMutation.isPending) {
      setDialogOpen(false);
      setCreatedDownloadId(null);
      createMutation.reset();
    }
  };

  const handleFormatChange = (event: SelectChangeEvent) => {
    setFormat(event.target.value as AudioFormat);
  };

  const handleCreate = () => {
    createMutation.mutate({
      bookId,
      bookTitle,
      text: bookText,
      format,
    });
  };

  const handleDownloadFile = () => {
    if (download?.downloadUrl) {
      window.open(download.downloadUrl, "_blank");
      handleCloseDialog();
    }
  };

  // Determine button state
  const getButtonState = () => {
    if (!canDownload) {
      return {
        icon: <DownloadIcon />,
        text: t("reader.tts.downloads.downloadBook"),
        color: "inherit" as const,
      };
    }

    if (download) {
      switch (download.status) {
        case "COMPLETED":
          return {
            icon: <CheckCircleIcon />,
            text: t("reader.tts.downloads.downloadComplete"),
            color: "success" as const,
          };
        case "FAILED":
          return {
            icon: <ErrorIcon />,
            text: t("reader.tts.downloads.downloadFailed"),
            color: "error" as const,
          };
        case "PROCESSING":
        case "PENDING":
          return {
            icon: <CircularProgress size={20} />,
            text: t("reader.tts.downloads.downloading"),
            color: "primary" as const,
          };
        default:
          return {
            icon: <DownloadIcon />,
            text: t("reader.tts.downloads.downloadBook"),
            color: "primary" as const,
          };
      }
    }

    return {
      icon: <DownloadIcon />,
      text: t("reader.tts.downloads.downloadBook"),
      color: "primary" as const,
    };
  };

  const buttonState = getButtonState();

  return (
    <>
      <Tooltip
        title={
          !canDownload ? t("reader.tts.downloads.errors.tierRequired") : ""
        }
      >
        <span>
          <Button
            startIcon={buttonState.icon}
            color={buttonState.color}
            onClick={handleOpenDialog}
            disabled={disabled || !canDownload}
            variant="outlined"
          >
            {buttonState.text}
          </Button>
        </span>
      </Tooltip>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("reader.tts.downloads.downloadBook")}</DialogTitle>
        <DialogContent>
          {/* Error Message */}
          {createMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createMutation.error?.message ||
                t("reader.tts.downloads.errors.unknownError")}
            </Alert>
          )}

          {/* Success - Download Ready */}
          {download?.status === "COMPLETED" && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                {t("reader.tts.downloads.downloadComplete")}
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                {t("reader.tts.downloads.expiresAt")}:{" "}
                {new Date(download.expiresAt).toLocaleDateString()}
              </Typography>
            </Alert>
          )}

          {/* Failed */}
          {download?.status === "FAILED" && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {download.errorMessage ||
                t("reader.tts.downloads.errors.processingFailed")}
            </Alert>
          )}

          {/* Processing */}
          {download &&
            (download.status === "PENDING" ||
              download.status === "PROCESSING") && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  {t("reader.tts.downloads.status." + download.status)}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={download.progress}
                  sx={{ my: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {download.progress}% ({download.processedChunks} /{" "}
                  {download.totalChunks} {t("common.chunks")})
                </Typography>
              </Box>
            )}

          {/* Format Selection - Only show before creation */}
          {!download && !createMutation.isPending && (
            <>
              <Typography variant="body2" color="text.secondary" paragraph>
                {t("reader.tts.downloads.createFirst")}
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>{t("reader.tts.downloads.format")}</InputLabel>
                <Select
                  value={format}
                  label={t("reader.tts.downloads.format")}
                  onChange={handleFormatChange}
                >
                  <MenuItem value="MP3">MP3</MenuItem>
                  <MenuItem value="OPUS">OPUS</MenuItem>
                  <MenuItem value="AAC">AAC</MenuItem>
                  <MenuItem value="FLAC">FLAC (Lossless)</MenuItem>
                </Select>
              </FormControl>

              {createMutation.data && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" display="block">
                    {t("reader.tts.downloads.estimatedCost")}: $
                    {createMutation.data.download.estimatedCost.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" display="block">
                    {t("reader.tts.downloads.quota.used")}:{" "}
                    {createMutation.data.quota.used} /{" "}
                    {createMutation.data.quota.limit}
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDialog}
            disabled={createMutation.isPending}
          >
            {t("common.cancel")}
          </Button>

          {download?.status === "COMPLETED" ? (
            <Button
              onClick={handleDownloadFile}
              variant="contained"
              startIcon={<DownloadIcon />}
            >
              {t("reader.tts.downloads.downloadFile")}
            </Button>
          ) : !download ? (
            <Button
              onClick={handleCreate}
              variant="contained"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? t("common.creating")
                : t("common.create")}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </>
  );
}
