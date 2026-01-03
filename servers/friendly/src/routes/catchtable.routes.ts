import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { ResponseHelper } from '../utils/response.utils';
import restaurantRepository from '../db/repositories/restaurant.repository';
import catchtableReviewRepository from '../db/repositories/catchtable-review.repository';
import catchtableReviewSummaryRepository from '../db/repositories/catchtable-review-summary.repository';
import jobService from '../services/job-socket.service';
import catchtableService from '../services/catchtable.service';
import { catchtableReviewSummaryProcessor } from '../services/catchtable-review-summary-processor.service';

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

  /**
   * GET /:restaurantId/reviews/summary/status
   * 캐치테이블 리뷰 요약 상태 조회
   */
  fastify.get(
    '/:restaurantId/reviews/summary/status',
    {
      schema: {
        tags: ['catchtable'],
        summary: '캐치테이블 리뷰 요약 상태 조회',
        description: '레스토랑의 캐치테이블 리뷰 요약 진행 상태를 조회합니다.',
        params: Type.Object({
          restaurantId: Type.Number({ description: '레스토랑 ID' }),
        }),
        response: {
          200: Type.Object({
            result: Type.Boolean(),
            message: Type.String(),
            data: Type.Object({
              total: Type.Number({ description: '전체 리뷰 수' }),
              completed: Type.Number({ description: '요약 완료 수' }),
              incomplete: Type.Number({ description: '미완료 수' }),
              percentage: Type.Number({ description: '완료율 (%)' }),
            }),
            timestamp: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { restaurantId } = request.params as { restaurantId: number };

      try {
        // 레스토랑 확인
        const restaurant = await restaurantRepository.findById(restaurantId);
        if (!restaurant) {
          return ResponseHelper.notFound(reply, `Restaurant not found: ${restaurantId}`);
        }

        // 통계 조회
        const total = await catchtableReviewRepository.countByRestaurantId(restaurantId);
        const completed = await catchtableReviewSummaryRepository.countCompletedByRestaurantId(
          restaurantId
        );
        const incomplete = await catchtableReviewSummaryRepository.countIncompleteByRestaurantId(
          restaurantId
        );
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return ResponseHelper.success(reply, {
          total,
          completed,
          incomplete,
          percentage,
        });
      } catch (error) {
        console.error('[Catchtable] 요약 상태 조회 에러:', error);
        return ResponseHelper.error(
          reply,
          error instanceof Error ? error.message : 'Failed to get summary status',
          500
        );
      }
    }
  );

  /**
   * POST /:restaurantId/reviews/summarize
   * 캐치테이블 리뷰 요약 시작 (백그라운드 실행)
   */
  fastify.post(
    '/:restaurantId/reviews/summarize',
    {
      schema: {
        tags: ['catchtable'],
        summary: '캐치테이블 리뷰 요약 시작',
        description:
          '레스토랑의 캐치테이블 리뷰를 AI로 요약합니다. 백그라운드에서 실행되며 Socket.io로 진행률을 전송합니다.',
        params: Type.Object({
          restaurantId: Type.Number({ description: '레스토랑 ID' }),
        }),
        body: Type.Object({
          useCloud: Type.Optional(
            Type.Boolean({ description: 'Cloud AI 사용 여부 (기본: false)', default: false })
          ),
        }),
        response: {
          202: Type.Object({
            result: Type.Boolean(),
            message: Type.String(),
            data: Type.Object({
              jobId: Type.String({ description: 'Job ID' }),
              restaurantId: Type.Number(),
              totalToProcess: Type.Number({ description: '처리할 리뷰 수' }),
            }),
            timestamp: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { restaurantId } = request.params as { restaurantId: number };
      const { useCloud = true } = (request.body || {}) as { useCloud?: boolean };

      try {
        // 1. 레스토랑 확인
        const restaurant = await restaurantRepository.findById(restaurantId);
        if (!restaurant) {
          return ResponseHelper.notFound(reply, `Restaurant not found: ${restaurantId}`);
        }

        // 2. 처리할 리뷰 수 확인
        const totalReviews = await catchtableReviewRepository.countByRestaurantId(restaurantId);
        if (totalReviews === 0) {
          return ResponseHelper.validationError(
            reply,
            `Restaurant ${restaurantId} has no catchtable reviews to summarize`
          );
        }

        // 3. Job 시작
        const jobId = await jobService.start({
          restaurantId,
          type: 'restaurant_crawl',
          metadata: {
            task: 'catchtable_review_summary',
            useCloud,
          },
        });

        // 4. 백그라운드 실행 (비동기)
        catchtableReviewSummaryProcessor
          .processWithJobId(jobId, restaurantId, useCloud)
          .then(async (result) => {
            // 완료
            await jobService.complete(jobId, {
              ...result,
              completedAt: Date.now(),
            });
          })
          .catch(async (error) => {
            // 에러
            console.error('[Catchtable] 요약 에러:', error);
            await jobService.error(
              jobId,
              error instanceof Error ? error.message : 'Catchtable review summarization failed'
            );
          });

        // 5. 즉시 응답 (202 Accepted)
        return ResponseHelper.success(
          reply,
          {
            jobId,
            restaurantId,
            totalToProcess: totalReviews,
          },
          '캐치테이블 리뷰 요약이 시작되었습니다',
          202
        );
      } catch (error) {
        console.error('[Catchtable] 요약 라우트 에러:', error);
        return ResponseHelper.error(
          reply,
          error instanceof Error ? error.message : 'Failed to start catchtable review summarization',
          500
        );
      }
    }
  );
};

export default catchtableRoutes;
