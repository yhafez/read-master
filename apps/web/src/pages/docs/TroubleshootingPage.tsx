/**
 * Troubleshooting Documentation Page
 *
 * Common issues and solutions for Read Master users.
 */

import { useState } from "react";
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Alert,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import EmailIcon from "@mui/icons-material/Email";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useTranslation } from "react-i18next";
import { DocsLayout } from "./DocsLayout";

// ============================================================================
// Types
// ============================================================================

interface TroubleshootingItem {
  titleKey: string;
  descriptionKey: string;
  stepsKeys: string[];
  category: "reading" | "sync" | "ai" | "account" | "performance";
}

type CategoryType = TroubleshootingItem["category"];

// ============================================================================
// Constants
// ============================================================================

const TROUBLESHOOTING_ITEMS: TroubleshootingItem[] = [
  // Reading issues
  {
    titleKey: "docs.troubleshooting.items.bookNotLoading.title",
    descriptionKey: "docs.troubleshooting.items.bookNotLoading.description",
    stepsKeys: [
      "docs.troubleshooting.items.bookNotLoading.step1",
      "docs.troubleshooting.items.bookNotLoading.step2",
      "docs.troubleshooting.items.bookNotLoading.step3",
      "docs.troubleshooting.items.bookNotLoading.step4",
    ],
    category: "reading",
  },
  {
    titleKey: "docs.troubleshooting.items.displayIssues.title",
    descriptionKey: "docs.troubleshooting.items.displayIssues.description",
    stepsKeys: [
      "docs.troubleshooting.items.displayIssues.step1",
      "docs.troubleshooting.items.displayIssues.step2",
      "docs.troubleshooting.items.displayIssues.step3",
    ],
    category: "reading",
  },
  {
    titleKey: "docs.troubleshooting.items.annotationsNotSaving.title",
    descriptionKey:
      "docs.troubleshooting.items.annotationsNotSaving.description",
    stepsKeys: [
      "docs.troubleshooting.items.annotationsNotSaving.step1",
      "docs.troubleshooting.items.annotationsNotSaving.step2",
      "docs.troubleshooting.items.annotationsNotSaving.step3",
    ],
    category: "reading",
  },
  // Sync issues
  {
    titleKey: "docs.troubleshooting.items.syncNotWorking.title",
    descriptionKey: "docs.troubleshooting.items.syncNotWorking.description",
    stepsKeys: [
      "docs.troubleshooting.items.syncNotWorking.step1",
      "docs.troubleshooting.items.syncNotWorking.step2",
      "docs.troubleshooting.items.syncNotWorking.step3",
    ],
    category: "sync",
  },
  {
    titleKey: "docs.troubleshooting.items.offlineIssues.title",
    descriptionKey: "docs.troubleshooting.items.offlineIssues.description",
    stepsKeys: [
      "docs.troubleshooting.items.offlineIssues.step1",
      "docs.troubleshooting.items.offlineIssues.step2",
      "docs.troubleshooting.items.offlineIssues.step3",
    ],
    category: "sync",
  },
  // AI issues
  {
    titleKey: "docs.troubleshooting.items.aiNotResponding.title",
    descriptionKey: "docs.troubleshooting.items.aiNotResponding.description",
    stepsKeys: [
      "docs.troubleshooting.items.aiNotResponding.step1",
      "docs.troubleshooting.items.aiNotResponding.step2",
      "docs.troubleshooting.items.aiNotResponding.step3",
    ],
    category: "ai",
  },
  {
    titleKey: "docs.troubleshooting.items.flashcardsNotGenerating.title",
    descriptionKey:
      "docs.troubleshooting.items.flashcardsNotGenerating.description",
    stepsKeys: [
      "docs.troubleshooting.items.flashcardsNotGenerating.step1",
      "docs.troubleshooting.items.flashcardsNotGenerating.step2",
      "docs.troubleshooting.items.flashcardsNotGenerating.step3",
    ],
    category: "ai",
  },
  // Account issues
  {
    titleKey: "docs.troubleshooting.items.loginIssues.title",
    descriptionKey: "docs.troubleshooting.items.loginIssues.description",
    stepsKeys: [
      "docs.troubleshooting.items.loginIssues.step1",
      "docs.troubleshooting.items.loginIssues.step2",
      "docs.troubleshooting.items.loginIssues.step3",
    ],
    category: "account",
  },
  {
    titleKey: "docs.troubleshooting.items.subscriptionIssues.title",
    descriptionKey: "docs.troubleshooting.items.subscriptionIssues.description",
    stepsKeys: [
      "docs.troubleshooting.items.subscriptionIssues.step1",
      "docs.troubleshooting.items.subscriptionIssues.step2",
      "docs.troubleshooting.items.subscriptionIssues.step3",
    ],
    category: "account",
  },
  // Performance issues
  {
    titleKey: "docs.troubleshooting.items.slowPerformance.title",
    descriptionKey: "docs.troubleshooting.items.slowPerformance.description",
    stepsKeys: [
      "docs.troubleshooting.items.slowPerformance.step1",
      "docs.troubleshooting.items.slowPerformance.step2",
      "docs.troubleshooting.items.slowPerformance.step3",
      "docs.troubleshooting.items.slowPerformance.step4",
    ],
    category: "performance",
  },
  {
    titleKey: "docs.troubleshooting.items.highMemoryUsage.title",
    descriptionKey: "docs.troubleshooting.items.highMemoryUsage.description",
    stepsKeys: [
      "docs.troubleshooting.items.highMemoryUsage.step1",
      "docs.troubleshooting.items.highMemoryUsage.step2",
      "docs.troubleshooting.items.highMemoryUsage.step3",
    ],
    category: "performance",
  },
];

const CATEGORY_LABELS: Record<CategoryType, string> = {
  reading: "docs.troubleshooting.category.reading",
  sync: "docs.troubleshooting.category.sync",
  ai: "docs.troubleshooting.category.ai",
  account: "docs.troubleshooting.category.account",
  performance: "docs.troubleshooting.category.performance",
};

const CATEGORY_COLORS: Record<
  CategoryType,
  "default" | "primary" | "secondary" | "success" | "warning" | "info" | "error"
> = {
  reading: "primary",
  sync: "info",
  ai: "secondary",
  account: "warning",
  performance: "error",
};

const CATEGORY_ICONS: Record<CategoryType, React.ReactElement> = {
  reading: <ErrorOutlineIcon fontSize="small" />,
  sync: <WarningAmberIcon fontSize="small" />,
  ai: <ErrorOutlineIcon fontSize="small" />,
  account: <WarningAmberIcon fontSize="small" />,
  performance: <ErrorOutlineIcon fontSize="small" />,
};

// ============================================================================
// Component
// ============================================================================

export function TroubleshootingPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(
    null
  );

  const handlePanelChange =
    (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedPanel(isExpanded ? panel : false);
    };

  const filteredItems = TROUBLESHOOTING_ITEMS.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      t(item.titleKey).toLowerCase().includes(searchQuery.toLowerCase()) ||
      t(item.descriptionKey).toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !selectedCategory || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = [
    ...new Set(TROUBLESHOOTING_ITEMS.map((item) => item.category)),
  ] as CategoryType[];

  return (
    <DocsLayout
      title={t("docs.troubleshooting.title", "Troubleshooting")}
      description={t(
        "docs.troubleshooting.description",
        "Find solutions to common issues and get your reading experience back on track."
      )}
      breadcrumbs={[{ label: "docs.troubleshooting.title" }]}
    >
      {/* Quick Tips Alert */}
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          <strong>{t("docs.troubleshooting.quickTip", "Quick Tip:")}</strong>{" "}
          {t(
            "docs.troubleshooting.quickTipDesc",
            "Most issues can be resolved by refreshing the page, clearing your browser cache, or checking your internet connection."
          )}
        </Typography>
      </Alert>

      {/* Search and Filter */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder={t(
            "docs.troubleshooting.searchPlaceholder",
            "Search issues..."
          )}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip
            label={t("docs.troubleshooting.allCategories", "All Issues")}
            onClick={() => setSelectedCategory(null)}
            variant={selectedCategory === null ? "filled" : "outlined"}
            color="primary"
          />
          {categories.map((category) => (
            <Chip
              key={category}
              icon={CATEGORY_ICONS[category]}
              label={t(CATEGORY_LABELS[category])}
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === category ? null : category
                )
              }
              variant={selectedCategory === category ? "filled" : "outlined"}
              color={CATEGORY_COLORS[category]}
            />
          ))}
        </Box>
      </Box>

      {/* Troubleshooting Items */}
      {filteredItems.length === 0 ? (
        <Alert severity="info" sx={{ mb: 4 }}>
          {t(
            "docs.troubleshooting.noResults",
            "No issues match your search. Try different keywords or contact support."
          )}
        </Alert>
      ) : (
        <Box sx={{ mb: 4 }}>
          {filteredItems.map((item, index) => (
            <Accordion
              key={index}
              expanded={expandedPanel === `panel-${index}`}
              onChange={handlePanelChange(`panel-${index}`)}
              sx={{
                mb: 1,
                "&:before": { display: "none" },
                borderRadius: 1,
                border: 1,
                borderColor: "divider",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  "& .MuiAccordionSummary-content": {
                    alignItems: "center",
                    gap: 2,
                  },
                }}
              >
                <Chip
                  label={t(CATEGORY_LABELS[item.category])}
                  size="small"
                  color={CATEGORY_COLORS[item.category]}
                  sx={{ minWidth: 100 }}
                />
                <Typography fontWeight={500}>{t(item.titleKey)}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography color="text.secondary" paragraph>
                  {t(item.descriptionKey)}
                </Typography>

                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  {t(
                    "docs.troubleshooting.stepsToResolve",
                    "Steps to Resolve:"
                  )}
                </Typography>

                <List dense>
                  {item.stepsKeys.map((stepKey, stepIndex) => (
                    <ListItem key={stepIndex}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircleOutlineIcon
                          color="success"
                          fontSize="small"
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={t(stepKey)}
                        primaryTypographyProps={{ variant: "body2" }}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Contact Support */}
      <Box
        sx={{
          p: 3,
          bgcolor: "grey.100",
          borderRadius: 2,
          textAlign: "center",
        }}
      >
        <Typography variant="h6" gutterBottom>
          {t("docs.troubleshooting.stillStuck", "Still having issues?")}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {t(
            "docs.troubleshooting.contactDesc",
            "If you couldn't find a solution, our support team is ready to help. Please include details about the issue and any error messages you see."
          )}
        </Typography>
        <Link
          href="mailto:support@readmaster.com"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <EmailIcon fontSize="small" />
          support@readmaster.com
        </Link>
      </Box>
    </DocsLayout>
  );
}

export default TroubleshootingPage;
