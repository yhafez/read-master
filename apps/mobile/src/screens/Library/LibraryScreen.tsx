/**
 * Read Master Mobile - Library Screen
 *
 * Main library view showing user's books.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import * as DocumentPicker from "expo-document-picker";

import { useTheme } from "../../theme/ThemeProvider";
import { BookCard } from "../../components/common/BookCard";
import { useBooks } from "../../hooks/useBooks";
import type { RootStackParamList } from "../../navigation/RootNavigator";

// ============================================================================
// Types
// ============================================================================

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Book {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  progress: number;
  status: "WANT_TO_READ" | "READING" | "COMPLETED";
}

// ============================================================================
// Component
// ============================================================================

export function LibraryScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "reading" | "completed" | "want_to_read"
  >("all");

  const {
    data: books,
    isLoading,
    isRefetching,
    refetch,
  } = useBooks({ search: searchQuery, status: selectedFilter });

  const handleBookPress = useCallback(
    (book: Book) => {
      navigation.navigate("Reader", { bookId: book.id });
    },
    [navigation]
  );

  const handleImportBook = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/epub+zip", "application/pdf"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }

      const _file = result.assets[0];
      // TODO: Upload file to server and refresh library
      refetch();
    } catch (_error) {
      // Document picker error - silently fail
    }
  }, [refetch]);

  const filters = [
    { key: "all" as const, label: t("library.filters.all") },
    { key: "reading" as const, label: t("library.filters.reading") },
    { key: "completed" as const, label: t("library.filters.completed") },
    { key: "want_to_read" as const, label: t("library.filters.wantToRead") },
  ];

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={t("library.searchPlaceholder")}
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.importButton}
          onPress={handleImportBook}
        >
          <Ionicons name="add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedFilter === item.key && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === item.key && styles.filterChipTextSelected,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Books Grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={books ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.booksGrid}
          columnWrapperStyle={styles.booksRow}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="book-outline"
                size={64}
                color={theme.colors.textMuted}
              />
              <Text style={styles.emptyTitle}>{t("library.emptyTitle")}</Text>
              <Text style={styles.emptyDescription}>
                {t("library.emptyDescription")}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={handleImportBook}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>
                  {t("library.importBook")}
                </Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <BookCard book={item} onPress={() => handleBookPress(item)} />
          )}
        />
      )}
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
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    searchInputContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.sm,
      height: 44,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchInput: {
      flex: 1,
      marginLeft: theme.spacing.sm,
      fontSize: theme.fontSize.md,
      color: theme.colors.text,
    },
    importButton: {
      width: 44,
      height: 44,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surface,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filtersContainer: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    filtersList: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    filterChip: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: theme.spacing.sm,
    },
    filterChipSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterChipText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: "500",
    },
    filterChipTextSelected: {
      color: "#ffffff",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    booksGrid: {
      padding: theme.spacing.md,
    },
    booksRow: {
      justifyContent: "space-between",
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: theme.spacing.xl,
      paddingTop: 80,
    },
    emptyTitle: {
      fontSize: theme.fontSize.xl,
      fontWeight: "600",
      color: theme.colors.text,
      marginTop: theme.spacing.md,
    },
    emptyDescription: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: theme.spacing.sm,
    },
    emptyButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      marginTop: theme.spacing.lg,
      gap: theme.spacing.xs,
    },
    emptyButtonText: {
      fontSize: theme.fontSize.md,
      fontWeight: "600",
      color: "#ffffff",
    },
  });
}
