import { Box, Container, Typography } from "@mui/material";

export function App(): React.ReactElement {
  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom>
          Read Master
        </Typography>
        <Typography variant="h5" color="text.secondary">
          AI-powered reading comprehension platform
        </Typography>
      </Box>
    </Container>
  );
}
