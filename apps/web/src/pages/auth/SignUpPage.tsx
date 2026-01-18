import { SignUp } from "@clerk/clerk-react";
import { Box, Container, Paper, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { isClerkConfigured } from "@/auth";
import { ROUTES } from "@/router/routes";

/**
 * Sign-up page using Clerk's SignUp component.
 * Displays a centered sign-up form with OAuth and email options.
 */
export function SignUpPage(): React.ReactElement {
  const { t } = useTranslation();

  // If Clerk is not configured, show a message
  if (!isClerkConfigured()) {
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
              {t("auth.clerkNotConfigured")}
            </Typography>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
      }}
    >
      <SignUp
        path={ROUTES.SIGN_UP}
        signInUrl={ROUTES.SIGN_IN}
        fallbackRedirectUrl={ROUTES.DASHBOARD}
        appearance={{
          elements: {
            rootBox: {
              width: "100%",
              maxWidth: 450,
            },
            card: {
              boxShadow: "none",
              border: "1px solid rgba(0, 0, 0, 0.12)",
            },
          },
        }}
      />
    </Box>
  );
}

export default SignUpPage;
