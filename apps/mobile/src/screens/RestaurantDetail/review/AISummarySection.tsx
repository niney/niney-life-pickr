import React, { JSX } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { THEME_COLORS } from 'shared'
import { getSentimentColor } from '../utils/getSentimentColor'

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

interface AISummarySectionProps {
  summary: Summary
  reviewId: number
  expandedKeywords: Set<number>
  toggleKeywords: (reviewId: number) => void
  renderStars: (score: number, borderColor: string) => JSX.Element[]
  theme: 'light' | 'dark'
  colors: typeof THEME_COLORS['light']
  dynamicStyles: {
    summaryBorder: {
      backgroundColor: string
      borderColor: string
    }
  }
}

/**
 * AI Summary section component
 * Displays AI-generated review summary with sentiment, keywords, menu items, tips
 */
export const AISummarySection: React.FC<AISummarySectionProps> = ({
  summary,
  reviewId,
  expandedKeywords,
  toggleKeywords,
  renderStars,
  theme,
  colors,
  dynamicStyles,
}) => {
  // Sentiment configuration for menu items
  const sentimentConfig = {
    positive: {
      emoji: '😊',
      bgLight: '#c8e6c9',
      bgDark: '#2e5d2e',
      textLight: '#1b5e20',
      textDark: '#a5d6a7',
      borderLight: '#66bb6a',
      borderDark: '#4caf50',
    },
    negative: {
      emoji: '😞',
      bgLight: '#ffcdd2',
      bgDark: '#5d2e2e',
      textLight: '#b71c1c',
      textDark: '#ef9a9a',
      borderLight: '#ef5350',
      borderDark: '#e57373',
    },
    neutral: {
      emoji: '😐',
      bgLight: '#ffe0b2',
      bgDark: '#5d4a2e',
      textLight: '#e65100',
      textDark: '#ffcc80',
      borderLight: '#ff9800',
      borderDark: '#ffb74d',
    },
  }

  return (
    <View style={[styles.summaryContainer, dynamicStyles.summaryBorder]}>
      {/* Summary Header */}
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>🤖 AI 요약</Text>
        <View style={styles.sentimentBadge}>
          <Text
            style={[
              styles.sentimentText,
              { color: getSentimentColor(summary.sentiment) },
            ]}
          >
            {summary.sentiment === 'positive'
              ? '😊 긍정'
              : summary.sentiment === 'negative'
                ? '😞 부정'
                : '😐 중립'}
          </Text>
        </View>
      </View>

      {/* Summary Text */}
      <Text style={[styles.summaryText, { color: colors.text }]}>
        {summary.summary}
      </Text>

      {/* Key Keywords (Collapsible) */}
      {summary.keyKeywords.length > 0 && (
        <View style={styles.summaryKeywords}>
          <TouchableOpacity
            style={styles.keywordsToggleButton}
            onPress={() => toggleKeywords(reviewId)}
          >
            <Text
              style={[
                styles.summaryKeywordsTitle,
                { color: colors.textSecondary },
              ]}
            >
              핵심 키워드 {expandedKeywords.has(reviewId) ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {expandedKeywords.has(reviewId) && (
            <View style={styles.keywordsContainer}>
              {summary.keyKeywords.map((keyword: string, idx: number) => (
                <View key={idx} style={styles.summaryKeyword}>
                  <Text style={styles.summaryKeywordText}>{keyword}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Satisfaction Score */}
      {summary.satisfactionScore !== null && (
        <View style={styles.satisfactionScore}>
          <Text
            style={[styles.satisfactionLabel, { color: colors.textSecondary }]}
          >
            만족도:
          </Text>
          <View style={styles.scoreStars}>
            {renderStars(summary.satisfactionScore, colors.border)}
            <Text style={[styles.scoreNumber, { color: colors.text }]}>
              {summary.satisfactionScore}점
            </Text>
          </View>
        </View>
      )}

      {/* Menu Items */}
      {summary.menuItems && summary.menuItems.length > 0 && (
        <View style={styles.menuItemsSection}>
          <Text
            style={[styles.menuItemsTitle, { color: colors.textSecondary }]}
          >
            🍽️ 언급된 메뉴:
          </Text>
          <View style={styles.keywordsContainer}>
            {summary.menuItems.map((menuItem, idx: number) => {
              const config = sentimentConfig[menuItem.sentiment]
              const bgColor = theme === 'light' ? config.bgLight : config.bgDark
              const textColor =
                theme === 'light' ? config.textLight : config.textDark
              const borderColor =
                theme === 'light' ? config.borderLight : config.borderDark

              return (
                <View
                  key={idx}
                  style={[
                    styles.menuItemBadge,
                    { backgroundColor: bgColor, borderColor },
                  ]}
                >
                  <Text style={[styles.menuItemText, { color: textColor }]}>
                    <Text style={styles.fontSize13}>{config.emoji}</Text>{' '}
                    {menuItem.name}
                    {menuItem.reason && ` (${menuItem.reason})`}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {/* Tips */}
      {summary.tips.length > 0 && (
        <View style={styles.tipsSection}>
          <Text style={[styles.tipsTitle, { color: colors.textSecondary }]}>
            💡 팁:
          </Text>
          {summary.tips.map((tip: string, idx: number) => (
            <Text key={idx} style={[styles.tipText, { color: colors.text }]}>
              • {tip}
            </Text>
          ))}
        </View>
      )}

      {/* Sentiment Reason */}
      {summary.sentimentReason && (
        <View style={styles.sentimentReason}>
          <Text
            style={[
              styles.sentimentReasonLabel,
              { color: colors.textSecondary },
            ]}
          >
            감정 분석:
          </Text>
          <Text
            style={[styles.sentimentReasonText, { color: colors.text }]}
          >
            {summary.sentimentReason}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  summaryContainer: {
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366f1',
  },
  sentimentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  summaryKeywords: {
    marginTop: 8,
  },
  keywordsToggleButton: {
    paddingVertical: 4,
  },
  summaryKeywordsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  summaryKeyword: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 4,
  },
  summaryKeywordText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1976d2',
  },
  satisfactionScore: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  satisfactionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  scoreNumber: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  menuItemsSection: {
    marginTop: 8,
  },
  menuItemsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuItemBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1.5,
  },
  menuItemText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  fontSize13: {
    fontSize: 13,
  },
  tipsSection: {
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  sentimentReason: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  sentimentReasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  sentimentReasonText: {
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic',
  },
})
