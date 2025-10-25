import React from 'react'
import { StyleSheet } from 'react-native'
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faStar, faStarHalfStroke } from '@fortawesome/free-solid-svg-icons'
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons'

/**
 * Render star rating from 0-100 score
 * Converts to 1-5 stars with half-star support
 *
 * @param score - Score from 0-100
 * @param borderColor - Color for empty stars
 */
export const renderStars = (score: number, borderColor: string) => {
  const normalizedScore = score / 20 // 0-100 → 0-5

  return [1, 2, 3, 4, 5].map((position) => {
    const diff = normalizedScore - position + 1
    let icon: any
    let color = '#ffc107' // Gold

    if (diff >= 0.75) {
      icon = faStar // Filled star
    } else if (diff >= 0.25) {
      icon = faStarHalfStroke // Half star
    } else {
      icon = farStar // Empty star
      color = borderColor // Gray
    }

    return (
      <FontAwesomeIcon
        key={position}
        icon={icon}
        size={16}
        color={color}
        style={styles.marginRight2}
      />
    )
  })
}

const styles = StyleSheet.create({
  marginRight2: {
    marginRight: 2,
  },
})
