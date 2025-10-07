import React, { useEffect, useRef, useCallback } from 'react'
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { useTheme, useSocket } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import type { ReviewData } from '@shared/services'
import { useRestaurantDetail } from '../../hooks/useRestaurantDetail'

interface RestaurantDetailProps {
  isMobile?: boolean
}

const RestaurantDetail: React.FC<RestaurantDetailProps> = ({ isMobile = false }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const { joinRestaurantRoom, leaveRestaurantRoom, reviewCrawlStatus, crawlProgress, dbProgress } = useSocket()
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  // 독립적으로 데이터 로드
  const {
    id,
    restaurant,
    restaurantLoading,
    reviews,
    reviewsLoading,
    reviewsTotal,
    hasMore,
    loadMoreReviews,
    handleBackToList,
  } = useRestaurantDetail()

  // restaurant id로 room 입장, 컴포넌트 언마운트 시 퇴장
  useEffect(() => {
    if (id) {
      joinRestaurantRoom(id)

      return () => {
        leaveRestaurantRoom(id)
      }
    }
  }, [id])

  // 무한 스크롤 콜백
  const handleLoadMore = useCallback(() => {
    if (id && hasMore && !reviewsLoading) {
      const restaurantId = parseInt(id, 10)
      if (!isNaN(restaurantId)) {
        loadMoreReviews(restaurantId)
      }
    }
  }, [id, hasMore, reviewsLoading, loadMoreReviews])

  // 데스크톱 스크롤 이벤트 (스크롤 영역 감지)
  useEffect(() => {
    if (isMobile || !scrollContainerRef.current) return

    const handleScroll = () => {
      const container = scrollContainerRef.current
      if (!container) return

      const scrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight
      const clientHeight = container.clientHeight

      // 스크롤이 하단 200px 근처에 도달하면 로드
      if (scrollHeight - scrollTop - clientHeight < 200) {
        handleLoadMore()
      }
    }

    const container = scrollContainerRef.current
    container.addEventListener('scroll', handleScroll)

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [isMobile, handleLoadMore])

  // Intersection Observer 설정 (모바일 무한 스크롤)
  useEffect(() => {
    if (!isMobile || !loadMoreTriggerRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting) {
          handleLoadMore()
        }
      },
      {
        root: null,
        rootMargin: '100px', // 100px 전에 미리 로드
        threshold: 0.1,
      }
    )

    observerRef.current.observe(loadMoreTriggerRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [isMobile, handleLoadMore])

  // 크롤링 중인지 체크
  const isCrawling = reviewCrawlStatus.status === 'active'

  // 레스토랑 정보 로딩 중
  if (restaurantLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    )
  }

  return (
    <div 
      ref={scrollContainerRef}
      className={isMobile ? '' : 'restaurant-scroll-area'}
      style={{ backgroundColor: colors.background }}
    >
      <View style={[styles.reviewHeader, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
          <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: isMobile ? 22 : 20, color: colors.text }} />
        </TouchableOpacity>
        <View style={styles.reviewHeaderInfo}>
          <Text style={[styles.reviewTitle, { color: colors.text }]}>{restaurant?.name || '레스토랑'}</Text>
          <Text style={[styles.reviewSubtitle, { color: colors.textSecondary }]}>리뷰 {reviewsTotal}개</Text>
        </View>
      </View>

      <div style={{ padding: 20 }}>
        {/* 크롤링 진행 상태 표시 */}
        {isCrawling && (
          <View style={[styles.crawlProgressContainer, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.crawlProgressTitle, { color: colors.text }]}>
              🔄 리뷰 크롤링 중...
            </Text>
            
            {crawlProgress && (
              <View style={styles.progressSection}>
                <View style={styles.progressInfo}>
                  <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>크롤링 진행</Text>
                  <Text style={[styles.progressText, { color: colors.text }]}>
                    {crawlProgress.current} / {crawlProgress.total} ({crawlProgress.percentage}%)
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        backgroundColor: colors.primary,
                        width: `${crawlProgress.percentage}%` 
                      }
                    ]} 
                  />
                </View>
              </View>
            )}

            {dbProgress && (
              <View style={styles.progressSection}>
                <View style={styles.progressInfo}>
                  <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>DB 저장</Text>
                  <Text style={[styles.progressText, { color: colors.text }]}>
                    {dbProgress.current} / {dbProgress.total} ({dbProgress.percentage}%)
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        backgroundColor: '#4caf50',
                        width: `${dbProgress.percentage}%` 
                      }
                    ]} 
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {reviewsLoading && reviews.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : reviews.length > 0 ? (
          <>
            <View style={styles.reviewsList}>
              {reviews.map((review: ReviewData) => (
                <View
                  key={review.id}
                  style={[styles.reviewCard, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.reviewCardHeader}>
                    <Text style={[styles.reviewUserName, { color: colors.text }]}>{review.userName || '익명'}</Text>
                    {review.visitInfo.visitDate && (
                      <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
                        {review.visitInfo.visitDate}
                      </Text>
                    )}
                  </View>

                  {review.visitKeywords.length > 0 && (
                    <View style={styles.keywordsContainer}>
                      {review.visitKeywords.map((keyword: string, idx: number) => (
                        <View key={idx} style={[styles.keyword, { backgroundColor: theme === 'light' ? '#f0f0f0' : colors.border }]}>
                          <Text style={[styles.keywordText, { color: colors.text }]}>{keyword}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {review.reviewText && (
                    <Text style={[styles.reviewText, { color: colors.text }]}>{review.reviewText}</Text>
                  )}

                  {review.emotionKeywords.length > 0 && (
                    <View style={styles.keywordsContainer}>
                      {review.emotionKeywords.map((keyword: string, idx: number) => (
                        <View key={idx} style={[styles.emotionKeyword, { backgroundColor: '#e3f2fd' }]}>
                          <Text style={[styles.keywordText, { color: '#1976d2' }]}>{keyword}</Text>
                        </View>
                      ))}
                    </View>
                  )}

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

            {/* 무한 스크롤 트리거 (모바일) */}
            {isMobile && hasMore && (
              <div ref={loadMoreTriggerRef} style={{ padding: '20px', textAlign: 'center' }}>
                {reviewsLoading && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </div>
            )}

            {/* 로딩 인디케이터 (데스크톱) */}
            {!isMobile && reviewsLoading && hasMore && (
              <View style={styles.loadMoreButtonContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}

            {/* 모든 리뷰 로드 완료 표시 */}
            {!hasMore && (
              <View style={styles.endMessageContainer}>
                <Text style={[styles.endMessageText, { color: colors.textSecondary }]}>
                  모든 리뷰를 불러왔습니다 ({reviewsTotal}개)
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 리뷰가 없습니다</Text>
          </View>
        )}
      </div>
    </div>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewHeaderInfo: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  reviewSubtitle: {
    fontSize: 15,
  },
  reviewScrollView: {
    flex: 1,
  },
  reviewScrollContent: {
    padding: 20,
  },
  reviewsList: {
    gap: 16,
  },
  reviewCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewUserName: {
    fontSize: 16,
    fontWeight: '700',
  },
  reviewDate: {
    fontSize: 13,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  keyword: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  emotionKeyword: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  keywordText: {
    fontSize: 13,
    fontWeight: '500',
  },
  reviewText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  visitInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  visitInfoText: {
    fontSize: 13,
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
  crawlProgressContainer: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  crawlProgressTitle: {
    fontSize: 16,
    fontWeight: '700' as '700',
    marginBottom: 16,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: 'row' as 'row',
    justifyContent: 'space-between' as 'space-between',
    alignItems: 'center' as 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600' as '600',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500' as '500',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden' as 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  loadMoreButtonContainer: {
    padding: 20,
    alignItems: 'center',
  },
  endMessageContainer: {
    padding: 20,
    alignItems: 'center',
  },
  endMessageText: {
    fontSize: 14,
  },
})

export default RestaurantDetail

