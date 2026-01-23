/**
 * Read Master Mobile - Sign Up Screen
 *
 * Registration screen using Clerk.
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
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSignUp } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../theme/ThemeProvider";
import type { AuthStackParamList } from "../../navigation/AuthStack";

// ============================================================================
// Types
// ============================================================================

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "SignUp">;

// ============================================================================
// Component
// ============================================================================

export function SignUpScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { signUp, setActive, isLoaded } = useSignUp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const handleSignUp = useCallback(async () => {
    if (!isLoaded || !signUp) return;

    if (!email.trim() || !password.trim()) {
      Alert.alert(t("auth.error"), t("auth.fillAllFields"));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t("auth.error"), t("auth.passwordsDoNotMatch"));
      return;
    }

    if (password.length < 8) {
      Alert.alert(t("auth.error"), t("auth.passwordTooShort"));
      return;
    }

    setIsLoading(true);
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
      });

      // Send email verification
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : t("auth.signUpFailed");
      Alert.alert(t("auth.error"), errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, signUp, email, password, confirmPassword, t]);

  const handleVerification = useCallback(async () => {
    if (!isLoaded || !signUp) return;

    if (!verificationCode.trim()) {
      Alert.alert(t("auth.error"), t("auth.enterVerificationCode"));
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        // Navigation will happen automatically via auth state change
      }
      // Additional steps may be required - handled by Clerk
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : t("auth.verificationFailed");
      Alert.alert(t("auth.error"), errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, signUp, verificationCode, setActive, t]);

  const styles = createStyles(theme);

  // Verification code screen
  if (pendingVerification) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setPendingVerification(false)}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>{t("auth.verifyEmail")}</Text>
            <Text style={styles.subtitle}>
              {t("auth.verificationCodeSent", { email })}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t("auth.verificationCode")}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, { textAlign: "center" }]}
                  placeholder="000000"
                  placeholderTextColor={theme.colors.textMuted}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isLoading}
                />
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isLoading && styles.submitButtonDisabled,
              ]}
              onPress={handleVerification}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>{t("auth.verify")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              <Text style={styles.title}>{t("auth.createAccount")}</Text>
              <Text style={styles.subtitle}>{t("auth.signUpSubtitle")}</Text>
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
                    autoComplete="new-password"
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

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t("auth.confirmPassword")}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t("auth.confirmPasswordPlaceholder")}
                    placeholderTextColor={theme.colors.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    editable={!isLoading}
                  />
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <View style={styles.footerInline}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isLoading && styles.submitButtonDisabled,
                ]}
                onPress={handleSignUp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {t("auth.createAccount")}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.signUpPrompt}>
                <Text style={styles.signUpPromptText}>
                  {t("auth.hasAccount")}{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("SignIn")}
                  disabled={isLoading}
                >
                  <Text style={styles.signUpLink}>{t("auth.signIn")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
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
    footer: {
      flex: 1,
      justifyContent: "flex-end",
      paddingBottom: theme.spacing.xl,
    },
    footerInline: {
      paddingTop: theme.spacing.xl,
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
