/**
 * Feature Usage Chart Component
 *
 * Displays feature adoption and usage metrics including:
 * - Feature adoption rates (% of users using each feature)
 * - Feature usage counts
 * - Horizontal bar chart visualization
 * - Sortable table view
 *
 * Features:
 * - Combined table and chart view
 * - Sort by adoption rate or usage count
 * - Highlight low-usage features (< 20% adoption)
 * - Responsive design
 * - Loading and error states
 */

import { useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  CircularProgress,
  Alert,
  Chip,
  useTheme,
  useMediaQuery,
  Paper,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import WarningIcon from "@mui/icons-material/Warning";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

// ============================================================================
// Types
// ============================================================================

type SortField = "feature" | "adoption" | "usage";
type SortOrder = "asc" | "desc";

type FeatureData = {
  feature: string;
  adoption: number; // Percentage
  usage: number; // Count
  category: string;
};

type FeaturesAnalytics = {
  readingFeatures: {
    totalBooks: number;
    readingProgressTracked: number;
    annotationsCreated: number;
    ttsUsage: number;
  };
  learningFeatures: {
    flashcardsCreated: number;
    flashcardsReviewed: number;
    assessmentsTaken: number;
    preReadingGuidesGenerated: number;
  };
  socialFeatures: {
    groupsCreated: number;
    forumPostsCreated: number;
    forumRepliesCreated: number;
    curriculumsCreated: number;
    curriculumsFollowed: number;
  };
  aiFeatures: {
    totalAIRequests: number;
    aiEnabledUsers: number;
    aiDisabledUsers: number;
    explanationsGenerated: number;
    assessmentsGenerated: number;
  };
  adoptionRates: {
    annotationsAdoption: number;
    flashcardsAdoption: number;
    assessmentsAdoption: number;
    curriculumsAdoption: number;
    groupsAdoption: number;
    forumAdoption: number;
    aiAdoption: number;
  };
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchFeaturesAnalytics(): Promise<FeaturesAnalytics> {
  const response = await fetch("/api/admin/analytics/features");

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to fetch features analytics",
    }));
    throw new Error(error.message || "Failed to fetch features analytics");
  }

  const data = await response.json();
  return data.data;
}

// ============================================================================
// Helper Functions
// ============================================================================

function transformToFeatureData(analytics: FeaturesAnalytics): FeatureData[] {
  return [
    // Reading features
    {
      feature: "Annotations",
      adoption: analytics.adoptionRates.annotationsAdoption,
      usage: analytics.readingFeatures.annotationsCreated,
      category: "Reading",
    },
    {
      feature: "Reading Progress",
      adoption: 100, // Assume all active users track progress
      usage: analytics.readingFeatures.readingProgressTracked,
      category: "Reading",
    },
    // Learning features
    {
      feature: "Flashcards",
      adoption: analytics.adoptionRates.flashcardsAdoption,
      usage: analytics.learningFeatures.flashcardsCreated,
      category: "Learning",
    },
    {
      feature: "Assessments",
      adoption: analytics.adoptionRates.assessmentsAdoption,
      usage: analytics.learningFeatures.assessmentsTaken,
      category: "Learning",
    },
    {
      feature: "Pre-Reading Guides",
      adoption: 0, // Not tracked in adoptionRates
      usage: analytics.learningFeatures.preReadingGuidesGenerated,
      category: "AI",
    },
    // Social features
    {
      feature: "Reading Groups",
      adoption: analytics.adoptionRates.groupsAdoption,
      usage: analytics.socialFeatures.groupsCreated,
      category: "Social",
    },
    {
      feature: "Forum",
      adoption: analytics.adoptionRates.forumAdoption,
      usage: analytics.socialFeatures.forumPostsCreated,
      category: "Social",
    },
    {
      feature: "Curriculums",
      adoption: analytics.adoptionRates.curriculumsAdoption,
      usage: analytics.socialFeatures.curriculumsCreated,
      category: "Social",
    },
    // AI features
    {
      feature: "AI Assistance",
      adoption: analytics.adoptionRates.aiAdoption,
      usage: analytics.aiFeatures.totalAIRequests,
      category: "AI",
    },
    {
      feature: "AI Explanations",
      adoption: 0, // Subset of AI users
      usage: analytics.aiFeatures.explanationsGenerated,
      category: "AI",
    },
  ];
}

// ============================================================================
// Component
// ============================================================================

export function FeatureUsageChart() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [sortField, setSortField] = useState<SortField>("adoption");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Fetch data
  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "analytics", "features"],
    queryFn: fetchFeaturesAnalytics,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Transform and sort data
  const featureData = useMemo(() => {
    if (!analytics) return [];

    const data = transformToFeatureData(analytics);

    // Sort data
    return data.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      }

      return sortOrder === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [analytics, sortField, sortOrder]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Get color for adoption rate
  const getAdoptionColor = (adoption: number) => {
    if (adoption >= 50) return theme.palette.success.main;
    if (adoption >= 20) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight={400}
          >
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            Failed to load feature usage analytics. Please try again later.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!featureData || featureData.length === 0) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">No feature usage data available yet.</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h6" component="h2">
            Feature Usage & Adoption
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track which features users are adopting and identify underutilized
            features
          </Typography>
        </Box>

        {/* Chart */}
        <Box mb={4}>
          <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
            <BarChart
              data={featureData}
              layout="vertical"
              margin={{
                top: 5,
                right: isMobile ? 5 : 30,
                left: isMobile ? 60 : 100,
                bottom: 5,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme.palette.divider}
              />
              <XAxis
                type="number"
                domain={[0, 100]}
                stroke={theme.palette.text.secondary}
                style={{ fontSize: isMobile ? "10px" : "12px" }}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis
                type="category"
                dataKey="feature"
                stroke={theme.palette.text.secondary}
                style={{ fontSize: isMobile ? "10px" : "12px" }}
                width={isMobile ? 60 : 100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: theme.shape.borderRadius,
                }}
                labelStyle={{ color: theme.palette.text.primary }}
                formatter={(value, name) =>
                  typeof value === "number"
                    ? [
                        `${value}%`,
                        name === "adoption" ? "Adoption Rate" : String(name),
                      ]
                    : [String(value), String(name)]
                }
              />
              <Bar dataKey="adoption" radius={[0, 4, 4, 0]}>
                {featureData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getAdoptionColor(entry.adoption)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Table */}
        <TableContainer component={Paper} variant="outlined">
          <Table size={isMobile ? "small" : "medium"}>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortField === "feature"}
                    direction={sortField === "feature" ? sortOrder : "desc"}
                    onClick={() => handleSort("feature")}
                  >
                    Feature
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortField === "adoption"}
                    direction={sortField === "adoption" ? sortOrder : "desc"}
                    onClick={() => handleSort("adoption")}
                  >
                    Adoption
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortField === "usage"}
                    direction={sortField === "usage" ? sortOrder : "desc"}
                    onClick={() => handleSort("usage")}
                  >
                    Usage
                  </TableSortLabel>
                </TableCell>
                <TableCell>Category</TableCell>
                {!isMobile && <TableCell>Status</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {featureData.map((row) => (
                <TableRow key={row.feature}>
                  <TableCell component="th" scope="row">
                    {row.feature}
                  </TableCell>
                  <TableCell align="right">
                    <Box
                      component="span"
                      sx={{
                        color: getAdoptionColor(row.adoption),
                        fontWeight: "bold",
                      }}
                    >
                      {row.adoption}%
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {row.usage.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.category}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  {!isMobile && (
                    <TableCell>
                      {row.adoption < 20 ? (
                        <Chip
                          icon={<WarningIcon />}
                          label="Low Usage"
                          size="small"
                          color="error"
                        />
                      ) : row.adoption >= 50 ? (
                        <Chip
                          icon={<TrendingUpIcon />}
                          label="Popular"
                          size="small"
                          color="success"
                        />
                      ) : (
                        <Chip label="Moderate" size="small" color="warning" />
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
