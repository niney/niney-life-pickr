import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import reviewSummaryRepository from '../db/repositories/review-summary.repository';
import reviewSummaryProcessor from '../services/review-summary-processor.service';
import { ResponseHelper } from '../utils/response.utils';

/**
 * 레스토랑의 리뷰 요약 관련 라우트
 * prefix: /api/restaurants
 * 
 * 레스토랑 중심의 리뷰 요약 작업 처리
 */
const reviewSummaryRoutes: FastifyPluginAsync = async (fastify) => {
  
  /**
   * POST /api/restaurants/:id/reviews/summarize
   * 특정 레스토랑의 미완료 리뷰 요약 처리 (배치 작업)
   */
  fastify.post('/:id/reviews/summarize', {
    schema: {
      tags: ['review-summary'],
      summary: '리뷰 요약 생성 (미완료만 처리)',
      params: Type.Object({
        id: Type.String({ description: '레스토랑 ID' })
      }),
      querystring: Type.Object({
        useCloud: Type.Optional(Type.Boolean({ 
          description: 'Cloud AI 사용 여부 (기본: false)', 
          default: false 
        }))
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Optional(Type.Object({
            jobId: Type.Number(),
            restaurantId: Type.Number()
          })),
          timestamp: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { useCloud = false } = request.query as { useCloud?: boolean };
    const restaurantId = parseInt(id, 10);
    
    if (isNaN(restaurantId)) {
      return ResponseHelper.error(reply, '유효하지 않은 레스토랑 ID', 400);
    }
    
    try {
      // Job 시작 및 jobId 반환
      const jobId = await reviewSummaryProcessor.processIncompleteReviews(restaurantId, useCloud);
      
      return ResponseHelper.success(
        reply, 
        { jobId, restaurantId }, 
        '미완료 리뷰 요약 처리가 시작되었습니다. Socket 또는 Job API로 진행 상황을 확인하세요.'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ 리뷰 요약 실패:', errorMessage);
      return ResponseHelper.error(reply, errorMessage, 500);
    }
  });

  /**
   * GET /api/restaurants/:id/reviews/summary/status
   * 요약 상태 조회
   */
  fastify.get('/:id/reviews/summary/status', {
    schema: {
      tags: ['review-summary'],
      summary: '리뷰 요약 상태 조회',
      params: Type.Object({
        id: Type.String({ description: '레스토랑 ID' })
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            total: Type.Number(),
            completed: Type.Number(),
            incomplete: Type.Number(),
            percentage: Type.Number()
          }),
          timestamp: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const restaurantId = parseInt(id, 10);
    
    if (isNaN(restaurantId)) {
      return ResponseHelper.error(reply, '유효하지 않은 레스토랑 ID', 400);
    }
    
    // 전체 리뷰 개수
    const reviewRepository = (await import('../db/repositories/review.repository')).default;
    const total = await reviewRepository.countByRestaurantId(restaurantId);
    
    // 미완료 요약 개수
    const incomplete = await reviewSummaryRepository.countIncompleteByRestaurant(restaurantId);
    const completed = total - incomplete;
    
    return ResponseHelper.success(reply, {
      total,
      completed,
      incomplete,
      percentage: total > 0 ? Math.floor((completed / total) * 100) : 0
    });
  });

  /**
   * GET /api/restaurants/:id/reviews/summaries
   * 완료된 요약 목록 조회
   */
  fastify.get('/:id/reviews/summaries', {
    schema: {
      tags: ['review-summary'],
      summary: '완료된 리뷰 요약 목록 조회',
      params: Type.Object({
        id: Type.String({ description: '레스토랑 ID' })
      })
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const restaurantId = parseInt(id, 10);
    
    if (isNaN(restaurantId)) {
      return ResponseHelper.error(reply, '유효하지 않은 레스토랑 ID', 400);
    }
    
    const summaries = await reviewSummaryRepository.findCompletedByRestaurant(restaurantId);
    
    return ResponseHelper.success(
      reply, 
      summaries, 
      `${summaries.length}개 요약 조회 성공`
    );
  });

  /**
   * POST /api/admin/reviews/summarize-all
   * 전체 미완료 요약 처리 (관리자용)
   */
  fastify.post('/admin/reviews/summarize-all', {
    schema: {
      tags: ['review-summary'],
      summary: '전체 미완료 리뷰 요약 처리 (관리자)',
      querystring: Type.Object({
        useCloud: Type.Optional(Type.Boolean({ 
          description: 'Cloud AI 사용 여부 (기본: false)' 
        }))
      })
    }
  }, async (request, reply) => {
    const { useCloud = false } = request.query as { useCloud?: boolean };
    
    // 백그라운드 실행
    reviewSummaryProcessor.processAllIncomplete(useCloud)
      .catch(err => console.error('❌ 전체 요약 처리 실패:', err));
    
    return ResponseHelper.success(
      reply, 
      null, 
      '전체 미완료 리뷰 요약 처리가 시작되었습니다.'
    );
  });
};

export default reviewSummaryRoutes;
