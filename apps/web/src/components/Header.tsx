import React, { useState } from 'react';
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
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const colors = THEME_COLORS[theme];

  return (
    <View style={[styles.container, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
      {/* Left: Hamburger Menu */}
      <TouchableOpacity style={styles.iconButton} onPress={onMenuPress}>
        <View style={styles.hamburger}>
          <View style={[styles.hamburgerLine, { backgroundColor: colors.headerText }]} />
          <View style={[styles.hamburgerLine, { backgroundColor: colors.headerText }]} />
          <View style={[styles.hamburgerLine, { backgroundColor: colors.headerText }]} />
        </View>
      </TouchableOpacity>

      {/* Center: Title */}
      <View style={styles.centerContainer}>
        <Text style={[styles.title, { color: colors.headerText }]}>Life Pickr</Text>
      </View>

      {/* Right: Theme Toggle & Profile */}
      <View style={styles.rightContainer}>
        {/* Theme Toggle Button */}
        <TouchableOpacity style={styles.iconButton} onPress={toggleTheme}>
          <Text style={styles.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>

        {/* Profile Button */}
        {user && (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setShowProfileMenu(!showProfileMenu)}
          >
            <View style={[styles.profileCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.profileInitial}>
                {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Dropdown Menu */}
      {showProfileMenu && user && (
        <View style={[styles.profileMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{user.username}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user.email}</Text>
          </View>
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.menuItem}>
            <Text style={[styles.menuItemText, { color: colors.text }]}>프로필</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={[styles.menuItemText, { color: colors.text }]}>설정</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    position: 'relative',
    zIndex: 100,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburger: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: '100%',
    height: 2,
    borderRadius: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeIcon: {
    fontSize: 20,
  },
  profileButton: {
    marginLeft: 4,
  },
  profileCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileMenu: {
    position: 'absolute',
    top: HEADER_HEIGHT + 4,
    right: 16,
    width: 240,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileInfo: {
    padding: 16,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  menuDivider: {
    height: 1,
  },
  menuItem: {
    padding: 16,
  },
  menuItemText: {
    fontSize: 14,
  },
});

export default Header;
