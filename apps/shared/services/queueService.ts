/**
 * Queue 관리 Service
 * Web/Mobile JobMonitor에서 Queue 아이템 조작 시 사용
 */

import { getDefaultApiUrl } from './api.config';
import type { ApiResponse } from './api.service';

const API_BASE_URL = getDefaultApiUrl();

/**
 * Queue 아이템 취소 (DELETE)
 *
 * @param queueId - 취소할 Queue 아이템 ID
 * @returns API 응답
 *
 * @example
 * ```typescript
 * await cancelQueueItem('queue-123');
 * ```
 */
export async function cancelQueueItem(queueId: string): Promise<ApiResponse<void>> {
  const url = `${API_BASE_URL}/api/queue/${queueId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }

  return data as ApiResponse<void>;
}
