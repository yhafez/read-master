/**
 * Documentation Layout Component
 *
 * Provides consistent layout for all documentation pages with
 * navigation sidebar and search functionality.
 */

import { useState, type ReactNode } from "react";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  TextField,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Collapse,
  Breadcrumbs,
  Link,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import HomeIcon from "@mui/icons-material/Home";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SchoolIcon from "@mui/icons-material/School";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PeopleIcon from "@mui/icons-material/People";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import HelpIcon from "@mui/icons-material/Help";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { useTranslation } from "react-i18next";

// ============================================================================
// Types
// ============================================================================

interface NavItem {
  label: string;
  path: string;
  icon?: ReactNode;
  children?: NavItem[];
}

export interface DocsLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; path?: string }>;
}

// ============================================================================
// Constants
// ============================================================================

const DRAWER_WIDTH = 280;

const NAV_ITEMS: NavItem[] = [
  {
    label: "docs.nav.gettingStarted",
    path: "/docs",
    icon: <HomeIcon />,
    children: [
      { label: "docs.nav.overview", path: "/docs" },
      {
        label: "docs.nav.createAccount",
        path: "/docs/getting-started/account",
      },
      { label: "docs.nav.importBooks", path: "/docs/getting-started/import" },
      {
        label: "docs.nav.readingBasics",
        path: "/docs/getting-started/reading",
      },
    ],
  },
  {
    label: "docs.nav.features",
    path: "/docs/features",
    icon: <MenuBookIcon />,
    children: [
      { label: "docs.nav.readingInterface", path: "/docs/features/reader" },
      { label: "docs.nav.annotations", path: "/docs/features/annotations" },
      { label: "docs.nav.textToSpeech", path: "/docs/features/tts" },
      { label: "docs.nav.offlineReading", path: "/docs/features/offline" },
    ],
  },
  {
    label: "docs.nav.flashcards",
    path: "/docs/flashcards",
    icon: <SchoolIcon />,
    children: [
      { label: "docs.nav.srsOverview", path: "/docs/flashcards" },
      { label: "docs.nav.reviewingCards", path: "/docs/flashcards/reviewing" },
      { label: "docs.nav.creatingCards", path: "/docs/flashcards/creating" },
    ],
  },
  {
    label: "docs.nav.aiFeatures",
    path: "/docs/ai",
    icon: <SmartToyIcon />,
    children: [
      { label: "docs.nav.aiOverview", path: "/docs/ai" },
      { label: "docs.nav.preReadingGuides", path: "/docs/ai/pre-reading" },
      { label: "docs.nav.aiChat", path: "/docs/ai/chat" },
      { label: "docs.nav.assessments", path: "/docs/ai/assessments" },
    ],
  },
  {
    label: "docs.nav.social",
    path: "/docs/social",
    icon: <PeopleIcon />,
    children: [
      { label: "docs.nav.socialOverview", path: "/docs/social" },
      { label: "docs.nav.forum", path: "/docs/social/forum" },
      { label: "docs.nav.readingGroups", path: "/docs/social/groups" },
      { label: "docs.nav.challenges", path: "/docs/social/challenges" },
    ],
  },
  {
    label: "docs.nav.keyboardShortcuts",
    path: "/docs/shortcuts",
    icon: <KeyboardIcon />,
  },
  {
    label: "docs.nav.faq",
    path: "/docs/faq",
    icon: <HelpIcon />,
  },
];

// ============================================================================
// Component
// ============================================================================

export function DocsLayout({
  children,
  title,
  description,
  breadcrumbs = [],
}: DocsLayoutProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(["/docs"]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const toggleSection = (path: string) => {
    setExpandedSections((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isInSection = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.includes(item.path);
    const active = isActive(item.path);
    const inSection = isInSection(item.path);

    return (
      <Box key={item.path}>
        <ListItem disablePadding sx={{ pl: depth * 2 }}>
          <ListItemButton
            onClick={() => {
              if (hasChildren) {
                toggleSection(item.path);
              } else {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }
            }}
            selected={active}
            sx={{
              borderRadius: 1,
              mx: 1,
              "&.Mui-selected": {
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": {
                  bgcolor: "primary.dark",
                },
              },
            }}
          >
            {item.icon && (
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: active
                    ? "inherit"
                    : inSection
                      ? "primary.main"
                      : "text.secondary",
                }}
              >
                {item.icon}
              </ListItemIcon>
            )}
            <ListItemText
              primary={t(item.label)}
              primaryTypographyProps={{
                fontWeight: active || inSection ? 600 : 400,
                fontSize: depth > 0 ? "0.875rem" : "1rem",
              }}
            />
            {hasChildren && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </ListItem>

        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List disablePadding>
              {item.children?.map((child) => renderNavItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

  const drawerContent = (
    <Box sx={{ overflow: "auto", pt: 2 }}>
      <Box sx={{ px: 2, pb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={t("docs.search", "Search documentation...")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <List>{NAV_ITEMS.map((item) => renderNavItem(item))}</List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Mobile App Bar */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{ bgcolor: "background.paper", color: "text.primary" }}
          elevation={1}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label={t("common.openMenu", "Open menu")}
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              {t("docs.title", "Documentation")}
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
              position: "fixed",
              top: 64, // Below main app bar
              height: "calc(100vh - 64px)",
              borderRight: 1,
              borderColor: "divider",
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: isMobile ? 8 : 0,
        }}
      >
        <Container maxWidth="lg">
          {/* Breadcrumbs */}
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="breadcrumb"
            sx={{ mb: 2 }}
          >
            <Link
              component={RouterLink}
              to="/docs"
              underline="hover"
              color="inherit"
            >
              {t("docs.title", "Docs")}
            </Link>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return isLast ? (
                <Typography color="text.primary" key={crumb.label}>
                  {t(crumb.label)}
                </Typography>
              ) : (
                <Link
                  component={RouterLink}
                  to={crumb.path || "#"}
                  underline="hover"
                  color="inherit"
                  key={crumb.label}
                >
                  {t(crumb.label)}
                </Link>
              );
            })}
          </Breadcrumbs>

          {/* Page Title */}
          <Typography variant="h4" component="h1" gutterBottom fontWeight={600}>
            {title}
          </Typography>

          {description && (
            <Typography
              variant="subtitle1"
              color="text.secondary"
              paragraph
              sx={{ mb: 4 }}
            >
              {description}
            </Typography>
          )}

          {/* Page Content */}
          {children}
        </Container>
      </Box>
    </Box>
  );
}

export default DocsLayout;
