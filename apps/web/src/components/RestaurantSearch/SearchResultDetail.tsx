import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'

interface SearchResultDetailProps {
  restaurantId?: number
  restaurantName?: string
  category?: string
  address?: string
  description?: string
}

const SearchResultDetail: React.FC<SearchResultDetailProps> = ({
  restaurantId,
  restaurantName = '맛집 이름',
  category = '카테고리 미정',
  address = '주소 정보 없음',
  description = '상세 정보 준비 중입니다.',
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{restaurantName}</Text>
        <Text style={[styles.category, { color: colors.textSecondary }]}>{category}</Text>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>주소</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>{address}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>설명</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>{description}</Text>
        </View>

        {restaurantId && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>ID</Text>
            <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>{restaurantId}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  category: {
    fontSize: 16,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 20,
  },
})

export default SearchResultDetail
