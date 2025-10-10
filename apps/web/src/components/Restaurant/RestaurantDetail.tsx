import React, { useEffect, useRef, useCallback, useState } from 'react'
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

type TabType = 'menu' | 'review'

const RestaurantDetail: React.FC<RestaurantDetailProps> = ({ isMobile = false }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const { 
    joinRestaurantRoom, 
    leaveRestaurantRoom, 
    reviewCrawlStatus, 
    crawlProgress, 
    dbProgress,
    reviewSummaryStatus,
    summaryProgress
  } = useSocket()
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  
  // 탭 상태 관리
  const [activeTab, setActiveTab] = useState<TabType>('menu')

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
    menus,
    menusLoading,
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
  const isSummarizing = reviewSummaryStatus.status === 'active'

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
          <Text style={[styles.reviewSubtitle, { color: colors.textSecondary }]}>
            메뉴 {menus.length}개 · 리뷰 {reviewsTotal}개
          </Text>
        </View>
      </View>

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

      {/* 리뷰 요약 진행 상태 표시 */}
      {isSummarizing && (
        <View style={[styles.crawlProgressContainer, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.crawlProgressTitle, { color: colors.text }]}>
            🤖 AI 리뷰 요약 중...
          </Text>
          
          {summaryProgress && (
            <View style={styles.progressSection}>
              <View style={styles.progressInfo}>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>요약 진행</Text>
                <Text style={[styles.progressText, { color: colors.text }]}>
                  {summaryProgress.current} / {summaryProgress.total} ({summaryProgress.percentage}%)
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      backgroundColor: '#9c27b0',
                      width: `${summaryProgress.percentage}%` 
                    }
                  ]} 
                />
              </View>
              <View style={styles.progressStats}>
                <Text style={[styles.progressStat, { color: '#4caf50' }]}>
                  ✓ 완료: {summaryProgress.completed}
                </Text>
                {summaryProgress.failed > 0 && (
                  <Text style={[styles.progressStat, { color: '#f44336' }]}>
                    ✗ 실패: {summaryProgress.failed}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* 탭 메뉴 */}
      <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'menu' && styles.tabButtonActive
          ]}
          onPress={() => setActiveTab('menu')}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'menu' ? colors.primary : colors.textSecondary }
            ]}
          >
            메뉴 {menus.length > 0 && `(${menus.length})`}
          </Text>
          {activeTab === 'menu' && (
            <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'review' && styles.tabButtonActive
          ]}
          onPress={() => setActiveTab('review')}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'review' ? colors.primary : colors.textSecondary }
            ]}
          >
            리뷰 ({reviewsTotal})
          </Text>
          {activeTab === 'review' && (
            <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>
      </View>

      <div style={{ padding: 20 }}>
        {/* 메뉴 탭 */}
        {activeTab === 'menu' && (
          <>
            {menusLoading && menus.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : menus.length > 0 ? (
              <View style={styles.menuSection}>
                <View style={styles.menusList}>
                  {menus.map((menu, index) => (
                    <View
                      key={index}
                      style={[styles.menuCard, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}
                    >
                      <View style={styles.menuCardContent}>
                        <View style={styles.menuInfo}>
                          <Text style={[styles.menuName, { color: colors.text }]}>{menu.name}</Text>
                          {menu.description && (
                            <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>{menu.description}</Text>
                          )}
                        </View>
                        <Text style={[styles.menuPrice, { color: colors.primary }]}>{menu.price}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 메뉴가 없습니다</Text>
              </View>
            )}
          </>
        )}

        {/* 리뷰 탭 */}
        {activeTab === 'review' && (
          <>
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

                  {/* AI 요약 데이터 표시 */}
                  {review.summary && (
                    <View style={[styles.summaryContainer, { backgroundColor: theme === 'light' ? '#f5f5ff' : '#1a1a2e', borderColor: theme === 'light' ? '#e0e0ff' : '#2d2d44' }]}>
                      <View style={styles.summaryHeader}>
                        <Text style={[styles.summaryTitle, { color: '#9c27b0' }]}>🤖 AI 요약</Text>
                        <View style={styles.sentimentBadge}>
                          <Text style={[styles.sentimentText, { 
                            color: review.summary.sentiment === 'positive' ? '#4caf50' : 
                                   review.summary.sentiment === 'negative' ? '#f44336' : '#ff9800' 
                          }]}>
                            {review.summary.sentiment === 'positive' ? '😊 긍정' : 
                             review.summary.sentiment === 'negative' ? '😞 부정' : '😐 중립'}
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={[styles.summaryText, { color: colors.text }]}>
                        {review.summary.summary}
                      </Text>

                      {review.summary.keyKeywords.length > 0 && (
                        <View style={styles.summaryKeywords}>
                          <Text style={[styles.summaryKeywordsTitle, { color: colors.textSecondary }]}>핵심 키워드:</Text>
                          <View style={styles.keywordsContainer}>
                            {review.summary.keyKeywords.map((keyword: string, idx: number) => (
                              <View key={idx} style={[styles.summaryKeyword, { backgroundColor: '#e1bee7' }]}>
                                <Text style={[styles.keywordText, { color: '#6a1b9a' }]}>{keyword}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {review.summary.satisfactionScore !== null && (
                        <View style={styles.satisfactionScore}>
                          <Text style={[styles.satisfactionLabel, { color: colors.textSecondary }]}>만족도:</Text>
                          <View style={styles.scoreStars}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Text key={star} style={styles.star}>
                                {star <= (review.summary?.satisfactionScore || 0) ? '⭐' : '☆'}
                              </Text>
                            ))}
                            <Text style={[styles.scoreNumber, { color: colors.text }]}>
                              {review.summary.satisfactionScore.toFixed(1)}
                            </Text>
                          </View>
                        </View>
                      )}

                      {review.summary.tips.length > 0 && (
                        <View style={styles.tipsSection}>
                          <Text style={[styles.tipsTitle, { color: colors.textSecondary }]}>💡 팁:</Text>
                          {review.summary.tips.map((tip: string, idx: number) => (
                            <Text key={idx} style={[styles.tipText, { color: colors.text }]}>
                              • {tip}
                            </Text>
                          ))}
                        </View>
                      )}

                      {review.summary.sentimentReason && (
                        <View style={styles.sentimentReason}>
                          <Text style={[styles.sentimentReasonLabel, { color: colors.textSecondary }]}>감정 분석:</Text>
                          <Text style={[styles.sentimentReasonText, { color: colors.text }]}>
                            {review.summary.sentimentReason}
                          </Text>
                        </View>
                      )}
                    </View>
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
          </>
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabButtonActive: {
    // активная вкладка
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  menuSection: {
    marginBottom: 32,
  },
  menusList: {
    gap: 12,
  },
  menuCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  menuCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  menuInfo: {
    flex: 1,
    marginRight: 12,
  },
  menuName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  menuPrice: {
    fontSize: 16,
    fontWeight: '700',
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
    marginTop: 16,
    marginHorizontal: 20,
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
  progressStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  progressStat: {
    fontSize: 13,
    fontWeight: '500' as '500',
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
  // AI 요약 관련 스타일
  summaryContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sentimentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sentimentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  summaryKeywords: {
    marginBottom: 12,
  },
  summaryKeywordsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryKeyword: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  satisfactionScore: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  satisfactionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  star: {
    fontSize: 16,
  },
  scoreNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  tipsSection: {
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  sentimentReason: {
    marginTop: 4,
  },
  sentimentReasonLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  sentimentReasonText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
})

export default RestaurantDetail

