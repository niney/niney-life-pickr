import React, { useEffect, useRef, useCallback, useState, useEffectEvent } from 'react'
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text, Modal } from 'react-native'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faStar, faStarHalfStroke, faRedo, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons'
import { useTheme, useSocket } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { getDefaultApiUrl, type ReviewData } from '@shared/services'
import { useRestaurantDetail } from '../../hooks/useRestaurantDetail'

interface RestaurantDetailProps {
  isMobile?: boolean
}

type TabType = 'menu' | 'review' | 'statistics' | 'map'

const RestaurantDetail: React.FC<RestaurantDetailProps> = ({ isMobile = false }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const {
    joinRestaurantRoom,
    leaveRestaurantRoom,
    setRestaurantCallbacks,
    reviewCrawlStatus,
    crawlProgress,
    dbProgress,
    imageProgress,
    reviewSummaryStatus,
    summaryProgress
  } = useSocket()
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  // 탭 상태 관리
  const [activeTab, setActiveTab] = useState<TabType>('menu')

  // 탭 변경 시 스크롤 초기화 함수
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }

  // 핵심 키워드 표시 상태 (리뷰 ID별로 관리)
  const [expandedKeywords, setExpandedKeywords] = useState<Set<number>>(new Set())

  // 재 요약 모달 상태
  const [resummaryModalVisible, setResummaryModalVisible] = useState(false)
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('gpt-oss:20b-cloud')
  const [resummaryLoading, setResummaryLoading] = useState(false)

  // 사용 가능한 AI 모델 목록
  const availableModels = [
    { value: 'gpt-oss:20b-cloud', label: 'GPT OSS 20B (Cloud)' },
    { value: 'gpt-oss:120b-cloud', label: 'GPT OSS 120B (Cloud)' },
    { value: 'deepseek-v3.1:671b-cloud', label: 'DeepSeek v3.1 671B (Cloud)' },
  ]

  // 메뉴 통계 상태
  const [menuStatistics, setMenuStatistics] = useState<any>(null)
  const [statisticsLoading, setStatisticsLoading] = useState(false)

  // 독립적으로 데이터 로드
  const {
    id,
    restaurant,
    restaurantLoading,
    reviews,
    reviewsLoading,
    reviewsTotal,
    hasMoreReviews,
    loadMoreReviews,
    fetchReviews,
    sentimentFilter,
    changeSentimentFilter,
    searchText,
    setSearchText,
    changeSearchText,
    menus,
    menusLoading,
    handleBackToList,
  } = useRestaurantDetail()

  // 메뉴 통계 조회 함수
  const fetchMenuStatistics = useCallback(async (restaurantId: number) => {
    setStatisticsLoading(true)
    try {
      const apiBaseUrl = getDefaultApiUrl()
      const response = await fetch(`${apiBaseUrl}/api/restaurants/${restaurantId}/menu-statistics?minMentions=1`)
      if (!response.ok) {
        console.error('❌ 메뉴 통계 조회 실패: HTTP', response.status)
        return
      }
      const result = await response.json()
      if (result.result && result.data) {
        setMenuStatistics(result.data)
      }
    } catch (error) {
      console.error('❌ 메뉴 통계 조회 실패:', error)
      setMenuStatistics(null)
    } finally {
      setStatisticsLoading(false)
    }
  }, [])

  // Effect Event: 크롤링 완료 시 실행할 로직 (non-reactive)
  const onReviewCrawlCompleted = useEffectEvent(async () => {
    const restaurantId = parseInt(id!, 10)
    if (!isNaN(restaurantId)) {
      await fetchReviews(restaurantId)
      // 통계 탭이면 통계도 새로고침
      if (activeTab === 'statistics') {
        await fetchMenuStatistics(restaurantId)
      }
    }
  })

  // Effect Event: 요약 완료 시 실행할 로직 (non-reactive)
  const onReviewSummaryCompleted = useEffectEvent(async () => {
    const restaurantId = parseInt(id!, 10)
    if (!isNaN(restaurantId)) {
      await fetchReviews(restaurantId)
      // 통계 탭이면 통계도 새로고침
      if (activeTab === 'statistics') {
        await fetchMenuStatistics(restaurantId)
      }
    }
  })

  // restaurant id로 room 입장, 컴포넌트 언마운트 시 퇴장
  useEffect(() => {
    if (id) {
      // 레스토랑 변경 시 통계 데이터 초기화
      setMenuStatistics(null)
      
      // 레스토랑 변경 시 스크롤 초기화
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0
      }
      
      joinRestaurantRoom(id)

      // 리뷰 크롤링/요약 완료 시 리뷰 재조회
      setRestaurantCallbacks({
        onReviewCrawlCompleted,
        onReviewSummaryCompleted
      })

      return () => {
        leaveRestaurantRoom(id)
      }
    }
  }, [id])

  // 통계 탭 활성화 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'statistics' && id) {
      const restaurantId = parseInt(id, 10)
      if (!isNaN(restaurantId)) {
        fetchMenuStatistics(restaurantId)
      }
    }
  }, [activeTab, id, fetchMenuStatistics])

  // 무한 스크롤 콜백
  const handleLoadMore = useCallback(() => {
    if (id && hasMoreReviews && !reviewsLoading) {
      const restaurantId = parseInt(id, 10)
      if (!isNaN(restaurantId)) {
        loadMoreReviews(restaurantId)
      }
    }
  }, [id, hasMoreReviews, reviewsLoading, loadMoreReviews])

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

  // 핵심 키워드 토글 함수
  const toggleKeywords = (reviewId: number) => {
    setExpandedKeywords(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId)
      } else {
        newSet.add(reviewId)
      }
      return newSet
    })
  }

  // 재요약 모달 열기
  const openResummaryModal = (reviewId: number) => {
    setSelectedReviewId(reviewId)
    setResummaryModalVisible(true)
  }

  // 재요약 모달 닫기
  const closeResummaryModal = () => {
    setResummaryModalVisible(false)
    setSelectedReviewId(null)
    setSelectedModel('gpt-oss:20b-cloud')
  }

  // 네이버 지도 열기 (앱 우선, 웹 fallback)
  const openNaverMap = useCallback((placeId: string) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    if (isMobile) {
      // 모바일: 네이버맵 앱 스킴 시도
      const appScheme = `nmap://place?id=${placeId}`
      const webFallback = `https://m.place.naver.com/restaurant/${placeId}/location`

      // 앱 스킴으로 시도
      window.location.href = appScheme

      // 1.5초 후 페이지가 여전히 활성 상태면 웹으로 fallback
      setTimeout(() => {
        if (!document.hidden) {
          window.open(webFallback, '_blank')
        }
      }, 1500)
    } else {
      // 데스크톱: 바로 웹으로
      window.open(`https://m.place.naver.com/restaurant/${placeId}/location`, '_blank')
    }
  }, [])

  // 재요약 실행
  const handleResummarize = async () => {
    if (!selectedReviewId) return

    setResummaryLoading(true)
    try {
      const apiBaseUrl = getDefaultApiUrl()
      const response = await fetch(`${apiBaseUrl}/api/reviews/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId: selectedReviewId,
          useCloud: true,
          config: {
            model: selectedModel
          }
        })
      })

      if (!response.ok) {
        console.error('❌ 재요약 요청 실패: HTTP', response.status)
        alert('재요약 요청에 실패했습니다.')
        return
      }

      const result = await response.json()
      console.log('✅ 재요약 완료:', result)

      // 리뷰 목록 갱신
      if (id) {
        const restaurantId = parseInt(id, 10)
        if (!isNaN(restaurantId)) {
          await fetchReviews(restaurantId)
        }
      }

      closeResummaryModal()
    } catch (error) {
      console.error('❌ 재요약 실패:', error)
      alert('재요약에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setResummaryLoading(false)
    }
  }

  // 별점 렌더링 함수 (0~100 점수를 1~5 별점으로 변환, 반별 포함)
  const renderStars = (score: number) => {
    const normalizedScore = score / 20 // 0-100 → 0-5

    return [1, 2, 3, 4, 5].map((position) => {
      const diff = normalizedScore - position + 1
      let icon
      let color = '#ffc107' // 금색

      if (diff >= 0.75) {
        icon = faStar // 채운 별
      } else if (diff >= 0.25) {
        icon = faStarHalfStroke // 반별
      } else {
        icon = farStar // 빈 별
        color = colors.border // 회색
      }

      return (
        <FontAwesomeIcon
          key={position}
          icon={icon}
          style={{ fontSize: 16, color, marginRight: 2 }}
        />
      )
    })
  }

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

          {imageProgress && (
            <View style={styles.progressSection}>
              <View style={styles.progressInfo}>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>이미지 처리</Text>
                <Text style={[styles.progressText, { color: colors.text }]}>
                  {imageProgress.current} / {imageProgress.total} ({imageProgress.percentage}%)
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: '#ff9800',
                      width: `${imageProgress.percentage}%`
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
          onPress={() => handleTabChange('menu')}
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
          onPress={() => handleTabChange('review')}
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

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'statistics' && styles.tabButtonActive
          ]}
          onPress={() => handleTabChange('statistics')}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'statistics' ? colors.primary : colors.textSecondary }
            ]}
          >
            📊 통계
          </Text>
          {activeTab === 'statistics' && (
            <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'map' && styles.tabButtonActive
          ]}
          onPress={() => handleTabChange('map')}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'map' ? colors.primary : colors.textSecondary }
            ]}
          >
            🗺️ 네이버맵
          </Text>
          {activeTab === 'map' && (
            <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>
      </View>

      {/* 감정 필터 (리뷰 탭에서만 표시) */}
      {activeTab === 'review' && (
        <View style={[styles.filterContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor: sentimentFilter === 'all' ? colors.primary : (theme === 'light' ? '#f5f5f5' : colors.surface),
                  borderColor: sentimentFilter === 'all' ? colors.primary : colors.border
                }
              ]}
              onPress={() => {
                if (id) {
                  const restaurantId = parseInt(id, 10)
                  if (!isNaN(restaurantId)) {
                    changeSentimentFilter(restaurantId, 'all')
                  }
                }
              }}
            >
              <Text style={[styles.filterButtonText, { color: sentimentFilter === 'all' ? '#fff' : colors.text }]}>
                전체
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor: sentimentFilter === 'positive' ? '#4caf50' : (theme === 'light' ? '#f5f5f5' : colors.surface),
                  borderColor: sentimentFilter === 'positive' ? '#4caf50' : colors.border
                }
              ]}
              onPress={() => {
                if (id) {
                  const restaurantId = parseInt(id, 10)
                  if (!isNaN(restaurantId)) {
                    changeSentimentFilter(restaurantId, 'positive')
                  }
                }
              }}
            >
              <Text style={[styles.filterButtonText, { color: sentimentFilter === 'positive' ? '#fff' : colors.text }]}>
                😊 긍정
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor: sentimentFilter === 'negative' ? '#f44336' : (theme === 'light' ? '#f5f5f5' : colors.surface),
                  borderColor: sentimentFilter === 'negative' ? '#f44336' : colors.border
                }
              ]}
              onPress={() => {
                if (id) {
                  const restaurantId = parseInt(id, 10)
                  if (!isNaN(restaurantId)) {
                    changeSentimentFilter(restaurantId, 'negative')
                  }
                }
              }}
            >
              <Text style={[styles.filterButtonText, { color: sentimentFilter === 'negative' ? '#fff' : colors.text }]}>
                😞 부정
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor: sentimentFilter === 'neutral' ? '#ff9800' : (theme === 'light' ? '#f5f5f5' : colors.surface),
                  borderColor: sentimentFilter === 'neutral' ? '#ff9800' : colors.border
                }
              ]}
              onPress={() => {
                if (id) {
                  const restaurantId = parseInt(id, 10)
                  if (!isNaN(restaurantId)) {
                    changeSentimentFilter(restaurantId, 'neutral')
                  }
                }
              }}
            >
              <Text style={[styles.filterButtonText, { color: sentimentFilter === 'neutral' ? '#fff' : colors.text }]}>
                😐 중립
              </Text>
            </TouchableOpacity>
          </View>

          {/* 검색 UI */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchInputWrapper, { backgroundColor: theme === 'light' ? '#f5f5f5' : colors.surface, borderColor: colors.border }]}>
              <FontAwesomeIcon icon={faSearch} style={{ marginRight: 8, fontSize: 16, color: colors.textSecondary }} />
              <input
                type="text"
                placeholder="리뷰 내용 검색..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && id) {
                    const restaurantId = parseInt(id, 10)
                    if (!isNaN(restaurantId)) {
                      changeSearchText(restaurantId, searchText)
                    }
                  }
                }}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: 14,
                  color: colors.text,
                  padding: 0,
                }}
              />
              {searchText && searchText.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchText('')
                    if (id) {
                      const restaurantId = parseInt(id, 10)
                      if (!isNaN(restaurantId)) {
                        changeSearchText(restaurantId, '')
                      }
                    }
                  }}
                  style={{ padding: 4 }}
                >
                  <FontAwesomeIcon icon={faTimes} style={{ fontSize: 16, color: colors.textSecondary }} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (id) {
                  const restaurantId = parseInt(id, 10)
                  if (!isNaN(restaurantId)) {
                    changeSearchText(restaurantId, searchText)
                  }
                }
              }}
            >
              <Text style={styles.searchButtonText}>검색</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reviewUserName, { color: colors.text }]}>{review.userName || '익명'}</Text>
                      {review.visitInfo.visitDate && (
                        <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
                          {review.visitInfo.visitDate}
                        </Text>
                      )}
                    </View>
                    {/* 재요약 버튼 - 항상 표시 */}
                    <TouchableOpacity
                      style={styles.resummaryButton}
                      onPress={() => openResummaryModal(review.id)}
                    >
                      <FontAwesomeIcon icon={faRedo} style={{ fontSize: 14, color: '#9c27b0' }} />
                      <Text style={[styles.resummaryButtonText, { color: '#9c27b0' }]}>재요약</Text>
                    </TouchableOpacity>
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

                  {/* 리뷰 이미지 표시 */}
                  {review.images && review.images.length > 0 && (
                    <View style={styles.reviewImagesContainer}>
                      {review.images.map((imageUrl: string, idx: number) => {
                        const apiBaseUrl = getDefaultApiUrl()
                        const fullImageUrl = `${apiBaseUrl}${imageUrl}`

                        return (
                          <img
                            key={idx}
                            src={fullImageUrl}
                            alt={`리뷰 이미지 ${idx + 1}`}
                            style={{
                              width: review.images.length === 1 ? '100%' : 'calc(50% - 6px)',
                              height: 200,
                              objectFit: 'cover',
                              borderRadius: 8,
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(fullImageUrl, '_blank')}
                          />
                        )
                      })}
                    </View>
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
                          <TouchableOpacity
                            style={styles.keywordsToggleButton}
                            onPress={() => toggleKeywords(review.id)}
                          >
                            <Text style={[styles.summaryKeywordsTitle, { color: colors.textSecondary }]}>
                              핵심 키워드 {expandedKeywords.has(review.id) ? '▼' : '▶'}
                            </Text>
                          </TouchableOpacity>

                          {expandedKeywords.has(review.id) && (
                            <View style={styles.keywordsContainer}>
                              {review.summary.keyKeywords.map((keyword: string, idx: number) => (
                                <View key={idx} style={[styles.summaryKeyword, { backgroundColor: '#e1bee7' }]}>
                                  <Text style={[styles.keywordText, { color: '#6a1b9a' }]}>{keyword}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      )}

                      {review.summary.satisfactionScore !== null && (
                        <View style={styles.satisfactionScore}>
                          <Text style={[styles.satisfactionLabel, { color: colors.textSecondary }]}>만족도:</Text>
                          <View style={styles.scoreStars}>
                            {renderStars(review.summary.satisfactionScore)}
                            <Text style={[styles.scoreNumber, { color: colors.text }]}>
                              {review.summary.satisfactionScore}점
                            </Text>
                          </View>
                        </View>
                      )}

                      {review.summary.menuItems && review.summary.menuItems.length > 0 && (
                        <View style={styles.menuItemsSection}>
                          <Text style={[styles.menuItemsTitle, { color: colors.textSecondary }]}>🍽️ 언급된 메뉴:</Text>
                          <View style={styles.keywordsContainer}>
                            {review.summary.menuItems.map((menuItem, idx: number) => {
                              // 감정별 색상 및 이모지 설정
                              const sentimentConfig = {
                                positive: {
                                  emoji: '😊',
                                  bgLight: '#c8e6c9',
                                  bgDark: '#2e5d2e',
                                  textLight: '#1b5e20',
                                  textDark: '#a5d6a7',
                                  borderLight: '#66bb6a',
                                  borderDark: '#4caf50'
                                },
                                negative: {
                                  emoji: '😞',
                                  bgLight: '#ffcdd2',
                                  bgDark: '#5d2e2e',
                                  textLight: '#b71c1c',
                                  textDark: '#ef9a9a',
                                  borderLight: '#ef5350',
                                  borderDark: '#e57373'
                                },
                                neutral: {
                                  emoji: '😐',
                                  bgLight: '#ffe0b2',
                                  bgDark: '#5d4a2e',
                                  textLight: '#e65100',
                                  textDark: '#ffcc80',
                                  borderLight: '#ff9800',
                                  borderDark: '#ffb74d'
                                }
                              };

                              const config = sentimentConfig[menuItem.sentiment];
                              const bgColor = theme === 'light' ? config.bgLight : config.bgDark;
                              const textColor = theme === 'light' ? config.textLight : config.textDark;
                              const borderColor = theme === 'light' ? config.borderLight : config.borderDark;

                              return (
                                <View key={idx} style={[styles.menuItemBadge, { backgroundColor: bgColor, borderColor }]}>
                                  <Text style={[styles.menuItemText, { color: textColor }]}>
                                    <Text style={{ fontSize: 14 }}>{config.emoji}</Text> {menuItem.name}
                                    {menuItem.reason && ` (${menuItem.reason})`}
                                  </Text>
                                </View>
                              );
                            })}
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

                      {review.summary.sentimentReason ? (
                        <View style={styles.sentimentReason}>
                          <Text style={[styles.sentimentReasonLabel, { color: colors.textSecondary }]}>
                            감정 분석:
                          </Text>
                          <Text style={[styles.sentimentReasonText, { color: colors.text }]}>
                            {review.summary.sentimentReason}
                          </Text>
                        </View>
                      ) : null}
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
            {isMobile && hasMoreReviews && (
              <div ref={loadMoreTriggerRef} style={{ padding: '20px', textAlign: 'center' }}>
                {reviewsLoading && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </div>
            )}

            {/* 로딩 인디케이터 (데스크톱) */}
            {!isMobile && reviewsLoading && hasMoreReviews && (
              <View style={styles.loadMoreButtonContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}

            {/* 모든 리뷰 로드 완료 표시 */}
            {!hasMoreReviews && (
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

        {/* 통계 탭 */}
        {activeTab === 'statistics' && (
          <>
            {statisticsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : menuStatistics ? (
              <View style={styles.statisticsContainer}>
                {/* 전체 요약 */}
                <View style={[styles.statisticsCard, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.statisticsCardTitle, { color: colors.text }]}>📊 전체 요약</Text>
                  <View style={styles.statisticsSummary}>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>전체 리뷰</Text>
                      <Text style={[styles.summaryValue, { color: colors.text }]}>{menuStatistics.totalReviews}개</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>분석 완료</Text>
                      <Text style={[styles.summaryValue, { color: colors.text }]}>{menuStatistics.analyzedReviews}개</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>언급된 메뉴</Text>
                      <Text style={[styles.summaryValue, { color: colors.text }]}>{menuStatistics.menuStatistics.length}개</Text>
                    </View>
                  </View>
                </View>

                {/* Top 긍정 메뉴 */}
                {menuStatistics.topPositiveMenus.length > 0 && (
                  <View style={[styles.statisticsCard, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.statisticsCardTitle, { color: colors.text }]}>😊 추천 메뉴 (긍정률 높음)</Text>
                    <View style={styles.topMenusList}>
                      {menuStatistics.topPositiveMenus.map((menu: any, index: number) => (
                        <View key={index} style={[styles.topMenuItem, { backgroundColor: '#e8f5e9', borderColor: '#4caf50' }]}>
                          <Text style={[styles.topMenuRank, { color: '#2e7d32' }]}>#{index + 1}</Text>
                          <View style={styles.topMenuInfo}>
                            <Text style={[styles.topMenuName, { color: '#1b5e20' }]}>{menu.menuName}</Text>
                            <Text style={[styles.topMenuStats, { color: '#2e7d32' }]}>
                              긍정률 {menu.positiveRate}% · {menu.mentions}회 언급
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Top 부정 메뉴 */}
                {menuStatistics.topNegativeMenus.length > 0 && (
                  <View style={[styles.statisticsCard, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.statisticsCardTitle, { color: colors.text }]}>😞 주의할 메뉴 (부정률 높음)</Text>
                    <View style={styles.topMenusList}>
                      {menuStatistics.topNegativeMenus.map((menu: any, index: number) => (
                        <View key={index} style={[styles.topMenuItem, { backgroundColor: '#ffebee', borderColor: '#f44336' }]}>
                          <Text style={[styles.topMenuRank, { color: '#c62828' }]}>#{index + 1}</Text>
                          <View style={styles.topMenuInfo}>
                            <Text style={[styles.topMenuName, { color: '#b71c1c' }]}>{menu.menuName}</Text>
                            <Text style={[styles.topMenuStats, { color: '#c62828' }]}>
                              부정률 {menu.negativeRate}% · {menu.mentions}회 언급
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 전체 메뉴 통계 */}
                <View style={[styles.statisticsCard, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.statisticsCardTitle, { color: colors.text }]}>📋 전체 메뉴 통계</Text>
                  <View style={styles.allMenusList}>
                    {menuStatistics.menuStatistics.map((stat: any, index: number) => {
                      const sentimentColor = stat.sentiment === 'positive' ? '#4caf50' : stat.sentiment === 'negative' ? '#f44336' : '#ff9800'
                      const sentimentBg = stat.sentiment === 'positive' ? '#e8f5e9' : stat.sentiment === 'negative' ? '#ffebee' : '#fff3e0'
                      
                      return (
                        <View key={index} style={[styles.menuStatItem, { borderColor: colors.border }]}>
                          <View style={styles.menuStatHeader}>
                            <Text style={[styles.menuStatName, { color: colors.text }]}>{stat.menuName}</Text>
                            <View style={[styles.menuStatBadge, { backgroundColor: sentimentBg }]}>
                              <Text style={[styles.menuStatBadgeText, { color: sentimentColor }]}>
                                {stat.sentiment === 'positive' ? '😊' : stat.sentiment === 'negative' ? '😞' : '😐'} {stat.positiveRate}%
                              </Text>
                            </View>
                          </View>
                          <View style={styles.menuStatCounts}>
                            <Text style={[styles.menuStatCount, { color: '#4caf50' }]}>긍정 {stat.positive}</Text>
                            <Text style={[styles.menuStatCount, { color: '#f44336' }]}>부정 {stat.negative}</Text>
                            <Text style={[styles.menuStatCount, { color: '#ff9800' }]}>중립 {stat.neutral}</Text>
                            <Text style={[styles.menuStatCount, { color: colors.textSecondary }]}>총 {stat.totalMentions}회</Text>
                          </View>
                          {(stat.topReasons.positive.length > 0 || stat.topReasons.negative.length > 0) && (
                            <View style={styles.menuStatReasons}>
                              {stat.topReasons.positive.length > 0 && (
                                <Text style={[styles.menuStatReason, { color: '#4caf50' }]}>
                                  👍 {stat.topReasons.positive.join(', ')}
                                </Text>
                              )}
                              {stat.topReasons.negative.length > 0 && (
                                <Text style={[styles.menuStatReason, { color: '#f44336' }]}>
                                  👎 {stat.topReasons.negative.join(', ')}
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>통계 데이터가 없습니다</Text>
              </View>
            )}
          </>
        )}

        {/* 네이버맵 탭 */}
        {activeTab === 'map' && (
          <>
            {restaurant?.place_id ? (
              <View style={styles.mapContainer}>
                <iframe
                  src={`https://m.place.naver.com/restaurant/${restaurant.place_id}/location`}
                  style={{
                    width: '100%',
                    height: isMobile ? 'calc(100vh - 200px)' : '600px',
                    border: 'none',
                    borderRadius: '12px'
                  }}
                  title="네이버 지도"
                />

                {/* Fallback: iframe 차단 시 새 창 열기 버튼 (앱 우선) */}
                <TouchableOpacity
                  style={[styles.openMapButton, { backgroundColor: colors.primary }]}
                  onPress={() => openNaverMap(restaurant.place_id)}
                >
                  <Text style={styles.openMapButtonText}>
                    🔗 네이버 지도에서 열기
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  지도 정보가 없습니다
                </Text>
              </View>
            )}
          </>
        )}
      </div>

      {/* 재요약 모달 */}
      <Modal
        visible={resummaryModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeResummaryModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>AI 모델 선택</Text>
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              리뷰를 재요약할 AI 모델을 선택하세요
            </Text>

            <View style={styles.modelList}>
              {availableModels.map((model) => (
                <TouchableOpacity
                  key={model.value}
                  style={[
                    styles.modelOption,
                    {
                      backgroundColor: selectedModel === model.value ? colors.primary : (theme === 'light' ? '#f5f5f5' : colors.background),
                      borderColor: selectedModel === model.value ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => setSelectedModel(model.value)}
                >
                  <View style={styles.radioButton}>
                    {selectedModel === model.value && (
                      <View style={[styles.radioButtonInner, { backgroundColor: '#fff' }]} />
                    )}
                  </View>
                  <Text style={[styles.modelLabel, { color: selectedModel === model.value ? '#fff' : colors.text }]}>
                    {model.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={closeResummaryModal}
                disabled={resummaryLoading}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.primary }]}
                onPress={handleResummarize}
                disabled={resummaryLoading}
              >
                {resummaryLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>재요약 시작</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden' as const,
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
    fontWeight: '500' as const,
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
  resummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
    cursor: 'pointer',
  },
  resummaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
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
  keywordsToggleButton: {
    paddingVertical: 4,
    cursor: 'pointer',
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
  menuItemsSection: {
    marginBottom: 12,
  },
  menuItemsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  menuItemBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
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
  reviewImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  modelList: {
    gap: 12,
    marginBottom: 24,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    cursor: 'pointer',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modelLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    minHeight: 48,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // 통계 스타일
  statisticsContainer: {
    gap: 20,
  },
  statisticsCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  statisticsCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statisticsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  topMenusList: {
    gap: 12,
  },
  topMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  topMenuRank: {
    fontSize: 20,
    fontWeight: '700',
    marginRight: 16,
    minWidth: 36,
  },
  topMenuInfo: {
    flex: 1,
  },
  topMenuName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  topMenuStats: {
    fontSize: 14,
  },
  allMenusList: {
    gap: 12,
  },
  menuStatItem: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  menuStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuStatName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  menuStatBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  menuStatBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuStatCounts: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  menuStatCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  menuStatReasons: {
    gap: 4,
  },
  menuStatReason: {
    fontSize: 13,
    lineHeight: 18,
  },
  // 네이버맵 탭 스타일
  mapContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  openMapButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    cursor: 'pointer',
  },
  openMapButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // 검색 UI 스타일
  searchContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
})

export default RestaurantDetail

