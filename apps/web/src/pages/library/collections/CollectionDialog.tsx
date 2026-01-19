/**
 * Dialog for creating and editing collections
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
import { Close as CloseIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import {
  useCollectionsStore,
  collectionColors,
  validateCollectionName,
  type Collection,
  type CollectionColor,
} from "@/stores";

interface CollectionDialogProps {
  open: boolean;
  onClose: () => void;
  /** Collection to edit (undefined for create mode) */
  collection?: Collection;
  /** Default parent ID for new collections */
  defaultParentId?: string | null;
}

const COLOR_DISPLAY: Record<CollectionColor, string> = {
  default: "#9e9e9e",
  red: "#f44336",
  orange: "#ff9800",
  yellow: "#ffeb3b",
  green: "#4caf50",
  blue: "#2196f3",
  purple: "#9c27b0",
  pink: "#e91e63",
};

export function CollectionDialog({
  open,
  onClose,
  collection,
  defaultParentId,
}: CollectionDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const {
    createCollection,
    updateCollection,
    getRootCollections,
    getChildCollections,
    collections,
  } = useCollectionsStore();

  const isEditMode = Boolean(collection);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<CollectionColor>("default");
  const [parentId, setParentId] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  // Reset form when dialog opens/closes or collection changes
  useEffect(() => {
    if (open) {
      if (collection) {
        setName(collection.name);
        setDescription(collection.description);
        setColor(collection.color);
        setParentId(collection.parentId);
      } else {
        setName("");
        setDescription("");
        setColor("default");
        setParentId(defaultParentId ?? null);
      }
      setNameError(null);
    }
  }, [open, collection, defaultParentId]);

  // Get available parent options (excluding the collection being edited and its descendants)
  const getParentOptions = useCallback(() => {
    const options: Array<{ id: string | null; name: string; depth: number }> = [
      {
        id: null,
        name: t("collections.noParent", "No parent (root level)"),
        depth: 0,
      },
    ];

    // Build flat list with depth for indentation
    const addCollections = (parentId: string | null, depth: number): void => {
      const children =
        parentId === null
          ? getRootCollections()
          : getChildCollections(parentId);
      for (const child of children) {
        // Skip the collection being edited and its descendants
        if (
          collection &&
          (child.id === collection.id ||
            isDescendantOf(child.id, collection.id))
        ) {
          continue;
        }
        options.push({ id: child.id, name: child.name, depth });
        addCollections(child.id, depth + 1);
      }
    };

    // Helper to check if a collection is a descendant
    const isDescendantOf = (
      potentialDescendantId: string,
      ancestorId: string
    ): boolean => {
      const potentialDescendant = collections.find(
        (c) => c.id === potentialDescendantId
      );
      if (!potentialDescendant) return false;
      if (potentialDescendant.parentId === ancestorId) return true;
      if (potentialDescendant.parentId === null) return false;
      return isDescendantOf(potentialDescendant.parentId, ancestorId);
    };

    addCollections(null, 1);
    return options;
  }, [collection, collections, getRootCollections, getChildCollections, t]);

  const handleSubmit = useCallback(() => {
    // Validate name
    if (!validateCollectionName(name)) {
      setNameError(
        t("collections.nameRequired", "Collection name is required")
      );
      return;
    }

    if (isEditMode && collection) {
      updateCollection({
        id: collection.id,
        name,
        description,
        color,
        parentId,
      });
    } else {
      createCollection({
        name,
        description,
        color,
        parentId,
      });
    }

    onClose();
  }, [
    name,
    description,
    color,
    parentId,
    isEditMode,
    collection,
    createCollection,
    updateCollection,
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

  const parentOptions = getParentOptions();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="collection-dialog-title"
    >
      <DialogTitle id="collection-dialog-title" sx={{ pr: 6 }}>
        {isEditMode
          ? t("collections.editCollection", "Edit Collection")
          : t("collections.createCollection", "Create Collection")}
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
            label={t("collections.name", "Name")}
            value={name}
            onChange={handleNameChange}
            error={Boolean(nameError)}
            helperText={
              nameError || t("collections.nameHelp", "1-100 characters")
            }
            fullWidth
            required
            inputProps={{ maxLength: 100 }}
          />

          {/* Description field */}
          <TextField
            label={t("collections.description", "Description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            inputProps={{ maxLength: 500 }}
            helperText={t(
              "collections.descriptionHelp",
              "Optional, up to 500 characters"
            )}
          />

          {/* Color selector */}
          <FormControl fullWidth>
            <InputLabel id="collection-color-label">
              {t("collections.color", "Color")}
            </InputLabel>
            <Select
              labelId="collection-color-label"
              value={color}
              onChange={(e) => setColor(e.target.value as CollectionColor)}
              label={t("collections.color", "Color")}
            >
              {collectionColors.map((c) => (
                <MenuItem key={c} value={c}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        bgcolor: COLOR_DISPLAY[c],
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    />
                    <Typography>
                      {t(
                        `collections.colors.${c}`,
                        c.charAt(0).toUpperCase() + c.slice(1)
                      )}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Parent selector */}
          <FormControl fullWidth>
            <InputLabel id="collection-parent-label">
              {t("collections.parent", "Parent Collection")}
            </InputLabel>
            <Select
              labelId="collection-parent-label"
              value={parentId ?? ""}
              onChange={(e) =>
                setParentId(e.target.value === "" ? null : e.target.value)
              }
              label={t("collections.parent", "Parent Collection")}
            >
              {parentOptions.map((option) => (
                <MenuItem key={option.id ?? "root"} value={option.id ?? ""}>
                  <Typography sx={{ pl: option.depth * 2 }}>
                    {option.name}
                  </Typography>
                </MenuItem>
              ))}
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

export default CollectionDialog;
