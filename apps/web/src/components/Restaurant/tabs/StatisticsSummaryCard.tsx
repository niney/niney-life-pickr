import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'

interface StatisticsSummaryCardProps {
  totalReviews: number
  analyzedReviews: number
  menuCount: number
}

const StatisticsSummaryCard: React.FC<StatisticsSummaryCardProps> = ({
  totalReviews,
  analyzedReviews,
  menuCount,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme === 'light' ? '#fff' : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>📊 전체 요약</Text>
      <View style={styles.summary}>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>전체 리뷰</Text>
          <Text style={[styles.value, { color: colors.text }]}>{totalReviews}개</Text>
        </View>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>분석 완료</Text>
          <Text style={[styles.value, { color: colors.text }]}>{analyzedReviews}개</Text>
        </View>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>언급된 메뉴</Text>
          <Text style={[styles.value, { color: colors.text }]}>{menuCount}개</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
})

export default StatisticsSummaryCard
