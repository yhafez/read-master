/**
 * ThemeProvider wrapper for Read Master
 *
 * Provides theme context with persistence and dynamic switching
 */

import { CssBaseline, ThemeProvider as MuiThemeProvider } from "@mui/material";
import { useMemo, type ReactNode } from "react";

import { useThemeStore } from "../stores/themeStore";
import { createAppTheme } from "./createAppTheme";

interface AppThemeProviderProps {
  children: ReactNode;
}

/**
 * Theme provider that integrates with the theme store for persistent settings
 */
export function AppThemeProvider({
  children,
}: AppThemeProviderProps): React.ReactElement {
  const settings = useThemeStore((state) => state.settings);

  // Memoize theme creation to avoid unnecessary re-renders
  const theme = useMemo(() => createAppTheme(settings), [settings]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
