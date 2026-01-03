import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { ResponseHelper } from '../utils/response.utils';
import restaurantRepository from '../db/repositories/restaurant.repository';
import jobService from '../services/job-socket.service';
import catchtableService from '../services/catchtable.service';

/**
 * 캐치테이블 리뷰 크롤링 라우트
 */
const catchtableRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /:restaurantId/reviews/crawl
   * 캐치테이블 리뷰 크롤링 (백그라운드 실행)
   */
  fastify.post(
    '/:restaurantId/reviews/crawl',
    {
      schema: {
        tags: ['catchtable'],
        summary: '캐치테이블 리뷰 크롤링',
        description:
          '레스토랑의 catchtable_id를 사용하여 캐치테이블 API에서 리뷰를 수집합니다. 백그라운드에서 실행되며 Socket.io로 진행률을 전송합니다.',
        params: Type.Object({
          restaurantId: Type.Number({ description: '레스토랑 ID' }),
        }),
        response: {
          202: Type.Object({
            result: Type.Boolean(),
            message: Type.String(),
            data: Type.Object({
              jobId: Type.String({ description: 'Job ID' }),
              restaurantId: Type.Number(),
              catchtableId: Type.String(),
            }),
            timestamp: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { restaurantId } = request.params as { restaurantId: number };

      try {
        // 1. 레스토랑 조회
        const restaurant = await restaurantRepository.findById(restaurantId);
        if (!restaurant) {
          return ResponseHelper.notFound(reply, `Restaurant not found: ${restaurantId}`);
        }

        // 2. catchtable_id 확인
        const catchtableId = restaurant.catchtable_id;
        if (!catchtableId) {
          return ResponseHelper.validationError(
            reply,
            `Restaurant ${restaurantId} does not have a catchtable_id`
          );
        }

        // 3. Job 시작
        const jobId = await jobService.start({
          restaurantId,
          type: 'restaurant_crawl',
          metadata: {
            catchtableId,
            task: 'catchtable_review_crawl',
          },
        });

        // 4. 백그라운드 실행 (비동기)
        catchtableService
          .crawlReviews(jobId, restaurantId, catchtableId)
          .then(async (result) => {
            // 완료
            await jobService.complete(jobId, {
              ...result,
              completedAt: Date.now(),
            });
          })
          .catch(async (error) => {
            // 에러
            console.error('[Catchtable] 크롤링 에러:', error);
            await jobService.error(
              jobId,
              error instanceof Error ? error.message : 'Catchtable review crawling failed'
            );
          });

        // 5. 즉시 응답 (202 Accepted)
        return ResponseHelper.success(
          reply,
          {
            jobId,
            restaurantId,
            catchtableId,
          },
          '캐치테이블 리뷰 크롤링이 시작되었습니다',
          202
        );
      } catch (error) {
        console.error('[Catchtable] 라우트 에러:', error);
        return ResponseHelper.error(
          reply,
          error instanceof Error ? error.message : 'Failed to start catchtable review crawling',
          500
        );
      }
    }
  );
};

export default catchtableRoutes;
