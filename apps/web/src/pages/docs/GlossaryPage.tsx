/**
 * Glossary Documentation Page
 *
 * Definitions of terms used in Read Master.
 */

import { useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Alert,
  Grid,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import BookIcon from "@mui/icons-material/Book";
import { useTranslation } from "react-i18next";
import { DocsLayout } from "./DocsLayout";

// ============================================================================
// Types
// ============================================================================

interface GlossaryTerm {
  termKey: string;
  definitionKey: string;
  category: "general" | "reading" | "ai" | "flashcards" | "social";
}

type CategoryType = GlossaryTerm["category"];

// ============================================================================
// Constants
// ============================================================================

const GLOSSARY_TERMS: GlossaryTerm[] = [
  // General terms
  {
    termKey: "docs.glossary.terms.library",
    definitionKey: "docs.glossary.definitions.library",
    category: "general",
  },
  {
    termKey: "docs.glossary.terms.book",
    definitionKey: "docs.glossary.definitions.book",
    category: "general",
  },
  {
    termKey: "docs.glossary.terms.epub",
    definitionKey: "docs.glossary.definitions.epub",
    category: "general",
  },
  {
    termKey: "docs.glossary.terms.pdf",
    definitionKey: "docs.glossary.definitions.pdf",
    category: "general",
  },
  {
    termKey: "docs.glossary.terms.collection",
    definitionKey: "docs.glossary.definitions.collection",
    category: "general",
  },
  {
    termKey: "docs.glossary.terms.shelf",
    definitionKey: "docs.glossary.definitions.shelf",
    category: "general",
  },

  // Reading terms
  {
    termKey: "docs.glossary.terms.annotation",
    definitionKey: "docs.glossary.definitions.annotation",
    category: "reading",
  },
  {
    termKey: "docs.glossary.terms.highlight",
    definitionKey: "docs.glossary.definitions.highlight",
    category: "reading",
  },
  {
    termKey: "docs.glossary.terms.bookmark",
    definitionKey: "docs.glossary.definitions.bookmark",
    category: "reading",
  },
  {
    termKey: "docs.glossary.terms.note",
    definitionKey: "docs.glossary.definitions.note",
    category: "reading",
  },
  {
    termKey: "docs.glossary.terms.tts",
    definitionKey: "docs.glossary.definitions.tts",
    category: "reading",
  },
  {
    termKey: "docs.glossary.terms.readingProgress",
    definitionKey: "docs.glossary.definitions.readingProgress",
    category: "reading",
  },
  {
    termKey: "docs.glossary.terms.wpm",
    definitionKey: "docs.glossary.definitions.wpm",
    category: "reading",
  },

  // AI terms
  {
    termKey: "docs.glossary.terms.aiAssistant",
    definitionKey: "docs.glossary.definitions.aiAssistant",
    category: "ai",
  },
  {
    termKey: "docs.glossary.terms.preReadingGuide",
    definitionKey: "docs.glossary.definitions.preReadingGuide",
    category: "ai",
  },
  {
    termKey: "docs.glossary.terms.assessment",
    definitionKey: "docs.glossary.definitions.assessment",
    category: "ai",
  },
  {
    termKey: "docs.glossary.terms.comprehension",
    definitionKey: "docs.glossary.definitions.comprehension",
    category: "ai",
  },
  {
    termKey: "docs.glossary.terms.explainThis",
    definitionKey: "docs.glossary.definitions.explainThis",
    category: "ai",
  },

  // Flashcard terms
  {
    termKey: "docs.glossary.terms.flashcard",
    definitionKey: "docs.glossary.definitions.flashcard",
    category: "flashcards",
  },
  {
    termKey: "docs.glossary.terms.srs",
    definitionKey: "docs.glossary.definitions.srs",
    category: "flashcards",
  },
  {
    termKey: "docs.glossary.terms.interval",
    definitionKey: "docs.glossary.definitions.interval",
    category: "flashcards",
  },
  {
    termKey: "docs.glossary.terms.dueDate",
    definitionKey: "docs.glossary.definitions.dueDate",
    category: "flashcards",
  },
  {
    termKey: "docs.glossary.terms.ease",
    definitionKey: "docs.glossary.definitions.ease",
    category: "flashcards",
  },
  {
    termKey: "docs.glossary.terms.retention",
    definitionKey: "docs.glossary.definitions.retention",
    category: "flashcards",
  },

  // Social terms
  {
    termKey: "docs.glossary.terms.readingGroup",
    definitionKey: "docs.glossary.definitions.readingGroup",
    category: "social",
  },
  {
    termKey: "docs.glossary.terms.challenge",
    definitionKey: "docs.glossary.definitions.challenge",
    category: "social",
  },
  {
    termKey: "docs.glossary.terms.achievement",
    definitionKey: "docs.glossary.definitions.achievement",
    category: "social",
  },
  {
    termKey: "docs.glossary.terms.streak",
    definitionKey: "docs.glossary.definitions.streak",
    category: "social",
  },
  {
    termKey: "docs.glossary.terms.leaderboard",
    definitionKey: "docs.glossary.definitions.leaderboard",
    category: "social",
  },
];

const CATEGORY_LABELS: Record<CategoryType, string> = {
  general: "docs.glossary.category.general",
  reading: "docs.glossary.category.reading",
  ai: "docs.glossary.category.ai",
  flashcards: "docs.glossary.category.flashcards",
  social: "docs.glossary.category.social",
};

const CATEGORY_COLORS: Record<
  CategoryType,
  "default" | "primary" | "secondary" | "success" | "warning" | "info"
> = {
  general: "default",
  reading: "primary",
  ai: "secondary",
  flashcards: "success",
  social: "info",
};

// ============================================================================
// Component
// ============================================================================

export function GlossaryPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(
    null
  );

  const filteredTerms = useMemo(() => {
    return GLOSSARY_TERMS.filter((term) => {
      const matchesSearch =
        !searchQuery ||
        t(term.termKey).toLowerCase().includes(searchQuery.toLowerCase()) ||
        t(term.definitionKey).toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        !selectedCategory || term.category === selectedCategory;

      return matchesSearch && matchesCategory;
    }).sort((a, b) => t(a.termKey).localeCompare(t(b.termKey)));
  }, [searchQuery, selectedCategory, t]);

  const categories = [
    ...new Set(GLOSSARY_TERMS.map((term) => term.category)),
  ] as CategoryType[];

  // Group terms by first letter for alphabetical navigation
  const groupedTerms = useMemo(() => {
    const groups: Record<string, GlossaryTerm[]> = {};
    filteredTerms.forEach((term) => {
      const firstLetter = t(term.termKey).charAt(0).toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(term);
    });
    return groups;
  }, [filteredTerms, t]);

  return (
    <DocsLayout
      title={t("docs.glossary.title", "Glossary")}
      description={t(
        "docs.glossary.description",
        "Learn the terminology used throughout Read Master."
      )}
      breadcrumbs={[{ label: "docs.glossary.title" }]}
    >
      {/* Info Alert */}
      <Alert severity="info" icon={<BookIcon />} sx={{ mb: 4 }}>
        <Typography variant="body2">
          {t(
            "docs.glossary.tip",
            "Use the search box to quickly find specific terms or filter by category."
          )}
        </Typography>
      </Alert>

      {/* Search and Filter */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder={t("docs.glossary.searchPlaceholder", "Search terms...")}
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
            label={t("docs.glossary.allTerms", "All Terms")}
            onClick={() => setSelectedCategory(null)}
            variant={selectedCategory === null ? "filled" : "outlined"}
            color="primary"
          />
          {categories.map((category) => (
            <Chip
              key={category}
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

      {/* Results Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t("docs.glossary.showing", "Showing {{count}} terms", {
          count: filteredTerms.length,
        })}
      </Typography>

      {/* Terms Display */}
      {filteredTerms.length === 0 ? (
        <Alert severity="info" sx={{ mb: 4 }}>
          {t(
            "docs.glossary.noResults",
            "No terms match your search. Try different keywords."
          )}
        </Alert>
      ) : (
        <Box>
          {Object.entries(groupedTerms).map(([letter, terms]) => (
            <Box key={letter} sx={{ mb: 4 }}>
              <Typography
                variant="h5"
                color="primary"
                fontWeight={700}
                sx={{ mb: 2 }}
              >
                {letter}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {terms.map((term, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: "100%",
                        "&:hover": {
                          borderColor: "primary.main",
                        },
                      }}
                    >
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="h6" fontWeight={600}>
                            {t(term.termKey)}
                          </Typography>
                          <Chip
                            label={t(CATEGORY_LABELS[term.category])}
                            size="small"
                            color={CATEGORY_COLORS[term.category]}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {t(term.definitionKey)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Box>
      )}
    </DocsLayout>
  );
}

export default GlossaryPage;
