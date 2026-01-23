/**
 * Podcasts Page
 *
 * Library view for subscribed podcasts with:
 * - Grid/list view of podcasts
 * - Search and filter
 * - Subscribe to new podcasts
 * - View podcast details/episodes
 */

import { useState, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  CircularProgress,
  Alert,
  Paper,
  Pagination,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import PodcastsIcon from "@mui/icons-material/Podcasts";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePodcasts, type PodcastListFilters } from "@/hooks/usePodcasts";
import { PodcastCard, SubscribeToPodcastModal } from "@/components/podcasts";

const ITEMS_PER_PAGE = 12;

/**
 * PodcastsPage - Main podcast library view
 */
export function PodcastsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // State
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);

  // Build filters
  const filters: PodcastListFilters = {
    search: search || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  };

  // Fetch podcasts
  const { data, isLoading, error, refetch } = usePodcasts(filters);

  const podcasts = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  // Handlers
  const handleViewModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newMode: "grid" | "list" | null) => {
      if (newMode) setViewMode(newMode);
    },
    []
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(event.target.value);
      setPage(1); // Reset to first page on search
    },
    []
  );

  const handlePageChange = useCallback(
    (_event: React.ChangeEvent<unknown>, value: number) => {
      setPage(value);
    },
    []
  );

  const handlePodcastClick = useCallback(
    (podcastId: string) => {
      navigate(`/podcasts/${podcastId}`);
    },
    [navigate]
  );

  const handleSubscribeSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {t("podcasts.title", "Podcasts")}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t(
              "podcasts.description",
              "Listen and learn with your favorite podcasts"
            )}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsSubscribeModalOpen(true)}
        >
          {t("podcasts.subscribe", "Subscribe")}
        </Button>
      </Box>

      {/* Toolbar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          alignItems: "center",
          bgcolor: "background.default",
          border: 1,
          borderColor: "divider",
        }}
      >
        {/* Search */}
        <TextField
          size="small"
          placeholder={t("podcasts.search", "Search podcasts...")}
          value={search}
          onChange={handleSearchChange}
          sx={{ flex: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        {/* View mode toggle */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          size="small"
        >
          <ToggleButton
            value="grid"
            aria-label={t("podcasts.gridView", "Grid view")}
          >
            <ViewModuleIcon />
          </ToggleButton>
          <ToggleButton
            value="list"
            aria-label={t("podcasts.listView", "List view")}
          >
            <ViewListIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t("podcasts.error", "Failed to load podcasts. Please try again.")}
        </Alert>
      )}

      {/* Loading state */}
      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty state */}
      {!isLoading && podcasts.length === 0 && (
        <Box
          sx={{
            textAlign: "center",
            py: 8,
            px: 2,
          }}
        >
          <PodcastsIcon
            sx={{ fontSize: 64, color: "action.disabled", mb: 2 }}
          />
          <Typography variant="h6" gutterBottom>
            {search
              ? t("podcasts.noResults", "No podcasts found")
              : t("podcasts.noPodcasts", "No podcasts yet")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {search
              ? t(
                  "podcasts.noResultsDescription",
                  "Try searching with different keywords"
                )
              : t(
                  "podcasts.noPodcastsDescription",
                  "Subscribe to your first podcast to get started"
                )}
          </Typography>
          {!search && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsSubscribeModalOpen(true)}
            >
              {t("podcasts.subscribeFirst", "Subscribe to a Podcast")}
            </Button>
          )}
        </Box>
      )}

      {/* Podcast grid/list */}
      {!isLoading && podcasts.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <Grid container spacing={3}>
              {podcasts.map((podcast) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={podcast.id}>
                  <PodcastCard
                    podcast={podcast}
                    viewMode="grid"
                    onClick={() => handlePodcastClick(podcast.id)}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {podcasts.map((podcast) => (
                <PodcastCard
                  key={podcast.id}
                  podcast={podcast}
                  viewMode="list"
                  onClick={() => handlePodcastClick(podcast.id)}
                />
              ))}
            </Box>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Subscribe modal */}
      <SubscribeToPodcastModal
        open={isSubscribeModalOpen}
        onClose={() => setIsSubscribeModalOpen(false)}
        onSuccess={handleSubscribeSuccess}
      />
    </Container>
  );
}

export default PodcastsPage;
