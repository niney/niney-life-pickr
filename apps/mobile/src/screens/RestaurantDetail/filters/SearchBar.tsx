import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useTheme, THEME_COLORS } from 'shared';

interface SearchBarProps {
  searchText: string;
  onSearchTextChange: (text: string) => void;
  onSearch: () => void;
  onClear: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchText,
  onSearchTextChange,
  onSearch,
  onClear,
}) => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];

  const dynamicStyles = useMemo(() => ({
    inputWrapper: {
      backgroundColor: theme === 'light' ? '#f5f5f5' : colors.surface,
      borderColor: colors.border,
    },
    searchButton: {
      backgroundColor: colors.primary,
    },
  }), [theme, colors]);

  return (
    <View style={styles.container}>
      <View style={[styles.inputWrapper, dynamicStyles.inputWrapper]}>
        <FontAwesomeIcon
          icon={faSearch as IconProp}
          size={16}
          color={colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="리뷰 내용 검색..."
          placeholderTextColor={colors.textSecondary}
          value={searchText}
          onChangeText={onSearchTextChange}
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
        {searchText && searchText.length > 0 && (
          <TouchableOpacity
            onPress={onClear}
            style={styles.clearButton}
          >
            <FontAwesomeIcon
              icon={faTimes as IconProp}
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={[styles.searchButton, dynamicStyles.searchButton]}
        onPress={onSearch}
      >
        <Text style={styles.searchButtonText}>검색</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default SearchBar;
