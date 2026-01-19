import { useState, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Checkbox,
  Button,
  Card,
  CardContent,
  CardActions,
  Pagination,
  Menu,
  ListItemIcon,
  ListItemText,
  Stack,
  Alert,
  CircularProgress,
  Badge,
  Paper,
  Collapse,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  School as StudyIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Label as LabelIcon,
  LabelOff as LabelOffIcon,
  Category as CategoryIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  type BrowseCard,
  type CardBrowseFilters,
  type CardStatusFilter,
  type CardDueFilter,
  type CardPagination,
  type BulkActionType,
  DEFAULT_BROWSE_FILTERS,
  DEFAULT_PAGINATION,
  PAGE_SIZE_OPTIONS,
  CARD_SORT_OPTIONS,
  CARD_STATUS_FILTERS,
  CARD_DUE_FILTERS,
  CARD_TYPE_FILTERS,
  BULK_ACTIONS,
  applyFiltersAndSort,
  paginateCards,
  calculateSummary,
  getAllTags,
  getAllBooks,
  formatInterval,
  formatDueDate,
  getStatusColor,
  getTypeColor,
  truncateText,
  getTypeName,
  getStatusName,
  isDefaultFilters,
  countActiveFilters,
} from "../../components/srs/flashcardBrowseTypes";
import type { FlashcardType } from "../../components/srs/flashcardDeckTypes";
import type { SelectChangeEvent } from "@mui/material";

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_CARDS: BrowseCard[] = [
  {
    id: "card-1",
    front: "What is the capital of France?",
    back: "Paris",
    type: "VOCABULARY",
    status: "REVIEW",
    tags: ["geography", "europe"],
    book: { id: "book-1", title: "World Geography", author: "John Smith" },
    easeFactor: 2.5,
    interval: 14,
    repetitions: 5,
    dueDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-15T14:30:00Z",
  },
  {
    id: "card-2",
    front: "Define photosynthesis",
    back: "The process by which plants convert sunlight into energy",
    type: "CONCEPT",
    status: "LEARNING",
    tags: ["biology", "plants"],
    book: { id: "book-2", title: "Biology Fundamentals", author: "Jane Doe" },
    easeFactor: 2.3,
    interval: 3,
    repetitions: 2,
    dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    createdAt: "2024-01-05T09:00:00Z",
    updatedAt: "2024-01-18T11:00:00Z",
  },
  {
    id: "card-3",
    front: "Who wrote 'To Kill a Mockingbird'?",
    back: "Harper Lee",
    type: "COMPREHENSION",
    status: "NEW",
    tags: ["literature", "american"],
    book: { id: "book-3", title: "Classic Literature", author: "Mark Johnson" },
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: new Date().toISOString(),
    createdAt: "2024-01-19T08:00:00Z",
    updatedAt: "2024-01-19T08:00:00Z",
  },
  {
    id: "card-4",
    front: '"The only thing we have to fear is fear itself" - Who said this?',
    back: "Franklin D. Roosevelt",
    type: "QUOTE",
    status: "REVIEW",
    tags: ["history", "quotes", "american"],
    book: null,
    easeFactor: 2.7,
    interval: 21,
    repetitions: 7,
    dueDate: new Date(Date.now() + 604800000).toISOString(), // In 1 week
    createdAt: "2023-12-01T12:00:00Z",
    updatedAt: "2024-01-10T16:00:00Z",
  },
  {
    id: "card-5",
    front: "What is the Pythagorean theorem?",
    back: "a² + b² = c² (for right triangles)",
    type: "CONCEPT",
    status: "SUSPENDED",
    tags: ["math", "geometry"],
    book: {
      id: "book-4",
      title: "Mathematics Essentials",
      author: "Sarah Wilson",
    },
    easeFactor: 2.0,
    interval: 1,
    repetitions: 1,
    dueDate: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
    createdAt: "2024-01-02T15:00:00Z",
    updatedAt: "2024-01-08T10:00:00Z",
  },
  {
    id: "card-6",
    front: "Custom flashcard example",
    back: "This is a custom flashcard created by the user",
    type: "CUSTOM",
    status: "NEW",
    tags: ["custom"],
    book: null,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: new Date().toISOString(),
    createdAt: "2024-01-19T09:00:00Z",
    updatedAt: "2024-01-19T09:00:00Z",
  },
];

// =============================================================================
// CARD LIST ITEM COMPONENT
// =============================================================================

type CardListItemProps = {
  card: BrowseCard;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onEdit: () => void;
  onStudy: () => void;
};

function CardListItem({
  card,
  selected,
  onSelect,
  onEdit,
  onStudy,
}: CardListItemProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Card
      sx={{
        mb: 1,
        bgcolor: selected ? "action.selected" : "background.paper",
        "&:hover": { bgcolor: selected ? "action.selected" : "action.hover" },
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          <Checkbox
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            size="small"
            sx={{ mt: -0.5, ml: -1 }}
          />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
            >
              <Chip
                label={getTypeName(card.type)}
                size="small"
                color={getTypeColor(card.type)}
                sx={{ fontSize: "0.7rem", height: 20 }}
              />
              <Chip
                label={getStatusName(card.status)}
                size="small"
                color={getStatusColor(card.status)}
                variant="outlined"
                sx={{ fontSize: "0.7rem", height: 20 }}
              />
              {card.book && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {card.book.title}
                </Typography>
              )}
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
              {truncateText(card.front, 100)}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: "0.85rem" }}
            >
              {truncateText(card.back, 80)}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t("flashcards.browse.interval")}:{" "}
                {formatInterval(card.interval)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDueDate(card.dueDate)}
              </Typography>
              {card.tags.length > 0 && (
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  {card.tags.slice(0, 3).map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.65rem", height: 18 }}
                    />
                  ))}
                  {card.tags.length > 3 && (
                    <Typography variant="caption" color="text.secondary">
                      +{card.tags.length - 3}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </CardContent>
      <CardActions sx={{ pt: 0, px: 2, pb: 1 }}>
        <Button size="small" startIcon={<EditIcon />} onClick={onEdit}>
          {t("common.edit")}
        </Button>
        <Button
          size="small"
          startIcon={<StudyIcon />}
          onClick={onStudy}
          disabled={card.status === "SUSPENDED"}
        >
          {t("flashcards.browse.study")}
        </Button>
      </CardActions>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function FlashcardsBrowsePage(): React.ReactElement {
  const { t } = useTranslation();

  // State
  const [cards] = useState<BrowseCard[]>(MOCK_CARDS);
  const [filters, setFilters] = useState<CardBrowseFilters>(
    DEFAULT_BROWSE_FILTERS
  );
  const [pagination, setPagination] =
    useState<CardPagination>(DEFAULT_PAGINATION);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading] = useState(false);

  // Derived data
  const allTags = useMemo(() => getAllTags(cards), [cards]);
  const allBooks = useMemo(() => getAllBooks(cards), [cards]);
  const filteredCards = useMemo(
    () => applyFiltersAndSort(cards, filters),
    [cards, filters]
  );
  const { cards: paginatedCards, pagination: newPagination } = useMemo(
    () => paginateCards(filteredCards, pagination.page, pagination.pageSize),
    [filteredCards, pagination.page, pagination.pageSize]
  );
  const summary = useMemo(
    () => calculateSummary(filteredCards),
    [filteredCards]
  );
  const activeFilterCount = useMemo(
    () => countActiveFilters(filters),
    [filters]
  );

  // Handlers
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters((prev) => ({ ...prev, search: e.target.value }));
      setPagination((prev) => ({ ...prev, page: 1 }));
    },
    []
  );

  const handleStatusChange = useCallback((e: SelectChangeEvent) => {
    setFilters((prev) => ({
      ...prev,
      status: e.target.value as CardStatusFilter,
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleDueChange = useCallback((e: SelectChangeEvent) => {
    setFilters((prev) => ({
      ...prev,
      dueState: e.target.value as CardDueFilter,
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleTypeChange = useCallback((e: SelectChangeEvent) => {
    setFilters((prev) => ({
      ...prev,
      type: e.target.value === "all" ? null : (e.target.value as FlashcardType),
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleBookChange = useCallback((e: SelectChangeEvent) => {
    setFilters((prev) => ({
      ...prev,
      bookId: e.target.value === "all" ? null : e.target.value,
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleSortChange = useCallback((e: SelectChangeEvent) => {
    const [sortBy, sortDirection] = e.target.value.split("-") as [
      CardBrowseFilters["sortBy"],
      CardBrowseFilters["sortDirection"],
    ];
    setFilters((prev) => ({ ...prev, sortBy, sortDirection }));
  }, []);

  const handlePageChange = useCallback(
    (_: React.ChangeEvent<unknown>, page: number) => {
      setPagination((prev) => ({ ...prev, page }));
    },
    []
  );

  const handlePageSizeChange = useCallback((e: SelectChangeEvent) => {
    setPagination((prev) => ({
      ...prev,
      pageSize: Number(e.target.value),
      page: 1,
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_BROWSE_FILTERS);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleSelectCard = useCallback((cardId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(cardId);
      } else {
        next.delete(cardId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedCards.map((c) => c.id)));
    }
  }, [paginatedCards, selectedIds.size]);

  const handleBulkAction = useCallback((_action: BulkActionType) => {
    // In real implementation, this would call the API
    // For now, just close the menu
    setBulkMenuAnchor(null);
    setSelectedIds(new Set());
  }, []);

  const handleEdit = useCallback((_cardId: string) => {
    // Navigate to edit page or open edit modal
    // For now, just log
  }, []);

  const handleStudy = useCallback((_cardId: string) => {
    // Navigate to study page with this card
    // For now, just log
  }, []);

  const handleTagClick = useCallback((tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  return (
    <Box sx={{ p: 3 }}>
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
          {t("flashcards.browse.title")}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {selectedIds.size > 0 && (
            <Button
              variant="outlined"
              onClick={(e) => setBulkMenuAnchor(e.currentTarget)}
              startIcon={<CategoryIcon />}
            >
              {t("flashcards.browse.bulkActions")} ({selectedIds.size})
            </Button>
          )}
        </Box>
      </Box>

      {/* Summary Stats */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={4} flexWrap="wrap">
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("flashcards.browse.totalCards")}
            </Typography>
            <Typography variant="h6">{summary.totalCards}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("flashcards.browse.totalDue")}
            </Typography>
            <Typography variant="h6" color="warning.main">
              {summary.totalDue}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("flashcards.browse.totalOverdue")}
            </Typography>
            <Typography variant="h6" color="error.main">
              {summary.totalOverdue}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Search and Filter Bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <TextField
            size="small"
            placeholder={t("flashcards.browse.searchPlaceholder")}
            value={filters.search}
            onChange={handleSearchChange}
            sx={{ minWidth: 250, flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: filters.search && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, search: "" }))
                    }
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>{t("flashcards.browse.status.label")}</InputLabel>
            <Select
              value={filters.status}
              label={t("flashcards.browse.status.label")}
              onChange={handleStatusChange}
            >
              {CARD_STATUS_FILTERS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>{t("flashcards.browse.due.label")}</InputLabel>
            <Select
              value={filters.dueState}
              label={t("flashcards.browse.due.label")}
              onChange={handleDueChange}
            >
              {CARD_DUE_FILTERS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>{t("flashcards.browse.sort.label")}</InputLabel>
            <Select
              value={`${filters.sortBy}-${filters.sortDirection}`}
              label={t("flashcards.browse.sort.label")}
              onChange={handleSortChange}
            >
              {CARD_SORT_OPTIONS.map((option) => (
                <MenuItem
                  key={`${option.value}-desc`}
                  value={`${option.value}-desc`}
                >
                  {t(option.labelKey)} ↓
                </MenuItem>
              ))}
              {CARD_SORT_OPTIONS.map((option) => (
                <MenuItem
                  key={`${option.value}-asc`}
                  value={`${option.value}-asc`}
                >
                  {t(option.labelKey)} ↑
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Badge badgeContent={activeFilterCount} color="primary">
            <Button
              variant={showFilters ? "contained" : "outlined"}
              startIcon={showFilters ? <ExpandLessIcon /> : <FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
            >
              {t("flashcards.browse.filters")}
            </Button>
          </Badge>

          {!isDefaultFilters(filters) && (
            <Button
              variant="text"
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
            >
              {t("flashcards.browse.clearFilters")}
            </Button>
          )}
        </Box>

        {/* Advanced Filters */}
        <Collapse in={showFilters}>
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>{t("flashcards.browse.type.label")}</InputLabel>
                <Select
                  value={filters.type ?? "all"}
                  label={t("flashcards.browse.type.label")}
                  onChange={handleTypeChange}
                >
                  {CARD_TYPE_FILTERS.map((option) => (
                    <MenuItem
                      key={option.value ?? "all"}
                      value={option.value ?? "all"}
                    >
                      {t(option.labelKey)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>{t("flashcards.browse.book")}</InputLabel>
                <Select
                  value={filters.bookId ?? "all"}
                  label={t("flashcards.browse.book")}
                  onChange={handleBookChange}
                >
                  <MenuItem value="all">
                    {t("flashcards.browse.allBooks")}
                  </MenuItem>
                  {allBooks.map((book) => (
                    <MenuItem key={book.id} value={book.id}>
                      {book.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* Tags Filter */}
            {allTags.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 1, display: "block" }}
                >
                  {t("flashcards.browse.tags")}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  {allTags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      onClick={() => handleTagClick(tag)}
                      color={filters.tags.includes(tag) ? "primary" : "default"}
                      variant={
                        filters.tags.includes(tag) ? "filled" : "outlined"
                      }
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Collapse>
      </Paper>

      {/* Results Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Checkbox
            checked={
              selectedIds.size === paginatedCards.length &&
              paginatedCards.length > 0
            }
            indeterminate={
              selectedIds.size > 0 && selectedIds.size < paginatedCards.length
            }
            onChange={handleSelectAll}
            size="small"
          />
          <Typography variant="body2" color="text.secondary">
            {t("flashcards.browse.showing", {
              from: (newPagination.page - 1) * newPagination.pageSize + 1,
              to: Math.min(
                newPagination.page * newPagination.pageSize,
                newPagination.totalItems
              ),
              total: newPagination.totalItems,
            })}
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 80 }}>
          <Select
            value={pagination.pageSize.toString()}
            onChange={handlePageSizeChange}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <MenuItem key={size} value={size.toString()}>
                {size}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Card List */}
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : paginatedCards.length === 0 ? (
        <Alert severity="info" icon={<InfoIcon />}>
          {filters.search || !isDefaultFilters(filters)
            ? t("flashcards.browse.noResults")
            : t("flashcards.browse.noCards")}
        </Alert>
      ) : (
        <Box>
          {paginatedCards.map((card) => (
            <CardListItem
              key={card.id}
              card={card}
              selected={selectedIds.has(card.id)}
              onSelect={(selected) => handleSelectCard(card.id, selected)}
              onEdit={() => handleEdit(card.id)}
              onStudy={() => handleStudy(card.id)}
            />
          ))}
        </Box>
      )}

      {/* Pagination */}
      {newPagination.totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={newPagination.totalPages}
            page={newPagination.page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

      {/* Bulk Actions Menu */}
      <Menu
        anchorEl={bulkMenuAnchor}
        open={Boolean(bulkMenuAnchor)}
        onClose={() => setBulkMenuAnchor(null)}
      >
        {BULK_ACTIONS.map((action) => (
          <MenuItem
            key={action.type}
            onClick={() => handleBulkAction(action.type)}
            sx={action.dangerous ? { color: "error.main" } : {}}
          >
            <ListItemIcon sx={action.dangerous ? { color: "error.main" } : {}}>
              {action.type === "suspend" && <PauseIcon fontSize="small" />}
              {action.type === "unsuspend" && <PlayIcon fontSize="small" />}
              {action.type === "addTag" && <LabelIcon fontSize="small" />}
              {action.type === "removeTag" && <LabelOffIcon fontSize="small" />}
              {action.type === "changeType" && (
                <CategoryIcon fontSize="small" />
              )}
              {action.type === "delete" && <DeleteIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText>{t(action.labelKey)}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

export default FlashcardsBrowsePage;
