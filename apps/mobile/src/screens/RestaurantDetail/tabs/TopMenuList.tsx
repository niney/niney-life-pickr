import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Top menu item data structure
 */
interface TopMenu {
  menuName: string;
  positiveRate?: number;
  negativeRate?: number;
  mentions: number;
  positive: number;
  negative: number;
  neutral: number;
}

interface TopMenuListProps {
  menus: TopMenu[];
  type: 'positive' | 'negative';
  colors: any;
}

/**
 * Top 5 menu list component
 *
 * Displays ranked list of top menus by positive or negative rate
 *
 * @param menus - Array of top menu items (max 5)
 * @param type - Type of ranking ('positive' for top rated, 'negative' for worst rated)
 * @param colors - Theme colors object
 *
 * @example
 * ```tsx
 * <TopMenuList
 *   menus={menuStatistics.topPositiveMenus}
 *   type="positive"
 *   colors={colors}
 * />
 *
 * <TopMenuList
 *   menus={menuStatistics.topNegativeMenus}
 *   type="negative"
 *   colors={colors}
 * />
 * ```
 */
export const TopMenuList: React.FC<TopMenuListProps> = ({
  menus,
  type,
  colors,
}) => {
  const isPositive = type === 'positive';
  const badgeStyle = isPositive ? styles.successBadgeBg : styles.errorBadgeBg;

  return (
    <View style={styles.statisticsCard}>
      <Text style={[styles.statisticsCardTitle, { color: colors.text }]}>
        {isPositive ? '👍 긍정 평가 TOP 5' : '👎 주의할 메뉴 (부정률 높음)'}
      </Text>
      <View style={styles.topMenusList}>
        {menus.map((menu, index) => (
          <View key={index} style={styles.topMenuItem}>
            <View style={[styles.topMenuRank, badgeStyle]}>
              <Text style={styles.topMenuRankText}>{index + 1}</Text>
            </View>
            <View style={styles.topMenuInfo}>
              <Text style={[styles.topMenuName, { color: colors.text }]}>{menu.menuName}</Text>
              <Text style={[styles.topMenuStats, { color: colors.textSecondary }]}>
                {isPositive
                  ? `긍정률 ${menu.positiveRate}% • ${menu.mentions}회 언급`
                  : `부정률 ${menu.negativeRate}% • ${menu.mentions}회 언급`
                }
              </Text>
              <Text style={[styles.topMenuStats, styles.marginTop2, styles.fontSize11, { color: colors.textSecondary }]}>
                😊 {menu.positive} · 😞 {menu.negative} · 😐 {menu.neutral}
              </Text>
            </View>
          </View>
        ))}
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
  topMenusList: {
    gap: 8,
  },
  topMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  topMenuRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topMenuRankText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  topMenuInfo: {
    flex: 1,
  },
  topMenuName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  topMenuStats: {
    fontSize: 12,
  },
  marginTop2: {
    marginTop: 2,
  },
  fontSize11: {
    fontSize: 11,
  },
  successBadgeBg: {
    backgroundColor: '#4caf50',
  },
  errorBadgeBg: {
    backgroundColor: '#f44336',
  },
});
