import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import reviewSummaryRepository from '../db/repositories/review-summary.repository';
import reviewSummaryProcessor from '../services/review-summary-processor.service';
import { ResponseHelper } from '../utils/response.utils';

const reviewSummaryRoutes: FastifyPluginAsync = async (fastify) => {
  
  /**
   * POST /api/restaurants/:id/reviews/summarize
   * 미완료 요약 처리 (재시도)
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
          success: Type.Boolean(),
          message: Type.String()
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
    
    // 백그라운드 실행 (비동기)
    reviewSummaryProcessor.processIncompleteReviews(restaurantId, useCloud)
      .catch(err => console.error('❌ 리뷰 요약 실패:', err));
    
    return ResponseHelper.success(
      reply, 
      null, 
      '미완료 리뷰 요약 처리가 시작되었습니다. Socket으로 진행 상황을 확인하세요.'
    );
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
          success: Type.Boolean(),
          data: Type.Object({
            total: Type.Number(),
            completed: Type.Number(),
            incomplete: Type.Number(),
            percentage: Type.Number()
          }),
          message: Type.String()
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
