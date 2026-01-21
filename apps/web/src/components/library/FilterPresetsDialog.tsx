/**
 * Filter presets dialog - Save and load filter configurations
 */

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemSecondaryAction,
  IconButton,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import type { LibraryFilters } from "./types";
import {
  useFilterPresets,
  useCreateFilterPreset,
  useUpdateFilterPreset,
  useDeleteFilterPreset,
  type FilterPreset,
} from "@/hooks/useFilterPresets";

export interface FilterPresetsDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Current filter state to save */
  currentFilters: LibraryFilters;
  /** Callback when a preset is loaded */
  onLoadPreset: (filters: Partial<LibraryFilters>) => void;
}

/**
 * Dialog for managing filter presets
 */
export function FilterPresetsDialog({
  open,
  onClose,
  currentFilters,
  onLoadPreset,
}: FilterPresetsDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const [saveMode, setSaveMode] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetDescription, setPresetDescription] = useState("");

  // Queries and mutations
  const { data: presets, isLoading, error } = useFilterPresets();
  const createPreset = useCreateFilterPreset();
  const updatePreset = useUpdateFilterPreset();
  const deletePreset = useDeleteFilterPreset();

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;

    const description = presetDescription.trim();
    await createPreset.mutateAsync({
      name: presetName.trim(),
      ...(description && { description }),
      filters: currentFilters,
    });

    setPresetName("");
    setPresetDescription("");
    setSaveMode(false);
  };

  const handleLoadPreset = (preset: FilterPreset) => {
    onLoadPreset(preset.filters);
    onClose();
  };

  const handleToggleDefault = async (preset: FilterPreset) => {
    await updatePreset.mutateAsync({
      id: preset.id,
      input: { isDefault: !preset.isDefault },
    });
  };

  const handleDeletePreset = async (id: string) => {
    if (window.confirm(t("library.filterPresets.confirmDelete"))) {
      await deletePreset.mutateAsync(id);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {saveMode
          ? t("library.filterPresets.saveTitle")
          : t("library.filterPresets.title")}
      </DialogTitle>
      <DialogContent>
        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        )}

        {saveMode ? (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label={t("library.filterPresets.nameLabel")}
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              sx={{ mb: 2 }}
              autoFocus
            />
            <TextField
              fullWidth
              label={t("library.filterPresets.descriptionLabel")}
              value={presetDescription}
              onChange={(e) => setPresetDescription(e.target.value)}
              multiline
              rows={2}
              placeholder={t("library.filterPresets.descriptionPlaceholder")}
            />
          </Box>
        ) : (
          <>
            {presets && presets.length === 0 ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  {t("library.filterPresets.noPresets")}
                </Typography>
              </Box>
            ) : (
              <List>
                {presets?.map((preset) => (
                  <ListItem key={preset.id} disablePadding>
                    <ListItemButton onClick={() => handleLoadPreset(preset)}>
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            {preset.name}
                            {preset.isDefault && (
                              <StarIcon
                                fontSize="small"
                                color="primary"
                                titleAccess={t("library.filterPresets.default")}
                              />
                            )}
                          </Box>
                        }
                        secondary={preset.description}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          aria-label={t("library.filterPresets.toggleDefault")}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleDefault(preset);
                          }}
                          sx={{ mr: 1 }}
                        >
                          {preset.isDefault ? (
                            <StarIcon color="primary" />
                          ) : (
                            <StarBorderIcon />
                          )}
                        </IconButton>
                        <IconButton
                          edge="end"
                          aria-label={t("common.delete")}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePreset(preset.id);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}
      </DialogContent>
      <Divider />
      <DialogActions>
        {saveMode ? (
          <>
            <Button onClick={() => setSaveMode(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSavePreset}
              variant="contained"
              disabled={!presetName.trim() || createPreset.isPending}
            >
              {createPreset.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>{t("common.close")}</Button>
            <Button onClick={() => setSaveMode(true)} variant="contained">
              {t("library.filterPresets.saveCurrentFilters")}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
