import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import reviewSummaryRepository from '../db/repositories/review-summary.repository';
import catchtableReviewSummaryRepository from '../db/repositories/catchtable-review-summary.repository';
import tipClusterRepository from '../db/repositories/tip-cluster.repository';
import { createTipClusteringService } from '../services/tip-clustering.service';
import { ResponseHelper } from '../utils/response.utils';

/**
 * 두 테이블에서 팁 수집 (중복 제거)
 */
async function collectAllTips(restaurantId: number): Promise<string[]> {
  // 네이버 리뷰 요약에서 팁 수집
  const naverSummaries = await reviewSummaryRepository.findCompletedByRestaurant(restaurantId);
  const naverTips = naverSummaries.flatMap(s => s.summary?.tips || []);
  
  // 캐치테이블 리뷰 요약에서 팁 수집
  const catchtableSummaries = await catchtableReviewSummaryRepository.findCompletedByRestaurantId(restaurantId);
  const catchtableTips = catchtableSummaries.flatMap(s => s.summary?.tips || []);
  
  // 중복 제거 후 반환
  const allTips = [...naverTips, ...catchtableTips];
  return allTips.filter((tip, idx, arr) => arr.indexOf(tip) === idx);
}

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
   * GET /api/restaurants/:id/reviews/tips
   * 레스토랑의 모든 리뷰에서 추출된 팁 목록 (네이버 + 캐치테이블)
   */
  fastify.get('/:id/reviews/tips', {
    schema: {
      tags: ['review-summary'],
      summary: '레스토랑 리뷰 팁 목록 조회',
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
    
    const tips = await collectAllTips(restaurantId);
    
    return ResponseHelper.success(reply, { tips }, `${tips.length}개 팁 조회`);
  });

  /**
   * GET /api/restaurants/:id/reviews/tips/clustered
   * 클러스터링된 팁 조회 (캐시 있으면 반환, 없으면 생성)
   */
  fastify.get('/:id/reviews/tips/clustered', {
    schema: {
      tags: ['review-summary'],
      summary: '클러스터링된 팁 목록 조회',
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

    // 캐시 확인
    const cached = await tipClusterRepository.findParsedByRestaurantId(restaurantId);
    if (cached) {
      return ResponseHelper.success(reply, { groups: cached, fromCache: true });
    }

    // 팁 수집 (네이버 + 캐치테이블)
    const tips = await collectAllTips(restaurantId);

    if (tips.length === 0) {
      return ResponseHelper.success(reply, { groups: [], fromCache: false });
    }

    // 클러스터링
    const service = createTipClusteringService();
    const groups = await service.cluster(tips);

    // DB 저장
    await tipClusterRepository.upsert({
      restaurant_id: restaurantId,
      cluster_data: groups,
      total_tips: tips.length,
      group_count: groups.length,
    });

    return ResponseHelper.success(reply, { groups, fromCache: false });
  });

  /**
   * POST /api/restaurants/:id/reviews/tips/cluster
   * 팁 클러스터링 강제 재생성
   */
  fastify.post('/:id/reviews/tips/cluster', {
    schema: {
      tags: ['review-summary'],
      summary: '팁 클러스터링 재생성',
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

    // 팁 수집 (네이버 + 캐치테이블)
    const tips = await collectAllTips(restaurantId);

    if (tips.length === 0) {
      return ResponseHelper.success(reply, { groups: [], totalTips: 0 });
    }

    // 클러스터링
    const service = createTipClusteringService();
    const groups = await service.cluster(tips);

    // DB 저장 (기존 덮어쓰기)
    await tipClusterRepository.upsert({
      restaurant_id: restaurantId,
      cluster_data: groups,
      total_tips: tips.length,
      group_count: groups.length,
    });

    return ResponseHelper.success(
      reply,
      { groups, totalTips: tips.length, groupCount: groups.length },
      `${tips.length}개 팁 → ${groups.length}개 그룹으로 클러스터링 완료`
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
