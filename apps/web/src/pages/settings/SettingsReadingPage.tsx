import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Reading settings page placeholder.
 * Will display reading preferences.
 */
export function SettingsReadingPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("settings.reading")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.settingsReadingPlaceholder")}
      </Typography>
    </Box>
  );
}

export default SettingsReadingPage;
