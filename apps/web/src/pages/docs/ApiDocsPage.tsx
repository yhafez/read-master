/**
 * API Documentation Page
 *
 * Displays interactive API documentation using OpenAPI specification.
 * Features:
 * - Endpoint browser with request/response schemas
 * - Authentication documentation
 * - Rate limiting information
 * - Code examples in multiple languages
 */

import { useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Link,
  Divider,
  useTheme,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CodeIcon from "@mui/icons-material/Code";
import SecurityIcon from "@mui/icons-material/Security";
import SpeedIcon from "@mui/icons-material/Speed";
import ApiIcon from "@mui/icons-material/Api";
import { useTranslation } from "react-i18next";
import { DocsLayout } from "./DocsLayout";

// ============================================================================
// Types
// ============================================================================

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  summary: string;
  description: string;
  tag: string;
}

// ============================================================================
// Constants
// ============================================================================

const METHOD_COLORS: Record<string, string> = {
  GET: "#61affe",
  POST: "#49cc90",
  PUT: "#fca130",
  DELETE: "#f93e3e",
  PATCH: "#50e3c2",
};

const ENDPOINTS: Endpoint[] = [
  // Books
  {
    method: "GET",
    path: "/api/books/{id}",
    summary: "Get book by ID",
    description: "Retrieves a single book with chapters and reading progress",
    tag: "Books",
  },
  {
    method: "PUT",
    path: "/api/books/{id}",
    summary: "Update book",
    description: "Updates book metadata (title, author, status, etc.)",
    tag: "Books",
  },
  {
    method: "DELETE",
    path: "/api/books/{id}",
    summary: "Delete book",
    description: "Soft deletes a book and related data",
    tag: "Books",
  },
  {
    method: "GET",
    path: "/api/books/search",
    summary: "Search books",
    description: "Search public library for books to add",
    tag: "Books",
  },
  // Flashcards
  {
    method: "GET",
    path: "/api/flashcards",
    summary: "List flashcards",
    description: "List user's flashcards with filters and pagination",
    tag: "Flashcards",
  },
  {
    method: "POST",
    path: "/api/flashcards",
    summary: "Create flashcard",
    description: "Create a new flashcard manually",
    tag: "Flashcards",
  },
  {
    method: "POST",
    path: "/api/flashcards/{id}/review",
    summary: "Review flashcard",
    description: "Submit a flashcard review using SM-2 algorithm",
    tag: "Flashcards",
  },
  {
    method: "GET",
    path: "/api/flashcards/due",
    summary: "Get due flashcards",
    description: "Get flashcards due for review today",
    tag: "Flashcards",
  },
  {
    method: "GET",
    path: "/api/flashcards/stats",
    summary: "Get flashcard statistics",
    description: "Get user's flashcard review statistics",
    tag: "Flashcards",
  },
  // AI
  {
    method: "POST",
    path: "/api/ai/pre-reading-guide",
    summary: "Generate pre-reading guide",
    description: "Generate an AI-powered pre-reading guide",
    tag: "AI",
  },
  {
    method: "POST",
    path: "/api/ai/explain",
    summary: "Explain text",
    description: "Get AI explanation for selected text (streaming)",
    tag: "AI",
  },
  {
    method: "POST",
    path: "/api/ai/generate-flashcards",
    summary: "Generate flashcards",
    description: "AI-generate flashcards from book content",
    tag: "AI",
  },
  // TTS
  {
    method: "POST",
    path: "/api/tts/speak",
    summary: "Text to speech",
    description: "Convert text to speech audio",
    tag: "TTS",
  },
  {
    method: "GET",
    path: "/api/tts/voices",
    summary: "List voices",
    description: "Get available TTS voices",
    tag: "TTS",
  },
  // Users
  {
    method: "GET",
    path: "/api/users/{username}",
    summary: "Get user profile",
    description: "Get public profile for a user",
    tag: "Users",
  },
  {
    method: "POST",
    path: "/api/users/{id}/follow",
    summary: "Follow user",
    description: "Follow another user",
    tag: "Users",
  },
  // Stats
  {
    method: "GET",
    path: "/api/leaderboard",
    summary: "Get leaderboard",
    description: "Get reading leaderboard",
    tag: "Stats",
  },
  {
    method: "GET",
    path: "/api/stats",
    summary: "Get user statistics",
    description: "Get reading statistics for the authenticated user",
    tag: "Stats",
  },
  // Forum
  {
    method: "GET",
    path: "/api/forum/categories",
    summary: "List forum categories",
    description: "Get all forum categories",
    tag: "Forum",
  },
  {
    method: "GET",
    path: "/api/forum/posts",
    summary: "List forum posts",
    description: "Get forum posts with filters",
    tag: "Forum",
  },
  {
    method: "POST",
    path: "/api/forum/posts",
    summary: "Create forum post",
    description: "Create a new forum post",
    tag: "Forum",
  },
];

const RATE_LIMITS = [
  { tier: "Free", requests: "100 requests/minute", aiCalls: "10 AI calls/day" },
  { tier: "Pro", requests: "500 requests/minute", aiCalls: "100 AI calls/day" },
  {
    tier: "Scholar",
    requests: "1000 requests/minute",
    aiCalls: "Unlimited AI calls",
  },
];

// ============================================================================
// Helper Components
// ============================================================================

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`api-tabpanel-${index}`}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function MethodChip({ method }: { method: string }) {
  return (
    <Chip
      label={method}
      size="small"
      sx={{
        bgcolor: METHOD_COLORS[method] || "#666",
        color: "white",
        fontWeight: 600,
        minWidth: 60,
        mr: 2,
      }}
    />
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: 2,
        bgcolor: theme.palette.mode === "dark" ? "#1e1e1e" : "#f5f5f5",
        overflow: "auto",
      }}
    >
      <Typography
        component="pre"
        sx={{
          fontFamily: "monospace",
          fontSize: "0.875rem",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          m: 0,
        }}
      >
        <code>{code}</code>
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        {language}
      </Typography>
    </Paper>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ApiDocsPage() {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | false>(
    false
  );

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEndpointChange =
    (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedEndpoint(isExpanded ? panel : false);
    };

  // Group endpoints by tag
  const groupedEndpoints = ENDPOINTS.reduce<Record<string, Endpoint[]>>(
    (acc, endpoint) => {
      const existingEndpoints = acc[endpoint.tag] ?? [];
      acc[endpoint.tag] = [...existingEndpoints, endpoint];
      return acc;
    },
    {}
  );

  return (
    <DocsLayout
      title={t("docs.api.title", "API Documentation")}
      description={t(
        "docs.api.description",
        "Complete reference for the Read Master REST API"
      )}
      breadcrumbs={[{ label: "docs.api.title" }]}
    >
      <Alert severity="info" sx={{ mb: 3 }}>
        {t(
          "docs.api.baseUrl",
          "Base URL: https://api.readmaster.com or http://localhost:3000/api for development"
        )}
      </Alert>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab icon={<ApiIcon />} label={t("docs.api.endpoints", "Endpoints")} />
        <Tab
          icon={<SecurityIcon />}
          label={t("docs.api.authentication", "Authentication")}
        />
        <Tab
          icon={<SpeedIcon />}
          label={t("docs.api.rateLimiting", "Rate Limiting")}
        />
        <Tab
          icon={<CodeIcon />}
          label={t("docs.api.codeExamples", "Code Examples")}
        />
      </Tabs>

      {/* Endpoints Tab */}
      <TabPanel value={tabValue} index={0}>
        {Object.entries(groupedEndpoints).map(([tag, endpoints]) => (
          <Box key={tag} sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              {tag}
            </Typography>
            {endpoints.map((endpoint) => (
              <Accordion
                key={`${endpoint.method}-${endpoint.path}`}
                expanded={
                  expandedEndpoint === `${endpoint.method}-${endpoint.path}`
                }
                onChange={handleEndpointChange(
                  `${endpoint.method}-${endpoint.path}`
                )}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <MethodChip method={endpoint.method} />
                    <Typography
                      sx={{ fontFamily: "monospace", fontWeight: 500 }}
                    >
                      {endpoint.path}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ ml: 2 }}
                    >
                      {endpoint.summary}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>{endpoint.description}</Typography>
                  <Typography variant="subtitle2" gutterBottom>
                    {t("docs.api.authorization", "Authorization")}:
                  </Typography>
                  <Chip
                    label="Bearer Token"
                    size="small"
                    color="primary"
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="subtitle2" gutterBottom>
                    {t("docs.api.example", "Example")}:
                  </Typography>
                  <CodeBlock
                    code={`curl -X ${endpoint.method} "https://api.readmaster.com${endpoint.path.replace("{id}", "abc123").replace("{username}", "johndoe")}" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json"`}
                    language="cURL"
                  />
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        ))}

        <Alert severity="info" sx={{ mt: 3 }}>
          {t(
            "docs.api.openApiNote",
            "Full OpenAPI 3.1 specification available at /api/openapi.json"
          )}
        </Alert>
      </TabPanel>

      {/* Authentication Tab */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          {t("docs.api.authOverview", "Authentication Overview")}
        </Typography>
        <Typography paragraph>
          {t(
            "docs.api.authDescription",
            "Read Master uses Clerk for authentication. All API requests (except health check) require a valid JWT token."
          )}
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          {t("docs.api.obtainingToken", "Obtaining a Token")}
        </Typography>
        <Typography paragraph>
          {t(
            "docs.api.tokenDescription",
            "Tokens are obtained through Clerk's authentication flow. For web applications, Clerk's SDK handles this automatically."
          )}
        </Typography>

        <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
          {t("docs.api.usingToken", "Using the Token")}
        </Typography>
        <CodeBlock
          code={`// Include in Authorization header
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

// Example with fetch
const response = await fetch('https://api.readmaster.com/api/books', {
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json'
  }
});`}
          language="JavaScript"
        />

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          {t("docs.api.errorResponses", "Authentication Errors")}
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("docs.api.statusCode", "Status Code")}</TableCell>
                <TableCell>{t("docs.api.errorCode", "Error Code")}</TableCell>
                <TableCell>{t("docs.api.meaning", "Meaning")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>401</TableCell>
                <TableCell>UNAUTHORIZED</TableCell>
                <TableCell>
                  {t(
                    "docs.api.error401",
                    "Missing or invalid authentication token"
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>403</TableCell>
                <TableCell>FORBIDDEN</TableCell>
                <TableCell>
                  {t(
                    "docs.api.error403",
                    "Valid token but insufficient permissions"
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Rate Limiting Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>
          {t("docs.api.rateLimitOverview", "Rate Limiting")}
        </Typography>
        <Typography paragraph>
          {t(
            "docs.api.rateLimitDescription",
            "API requests are rate limited based on your subscription tier. Limits reset every minute for general requests."
          )}
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t("docs.api.tier", "Tier")}</TableCell>
                <TableCell>
                  {t("docs.api.apiRequests", "API Requests")}
                </TableCell>
                <TableCell>{t("docs.api.aiCalls", "AI Calls")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {RATE_LIMITS.map((limit) => (
                <TableRow key={limit.tier}>
                  <TableCell>
                    <Chip
                      label={limit.tier}
                      size="small"
                      color={
                        limit.tier === "Scholar"
                          ? "primary"
                          : limit.tier === "Pro"
                            ? "secondary"
                            : "default"
                      }
                    />
                  </TableCell>
                  <TableCell>{limit.requests}</TableCell>
                  <TableCell>{limit.aiCalls}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="h6" gutterBottom>
          {t("docs.api.rateLimitHeaders", "Rate Limit Headers")}
        </Typography>
        <Typography paragraph>
          {t(
            "docs.api.headersDescription",
            "Rate limit information is included in response headers:"
          )}
        </Typography>
        <CodeBlock
          code={`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642089600`}
          language="HTTP Headers"
        />

        <Alert severity="warning" sx={{ mt: 3 }}>
          {t(
            "docs.api.rateLimitWarning",
            "When rate limited, you will receive a 429 Too Many Requests response. Implement exponential backoff in your client."
          )}
        </Alert>
      </TabPanel>

      {/* Code Examples Tab */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6" gutterBottom>
          JavaScript / TypeScript
        </Typography>
        <CodeBlock
          code={`// Using fetch
async function getBooks(token: string) {
  const response = await fetch('https://api.readmaster.com/api/books', {
    headers: {
      'Authorization': \`Bearer \${token}\`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }

  return response.json();
}

// Create a flashcard
async function createFlashcard(token: string, flashcard: {
  front: string;
  back: string;
  type: 'VOCABULARY' | 'CONCEPT' | 'CUSTOM';
  bookId?: string;
}) {
  const response = await fetch('https://api.readmaster.com/api/flashcards', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${token}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(flashcard)
  });

  return response.json();
}`}
          language="TypeScript"
        />

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Python
        </Typography>
        <CodeBlock
          code={`import requests

BASE_URL = "https://api.readmaster.com/api"

def get_books(token: str):
    """Get user's books"""
    response = requests.get(
        f"{BASE_URL}/books",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )
    response.raise_for_status()
    return response.json()

def create_flashcard(token: str, front: str, back: str, card_type: str = "CUSTOM"):
    """Create a new flashcard"""
    response = requests.post(
        f"{BASE_URL}/flashcards",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={
            "front": front,
            "back": back,
            "type": card_type
        }
    )
    response.raise_for_status()
    return response.json()`}
          language="Python"
        />

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          cURL
        </Typography>
        <CodeBlock
          code={`# Get user's books
curl -X GET "https://api.readmaster.com/api/books" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json"

# Create a flashcard
curl -X POST "https://api.readmaster.com/api/flashcards" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "front": "What is photosynthesis?",
    "back": "The process by which plants convert light energy into chemical energy",
    "type": "CONCEPT"
  }'

# Review a flashcard (SM-2 algorithm)
curl -X POST "https://api.readmaster.com/api/flashcards/abc123/review" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"rating": 2}'`}
          language="cURL"
        />

        <Box sx={{ mt: 4 }}>
          <Typography variant="body2" color="text.secondary">
            {t("docs.api.moreExamples", "For more examples, see the")}{" "}
            <Link href="https://github.com/readmaster/api-examples">
              {t("docs.api.apiExamplesRepo", "API examples repository")}
            </Link>
          </Typography>
        </Box>
      </TabPanel>
    </DocsLayout>
  );
}

export default ApiDocsPage;
