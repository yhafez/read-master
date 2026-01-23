/**
 * Read Master Mobile - Search Screen
 *
 * Search within a book.
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../theme/ThemeProvider";
import { useBookSearch } from "../../hooks/useBooks";
import type { ReaderStackParamList } from "../../navigation/ReaderStack";

// ============================================================================
// Types
// ============================================================================

type NavigationProp = NativeStackNavigationProp<ReaderStackParamList, "Search">;
type SearchRouteProp = RouteProp<ReaderStackParamList, "Search">;

interface SearchResult {
  text: string;
  position: number;
  cfi?: string;
}

// ============================================================================
// Component
// ============================================================================

export function SearchScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SearchRouteProp>();

  const { bookId } = route.params;
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading, isFetching } = useBookSearch(
    bookId,
    debouncedQuery,
    debouncedQuery.length >= 2
  );

  const results = data?.results ?? [];

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleResultPress = useCallback(
    (_result: SearchResult) => {
      Keyboard.dismiss();
      // Navigate back to reader with search result position
      navigation.navigate("ReaderMain", { bookId });
      // In a real implementation, we would also pass the position to navigate to
    },
    [bookId, navigation]
  );

  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery) return text;

    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <Text key={index} style={styles.highlight}>
          {part}
        </Text>
      ) : (
        part
      )
    );
  };

  const styles = createStyles(theme);

  const renderResult = ({
    item,
    index,
  }: {
    item: SearchResult;
    index: number;
  }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
    >
      <View style={styles.resultNumber}>
        <Text style={styles.resultNumberText}>{index + 1}</Text>
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultText} numberOfLines={3}>
          {highlightMatch(item.text, query)}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={theme.colors.textMuted}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.textSecondary}
          />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={t("reader.searchPlaceholder")}
            placeholderTextColor={theme.colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
          {(isLoading || isFetching) && query.length >= 2 && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              style={styles.loadingIndicator}
            />
          )}
        </View>
      </View>

      {/* Results Count */}
      {query.length >= 2 && results.length > 0 && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {t("reader.searchResults", { count: results.length })}
          </Text>
        </View>
      )}

      {/* Results List */}
      <FlatList
        data={results}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderResult}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          query.length >= 2 && !isLoading && !isFetching ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="search-outline"
                size={48}
                color={theme.colors.textMuted}
              />
              <Text style={styles.emptyText}>{t("common.noResults")}</Text>
            </View>
          ) : query.length < 2 ? (
            <View style={styles.hintContainer}>
              <Text style={styles.hintText}>
                Enter at least 2 characters to search
              </Text>
            </View>
          ) : null
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
    searchContainer: {
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    searchInputContainer: {
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
    loadingIndicator: {
      marginLeft: theme.spacing.sm,
    },
    resultsHeader: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
    },
    resultsCount: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: "500",
    },
    listContent: {
      paddingVertical: theme.spacing.sm,
    },
    resultItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    resultNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.primaryLight + "30",
      justifyContent: "center",
      alignItems: "center",
      marginRight: theme.spacing.md,
    },
    resultNumberText: {
      fontSize: theme.fontSize.sm,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    resultContent: {
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    resultText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.text,
      lineHeight: theme.fontSize.md * 1.4,
    },
    highlight: {
      backgroundColor: theme.colors.warning + "40",
      fontWeight: "600",
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.divider,
      marginLeft: 44 + theme.spacing.md,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
      marginTop: 80,
    },
    emptyText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.md,
    },
    hintContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
      marginTop: 80,
    },
    hintText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textMuted,
      textAlign: "center",
    },
  });
}

export default SearchScreen;
