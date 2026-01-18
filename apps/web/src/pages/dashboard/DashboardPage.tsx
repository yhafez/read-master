import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Dashboard page placeholder.
 * Will show user's reading stats, recent activity, and quick actions.
 */
export function DashboardPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("nav.dashboard")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.dashboardPlaceholder")}
      </Typography>
    </Box>
  );
}

export default DashboardPage;
