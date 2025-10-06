import React, { useState } from 'react'
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
    <div className="page-container" style={{ backgroundColor: colors.background }}>
      <Header onMenuPress={() => setDrawerVisible(true)} />

      {selectedPlaceId ? (
        <RestaurantDetailScreen
          selectedRestaurant={selectedRestaurant}
          reviews={reviews}
          reviewsLoading={reviewsLoading}
          reviewsTotal={reviewsTotal}
          handleBackToList={handleBackToList}
        />
      ) : (
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
      )}

      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onLogout={handleLogout}
      />
    </div>
  )
}

export default RestaurantMobile
