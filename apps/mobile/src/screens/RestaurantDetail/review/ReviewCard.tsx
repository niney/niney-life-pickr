import React from 'react';
import { View, Text, StyleSheet } from 'react-native'
import { THEME_COLORS } from 'shared'
import { ReviewHeader } from './ReviewHeader'
import { ReviewImages } from './ReviewImages'
import { AISummarySection } from './AISummarySection'

interface VisitInfo {
  visitDate?: string
  visitCount?: string
  verificationMethod?: string
}

interface MenuItem {
  name: string
  sentiment: 'positive' | 'negative' | 'neutral'
  reason?: string
}

interface Summary {
  sentiment: 'positive' | 'negative' | 'neutral'
  summary: string
  keyKeywords: string[]
  satisfactionScore: number | null
  menuItems?: MenuItem[]
  tips: string[]
  sentimentReason?: string
}

interface Review {
  id: number
  userName?: string
  visitInfo: VisitInfo
  visitKeywords: string[]
  reviewText?: string
  images: string[]
  summary?: Summary
  emotionKeywords: string[]
  waitTime?: string
}

interface ReviewCardProps {
  review: Review
  theme: 'light' | 'dark'
  colors: typeof THEME_COLORS['light']
  dynamicStyles: {
    summaryBorder: {
      backgroundColor: string
      borderColor: string
    }
  }
  expandedKeywords: Set<number>
  toggleKeywords: (reviewId: number) => void
  renderStars: (score: number, borderColor: string) => React.ReactElement[]
  handleImagePress: (images: string[], index: number) => void
  openResummaryModal: (reviewId: number) => void
}

/**
 * Single review card component
 * Composes ReviewHeader, ReviewImages, and AISummarySection
 *
 * ⚡ 성능 최적화: React.memo 적용
 */
const ReviewCardComponent: React.FC<ReviewCardProps> = ({
  review,
  theme,
  colors,
  dynamicStyles,
  expandedKeywords,
  toggleKeywords,
  renderStars,
  handleImagePress,
  openResummaryModal,
}) => {
  return (
    <View
      style={[
        styles.reviewCardContainer,
        theme === 'dark' ? styles.reviewCardDark : styles.reviewCardLight,
      ]}
    >
      <View style={styles.reviewCardContent}>
        {/* Review Header */}
        <ReviewHeader
          review={review}
          colors={colors}
          onResummaryPress={openResummaryModal}
        />

        {/* Visit Keywords */}
        {review.visitKeywords.length > 0 && (
          <View style={styles.keywordsContainer}>
            {review.visitKeywords.map((keyword: string, idx: number) => (
              <View
                key={idx}
                style={[styles.keyword, { backgroundColor: colors.border }]}
              >
                <Text style={[styles.keywordText, { color: colors.text }]}>
                  {keyword}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Review Text */}
        {review.reviewText && (
          <Text style={[styles.reviewText, { color: colors.text }]}>
            {review.reviewText}
          </Text>
        )}

        {/* Review Images */}
        <ReviewImages
          images={review.images}
          onImagePress={handleImagePress}
        />

        {/* AI Summary Section */}
        {review.summary && (
          <AISummarySection
            summary={review.summary}
            reviewId={review.id}
            expandedKeywords={expandedKeywords}
            toggleKeywords={toggleKeywords}
            renderStars={renderStars}
            theme={theme}
            colors={colors}
            dynamicStyles={dynamicStyles}
          />
        )}

        {/* Emotion Keywords */}
        {review.emotionKeywords.length > 0 && (
          <View style={styles.keywordsContainer}>
            {review.emotionKeywords.map((keyword: string, idx: number) => (
              <View
                key={idx}
                style={[styles.emotionKeyword, styles.emotionKeywordBg]}
              >
                <Text
                  style={[styles.keywordText, styles.emotionKeywordColor]}
                >
                  {keyword}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Visit Info Footer */}
        <View style={styles.visitInfo}>
          {review.visitInfo.visitCount && (
            <Text
              style={[styles.visitInfoText, { color: colors.textSecondary }]}
            >
              {review.visitInfo.visitCount}
            </Text>
          )}
          {review.visitInfo.verificationMethod && (
            <Text
              style={[styles.visitInfoText, { color: colors.textSecondary }]}
            >
              • {review.visitInfo.verificationMethod}
            </Text>
          )}
          {review.waitTime && (
            <Text
              style={[styles.visitInfoText, { color: colors.textSecondary }]}
            >
              • {review.waitTime}
            </Text>
          )}
        </View>
      </View>
    </View>
  )
}

export const ReviewCard = React.memo(ReviewCardComponent)

const styles = StyleSheet.create({
  reviewCardContainer: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    paddingVertical: 16,
  },
  reviewCardLight: {
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: 'transparent',
  },
  reviewCardDark: {
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'transparent',
  },
  reviewCardContent: {
    paddingVertical: 4,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  keyword: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  emotionKeyword: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  keywordText: {
    fontSize: 12,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  visitInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  visitInfoText: {
    fontSize: 12,
  },
  emotionKeywordBg: {
    backgroundColor: '#e3f2fd',
  },
  emotionKeywordColor: {
    color: '#1976d2',
  },
})
