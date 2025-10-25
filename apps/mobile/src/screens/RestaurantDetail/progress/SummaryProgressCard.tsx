import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, THEME_COLORS, ProgressIndicator } from 'shared';

interface ProgressData {
  current: number;
  total: number;
  percentage: number;
  completed: number;
  failed: number;
}

interface SummaryProgressCardProps {
  summaryProgress: ProgressData | null;
}

const SummaryProgressCard: React.FC<SummaryProgressCardProps> = ({
  summaryProgress,
}) => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];

  const dynamicStyles = useMemo(() => ({
    card: {
      backgroundColor: theme === 'light' ? '#fff' : colors.surface,
      borderColor: colors.border,
    },
  }), [theme, colors]);

  if (!summaryProgress) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.card, dynamicStyles.card]}>
        <Text style={[styles.title, { color: colors.text }]}>
          🤖 AI 리뷰 요약 중...
        </Text>

        <ProgressIndicator
          label="요약 진행"
          current={summaryProgress.current}
          total={summaryProgress.total}
          percentage={summaryProgress.percentage}
          color="#9c27b0"
        />

        <View style={styles.stats}>
          <Text style={[styles.stat, styles.successColor]}>
            ✓ 완료: {summaryProgress.completed}
          </Text>
          {summaryProgress.failed > 0 && (
            <Text style={[styles.stat, styles.errorColor]}>
              ✗ 실패: {summaryProgress.failed}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  stat: {
    fontSize: 13,
    fontWeight: '500',
  },
  successColor: {
    color: '#4caf50',
  },
  errorColor: {
    color: '#f44336',
  },
});

export default SummaryProgressCard;
