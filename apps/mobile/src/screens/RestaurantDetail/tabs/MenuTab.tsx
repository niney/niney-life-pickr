import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { getDefaultApiUrl } from 'shared';

/**
 * Menu item data structure
 */
interface Menu {
  name: string;
  price: string;
  description?: string;
  image?: string;
}

interface MenuTabProps {
  menus: Menu[];
  menusLoading: boolean;
  theme: 'light' | 'dark';
  colors: any;
}

/**
 * Menu tab component displaying menu items in a 2-column grid
 *
 * @param menus - Array of menu items to display
 * @param menusLoading - Loading state for menus
 * @param theme - Current theme ('light' | 'dark')
 * @param colors - Theme colors object
 *
 * @example
 * ```tsx
 * <MenuTab
 *   menus={menus}
 *   menusLoading={menusLoading}
 *   theme={theme}
 *   colors={colors}
 * />
 * ```
 */
export const MenuTab: React.FC<MenuTabProps> = ({
  menus,
  menusLoading,
  theme,
  colors,
}) => {
  if (menusLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (menus.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 메뉴가 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.paddingHorizontal16}>
      <View style={styles.menuSection}>
        <View style={styles.menusGrid}>
          {menus.map((menu, index) => (
            <View
              key={index}
              style={[
                styles.menuCardContainer,
                theme === 'dark' ? styles.menuCardDark : styles.menuCardLight,
              ]}
            >
              <View style={styles.menuCardContent}>
                <View style={styles.menuInfo}>
                  <Text style={[styles.menuName, { color: colors.text }]} numberOfLines={2}>{menu.name}</Text>
                  <Text style={[styles.menuPrice, styles.marginTop4, { color: colors.primary }]}>{menu.price}</Text>
                  {menu.description && (
                    <Text style={[styles.menuDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                      {menu.description}
                    </Text>
                  )}
                </View>
              </View>
              {menu.image && (
                <Image
                  source={{ uri: `${getDefaultApiUrl()}${menu.image}` }}
                  style={styles.menuImage}
                  resizeMode="cover"
                />
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  paddingHorizontal16: {
    paddingHorizontal: 16,
  },
  menuSection: {
    marginBottom: 16,
  },
  menusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuCardContainer: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    width: '48%', // 2-column grid (gap 12px considered)
  },
  menuCardLight: {
    borderColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: '#fff',
  },
  menuCardDark: {
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuCardContent: {
    paddingVertical: 0,
    flexDirection: 'column',
  },
  menuInfo: {
    flex: 1,
  },
  menuImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
  },
  menuName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  menuPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  marginTop4: {
    marginTop: 4,
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
