import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@shared/contexts';
import { THEME_COLORS } from '@shared/constants';
import type { QueuedJob } from '../types';

interface QueueCardProps {
  item: QueuedJob;
  onCancel?: (queueId: string) => void;
}

export const QueueCard: React.FC<QueueCardProps> = ({ item, onCancel }) => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];

  const getStatusColor = () => {
    switch (item.queueStatus) {
      case 'waiting':
        return colors.textSecondary;
      case 'processing':
        return colors.primary;
      case 'completed':
        return '#22c55e'; // green
      case 'failed':
        return '#ef4444'; // red
      case 'cancelled':
        return '#94a3b8'; // gray
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = () => {
    switch (item.queueStatus) {
      case 'waiting':
        return `대기 중 (${item.position}번째)`;
      case 'processing':
        return '처리 중';
      case 'completed':
        return '완료';
      case 'failed':
        return '실패';
      case 'cancelled':
        return '취소됨';
      default:
        return item.queueStatus;
    }
  };

  const getTypeLabel = () => {
    switch (item.type) {
      case 'review_crawl':
        return '리뷰 크롤링';
      case 'review_summary':
        return '리뷰 요약';
      case 'restaurant_crawl':
        return '레스토랑 크롤링';
      default:
        return item.type;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderLeftColor: getStatusColor(),
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.typeLabel, { color: colors.text }]}>
            {getTypeLabel()}
          </Text>
          <Text style={[styles.queueId, { color: colors.textSecondary }]}>
            #{item.queueId.slice(0, 8)}
          </Text>
        </View>
        <Text style={[styles.statusBadge, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>

      {/* Restaurant Info */}
      <TouchableOpacity
        onPress={() => window.open(`/restaurant/${item.restaurantId}`, '_blank')}
        style={styles.restaurantInfo}
      >
        <Text style={[styles.restaurantLabel, { color: colors.textSecondary }]}>
          레스토랑
        </Text>
        <Text style={[styles.restaurantId, { color: colors.primary }]}>
          #{item.restaurantId} →
        </Text>
      </TouchableOpacity>

      {/* Job ID (if started) */}
      {item.jobId && (
        <View style={styles.jobIdContainer}>
          <Text style={[styles.jobIdLabel, { color: colors.textSecondary }]}>
            Job ID:
          </Text>
          <Text style={[styles.jobIdValue, { color: colors.text }]}>
            {item.jobId.slice(0, 8)}
          </Text>
        </View>
      )}

      {/* Timestamps */}
      <View style={styles.timestamps}>
        <View style={styles.timestampRow}>
          <Text style={[styles.timestampLabel, { color: colors.textSecondary }]}>
            추가:
          </Text>
          <Text style={[styles.timestampValue, { color: colors.text }]}>
            {formatDate(item.queuedAt)}
          </Text>
        </View>
        {item.startedAt && (
          <View style={styles.timestampRow}>
            <Text style={[styles.timestampLabel, { color: colors.textSecondary }]}>
              시작:
            </Text>
            <Text style={[styles.timestampValue, { color: colors.text }]}>
              {formatDate(item.startedAt)}
            </Text>
          </View>
        )}
        {item.completedAt && (
          <View style={styles.timestampRow}>
            <Text style={[styles.timestampLabel, { color: colors.textSecondary }]}>
              완료:
            </Text>
            <Text style={[styles.timestampValue, { color: colors.text }]}>
              {formatDate(item.completedAt)}
            </Text>
          </View>
        )}
      </View>

      {/* Error Message */}
      {item.error && (
        <View style={[styles.errorContainer, { backgroundColor: '#fef2f2' }]}>
          <Text style={[styles.errorText, { color: '#ef4444' }]}>
            ❌ {item.error}
          </Text>
        </View>
      )}

      {/* Cancel Button (waiting 상태만) */}
      {item.queueStatus === 'waiting' && onCancel && (
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: '#ef4444' }]}
          onPress={() => onCancel(item.queueId)}
        >
          <Text style={[styles.cancelButtonText, { color: '#ef4444' }]}>
            취소
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    margin: 12,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  queueId: {
    fontSize: 12,
  },
  statusBadge: {
    fontSize: 14,
    fontWeight: '600',
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  restaurantLabel: {
    fontSize: 13,
  },
  restaurantId: {
    fontSize: 14,
    fontWeight: '500',
  },
  jobIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  jobIdLabel: {
    fontSize: 12,
  },
  jobIdValue: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  timestamps: {
    marginTop: 8,
    gap: 4,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timestampLabel: {
    fontSize: 12,
    width: 40,
  },
  timestampValue: {
    fontSize: 12,
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
  },
  cancelButton: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
