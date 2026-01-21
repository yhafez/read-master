/**
 * Active filter chips component - displays active filters as removable chips
 */

import { Box, Chip, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import type { LibraryFilters } from "./types";

export interface ActiveFilterChipsProps {
  /** Current filters */
  filters: LibraryFilters;
  /** Callback when a filter is removed */
  onRemoveFilter: (filterKey: keyof LibraryFilters, value?: string) => void;
  /** Callback when all filters are cleared */
  onClearAll: () => void;
}

/**
 * Displays active filters as chips that can be clicked to remove
 */
export function ActiveFilterChips({
  filters,
  onRemoveFilter,
  onClearAll,
}: ActiveFilterChipsProps): React.ReactElement | null {
  const { t } = useTranslation();

  const activeChips: Array<{
    key: string;
    label: string;
    filterKey: keyof LibraryFilters;
    value?: string;
  }> = [];

  // Status filter
  if (filters.status !== "all") {
    activeChips.push({
      key: "status",
      label: t(`library.filters.${filters.status}`),
      filterKey: "status",
    });
  }

  // Progress filter
  if (filters.progress !== "all") {
    activeChips.push({
      key: "progress",
      label: `${t("library.filters.progress.label")}: ${t(`library.filters.progress.${filters.progress}`)}`,
      filterKey: "progress",
    });
  }

  // File type filter
  if (filters.fileType !== "all") {
    activeChips.push({
      key: "fileType",
      label: `${t("library.filters.fileType.label")}: ${t(`library.filters.fileType.${filters.fileType.toLowerCase()}`)}`,
      filterKey: "fileType",
    });
  }

  // Source filter
  if (filters.source !== "all") {
    const sourceLower =
      filters.source === "GOOGLE_BOOKS"
        ? "googleBooks"
        : filters.source === "OPEN_LIBRARY"
          ? "openLibrary"
          : filters.source.toLowerCase();
    activeChips.push({
      key: "source",
      label: `${t("library.filters.source.label")}: ${t(`library.filters.source.${sourceLower}`)}`,
      filterKey: "source",
    });
  }

  // Genres
  filters.genres.forEach((genre) => {
    activeChips.push({
      key: `genre-${genre}`,
      label: t(`library.genres.${genre}`),
      filterKey: "genres",
      value: genre,
    });
  });

  // Tags
  filters.tags.forEach((tag) => {
    activeChips.push({
      key: `tag-${tag}`,
      label: tag,
      filterKey: "tags",
      value: tag,
    });
  });

  // Date ranges
  if (filters.dateAdded.from || filters.dateAdded.to) {
    const dateRange = formatDateRange(
      filters.dateAdded.from,
      filters.dateAdded.to
    );
    activeChips.push({
      key: "dateAdded",
      label: `${t("library.filters.dateAdded.label")}: ${dateRange}`,
      filterKey: "dateAdded",
    });
  }

  if (filters.dateStarted.from || filters.dateStarted.to) {
    const dateRange = formatDateRange(
      filters.dateStarted.from,
      filters.dateStarted.to
    );
    activeChips.push({
      key: "dateStarted",
      label: `${t("library.filters.dateStarted.label")}: ${dateRange}`,
      filterKey: "dateStarted",
    });
  }

  if (filters.dateCompleted.from || filters.dateCompleted.to) {
    const dateRange = formatDateRange(
      filters.dateCompleted.from,
      filters.dateCompleted.to
    );
    activeChips.push({
      key: "dateCompleted",
      label: `${t("library.filters.dateCompleted.label")}: ${dateRange}`,
      filterKey: "dateCompleted",
    });
  }

  // Don't render if no active filters
  if (activeChips.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
          {t("library.activeFilters")}:
        </Typography>
        {activeChips.map((chip) => (
          <Chip
            key={chip.key}
            label={chip.label}
            size="small"
            onDelete={() => onRemoveFilter(chip.filterKey, chip.value)}
            sx={{ mb: 1 }}
          />
        ))}
        {activeChips.length > 1 && (
          <Chip
            label={t("library.clearFilters")}
            size="small"
            variant="outlined"
            onClick={onClearAll}
            sx={{ mb: 1 }}
          />
        )}
      </Stack>
    </Box>
  );
}

/**
 * Helper function to format date range for display
 */
function formatDateRange(from: Date | null, to: Date | null): string {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  if (from && to) {
    return `${formatDate(from)} - ${formatDate(to)}`;
  } else if (from) {
    return `From ${formatDate(from)}`;
  } else if (to) {
    return `Until ${formatDate(to)}`;
  }
  return "";
}
