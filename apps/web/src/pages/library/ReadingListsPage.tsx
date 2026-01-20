/**
 * Reading Lists Page
 *
 * Displays user's custom reading lists with options to:
 * - Create new lists
 * - View list details
 * - Edit list metadata
 * - Delete lists
 * - Track reading progress through lists
 *
 * Note: Backend API integration pending (/api/lists endpoints)
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Stack,
  Chip,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  useTheme,
  useMediaQuery,
  Fab,
} from "@mui/material";
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  ListAlt as ListIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MenuBook as BookIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { CreateEditListDialog } from "@/components/library/CreateEditListDialog";

// ============================================================================
// Types
// ============================================================================

type ReadingList = {
  id: string;
  name: string;
  description: string | null;
  bookCount: number;
  completedCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Mock Data (replace with API calls)
// ============================================================================

const MOCK_LISTS: ReadingList[] = [
  {
    id: "1",
    name: "Summer Reading 2026",
    description: "Books I want to read this summer",
    bookCount: 5,
    completedCount: 2,
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Learn Spanish",
    description: "Spanish language learning materials",
    bookCount: 8,
    completedCount: 3,
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ============================================================================
// Main Component
// ============================================================================

export function ReadingListsPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // State
  const [lists, setLists] = useState<ReadingList[]>(MOCK_LISTS);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingList, setEditingList] = useState<ReadingList | null>(null);

  // Handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, listId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedListId(listId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedListId(null);
  };

  const handleListClick = (listId: string) => {
    navigate(`/library/lists/${listId}`);
  };

  const handleCreateList = (data: { name: string; description: string; isPublic: boolean }) => {
    // TODO: Call API to create list
    const newList: ReadingList = {
      id: `list-${Date.now()}`,
      name: data.name,
      description: data.description || null,
      bookCount: 0,
      completedCount: 0,
      isPublic: data.isPublic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLists((prev) => [newList, ...prev]);
    setShowCreateDialog(false);
  };

  const handleEditList = () => {
    const list = lists.find((l) => l.id === selectedListId);
    if (list) {
      setEditingList(list);
      setShowCreateDialog(true);
    }
    handleMenuClose();
  };

  const handleUpdateList = (data: { name: string; description: string; isPublic: boolean }) => {
    if (!editingList) return;

    // TODO: Call API to update list
    setLists((prev) =>
      prev.map((list) =>
        list.id === editingList.id
          ? {
              ...list,
              name: data.name,
              description: data.description || null,
              isPublic: data.isPublic,
              updatedAt: new Date().toISOString(),
            }
          : list
      )
    );
    setEditingList(null);
    setShowCreateDialog(false);
  };

  const handleDeleteList = () => {
    if (!selectedListId) return;

    // TODO: Call API to delete list
    if (window.confirm(t("library.confirmDeleteList"))) {
      setLists((prev) => prev.filter((list) => list.id !== selectedListId));
    }
    handleMenuClose();
  };

  const handleShareList = () => {
    const list = lists.find((l) => l.id === selectedListId);
    if (!list) return;

    // Share using Web Share API if available
    if (navigator.share) {
      const shareData: ShareData = {
        title: list.name,
        url: `${window.location.origin}/library/lists/${list.id}`,
      };
      if (list.description) {
        shareData.text = list.description;
      }
      navigator.share(shareData).catch(() => {
        // User cancelled or share failed
      });
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/library/lists/${list.id}`);
      alert(t("common.linkCopied"));
    }
    handleMenuClose();
  };

  const handleDialogClose = () => {
    setShowCreateDialog(false);
    setEditingList(null);
  };

  return (
    <Box>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <ListIcon fontSize="large" color="primary" />
          <Box>
            <Typography variant="h4" component="h1">
              {t("library.readingLists")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("library.organizeYourReading")}
            </Typography>
          </Box>
        </Stack>
        {!isMobile && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
          >
            {t("library.createList")}
          </Button>
        )}
      </Stack>

      {/* Empty State */}
      {lists.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            {t("library.noListsYet")}
          </Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
            sx={{ mt: 1 }}
          >
            {t("library.createFirstList")}
          </Button>
        </Alert>
      )}

      {/* Lists Grid */}
      <Grid container spacing={3}>
        {lists.map((list) => (
          <Grid item xs={12} sm={6} md={4} key={list.id}>
            <Card
              sx={{
                cursor: "pointer",
                "&:hover": {
                  boxShadow: theme.shadows[4],
                },
              }}
              onClick={() => handleListClick(list.id)}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="start" mb={1}>
                  <Typography variant="h6" component="h2" sx={{ flex: 1, pr: 1 }}>
                    {list.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, list.id)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Stack>

                {list.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {list.description}
                  </Typography>
                )}

                <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
                  <Chip
                    icon={<BookIcon />}
                    label={t("library.booksCount", { count: list.bookCount })}
                    size="small"
                  />
                  {list.isPublic && (
                    <Chip
                      label={t("common.public")}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  )}
                </Stack>

                {list.bookCount > 0 && (
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        {t("library.progress")}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {list.completedCount}/{list.bookCount}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={(list.completedCount / list.bookCount) * 100}
                      sx={{ borderRadius: 1 }}
                    />
                  </Box>
                )}
              </CardContent>

              <CardActions>
                <Button size="small" onClick={() => handleListClick(list.id)}>
                  {t("common.viewDetails")}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditList}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          {t("common.edit")}
        </MenuItem>
        <MenuItem onClick={handleShareList}>
          <ShareIcon fontSize="small" sx={{ mr: 1 }} />
          {t("common.share")}
        </MenuItem>
        <MenuItem onClick={handleDeleteList} sx={{ color: "error.main" }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          {t("common.delete")}
        </MenuItem>
      </Menu>

      {/* Mobile FAB */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label={t("library.createList")}
          sx={{ position: "fixed", bottom: 16, right: 16 }}
          onClick={() => setShowCreateDialog(true)}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Create/Edit Dialog */}
      <CreateEditListDialog
        open={showCreateDialog}
        onClose={handleDialogClose}
        onSave={editingList ? handleUpdateList : handleCreateList}
        initialData={
          editingList
            ? {
                name: editingList.name,
                description: editingList.description || "",
                isPublic: editingList.isPublic,
              }
            : undefined
        }
        isEditing={editingList !== null}
      />
    </Box>
  );
}

export default ReadingListsPage;
