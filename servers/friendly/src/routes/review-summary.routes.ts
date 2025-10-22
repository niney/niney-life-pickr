import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import reviewSummaryRepository from '../db/repositories/review-summary.repository';
import { ResponseHelper } from '../utils/response.utils';

/**
 * 레스토랑의 리뷰 요약 관련 라우트
 * prefix: /api/restaurants
 * 
 * 레스토랑 중심의 리뷰 요약 작업 처리
 * 
 * ⚠️ 요약 생성 API는 제거되었습니다.
 * 대신 통합 크롤링 API를 사용하세요:
 * POST /api/crawler/crawl { restaurantId, createSummary: true }
 */
const reviewSummaryRoutes: FastifyPluginAsync = async (fastify) => {

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
   * ⚠️ Deprecated: 이 API는 제거되었습니다.
   * 대신 통합 크롤링 API를 각 레스토랑별로 호출하세요.
   */
  fastify.post('/admin/reviews/summarize-all', {
    schema: {
      tags: ['review-summary'],
      summary: '전체 미완료 리뷰 요약 처리 (Deprecated)',
      deprecated: true,
      querystring: Type.Object({
        useCloud: Type.Optional(Type.Boolean({ 
          description: 'Cloud AI 사용 여부 (기본: false)' 
        }))
      })
    }
  }, async (_request, reply) => {
    return ResponseHelper.error(
      reply,
      '이 API는 Deprecated 되었습니다. POST /api/crawler/crawl { restaurantId, createSummary: true }를 사용하세요.',
      410 // Gone
    );
  });
};

export default reviewSummaryRoutes;
