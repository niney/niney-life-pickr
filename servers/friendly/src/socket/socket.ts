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
        
        // 타입별로 분류
        const crawlJob = activeJobs.find(job => job.type === 'review_crawl');
        const summaryJob = activeJobs.find(job => job.type === 'review_summary');
        
        // 현재 상태를 클라이언트에 전송
        socket.emit('restaurant:state', {
          restaurantId: parseInt(restaurantId),
          crawl: crawlJob ? {
            jobId: crawlJob.id,
            status: 'active',
            progress: {
              current: crawlJob.progress_current,
              total: crawlJob.progress_total,
              percentage: crawlJob.progress_percentage
            },
            metadata: crawlJob.metadata ? JSON.parse(crawlJob.metadata) : null,
            startedAt: crawlJob.started_at
          } : null,
          summary: summaryJob ? {
            jobId: summaryJob.id,
            status: 'active',
            progress: {
              current: summaryJob.progress_current,
              total: summaryJob.progress_total,
              percentage: summaryJob.progress_percentage
            },
            metadata: summaryJob.metadata ? JSON.parse(summaryJob.metadata) : null,
            startedAt: summaryJob.started_at
          } : null
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
