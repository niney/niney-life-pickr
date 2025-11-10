import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import jobManager from '../services/job-manager.service';
import jobRepository from '../db/repositories/job.repository';
import jobService from '../services/job-socket.service';
import { ResponseHelper } from '../utils/response.utils';

/**
 * Job 관리 라우트
 */
const jobRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/jobs/:jobId
   * Job 상태 조회
   */
  fastify.get('/:jobId', {
    schema: {
      tags: ['jobs'],
      summary: 'Job 상태 조회',
      description: 'Job ID로 크롤링 작업 상태를 조회합니다',
      params: Type.Object({
        jobId: Type.String({ description: 'Job ID' })
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Any(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string };

    // In-Memory에서 먼저 조회
    let job = jobManager.getJob(jobId);

    // 없으면 DB에서 조회
    if (!job) {
      const dbJob = await jobRepository.findById(jobId);
      if (!dbJob) {
        return ResponseHelper.notFound(reply, 'Job not found');
      }

      // DB 데이터를 Job 형식으로 변환
      const metadata = dbJob.metadata ? JSON.parse(dbJob.metadata) : {};
      const result = dbJob.result ? JSON.parse(dbJob.result) : undefined;
      
      job = {
        jobId: dbJob.id,
        restaurantId: dbJob.restaurant_id,
        placeId: metadata.placeId || '',
        url: metadata.url || '',
        status: dbJob.status as any,
        progress: {
          current: dbJob.progress_current,
          total: dbJob.progress_total,
          percentage: dbJob.progress_percentage
        },
        result: result,
        error: dbJob.error_message || undefined,
        createdAt: new Date(dbJob.created_at),
        startedAt: dbJob.started_at ? new Date(dbJob.started_at) : undefined,
        completedAt: dbJob.completed_at ? new Date(dbJob.completed_at) : undefined
      };
    }

    return ResponseHelper.success(reply, job);
  });

  /**
   * DELETE /api/jobs/:jobId
   * Job 중단
   */
  fastify.delete('/:jobId', {
    schema: {
      tags: ['jobs'],
      summary: 'Job 중단',
      description: '실행 중인 크롤링 작업을 중단합니다',
      params: Type.Object({
        jobId: Type.String({ description: 'Job ID' })
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Any(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string };

    // Job 조회 (메모리 우선, 없으면 DB)
    const jobInfo = await jobService.getJob(jobId);
    if (!jobInfo) {
      return ResponseHelper.notFound(reply, 'Job not found');
    }

    const job = jobInfo.job as any;
    
    if (job.status !== 'active' && job.status !== 'waiting') {
      return ResponseHelper.error(reply, `Cannot cancel job with status: ${job.status}`, 400);
    }

    // Job 취소 (메모리 + DB 동시, Socket 이벤트 없음 - API 응답으로 충분)
    if (jobInfo.source === 'memory') {
      jobManager.cancelJob(jobId);
    }
    await jobRepository.cancel(jobId);

    return ResponseHelper.success(reply, {
      jobId,
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    }, 'Job cancelled successfully');
  });

  /**
   * GET /api/jobs
   * 모든 Job 조회
   * 
   * Job 관리 화면용 전체 Job 목록 조회
   * - Memory + DB 조합으로 현재 실행 중인 Job과 과거 Job 모두 조회
   * - isInterrupted 플래그: DB에는 active지만 메모리에 없는 Job (서버 재시작/에러로 중단)
   */
  fastify.get('/', {
    schema: {
      tags: ['jobs'],
      summary: '모든 Job 조회',
      description: 'Job 관리 화면용 전체 Job 목록 조회 (isInterrupted 플래그 포함)',
      querystring: Type.Object({
        status: Type.Optional(Type.String({ 
          description: 'Job 상태 필터 (active, completed, failed, cancelled)',
          default: 'active'
        })),
        limit: Type.Optional(Type.Number({ 
          description: '조회 개수', 
          default: 100 
        }))
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Any(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    const { status, limit = 100 } = request.query as { status?: string; limit?: number };

    // DB에서 Job 조회
    let dbJobs;
    if (status === 'active') {
      // active Job만 조회
      dbJobs = await jobRepository.findAllActive();
    } else if (status) {
      // 특정 상태만 조회 (findByRestaurant를 활용, 추후 개선 가능)
      const allJobs = await jobRepository.findByRestaurant(0, limit * 2);
      dbJobs = allJobs.filter((job: any) => job.status === status);
    } else {
      // 전체 조회 (최근 N개)
      dbJobs = await jobRepository.findByRestaurant(0, limit);
    }

    // Memory Job과 비교하여 중단 여부 체크
    const jobs = dbJobs.map((dbJob: any) => {
      const memoryJob = jobManager.getJob(dbJob.id);
      const metadata = dbJob.metadata ? JSON.parse(dbJob.metadata) : {};
      const result = dbJob.result ? JSON.parse(dbJob.result) : undefined;

      return {
        jobId: dbJob.id,
        restaurantId: dbJob.restaurant_id,
        type: dbJob.type,
        status: dbJob.status,
        isInterrupted: !memoryJob && dbJob.status === 'active', // ⭐ 중단 플래그
        progress: {
          current: dbJob.progress_current || 0,
          total: dbJob.progress_total || 0,
          percentage: dbJob.progress_percentage || 0
        },
        metadata,
        result,
        error: dbJob.error_message,
        createdAt: dbJob.created_at,
        startedAt: dbJob.started_at,
        completedAt: dbJob.completed_at
      };
    }).slice(0, limit);

    return ResponseHelper.success(reply, {
      total: jobs.length,
      jobs
    });
  });
};

export default jobRoutes;
