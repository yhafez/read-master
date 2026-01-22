/**
 * TTS Downloads Management Page
 *
 * Manages audiobook downloads, including:
 * - Viewing all downloads (completed and in-progress)
 * - Playing audiobook files
 * - Deleting downloads
 * - Viewing download history
 */

import { useState, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  LinearProgress,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
} from "@mui/material";
import {
  PlayArrow as PlayIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";

/**
 * Download status
 */
type DownloadStatus = "pending" | "processing" | "completed" | "failed";

/**
 * TTS Download item
 */
interface TTSDownload {
  id: string;
  bookId: string;
  bookTitle: string;
  voiceId: string;
  voiceName: string;
  status: DownloadStatus;
  fileUrl?: string;
  fileSize?: number;
  duration?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Format duration in human-readable format
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/**
 * Fetch user's TTS downloads
 */
async function fetchDownloads(): Promise<TTSDownload[]> {
  const response = await axios.get<TTSDownload[]>("/api/tts/downloads");
  return response.data;
}

/**
 * Delete a TTS download
 */
async function deleteDownload(downloadId: string): Promise<void> {
  await axios.delete(`/api/tts/downloads/${downloadId}`);
}

/**
 * TTSDownloadsPage component
 */
export function TTSDownloadsPage(): React.ReactElement {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [downloadToDelete, setDownloadToDelete] = useState<string | null>(null);

  // Fetch downloads
  const {
    data: downloads = [],
    isLoading,
    error,
  } = useQuery<TTSDownload[], Error>({
    queryKey: ["tts-downloads"],
    queryFn: fetchDownloads,
    refetchInterval: 5000, // Poll every 5 seconds for status updates
  });

  // Delete download mutation
  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: deleteDownload,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tts-downloads"] });
      setDeleteDialogOpen(false);
      setDownloadToDelete(null);
    },
  });

  // Filter downloads by status
  const activeDownloads = downloads.filter(
    (d) => d.status === "pending" || d.status === "processing"
  );
  const completedDownloads = downloads.filter((d) => d.status === "completed");
  const failedDownloads = downloads.filter((d) => d.status === "failed");

  // Get current tab downloads
  const currentDownloads =
    activeTab === 0
      ? activeDownloads
      : activeTab === 1
        ? completedDownloads
        : failedDownloads;

  // Handle delete
  const handleDeleteClick = useCallback((downloadId: string) => {
    setDownloadToDelete(downloadId);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (downloadToDelete) {
      deleteMutation.mutate(downloadToDelete);
    }
  }, [downloadToDelete, deleteMutation]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setDownloadToDelete(null);
  }, []);

  // Handle play
  const handlePlay = useCallback((download: TTSDownload) => {
    if (download.fileUrl) {
      // Open audio file in new tab
      window.open(download.fileUrl, "_blank");
    }
  }, []);

  // Handle download
  const handleDownload = useCallback((download: TTSDownload) => {
    if (download.fileUrl) {
      // Trigger download
      const link = document.createElement("a");
      link.href = download.fileUrl;
      link.download = `${download.bookTitle} - ${download.voiceName}.mp3`;
      link.click();
    }
  }, []);

  // Render status chip
  const renderStatusChip = (status: DownloadStatus) => {
    switch (status) {
      case "pending":
        return (
          <Chip
            label={t("tts.downloads.pending") || "Pending"}
            size="small"
            color="default"
            icon={<InfoIcon />}
          />
        );
      case "processing":
        return (
          <Chip
            label={t("tts.downloads.processing") || "Processing"}
            size="small"
            color="primary"
            icon={<CircularProgress size={16} />}
          />
        );
      case "completed":
        return (
          <Chip
            label={t("tts.downloads.completed") || "Completed"}
            size="small"
            color="success"
            icon={<CompleteIcon />}
          />
        );
      case "failed":
        return (
          <Chip
            label={t("tts.downloads.failed") || "Failed"}
            size="small"
            color="error"
            icon={<ErrorIcon />}
          />
        );
    }
  };

  // Render download card
  const renderDownloadCard = (download: TTSDownload) => (
    <Card key={download.id} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {download.bookTitle}
          </Typography>
          {renderStatusChip(download.status)}
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {t("tts.downloads.voice")}: {download.voiceName}
        </Typography>

        <Typography variant="caption" color="text.secondary" display="block">
          {t("tts.downloads.requested")}:{" "}
          {formatDistanceToNow(new Date(download.createdAt), {
            addSuffix: true,
          })}
        </Typography>

        {download.completedAt && (
          <Typography variant="caption" color="text.secondary" display="block">
            {t("tts.downloads.completed")}:{" "}
            {formatDistanceToNow(new Date(download.completedAt), {
              addSuffix: true,
            })}
          </Typography>
        )}

        {download.fileSize && (
          <Typography variant="caption" color="text.secondary" display="block">
            {t("tts.downloads.size")}: {formatFileSize(download.fileSize)}
          </Typography>
        )}

        {download.duration && (
          <Typography variant="caption" color="text.secondary" display="block">
            {t("tts.downloads.duration")}: {formatDuration(download.duration)}
          </Typography>
        )}

        {download.error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {download.error}
          </Alert>
        )}

        {download.status === "processing" && (
          <LinearProgress sx={{ mt: 2 }} />
        )}
      </CardContent>

      <CardActions>
        {download.status === "completed" && download.fileUrl && (
          <>
            <Button
              size="small"
              startIcon={<PlayIcon />}
              onClick={() => handlePlay(download)}
            >
              {t("tts.downloads.play") || "Play"}
            </Button>
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              onClick={() => handleDownload(download)}
            >
              {t("tts.downloads.download") || "Download"}
            </Button>
          </>
        )}
        <Box sx={{ flex: 1 }} />
        <Tooltip title={t("common.delete") || "Delete"}>
          <IconButton
            size="small"
            onClick={() => handleDeleteClick(download.id)}
            disabled={deleteMutation.isPending}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t("tts.downloads.title") || "Audiobook Downloads"}
      </Typography>

      <Typography variant="body2" color="text.secondary" paragraph>
        {t("tts.downloads.description") ||
          "Manage your audiobook downloads. Create downloads from the reader by selecting a book and clicking the download button in the TTS controls."}
      </Typography>

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t("tts.downloads.error") ||
            "Failed to load downloads. Please try again."}
        </Alert>
      )}

      {/* Loading state */}
      {isLoading && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            py: 8,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Downloads list */}
      {!isLoading && (
        <>
          <Tabs
            value={activeTab}
            onChange={(_e, value: number) => setActiveTab(value)}
            sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
          >
            <Tab
              label={`${t("tts.downloads.active") || "Active"} (${activeDownloads.length})`}
            />
            <Tab
              label={`${t("tts.downloads.completed") || "Completed"} (${completedDownloads.length})`}
            />
            <Tab
              label={`${t("tts.downloads.failed") || "Failed"} (${failedDownloads.length})`}
            />
          </Tabs>

          {currentDownloads.length === 0 ? (
            <Box
              sx={{
                textAlign: "center",
                py: 8,
                color: "text.secondary",
              }}
            >
              <Typography variant="body1">
                {activeTab === 0
                  ? t("tts.downloads.noActive") ||
                    "No active downloads. Start a download from the reader."
                  : activeTab === 1
                    ? t("tts.downloads.noCompleted") ||
                      "No completed downloads yet."
                    : t("tts.downloads.noFailed") || "No failed downloads."}
              </Typography>
            </Box>
          ) : (
            <List>
              {currentDownloads.map((download) => (
                <ListItem key={download.id} disablePadding>
                  {renderDownloadCard(download)}
                </ListItem>
              ))}
            </List>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>
          {t("tts.downloads.deleteTitle") || "Delete Download?"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {t("tts.downloads.deleteMessage") ||
              "Are you sure you want to delete this download? This action cannot be undone."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleteMutation.isPending}>
            {t("common.cancel") || "Cancel"}
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending
              ? t("common.deleting") || "Deleting..."
              : t("common.delete") || "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TTSDownloadsPage;
