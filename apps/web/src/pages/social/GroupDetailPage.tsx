import { Box, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * Group detail page placeholder.
 * Will display group information and members.
 */
export function GroupDetailPage(): React.ReactElement {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("groups.detail")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("groups.placeholder", { groupId })}
      </Typography>
    </Box>
  );
}

export default GroupDetailPage;
