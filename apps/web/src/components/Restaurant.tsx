import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Text } from 'react-native'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { apiService } from '@shared/services'
import type { RestaurantCategory, RestaurantData, ReviewCrawlStatus } from '@shared/services'
import { Alert } from '@shared/utils'
import { io, Socket } from 'socket.io-client'
import Header from './Header'
import Drawer from './Drawer'

interface RestaurantProps {
  onLogout: () => Promise<void>
}

const Restaurant: React.FC<RestaurantProps> = ({ onLogout }) => {
  const { theme } = useTheme()
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<RestaurantCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([])
  const [restaurantsLoading, setRestaurantsLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [reviewCrawlStatus, setReviewCrawlStatus] = useState<ReviewCrawlStatus>({
    status: 'idle',
    reviews: []
  })
  const socketRef = useRef<Socket | null>(null)
  const colors = THEME_COLORS[theme]

  // Socket.io 연결 설정
  useEffect(() => {
    const socket = io('http://localhost:4000', {
      transports: ['websocket', 'polling']
    })

    socket.on('connect', () => {
      console.log('[Socket.io] Connected:', socket.id)
    })

    socket.on('disconnect', () => {
      console.log('[Socket.io] Disconnected')
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [])

  // 카테고리 목록 가져오기
  const fetchCategories = async () => {
    setCategoriesLoading(true)
    try {
      const response = await apiService.getRestaurantCategories()
      if (response.result && response.data) {
        setCategories(response.data)
      }
    } catch (err) {
      console.error('카테고리 조회 실패:', err)
    } finally {
      setCategoriesLoading(false)
    }
  }

  // 레스토랑 목록 가져오기
  const fetchRestaurants = async () => {
    setRestaurantsLoading(true)
    try {
      const response = await apiService.getRestaurants(20, 0)
      if (response.result && response.data) {
        setRestaurants(response.data.restaurants)
        setTotal(response.data.total)
      }
    } catch (err) {
      console.error('레스토랑 목록 조회 실패:', err)
    } finally {
      setRestaurantsLoading(false)
    }
  }

  // 컴포넌트 마운트 시 카테고리 및 레스토랑 목록 가져오기
  useEffect(() => {
    fetchCategories()
    fetchRestaurants()
  }, [])

  const handleCrawl = async () => {
    if (!url.trim()) {
      Alert.error('오류', 'URL을 입력해주세요')
      return
    }

    setLoading(true)
    // 리뷰 크롤링 시작 상태로 설정
    setReviewCrawlStatus({
      status: 'active',
      progress: { current: 0, total: 0, percentage: 0 },
      reviews: []
    })

    try {
      const response = await apiService.crawlRestaurant({
        url: url.trim(),
        crawlMenus: true,
        crawlReviews: true, // 리뷰 크롤링 활성화
      })

      if (response.result && response.data) {
        Alert.success('성공', '크롤링이 완료되었습니다 (메뉴 + 리뷰)')
        setUrl('')

        // 크롤링 완료 후 카테고리 및 레스토랑 목록 새로고침
        fetchCategories()
        fetchRestaurants()

        // 리뷰 Job ID가 있으면 Socket 룸에 조인
        if (response.data.reviewJobId && socketRef.current) {
          const jobId = response.data.reviewJobId
          console.log('[리뷰 크롤링] Job ID:', jobId)

          // Job 룸에 조인
          socketRef.current.emit('subscribe:job', jobId)

          // 리뷰 크롤링 시작 이벤트
          socketRef.current.on('review:started', (data: any) => {
            console.log('[리뷰 크롤링] 시작:', data)
            setReviewCrawlStatus({
              status: 'active',
              jobId: data.jobId,
              progress: { current: 0, total: 0, percentage: 0 },
              reviews: []
            })
          })

          // 리뷰 크롤링 진행 상황
          socketRef.current.on('review:progress', (data: any) => {
            console.log('[리뷰 크롤링] 진행:', data)
            setReviewCrawlStatus(prev => ({
              ...prev,
              status: 'active',
              progress: {
                current: data.current,
                total: data.total,
                percentage: data.percentage
              }
            }))
          })

          // 리뷰 아이템 수신 (실시간)
          socketRef.current.on('review:item', (data: any) => {
            console.log('[리뷰 크롤링] 아이템:', data.review)
            setReviewCrawlStatus(prev => ({
              ...prev,
              reviews: [...(prev.reviews || []), data.review]
            }))
          })

          // 리뷰 크롤링 완료
          socketRef.current.on('review:completed', (data: any) => {
            console.log('[리뷰 크롤링] 완료:', data)
            setReviewCrawlStatus(prev => ({
              ...prev,
              status: 'completed'
            }))
            // 이벤트 리스너 제거
            socketRef.current?.off('review:started')
            socketRef.current?.off('review:progress')
            socketRef.current?.off('review:item')
            socketRef.current?.off('review:completed')
            socketRef.current?.off('review:error')
            socketRef.current?.off('review:cancelled')
          })

          // 리뷰 크롤링 에러
          socketRef.current.on('review:error', (data: any) => {
            console.error('[리뷰 크롤링] 에러:', data)
            setReviewCrawlStatus({
              status: 'failed',
              error: data.error,
              reviews: []
            })
            // 이벤트 리스너 제거
            socketRef.current?.off('review:started')
            socketRef.current?.off('review:progress')
            socketRef.current?.off('review:item')
            socketRef.current?.off('review:completed')
            socketRef.current?.off('review:error')
            socketRef.current?.off('review:cancelled')
          })

          // 리뷰 크롤링 취소
          socketRef.current.on('review:cancelled', (data: any) => {
            console.log('[리뷰 크롤링] 취소:', data)
            setReviewCrawlStatus(prev => ({
              ...prev,
              status: 'cancelled'
            }))
            // 이벤트 리스너 제거
            socketRef.current?.off('review:started')
            socketRef.current?.off('review:progress')
            socketRef.current?.off('review:item')
            socketRef.current?.off('review:completed')
            socketRef.current?.off('review:error')
            socketRef.current?.off('review:cancelled')
          })
        }
      } else {
        throw new Error(response.message || '크롤링 실패')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '크롤링 중 오류가 발생했습니다'
      setReviewCrawlStatus({
        status: 'failed',
        error: errorMessage,
        reviews: []
      })
      Alert.error('크롤링 실패', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await onLogout()
    window.location.href = '/login'
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header onMenuPress={() => setDrawerVisible(true)} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="URL 또는 Place ID를 입력하세요"
            placeholderTextColor={colors.textSecondary}
            value={url}
            onChangeText={setUrl}
          />

          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: colors.border }]}
            onPress={handleCrawl}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <FontAwesomeIcon icon={faPlus} style={{ fontSize: 18, color: '#666' }} />
            )}
          </TouchableOpacity>
        </View>

        {/* 카테고리 영역 */}
        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>카테고리</Text>
            {categoriesLoading && <ActivityIndicator size="small" color={colors.text} />}
          </View>

          {categories.length > 0 ? (
            <View style={styles.categoriesGrid}>
              {categories.map((category) => (
                <View
                  key={category.category}
                  style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={[styles.categoryName, { color: colors.text }]}>{category.category}</Text>
                  <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>{category.count}개</Text>
                </View>
              ))}
            </View>
          ) : !categoriesLoading ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 카테고리가 없습니다</Text>
          ) : null}
        </View>

        {/* 리뷰 크롤링 진행 상황 */}
        {reviewCrawlStatus.status !== 'idle' && (
          <View style={styles.reviewSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>리뷰 크롤링</Text>
              {reviewCrawlStatus.status === 'active' && <ActivityIndicator size="small" color={colors.text} />}
            </View>

            {/* 진행 상황 */}
            {reviewCrawlStatus.progress && (
              <View style={[styles.progressContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.progressInfo}>
                  <Text style={[styles.progressText, { color: colors.text }]}>
                    {reviewCrawlStatus.progress.current} / {reviewCrawlStatus.progress.total}
                  </Text>
                  <Text style={[styles.progressPercentage, { color: colors.textSecondary }]}>
                    {reviewCrawlStatus.progress.percentage}%
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${reviewCrawlStatus.progress.percentage}%`, backgroundColor: colors.primary }
                    ]}
                  />
                </View>
              </View>
            )}

            {/* 상태 메시지 */}
            {reviewCrawlStatus.status === 'completed' && (
              <Text style={[styles.statusText, { color: '#28a745' }]}>✓ 크롤링 완료</Text>
            )}
            {reviewCrawlStatus.status === 'failed' && (
              <Text style={[styles.statusText, { color: '#dc3545' }]}>✗ {reviewCrawlStatus.error || '크롤링 실패'}</Text>
            )}
          </View>
        )}

        {/* 리뷰 데이터 임시 표시 */}
        {reviewCrawlStatus.reviews && reviewCrawlStatus.reviews.length > 0 && (
          <View style={styles.reviewsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>크롤링된 리뷰 ({reviewCrawlStatus.reviews.length})</Text>
            </View>

            <View style={styles.reviewsList}>
              {reviewCrawlStatus.reviews.map((review, index) => (
                <View
                  key={index}
                  style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.reviewHeader}>
                    <Text style={[styles.reviewUserName, { color: colors.text }]}>{review.userName || '익명'}</Text>
                    {review.visitInfo.visitDate && (
                      <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
                        {review.visitInfo.visitDate}
                      </Text>
                    )}
                  </View>

                  {/* 방문 키워드 */}
                  {review.visitKeywords.length > 0 && (
                    <View style={styles.keywordsContainer}>
                      {review.visitKeywords.map((keyword, idx) => (
                        <View key={idx} style={[styles.keyword, { backgroundColor: colors.border }]}>
                          <Text style={[styles.keywordText, { color: colors.text }]}>{keyword}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* 리뷰 텍스트 */}
                  {review.reviewText && (
                    <Text style={[styles.reviewText, { color: colors.text }]}>{review.reviewText}</Text>
                  )}

                  {/* 감정 키워드 */}
                  {review.emotionKeywords.length > 0 && (
                    <View style={styles.keywordsContainer}>
                      {review.emotionKeywords.map((keyword, idx) => (
                        <View key={idx} style={[styles.emotionKeyword, { backgroundColor: '#e3f2fd' }]}>
                          <Text style={[styles.keywordText, { color: '#1976d2' }]}>{keyword}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* 방문 정보 */}
                  <View style={styles.visitInfo}>
                    {review.visitInfo.visitCount && (
                      <Text style={[styles.visitInfoText, { color: colors.textSecondary }]}>
                        {review.visitInfo.visitCount}
                      </Text>
                    )}
                    {review.visitInfo.verificationMethod && (
                      <Text style={[styles.visitInfoText, { color: colors.textSecondary }]}>
                        • {review.visitInfo.verificationMethod}
                      </Text>
                    )}
                    {review.waitTime && (
                      <Text style={[styles.visitInfoText, { color: colors.textSecondary }]}>
                        • {review.waitTime}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 레스토랑 목록 */}
        <View style={styles.restaurantsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>레스토랑 목록 ({total})</Text>
            {restaurantsLoading && <ActivityIndicator size="small" color={colors.text} />}
          </View>

          {restaurants.length > 0 ? (
            <View style={styles.restaurantsList}>
              {restaurants.map((restaurant) => (
                <View
                  key={restaurant.id}
                  style={[styles.restaurantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={[styles.restaurantName, { color: colors.text }]}>{restaurant.name}</Text>
                  {restaurant.category && (
                    <Text style={[styles.restaurantCategory, { color: colors.textSecondary }]}>{restaurant.category}</Text>
                  )}
                  {restaurant.address && (
                    <Text style={[styles.restaurantAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                      {restaurant.address}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ) : !restaurantsLoading ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 레스토랑이 없습니다</Text>
          ) : null}
        </View>
      </ScrollView>

      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onLogout={handleLogout}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesSection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 13,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  restaurantsSection: {
    marginTop: 24,
  },
  restaurantsList: {
    gap: 8,
  },
  restaurantCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  restaurantCategory: {
    fontSize: 13,
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 13,
  },
  // 리뷰 크롤링 진행 상황 스타일
  reviewSection: {
    marginTop: 24,
  },
  progressContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 15,
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 14,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  // 리뷰 데이터 표시 스타일
  reviewsSection: {
    marginTop: 24,
  },
  reviewsList: {
    gap: 12,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewUserName: {
    fontSize: 15,
    fontWeight: '600',
  },
  reviewDate: {
    fontSize: 13,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  keyword: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  emotionKeyword: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  keywordText: {
    fontSize: 12,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  visitInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  visitInfoText: {
    fontSize: 12,
  },
})

export default Restaurant
