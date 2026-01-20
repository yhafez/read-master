/**
 * CurriculumItemsManager Component
 *
 * Manages curriculum items (books, external resources):
 * - Add books from library
 * - Add external resources (URLs)
 * - Drag-and-drop reordering
 * - Edit item notes
 * - Delete items
 */

import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  Stack,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Add,
  DragIndicator,
  Delete,
  Edit,
  Link as LinkIcon,
  MenuBook,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

// ============================================================================
// Types
// ============================================================================

export interface CurriculumItem {
  id: string;
  type: "BOOK" | "EXTERNAL_RESOURCE";
  orderIndex: number;
  bookId?: string;
  bookTitle?: string;
  externalUrl?: string;
  externalTitle?: string;
  notes?: string;
  estimatedTimeMinutes?: number;
}

export interface CurriculumItemsManagerProps {
  /** Current curriculum items */
  items: CurriculumItem[];
  /** Called when items are updated */
  onItemsChange: (items: CurriculumItem[]) => void;
  /** Available books for selection */
  availableBooks?: Array<{ id: string; title: string }>;
  /** Whether in edit mode */
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function CurriculumItemsManager({
  items,
  onItemsChange,
  availableBooks = [],
  disabled = false,
}: CurriculumItemsManagerProps): React.ReactElement {
  const { t } = useTranslation();

  // State
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addItemType, setAddItemType] = useState<"BOOK" | "EXTERNAL_RESOURCE">(
    "BOOK"
  );
  const [selectedBookId, setSelectedBookId] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [externalTitle, setExternalTitle] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [itemEstimatedTime, setItemEstimatedTime] = useState<number>(0);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  /**
   * Open add dialog
   */
  const handleOpenAddDialog = () => {
    setAddDialogOpen(true);
    setSelectedBookId("");
    setExternalUrl("");
    setExternalTitle("");
    setItemNotes("");
    setItemEstimatedTime(0);
  };

  /**
   * Close add dialog
   */
  const handleCloseAddDialog = () => {
    setAddDialogOpen(false);
    setEditingItemId(null);
  };

  /**
   * Add item
   */
  const handleAddItem = () => {
    if (addItemType === "BOOK" && !selectedBookId) return;
    if (addItemType === "EXTERNAL_RESOURCE" && (!externalUrl || !externalTitle))
      return;

    const newItem: CurriculumItem = {
      id: `temp-${Date.now()}`,
      type: addItemType,
      orderIndex: items.length,
      ...(addItemType === "BOOK" && {
        bookId: selectedBookId,
        bookTitle:
          availableBooks.find((b) => b.id === selectedBookId)?.title || "",
      }),
      ...(addItemType === "EXTERNAL_RESOURCE" && {
        externalUrl,
        externalTitle,
      }),
      ...(itemNotes && { notes: itemNotes }),
      ...(itemEstimatedTime > 0 && { estimatedTimeMinutes: itemEstimatedTime }),
    };

    onItemsChange([...items, newItem]);
    handleCloseAddDialog();
  };

  /**
   * Remove item
   */
  const handleRemoveItem = (itemId: string) => {
    const filtered = items.filter((item) => item.id !== itemId);
    // Reindex
    const reindexed = filtered.map((item, index) => ({
      ...item,
      orderIndex: index,
    }));
    onItemsChange(reindexed);
  };

  /**
   * Handle drag start
   */
  const handleDragStart = (itemId: string) => () => {
    setDraggedItemId(itemId);
  };

  /**
   * Handle drag over
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  /**
   * Handle drop
   */
  const handleDrop = (targetItemId: string) => () => {
    if (!draggedItemId || draggedItemId === targetItemId) return;

    const draggedIndex = items.findIndex((item) => item.id === draggedItemId);
    const targetIndex = items.findIndex((item) => item.id === targetItemId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder
    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    if (removed) {
      newItems.splice(targetIndex, 0, removed);
    }

    // Reindex
    const reindexed = newItems.map((item, index) => ({
      ...item,
      orderIndex: index,
    }));

    onItemsChange(reindexed);
    setDraggedItemId(null);
  };

  /**
   * Handle edit item
   */
  const handleEditItem = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      return;
    }

    setEditingItemId(itemId);
    setAddItemType(item.type);
    if (item.type === "BOOK" && item.bookId) {
      setSelectedBookId(item.bookId);
    } else if (item.type === "EXTERNAL_RESOURCE") {
      setExternalUrl(item.externalUrl || "");
      setExternalTitle(item.externalTitle || "");
    }
    setItemNotes(item.notes || "");
    setItemEstimatedTime(item.estimatedTimeMinutes || 0);
    setAddDialogOpen(true);
  };

  /**
   * Update edited item
   */
  const handleUpdateItem = () => {
    if (!editingItemId) return;

    const updatedItems = items.map((item) => {
      if (item.id === editingItemId) {
        const baseUpdate = {
          ...item,
          ...(itemNotes && { notes: itemNotes }),
          ...(itemEstimatedTime > 0 && {
            estimatedTimeMinutes: itemEstimatedTime,
          }),
        };

        if (addItemType === "BOOK") {
          return {
            ...baseUpdate,
            bookId: selectedBookId,
            bookTitle:
              availableBooks.find((b) => b.id === selectedBookId)?.title || "",
          };
        } else {
          return {
            ...baseUpdate,
            externalUrl,
            externalTitle,
          };
        }
      }
      return item;
    });

    onItemsChange(updatedItems);
    handleCloseAddDialog();
  };

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">{t("curriculums.items.title")}</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenAddDialog}
          disabled={disabled}
        >
          {t("curriculums.items.add")}
        </Button>
      </Stack>

      {items.length === 0 ? (
        <Card>
          <CardContent>
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
            >
              {t("curriculums.items.empty")}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <List>
          {items
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((item) => (
              <ListItem
                key={item.id}
                draggable={!disabled}
                onDragStart={handleDragStart(item.id)}
                onDragOver={handleDragOver}
                onDrop={handleDrop(item.id)}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  mb: 1,
                  cursor: disabled ? "default" : "grab",
                  "&:active": { cursor: disabled ? "default" : "grabbing" },
                  bgcolor:
                    draggedItemId === item.id
                      ? "action.hover"
                      : "background.paper",
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  width="100%"
                  spacing={2}
                >
                  {!disabled && (
                    <DragIndicator sx={{ color: "text.secondary" }} />
                  )}

                  <Chip
                    icon={item.type === "BOOK" ? <MenuBook /> : <LinkIcon />}
                    label={item.type === "BOOK" ? "Book" : "Link"}
                    size="small"
                  />

                  <Box flex={1}>
                    <Typography variant="body1">
                      {item.type === "BOOK"
                        ? item.bookTitle
                        : item.externalTitle}
                    </Typography>
                    {item.notes && (
                      <Typography variant="caption" color="text.secondary">
                        {item.notes}
                      </Typography>
                    )}
                    {item.estimatedTimeMinutes && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        {t("curriculums.items.estimatedTime", {
                          minutes: item.estimatedTimeMinutes,
                        })}
                      </Typography>
                    )}
                  </Box>

                  {!disabled && (
                    <Stack direction="row" spacing={1}>
                      <Tooltip title={t("common.edit")}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditItem(item.id)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("common.delete")}>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveItem(item.id)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}
                </Stack>
              </ListItem>
            ))}
        </List>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={handleCloseAddDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingItemId
            ? t("curriculums.items.editItem")
            : t("curriculums.items.addItem")}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {!editingItemId && (
              <FormControl fullWidth>
                <InputLabel>{t("curriculums.items.type")}</InputLabel>
                <Select
                  value={addItemType}
                  onChange={(e) =>
                    setAddItemType(
                      e.target.value as "BOOK" | "EXTERNAL_RESOURCE"
                    )
                  }
                  label={t("curriculums.items.type")}
                >
                  <MenuItem value="BOOK">
                    {t("curriculums.items.typeBook")}
                  </MenuItem>
                  <MenuItem value="EXTERNAL_RESOURCE">
                    {t("curriculums.items.typeExternal")}
                  </MenuItem>
                </Select>
              </FormControl>
            )}

            {addItemType === "BOOK" ? (
              <FormControl fullWidth>
                <InputLabel>{t("curriculums.items.selectBook")}</InputLabel>
                <Select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  label={t("curriculums.items.selectBook")}
                  required
                >
                  {availableBooks.map((book) => (
                    <MenuItem key={book.id} value={book.id}>
                      {book.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <>
                <TextField
                  label={t("curriculums.items.externalTitle")}
                  value={externalTitle}
                  onChange={(e) => setExternalTitle(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label={t("curriculums.items.externalUrl")}
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  required
                  fullWidth
                  type="url"
                />
              </>
            )}

            <TextField
              label={t("curriculums.items.notes")}
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />

            <TextField
              label={t("curriculums.items.estimatedTime")}
              value={itemEstimatedTime || ""}
              onChange={(e) =>
                setItemEstimatedTime(parseInt(e.target.value) || 0)
              }
              fullWidth
              type="number"
              inputProps={{ min: 0 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog}>{t("common.cancel")}</Button>
          <Button
            onClick={editingItemId ? handleUpdateItem : handleAddItem}
            variant="contained"
            disabled={
              addItemType === "BOOK"
                ? !selectedBookId
                : !externalUrl || !externalTitle
            }
          >
            {editingItemId ? t("common.save") : t("common.add")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
