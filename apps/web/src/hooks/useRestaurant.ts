import { useNavigate } from 'react-router-dom'
import { useRestaurantList, type RestaurantData } from '@shared'

export const useRestaurant = () => {
  const navigate = useNavigate()

  // shared 훅 사용 (플랫폼 독립적)
  const restaurantList = useRestaurantList({
    onCrawlSuccess: (restaurant: RestaurantData | null) => {
      if (restaurant) {
        // 상세 화면으로 이동 (RestaurantDetail에서 자동으로 room 입장)
        navigate(`/restaurant/${restaurant.id}`, { state: { restaurant } })
      }
    },
  })

  const handleRestaurantClick = (restaurant: RestaurantData) => {
    // restaurant 정보를 state로 전달하여 불필요한 fetch 방지
    navigate(`/restaurant/${restaurant.id}`, { state: { restaurant } })
  }

  return {
    ...restaurantList,
    handleRestaurantClick,
  }
}
