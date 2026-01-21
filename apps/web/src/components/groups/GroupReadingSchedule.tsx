/**
 * Group Reading Schedule Component
 *
 * Displays and manages the reading schedule for a group:
 * - Weekly reading goals
 * - Progress tracking
 * - Upcoming milestones
 * - Schedule adjustments (for owners/admins)
 */

import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  LinearProgress,
  Box,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import {
  CalendarToday as CalendarIcon,
  CheckCircle as CompleteIcon,
  RadioButtonUnchecked as PendingIcon,
  Edit as EditIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow, format } from "date-fns";

export interface GroupReadingScheduleProps {
  /** Group ID */
  groupId: string;
  /** Current book being read */
  currentBook: {
    id: string;
    title: string;
    totalPages: number;
  } | null;
  /** Whether current user can edit schedule */
  canEdit: boolean;
}

type Milestone = {
  id: string;
  description: string;
  targetPage: number;
  targetDate: Date;
  isComplete: boolean;
};

export function GroupReadingSchedule({
  groupId: _groupId,
  currentBook,
  canEdit,
}: GroupReadingScheduleProps): React.ReactElement {
  const { t } = useTranslation();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [milestones] = useState<Milestone[]>([
    // Mock data - in production, fetch from API
    {
      id: "1",
      description: "Complete Chapter 1-3",
      targetPage: 50,
      targetDate: new Date(2024, 11, 15),
      isComplete: true,
    },
    {
      id: "2",
      description: "Complete Chapter 4-6",
      targetPage: 100,
      targetDate: new Date(2024, 11, 22),
      isComplete: false,
    },
    {
      id: "3",
      description: "Complete Chapter 7-9",
      targetPage: 150,
      targetDate: new Date(2024, 11, 29),
      isComplete: false,
    },
  ]);

  // Mock current progress
  const currentPage = 75;
  const progressPercent = currentBook
    ? (currentPage / currentBook.totalPages) * 100
    : 0;

  const nextMilestone = milestones.find((m) => !m.isComplete);
  const completedCount = milestones.filter((m) => m.isComplete).length;

  const handleSaveMilestone = (_milestone: Partial<Milestone>) => {
    // TODO: Call actual API to save milestone
    // await fetch(`/api/groups/${groupId}/schedule`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(milestone),
    // });
    setShowEditDialog(false);
  };

  if (!currentBook) {
    return (
      <Card>
        <CardContent>
          <Stack spacing={2} alignItems="center" py={3}>
            <CalendarIcon fontSize="large" color="disabled" />
            <Typography variant="body1" color="text.secondary" align="center">
              {t("groups.schedule.noBook")}
            </Typography>
            <Typography variant="caption" color="text.secondary" align="center">
              {t("groups.schedule.noBookHint")}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Stack spacing={3}>
            {/* Header */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6">
                {t("groups.schedule.title")}
              </Typography>
              {canEdit && (
                <IconButton size="small" onClick={() => setShowEditDialog(true)}>
                  <EditIcon />
                </IconButton>
              )}
            </Stack>

            {/* Current Progress */}
            <Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={1}
              >
                <Typography variant="subtitle2">
                  {t("groups.schedule.currentProgress")}
                </Typography>
                <Chip
                  label={`${currentPage}/${currentBook.totalPages} ${t("groups.schedule.pages")}`}
                  size="small"
                  color="primary"
                />
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{ height: 8, borderRadius: 1 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                {progressPercent.toFixed(0)}% {t("groups.schedule.complete")}
              </Typography>
            </Box>

            {/* Next Milestone */}
            {nextMilestone && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: "primary.50",
                  borderRadius: 1,
                  border: 1,
                  borderColor: "primary.main",
                }}
              >
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  {t("groups.schedule.nextMilestone")}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {nextMilestone.description}
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                  <Chip
                    label={`${t("groups.schedule.page")} ${nextMilestone.targetPage}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={formatDistanceToNow(nextMilestone.targetDate, {
                      addSuffix: true,
                    })}
                    size="small"
                    variant="outlined"
                    icon={<CalendarIcon />}
                  />
                </Stack>
              </Box>
            )}

            {/* Milestones List */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t("groups.schedule.milestones")} ({completedCount}/{milestones.length})
              </Typography>
              <List disablePadding>
                {milestones.map((milestone) => (
                  <ListItem key={milestone.id} disablePadding sx={{ py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {milestone.isComplete ? (
                        <CompleteIcon color="success" />
                      ) : (
                        <PendingIcon color="disabled" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={milestone.description}
                      secondary={
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          <Typography variant="caption">
                            {t("groups.schedule.page")} {milestone.targetPage}
                          </Typography>
                          <Typography variant="caption">•</Typography>
                          <Typography variant="caption">
                            {format(milestone.targetDate, "MMM d, yyyy")}
                          </Typography>
                        </Stack>
                      }
                      primaryTypographyProps={{
                        sx: {
                          textDecoration: milestone.isComplete
                            ? "line-through"
                            : "none",
                          color: milestone.isComplete
                            ? "text.secondary"
                            : "text.primary",
                        },
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Edit Schedule Dialog */}
      <Dialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">
              {t("groups.schedule.editTitle")}
            </Typography>
            <IconButton size="small" onClick={() => setShowEditDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t("groups.schedule.milestoneDescription")}
              fullWidth
              placeholder={t("groups.schedule.descriptionPlaceholder")}
            />
            <TextField
              label={t("groups.schedule.targetPage")}
              type="number"
              fullWidth
            />
            <TextField
              label={t("groups.schedule.targetDate")}
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={() => handleSaveMilestone({})}
          >
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default GroupReadingSchedule;
