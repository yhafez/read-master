/**
 * Read Master Mobile - Table of Contents Screen
 *
 * Displays book chapters and navigation.
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../theme/ThemeProvider";
import { useTableOfContents } from "../../hooks/useBooks";
import type { ReaderStackParamList } from "../../navigation/ReaderStack";
import type { Chapter } from "../../services/api";

// ============================================================================
// Types
// ============================================================================

type NavigationProp = NativeStackNavigationProp<
  ReaderStackParamList,
  "TableOfContents"
>;
type TOCRouteProp = RouteProp<ReaderStackParamList, "TableOfContents">;

// ============================================================================
// Component
// ============================================================================

export function TableOfContentsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TOCRouteProp>();

  const { bookId } = route.params;
  const { data: chapters, isLoading, error } = useTableOfContents(bookId);

  const handleChapterPress = useCallback(
    (_chapter: Chapter) => {
      // Navigate back to reader with chapter position
      navigation.navigate("ReaderMain", { bookId });
      // In a real implementation, we would also pass the position to navigate to
    },
    [bookId, navigation]
  );

  const styles = createStyles(theme);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>{t("common.error")}</Text>
      </View>
    );
  }

  const renderChapter = ({ item }: { item: Chapter }) => (
    <TouchableOpacity
      style={[styles.chapterItem, { paddingLeft: 16 + item.level * 16 }]}
      onPress={() => handleChapterPress(item)}
    >
      <Text
        style={[
          styles.chapterTitle,
          item.level === 0 && styles.chapterTitleBold,
        ]}
        numberOfLines={2}
      >
        {item.title}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={theme.colors.textMuted}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={chapters}
        keyExtractor={(item) => item.id}
        renderItem={renderChapter}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="list-outline"
              size={48}
              color={theme.colors.textMuted}
            />
            <Text style={styles.emptyText}>No table of contents available</Text>
          </View>
        }
      />
    </View>
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
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
    errorText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.text,
      marginTop: theme.spacing.md,
    },
    listContent: {
      paddingVertical: theme.spacing.sm,
    },
    chapterItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.md,
      paddingRight: theme.spacing.md,
    },
    chapterTitle: {
      flex: 1,
      fontSize: theme.fontSize.md,
      color: theme.colors.text,
      marginRight: theme.spacing.sm,
    },
    chapterTitleBold: {
      fontWeight: "600",
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.divider,
      marginLeft: theme.spacing.md,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
      marginTop: 100,
    },
    emptyText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.md,
      textAlign: "center",
    },
  });
}

export default TableOfContentsScreen;
