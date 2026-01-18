import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Library page placeholder.
 * Will display user's book collection with grid/list views and filters.
 */
export function LibraryPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("nav.library")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("pages.libraryPlaceholder")}
      </Typography>
    </Box>
  );
}

export default LibraryPage;
