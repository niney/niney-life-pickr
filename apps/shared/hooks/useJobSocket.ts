/**
 * Job Socket 연결 및 관리 Hook
 * Socket 생성, 이벤트 등록, cleanup을 한 곳에서 관리
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Job, QueuedJob } from '../types';
import type { QueueStats } from '../utils/registerJobSocketEvents';
import { SocketSequenceManager, JobCompletionTracker, extractUniqueRestaurantIds, registerJobSocketEvents } from '../utils';
import { useJobEventHandlers } from './useJobEventHandlers';

export interface UseJobSocketParams {
  socketUrl: string;
  socketConfig: any;
}

export interface UseJobSocketReturn {
  // State
  socket: Socket | null;
  socketConnected: boolean;
  isLoading: boolean;
  jobs: Job[];
  queueItems: QueuedJob[];
  queueStats: QueueStats;

  // Setters (필요 시 외부에서 직접 조작)
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  setQueueItems: React.Dispatch<React.SetStateAction<QueuedJob[]>>;
  setQueueStats: React.Dispatch<React.SetStateAction<QueueStats>>;
}

/**
 * Job Socket 연결 및 관리 Hook
 *
 * @param params - Socket URL 및 설정
 * @returns Socket 상태, Job/Queue 데이터, setter 함수들
 *
 * @example
 * ```typescript
 * const {
 *   socket,
 *   socketConnected,
 *   isLoading,
 *   jobs,
 *   queueItems,
 *   queueStats
 * } = useJobSocket({
 *   socketUrl: 'http://localhost:4000',
 *   socketConfig: SOCKET_CONFIG
 * });
 * ```
 */
export function useJobSocket({ socketUrl, socketConfig }: UseJobSocketParams): UseJobSocketReturn {
  // ==================== State ====================

  const [jobs, setJobs] = useState<Job[]>([]);
  const [queueItems, setQueueItems] = useState<QueuedJob[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total: 0,
    waiting: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [subscribedRooms, setSubscribedRooms] = useState<Set<number>>(new Set());

  // ==================== Refs ====================

  const sequenceManagerRef = useRef(new SocketSequenceManager());
  const completionTrackerRef = useRef(new JobCompletionTracker());

  // ==================== Event Handlers ====================

  const eventHandlers = useJobEventHandlers({
    setJobs,
    sequenceManager: sequenceManagerRef.current,
    completionTracker: completionTrackerRef.current,
  });

  // ==================== Socket 초기화 ====================

  /**
   * Socket 연결 및 이벤트 등록
   */
  useEffect(() => {
    console.log('[useJobSocket] Socket 연결 시도...');

    const completionTracker = completionTrackerRef.current;

    const newSocket = io(socketUrl, socketConfig);

    // 연결 성공
    newSocket.on('connect', () => {
      console.log('[useJobSocket] Socket 연결 성공:', newSocket.id);
      setSocketConnected(true);

      // 자동 정리 시작 (5분 주기)
      completionTracker.startAutoCleanup(5);

      // 초기 데이터 조회
      newSocket.emit('subscribe:all_jobs');
      newSocket.emit('subscribe:queue');
    });

    // 연결 끊김
    newSocket.on('disconnect', () => {
      console.log('[useJobSocket] Socket 연결 끊김');
      setSocketConnected(false);
    });

    // 초기 Job 리스트 수신
    newSocket.on('jobs:current_state', (data: {
      total: number;
      jobs: Job[];
      timestamp: number;
    }) => {
      console.log('[useJobSocket] 초기 Job 리스트 수신:', data);
      setJobs(data.jobs);
      setIsLoading(false);

      // 레스토랑 Room 구독
      const restaurantIds = extractUniqueRestaurantIds(data.jobs);
      restaurantIds.forEach((restaurantId) => {
        if (!subscribedRooms.has(restaurantId)) {
          newSocket.emit('subscribe:restaurant', restaurantId);
          setSubscribedRooms(prev => new Set(prev).add(restaurantId));
          console.log(`[useJobSocket] Restaurant Room 구독: ${restaurantId}`);
        }
      });
    });

    // Job 로딩 에러
    newSocket.on('jobs:error', (error: { message: string; error: string }) => {
      console.error('[useJobSocket] Job 로딩 실패:', error);
      setIsLoading(false);
    });

    // Job 및 Queue 이벤트 등록
    registerJobSocketEvents({
      socket: newSocket,
      handlers: eventHandlers,
      setSubscribedRooms,
      setQueueItems,
      setQueueStats,
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      console.log('[useJobSocket] Socket 연결 해제');
      completionTracker.stopAutoCleanup();
      newSocket.emit('unsubscribe:all_jobs');
      newSocket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketUrl]);
  // ℹ️ socketUrl만 의존성에 포함 (재연결 트리거)
  // ℹ️ 이벤트 핸들러는 useCallback으로 안전하게 캡처됨

  return {
    socket,
    socketConnected,
    isLoading,
    jobs,
    queueItems,
    queueStats,
    setJobs,
    setQueueItems,
    setQueueStats,
  };
}
