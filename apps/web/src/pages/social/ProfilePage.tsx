import { Box, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * Profile page placeholder.
 * Will display user's public profile.
 */
export function ProfilePage(): React.ReactElement {
  const { t } = useTranslation();
  const { username } = useParams<{ username: string }>();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {username ? t("profile.user", { username }) : t("profile.my")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.profilePlaceholder")}
      </Typography>
    </Box>
  );
}

export default ProfilePage;
