/**
 * Read Master Mobile - Auth Stack Navigator
 *
 * Authentication flow screens.
 */

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { WelcomeScreen } from "../screens/Auth/WelcomeScreen";
import { SignInScreen } from "../screens/Auth/SignInScreen";
import { SignUpScreen } from "../screens/Auth/SignUpScreen";
import { useTheme } from "../theme/ThemeProvider";

// ============================================================================
// Types
// ============================================================================

export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
};

// ============================================================================
// Navigator
// ============================================================================

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}
