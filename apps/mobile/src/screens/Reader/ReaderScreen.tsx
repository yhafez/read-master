/**
 * Read Master Mobile - Reader Screen
 *
 * Main reading interface for books.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Animated,
  type GestureResponderEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../theme/ThemeProvider";
import {
  useBook,
  useUpdateProgress,
  useCreateBookmark,
} from "../../hooks/useBooks";
import type { ReaderStackParamList } from "../../navigation/ReaderStack";

// ============================================================================
// Types
// ============================================================================

type NavigationProp = NativeStackNavigationProp<
  ReaderStackParamList,
  "ReaderMain"
>;
type ReaderRouteProp = RouteProp<ReaderStackParamList, "ReaderMain">;

// ============================================================================
// Component
// ============================================================================

export function ReaderScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ReaderRouteProp>();
  const insets = useSafeAreaInsets();

  const { bookId } = route.params;

  // State
  const [showControls, setShowControls] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(100); // Will be set from book data
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  // Data
  const { data: book, isLoading, error } = useBook(bookId);
  const updateProgress = useUpdateProgress();
  const createBookmark = useCreateBookmark();

  // Effects
  useEffect(() => {
    if (book) {
      setCurrentPage(book.currentPage ?? 1);
      setTotalPages(book.totalPages ?? 100);
    }
  }, [book]);

  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: showControls ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showControls, controlsOpacity]);

  // Hide status bar when controls are hidden
  useEffect(() => {
    StatusBar.setHidden(!showControls, "fade");
  }, [showControls]);

  // Handlers
  const handleTap = useCallback(() => {
    setShowControls((prev) => !prev);
  }, []);

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      const newPage =
        direction === "left"
          ? Math.min(currentPage + 1, totalPages)
          : Math.max(currentPage - 1, 1);

      setCurrentPage(newPage);

      // Update progress
      const progress = (newPage / totalPages) * 100;
      updateProgress.mutate({
        bookId,
        progress: {
          position: newPage,
          progress,
          currentPage: newPage,
        },
      });
    },
    [bookId, currentPage, totalPages, updateProgress]
  );

  const handleAddBookmark = useCallback(() => {
    createBookmark.mutate({
      bookId,
      data: {
        position: currentPage,
        title: `Page ${currentPage}`,
      },
    });
  }, [bookId, currentPage, createBookmark]);

  const handleTouchEnd = useCallback(
    (e: GestureResponderEvent) => {
      const { locationX } = e.nativeEvent;
      const screenWidth = Dimensions.get("window").width;
      const tapZone = screenWidth / 3;

      if (locationX < tapZone) {
        // Left tap - previous page
        handleSwipe("right");
      } else if (locationX > screenWidth - tapZone) {
        // Right tap - next page
        handleSwipe("left");
      } else {
        // Center tap - toggle controls
        handleTap();
      }
    },
    [handleSwipe, handleTap]
  );

  const styles = createStyles(theme, insets);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Error state
  if (error || !book) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>{t("common.error")}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>{t("common.back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progress = (currentPage / totalPages) * 100;

  return (
    <View style={styles.container} onTouchEnd={handleTouchEnd}>
      {/* Content Area - Placeholder for actual book content */}
      <View style={styles.contentArea}>
        <Text style={styles.pageContent}>
          {/* This would be replaced with actual EPUB/PDF content */}
          Page {currentPage} of {totalPages}
        </Text>
        <Text style={styles.bookTitle}>{book.title}</Text>
      </View>

      {/* Top Bar */}
      <Animated.View
        style={[styles.topBar, { opacity: controlsOpacity }]}
        pointerEvents={showControls ? "auto" : "none"}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAddBookmark}
          >
            <Ionicons
              name="bookmark-outline"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("Search", { bookId })}
          >
            <Ionicons name="search" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("ReaderSettings")}
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Bottom Bar */}
      <Animated.View
        style={[styles.bottomBar, { opacity: controlsOpacity }]}
        pointerEvents={showControls ? "auto" : "none"}
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate("TableOfContents", { bookId })}
          >
            <Ionicons name="list" size={20} color={theme.colors.text} />
            <Text style={styles.quickActionText}>
              {t("reader.tableOfContents")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate("Bookmarks", { bookId })}
          >
            <Ionicons name="bookmark" size={20} color={theme.colors.text} />
            <Text style={styles.quickActionText}>{t("reader.bookmarks")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate("Annotations", { bookId })}
          >
            <Ionicons
              name="document-text"
              size={20}
              color={theme.colors.text}
            />
            <Text style={styles.quickActionText}>
              {t("reader.annotations")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {currentPage} / {totalPages} ({Math.round(progress)}%)
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

function createStyles(
  theme: ReturnType<typeof useTheme>["theme"],
  insets: { top: number; bottom: number }
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      padding: theme.spacing.xl,
    },
    errorText: {
      fontSize: theme.fontSize.lg,
      color: theme.colors.text,
      marginTop: theme.spacing.md,
    },
    retryButton: {
      marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
    },
    retryButtonText: {
      color: "#ffffff",
      fontSize: theme.fontSize.md,
      fontWeight: "600",
    },
    contentArea: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
    },
    pageContent: {
      fontSize: theme.fontSize.xl,
      color: theme.colors.text,
      textAlign: "center",
    },
    bookTitle: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.md,
      textAlign: "center",
    },
    topBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: insets.top + theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      backgroundColor: `${theme.colors.surface}ee`,
    },
    backButton: {
      width: 44,
      height: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    topBarActions: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    actionButton: {
      width: 44,
      height: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    bottomBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: insets.bottom + theme.spacing.sm,
      backgroundColor: `${theme.colors.surface}ee`,
    },
    quickActions: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: theme.spacing.md,
    },
    quickActionButton: {
      alignItems: "center",
      padding: theme.spacing.sm,
    },
    quickActionText: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    progressContainer: {
      alignItems: "center",
    },
    progressBar: {
      width: "100%",
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: theme.colors.primary,
    },
    progressText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
  });
}

export default ReaderScreen;
