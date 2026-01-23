/**
 * Read Master Mobile - Theme Provider
 *
 * Manages the app theme and provides theme context.
 */

import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { useSettingsStore } from "../stores/settingsStore";

// ============================================================================
// Types
// ============================================================================

export type ThemeMode = "light" | "dark" | "system" | "sepia";

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

export interface Theme {
  isDark: boolean;
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
}

interface ThemeContextValue {
  theme: Theme;
  setThemeMode: (mode: ThemeMode) => void;
}

// ============================================================================
// Theme Definitions
// ============================================================================

const lightColors: ThemeColors = {
  primary: "#1976d2",
  primaryLight: "#42a5f5",
  primaryDark: "#1565c0",
  secondary: "#9c27b0",
  background: "#f5f5f5",
  surface: "#ffffff",
  surfaceVariant: "#f8f9fa",
  text: "#212121",
  textSecondary: "#757575",
  textMuted: "#9e9e9e",
  border: "#e0e0e0",
  divider: "#eeeeee",
  error: "#d32f2f",
  warning: "#f57c00",
  success: "#388e3c",
  info: "#0288d1",
};

const darkColors: ThemeColors = {
  primary: "#90caf9",
  primaryLight: "#e3f2fd",
  primaryDark: "#42a5f5",
  secondary: "#ce93d8",
  background: "#121212",
  surface: "#1e1e1e",
  surfaceVariant: "#2a2a2a",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  textMuted: "#757575",
  border: "#333333",
  divider: "#2a2a2a",
  error: "#f44336",
  warning: "#ff9800",
  success: "#4caf50",
  info: "#29b6f6",
};

const sepiaColors: ThemeColors = {
  primary: "#8b4513",
  primaryLight: "#a0522d",
  primaryDark: "#654321",
  secondary: "#d2691e",
  background: "#f5e6d3",
  surface: "#fff8f0",
  surfaceVariant: "#fef5ed",
  text: "#5d4037",
  textSecondary: "#795548",
  textMuted: "#a1887f",
  border: "#d7ccc8",
  divider: "#efebe9",
  error: "#c62828",
  warning: "#e65100",
  success: "#2e7d32",
  info: "#01579b",
};

const baseTheme = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },
};

// ============================================================================
// Context
// ============================================================================

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);

  const theme = useMemo<Theme>(() => {
    let colors: ThemeColors;
    let isDark: boolean;

    switch (themeMode) {
      case "light":
        colors = lightColors;
        isDark = false;
        break;
      case "dark":
        colors = darkColors;
        isDark = true;
        break;
      case "sepia":
        colors = sepiaColors;
        isDark = false;
        break;
      case "system":
      default:
        isDark = systemColorScheme === "dark";
        colors = isDark ? darkColors : lightColors;
        break;
    }

    return {
      isDark,
      mode: themeMode,
      colors,
      ...baseTheme,
    };
  }, [themeMode, systemColorScheme]);

  const value = useMemo(
    () => ({
      theme,
      setThemeMode,
    }),
    [theme, setThemeMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
