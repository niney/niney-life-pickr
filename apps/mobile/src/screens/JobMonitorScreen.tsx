import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { io, Socket } from 'socket.io-client';
import { useTheme } from 'shared/contexts';
import { THEME_COLORS, SOCKET_CONFIG } from 'shared/constants';
import { getDefaultApiUrl } from 'shared/services';
import { SocketSequenceManager, JobCompletionTracker } from 'shared/utils';
import type {
  ProgressEventData,
  CompletionEventData,
  ErrorEventData,
  CancellationEventData,
  JobNewEventData,
  MenuProgressEventData,
} from 'shared/types';
import type { RootTabParamList, RestaurantStackParamList } from '../navigation/types';

// JobMonitor는 Tab에 있고, Restaurant Detail은 Restaurant Stack에 있음
type JobMonitorNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'JobMonitor'>,
  NativeStackNavigationProp<RestaurantStackParamList>
>;

// Shared config에서 API URL 가져오기
const SOCKET_URL = getDefaultApiUrl();

/**
 * Job 데이터 타입
 */
interface Job {
  jobId: string;
  restaurantId: number;
  restaurant?: {
    id: number;
    name: string;
    category: string | null;
    address: string | null;
  };
  type: 'review_crawl' | 'review_summary' | 'restaurant_crawl';
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  isInterrupted: boolean;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  metadata?: Record<string, string | number | boolean>;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface QueuedJob {
  queueId: string;
  jobId: string | null;
  type: 'review_crawl' | 'review_summary' | 'restaurant_crawl';
  restaurantId: number;
  metadata: Record<string, string | number | boolean>;
  queueStatus: 'waiting' | 'processing' | 'completed' | 'failed' | 'cancelled';
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  position?: number;
}

interface QueueStats {
  total: number;
  waiting: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
}

/**
 * JobMonitorScreen - Mobile
 * 실시간 Job 진행 상황 모니터링
 */
const JobMonitorScreen: React.FC = () => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];
  const navigation = useNavigation<JobMonitorNavigationProp>();

  // Job State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [subscribedRooms, setSubscribedRooms] = useState<Set<number>>(new Set());

  // Queue State
  const [queueItems, setQueueItems] = useState<QueuedJob[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total: 0,
    waiting: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  });

  // 공통 유틸 인스턴스
  const sequenceManagerRef = useRef<SocketSequenceManager>(new SocketSequenceManager());
  const completionTrackerRef = useRef<JobCompletionTracker>(new JobCompletionTracker(5));

  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  /**
   * Pull-to-Refresh 핸들러
   * Socket으로 최신 Job 및 Queue 상태를 다시 가져옴
   */
  const onRefresh = useCallback(async () => {
    if (!socket || !socketConnected) return;

    setRefreshing(true);

    try {
      // Job 리스트 다시 조회
      socket.emit('subscribe:all_jobs');

      // Queue 리스트 다시 조회
      socket.emit('subscribe:queue');

      // 1초 후 refreshing 종료 (Socket 이벤트 수신 대기)
      setTimeout(() => {
        setRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error('[JobMonitor] Refresh failed:', error);
      setRefreshing(false);
    }
  }, [socket, socketConnected]);

  /**
   * 진행률 이벤트로 Job 생성
   */
  const createJobFromProgress = useCallback((
    data: ProgressEventData | MenuProgressEventData,
    type: Job['type'],
    additionalMetadata?: Record<string, string | number>
  ): Job => {
    return {
      jobId: data.jobId,
      restaurantId: data.restaurantId,
      type,
      status: 'active',
      isInterrupted: false,
      progress: {
        current: data.current || 0,
        total: data.total || 0,
        percentage: data.percentage || 0
      },
      metadata: additionalMetadata || {},
      createdAt: new Date(data.timestamp || Date.now()).toISOString(),
      startedAt: new Date(data.timestamp || Date.now()).toISOString()
    };
  }, []);

  /**
   * Progress 이벤트 공통 핸들러
   */
  const handleProgressEvent = useCallback((
    data: ProgressEventData | MenuProgressEventData,
    jobType: Job['type'],
    metadata?: Record<string, string | number>
  ) => {
    const sequence = data.sequence || data.current || 0;
    if (!sequenceManagerRef.current.check(data.jobId, sequence)) return;

    setJobs(prev => {
      const existingJob = prev.find(job => job.jobId === data.jobId);
      
      if (!existingJob) {
        return [createJobFromProgress(data, jobType, metadata), ...prev];
      }
      
      return prev.map(job =>
        job.jobId === data.jobId
          ? {
              ...job,
              progress: {
                current: data.current,
                total: data.total,
                percentage: data.percentage
              },
              metadata: { ...job.metadata, ...metadata }
            }
          : job
      );
    });

    // 완료 처리
    if (data.percentage === 100 || data.current === data.total) {
      setTimeout(() => {
        setJobs(prev => prev.map(job =>
          job.jobId === data.jobId && job.status === 'active'
            ? { ...job, status: 'completed', completedAt: new Date().toISOString() }
            : job
        ));
        sequenceManagerRef.current.reset(data.jobId);
      }, 3000);
    }
  }, [createJobFromProgress]);

  /**
   * 완료 이벤트 공통 핸들러
   */
  const handleCompletionEvent = useCallback((data: CompletionEventData) => {
    sequenceManagerRef.current.reset(data.jobId);
    setJobs(prev => prev.map(job =>
      job.jobId === data.jobId
        ? {
            ...job,
            status: 'completed',
            completedAt: new Date(data.timestamp).toISOString()
          }
        : job
    ));
  }, []);

  /**
   * 에러 이벤트 공통 핸들러
   */
  const handleErrorEvent = useCallback((data: ErrorEventData) => {
    sequenceManagerRef.current.reset(data.jobId);
    setJobs(prev => prev.map(job =>
      job.jobId === data.jobId
        ? { ...job, status: 'failed', error: data.error }
        : job
    ));
  }, []);

  /**
   * 취소 이벤트 공통 핸들러
   */
  const handleCancellationEvent = useCallback((data: CancellationEventData) => {
    sequenceManagerRef.current.reset(data.jobId);
    setJobs(prev => prev.map(job =>
      job.jobId === data.jobId
        ? { ...job, status: 'cancelled' }
        : job
    ));
  }, []);

  /**
   * Socket 연결 및 이벤트 리스너 등록
   */
  useEffect(() => {
    console.log('[JobMonitor] Socket 연결 시도...');

    const newSocket = io(SOCKET_URL, SOCKET_CONFIG as any);

    newSocket.on('connect', () => {
      console.log('[JobMonitor] Socket 연결 성공');
      setSocketConnected(true);
      setIsLoading(false);

      // 연결 후 즉시 데이터 조회
      newSocket.emit('subscribe:all_jobs');
      newSocket.emit('subscribe:queue');
    });

    // jobs:current_state - 초기 Job 리스트 수신
    newSocket.on('jobs:current_state', (data: {
      total: number;
      jobs: Job[];
      restaurantIds: number[];
      timestamp: number;
    }) => {
      console.log('[JobMonitor] 초기 Job 리스트 수신:', data);
      setJobs(data.jobs);

      // 모든 레스토랑 Room 구독
      data.restaurantIds.forEach((restaurantId) => {
        if (!subscribedRooms.has(restaurantId)) {
          newSocket.emit('subscribe:restaurant', restaurantId);
          setSubscribedRooms(prev => new Set(prev).add(restaurantId));
        }
      });
    });

    // jobs:error - Job 로딩 실패
    newSocket.on('jobs:error', (error: { message: string; error: string }) => {
      console.error('[JobMonitor] Job 로딩 실패:', error);
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('[JobMonitor] Socket 연결 끊김:', reason);
      setSocketConnected(false);

      // 의도치 않은 끊김이면 재연결 시도
      if (reason === 'io server disconnect') {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          if (socketRef.current && !socketRef.current.connected) {
            console.log('[JobMonitor] Socket 재연결 시도...');
            socketRef.current.connect();
          }
        }, 1000);
      }
    });

    // 재연결 이벤트
    newSocket.on('reconnect', (attemptNumber: number) => {
      console.log('[JobMonitor] Socket 재연결 성공:', attemptNumber);
      // 재연결 후 데이터 갱신
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('subscribe:all_jobs');
        socketRef.current.emit('subscribe:queue');
      }
    });

    newSocket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('[JobMonitor] Socket 재연결 시도:', attemptNumber);
    });

    newSocket.on('reconnect_error', (error: Error) => {
      console.error('[JobMonitor] Socket 재연결 실패:', error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('[JobMonitor] Socket 재연결 완전 실패');
      setSocketConnected(false);
    });

    // job:new - 새 Job 시작 알림
    newSocket.on('job:new', (data: JobNewEventData) => {
      setSubscribedRooms(prev => {
        if (prev.has(data.restaurantId)) return prev;
        newSocket.emit('subscribe:restaurant', data.restaurantId);
        const newSet = new Set(prev);
        newSet.add(data.restaurantId);
        return newSet;
      });
    });

    // Progress 이벤트 - 공통 핸들러 사용
    newSocket.on('review:crawl_progress', (data: ProgressEventData) => {
      handleProgressEvent(data, 'review_crawl', { phase: 'crawl' });
    });

    newSocket.on('review:db_progress', (data: ProgressEventData) => {
      handleProgressEvent(data, 'review_crawl', { phase: 'db' });
    });

    newSocket.on('review:image_progress', (data: ProgressEventData) => {
      handleProgressEvent(data, 'review_crawl', { phase: 'image' });
    });

    // 완료/에러/취소 이벤트 - 공통 핸들러 사용
    newSocket.on('review:completed', handleCompletionEvent);
    newSocket.on('review:error', handleErrorEvent);
    newSocket.on('review:cancelled', handleCancellationEvent);

    // Summary 이벤트 - 공통 핸들러 사용
    newSocket.on('review_summary:progress', (data: ProgressEventData) => {
      handleProgressEvent(data, 'review_summary');
    });

    newSocket.on('review_summary:completed', handleCompletionEvent);
    newSocket.on('review_summary:error', handleErrorEvent);

    // Restaurant 이벤트 - 공통 핸들러 사용
    newSocket.on('restaurant:menu_progress', (data: MenuProgressEventData) => {
      handleProgressEvent(data, 'restaurant_crawl', data.metadata);
    });

    // Queue 이벤트
    newSocket.on('queue:current_state', (data: {
      total: number;
      queue: QueuedJob[];
      stats: QueueStats;
      timestamp: number;
    }) => {
      setQueueItems(data.queue);
      setQueueStats(data.stats);
    });

    newSocket.on('queue:job_added', () => {
      newSocket.emit('subscribe:queue');
    });

    newSocket.on('queue:job_started', (data: { queueId: string }) => {
      setQueueItems(prev => prev.map(item =>
        item.queueId === data.queueId
          ? { ...item, queueStatus: 'processing' as const, startedAt: new Date().toISOString() }
          : item
      ));
    });

    newSocket.on('queue:job_completed', (data: { queueId: string }) => {
      setQueueItems(prev => prev.filter(item => item.queueId !== data.queueId));
      setQueueStats(prev => ({
        ...prev,
        processing: Math.max(0, prev.processing - 1),
      }));
    });

    newSocket.on('queue:job_failed', (data: { queueId: string; error: string }) => {
      setQueueItems(prev => prev.map(item =>
        item.queueId === data.queueId
          ? {
              ...item,
              queueStatus: 'failed' as const,
              completedAt: new Date().toISOString(),
              error: data.error,
            }
          : item
      ));

      setTimeout(() => {
        setQueueItems(prev => prev.filter(item => item.queueId !== data.queueId));
        setQueueStats(prev => ({
          ...prev,
          processing: Math.max(0, prev.processing - 1),
        }));
      }, 3000);
    });

    newSocket.on('queue:job_cancelled', (data: { queueId: string }) => {
      setQueueItems(prev => prev.filter(item => item.queueId !== data.queueId));
      setQueueStats(prev => ({
        ...prev,
        waiting: Math.max(0, prev.waiting - 1),
      }));
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      newSocket.emit('unsubscribe:all_jobs');
      newSocket.close();
      socketRef.current = null;
    };
  }, [handleProgressEvent, handleCompletionEvent, handleErrorEvent, handleCancellationEvent]);

  /**
   * UI 헬퍼 함수
   */
  const getTypeLabel = (type: Job['type']) => {
    switch (type) {
      case 'review_crawl': return '리뷰 크롤링';
      case 'review_summary': return '리뷰 요약';
      case 'restaurant_crawl': return '레스토랑 크롤링';
      default: return type;
    }
  };

  const getPhaseLabel = (job: Job) => {
    if (job.type === 'review_crawl') {
      const phase = job.metadata?.phase;
      if (phase === 'crawl') return '웹 크롤링 중';
      if (phase === 'db') return 'DB 저장 중';
      if (phase === 'image') return '이미지 다운로드 중';
    }
    if (job.type === 'review_summary') return 'AI 요약 생성 중';
    if (job.type === 'restaurant_crawl') {
      const step = job.metadata?.step;
      const substep = job.metadata?.substep;
      if (step === 'crawling') return '웹 크롤링 중';
      if (step === 'menu') {
        if (substep === 'normalizing') return '메뉴 정규화 중';
        if (substep === 'saving') return 'DB 저장 중';
        return '메뉴 처리 중';
      }
      return '레스토랑 정보 수집 중';
    }
    return '';
  };

  const getStatusColor = (job: Job) => {
    if (job.isInterrupted) return '#f59e0b';
    switch (job.status) {
      case 'active': return colors.primary;
      case 'completed': return colors.success;
      case 'failed': return colors.error;
      case 'cancelled': return colors.textSecondary;
      default: return colors.text;
    }
  };

  const getStatusText = (job: Job) => {
    if (job.isInterrupted) return '⚠️ 중단됨';
    switch (job.status) {
      case 'active': return '▶ 실행 중';
      case 'completed': return '✅ 완료';
      case 'failed': return '❌ 실패';
      case 'cancelled': return '🚫 취소됨';
      default: return job.status;
    }
  };

  const getQueueStatusColor = (status: QueuedJob['queueStatus']) => {
    switch (status) {
      case 'waiting': return colors.textSecondary;
      case 'processing': return colors.primary;
      case 'completed': return '#22c55e';
      case 'failed': return '#ef4444';
      case 'cancelled': return '#94a3b8';
      default: return colors.textSecondary;
    }
  };

  const getQueueStatusText = (item: QueuedJob) => {
    switch (item.queueStatus) {
      case 'waiting': return `대기 중 (${item.position}번째)`;
      case 'processing': return '처리 중';
      case 'completed': return '완료';
      case 'failed': return '실패';
      case 'cancelled': return '취소됨';
      default: return item.queueStatus;
    }
  };

  const getQueueTypeLabel = (type: QueuedJob['type']) => {
    switch (type) {
      case 'review_crawl': return '리뷰 크롤링';
      case 'review_summary': return '리뷰 요약';
      case 'restaurant_crawl': return '레스토랑 크롤링';
      default: return type;
    }
  };

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
              <Text style={{ color: socketConnected ? '#22c55e' : '#ef4444' }}>
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
                <View style={[styles.cardContent, { borderLeftColor: getQueueStatusColor(item.queueStatus), borderLeftWidth: 4 }]}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.typeLabel, { color: colors.text }]}>
                      {getQueueTypeLabel(item.type)}
                    </Text>
                    <Text style={[styles.statusBadge, { color: getQueueStatusColor(item.queueStatus) }]}>
                      {getQueueStatusText(item)}
                    </Text>
                  </View>
                  <Text style={[styles.queueId, { color: colors.textSecondary }]}>
                    #{item.queueId.slice(0, 8)}
                  </Text>
                  <TouchableOpacity onPress={() => handleOpenRestaurant(item.restaurantId)}>
                    <Text style={[styles.restaurantId, { color: colors.primary }]}>
                      레스토랑 #{item.restaurantId}
                    </Text>
                  </TouchableOpacity>
                  {item.error && (
                    <Text style={[styles.errorText, { color: '#ef4444' }]}>
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
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: queueItems.length > 0 ? 24 : 0 }]}>
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
            <View style={[styles.cardContent, { borderLeftColor: getStatusColor(job), borderLeftWidth: 4 }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.typeLabel, { color: colors.text }]}>
                  {getTypeLabel(job.type)}
                </Text>
                <Text style={[styles.statusBadge, { color: getStatusColor(job) }]}>
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
                          backgroundColor: getStatusColor(job)
                        }
                      ]}
                    />
                  </View>
                </View>
              )}
              {job.error && (
                <Text style={[styles.errorText, { color: '#ef4444' }]}>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
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
