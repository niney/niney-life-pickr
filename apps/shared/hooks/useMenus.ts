import { useState } from 'react'
import { apiService, type MenuItem, Alert } from '../'

/**
 * 메뉴 관리 훅
 * 플랫폼 독립적 - 웹/모바일 공통 사용
 */
export const useMenus = () => {
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [menusLoading, setMenusLoading] = useState(false)

  const fetchMenus = async (restaurantId: number) => {
    setMenusLoading(true)
    try {
      const response = await apiService.getRestaurantById(restaurantId)
      if (response.result && response.data) {
        setMenus(response.data.menus || [])
      }
    } catch (err) {
      console.error('메뉴 조회 실패:', err)
      Alert.error('조회 실패', '메뉴를 불러오는데 실패했습니다')
    } finally {
      setMenusLoading(false)
    }
  }

  const clearMenus = () => {
    setMenus([])
  }

  return {
    menus,
    menusLoading,
    fetchMenus,
    clearMenus,
  }
}

export type MenusHookReturn = ReturnType<typeof useMenus>
