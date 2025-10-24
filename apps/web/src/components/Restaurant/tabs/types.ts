// 통계 탭 관련 타입 정의

export interface TopMenu {
  menuName: string
  positiveRate?: number
  negativeRate?: number
  mentions: number
  positive: number
  negative: number
  neutral: number
}

export interface MenuStat {
  menuName: string
  sentiment: 'positive' | 'negative' | 'neutral'
  positiveRate: number
  mentions: number
  positive: number
  negative: number
  neutral: number
  totalMentions: number
  topReasons: {
    positive: string[]
    negative: string[]
  }
}

export interface MenuStatistics {
  totalReviews: number
  analyzedReviews: number
  topPositiveMenus: TopMenu[]
  topNegativeMenus: TopMenu[]
  menuStatistics: MenuStat[]
}
