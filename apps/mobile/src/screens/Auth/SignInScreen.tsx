/**
 * Read Master Mobile - Sign In Screen
 *
 * Authentication screen using Clerk.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSignIn } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../theme/ThemeProvider";
import type { AuthStackParamList } from "../../navigation/AuthStack";

// ============================================================================
// Types
// ============================================================================

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "SignIn">;

// ============================================================================
// Component
// ============================================================================

export function SignInScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { signIn, setActive, isLoaded } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = useCallback(async () => {
    if (!isLoaded || !signIn) return;

    if (!email.trim() || !password.trim()) {
      Alert.alert(t("auth.error"), t("auth.fillAllFields"));
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        // Navigation will happen automatically via auth state change
      }
      // Additional steps may be required - handled by Clerk
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : t("auth.signInFailed");
      Alert.alert(t("auth.error"), errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, signIn, email, password, setActive, t]);

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>{t("auth.signIn")}</Text>
            <Text style={styles.subtitle}>{t("auth.signInSubtitle")}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t("auth.email")}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("auth.emailPlaceholder")}
                  placeholderTextColor={theme.colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t("auth.password")}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("auth.passwordPlaceholder")}
                  placeholderTextColor={theme.colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>
                {t("auth.forgotPassword")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isLoading && styles.submitButtonDisabled,
              ]}
              onPress={handleSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>{t("auth.signIn")}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.signUpPrompt}>
              <Text style={styles.signUpPromptText}>
                {t("auth.noAccount")}{" "}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("SignUp")}
                disabled={isLoading}
              >
                <Text style={styles.signUpLink}>{t("auth.signUp")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================================
// Styles
// ============================================================================

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
    },
    header: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    backButton: {
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
    },
    form: {
      gap: theme.spacing.md,
    },
    inputContainer: {
      gap: theme.spacing.xs,
    },
    label: {
      fontSize: theme.fontSize.sm,
      fontWeight: "500",
      color: theme.colors.text,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      height: 52,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    input: {
      flex: 1,
      fontSize: theme.fontSize.md,
      color: theme.colors.text,
    },
    forgotPassword: {
      alignSelf: "flex-end",
    },
    forgotPasswordText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.primary,
      fontWeight: "500",
    },
    footer: {
      flex: 1,
      justifyContent: "flex-end",
      paddingBottom: theme.spacing.xl,
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: "center",
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    submitButtonText: {
      fontSize: theme.fontSize.lg,
      fontWeight: "600",
      color: "#ffffff",
    },
    signUpPrompt: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: theme.spacing.md,
    },
    signUpPromptText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
    },
    signUpLink: {
      fontSize: theme.fontSize.md,
      color: theme.colors.primary,
      fontWeight: "600",
    },
  });
}
