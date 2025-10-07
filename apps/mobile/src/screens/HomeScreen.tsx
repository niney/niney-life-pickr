import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from 'shared/contexts';
import { useAuth } from 'shared/hooks';
import { THEME_COLORS } from 'shared/constants';

const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const colors = THEME_COLORS[theme];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* 글래스모피즘 Welcome Card */}
        <View style={[styles.cardContainer, styles.welcomeCard]}>
          <BlurView
            style={styles.blurContainer}
            blurType={theme === 'dark' ? 'dark' : 'light'}
            blurAmount={20}
            reducedTransparencyFallbackColor={theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
          />
          <View style={styles.cardContent}>
            <Text style={[styles.title, { color: colors.text }]}>환영합니다! 👋</Text>
            {user && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {user.username}님
              </Text>
            )}
          </View>
        </View>

        {/* 글래스모피즘 Stats Card */}
        <View style={[styles.cardContainer, styles.statsCard]}>
          <BlurView
            style={styles.blurContainer}
            blurType={theme === 'dark' ? 'dark' : 'light'}
            blurAmount={20}
            reducedTransparencyFallbackColor={theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
          />
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>통계</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>0</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>저장한 맛집</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>0</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>방문 완료</Text>
              </View>
            </View>
          </View>
        </View>
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
    padding: 24,
  },
  welcomeCard: {
    minHeight: 120,
  },
  statsCard: {
    minHeight: 160,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
});

export default HomeScreen;
