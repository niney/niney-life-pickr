import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { useNavigation } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { io, Socket } from 'socket.io-client';
import { useTheme } from 'shared/contexts';
import { THEME_COLORS } from 'shared/constants';
import { getDefaultApiUrl } from 'shared/services';
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

// Socket 이벤트 데이터 타입들
interface ProgressEventData {
  jobId: string;
  restaurantId: number;
  sequence?: number;
  current: number;
  total: number;
  percentage: number;
  timestamp?: number;
}

interface CompletionEventData {
  jobId: string;
  timestamp: number;
}

interface ErrorEventData {
  jobId: string;
  error: string;
}

interface CancellationEventData {
  jobId: string;
}

interface JobNewEventData {
  jobId: string;
  type: string;
  restaurantId: number;
  timestamp: number;
}

interface MenuProgressEventData extends ProgressEventData {
  metadata?: Record<string, string | number>;
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

  // Sequence 추적
  const lastSequenceRef = useRef<Map<string, number>>(new Map());

  /**
   * Socket으로 초기 Job 리스트 조회
   */
  const subscribeToAllJobs = useCallback(() => {
    if (!socket) return;

    console.log('[JobMonitor] 전체 Job 구독 시작...');
    socket.emit('subscribe:all_jobs');

    socket.once('jobs:current_state', (data: {
      total: number;
      jobs: Job[];
      restaurantIds: number[];
      timestamp: number;
    }) => {
      console.log('[JobMonitor] 초기 Job 리스트 수신:', data);
      setJobs(data.jobs);
      setIsLoading(false);

      // 모든 레스토랑 Room 구독
      data.restaurantIds.forEach((restaurantId) => {
        if (!subscribedRooms.has(restaurantId)) {
          socket.emit('subscribe:restaurant', restaurantId);
          setSubscribedRooms(prev => new Set(prev).add(restaurantId));
        }
      });
    });

    socket.once('jobs:error', (error: { message: string; error: string }) => {
      console.error('[JobMonitor] Job 로딩 실패:', error);
      setIsLoading(false);
    });
  }, [socket, subscribedRooms]);

  /**
   * Sequence 체크
   */
  const checkSequence = useCallback((jobId: string, newSequence: number): boolean => {
    const lastSequence = lastSequenceRef.current.get(jobId) || 0;
    if (newSequence < lastSequence) {
      console.warn(`[JobMonitor] Outdated event ignored - Job: ${jobId}`);
      return false;
    }
    lastSequenceRef.current.set(jobId, newSequence);
    return true;
  }, []);

  /**
   * Sequence 초기화
   */
  const resetSequence = useCallback((jobId: string) => {
    lastSequenceRef.current.delete(jobId);
  }, []);

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
   * Socket 연결 및 이벤트 리스너 등록
   */
  useEffect(() => {
    console.log('[JobMonitor] Socket 연결 시도...');

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('[JobMonitor] Socket 연결 성공');
      setSocketConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[JobMonitor] Socket 연결 끊김');
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

    // review:crawl_progress
    newSocket.on('review:crawl_progress', (data: ProgressEventData) => {
      const sequence = data.sequence || data.current || 0;
      if (!checkSequence(data.jobId, sequence)) return;

      setJobs(prev => {
        const existingJob = prev.find(job => job.jobId === data.jobId);
        if (!existingJob) {
          return [createJobFromProgress(data, 'review_crawl', { phase: 'crawl' }), ...prev];
        }
        return prev.map(job =>
          job.jobId === data.jobId
            ? {
                ...job,
                progress: { current: data.current, total: data.total, percentage: data.percentage },
                metadata: { ...job.metadata, phase: 'crawl' }
              }
            : job
        );
      });

      if (data.percentage === 100 || data.current === data.total) {
        setTimeout(() => {
          setJobs(prev => prev.map(job =>
            job.jobId === data.jobId && job.status === 'active'
              ? { ...job, status: 'completed', completedAt: new Date().toISOString() }
              : job
          ));
          resetSequence(data.jobId);
        }, 3000);
      }
    });

    // review:db_progress
    newSocket.on('review:db_progress', (data: ProgressEventData) => {
      const sequence = data.sequence || data.current || 0;
      if (!checkSequence(data.jobId, sequence)) return;

      setJobs(prev => {
        const existingJob = prev.find(job => job.jobId === data.jobId);
        if (!existingJob) {
          return [createJobFromProgress(data, 'review_crawl', { phase: 'db' }), ...prev];
        }
        return prev.map(job =>
          job.jobId === data.jobId
            ? {
                ...job,
                progress: { current: data.current, total: data.total, percentage: data.percentage },
                metadata: { ...job.metadata, phase: 'db' }
              }
            : job
        );
      });

      if (data.percentage === 100 || data.current === data.total) {
        setTimeout(() => {
          setJobs(prev => prev.map(job =>
            job.jobId === data.jobId && job.status === 'active'
              ? { ...job, status: 'completed', completedAt: new Date().toISOString() }
              : job
          ));
          resetSequence(data.jobId);
        }, 3000);
      }
    });

    // review:image_progress
    newSocket.on('review:image_progress', (data: ProgressEventData) => {
      const sequence = data.sequence || data.current || 0;
      if (!checkSequence(data.jobId, sequence)) return;

      setJobs(prev => {
        const existingJob = prev.find(job => job.jobId === data.jobId);
        if (!existingJob) {
          return [createJobFromProgress(data, 'review_crawl', { phase: 'image' }), ...prev];
        }
        return prev.map(job =>
          job.jobId === data.jobId
            ? {
                ...job,
                progress: { current: data.current, total: data.total, percentage: data.percentage },
                metadata: { ...job.metadata, phase: 'image' }
              }
            : job
        );
      });

      if (data.percentage === 100 || data.current === data.total) {
        setTimeout(() => {
          setJobs(prev => prev.map(job =>
            job.jobId === data.jobId && job.status === 'active'
              ? { ...job, status: 'completed', completedAt: new Date().toISOString() }
              : job
          ));
          resetSequence(data.jobId);
        }, 3000);
      }
    });

    // review:completed
    newSocket.on('review:completed', (data: CompletionEventData) => {
      resetSequence(data.jobId);
      setJobs(prev => prev.map(job =>
        job.jobId === data.jobId
          ? { ...job, status: 'completed', completedAt: new Date(data.timestamp).toISOString() }
          : job
      ));
    });

    // review:error
    newSocket.on('review:error', (data: ErrorEventData) => {
      resetSequence(data.jobId);
      setJobs(prev => prev.map(job =>
        job.jobId === data.jobId
          ? { ...job, status: 'failed', error: data.error }
          : job
      ));
    });

    // review:cancelled
    newSocket.on('review:cancelled', (data: CancellationEventData) => {
      resetSequence(data.jobId);
      setJobs(prev => prev.map(job =>
        job.jobId === data.jobId
          ? { ...job, status: 'cancelled' }
          : job
      ));
    });

    // review_summary:progress
    newSocket.on('review_summary:progress', (data: ProgressEventData) => {
      const sequence = data.sequence || data.current || 0;
      if (!checkSequence(data.jobId, sequence)) return;

      setJobs(prev => {
        const existingJob = prev.find(job => job.jobId === data.jobId);
        if (!existingJob) {
          return [createJobFromProgress(data, 'review_summary'), ...prev];
        }
        return prev.map(job =>
          job.jobId === data.jobId
            ? {
                ...job,
                progress: { current: data.current, total: data.total, percentage: data.percentage }
              }
            : job
        );
      });

      if (data.percentage === 100 || data.current === data.total) {
        setTimeout(() => {
          setJobs(prev => prev.map(job =>
            job.jobId === data.jobId && job.status === 'active'
              ? { ...job, status: 'completed', completedAt: new Date().toISOString() }
              : job
          ));
          resetSequence(data.jobId);
        }, 3000);
      }
    });

    // review_summary:completed
    newSocket.on('review_summary:completed', (data: CompletionEventData) => {
      resetSequence(data.jobId);
      setJobs(prev => prev.map(job =>
        job.jobId === data.jobId
          ? { ...job, status: 'completed', completedAt: new Date(data.timestamp).toISOString() }
          : job
      ));
    });

    // review_summary:error
    newSocket.on('review_summary:error', (data: ErrorEventData) => {
      resetSequence(data.jobId);
      setJobs(prev => prev.map(job =>
        job.jobId === data.jobId
          ? { ...job, status: 'failed', error: data.error }
          : job
      ));
    });

    // restaurant:menu_progress
    newSocket.on('restaurant:menu_progress', (data: MenuProgressEventData) => {
      const sequence = data.sequence || data.current || 0;
      if (!checkSequence(data.jobId, sequence)) return;

      setJobs(prev => {
        const existingJob = prev.find(job => job.jobId === data.jobId);
        if (!existingJob) {
          return [createJobFromProgress(data, 'restaurant_crawl', data.metadata), ...prev];
        }
        return prev.map(job =>
          job.jobId === data.jobId
            ? {
                ...job,
                progress: {
                  current: data.current || 0,
                  total: data.total || 0,
                  percentage: data.percentage || 0
                },
                metadata: { ...job.metadata, ...data.metadata }
              }
            : job
        );
      });

      if (data.percentage === 100 || data.current === data.total) {
        setTimeout(() => {
          setJobs(prev => prev.map(job =>
            job.jobId === data.jobId && job.status === 'active'
              ? { ...job, status: 'completed', completedAt: new Date().toISOString() }
              : job
          ));
          resetSequence(data.jobId);
        }, 3000);
      }
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

    return () => {
      newSocket.emit('unsubscribe:all_jobs');
      newSocket.close();
    };
  }, [checkSequence, resetSequence, createJobFromProgress]);

  /**
   * 초기 Job 로딩
   */
  useEffect(() => {
    if (socket && socketConnected && isLoading) {
      subscribeToAllJobs();
      socket.emit('subscribe:queue');
      setIsLoading(false);
    }
  }, [socket, socketConnected, isLoading, subscribeToAllJobs]);

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
   * Restaurant Stack의 RestaurantDetail로 네비게이션
   */
  const handleOpenRestaurant = (restaurantId: number) => {
    // Tab Navigator에서 Restaurant Stack으로 전환 후 RestaurantDetail로 이동
    navigation.navigate('Restaurant', {
      screen: 'RestaurantDetail',
      params: {
        restaurantId,
      },
    });
  };

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
      <ScrollView style={styles.scrollView}>
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
              <TouchableOpacity onPress={() => handleOpenRestaurant(job.restaurantId)}>
                <Text style={[styles.restaurantId, { color: colors.primary }]}>
                  레스토랑 #{job.restaurantId}
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
