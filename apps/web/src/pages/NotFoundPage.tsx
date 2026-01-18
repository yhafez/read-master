import { Box, Button, Container, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ROUTES } from "@/router/routes";

/**
 * 404 Not Found page.
 * Displayed when no route matches the current URL.
 */
export function NotFoundPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 3,
        }}
      >
        <Typography
          variant="h1"
          component="div"
          sx={{
            fontSize: "8rem",
            fontWeight: "bold",
            color: "text.secondary",
          }}
        >
          404
        </Typography>
        <Typography variant="h4" component="h1" gutterBottom>
          {t("errors.pageNotFound")}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {t("errors.pageNotFoundDescription")}
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="contained" onClick={() => navigate(ROUTES.HOME)}>
            {t("errors.goHome")}
          </Button>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            {t("errors.goBack")}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

export default NotFoundPage;
