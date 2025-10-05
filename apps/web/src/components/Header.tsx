import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@shared/contexts';
import { useAuth } from '@shared/hooks';
import { THEME_COLORS, HEADER_HEIGHT } from '@shared/constants';

interface HeaderProps {
  onMenuPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuPress }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const colors = THEME_COLORS[theme];

  return (
    <View style={[styles.container, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
      {/* 햄버거 메뉴 */}
      <TouchableOpacity style={styles.iconButton} onPress={onMenuPress}>
        <Text style={[styles.icon, { color: colors.headerText }]}>☰</Text>
      </TouchableOpacity>

      {/* 타이틀 */}
      <Text style={[styles.title, { color: colors.headerText }]}>Life Pickr</Text>

      <View style={styles.spacer} />

      {/* 테마 토글 */}
      <TouchableOpacity style={styles.iconButton} onPress={toggleTheme}>
        <Text style={styles.icon}>{isDark ? '☀️' : '🌙'}</Text>
      </TouchableOpacity>

      {/* 프로필 */}
      {user && (
        <TouchableOpacity style={styles.iconButton} onPress={onMenuPress}>
          <View style={[styles.profileCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.profileText}>
              {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  spacer: {
    flex: 1,
  },
  profileCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default Header;
