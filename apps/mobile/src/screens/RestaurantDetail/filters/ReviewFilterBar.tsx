import React from 'react';
import { View, StyleSheet } from 'react-native';
import SentimentFilterButtons, { SentimentType } from './SentimentFilterButtons';
import SearchBar from './SearchBar';

interface ReviewFilterBarProps {
  sentimentFilter: SentimentType;
  onSentimentChange: (filter: SentimentType) => void;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  onSearch: () => void;
  onClear: () => void;
}

const ReviewFilterBar: React.FC<ReviewFilterBarProps> = ({
  sentimentFilter,
  onSentimentChange,
  searchText,
  onSearchTextChange,
  onSearch,
  onClear,
}) => {
  return (
    <View style={styles.container}>
      <SentimentFilterButtons
        selectedFilter={sentimentFilter}
        onFilterChange={onSentimentChange}
      />
      <SearchBar
        searchText={searchText}
        onSearchTextChange={onSearchTextChange}
        onSearch={onSearch}
        onClear={onClear}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
});

export default ReviewFilterBar;
