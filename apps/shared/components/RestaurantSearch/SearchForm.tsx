import React from 'react'
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts'
import { THEME_COLORS } from '../../constants'

interface SearchFormProps {
  onSearch?: (query: string) => void
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const [searchQuery, setSearchQuery] = React.useState('')

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchQuery)
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, {
          backgroundColor: theme === 'light' ? '#ffffff' : colors.surface,
          color: colors.text,
          borderColor: colors.border
        }]}
        placeholder="맛집 이름, 주소 등을 검색하세요"
        placeholderTextColor={colors.textSecondary}
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmitEditing={handleSearch}
        returnKeyType="search"
      />
      <TouchableOpacity
        style={[styles.button, {
          backgroundColor: theme === 'light' ? '#f5f5f5' : colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }]}
        onPress={handleSearch}
      >
        <Text style={[styles.buttonText, { color: colors.text }]}>검색</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  button: {
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
})

export default SearchForm
