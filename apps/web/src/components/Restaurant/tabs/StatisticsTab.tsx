import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, Pressable } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { useRestaurantStatistics } from '@shared/hooks'
import { apiService } from '@shared/services'
import type { MenuGroupingResponse, CategoryTreeNode } from '@shared/services'
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

// 카테고리 트리 뷰 컴포넌트 (컴팩트 카드 스타일)
interface CategoryTreeViewProps {
  node: CategoryTreeNode
  theme: 'light' | 'dark'
  colors: typeof THEME_COLORS.light
  level?: number
}

const CategoryTreeView: React.FC<CategoryTreeViewProps> = ({ node, theme, colors, level = 0 }) => {
  const hasChildren = Object.keys(node.children).length > 0
  const hasItems = node.items.length > 0

  // 루트 노드는 children만 렌더링
  if (level === 0) {
    return (
      <View style={treeStyles.container}>
        {Object.entries(node.children).map(([key, childNode]) => (
          <CategoryTreeView key={key} node={childNode} theme={theme} colors={colors} level={1} />
        ))}
      </View>
    )
  }

  const positiveRate = node.totalCount > 0 ? Math.round((node.totalPositive / node.totalCount) * 100) : 0
  const negativeRate = node.totalCount > 0 ? Math.round((node.totalNegative / node.totalCount) * 100) : 0

  // 1단계: 대분류 카드
  if (level === 1) {
    return (
      <View style={[treeStyles.categoryCard, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}>
        <View style={treeStyles.categoryHeader}>
          <Text style={[treeStyles.categoryName, { color: colors.text }]}>{node.name}</Text>
          <View style={treeStyles.badgeRow}>
            <View style={[treeStyles.badge, { backgroundColor: '#e0e7ff' }]}>
              <Text style={treeStyles.badgeText}>{node.totalCount}</Text>
            </View>
            {node.totalCount > 0 && (
              <>
                <Text style={treeStyles.ratePositive}>+{node.totalPositive}({positiveRate}%)</Text>
                <Text style={treeStyles.rateNegative}>-{node.totalNegative}({negativeRate}%)</Text>
              </>
            )}
          </View>
        </View>
        {/* 하위 카테고리 */}
        {hasChildren && (
          <View style={treeStyles.subCategories}>
            {Object.entries(node.children).map(([key, childNode]) => (
              <CategoryTreeView key={key} node={childNode} theme={theme} colors={colors} level={2} />
            ))}
          </View>
        )}
        {/* 개별 아이템 (1단계에 직접 있는 경우) */}
        {hasItems && (
          <View style={treeStyles.itemChips}>
            {node.items.map((item, index) => (
              <View key={`${item.item}-${index}`} style={[treeStyles.chip, { backgroundColor: theme === 'light' ? '#fff' : colors.background, borderColor: colors.border }]}>
                <Text style={[treeStyles.chipName, { color: colors.text }]}>{item.item}</Text>
                <Text style={[treeStyles.chipCount, { color: colors.textSecondary }]}>{item.count}</Text>
                {(item.positive > 0 || item.negative > 0) && (
                  <>
                    <Text style={treeStyles.chipPositive}>+{item.positive}</Text>
                    <Text style={treeStyles.chipNegative}>-{item.negative}</Text>
                  </>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    )
  }

  // 2단계 이상: 서브카테고리
  return (
    <View style={treeStyles.subCategory}>
      <View style={treeStyles.subCategoryHeader}>
        <Text style={[treeStyles.subCategoryName, { color: colors.textSecondary }]}>{node.name}</Text>
        <View style={treeStyles.subCategoryStats}>
          <Text style={[treeStyles.subCategoryCount, { color: colors.textSecondary }]}>{node.totalCount}회</Text>
          {node.totalCount > 0 && (
            <>
              <Text style={treeStyles.subCategoryPositive}>+{node.totalPositive}</Text>
              <Text style={treeStyles.subCategoryNegative}>-{node.totalNegative}</Text>
            </>
          )}
        </View>
      </View>
      {/* 하위 카테고리 */}
      {hasChildren && (
        <View style={treeStyles.nestedCategories}>
          {Object.entries(node.children).map(([key, childNode]) => (
            <CategoryTreeView key={key} node={childNode} theme={theme} colors={colors} level={level + 1} />
          ))}
        </View>
      )}
      {/* 개별 아이템 */}
      {hasItems && (
        <View style={treeStyles.itemChips}>
          {node.items.map((item, index) => {
            const itemPositiveRate = item.count > 0 ? Math.round((item.positive / item.count) * 100) : 0
            return (
              <View key={`${item.item}-${index}`} style={[treeStyles.chip, { backgroundColor: theme === 'light' ? '#fff' : colors.background, borderColor: itemPositiveRate >= 70 ? '#4CAF50' : itemPositiveRate <= 30 ? '#F44336' : colors.border }]}>
                <Text style={[treeStyles.chipName, { color: colors.text }]}>{item.item}</Text>
                <Text style={[treeStyles.chipCount, { color: colors.textSecondary }]}>{item.count}</Text>
                {(item.positive > 0 || item.negative > 0) && (
                  <>
                    <Text style={treeStyles.chipPositive}>+{item.positive}</Text>
                    <Text style={treeStyles.chipNegative}>-{item.negative}</Text>
                  </>
                )}
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

const treeStyles = StyleSheet.create({
  container: {
    gap: 10,
  },
  // 대분류 카드
  categoryCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338ca',
  },
  ratePositive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  rateNegative: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F44336',
  },
  // 서브카테고리
  subCategories: {
    gap: 8,
  },
  subCategory: {
    marginLeft: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#e2e8f0',
  },
  subCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subCategoryName: {
    fontSize: 13,
    fontWeight: '500',
  },
  subCategoryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subCategoryCount: {
    fontSize: 12,
  },
  subCategoryPositive: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
  },
  subCategoryNegative: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F44336',
  },
  nestedCategories: {
    gap: 6,
  },
  // 아이템 칩
  itemChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
  },
  chipName: {
    fontSize: 13,
  },
  chipCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  chipPositive: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
  },
  chipNegative: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F44336',
  },
})

const StatisticsTab: React.FC<StatisticsTabProps> = ({ restaurantId }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const [source, setSource] = useState<StatisticsSource>('all')
  const [menuGroupingData, setMenuGroupingData] = useState<MenuGroupingResponse | null>(null)
  const [menuGroupingLoading, setMenuGroupingLoading] = useState(false)

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

  // 메뉴 그룹핑 데이터 로드
  useEffect(() => {
    const fetchMenuGrouping = async () => {
      if (!restaurantId) return
      setMenuGroupingLoading(true)
      try {
        const response = await apiService.getRestaurantMenuGrouping(restaurantId, 'all')
        if (response.result && response.data) {
          setMenuGroupingData(response.data)
        }
      } catch (err) {
        console.error('메뉴 그룹핑 데이터 로드 실패:', err)
      } finally {
        setMenuGroupingLoading(false)
      }
    }
    fetchMenuGrouping()
  }, [restaurantId])

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

          {/* 카테고리별 그룹 통계 */}
          {menuGroupingLoading ? (
            <View style={[styles.card, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}>
              <View style={styles.groupLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.groupLoadingText, { color: colors.textSecondary }]}>
                  그룹 통계를 불러오는 중...
                </Text>
              </View>
            </View>
          ) : menuGroupingData && menuGroupingData.categoryTree.totalCount > 0 ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme === 'light' ? '#fff' : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.title, { color: colors.text }]}>🗂️ 카테고리별 그룹 통계</Text>
              <CategoryTreeView node={menuGroupingData.categoryTree} theme={theme} colors={colors} />
            </View>
          ) : null}

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
  groupLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  groupLoadingText: {
    fontSize: 13,
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
