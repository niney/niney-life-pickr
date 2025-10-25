import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatisticsSummaryCard } from './StatisticsSummaryCard';
import { TopMenuList } from './TopMenuList';
import { MenuStatItem } from './MenuStatItem';

/**
 * Menu statistics data structure
 */
interface MenuStatistics {
  totalReviews: number;
  analyzedReviews: number;
  menuStatistics: any[];
  topPositiveMenus: any[];
  topNegativeMenus: any[];
}

interface StatisticsTabProps {
  menuStatistics: MenuStatistics | null;
  statisticsLoading: boolean;
  colors: any;
}

/**
 * Statistics tab component
 *
 * Displays comprehensive menu statistics:
 * 1. Summary card - Total reviews, analyzed reviews, menu count
 * 2. Top 5 positive menus - Highest positive rate
 * 3. Top 5 negative menus - Highest negative rate (menus to avoid)
 * 4. All menus statistics - Detailed stats for each menu
 *
 * @param menuStatistics - Menu statistics data
 * @param statisticsLoading - Loading state
 * @param colors - Theme colors object
 * @param theme - Current theme ('light' | 'dark')
 *
 * @example
 * ```tsx
 * <StatisticsTab
 *   menuStatistics={menuStatistics}
 *   statisticsLoading={statisticsLoading}
 *   colors={colors}
 * />
 * ```
 */
export const StatisticsTab: React.FC<StatisticsTabProps> = ({
  menuStatistics,
  statisticsLoading,
  colors,
}) => {
  /**
   * Get sentiment badge background color style
   */
  const getSentimentBadgeStyle = (sentiment: string) => ({
    backgroundColor: sentiment === 'positive' ? '#4caf50' : sentiment === 'negative' ? '#f44336' : '#ff9800'
  });

  if (statisticsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!menuStatistics) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>통계 데이터가 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.paddingHorizontal16}>
      <View style={styles.statisticsContainer}>
        {/* 1. Summary Card */}
        <StatisticsSummaryCard
          menuStatistics={menuStatistics}
          colors={colors}
        />

        {/* 2. Top Positive Menus (TOP 5) */}
        {menuStatistics.topPositiveMenus.length > 0 && (
          <TopMenuList
            menus={menuStatistics.topPositiveMenus}
            type="positive"
            colors={colors}
          />
        )}

        {/* 3. Top Negative Menus (TOP 5) */}
        {menuStatistics.topNegativeMenus.length > 0 && (
          <TopMenuList
            menus={menuStatistics.topNegativeMenus}
            type="negative"
            colors={colors}
          />
        )}

        {/* 4. All Menus Statistics */}
        <View style={styles.statisticsCard}>
          <Text style={[styles.statisticsCardTitle, { color: colors.text }]}>📝 전체 메뉴 통계</Text>
          <View style={styles.allMenusList}>
            {menuStatistics.menuStatistics.map((menu: any, index: number) => (
              <MenuStatItem
                key={index}
                menu={menu}
                index={index}
                colors={colors}
                getSentimentBadgeStyle={getSentimentBadgeStyle}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  paddingHorizontal16: {
    paddingHorizontal: 16,
  },
  statisticsContainer: {
    marginBottom: 16,
  },
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
  allMenusList: {
    gap: 12,
  },
  loadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
