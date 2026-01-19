/**
 * Shelves page - displays and manages custom book shelves
 *
 * Unlike collections which support nesting, shelves are flat and
 * books can be on multiple shelves simultaneously.
 */

import { useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  Paper,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LibraryBooks as LibraryBooksIcon,
  Inventory2 as ShelvesIcon,
  Book as BookIcon,
  Star as StarIcon,
  Favorite as FavoriteIcon,
  Bookmark as BookmarkIcon,
  Flag as FlagIcon,
  LocalOffer as TagIcon,
  Folder as FolderIcon,
  DragIndicator as DragIndicatorIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useShelvesStore, type Shelf, type ShelfIcon } from "@/stores";
import { ShelfDialog } from "./ShelfDialog";

// Icon mapping for shelf icons
const ICON_MAP: Record<ShelfIcon, React.ElementType> = {
  shelf: ShelvesIcon,
  book: BookIcon,
  star: StarIcon,
  heart: FavoriteIcon,
  bookmark: BookmarkIcon,
  flag: FlagIcon,
  tag: TagIcon,
  folder: FolderIcon,
};

interface ShelfItemProps {
  shelf: Shelf;
  isSelected: boolean;
  onEdit: (shelf: Shelf) => void;
  onDelete: (shelf: Shelf) => void;
  onSelect: (shelf: Shelf) => void;
}

function ShelfItem({
  shelf,
  isSelected,
  onEdit,
  onDelete,
  onSelect,
}: ShelfItemProps): React.ReactElement {
  const { t } = useTranslation();

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);

  const IconComponent = ICON_MAP[shelf.icon];

  const handleMenuOpen = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setMenuAnchor(e.currentTarget);
    },
    []
  );

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  const handleEdit = useCallback(() => {
    handleMenuClose();
    onEdit(shelf);
  }, [shelf, onEdit, handleMenuClose]);

  const handleDelete = useCallback(() => {
    handleMenuClose();
    onDelete(shelf);
  }, [shelf, onDelete, handleMenuClose]);

  return (
    <>
      <ListItem
        disablePadding
        secondaryAction={
          <IconButton
            edge="end"
            aria-label={t("common.moreOptions", "More options")}
            onClick={handleMenuOpen}
            size="small"
          >
            <MoreVertIcon />
          </IconButton>
        }
      >
        <ListItemButton
          onClick={() => onSelect(shelf)}
          selected={isSelected}
          sx={{ borderRadius: 1 }}
        >
          {/* Drag handle placeholder for future drag-and-drop */}
          <Box sx={{ width: 24, display: "flex", alignItems: "center", mr: 1 }}>
            <DragIndicatorIcon
              fontSize="small"
              sx={{ color: "action.disabled" }}
            />
          </Box>

          <ListItemIcon sx={{ minWidth: 40 }}>
            <IconComponent color={isSelected ? "primary" : "action"} />
          </ListItemIcon>

          <ListItemText
            primary={shelf.name}
            secondary={
              shelf.bookIds.length > 0
                ? t("shelves.bookCount", "{{count}} books", {
                    count: shelf.bookIds.length,
                  })
                : shelf.description || undefined
            }
          />
        </ListItemButton>
      </ListItem>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("common.edit", "Edit")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("common.delete", "Delete")}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

export function ShelvesPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { selectedShelfId, selectShelf, deleteShelf, getShelves, getShelf } =
    useShelvesStore();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | undefined>();
  const [deleteDialogShelf, setDeleteDialogShelf] = useState<Shelf | null>(
    null
  );

  // Get shelves sorted by order
  const shelves = useMemo(() => getShelves(), [getShelves]);

  // Get current selected shelf
  const selectedShelf = selectedShelfId ? getShelf(selectedShelfId) : undefined;

  const handleCreateClick = useCallback(() => {
    setEditingShelf(undefined);
    setDialogOpen(true);
  }, []);

  const handleEditShelf = useCallback((shelf: Shelf) => {
    setEditingShelf(shelf);
    setDialogOpen(true);
  }, []);

  const handleDeleteShelf = useCallback((shelf: Shelf) => {
    setDeleteDialogShelf(shelf);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteDialogShelf) {
      deleteShelf(deleteDialogShelf.id);
      setDeleteDialogShelf(null);
    }
  }, [deleteDialogShelf, deleteShelf]);

  const handleSelectShelf = useCallback(
    (shelf: Shelf) => {
      // Toggle selection
      if (selectedShelfId === shelf.id) {
        selectShelf(null);
      } else {
        selectShelf(shelf.id);
      }
    },
    [selectedShelfId, selectShelf]
  );

  const handleViewBooks = useCallback(() => {
    // Navigate to library with shelf filter
    if (selectedShelfId) {
      navigate(`/library?shelf=${selectedShelfId}`);
    }
  }, [selectedShelfId, navigate]);

  const IconComponent = selectedShelf
    ? ICON_MAP[selectedShelf.icon]
    : ShelvesIcon;

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          {t("shelves.title", "Shelves")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
        >
          {t("shelves.create", "New Shelf")}
        </Button>
      </Box>

      {/* Selected shelf info */}
      {selectedShelf && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography
                variant="h6"
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <IconComponent color="primary" />
                {selectedShelf.name}
              </Typography>
              {selectedShelf.description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  {selectedShelf.description}
                </Typography>
              )}
              <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                <Chip
                  icon={<LibraryBooksIcon />}
                  label={t("shelves.bookCount", "{{count}} books", {
                    count: selectedShelf.bookIds.length,
                  })}
                  size="small"
                />
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                onClick={handleViewBooks}
                disabled={selectedShelf.bookIds.length === 0}
              >
                {t("shelves.viewBooks", "View Books")}
              </Button>
              <Tooltip title={t("common.edit", "Edit")}>
                <IconButton onClick={() => handleEditShelf(selectedShelf)}>
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("common.delete", "Delete")}>
                <IconButton onClick={() => handleDeleteShelf(selectedShelf)}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Shelves list */}
      <Paper>
        {shelves.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <ShelvesIcon
              sx={{ fontSize: 64, color: "action.disabled", mb: 2 }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {t("shelves.empty", "No shelves yet")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t(
                "shelves.emptyDescription",
                "Create shelves to categorize your books"
              )}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateClick}
            >
              {t("shelves.createFirst", "Create your first shelf")}
            </Button>
          </Box>
        ) : (
          <List sx={{ p: 1 }}>
            {shelves.map((shelf) => (
              <ShelfItem
                key={shelf.id}
                shelf={shelf}
                isSelected={selectedShelfId === shelf.id}
                onEdit={handleEditShelf}
                onDelete={handleDeleteShelf}
                onSelect={handleSelectShelf}
              />
            ))}
          </List>
        )}
      </Paper>

      {/* Help text */}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 2, textAlign: "center" }}
      >
        {t(
          "shelves.helpText",
          "Books can be on multiple shelves. Use shelves for simple categorization like 'Favorites' or 'To Read'."
        )}
      </Typography>

      {/* Create/Edit dialog */}
      <ShelfDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        {...(editingShelf ? { shelf: editingShelf } : {})}
      />

      {/* Delete confirmation */}
      {deleteDialogShelf && (
        <Alert
          severity="warning"
          sx={{
            position: "fixed",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1400,
            maxWidth: 500,
          }}
          action={
            <>
              <Button
                color="inherit"
                size="small"
                onClick={() => setDeleteDialogShelf(null)}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                color="inherit"
                size="small"
                onClick={handleConfirmDelete}
              >
                {t("common.delete", "Delete")}
              </Button>
            </>
          }
        >
          {t(
            "shelves.deleteConfirm",
            'Delete "{{name}}"? Books will be removed from this shelf but not deleted.',
            { name: deleteDialogShelf.name }
          )}
        </Alert>
      )}
    </Box>
  );
}

export default ShelvesPage;
