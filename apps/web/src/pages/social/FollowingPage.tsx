/**
 * Following Page
 *
 * Displays a paginated, searchable list of users that the specified user follows.
 *
 * Features:
 * - List of following with avatar, name, bio
 * - Search by username or display name
 * - Pagination
 * - Unfollow from list
 * - Navigate to user's profile
 */

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Button,
  Pagination,
  CircularProgress,
  Alert,
  InputAdornment,
  Stack,
  Chip,
  useTheme,
  useMediaQuery,
  Paper,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";

// ============================================================================
// Types
// ============================================================================

type FollowUser = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followedAt: string;
  isFollowing: boolean;
  isFollowedBy: boolean;
};

type FollowingData = {
  users: FollowUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  targetUserId: string;
  targetUsername: string | null;
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchFollowing(
  userId: string,
  page: number,
  limit: number,
  search?: string
): Promise<FollowingData> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) params.set("search", search);

  const response = await fetch(`/api/users/${userId}/following?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to fetch following",
    }));
    throw new Error(error.message || "Failed to fetch following");
  }

  const data = await response.json();
  return data.data;
}

async function followUser(userId: string): Promise<void> {
  const response = await fetch(`/api/users/${userId}/follow`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to follow user");
  }
}

async function unfollowUser(userId: string): Promise<void> {
  const response = await fetch(`/api/users/${userId}/follow`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to unfollow user");
  }
}

// ============================================================================
// Main Component
// ============================================================================

const ITEMS_PER_PAGE = 20;

export function FollowingPage(): React.ReactElement {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Fetch following
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["following", userId, page, search],
    queryFn: () => fetchFollowing(userId!, page, ITEMS_PER_PAGE, search || undefined),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Follow/unfollow mutations
  const followMutation = useMutation({
    mutationFn: followUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["following", userId] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: unfollowUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["following", userId] });
    },
  });

  // Handlers
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFollowToggle = (user: FollowUser) => {
    if (user.isFollowing) {
      unfollowMutation.mutate(user.id);
    } else {
      followMutation.mutate(user.id);
    }
  };

  const handleUserClick = (user: FollowUser) => {
    if (user.username) {
      navigate(`/users/${user.username}`);
    }
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
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Following
          {data?.targetUsername && (
            <Typography component="span" color="text.secondary">
              {" "}
              · @{data.targetUsername}
            </Typography>
          )}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {data?.pagination.total || 0} following
        </Typography>
      </Box>

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <form onSubmit={handleSearchSubmit}>
          <TextField
            fullWidth
            placeholder="Search following..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </form>
      </Paper>

      {/* Following List */}
      {data && data.users.length > 0 ? (
        <>
          <List>
            {data.users.map((user) => (
              <ListItem
                key={user.id}
                disablePadding
                secondaryAction={
                  <Button
                    size="small"
                    variant={user.isFollowing ? "outlined" : "contained"}
                    startIcon={user.isFollowing ? <PersonRemoveIcon /> : <PersonAddIcon />}
                    onClick={() => handleFollowToggle(user)}
                    disabled={followMutation.isPending || unfollowMutation.isPending}
                  >
                    {user.isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                }
                sx={{ mb: 1 }}
              >
                <ListItemButton onClick={() => handleUserClick(user)}>
                  <ListItemAvatar>
                    <Avatar
                      {...(user.avatarUrl ? { src: user.avatarUrl } : {})}
                      sx={{ width: 50, height: 50 }}
                    >
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1">
                          {user.displayName || user.username || "Anonymous"}
                        </Typography>
                        {user.isFollowedBy && (
                          <Chip label="Follows you" size="small" variant="outlined" />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Stack spacing={0.5}>
                        {user.displayName && user.username && (
                          <Typography variant="body2" color="text.secondary">
                            @{user.username}
                          </Typography>
                        )}
                        {user.bio && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {user.bio}
                          </Typography>
                        )}
                      </Stack>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
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
          {search
            ? `No users found matching "${search}"`
            : "Not following anyone yet"}
        </Alert>
      )}
    </Box>
  );
}

export default FollowingPage;
