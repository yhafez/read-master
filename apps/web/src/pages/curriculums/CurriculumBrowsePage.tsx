/**
 * Curriculum Browse Page
 *
 * Browse and discover public curriculums with filtering, search, and sorting.
 *
 * Features:
 * - List of public curriculums
 * - Category and difficulty filters
 * - Search by title/description
 * - Sort by popularity, recent, rating, followers, items
 * - Follow/unfollow curriculums
 * - Pagination
 * - Responsive grid layout
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Button,
  Chip,
  Stack,
  Pagination,
  CircularProgress,
  Alert,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Avatar,
  Tooltip,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PersonIcon from "@mui/icons-material/Person";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import VisibilityIcon from "@mui/icons-material/Visibility";

// ============================================================================
// Types
// ============================================================================

type Curriculum = {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  category: string | null;
  tags: string[];
  difficulty: string | null;
  totalItems: number;
  followersCount: number;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  isFollowing: boolean;
  createdAt: string;
};

type BrowseResponse = {
  curriculums: Curriculum[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  filters: {
    category: string | null;
    difficulty: string | null;
    search: string | null;
    tag: string | null;
    sortBy: string;
  };
};

type SortOption = "popularity" | "recent" | "rating" | "followers" | "items";
type DifficultyOption = "All" | "Beginner" | "Intermediate" | "Advanced";

// ============================================================================
// Constants
// ============================================================================

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "popularity", label: "Most Popular" },
  { value: "recent", label: "Most Recent" },
  { value: "rating", label: "Highest Rated" },
  { value: "followers", label: "Most Followers" },
  { value: "items", label: "Most Items" },
];

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  "All",
  "Beginner",
  "Intermediate",
  "Advanced",
];

const ITEMS_PER_PAGE = 12;

// ============================================================================
// API Functions
// ============================================================================

async function fetchCurriculums(
  page: number,
  search: string,
  category: string | null,
  difficulty: DifficultyOption,
  sortBy: SortOption
): Promise<BrowseResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: ITEMS_PER_PAGE.toString(),
    sortBy,
  });

  if (search) params.set("search", search);
  if (category) params.set("category", category);
  if (difficulty !== "All") params.set("difficulty", difficulty);

  const response = await fetch(`/api/curriculums/browse?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to fetch curriculums",
    }));
    throw new Error(error.message || "Failed to fetch curriculums");
  }

  const data = await response.json();
  return data.data;
}

async function followCurriculum(curriculumId: string): Promise<void> {
  const response = await fetch(`/api/curriculums/${curriculumId}/follow`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to follow curriculum",
    }));
    throw new Error(error.message || "Failed to follow curriculum");
  }
}

async function unfollowCurriculum(curriculumId: string): Promise<void> {
  const response = await fetch(`/api/curriculums/${curriculumId}/follow`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to unfollow curriculum",
    }));
    throw new Error(error.message || "Failed to unfollow curriculum");
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function CurriculumBrowsePage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyOption>("All");
  const [sortBy, setSortBy] = useState<SortOption>("popularity");

  // Fetch curriculums
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["curriculums", "browse", page, search, category, difficulty, sortBy],
    queryFn: () => fetchCurriculums(page, search, category, difficulty, sortBy),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Follow/unfollow mutations
  const followMutation = useMutation({
    mutationFn: followCurriculum,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculums", "browse"] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: unfollowCurriculum,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculums", "browse"] });
    },
  });

  // Extract unique categories from results
  const categories = useMemo(() => {
    if (!data) return [];
    const cats = data.curriculums
      .map((c) => c.category)
      .filter((c): c is string => c !== null);
    return Array.from(new Set(cats)).sort();
  }, [data]);

  // Handlers
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory === "All" ? null : newCategory);
    setPage(1);
  };

  const handleDifficultyChange = (newDifficulty: DifficultyOption) => {
    setDifficulty(newDifficulty);
    setPage(1);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setPage(1);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFollowToggle = (curriculum: Curriculum) => {
    if (curriculum.isFollowing) {
      unfollowMutation.mutate(curriculum.id);
    } else {
      followMutation.mutate(curriculum.id);
    }
  };

  const handleViewCurriculum = (curriculumId: string) => {
    navigate(`/curriculums/${curriculumId}`);
  };

  // Loading state
  if (isLoading && !data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t("curriculums.browse")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Discover curated reading paths created by the community
        </Typography>
      </Box>

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            {/* Search */}
            <Grid item xs={12} md={6}>
              <form onSubmit={handleSearchSubmit}>
                <TextField
                  fullWidth
                  placeholder="Search curriculums..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: searchInput && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSearchInput("");
                            setSearch("");
                            setPage(1);
                          }}
                        >
                          ×
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </form>
            </Grid>

            {/* Category */}
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={category || "All"}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="All">All Categories</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Difficulty */}
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={difficulty}
                  onChange={(e) => handleDifficultyChange(e.target.value as DifficultyOption)}
                  label="Difficulty"
                >
                  {DIFFICULTY_OPTIONS.map((diff) => (
                    <MenuItem key={diff} value={diff}>
                      {diff}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Sort */}
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  label="Sort By"
                >
                  {SORT_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Active Filters */}
          {(search || category || difficulty !== "All") && (
            <Box mt={2}>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {search && (
                  <Chip
                    label={`Search: "${search}"`}
                    onDelete={() => {
                      setSearch("");
                      setSearchInput("");
                      setPage(1);
                    }}
                    size="small"
                  />
                )}
                {category && (
                  <Chip
                    label={`Category: ${category}`}
                    onDelete={() => handleCategoryChange("All")}
                    size="small"
                  />
                )}
                {difficulty !== "All" && (
                  <Chip
                    label={`Difficulty: ${difficulty}`}
                    onDelete={() => handleDifficultyChange("All")}
                    size="small"
                  />
                )}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Results count */}
      {data && (
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary">
            {data.pagination.total} {data.pagination.total === 1 ? "curriculum" : "curriculums"} found
          </Typography>
        </Box>
      )}

      {/* Curriculums Grid */}
      {data && data.curriculums.length > 0 ? (
        <>
          <Grid container spacing={3}>
            {data.curriculums.map((curriculum) => (
              <Grid item xs={12} sm={6} md={4} key={curriculum.id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: theme.shadows[8],
                    },
                  }}
                >
                  {/* Cover Image */}
                  {curriculum.coverImage ? (
                    <CardMedia
                      component="img"
                      height="160"
                      image={curriculum.coverImage}
                      alt={curriculum.title}
                      sx={{ objectFit: "cover" }}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 160,
                        bgcolor: theme.palette.action.hover,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MenuBookIcon sx={{ fontSize: 60, color: theme.palette.action.disabled }} />
                    </Box>
                  )}

                  <CardContent sx={{ flexGrow: 1 }}>
                    {/* Title */}
                    <Typography variant="h6" component="h2" gutterBottom noWrap>
                      {curriculum.title}
                    </Typography>

                    {/* Description */}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {curriculum.description}
                    </Typography>

                    {/* Tags */}
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5} mb={2}>
                      {curriculum.difficulty && (
                        <Chip
                          label={curriculum.difficulty}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                      {curriculum.category && (
                        <Chip
                          label={curriculum.category}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>

                    {/* Stats */}
                    <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                      <Tooltip title="Total items">
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <MenuBookIcon fontSize="small" color="action" />
                          <Typography variant="caption">{curriculum.totalItems}</Typography>
                        </Stack>
                      </Tooltip>
                      <Tooltip title="Followers">
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <FavoriteIcon fontSize="small" color="action" />
                          <Typography variant="caption">{curriculum.followersCount}</Typography>
                        </Stack>
                      </Tooltip>
                    </Stack>

                    {/* Creator */}
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar
                        {...(curriculum.creator.avatarUrl && { src: curriculum.creator.avatarUrl })}
                        sx={{ width: 24, height: 24 }}
                      >
                        <PersonIcon fontSize="small" />
                      </Avatar>
                      <Typography variant="caption" color="text.secondary">
                        {curriculum.creator.displayName || curriculum.creator.username}
                      </Typography>
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewCurriculum(curriculum.id)}
                    >
                      View
                    </Button>
                    <Button
                      size="small"
                      startIcon={
                        curriculum.isFollowing ? <FavoriteIcon /> : <FavoriteBorderIcon />
                      }
                      color={curriculum.isFollowing ? "error" : "primary"}
                      onClick={() => handleFollowToggle(curriculum)}
                      disabled={
                        followMutation.isPending || unfollowMutation.isPending
                      }
                    >
                      {curriculum.isFollowing ? "Following" : "Follow"}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={data.pagination.totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size={isMobile ? "small" : "medium"}
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      ) : (
        <Alert severity="info">
          No curriculums found. Try adjusting your filters or search query.
        </Alert>
      )}
    </Box>
  );
}

export default CurriculumBrowsePage;
