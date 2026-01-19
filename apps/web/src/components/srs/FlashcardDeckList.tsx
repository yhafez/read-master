/**
 * FlashcardDeckList Component
 *
 * Displays flashcard decks grouped by book with filtering, sorting, and navigation.
 * Shows card counts, due counts, and study statistics for each deck.
 */

import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import SchoolIcon from "@mui/icons-material/School";
import SearchIcon from "@mui/icons-material/Search";
import SortIcon from "@mui/icons-material/Sort";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  applyFiltersAndSort,
  calculateDeckListSummary,
  DEFAULT_DECK_FILTERS,
  FILTER_STATUSES,
  formatCardCount,
  formatDueCount,
  formatLastReviewed,
  formatRetentionRate,
  getDeckDisplayAuthor,
  getDeckDisplayName,
  getDueBadgeColor,
  getRetentionColor,
  getTotalDue,
  hasAnyDueCards,
  hasDueCards,
  hasOverdueCards,
  isDeckListEmpty,
  SORT_OPTIONS,
  type DeckCardProps,
  type DeckFilterStatus,
  type DeckListFilters,
  type DeckSortOption,
  type FlashcardDeck,
  type FlashcardDeckListProps,
  type SortDirection,
} from "./flashcardDeckTypes";

// =============================================================================
// DECK CARD COMPONENT
// =============================================================================

/**
 * Individual deck card component
 */
function DeckCard({
  deck,
  onStudy,
  onClick,
  selected,
  className,
}: DeckCardProps) {
  const { t } = useTranslation();

  const dueCount = getTotalDue(deck);
  const hasOverdue = hasOverdueCards(deck);
  const dueBadgeColor = getDueBadgeColor(deck);
  const retentionColor = getRetentionColor(deck.studyStats.retentionRate);

  const handleStudyClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onStudy?.();
    },
    [onStudy]
  );

  return (
    <Card
      {...(className && { className })}
      sx={{
        border: selected ? 2 : 1,
        borderColor: selected ? "primary.main" : "divider",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          boxShadow: 3,
        },
      }}
    >
      <CardActionArea onClick={onClick} disabled={!onClick}>
        <CardContent>
          <Stack spacing={2}>
            {/* Header: Title and Due Badge */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="h6"
                  component="h3"
                  noWrap
                  title={getDeckDisplayName(deck)}
                >
                  {getDeckDisplayName(deck)}
                </Typography>
                {getDeckDisplayAuthor(deck) && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    noWrap
                    title={getDeckDisplayAuthor(deck) ?? undefined}
                  >
                    {getDeckDisplayAuthor(deck)}
                  </Typography>
                )}
              </Box>
              {dueCount > 0 && (
                <Chip
                  label={formatDueCount(dueCount)}
                  color={dueBadgeColor}
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </Stack>

            {/* Card Counts */}
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Typography variant="body2" color="text.secondary">
                {t("flashcards.deck.totalCards", {
                  count: deck.cardCounts.total,
                })}
              </Typography>
              {deck.cardCounts.new > 0 && (
                <Typography variant="body2" color="info.main">
                  {t("flashcards.deck.newCards", {
                    count: deck.cardCounts.new,
                  })}
                </Typography>
              )}
              {hasOverdue && (
                <Typography variant="body2" color="error.main">
                  {t("flashcards.deck.overdue", {
                    count: deck.dueCounts.overdue,
                  })}
                </Typography>
              )}
            </Stack>

            {/* Retention Rate Bar */}
            {deck.studyStats.retentionRate > 0 && (
              <Box>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 0.5 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {t("flashcards.deck.retention")}
                  </Typography>
                  <Typography
                    variant="caption"
                    color={`${retentionColor}.main`}
                  >
                    {formatRetentionRate(deck.studyStats.retentionRate)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={deck.studyStats.retentionRate}
                  color={retentionColor}
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </Box>
            )}

            {/* Tags */}
            {deck.tags.length > 0 && (
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {deck.tags.slice(0, 3).map((tag: string) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
                {deck.tags.length > 3 && (
                  <Chip
                    label={`+${deck.tags.length - 3}`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>
            )}

            {/* Footer: Last Reviewed and Study Button */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="caption" color="text.secondary">
                {t("flashcards.deck.lastReviewed", {
                  time: formatLastReviewed(deck.lastReviewedAt),
                })}
              </Typography>
              {hasDueCards(deck) && onStudy && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleStudyClick}
                  aria-label={t("flashcards.deck.studyDeck", {
                    name: getDeckDisplayName(deck),
                  })}
                >
                  {t("flashcards.studyNow")}
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * FlashcardDeckList Component
 *
 * Displays a list of flashcard decks with filtering, sorting, and navigation.
 */
export function FlashcardDeckList({
  initialFilters,
  onStudyDeck,
  onDeckClick,
  onCreateCard,
  showFilters = true,
  className,
}: FlashcardDeckListProps) {
  const { t } = useTranslation();

  // Filter state
  const [filters, setFilters] = useState<DeckListFilters>({
    ...DEFAULT_DECK_FILTERS,
    ...initialFilters,
  });

  // Mock loading state (replace with React Query in real implementation)
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  // Mock decks data (replace with React Query useQuery in real implementation)
  const [decks] = useState<FlashcardDeck[]>([]);

  // Apply filters and sorting
  const filteredDecks = useMemo(
    () => applyFiltersAndSort(decks, filters),
    [decks, filters]
  );

  // Calculate summary stats
  const summary = useMemo(
    () => calculateDeckListSummary(filteredDecks),
    [filteredDecks]
  );

  // Handlers
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters((prev) => ({ ...prev, search: e.target.value }));
    },
    []
  );

  const handleStatusChange = useCallback((e: SelectChangeEvent<string>) => {
    setFilters((prev) => ({
      ...prev,
      status: e.target.value as DeckFilterStatus,
    }));
  }, []);

  const handleSortChange = useCallback((e: SelectChangeEvent<string>) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: e.target.value as DeckSortOption,
    }));
  }, []);

  const handleSortDirectionToggle = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      sortDirection:
        prev.sortDirection === "asc" ? "desc" : ("asc" as SortDirection),
    }));
  }, []);

  const handleStudy = useCallback(
    (deckId: string) => {
      onStudyDeck?.(deckId);
    },
    [onStudyDeck]
  );

  const handleDeckClick = useCallback(
    (deckId: string) => {
      onDeckClick?.(deckId);
    },
    [onDeckClick]
  );

  const handleCreateCard = useCallback(() => {
    onCreateCard?.();
  }, [onCreateCard]);

  // Loading state
  if (loading) {
    return (
      <Box
        className={className}
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 200,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box className={className}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" startIcon={<RefreshIcon />}>
              {t("common.retry")}
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box className={className}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <SchoolIcon color="primary" />
            <Typography variant="h5" component="h2">
              {t("flashcards.title")}
            </Typography>
          </Stack>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateCard}
            aria-label={t("flashcards.createCard")}
          >
            {t("flashcards.createCard")}
          </Button>
        </Stack>

        {/* Summary Stats */}
        {!isDeckListEmpty(decks) && (
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Box>
              <Typography variant="h4" component="span" color="primary">
                {formatCardCount(summary.totalCards)}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                component="span"
                sx={{ ml: 1 }}
              >
                {t("flashcards.totalCards")}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="h4"
                component="span"
                color={summary.totalDue > 0 ? "warning.main" : "success.main"}
              >
                {formatCardCount(summary.totalDue)}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                component="span"
                sx={{ ml: 1 }}
              >
                {t("flashcards.dueToday")}
              </Typography>
            </Box>
            {summary.averageRetention > 0 && (
              <Box>
                <Typography variant="h4" component="span" color="success.main">
                  {formatRetentionRate(summary.averageRetention)}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="span"
                  sx={{ ml: 1 }}
                >
                  {t("flashcards.stats.retention")}
                </Typography>
              </Box>
            )}
          </Stack>
        )}

        {/* Filters */}
        {showFilters && (
          <Stack
            direction="row"
            spacing={2}
            flexWrap="wrap"
            useFlexGap
            alignItems="center"
          >
            {/* Search */}
            <TextField
              size="small"
              placeholder={t("flashcards.deck.searchPlaceholder")}
              value={filters.search}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
              aria-label={t("common.search")}
            />

            {/* Status Filter */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="deck-status-filter-label">
                <FilterListIcon sx={{ mr: 0.5, fontSize: 16 }} />
                {t("common.filter")}
              </InputLabel>
              <Select
                labelId="deck-status-filter-label"
                value={filters.status}
                onChange={handleStatusChange}
                label={t("common.filter")}
              >
                {FILTER_STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {t(status.labelKey)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Sort */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="deck-sort-label">
                <SortIcon sx={{ mr: 0.5, fontSize: 16 }} />
                {t("common.sort")}
              </InputLabel>
              <Select
                labelId="deck-sort-label"
                value={filters.sortBy}
                onChange={handleSortChange}
                label={t("common.sort")}
              >
                {SORT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Sort Direction */}
            <Tooltip
              title={
                filters.sortDirection === "asc"
                  ? t("library.sort.ascending")
                  : t("library.sort.descending")
              }
            >
              <IconButton
                onClick={handleSortDirectionToggle}
                aria-label={t("library.sort.toggleOrder")}
              >
                <SortIcon
                  sx={{
                    transform:
                      filters.sortDirection === "asc" ? "scaleY(-1)" : "none",
                  }}
                />
              </IconButton>
            </Tooltip>
          </Stack>
        )}

        {/* Study All Button */}
        {hasAnyDueCards(filteredDecks) && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={() => onStudyDeck?.("all")}
            sx={{ alignSelf: "flex-start" }}
          >
            {t("flashcards.deck.studyAll", { count: summary.totalDue })}
          </Button>
        )}

        {/* Empty State */}
        {isDeckListEmpty(filteredDecks) && (
          <Box
            sx={{
              textAlign: "center",
              py: 8,
              px: 2,
            }}
          >
            <SchoolIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDeckListEmpty(decks)
                ? t("flashcards.noCards")
                : t("flashcards.deck.noResults")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {isDeckListEmpty(decks)
                ? t("flashcards.generateFromBook")
                : t("flashcards.deck.tryDifferentFilters")}
            </Typography>
            {isDeckListEmpty(decks) && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateCard}
              >
                {t("flashcards.createCard")}
              </Button>
            )}
          </Box>
        )}

        {/* Deck Grid */}
        {!isDeckListEmpty(filteredDecks) && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: 2,
            }}
          >
            {filteredDecks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onStudy={
                  hasDueCards(deck) ? () => handleStudy(deck.id) : undefined
                }
                onClick={
                  onDeckClick ? () => handleDeckClick(deck.id) : undefined
                }
              />
            ))}
          </Box>
        )}
      </Stack>
    </Box>
  );
}

export default FlashcardDeckList;
