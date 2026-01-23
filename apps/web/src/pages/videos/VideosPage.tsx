/**
 * Videos Page
 *
 * Displays the user's video library with search and filtering
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Grid,
  Pagination,
  Skeleton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import AddIcon from "@mui/icons-material/Add";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  useVideos,
  useImportVideo,
  type VideoStatus,
  type VideoListFilters,
} from "@/hooks/useVideos";
import { VideoCard, ImportVideoModal } from "@/components/videos";
import { routeHelpers } from "@/router/routes";

/**
 * VideosPage - Video library view
 */
export function VideosPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // State
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<VideoListFilters>({
    page: 1,
    limit: 12,
    sortBy: "createdAt",
    sortDirection: "desc",
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Query
  const {
    data: videosData,
    isLoading,
    error,
  } = useVideos({ ...filters, search: filters.search });

  // Mutations
  const importVideoMutation = useImportVideo();

  // Debounced search using useRef and setTimeout
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        search: value || undefined,
        page: 1,
      }));
    }, 300);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleStatusFilter = (status: VideoStatus | "ALL") => {
    setFilters((prev) => ({
      ...prev,
      status: status === "ALL" ? undefined : status,
      page: 1,
    }));
  };

  const handleSortChange = (sortBy: VideoListFilters["sortBy"]) => {
    setFilters((prev) => ({
      ...prev,
      sortBy,
      page: 1,
    }));
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleVideoClick = useCallback(
    (videoId: string) => {
      navigate(routeHelpers.video(videoId));
    },
    [navigate]
  );

  const handleImport = async (
    data: Parameters<typeof importVideoMutation.mutateAsync>[0]
  ) => {
    await importVideoMutation.mutateAsync(data);
  };

  const videos = videosData?.data ?? [];
  const pagination = videosData?.pagination;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          {t("videos.library", "Video Library")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setImportModalOpen(true)}
        >
          {t("videos.importVideo", "Import Video")}
        </Button>
      </Box>

      {/* Filters */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          mb: 3,
          alignItems: "center",
        }}
      >
        {/* Search */}
        <TextField
          placeholder={t("videos.searchPlaceholder", "Search videos...")}
          value={searchInput}
          onChange={handleSearchChange}
          size="small"
          sx={{ minWidth: 250 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        {/* Status filter */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>{t("videos.status", "Status")}</InputLabel>
          <Select
            value={filters.status ?? "ALL"}
            onChange={(e) =>
              handleStatusFilter(e.target.value as VideoStatus | "ALL")
            }
            label={t("videos.status", "Status")}
          >
            <MenuItem value="ALL">{t("common.all", "All")}</MenuItem>
            <MenuItem value="NEW">{t("videos.status.new", "New")}</MenuItem>
            <MenuItem value="IN_PROGRESS">
              {t("videos.status.in_progress", "In Progress")}
            </MenuItem>
            <MenuItem value="COMPLETED">
              {t("videos.status.completed", "Completed")}
            </MenuItem>
            <MenuItem value="BOOKMARKED">
              {t("videos.status.bookmarked", "Bookmarked")}
            </MenuItem>
          </Select>
        </FormControl>

        {/* Sort */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{t("videos.sortBy", "Sort by")}</InputLabel>
          <Select
            value={filters.sortBy ?? "createdAt"}
            onChange={(e) =>
              handleSortChange(e.target.value as VideoListFilters["sortBy"])
            }
            label={t("videos.sortBy", "Sort by")}
          >
            <MenuItem value="createdAt">
              {t("videos.sort.dateAdded", "Date Added")}
            </MenuItem>
            <MenuItem value="title">{t("videos.sort.title", "Title")}</MenuItem>
            <MenuItem value="duration">
              {t("videos.sort.duration", "Duration")}
            </MenuItem>
            <MenuItem value="lastWatchedAt">
              {t("videos.sort.lastWatched", "Last Watched")}
            </MenuItem>
          </Select>
        </FormControl>

        {/* View toggle */}
        <Box sx={{ flex: 1 }} />
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, value) => value && setViewMode(value)}
          size="small"
        >
          <ToggleButton value="grid">
            <ViewModuleIcon />
          </ToggleButton>
          <ToggleButton value="list">
            <ViewListIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error.message}
        </Alert>
      )}

      {/* Loading state */}
      {isLoading && (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid
              item
              xs={12}
              sm={viewMode === "grid" ? 6 : 12}
              md={viewMode === "grid" ? 4 : 12}
              key={i}
            >
              <Skeleton
                variant="rectangular"
                height={viewMode === "grid" ? 200 : 90}
                sx={{ borderRadius: 1 }}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty state */}
      {!isLoading && videos.length === 0 && (
        <Box
          sx={{
            textAlign: "center",
            py: 8,
            color: "text.secondary",
          }}
        >
          <VideoLibraryIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" gutterBottom>
            {filters.search
              ? t("videos.noSearchResults", "No videos found")
              : t("videos.noVideos", "No videos yet")}
          </Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>
            {filters.search
              ? t("videos.tryDifferentSearch", "Try a different search term")
              : t(
                  "videos.importFirst",
                  "Import your first video to get started"
                )}
          </Typography>
          {!filters.search && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setImportModalOpen(true)}
            >
              {t("videos.importVideo", "Import Video")}
            </Button>
          )}
        </Box>
      )}

      {/* Video grid/list */}
      {!isLoading && videos.length > 0 && (
        <>
          <Grid container spacing={2}>
            {videos.map((video) => (
              <Grid
                item
                xs={12}
                sm={viewMode === "grid" ? 6 : 12}
                md={viewMode === "grid" ? 4 : 12}
                key={video.id}
              >
                <VideoCard
                  video={video}
                  onClick={() => handleVideoClick(video.id)}
                  variant={viewMode}
                />
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <Pagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Import modal */}
      <ImportVideoModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSubmit={handleImport}
        isLoading={importVideoMutation.isPending}
      />
    </Container>
  );
}

export default VideosPage;
