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
} from "@mui/material";
import { useTranslation } from "react-i18next";

import type { StatusFilter, LibraryFilters } from "./types";
import { STATUS_FILTERS } from "./types";

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

  const handleClearFilters = () => {
    onFiltersChange({
      status: "all",
      genres: [],
      tags: [],
    });
  };

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.genres.length > 0 ||
    filters.tags.length > 0;

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
