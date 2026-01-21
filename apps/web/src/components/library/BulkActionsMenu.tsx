/**
 * Bulk actions menu - comprehensive bulk operations for selected books
 */

import { useState } from "react";
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  TextField,
  Chip,
  Box,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Label as LabelIcon,
  FolderOpen as CollectionIcon,
  Bookmarks as ShelfIcon,
  ChangeCircle as StatusIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

export interface BulkActionsMenuProps {
  /** Anchor element for the menu */
  anchorEl: HTMLElement | null;
  /** Whether the menu is open */
  open: boolean;
  /** Callback to close the menu */
  onClose: () => void;
  /** Number of selected books */
  selectedCount: number;
  /** Callback for bulk delete */
  onBulkDelete: () => void;
  /** Callback for bulk change status */
  onBulkChangeStatus: (status: string) => void;
  /** Callback for bulk add tags */
  onBulkAddTags: (tags: string[]) => void;
  /** Callback for bulk add to collection */
  onBulkAddToCollection?: (collectionId: string) => void;
  /** Callback for bulk add to shelf */
  onBulkAddToShelf?: (shelfId: string) => void;
}

type DialogType = "status" | "tags" | "collection" | "shelf" | null;

/**
 * Bulk actions menu with dialogs for various bulk operations
 */
export function BulkActionsMenu({
  anchorEl,
  open,
  onClose,
  selectedCount,
  onBulkDelete,
  onBulkChangeStatus,
  onBulkAddTags,
  onBulkAddToCollection,
  onBulkAddToShelf,
}: BulkActionsMenuProps): React.ReactElement {
  const { t } = useTranslation();
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const handleMenuItemClick = (dialog: DialogType) => {
    setActiveDialog(dialog);
    onClose();
  };

  const handleDialogClose = () => {
    setActiveDialog(null);
    setSelectedStatus("");
    setTagInput("");
    setTags([]);
  };

  const handleStatusChange = (event: SelectChangeEvent) => {
    setSelectedStatus(event.target.value);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmitStatus = () => {
    if (selectedStatus) {
      onBulkChangeStatus(selectedStatus);
      handleDialogClose();
    }
  };

  const handleSubmitTags = () => {
    if (tags.length > 0) {
      onBulkAddTags(tags);
      handleDialogClose();
    }
  };

  return (
    <>
      {/* Bulk Actions Menu */}
      <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
        <MenuItem onClick={() => handleMenuItemClick("status")}>
          <ListItemIcon>
            <StatusIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("library.bulkActions.changeStatus")}</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleMenuItemClick("tags")}>
          <ListItemIcon>
            <LabelIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("library.bulkActions.addTags")}</ListItemText>
        </MenuItem>

        {onBulkAddToCollection && (
          <MenuItem onClick={() => handleMenuItemClick("collection")}>
            <ListItemIcon>
              <CollectionIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              {t("library.bulkActions.addToCollection")}
            </ListItemText>
          </MenuItem>
        )}

        {onBulkAddToShelf && (
          <MenuItem onClick={() => handleMenuItemClick("shelf")}>
            <ListItemIcon>
              <ShelfIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("library.bulkActions.addToShelf")}</ListItemText>
          </MenuItem>
        )}

        <MenuItem onClick={onBulkDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: "error.main" }}>
            {t("library.bulkActions.delete")}
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* Change Status Dialog */}
      <Dialog open={activeDialog === "status"} onClose={handleDialogClose}>
        <DialogTitle>{t("library.bulkActions.changeStatusTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("library.bulkActions.changeStatusDescription", {
              count: selectedCount,
            })}
          </Typography>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>{t("library.status")}</InputLabel>
            <Select
              value={selectedStatus}
              onChange={handleStatusChange}
              label={t("library.status")}
            >
              <MenuItem value="not_started">
                {t("library.filters.wantToRead")}
              </MenuItem>
              <MenuItem value="reading">
                {t("library.filters.reading")}
              </MenuItem>
              <MenuItem value="completed">
                {t("library.filters.completed")}
              </MenuItem>
              <MenuItem value="abandoned">
                {t("library.filters.abandoned")}
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>{t("common.cancel")}</Button>
          <Button
            onClick={handleSubmitStatus}
            variant="contained"
            disabled={!selectedStatus}
          >
            {t("common.apply")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Tags Dialog */}
      <Dialog
        open={activeDialog === "tags"}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("library.bulkActions.addTagsTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("library.bulkActions.addTagsDescription", {
              count: selectedCount,
            })}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              label={t("library.bulkActions.tagName")}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
            />
            <Button onClick={handleAddTag} variant="outlined">
              {t("common.add")}
            </Button>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => handleRemoveTag(tag)}
                size="small"
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>{t("common.cancel")}</Button>
          <Button
            onClick={handleSubmitTags}
            variant="contained"
            disabled={tags.length === 0}
          >
            {t("library.bulkActions.addToBooks", { count: selectedCount })}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Collection/Shelf dialogs can be added later */}
      {activeDialog === "collection" && (
        <Dialog open onClose={handleDialogClose}>
          <DialogTitle>
            {t("library.bulkActions.addToCollectionTitle")}
          </DialogTitle>
          <DialogContent>
            <Typography>
              {t("library.bulkActions.collectionFeatureComingSoon")}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>{t("common.close")}</Button>
          </DialogActions>
        </Dialog>
      )}

      {activeDialog === "shelf" && (
        <Dialog open onClose={handleDialogClose}>
          <DialogTitle>{t("library.bulkActions.addToShelfTitle")}</DialogTitle>
          <DialogContent>
            <Typography>
              {t("library.bulkActions.shelfFeatureComingSoon")}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>{t("common.close")}</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
