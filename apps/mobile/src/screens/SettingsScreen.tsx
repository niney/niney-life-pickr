import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BlurView } from '@react-native-community/blur';
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
        {/* 글래스모피즘 사용자 정보 섹션 */}
        <View style={styles.cardContainer}>
          <BlurView
            style={styles.blurContainer}
            blurType={theme === 'dark' ? 'dark' : 'light'}
            blurAmount={20}
            reducedTransparencyFallbackColor={theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
          />
          <View style={styles.cardContent}>
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
        </View>

        {/* 글래스모피즘 테마 설정 섹션 */}
        <View style={styles.cardContainer}>
          <BlurView
            style={styles.blurContainer}
            blurType={theme === 'dark' ? 'dark' : 'light'}
            blurAmount={20}
            reducedTransparencyFallbackColor={theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
          />
          <View style={styles.cardContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>테마 설정</Text>
            <TouchableOpacity style={styles.settingRow} onPress={toggleTheme}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>다크 모드</Text>
              <Text style={[styles.settingValue, { color: colors.primary }]}>
                {theme === 'dark' ? '켜짐' : '꺼짐'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 글래스모피즘 로그아웃 버튼 */}
        <TouchableOpacity
          style={styles.logoutButtonContainer}
          onPress={handleLogout}
        >
          <BlurView
            style={styles.blurContainer}
            blurType={theme === 'dark' ? 'dark' : 'light'}
            blurAmount={20}
            reducedTransparencyFallbackColor={theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
          />
          <View style={styles.logoutButtonContent}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </View>
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
    paddingBottom: 100, // 하단 탭바 공간 확보
  },
  cardContainer: {
    overflow: 'hidden',
    borderRadius: 20,
    marginBottom: 16,
    // 글래스모피즘 효과
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardContent: {
    padding: 16,
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
  logoutButtonContainer: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  logoutButtonContent: {
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4444',
  },
});

export default SettingsScreen;
