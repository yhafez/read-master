/**
 * ChallengesPage - Browse and manage reading challenges
 * Displays active, upcoming, and completed challenges
 */

import { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  LinearProgress,
  Grid,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingIcon,
  CheckCircle as CompletedIcon,
  Schedule as UpcomingIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  useChallenges,
  useJoinChallenge,
  useLeaveChallenge,
  type Challenge,
  type ChallengeStatus,
} from "../../hooks/useChallenges";
import { useAuth } from "@clerk/clerk-react";

// ============================================================================
// Types
// ============================================================================

type TabValue = "active" | "upcoming" | "myActive" | "myCompleted";

// ============================================================================
// Components
// ============================================================================

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const { t } = useTranslation();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const joinChallenge = useJoinChallenge();
  const leaveChallenge = useLeaveChallenge();

  const handleJoin = async () => {
    try {
      await joinChallenge.mutateAsync(challenge.id);
    } catch (_error) {
      // Error handling via React Query
    }
  };

  const handleLeave = async () => {
    try {
      await leaveChallenge.mutateAsync(challenge.id);
    } catch (_error) {
      // Error handling via React Query
    }
  };

  const handleViewDetails = () => {
    navigate(`/challenges/${challenge.id}`);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "LEGENDARY":
        return "error";
      case "EPIC":
        return "secondary";
      case "RARE":
        return "primary";
      case "UNCOMMON":
        return "info";
      default:
        return "default";
    }
  };

  const getGoalTypeLabel = (goalType: string) => {
    const labels: Record<string, string> = {
      BOOKS_READ: t("challenges.goalTypes.booksRead"),
      PAGES_READ: t("challenges.goalTypes.pagesRead"),
      TIME_READING: t("challenges.goalTypes.timeReading"),
      WORDS_READ: t("challenges.goalTypes.wordsRead"),
      STREAK_DAYS: t("challenges.goalTypes.streakDays"),
      BOOKS_IN_GENRE: t("challenges.goalTypes.booksInGenre"),
      FLASHCARDS_CREATED: t("challenges.goalTypes.flashcardsCreated"),
      ASSESSMENTS_COMPLETED: t("challenges.goalTypes.assessmentsCompleted"),
    };
    return labels[goalType] || goalType;
  };

  const percentComplete = challenge.userProgress
    ? Math.round((challenge.userProgress / challenge.goalValue) * 100)
    : 0;

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        border: challenge.isOfficial ? 2 : 1,
        borderColor: challenge.isOfficial ? "primary.main" : "divider",
      }}
    >
      {challenge.isOfficial && (
        <Chip
          label={t("challenges.official")}
          color="primary"
          size="small"
          sx={{ position: "absolute", top: 8, right: 8 }}
        />
      )}

      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          {challenge.icon && <TrophyIcon color="primary" />}
          <Typography variant="h6" component="h3">
            {challenge.title}
          </Typography>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, minHeight: 40 }}
        >
          {challenge.description}
        </Typography>

        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <Chip
            label={challenge.tier}
            color={getTierColor(challenge.tier)}
            size="small"
          />
          <Chip label={getGoalTypeLabel(challenge.goalType)} size="small" />
          {challenge.xpReward > 0 && (
            <Chip
              label={`${challenge.xpReward} XP`}
              color="success"
              size="small"
            />
          )}
        </Box>

        <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
          {t("challenges.goal")}: {challenge.goalValue} {challenge.goalUnit}
        </Typography>

        {challenge.isParticipating && (
          <Box sx={{ mt: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 0.5,
              }}
            >
              <Typography variant="body2">
                {t("challenges.progress")}
              </Typography>
              <Typography variant="body2" fontWeight="600">
                {challenge.userProgress} / {challenge.goalValue} (
                {percentComplete}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(percentComplete, 100)}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>
        )}

        {challenge.isCompleted && (
          <Chip
            icon={<CompletedIcon />}
            label={t("challenges.completed")}
            color="success"
            sx={{ mt: 2 }}
          />
        )}

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 2, display: "block" }}
        >
          {challenge.participantCount}{" "}
          {challenge.participantCount === 1
            ? t("challenges.participant")
            : t("challenges.participants")}
        </Typography>
      </CardContent>

      <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={handleViewDetails}
          startIcon={<InfoIcon />}
        >
          {t("challenges.viewDetails")}
        </Button>

        {isSignedIn && !challenge.isParticipating && !challenge.isCompleted && (
          <Button
            size="small"
            variant="contained"
            onClick={handleJoin}
            disabled={joinChallenge.isPending}
          >
            {joinChallenge.isPending ? (
              <CircularProgress size={20} />
            ) : (
              t("challenges.join")
            )}
          </Button>
        )}

        {isSignedIn && challenge.isParticipating && !challenge.isCompleted && (
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={handleLeave}
            disabled={leaveChallenge.isPending}
          >
            {leaveChallenge.isPending ? (
              <CircularProgress size={20} />
            ) : (
              t("challenges.leave")
            )}
          </Button>
        )}
      </CardActions>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ChallengesPage() {
  const { t } = useTranslation();
  const { isSignedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<TabValue>("active");

  // Fetch challenges based on active tab
  const status: ChallengeStatus | undefined =
    activeTab === "active" || activeTab === "myActive"
      ? "active"
      : activeTab === "upcoming"
        ? "upcoming"
        : "active";

  const { data, isLoading, error } = useChallenges(undefined, status);

  // Filter challenges based on tab
  const filteredChallenges = data?.challenges.filter((c) => {
    if (activeTab === "myActive") {
      return c.isParticipating && !c.isCompleted;
    }
    if (activeTab === "myCompleted") {
      return c.isParticipating && c.isCompleted;
    }
    if (activeTab === "active") {
      return !c.isParticipating || !c.isCompleted;
    }
    return true; // upcoming
  });

  const handleTabChange = (_: unknown, newValue: TabValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {t("challenges.title")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t("challenges.subtitle")}
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label={t("challenges.tabsLabel")}
        >
          <Tab
            value="active"
            label={t("challenges.tabs.active")}
            icon={<TrendingIcon />}
            iconPosition="start"
          />
          <Tab
            value="upcoming"
            label={t("challenges.tabs.upcoming")}
            icon={<UpcomingIcon />}
            iconPosition="start"
          />
          {isSignedIn && (
            <>
              <Tab
                value="myActive"
                label={t("challenges.tabs.myActive")}
                icon={<TrophyIcon />}
                iconPosition="start"
              />
              <Tab
                value="myCompleted"
                label={t("challenges.tabs.myCompleted")}
                icon={<CompletedIcon />}
                iconPosition="start"
              />
            </>
          )}
        </Tabs>
      </Box>

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t("challenges.errorLoading")}
        </Alert>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredChallenges?.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <TrophyIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {t("challenges.noChallenges")}
          </Typography>
        </Box>
      )}

      {/* Challenges Grid */}
      {!isLoading &&
        !error &&
        filteredChallenges &&
        filteredChallenges.length > 0 && (
          <Grid container spacing={3}>
            {filteredChallenges.map((challenge) => (
              <Grid item xs={12} sm={6} md={4} key={challenge.id}>
                <ChallengeCard challenge={challenge} />
              </Grid>
            ))}
          </Grid>
        )}
    </Container>
  );
}
