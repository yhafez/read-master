/**
 * Library page - displays user's book collection with grid/list views and filters
 */

import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  Pagination,
  useMediaQuery,
  useTheme,
  Alert,
  Paper,
  Stack,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import { useBooks, usePrefetchBook, useDeleteBook } from "@/hooks/useBooks";
import type { Book, BookListFilters } from "@/hooks/useBooks";
import { useBulkUpdateStatus, useBulkAddTags } from "@/hooks/useBulkOperations";
import { useUIStore } from "@/stores/uiStore";
import {
  filtersToSearchParams,
  searchParamsToFilters,
} from "@/utils/filterUrlParams";
import {
  LibraryToolbar,
  LibraryFilterPanel,
  LibraryGrid,
  AddBookModal,
  ActiveFilterChips,
  FilterPresetsDialog,
  DEFAULT_LIBRARY_FILTERS,
  loadSortPreferences,
  saveSortPreferences,
  type LibraryViewMode,
  type LibraryFilters,
  type SortOption,
  type SortOrder,
} from "@/components/library";
import { BulkActionsMenu } from "@/components/library/BulkActionsMenu";

const ITEMS_PER_PAGE = 12;

/**
 * Library page component
 */
export function LibraryPage(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // UI state from store
  const compactLibraryView = useUIStore(
    (state) => state.preferences.compactLibraryView
  );

  // URL search params
  const [searchParams, setSearchParams] = useSearchParams();

  // Load persisted sort preferences on mount
  const initialSortPrefs = useMemo(() => loadSortPreferences(), []);

  // Initialize filters from URL params or defaults
  const [filters, setFilters] = useState<LibraryFilters>(() => {
    const urlFilters = searchParamsToFilters(
      searchParams,
      DEFAULT_LIBRARY_FILTERS
    );
    return {
      ...urlFilters,
      sort: initialSortPrefs.field,
      order: initialSortPrefs.order,
    };
  });

  // Local UI state
  const [viewMode, setViewMode] = useState<LibraryViewMode>(
    compactLibraryView ? "list" : "grid"
  );
  const [filterPanelOpen, setFilterPanelOpen] = useState(!isMobile);
  const [page, setPage] = useState(1);
  const [addBookModalOpen, setAddBookModalOpen] = useState(false);
  const [filterPresetsDialogOpen, setFilterPresetsDialogOpen] = useState(false);

  // Bulk actions state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [bulkActionsAnchor, setBulkActionsAnchor] =
    useState<HTMLElement | null>(null);

  // Convert local filters to API filters
  const apiFilters: BookListFilters = useMemo(
    () => ({
      status: filters.status === "all" ? undefined : filters.status,
      search: filters.search || undefined,
      sort: filters.sort,
      order: filters.order,
      page,
      limit: ITEMS_PER_PAGE,
    }),
    [filters, page]
  );

  // Fetch books
  const { data: booksData, isLoading, isError, error } = useBooks(apiFilters);

  // Prefetch hook
  const prefetchBook = usePrefetchBook();

  // Delete mutation
  const deleteBook = useDeleteBook();

  // Bulk operations mutations
  const bulkUpdateStatus = useBulkUpdateStatus();
  const bulkAddTags = useBulkAddTags();

  // Handlers
  const handleViewModeChange = useCallback((mode: LibraryViewMode) => {
    setViewMode(mode);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, search: query }));
    setPage(1); // Reset to first page on search
  }, []);

  const handleSortChange = useCallback((sort: SortOption, order: SortOrder) => {
    setFilters((prev) => ({ ...prev, sort, order }));
    // Persist sort preferences
    saveSortPreferences({ field: sort, order });
  }, []);

  const handleFilterPanelToggle = useCallback(() => {
    setFilterPanelOpen((prev) => !prev);
  }, []);

  const handleFiltersChange = useCallback(
    (newFilters: Partial<LibraryFilters>) => {
      setFilters((prev) => {
        const updated = { ...prev, ...newFilters };
        // Update URL params
        const params = filtersToSearchParams(updated);
        setSearchParams(params, { replace: true });
        return updated;
      });
      setPage(1); // Reset to first page on filter change
    },
    [setSearchParams]
  );

  const handleAddBookClick = useCallback(() => {
    setAddBookModalOpen(true);
  }, []);

  const handleDeleteBook = useCallback(
    (book: Book) => {
      // In a real app, show confirmation dialog first
      deleteBook.mutate(book.id);
    },
    [deleteBook]
  );

  const handlePageChange = useCallback(
    (_event: React.ChangeEvent<unknown>, newPage: number) => {
      setPage(newPage);
      // Scroll to top of list
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    []
  );

  const handleBulkModeToggle = useCallback(() => {
    setBulkMode((prev) => !prev);
    setSelectedBooks(new Set()); // Clear selection when toggling
  }, []);

  const handleBookSelect = useCallback((bookId: string) => {
    setSelectedBooks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
      } else {
        newSet.add(bookId);
      }
      return newSet;
    });
  }, []);

  // Calculate total pages
  const totalPages = booksData?.pagination?.totalPages ?? 1;
  const books = booksData?.data ?? [];

  const handleSelectAll = useCallback(() => {
    if (selectedBooks.size === books.length) {
      setSelectedBooks(new Set());
    } else {
      setSelectedBooks(new Set(books.map((b) => b.id)));
    }
  }, [books, selectedBooks.size]);

  const handleBulkDelete = useCallback(() => {
    if (selectedBooks.size === 0) return;

    if (
      window.confirm(
        t("library.confirmBulkDelete", { count: selectedBooks.size })
      )
    ) {
      // Delete all selected books
      selectedBooks.forEach((bookId) => {
        deleteBook.mutate(bookId);
      });
      setSelectedBooks(new Set());
      setBulkMode(false);
      setBulkActionsAnchor(null);
    }
  }, [selectedBooks, deleteBook, t]);

  const handleBulkActionsClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (selectedBooks.size > 0) {
        setBulkActionsAnchor(event.currentTarget);
      }
    },
    [selectedBooks.size]
  );

  const handleBulkActionsClose = useCallback(() => {
    setBulkActionsAnchor(null);
  }, []);

  const handleBulkChangeStatus = useCallback(
    (status: string) => {
      if (selectedBooks.size === 0) return;

      bulkUpdateStatus.mutate(
        {
          bookIds: Array.from(selectedBooks),
          status,
        },
        {
          onSuccess: (result) => {
            if (result.successCount > 0) {
              // Success toast could be shown here
              setSelectedBooks(new Set());
              setBulkMode(false);
            }
          },
        }
      );
    },
    [selectedBooks, bulkUpdateStatus]
  );

  const handleBulkAddTags = useCallback(
    (tags: string[]) => {
      if (selectedBooks.size === 0) return;

      bulkAddTags.mutate(
        {
          bookIds: Array.from(selectedBooks),
          tags,
        },
        {
          onSuccess: (result) => {
            if (result.successCount > 0) {
              // Success toast could be shown here
              setSelectedBooks(new Set());
              setBulkMode(false);
            }
          },
        }
      );
    },
    [selectedBooks, bulkAddTags]
  );

  const handleRemoveFilter = useCallback(
    (filterKey: keyof LibraryFilters, value?: string) => {
      setFilters((prev) => {
        let updated = { ...prev };

        if (filterKey === "genres" && value) {
          updated = {
            ...prev,
            genres: prev.genres.filter((g) => g !== value),
          };
        } else if (filterKey === "tags" && value) {
          updated = {
            ...prev,
            tags: prev.tags.filter((t) => t !== value),
          };
        } else if (
          filterKey === "dateAdded" ||
          filterKey === "dateStarted" ||
          filterKey === "dateCompleted"
        ) {
          updated = {
            ...prev,
            [filterKey]: { from: null, to: null },
          };
        } else if (filterKey === "status") {
          updated = { ...prev, status: "all" };
        } else if (filterKey === "progress") {
          updated = { ...prev, progress: "all" };
        } else if (filterKey === "fileType") {
          updated = { ...prev, fileType: "all" };
        } else if (filterKey === "source") {
          updated = { ...prev, source: "all" };
        }

        // Update URL params
        const params = filtersToSearchParams(updated);
        setSearchParams(params, { replace: true });
        return updated;
      });
      setPage(1); // Reset to first page
    },
    [setSearchParams]
  );

  const handleClearAllFilters = useCallback(() => {
    setFilters(DEFAULT_LIBRARY_FILTERS);
    setSearchParams(new URLSearchParams(), { replace: true });
    setPage(1);
  }, [setSearchParams]);

  const handleLoadPreset = useCallback(
    (presetFilters: Partial<LibraryFilters>) => {
      setFilters((prev) => ({ ...prev, ...presetFilters }));
      setPage(1);
      setFilterPresetsDialogOpen(false);
    },
    []
  );

  // Check if we have any books at all (for empty state vs no results)
  const hasNoBooks = !isLoading && books.length === 0 && page === 1;

  return (
    <Box>
      {/* Page Header */}
      <Typography variant="h4" component="h1" gutterBottom>
        {t("library.title")}
      </Typography>

      {/* Toolbar */}
      {!bulkMode ? (
        <LibraryToolbar
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          searchQuery={filters.search}
          onSearchChange={handleSearchChange}
          sortBy={filters.sort}
          sortOrder={filters.order}
          onSortChange={handleSortChange}
          onFilterClick={handleFilterPanelToggle}
          onAddBookClick={handleAddBookClick}
          isFilterOpen={filterPanelOpen}
          onBulkModeClick={handleBulkModeToggle}
        />
      ) : (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Tooltip title={t("common.close")}>
              <IconButton onClick={handleBulkModeToggle}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="h6">
              {t("library.selectedCount", { count: selectedBooks.size })}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Button
              startIcon={
                selectedBooks.size === books.length ? (
                  <CheckBoxIcon />
                ) : (
                  <CheckBoxOutlineBlankIcon />
                )
              }
              onClick={handleSelectAll}
            >
              {selectedBooks.size === books.length
                ? t("common.deselectAll")
                : t("common.selectAll")}
            </Button>
            <Button
              variant="outlined"
              startIcon={<MoreVertIcon />}
              onClick={handleBulkActionsClick}
              disabled={selectedBooks.size === 0}
            >
              {t("library.bulkActions")}
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleBulkDelete}
              disabled={selectedBooks.size === 0}
            >
              {t("library.deleteSelected")}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Error State */}
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.message || t("errors.serverError")}
        </Alert>
      )}

      {/* Active Filter Chips */}
      <ActiveFilterChips
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAllFilters}
      />

      {/* Main Content Area */}
      <Box sx={{ display: "flex", gap: 2 }}>
        {/* Filter Panel */}
        <LibraryFilterPanel
          open={filterPanelOpen}
          onClose={() => setFilterPanelOpen(false)}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          availableTags={[]} // TODO: Fetch user's tags from API
          onFilterPresetsClick={() => setFilterPresetsDialogOpen(true)}
        />

        {/* Books Grid/List */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <LibraryGrid
            books={books}
            viewMode={viewMode}
            isLoading={isLoading}
            onDeleteBook={handleDeleteBook}
            onPrefetchBook={prefetchBook}
            onAddBookClick={hasNoBooks ? handleAddBookClick : undefined}
            bulkMode={bulkMode}
            selectedBooks={selectedBooks}
            onBookSelect={handleBookSelect}
          />

          {/* Pagination */}
          {!isLoading && books.length > 0 && totalPages > 1 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mt: 4,
                mb: 2,
              }}
            >
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
                siblingCount={isMobile ? 0 : 1}
              />
            </Box>
          )}
        </Box>
      </Box>

      {/* Add Book Modal */}
      <AddBookModal
        open={addBookModalOpen}
        onClose={() => setAddBookModalOpen(false)}
      />

      {/* Filter Presets Dialog */}
      <FilterPresetsDialog
        open={filterPresetsDialogOpen}
        onClose={() => setFilterPresetsDialogOpen(false)}
        currentFilters={filters}
        onLoadPreset={handleLoadPreset}
      />

      {/* Bulk Actions Menu */}
      <BulkActionsMenu
        anchorEl={bulkActionsAnchor}
        open={Boolean(bulkActionsAnchor)}
        onClose={handleBulkActionsClose}
        selectedCount={selectedBooks.size}
        onBulkDelete={handleBulkDelete}
        onBulkChangeStatus={handleBulkChangeStatus}
        onBulkAddTags={handleBulkAddTags}
      />
    </Box>
  );
}

export default LibraryPage;
