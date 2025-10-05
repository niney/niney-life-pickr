import { Server as SocketIOServer } from 'socket.io';
import type { FastifyInstance } from 'fastify';

let io: SocketIOServer | null = null;

/**
 * Socket.io 서버 초기화
 */
export function initializeSocketIO(fastify: FastifyInstance): SocketIOServer {
  const allowedOrigins = process.env.CORS_ORIGIN || 'http://localhost:3000';

  io = new SocketIOServer(fastify.server, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // 특정 job 구독
    socket.on('subscribe:job', (jobId: string) => {
      socket.join(`job:${jobId}`);
      console.log(`[Socket.io] Client ${socket.id} subscribed to job:${jobId}`);
    });

    // job 구독 해제
    socket.on('unsubscribe:job', (jobId: string) => {
      socket.leave(`job:${jobId}`);
      console.log(`[Socket.io] Client ${socket.id} unsubscribed from job:${jobId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket.io] Server initialized');
  return io;
}

/**
 * Socket.io 인스턴스 가져오기
 */
export function getSocketIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io is not initialized. Call initializeSocketIO() first.');
  }
  return io;
}

export { io };
