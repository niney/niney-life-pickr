import { Server as SocketIOServer } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import jobRepository from '../db/repositories/job.repository';
import restaurantRepository from '../db/repositories/restaurant.repository';
import jobManager from '../services/job-manager.service';
import { getInterruptEventName } from './events';

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
        // 1. 레스토랑 정보 조회 (단일 쿼리)
        const restaurant = await restaurantRepository.findById(parseInt(restaurantId));

        // 2. 활성 Job 조회
        const dbActiveJobs = await jobRepository.findActiveByRestaurant(parseInt(restaurantId));

        // 활성 Job의 이벤트명 목록 수집
        const activeEventNames: string[] = [];
        const interruptedJobs: any[] = [];

        // DB에서 조회된 활성 Job 처리
        for (const job of dbActiveJobs) {
          // 메모리에 해당 Job이 있는지 확인
          const memoryJob = jobManager.getJob(job.id);

          if (memoryJob) {
            // 메모리에 있음 = 실제 실행 중 → 진행률 전송
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
          } else {
            // 메모리에 없음 = 중단됨 (서버 재시작/에러) → 중단 알림만 전송 (DB는 유지)
            interruptedJobs.push(job);

            // 클라이언트에 중단 이벤트 전송
            const interruptEvent = getInterruptEventName(job.type as any);
            socket.emit(interruptEvent, {
              jobId: job.id,
              type: job.type,
              restaurantId: job.restaurant_id,
              status: 'interrupted',
              reason: 'Server restarted',
              timestamp: Date.now()
            });

            console.log(`[Socket.io] Job ${job.id} (${job.type}) interrupted - notified client ${socket.id}`);
          }
        }

        // 현재 상태 정보 전송 (항상 전송)
        socket.emit('restaurant:current_state', {
          restaurantId: parseInt(restaurantId),
          restaurant: restaurant ? {
            id: restaurant.id,
            name: restaurant.name,
            category: restaurant.category,
            address: restaurant.address,
            placeId: restaurant.place_id
          } : undefined,
          activeEventNames, // 현재 활성화된 이벤트 목록
          interruptedCount: interruptedJobs.length,
          hasActiveJobs: activeEventNames.length > 0,
          timestamp: Date.now()
        });

        console.log(`[Socket.io] Sent current state to ${socket.id} - Active: ${activeEventNames.length}, Interrupted: ${interruptedJobs.length}`);
      } catch (error) {
        console.error(`[Socket.io] Error fetching active jobs for restaurant ${restaurantId}:`, error);
      }
    });

    // Restaurant ID 구독 해제22222
    socket.on('unsubscribe:restaurant', (restaurantId: string) => {
      socket.leave(`restaurant:${restaurantId}`);
      console.log(`[Socket.io] Client ${socket.id} unsubscribed from restaurant:${restaurantId}`);
    });

    /**
     * 전체 Job 조회 구독 (Job 관리 화면용)
     * - restaurant:current_state와 유사하지만 모든 레스토랑의 Job 조회
     * - HTTP API 대신 Socket 통신으로 초기 데이터 로딩
     */
    socket.on('subscribe:all_jobs', async () => {
      console.log(`[Socket.io] Client ${socket.id} subscribed to all jobs`);

      try {
        // 1. DB에서 active Job 조회 (Restaurant 정보 포함)
        const dbActiveJobs = await jobRepository.findAllActiveWithRestaurant();

        // 2. Memory Job과 비교하여 중단 여부 체크
        const jobs = dbActiveJobs.map((dbJob) => {
          const memoryJob = jobManager.getJob(dbJob.id);
          const metadata = dbJob.metadata ? JSON.parse(dbJob.metadata) : {};

          return {
            jobId: dbJob.id,
            restaurantId: dbJob.restaurant_id,
            restaurant: dbJob.restaurant_name ? {
              id: dbJob.restaurant_id,
              name: dbJob.restaurant_name,
              category: dbJob.restaurant_category,
              address: dbJob.restaurant_address,
            } : undefined,
            type: dbJob.type,
            status: dbJob.status,
            isInterrupted: !memoryJob && dbJob.status === 'active', // ⭐ 중단 플래그
            progress: {
              current: metadata.current || 0,
              total: metadata.total || 0,
              percentage: metadata.percentage || 0
            },
            metadata,
            error: dbJob.error_message,
            createdAt: new Date(dbJob.created_at).getTime(),
            startedAt: dbJob.started_at ? new Date(dbJob.started_at).getTime() : undefined,
            completedAt: dbJob.completed_at ? new Date(dbJob.completed_at).getTime() : undefined
          };
        });

        // 3. 초기 상태 전송 (restaurantIds는 클라이언트에서 추출)
        socket.emit('jobs:current_state', {
          total: jobs.length,
          jobs,
          timestamp: Date.now()
        });

        console.log(`[Socket.io] Sent all jobs to ${socket.id} - Total: ${jobs.length}`);
      } catch (error) {
        console.error(`[Socket.io] Error fetching all jobs:`, error);

        // 에러 이벤트 전송
        socket.emit('jobs:error', {
          message: 'Failed to fetch jobs',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        });
      }
    });

    /**
     * 전체 Job 구독 해제
     */
    socket.on('unsubscribe:all_jobs', () => {
      console.log(`[Socket.io] Client ${socket.id} unsubscribed from all jobs`);
      // 특별한 처리 불필요 (Room 기반 아님)
    });

    /**
     * ✅ Queue 구독 (Job Queue 관리 화면용)
     * - 메모리에 저장된 Queue 목록 조회
     * - HTTP API 대신 Socket 통신으로 초기 데이터 로딩
     */
    socket.on('subscribe:queue', async () => {
      console.log(`[Socket.io] Client ${socket.id} subscribed to queue`);

      try {
        const jobQueueManager = await import('../services/job-queue-manager.service');

        // Queue 조회 (레스토랑 정보 포함)
        const queue = await jobQueueManager.default.getQueueWithRestaurants();
        const stats = jobQueueManager.default.getStats();

        // 초기 상태 전송
        socket.emit('queue:current_state', {
          total: queue.length,
          queue,
          stats,
          timestamp: Date.now(),
        });

        console.log(
          `[Socket.io] Sent queue state to ${socket.id} - Total: ${queue.length}, Waiting: ${stats.waiting}, Processing: ${stats.processing}`
        );
      } catch (error) {
        console.error(`[Socket.io] Error fetching queue:`, error);

        socket.emit('queue:error', {
          message: 'Failed to fetch queue',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        });
      }
    });

    /**
     * ✅ Queue 구독 해제
     */
    socket.on('unsubscribe:queue', () => {
      console.log(`[Socket.io] Client ${socket.id} unsubscribed from queue`);
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
