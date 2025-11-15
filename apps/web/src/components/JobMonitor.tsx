import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useTheme } from '@shared/contexts';
import { THEME_COLORS, SOCKET_CONFIG } from '@shared/constants';
import { getDefaultApiUrl } from '@shared/services';
import { SocketSequenceManager, JobCompletionTracker, extractUniqueRestaurantIds } from '@shared/utils';
import type {
  ProgressEventData,
  CompletionEventData,
  ErrorEventData,
  CancellationEventData,
  JobNewEventData,
  MenuProgressEventData,
} from '@shared/types';
import Header from './Header';
import Drawer from './Drawer';
import { QueueCard } from './QueueCard';
import type { QueuedJob, QueueStats } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || getDefaultApiUrl();

/**
 * Job 데이터 타입
 * - Socket 이벤트로 수신하는 Job 정보
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
  isInterrupted: boolean; // 서버 재시작 등으로 중단된 Job
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

/**
 * JobMonitor 컴포넌트
 *
 * 핵심 전략:
 * 1. 초기 로딩: Socket으로 active Job 조회 (1회만)
 * 2. Room 구독: 모든 레스토랑 Room 구독 (1회만)
 * 3. 실시간 업데이트: Socket 이벤트만 사용 (HTTP Polling 없음)
 *
 * 동작 방식:
 * - 초기 로딩: subscribe:all_jobs → jobs:current_state → 레스토랑 Room 자동 구독
 * - 진행률 변경: review:crawl_progress, review:db_progress, restaurant:menu_progress 등
 * - Job 완료/실패: review:completed, review:error 등
 *
 * 장점:
 * - 서버 부하 최소화 (HTTP Polling 제거)
 * - 실시간 동기화 (즉시 반영)
 * - 간단한 로직 (Socket 이벤트만 처리)
 */

interface JobMonitorProps {
  onLogout: () => Promise<void>;
}

export const JobMonitor: React.FC<JobMonitorProps> = ({ onLogout }) => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];
  const [drawerVisible, setDrawerVisible] = useState(false);

  // ==================== 반응형 체크 ====================
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ==================== Job State 관리 ====================

  const [jobs, setJobs] = useState<Job[]>([]); // Job 리스트
  const [isLoading, setIsLoading] = useState(true); // 초기 로딩 상태
  const [socketConnected, setSocketConnected] = useState(false); // Socket 연결 상태
  const [socket, setSocket] = useState<Socket | null>(null); // Socket 인스턴스
  const [subscribedRooms, setSubscribedRooms] = useState<Set<number>>(new Set()); // 구독 중인 Room

  // ==================== Queue State 관리 ====================

  const [queueItems, setQueueItems] = useState<QueuedJob[]>([]); // Queue 리스트
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total: 0,
    waiting: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  });

  // ✅ Sequence 및 Completion 추적 (공통 유틸)
  const sequenceManagerRef = useRef<SocketSequenceManager>(new SocketSequenceManager());
  const completionTrackerRef = useRef<JobCompletionTracker>(new JobCompletionTracker());

  // ==================== Socket 기반 초기 로딩 (HTTP 제거) ====================

  /**
   * Socket으로 초기 Job 리스트 조회
   * - subscribe:all_jobs 이벤트 발행
   * - jobs:current_state 이벤트 수신 (1회만)
   *
   * HTTP API 대신 Socket 통신으로 초기 데이터 로딩
   * - restaurant:current_state와 동일한 패턴
   * - 서버가 DB 조회 후 Socket으로 응답
   */
  const subscribeToAllJobs = useCallback(() => {
    if (!socket) return;

    console.log('[JobMonitor] 전체 Job 구독 시작...');

    // 전체 Job 구독 요청
    socket.emit('subscribe:all_jobs');

    // 초기 상태 수신 (1회만)
    socket.once('jobs:current_state', (data: {
      total: number;
      jobs: Job[];
      timestamp: number;
    }) => {
      console.log('[JobMonitor] 초기 Job 리스트 수신:', data);

      // Job 리스트 설정
      setJobs(data.jobs);
      setIsLoading(false);

      // 레스토랑 ID 목록 추출 (중복 제거)
      const restaurantIds = extractUniqueRestaurantIds(data.jobs);

      // 모든 레스토랑 Room 구독
      restaurantIds.forEach((restaurantId) => {
        if (!subscribedRooms.has(restaurantId)) {
          socket.emit('subscribe:restaurant', restaurantId);
          setSubscribedRooms(prev => new Set(prev).add(restaurantId));
          console.log(`[JobMonitor] Restaurant Room 구독: ${restaurantId}`);
        }
      });

      console.log(`[JobMonitor] ${data.jobs.length}개 Job 로딩 완료, ${restaurantIds.length}개 Room 구독`);
    });

    // 에러 처리
    socket.once('jobs:error', (error: { message: string; error: string }) => {
      console.error('[JobMonitor] Job 로딩 실패:', error);
      setIsLoading(false);
    });
  }, [socket, subscribedRooms]);

  // ==================== 2️⃣ Socket 연결 및 이벤트 리스너 (1회 설정) ====================

  /**
   * Socket 연결 및 이벤트 리스너 등록
   *
   * 이벤트 종류:
   * - review:crawl_progress → 웹 크롤링 진행률
   * - review:db_progress → DB 저장 진행률
   * - review:image_progress → 이미지 다운로드 진행률
   * - review:completed → 리뷰 크롤링 완료
   * - review:error → 리뷰 크롤링 실패
   * - review:cancelled → 리뷰 크롤링 취소
   * - review_summary:progress → 리뷰 요약 진행률
   * - review_summary:completed → 리뷰 요약 완료
   * - review_summary:error → 리뷰 요약 실패
   * - restaurant:menu_progress → 메뉴 크롤링 진행률
   */
  useEffect(() => {
    console.log('[JobMonitor] Socket 연결 시도...');

    // ✅ ref.current를 effect 본문에서 변수로 복사 (cleanup에서 사용)
    const completionTracker = completionTrackerRef.current;

    const newSocket = io(SOCKET_URL, {
      ...SOCKET_CONFIG,
      transports: ['websocket', 'polling'], // readonly를 mutable로 변환
    });

    // Socket 연결 성공
    newSocket.on('connect', () => {
      console.log('[JobMonitor] Socket 연결 성공:', newSocket.id);
      setSocketConnected(true);

      // ✅ 연결 시 자동 정리 시작 (5분 주기)
      completionTracker.startAutoCleanup(5);
    });

    // Socket 연결 끊김
    newSocket.on('disconnect', () => {
      console.log('[JobMonitor] Socket 연결 끊김');
      setSocketConnected(false);
    });

    // ==================== Socket 이벤트 핸들러 등록 ====================

    /**
     * job:new - 새 Job 시작 전역 알림 (모든 클라이언트 수신)
     *
     * 처리 로직:
     * 1. 새 레스토랑이면 Room 자동 구독
     * 2. Job 리스트에는 추가하지 않음 (진행률 이벤트에서 추가)
     *
     * 왜 Job을 바로 추가하지 않나?
     * - job:new는 최소 정보만 포함 (jobId, type, restaurantId)
     * - 진행률 이벤트에 상세 정보 포함
     * - Room 구독만 하고, 실제 Job 추가는 진행률 이벤트에서 처리
     */
    newSocket.on('job:new', (data: JobNewEventData) => {
      console.log('[JobMonitor] 새 Job 시작 알림:', data);

      // 새 레스토랑이면 Room 자동 구독
      setSubscribedRooms(prev => {
        if (prev.has(data.restaurantId)) {
          console.log(`[JobMonitor] 이미 구독 중: restaurant:${data.restaurantId}`);
          return prev;
        }

        // Room 구독
        newSocket.emit('subscribe:restaurant', data.restaurantId);
        console.log(`[JobMonitor] 새 Restaurant Room 구독: ${data.restaurantId}`);

        const newSet = new Set(prev);
        newSet.add(data.restaurantId);
        return newSet;
      });
    });

    /**
     * review:crawl_progress - 웹 크롤링 진행률 업데이트
     *
     * 처리 로직:
     * - 기존 Job의 progress 업데이트
     * - Job이 없으면 새로 추가 (job:new 이후 첫 진행률 이벤트)
     * - 100% 도달 시 자동 완료 처리 (3초 후)
     */
    newSocket.on('review:crawl_progress', (data: ProgressEventData) => {
      console.log('[JobMonitor] 크롤링 진행률:', data);

      // ✅ Sequence 체크: 구 버전 이벤트 무시
      const sequence = data.sequence || data.current || 0;
      if (!sequenceManagerRef.current.check(data.jobId, sequence)) {
        return;
      }

      // ✅ 이미 완료된 Job 무시
      if (completionTrackerRef.current.isCompleted(data.jobId)) {
        console.warn(`[JobMonitor] Ignoring completed job: ${data.jobId}`);
        return;
      }

      setJobs(prev => {
        const existingJob = prev.find(job => job.jobId === data.jobId);

        // Job이 없으면 새로 추가
        if (!existingJob) {
          return [createJobFromProgress(data, 'review_crawl', { phase: 'crawl' }), ...prev];
        }

        // 기존 Job 업데이트
        return prev.map(job =>
          job.jobId === data.jobId
            ? {
                ...job,
                progress: {
                  current: data.current,
                  total: data.total,
                  percentage: data.percentage
                },
                metadata: { ...job.metadata, phase: 'crawl' }
              }
            : job
        );
      });

      // ✅ 100% 완료 시 자동 완료 처리 (3초 후)
      scheduleAutoCompletion(data.jobId, data.current, data.total, data.percentage);
    });

    /**
     * review:db_progress - DB 저장 진행률 업데이트
     *
     * 처리 로직:
     * - 기존 Job의 progress 업데이트
     * - metadata에 phase: 'db' 추가
     * - Job이 없으면 새로 추가
     * - 100% 도달 시 자동 완료 처리 (3초 후)
     */
    newSocket.on('review:db_progress', (data: ProgressEventData) => {
      console.log('[JobMonitor] DB 저장 진행률:', data);

      // ✅ Sequence 체크: 구 버전 이벤트 무시
      const sequence = data.sequence || data.current || 0;
      if (!sequenceManagerRef.current.check(data.jobId, sequence)) {
        return;
      }

      // ✅ 이미 완료된 Job 무시
      if (completionTrackerRef.current.isCompleted(data.jobId)) {
        console.warn(`[JobMonitor] Ignoring completed job: ${data.jobId}`);
        return;
      }

      setJobs(prev => {
        const existingJob = prev.find(job => job.jobId === data.jobId);

        // Job이 없으면 새로 추가
        if (!existingJob) {
          return [createJobFromProgress(data, 'review_crawl', { phase: 'db' }), ...prev];
        }

        // 기존 Job 업데이트
        return prev.map(job =>
          job.jobId === data.jobId
            ? {
                ...job,
                progress: {
                  current: data.current,
                  total: data.total,
                  percentage: data.percentage
                },
                metadata: { ...job.metadata, phase: 'db' }
              }
            : job
        );
      });

      // ✅ 100% 완료 시 자동 완료 처리 (3초 후)
      scheduleAutoCompletion(data.jobId, data.current, data.total, data.percentage);
    });

    /**
     * review:image_progress - 이미지 다운로드 진행률 업데이트
     *
     * 처리 로직:
     * - 기존 Job의 progress 업데이트
     * - metadata에 phase: 'image' 추가
     * - Job이 없으면 새로 추가
     * - 100% 도달 시 자동 완료 처리 (3초 후)
     */
    newSocket.on('review:image_progress', (data: ProgressEventData) => {
      console.log('[JobMonitor] 이미지 다운로드 진행률:', data);

      // ✅ Sequence 체크: 구 버전 이벤트 무시
      const sequence = data.sequence || data.current || 0;
      if (!sequenceManagerRef.current.check(data.jobId, sequence)) {
        return;
      }

      // ✅ 이미 완료된 Job 무시
      if (completionTrackerRef.current.isCompleted(data.jobId)) {
        console.warn(`[JobMonitor] Ignoring completed job: ${data.jobId}`);
        return;
      }

      setJobs(prev => {
        const existingJob = prev.find(job => job.jobId === data.jobId);

        // Job이 없으면 새로 추가
        if (!existingJob) {
          return [createJobFromProgress(data, 'review_crawl', { phase: 'image' }), ...prev];
        }

        // 기존 Job 업데이트
        return prev.map(job =>
          job.jobId === data.jobId
            ? {
                ...job,
                progress: {
                  current: data.current,
                  total: data.total,
                  percentage: data.percentage
                },
                metadata: { ...job.metadata, phase: 'image' }
              }
            : job
        );
      });

      // ✅ 100% 완료 시 자동 완료 처리 (3초 후)
      scheduleAutoCompletion(data.jobId, data.current, data.total, data.percentage);
    });

    /**
     * review:completed - 리뷰 크롤링 완료
     *
     * 처리 로직:
     * - Job 상태를 'completed'로 변경
     * - completedAt 타임스탬프 추가
     * - Sequence 초기화
     */
    newSocket.on('review:completed', (data: CompletionEventData) => {
      console.log('[JobMonitor] 리뷰 크롤링 완료:', data);

      // ✅ 완료 Job 등록 및 Sequence 초기화
      completionTrackerRef.current.markCompleted(data.jobId);
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
    });

    /**
     * review:error - 리뷰 크롤링 실패
     *
     * 처리 로직:
     * - Job 상태를 'failed'로 변경
     * - error 메시지 추가
     * - Sequence 초기화
     */
    newSocket.on('review:error', (data: ErrorEventData) => {
      console.log('[JobMonitor] 리뷰 크롤링 실패:', data);

      // ✅ 완료 Job 등록 및 Sequence 초기화
      completionTrackerRef.current.markCompleted(data.jobId);
      sequenceManagerRef.current.reset(data.jobId);

      setJobs(prev => prev.map(job =>
        job.jobId === data.jobId
          ? {
              ...job,
              status: 'failed',
              error: data.error
            }
          : job
      ));
    });

    /**
     * review:cancelled - 리뷰 크롤링 취소
     *
     * 처리 로직:
     * - Job 상태를 'cancelled'로 변경
     * - Sequence 초기화
     */
    newSocket.on('review:cancelled', (data: CancellationEventData) => {
      console.log('[JobMonitor] 리뷰 크롤링 취소:', data);

      // ✅ 완료 Job 등록 및 Sequence 초기화
      completionTrackerRef.current.markCompleted(data.jobId);
      sequenceManagerRef.current.reset(data.jobId);

      setJobs(prev => prev.map(job =>
        job.jobId === data.jobId
          ? { ...job, status: 'cancelled' }
          : job
      ));
    });

    /**
     * review_summary:progress - 리뷰 요약 진행률
     *
     * 처리 로직:
     * - 기존 Job의 progress 업데이트
     * - Job이 없으면 새로 추가
     * - 100% 도달 시 자동 완료 처리 (3초 후)
     */
    newSocket.on('review_summary:progress', (data: ProgressEventData) => {
      console.log('[JobMonitor] 리뷰 요약 진행률:', data);

      // ✅ Sequence 체크: 구 버전 이벤트 무시
      const sequence = data.sequence || data.current || 0;
      if (!sequenceManagerRef.current.check(data.jobId, sequence)) {
        return;
      }

      // ✅ 이미 완료된 Job 무시
      if (completionTrackerRef.current.isCompleted(data.jobId)) {
        console.warn(`[JobMonitor] Ignoring completed job: ${data.jobId}`);
        return;
      }

      setJobs(prev => {
        const existingJob = prev.find(job => job.jobId === data.jobId);

        // Job이 없으면 새로 추가
        if (!existingJob) {
          return [createJobFromProgress(data, 'review_summary'), ...prev];
        }

        // 기존 Job 업데이트
        return prev.map(job =>
          job.jobId === data.jobId
            ? {
                ...job,
                progress: {
                  current: data.current,
                  total: data.total,
                  percentage: data.percentage
                }
              }
            : job
        );
      });

      // ✅ 100% 완료 시 자동 완료 처리 (3초 후)
      scheduleAutoCompletion(data.jobId, data.current, data.total, data.percentage);
    });

    /**
     * review_summary:completed - 리뷰 요약 완료
     */
    newSocket.on('review_summary:completed', (data: CompletionEventData) => {
      console.log('[JobMonitor] 리뷰 요약 완료:', data);

      // ✅ 완료 Job 등록 및 Sequence 초기화
      completionTrackerRef.current.markCompleted(data.jobId);
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
    });

    /**
     * review_summary:error - 리뷰 요약 실패
     */
    newSocket.on('review_summary:error', (data: ErrorEventData) => {
      console.log('[JobMonitor] 리뷰 요약 실패:', data);

      // ✅ 완료 Job 등록 및 Sequence 초기화
      completionTrackerRef.current.markCompleted(data.jobId);
      sequenceManagerRef.current.reset(data.jobId);

      setJobs(prev => prev.map(job =>
        job.jobId === data.jobId
          ? {
              ...job,
              status: 'failed',
              error: data.error
            }
          : job
      ));
    });

    /**
     * restaurant:menu_progress - 메뉴 크롤링 진행률
     *
     * 처리 로직:
     * - 레스토랑 정보 + 메뉴 크롤링 진행률 업데이트
     * - metadata에 step 정보 저장 (normalizing, saving 등)
     * - Job이 없으면 새로 추가
     * - 100% 도달 시 자동 완료 처리 (3초 후)
     */
    newSocket.on('restaurant:menu_progress', (data: MenuProgressEventData) => {
      console.log('[JobMonitor] 메뉴 크롤링 진행률:', data);

      // ✅ Sequence 체크: 구 버전 이벤트 무시
      const sequence = data.sequence || data.current || 0;
      if (!sequenceManagerRef.current.check(data.jobId, sequence)) {
        return;
      }

      // ✅ 이미 완료된 Job 무시
      if (completionTrackerRef.current.isCompleted(data.jobId)) {
        console.warn(`[JobMonitor] Ignoring completed job: ${data.jobId}`);
        return;
      }

      setJobs(prev => {
        const existingJob = prev.find(job => job.jobId === data.jobId);

        // Job이 없으면 새로 추가
        if (!existingJob) {
          return [createJobFromProgress(data, 'restaurant_crawl', data.metadata), ...prev];
        }

        // 기존 Job 업데이트
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

      // ✅ 100% 완료 시 자동 완료 처리 (3초 후)
      scheduleAutoCompletion(data.jobId, data.current || 0, data.total || 0, data.percentage || 0);
    });

    // ==================== Queue 이벤트 리스너 ====================

    /**
     * queue:current_state - Queue 초기 상태 수신
     */
    newSocket.on('queue:current_state', (data: {
      total: number;
      queue: QueuedJob[];
      stats: QueueStats;
      timestamp: number;
    }) => {
      console.log('[JobMonitor] Queue 초기 상태 수신:', data);
      setQueueItems(data.queue);
      setQueueStats(data.stats);
    });

    /**
     * queue:job_added - Queue에 새 Job 추가됨
     */
    newSocket.on('queue:job_added', (data: {
      queueId: string;
      type: string;
      restaurantId: number;
      restaurant?: {
        id: number;
        name: string;
        category: string | null;
        address: string | null;
      };
      position: number;
      timestamp: number;
    }) => {
      console.log('[JobMonitor] Queue에 Job 추가:', data);

      // Queue 목록 다시 조회 (Socket으로)
      newSocket.emit('subscribe:queue');
    });

    /**
     * queue:job_started - Queue Item 처리 시작
     */
    newSocket.on('queue:job_started', (data: {
      queueId: string;
      type: string;
      restaurantId: number;
      timestamp: number;
    }) => {
      console.log('[JobMonitor] Queue Item 처리 시작:', data);

      // Queue Item 상태 업데이트
      setQueueItems(prev => prev.map(item =>
        item.queueId === data.queueId
          ? { ...item, queueStatus: 'processing', startedAt: new Date().toISOString() }
          : item
      ));
    });

    /**
     * queue:job_completed - Queue Item 완료
     */
    newSocket.on('queue:job_completed', (data: {
      queueId: string;
      jobId: string;
      type: string;
      restaurantId: number;
      timestamp: number;
    }) => {
      console.log('[JobMonitor] Queue Item 완료:', data);

      // Queue에서 제거
      setQueueItems(prev => prev.filter(item => item.queueId !== data.queueId));
      setQueueStats(prev => ({
        ...prev,
        processing: Math.max(0, prev.processing - 1),
      }));
    });

    /**
     * queue:job_failed - Queue Item 실패
     */
    newSocket.on('queue:job_failed', (data: {
      queueId: string;
      jobId?: string;
      type: string;
      restaurantId: number;
      error: string;
      timestamp: number;
    }) => {
      console.error('[JobMonitor] Queue Item 실패:', data);

      // Queue Item 상태 업데이트
      setQueueItems(prev => prev.map(item =>
        item.queueId === data.queueId
          ? {
              ...item,
              queueStatus: 'failed',
              completedAt: new Date().toISOString(),
              error: data.error,
            }
          : item
      ));

      // 3초 후 Queue에서 제거
      setTimeout(() => {
        setQueueItems(prev => prev.filter(item => item.queueId !== data.queueId));
        setQueueStats(prev => ({
          ...prev,
          processing: Math.max(0, prev.processing - 1),
        }));
      }, 3000);
    });

    /**
     * queue:job_cancelled - Queue Item 취소됨
     */
    newSocket.on('queue:job_cancelled', (data: {
      queueId: string;
      restaurantId: number;
      timestamp: number;
    }) => {
      console.log('[JobMonitor] Queue Item 취소:', data);

      // Queue에서 제거
      setQueueItems(prev => prev.filter(item => item.queueId !== data.queueId));
      setQueueStats(prev => ({
        ...prev,
        waiting: Math.max(0, prev.waiting - 1),
      }));
    });

    setSocket(newSocket);

    // Cleanup: 컴포넌트 unmount 시 Socket 연결 해제
    return () => {
      console.log('[JobMonitor] Socket 연결 해제');
      completionTracker.stopAutoCleanup(); // ✅ 자동 정리 중지
      newSocket.emit('unsubscribe:all_jobs'); // 전체 Job 구독 해제
      newSocket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ℹ️ 빈 배열 의도: Socket 핸들러는 마운트 시 1회만 등록
  // ℹ️ checkSequence, resetSequence, createJobFromProgress는 useRef와 함께
  //    안전하게 클로저에 캡처됨 - 다시 등록할 필요 없음

  // ==================== 3️⃣ 초기 Job 로딩 (Socket 연결 후) ====================

  /**
   * Socket 연결 완료 후 전체 Job 및 Queue 구독
   *
   * 조건:
   * - Socket이 연결되어 있어야 함
   * - 1회만 실행 (isLoading 플래그로 방지)
   */
  useEffect(() => {
    if (socket && socketConnected && isLoading) {
      subscribeToAllJobs(); // ✅ Socket 기반 초기 로딩
      socket.emit('subscribe:queue'); // ✅ Queue 초기 로딩
      setIsLoading(false);
    }
  }, [socket, socketConnected, isLoading, subscribeToAllJobs]);

  // ==================== UI 헬퍼 함수 ====================

  /**
   * 진행률 이벤트 수신 시 Job이 없으면 새로 생성
   * - job:new를 놓쳤거나 네트워크 이슈로 Job이 없을 때 방어 로직
   */
  const createJobFromProgress = useCallback((
    data: ProgressEventData | MenuProgressEventData,
    type: Job['type'],
    additionalMetadata?: Record<string, string | number>
  ): Job => {
    console.log(`[JobMonitor] 새 Job 추가 (${type}):`, data.jobId);
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
   * 100% 완료 시 자동 완료 처리 스케줄링
   * - 3초 후 Job을 'completed' 상태로 변경
   * - CompletionTracker와 SequenceManager 정리
   */
  const scheduleAutoCompletion = useCallback((
    jobId: string,
    current: number,
    total: number,
    percentage: number
  ) => {
    if (percentage === 100 || current === total) {
      setTimeout(() => {
        setJobs(prev => prev.map(job =>
          job.jobId === jobId && job.status === 'active'
            ? {
                ...job,
                status: 'completed',
                completedAt: new Date().toISOString()
              }
            : job
        ));
        completionTrackerRef.current.markCompleted(jobId);
        sequenceManagerRef.current.reset(jobId);
      }, 3000);
    }
  }, []);

  /**
   * Job 타입 라벨 반환
   */
  const getTypeLabel = (type: Job['type']) => {
    switch (type) {
      case 'review_crawl':
        return '리뷰 크롤링';
      case 'review_summary':
        return '리뷰 요약';
      case 'restaurant_crawl':
        return '레스토랑 크롤링';
      default:
        return type;
    }
  };

  /**
   * 진행 상태 텍스트 반환
   */
  const getPhaseLabel = (job: Job) => {
    if (job.type === 'review_crawl') {
      const phase = job.metadata?.phase;
      if (phase === 'crawl') return '웹 크롤링 중';
      if (phase === 'db') return 'DB 저장 중';
      if (phase === 'image') return '이미지 다운로드 중';
    }
    if (job.type === 'review_summary') {
      return 'AI 요약 생성 중';
    }
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

  /**
   * 상태 색상 반환
   */
  const getStatusColor = (job: Job) => {
    if (job.isInterrupted) return '#f59e0b'; // warning color
    switch (job.status) {
      case 'active':
        return colors.primary;
      case 'completed':
        return colors.success;
      case 'failed':
        return colors.error;
      case 'cancelled':
        return colors.textSecondary;
      default:
        return colors.text;
    }
  };

  /**
   * 상태 텍스트 반환
   */
  const getStatusText = (job: Job) => {
    if (job.isInterrupted) return '⚠️ 중단됨';
    switch (job.status) {
      case 'active':
        return '▶ 실행 중';
      case 'completed':
        return '✅ 완료';
      case 'failed':
        return '❌ 실패';
      case 'cancelled':
        return '🚫 취소됨';
      default:
        return job.status;
    }
  };

  const handleLogout = async () => {
    await onLogout();
    window.location.href = '/login';
  };

  /**
   * Queue 아이템 취소
   */
  const handleCancelQueue = async (queueId: string) => {
    const API_URL = getDefaultApiUrl();

    try {
      const response = await fetch(`${API_URL}/api/crawler/queue/${queueId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.message || 'Failed to cancel queue item';
        console.error('[JobMonitor] Failed to cancel queue item:', errorMessage);
        alert('Queue 취소 실패: ' + errorMessage);
        return;
      }

      console.log(`[JobMonitor] Queue item cancelled: ${queueId}`);
    } catch (error) {
      console.error('[JobMonitor] Failed to cancel queue item:', error);
      alert('Queue 취소 실패: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // ==================== 렌더링 ====================

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header onMenuPress={() => setDrawerVisible(true)} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Job 목록 로딩 중...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header onMenuPress={() => setDrawerVisible(true)} />

      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onLogout={handleLogout}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 연결 상태 및 개수 */}
        <View style={[styles.statusBar, { backgroundColor: colors.surface }]}>
          <View style={styles.statusItem}>
            <Text style={{ color: socketConnected ? '#22c55e' : '#ef4444' }}>
              {socketConnected ? '🟢 실시간 연결' : '🔴 연결 끊김'}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={[styles.jobCount, { color: colors.text }]}>
              실행 중 {jobs.length}개 | 대기열 {queueStats.total}개
            </Text>
          </View>
        </View>

        {/* 데스크탑 2열 레이아웃 */}
        {!isMobile ? (
          <View style={styles.desktopLayout}>
            {/* 왼쪽: 대기열 */}
            <View style={styles.desktopColumn}>
              <View style={[styles.sectionHeader, { backgroundColor: colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  📋 대기열 ({queueStats.waiting} 대기 / {queueStats.processing} 처리 중)
                </Text>
              </View>

              {queueItems.length > 0 ? (
                queueItems.map(item => (
                  <QueueCard
                    key={item.queueId}
                    item={item}
                    onCancel={handleCancelQueue}
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    대기 중인 작업이 없습니다
                  </Text>
                </View>
              )}
            </View>

            {/* 오른쪽: 실행 중 Job */}
            <View style={styles.desktopColumn}>
              <View style={[styles.sectionHeader, { backgroundColor: colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  ▶️ 실행 중 Job ({jobs.length})
                </Text>
              </View>

              {jobs.length > 0 ? (
                jobs.map(job => (
                  <View
                    key={job.jobId}
                    style={[
                      styles.jobCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: job.isInterrupted ? '#f59e0b' : colors.border,
                        borderLeftWidth: 4,
                        borderLeftColor: getStatusColor(job)
                      }
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
                      <Text style={[styles.statusBadge, { color: getStatusColor(job) }]}>
                        {getStatusText(job)}
                      </Text>
                    </View>

                    {/* 레스토랑 정보 */}
                    <TouchableOpacity onPress={() => window.open(`/restaurant/${job.restaurantId}`, '_blank')}>
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
                                backgroundColor: getStatusColor(job)
                              }
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
                              minute: '2-digit'
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
                              minute: '2-digit'
                            })}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    실행 중인 Job이 없습니다
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          /* 모바일 1열 레이아웃 */
          <>
            {/* ==================== 대기열 섹션 ==================== */}
            {queueItems.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    📋 대기열 ({queueStats.waiting} 대기 / {queueStats.processing} 처리 중)
                  </Text>
                </View>

                {queueItems.map(item => (
                  <QueueCard
                    key={item.queueId}
                    item={item}
                    onCancel={handleCancelQueue}
                  />
                ))}
              </>
            )}

            {/* ==================== 실행 중 Job 섹션 ==================== */}
            <View style={[styles.sectionHeader, { backgroundColor: colors.surface, marginTop: queueItems.length > 0 ? 24 : 0 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                ▶️ 실행 중 Job ({jobs.length})
              </Text>
            </View>

            {/* Job 카드 리스트 */}
            {jobs.map(job => (
              <View
                key={job.jobId}
                style={[
                  styles.jobCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: job.isInterrupted ? '#f59e0b' : colors.border,
                    borderLeftWidth: 4,
                    borderLeftColor: getStatusColor(job)
                  }
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
                  <Text style={[styles.statusBadge, { color: getStatusColor(job) }]}>
                    {getStatusText(job)}
                  </Text>
                </View>

                {/* 레스토랑 정보 */}
                <TouchableOpacity onPress={() => window.open(`/restaurant/${job.restaurantId}`, '_blank')}>
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
                            backgroundColor: getStatusColor(job)
                          }
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
                          minute: '2-digit'
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
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
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
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  sectionHeader: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  jobCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  jobType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  jobId: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  statusBadge: {
    fontSize: 14,
    fontWeight: '600',
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  restaurantId: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  phaseContainer: {
    marginBottom: 12,
  },
  phaseText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  progressSection: {
    marginBottom: 12,
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
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'monospace',
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
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
  },
  timestamps: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
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
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  // 데스크탑 레이아웃
  desktopLayout: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  desktopColumn: {
    flex: 1,
    minWidth: 0, // flex 자식이 넘칠 때 줄바꿈 방지
  },
});
