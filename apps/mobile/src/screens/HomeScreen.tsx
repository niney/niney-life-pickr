import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
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
        <View style={[styles.welcomeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>환영합니다! 👋</Text>
          {user && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {user.username}님
            </Text>
          )}
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
  welcomeCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  statsCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
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
