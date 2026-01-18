/**
 * Library toolbar with search, filters, and view controls
 */

import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  useMediaQuery,
  useTheme,
  type SelectChangeEvent,
} from "@mui/material";
import {
  Search as SearchIcon,
  GridView as GridIcon,
  ViewList as ListIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import type { LibraryViewMode, SortOption, SortOrder } from "./types";
import { SORT_OPTIONS } from "./types";

export interface LibraryToolbarProps {
  /** Current view mode */
  viewMode: LibraryViewMode;
  /** Callback when view mode changes */
  onViewModeChange: (mode: LibraryViewMode) => void;
  /** Current search query */
  searchQuery: string;
  /** Callback when search query changes */
  onSearchChange: (query: string) => void;
  /** Current sort field */
  sortBy: SortOption;
  /** Current sort order */
  sortOrder: SortOrder;
  /** Callback when sort changes */
  onSortChange: (sort: SortOption, order: SortOrder) => void;
  /** Callback when filter button is clicked */
  onFilterClick: () => void;
  /** Callback when add book button is clicked */
  onAddBookClick: () => void;
  /** Whether filter panel is open */
  isFilterOpen: boolean;
}

export function LibraryToolbar({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  sortBy,
  sortOrder,
  onSortChange,
  onFilterClick,
  onAddBookClick,
  isFilterOpen,
}: LibraryToolbarProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: LibraryViewMode | null
  ) => {
    if (newMode !== null) {
      onViewModeChange(newMode);
    }
  };

  const handleSortChange = (event: SelectChangeEvent) => {
    onSortChange(event.target.value as SortOption, sortOrder);
  };

  const handleOrderToggle = () => {
    onSortChange(sortBy, sortOrder === "asc" ? "desc" : "asc");
  };

  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        alignItems: "center",
        flexWrap: "wrap",
        mb: 3,
      }}
    >
      {/* Search Field */}
      <TextField
        size="small"
        placeholder={t("library.searchBooks")}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          },
        }}
        sx={{
          flex: 1,
          minWidth: isMobile ? "100%" : 200,
          maxWidth: 400,
        }}
        aria-label={t("library.searchBooks")}
      />

      {/* Sort Dropdown */}
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="library-sort-label">{t("common.sort")}</InputLabel>
        <Select
          labelId="library-sort-label"
          id="library-sort"
          value={sortBy}
          label={t("common.sort")}
          onChange={handleSortChange}
        >
          {SORT_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {t(option.labelKey)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Sort Order Toggle */}
      <Tooltip
        title={t(
          sortOrder === "asc"
            ? "library.sort.ascending"
            : "library.sort.descending"
        )}
      >
        <IconButton
          onClick={handleOrderToggle}
          size="small"
          aria-label={t("library.sort.toggleOrder")}
          sx={{
            transform: sortOrder === "asc" ? "rotate(180deg)" : "none",
            transition: "transform 0.2s ease",
          }}
        >
          <FilterIcon />
        </IconButton>
      </Tooltip>

      {/* Spacer */}
      <Box sx={{ flex: 1, minWidth: 0 }} />

      {/* Filter Toggle */}
      <Tooltip title={t("common.filter")}>
        <IconButton
          onClick={onFilterClick}
          color={isFilterOpen ? "primary" : "default"}
          aria-label={t("common.filter")}
          aria-pressed={isFilterOpen}
        >
          <FilterIcon />
        </IconButton>
      </Tooltip>

      {/* View Mode Toggle */}
      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={handleViewModeChange}
        aria-label={t("library.viewMode")}
        size="small"
      >
        <ToggleButton value="grid" aria-label={t("library.gridView")}>
          <GridIcon />
        </ToggleButton>
        <ToggleButton value="list" aria-label={t("library.listView")}>
          <ListIcon />
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Add Book Button */}
      <Tooltip title={t("library.addBook")}>
        <IconButton
          color="primary"
          onClick={onAddBookClick}
          aria-label={t("library.addBook")}
          sx={{
            bgcolor: "primary.main",
            color: "primary.contrastText",
            "&:hover": {
              bgcolor: "primary.dark",
            },
          }}
        >
          <AddIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
