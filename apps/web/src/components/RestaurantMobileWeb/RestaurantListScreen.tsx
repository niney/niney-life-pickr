import React, { useRef, useEffect } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView
} from 'react-native'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import type { RestaurantCategory, RestaurantData, ReviewCrawlStatus } from '@shared/services'

interface RestaurantListScreenProps {
  url: string
  setUrl: (url: string) => void
  loading: boolean
  categories: RestaurantCategory[]
  categoriesLoading: boolean
  restaurants: RestaurantData[]
  restaurantsLoading: boolean
  total: number
  reviewCrawlStatus: ReviewCrawlStatus
  crawlProgress: { current: number; total: number; percentage: number } | null
  dbProgress: { current: number; total: number; percentage: number } | null
  selectedPlaceId: string | null
  handleCrawl: () => Promise<void>
  handleRestaurantClick: (restaurant: RestaurantData) => void
}

const RestaurantListScreen: React.FC<RestaurantListScreenProps> = ({
  url,
  setUrl,
  loading,
  categories,
  categoriesLoading,
  restaurants,
  restaurantsLoading,
  total,
  reviewCrawlStatus,
  crawlProgress,
  dbProgress,
  handleCrawl,
  handleRestaurantClick,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 컴포넌트 마운트 시 스크롤을 맨 위로 이동
  useEffect(() => {
    window.scrollTo(0, 0)
    document.body.scrollTop = 0
    document.documentElement.scrollTop = 0

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [])

  return (
    <div ref={scrollContainerRef} style={{ padding: 16 }}>
      {/* 검색 영역 */}
      <View style={styles.searchSection}>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: theme === 'light' ? '#fff' : colors.surface }]}
          placeholder="네이버 플레이스 URL"
          placeholderTextColor={colors.textSecondary}
          value={url}
          onChangeText={setUrl}
        />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleCrawl}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: 18, color: '#fff' }} />
          )}
        </TouchableOpacity>
      </View>

      {/* 카테고리 섹션 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>카테고리</Text>
          {categoriesLoading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        {categories.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
            {categories.map((category: RestaurantCategory) => (
              <View
                key={category.category}
                style={[styles.categoryCard, { backgroundColor: theme === 'light' ? '#f8f9fa' : colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.categoryName, { color: colors.text }]}>{category.category}</Text>
                <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>{category.count}개</Text>
              </View>
            ))}
          </ScrollView>
        ) : !categoriesLoading ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 카테고리가 없습니다</Text>
        ) : null}
      </View>

      {/* 크롤링 진행 상황 */}
      {reviewCrawlStatus.status !== 'idle' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>크롤링 진행</Text>
            {reviewCrawlStatus.status === 'active' && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {crawlProgress && crawlProgress.total > 0 && (
            <View style={[styles.progressCard, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>리뷰 수집</Text>
                <Text style={[styles.progressValue, { color: colors.text }]}>
                  {crawlProgress.current} / {crawlProgress.total}
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[styles.progressBarFill, { width: `${crawlProgress.percentage}%`, backgroundColor: '#2196f3' }]}
                />
              </View>
              <Text style={[styles.progressPercentage, { color: colors.textSecondary }]}>
                {crawlProgress.percentage}%
              </Text>
            </View>
          )}

          {dbProgress && dbProgress.total > 0 && (
            <View style={[styles.progressCard, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>DB 저장</Text>
                <Text style={[styles.progressValue, { color: colors.text }]}>
                  {dbProgress.current} / {dbProgress.total}
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[styles.progressBarFill, { width: `${dbProgress.percentage}%`, backgroundColor: colors.primary }]}
                />
              </View>
              <Text style={[styles.progressPercentage, { color: colors.textSecondary }]}>
                {dbProgress.percentage}%
              </Text>
            </View>
          )}

          {reviewCrawlStatus.status === 'completed' && (
            <View style={[styles.statusCard, { backgroundColor: '#d4edda', borderColor: '#c3e6cb' }]}>
              <Text style={[styles.statusText, { color: '#155724' }]}>✓ 완료</Text>
            </View>
          )}
          {reviewCrawlStatus.status === 'failed' && (
            <View style={[styles.statusCard, { backgroundColor: '#f8d7da', borderColor: '#f5c6cb' }]}>
              <Text style={[styles.statusText, { color: '#721c24' }]}>✗ {reviewCrawlStatus.error || '실패'}</Text>
            </View>
          )}
        </View>
      )}

      {/* 레스토랑 목록 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>레스토랑 ({total})</Text>
          {restaurantsLoading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        {restaurants.length > 0 ? (
          <View style={styles.restaurantsList}>
            {restaurants.map((restaurant: RestaurantData) => (
              <TouchableOpacity
                key={restaurant.id}
                style={[
                  styles.restaurantCard,
                  {
                    backgroundColor: theme === 'light' ? '#fff' : colors.surface,
                    borderColor: colors.border,
                  }
                ]}
                onPress={() => handleRestaurantClick(restaurant)}
              >
                <Text style={[styles.restaurantName, { color: colors.text }]}>{restaurant.name}</Text>
                {restaurant.category && (
                  <Text style={[styles.restaurantCategory, { color: colors.textSecondary }]}>{restaurant.category}</Text>
                )}
                {restaurant.address && (
                  <Text style={[styles.restaurantAddress, { color: colors.textSecondary }]} numberOfLines={2}>
                    {restaurant.address}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : !restaurantsLoading ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 레스토랑이 없습니다</Text>
        ) : null}
      </View>
    </div>
  )
}

const styles = StyleSheet.create({
  // 검색 영역
  searchSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 섹션
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  // 카테고리
  categoriesScroll: {
    gap: 10,
    paddingRight: 16,
  },
  categoryCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 85,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  categoryCount: {
    fontSize: 12,
  },
  // 진행 상황
  progressCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentage: {
    fontSize: 12,
    textAlign: 'right',
  },
  statusCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  // 레스토랑 목록
  restaurantsList: {
    gap: 12,
  },
  restaurantCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  restaurantCategory: {
    fontSize: 13,
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 13,
    lineHeight: 18,
  },
  // 공통
  emptyText: {
    fontSize: 14,
  },
})

export default RestaurantListScreen
