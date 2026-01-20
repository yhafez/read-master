/**
 * Create/Edit Reading List Dialog
 *
 * Dialog for creating new reading lists or editing existing ones.
 * Allows users to set list name, description, and privacy settings.
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Stack,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

// ============================================================================
// Types
// ============================================================================

export type ListFormData = {
  name: string;
  description: string;
  isPublic: boolean;
};

type CreateEditListDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: ListFormData) => void;
  initialData?: Partial<ListFormData> | undefined;
  isEditing?: boolean;
};

// ============================================================================
// Main Component
// ============================================================================

export function CreateEditListDialog({
  open,
  onClose,
  onSave,
  initialData,
  isEditing = false,
}: CreateEditListDialogProps): React.ReactElement {
  const { t } = useTranslation();

  // State
  const [formData, setFormData] = useState<ListFormData>({
    name: "",
    description: "",
    isPublic: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ListFormData, string>>>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: initialData?.name || "",
        description: initialData?.description || "",
        isPublic: initialData?.isPublic || false,
      });
      setErrors({});
    }
  }, [open, initialData]);

  // Handlers
  const handleChange = (field: keyof ListFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ListFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = t("library.listNameRequired");
    } else if (formData.name.length > 100) {
      newErrors.name = t("library.listNameTooLong");
    }

    if (formData.description.length > 500) {
      newErrors.description = t("library.descriptionTooLong");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(formData);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {isEditing ? t("library.editList") : t("library.createList")}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* List Name */}
          <TextField
            fullWidth
            label={t("library.listName")}
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            onKeyPress={handleKeyPress}
            error={!!errors.name}
            helperText={errors.name || t("library.listNameHelper")}
            required
            autoFocus
          />

          {/* Description */}
          <TextField
            fullWidth
            label={t("library.description")}
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            error={!!errors.description}
            helperText={errors.description || t("library.descriptionOptional")}
            multiline
            rows={3}
          />

          {/* Public Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={formData.isPublic}
                onChange={(e) => handleChange("isPublic", e.target.checked)}
              />
            }
            label={
              <Stack>
                <Typography variant="body2">
                  {t("library.makeListPublic")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("library.publicListHelper")}
                </Typography>
              </Stack>
            }
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!formData.name.trim()}
        >
          {isEditing ? t("common.saveChanges") : t("common.create")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateEditListDialog;
