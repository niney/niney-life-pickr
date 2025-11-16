import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useTheme } from '@shared/contexts';
import { THEME_COLORS, SOCKET_CONFIG } from '@shared/constants';
import { getDefaultApiUrl, cancelQueueItem } from '@shared/services';
import { SocketSequenceManager, JobCompletionTracker, registerJobSocketEvents } from '@shared/utils';
import type { QueueStats } from '@shared/utils';
import { useJobEventHandlers } from '@shared/hooks';
import type { Job, QueuedJob } from '@shared/types';
import { JobCard } from '@shared/components';
import Header from './Header';
import Drawer from './Drawer';
import { QueueCard } from './QueueCard';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || getDefaultApiUrl();

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_socket, setSocket] = useState<Socket | null>(null); // Socket 인스턴스 (향후 확장용)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_subscribedRooms, setSubscribedRooms] = useState<Set<number>>(new Set()); // 구독 중인 Room

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

  // ==================== 공통 이벤트 핸들러 (Hook 사용) ====================

  const {
    handleProgressEvent,
    handleCompletionEvent,
    handleErrorEvent,
    handleCancellationEvent,
  } = useJobEventHandlers({
    setJobs,
    sequenceManager: sequenceManagerRef.current,
    completionTracker: completionTrackerRef.current,
  });

  // ==================== Socket 연결 및 이벤트 리스너 (1회 설정) ====================

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

      // ✅ Mobile 방식: 연결 후 즉시 데이터 조회
      newSocket.emit('subscribe:all_jobs');
      newSocket.emit('subscribe:queue');
    });

    // Socket 연결 끊김
    newSocket.on('disconnect', () => {
      console.log('[JobMonitor] Socket 연결 끊김');
      setSocketConnected(false);
    });

    // ==================== Socket 이벤트 핸들러 등록 (공통 함수 사용) ====================

    registerJobSocketEvents({
      socket: newSocket,
      handlers: {
        handleProgressEvent,
        handleCompletionEvent,
        handleErrorEvent,
        handleCancellationEvent,
      },
      setJobs,
      setSubscribedRooms,
      setQueueItems,
      setQueueStats,
      setIsLoading,
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
  // ℹ️ 공통 핸들러(handleProgressEvent, handleCompletionEvent 등)는 useCallback으로
  //    안전하게 클로저에 캡처됨 - 다시 등록할 필요 없음

  // ==================== UI 핸들러 ====================

  const handleLogout = async () => {
    await onLogout();
    window.location.href = '/login';
  };

  /**
   * Queue 아이템 취소
   */
  const handleCancelQueue = async (queueId: string) => {
    try {
      await cancelQueueItem(queueId);
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
                  <JobCard
                    key={job.jobId}
                    job={job}
                    colors={colors}
                    onRestaurantClick={(restaurantId) => window.open(`/restaurant/${restaurantId}`, '_blank')}
                  />
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
              <JobCard
                key={job.jobId}
                job={job}
                colors={colors}
                onRestaurantClick={(restaurantId) => window.open(`/restaurant/${restaurantId}`, '_blank')}
              />
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
