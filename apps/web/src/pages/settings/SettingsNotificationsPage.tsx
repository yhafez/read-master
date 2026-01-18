import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Notifications settings page placeholder.
 * Will display notification preferences.
 */
export function SettingsNotificationsPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("settings.notifications")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.settingsNotificationsPlaceholder")}
      </Typography>
    </Box>
  );
}

export default SettingsNotificationsPage;
