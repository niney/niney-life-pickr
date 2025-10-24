import React from 'react'
import { Text, TouchableOpacity, StyleSheet } from 'react-native'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'

interface SearchBarProps {
  searchText: string
  onSearchTextChange: (text: string) => void
  onSearch: () => void
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchText,
  onSearchTextChange,
  onSearch,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  return (
    <div className="search-container">
      <div
        className={`search-input-wrapper ${theme}`}
        style={{ borderColor: colors.border }}
      >
        <FontAwesomeIcon
          icon={faSearch}
          style={{ marginRight: 8, fontSize: 16, color: colors.textSecondary }}
        />
        <input
          type="text"
          placeholder="리뷰 내용 검색..."
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSearch()
            }
          }}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            fontSize: 14,
            color: colors.text,
            padding: 0,
          }}
        />
        {searchText && searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              onSearchTextChange('')
              onSearch()
            }}
            style={{ padding: 4 }}
          >
            <FontAwesomeIcon icon={faTimes} style={{ fontSize: 16, color: colors.textSecondary }} />
          </TouchableOpacity>
        )}
      </div>
      <TouchableOpacity
        style={[styles.searchButton, { backgroundColor: colors.primary }]}
        onPress={onSearch}
      >
        <Text style={styles.searchButtonText}>검색</Text>
      </TouchableOpacity>
    </div>
  )
}

const styles = StyleSheet.create({
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
})

export default SearchBar
