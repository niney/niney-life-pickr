import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import jobManager from '../services/job-manager.service';
import crawlJobRepository from '../db/repositories/crawl-job.repository';
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
      const dbJob = await crawlJobRepository.findById(jobId);
      if (!dbJob) {
        return ResponseHelper.notFound(reply, 'Job not found');
      }

      // DB 데이터를 Job 형식으로 변환
      job = {
        jobId: dbJob.job_id,
        restaurantId: dbJob.restaurant_id,
        placeId: dbJob.place_id,
        url: dbJob.url,
        status: dbJob.status,
        progress: {
          current: dbJob.progress_current,
          total: dbJob.progress_total,
          percentage: dbJob.progress_percentage
        },
        result: dbJob.total_reviews !== null ? {
          totalReviews: dbJob.total_reviews!,
          savedToDb: dbJob.saved_to_db!
        } : undefined,
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

    const job = jobManager.getJob(jobId);
    if (!job) {
      return ResponseHelper.notFound(reply, 'Job not found');
    }

    if (job.status !== 'active' && job.status !== 'waiting') {
      return ResponseHelper.error(reply, `Cannot cancel job with status: ${job.status}`, 400);
    }

    // Job 취소
    jobManager.cancelJob(jobId);
    await crawlJobRepository.updateStatus(jobId, 'cancelled', {
      completedAt: new Date()
    });

    return ResponseHelper.success(reply, {
      jobId,
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    }, 'Job cancelled successfully');
  });

  /**
   * GET /api/jobs
   * 모든 Job 조회
   */
  fastify.get('/', {
    schema: {
      tags: ['jobs'],
      summary: '모든 Job 조회',
      description: '크롤링 작업 목록을 조회합니다',
      querystring: Type.Object({
        status: Type.Optional(Type.String({ description: 'Job 상태 필터' })),
        limit: Type.Optional(Type.Number({ description: '조회 개수', default: 20 }))
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
    const { status, limit = 20 } = request.query as { status?: string; limit?: number };

    // In-Memory + DB 조합
    const memoryJobs = jobManager.getAllJobs(status);
    const dbJobs = await crawlJobRepository.findAll(status, limit);

    // 중복 제거 (Memory 우선)
    const jobMap = new Map();
    memoryJobs.forEach(job => jobMap.set(job.jobId, job));

    dbJobs.forEach(dbJob => {
      if (!jobMap.has(dbJob.job_id)) {
        jobMap.set(dbJob.job_id, {
          jobId: dbJob.job_id,
          restaurantId: dbJob.restaurant_id,
          placeId: dbJob.place_id,
          url: dbJob.url,
          status: dbJob.status,
          progress: {
            current: dbJob.progress_current,
            total: dbJob.progress_total,
            percentage: dbJob.progress_percentage
          },
          createdAt: new Date(dbJob.created_at)
        });
      }
    });

    const jobs = Array.from(jobMap.values()).slice(0, limit);

    return ResponseHelper.success(reply, {
      total: jobs.length,
      jobs
    });
  });
};

export default jobRoutes;
