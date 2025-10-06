import React, { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import type { RestaurantCategory, RestaurantData, ReviewCrawlStatus } from '@shared/services'
import Header from '../Header'
import Drawer from '../Drawer'
import RestaurantList from './RestaurantList'
import RestaurantDetail from './RestaurantDetail'

interface RestaurantMobileProps {
  onLogout: () => Promise<void>
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

const RestaurantMobile: React.FC<RestaurantMobileProps> = ({
  onLogout,
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
  selectedPlaceId,
  handleCrawl,
  handleRestaurantClick,
}) => {
  const { theme } = useTheme()
  const [drawerVisible, setDrawerVisible] = useState(false)
  const colors = THEME_COLORS[theme]
  const location = useLocation()

  // 경로가 변경될 때마다 스크롤을 맨 위로 이동
  useEffect(() => {
    window.scrollTo(0, 0)
    document.body.scrollTop = 0
    document.documentElement.scrollTop = 0
  }, [location.pathname])

  const handleLogout = async () => {
    await onLogout()
    window.location.href = '/login'
  }

  return (
    <div style={{ backgroundColor: colors.background }}>
      <Header onMenuPress={() => setDrawerVisible(true)} />

      <Routes>
        {/* 레스토랑 목록 화면 */}
        <Route
          index
          element={
            <RestaurantList
              key="list"
              url={url}
              setUrl={setUrl}
              loading={loading}
              categories={categories}
              categoriesLoading={categoriesLoading}
              restaurants={restaurants}
              restaurantsLoading={restaurantsLoading}
              total={total}
              reviewCrawlStatus={reviewCrawlStatus}
              crawlProgress={crawlProgress}
              dbProgress={dbProgress}
              selectedPlaceId={selectedPlaceId}
              handleCrawl={handleCrawl}
              handleRestaurantClick={handleRestaurantClick}
            />
          }
        />

        {/* 레스토랑 상세 화면 - 독립적으로 데이터 로드 */}
        <Route
          path=":placeId"
          element={<RestaurantDetail />}
        />
      </Routes>

      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onLogout={handleLogout}
      />
    </div>
  )
}

export default RestaurantMobile
