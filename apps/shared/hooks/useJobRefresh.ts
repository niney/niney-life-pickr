/**
 * Job Refresh Hook
 * Pull-to-Refresh 및 수동 Refresh 로직 제공
 */

import { useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

export interface UseJobRefreshParams {
  socket: Socket | null;
  socketConnected: boolean;
}

export interface UseJobRefreshReturn {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

/**
 * Job 및 Queue 데이터 새로고침 Hook
 *
 * @param params - socket 및 연결 상태
 * @returns refreshing 상태 및 onRefresh 함수
 *
 * @example
 * ```typescript
 * const { refreshing, onRefresh } = useJobRefresh({ socket, socketConnected });
 *
 * // Pull-to-Refresh에서 사용
 * <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
 *   ...
 * </ScrollView>
 * ```
 */
export function useJobRefresh({ socket, socketConnected }: UseJobRefreshParams): UseJobRefreshReturn {
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Refresh 핸들러
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
      console.error('[useJobRefresh] Refresh failed:', error);
      setRefreshing(false);
    }
  }, [socket, socketConnected]);

  return {
    refreshing,
    onRefresh,
  };
}
