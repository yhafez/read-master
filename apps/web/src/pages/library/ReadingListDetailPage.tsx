/**
 * Reading List Detail Page
 *
 * Displays a single reading list with:
 * - List metadata and description
 * - Ordered list of books
 * - Drag-and-drop reordering
 * - Add/remove books
 * - Progress tracking
 * - Share list
 *
 * Note: Backend API integration pending (/api/lists/:id endpoints)
 */

import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Chip,
  LinearProgress,
  IconButton,
  Alert,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Checkbox,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Public as PublicIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

// ============================================================================
// Types
// ============================================================================

type ListBook = {
  id: string;
  bookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  isCompleted: boolean;
  addedAt: string;
  order: number;
};

type ReadingList = {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  books: ListBook[];
};

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_LIST: ReadingList = {
  id: "1",
  name: "Summer Reading 2026",
  description: "Books I want to read this summer",
  isPublic: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  books: [
    {
      id: "item-1",
      bookId: "book-1",
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      coverUrl: null,
      isCompleted: true,
      addedAt: new Date().toISOString(),
      order: 0,
    },
    {
      id: "item-2",
      bookId: "book-2",
      title: "To Kill a Mockingbird",
      author: "Harper Lee",
      coverUrl: null,
      isCompleted: true,
      addedAt: new Date().toISOString(),
      order: 1,
    },
    {
      id: "item-3",
      bookId: "book-3",
      title: "1984",
      author: "George Orwell",
      coverUrl: null,
      isCompleted: false,
      addedAt: new Date().toISOString(),
      order: 2,
    },
  ],
};

const MOCK_AVAILABLE_BOOKS = [
  { id: "book-4", title: "Pride and Prejudice", author: "Jane Austen" },
  { id: "book-5", title: "The Catcher in the Rye", author: "J.D. Salinger" },
];

// ============================================================================
// Main Component
// ============================================================================

export function ReadingListDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // State
  const [list, setList] = useState<ReadingList>(MOCK_LIST);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());

  // Computed
  const completedCount = list.books.filter((b) => b.isCompleted).length;
  const totalCount = list.books.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Handlers
  const handleBack = () => {
    navigate("/library/lists");
  };

  const handleEdit = () => {
    // Navigate to edit page or open edit dialog
    // For now, just show an alert
    alert("Edit functionality would be implemented here");
  };

  const handleShare = () => {
    // Share using Web Share API if available
    if (navigator.share) {
      const shareData: ShareData = {
        title: list.name,
        url: `${window.location.origin}/library/lists/${id}`,
      };
      if (list.description) {
        shareData.text = list.description;
      }
      navigator.share(shareData).catch(() => {
        // User cancelled or share failed
      });
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/library/lists/${id}`);
      alert(t("common.linkCopied"));
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;

    const newBooks = [...list.books];
    const temp = newBooks[index - 1];
    if (temp && newBooks[index]) {
      newBooks[index - 1] = newBooks[index];
      newBooks[index] = temp;

      // Update order property
      const updatedBooks = newBooks.map((book, idx) => ({
        ...book,
        order: idx,
      }));

      setList((prev) => ({
        ...prev,
        books: updatedBooks,
      }));

      // TODO: Call API to save new order
    }
  };

  const handleMoveDown = (index: number) => {
    if (index === list.books.length - 1) return;

    const newBooks = [...list.books];
    const temp = newBooks[index];
    const next = newBooks[index + 1];
    if (temp && next) {
      newBooks[index] = next;
      newBooks[index + 1] = temp;

      // Update order property
      const updatedBooks = newBooks.map((book, idx) => ({
        ...book,
        order: idx,
      }));

      setList((prev) => ({
        ...prev,
        books: updatedBooks,
      }));

      // TODO: Call API to save new order
    }
  };

  const handleToggleComplete = (bookItemId: string) => {
    setList((prev) => ({
      ...prev,
      books: prev.books.map((book) =>
        book.id === bookItemId
          ? { ...book, isCompleted: !book.isCompleted }
          : book
      ),
    }));

    // TODO: Call API to update completion status
  };

  const handleRemoveBook = (bookItemId: string) => {
    if (!window.confirm(t("library.confirmRemoveFromList"))) return;

    setList((prev) => ({
      ...prev,
      books: prev.books.filter((book) => book.id !== bookItemId),
    }));

    // TODO: Call API to remove book from list
  };

  const handleAddBooks = () => {
    // Add selected books to the list
    const newBooks: ListBook[] = [];

    Array.from(selectedBooks).forEach((bookId, index) => {
      const book = MOCK_AVAILABLE_BOOKS.find((b) => b.id === bookId);
      if (book) {
        newBooks.push({
          id: `item-${Date.now()}-${index}`,
          bookId: book.id,
          title: book.title,
          author: book.author,
          coverUrl: null,
          isCompleted: false,
          addedAt: new Date().toISOString(),
          order: list.books.length + index,
        });
      }
    });

    setList((prev) => ({
      ...prev,
      books: [...prev.books, ...newBooks],
    }));

    // TODO: Call API to add books to list

    setShowAddDialog(false);
    setSelectedBooks(new Set());
  };

  const handleToggleBookSelection = (bookId: string) => {
    setSelectedBooks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
      } else {
        newSet.add(bookId);
      }
      return newSet;
    });
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <IconButton onClick={handleBack}>
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h4" component="h1">
              {list.name}
            </Typography>
            {list.isPublic ? (
              <Chip icon={<PublicIcon />} label={t("common.public")} size="small" color="success" />
            ) : (
              <Chip icon={<LockIcon />} label={t("common.private")} size="small" />
            )}
          </Stack>
          {list.description && (
            <Typography variant="body2" color="text.secondary">
              {list.description}
            </Typography>
          )}
        </Box>
        {!isMobile && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              {t("common.edit")}
            </Button>
            <Button
              variant="outlined"
              startIcon={<ShareIcon />}
              onClick={handleShare}
            >
              {t("common.share")}
            </Button>
          </Stack>
        )}
      </Stack>

      {/* Progress */}
      {totalCount > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" mb={1}>
              <Typography variant="h6">{t("library.progress")}</Typography>
              <Typography variant="h6" color="primary">
                {completedCount}/{totalCount}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{ height: 8, borderRadius: 1 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              {t("library.booksCompleted", { completed: completedCount, total: totalCount })}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Add Books Button */}
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setShowAddDialog(true)}
        sx={{ mb: 2 }}
      >
        {t("library.addBooks")}
      </Button>

      {/* Books List */}
      {list.books.length === 0 ? (
        <Alert severity="info">
          {t("library.noBooksinList")}
        </Alert>
      ) : (
        <Box>
          {list.books.map((book, index) => (
            <Card key={book.id} sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  {/* Reorder Buttons */}
                  <Stack>
                    <IconButton
                      size="small"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      aria-label={t("common.moveUp")}
                    >
                      <ArrowUpIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === list.books.length - 1}
                      aria-label={t("common.moveDown")}
                    >
                      <ArrowDownIcon fontSize="small" />
                    </IconButton>
                  </Stack>

                  {/* Book Number */}
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    sx={{ minWidth: 30 }}
                  >
                    {index + 1}
                  </Typography>

                  {/* Book Info */}
                  <Box flex={1}>
                    <Typography variant="h6" component="h3">
                      {book.title}
                    </Typography>
                    {book.author && (
                      <Typography variant="body2" color="text.secondary">
                        {book.author}
                      </Typography>
                    )}
                  </Box>

                  {/* Completion Checkbox */}
                  <Checkbox
                    checked={book.isCompleted}
                    onChange={() => handleToggleComplete(book.id)}
                    inputProps={{
                      "aria-label": t("library.markAsComplete"),
                    }}
                  />

                  {/* Remove Button */}
                  <IconButton
                    onClick={() => handleRemoveBook(book.id)}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Add Books Dialog */}
      <Dialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("library.addBooksToList")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("library.selectBooksToAdd")}
          </Typography>
          <List>
            {MOCK_AVAILABLE_BOOKS.map((book) => (
              <ListItem key={book.id} disablePadding>
                <ListItemButton onClick={() => handleToggleBookSelection(book.id)}>
                  <Checkbox
                    checked={selectedBooks.has(book.id)}
                    tabIndex={-1}
                    disableRipple
                  />
                  <ListItemText
                    primary={book.title}
                    secondary={book.author}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleAddBooks}
            disabled={selectedBooks.size === 0}
          >
            {t("library.addSelected", { count: selectedBooks.size })}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ReadingListDetailPage;
