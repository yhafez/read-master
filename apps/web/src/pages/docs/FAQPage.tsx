/**
 * FAQ Documentation Page
 *
 * Frequently asked questions about Read Master.
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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import EmailIcon from "@mui/icons-material/Email";
import { useTranslation } from "react-i18next";
import { DocsLayout } from "./DocsLayout";

// ============================================================================
// Types
// ============================================================================

interface FAQItem {
  questionKey: string;
  answerKey: string;
  category:
    | "general"
    | "reading"
    | "ai"
    | "flashcards"
    | "billing"
    | "technical";
}

// ============================================================================
// Constants
// ============================================================================

const FAQ_ITEMS: FAQItem[] = [
  // General
  {
    questionKey: "docs.faq.q1",
    answerKey: "docs.faq.a1",
    category: "general",
  },
  {
    questionKey: "docs.faq.q2",
    answerKey: "docs.faq.a2",
    category: "general",
  },
  {
    questionKey: "docs.faq.q3",
    answerKey: "docs.faq.a3",
    category: "general",
  },
  // Reading
  {
    questionKey: "docs.faq.q4",
    answerKey: "docs.faq.a4",
    category: "reading",
  },
  {
    questionKey: "docs.faq.q5",
    answerKey: "docs.faq.a5",
    category: "reading",
  },
  {
    questionKey: "docs.faq.q6",
    answerKey: "docs.faq.a6",
    category: "reading",
  },
  // AI Features
  {
    questionKey: "docs.faq.q7",
    answerKey: "docs.faq.a7",
    category: "ai",
  },
  {
    questionKey: "docs.faq.q8",
    answerKey: "docs.faq.a8",
    category: "ai",
  },
  // Flashcards
  {
    questionKey: "docs.faq.q9",
    answerKey: "docs.faq.a9",
    category: "flashcards",
  },
  {
    questionKey: "docs.faq.q10",
    answerKey: "docs.faq.a10",
    category: "flashcards",
  },
  // Billing
  {
    questionKey: "docs.faq.q11",
    answerKey: "docs.faq.a11",
    category: "billing",
  },
  {
    questionKey: "docs.faq.q12",
    answerKey: "docs.faq.a12",
    category: "billing",
  },
  // Technical
  {
    questionKey: "docs.faq.q13",
    answerKey: "docs.faq.a13",
    category: "technical",
  },
  {
    questionKey: "docs.faq.q14",
    answerKey: "docs.faq.a14",
    category: "technical",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  general: "docs.faq.category.general",
  reading: "docs.faq.category.reading",
  ai: "docs.faq.category.ai",
  flashcards: "docs.faq.category.flashcards",
  billing: "docs.faq.category.billing",
  technical: "docs.faq.category.technical",
};

const CATEGORY_COLORS: Record<
  string,
  "default" | "primary" | "secondary" | "success" | "warning" | "info" | "error"
> = {
  general: "default",
  reading: "primary",
  ai: "secondary",
  flashcards: "success",
  billing: "warning",
  technical: "info",
};

// ============================================================================
// Component
// ============================================================================

export function FAQPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handlePanelChange =
    (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedPanel(isExpanded ? panel : false);
    };

  const filteredFAQs = FAQ_ITEMS.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      t(item.questionKey).toLowerCase().includes(searchQuery.toLowerCase()) ||
      t(item.answerKey).toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !selectedCategory || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(FAQ_ITEMS.map((item) => item.category))];

  return (
    <DocsLayout
      title={t("docs.faq.title", "Frequently Asked Questions")}
      description={t(
        "docs.faq.description",
        "Find answers to common questions about Read Master."
      )}
      breadcrumbs={[{ label: "docs.faq.title" }]}
    >
      {/* Search and Filter */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder={t("docs.faq.searchPlaceholder", "Search questions...")}
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
            label={t("docs.faq.allCategories", "All")}
            onClick={() => setSelectedCategory(null)}
            variant={selectedCategory === null ? "filled" : "outlined"}
            color="primary"
          />
          {categories.map((category) => (
            <Chip
              key={category}
              label={t(CATEGORY_LABELS[category] || category)}
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === category ? null : category
                )
              }
              variant={selectedCategory === category ? "filled" : "outlined"}
              color={CATEGORY_COLORS[category] || "default"}
            />
          ))}
        </Box>
      </Box>

      {/* FAQ Items */}
      {filteredFAQs.length === 0 ? (
        <Alert severity="info" sx={{ mb: 4 }}>
          {t(
            "docs.faq.noResults",
            "No questions match your search. Try different keywords or browse all categories."
          )}
        </Alert>
      ) : (
        <Box sx={{ mb: 4 }}>
          {filteredFAQs.map((item, index) => (
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
                  label={t(CATEGORY_LABELS[item.category] || item.category)}
                  size="small"
                  color={CATEGORY_COLORS[item.category] || "default"}
                  sx={{ minWidth: 80 }}
                />
                <Typography fontWeight={500}>{t(item.questionKey)}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography
                  color="text.secondary"
                  sx={{ whiteSpace: "pre-line" }}
                >
                  {t(item.answerKey)}
                </Typography>
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
          {t("docs.faq.stillNeedHelp", "Still need help?")}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {t(
            "docs.faq.contactDesc",
            "Can't find what you're looking for? Our support team is here to help."
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

export default FAQPage;
