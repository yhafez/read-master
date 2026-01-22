/**
 * ChallengeDetailPage - Detailed view of a single challenge with leaderboard
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  EmojiEvents as TrophyIcon,
  Person as PersonIcon,
  CheckCircle as CompletedIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import {
  useChallenges,
  useLeaderboard,
  useChallengeProgress,
  useJoinChallenge,
  useLeaveChallenge,
  type LeaderboardEntry,
  type ChallengeProgress,
} from "../../hooks/useChallenges";
import { useAuth } from "@clerk/clerk-react";

// ============================================================================
// Components
// ============================================================================

function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  const { t } = useTranslation();

  const getMedalColor = (rank: number) => {
    if (rank === 1) return "#FFD700"; // Gold
    if (rank === 2) return "#C0C0C0"; // Silver
    if (rank === 3) return "#CD7F32"; // Bronze
    return undefined;
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "SCHOLAR":
        return "error";
      case "PRO":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t("challenges.leaderboard.rank")}</TableCell>
            <TableCell>{t("challenges.leaderboard.user")}</TableCell>
            <TableCell align="right">
              {t("challenges.leaderboard.progress")}
            </TableCell>
            <TableCell align="right">
              {t("challenges.leaderboard.percent")}
            </TableCell>
            <TableCell align="center">
              {t("challenges.leaderboard.status")}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((entry) => (
            <TableRow
              key={entry.userId}
              sx={{
                backgroundColor:
                  entry.rank <= 3
                    ? `${getMedalColor(entry.rank)}22`
                    : undefined,
              }}
            >
              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {entry.rank <= 3 ? (
                    <TrophyIcon
                      sx={{ color: getMedalColor(entry.rank), fontSize: 24 }}
                    />
                  ) : (
                    <Typography variant="body1" fontWeight="600">
                      #{entry.rank}
                    </Typography>
                  )}
                </Box>
              </TableCell>

              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar
                    src={entry.avatarUrl || ""}
                    sx={{ width: 32, height: 32 }}
                  >
                    {entry.displayName?.[0] || entry.username?.[0] || "?"}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight="600">
                      {entry.displayName || entry.username || "Anonymous"}
                    </Typography>
                    <Chip
                      label={entry.tier}
                      color={getTierColor(entry.tier)}
                      size="small"
                      sx={{ height: 16, fontSize: "0.65rem" }}
                    />
                  </Box>
                </Box>
              </TableCell>

              <TableCell align="right">
                <Typography variant="body2" fontWeight="600">
                  {entry.progress} / {entry.goalValue}
                </Typography>
              </TableCell>

              <TableCell align="right">
                <Box sx={{ minWidth: 120 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="caption" fontWeight="600">
                      {entry.percentComplete}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(entry.percentComplete, 100)}
                    sx={{ height: 6, borderRadius: 1 }}
                  />
                </Box>
              </TableCell>

              <TableCell align="center">
                {entry.isCompleted ? (
                  <Chip
                    icon={<CompletedIcon />}
                    label={t("challenges.completed")}
                    color="success"
                    size="small"
                  />
                ) : (
                  <Chip
                    label={t("challenges.inProgress")}
                    color="default"
                    size="small"
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ChallengeDetailPage() {
  const { t } = useTranslation();
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const [leaderboardFilter, setLeaderboardFilter] = useState<
    "all" | "completed" | "active"
  >("all");

  // Fetch challenge data
  const { data: challengeData } = useChallenges(undefined, "active");
  const challenge = challengeData?.challenges.find((c) => c.id === challengeId);

  // Fetch user progress if authenticated and participating
  const { data: progressData } = useChallengeProgress(challengeId || "");
  const typedProgressData = progressData as ChallengeProgress | undefined;

  // Fetch leaderboard
  const { data: leaderboardData, isLoading: isLeaderboardLoading } =
    useLeaderboard(challengeId || "", leaderboardFilter);

  // Mutations
  const joinChallenge = useJoinChallenge();
  const leaveChallenge = useLeaveChallenge();

  const handleJoin = async () => {
    if (!challengeId) return;
    try {
      await joinChallenge.mutateAsync(challengeId);
    } catch (_error) {
      // Error handling via React Query
    }
  };

  const handleLeave = async () => {
    if (!challengeId) return;
    try {
      await leaveChallenge.mutateAsync(challengeId);
    } catch (_error) {
      // Error handling via React Query
    }
  };

  if (!challenge) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{t("challenges.notFound")}</Alert>
      </Container>
    );
  }

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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Back Button */}
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate("/challenges")}
        sx={{ mb: 3 }}
      >
        {t("challenges.backToChallenges")}
      </Button>

      {/* Challenge Header */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            {challenge.icon && (
              <TrophyIcon color="primary" sx={{ fontSize: 48 }} />
            )}
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                {challenge.title}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {challenge.isOfficial && (
                  <Chip label={t("challenges.official")} color="primary" />
                )}
                <Chip
                  label={challenge.tier}
                  color={getTierColor(challenge.tier)}
                />
                <Chip label={getGoalTypeLabel(challenge.goalType)} />
                {challenge.xpReward > 0 && (
                  <Chip label={`${challenge.xpReward} XP`} color="success" />
                )}
              </Box>
            </Box>

            {/* Join/Leave Button */}
            {isSignedIn && (
              <Box>
                {!challenge.isParticipating && !challenge.isCompleted && (
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleJoin}
                    disabled={joinChallenge.isPending}
                  >
                    {joinChallenge.isPending ? (
                      <CircularProgress size={24} />
                    ) : (
                      t("challenges.join")
                    )}
                  </Button>
                )}

                {challenge.isParticipating && !challenge.isCompleted && (
                  <Button
                    variant="outlined"
                    size="large"
                    color="error"
                    onClick={handleLeave}
                    disabled={leaveChallenge.isPending}
                  >
                    {leaveChallenge.isPending ? (
                      <CircularProgress size={24} />
                    ) : (
                      t("challenges.leave")
                    )}
                  </Button>
                )}

                {challenge.isCompleted && (
                  <Chip
                    icon={<CompletedIcon />}
                    label={t("challenges.completed")}
                    color="success"
                    sx={{ fontSize: "1.1rem", py: 2, px: 1 }}
                  />
                )}
              </Box>
            )}
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {challenge.description}
          </Typography>

          <Typography variant="h6" sx={{ mb: 1 }}>
            {t("challenges.goal")}: {challenge.goalValue} {challenge.goalUnit}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {challenge.participantCount}{" "}
            {challenge.participantCount === 1
              ? t("challenges.participant")
              : t("challenges.participants")}
          </Typography>

          {/* User Progress */}
          {typedProgressData && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                bgcolor: "background.default",
                borderRadius: 1,
              }}
            >
              <Typography variant="h6" gutterBottom>
                {t("challenges.yourProgress")}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="body2">
                  {typedProgressData.progress} / {typedProgressData.goalValue}
                </Typography>
                <Typography variant="body2" fontWeight="600">
                  {typedProgressData.percentComplete}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(typedProgressData.percentComplete, 100)}
                sx={{ height: 12, borderRadius: 1 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t("challenges.yourRank")}: #{typedProgressData.rank}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {t("challenges.leaderboard.title")}
          </Typography>

          {/* Leaderboard Filters */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs
              value={leaderboardFilter}
              onChange={(_, newValue) => setLeaderboardFilter(newValue)}
            >
              <Tab value="all" label={t("challenges.leaderboard.all")} />
              <Tab
                value="completed"
                label={t("challenges.leaderboard.completed")}
              />
              <Tab value="active" label={t("challenges.leaderboard.active")} />
            </Tabs>
          </Box>

          {/* Loading State */}
          {isLeaderboardLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Empty State */}
          {!isLeaderboardLoading &&
            leaderboardData?.leaderboard.length === 0 && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <PersonIcon
                  sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
                />
                <Typography variant="body1" color="text.secondary">
                  {t("challenges.leaderboard.empty")}
                </Typography>
              </Box>
            )}

          {/* Leaderboard Table */}
          {!isLeaderboardLoading &&
            leaderboardData &&
            leaderboardData.leaderboard.length > 0 && (
              <>
                {leaderboardData.currentUserRank && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {t("challenges.yourRank")}: #
                    {leaderboardData.currentUserRank}
                  </Alert>
                )}
                <LeaderboardTable entries={leaderboardData.leaderboard} />
              </>
            )}
        </CardContent>
      </Card>
    </Container>
  );
}
