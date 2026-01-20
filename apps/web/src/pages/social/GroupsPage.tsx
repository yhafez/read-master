/**
 * Reading Groups List Page
 *
 * Displays a list of reading groups that the user can browse and join:
 * - Public groups (visible to all)
 * - User's private groups (only visible to members)
 *
 * Features:
 * - Search by group name/description
 * - Filter by public/private/my groups
 * - Pagination
 * - Create new group button
 * - Join/leave groups
 * - Member count and activity indicators
 */

import React, { useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Stack,
  Chip,
  Pagination,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  useMediaQuery,
  Tooltip,
  Fab,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  GroupOutlined,
  PeopleOutline,
  LockOutlined,
  PublicOutlined,
  PersonAddOutlined,
  ExitToAppOutlined,
} from "@mui/icons-material";
import { useAuth } from "@clerk/clerk-react";

// ============================================================================
// Types
// ============================================================================

type ReadingGroup = {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  memberCount: number;
  maxMembers: number;
  currentBookId: string | null;
  currentBookTitle: string | null;
  owner: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  isMember: boolean;
  isOwner: boolean;
  createdAt: string;
};

type GroupsResponse = {
  groups: ReadingGroup[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type FilterType = "all" | "public" | "private" | "my-groups";

// ============================================================================
// Main Component
// ============================================================================

export function GroupsPage(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const { userId: clerkUserId } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const limit = 12;

  // Fetch groups data
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<GroupsResponse, Error>({
    queryKey: ["readingGroups", page, limit, search, filter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) params.append("search", search);
      if (filter === "public") params.append("isPublic", "true");
      if (filter === "private") params.append("isPublic", "false");
      if (filter === "my-groups") params.append("myGroups", "true");

      const response = await fetch(`/api/groups?${params}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch reading groups");
      }

      return response.json();
    },
    enabled: !!clerkUserId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Join/leave group mutation
  const joinLeaveMutation = useMutation({
    mutationFn: async ({ groupId, action }: { groupId: string; action: "join" | "leave" }) => {
      const response = await fetch(`/api/groups/${groupId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${action} group`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["readingGroups"] });
      queryClient.invalidateQueries({ queryKey: ["readingGroup"] });
    },
  });

  // Handlers
  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGroupClick = (groupId: string) => {
    navigate(`/groups/${groupId}`);
  };

  const handleCreateGroup = () => {
    navigate("/groups/create");
  };

  const handleJoinLeave = async (e: React.MouseEvent, groupId: string, isMember: boolean) => {
    e.stopPropagation();
    await joinLeaveMutation.mutateAsync({
      groupId,
      action: isMember ? "leave" : "join",
    });
  };

  // Loading state
  if (isLoading) {
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
        <Typography variant="h4" component="h1" gutterBottom>
          {t("groups.readingGroups")}
        </Typography>
        <Alert severity="error" sx={{ mt: 3 }}>
          {error.message}
        </Alert>
        <Button variant="outlined" onClick={() => refetch()} sx={{ mt: 2 }}>
          {t("common.retry")}
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {t("groups.readingGroups")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("groups.discoverAndJoin")}
          </Typography>
        </Box>
        {!isMobile && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateGroup}
            size="large"
          >
            {t("groups.createGroup")}
          </Button>
        )}
      </Stack>

      {/* Search and Filters */}
      <Stack spacing={2} mb={3}>
        <Stack direction={isMobile ? "column" : "row"} spacing={2}>
          <TextField
            fullWidth
            placeholder={t("groups.searchGroups")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchInput && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button variant="contained" onClick={handleSearch} sx={{ minWidth: 100 }}>
            {t("common.search")}
          </Button>
        </Stack>

        <FormControl fullWidth={isMobile} sx={{ minWidth: isMobile ? "100%" : 200 }}>
          <InputLabel>{t("groups.filter")}</InputLabel>
          <Select
            value={filter}
            label={t("groups.filter")}
            onChange={(e) => handleFilterChange(e.target.value as FilterType)}
          >
            <MenuItem value="all">{t("common.all")}</MenuItem>
            <MenuItem value="public">
              <Stack direction="row" spacing={1} alignItems="center">
                <PublicOutlined fontSize="small" />
                <span>{t("groups.publicGroups")}</span>
              </Stack>
            </MenuItem>
            <MenuItem value="private">
              <Stack direction="row" spacing={1} alignItems="center">
                <LockOutlined fontSize="small" />
                <span>{t("groups.privateGroups")}</span>
              </Stack>
            </MenuItem>
            <MenuItem value="my-groups">
              <Stack direction="row" spacing={1} alignItems="center">
                <PersonAddOutlined fontSize="small" />
                <span>{t("groups.myGroups")}</span>
              </Stack>
            </MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* Groups Grid */}
      {data && data.groups.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body1">
            {search
              ? t("groups.noGroupsFound", { search })
              : t("groups.noGroupsYet")}
          </Typography>
          {filter === "my-groups" && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleCreateGroup}
              sx={{ mt: 2 }}
            >
              {t("groups.createYourFirstGroup")}
            </Button>
          )}
        </Alert>
      ) : (
        <>
          <Grid container spacing={isMobile ? 2 : 3}>
            {data?.groups.map((group) => (
              <Grid item xs={12} sm={6} md={4} key={group.id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: theme.shadows[8],
                    },
                  }}
                  onClick={() => handleGroupClick(group.id)}
                >
                  <CardContent sx={{ flex: 1 }}>
                    {/* Group Header */}
                    <Stack direction="row" spacing={2} alignItems="flex-start" mb={2}>
                      <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 56, height: 56 }}>
                        <GroupOutlined />
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="h6" gutterBottom>
                          {group.name}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip
                            icon={group.isPublic ? <PublicOutlined /> : <LockOutlined />}
                            label={group.isPublic ? t("common.public") : t("common.private")}
                            size="small"
                            color={group.isPublic ? "success" : "default"}
                          />
                          {group.isMember && (
                            <Chip label={t("groups.member")} size="small" color="primary" />
                          )}
                        </Stack>
                      </Box>
                    </Stack>

                    {/* Description */}
                    {group.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {group.description}
                      </Typography>
                    )}

                    {/* Current Book */}
                    {group.currentBookTitle && (
                      <Box
                        sx={{
                          p: 1.5,
                          bgcolor: theme.palette.action.hover,
                          borderRadius: 1,
                          mb: 2,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t("groups.currentlyReading")}
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {group.currentBookTitle}
                        </Typography>
                      </Box>
                    )}

                    {/* Stats */}
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Tooltip title={t("groups.members")}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <PeopleOutline fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {group.memberCount}/{group.maxMembers}
                          </Typography>
                        </Stack>
                      </Tooltip>
                    </Stack>

                    {/* Owner */}
                    <Stack direction="row" spacing={1} alignItems="center" mt={2}>
                      <Avatar
                        {...(group.owner.avatarUrl ? { src: group.owner.avatarUrl } : {})}
                        sx={{ width: 24, height: 24 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {t("common.by")} {group.owner.displayName || group.owner.username}
                      </Typography>
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0 }}>
                    {!group.isOwner && (
                      <Button
                        fullWidth
                        variant={group.isMember ? "outlined" : "contained"}
                        color={group.isMember ? "inherit" : "primary"}
                        startIcon={group.isMember ? <ExitToAppOutlined /> : <PersonAddOutlined />}
                        onClick={(e) => handleJoinLeave(e, group.id, group.isMember)}
                        disabled={
                          joinLeaveMutation.isPending ||
                          (!group.isMember && group.memberCount >= group.maxMembers)
                        }
                      >
                        {group.isMember
                          ? t("groups.leave")
                          : group.memberCount >= group.maxMembers
                            ? t("groups.full")
                            : t("groups.join")}
                      </Button>
                    )}
                    {group.isOwner && (
                      <Button fullWidth variant="outlined" disabled>
                        {t("groups.owner")}
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
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
      )}

      {/* Mobile FAB for Create */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label={t("groups.createGroup")}
          onClick={handleCreateGroup}
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
          }}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
}

export default GroupsPage;
