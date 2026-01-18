import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Privacy settings page placeholder.
 * Will display privacy preferences.
 */
export function SettingsPrivacyPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("settings.privacy")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.settingsPrivacyPlaceholder")}
      </Typography>
    </Box>
  );
}

export default SettingsPrivacyPage;
