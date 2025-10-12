import { Server as SocketIOServer } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import jobRepository from '../db/repositories/job.repository';

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

    // Place ID 기반 구독 (여러 사용자가 동일 레스토랑 리뷰 실시간 공유)
    socket.on('subscribe:place', (placeId: string) => {
      socket.join(`place:${placeId}`);
      console.log(`[Socket.io] Client ${socket.id} subscribed to place:${placeId}`);
    });

    // Place ID 구독 해제
    socket.on('unsubscribe:place', (placeId: string) => {
      socket.leave(`place:${placeId}`);
      console.log(`[Socket.io] Client ${socket.id} unsubscribed from place:${placeId}`);
    });

    // Restaurant ID 기반 구독 (여러 사용자가 동일 레스토랑 리뷰 실시간 공유)
    socket.on('subscribe:restaurant', async (restaurantId: string) => {
      await socket.join(`restaurant:${restaurantId}`);
      console.log(`[Socket.io] Client ${socket.id} subscribed to restaurant:${restaurantId}`);

      // 현재 활성 Job 조회 및 상태 전송
      try {
        const activeJobs = await jobRepository.findActiveByRestaurant(parseInt(restaurantId));

        // 타입별로 최신 Job만 선택 (중복 방지)
        const jobsByType = activeJobs.reduce((acc, job) => {
          if (!acc[job.type] || new Date(job.created_at) > new Date(acc[job.type].created_at)) {
            acc[job.type] = job;
          }
          return acc;
        }, {} as Record<string, typeof activeJobs[0]>);

        // 활성 Job 타입 추적
        const activeJobTypes = new Set(Object.keys(jobsByType));

        // 활성 Job이 없는 타입에 대해 "진행 없음" 상태 전송
        const allJobTypes = ['review_crawl', 'review_summary'];
        allJobTypes.forEach((jobType) => {
          if (!activeJobTypes.has(jobType)) {
            const eventName = jobType === 'review_crawl'
              ? 'review:no_active_job'
              : 'review_summary:no_active_job';

            socket.emit(eventName, {
              restaurantId: parseInt(restaurantId),
              type: jobType,
              status: 'idle',
              timestamp: Date.now()
            });

            console.log(`[Socket.io] Sent ${eventName} to ${socket.id} - No active job`);
          }
        });

        console.log(`[Socket.io] Sent state to ${socket.id} - Active jobs: ${activeJobs.length}`);
      } catch (error) {
        console.error(`[Socket.io] Error fetching active jobs for restaurant ${restaurantId}:`, error);
      }
    });

    // Restaurant ID 구독 해제
    socket.on('unsubscribe:restaurant', (restaurantId: string) => {
      socket.leave(`restaurant:${restaurantId}`);
      console.log(`[Socket.io] Client ${socket.id} unsubscribed from restaurant:${restaurantId}`);
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
