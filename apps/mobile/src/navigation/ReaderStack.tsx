/**
 * Read Master Mobile - Reader Stack Navigator
 *
 * Navigation for the reading interface and related screens.
 */

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ReaderScreen } from "../screens/Reader/ReaderScreen";
import { TableOfContentsScreen } from "../screens/Reader/TableOfContentsScreen";
import { BookmarksScreen } from "../screens/Reader/BookmarksScreen";
import { AnnotationsScreen } from "../screens/Reader/AnnotationsScreen";
import { SearchScreen } from "../screens/Reader/SearchScreen";
import { ReaderSettingsScreen } from "../screens/Reader/ReaderSettingsScreen";
import { useTheme } from "../theme/ThemeProvider";
import type { RootStackParamList } from "./RootNavigator";

// ============================================================================
// Types
// ============================================================================

export type ReaderStackParamList = {
  ReaderMain: { bookId: string };
  TableOfContents: { bookId: string };
  Bookmarks: { bookId: string };
  Annotations: { bookId: string };
  Search: { bookId: string };
  ReaderSettings: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "Reader">;

// ============================================================================
// Navigator
// ============================================================================

const Stack = createNativeStackNavigator<ReaderStackParamList>();

export function ReaderStack({ route }: Props) {
  const { bookId } = route.params;
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerShadowVisible: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen
        name="ReaderMain"
        component={ReaderScreen}
        initialParams={{ bookId }}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TableOfContents"
        component={TableOfContentsScreen}
        initialParams={{ bookId }}
        options={{
          title: "Table of Contents",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="Bookmarks"
        component={BookmarksScreen}
        initialParams={{ bookId }}
        options={{
          title: "Bookmarks",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="Annotations"
        component={AnnotationsScreen}
        initialParams={{ bookId }}
        options={{
          title: "Annotations",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        initialParams={{ bookId }}
        options={{
          title: "Search",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="ReaderSettings"
        component={ReaderSettingsScreen}
        options={{
          title: "Reading Settings",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
