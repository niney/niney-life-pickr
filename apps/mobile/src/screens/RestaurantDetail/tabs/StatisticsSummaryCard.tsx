import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Menu statistics summary data
 */
interface MenuStatistics {
  totalReviews: number;
  analyzedReviews: number;
  menuStatistics: any[];
}

interface StatisticsSummaryCardProps {
  menuStatistics: MenuStatistics;
  colors: any;
}

/**
 * Statistics summary card component
 *
 * Displays high-level statistics:
 * - Total reviews
 * - Analyzed reviews
 * - Number of menus mentioned
 *
 * @param menuStatistics - Menu statistics data
 * @param colors - Theme colors object
 *
 * @example
 * ```tsx
 * <StatisticsSummaryCard
 *   menuStatistics={menuStatistics}
 *   colors={colors}
 * />
 * ```
 */
export const StatisticsSummaryCard: React.FC<StatisticsSummaryCardProps> = ({
  menuStatistics,
  colors,
}) => {
  return (
    <View style={styles.statisticsCard}>
      <Text style={[styles.statisticsCardTitle, { color: colors.text }]}>📊 전체 요약</Text>
      <View style={styles.statisticsSummary}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>전체 리뷰</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{menuStatistics.totalReviews}개</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>분석된 리뷰</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{menuStatistics.analyzedReviews}개</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>언급된 메뉴</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{menuStatistics.menuStatistics.length}개</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statisticsCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  statisticsCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  statisticsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});
