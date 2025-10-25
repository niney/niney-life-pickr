import React from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { THEME_COLORS } from 'shared'
import { ReviewCard } from '../review/ReviewCard'

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

interface ReviewTabProps {
  reviews: Review[]
  reviewsLoading: boolean
  reviewsLoadingMore: boolean
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
  renderStars: (score: number, borderColor: string) => JSX.Element[]
  handleImagePress: (images: string[], index: number) => void
  openResummaryModal: (reviewId: number) => void
}

/**
 * Review tab component
 * Displays list of review cards with loading states
 */
export const ReviewTab: React.FC<ReviewTabProps> = ({
  reviews,
  reviewsLoading,
  reviewsLoadingMore,
  theme,
  colors,
  dynamicStyles,
  expandedKeywords,
  toggleKeywords,
  renderStars,
  handleImagePress,
  openResummaryModal,
}) => {
  // Skeleton loading UI
  if (reviewsLoading && reviews.length === 0) {
    return (
      <View style={styles.paddingHorizontal16}>
        <View style={styles.reviewsList}>
        {[1, 2, 3].map((index) => (
          <View
            key={`skeleton-${index}`}
            style={[
              styles.reviewCardContainer,
              styles.skeletonCard,
              theme === 'dark'
                ? styles.reviewCardDark
                : styles.reviewCardLight,
            ]}
          >
            <View style={styles.reviewCardContent}>
              {/* 헤더 스켈레톤 */}
              <View style={styles.reviewCardHeader}>
                <View style={styles.flex1}>
                  <View
                    style={[
                      styles.skeletonLine,
                      styles.skeletonShort,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <View
                    style={[
                      styles.skeletonLine,
                      styles.skeletonTiny,
                      styles.marginTop4,
                      { backgroundColor: colors.border },
                    ]}
                  />
                </View>
              </View>

              {/* 텍스트 스켈레톤 */}
              <View
                style={[
                  styles.skeletonLine,
                  styles.skeletonFull,
                  styles.marginTop12,
                  { backgroundColor: colors.border },
                ]}
              />
              <View
                style={[
                  styles.skeletonLine,
                  styles.skeletonFull,
                  styles.marginTop8,
                  { backgroundColor: colors.border },
                ]}
              />
              <View
                style={[
                  styles.skeletonLine,
                  styles.skeletonMedium,
                  styles.marginTop8,
                  { backgroundColor: colors.border },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
      </View>
    )
  }

  // Reviews list
  if (reviews.length > 0) {
    return (
      <View style={styles.paddingHorizontal16}>
        <View style={styles.reviewsList}>
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              theme={theme}
              colors={colors}
              dynamicStyles={dynamicStyles}
              expandedKeywords={expandedKeywords}
              toggleKeywords={toggleKeywords}
              renderStars={renderStars}
              handleImagePress={handleImagePress}
              openResummaryModal={openResummaryModal}
            />
          ))}
        </View>

        {/* Footer loading indicator */}
        {reviewsLoadingMore && (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text
              style={[
                styles.footerLoaderText,
                { color: colors.textSecondary },
              ]}
            >
              리뷰 불러오는 중...
            </Text>
          </View>
        )}
      </View>
    )
  }

  // Empty state
  return (
    <View style={styles.paddingHorizontal16}>
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          등록된 리뷰가 없습니다
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  paddingHorizontal16: {
    paddingHorizontal: 16,
  },
  reviewsList: {
    // gap 제거 - borderBottom으로 구분
  },
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
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  flex1: {
    flex: 1,
  },
  // Skeleton UI styles
  skeletonCard: {
    opacity: 0.6,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
  skeletonTiny: {
    width: '30%',
  },
  skeletonShort: {
    width: '40%',
  },
  skeletonMedium: {
    width: '60%',
  },
  skeletonFull: {
    width: '100%',
  },
  marginTop4: {
    marginTop: 4,
  },
  marginTop8: {
    marginTop: 8,
  },
  marginTop12: {
    marginTop: 12,
  },
  // Footer loader
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoaderText: {
    fontSize: 13,
    marginTop: 8,
  },
  // Empty state
  emptyContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
})
