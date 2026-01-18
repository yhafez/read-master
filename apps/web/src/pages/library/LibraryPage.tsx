/**
 * Library page - displays user's book collection with grid/list views and filters
 */

import { useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Pagination,
  useMediaQuery,
  useTheme,
  Alert,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { useBooks, usePrefetchBook, useDeleteBook } from "@/hooks/useBooks";
import type { Book, BookListFilters } from "@/hooks/useBooks";
import { useUIStore } from "@/stores/uiStore";
import {
  LibraryToolbar,
  LibraryFilterPanel,
  LibraryGrid,
  AddBookModal,
  DEFAULT_LIBRARY_FILTERS,
  type LibraryViewMode,
  type LibraryFilters,
  type SortOption,
  type SortOrder,
} from "@/components/library";

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

  // Local UI state
  const [viewMode, setViewMode] = useState<LibraryViewMode>(
    compactLibraryView ? "list" : "grid"
  );
  const [filterPanelOpen, setFilterPanelOpen] = useState(!isMobile);
  const [filters, setFilters] = useState<LibraryFilters>(
    DEFAULT_LIBRARY_FILTERS
  );
  const [page, setPage] = useState(1);
  const [addBookModalOpen, setAddBookModalOpen] = useState(false);

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
  }, []);

  const handleFilterPanelToggle = useCallback(() => {
    setFilterPanelOpen((prev) => !prev);
  }, []);

  const handleFiltersChange = useCallback(
    (newFilters: Partial<LibraryFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
      setPage(1); // Reset to first page on filter change
    },
    []
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

  // Calculate total pages
  const totalPages = booksData?.pagination?.totalPages ?? 1;
  const books = booksData?.data ?? [];

  // Check if we have any books at all (for empty state vs no results)
  const hasNoBooks = !isLoading && books.length === 0 && page === 1;

  return (
    <Box>
      {/* Page Header */}
      <Typography variant="h4" component="h1" gutterBottom>
        {t("library.title")}
      </Typography>

      {/* Toolbar */}
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
      />

      {/* Error State */}
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.message || t("errors.serverError")}
        </Alert>
      )}

      {/* Main Content Area */}
      <Box sx={{ display: "flex", gap: 2 }}>
        {/* Filter Panel */}
        <LibraryFilterPanel
          open={filterPanelOpen}
          onClose={() => setFilterPanelOpen(false)}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          availableTags={[]} // TODO: Fetch user's tags from API
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
    </Box>
  );
}

export default LibraryPage;
