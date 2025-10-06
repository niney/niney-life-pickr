import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { useRestaurant } from '../hooks/useRestaurant'
import Header from './Header'
import Drawer from './Drawer'
import RestaurantList from './Restaurant/RestaurantList'
import RestaurantDetail from './Restaurant/RestaurantDetail'

interface RestaurantProps {
  onLogout: () => Promise<void>
}

const Restaurant: React.FC<RestaurantProps> = ({ onLogout }) => {
  // 공통 state와 로직
  const restaurantState = useRestaurant()
  
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
    reviewCrawlStatus,
    crawlProgress,
    dbProgress,
    handleCrawl,
    handleRestaurantClick,
  } = restaurantState

  return (
    <div
      style={{ backgroundColor: colors.background }}
      className={isMobile ? '' : 'page-container'}
    >
      <Header onMenuPress={() => setDrawerVisible(true)} />

      <View style={[
        styles.mainContainer,
        isMobile && styles.mobileContainer
      ]}>
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
                  reviewCrawlStatus={reviewCrawlStatus}
                  crawlProgress={crawlProgress}
                  dbProgress={dbProgress}
                  handleCrawl={handleCrawl}
                  handleRestaurantClick={handleRestaurantClick}
                  isMobile={isMobile}
                />
              )}
            />
            <Route path=":placeId" element={<RestaurantDetail isMobile={isMobile} />} />
          </Routes>
        ) : (
          // 데스크탑: List는 항상, Detail은 라우팅 기반
          <>
            <RestaurantList
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
              handleCrawl={handleCrawl}
              handleRestaurantClick={handleRestaurantClick}
              isMobile={isMobile}
            />
            <Routes>
              <Route path=":placeId" element={<RestaurantDetail isMobile={isMobile} />} />
            </Routes>
          </>
        )}
      </View>

      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onLogout={handleLogout}
      />
    </div>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    flexDirection: 'row', // 데스크탑: 2열 레이아웃
  },
  mobileContainer: {
    flexDirection: 'column', // 모바일: 1열 레이아웃
  },
})

export default Restaurant
