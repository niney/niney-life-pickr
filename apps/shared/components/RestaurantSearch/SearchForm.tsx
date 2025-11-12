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
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <TextInput
        style={[styles.input, {
          backgroundColor: colors.background,
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
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleSearch}
      >
        <Text style={styles.buttonText}>검색</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default SearchForm
