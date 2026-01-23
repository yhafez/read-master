/**
 * Read Master Mobile - Welcome Screen
 *
 * Initial onboarding screen with sign in / sign up options.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../theme/ThemeProvider";
import type { AuthStackParamList } from "../../navigation/AuthStack";

// ============================================================================
// Types
// ============================================================================

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Welcome">;

// ============================================================================
// Component
// ============================================================================

export function WelcomeScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo and Title */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="book" size={64} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Read Master</Text>
          <Text style={styles.subtitle}>{t("welcome.subtitle")}</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem
            icon="bulb-outline"
            title={t("welcome.features.ai.title")}
            description={t("welcome.features.ai.description")}
            theme={theme}
          />
          <FeatureItem
            icon="albums-outline"
            title={t("welcome.features.flashcards.title")}
            description={t("welcome.features.flashcards.description")}
            theme={theme}
          />
          <FeatureItem
            icon="people-outline"
            title={t("welcome.features.social.title")}
            description={t("welcome.features.social.description")}
            theme={theme}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("SignUp")}
          >
            <Text style={styles.primaryButtonText}>
              {t("welcome.getStarted")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("SignIn")}
          >
            <Text style={styles.secondaryButtonText}>
              {t("welcome.signIn")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// Feature Item Component
// ============================================================================

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  theme: ReturnType<typeof useTheme>["theme"];
}

function FeatureItem({ icon, title, description, theme }: FeatureItemProps) {
  return (
    <View style={featureStyles(theme).container}>
      <View style={featureStyles(theme).iconContainer}>
        <Ionicons name={icon} size={24} color={theme.colors.primary} />
      </View>
      <View style={featureStyles(theme).textContainer}>
        <Text style={featureStyles(theme).title}>{title}</Text>
        <Text style={featureStyles(theme).description}>{description}</Text>
      </View>
    </View>
  );
}

function featureStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.md,
      backgroundColor: `${theme.colors.primary}15`,
      justifyContent: "center",
      alignItems: "center",
      marginRight: theme.spacing.md,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: theme.fontSize.md,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 2,
    },
    description: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
  });
}

// ============================================================================
// Styles
// ============================================================================

const { height } = Dimensions.get("window");

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      justifyContent: "space-between",
    },
    header: {
      alignItems: "center",
      paddingTop: height * 0.08,
    },
    logoContainer: {
      width: 100,
      height: 100,
      borderRadius: 25,
      backgroundColor: `${theme.colors.primary}15`,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: 32,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.fontSize.lg,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    features: {
      paddingVertical: theme.spacing.xl,
    },
    buttons: {
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: "center",
    },
    primaryButtonText: {
      fontSize: theme.fontSize.lg,
      fontWeight: "600",
      color: "#ffffff",
    },
    secondaryButton: {
      backgroundColor: "transparent",
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    secondaryButtonText: {
      fontSize: theme.fontSize.lg,
      fontWeight: "600",
      color: theme.colors.primary,
    },
  });
}
