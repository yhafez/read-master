/**
 * Search tab component for searching Google Books and Open Library
 */

import { useState, useCallback } from "react";
import {
  Box,
  TextField,
  Button,
  Alert,
  Typography,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  InputAdornment,
  CircularProgress,
  Paper,
} from "@mui/material";
import {
  Search as SearchIcon,
  MenuBook as BookIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import {
  INITIAL_SEARCH_STATE,
  type TabPanelProps,
  type SearchTabState,
  type BookSearchResult,
  type AddBookFormData,
} from "./types";

export type SearchTabProps = TabPanelProps;

/**
 * Search tab for finding books from Google Books and Open Library
 */
export function SearchTab({
  isActive,
  isLoading,
  onSubmit,
}: SearchTabProps): React.ReactElement | null {
  const { t } = useTranslation();
  const [state, setState] = useState<SearchTabState>(INITIAL_SEARCH_STATE);

  // Handle search query change
  const handleQueryChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setState((prev) => ({ ...prev, query: event.target.value, error: null }));
    },
    []
  );

  // Handle search submission
  const handleSearch = useCallback(async () => {
    const query = state.query.trim();
    if (!query) {
      setState((prev) => ({
        ...prev,
        error: t("library.addBook.search.enterQuery"),
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isSearching: true,
      error: null,
      selectedBook: null,
    }));

    try {
      // Call the search API
      const response = await fetch(
        `/api/books/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error(t("library.addBook.search.searchFailed"));
      }

      const results: BookSearchResult[] = await response.json();

      setState((prev) => ({
        ...prev,
        results,
        isSearching: false,
        error:
          results.length === 0 ? t("library.addBook.search.noResults") : null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isSearching: false,
        error:
          error instanceof Error
            ? error.message
            : t("library.addBook.search.searchFailed"),
      }));
    }
  }, [state.query, t]);

  // Handle enter key press
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" && !state.isSearching) {
        handleSearch();
      }
    },
    [handleSearch, state.isSearching]
  );

  // Handle book selection
  const handleSelectBook = useCallback((book: BookSearchResult) => {
    setState((prev) => ({
      ...prev,
      selectedBook:
        prev.selectedBook?.externalId === book.externalId ? null : book,
    }));
  }, []);

  // Handle add book
  const handleAddBook = useCallback(() => {
    if (!state.selectedBook) {
      setState((prev) => ({
        ...prev,
        error: t("library.addBook.search.selectBook"),
      }));
      return;
    }

    const data: AddBookFormData = {
      title: state.selectedBook.title,
      author: state.selectedBook.authors.join(", "),
      externalId: state.selectedBook.externalId,
      source: state.selectedBook.source,
    };

    onSubmit(data);
  }, [state.selectedBook, onSubmit, t]);

  // Don't render if not active
  if (!isActive) {
    return null;
  }

  const canSubmit = state.selectedBook && !isLoading && !state.isSearching;

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      role="tabpanel"
      aria-labelledby="search-tab"
    >
      {/* Error Alert */}
      {state.error && (
        <Alert
          severity={
            state.results.length === 0 && !state.error.includes("failed")
              ? "info"
              : "error"
          }
          onClose={() => setState((prev) => ({ ...prev, error: null }))}
        >
          {state.error}
        </Alert>
      )}

      {/* Description */}
      <Typography variant="body2" color="text.secondary">
        {t("library.addBook.search.description")}
      </Typography>

      {/* Search Input */}
      <TextField
        label={t("library.addBook.search.label")}
        value={state.query}
        onChange={handleQueryChange}
        onKeyDown={handleKeyDown}
        fullWidth
        disabled={state.isSearching}
        placeholder={t("library.addBook.search.placeholder")}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: state.isSearching ? (
            <InputAdornment position="end">
              <CircularProgress size={20} />
            </InputAdornment>
          ) : null,
        }}
      />

      {/* Search Button */}
      <Button
        variant="outlined"
        onClick={handleSearch}
        disabled={!state.query.trim() || state.isSearching}
        startIcon={
          state.isSearching ? <CircularProgress size={20} /> : <SearchIcon />
        }
      >
        {state.isSearching
          ? t("library.addBook.search.searching")
          : t("library.addBook.search.searchButton")}
      </Button>

      {/* Search Results */}
      {state.results.length > 0 && (
        <Paper variant="outlined" sx={{ maxHeight: 300, overflow: "auto" }}>
          <List disablePadding>
            {state.results.map((book) => (
              <ListItemButton
                key={`${book.source}-${book.externalId}`}
                selected={state.selectedBook?.externalId === book.externalId}
                onClick={() => handleSelectBook(book)}
              >
                <ListItemAvatar>
                  <Avatar
                    variant="rounded"
                    {...(book.coverUrl ? { src: book.coverUrl } : {})}
                    alt={book.title}
                    sx={{ width: 40, height: 56 }}
                  >
                    <BookIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={book.title}
                  secondary={
                    <Box
                      component="span"
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                      }}
                    >
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        {book.authors.join(", ")}
                      </Typography>
                      <Box component="span" sx={{ display: "flex", gap: 0.5 }}>
                        <Chip
                          label={
                            book.source === "google_books"
                              ? t("library.addBook.search.googleBooks")
                              : t("library.addBook.search.openLibrary")
                          }
                          size="small"
                          variant="outlined"
                        />
                        {book.isPublicDomain && (
                          <Chip
                            label={t("library.addBook.search.publicDomain")}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  }
                  primaryTypographyProps={{
                    noWrap: true,
                    fontWeight:
                      state.selectedBook?.externalId === book.externalId
                        ? 600
                        : 400,
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}

      {/* Selected Book Preview */}
      {state.selectedBook && (
        <Paper sx={{ p: 2, bgcolor: "action.selected" }}>
          <Typography variant="subtitle2" gutterBottom>
            {t("library.addBook.search.selectedBook")}
          </Typography>
          <Typography variant="body1" fontWeight="bold">
            {state.selectedBook.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {state.selectedBook.authors.join(", ")}
          </Typography>
          {state.selectedBook.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 1,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {state.selectedBook.description}
            </Typography>
          )}
        </Paper>
      )}

      {/* Add Button */}
      <Button
        variant="contained"
        onClick={handleAddBook}
        disabled={!canSubmit}
        startIcon={<AddIcon />}
        sx={{ alignSelf: "flex-end" }}
      >
        {isLoading
          ? t("library.addBook.adding")
          : t("library.addBook.addButton")}
      </Button>
    </Box>
  );
}

export default SearchTab;
