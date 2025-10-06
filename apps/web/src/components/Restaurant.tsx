import React, { useState, useEffect } from 'react'
import RestaurantDesktop from './RestaurantDesktop'
import RestaurantMobileWeb from './RestaurantMobileWeb/RestaurantMobileWeb'
import { useRestaurant } from '../hooks/useRestaurant'

interface RestaurantProps {
  onLogout: () => Promise<void>
}

const Restaurant: React.FC<RestaurantProps> = ({ onLogout }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  
  // 공통 state와 로직을 여기서 관리 (Desktop/Mobile 전환 시에도 유지)
  const restaurantState = useRestaurant()

  // Window resize 이벤트 리스너
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return isMobile ? (
    <RestaurantMobileWeb onLogout={onLogout} {...restaurantState} />
  ) : (
    <RestaurantDesktop onLogout={onLogout} {...restaurantState} />
  )
}

export default Restaurant
