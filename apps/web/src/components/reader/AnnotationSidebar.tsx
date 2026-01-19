/**
 * AnnotationSidebar component
 *
 * A sidebar panel that displays all annotations for the current book.
 * Features filtering, searching, sorting, and CRUD operations.
 */

import { useState, useMemo } from "react";
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Tabs,
  Tab,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Menu,
  MenuItem,
  InputAdornment,
  Stack,
  Tooltip,
  Badge,
} from "@mui/material";
import {
  Close,
  Search,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  HighlightAlt,
  Note,
  Bookmark,
  FilterList,
  SortByAlpha,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import type {
  Annotation,
  AnnotationViewMode,
  AnnotationSort,
  AnnotationFilters,
  HighlightAnnotation,
} from "./annotationTypes";
import {
  filterAnnotations,
  sortAnnotations,
  countAnnotationsByType,
  getExcerptText,
  formatAnnotationDate,
  isHighlight,
  HIGHLIGHT_COLOR_VALUES,
} from "./annotationTypes";

export interface AnnotationSidebarProps {
  /** Whether the sidebar is open */
  open: boolean;
  /** Called when sidebar should close */
  onClose: () => void;
  /** All annotations for the book */
  annotations: Annotation[];
  /** Called when an annotation is clicked (navigate to it) */
  onAnnotationClick: (annotation: Annotation) => void;
  /** Called when edit is requested */
  onEdit: (annotation: Annotation) => void;
  /** Called when delete is requested */
  onDelete: (annotation: Annotation) => void;
  /** Drawer width */
  width?: number;
}

/**
 * Individual annotation list item
 */
function AnnotationListItem({
  annotation,
  onClick,
  onEdit,
  onDelete,
}: {
  annotation: Annotation;
  onClick: () => void;
  onEdit: () => void;
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
    onEdit();
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete();
  };

  // Get display content
  const primaryText = isHighlight(annotation)
    ? getExcerptText((annotation as HighlightAnnotation).selectedText, 80)
    : annotation.note
      ? getExcerptText(annotation.note, 80)
      : t("reader.annotations.noContent");

  const secondaryText =
    annotation.note && isHighlight(annotation)
      ? getExcerptText(annotation.note, 50)
      : formatAnnotationDate(annotation.createdAt);

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

  return (
    <>
      <ListItem
        onClick={onClick}
        sx={{
          cursor: "pointer",
          borderRadius: 1,
          mb: 0.5,
          borderLeft: 3,
          borderColor: backgroundColor ?? "primary.main",
          backgroundColor: backgroundColor
            ? `${backgroundColor}20`
            : "transparent",
          "&:hover": {
            backgroundColor: backgroundColor
              ? `${backgroundColor}40`
              : "action.hover",
          },
        }}
        secondaryAction={
          <ListItemSecondaryAction>
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              aria-label={t("common.moreOptions")}
            >
              <MoreVert fontSize="small" />
            </IconButton>
          </ListItemSecondaryAction>
        }
      >
        <Box sx={{ mr: 1.5, color: "text.secondary" }}>{icon}</Box>
        <ListItemText
          primary={
            <Typography
              variant="body2"
              sx={{
                fontStyle: isHighlight(annotation) ? "italic" : "normal",
              }}
            >
              {primaryText}
            </Typography>
          }
          secondary={
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 0.5 }}
            >
              <Typography variant="caption" color="text.secondary">
                {secondaryText}
              </Typography>
              {annotation.isPublic && (
                <Visibility
                  fontSize="inherit"
                  sx={{ fontSize: 12, color: "text.secondary" }}
                />
              )}
            </Stack>
          }
        />
      </ListItem>

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
    </>
  );
}

export function AnnotationSidebar({
  open,
  onClose,
  annotations,
  onAnnotationClick,
  onEdit,
  onDelete,
  width = 320,
}: AnnotationSidebarProps) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<AnnotationViewMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<AnnotationSort>({
    field: "startOffset",
    direction: "asc",
  });
  const [sortMenuAnchor, setSortMenuAnchor] = useState<HTMLElement | null>(
    null
  );

  // Count annotations by type
  const counts = useMemo(
    () => countAnnotationsByType(annotations),
    [annotations]
  );

  // Build filters from view mode and search
  const filters: AnnotationFilters = useMemo(() => {
    const f: AnnotationFilters = {};

    if (viewMode !== "all") {
      f.type =
        viewMode === "highlights"
          ? "HIGHLIGHT"
          : viewMode === "notes"
            ? "NOTE"
            : "BOOKMARK";
    }

    if (searchQuery.trim()) {
      f.search = searchQuery.trim();
    }

    return f;
  }, [viewMode, searchQuery]);

  // Filter and sort annotations
  const displayedAnnotations = useMemo(() => {
    const filtered = filterAnnotations(annotations, filters);
    return sortAnnotations(filtered, sort);
  }, [annotations, filters, sort]);

  const handleTabChange = (
    _: React.SyntheticEvent,
    newValue: AnnotationViewMode
  ) => {
    setViewMode(newValue);
  };

  const handleSortClick = (event: React.MouseEvent<HTMLElement>) => {
    setSortMenuAnchor(event.currentTarget);
  };

  const handleSortClose = () => {
    setSortMenuAnchor(null);
  };

  const handleSortChange = (field: AnnotationSort["field"]) => {
    setSort((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
    handleSortClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="h6">{t("reader.annotations.title")}</Typography>
        <IconButton onClick={onClose} aria-label={t("common.close")}>
          <Close />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Tabs
        value={viewMode}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Tab
          value="all"
          label={
            <Badge badgeContent={annotations.length} color="primary" max={99}>
              {t("reader.annotations.tabs.all")}
            </Badge>
          }
        />
        <Tab
          value="highlights"
          label={
            <Badge badgeContent={counts.HIGHLIGHT} color="warning" max={99}>
              <HighlightAlt fontSize="small" />
            </Badge>
          }
        />
        <Tab
          value="notes"
          label={
            <Badge badgeContent={counts.NOTE} color="info" max={99}>
              <Note fontSize="small" />
            </Badge>
          }
        />
        <Tab
          value="bookmarks"
          label={
            <Badge badgeContent={counts.BOOKMARK} color="default" max={99}>
              <Bookmark fontSize="small" />
            </Badge>
          }
        />
      </Tabs>

      {/* Search and Sort */}
      <Box sx={{ p: 1.5, display: "flex", gap: 1 }}>
        <TextField
          size="small"
          placeholder={t("reader.annotations.search")}
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
        />
        <Tooltip title={t("reader.annotations.sort")}>
          <IconButton onClick={handleSortClick} size="small">
            <SortByAlpha />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={handleSortClose}
      >
        <MenuItem
          onClick={() => handleSortChange("startOffset")}
          selected={sort.field === "startOffset"}
        >
          {t("reader.annotations.sortBy.position")}
        </MenuItem>
        <MenuItem
          onClick={() => handleSortChange("createdAt")}
          selected={sort.field === "createdAt"}
        >
          {t("reader.annotations.sortBy.created")}
        </MenuItem>
        <MenuItem
          onClick={() => handleSortChange("updatedAt")}
          selected={sort.field === "updatedAt"}
        >
          {t("reader.annotations.sortBy.updated")}
        </MenuItem>
        <MenuItem
          onClick={() => handleSortChange("type")}
          selected={sort.field === "type"}
        >
          {t("reader.annotations.sortBy.type")}
        </MenuItem>
      </Menu>

      {/* Annotation List */}
      <Box sx={{ flex: 1, overflow: "auto", px: 1.5 }}>
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
            <Typography variant="body2">
              {searchQuery
                ? t("reader.annotations.noSearchResults")
                : t("reader.annotations.noAnnotations")}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {displayedAnnotations.map((annotation) => (
              <AnnotationListItem
                key={annotation.id}
                annotation={annotation}
                onClick={() => onAnnotationClick(annotation)}
                onEdit={() => onEdit(annotation)}
                onDelete={() => onDelete(annotation)}
              />
            ))}
          </List>
        )}
      </Box>

      {/* Footer with count */}
      <Box
        sx={{
          p: 1.5,
          borderTop: 1,
          borderColor: "divider",
          textAlign: "center",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {t("reader.annotations.count", {
            count: displayedAnnotations.length,
          })}
        </Typography>
      </Box>
    </Drawer>
  );
}
