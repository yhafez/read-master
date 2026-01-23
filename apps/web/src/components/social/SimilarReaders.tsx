/**
 * Similar Readers Component
 *
 * Displays users with similar reading habits based on AI similarity analysis.
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  Skeleton,
  Alert,
  IconButton,
  Tooltip,
  Stack,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSimilarUsers } from "@/hooks/useRecommendations";
import { useFollowUser } from "@/hooks/useUsers";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface SimilarReadersProps {
  limit?: number;
  showTitle?: boolean;
  compact?: boolean;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function SimilarReadersSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Stack spacing={2}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} variant="outlined">
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Skeleton variant="circular" width={48} height={48} />
            <Box flex={1}>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="80%" height={16} />
            </Box>
            <Skeleton variant="rectangular" width={80} height={32} />
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

// ============================================================================
// Similar User Card
// ============================================================================

interface SimilarUserCardProps {
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    similarityScore: number;
    commonBooks: number;
    commonGenres: string[];
    sharedInterests: string[];
  };
  compact?: boolean;
  onFollow: (userId: string) => void;
  isFollowPending: boolean;
}

function SimilarUserCard({
  user,
  compact,
  onFollow,
  isFollowPending,
}: SimilarUserCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleClick = () => {
    logger.info("Navigating to similar user profile", { userId: user.id });
    navigate(`/social/profile/${user.id}`);
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFollow(user.id);
  };

  const similarityPercent = Math.round(user.similarityScore * 100);

  return (
    <Card
      variant="outlined"
      sx={{
        cursor: "pointer",
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: "primary.main",
          boxShadow: 1,
        },
      }}
      onClick={handleClick}
    >
      <CardContent
        sx={{
          display: "flex",
          alignItems: compact ? "center" : "flex-start",
          gap: 2,
          py: compact ? 1.5 : 2,
          "&:last-child": { pb: compact ? 1.5 : 2 },
        }}
      >
        {/* Avatar */}
        {user.avatarUrl ? (
          <Avatar src={user.avatarUrl} sx={{ width: 48, height: 48 }} />
        ) : (
          <Avatar sx={{ width: 48, height: 48, bgcolor: "primary.main" }}>
            <PersonIcon />
          </Avatar>
        )}

        {/* User Info */}
        <Box flex={1} minWidth={0}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {user.displayName || user.username || t("social.anonymous")}
            </Typography>
            <Chip
              icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
              label={`${similarityPercent}%`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ height: 24 }}
            />
          </Box>

          {user.username && (
            <Typography variant="body2" color="text.secondary" noWrap>
              @{user.username}
            </Typography>
          )}

          {!compact && user.sharedInterests.length > 0 && (
            <Box mt={1} display="flex" flexWrap="wrap" gap={0.5}>
              {user.sharedInterests.slice(0, 4).map((interest, idx) => (
                <Chip
                  key={idx}
                  label={interest}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22, fontSize: "0.75rem" }}
                />
              ))}
              {user.sharedInterests.length > 4 && (
                <Chip
                  label={`+${user.sharedInterests.length - 4}`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22, fontSize: "0.75rem" }}
                />
              )}
            </Box>
          )}

          {!compact && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              {t("recommendations.commonBooks", {
                count: user.commonBooks,
                defaultValue: "{{count}} authors in common",
              })}
              {user.commonGenres.length > 0 && (
                <>
                  {" "}
                  &bull;{" "}
                  {t("recommendations.commonGenres", {
                    genres: user.commonGenres.slice(0, 2).join(", "),
                    defaultValue: "Enjoys {{genres}}",
                  })}
                </>
              )}
            </Typography>
          )}
        </Box>

        {/* Follow Button */}
        <Tooltip title={t("social.follow", "Follow")}>
          <IconButton
            color="primary"
            onClick={handleFollow}
            disabled={isFollowPending}
            sx={{
              border: 1,
              borderColor: "primary.main",
              "&:hover": { bgcolor: "primary.main", color: "white" },
            }}
          >
            <PersonAddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SimilarReaders({
  limit = 5,
  showTitle = true,
  compact = false,
}: SimilarReadersProps): React.ReactElement {
  const { t } = useTranslation();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useSimilarUsers({ limit });
  const followMutation = useFollowUser();

  const handleFollow = async (userId: string) => {
    try {
      await followMutation.mutateAsync({ userId, action: "follow" });
      logger.info("Followed similar user", { userId });
    } catch (err) {
      logger.error("Failed to follow user", {
        userId,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  // ============================================================================
  // Render States
  // ============================================================================

  if (isLoading) {
    return (
      <Box>
        {showTitle && (
          <Typography variant="h6" gutterBottom>
            {t("recommendations.similarReaders", "Similar Readers")}
          </Typography>
        )}
        <SimilarReadersSkeleton count={compact ? 3 : 5} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box>
        {showTitle && (
          <Typography variant="h6" gutterBottom>
            {t("recommendations.similarReaders", "Similar Readers")}
          </Typography>
        )}
        <Alert severity="error" sx={{ mt: 1 }}>
          {error instanceof Error
            ? error.message
            : t(
                "recommendations.errorLoading",
                "Failed to load recommendations"
              )}
        </Alert>
      </Box>
    );
  }

  if (!data || data.users.length === 0) {
    return (
      <Box>
        {showTitle && (
          <Typography variant="h6" gutterBottom>
            {t("recommendations.similarReaders", "Similar Readers")}
          </Typography>
        )}
        <Alert severity="info">
          {t(
            "recommendations.noSimilarReaders",
            "Add more books to your library to find similar readers!"
          )}
        </Alert>
      </Box>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Box>
      {showTitle && (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <AutoAwesomeIcon color="primary" />
            <Typography variant="h6">
              {t("recommendations.similarReaders", "Similar Readers")}
            </Typography>
          </Box>
          <Tooltip title={t("common.refresh", "Refresh")}>
            <IconButton
              onClick={() => refetch()}
              disabled={isFetching}
              size="small"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <Stack spacing={compact ? 1 : 2}>
        {data.users.map((user) => (
          <SimilarUserCard
            key={user.id}
            user={user}
            compact={compact}
            onFollow={handleFollow}
            isFollowPending={followMutation.isPending}
          />
        ))}
      </Stack>

      {data.total > data.users.length && (
        <Box textAlign="center" mt={2}>
          <Button
            variant="text"
            color="primary"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {t("recommendations.viewMore", "View More")}
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default SimilarReaders;
