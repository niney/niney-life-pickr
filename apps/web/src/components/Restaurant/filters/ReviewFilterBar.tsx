import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import SentimentFilterButtons, { type SentimentType } from './SentimentFilterButtons'
import SearchBar from './SearchBar'

interface ReviewFilterBarProps {
  sentimentFilter: SentimentType
  onFilterChange: (restaurantId: number, filter: SentimentType) => void
  searchText: string
  onSearchTextChange: (text: string) => void
  onSearch: (restaurantId: number, searchText: string) => void
  restaurantId: string
}

const ReviewFilterBar: React.FC<ReviewFilterBarProps> = ({
  sentimentFilter,
  onFilterChange,
  searchText,
  onSearchTextChange,
  onSearch,
  restaurantId,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  const handleFilterChange = (filter: SentimentType) => {
    const id = parseInt(restaurantId, 10)
    if (!isNaN(id)) {
      onFilterChange(id, filter)
    }
  }

  const handleSearch = () => {
    const id = parseInt(restaurantId, 10)
    if (!isNaN(id)) {
      onSearch(id, searchText)
    }
  }

  const handleClear = () => {
    const id = parseInt(restaurantId, 10)
    if (!isNaN(id)) {
      onSearchTextChange('')
      onSearch(id, '')
    }
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, borderBottomColor: colors.border },
      ]}
    >
      <SentimentFilterButtons
        selectedFilter={sentimentFilter}
        onFilterChange={handleFilterChange}
      />
      <SearchBar
        searchText={searchText}
        onSearchTextChange={onSearchTextChange}
        onSearch={handleSearch}
        onClear={handleClear}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
})

export default ReviewFilterBar
