/**
 * Add Book to Group Dialog Component
 *
 * Allows group admins to add books from their library to the group's reading list.
 * Features:
 * - Search books from user's library
 * - Select book to add
 * - Set initial schedule (status, dates, target page)
 */

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Box,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  InputAdornment,
} from "@mui/material";
import {
  Close as CloseIcon,
  Book as BookIcon,
  Search as SearchIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useBooks, type Book } from "@/hooks/useBooks";
import {
  useAddGroupBook,
  type GroupBookStatus,
  type AddGroupBookInput,
} from "@/hooks/useGroupBooks";

// ============================================================================
// Types
// ============================================================================

export interface AddBookToGroupDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Group ID to add book to */
  groupId: string;
  /** Group name for display */
  groupName: string;
  /** Callback on successful add */
  onSuccess?: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getInitialStatus(): GroupBookStatus {
  return "UPCOMING";
}

// ============================================================================
// Main Component
// ============================================================================

export function AddBookToGroupDialog({
  open,
  onClose,
  groupId,
  groupName,
  onSuccess,
}: AddBookToGroupDialogProps): React.ReactElement {
  const { t } = useTranslation();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [status, setStatus] = useState<GroupBookStatus>(getInitialStatus());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetPage, setTargetPage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fetch user's books
  const { data: booksData, isLoading: loadingBooks } = useBooks(
    { limit: 100 },
    { enabled: open }
  );

  // Add book mutation
  const addBookMutation = useAddGroupBook();

  // Filter books based on search query
  const filteredBooks = useMemo(() => {
    const books = booksData?.data ?? [];
    if (!searchQuery.trim()) return books;

    const query = searchQuery.toLowerCase();
    return books.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author?.toLowerCase().includes(query)
    );
  }, [booksData?.data, searchQuery]);

  // Handlers
  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    setError(null);
  };

  const handleClearSelection = () => {
    setSelectedBook(null);
  };

  const handleAddBook = async () => {
    if (!selectedBook) {
      setError(t("groups.books.selectBookError"));
      return;
    }

    try {
      const input: AddGroupBookInput = {
        bookId: selectedBook.id,
        status,
        startDate: startDate || null,
        endDate: endDate || null,
        targetPage: targetPage ? parseInt(targetPage, 10) : null,
      };

      await addBookMutation.mutateAsync({
        groupId,
        input,
      });

      // Reset form and close
      handleClose();
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("groups.books.addError");
      setError(message);
    }
  };

  const handleClose = () => {
    // Reset all state
    setSearchQuery("");
    setSelectedBook(null);
    setStatus(getInitialStatus());
    setStartDate("");
    setEndDate("");
    setTargetPage("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6">{t("groups.books.addBookTitle")}</Typography>
          <IconButton size="small" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Group Info */}
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t("groups.books.addingTo")}
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold">
              {groupName}
            </Typography>
          </Box>

          {/* Error Display */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Selected Book Display */}
          {selectedBook ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t("groups.books.selectedBook")}
              </Typography>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{
                  p: 2,
                  bgcolor: "action.selected",
                  borderRadius: 1,
                }}
              >
                {selectedBook.coverUrl ? (
                  <Avatar
                    variant="rounded"
                    src={selectedBook.coverUrl}
                    alt={selectedBook.title}
                    sx={{ width: 48, height: 64 }}
                  />
                ) : (
                  <Avatar
                    variant="rounded"
                    sx={{ width: 48, height: 64, bgcolor: "grey.300" }}
                  >
                    <BookIcon />
                  </Avatar>
                )}
                <Box flex={1}>
                  <Typography variant="subtitle2">
                    {selectedBook.title}
                  </Typography>
                  {selectedBook.author && (
                    <Typography variant="body2" color="text.secondary">
                      {t("common.by")} {selectedBook.author}
                    </Typography>
                  )}
                </Box>
                <IconButton size="small" onClick={handleClearSelection}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          ) : (
            <>
              {/* Search Books */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {t("groups.books.searchLabel")}
                </Typography>
                <TextField
                  fullWidth
                  placeholder={t("groups.books.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {/* Book List */}
              <Box sx={{ maxHeight: 250, overflow: "auto" }}>
                {loadingBooks ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress size={32} />
                  </Box>
                ) : filteredBooks.length === 0 ? (
                  <Alert severity="info">
                    {searchQuery
                      ? t("groups.books.noSearchResults")
                      : t("groups.books.noBooks")}
                  </Alert>
                ) : (
                  <List disablePadding>
                    {filteredBooks.map((book) => (
                      <ListItem key={book.id} disablePadding>
                        <ListItemButton
                          onClick={() => handleSelectBook(book)}
                          sx={{ borderRadius: 1 }}
                        >
                          <ListItemAvatar>
                            {book.coverUrl ? (
                              <Avatar
                                variant="rounded"
                                src={book.coverUrl}
                                alt={book.title}
                                sx={{ width: 40, height: 56 }}
                              />
                            ) : (
                              <Avatar
                                variant="rounded"
                                sx={{
                                  width: 40,
                                  height: 56,
                                  bgcolor: "grey.300",
                                }}
                              >
                                <BookIcon />
                              </Avatar>
                            )}
                          </ListItemAvatar>
                          <ListItemText
                            primary={book.title}
                            secondary={book.author}
                            sx={{ ml: 1 }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </>
          )}

          {/* Schedule Options (only shown when book is selected) */}
          {selectedBook && (
            <>
              <Divider />
              <Typography variant="subtitle2">
                {t("groups.books.scheduleOptions")}
              </Typography>

              <FormControl fullWidth size="small">
                <InputLabel>{t("groups.books.status")}</InputLabel>
                <Select
                  value={status}
                  label={t("groups.books.status")}
                  onChange={(e) => setStatus(e.target.value as GroupBookStatus)}
                >
                  <MenuItem value="UPCOMING">
                    {t("groups.books.statusUpcoming")}
                  </MenuItem>
                  <MenuItem value="CURRENT">
                    {t("groups.books.statusCurrent")}
                  </MenuItem>
                  <MenuItem value="COMPLETED">
                    {t("groups.books.statusCompleted")}
                  </MenuItem>
                </Select>
              </FormControl>

              <Stack direction="row" spacing={2}>
                <TextField
                  label={t("groups.books.startDate")}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  fullWidth
                />
                <TextField
                  label={t("groups.books.endDate")}
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  fullWidth
                />
              </Stack>

              <TextField
                label={t("groups.books.targetPage")}
                type="number"
                value={targetPage}
                onChange={(e) => setTargetPage(e.target.value)}
                placeholder={t("groups.books.targetPagePlaceholder")}
                size="small"
                fullWidth
              />
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>{t("common.cancel")}</Button>
        <Button
          variant="contained"
          startIcon={
            addBookMutation.isPending ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <CheckIcon />
            )
          }
          onClick={handleAddBook}
          disabled={!selectedBook || addBookMutation.isPending}
        >
          {addBookMutation.isPending
            ? t("common.adding")
            : t("groups.books.addBook")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddBookToGroupDialog;
