/**
 * Getting Started Documentation Page
 *
 * Step-by-step guide for new users to set up their account and start reading.
 */

import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Divider,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SettingsIcon from "@mui/icons-material/Settings";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useTranslation } from "react-i18next";
import { DocsLayout } from "./DocsLayout";

// ============================================================================
// Types
// ============================================================================

interface Step {
  labelKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  details: string[];
}

// ============================================================================
// Constants
// ============================================================================

const GETTING_STARTED_STEPS: Step[] = [
  {
    labelKey: "docs.gettingStarted.step1.label",
    descriptionKey: "docs.gettingStarted.step1.description",
    icon: <PersonAddIcon />,
    details: [
      "docs.gettingStarted.step1.detail1",
      "docs.gettingStarted.step1.detail2",
      "docs.gettingStarted.step1.detail3",
    ],
  },
  {
    labelKey: "docs.gettingStarted.step2.label",
    descriptionKey: "docs.gettingStarted.step2.description",
    icon: <CloudUploadIcon />,
    details: [
      "docs.gettingStarted.step2.detail1",
      "docs.gettingStarted.step2.detail2",
      "docs.gettingStarted.step2.detail3",
    ],
  },
  {
    labelKey: "docs.gettingStarted.step3.label",
    descriptionKey: "docs.gettingStarted.step3.description",
    icon: <MenuBookIcon />,
    details: [
      "docs.gettingStarted.step3.detail1",
      "docs.gettingStarted.step3.detail2",
      "docs.gettingStarted.step3.detail3",
    ],
  },
  {
    labelKey: "docs.gettingStarted.step4.label",
    descriptionKey: "docs.gettingStarted.step4.description",
    icon: <SettingsIcon />,
    details: [
      "docs.gettingStarted.step4.detail1",
      "docs.gettingStarted.step4.detail2",
      "docs.gettingStarted.step4.detail3",
    ],
  },
];

// ============================================================================
// Component
// ============================================================================

export function GettingStartedPage() {
  const { t } = useTranslation();

  return (
    <DocsLayout
      title={t("docs.gettingStarted.title", "Getting Started")}
      description={t(
        "docs.gettingStarted.description",
        "Learn how to set up your account and start improving your reading comprehension."
      )}
      breadcrumbs={[{ label: "docs.gettingStarted.title" }]}
    >
      {/* Welcome Alert */}
      <Alert severity="success" icon={<TipsAndUpdatesIcon />} sx={{ mb: 4 }}>
        <Typography variant="body2">
          <strong>
            {t("docs.gettingStarted.welcome", "Welcome to Read Master!")}
          </strong>{" "}
          {t(
            "docs.gettingStarted.welcomeDesc",
            "Follow these steps to get the most out of your reading experience."
          )}
        </Typography>
      </Alert>

      {/* Quick Start Stepper */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        {t("docs.gettingStarted.quickStart", "Quick Start Guide")}
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Stepper orientation="vertical">
          {GETTING_STARTED_STEPS.map((step, index) => (
            <Step key={index} active expanded>
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {step.icon}
                  </Box>
                )}
              >
                <Typography variant="h6" fontWeight={600}>
                  {t(step.labelKey)}
                </Typography>
              </StepLabel>
              <StepContent>
                <Typography color="text.secondary" paragraph>
                  {t(step.descriptionKey)}
                </Typography>
                <List dense>
                  {step.details.map((detailKey, detailIndex) => (
                    <ListItem key={detailIndex} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={t(detailKey)}
                        primaryTypographyProps={{ variant: "body2" }}
                      />
                    </ListItem>
                  ))}
                </List>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Supported Formats */}
      <Typography variant="h5" gutterBottom>
        {t("docs.gettingStarted.formats.title", "Supported File Formats")}
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                EPUB
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(
                  "docs.gettingStarted.formats.epub",
                  "Best experience with flowing text that adapts to your screen. Supports highlights, notes, and bookmarks."
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                PDF
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(
                  "docs.gettingStarted.formats.pdf",
                  "Fixed layout documents with zoom controls. Perfect for textbooks and academic papers."
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                DOC/DOCX
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(
                  "docs.gettingStarted.formats.doc",
                  "Microsoft Word documents. Converted for optimal reading experience."
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Next Steps */}
      <Typography variant="h5" gutterBottom>
        {t("docs.gettingStarted.nextSteps", "Next Steps")}
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            component={RouterLink}
            to="/docs/shortcuts"
            variant="outlined"
            fullWidth
            endIcon={<ArrowForwardIcon />}
            sx={{ justifyContent: "space-between", py: 2 }}
          >
            {t("docs.gettingStarted.learnShortcuts", "Learn Shortcuts")}
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            component={RouterLink}
            to="/docs/faq"
            variant="outlined"
            fullWidth
            endIcon={<ArrowForwardIcon />}
            sx={{ justifyContent: "space-between", py: 2 }}
          >
            {t("docs.gettingStarted.readFaq", "Read FAQ")}
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            component={RouterLink}
            to="/docs/troubleshooting"
            variant="outlined"
            fullWidth
            endIcon={<ArrowForwardIcon />}
            sx={{ justifyContent: "space-between", py: 2 }}
          >
            {t("docs.gettingStarted.troubleshoot", "Troubleshooting")}
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            component={RouterLink}
            to="/library"
            variant="contained"
            fullWidth
            endIcon={<ArrowForwardIcon />}
            sx={{ justifyContent: "space-between", py: 2 }}
          >
            {t("docs.gettingStarted.goToLibrary", "Go to Library")}
          </Button>
        </Grid>
      </Grid>
    </DocsLayout>
  );
}

export default GettingStartedPage;
