// 리뷰 관련 타입 정의
import type { ReviewData } from '@shared/services'

export type { ReviewData }

export interface ReviewHeaderProps {
  userName: string
  visitDate?: string
  onResummary: () => void
}

export interface ReviewImagesProps {
  images: string[]
}

export interface AISummaryProps {
  summary: {
    summary: string
    sentiment: 'positive' | 'negative' | 'neutral'
    satisfactionScore: number | null
    keyKeywords: string[]
    menuItems?: Array<{
      name: string
      sentiment: 'positive' | 'negative' | 'neutral'
      reason?: string
    }>
    tips: string[]
    sentimentReason?: string
  }
  expandedKeywords: boolean
  onToggleKeywords: () => void
}
