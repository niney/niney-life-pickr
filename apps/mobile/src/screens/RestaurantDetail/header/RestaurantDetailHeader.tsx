import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, THEME_COLORS } from 'shared';

interface Restaurant {
  name: string;
  category?: string;
  address?: string;
}

interface RestaurantDetailHeaderProps {
  restaurant: Restaurant;
  menuCount: number;
  reviewCount: number;
}

const RestaurantDetailHeader: React.FC<RestaurantDetailHeaderProps> = ({
  restaurant,
  menuCount,
  reviewCount,
}) => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];

  const dynamicStyles = useMemo(() => ({
    card: {
      backgroundColor: theme === 'light' ? '#fff' : colors.surface,
      borderColor: colors.border,
    },
  }), [theme, colors]);

  return (
    <View style={styles.container}>
      <View style={[styles.card, dynamicStyles.card]}>
        <Text style={[styles.name, { color: colors.text }]}>
          {restaurant.name}
        </Text>
        {restaurant.category && (
          <Text style={[styles.category, { color: colors.textSecondary }]}>
            {restaurant.category}
          </Text>
        )}
        {restaurant.address && (
          <Text style={[styles.address, { color: colors.textSecondary }]}>
            {restaurant.address}
          </Text>
        )}
        <Text style={[styles.count, { color: colors.primary }]}>
          메뉴 {menuCount}개 · 리뷰 {reviewCount}개
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  category: {
    fontSize: 14,
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    marginBottom: 8,
  },
  count: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RestaurantDetailHeader;
