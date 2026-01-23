/**
 * Recommended Books Component
 *
 * Displays AI-powered book recommendations from various sources.
 */

import { useState, type ReactElement } from "react";
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Avatar,
  Chip,
  Button,
  Skeleton,
  Alert,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Grid,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PeopleIcon from "@mui/icons-material/People";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { useTranslation } from "react-i18next";
import {
  useAIBookRecommendations,
  useDismissRecommendation,
  type AIBookRecommendation,
  type RecommendationSource,
} from "@/hooks/useRecommendations";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface RecommendedBooksProps {
  limit?: number;
  showTitle?: boolean;
  showTabs?: boolean;
  defaultSource?: RecommendationSource;
  onAddToLibrary?: (recommendation: AIBookRecommendation) => void;
}

// ============================================================================
// Constants
// ============================================================================

const SOURCE_ICONS: Record<RecommendationSource, ReactElement> = {
  all: <AutoAwesomeIcon />,
  following: <PeopleIcon />,
  trending: <TrendingUpIcon />,
  ai: <SmartToyIcon />,
  social: <PeopleIcon />,
};

const SOURCE_LABELS: Record<RecommendationSource, string> = {
  all: "All",
  following: "Following",
  trending: "Trending",
  ai: "AI Picks",
  social: "Social",
};

// ============================================================================
// Loading Skeleton
// ============================================================================

function RecommendedBooksSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card variant="outlined">
            <Skeleton variant="rectangular" height={180} />
            <CardContent>
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="60%" height={16} />
              <Skeleton variant="text" width="100%" height={40} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

// ============================================================================
// Book Recommendation Card
// ============================================================================

interface BookRecommendationCardProps {
  recommendation: AIBookRecommendation;
  onDismiss: (id: string) => void;
  onAddToLibrary?: ((recommendation: AIBookRecommendation) => void) | undefined;
  isDismissing: boolean;
}

function BookRecommendationCard({
  recommendation,
  onDismiss,
  onAddToLibrary,
  isDismissing,
}: BookRecommendationCardProps) {
  const { t } = useTranslation();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleDismiss = () => {
    handleMenuClose();
    onDismiss(recommendation.id);
  };

  const handleAdd = () => {
    handleMenuClose();
    onAddToLibrary?.(recommendation);
  };

  const getSourceIcon = () => {
    switch (recommendation.source) {
      case "AI":
        return <SmartToyIcon sx={{ fontSize: 14 }} />;
      case "TRENDING":
        return <TrendingUpIcon sx={{ fontSize: 14 }} />;
      case "FOLLOWING":
        return <PeopleIcon sx={{ fontSize: 14 }} />;
      default:
        return <AutoAwesomeIcon sx={{ fontSize: 14 }} />;
    }
  };

  const getSourceLabel = () => {
    switch (recommendation.source) {
      case "AI":
        return t("recommendations.source.ai", "AI Pick");
      case "TRENDING":
        return t("recommendations.source.trending", "Trending");
      case "FOLLOWING":
        return t("recommendations.source.following", "From Following");
      default:
        return t("recommendations.source.social", "Social");
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: "primary.main",
          boxShadow: 2,
        },
      }}
    >
      {/* Book Cover */}
      <Box sx={{ position: "relative" }}>
        {recommendation.bookCoverUrl ? (
          <CardMedia
            component="img"
            height="180"
            image={recommendation.bookCoverUrl}
            alt={recommendation.bookTitle}
            sx={{ objectFit: "cover" }}
          />
        ) : (
          <Box
            sx={{
              height: 180,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "grey.200",
            }}
          >
            <MenuBookIcon sx={{ fontSize: 60, color: "grey.400" }} />
          </Box>
        )}

        {/* Source Badge */}
        <Chip
          icon={getSourceIcon()}
          label={getSourceLabel()}
          size="small"
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            bgcolor: "rgba(255,255,255,0.9)",
            fontWeight: 500,
          }}
        />

        {/* Score Badge */}
        <Chip
          label={`${Math.round(recommendation.score * 100)}%`}
          size="small"
          color="primary"
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            fontWeight: 600,
          }}
        />

        {/* Menu Button */}
        <IconButton
          size="small"
          onClick={handleMenuOpen}
          sx={{
            position: "absolute",
            bottom: 8,
            right: 8,
            bgcolor: "rgba(255,255,255,0.9)",
            "&:hover": { bgcolor: "white" },
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          {onAddToLibrary && (
            <MenuItem onClick={handleAdd}>
              <ListItemIcon>
                <LibraryAddIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                {t("recommendations.addToLibrary", "Add to Library")}
              </ListItemText>
            </MenuItem>
          )}
          <MenuItem onClick={handleDismiss} disabled={isDismissing}>
            <ListItemIcon>
              <VisibilityOffIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              {t("recommendations.dismiss", "Dismiss")}
            </ListItemText>
          </MenuItem>
        </Menu>
      </Box>

      {/* Content */}
      <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Typography
          variant="subtitle1"
          fontWeight={600}
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {recommendation.bookTitle}
        </Typography>

        {recommendation.bookAuthor && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {recommendation.bookAuthor}
          </Typography>
        )}

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            flex: 1,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            mt: 1,
          }}
        >
          {recommendation.reason}
        </Typography>

        {/* Source User */}
        {recommendation.sourceUser && (
          <Box display="flex" alignItems="center" gap={1} mt={2}>
            {recommendation.sourceUser.avatarUrl ? (
              <Avatar
                src={recommendation.sourceUser.avatarUrl}
                sx={{ width: 24, height: 24 }}
              />
            ) : (
              <Avatar sx={{ width: 24, height: 24 }} />
            )}
            <Typography variant="caption" color="text.secondary">
              {t("recommendations.readBy", "Read by")}{" "}
              {recommendation.sourceUser.username || t("social.anonymous")}
            </Typography>
          </Box>
        )}
      </CardContent>

      {/* Actions */}
      {onAddToLibrary && (
        <Box sx={{ p: 2, pt: 0 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => onAddToLibrary(recommendation)}
            disabled={recommendation.addedToLibrary}
          >
            {recommendation.addedToLibrary
              ? t("recommendations.alreadyAdded", "In Library")
              : t("recommendations.addToLibrary", "Add to Library")}
          </Button>
        </Box>
      )}
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function RecommendedBooks({
  limit = 8,
  showTitle = true,
  showTabs = true,
  defaultSource = "all",
  onAddToLibrary,
}: RecommendedBooksProps): React.ReactElement {
  const { t } = useTranslation();
  const [source, setSource] = useState<RecommendationSource>(defaultSource);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAIBookRecommendations({ source, limit });

  const dismissMutation = useDismissRecommendation();

  const handleSourceChange = (
    _event: React.SyntheticEvent,
    newSource: RecommendationSource
  ) => {
    setSource(newSource);
  };

  const handleDismiss = async (recommendationId: string) => {
    try {
      await dismissMutation.mutateAsync(recommendationId);
      logger.info("Recommendation dismissed", { recommendationId });
    } catch (err) {
      logger.error("Failed to dismiss recommendation", {
        recommendationId,
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
            {t("recommendations.forYou", "Recommended for You")}
          </Typography>
        )}
        {showTabs && (
          <Tabs value={source} sx={{ mb: 2 }}>
            <Tab
              icon={(<AutoAwesomeIcon />) as ReactElement}
              label="All"
              value="all"
              disabled
            />
            <Tab
              icon={(<PeopleIcon />) as ReactElement}
              label="Following"
              value="following"
              disabled
            />
            <Tab
              icon={(<TrendingUpIcon />) as ReactElement}
              label="Trending"
              value="trending"
              disabled
            />
            <Tab
              icon={(<SmartToyIcon />) as ReactElement}
              label="AI"
              value="ai"
              disabled
            />
          </Tabs>
        )}
        <RecommendedBooksSkeleton count={4} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box>
        {showTitle && (
          <Typography variant="h6" gutterBottom>
            {t("recommendations.forYou", "Recommended for You")}
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

  if (!data || data.recommendations.length === 0) {
    return (
      <Box>
        {showTitle && (
          <Typography variant="h6" gutterBottom>
            {t("recommendations.forYou", "Recommended for You")}
          </Typography>
        )}
        {showTabs && (
          <Tabs value={source} onChange={handleSourceChange} sx={{ mb: 2 }}>
            <Tab
              icon={(<AutoAwesomeIcon />) as ReactElement}
              label="All"
              value="all"
            />
            <Tab
              icon={(<PeopleIcon />) as ReactElement}
              label="Following"
              value="following"
            />
            <Tab
              icon={(<TrendingUpIcon />) as ReactElement}
              label="Trending"
              value="trending"
            />
            <Tab
              icon={(<SmartToyIcon />) as ReactElement}
              label="AI"
              value="ai"
            />
          </Tabs>
        )}
        <Alert severity="info">
          {source === "following"
            ? t(
                "recommendations.noFollowingRecs",
                "Follow more readers to get recommendations based on their reading!"
              )
            : source === "ai"
              ? t(
                  "recommendations.noAIRecs",
                  "Add more books to your library to get AI-powered recommendations!"
                )
              : t(
                  "recommendations.noRecs",
                  "We don't have any recommendations for you yet. Keep reading!"
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
              {t("recommendations.forYou", "Recommended for You")}
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

      {showTabs && (
        <Tabs
          value={source}
          onChange={handleSourceChange}
          sx={{ mb: 3 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            icon={SOURCE_ICONS.all as ReactElement}
            label={t("recommendations.tab.all", SOURCE_LABELS.all)}
            value="all"
          />
          <Tab
            icon={SOURCE_ICONS.following as ReactElement}
            label={t("recommendations.tab.following", SOURCE_LABELS.following)}
            value="following"
          />
          <Tab
            icon={SOURCE_ICONS.trending as ReactElement}
            label={t("recommendations.tab.trending", SOURCE_LABELS.trending)}
            value="trending"
          />
          <Tab
            icon={SOURCE_ICONS.ai as ReactElement}
            label={t("recommendations.tab.ai", SOURCE_LABELS.ai)}
            value="ai"
          />
        </Tabs>
      )}

      <Grid container spacing={2}>
        {data.recommendations.map((rec) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={rec.id}>
            <BookRecommendationCard
              recommendation={rec}
              onDismiss={handleDismiss}
              onAddToLibrary={onAddToLibrary ?? undefined}
              isDismissing={dismissMutation.isPending}
            />
          </Grid>
        ))}
      </Grid>

      {data.hasMore && (
        <Box textAlign="center" mt={3}>
          <Button
            variant="outlined"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {t("recommendations.loadMore", "Load More")}
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default RecommendedBooks;
