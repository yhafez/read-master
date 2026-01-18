import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Leaderboard page placeholder.
 * Will display global and friends leaderboards.
 */
export function LeaderboardPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("nav.leaderboard")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.leaderboardPlaceholder")}
      </Typography>
    </Box>
  );
}

export default LeaderboardPage;
