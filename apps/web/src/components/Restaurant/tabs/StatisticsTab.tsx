import React from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import StatisticsSummaryCard from './StatisticsSummaryCard'
import TopMenuList from './TopMenuList'
import MenuStatItem from './MenuStatItem'
import type { MenuStatistics } from './types'

interface StatisticsTabProps {
  menuStatistics: MenuStatistics | null
  statisticsLoading: boolean
}

const StatisticsTab: React.FC<StatisticsTabProps> = ({ menuStatistics, statisticsLoading }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  if (statisticsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!menuStatistics) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          통계 데이터가 없습니다
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* 전체 요약 */}
      <StatisticsSummaryCard
        totalReviews={menuStatistics.totalReviews}
        analyzedReviews={menuStatistics.analyzedReviews}
        menuCount={menuStatistics.menuStatistics.length}
      />

      {/* Top 긍정 메뉴 */}
      {menuStatistics.topPositiveMenus.length > 0 && (
        <TopMenuList
          menus={menuStatistics.topPositiveMenus}
          type="positive"
          title="😊 추천 메뉴 (긍정률 높음)"
        />
      )}

      {/* Top 부정 메뉴 */}
      {menuStatistics.topNegativeMenus.length > 0 && (
        <TopMenuList
          menus={menuStatistics.topNegativeMenus}
          type="negative"
          title="😞 주의할 메뉴 (부정률 높음)"
        />
      )}

      {/* 전체 메뉴 통계 */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme === 'light' ? '#fff' : colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>📋 전체 메뉴 통계</Text>
        <View style={styles.list}>
          {menuStatistics.menuStatistics.map((stat, index) => (
            <MenuStatItem key={index} stat={stat} />
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
  },
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
  list: {
    gap: 12,
  },
})

export default StatisticsTab
