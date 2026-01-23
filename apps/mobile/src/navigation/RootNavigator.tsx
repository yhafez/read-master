/**
 * Read Master Mobile - Root Navigator
 *
 * Handles authentication flow and main app navigation.
 */

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "@clerk/clerk-expo";
import { ActivityIndicator, View } from "react-native";

import { MainTabs } from "./MainTabs";
import { AuthStack } from "./AuthStack";
import { ReaderStack } from "./ReaderStack";
import { useTheme } from "../theme/ThemeProvider";

// ============================================================================
// Types
// ============================================================================

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Reader: { bookId: string };
};

// ============================================================================
// Navigator
// ============================================================================

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isLoaded, isSignedIn } = useAuth();
  const { theme } = useTheme();

  // Show loading screen while auth is loading
  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Navigation theme configuration
  // Note: fonts property is supported but TypeScript types may not be updated
  const navigationTheme = {
    dark: theme.isDark,
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.error,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      >
        {isSignedIn ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Reader"
              component={ReaderStack}
              options={{
                animation: "slide_from_right",
                presentation: "fullScreenModal",
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
