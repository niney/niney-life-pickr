import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, THEME_COLORS } from 'shared';

export type TabType = 'menu' | 'review' | 'statistics' | 'map';

interface TabMenuProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  menuCount: number;
  reviewCount: number;
}

const TabMenu: React.FC<TabMenuProps> = ({
  activeTab,
  onTabChange,
  menuCount,
  reviewCount,
}) => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => onTabChange('menu')}
        >
          <Text
            style={[
              styles.buttonText,
              { color: activeTab === 'menu' ? colors.primary : colors.textSecondary }
            ]}
          >
            메뉴 {menuCount > 0 && `(${menuCount})`}
          </Text>
          {activeTab === 'menu' && (
            <View style={[styles.indicator, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => onTabChange('review')}
        >
          <Text
            style={[
              styles.buttonText,
              { color: activeTab === 'review' ? colors.primary : colors.textSecondary }
            ]}
          >
            리뷰 ({reviewCount})
          </Text>
          {activeTab === 'review' && (
            <View style={[styles.indicator, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => onTabChange('statistics')}
        >
          <Text
            style={[
              styles.buttonText,
              { color: activeTab === 'statistics' ? colors.primary : colors.textSecondary }
            ]}
          >
            📊 통계
          </Text>
          {activeTab === 'statistics' && (
            <View style={[styles.indicator, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => onTabChange('map')}
        >
          <Text
            style={[
              styles.buttonText,
              { color: activeTab === 'map' ? colors.primary : colors.textSecondary }
            ]}
          >
            🗺️ 네이버맵
          </Text>
          {activeTab === 'map' && (
            <View style={[styles.indicator, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 7,
  },
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 0,
    backgroundColor: 'transparent',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
});

export default TabMenu;
