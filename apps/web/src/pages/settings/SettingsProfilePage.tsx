import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Profile settings page placeholder.
 * Will display profile edit form.
 */
export function SettingsProfilePage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("settings.profile")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.settingsProfilePlaceholder")}
      </Typography>
    </Box>
  );
}

export default SettingsProfilePage;
