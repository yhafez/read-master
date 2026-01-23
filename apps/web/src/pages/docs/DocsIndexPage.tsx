/**
 * Documentation Index Page
 *
 * Landing page for user documentation with quick links to all sections.
 */

import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Alert,
} from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SchoolIcon from "@mui/icons-material/School";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PeopleIcon from "@mui/icons-material/People";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import HelpIcon from "@mui/icons-material/Help";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useTranslation } from "react-i18next";
import { DocsLayout } from "./DocsLayout";

// ============================================================================
// Types
// ============================================================================

interface QuickLinkCard {
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

// ============================================================================
// Constants
// ============================================================================

const QUICK_LINKS: QuickLinkCard[] = [
  {
    titleKey: "docs.cards.features.title",
    descriptionKey: "docs.cards.features.description",
    icon: <MenuBookIcon sx={{ fontSize: 40 }} />,
    path: "/docs/features/reader",
    color: "#1976d2",
  },
  {
    titleKey: "docs.cards.flashcards.title",
    descriptionKey: "docs.cards.flashcards.description",
    icon: <SchoolIcon sx={{ fontSize: 40 }} />,
    path: "/docs/flashcards",
    color: "#2e7d32",
  },
  {
    titleKey: "docs.cards.ai.title",
    descriptionKey: "docs.cards.ai.description",
    icon: <SmartToyIcon sx={{ fontSize: 40 }} />,
    path: "/docs/ai",
    color: "#9c27b0",
  },
  {
    titleKey: "docs.cards.social.title",
    descriptionKey: "docs.cards.social.description",
    icon: <PeopleIcon sx={{ fontSize: 40 }} />,
    path: "/docs/social",
    color: "#ed6c02",
  },
  {
    titleKey: "docs.cards.shortcuts.title",
    descriptionKey: "docs.cards.shortcuts.description",
    icon: <KeyboardIcon sx={{ fontSize: 40 }} />,
    path: "/docs/shortcuts",
    color: "#0288d1",
  },
  {
    titleKey: "docs.cards.faq.title",
    descriptionKey: "docs.cards.faq.description",
    icon: <HelpIcon sx={{ fontSize: 40 }} />,
    path: "/docs/faq",
    color: "#d32f2f",
  },
];

// ============================================================================
// Component
// ============================================================================

export function DocsIndexPage() {
  const { t } = useTranslation();

  return (
    <DocsLayout
      title={t("docs.index.title", "Welcome to Read Master")}
      description={t(
        "docs.index.description",
        "Learn how to get the most out of your reading experience with our comprehensive documentation."
      )}
    >
      {/* Quick Start Alert */}
      <Alert severity="info" icon={<AutoAwesomeIcon />} sx={{ mb: 4 }}>
        <Typography variant="body2">
          <strong>{t("docs.index.newUser", "New to Read Master?")}</strong>{" "}
          {t(
            "docs.index.startGuide",
            "Check out our getting started guide to set up your account and import your first book."
          )}
        </Typography>
      </Alert>

      {/* Getting Started Steps */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        {t("docs.index.gettingStarted", "Getting Started")}
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Chip label="1" size="small" color="primary" />
                <Typography variant="h6">
                  {t("docs.index.step1.title", "Create Account")}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t(
                  "docs.index.step1.description",
                  "Sign up for free and set up your reading profile with your preferences and goals."
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Chip label="2" size="small" color="primary" />
                <Typography variant="h6">
                  {t("docs.index.step2.title", "Import Books")}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t(
                  "docs.index.step2.description",
                  "Upload your EPUB, PDF, or DOC files to build your personal library."
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Chip label="3" size="small" color="primary" />
                <Typography variant="h6">
                  {t("docs.index.step3.title", "Start Reading")}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t(
                  "docs.index.step3.description",
                  "Open a book and explore AI-powered features to enhance your comprehension."
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Feature Cards */}
      <Typography variant="h5" gutterBottom>
        {t("docs.index.exploreFeatures", "Explore Features")}
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {QUICK_LINKS.map((link) => (
          <Grid item xs={12} sm={6} md={4} key={link.path}>
            <Card
              sx={{
                height: "100%",
                transition: "all 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 4,
                },
              }}
            >
              <CardActionArea
                component={RouterLink}
                to={link.path}
                sx={{ height: "100%", p: 2 }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 1,
                  }}
                >
                  <Box
                    sx={{
                      color: link.color,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {link.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={600}>
                    {t(link.titleKey)}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {t(link.descriptionKey)}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Key Features */}
      <Typography variant="h5" gutterBottom>
        {t("docs.index.keyFeatures", "Key Features")}
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary={t(
                  "docs.index.feature1.title",
                  "AI-Powered Comprehension"
                )}
                secondary={t(
                  "docs.index.feature1.description",
                  "Get pre-reading guides, contextual explanations, and personalized assessments."
                )}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary={t(
                  "docs.index.feature2.title",
                  "Spaced Repetition Flashcards"
                )}
                secondary={t(
                  "docs.index.feature2.description",
                  "Automatically generated flashcards with scientifically-proven review scheduling."
                )}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary={t("docs.index.feature3.title", "Rich Annotations")}
                secondary={t(
                  "docs.index.feature3.description",
                  "Highlight, add notes, and organize your thoughts while reading."
                )}
              />
            </ListItem>
          </List>
        </Grid>

        <Grid item xs={12} md={6}>
          <List>
            <ListItem>
              <ListItemIcon>
                <DownloadIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={t("docs.index.feature4.title", "Offline Reading")}
                secondary={t(
                  "docs.index.feature4.description",
                  "Download books for offline access on any device."
                )}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <EditIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={t("docs.index.feature5.title", "Text-to-Speech")}
                secondary={t(
                  "docs.index.feature5.description",
                  "Listen to your books with natural AI-generated voices."
                )}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <PeopleIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={t("docs.index.feature6.title", "Social Features")}
                secondary={t(
                  "docs.index.feature6.description",
                  "Join reading groups, participate in challenges, and discuss books."
                )}
              />
            </ListItem>
          </List>
        </Grid>
      </Grid>

      {/* Help Section */}
      <Box
        sx={{
          mt: 6,
          p: 3,
          bgcolor: "grey.100",
          borderRadius: 2,
          textAlign: "center",
        }}
      >
        <Typography variant="h6" gutterBottom>
          {t("docs.index.needHelp", "Need Help?")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t(
            "docs.index.helpDescription",
            "Check our FAQ or contact support if you can't find what you're looking for."
          )}
        </Typography>
      </Box>
    </DocsLayout>
  );
}

export default DocsIndexPage;
