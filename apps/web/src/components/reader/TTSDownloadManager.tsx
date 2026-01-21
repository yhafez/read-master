/**
 * TTS Download Manager Component
 *
 * Displays a list of all TTS downloads for the current user
 * - Shows download status and progress
 * - Allows downloading completed files
 * - Supports deleting downloads
 * - Displays quota information
 * - Real-time status updates
 */

import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  LinearProgress,
  Chip,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  useTTSDownloads,
  useDeleteTTSDownload,
  type DownloadStatus,
} from "@/hooks/useTTSDownloads";

// ============================================================================
// Types
// ============================================================================

interface TTSDownloadManagerProps {
  userTier: "FREE" | "PRO" | "SCHOLAR";
}

// ============================================================================
// Component
// ============================================================================

export function TTSDownloadManager({ userTier }: TTSDownloadManagerProps) {
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [downloadToDelete, setDownloadToDelete] = useState<string | null>(null);

  // Fetch downloads with auto-refresh for processing downloads
  const { data, isLoading, error, refetch } = useTTSDownloads(
    { limit: 50 },
    {
      refetchInterval: (query) => {
        const downloads = query.state.data?.downloads || [];
        const hasProcessing = downloads.some(
          (d) => d.status === "PENDING" || d.status === "PROCESSING"
        );
        // Poll every 5 seconds if any downloads are processing
        return hasProcessing ? 5000 : false;
      },
    }
  );

  const deleteMutation = useDeleteTTSDownload({
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setDownloadToDelete(null);
    },
  });

  const downloads = data?.downloads || [];
  const quota = data?.quota;

  const handleDeleteClick = (downloadId: string) => {
    setDownloadToDelete(downloadId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (downloadToDelete) {
      deleteMutation.mutate(downloadToDelete);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDownloadToDelete(null);
  };

  const handleDownloadFile = (downloadUrl: string) => {
    window.open(downloadUrl, "_blank");
  };

  // Get status chip color and icon
  const getStatusDisplay = (status: DownloadStatus) => {
    switch (status) {
      case "COMPLETED":
        return {
          color: "success" as const,
          icon: <CheckCircleIcon fontSize="small" />,
          label: t("reader.tts.downloads.status.COMPLETED"),
        };
      case "PROCESSING":
        return {
          color: "primary" as const,
          icon: <HourglassEmptyIcon fontSize="small" />,
          label: t("reader.tts.downloads.status.PROCESSING"),
        };
      case "PENDING":
        return {
          color: "default" as const,
          icon: <HourglassEmptyIcon fontSize="small" />,
          label: t("reader.tts.downloads.status.PENDING"),
        };
      case "FAILED":
        return {
          color: "error" as const,
          icon: <ErrorIcon fontSize="small" />,
          label: t("reader.tts.downloads.status.FAILED"),
        };
      case "CANCELLED":
        return {
          color: "default" as const,
          icon: <CancelIcon fontSize="small" />,
          label: t("reader.tts.downloads.status.CANCELLED"),
        };
      default:
        return {
          color: "default" as const,
          icon: null,
          label: status,
        };
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <Box>
      {/* Header with Quota */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3 }}
      >
        <Typography variant="h6">{t("reader.tts.downloads.title")}</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          {quota && (
            <Chip
              label={t("reader.tts.downloads.quota.used", {
                used: quota.used,
                limit: quota.limit === "unlimited" ? "∞" : quota.limit,
              })}
              color={
                typeof quota.remaining === "number" && quota.remaining <= 1
                  ? "warning"
                  : "default"
              }
              size="small"
            />
          )}
          <IconButton onClick={() => refetch()} size="small" disabled={isLoading}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Stack>

      {/* Upgrade message for free tier */}
      {userTier === "FREE" && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t("reader.tts.downloads.quota.upgradeRequired")}
        </Alert>
      )}

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error.message || t("reader.tts.downloads.errors.unknownError")}
        </Alert>
      )}

      {/* Loading state */}
      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <LinearProgress sx={{ width: "50%" }} />
        </Box>
      )}

      {/* Empty state */}
      {!isLoading && downloads.length === 0 && (
        <Card>
          <CardContent>
            <Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
              <DownloadIcon sx={{ fontSize: 48, color: "text.secondary" }} />
              <Typography variant="h6" color="text.secondary">
                {t("reader.tts.downloads.noDownloads")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("reader.tts.downloads.createFirst")}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Downloads list */}
      {!isLoading && downloads.length > 0 && (
        <Stack spacing={2}>
          {downloads.map((download) => {
            const statusDisplay = getStatusDisplay(download.status);

            return (
              <Card key={download.id} variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    {/* Header */}
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {download.bookTitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(download.createdAt), "PPp")}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} alignItems="center">
                        {statusDisplay.icon}
                        <Chip
                          label={statusDisplay.label}
                          color={statusDisplay.color}
                          size="small"
                        />
                        {download.status === "COMPLETED" && (
                          <Tooltip title={t("reader.tts.downloads.downloadFile")}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() =>
                                download.downloadUrl &&
                                handleDownloadFile(download.downloadUrl)
                              }
                              disabled={!download.downloadUrl}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title={t("reader.tts.downloads.deleteDownload")}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(download.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>

                    {/* Progress bar for processing downloads */}
                    {(download.status === "PENDING" ||
                      download.status === "PROCESSING") && (
                      <Box>
                        <LinearProgress
                          variant="determinate"
                          value={download.progress}
                          sx={{ mb: 0.5 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {t("reader.tts.downloads.progress")}: {download.progress}% (
                          {download.processedChunks} / {download.totalChunks})
                        </Typography>
                      </Box>
                    )}

                    {/* Error message */}
                    {download.status === "FAILED" && download.errorMessage && (
                      <Alert severity="error" sx={{ py: 0.5 }}>
                        <Typography variant="caption">
                          {download.errorMessage}
                        </Typography>
                      </Alert>
                    )}

                    <Divider />

                    {/* Details */}
                    <Stack
                      direction="row"
                      spacing={3}
                      sx={{ flexWrap: "wrap" }}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t("reader.tts.downloads.format")}
                        </Typography>
                        <Typography variant="body2">{download.format}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Voice
                        </Typography>
                        <Typography variant="body2">{download.voice}</Typography>
                      </Box>
                      {download.fileSize && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Size
                          </Typography>
                          <Typography variant="body2">
                            {formatFileSize(download.fileSize)}
                          </Typography>
                        </Box>
                      )}
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t("reader.tts.downloads.estimatedCost")}
                        </Typography>
                        <Typography variant="body2">
                          ${download.estimatedCost.toFixed(2)}
                        </Typography>
                      </Box>
                      {download.status === "COMPLETED" && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t("reader.tts.downloads.expiresAt")}
                          </Typography>
                          <Typography variant="body2">
                            {format(new Date(download.expiresAt), "PP")}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>{t("reader.tts.downloads.deleteDownload")}</DialogTitle>
        <DialogContent>
          <Typography>{t("reader.tts.downloads.confirmDelete")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>{t("common.cancel")}</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? t("common.deleting") : t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
