import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'

export type SentimentType = 'all' | 'positive' | 'negative' | 'neutral'

interface SentimentFilterButtonsProps {
  selectedFilter: SentimentType
  onFilterChange: (filter: SentimentType) => void
}

const SentimentFilterButtons: React.FC<SentimentFilterButtonsProps> = ({
  selectedFilter,
  onFilterChange,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  const filters: Array<{ key: SentimentType; label: string; color: string }> = [
    { key: 'all', label: '전체', color: colors.primary },
    { key: 'positive', label: '😊 긍정', color: '#4caf50' },
    { key: 'negative', label: '😞 부정', color: '#f44336' },
    { key: 'neutral', label: '😐 중립', color: '#ff9800' },
  ]

  return (
    <View style={styles.container}>
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterButton,
            {
              backgroundColor:
                selectedFilter === filter.key
                  ? filter.color
                  : theme === 'light'
                    ? '#f5f5f5'
                    : colors.surface,
              borderColor: selectedFilter === filter.key ? filter.color : colors.border,
            },
          ]}
          onPress={() => onFilterChange(filter.key)}
        >
          <Text
            style={[
              styles.filterButtonText,
              { color: selectedFilter === filter.key ? '#fff' : colors.text },
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
})

export default SentimentFilterButtons
