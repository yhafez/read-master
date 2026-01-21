/**
 * Library grid/list display component
 */

import {
  Box,
  Grid2 as Grid,
  Skeleton,
  Typography,
  Button,
  Paper,
} from "@mui/material";
import { Add as AddIcon, MenuBook as BookIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import type { Book } from "@/hooks/useBooks";
import type { LibraryViewMode } from "./types";
import { BookCard } from "./BookCard";

export interface LibraryGridProps {
  /** Books to display */
  books: Book[];
  /** Display mode */
  viewMode: LibraryViewMode;
  /** Whether data is loading */
  isLoading?: boolean | undefined;
  /** Callback when a book should be deleted */
  onDeleteBook?: ((book: Book) => void) | undefined;
  /** Callback to prefetch a book */
  onPrefetchBook?: ((bookId: string) => void) | undefined;
  /** Callback when add book button is clicked (for empty state) */
  onAddBookClick?: (() => void) | undefined;
  /** Whether bulk selection mode is active */
  bulkMode?: boolean | undefined;
  /** Set of selected book IDs */
  selectedBooks?: Set<string> | undefined;
  /** Callback when a book is selected/deselected */
  onBookSelect?: ((bookId: string) => void) | undefined;
}

/**
 * Skeleton loader for book cards
 */
function BookCardSkeleton({
  viewMode,
}: {
  viewMode: LibraryViewMode;
}): React.ReactElement {
  if (viewMode === "list") {
    return (
      <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
        <Skeleton variant="rectangular" width={80} height={120} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="40%" height={20} />
          <Skeleton variant="rectangular" height={6} sx={{ mt: 2 }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Skeleton variant="rectangular" height={200} />
      <Skeleton variant="text" width="80%" sx={{ mt: 1 }} />
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="rectangular" height={24} width={80} sx={{ mt: 1 }} />
    </Box>
  );
}

/**
 * Empty state when no books exist
 */
function EmptyState({
  onAddBookClick,
}: {
  onAddBookClick?: () => void;
}): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Paper
      sx={{
        p: 6,
        textAlign: "center",
        bgcolor: "background.default",
      }}
      elevation={0}
    >
      <BookIcon
        sx={{
          fontSize: 64,
          color: "text.secondary",
          mb: 2,
        }}
      />
      <Typography variant="h6" gutterBottom>
        {t("library.noBooks")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t("library.startReading")}
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onAddBookClick}
        size="large"
      >
        {t("library.addBook")}
      </Button>
    </Paper>
  );
}

/**
 * No results state when filters don't match any books
 */
function NoResultsState(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Paper
      sx={{
        p: 4,
        textAlign: "center",
        bgcolor: "background.default",
      }}
      elevation={0}
    >
      <Typography variant="body1" color="text.secondary">
        {t("library.noResults")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {t("library.tryDifferentFilters")}
      </Typography>
    </Paper>
  );
}

export function LibraryGrid({
  books,
  viewMode,
  isLoading = false,
  onDeleteBook,
  onPrefetchBook,
  onAddBookClick,
  bulkMode = false,
  selectedBooks = new Set(),
  onBookSelect,
}: LibraryGridProps): React.ReactElement {
  // Loading state
  if (isLoading) {
    if (viewMode === "list") {
      return (
        <Box>
          {Array.from({ length: 5 }).map((_, index) => (
            <BookCardSkeleton key={index} viewMode={viewMode} />
          ))}
        </Box>
      );
    }

    return (
      <Grid container spacing={2}>
        {Array.from({ length: 8 }).map((_, index) => (
          <Grid key={index} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
            <BookCardSkeleton viewMode={viewMode} />
          </Grid>
        ))}
      </Grid>
    );
  }

  // Empty state (no books at all)
  if (books.length === 0 && onAddBookClick) {
    return <EmptyState onAddBookClick={onAddBookClick} />;
  }

  // No results (has books but filtered out)
  if (books.length === 0) {
    return <NoResultsState />;
  }

  // List view
  if (viewMode === "list") {
    return (
      <Box>
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            viewMode={viewMode}
            onDelete={onDeleteBook}
            onMouseEnter={() => onPrefetchBook?.(book.id)}
            bulkMode={bulkMode}
            isSelected={selectedBooks.has(book.id)}
            onSelect={onBookSelect}
          />
        ))}
      </Box>
    );
  }

  // Grid view
  return (
    <Grid container spacing={2}>
      {books.map((book) => (
        <Grid key={book.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
          <BookCard
            book={book}
            viewMode={viewMode}
            onDelete={onDeleteBook}
            onMouseEnter={() => onPrefetchBook?.(book.id)}
            bulkMode={bulkMode}
            isSelected={selectedBooks.has(book.id)}
            onSelect={onBookSelect}
          />
        </Grid>
      ))}
    </Grid>
  );
}
