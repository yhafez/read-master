/**
 * Dialog for creating and editing shelves
 */

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  IconButton,
} from "@mui/material";
import {
  Close as CloseIcon,
  Inventory2 as ShelvesIcon,
  Book as BookIcon,
  Star as StarIcon,
  Favorite as FavoriteIcon,
  Bookmark as BookmarkIcon,
  Flag as FlagIcon,
  LocalOffer as TagIcon,
  Folder as FolderIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import {
  useShelvesStore,
  shelfIcons,
  validateShelfName,
  type Shelf,
  type ShelfIcon,
} from "@/stores";

interface ShelfDialogProps {
  open: boolean;
  onClose: () => void;
  /** Shelf to edit (undefined for create mode) */
  shelf?: Shelf;
}

// Icon mapping for visual display
const ICON_COMPONENTS: Record<ShelfIcon, React.ElementType> = {
  shelf: ShelvesIcon,
  book: BookIcon,
  star: StarIcon,
  heart: FavoriteIcon,
  bookmark: BookmarkIcon,
  flag: FlagIcon,
  tag: TagIcon,
  folder: FolderIcon,
};

export function ShelfDialog({
  open,
  onClose,
  shelf,
}: ShelfDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const { createShelf, updateShelf } = useShelvesStore();

  const isEditMode = Boolean(shelf);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<ShelfIcon>("shelf");
  const [nameError, setNameError] = useState<string | null>(null);

  // Reset form when dialog opens/closes or shelf changes
  useEffect(() => {
    if (open) {
      if (shelf) {
        setName(shelf.name);
        setDescription(shelf.description);
        setIcon(shelf.icon);
      } else {
        setName("");
        setDescription("");
        setIcon("shelf");
      }
      setNameError(null);
    }
  }, [open, shelf]);

  const handleSubmit = useCallback(() => {
    // Validate name
    if (!validateShelfName(name)) {
      setNameError(t("shelves.nameRequired", "Shelf name is required"));
      return;
    }

    if (isEditMode && shelf) {
      updateShelf({
        id: shelf.id,
        name,
        description,
        icon,
      });
    } else {
      createShelf({
        name,
        description,
        icon,
      });
    }

    onClose();
  }, [
    name,
    description,
    icon,
    isEditMode,
    shelf,
    createShelf,
    updateShelf,
    onClose,
    t,
  ]);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
      setNameError(null);
    },
    []
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="shelf-dialog-title"
    >
      <DialogTitle id="shelf-dialog-title" sx={{ pr: 6 }}>
        {isEditMode
          ? t("shelves.editShelf", "Edit Shelf")
          : t("shelves.createShelf", "Create Shelf")}
        <IconButton
          aria-label={t("common.close", "Close")}
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {/* Name field */}
          <TextField
            autoFocus
            label={t("shelves.name", "Name")}
            value={name}
            onChange={handleNameChange}
            error={Boolean(nameError)}
            helperText={nameError || t("shelves.nameHelp", "1-50 characters")}
            fullWidth
            required
            inputProps={{ maxLength: 50 }}
          />

          {/* Description field */}
          <TextField
            label={t("shelves.description", "Description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            inputProps={{ maxLength: 200 }}
            helperText={t(
              "shelves.descriptionHelp",
              "Optional, up to 200 characters"
            )}
          />

          {/* Icon selector */}
          <FormControl fullWidth>
            <InputLabel id="shelf-icon-label">
              {t("shelves.icon", "Icon")}
            </InputLabel>
            <Select
              labelId="shelf-icon-label"
              value={icon}
              onChange={(e) => setIcon(e.target.value as ShelfIcon)}
              label={t("shelves.icon", "Icon")}
            >
              {shelfIcons.map((iconOption) => {
                const IconComponent = ICON_COMPONENTS[iconOption];
                return (
                  <MenuItem key={iconOption} value={iconOption}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <IconComponent fontSize="small" />
                      <Typography>
                        {t(
                          `shelves.icons.${iconOption}`,
                          iconOption.charAt(0).toUpperCase() +
                            iconOption.slice(1)
                        )}
                      </Typography>
                    </Box>
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.cancel", "Cancel")}</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!name.trim()}
        >
          {isEditMode ? t("common.save", "Save") : t("common.create", "Create")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ShelfDialog;
