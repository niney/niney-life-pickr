import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { RestaurantReviewStatistics } from 'shared';

interface ReviewStatisticsCardProps {
  statistics: RestaurantReviewStatistics;
  colors: any;
}

export const ReviewStatisticsCard: React.FC<ReviewStatisticsCardProps> = ({ statistics, colors }) => {

  const { totalReviews, analyzedReviews, positive, negative, neutral, positiveRate, negativeRate, neutralRate } = statistics;

  // 비율 바 계산
  const maxRate = Math.max(positiveRate, negativeRate, neutralRate);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>💬 리뷰 감정 분석</Text>

      {/* 요약 정보 */}
      <View style={styles.summary}>
        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
          전체 {totalReviews}개 중 {analyzedReviews}개 분석 완료
        </Text>
      </View>

      {/* 긍정 */}
      <View style={styles.statRow}>
        <View style={styles.labelContainer}>
          <Text style={styles.emoji}>😊</Text>
          <Text style={[styles.label, { color: colors.text }]}>긍정</Text>
        </View>
        <View style={styles.barContainer}>
          <View
            style={[
              styles.bar,
              styles.positiveBar,
              { width: `${(positiveRate / maxRate) * 100}%` },
            ]}
          />
        </View>
        <View style={styles.valueContainer}>
          <Text style={[styles.count, { color: colors.text }]}>{positive}개</Text>
          <Text style={[styles.rate, { color: '#4CAF50' }]}>{positiveRate}%</Text>
        </View>
      </View>

      {/* 중립 */}
      <View style={styles.statRow}>
        <View style={styles.labelContainer}>
          <Text style={styles.emoji}>😐</Text>
          <Text style={[styles.label, { color: colors.text }]}>중립</Text>
        </View>
        <View style={styles.barContainer}>
          <View
            style={[
              styles.bar,
              styles.neutralBar,
              { width: `${(neutralRate / maxRate) * 100}%` },
            ]}
          />
        </View>
        <View style={styles.valueContainer}>
          <Text style={[styles.count, { color: colors.text }]}>{neutral}개</Text>
          <Text style={[styles.rate, { color: '#FF9800' }]}>{neutralRate}%</Text>
        </View>
      </View>

      {/* 부정 */}
      <View style={styles.statRow}>
        <View style={styles.labelContainer}>
          <Text style={styles.emoji}>😞</Text>
          <Text style={[styles.label, { color: colors.text }]}>부정</Text>
        </View>
        <View style={styles.barContainer}>
          <View
            style={[
              styles.bar,
              styles.negativeBar,
              { width: `${(negativeRate / maxRate) * 100}%` },
            ]}
          />
        </View>
        <View style={styles.valueContainer}>
          <Text style={[styles.count, { color: colors.text }]}>{negative}개</Text>
          <Text style={[styles.rate, { color: '#F44336' }]}>{negativeRate}%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  summary: {
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 70,
    gap: 6,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    height: 24,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 12,
  },
  positiveBar: {
    backgroundColor: '#4CAF50',
  },
  neutralBar: {
    backgroundColor: '#FF9800',
  },
  negativeBar: {
    backgroundColor: '#F44336',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 100,
  },
  count: {
    fontSize: 13,
    fontWeight: '500',
  },
  rate: {
    fontSize: 15,
    fontWeight: '700',
  },
});
