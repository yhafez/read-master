/**
 * Assessments Page
 *
 * Displays user's assessment history with filtering, sorting, and detailed results.
 * Allows viewing past assessments and retaking them.
 */

import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Stack,
  CircularProgress,
  Alert,
  LinearProgress,
  Collapse,
  Card,
  CardContent,
  Grid2 as Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  useTheme,
  useMediaQuery,
  Divider,
} from "@mui/material";
import {
  Visibility as ViewIcon,
  Replay as RetakeIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  TrendingFlat as TrendFlatIcon,
  Assessment as AssessmentIcon,
  Timer as TimerIcon,
  Star as StarIcon,
  MenuBook as BookIcon,
} from "@mui/icons-material";

import type {
  AssessmentHistoryItem,
  AssessmentHistoryFilter,
  AssessmentHistorySort,
  AssessmentHistorySortField,
  AssessmentHistorySummary,
} from "@/components/ai/assessmentHistoryTypes";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  DEFAULT_SORT,
  createDefaultFilter,
  isFilterActive,
  countActiveFilters,
  filterHistoryItems,
  sortHistoryItems,
  toggleSort,
  calculateHistorySummary,
  getBloomLevelProgress,
  getPerformanceLabel,
  getPerformanceColor,
  formatHistoryDate,
  formatDuration,
  formatTotalTime,
  getRelativeTime,
  buildRetakeUrl,
  generateMockHistory,
  getUniqueBooks,
} from "@/components/ai/assessmentHistoryTypes";
import {
  ASSESSMENT_TYPE_OPTIONS,
  getAssessmentTypeDisplay,
} from "@/components/ai/assessmentTypes";
import type {
  AssessmentType,
  BloomLevel,
} from "@/components/ai/assessmentTypes";

/**
 * Summary card component showing aggregate statistics
 */
function SummaryCards({
  summary,
}: {
  summary: AssessmentHistorySummary;
}): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const getTrendIcon = () => {
    switch (summary.recentTrend) {
      case "improving":
        return <TrendUpIcon color="success" />;
      case "declining":
        return <TrendDownIcon color="error" />;
      default:
        return <TrendFlatIcon color="action" />;
    }
  };

  const getTrendLabel = () => {
    switch (summary.recentTrend) {
      case "improving":
        return t("assessments.history.trendImproving", "Improving");
      case "declining":
        return t("assessments.history.trendDeclining", "Declining");
      default:
        return t("assessments.history.trendStable", "Stable");
    }
  };

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid size={{ xs: 6, sm: 3 }}>
        <Card variant="outlined">
          <CardContent sx={{ textAlign: "center", py: isMobile ? 1.5 : 2 }}>
            <AssessmentIcon color="primary" sx={{ fontSize: 32, mb: 0.5 }} />
            <Typography variant="h5" fontWeight="bold">
              {summary.totalAssessments}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("assessments.history.totalAssessments", "Total Assessments")}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <Card variant="outlined">
          <CardContent sx={{ textAlign: "center", py: isMobile ? 1.5 : 2 }}>
            <StarIcon
              sx={{
                fontSize: 32,
                mb: 0.5,
                color: getPerformanceColor(summary.averageScore),
              }}
            />
            <Typography variant="h5" fontWeight="bold">
              {summary.averageScore}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("assessments.history.averageScore", "Average Score")}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <Card variant="outlined">
          <CardContent sx={{ textAlign: "center", py: isMobile ? 1.5 : 2 }}>
            <TimerIcon color="action" sx={{ fontSize: 32, mb: 0.5 }} />
            <Typography variant="h5" fontWeight="bold">
              {formatTotalTime(summary.totalTimeSpent)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("assessments.history.timeSpent", "Time Spent")}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <Card variant="outlined">
          <CardContent sx={{ textAlign: "center", py: isMobile ? 1.5 : 2 }}>
            {getTrendIcon()}
            <Typography variant="h6" fontWeight="bold" sx={{ mt: 0.5 }}>
              {getTrendLabel()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("assessments.history.recentTrend", "Recent Trend")}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

/**
 * Bloom's breakdown visualization
 */
function BloomsBreakdownChart({
  breakdown,
}: {
  breakdown: Record<BloomLevel, number>;
}): React.ReactElement {
  const { t } = useTranslation();
  const progressData = getBloomLevelProgress(breakdown);

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        {t(
          "assessments.history.bloomsPerformance",
          "Bloom's Taxonomy Performance"
        )}
      </Typography>
      <Stack spacing={1}>
        {progressData.map((item) => (
          <Box key={item.level}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
            >
              <Typography variant="caption">{item.label}</Typography>
              <Typography variant="caption" fontWeight="medium">
                {item.percentage}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={item.percentage}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: "grey.200",
                "& .MuiLinearProgress-bar": {
                  bgcolor: item.color,
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

/**
 * Filter panel component
 */
function FilterPanel({
  filter,
  onFilterChange,
  books,
}: {
  filter: AssessmentHistoryFilter;
  onFilterChange: (filter: AssessmentHistoryFilter) => void;
  books: Array<{ id: string; title: string }>;
}): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box sx={{ p: 2, bgcolor: "background.default", borderRadius: 1 }}>
      <Grid container spacing={2} alignItems="flex-end">
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>
              {t("assessments.history.filterBook", "Book")}
            </InputLabel>
            <Select
              value={filter.bookId ?? ""}
              onChange={(e) =>
                onFilterChange({
                  ...filter,
                  bookId: e.target.value || undefined,
                })
              }
              label={t("assessments.history.filterBook", "Book")}
            >
              <MenuItem value="">
                {t("assessments.history.allBooks", "All Books")}
              </MenuItem>
              {books.map((book) => (
                <MenuItem key={book.id} value={book.id}>
                  {book.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>
              {t("assessments.history.filterType", "Type")}
            </InputLabel>
            <Select
              value={filter.assessmentType ?? ""}
              onChange={(e) =>
                onFilterChange({
                  ...filter,
                  assessmentType: (e.target.value || undefined) as
                    | AssessmentType
                    | undefined,
                })
              }
              label={t("assessments.history.filterType", "Type")}
            >
              <MenuItem value="">
                {t("assessments.history.allTypes", "All Types")}
              </MenuItem>
              {ASSESSMENT_TYPE_OPTIONS.map((type) => (
                <MenuItem key={type} value={type}>
                  {getAssessmentTypeDisplay(type)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 2 }}>
          <TextField
            fullWidth
            size="small"
            type="number"
            label={t("assessments.history.minScore", "Min Score")}
            value={filter.minScore ?? ""}
            onChange={(e) =>
              onFilterChange({
                ...filter,
                minScore: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            slotProps={{ htmlInput: { min: 0, max: 100 } }}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 2 }}>
          <TextField
            fullWidth
            size="small"
            type="number"
            label={t("assessments.history.maxScore", "Max Score")}
            value={filter.maxScore ?? ""}
            onChange={(e) =>
              onFilterChange({
                ...filter,
                maxScore: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            slotProps={{ htmlInput: { min: 0, max: 100 } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 12, md: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            onClick={() => onFilterChange(createDefaultFilter())}
            disabled={!isFilterActive(filter)}
          >
            {t("common.clearFilters", "Clear Filters")}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

/**
 * History table row component
 */
function HistoryTableRow({
  item,
  onView,
  onRetake,
}: {
  item: AssessmentHistoryItem;
  onView: (item: AssessmentHistoryItem) => void;
  onRetake: (item: AssessmentHistoryItem) => void;
}): React.ReactElement {
  const { t } = useTranslation();

  return (
    <TableRow hover>
      <TableCell>
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {item.bookTitle}
          </Typography>
          {item.bookAuthor && (
            <Typography variant="caption" color="text.secondary">
              {item.bookAuthor}
            </Typography>
          )}
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          label={getAssessmentTypeDisplay(item.assessmentType)}
          size="small"
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            variant="body2"
            fontWeight="bold"
            sx={{ color: getPerformanceColor(item.percentage) }}
          >
            {item.percentage}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ({item.correctAnswers}/{item.totalQuestions})
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {formatDuration(item.timeSpent)}
        </Typography>
      </TableCell>
      <TableCell>
        <Tooltip title={formatHistoryDate(item.completedAt)}>
          <Typography variant="body2">
            {getRelativeTime(item.completedAt)}
          </Typography>
        </Tooltip>
      </TableCell>
      <TableCell align="right">
        <Tooltip title={t("assessments.history.viewDetails", "View Details")}>
          <IconButton size="small" onClick={() => onView(item)}>
            <ViewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t("assessments.history.retake", "Retake")}>
          <IconButton size="small" onClick={() => onRetake(item)}>
            <RetakeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

/**
 * Empty state component
 */
function EmptyState(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        textAlign: "center",
        py: 6,
        px: 2,
      }}
    >
      <AssessmentIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        {t("assessments.history.noAssessments", "No assessments yet")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t(
          "assessments.history.noAssessmentsDescription",
          "Complete your first assessment to track your progress"
        )}
      </Typography>
      <Button
        variant="contained"
        startIcon={<BookIcon />}
        onClick={() => navigate("/library")}
      >
        {t("assessments.history.goToLibrary", "Go to Library")}
      </Button>
    </Box>
  );
}

/**
 * Assessment detail dialog/panel
 */
function AssessmentDetailPanel({
  item,
  onClose,
  onRetake,
}: {
  item: AssessmentHistoryItem;
  onClose: () => void;
  onRetake: (item: AssessmentHistoryItem) => void;
}): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h6">{item.bookTitle}</Typography>
          {item.bookAuthor && (
            <Typography variant="body2" color="text.secondary">
              {item.bookAuthor}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CollapseIcon />
        </IconButton>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t("assessments.history.score", "Score")}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                <Typography
                  variant="h3"
                  fontWeight="bold"
                  sx={{ color: getPerformanceColor(item.percentage) }}
                >
                  {item.percentage}%
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {getPerformanceLabel(item.percentage)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {item.correctAnswers} / {item.totalQuestions}{" "}
                {t("assessments.correct", "correct")}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t("assessments.history.details", "Details")}
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip
                  label={getAssessmentTypeDisplay(item.assessmentType)}
                  size="small"
                  icon={<AssessmentIcon />}
                />
                <Chip
                  label={formatDuration(item.timeSpent)}
                  size="small"
                  icon={<TimerIcon />}
                />
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t("assessments.history.completedAt", "Completed")}
              </Typography>
              <Typography variant="body2">
                {formatHistoryDate(item.completedAt)}
              </Typography>
            </Box>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <BloomsBreakdownChart breakdown={item.bloomsBreakdown} />
        </Grid>
      </Grid>

      <Box sx={{ display: "flex", gap: 2, mt: 3, justifyContent: "flex-end" }}>
        <Button variant="outlined" onClick={onClose}>
          {t("common.close", "Close")}
        </Button>
        <Button
          variant="contained"
          startIcon={<RetakeIcon />}
          onClick={() => onRetake(item)}
        >
          {t("assessments.history.retake", "Retake")}
        </Button>
      </Box>
    </Paper>
  );
}

/**
 * AssessmentsPage - Main assessment history page
 */
export function AssessmentsPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // State
  const [filter, setFilter] = useState<AssessmentHistoryFilter>(
    createDefaultFilter()
  );
  const [sort, setSort] = useState<AssessmentHistorySort>(DEFAULT_SORT);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedItem, setSelectedItem] =
    useState<AssessmentHistoryItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Mock data for development - replace with API call
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  const [historyItems] = useState<AssessmentHistoryItem[]>(() =>
    generateMockHistory(15)
  );

  // Derived data
  const books = useMemo(() => getUniqueBooks(historyItems), [historyItems]);

  const filteredItems = useMemo(
    () => filterHistoryItems(historyItems, filter),
    [historyItems, filter]
  );

  const sortedItems = useMemo(
    () => sortHistoryItems(filteredItems, sort),
    [filteredItems, sort]
  );

  const paginatedItems = useMemo(
    () => sortedItems.slice(page * pageSize, (page + 1) * pageSize),
    [sortedItems, page, pageSize]
  );

  const summary = useMemo(
    () => calculateHistorySummary(historyItems),
    [historyItems]
  );

  // Handlers
  const handleSortChange = useCallback((field: AssessmentHistorySortField) => {
    setSort((prev) => toggleSort(prev, field));
  }, []);

  const handlePageChange = useCallback((_: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPageSize(parseInt(e.target.value, 10));
      setPage(0);
    },
    []
  );

  const handleView = useCallback((item: AssessmentHistoryItem) => {
    setSelectedItem(item);
  }, []);

  const handleRetake = useCallback(
    (item: AssessmentHistoryItem) => {
      navigate(buildRetakeUrl(item));
    },
    [navigate]
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const filterCount = countActiveFilters(filter);

  // Render loading state
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography variant="h4" component="h1">
          {t("assessments.title", "Assessments")}
        </Typography>
      </Box>

      {/* Summary cards */}
      {historyItems.length > 0 && <SummaryCards summary={summary} />}

      {/* Selected item detail */}
      {selectedItem && (
        <AssessmentDetailPanel
          item={selectedItem}
          onClose={handleCloseDetail}
          onRetake={handleRetake}
        />
      )}

      {/* History table */}
      {historyItems.length === 0 ? (
        <EmptyState />
      ) : (
        <Paper>
          {/* Filter toggle */}
          <Box
            sx={{
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="subtitle1">
              {t("assessments.history.title", "Assessment History")}
            </Typography>
            <Button
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
              color={filterCount > 0 ? "primary" : "inherit"}
              endIcon={showFilters ? <CollapseIcon /> : <ExpandIcon />}
            >
              {t("common.filters", "Filters")}
              {filterCount > 0 && (
                <Chip label={filterCount} size="small" sx={{ ml: 1 }} />
              )}
            </Button>
          </Box>

          {/* Filter panel */}
          <Collapse in={showFilters}>
            <FilterPanel
              filter={filter}
              onFilterChange={setFilter}
              books={books}
            />
          </Collapse>

          <Divider />

          {/* Table */}
          <TableContainer>
            <Table size={isMobile ? "small" : "medium"}>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sort.field === "bookTitle"}
                      direction={
                        sort.field === "bookTitle" ? sort.order : "asc"
                      }
                      onClick={() => handleSortChange("bookTitle")}
                    >
                      {t("assessments.history.book", "Book")}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>{t("assessments.history.type", "Type")}</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sort.field === "percentage"}
                      direction={
                        sort.field === "percentage" ? sort.order : "asc"
                      }
                      onClick={() => handleSortChange("percentage")}
                    >
                      {t("assessments.history.score", "Score")}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sort.field === "timeSpent"}
                      direction={
                        sort.field === "timeSpent" ? sort.order : "asc"
                      }
                      onClick={() => handleSortChange("timeSpent")}
                    >
                      {t("assessments.history.duration", "Duration")}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sort.field === "completedAt"}
                      direction={
                        sort.field === "completedAt" ? sort.order : "asc"
                      }
                      onClick={() => handleSortChange("completedAt")}
                    >
                      {t("assessments.history.date", "Date")}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    {t("assessments.history.actions", "Actions")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {t(
                          "assessments.history.noMatchingResults",
                          "No assessments match your filters"
                        )}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => (
                    <HistoryTableRow
                      key={item.id}
                      item={item}
                      onView={handleView}
                      onRetake={handleRetake}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={filteredItems.length}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            labelRowsPerPage={t("common.rowsPerPage", "Rows per page:")}
          />
        </Paper>
      )}
    </Box>
  );
}

export default AssessmentsPage;
