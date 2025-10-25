import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Menu statistic item data structure
 */
interface MenuStat {
  menuName: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  positive: number;
  negative: number;
  neutral: number;
  positiveRate: number;
  topReasons: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
}

interface MenuStatItemProps {
  menu: MenuStat;
  index: number;
  colors: any;
  getSentimentBadgeStyle: (sentiment: string) => any;
}

/**
 * Individual menu statistic item component
 *
 * Displays detailed statistics for a single menu:
 * - Menu name and overall sentiment
 * - Positive/Negative/Neutral counts and positive rate
 * - Top reasons for each sentiment
 *
 * @param menu - Menu statistic data
 * @param index - Index in the list (for key purposes)
 * @param colors - Theme colors object
 * @param getSentimentBadgeStyle - Function to get badge style for sentiment
 *
 * @example
 * ```tsx
 * <MenuStatItem
 *   menu={menuStat}
 *   index={0}
 *   colors={colors}
 *   getSentimentBadgeStyle={(sentiment) => ({
 *     backgroundColor: sentiment === 'positive' ? '#4caf50' : '#f44336'
 *   })}
 * />
 * ```
 */
export const MenuStatItem: React.FC<MenuStatItemProps> = ({
  menu,
  colors,
  getSentimentBadgeStyle,
}) => {
  // Combine all reasons with emoji prefixes
  const allReasons = [
    ...menu.topReasons.positive.map((r: string) => `👍 ${r}`),
    ...menu.topReasons.negative.map((r: string) => `👎 ${r}`),
    ...menu.topReasons.neutral.map((r: string) => `😐 ${r}`)
  ];

  return (
    <View style={styles.menuStatItem}>
      {/* Header: Menu name + sentiment badge */}
      <View style={styles.menuStatHeader}>
        <Text style={[styles.menuStatName, { color: colors.text }]}>{menu.menuName}</Text>
        <View style={[
          styles.menuStatBadge,
          getSentimentBadgeStyle(menu.sentiment)
        ]}>
          <Text style={styles.menuStatBadgeText}>
            {menu.sentiment === 'positive' ? '😊 긍정' : menu.sentiment === 'negative' ? '😞 부정' : '😐 중립'}
          </Text>
        </View>
      </View>

      {/* Counts: Positive, Negative, Neutral, Positive Rate */}
      <View style={styles.menuStatCounts}>
        <View style={styles.menuStatCount}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>긍정</Text>
          <Text style={styles.successTextBold}>{menu.positive}</Text>
        </View>
        <View style={styles.menuStatCount}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>부정</Text>
          <Text style={styles.errorTextBold}>{menu.negative}</Text>
        </View>
        <View style={styles.menuStatCount}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>중립</Text>
          <Text style={styles.warningTextBold}>{menu.neutral}</Text>
        </View>
        <View style={styles.menuStatCount}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>긍정률</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{menu.positiveRate}%</Text>
        </View>
      </View>

      {/* Top reasons list */}
      {allReasons.length > 0 && (
        <View style={styles.menuStatReasons}>
          <Text style={[styles.summaryLabel, styles.marginBottom4, { color: colors.textSecondary }]}>주요 이유:</Text>
          {allReasons.map((reason: string, idx: number) => (
            <Text key={idx} style={[styles.menuStatReason, { color: colors.text }]}>
              • {reason}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  menuStatItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  menuStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  menuStatName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  menuStatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  menuStatBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  menuStatCounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  menuStatCount: {
    alignItems: 'center',
  },
  menuStatReasons: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  menuStatReason: {
    fontSize: 12,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  marginBottom4: {
    marginBottom: 4,
  },
  successTextBold: {
    color: '#4caf50',
    fontWeight: '600',
  },
  errorTextBold: {
    color: '#f44336',
    fontWeight: '600',
  },
  warningTextBold: {
    color: '#ff9800',
    fontWeight: '600',
  },
});
