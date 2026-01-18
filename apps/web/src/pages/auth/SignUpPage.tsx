import { Box, Container, Paper, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Sign-up page placeholder.
 * Will be replaced with Clerk's SignUp component.
 */
export function SignUpPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Paper sx={{ p: 4, width: "100%" }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            {t("auth.signUp")}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            align="center"
            sx={{ mt: 2 }}
          >
            {t("auth.signUpPlaceholder")}
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}

export default SignUpPage;
