/**
 * Split Screen Book Selector Dialog
 *
 * Dialog for selecting a book to load in a split-screen pane.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  Search as SearchIcon,
  Close as CloseIcon,
  MenuBook as BookIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useBooks } from "@/hooks/useBooks";
import { useSplitScreenStore } from "@/stores/useSplitScreenStore";

// ============================================================================
// Types
// ============================================================================

type SplitScreenBookSelectorProps = {
  open: boolean;
  onClose: () => void;
  pane: "left" | "right";
  currentBookId?: string;
};

// ============================================================================
// Main Component
// ============================================================================

export function SplitScreenBookSelector({
  open,
  onClose,
  pane,
  currentBookId,
}: SplitScreenBookSelectorProps): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { setLeftBook, setRightBook } = useSplitScreenStore();

  const { data: booksData, isLoading } = useBooks({
    search: searchQuery || undefined,
    limit: 50,
  });

  const books = booksData?.data || [];

  const handleSelectBook = (bookId: string): void => {
    if (pane === "left") {
      setLeftBook(bookId);
    } else {
      setRightBook(bookId);
    }

    // Navigate to reader with the new book
    navigate(`/reader/${bookId}`);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t(
          pane === "left"
            ? "splitScreen.selectLeftBook"
            : "splitScreen.selectRightBook"
        )}
      </DialogTitle>

      <DialogContent>
        {/* Search */}
        <TextField
          fullWidth
          placeholder={t("library.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Books List */}
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : books.length === 0 ? (
          <Box display="flex" flexDirection="column" alignItems="center" py={4}>
            <BookIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              {searchQuery ? t("library.noResults") : t("library.emptyLibrary")}
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 400, overflow: "auto" }}>
            {books.map((book) => (
              <ListItem key={book.id} disablePadding>
                <ListItemButton
                  onClick={() => handleSelectBook(book.id)}
                  selected={book.id === currentBookId}
                  disabled={book.id === currentBookId}
                >
                  <ListItemAvatar>
                    <Avatar
                      {...(book.coverUrl && { src: book.coverUrl })}
                      variant="rounded"
                      sx={{ width: 48, height: 64 }}
                    >
                      <BookIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={book.title}
                    secondary={
                      <Box>
                        {book.author && (
                          <Typography
                            variant="caption"
                            display="block"
                            color="text.secondary"
                          >
                            {book.author}
                          </Typography>
                        )}
                        <Box sx={{ mt: 0.5, display: "flex", gap: 0.5 }}>
                          {book.fileType && (
                            <Chip
                              label={book.fileType}
                              size="small"
                              sx={{ height: 20 }}
                            />
                          )}
                          {book.progress > 0 && (
                            <Chip
                              label={`${Math.round(book.progress)}%`}
                              size="small"
                              color="primary"
                              sx={{ height: 20 }}
                            />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<CloseIcon />}>
          {t("common.cancel")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SplitScreenBookSelector;
