import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { THEME_COLORS } from 'shared'

interface ReviewHeaderProps {
  review: {
    userName?: string
    visitInfo: {
      visitDate?: string
    }
    id: number
  }
  colors: typeof THEME_COLORS['light']
  onResummaryPress: (reviewId: number) => void
}

/**
 * Review card header component
 * Displays user name, visit date, and resummary button
 *
 * ⚡ 성능 최적화: React.memo 적용
 */
const ReviewHeaderComponent: React.FC<ReviewHeaderProps> = ({
  review,
  colors,
  onResummaryPress,
}) => {
  return (
    <View style={styles.reviewCardHeader}>
      <View style={styles.flex1}>
        <Text style={[styles.reviewUserName, { color: colors.text }]}>
          {review.userName || '익명'}
        </Text>
        {review.visitInfo.visitDate && (
          <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
            {review.visitInfo.visitDate}
          </Text>
        )}
      </View>
      {/* 재요약 버튼 - 항상 표시 */}
      <TouchableOpacity
        style={styles.resummaryButton}
        onPress={() => onResummaryPress(review.id)}
      >
        <Text style={styles.resummaryButtonText}>🔄 재요약</Text>
      </TouchableOpacity>
    </View>
  )
}

export const ReviewHeader = React.memo(ReviewHeaderComponent)

const styles = StyleSheet.create({
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  flex1: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 15,
    fontWeight: '600',
  },
  reviewDate: {
    fontSize: 12,
  },
  resummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
  },
  resummaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9c27b0',
  },
})
