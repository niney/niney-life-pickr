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
   * POST /:restaurantId/process
   * 캐치테이블 통합 처리 (ID 저장 + 리뷰 크롤링 + 요약)
   */
  fastify.post(
    '/:restaurantId/process',
    {
      schema: {
        tags: ['catchtable'],
        summary: '캐치테이블 통합 처리',
        description:
          '캐치테이블 ID 저장, 리뷰 크롤링, 요약을 옵션에 따라 처리합니다. ID 저장은 동기로, 크롤링/요약은 백그라운드로 실행됩니다.',
        params: Type.Object({
          restaurantId: Type.Number({ description: '레스토랑 ID' }),
        }),
        body: Type.Object({
          catchtableId: Type.Optional(
            Type.Union([Type.String(), Type.Null()], {
              description: '캐치테이블 ID (저장할 경우)',
            })
          ),
          crawlReviews: Type.Optional(
            Type.Boolean({ description: '리뷰 크롤링 여부', default: false })
          ),
          summarizeReviews: Type.Optional(
            Type.Boolean({ description: '리뷰 요약 여부', default: false })
          ),
          useCloud: Type.Optional(
            Type.Boolean({ description: 'Cloud AI 사용 여부', default: true })
          ),
        }),
        response: {
          200: Type.Object({
            result: Type.Boolean(),
            message: Type.String(),
            data: Type.Object({
              catchtableIdUpdated: Type.Boolean({ description: 'ID 저장 여부' }),
              crawlJobId: Type.Optional(Type.String({ description: '크롤링 Job ID' })),
              summarizeJobId: Type.Optional(Type.String({ description: '요약 Job ID' })),
            }),
            timestamp: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { restaurantId } = request.params as { restaurantId: number };
      const {
        catchtableId,
        crawlReviews = false,
        summarizeReviews = false,
        useCloud = true,
      } = (request.body || {}) as {
        catchtableId?: string | null;
        crawlReviews?: boolean;
        summarizeReviews?: boolean;
        useCloud?: boolean;
      };

      try {
        // 1. 레스토랑 조회
        const restaurant = await restaurantRepository.findById(restaurantId);
        if (!restaurant) {
          return ResponseHelper.notFound(reply, `Restaurant not found: ${restaurantId}`);
        }

        const result: {
          catchtableIdUpdated: boolean;
          crawlJobId?: string;
          summarizeJobId?: string;
        } = {
          catchtableIdUpdated: false,
        };

        // 2. 캐치테이블 ID 저장 (동기)
        if (catchtableId !== undefined) {
          await restaurantRepository.updateById(restaurantId, {
            catchtable_id: catchtableId || null,
          });
          result.catchtableIdUpdated = true;
          console.log(`[Catchtable] ID 저장 완료: restaurantId=${restaurantId}, catchtableId=${catchtableId}`);
        }

        // 사용할 catchtableId 결정 (새로 저장된 값 또는 기존 값)
        const effectiveCatchtableId = catchtableId !== undefined ? catchtableId : restaurant.catchtable_id;

        // 3. 리뷰 크롤링 (백그라운드)
        if (crawlReviews) {
          if (!effectiveCatchtableId) {
            return ResponseHelper.validationError(
              reply,
              '리뷰 크롤링을 위해 캐치테이블 ID가 필요합니다'
            );
          }

          const crawlJobId = await jobService.start({
            restaurantId,
            type: 'restaurant_crawl',
            metadata: {
              catchtableId: effectiveCatchtableId,
              task: 'catchtable_review_crawl',
            },
          });

          result.crawlJobId = crawlJobId;

          // 백그라운드 실행
          catchtableService
            .crawlReviews(crawlJobId, restaurantId, effectiveCatchtableId)
            .then(async (crawlResult) => {
              await jobService.complete(crawlJobId, {
                ...crawlResult,
                completedAt: Date.now(),
              });
            })
            .catch(async (error) => {
              console.error('[Catchtable] 크롤링 에러:', error);
              await jobService.error(
                crawlJobId,
                error instanceof Error ? error.message : 'Catchtable review crawling failed'
              );
            });
        }

        // 4. 리뷰 요약 (백그라운드)
        if (summarizeReviews) {
          // 요약은 catchtableId가 없어도 기존 리뷰가 있으면 가능
          const totalReviews = await catchtableReviewRepository.countByRestaurantId(restaurantId);

          if (totalReviews === 0 && !crawlReviews) {
            return ResponseHelper.validationError(
              reply,
              '요약할 캐치테이블 리뷰가 없습니다'
            );
          }

          const summarizeJobId = await jobService.start({
            restaurantId,
            type: 'restaurant_crawl',
            metadata: {
              task: 'catchtable_review_summary',
              useCloud,
            },
          });

          result.summarizeJobId = summarizeJobId;

          // 백그라운드 실행
          catchtableReviewSummaryProcessor
            .processWithJobId(summarizeJobId, restaurantId, useCloud)
            .then(async (summaryResult) => {
              await jobService.complete(summarizeJobId, {
                ...summaryResult,
                completedAt: Date.now(),
              });
            })
            .catch(async (error) => {
              console.error('[Catchtable] 요약 에러:', error);
              await jobService.error(
                summarizeJobId,
                error instanceof Error ? error.message : 'Catchtable review summarization failed'
              );
            });
        }

        // 5. 응답
        const messages: string[] = [];
        if (result.catchtableIdUpdated) messages.push('ID 저장 완료');
        if (result.crawlJobId) messages.push('크롤링 시작');
        if (result.summarizeJobId) messages.push('요약 시작');

        return ResponseHelper.success(
          reply,
          result,
          messages.length > 0 ? messages.join(', ') : '처리할 작업이 없습니다'
        );
      } catch (error) {
        console.error('[Catchtable] 통합 처리 에러:', error);
        return ResponseHelper.error(
          reply,
          error instanceof Error ? error.message : 'Failed to process catchtable',
          500
        );
      }
    }
  );

  /**
   * GET /:restaurantId/reviews
   * 캐치테이블 리뷰 리스트 조회
   */
  fastify.get(
    '/:restaurantId/reviews',
    {
      schema: {
        tags: ['catchtable'],
        summary: '캐치테이블 리뷰 리스트 조회',
        description: '레스토랑의 캐치테이블 리뷰 리스트를 페이지네이션하여 조회합니다.',
        params: Type.Object({
          restaurantId: Type.Number({ description: '레스토랑 ID' }),
        }),
        querystring: Type.Object({
          limit: Type.Optional(
            Type.Number({ description: '조회 개수 (기본: 20, 최대: 100)', default: 20, minimum: 1, maximum: 100 })
          ),
          offset: Type.Optional(
            Type.Number({ description: '조회 시작 위치 (기본: 0)', default: 0, minimum: 0 })
          ),
        }),
        response: {
          200: Type.Object({
            result: Type.Boolean(),
            message: Type.String(),
            data: Type.Object({
              reviews: Type.Array(
                Type.Object({
                  id: Type.Number({ description: '리뷰 ID (reviewSeq)' }),
                  restaurant_id: Type.Number({ description: '레스토랑 ID' }),
                  article_seq: Type.Union([Type.Number(), Type.Null()]),
                  is_editable: Type.Number(),
                  reg_date: Type.Union([Type.Number(), Type.Null()], { description: '작성일 (Unix timestamp)' }),
                  writer_identifier: Type.Union([Type.String(), Type.Null()]),
                  writer_display_name: Type.Union([Type.String(), Type.Null()], { description: '작성자 이름' }),
                  writer_profile_thumb_url: Type.Union([Type.String(), Type.Null()]),
                  writer_grade: Type.Union([Type.String(), Type.Null()]),
                  writer_total_review_cnt: Type.Union([Type.Number(), Type.Null()]),
                  writer_total_avg_score: Type.Union([Type.Number(), Type.Null()]),
                  boss_reply: Type.Union([Type.String(), Type.Null()], { description: '사장님 답글' }),
                  total_score: Type.Union([Type.Number(), Type.Null()], { description: '총점' }),
                  taste_score: Type.Union([Type.Number(), Type.Null()], { description: '맛 점수' }),
                  mood_score: Type.Union([Type.Number(), Type.Null()], { description: '분위기 점수' }),
                  service_score: Type.Union([Type.Number(), Type.Null()], { description: '서비스 점수' }),
                  review_content: Type.Union([Type.String(), Type.Null()], { description: '리뷰 내용' }),
                  review_comment: Type.Union([Type.String(), Type.Null()]),
                  reservation_type: Type.Union([Type.String(), Type.Null()]),
                  is_take_out: Type.Number(),
                  food_type_code: Type.Union([Type.String(), Type.Null()]),
                  food_type_label: Type.Union([Type.String(), Type.Null()]),
                  reply_cnt: Type.Number(),
                  like_cnt: Type.Number(),
                  is_liked: Type.Number(),
                  crawled_at: Type.String(),
                  created_at: Type.String(),
                  updated_at: Type.String(),
                  summary: Type.Optional(Type.Union([
                    Type.Object({
                      summary: Type.Union([Type.String(), Type.Null()]),
                      keyKeywords: Type.Union([Type.Array(Type.String()), Type.Null()]),
                      sentiment: Type.Union([
                        Type.Literal('positive'),
                        Type.Literal('negative'),
                        Type.Literal('neutral'),
                        Type.Null(),
                      ]),
                      sentimentReason: Type.Union([Type.String(), Type.Null()]),
                      satisfactionScore: Type.Union([Type.Number(), Type.Null()]),
                      tips: Type.Union([Type.Array(Type.String()), Type.Null()]),
                      menuItems: Type.Union([Type.Array(Type.Object({
                        name: Type.Union([Type.String(), Type.Null()]),
                        sentiment: Type.Union([
                          Type.Literal('positive'),
                          Type.Literal('negative'),
                          Type.Literal('neutral'),
                          Type.Null(),
                        ]),
                        reason: Type.Optional(Type.Union([Type.String(), Type.Null()])),
                      })), Type.Null()]),
                    }),
                    Type.Null(),
                  ])),
                })
              ),
              pagination: Type.Object({
                total: Type.Number({ description: '전체 리뷰 수' }),
                limit: Type.Number({ description: '조회 개수' }),
                offset: Type.Number({ description: '조회 시작 위치' }),
                hasMore: Type.Boolean({ description: '더 많은 데이터 존재 여부' }),
              }),
            }),
            timestamp: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { restaurantId } = request.params as { restaurantId: number };
      const { limit = 20, offset = 0 } = request.query as { limit?: number; offset?: number };

      try {
        // 레스토랑 확인
        const restaurant = await restaurantRepository.findById(restaurantId);
        if (!restaurant) {
          return ResponseHelper.notFound(reply, `Restaurant not found: ${restaurantId}`);
        }

        // 전체 개수 조회
        const total = await catchtableReviewRepository.countByRestaurantId(restaurantId);

        // 리뷰 리스트 조회 (요약 포함)
        const reviewsWithSummary = await catchtableReviewRepository.findByRestaurantIdPaginatedWithSummary(
          restaurantId,
          limit,
          offset
        );

        // summary_data JSON 파싱
        const reviews = reviewsWithSummary.map(({ summary_data, ...review }) => ({
          ...review,
          summary: summary_data ? (() => {
            try {
              return JSON.parse(summary_data);
            } catch {
              return null;
            }
          })() : null,
        }));

        return ResponseHelper.success(reply, {
          reviews,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + reviews.length < total,
          },
        });
      } catch (error) {
        console.error('[Catchtable] 리뷰 리스트 조회 에러:', error);
        return ResponseHelper.error(
          reply,
          error instanceof Error ? error.message : 'Failed to get reviews',
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
};

export default catchtableRoutes;
