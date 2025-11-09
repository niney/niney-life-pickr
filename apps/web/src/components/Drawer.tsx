import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@shared/contexts';
import { useAuth } from '@shared/hooks';
import { THEME_COLORS } from '@shared/constants';

interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const Drawer: React.FC<DrawerProps> = ({ visible, onClose, onLogout }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  const colors = THEME_COLORS[theme];

  const handleNavigation = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleLogout = () => {
    onClose();
    onLogout();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.drawer, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.drawerTitle, { color: colors.text }]}>메뉴</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* User Info */}
          {user && (
            <View style={[styles.userSection, { borderBottomColor: colors.border }]}>
              <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.userAvatarText}>
                  {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>{user.username}</Text>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
              </View>
            </View>
          )}

          {/* Menu Items */}
          <View style={styles.menuItems}>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('/')}>
              <Text style={[styles.menuItemIcon, { color: colors.text }]}>🏠</Text>
              <Text style={[styles.menuItemText, { color: colors.text }]}>홈</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('/restaurant')}>
              <Text style={[styles.menuItemIcon, { color: colors.text }]}>🍴</Text>
              <Text style={[styles.menuItemText, { color: colors.text }]}>맛집</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('/restaurant-search')}>
              <Text style={[styles.menuItemIcon, { color: colors.text }]}>🔍</Text>
              <Text style={[styles.menuItemText, { color: colors.text }]}>맛집 검색</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Text style={[styles.menuItemIcon, { color: colors.text }]}>👤</Text>
              <Text style={[styles.menuItemText, { color: colors.text }]}>프로필</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Text style={[styles.menuItemIcon, { color: colors.text }]}>⚙️</Text>
              <Text style={[styles.menuItemText, { color: colors.text }]}>설정</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Text style={[styles.menuItemIcon, { color: colors.text }]}>ℹ️</Text>
              <Text style={[styles.menuItemText, { color: colors.text }]}>정보</Text>
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.logoutButton, { backgroundColor: colors.error }]}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  drawer: {
    width: 240,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '300',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
  },
  menuItems: {
    flex: 1,
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  menuItemIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 20,
  },
  menuItemText: {
    fontSize: 14,
  },
  footer: {
    padding: 12,
  },
  logoutButton: {
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default Drawer;
