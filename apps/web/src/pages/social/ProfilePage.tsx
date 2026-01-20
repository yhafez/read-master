/**
 * User Profile Page
 *
 * Displays a user's public profile including:
 * - User info (avatar, username, display name, bio, tier badge)
 * - Stats (level, XP, books completed, reading time, streaks, followers/following)
 * - Achievements (unlocked badges with rarity)
 * - Recent activity (books completed, achievements earned, streak milestones)
 * - Follow/unfollow button
 * - Edit button (for own profile)
 *
 * Privacy:
 * - Respects user's privacy settings (profilePublic, showStats, showActivity)
 * - Shows appropriate message if profile is private
 */

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Avatar,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  CircularProgress,
  Alert,
  LinearProgress,
  Tooltip,
  useTheme,
  useMediaQuery,
  Paper,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import EditIcon from "@mui/icons-material/Edit";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import PeopleIcon from "@mui/icons-material/People";
import StarIcon from "@mui/icons-material/Star";

// ============================================================================
// Types
// ============================================================================

type LevelInfo = {
  level: number;
  title: string;
  totalXP: number;
};

type PublicStats = {
  levelInfo: LevelInfo;
  booksCompleted: number;
  totalReadingTime: number;
  currentStreak: number;
  longestStreak: number;
  followersCount: number;
  followingCount: number;
};

type ActivityItem = {
  type: "book_completed" | "achievement_earned" | "streak_milestone";
  title: string;
  description: string | null;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

type AchievementInfo = {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  rarity: string;
  earnedAt: string;
};

type SocialStatus = {
  isFollowing: boolean;
  isFollowedBy: boolean;
  isOwnProfile: boolean;
};

type PublicUserInfo = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  tier: string;
};

type ProfileData = {
  user: PublicUserInfo;
  stats: PublicStats | null;
  activity: ActivityItem[] | null;
  achievements: AchievementInfo[] | null;
  social: SocialStatus;
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchProfile(
  username: string,
  includeActivity: boolean,
  includeAchievements: boolean
): Promise<ProfileData> {
  const params = new URLSearchParams({
    includeActivity: includeActivity.toString(),
    includeAchievements: includeAchievements.toString(),
  });

  const response = await fetch(`/api/users/${username}?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to fetch profile",
    }));
    throw new Error(error.message || "Failed to fetch profile");
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
// Helper Functions
// ============================================================================

function formatReadingTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function getRarityColor(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case "legendary":
      return "#FFD700"; // Gold
    case "epic":
      return "#9C27B0"; // Purple
    case "rare":
      return "#2196F3"; // Blue
    case "uncommon":
      return "#4CAF50"; // Green
    default:
      return "#9E9E9E"; // Gray (common)
  }
}

function getActivityIcon(type: ActivityItem["type"]): React.ReactElement {
  switch (type) {
    case "book_completed":
      return <MenuBookIcon />;
    case "achievement_earned":
      return <EmojiEventsIcon />;
    case "streak_milestone":
      return <LocalFireDepartmentIcon />;
    default:
      return <StarIcon />;
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString();
}

// ============================================================================
// Main Component
// ============================================================================

export function ProfilePage(): React.ReactElement {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const queryClient = useQueryClient();

  const [showActivity] = useState(true);
  const [showAchievements] = useState(true);

  // Fetch profile
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["profile", username, showActivity, showAchievements],
    queryFn: () => fetchProfile(username!, showActivity, showAchievements),
    enabled: !!username,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Follow/unfollow mutations
  const followMutation = useMutation({
    mutationFn: followUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", username] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: unfollowUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", username] });
    },
  });

  // Handlers
  const handleFollowToggle = () => {
    if (!profile) return;

    if (profile.social.isFollowing) {
      unfollowMutation.mutate(profile.user.id);
    } else {
      followMutation.mutate(profile.user.id);
    }
  };

  const handleEditProfile = () => {
    navigate("/settings/profile");
  };

  const handleViewFollowers = () => {
    navigate(`/users/${username}/followers`);
  };

  const handleViewFollowing = () => {
    navigate(`/users/${username}/following`);
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
  if (error || !profile) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : "Profile not found or is private"}
        </Alert>
        <Button variant="outlined" onClick={() => navigate("/")}>
          Go Home
        </Button>
      </Box>
    );
  }

  // Calculate level progress (XP to next level)
  const xpForNextLevel = (profile.stats?.levelInfo.level || 0) * 1000;
  const currentLevelXP =
    (profile.stats?.levelInfo.totalXP || 0) %
    ((profile.stats?.levelInfo.level || 0) * 1000 || 1000);
  const levelProgress = (currentLevelXP / xpForNextLevel) * 100;

  return (
    <Box>
      {/* Header Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={isMobile ? "column" : "row"}
            spacing={3}
            alignItems={isMobile ? "center" : "flex-start"}
          >
            {/* Avatar */}
            <Avatar
              {...(profile.user.avatarUrl ? { src: profile.user.avatarUrl } : {})}
              sx={{ width: 120, height: 120 }}
            >
              <PersonIcon sx={{ fontSize: 60 }} />
            </Avatar>

            {/* User Info */}
            <Box flex={1} textAlign={isMobile ? "center" : "left"}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent={isMobile ? "center" : "flex-start"} mb={1}>
                <Typography variant="h4" component="h1">
                  {profile.user.displayName || profile.user.username}
                </Typography>
                <Chip label={profile.user.tier} size="small" color="primary" />
              </Stack>

              {profile.user.displayName && (
                <Typography variant="body2" color="text.secondary" mb={1}>
                  @{profile.user.username}
                </Typography>
              )}

              {profile.user.bio && (
                <Typography variant="body1" paragraph>
                  {profile.user.bio}
                </Typography>
              )}

              {/* Action Buttons */}
              <Stack direction="row" spacing={2} mt={2} justifyContent={isMobile ? "center" : "flex-start"}>
                {profile.social.isOwnProfile ? (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={handleEditProfile}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <Button
                    variant={profile.social.isFollowing ? "outlined" : "contained"}
                    startIcon={
                      profile.social.isFollowing ? <PersonRemoveIcon /> : <PersonAddIcon />
                    }
                    onClick={handleFollowToggle}
                    disabled={followMutation.isPending || unfollowMutation.isPending}
                  >
                    {profile.social.isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                )}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Stats Section */}
      {profile.stats ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Stats & Progress
            </Typography>

            {/* Level Info */}
            <Box mb={3}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body1">
                  Level {profile.stats.levelInfo.level} - {profile.stats.levelInfo.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentLevelXP} / {xpForNextLevel} XP
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={levelProgress} sx={{ height: 8, borderRadius: 4 }} />
            </Box>

            {/* Stats Grid */}
            <Grid container spacing={3}>
              <Grid item xs={6} sm={4}>
                <Stack alignItems="center">
                  <MenuBookIcon color="primary" fontSize="large" />
                  <Typography variant="h4">{profile.stats.booksCompleted}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Books Completed
                  </Typography>
                </Stack>
              </Grid>

              <Grid item xs={6} sm={4}>
                <Stack alignItems="center">
                  <AccessTimeIcon color="primary" fontSize="large" />
                  <Typography variant="h4">
                    {formatReadingTime(profile.stats.totalReadingTime)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Reading Time
                  </Typography>
                </Stack>
              </Grid>

              <Grid item xs={6} sm={4}>
                <Stack alignItems="center">
                  <LocalFireDepartmentIcon color="error" fontSize="large" />
                  <Typography variant="h4">{profile.stats.currentStreak}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Current Streak
                  </Typography>
                </Stack>
              </Grid>

              <Grid item xs={6} sm={4}>
                <Stack alignItems="center">
                  <EmojiEventsIcon color="warning" fontSize="large" />
                  <Typography variant="h4">{profile.stats.longestStreak}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Longest Streak
                  </Typography>
                </Stack>
              </Grid>

              <Grid item xs={6} sm={4}>
                <Stack alignItems="center" onClick={handleViewFollowers} sx={{ cursor: "pointer" }}>
                  <PeopleIcon color="primary" fontSize="large" />
                  <Typography variant="h4">{profile.stats.followersCount}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Followers
                  </Typography>
                </Stack>
              </Grid>

              <Grid item xs={6} sm={4}>
                <Stack alignItems="center" onClick={handleViewFollowing} sx={{ cursor: "pointer" }}>
                  <PeopleIcon color="primary" fontSize="large" />
                  <Typography variant="h4">{profile.stats.followingCount}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Following
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          This user has chosen to keep their stats private.
        </Alert>
      )}

      {/* Achievements */}
      {profile.achievements && profile.achievements.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Achievements ({profile.achievements.length})
            </Typography>
            <Grid container spacing={2}>
              {profile.achievements.map((achievement) => (
                <Grid item xs={6} sm={4} md={3} key={achievement.id}>
                  <Tooltip title={achievement.description}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: "center",
                        border: `2px solid ${getRarityColor(achievement.rarity)}`,
                        cursor: "pointer",
                        "&:hover": {
                          transform: "scale(1.05)",
                          transition: "transform 0.2s",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          fontSize: 40,
                          mb: 1,
                        }}
                      >
                        {achievement.icon || "🏆"}
                      </Box>
                      <Typography variant="body2" fontWeight="bold" noWrap>
                        {achievement.name}
                      </Typography>
                      <Chip
                        label={achievement.rarity}
                        size="small"
                        sx={{
                          mt: 1,
                          bgcolor: getRarityColor(achievement.rarity),
                          color: "white",
                        }}
                      />
                    </Paper>
                  </Tooltip>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Activity Feed */}
      {profile.activity && profile.activity.length > 0 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List>
              {profile.activity.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                        {getActivityIcon(item.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={item.title}
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            {formatTimestamp(item.timestamp)}
                          </Typography>
                          {item.description && (
                            <>
                              <Typography variant="caption">•</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.description}
                              </Typography>
                            </>
                          )}
                        </Stack>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      ) : profile.activity === null ? (
        <Alert severity="info">
          This user has chosen to keep their activity private.
        </Alert>
      ) : null}
    </Box>
  );
}

export default ProfilePage;
