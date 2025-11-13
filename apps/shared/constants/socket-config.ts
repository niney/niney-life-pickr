/**
 * Socket.io 연결 설정
 * JobMonitorScreen, SocketContext에서 공통으로 사용
 */
export const SOCKET_CONFIG = {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: true,
  forceNew: false,
} as const;
