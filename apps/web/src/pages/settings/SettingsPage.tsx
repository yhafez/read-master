import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Settings page placeholder.
 * Will display user settings navigation.
 */
export function SettingsPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("nav.settings")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.settingsPlaceholder")}
      </Typography>
    </Box>
  );
}

export default SettingsPage;
