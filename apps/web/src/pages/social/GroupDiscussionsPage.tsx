import { Box, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * Group discussions page placeholder.
 * Will display group discussion threads.
 */
export function GroupDiscussionsPage(): React.ReactElement {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("groups.discussions")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("groups.discussionsPlaceholder", { groupId })}
      </Typography>
    </Box>
  );
}

export default GroupDiscussionsPage;
