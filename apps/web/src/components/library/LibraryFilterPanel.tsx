/**
 * Library filter panel - sidebar/drawer with status, genre, and tag filters
 */

import {
  Box,
  Typography,
  Chip,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  Button,
  Drawer,
  useMediaQuery,
  useTheme,
  Select,
  MenuItem,
  type SelectChangeEvent,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useTranslation } from "react-i18next";

import type {
  StatusFilter,
  LibraryFilters,
  ProgressRangeFilter,
  FileTypeFilter,
  SourceFilter,
} from "./types";
import {
  STATUS_FILTERS,
  PROGRESS_FILTERS,
  FILE_TYPE_FILTERS,
  SOURCE_FILTERS,
} from "./types";

/**
 * Common genres for books
 */
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

export interface LibraryFilterPanelProps {
  /** Whether the filter panel is open */
  open: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Current filters */
  filters: LibraryFilters;
  /** Callback when filters change */
  onFiltersChange: (filters: Partial<LibraryFilters>) => void;
  /** Available tags from user's books */
  availableTags?: string[];
}

export function LibraryFilterPanel({
  open,
  onClose,
  filters,
  onFiltersChange,
  availableTags = [],
}: LibraryFilterPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleStatusChange = (status: StatusFilter) => {
    onFiltersChange({ status });
  };

  const handleGenreToggle = (genre: string) => {
    const newGenres = filters.genres.includes(genre)
      ? filters.genres.filter((g) => g !== genre)
      : [...filters.genres, genre];
    onFiltersChange({ genres: newGenres });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ tags: newTags });
  };

  const handleProgressChange = (event: SelectChangeEvent) => {
    onFiltersChange({ progress: event.target.value as ProgressRangeFilter });
  };

  const handleFileTypeChange = (event: SelectChangeEvent) => {
    onFiltersChange({ fileType: event.target.value as FileTypeFilter });
  };

  const handleSourceChange = (event: SelectChangeEvent) => {
    onFiltersChange({ source: event.target.value as SourceFilter });
  };

  const handleDateRangeChange = (
    type: "dateAdded" | "dateStarted" | "dateCompleted",
    field: "from" | "to",
    value: Date | null
  ) => {
    const currentRange = filters[type];
    onFiltersChange({
      [type]: { ...currentRange, [field]: value },
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      status: "all",
      genres: [],
      tags: [],
      progress: "all",
      fileType: "all",
      source: "all",
      dateAdded: { from: null, to: null },
      dateStarted: { from: null, to: null },
      dateCompleted: { from: null, to: null },
    });
  };

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.genres.length > 0 ||
    filters.tags.length > 0 ||
    filters.progress !== "all" ||
    filters.fileType !== "all" ||
    filters.source !== "all" ||
    filters.dateAdded.from !== null ||
    filters.dateAdded.to !== null ||
    filters.dateStarted.from !== null ||
    filters.dateStarted.to !== null ||
    filters.dateCompleted.from !== null ||
    filters.dateCompleted.to !== null;

  const filterContent = (
    <Box
      sx={{
        width: isMobile ? "100%" : 280,
        p: 2,
        height: "100%",
        overflow: "auto",
      }}
      role="complementary"
      aria-label={t("library.filterPanel")}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6" component="h2">
          {t("common.filter")}
        </Typography>
        {hasActiveFilters && (
          <Button
            size="small"
            onClick={handleClearFilters}
            aria-label={t("library.clearFilters")}
          >
            {t("library.clearFilters")}
          </Button>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Status Filter */}
      <FormControl component="fieldset" sx={{ mb: 3, width: "100%" }}>
        <FormLabel component="legend" sx={{ mb: 1 }}>
          {t("library.status")}
        </FormLabel>
        <FormGroup>
          {STATUS_FILTERS.map((statusOption) => (
            <FormControlLabel
              key={statusOption.value}
              control={
                <Checkbox
                  checked={filters.status === statusOption.value}
                  onChange={() => handleStatusChange(statusOption.value)}
                  size="small"
                />
              }
              label={t(statusOption.labelKey)}
            />
          ))}
        </FormGroup>
      </FormControl>

      <Divider sx={{ mb: 2 }} />

      {/* Genre Filter */}
      <FormControl component="fieldset" sx={{ mb: 3, width: "100%" }}>
        <FormLabel component="legend" sx={{ mb: 1 }}>
          {t("library.genre")}
        </FormLabel>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {COMMON_GENRES.map((genre) => (
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
      </FormControl>

      {/* Tags Filter (only show if user has tags) */}
      {availableTags.length > 0 && (
        <>
          <Divider sx={{ mb: 2 }} />
          <FormControl component="fieldset" sx={{ mb: 3, width: "100%" }}>
            <FormLabel component="legend" sx={{ mb: 1 }}>
              {t("library.tags")}
            </FormLabel>
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
          </FormControl>
        </>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Progress Filter */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <FormLabel sx={{ mb: 1 }}>
          {t("library.filters.progress.label")}
        </FormLabel>
        <Select
          size="small"
          value={filters.progress}
          onChange={handleProgressChange}
          aria-label={t("library.filters.progress.label")}
        >
          {PROGRESS_FILTERS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {t(option.labelKey)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Divider sx={{ mb: 2 }} />

      {/* File Type Filter */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <FormLabel sx={{ mb: 1 }}>
          {t("library.filters.fileType.label")}
        </FormLabel>
        <Select
          size="small"
          value={filters.fileType}
          onChange={handleFileTypeChange}
          aria-label={t("library.filters.fileType.label")}
        >
          {FILE_TYPE_FILTERS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {t(option.labelKey)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Divider sx={{ mb: 2 }} />

      {/* Source Filter */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <FormLabel sx={{ mb: 1 }}>
          {t("library.filters.source.label")}
        </FormLabel>
        <Select
          size="small"
          value={filters.source}
          onChange={handleSourceChange}
          aria-label={t("library.filters.source.label")}
        >
          {SOURCE_FILTERS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {t(option.labelKey)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Divider sx={{ mb: 2 }} />

      {/* Date Range Filters */}
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <FormControl component="fieldset" sx={{ mb: 3, width: "100%" }}>
          <FormLabel component="legend" sx={{ mb: 1 }}>
            {t("library.filters.dateAdded.label")}
          </FormLabel>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <DatePicker
              label={t("library.filters.dateRange.from")}
              value={filters.dateAdded.from}
              onChange={(date) =>
                handleDateRangeChange("dateAdded", "from", date)
              }
              slotProps={{
                textField: {
                  size: "small",
                  fullWidth: true,
                },
              }}
            />
            <DatePicker
              label={t("library.filters.dateRange.to")}
              value={filters.dateAdded.to}
              onChange={(date) =>
                handleDateRangeChange("dateAdded", "to", date)
              }
              slotProps={{
                textField: {
                  size: "small",
                  fullWidth: true,
                },
              }}
            />
          </Box>
        </FormControl>

        <Divider sx={{ mb: 2 }} />

        <FormControl component="fieldset" sx={{ mb: 3, width: "100%" }}>
          <FormLabel component="legend" sx={{ mb: 1 }}>
            {t("library.filters.dateStarted.label")}
          </FormLabel>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <DatePicker
              label={t("library.filters.dateRange.from")}
              value={filters.dateStarted.from}
              onChange={(date) =>
                handleDateRangeChange("dateStarted", "from", date)
              }
              slotProps={{
                textField: {
                  size: "small",
                  fullWidth: true,
                },
              }}
            />
            <DatePicker
              label={t("library.filters.dateRange.to")}
              value={filters.dateStarted.to}
              onChange={(date) =>
                handleDateRangeChange("dateStarted", "to", date)
              }
              slotProps={{
                textField: {
                  size: "small",
                  fullWidth: true,
                },
              }}
            />
          </Box>
        </FormControl>

        <Divider sx={{ mb: 2 }} />

        <FormControl component="fieldset" sx={{ mb: 3, width: "100%" }}>
          <FormLabel component="legend" sx={{ mb: 1 }}>
            {t("library.filters.dateCompleted.label")}
          </FormLabel>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <DatePicker
              label={t("library.filters.dateRange.from")}
              value={filters.dateCompleted.from}
              onChange={(date) =>
                handleDateRangeChange("dateCompleted", "from", date)
              }
              slotProps={{
                textField: {
                  size: "small",
                  fullWidth: true,
                },
              }}
            />
            <DatePicker
              label={t("library.filters.dateRange.to")}
              value={filters.dateCompleted.to}
              onChange={(date) =>
                handleDateRangeChange("dateCompleted", "to", date)
              }
              slotProps={{
                textField: {
                  size: "small",
                  fullWidth: true,
                },
              }}
            />
          </Box>
        </FormControl>
      </LocalizationProvider>
    </Box>
  );

  // On mobile, use a Drawer; on desktop, render inline
  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
      >
        {filterContent}
      </Drawer>
    );
  }

  // Desktop: conditionally render the panel
  if (!open) return <></>;

  return (
    <Box
      sx={{
        borderRight: 1,
        borderColor: "divider",
        flexShrink: 0,
      }}
    >
      {filterContent}
    </Box>
  );
}
