import { Box, Button, Container, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ROUTES } from "@/router/routes";
import { LanguageSwitcher } from "@/components/common";

export function HomePage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg">
      <Box
        component="header"
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          py: 2,
        }}
      >
        <LanguageSwitcher />
      </Box>
      <Box
        sx={{
          minHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 3,
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom>
          {t("common.appName")}
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          {t("home.tagline")}
        </Typography>
        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate(ROUTES.SIGN_UP)}
          >
            {t("auth.signUp")}
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate(ROUTES.SIGN_IN)}
          >
            {t("auth.signIn")}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

export default HomePage;
