import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import type { RestaurantCategory, RestaurantData, ReviewData, ReviewCrawlStatus } from '@shared/services'
import Header from '../Header'
import Drawer from '../Drawer'
import RestaurantListScreen from './RestaurantListScreen'
import RestaurantDetailScreen from './RestaurantDetailScreen'

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
  selectedRestaurant: RestaurantData | null
  reviews: ReviewData[]
  reviewsLoading: boolean
  reviewsTotal: number
  handleCrawl: () => Promise<void>
  handleRestaurantClick: (restaurant: RestaurantData) => void
  handleBackToList: () => void
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
  selectedRestaurant,
  reviews,
  reviewsLoading,
  reviewsTotal,
  handleCrawl,
  handleRestaurantClick,
  handleBackToList,
}) => {
  const { theme } = useTheme()
  const [drawerVisible, setDrawerVisible] = useState(false)
  const colors = THEME_COLORS[theme]

  const handleLogout = async () => {
    await onLogout()
    window.location.href = '/login'
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header onMenuPress={() => setDrawerVisible(true)} />

      {/* Stack Navigator 패턴: 두 화면을 동시에 렌더링하고 transform으로 전환 */}
      <View style={styles.stackContainer}>
        {/* 리스트 화면 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transform: `translateX(${selectedPlaceId ? '-100%' : '0'})`,
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
          }}
        >
          <RestaurantListScreen
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
        </div>

        {/* 상세 화면 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transform: `translateX(${selectedPlaceId ? '0' : '100%'})`,
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
          }}
        >
          <RestaurantDetailScreen
            selectedRestaurant={selectedRestaurant}
            reviews={reviews}
            reviewsLoading={reviewsLoading}
            reviewsTotal={reviewsTotal}
            handleBackToList={handleBackToList}
          />
        </div>
      </View>

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
    height: '100%',
    overflow: 'hidden', // 화면 밖으로 나가는 부분 숨김
  },
  stackContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
})

export default RestaurantMobile
