/**
 * Schedule Discussion Dialog Component
 *
 * Allows group members to create scheduled discussions for book clubs.
 * Features:
 * - Title and content input
 * - Optional book selection from group's reading list
 * - DateTime picker for scheduling
 * - Immediate vs scheduled toggle
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
  Box,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  FormControlLabel,
  Switch,
  Chip,
} from "@mui/material";
import {
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  ChatBubbleOutline as DiscussionIcon,
  Book as BookIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGroupBooks, type GroupBook } from "@/hooks/useGroupBooks";

// ============================================================================
// Types
// ============================================================================

export interface ScheduleDiscussionDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Group ID to create discussion in */
  groupId: string;
  /** Group name for display */
  groupName: string;
  /** Callback on successful creation */
  onSuccess?: () => void;
}

interface CreateDiscussionInput {
  title: string;
  content: string;
  bookId?: string | null;
  isScheduled: boolean;
  scheduledAt?: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_TITLE_LENGTH = 300;
const MAX_CONTENT_LENGTH = 50000;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get minimum datetime for scheduling (now + 1 hour)
 */
function getMinDateTime(): string {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  now.setMinutes(0);
  now.setSeconds(0);
  now.setMilliseconds(0);
  return now.toISOString().slice(0, 16);
}

/**
 * Get default datetime for scheduling (tomorrow at 10am)
 */
function getDefaultScheduleDateTime(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  return tomorrow.toISOString().slice(0, 16);
}

/**
 * Convert local datetime string to ISO format
 */
function toISODateTime(localDateTime: string): string {
  return new Date(localDateTime).toISOString();
}

/**
 * Check if a datetime is in the future
 */
function isDateTimeInFuture(dateTime: string): boolean {
  return new Date(dateTime) > new Date();
}

// ============================================================================
// Main Component
// ============================================================================

export function ScheduleDiscussionDialog({
  open,
  onClose,
  groupId,
  groupName,
  onSuccess,
}: ScheduleDiscussionDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [isScheduled, setIsScheduled] = useState(true);
  const [scheduledDateTime, setScheduledDateTime] = useState(
    getDefaultScheduleDateTime()
  );
  const [error, setError] = useState<string | null>(null);

  // Fetch group books for optional book selection
  const { data: groupBooksData, isLoading: loadingBooks } = useGroupBooks(
    groupId,
    { limit: 50 },
    { enabled: open }
  );

  // Group books list
  const groupBooks = useMemo(() => {
    return groupBooksData?.data ?? [];
  }, [groupBooksData?.data]);

  // Create discussion mutation
  const createMutation = useMutation({
    mutationFn: async (input: CreateDiscussionInput) => {
      const response = await fetch(`/api/groups/${groupId}/discussions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || t("groups.discussion.createError"));
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["groupDiscussions", groupId],
      });
      handleClose();
      onSuccess?.();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Validation
  const isFormValid = useMemo(() => {
    if (!title.trim()) return false;
    if (!content.trim()) return false;
    if (isScheduled) {
      if (!scheduledDateTime) return false;
      if (!isDateTimeInFuture(scheduledDateTime)) return false;
    }
    return true;
  }, [title, content, isScheduled, scheduledDateTime]);

  // Handlers
  const handleSubmit = async () => {
    if (!isFormValid) {
      setError(t("groups.discussion.validationError"));
      return;
    }

    const input: CreateDiscussionInput = {
      title: title.trim(),
      content: content.trim(),
      bookId: selectedBookId || null,
      isScheduled,
      scheduledAt: isScheduled ? toISODateTime(scheduledDateTime) : null,
    };

    await createMutation.mutateAsync(input);
  };

  const handleClose = () => {
    // Reset all state
    setTitle("");
    setContent("");
    setSelectedBookId("");
    setIsScheduled(true);
    setScheduledDateTime(getDefaultScheduleDateTime());
    setError(null);
    onClose();
  };

  const handleScheduleToggle = (checked: boolean) => {
    setIsScheduled(checked);
    if (checked && !scheduledDateTime) {
      setScheduledDateTime(getDefaultScheduleDateTime());
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <ScheduleIcon color="primary" />
            <Typography variant="h6">
              {t("groups.discussion.scheduleTitle")}
            </Typography>
          </Stack>
          <IconButton size="small" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Group Info */}
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t("groups.discussion.creatingIn")}
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

          {/* Schedule Toggle */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={isScheduled}
                  onChange={(e) => handleScheduleToggle(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography>
                    {t("groups.discussion.scheduleForLater")}
                  </Typography>
                  {isScheduled && (
                    <Chip
                      label={t("groups.discussion.scheduled")}
                      size="small"
                      color="primary"
                      icon={<ScheduleIcon />}
                    />
                  )}
                </Stack>
              }
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
              {isScheduled
                ? t("groups.discussion.scheduleHint")
                : t("groups.discussion.immediateHint")}
            </Typography>
          </Box>

          {/* Scheduled DateTime */}
          {isScheduled && (
            <TextField
              label={t("groups.discussion.scheduledAt")}
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: getMinDateTime() }}
              fullWidth
              required
              error={
                scheduledDateTime
                  ? !isDateTimeInFuture(scheduledDateTime)
                  : false
              }
              helperText={
                scheduledDateTime && !isDateTimeInFuture(scheduledDateTime)
                  ? t("groups.discussion.mustBeFuture")
                  : undefined
              }
            />
          )}

          <Divider />

          {/* Title */}
          <TextField
            label={t("groups.discussion.titleLabel")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("groups.discussion.titlePlaceholder")}
            inputProps={{ maxLength: MAX_TITLE_LENGTH }}
            helperText={`${title.length}/${MAX_TITLE_LENGTH}`}
            fullWidth
            required
          />

          {/* Content */}
          <TextField
            label={t("groups.discussion.contentLabel")}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("groups.discussion.contentPlaceholder")}
            multiline
            rows={6}
            inputProps={{ maxLength: MAX_CONTENT_LENGTH }}
            helperText={`${content.length}/${MAX_CONTENT_LENGTH}`}
            fullWidth
            required
          />

          {/* Optional Book Selection */}
          <FormControl fullWidth>
            <InputLabel>{t("groups.discussion.selectBook")}</InputLabel>
            <Select
              value={selectedBookId}
              label={t("groups.discussion.selectBook")}
              onChange={(e) => setSelectedBookId(e.target.value)}
              startAdornment={
                selectedBookId ? <BookIcon sx={{ mr: 1, ml: -0.5 }} /> : null
              }
            >
              <MenuItem value="">
                <em>{t("groups.discussion.noBook")}</em>
              </MenuItem>
              {loadingBooks ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  {t("common.loading")}
                </MenuItem>
              ) : groupBooks.length === 0 ? (
                <MenuItem disabled>
                  {t("groups.discussion.noBooksInGroup")}
                </MenuItem>
              ) : (
                groupBooks.map((groupBook: GroupBook) => (
                  <MenuItem key={groupBook.book.id} value={groupBook.book.id}>
                    <Stack>
                      <Typography variant="body2">
                        {groupBook.book.title}
                      </Typography>
                      {groupBook.book.author && (
                        <Typography variant="caption" color="text.secondary">
                          {groupBook.book.author}
                        </Typography>
                      )}
                    </Stack>
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>{t("common.cancel")}</Button>
        <Button
          variant="contained"
          startIcon={
            createMutation.isPending ? (
              <CircularProgress size={16} color="inherit" />
            ) : isScheduled ? (
              <ScheduleIcon />
            ) : (
              <DiscussionIcon />
            )
          }
          onClick={handleSubmit}
          disabled={!isFormValid || createMutation.isPending}
        >
          {createMutation.isPending
            ? t("common.creating")
            : isScheduled
              ? t("groups.discussion.schedule")
              : t("groups.discussion.create")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ScheduleDiscussionDialog;
