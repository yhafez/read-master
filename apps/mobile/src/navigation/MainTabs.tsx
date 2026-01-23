/**
 * Read Master Mobile - Main Tab Navigator
 *
 * Bottom tab navigation for the main app sections.
 */

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { LibraryScreen } from "../screens/Library/LibraryScreen";
import { FlashcardsScreen } from "../screens/Flashcards/FlashcardsScreen";
import { SocialScreen } from "../screens/Social/SocialScreen";
import { SettingsScreen } from "../screens/Settings/SettingsScreen";
import { useTheme } from "../theme/ThemeProvider";

// ============================================================================
// Types
// ============================================================================

export type MainTabsParamList = {
  Library: undefined;
  Flashcards: undefined;
  Social: undefined;
  Settings: undefined;
};

// ============================================================================
// Navigator
// ============================================================================

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case "Library":
              iconName = focused ? "library" : "library-outline";
              break;
            case "Flashcards":
              iconName = focused ? "albums" : "albums-outline";
              break;
            case "Social":
              iconName = focused ? "people" : "people-outline";
              break;
            case "Settings":
              iconName = focused ? "settings" : "settings-outline";
              break;
            default:
              iconName = "help-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
      })}
    >
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          title: t("navigation.library"),
          headerTitle: t("library.title"),
        }}
      />
      <Tab.Screen
        name="Flashcards"
        component={FlashcardsScreen}
        options={{
          title: t("navigation.flashcards"),
          headerTitle: t("flashcards.title"),
        }}
      />
      <Tab.Screen
        name="Social"
        component={SocialScreen}
        options={{
          title: t("navigation.social"),
          headerTitle: t("social.title"),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t("navigation.settings"),
          headerTitle: t("settings.title"),
        }}
      />
    </Tab.Navigator>
  );
}
