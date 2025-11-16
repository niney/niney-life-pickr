/**
 * Job Card 컴포넌트
 * Web/Mobile JobMonitor에서 공통으로 사용
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Job } from '../types';
import type { ThemeColors } from '../constants';
import { getTypeLabel, getPhaseLabel, getStatusColor, getStatusText } from '../utils';

export interface JobCardProps {
  job: Job;
  colors: ThemeColors;
  onRestaurantClick?: (restaurantId: number) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, colors, onRestaurantClick }) => {
  const handleRestaurantClick = () => {
    if (onRestaurantClick) {
      onRestaurantClick(job.restaurantId);
    }
  };

  return (
    <View
      style={[
        styles.jobCard,
        {
          backgroundColor: colors.surface,
          borderColor: job.isInterrupted ? '#f59e0b' : colors.border,
          borderLeftWidth: 4,
          borderLeftColor: getStatusColor(job, colors),
        },
      ]}
    >
      {/* 카드 헤더 */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={[styles.jobType, { color: colors.text }]}>
            {getTypeLabel(job.type)}
          </Text>
          <Text style={[styles.jobId, { color: colors.textSecondary }]}>
            #{job.jobId.slice(0, 8)}
          </Text>
        </View>
        <Text style={[styles.statusBadge, { color: getStatusColor(job, colors) }]}>
          {getStatusText(job)}
        </Text>
      </View>

      {/* 레스토랑 정보 */}
      <TouchableOpacity onPress={handleRestaurantClick}>
        <Text style={[styles.restaurantId, { color: colors.primary }]}>
          {job.restaurant?.name || `레스토랑 #${job.restaurantId}`}
        </Text>
      </TouchableOpacity>

      {/* 진행 상태 */}
      {job.status === 'active' && getPhaseLabel(job) !== '' && (
        <View style={styles.phaseContainer}>
          <Text style={[styles.phaseText, { color: colors.textSecondary }]}>
            {getPhaseLabel(job)}
          </Text>
        </View>
      )}

      {/* 진행률 */}
      {job.progress.total > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              진행률
            </Text>
            <Text style={[styles.progressText, { color: colors.text }]}>
              {job.progress.percentage}% ({job.progress.current}/{job.progress.total})
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${job.progress.percentage}%`,
                  backgroundColor: getStatusColor(job, colors),
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* 에러 메시지 */}
      {job.error && (
        <View style={[styles.errorContainer, { backgroundColor: '#fee2e2' }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {job.error}
          </Text>
        </View>
      )}

      {/* 타임스탬프 */}
      <View style={styles.timestamps}>
        {job.startedAt && (
          <View style={styles.timestampItem}>
            <Text style={[styles.timestampLabel, { color: colors.textSecondary }]}>
              시작
            </Text>
            <Text style={[styles.timestampValue, { color: colors.text }]}>
              {new Date(job.startedAt).toLocaleString('ko-KR', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}
        {job.completedAt && (
          <View style={styles.timestampItem}>
            <Text style={[styles.timestampLabel, { color: colors.textSecondary }]}>
              완료
            </Text>
            <Text style={[styles.timestampValue, { color: colors.text }]}>
              {new Date(job.completedAt).toLocaleString('ko-KR', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  jobCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobType: {
    fontSize: 16,
    fontWeight: '600',
  },
  jobId: {
    fontSize: 12,
  },
  statusBadge: {
    fontSize: 14,
    fontWeight: '500',
  },
  restaurantId: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  phaseContainer: {
    marginBottom: 8,
  },
  phaseText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  progressSection: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 4,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
  },
  timestamps: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  timestampItem: {
    flex: 1,
  },
  timestampLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  timestampValue: {
    fontSize: 12,
    fontWeight: '500',
  },
});
