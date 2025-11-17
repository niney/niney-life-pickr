import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, useSocket } from 'shared/contexts';
import { THEME_COLORS } from 'shared/constants';
import { getDefaultApiUrl } from 'shared/services';
import { getTypeLabel, getPhaseLabel, getStatusColor, getStatusText, getQueueStatusColor, getQueueStatusText, getQueueTypeLabel } from 'shared/utils';
import type { RootTabParamList, RestaurantStackParamList } from '../navigation/types';

// JobMonitor는 Tab에 있고, Restaurant Detail은 Restaurant Stack에 있음
type JobMonitorNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'JobMonitor'>,
  NativeStackNavigationProp<RestaurantStackParamList>
>;

// Shared config에서 API URL 가져오기
const SOCKET_URL = getDefaultApiUrl();

/**
 * JobMonitorScreen - Mobile
 * 실시간 Job 진행 상황 모니터링
 */
const JobMonitorScreen: React.FC = () => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];
  const navigation = useNavigation<JobMonitorNavigationProp>();

  // ==================== Socket Context ====================

  const {
    isConnected: socketConnected,
    jobs,
    jobsLoading: isLoading,
    queueItems,
    queueStats,
    refreshJobs,
  } = useSocket();

  // ==================== Pull-to-Refresh ====================

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshJobs();
    // 1초 후 refreshing 상태 해제 (시각적 피드백)
    setTimeout(() => setRefreshing(false), 1000);
  }, [refreshJobs]);

  const handleCancelQueue = async (queueId: string) => {
    try {
      const response = await fetch(`${SOCKET_URL}/api/crawler/queue/${queueId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        console.error('[JobMonitor] Failed to cancel queue:', error);
      }
    } catch (error) {
      console.error('[JobMonitor] Failed to cancel queue:', error);
    }
  };

  /**
   * 레스토랑 상세 화면으로 이동
   * CommonActions를 사용하여 스택 구조를 명시적으로 재구성
   * RestaurantList를 스택에 포함시켜 뒤로가기 지원
   * restaurant 객체를 함께 전달하여 헤더명이 즉시 표시되도록 함
   */
  const handleOpenRestaurant = useCallback((
    restaurantId: number,
    restaurant?: { id: number; name: string; category: string | null; address: string | null }
  ) => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Restaurant',
            state: {
              routes: [
                { name: 'RestaurantList' },
                {
                  name: 'RestaurantDetail',
                  params: {
                    restaurantId,
                    restaurant: restaurant,
                  },
                },
              ],
              index: 1,
            },
          },
        ],
      })
    );
  }, [navigation]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Job 목록 로딩 중...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.content}>
        {/* 연결 상태 */}
        <View style={styles.statusCardContainer}>
          <BlurView
            style={styles.blurContainer}
            blurType={theme === 'dark' ? 'dark' : 'light'}
            blurAmount={20}
            reducedTransparencyFallbackColor={theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
          />
          <View style={styles.statusContent}>
            <View style={styles.statusRow}>
              <Text style={[
                styles.connectionStatusText,
                { color: socketConnected ? colors.success : colors.error }
              ]}>
                {socketConnected ? '🟢 실시간 연결' : '🔴 연결 끊김'}
              </Text>
              <Text style={[styles.jobCount, { color: colors.text }]}>
                실행 중 {jobs.length}개 | 대기열 {queueStats.total}개
              </Text>
            </View>
          </View>
        </View>

        {/* 대기열 섹션 */}
        {queueItems.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📋 대기열 ({queueStats.waiting} 대기 / {queueStats.processing} 처리 중)
            </Text>

            {queueItems.map(item => (
              <View key={item.queueId} style={styles.cardContainer}>
                <BlurView
                  style={styles.blurContainer}
                  blurType={theme === 'dark' ? 'dark' : 'light'}
                  blurAmount={20}
                  reducedTransparencyFallbackColor={theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
                />
                <View style={[styles.cardContent, styles.cardBorderLeft, { borderLeftColor: getQueueStatusColor(item.queueStatus, colors) }]}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.typeLabel, { color: colors.text }]}>
                      {getQueueTypeLabel(item.type)}
                    </Text>
                    <Text style={[styles.statusBadge, { color: getQueueStatusColor(item.queueStatus, colors) }]}>
                      {getQueueStatusText(item)}
                    </Text>
                  </View>
                  <Text style={[styles.queueId, { color: colors.textSecondary }]}>
                    #{item.queueId.slice(0, 8)}
                  </Text>
                  <TouchableOpacity onPress={() => handleOpenRestaurant(item.restaurantId, item.restaurant)}>
                    <Text style={[styles.restaurantId, { color: colors.primary }]}>
                      {item.restaurant?.name || `레스토랑 #${item.restaurantId}`}
                    </Text>
                  </TouchableOpacity>
                  {item.error && (
                    <Text style={[styles.errorText, styles.errorTextRed]}>
                      ❌ {item.error}
                    </Text>
                  )}
                  {item.queueStatus === 'waiting' && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => handleCancelQueue(item.queueId)}
                    >
                      <Text style={styles.cancelButtonText}>취소</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        {/* 실행 중 Job 섹션 */}
        <Text style={[
          styles.sectionTitle,
          { color: colors.text },
          queueItems.length > 0 && styles.sectionTitleWithMargin
        ]}>
          ▶️ 실행 중 Job ({jobs.length})
        </Text>

        {jobs.map(job => (
          <View key={job.jobId} style={styles.cardContainer}>
            <BlurView
              style={styles.blurContainer}
              blurType={theme === 'dark' ? 'dark' : 'light'}
              blurAmount={20}
              reducedTransparencyFallbackColor={theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
            />
            <View style={[styles.cardContent, styles.cardBorderLeft, { borderLeftColor: getStatusColor(job, colors) }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.typeLabel, { color: colors.text }]}>
                  {getTypeLabel(job.type)}
                </Text>
                <Text style={[styles.statusBadge, { color: getStatusColor(job, colors) }]}>
                  {getStatusText(job)}
                </Text>
              </View>
              <Text style={[styles.jobId, { color: colors.textSecondary }]}>
                #{job.jobId.slice(0, 8)}
              </Text>
              <TouchableOpacity onPress={() => handleOpenRestaurant(job.restaurantId, job.restaurant)}>
                <Text style={[styles.restaurantId, { color: colors.primary }]}>
                  {job.restaurant?.name || `레스토랑 #${job.restaurantId}`}
                </Text>
              </TouchableOpacity>
              {job.status === 'active' && getPhaseLabel(job) && (
                <Text style={[styles.phaseText, { color: colors.textSecondary }]}>
                  {getPhaseLabel(job)}
                </Text>
              )}
              {job.progress.total > 0 && (
                <View style={styles.progressSection}>
                  <Text style={[styles.progressText, { color: colors.text }]}>
                    {job.progress.percentage}% ({job.progress.current}/{job.progress.total})
                  </Text>
                  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${job.progress.percentage}%`,
                          backgroundColor: getStatusColor(job, colors)
                        }
                      ]}
                    />
                  </View>
                </View>
              )}
              {job.error && (
                <Text style={[styles.errorText, styles.errorTextRed]}>
                  ❌ {job.error}
                </Text>
              )}
            </View>
          </View>
        ))}

        {/* 빈 상태 */}
        {jobs.length === 0 && queueItems.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              실행 중인 Job과 대기 중인 작업이 없습니다
            </Text>
          </View>
        )}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  statusCardContainer: {
    overflow: 'hidden',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  statusContent: {
    padding: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  connectionStatusText: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionTitleWithMargin: {
    marginTop: 24,
  },
  cardContainer: {
    overflow: 'hidden',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  cardContent: {
    padding: 16,
  },
  cardBorderLeft: {
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    fontSize: 14,
    fontWeight: '600',
  },
  jobId: {
    fontSize: 12,
    marginBottom: 4,
  },
  queueId: {
    fontSize: 12,
    marginBottom: 4,
  },
  restaurantId: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  phaseText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  progressSection: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  errorText: {
    fontSize: 13,
    marginTop: 8,
  },
  errorTextRed: {
    color: '#ef4444',
  },
  cancelButton: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});

export default JobMonitorScreen;
