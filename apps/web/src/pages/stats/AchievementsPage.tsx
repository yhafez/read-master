/**
 * Achievements Page - Displays all user achievements with unlock status
 *
 * Shows:
 * - All available achievements organized by category
 * - Unlock status and progress for each achievement
 * - Progress bars for locked achievements
 * - Unlock animations for newly unlocked achievements
 * - Filter by locked/unlocked status
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid2 as Grid,
  LinearProgress,
  Chip,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
  Fade,
  Grow,
  useTheme,
  alpha,
} from "@mui/material";
import {
  MenuBook as MenuBookIcon,
  AutoStories as AutoStoriesIcon,
  LibraryBooks as LibraryBooksIcon,
  LocalFireDepartment as FireIcon,
  Whatshot as WhatshotIcon,
  Brightness5 as SunIcon,
  Stars as StarsIcon,
  School as SchoolIcon,
  Psychology as PsychologyIcon,
  Lightbulb as LightbulbIcon,
  Star as StarIcon,
  Assignment as AssignmentIcon,
  Grade as GradeIcon,
  WorkspacePremium as PremiumIcon,
  MilitaryTech as MilitaryIcon,
  TrendingUp as TrendingUpIcon,
  Rocket as RocketIcon,
  Diamond as DiamondIcon,
  EmojiEvents as TrophyIcon,
  AccessTime as TimeIcon,
  Schedule as ScheduleIcon,
  Timer as TimerIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import {
  ACHIEVEMENTS,
  useAchievementsStore,
  calculateProgressPercent,
  TIER_COLORS,
  type Achievement,
  type AchievementCategory,
} from "@/stores";

/**
 * Map of icon names to MUI icon components
 */
const ICON_MAP: Record<string, React.ElementType> = {
  MenuBook: MenuBookIcon,
  AutoStories: AutoStoriesIcon,
  LibraryBooks: LibraryBooksIcon,
  EmojiEvents: TrophyIcon,
  LocalFireDepartment: FireIcon,
  Whatshot: WhatshotIcon,
  Brightness5: SunIcon,
  Stars: StarsIcon,
  School: SchoolIcon,
  Psychology: PsychologyIcon,
  Lightbulb: LightbulbIcon,
  Star: StarIcon,
  Assignment: AssignmentIcon,
  Grade: GradeIcon,
  WorkspacePremium: PremiumIcon,
  MilitaryTech: MilitaryIcon,
  TrendingUp: TrendingUpIcon,
  Rocket: RocketIcon,
  Diamond: DiamondIcon,
  AccessTime: TimeIcon,
  Schedule: ScheduleIcon,
  Timer: TimerIcon,
};

/**
 * Get icon component for an achievement
 */
function getAchievementIcon(iconName: string): React.ElementType {
  return ICON_MAP[iconName] ?? StarIcon;
}

/**
 * Category labels for display
 */
const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  reading: "achievements.categories.reading",
  streak: "achievements.categories.streak",
  flashcards: "achievements.categories.flashcards",
  assessments: "achievements.categories.assessments",
  social: "achievements.categories.social",
  milestones: "achievements.categories.milestones",
};

/**
 * Filter options
 */
type FilterOption = "all" | "unlocked" | "locked";

/**
 * Achievement card component
 */
interface AchievementCardProps {
  achievement: Achievement;
  isUnlocked: boolean;
  currentValue: number;
  unlockedAt: number | null;
  isNewlyUnlocked: boolean;
}

function AchievementCard({
  achievement,
  isUnlocked,
  currentValue,
  unlockedAt,
  isNewlyUnlocked,
}: AchievementCardProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const IconComponent = getAchievementIcon(achievement.icon);
  const tierColor = TIER_COLORS[achievement.tier];

  const progressPercent = useMemo(
    () =>
      isUnlocked
        ? 100
        : calculateProgressPercent(currentValue, achievement.threshold),
    [isUnlocked, currentValue, achievement.threshold]
  );

  const unlockedDateStr = useMemo(() => {
    if (!unlockedAt) return null;
    return new Date(unlockedAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [unlockedAt]);

  return (
    <Grow in={true} timeout={isNewlyUnlocked ? 800 : 300}>
      <Card
        sx={{
          height: "100%",
          position: "relative",
          overflow: "visible",
          transition: theme.transitions.create(["transform", "box-shadow"]),
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: theme.shadows[8],
          },
          ...(isNewlyUnlocked && {
            animation: "pulse 1.5s ease-in-out infinite",
            "@keyframes pulse": {
              "0%": { boxShadow: `0 0 0 0 ${alpha(tierColor, 0.7)}` },
              "70%": { boxShadow: `0 0 0 10px ${alpha(tierColor, 0)}` },
              "100%": { boxShadow: `0 0 0 0 ${alpha(tierColor, 0)}` },
            },
          }),
          ...(isUnlocked && {
            borderTop: `4px solid ${tierColor}`,
          }),
          ...(!isUnlocked && {
            opacity: 0.85,
            filter: "grayscale(30%)",
          }),
        }}
      >
        {/* Tier badge */}
        <Box
          sx={{
            position: "absolute",
            top: -8,
            right: 16,
            bgcolor: tierColor,
            color: achievement.tier === "gold" ? "black" : "white",
            px: 1,
            py: 0.25,
            borderRadius: 1,
            fontSize: "0.7rem",
            fontWeight: "bold",
            textTransform: "uppercase",
            boxShadow: theme.shadows[2],
          }}
        >
          {t(`achievements.tier.${achievement.tier}`, achievement.tier)}
        </Box>

        <CardContent sx={{ pt: 3 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            {/* Icon */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: isUnlocked
                  ? alpha(tierColor, 0.15)
                  : alpha(theme.palette.action.disabled, 0.1),
                color: isUnlocked ? tierColor : "text.disabled",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconComponent fontSize="large" />
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                sx={{
                  color: isUnlocked ? "text.primary" : "text.secondary",
                }}
              >
                {t(achievement.nameKey, achievement.id)}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {t(achievement.descriptionKey, "")}
              </Typography>

              {/* Progress section */}
              {!isUnlocked && (
                <Box sx={{ mt: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {t("achievements.progress", "Progress")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {currentValue} / {achievement.threshold}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={progressPercent}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.action.disabled, 0.2),
                      "& .MuiLinearProgress-bar": {
                        bgcolor: tierColor,
                        borderRadius: 3,
                      },
                    }}
                  />
                </Box>
              )}

              {/* Unlocked info */}
              {isUnlocked && unlockedDateStr && (
                <Box
                  sx={{
                    mt: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <LockOpenIcon sx={{ fontSize: 14, color: "success.main" }} />
                  <Typography variant="caption" color="success.main">
                    {t("achievements.unlockedOn", "Unlocked on {{date}}", {
                      date: unlockedDateStr,
                    })}
                  </Typography>
                </Box>
              )}

              {/* XP reward */}
              <Box sx={{ mt: 1 }}>
                <Chip
                  size="small"
                  label={`+${achievement.xpReward} XP`}
                  color={isUnlocked ? "success" : "default"}
                  variant={isUnlocked ? "filled" : "outlined"}
                  sx={{ height: 20, fontSize: "0.7rem" }}
                />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Grow>
  );
}

/**
 * Category section component
 */
interface CategorySectionProps {
  category: AchievementCategory;
  achievements: Achievement[];
  progress: Record<
    string,
    { currentValue: number; isUnlocked: boolean; unlockedAt: number | null }
  >;
  newlyUnlocked: string[];
}

function CategorySection({
  category,
  achievements,
  progress,
  newlyUnlocked,
}: CategorySectionProps): React.ReactElement {
  const { t } = useTranslation();

  const unlockedCount = useMemo(
    () => achievements.filter((a) => progress[a.id]?.isUnlocked).length,
    [achievements, progress]
  );

  return (
    <Box sx={{ mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h6" component="h2">
          {t(CATEGORY_LABELS[category], category)}
        </Typography>
        <Chip
          size="small"
          label={`${unlockedCount} / ${achievements.length}`}
          color={unlockedCount === achievements.length ? "success" : "default"}
          variant="outlined"
        />
      </Box>

      <Grid container spacing={2}>
        {achievements.map((achievement) => {
          const p = progress[achievement.id] ?? {
            currentValue: 0,
            isUnlocked: false,
            unlockedAt: null,
          };
          return (
            <Grid key={achievement.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <AchievementCard
                achievement={achievement}
                isUnlocked={p.isUnlocked}
                currentValue={p.currentValue}
                unlockedAt={p.unlockedAt}
                isNewlyUnlocked={newlyUnlocked.includes(achievement.id)}
              />
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

/**
 * Stats summary component
 */
function AchievementStats(): React.ReactElement {
  const { t } = useTranslation();
  const getUnlockCount = useAchievementsStore((s) => s.getUnlockCount);
  const getTotalAchievementXP = useAchievementsStore(
    (s) => s.getTotalAchievementXP
  );

  const unlockCount = getUnlockCount();
  const totalXP = getTotalAchievementXP();
  const totalAchievements = ACHIEVEMENTS.length;
  const completionPercent = Math.round((unlockCount / totalAchievements) * 100);

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Grid container spacing={3} alignItems="center">
        <Grid size={{ xs: 12, sm: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <TrophyIcon color="warning" fontSize="large" />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                {unlockCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("achievements.unlocked", "Achievements Unlocked")}
              </Typography>
            </Box>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 0.5,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {t("achievements.completion", "Completion")}
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {completionPercent}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={completionPercent}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, display: "block" }}
            >
              {unlockCount} / {totalAchievements}{" "}
              {t("achievements.total", "total")}
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <StarIcon color="primary" fontSize="large" />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                {totalXP.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("achievements.xpEarned", "XP Earned from Achievements")}
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}

/**
 * Main achievements page component
 */
export function AchievementsPage(): React.ReactElement {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterOption>("all");

  const progress = useAchievementsStore((s) => s.progress);
  const newlyUnlocked = useAchievementsStore((s) => s.newlyUnlocked);
  const clearNewlyUnlocked = useAchievementsStore((s) => s.clearNewlyUnlocked);

  // Clear newly unlocked after showing animation
  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      const timer = setTimeout(() => {
        clearNewlyUnlocked();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [newlyUnlocked, clearNewlyUnlocked]);

  // Group achievements by category
  const achievementsByCategory = useMemo(() => {
    const categories: AchievementCategory[] = [
      "reading",
      "streak",
      "flashcards",
      "assessments",
      "milestones",
    ];

    return categories.map((category) => ({
      category,
      achievements: ACHIEVEMENTS.filter((a) => {
        if (a.category !== category) return false;

        const p = progress[a.id];
        if (filter === "unlocked") return p?.isUnlocked === true;
        if (filter === "locked") return p?.isUnlocked !== true;
        return true;
      }),
    }));
  }, [filter, progress]);

  const handleFilterChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newFilter: FilterOption | null) => {
      if (newFilter !== null) {
        setFilter(newFilter);
      }
    },
    []
  );

  // Convert progress to the format expected by CategorySection
  const progressData = useMemo(() => {
    const data: Record<
      string,
      { currentValue: number; isUnlocked: boolean; unlockedAt: number | null }
    > = {};
    for (const [id, p] of Object.entries(progress)) {
      data[id] = {
        currentValue: p.currentValue,
        isUnlocked: p.isUnlocked,
        unlockedAt: p.unlockedAt,
      };
    }
    return data;
  }, [progress]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t("achievements.title", "Achievements")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t(
            "achievements.subtitle",
            "Track your accomplishments and earn rewards"
          )}
        </Typography>
      </Box>

      {/* Stats summary */}
      <AchievementStats />

      {/* Filter controls */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          mb: 3,
          gap: 1,
        }}
      >
        <FilterIcon color="action" fontSize="small" />
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={handleFilterChange}
          size="small"
          aria-label={t("achievements.filter", "Filter achievements")}
        >
          <ToggleButton value="all">
            {t("achievements.filterAll", "All")}
          </ToggleButton>
          <ToggleButton value="unlocked">
            <LockOpenIcon sx={{ mr: 0.5, fontSize: 16 }} />
            {t("achievements.filterUnlocked", "Unlocked")}
          </ToggleButton>
          <ToggleButton value="locked">
            <LockIcon sx={{ mr: 0.5, fontSize: 16 }} />
            {t("achievements.filterLocked", "Locked")}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Achievement categories */}
      <Fade in={true}>
        <Box>
          {achievementsByCategory.map(
            ({ category, achievements }) =>
              achievements.length > 0 && (
                <CategorySection
                  key={category}
                  category={category}
                  achievements={achievements}
                  progress={progressData}
                  newlyUnlocked={newlyUnlocked}
                />
              )
          )}

          {/* Empty state for filtered results */}
          {achievementsByCategory.every(
            ({ achievements }) => achievements.length === 0
          ) && (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="h6" color="text.secondary">
                {filter === "unlocked"
                  ? t(
                      "achievements.noUnlocked",
                      "No achievements unlocked yet. Keep reading!"
                    )
                  : t(
                      "achievements.allUnlocked",
                      "Congratulations! You've unlocked all achievements!"
                    )}
              </Typography>
            </Paper>
          )}
        </Box>
      </Fade>
    </Box>
  );
}

export default AchievementsPage;
