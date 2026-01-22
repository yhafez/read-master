/**
 * Group Books Panel Component
 *
 * Displays and manages the scheduled reading list for a book club/reading group:
 * - View all books in the reading list
 * - Add new books to the list
 * - Update book status and schedule
 * - Remove books from the list
 */

import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Book as BookIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CompleteIcon,
  Schedule as ScheduleIcon,
  SkipNext as SkipIcon,
  PlayArrow as CurrentIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import {
  useGroupBooks,
  useUpdateGroupBook,
  useRemoveGroupBook,
  getGroupBookStatusColor,
  getGroupBookStatusLabel,
  sortGroupBooks,
  type GroupBook,
  type GroupBookStatus,
  type UpdateGroupBookInput,
} from "@/hooks/useGroupBooks";

// ============================================================================
// Types
// ============================================================================

export interface GroupBooksPanelProps {
  /** Group ID */
  groupId: string;
  /** Whether current user can edit the reading list */
  canEdit: boolean;
  /** Callback when user wants to add a book */
  onAddBook?: () => void;
}

interface EditBookDialogProps {
  open: boolean;
  onClose: () => void;
  book: GroupBook | null;
  groupId: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStatusIcon(status: GroupBookStatus): React.ReactElement {
  switch (status) {
    case "CURRENT":
      return <CurrentIcon color="primary" />;
    case "COMPLETED":
      return <CompleteIcon color="success" />;
    case "UPCOMING":
      return <ScheduleIcon color="action" />;
    case "SKIPPED":
      return <SkipIcon color="warning" />;
    default:
      return <BookIcon />;
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  try {
    return format(parseISO(dateString), "MMM d, yyyy");
  } catch {
    return dateString;
  }
}

// ============================================================================
// Edit Book Dialog
// ============================================================================

function EditBookDialog({
  open,
  onClose,
  book,
  groupId,
}: EditBookDialogProps): React.ReactElement | null {
  const { t } = useTranslation();
  const updateMutation = useUpdateGroupBook();

  const [status, setStatus] = useState<GroupBookStatus>(
    book?.status ?? "UPCOMING"
  );
  const [startDate, setStartDate] = useState(
    book?.startDate?.split("T")[0] ?? ""
  );
  const [endDate, setEndDate] = useState(book?.endDate?.split("T")[0] ?? "");
  const [targetPage, setTargetPage] = useState(
    book?.targetPage?.toString() ?? ""
  );

  // Reset form when book changes
  React.useEffect(() => {
    if (book) {
      setStatus(book.status);
      setStartDate(book.startDate?.split("T")[0] ?? "");
      setEndDate(book.endDate?.split("T")[0] ?? "");
      setTargetPage(book.targetPage?.toString() ?? "");
    }
  }, [book]);

  const handleSave = async () => {
    if (!book) return;

    const input: UpdateGroupBookInput = {
      status,
      startDate: startDate || null,
      endDate: endDate || null,
      targetPage: targetPage ? parseInt(targetPage, 10) : null,
    };

    await updateMutation.mutateAsync({
      groupId,
      bookId: book.book.id,
      input,
    });

    onClose();
  };

  if (!book) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("groups.books.editSchedule")}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {book.book.title}
            </Typography>
            {book.book.author && (
              <Typography variant="body2" color="text.secondary">
                {t("common.by")} {book.book.author}
              </Typography>
            )}
          </Box>

          <FormControl fullWidth>
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
              <MenuItem value="SKIPPED">
                {t("groups.books.statusSkipped")}
              </MenuItem>
            </Select>
          </FormControl>

          <TextField
            label={t("groups.books.startDate")}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            label={t("groups.books.endDate")}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            label={t("groups.books.targetPage")}
            type="number"
            value={targetPage}
            onChange={(e) => setTargetPage(e.target.value)}
            placeholder={t("groups.books.targetPagePlaceholder")}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GroupBooksPanel({
  groupId,
  canEdit,
  onAddBook,
}: GroupBooksPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();

  const [editingBook, setEditingBook] = useState<GroupBook | null>(null);
  const [deleteConfirmBook, setDeleteConfirmBook] = useState<GroupBook | null>(
    null
  );

  // Fetch group books
  const { data, isLoading, error, refetch } = useGroupBooks(groupId);
  const removeMutation = useRemoveGroupBook();

  // Sort books by status and order
  const sortedBooks = data?.data ? sortGroupBooks(data.data) : [];

  const handleDelete = async () => {
    if (!deleteConfirmBook) return;

    await removeMutation.mutateAsync({
      groupId,
      bookId: deleteConfirmBook.book.id,
    });

    setDeleteConfirmBook(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
          <Button variant="outlined" onClick={() => refetch()}>
            {t("common.retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            {/* Header */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6">{t("groups.books.title")}</Typography>
              {canEdit && onAddBook && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={onAddBook}
                  size="small"
                >
                  {t("groups.books.addBook")}
                </Button>
              )}
            </Stack>

            {/* Empty state */}
            {sortedBooks.length === 0 ? (
              <Box
                sx={{
                  py: 4,
                  textAlign: "center",
                }}
              >
                <BookIcon
                  sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
                />
                <Typography color="text.secondary">
                  {t("groups.books.empty")}
                </Typography>
                {canEdit && onAddBook && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onAddBook}
                    sx={{ mt: 2 }}
                  >
                    {t("groups.books.addFirstBook")}
                  </Button>
                )}
              </Box>
            ) : (
              /* Books list */
              <List disablePadding>
                {sortedBooks.map((groupBook) => (
                  <ListItem
                    key={groupBook.id}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      bgcolor:
                        groupBook.status === "CURRENT"
                          ? theme.palette.primary.main + "10"
                          : "transparent",
                      border: 1,
                      borderColor:
                        groupBook.status === "CURRENT"
                          ? "primary.main"
                          : "divider",
                    }}
                  >
                    <ListItemAvatar>
                      {groupBook.book.coverImage ? (
                        <Avatar
                          variant="rounded"
                          src={groupBook.book.coverImage}
                          alt={groupBook.book.title}
                          sx={{ width: 48, height: 64 }}
                        />
                      ) : (
                        <Avatar
                          variant="rounded"
                          sx={{
                            width: 48,
                            height: 64,
                            bgcolor: theme.palette.grey[200],
                          }}
                        >
                          <BookIcon />
                        </Avatar>
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                        >
                          <Typography variant="subtitle2">
                            {groupBook.book.title}
                          </Typography>
                          <Chip
                            icon={getStatusIcon(groupBook.status)}
                            label={getGroupBookStatusLabel(groupBook.status)}
                            size="small"
                            color={getGroupBookStatusColor(groupBook.status)}
                            variant="outlined"
                          />
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          {groupBook.book.author && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {t("common.by")} {groupBook.book.author}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={2}>
                            {groupBook.startDate && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {t("groups.books.starts")}:{" "}
                                {formatDate(groupBook.startDate)}
                              </Typography>
                            )}
                            {groupBook.endDate && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {t("groups.books.ends")}:{" "}
                                {formatDate(groupBook.endDate)}
                              </Typography>
                            )}
                            {groupBook.targetPage && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {t("groups.books.target")}:{" "}
                                {t("groups.books.page")} {groupBook.targetPage}
                              </Typography>
                            )}
                          </Stack>
                        </Stack>
                      }
                      sx={{ ml: 1 }}
                    />
                    {canEdit && (
                      <ListItemSecondaryAction>
                        <Tooltip title={t("common.edit")}>
                          <IconButton
                            size="small"
                            onClick={() => setEditingBook(groupBook)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t("common.delete")}>
                          <IconButton
                            size="small"
                            onClick={() => setDeleteConfirmBook(groupBook)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                ))}
              </List>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditBookDialog
        open={!!editingBook}
        onClose={() => setEditingBook(null)}
        book={editingBook}
        groupId={groupId}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmBook}
        onClose={() => setDeleteConfirmBook(null)}
      >
        <DialogTitle>{t("groups.books.removeTitle")}</DialogTitle>
        <DialogContent>
          <Typography>
            {t("groups.books.removeConfirmation", {
              title: deleteConfirmBook?.book.title,
            })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmBook(null)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            disabled={removeMutation.isPending}
          >
            {removeMutation.isPending
              ? t("common.removing")
              : t("common.remove")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default GroupBooksPanel;
