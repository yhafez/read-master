/**
 * Advanced book search dialog with comprehensive filtering options
 */

import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  Box,
  Typography,
  Chip,
  Slider,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  Bookmark as BookmarkIcon,
  Percent as PercentIcon,
  Category as CategoryIcon,
  Label as LabelIcon,
  CalendarMonth as CalendarIcon,
  Description as FileIcon,
  FilterAlt as FilterIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import type { Book } from "@/hooks/useBooks";
import type {
  AdvancedSearchFilters,
  FilterChip as FilterChipType,
} from "./advancedSearchTypes";
import {
  createDefaultFilters,
  areFiltersDefault,
  countActiveFilters,
  generateFilterChips,
  formatProgressRange,
  clampProgressRange,
  mergeFilters,
  BOOK_TYPE_OPTIONS,
  PROGRESS_PRESETS,
} from "./advancedSearchTypes";
import { STATUS_FILTERS } from "./types";

// =============================================================================
// TYPES
// =============================================================================

export interface AdvancedBookSearchProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback when filters are applied */
  onApplyFilters: (filters: AdvancedSearchFilters) => void;
  /** Initial filters */
  initialFilters?: Partial<AdvancedSearchFilters>;
  /** Available genres from user's books */
  availableGenres?: string[];
  /** Available tags from user's books */
  availableTags?: string[];
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const COMMON_GENRES = [
  "fiction",
  "nonFiction",
  "mystery",
  "romance",
  "sciFi",
  "fantasy",
  "biography",
  "history",
  "selfHelp",
  "business",
] as const;

interface FilterSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function FilterSection({
  id,
  title,
  icon,
  expanded,
  onToggle,
  children,
}: FilterSectionProps): React.ReactElement {
  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      disableGutters
      sx={{
        "&:before": { display: "none" },
        boxShadow: "none",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${id}-content`}
        id={`${id}-header`}
        sx={{ px: 0 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {icon}
          <Typography variant="subtitle2">{title}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0, pb: 2 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

interface ActiveFilterChipsProps {
  chips: FilterChipType[];
  t: (key: string) => string;
}

function ActiveFilterChips({
  chips,
  t,
}: ActiveFilterChipsProps): React.ReactElement | null {
  if (chips.length === 0) return null;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 2 }}>
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          label={`${t(chip.labelKey)}: ${chip.value}`}
          size="small"
          onDelete={chip.onRemove}
          color="primary"
          variant="outlined"
        />
      ))}
    </Box>
  );
}

/**
 * Format a Date object to YYYY-MM-DD for date input
 */
function formatDateForInput(date: Date | null): string {
  if (!date) return "";
  const parts = date.toISOString().split("T");
  return parts[0] ?? "";
}

/**
 * Parse a date input value to Date object
 */
function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AdvancedBookSearch({
  open,
  onClose,
  onApplyFilters,
  initialFilters,
  availableGenres = COMMON_GENRES as unknown as string[],
  availableTags = [],
}: AdvancedBookSearchProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Local filter state
  const [filters, setFilters] = useState<AdvancedSearchFilters>(() =>
    initialFilters
      ? mergeFilters(createDefaultFilters(), initialFilters)
      : createDefaultFilters()
  );

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    status: true,
    progress: true,
    genre: false,
    tags: false,
    dates: false,
    type: false,
  });

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  // Update filters
  const updateFilters = useCallback(
    (updates: Partial<AdvancedSearchFilters>) => {
      setFilters((prev) => mergeFilters(prev, updates));
    },
    []
  );

  // Handle filter removal
  const handleRemoveFilter = useCallback(
    (key: keyof AdvancedSearchFilters, value?: string) => {
      switch (key) {
        case "status":
          updateFilters({ status: "all" });
          break;
        case "genres":
          if (value) {
            updateFilters({
              genres: filters.genres.filter((g) => g !== value),
            });
          }
          break;
        case "tags":
          if (value) {
            updateFilters({
              tags: filters.tags.filter((tg) => tg !== value),
            });
          }
          break;
        case "progress":
          updateFilters({ progress: { min: 0, max: 100 } });
          break;
        case "types":
          if (value) {
            updateFilters({
              types: filters.types.filter((tp) => tp !== value),
            });
          }
          break;
        case "author":
          updateFilters({ author: "" });
          break;
        case "dateAdded":
          updateFilters({ dateAdded: { start: null, end: null } });
          break;
        case "lastRead":
          updateFilters({ lastRead: { start: null, end: null } });
          break;
        default:
          break;
      }
    },
    [filters, updateFilters]
  );

  // Generate filter chips
  const filterChips = useMemo(
    () => generateFilterChips(filters, handleRemoveFilter),
    [filters, handleRemoveFilter]
  );

  // Active filter count
  const activeFilterCount = useMemo(
    () => countActiveFilters(filters),
    [filters]
  );

  // Reset filters
  const handleReset = useCallback(() => {
    setFilters(createDefaultFilters());
  }, []);

  // Apply filters
  const handleApply = useCallback(() => {
    onApplyFilters(filters);
    onClose();
  }, [filters, onApplyFilters, onClose]);

  // Handle genre toggle
  const handleGenreToggle = useCallback(
    (genre: string) => {
      updateFilters({
        genres: filters.genres.includes(genre)
          ? filters.genres.filter((g) => g !== genre)
          : [...filters.genres, genre],
      });
    },
    [filters.genres, updateFilters]
  );

  // Handle tag toggle
  const handleTagToggle = useCallback(
    (tag: string) => {
      updateFilters({
        tags: filters.tags.includes(tag)
          ? filters.tags.filter((tg) => tg !== tag)
          : [...filters.tags, tag],
      });
    },
    [filters.tags, updateFilters]
  );

  // Handle type toggle
  const handleTypeToggle = useCallback(
    (type: AdvancedSearchFilters["types"][number]) => {
      updateFilters({
        types: filters.types.includes(type)
          ? filters.types.filter((tp) => tp !== type)
          : [...filters.types, type],
      });
    },
    [filters.types, updateFilters]
  );

  // Handle progress slider change
  const handleProgressChange = useCallback(
    (_event: Event, newValue: number | number[]) => {
      if (Array.isArray(newValue) && newValue.length >= 2) {
        updateFilters({
          progress: clampProgressRange({
            min: newValue[0] ?? 0,
            max: newValue[1] ?? 100,
          }),
        });
      }
    },
    [updateFilters]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      aria-labelledby="advanced-search-dialog-title"
    >
      <DialogTitle
        id="advanced-search-dialog-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FilterIcon />
          <Typography variant="h6" component="span">
            {t("library.advancedSearch.title")}
          </Typography>
          {activeFilterCount > 0 && (
            <Chip
              label={activeFilterCount}
              size="small"
              color="primary"
              sx={{ ml: 1 }}
            />
          )}
        </Box>
        <IconButton onClick={onClose} aria-label={t("common.close")} edge="end">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Search Query */}
        <TextField
          fullWidth
          size="small"
          placeholder={t("library.advancedSearch.searchPlaceholder")}
          value={filters.query}
          onChange={(e) => updateFilters({ query: e.target.value })}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 2 }}
          aria-label={t("library.advancedSearch.searchPlaceholder")}
        />

        {/* Active Filter Chips */}
        <ActiveFilterChips chips={filterChips} t={t} />

        {/* Author Filter */}
        <TextField
          fullWidth
          size="small"
          label={t("library.advancedSearch.author")}
          placeholder={t("library.advancedSearch.authorPlaceholder")}
          value={filters.author}
          onChange={(e) => updateFilters({ author: e.target.value })}
          sx={{ mb: 2 }}
        />

        <Divider sx={{ my: 1 }} />

        {/* Status Section */}
        <FilterSection
          id="status"
          title={t("library.advancedSearch.sections.status")}
          icon={<BookmarkIcon fontSize="small" />}
          expanded={expandedSections.status ?? true}
          onToggle={() => toggleSection("status")}
        >
          <FormControl component="fieldset">
            <FormGroup row>
              {STATUS_FILTERS.map((statusOption) => (
                <FormControlLabel
                  key={statusOption.value}
                  control={
                    <Checkbox
                      checked={filters.status === statusOption.value}
                      onChange={() =>
                        updateFilters({
                          status: statusOption.value as Book["status"] | "all",
                        })
                      }
                      size="small"
                    />
                  }
                  label={t(statusOption.labelKey)}
                />
              ))}
            </FormGroup>
          </FormControl>
        </FilterSection>

        {/* Progress Section */}
        <FilterSection
          id="progress"
          title={t("library.advancedSearch.sections.progress")}
          icon={<PercentIcon fontSize="small" />}
          expanded={expandedSections.progress ?? true}
          onToggle={() => toggleSection("progress")}
        >
          <Box sx={{ px: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {formatProgressRange(filters.progress)}
            </Typography>
            <Slider
              value={[filters.progress.min, filters.progress.max]}
              onChange={handleProgressChange}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}%`}
              min={0}
              max={100}
              sx={{ mt: 2 }}
              aria-label={t("library.advancedSearch.progressRange")}
            />
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 0.5,
                mt: 2,
              }}
            >
              {PROGRESS_PRESETS.map((preset, idx) => (
                <Chip
                  key={idx}
                  label={t(preset.labelKey)}
                  size="small"
                  variant="outlined"
                  onClick={() => updateFilters({ progress: preset.range })}
                />
              ))}
            </Box>
          </Box>
        </FilterSection>

        {/* Genre Section */}
        <FilterSection
          id="genre"
          title={t("library.advancedSearch.sections.genre")}
          icon={<CategoryIcon fontSize="small" />}
          expanded={expandedSections.genre ?? false}
          onToggle={() => toggleSection("genre")}
        >
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {availableGenres.map((genre) => (
              <Chip
                key={genre}
                label={t(`library.genres.${genre}`)}
                size="small"
                variant={filters.genres.includes(genre) ? "filled" : "outlined"}
                color={filters.genres.includes(genre) ? "primary" : "default"}
                onClick={() => handleGenreToggle(genre)}
                aria-pressed={filters.genres.includes(genre)}
              />
            ))}
          </Box>
        </FilterSection>

        {/* Tags Section */}
        {availableTags.length > 0 && (
          <FilterSection
            id="tags"
            title={t("library.advancedSearch.sections.tags")}
            icon={<LabelIcon fontSize="small" />}
            expanded={expandedSections.tags ?? false}
            onToggle={() => toggleSection("tags")}
          >
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {availableTags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  variant={filters.tags.includes(tag) ? "filled" : "outlined"}
                  color={filters.tags.includes(tag) ? "primary" : "default"}
                  onClick={() => handleTagToggle(tag)}
                  aria-pressed={filters.tags.includes(tag)}
                />
              ))}
            </Box>
          </FilterSection>
        )}

        {/* Dates Section */}
        <FilterSection
          id="dates"
          title={t("library.advancedSearch.sections.dates")}
          icon={<CalendarIcon fontSize="small" />}
          expanded={expandedSections.dates ?? false}
          onToggle={() => toggleSection("dates")}
        >
          <FormControl fullWidth sx={{ mb: 2 }}>
            <FormLabel sx={{ mb: 1 }}>
              {t("library.advancedSearch.dateAdded")}
            </FormLabel>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                type="date"
                size="small"
                fullWidth
                label={t("common.from")}
                slotProps={{
                  inputLabel: { shrink: true },
                }}
                value={formatDateForInput(filters.dateAdded.start)}
                onChange={(e) =>
                  updateFilters({
                    dateAdded: {
                      ...filters.dateAdded,
                      start: parseDateInput(e.target.value),
                    },
                  })
                }
              />
              <TextField
                type="date"
                size="small"
                fullWidth
                label={t("common.to")}
                slotProps={{
                  inputLabel: { shrink: true },
                }}
                value={formatDateForInput(filters.dateAdded.end)}
                onChange={(e) =>
                  updateFilters({
                    dateAdded: {
                      ...filters.dateAdded,
                      end: parseDateInput(e.target.value),
                    },
                  })
                }
              />
            </Box>
          </FormControl>

          <FormControl fullWidth>
            <FormLabel sx={{ mb: 1 }}>
              {t("library.advancedSearch.lastRead")}
            </FormLabel>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                type="date"
                size="small"
                fullWidth
                label={t("common.from")}
                slotProps={{
                  inputLabel: { shrink: true },
                }}
                value={formatDateForInput(filters.lastRead.start)}
                onChange={(e) =>
                  updateFilters({
                    lastRead: {
                      ...filters.lastRead,
                      start: parseDateInput(e.target.value),
                    },
                  })
                }
              />
              <TextField
                type="date"
                size="small"
                fullWidth
                label={t("common.to")}
                slotProps={{
                  inputLabel: { shrink: true },
                }}
                value={formatDateForInput(filters.lastRead.end)}
                onChange={(e) =>
                  updateFilters({
                    lastRead: {
                      ...filters.lastRead,
                      end: parseDateInput(e.target.value),
                    },
                  })
                }
              />
            </Box>
          </FormControl>
        </FilterSection>

        {/* File Type Section */}
        <FilterSection
          id="type"
          title={t("library.advancedSearch.sections.type")}
          icon={<FileIcon fontSize="small" />}
          expanded={expandedSections.type ?? false}
          onToggle={() => toggleSection("type")}
        >
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {BOOK_TYPE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={t(option.labelKey)}
                size="small"
                variant={
                  filters.types.includes(option.value) ? "filled" : "outlined"
                }
                color={
                  filters.types.includes(option.value) ? "primary" : "default"
                }
                onClick={() => handleTypeToggle(option.value)}
                aria-pressed={filters.types.includes(option.value)}
              />
            ))}
          </Box>
        </FilterSection>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleReset} disabled={areFiltersDefault(filters)}>
          {t("library.advancedSearch.reset")}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button variant="contained" onClick={handleApply}>
          {t("library.advancedSearch.apply")}
          {activeFilterCount > 0 && ` (${activeFilterCount})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
