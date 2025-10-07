import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '@shared/services'
import type { RestaurantCategory, RestaurantData } from '@shared/services'
import { Alert } from '@shared/utils'

export const useRestaurant = () => {
  const navigate = useNavigate()
  
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<RestaurantCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([])
  const [restaurantsLoading, setRestaurantsLoading] = useState(false)
  const [total, setTotal] = useState(0)

  const fetchCategories = async () => {
    setCategoriesLoading(true)
    try {
      const response = await apiService.getRestaurantCategories()
      if (response.result && response.data) {
        setCategories(response.data)
      }
    } catch (err) {
      console.error('카테고리 조회 실패:', err)
    } finally {
      setCategoriesLoading(false)
    }
  }

  const fetchRestaurants = async () => {
    setRestaurantsLoading(true)
    try {
      const response = await apiService.getRestaurants()
      if (response.result && response.data) {
        setRestaurants(response.data.restaurants)
        setTotal(response.data.total)
        return response.data.restaurants
      }
    } catch (err) {
      console.error('레스토랑 조회 실패:', err)
    } finally {
      setRestaurantsLoading(false)
    }
    return []
  }

  const handleRestaurantClick = (restaurant: RestaurantData) => {
    // restaurant 정보를 state로 전달하여 불필요한 fetch 방지
    navigate(`/restaurant/${restaurant.id}`, { state: { restaurant } })
  }

  useEffect(() => {
    fetchCategories()
    fetchRestaurants()
  }, [])

  const handleCrawl = async () => {
    if (!url.trim()) {
      Alert.error('오류', 'URL을 입력해주세요')
      return
    }

    setLoading(true)

    try {
      const response = await apiService.crawlRestaurant({ url, crawlMenus: true, crawlReviews: true })

      if (response.result && response.data) {
        const placeId = response.data.placeId
        
        if (placeId) {
          // 목록 갱신 (새로 추가된 레스토랑 표시)
          const updatedRestaurants = await fetchRestaurants()
          await fetchCategories()
          
          // placeId로 레스토랑 찾아서 id로 이동
          if (updatedRestaurants && updatedRestaurants.length > 0) {
            const newRestaurant = updatedRestaurants.find(r => r.place_id === placeId)
            if (newRestaurant) {
              // 상세 화면으로 이동 (RestaurantDetail에서 자동으로 room 입장)
              navigate(`/restaurant/${newRestaurant.id}`, { state: { restaurant: newRestaurant } })
            }
          }
        }
      } else {
        await fetchRestaurants()
        await fetchCategories()
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '크롤링 중 오류가 발생했습니다'
      Alert.error('크롤링 실패', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return {
    url,
    setUrl,
    loading,
    categories,
    categoriesLoading,
    restaurants,
    restaurantsLoading,
    total,
    handleCrawl,
    handleRestaurantClick,
    fetchRestaurants,
    fetchCategories,
  }
}
