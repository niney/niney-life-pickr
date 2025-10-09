import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { apiService } from '@shared/services'
import type { RestaurantData } from '@shared/services'
import { Alert } from '@shared/utils'
import { useReviews } from './useReviews'
import { useMenus } from './useMenus'

export const useRestaurantDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null)
  const [restaurantLoading, setRestaurantLoading] = useState(false)

  // 공통 리뷰 훅 사용
  const reviewsState = useReviews()
  
  // 메뉴 훅 사용
  const menusState = useMenus()

  // restaurant id로 레스토랑 정보 가져오기 (state로 전달받지 못한 경우에만)
  const fetchRestaurant = async (restaurantId: number) => {
    setRestaurantLoading(true)
    try {
      const response = await apiService.getRestaurants()
      if (response.result && response.data) {
        const found = response.data.restaurants.find((r: RestaurantData) => r.id === restaurantId)
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

  // id 변경 시 데이터 로드
  useEffect(() => {
    if (id) {
      const restaurantId = parseInt(id, 10)
      if (isNaN(restaurantId)) {
        Alert.error('오류', '잘못된 레스토랑 ID입니다')
        navigate('/restaurant')
        return
      }

      // navigate state로 restaurant 정보가 전달되었는지 확인
      const stateRestaurant = location.state?.restaurant as RestaurantData | undefined
      
      if (stateRestaurant && stateRestaurant.id === restaurantId) {
        // state로 전달받은 경우 - restaurant 정보 재사용, review와 menu만 fetch
        setRestaurant(stateRestaurant)
        reviewsState.fetchReviews(restaurantId)
        menusState.fetchMenus(restaurantId)
      } else {
        // state가 없는 경우 (직접 URL 접근) - 모두 fetch
        fetchRestaurant(restaurantId)
        reviewsState.fetchReviews(restaurantId)
        menusState.fetchMenus(restaurantId)
      }
    }
  }, [id])

  const handleBackToList = () => {
    navigate('/restaurant')
  }

  return {
    id,
    restaurant,
    restaurantLoading,
    ...reviewsState,
    ...menusState,
    handleBackToList,
  }
}
