import React, { useState, useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useTheme, useSocket } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { useRestaurant } from '../hooks/useRestaurant'
import Header from './Header'
import Drawer from './Drawer'
import RestaurantList from './Restaurant/RestaurantList'
import RestaurantDetail from './Restaurant/RestaurantDetail'
import SeoulMapView from './Restaurant/SeoulMapView'
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
  searchAddress: string
  setSearchAddress: (searchAddress: string) => void
  menuProgress: ProgressData | null
  crawlProgress: ProgressData | null
  dbProgress: ProgressData | null
  isCrawlInterrupted?: boolean
  handleCrawl: () => Promise<void>
  handleRestaurantClick: (restaurant: RestaurantData) => void
  fetchRestaurants: (limit?: number, offset?: number) => Promise<RestaurantData[]>
  fetchCategories: () => Promise<void>
  showSeoulMap: boolean
  setShowSeoulMap: (show: boolean) => void
}

// 데스크탑 레이아웃 컴포넌트 (라우팅 컨텍스트 내부)
const DesktopLayout: React.FC<DesktopLayoutProps> = (props) => {
  const { showSeoulMap, setSearchAddress } = props

  // 지도에서 구 클릭 시 주소 검색에 반영
  const handleDistrictClick = (districtName: string) => {
    setSearchAddress(districtName)
  }

  return (
    <>
      <RestaurantList {...props} isMobile={false} />
      {showSeoulMap ? (
        <SeoulMapView onDistrictClick={handleDistrictClick} />
      ) : (
        <Routes>
          <Route path=":id" element={<RestaurantDetail isMobile={false} />} />
        </Routes>
      )}
    </>
  )
}

const Restaurant: React.FC<RestaurantProps> = ({ onLogout }) => {
  // 공통 state와 로직
  const restaurantState = useRestaurant()

  // Socket 연결 (전역 단일 연결)
  const { menuProgress, crawlProgress, dbProgress, isCrawlInterrupted, setRestaurantCallbacks, resetCrawlStatus } = useSocket()

  const { theme } = useTheme()
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [showSeoulMap, setShowSeoulMap] = useState(false)
  const colors = THEME_COLORS[theme]
  const location = useLocation()
  const navigate = useNavigate()

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
    searchAddress,
    setSearchAddress,
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

  // 레스토랑 클릭 핸들러 (지도가 켜져 있으면 끄기)
  const handleRestaurantClickWithMapClose = (restaurant: RestaurantData) => {
    if (showSeoulMap) {
      setShowSeoulMap(false)
    }
    handleRestaurantClick(restaurant)
  }

  // 모바일 지도에서 구 클릭 핸들러 (주소 검색 + 목록으로 이동)
  const handleMobileMapClick = (districtName: string) => {
    setSearchAddress(districtName)
    navigate('/restaurant')
  }

  return (
    <div className="restaurant-grid-container" style={{ backgroundColor: colors.background }}>
      <Header onMenuPress={() => setDrawerVisible(true)} />

      <div className={`restaurant-content ${isMobile ? 'mobile' : 'desktop'}`}>
        {/* 모바일: List 또는 Detail 또는 Map 중 하나만 표시 */}
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
                  searchAddress={searchAddress}
                  setSearchAddress={setSearchAddress}
                  menuProgress={menuProgress}
                  crawlProgress={crawlProgress}
                  dbProgress={dbProgress}
                  isCrawlInterrupted={isCrawlInterrupted}
                  handleCrawl={handleCrawlWithSocket}
                  handleRestaurantClick={handleRestaurantClick}
                  fetchRestaurants={fetchRestaurants}
                  fetchCategories={fetchCategories}
                  isMobile={isMobile}
                />
              )}
            />
            <Route
              path="map"
              element={
                <SeoulMapView
                  onDistrictClick={handleMobileMapClick}
                  isMobile={isMobile}
                  onBack={() => navigate('/restaurant')}
                />
              }
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
                  searchAddress={searchAddress}
                  setSearchAddress={setSearchAddress}
                  menuProgress={menuProgress}
                  crawlProgress={crawlProgress}
                  dbProgress={dbProgress}
                  isCrawlInterrupted={isCrawlInterrupted}
                  handleCrawl={handleCrawlWithSocket}
                  handleRestaurantClick={handleRestaurantClickWithMapClose}
                  fetchRestaurants={fetchRestaurants}
                  fetchCategories={fetchCategories}
                  showSeoulMap={showSeoulMap}
                  setShowSeoulMap={setShowSeoulMap}
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
