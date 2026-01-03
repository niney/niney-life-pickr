import { useState, useCallback } from 'react'
import { getDefaultApiUrl } from '@shared/services'
import type { MenuStatistics } from '../tabs/types'

export type StatisticsSource = 'naver' | 'catchtable' | 'all'

export const useMenuStatistics = () => {
  const [menuStatistics, setMenuStatistics] = useState<MenuStatistics | null>(null)
  const [statisticsLoading, setStatisticsLoading] = useState(false)

  const fetchMenuStatistics = useCallback(
    async (restaurantId: number, source: StatisticsSource = 'naver') => {
      setStatisticsLoading(true)
      try {
        const apiBaseUrl = getDefaultApiUrl()
        const params = new URLSearchParams()
        params.append('minMentions', '1')
        params.append('source', source)

        const response = await fetch(
          `${apiBaseUrl}/api/restaurants/${restaurantId}/menu-statistics?${params.toString()}`
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
    },
    []
  )

  return { menuStatistics, statisticsLoading, fetchMenuStatistics, setMenuStatistics }
}
