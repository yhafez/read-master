import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useState, useCallback } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SchoolIcon from "@mui/icons-material/School";
import QuizIcon from "@mui/icons-material/Quiz";
import GroupIcon from "@mui/icons-material/Group";
import ForumIcon from "@mui/icons-material/Forum";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SettingsIcon from "@mui/icons-material/Settings";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";

import { ROUTES } from "@/router/routes";
import { LanguageSwitcher, SkipLinks } from "@/components/common";
import { MobileBottomNav } from "./MobileBottomNav";

const DRAWER_WIDTH = 240;
const MOBILE_BOTTOM_NAV_HEIGHT = 64;

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { label: "nav.dashboard", path: ROUTES.DASHBOARD, icon: <DashboardIcon /> },
  { label: "nav.library", path: ROUTES.LIBRARY, icon: <AutoStoriesIcon /> },
  {
    label: "nav.flashcards",
    path: ROUTES.FLASHCARDS,
    icon: <SchoolIcon />,
  },
  {
    label: "nav.assessments",
    path: ROUTES.ASSESSMENTS,
    icon: <QuizIcon />,
  },
  { label: "nav.groups", path: ROUTES.GROUPS, icon: <GroupIcon /> },
  { label: "nav.forum", path: ROUTES.FORUM, icon: <ForumIcon /> },
  {
    label: "nav.curriculums",
    path: ROUTES.CURRICULUMS,
    icon: <MenuBookIcon />,
  },
  {
    label: "nav.leaderboard",
    path: ROUTES.LEADERBOARD,
    icon: <LeaderboardIcon />,
  },
  { label: "nav.settings", path: ROUTES.SETTINGS, icon: <SettingsIcon /> },
];

export function MainLayout(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const handleNavigation = useCallback(
    (path: string) => {
      navigate(path);
      if (isMobile) {
        setMobileOpen(false);
      }
    },
    [navigate, isMobile]
  );

  const isSelected = useCallback(
    (path: string) => {
      if (path === ROUTES.DASHBOARD) {
        return location.pathname === path;
      }
      return location.pathname.startsWith(path);
    },
    [location.pathname]
  );

  const drawerContent = (
    <Box
      sx={{ overflow: "auto" }}
      component="nav"
      role="navigation"
      id="navigation"
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <AutoStoriesIcon color="primary" />
        <Typography variant="h6" noWrap component="div">
          {t("common.appName")}
        </Typography>
      </Box>
      <List>
        {NAV_ITEMS.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={isSelected(item.path)}
              onClick={() => handleNavigation(item.path)}
              sx={{
                "&.Mui-selected": {
                  backgroundColor: "primary.main",
                  color: "primary.contrastText",
                  "&:hover": {
                    backgroundColor: "primary.dark",
                  },
                  "& .MuiListItemIcon-root": {
                    color: "inherit",
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={t(item.label)} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <SkipLinks />
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        {/* App Bar */}
        <AppBar
          position="fixed"
          sx={{
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            ml: { md: `${DRAWER_WIDTH}px` },
          }}
          role="banner"
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label={t("nav.openMenu")}
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: "none" } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ flexGrow: 1 }}
            >
              {t("common.appName")}
            </Typography>
            <LanguageSwitcher />
          </Toolbar>
        </AppBar>

        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
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

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>

        {/* Main Content */}
        <Box
          component="main"
          id="main-content"
          role="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 }, // Less padding on mobile
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            mt: "64px", // AppBar height
            mb: { xs: `${MOBILE_BOTTOM_NAV_HEIGHT}px`, md: 0 }, // Space for bottom nav on mobile
          }}
        >
          <Outlet />
        </Box>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </Box>
    </>
  );
}

export default MainLayout;
