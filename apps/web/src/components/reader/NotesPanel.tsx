/**
 * NotesPanel component
 *
 * A split-screen panel for viewing and editing annotations alongside the reader.
 * Features search, filter presets, editing, and resizable layout.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  InputAdornment,
  Tooltip,
  Button,
  Stack,
  Paper,
  Chip,
} from "@mui/material";
import {
  Close,
  Search,
  Edit,
  Save,
  Cancel,
  MoreVert,
  Delete,
  FilterList,
  SortByAlpha,
  ArrowUpward,
  ArrowDownward,
  DragIndicator,
  HighlightAlt,
  Note,
  Bookmark,
  VerticalSplit,
  HorizontalSplit,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import type { Annotation, HighlightAnnotation } from "./annotationTypes";
import { isHighlight, HIGHLIGHT_COLOR_VALUES } from "./annotationTypes";
import type {
  NoteFilterPreset,
  NotesPanelSettings,
  PanelPosition,
} from "./notesPanelUtils";
import {
  getFilteredAnnotations,
  getAnnotationEditText,
  getAnnotationContext,
  getAnnotationListExcerpt,
  getFilterPresetLabelKey,
  getSortFieldLabelKey,
  getFilterPresets,
  getSortFields,
  savePanelSettings,
  loadPanelSettings,
  countByPreset,
  clampWidth,
  clampHeight,
} from "./notesPanelUtils";
import type { AnnotationSort } from "./annotationTypes";

export interface NotesPanelProps {
  /** Whether the panel is open */
  open: boolean;
  /** Called when panel should close */
  onClose: () => void;
  /** All annotations for the book */
  annotations: Annotation[];
  /** Called when an annotation is clicked (navigate to it) */
  onAnnotationClick: (annotation: Annotation) => void;
  /** Called when annotation note is updated */
  onUpdateNote: (id: string, note: string) => void;
  /** Called when delete is requested */
  onDelete: (annotation: Annotation) => void;
  /** Panel position (right or bottom) */
  position?: PanelPosition;
  /** Called when position changes */
  onPositionChange?: (position: PanelPosition) => void;
}

/**
 * Individual note item in the list
 */
function NoteListItem({
  annotation,
  isSelected,
  isEditing,
  editValue,
  onClick,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditChange,
  onDelete,
}: {
  annotation: Annotation;
  isSelected: boolean;
  isEditing: boolean;
  editValue: string;
  onClick: () => void;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  onEditChange: (value: string) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    onEditStart();
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete();
  };

  // Get icon based on type
  const icon =
    annotation.type === "HIGHLIGHT" ? (
      <HighlightAlt fontSize="small" />
    ) : annotation.type === "NOTE" ? (
      <Note fontSize="small" />
    ) : (
      <Bookmark fontSize="small" />
    );

  // Get background color for highlights
  const backgroundColor = isHighlight(annotation)
    ? HIGHLIGHT_COLOR_VALUES[(annotation as HighlightAnnotation).color]
    : undefined;

  // Get context (selected text)
  const context = getAnnotationContext(annotation);

  if (isEditing) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 2,
          mb: 1,
          borderLeft: 3,
          borderColor: backgroundColor ?? "primary.main",
        }}
      >
        {context && (
          <Typography
            variant="body2"
            sx={{
              mb: 1,
              p: 1,
              bgcolor: "action.hover",
              borderRadius: 1,
              fontStyle: "italic",
              fontSize: "0.85rem",
            }}
          >
            {context
              ? context.length > 150
                ? `"${context.slice(0, 147)}..."`
                : `"${context}"`
              : ""}
          </Typography>
        )}
        <TextField
          multiline
          fullWidth
          minRows={3}
          maxRows={8}
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          placeholder={t("reader.notes.notePlaceholder")}
          autoFocus
          size="small"
          sx={{ mb: 1 }}
        />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" startIcon={<Cancel />} onClick={onEditCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<Save />}
            onClick={onEditSave}
          >
            {t("common.save")}
          </Button>
        </Stack>
      </Paper>
    );
  }

  // Helper to get truncated context
  const getContextExcerpt = (text: string | null, maxLen: number): string => {
    if (!text) return "";
    return text.length > maxLen ? `${text.slice(0, maxLen - 3)}...` : text;
  };

  return (
    <Box sx={{ position: "relative", mb: 0.5 }}>
      <ListItemButton
        onClick={onClick}
        selected={isSelected}
        sx={{
          borderRadius: 1,
          borderLeft: 3,
          borderColor: backgroundColor ?? "primary.main",
          backgroundColor: backgroundColor ? `${backgroundColor}20` : undefined,
          pr: 6, // Space for the action button
          "&:hover": {
            backgroundColor: backgroundColor
              ? `${backgroundColor}40`
              : "action.hover",
          },
          "&.Mui-selected": {
            backgroundColor: backgroundColor
              ? `${backgroundColor}30`
              : "action.selected",
          },
        }}
      >
        <Box sx={{ mr: 1.5, color: "text.secondary" }}>{icon}</Box>
        <ListItemText
          primary={
            <Typography
              variant="body2"
              sx={{
                fontStyle: annotation.note ? "normal" : "italic",
                color: annotation.note ? "text.primary" : "text.secondary",
              }}
            >
              {annotation.note
                ? getAnnotationListExcerpt(annotation, 100)
                : context
                  ? `"${getContextExcerpt(context, 80)}"`
                  : t("reader.notes.noNote")}
            </Typography>
          }
          secondary={
            context && annotation.note ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontStyle: "italic", display: "block", mt: 0.5 }}
              >
                "{getContextExcerpt(context, 60)}"
              </Typography>
            ) : null
          }
        />
      </ListItemButton>
      <Box
        sx={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        <IconButton
          size="small"
          onClick={handleMenuOpen}
          aria-label={t("common.moreOptions")}
        >
          <MoreVert fontSize="small" />
        </IconButton>
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          {t("common.edit")}
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          {t("common.delete")}
        </MenuItem>
      </Menu>
    </Box>
  );
}

/**
 * Main NotesPanel component
 */
export function NotesPanel({
  open,
  onClose,
  annotations,
  onAnnotationClick,
  onUpdateNote,
  onDelete,
  position: controlledPosition,
  onPositionChange,
}: NotesPanelProps) {
  const { t } = useTranslation();

  // Load persisted settings
  const [settings, setSettings] = useState<NotesPanelSettings>(() =>
    loadPanelSettings()
  );

  // Derive position from props or settings
  const position = controlledPosition ?? settings.position;

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [sortMenuAnchor, setSortMenuAnchor] = useState<HTMLElement | null>(
    null
  );
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<HTMLElement | null>(
    null
  );

  // Resizing state
  const panelRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [panelSize, setPanelSize] = useState({
    width: settings.width,
    height: settings.height,
  });

  // Update settings when they change
  const updateSettings = useCallback((updates: Partial<NotesPanelSettings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      savePanelSettings(newSettings);
      return newSettings;
    });
  }, []);

  // Filter and sort annotations
  const displayedAnnotations = useMemo(
    () => getFilteredAnnotations(annotations, settings, searchQuery),
    [annotations, settings, searchQuery]
  );

  // Counts for filter chips
  const counts = useMemo(
    () => ({
      all: countByPreset(annotations, "all"),
      notesOnly: countByPreset(annotations, "notes-only"),
      withNotes: countByPreset(annotations, "with-notes"),
    }),
    [annotations]
  );

  // Handle annotation click
  const handleAnnotationClick = useCallback(
    (annotation: Annotation) => {
      setSelectedId(annotation.id);
      onAnnotationClick(annotation);
    },
    [onAnnotationClick]
  );

  // Handle edit start
  const handleEditStart = useCallback((annotation: Annotation) => {
    setEditingId(annotation.id);
    setEditValue(getAnnotationEditText(annotation));
  }, []);

  // Handle edit cancel
  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditValue("");
  }, []);

  // Handle edit save
  const handleEditSave = useCallback(() => {
    if (editingId) {
      onUpdateNote(editingId, editValue);
      setEditingId(null);
      setEditValue("");
    }
  }, [editingId, editValue, onUpdateNote]);

  // Handle filter change
  const handleFilterChange = useCallback(
    (preset: NoteFilterPreset) => {
      updateSettings({ filterPreset: preset });
      setFilterMenuAnchor(null);
    },
    [updateSettings]
  );

  // Handle sort change
  const handleSortChange = useCallback(
    (field: AnnotationSort["field"]) => {
      const direction =
        settings.sortField === field && settings.sortDirection === "asc"
          ? "desc"
          : "asc";
      updateSettings({ sortField: field, sortDirection: direction });
      setSortMenuAnchor(null);
    },
    [settings.sortField, settings.sortDirection, updateSettings]
  );

  // Handle position toggle
  const handlePositionToggle = useCallback(() => {
    const newPosition = position === "right" ? "bottom" : "right";
    updateSettings({ position: newPosition });
    onPositionChange?.(newPosition);
  }, [position, updateSettings, onPositionChange]);

  // Resize handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = panelSize.width;
      const startHeight = panelSize.height;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (position === "right") {
          const deltaX = startX - moveEvent.clientX;
          const newWidth = clampWidth(startWidth + deltaX);
          setPanelSize((prev) => ({ ...prev, width: newWidth }));
        } else {
          const deltaY = startY - moveEvent.clientY;
          const newHeight = clampHeight(startHeight + deltaY);
          setPanelSize((prev) => ({ ...prev, height: newHeight }));
        }
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        // Save final size
        if (position === "right") {
          updateSettings({ width: panelSize.width });
        } else {
          updateSettings({ height: panelSize.height });
        }
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [panelSize, position, updateSettings]
  );

  // Reset size on position change
  useEffect(() => {
    setPanelSize({
      width: settings.width,
      height: settings.height,
    });
  }, [settings.width, settings.height]);

  if (!open) {
    return null;
  }

  const panelWidth = position === "right" ? panelSize.width : "100%";
  const panelHeight = position === "bottom" ? panelSize.height : "100%";

  return (
    <Box
      ref={panelRef}
      sx={{
        width: panelWidth,
        height: panelHeight,
        display: "flex",
        flexDirection: "column",
        borderLeft: position === "right" ? 1 : 0,
        borderTop: position === "bottom" ? 1 : 0,
        borderColor: "divider",
        bgcolor: "background.paper",
        position: "relative",
      }}
    >
      {/* Resize handle */}
      <Box
        onMouseDown={handleResizeStart}
        sx={{
          position: "absolute",
          ...(position === "right"
            ? { left: 0, top: 0, bottom: 0, width: 8 }
            : { top: 0, left: 0, right: 0, height: 8 }),
          cursor: position === "right" ? "ew-resize" : "ns-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "&:hover": { bgcolor: "action.hover" },
          ...(isResizing && { bgcolor: "action.selected" }),
        }}
      >
        <DragIndicator
          sx={{
            fontSize: 16,
            color: "text.disabled",
            transform: position === "right" ? "rotate(90deg)" : "none",
          }}
        />
      </Box>

      {/* Header */}
      <Box
        sx={{
          p: 1.5,
          pl: position === "right" ? 2 : 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
          {t("reader.notes.title")}
        </Typography>

        <Tooltip title={t("reader.notes.togglePosition")}>
          <IconButton size="small" onClick={handlePositionToggle}>
            {position === "right" ? <HorizontalSplit /> : <VerticalSplit />}
          </IconButton>
        </Tooltip>

        <IconButton
          size="small"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <Close />
        </IconButton>
      </Box>

      {/* Search and filters */}
      <Box sx={{ p: 1.5, pl: position === "right" ? 2 : 1.5 }}>
        <TextField
          size="small"
          placeholder={t("reader.notes.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 1 }}
        />

        <Stack direction="row" spacing={1} alignItems="center">
          {/* Filter dropdown */}
          <Tooltip title={t("reader.notes.filter")}>
            <IconButton
              size="small"
              onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
            >
              <FilterList />
            </IconButton>
          </Tooltip>

          {/* Filter chips */}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ flex: 1, flexWrap: "wrap" }}
          >
            {getFilterPresets().map((preset) => (
              <Chip
                key={preset}
                label={t(getFilterPresetLabelKey(preset))}
                size="small"
                variant={
                  settings.filterPreset === preset ? "filled" : "outlined"
                }
                onClick={() => handleFilterChange(preset)}
                sx={{ fontSize: "0.7rem" }}
              />
            ))}
          </Stack>

          {/* Sort button */}
          <Tooltip title={t("reader.notes.sort")}>
            <IconButton
              size="small"
              onClick={(e) => setSortMenuAnchor(e.currentTarget)}
            >
              <SortByAlpha />
              {settings.sortDirection === "asc" ? (
                <ArrowUpward sx={{ fontSize: 12, ml: -0.5 }} />
              ) : (
                <ArrowDownward sx={{ fontSize: 12, ml: -0.5 }} />
              )}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Filter menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
      >
        {getFilterPresets().map((preset) => (
          <MenuItem
            key={preset}
            onClick={() => handleFilterChange(preset)}
            selected={settings.filterPreset === preset}
          >
            {t(getFilterPresetLabelKey(preset))}
          </MenuItem>
        ))}
      </Menu>

      {/* Sort menu */}
      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={() => setSortMenuAnchor(null)}
      >
        {getSortFields().map((field) => (
          <MenuItem
            key={field}
            onClick={() => handleSortChange(field)}
            selected={settings.sortField === field}
          >
            {t(getSortFieldLabelKey(field))}
            {settings.sortField === field &&
              (settings.sortDirection === "asc" ? (
                <ArrowUpward sx={{ fontSize: 16, ml: 1 }} />
              ) : (
                <ArrowDownward sx={{ fontSize: 16, ml: 1 }} />
              ))}
          </MenuItem>
        ))}
      </Menu>

      {/* Annotation list */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          px: 1.5,
          pl: position === "right" ? 2 : 1.5,
        }}
      >
        {displayedAnnotations.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 4,
              color: "text.secondary",
            }}
          >
            <FilterList sx={{ fontSize: 48, opacity: 0.5, mb: 2 }} />
            <Typography variant="body2" align="center">
              {searchQuery
                ? t("reader.notes.noSearchResults")
                : t("reader.notes.noAnnotations")}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {displayedAnnotations.map((annotation) => (
              <NoteListItem
                key={annotation.id}
                annotation={annotation}
                isSelected={selectedId === annotation.id}
                isEditing={editingId === annotation.id}
                editValue={editValue}
                onClick={() => handleAnnotationClick(annotation)}
                onEditStart={() => handleEditStart(annotation)}
                onEditCancel={handleEditCancel}
                onEditSave={handleEditSave}
                onEditChange={setEditValue}
                onDelete={() => onDelete(annotation)}
              />
            ))}
          </List>
        )}
      </Box>

      {/* Footer with count */}
      <Box
        sx={{
          p: 1,
          pl: position === "right" ? 2 : 1,
          borderTop: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {t("reader.notes.showing", {
            count: displayedAnnotations.length,
            total: annotations.length,
          })}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t("reader.notes.withNotes", { count: counts.withNotes })}
        </Typography>
      </Box>
    </Box>
  );
}

export default NotesPanel;
