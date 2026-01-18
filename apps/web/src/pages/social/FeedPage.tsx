import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Feed page placeholder.
 * Will display activity feed from followed users.
 */
export function FeedPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("social.feed")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.feedPlaceholder")}
      </Typography>
    </Box>
  );
}

export default FeedPage;
