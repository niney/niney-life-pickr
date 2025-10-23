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

        // 활성 Job의 이벤트명 목록 수집
        const activeEventNames: string[] = [];

        // 활성 Job이 있으면 저장된 진행률을 클라이언트에 전송
        for (const job of activeJobs) {
          if (job.event_name && job.metadata) {
            try {
              const metadata = JSON.parse(job.metadata);
              
              // 저장된 이벤트 이름으로 진행률 전송
              socket.emit(job.event_name, {
                jobId: job.id,
                type: job.type,
                restaurantId: job.restaurant_id,
                status: 'progress',
                ...metadata,
                timestamp: Date.now()
              });

              activeEventNames.push(job.event_name);
              console.log(`[Socket.io] Sent saved progress to ${socket.id} - Event: ${job.event_name}, Progress: ${metadata.percentage}%`);
            } catch (error) {
              console.error(`[Socket.io] Failed to parse job metadata for job ${job.id}:`, error);
            }
          }
        }

        // 현재 상태 정보 전송 (항상 전송)
        socket.emit('restaurant:current_state', {
          restaurantId: parseInt(restaurantId),
          activeEventNames, // 현재 활성화된 이벤트 목록
          hasActiveJobs: activeJobs.length > 0,
          timestamp: Date.now()
        });

        console.log(`[Socket.io] Sent current state to ${socket.id} - Active jobs: ${activeJobs.length}, Events: [${activeEventNames.join(', ')}]`);
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
