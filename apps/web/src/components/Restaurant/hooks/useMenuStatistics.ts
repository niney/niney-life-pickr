import { useState, useCallback } from 'react'
import { getDefaultApiUrl } from '@shared/services'
import type { MenuStatistics } from '../tabs/types'

export const useMenuStatistics = () => {
  const [menuStatistics, setMenuStatistics] = useState<MenuStatistics | null>(null)
  const [statisticsLoading, setStatisticsLoading] = useState(false)

  const fetchMenuStatistics = useCallback(async (restaurantId: number) => {
    setStatisticsLoading(true)
    try {
      const apiBaseUrl = getDefaultApiUrl()
      const response = await fetch(
        `${apiBaseUrl}/api/restaurants/${restaurantId}/menu-statistics?minMentions=1`
      )
      if (!response.ok) {
        console.error('❌ 메뉴 통계 조회 실패: HTTP', response.status)
        return
      }
      const result = await response.json()
      if (result.result && result.data) {
        setMenuStatistics(result.data)
      }
    } catch (error) {
      console.error('❌ 메뉴 통계 조회 실패:', error)
      setMenuStatistics(null)
    } finally {
      setStatisticsLoading(false)
    }
  }, [])

  return { menuStatistics, statisticsLoading, fetchMenuStatistics, setMenuStatistics }
}
