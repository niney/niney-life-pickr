import React from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import type { RestaurantCategory, RestaurantData, ReviewCrawlStatus } from '@shared/services'
import { useLocation } from 'react-router-dom'

interface RestaurantListProps {
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
  handleCrawl: () => Promise<void>
  handleRestaurantClick: (restaurant: RestaurantData) => void
  isMobile?: boolean
}

const RestaurantList: React.FC<RestaurantListProps> = ({
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
  isMobile = false,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const location = useLocation()
  
  // URL에서 placeId 추출 (/restaurant/:placeId)
  const placeId = location.pathname.split('/restaurant/')[1]?.split('/')[0]

  return (
    <div 
      className={isMobile ? '' : 'restaurant-scroll-area'}
      style={{
        backgroundColor: colors.background,
        borderRight: isMobile ? 'none' : `1px solid ${colors.border}`,
        padding: 20,
      }}
    >
        {/* 검색 영역 */}
        <View style={styles.searchSection}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: theme === 'light' ? '#fff' : colors.surface }]}
            placeholder="네이버 플레이스 URL을 입력하세요"
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
              <FontAwesomeIcon icon={faPlus} style={{ fontSize: 20, color: '#fff' }} />
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
            <div style={{ 
              display: 'flex', 
              overflowX: isMobile ? 'auto' : 'visible',
              gap: '10px',
              flexWrap: isMobile ? 'nowrap' : 'wrap',
              paddingBottom: isMobile ? '8px' : '0',
              WebkitOverflowScrolling: 'touch',
            }}>
              {categories.map((category: RestaurantCategory) => (
                <View
                  key={category.category}
                  style={[
                    styles.categoryCard, 
                    { 
                      backgroundColor: theme === 'light' ? '#f8f9fa' : colors.surface, 
                      borderColor: colors.border,
                      flexShrink: isMobile ? 0 : 1,
                    }
                  ]}
                >
                  <Text style={[styles.categoryName, { color: colors.text }]}>{category.category}</Text>
                  <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>{category.count}개</Text>
                </View>
              ))}
            </div>
          ) : !categoriesLoading ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 카테고리가 없습니다</Text>
          ) : null}
        </View>

        {/* 크롤링 진행 상황 */}
        {reviewCrawlStatus.status !== 'idle' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>크롤링 진행 상황</Text>
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
                <Text style={[styles.statusText, { color: '#155724' }]}>✓ 크롤링 완료</Text>
              </View>
            )}
            {reviewCrawlStatus.status === 'failed' && (
              <View style={[styles.statusCard, { backgroundColor: '#f8d7da', borderColor: '#f5c6cb' }]}>
                <Text style={[styles.statusText, { color: '#721c24' }]}>✗ {reviewCrawlStatus.error || '크롤링 실패'}</Text>
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
              {restaurants.map((restaurant: RestaurantData) => {
                const isSelected = placeId === restaurant.place_id
                return (
                  <TouchableOpacity
                    key={restaurant.id}
                    style={[
                      styles.restaurantCard,
                      {
                        backgroundColor: isSelected 
                          ? (theme === 'light' ? '#f0f7ff' : 'rgba(33, 150, 243, 0.15)')
                          : (theme === 'light' ? '#fff' : colors.surface),
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      }
                    ]}
                    onPress={() => handleRestaurantClick(restaurant)}
                  >
                    <Text style={[
                      styles.restaurantName, 
                      { color: isSelected ? colors.primary : colors.text }
                    ]}>
                      {restaurant.name}
                    </Text>
                    {restaurant.category && (
                      <Text style={[styles.restaurantCategory, { color: colors.textSecondary }]}>{restaurant.category}</Text>
                    )}
                    {restaurant.address && (
                      <Text style={[styles.restaurantAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                        {restaurant.address}
                      </Text>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          ) : !restaurantsLoading ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 레스토랑이 없습니다</Text>
          ) : null}
        </View>
    </div>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  desktopContainer: {
    width: 420,
    minWidth: 420,
    maxWidth: 420,
    borderRightWidth: 1,
  },
  mobileContainer: {
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  searchSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 90,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 13,
  },
  progressCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 13,
    textAlign: 'right',
  },
  statusCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  restaurantsList: {
    gap: 10,
  },
  restaurantCard: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  restaurantName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  restaurantCategory: {
    fontSize: 14,
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
  },
  emptyText: {
    fontSize: 15,
  },
})

export default RestaurantList

