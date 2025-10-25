import { ViewStyle } from 'react-native'

/**
 * Get color based on sentiment type
 */
export const getSentimentColor = (sentiment: string): string => {
  if (sentiment === 'positive') return '#4caf50'
  if (sentiment === 'negative') return '#f44336'
  return '#ff9800' // neutral
}

/**
 * Get badge style based on sentiment
 */
export const getSentimentBadgeStyle = (sentiment: string): ViewStyle => ({
  backgroundColor: getSentimentColor(sentiment),
})
