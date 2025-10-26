import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import type { ReviewData } from '@shared/services'
import ReviewHeader from './ReviewHeader'
import ReviewImages from './ReviewImages'
import AISummarySection from './AISummarySection'

interface ReviewCardProps {
  review: ReviewData
  expandedKeywords: Set<number>
  onResummary: (reviewId: number) => void
  onToggleKeywords: (reviewId: number) => void
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  expandedKeywords,
  onResummary,
  onToggleKeywords,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme === 'light' ? '#fff' : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* 헤더 */}
      <ReviewHeader
        userName={review.userName ?? '익명'}
        visitDate={review.visitInfo.visitDate ?? undefined}
        onResummary={() => onResummary(review.id)}
      />

      {/* 방문 키워드 */}
      {review.visitKeywords.length > 0 && (
        <View style={styles.keywordsContainer}>
          {review.visitKeywords.map((keyword: string, idx: number) => (
            <View
              key={idx}
              style={[
                styles.keyword,
                {
                  backgroundColor: theme === 'light' ? '#f0f0f0' : colors.border,
                },
              ]}
            >
              <span style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>
                {keyword}
              </span>
            </View>
          ))}
        </View>
      )}

      {/* 리뷰 텍스트 */}
      {review.reviewText && (
        <div
          style={{
            fontSize: 15,
            lineHeight: '22px',
            marginBottom: 12,
            color: colors.text,
          }}
        >
          {review.reviewText}
        </div>
      )}

      {/* 리뷰 이미지 */}
      <ReviewImages images={review.images} />

      {/* AI 요약 */}
      {review.summary && (
        <AISummarySection
          summary={review.summary}
          expandedKeywords={expandedKeywords.has(review.id)}
          onToggleKeywords={() => onToggleKeywords(review.id)}
        />
      )}

      {/* 감정 키워드 */}
      {review.emotionKeywords.length > 0 && (
        <View style={styles.keywordsContainer}>
          {review.emotionKeywords.map((keyword: string, idx: number) => (
            <View key={idx} style={[styles.emotionKeyword, { backgroundColor: '#e3f2fd' }]}>
              <span style={{ fontSize: 13, fontWeight: '500', color: '#1976d2' }}>{keyword}</span>
            </View>
          ))}
        </View>
      )}

      {/* 방문 정보 */}
      <View style={styles.visitInfo}>
        {review.visitInfo.visitCount && (
          <span style={{ fontSize: 13, color: colors.textSecondary }}>
            {review.visitInfo.visitCount}
          </span>
        )}
        {review.visitInfo.verificationMethod && (
          <span style={{ fontSize: 13, color: colors.textSecondary }}>
            • {review.visitInfo.verificationMethod}
          </span>
        )}
        {review.waitTime && (
          <span style={{ fontSize: 13, color: colors.textSecondary }}>• {review.waitTime}</span>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  keyword: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  emotionKeyword: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  visitInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
})

export default ReviewCard
