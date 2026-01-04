import React, { useEffect, useRef, useCallback, useState, useEffectEvent } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { useTheme, useSocket } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { useRestaurantDetail } from '../../hooks/useRestaurantDetail'

// 분리된 컴포넌트 임포트
import RestaurantDetailHeader from './header/RestaurantDetailHeader'
import TabMenu, { type TabType } from './navigation/TabMenu'
import ReviewFilterBar from './filters/ReviewFilterBar'
import CrawlProgressCard from './progress/CrawlProgressCard'
import SummaryProgressCard from './progress/SummaryProgressCard'
import MenuTab from './tabs/MenuTab'
import MapTab from './tabs/MapTab'
import VworldMapTab from './tabs/VworldMapTab'
import StatisticsTab from './tabs/StatisticsTab'
import ReviewTab from './tabs/ReviewTab'
import CatchtableReviewTab from './tabs/CatchtableReviewTab'
import ResummaryModal from './modals/ResummaryModal'

// 커스텀 훅 임포트
import { useResummary } from './hooks/useResummary'
import { useKeywordToggle } from './hooks/useKeywordToggle'
import { useCatchtableReviews } from './hooks/useCatchtableReviews'

// 유틸 함수 임포트
import { openNaverMap } from './utils/openNaverMap'

interface RestaurantDetailProps {
  isMobile?: boolean
}

const RestaurantDetail: React.FC<RestaurantDetailProps> = ({ isMobile = false }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const {
    joinRestaurantRoom,
    leaveRestaurantRoom,
    setRestaurantCallbacks,
    menuProgress,
    crawlProgress,
    dbProgress,
    imageProgress,
    catchtableProgress,
    catchtableSummaryProgress,
    isCrawlInterrupted,
    reviewSummaryStatus,
    summaryProgress,
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

  // 커스텀 훅 사용
  const { expandedKeywords, toggleKeywords } = useKeywordToggle()
  const {
    resummaryModalVisible,
    selectedModel,
    resummaryLoading,
    availableModels,
    openResummaryModal,
    closeResummaryModal,
    setSelectedModel,
    handleResummarize,
  } = useResummary()

  const {
    catchtableReviews,
    catchtableReviewsLoading,
    catchtableReviewsTotal,
    hasMoreCatchtableReviews,
    fetchCatchtableReviews,
    loadMoreCatchtableReviews,
    resetCatchtableReviews,
  } = useCatchtableReviews()

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
    fetchMenus,
    handleBackToList,
  } = useRestaurantDetail()

  // Effect Event: 메뉴 크롤링 완료 시 실행할 로직 (non-reactive)
  const onMenuCrawlCompleted = useEffectEvent(async () => {
    const restaurantId = parseInt(id!, 10)
    if (!isNaN(restaurantId)) {
      await fetchMenus(restaurantId)
    }
  })

  // Effect Event: 크롤링 완료 시 실행할 로직 (non-reactive)
  const onReviewCrawlCompleted = useEffectEvent(async () => {
    const restaurantId = parseInt(id!, 10)
    if (!isNaN(restaurantId)) {
      await fetchReviews(restaurantId)
    }
  })

  // Effect Event: 요약 완료 시 실행할 로직 (non-reactive)
  const onReviewSummaryCompleted = useEffectEvent(async () => {
    const restaurantId = parseInt(id!, 10)
    if (!isNaN(restaurantId)) {
      await fetchReviews(restaurantId)
    }
  })

  // restaurant id로 room 입장, 컴포넌트 언마운트 시 퇴장
  // 일반 리뷰와 동일하게 id 변경 시 캐치테이블 리뷰도 함께 fetch
  useEffect(() => {
    if (id) {
      const restaurantId = parseInt(id, 10)

      // 레스토랑 변경 시 캐치테이블 리뷰 초기화 후 fetch (일반 리뷰 방식과 동일)
      resetCatchtableReviews()
      if (!isNaN(restaurantId)) {
        fetchCatchtableReviews(restaurantId)
      }

      // 레스토랑 변경 시 스크롤 초기화
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0
      }

      joinRestaurantRoom(id)

      // 메뉴/리뷰 크롤링, 요약 완료 시 재조회
      setRestaurantCallbacks({
        onMenuCrawlCompleted,
        onReviewCrawlCompleted,
        onReviewSummaryCompleted,
      })

      return () => {
        leaveRestaurantRoom(id)
      }
    }
    // useEffectEvent를 사용한 콜백들은 의존성에 포함하지 않음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

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
    if (activeTab !== 'review' || isMobile || !scrollContainerRef.current) return

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
  }, [activeTab, isMobile, handleLoadMore])

  // Intersection Observer 설정 (모바일 무한 스크롤)
  useEffect(() => {
    if (activeTab !== 'review' || !isMobile || !loadMoreTriggerRef.current) return

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
  }, [activeTab, isMobile, handleLoadMore])

  // 크롤링 중인지 체크 (진행률이 하나라도 있거나 중단 상태이면 표시)
  const isCrawling =
    menuProgress !== null || crawlProgress !== null || dbProgress !== null || imageProgress !== null || catchtableProgress !== null || isCrawlInterrupted
  const isSummarizing = reviewSummaryStatus.status === 'active'
  const isCatchtableSummarizing = catchtableSummaryProgress !== null

  // 재요약 핸들러
  const onResummarizeConfirm = useCallback(async () => {
    await handleResummarize(async () => {
      if (id) {
        const restaurantId = parseInt(id, 10)
        if (!isNaN(restaurantId)) {
          await fetchReviews(restaurantId)
        }
      }
    })
  }, [handleResummarize, id, fetchReviews])

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
      {/* 헤더 */}
      <RestaurantDetailHeader
        restaurantName={restaurant?.name || ''}
        menuCount={menus.length}
        reviewCount={reviewsTotal}
        onBack={handleBackToList}
        isMobile={isMobile}
      />

      {/* 크롤링 진행 상태 표시 */}
      {isCrawling && (
        <CrawlProgressCard
          menuProgress={menuProgress}
          crawlProgress={crawlProgress}
          imageProgress={imageProgress}
          dbProgress={dbProgress}
          catchtableProgress={catchtableProgress}
          isInterrupted={isCrawlInterrupted}
        />
      )}

      {/* 리뷰 요약 진행 상태 표시 */}
      {isSummarizing && <SummaryProgressCard summaryProgress={summaryProgress} />}

      {/* 캐치테이블 리뷰 요약 진행 상태 표시 */}
      {isCatchtableSummarizing && (
        <SummaryProgressCard
          summaryProgress={catchtableSummaryProgress}
          title="🍽️ 캐치테이블 리뷰 요약 중..."
        />
      )}

      {/* 탭 메뉴 */}
      <TabMenu
        activeTab={activeTab}
        onTabChange={handleTabChange}
        menuCount={menus.length}
        reviewCount={reviewsTotal}
        catchtableReviewCount={catchtableReviewsTotal}
      />

      {/* 감정 필터 (리뷰 탭에서만 표시) */}
      {activeTab === 'review' && id && (
        <ReviewFilterBar
          sentimentFilter={sentimentFilter}
          onFilterChange={changeSentimentFilter}
          searchText={searchText}
          onSearchTextChange={setSearchText}
          onSearch={changeSearchText}
          restaurantId={id}
        />
      )}

      <div style={{ padding: 20 }}>
        {/* 메뉴 탭 */}
        {activeTab === 'menu' && (
          <MenuTab menus={menus} menusLoading={menusLoading} isMobile={isMobile} />
        )}

        {/* 리뷰 탭 */}
        {activeTab === 'review' && id && (
          <ReviewTab
            reviews={reviews}
            reviewsLoading={reviewsLoading}
            reviewsTotal={reviewsTotal}
            hasMoreReviews={hasMoreReviews}
            expandedKeywords={expandedKeywords}
            isMobile={isMobile}
            onLoadMore={() => {
              const restaurantId = parseInt(id, 10)
              if (!isNaN(restaurantId)) {
                loadMoreReviews(restaurantId)
              }
            }}
            onResummary={openResummaryModal}
            onToggleKeywords={toggleKeywords}
            loadMoreTriggerRef={loadMoreTriggerRef}
          />
        )}

        {/* 캡리뷰 탭 (캐치테이블 리뷰) */}
        {activeTab === 'catchtable' && id && (
          <CatchtableReviewTab
            reviews={catchtableReviews}
            reviewsLoading={catchtableReviewsLoading}
            reviewsTotal={catchtableReviewsTotal}
            hasMoreReviews={hasMoreCatchtableReviews}
            isMobile={isMobile}
            onLoadMore={() => {
              const restaurantId = parseInt(id, 10)
              if (!isNaN(restaurantId)) {
                loadMoreCatchtableReviews(restaurantId)
              }
            }}
            loadMoreTriggerRef={loadMoreTriggerRef}
          />
        )}

        {/* 통계 탭 */}
        {activeTab === 'statistics' && id && (
          <StatisticsTab restaurantId={parseInt(id, 10)} />
        )}

        {/* 네이버맵 탭 */}
        {activeTab === 'map' && (
          <MapTab
            placeId={restaurant?.place_id}
            onOpenNaverMap={openNaverMap}
            isMobile={isMobile}
          />
        )}

        {/* VWorld 맵 탭 */}
        {activeTab === 'vworld' && (
          <VworldMapTab
            lat={restaurant?.lat}
            lng={restaurant?.lng}
            address={restaurant?.address}
            restaurantName={restaurant?.name}
            isMobile={isMobile}
          />
        )}
      </div>

      {/* 재요약 모달 */}
      <ResummaryModal
        visible={resummaryModalVisible}
        selectedModel={selectedModel}
        availableModels={availableModels}
        resummaryLoading={resummaryLoading}
        onClose={closeResummaryModal}
        onSelectModel={setSelectedModel}
        onConfirm={onResummarizeConfirm}
      />
    </div>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
})

export default RestaurantDetail
