import React, { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useTheme, useSocket } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { useRestaurant } from '../hooks/useRestaurant'
import Header from './Header'
import Drawer from './Drawer'
import RestaurantList from './Restaurant/RestaurantList'
import RestaurantDetail from './Restaurant/RestaurantDetail'
import type { RestaurantData, RestaurantCategory, ProgressData } from '@shared'

interface RestaurantProps {
  onLogout: () => Promise<void>
}

interface DesktopLayoutProps {
  url: string
  setUrl: (url: string) => void
  loading: boolean
  categories: RestaurantCategory[]
  categoriesLoading: boolean
  restaurants: RestaurantData[]
  restaurantsLoading: boolean
  total: number
  selectedCategory: string | null
  setSelectedCategory: (category: string | null) => void
  searchName: string
  setSearchName: (searchName: string) => void
  menuProgress: ProgressData | null
  crawlProgress: ProgressData | null
  dbProgress: ProgressData | null
  handleCrawl: () => Promise<void>
  handleRestaurantClick: (restaurant: RestaurantData) => void
  fetchRestaurants: (limit?: number, offset?: number) => Promise<RestaurantData[]>
  fetchCategories: () => Promise<void>
}

// 데스크탑 레이아웃 컴포넌트 (라우팅 컨텍스트 내부)
const DesktopLayout: React.FC<DesktopLayoutProps> = (props) => {
  return (
    <>
      <RestaurantList {...props} isMobile={false} />
      <Routes>
        <Route path=":id" element={<RestaurantDetail isMobile={false} />} />
      </Routes>
    </>
  )
}

const Restaurant: React.FC<RestaurantProps> = ({ onLogout }) => {
  // 공통 state와 로직
  const restaurantState = useRestaurant()
  
  // Socket 연결 (전역 단일 연결)
  const { menuProgress, crawlProgress, dbProgress, setRestaurantCallbacks, resetCrawlStatus } = useSocket()
  
  const { theme } = useTheme()
  const [drawerVisible, setDrawerVisible] = useState(false)
  const colors = THEME_COLORS[theme]
  const location = useLocation()
  
  // 반응형 체크
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 모바일에서 경로 변경 시 스크롤 맨 위로
  useEffect(() => {
    if (isMobile) {
      window.scrollTo(0, 0)
      document.body.scrollTop = 0
      document.documentElement.scrollTop = 0
    }
  }, [location.pathname, isMobile])

  const handleLogout = async () => {
    await onLogout()
    window.location.href = '/login'
  }

  const {
    url,
    setUrl,
    loading,
    categories,
    categoriesLoading,
    restaurants,
    restaurantsLoading,
    total,
    selectedCategory,
    setSelectedCategory,
    searchName,
    setSearchName,
    handleCrawl,
    handleRestaurantClick,
    fetchRestaurants,
    fetchCategories,
  } = restaurantState
  
  // 크롤링 시작 핸들러 (socket 콜백 설정)
  const handleCrawlWithSocket = async () => {
    resetCrawlStatus()
    
    // 크롤링 완료/에러 시 콜백 설정
    setRestaurantCallbacks({
      onReviewCrawlCompleted: async () => {
        // 크롤링 완료 시 데이터 갱신
        await fetchRestaurants()
        await fetchCategories()
      },
      onReviewCrawlError: async () => {
        // 에러 발생 시에도 데이터 갱신
        await fetchRestaurants()
        await fetchCategories()
      }
    })
    
    await handleCrawl()
  }

  return (
    <div className="restaurant-grid-container" style={{ backgroundColor: colors.background }}>
      <Header onMenuPress={() => setDrawerVisible(true)} />

      <div className={`restaurant-content ${isMobile ? 'mobile' : 'desktop'}`}>
        {/* 모바일: List 또는 Detail 중 하나만 표시 */}
        {isMobile ? (
          <Routes>
            <Route
              index
              element={(
                <RestaurantList
                  url={url}
                  setUrl={setUrl}
                  loading={loading}
                  categories={categories}
                  categoriesLoading={categoriesLoading}
                  restaurants={restaurants}
                  restaurantsLoading={restaurantsLoading}
                  total={total}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  searchName={searchName}
                  setSearchName={setSearchName}
                  menuProgress={menuProgress}
                  crawlProgress={crawlProgress}
                  dbProgress={dbProgress}
                  handleCrawl={handleCrawlWithSocket}
                  handleRestaurantClick={handleRestaurantClick}
                  fetchRestaurants={fetchRestaurants}
                  fetchCategories={fetchCategories}
                  isMobile={isMobile}
                />
              )}
            />
            <Route path=":id" element={<RestaurantDetail isMobile={isMobile} />} />
          </Routes>
        ) : (
          // 데스크탑: List와 Detail 모두 표시 (라우팅 컨텍스트 공유)
          <Routes>
            <Route
              path="*"
              element={(
                <DesktopLayout
                  url={url}
                  setUrl={setUrl}
                  loading={loading}
                  categories={categories}
                  categoriesLoading={categoriesLoading}
                  restaurants={restaurants}
                  restaurantsLoading={restaurantsLoading}
                  total={total}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  searchName={searchName}
                  setSearchName={setSearchName}
                  menuProgress={menuProgress}
                  crawlProgress={crawlProgress}
                  dbProgress={dbProgress}
                  handleCrawl={handleCrawlWithSocket}
                  handleRestaurantClick={handleRestaurantClick}
                  fetchRestaurants={fetchRestaurants}
                  fetchCategories={fetchCategories}
                />
              )}
            />
          </Routes>
        )}
      </div>

      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onLogout={handleLogout}
      />
    </div>
  )
}

export default Restaurant
