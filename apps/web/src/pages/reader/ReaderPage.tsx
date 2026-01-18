import { Box, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * Reader page placeholder.
 * Will display the book content with reader controls.
 */
export function ReaderPage(): React.ReactElement {
  const { t } = useTranslation();
  const { bookId } = useParams<{ bookId: string }>();

  return (
    <Box
      sx={{
        p: 3,
        maxWidth: "800px",
        mx: "auto",
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        {t("reader.title")}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t("reader.placeholder", { bookId })}
      </Typography>
    </Box>
  );
}

export default ReaderPage;
