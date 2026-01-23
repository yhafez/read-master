/**
 * Video Detail Page
 *
 * Displays a single video with player, transcript, and annotations
 */

import { useState, useCallback, useRef } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  IconButton,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Alert,
  Skeleton,
  Menu,
  MenuItem,
  Tabs,
  Tab,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "@/router/routes";
import {
  useVideo,
  useUpdateVideoProgress,
  useMarkVideoCompleted,
  useDeleteVideo,
  useCreateVideoAnnotation,
  useDeleteVideoAnnotation,
} from "@/hooks/useVideos";
import { VideoPlayer } from "@/components/videos";

/**
 * Format seconds to readable time
 */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * VideoDetailPage - Video viewing page
 */
export function VideoDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // State
  const [activeTab, setActiveTab] = useState(0);
  const [newAnnotation, setNewAnnotation] = useState("");
  const [annotationTimestamp, setAnnotationTimestamp] = useState<number | null>(
    null
  );
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const playerPositionRef = useRef<number>(0);

  // Query
  const { data: video, isLoading, error } = useVideo(id ?? "");

  // Mutations
  const updateProgressMutation = useUpdateVideoProgress();
  const markCompletedMutation = useMarkVideoCompleted();
  const deleteVideoMutation = useDeleteVideo();
  const createAnnotationMutation = useCreateVideoAnnotation();
  const deleteAnnotationMutation = useDeleteVideoAnnotation();

  // Handlers
  const handleBack = () => {
    navigate(ROUTES.VIDEOS);
  };

  const handleProgressUpdate = useCallback(
    (position: number) => {
      playerPositionRef.current = position;
      if (id) {
        updateProgressMutation.mutate({
          videoId: id,
          data: { position, status: "IN_PROGRESS" },
        });
      }
    },
    [id, updateProgressMutation]
  );

  const handleComplete = useCallback(() => {
    if (id) {
      markCompletedMutation.mutate(id);
    }
  }, [id, markCompletedMutation]);

  const handleDelete = async () => {
    if (id) {
      await deleteVideoMutation.mutateAsync(id);
      navigate(ROUTES.VIDEOS);
    }
  };

  const handleAddAnnotation = async () => {
    if (!id || !newAnnotation.trim()) return;

    const timestamp = annotationTimestamp ?? playerPositionRef.current;

    await createAnnotationMutation.mutateAsync({
      videoId: id,
      data: {
        timestamp,
        content: newAnnotation.trim(),
      },
    });

    setNewAnnotation("");
    setAnnotationTimestamp(null);
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    if (!id) return;
    await deleteAnnotationMutation.mutateAsync({
      videoId: id,
      annotationId,
    });
  };

  const handleCaptureTimestamp = () => {
    setAnnotationTimestamp(playerPositionRef.current);
  };

  // Loading state
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={400} sx={{ mb: 2 }} />
        <Skeleton variant="text" height={40} width="60%" />
        <Skeleton variant="text" height={20} width="40%" />
      </Container>
    );
  }

  // Error state
  if (error || !video) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error?.message ?? t("videos.notFound", "Video not found")}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          {t("common.back", "Back")}
        </Button>
      </Container>
    );
  }

  const sortedAnnotations = [...video.annotations].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Back button */}
      <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 2 }}>
        {t("videos.backToLibrary", "Back to Library")}
      </Button>

      {/* Video player */}
      <Box sx={{ mb: 3 }}>
        <VideoPlayer
          videoUrl={video.videoUrl}
          title={video.title}
          posterUrl={video.thumbnailUrl}
          initialPosition={video.position}
          transcripts={video.transcript ? [video.transcript] : []}
          onProgressUpdate={handleProgressUpdate}
          onComplete={handleComplete}
        />
      </Box>

      {/* Video info */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h5" component="h1" gutterBottom>
            {video.title}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Chip
              label={t(
                `videos.status.${video.status.toLowerCase()}`,
                video.status
              )}
              size="small"
              color={
                video.status === "COMPLETED"
                  ? "success"
                  : video.status === "IN_PROGRESS"
                    ? "primary"
                    : "default"
              }
            />
            <Typography variant="body2" color="text.secondary">
              {formatTime(video.duration)}
            </Typography>
            {video.hasTranscript && (
              <Chip label={t("videos.transcript", "Transcript")} size="small" />
            )}
          </Box>
        </Box>

        <Box>
          {video.status !== "COMPLETED" && (
            <Button
              variant="outlined"
              startIcon={<CheckCircleIcon />}
              onClick={handleComplete}
              disabled={markCompletedMutation.isPending}
              sx={{ mr: 1 }}
            >
              {t("videos.markCompleted", "Mark Complete")}
            </Button>
          )}
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem onClick={() => setMenuAnchor(null)}>
              <EditIcon sx={{ mr: 1 }} />
              {t("common.edit", "Edit")}
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                handleDelete();
              }}
              sx={{ color: "error.main" }}
            >
              <DeleteIcon sx={{ mr: 1 }} />
              {t("common.delete", "Delete")}
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Description */}
      {video.description && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {video.description}
        </Typography>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Tabs for transcript and annotations */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label={t("videos.annotations", "Annotations")} />
          {video.transcript && (
            <Tab label={t("videos.transcript", "Transcript")} />
          )}
        </Tabs>

        {/* Annotations tab */}
        {activeTab === 0 && (
          <Box sx={{ p: 2 }}>
            {/* Add annotation form */}
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <TextField
                placeholder={t(
                  "videos.addAnnotationPlaceholder",
                  "Add a note at current position..."
                )}
                value={newAnnotation}
                onChange={(e) => setNewAnnotation(e.target.value)}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: annotationTimestamp !== null && (
                    <Chip
                      label={formatTime(annotationTimestamp)}
                      size="small"
                      onDelete={() => setAnnotationTimestamp(null)}
                      sx={{ mr: 1 }}
                    />
                  ),
                }}
              />
              <Button
                variant="outlined"
                onClick={handleCaptureTimestamp}
                size="small"
              >
                {t("videos.captureTime", "Capture Time")}
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddAnnotation}
                disabled={
                  !newAnnotation.trim() || createAnnotationMutation.isPending
                }
              >
                {t("common.add", "Add")}
              </Button>
            </Box>

            {/* Annotations list */}
            {sortedAnnotations.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={3}>
                {t("videos.noAnnotations", "No annotations yet")}
              </Typography>
            ) : (
              <List>
                {sortedAnnotations.map((annotation) => (
                  <ListItem key={annotation.id} divider>
                    <Box sx={{ mr: 2 }}>
                      <Chip
                        label={formatTime(annotation.timestamp)}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                    <ListItemText
                      primary={annotation.content}
                      secondary={new Date(
                        annotation.createdAt
                      ).toLocaleDateString()}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteAnnotation(annotation.id)}
                        disabled={deleteAnnotationMutation.isPending}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}

        {/* Transcript tab */}
        {activeTab === 1 && video.transcript && (
          <Box sx={{ p: 2, maxHeight: 400, overflow: "auto" }}>
            {video.transcript.cues.map((cue, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  gap: 2,
                  py: 1,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                }}
              >
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{ minWidth: 60 }}
                >
                  {formatTime(cue.startTime)}
                </Typography>
                <Typography variant="body2">{cue.text}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default VideoDetailPage;
