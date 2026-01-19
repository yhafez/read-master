/**
 * Collections page - displays and manages book collections/folders
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
  Collapse,
  Breadcrumbs,
  Link,
  Alert,
  Paper,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Home as HomeIcon,
  LibraryBooks as LibraryBooksIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  useCollectionsStore,
  getCollectionPath,
  type Collection,
  type CollectionColor,
} from "@/stores";
import { CollectionDialog } from "./CollectionDialog";

// Color mapping for collection icons
const COLOR_MAP: Record<CollectionColor, string> = {
  default: "action.active",
  red: "#f44336",
  orange: "#ff9800",
  yellow: "#ffeb3b",
  green: "#4caf50",
  blue: "#2196f3",
  purple: "#9c27b0",
  pink: "#e91e63",
};

interface CollectionItemProps {
  collection: Collection;
  depth: number;
  onEdit: (collection: Collection) => void;
  onDelete: (collection: Collection) => void;
  onSelect: (collection: Collection) => void;
}

function CollectionItem({
  collection,
  depth,
  onEdit,
  onDelete,
  onSelect,
}: CollectionItemProps): React.ReactElement {
  const { t } = useTranslation();
  const { expandedIds, toggleExpanded, getChildCollections } =
    useCollectionsStore();

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);

  const children = getChildCollections(collection.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.includes(collection.id);

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
    onEdit(collection);
  }, [collection, onEdit, handleMenuClose]);

  const handleDelete = useCallback(() => {
    handleMenuClose();
    onDelete(collection);
  }, [collection, onDelete, handleMenuClose]);

  const handleExpandClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleExpanded(collection.id);
    },
    [collection.id, toggleExpanded]
  );

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
        sx={{ pl: depth * 2 }}
      >
        <ListItemButton onClick={() => onSelect(collection)}>
          {/* Expand/collapse button */}
          <Box sx={{ width: 28, display: "flex", alignItems: "center" }}>
            {hasChildren ? (
              <IconButton
                size="small"
                onClick={handleExpandClick}
                aria-label={
                  isExpanded
                    ? t("common.collapse", "Collapse")
                    : t("common.expand", "Expand")
                }
              >
                {isExpanded ? (
                  <ExpandMoreIcon fontSize="small" />
                ) : (
                  <ChevronRightIcon fontSize="small" />
                )}
              </IconButton>
            ) : null}
          </Box>

          <ListItemIcon sx={{ minWidth: 40 }}>
            {isExpanded && hasChildren ? (
              <FolderOpenIcon sx={{ color: COLOR_MAP[collection.color] }} />
            ) : (
              <FolderIcon sx={{ color: COLOR_MAP[collection.color] }} />
            )}
          </ListItemIcon>

          <ListItemText
            primary={collection.name}
            secondary={
              collection.bookIds.length > 0
                ? t("collections.bookCount", "{{count}} books", {
                    count: collection.bookIds.length,
                  })
                : collection.description || undefined
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

      {/* Children */}
      {hasChildren && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List disablePadding>
            {children.map((child) => (
              <CollectionItem
                key={child.id}
                collection={child}
                depth={depth + 1}
                onEdit={onEdit}
                onDelete={onDelete}
                onSelect={onSelect}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

export function CollectionsPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    collections,
    selectedCollectionId,
    selectCollection,
    deleteCollection,
    getRootCollections,
    getCollection,
  } = useCollectionsStore();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<
    Collection | undefined
  >();
  const [deleteDialogCollection, setDeleteDialogCollection] =
    useState<Collection | null>(null);

  // Get current selected collection and its path
  const selectedCollection = selectedCollectionId
    ? getCollection(selectedCollectionId)
    : undefined;
  const breadcrumbPath = selectedCollectionId
    ? getCollectionPath(collections, selectedCollectionId)
    : [];

  const rootCollections = useMemo(
    () => getRootCollections(),
    [getRootCollections]
  );

  const handleCreateClick = useCallback(() => {
    setEditingCollection(undefined);
    setDialogOpen(true);
  }, []);

  const handleEditCollection = useCallback((collection: Collection) => {
    setEditingCollection(collection);
    setDialogOpen(true);
  }, []);

  const handleDeleteCollection = useCallback((collection: Collection) => {
    setDeleteDialogCollection(collection);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteDialogCollection) {
      deleteCollection(deleteDialogCollection.id, false); // Keep children, move to parent
      setDeleteDialogCollection(null);
    }
  }, [deleteDialogCollection, deleteCollection]);

  const handleSelectCollection = useCallback(
    (collection: Collection) => {
      selectCollection(collection.id);
    },
    [selectCollection]
  );

  const handleBreadcrumbClick = useCallback(
    (collectionId: string | null) => {
      selectCollection(collectionId);
    },
    [selectCollection]
  );

  const handleViewBooks = useCallback(() => {
    // Navigate to library with collection filter
    if (selectedCollectionId) {
      navigate(`/library?collection=${selectedCollectionId}`);
    }
  }, [selectedCollectionId, navigate]);

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
          {t("collections.title", "Collections")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
        >
          {t("collections.create", "New Collection")}
        </Button>
      </Box>

      {/* Breadcrumbs */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Breadcrumbs
          aria-label={t("collections.breadcrumbs", "Collection path")}
        >
          <Link
            component="button"
            variant="body1"
            onClick={() => handleBreadcrumbClick(null)}
            underline="hover"
            sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
            {t("collections.root", "All Collections")}
          </Link>
          {breadcrumbPath.map((collection, index) => {
            const isLast = index === breadcrumbPath.length - 1;
            return isLast ? (
              <Typography
                key={collection.id}
                color="text.primary"
                sx={{ display: "flex", alignItems: "center" }}
              >
                <FolderIcon
                  sx={{ mr: 0.5, color: COLOR_MAP[collection.color] }}
                  fontSize="small"
                />
                {collection.name}
              </Typography>
            ) : (
              <Link
                key={collection.id}
                component="button"
                variant="body1"
                onClick={() => handleBreadcrumbClick(collection.id)}
                underline="hover"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <FolderIcon
                  sx={{ mr: 0.5, color: COLOR_MAP[collection.color] }}
                  fontSize="small"
                />
                {collection.name}
              </Link>
            );
          })}
        </Breadcrumbs>
      </Paper>

      {/* Selected collection info */}
      {selectedCollection && (
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
                <FolderIcon
                  sx={{ color: COLOR_MAP[selectedCollection.color] }}
                />
                {selectedCollection.name}
              </Typography>
              {selectedCollection.description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  {selectedCollection.description}
                </Typography>
              )}
              <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                <Chip
                  icon={<LibraryBooksIcon />}
                  label={t("collections.bookCount", "{{count}} books", {
                    count: selectedCollection.bookIds.length,
                  })}
                  size="small"
                />
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                onClick={handleViewBooks}
                disabled={selectedCollection.bookIds.length === 0}
              >
                {t("collections.viewBooks", "View Books")}
              </Button>
              <Tooltip title={t("common.edit", "Edit")}>
                <IconButton
                  onClick={() => handleEditCollection(selectedCollection)}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("common.delete", "Delete")}>
                <IconButton
                  onClick={() => handleDeleteCollection(selectedCollection)}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Collections list */}
      <Paper>
        {rootCollections.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <FolderIcon
              sx={{ fontSize: 64, color: "action.disabled", mb: 2 }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {t("collections.empty", "No collections yet")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t(
                "collections.emptyDescription",
                "Create collections to organize your books"
              )}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateClick}
            >
              {t("collections.createFirst", "Create your first collection")}
            </Button>
          </Box>
        ) : (
          <List>
            {rootCollections.map((collection) => (
              <CollectionItem
                key={collection.id}
                collection={collection}
                depth={0}
                onEdit={handleEditCollection}
                onDelete={handleDeleteCollection}
                onSelect={handleSelectCollection}
              />
            ))}
          </List>
        )}
      </Paper>

      {/* Create/Edit dialog */}
      <CollectionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        {...(editingCollection ? { collection: editingCollection } : {})}
        {...(selectedCollectionId
          ? { defaultParentId: selectedCollectionId }
          : {})}
      />

      {/* Delete confirmation */}
      {deleteDialogCollection && (
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
                onClick={() => setDeleteDialogCollection(null)}
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
            "collections.deleteConfirm",
            'Delete "{{name}}"? Child collections will be moved to the parent.',
            { name: deleteDialogCollection.name }
          )}
        </Alert>
      )}
    </Box>
  );
}

export default CollectionsPage;
