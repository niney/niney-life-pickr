import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from 'shared/contexts';
import { useAuth } from 'shared/hooks';
import { THEME_COLORS } from 'shared/constants';

const SettingsScreen: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const colors = THEME_COLORS[theme];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* 사용자 정보 */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>사용자 정보</Text>
          {user && (
            <>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>이메일</Text>
                <Text style={[styles.value, { color: colors.text }]}>{user.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>사용자명</Text>
                <Text style={[styles.value, { color: colors.text }]}>{user.username}</Text>
              </View>
            </>
          )}
        </View>

        {/* 테마 설정 */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>테마 설정</Text>
          <TouchableOpacity style={styles.settingRow} onPress={toggleTheme}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>다크 모드</Text>
            <Text style={[styles.settingValue, { color: colors.primary }]}>
              {theme === 'dark' ? '켜짐' : '꺼짐'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 로그아웃 버튼 */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleLogout}
        >
          <Text style={[styles.logoutText, { color: '#ff4444' }]}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 15,
  },
  settingValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  logoutButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;
