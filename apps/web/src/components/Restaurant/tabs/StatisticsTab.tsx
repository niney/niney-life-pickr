import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, Pressable } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { useRestaurantStatistics } from '@shared/hooks'
import { useMenuStatistics, type StatisticsSource } from '../hooks/useMenuStatistics'
import StatisticsSummaryCard from './StatisticsSummaryCard'
import ReviewStatisticsCard from './ReviewStatisticsCard'
import TopMenuList from './TopMenuList'
import MenuStatItem from './MenuStatItem'

interface StatisticsTabProps {
  restaurantId: number
}

const SOURCE_OPTIONS: { value: StatisticsSource; label: string; icon: string }[] = [
  { value: 'all', label: '전체', icon: '📊' },
  { value: 'naver', label: '네이버', icon: '🟢' },
  { value: 'catchtable', label: '캐치테이블', icon: '🍽️' },
]

const StatisticsTab: React.FC<StatisticsTabProps> = ({ restaurantId }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const [source, setSource] = useState<StatisticsSource>('all')

  // 훅 사용
  const { menuStatistics, statisticsLoading, fetchMenuStatistics } = useMenuStatistics()
  const { reviewStatistics, reviewStatisticsLoading, fetchReviewStatistics } =
    useRestaurantStatistics()

  // 데이터 로드
  const loadStatistics = useCallback(
    async (selectedSource: StatisticsSource) => {
      await Promise.all([
        fetchMenuStatistics(restaurantId, selectedSource),
        fetchReviewStatistics(restaurantId, selectedSource),
      ])
    },
    [restaurantId, fetchMenuStatistics, fetchReviewStatistics]
  )

  // 초기 로드 및 source 변경 시 다시 로드
  useEffect(() => {
    loadStatistics(source)
  }, [source, loadStatistics])

  // Source 변경 핸들러
  const handleSourceChange = (newSource: StatisticsSource) => {
    if (newSource !== source) {
      setSource(newSource)
    }
  }

  const isLoading = statisticsLoading || reviewStatisticsLoading

  return (
    <View style={styles.container}>
      {/* Source 선택 UI */}
      <View
        style={[
          styles.sourceSelector,
          {
            backgroundColor: theme === 'light' ? '#f8f9fa' : colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>
          리뷰 소스
        </Text>
        <View style={styles.segmentControl}>
          {SOURCE_OPTIONS.map((option) => {
            const isSelected = source === option.value
            return (
              <Pressable
                key={option.value}
                onPress={() => handleSourceChange(option.value)}
                style={[
                  styles.segmentButton,
                  isSelected && styles.segmentButtonActive,
                  isSelected && {
                    backgroundColor: theme === 'light' ? '#fff' : colors.primary,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  },
                ]}
              >
                <Text style={styles.segmentIcon}>{option.icon}</Text>
                <Text
                  style={[
                    styles.segmentText,
                    { color: isSelected ? colors.primary : colors.textSecondary },
                    isSelected && theme === 'dark' && { color: '#fff' },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* 로딩 상태 */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            통계를 불러오는 중...
          </Text>
        </View>
      )}

      {/* 데이터 없음 */}
      {!isLoading && !menuStatistics && !reviewStatistics && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            통계 데이터가 없습니다
          </Text>
          <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
            리뷰 요약이 완료되면 통계가 표시됩니다
          </Text>
        </View>
      )}

      {/* 통계 카드들 */}
      {!isLoading && (menuStatistics || reviewStatistics) && (
        <View style={styles.cardsContainer}>
          {/* 리뷰 감정 통계 */}
          {reviewStatistics && <ReviewStatisticsCard statistics={reviewStatistics} />}

          {/* 전체 요약 */}
          {menuStatistics && (
            <StatisticsSummaryCard
              totalReviews={menuStatistics.totalReviews}
              analyzedReviews={menuStatistics.analyzedReviews}
              menuCount={menuStatistics.menuStatistics.length}
            />
          )}

          {/* Top 긍정 메뉴 */}
          {menuStatistics && menuStatistics.topPositiveMenus.length > 0 && (
            <TopMenuList
              menus={menuStatistics.topPositiveMenus}
              type="positive"
              title="😊 추천 메뉴 (긍정률 높음)"
            />
          )}

          {/* Top 부정 메뉴 */}
          {menuStatistics && menuStatistics.topNegativeMenus.length > 0 && (
            <TopMenuList
              menus={menuStatistics.topNegativeMenus}
              type="negative"
              title="😞 주의할 메뉴 (부정률 높음)"
            />
          )}

          {/* 전체 메뉴 통계 */}
          {menuStatistics && menuStatistics.menuStatistics.length > 0 && (
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
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  sourceSelector: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  segmentControl: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  segmentButtonActive: {
    elevation: 2,
  },
  segmentIcon: {
    fontSize: 16,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 14,
  },
  cardsContainer: {
    gap: 20,
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
