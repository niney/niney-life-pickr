import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiService } from '@shared/services'
import type { RestaurantData } from '@shared/services'
import { Alert } from '@shared/utils'
import { useReviews } from './useReviews'

export const useRestaurantDetail = () => {
  const { placeId } = useParams<{ placeId: string }>()
  const navigate = useNavigate()
  
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null)
  const [restaurantLoading, setRestaurantLoading] = useState(false)

  // 공통 리뷰 훅 사용
  const reviewsState = useReviews()

  // placeId로 레스토랑 정보 가져오기
  const fetchRestaurant = async (placeId: string) => {
    setRestaurantLoading(true)
    try {
      const response = await apiService.getRestaurants()
      if (response.result && response.data) {
        const found = response.data.restaurants.find((r: RestaurantData) => r.place_id === placeId)
        if (found) {
          setRestaurant(found)
        } else {
          Alert.error('오류', '레스토랑을 찾을 수 없습니다')
          navigate('/restaurant')
        }
      }
    } catch (err) {
      console.error('레스토랑 조회 실패:', err)
      Alert.error('조회 실패', '레스토랑 정보를 불러오는데 실패했습니다')
    } finally {
      setRestaurantLoading(false)
    }
  }

  // placeId 변경 시 데이터 로드
  useEffect(() => {
    if (placeId) {
      fetchRestaurant(placeId)
      reviewsState.fetchReviews(placeId)
    }
  }, [placeId])

  const handleBackToList = () => {
    navigate('/restaurant')
  }

  return {
    placeId,
    restaurant,
    restaurantLoading,
    ...reviewsState,
    handleBackToList,
  }
}
