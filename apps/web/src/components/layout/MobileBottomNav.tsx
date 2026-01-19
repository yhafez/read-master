/**
 * Mobile Bottom Navigation Component
 *
 * Provides a fixed bottom navigation bar for mobile devices with quick access to
 * the most frequently used sections of the app.
 */

import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo } from "react";

import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SchoolIcon from "@mui/icons-material/School";
import PersonIcon from "@mui/icons-material/Person";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

import { ROUTES } from "@/router/routes";

export interface MobileBottomNavItem {
  label: string;
  icon: React.ReactElement;
  path: string;
}

/**
 * Default bottom navigation items
 * These are the most frequently accessed sections
 */
export const DEFAULT_BOTTOM_NAV_ITEMS: MobileBottomNavItem[] = [
  {
    label: "nav.dashboard",
    icon: <DashboardIcon />,
    path: ROUTES.DASHBOARD,
  },
  {
    label: "nav.library",
    icon: <AutoStoriesIcon />,
    path: ROUTES.LIBRARY,
  },
  {
    label: "nav.flashcards",
    icon: <SchoolIcon />,
    path: ROUTES.FLASHCARDS,
  },
  {
    label: "nav.profile",
    icon: <PersonIcon />,
    path: ROUTES.MY_PROFILE,
  },
  {
    label: "nav.more",
    icon: <MoreHorizIcon />,
    path: ROUTES.SETTINGS, // "More" leads to settings/menu
  },
];

export interface MobileBottomNavProps {
  /** Custom navigation items (defaults to DEFAULT_BOTTOM_NAV_ITEMS) */
  items?: MobileBottomNavItem[];
  /** Additional sx props for the Paper container */
  sx?: React.ComponentProps<typeof Paper>["sx"];
}

/**
 * Mobile Bottom Navigation Bar
 *
 * Fixed bottom navigation for mobile devices. Only visible on small screens.
 *
 * @example
 * <MobileBottomNav />
 *
 * @example
 * // Custom items
 * <MobileBottomNav items={customNavItems} />
 */
export function MobileBottomNav({
  items = DEFAULT_BOTTOM_NAV_ITEMS,
  sx,
}: MobileBottomNavProps): React.ReactElement | null {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  // Determine current active tab based on pathname
  const currentValue = useMemo(() => {
    const currentPath = location.pathname;

    // Find exact match first
    const exactMatch = items.findIndex((item) => currentPath === item.path);
    if (exactMatch !== -1) {
      return exactMatch;
    }

    // Find match by path prefix (e.g., /library/collections matches /library)
    const prefixMatch = items.findIndex(
      (item) => item.path !== "/" && currentPath.startsWith(item.path)
    );
    if (prefixMatch !== -1) {
      return prefixMatch;
    }

    // No match
    return -1;
  }, [location.pathname, items]);

  const handleChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      const item = items[newValue];
      if (item) {
        navigate(item.path);
      }
    },
    [navigate, items]
  );

  return (
    <Paper
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar,
        ...sx,
      }}
      elevation={8}
    >
      <BottomNavigation
        showLabels
        value={currentValue}
        onChange={handleChange}
        sx={{
          height: 64,
          "& .MuiBottomNavigationAction-root": {
            minWidth: "auto",
            padding: "6px 12px 8px",
          },
          "& .MuiBottomNavigationAction-label": {
            fontSize: "0.75rem",
            "&.Mui-selected": {
              fontSize: "0.75rem",
            },
          },
        }}
      >
        {items.map((item, index) => (
          <BottomNavigationAction
            key={item.path}
            label={t(item.label)}
            icon={item.icon}
            aria-label={t(item.label)}
            value={index}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}

export default MobileBottomNav;
