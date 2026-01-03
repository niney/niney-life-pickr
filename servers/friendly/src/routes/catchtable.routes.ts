import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { ResponseHelper } from '../utils/response.utils';
import restaurantRepository from '../db/repositories/restaurant.repository';
import catchtableReviewRepository from '../db/repositories/catchtable-review.repository';
import type { CatchtableApiResponse, CatchtableApiReview } from '../types/catchtable.types';

// 상수
const CATCHTABLE_API_BASE = 'https://ct-api.catchtable.co.kr/api/review/v1/shops';
const PAGE_SIZE = 12;
const MAX_REVIEWS = 300;
const DELAY_MS = 500;

/**
 * 캐치테이블 리뷰 크롤링 라우트
 */
const catchtableRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /:restaurantId/reviews/crawl
   * 캐치테이블 리뷰 크롤링
   */
  fastify.post(
    '/:restaurantId/reviews/crawl',
    {
      schema: {
        tags: ['catchtable'],
        summary: '캐치테이블 리뷰 크롤링',
        description:
          '레스토랑의 catchtable_id를 사용하여 캐치테이블 API에서 리뷰를 수집합니다. 최대 300개까지 수집하며, 0.5초 간격으로 페이지네이션 호출합니다.',
        params: Type.Object({
          restaurantId: Type.Number({ description: '레스토랑 ID' }),
        }),
        response: {
          200: Type.Object({
            result: Type.Boolean(),
            message: Type.String(),
            data: Type.Object({
              restaurantId: Type.Number(),
              catchtableId: Type.String(),
              totalFetched: Type.Number({ description: '외부 API에서 가져온 리뷰 수' }),
              totalSaved: Type.Number({ description: 'DB에 저장된 리뷰 수' }),
              newReviews: Type.Number({ description: '새로 추가된 리뷰 수' }),
              updatedReviews: Type.Number({ description: '업데이트된 리뷰 수' }),
              pagesProcessed: Type.Number({ description: '처리된 페이지 수' }),
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

        console.log(
          `[Catchtable] 리뷰 크롤링 시작: restaurantId=${restaurantId}, catchtableId=${catchtableId}`
        );

        // 3. 크롤링 전 기존 리뷰 수 확인
        const existingCount = await catchtableReviewRepository.countByRestaurantId(restaurantId);

        // 4. 페이지네이션 호출
        let page = 1;
        let totalFetched = 0;
        let allReviews: CatchtableApiReview[] = [];

        while (totalFetched < MAX_REVIEWS) {
          const url = `${CATCHTABLE_API_BASE}/${catchtableId}/reviews?page=${page}&size=${PAGE_SIZE}&sort=D`;
          console.log(`[Catchtable] Fetching page ${page}: ${url}`);

          const response = await fetch(url, {
            headers: {
              Accept: 'application/json',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });

          if (!response.ok) {
            console.error(`[Catchtable] API 에러: ${response.status} ${response.statusText}`);
            break;
          }

          const data: CatchtableApiResponse = await response.json();
          const reviews = data.data?.items || [];

          if (reviews.length === 0) {
            console.log(`[Catchtable] 페이지 ${page}: 더 이상 리뷰 없음`);
            break;
          }

          allReviews.push(...reviews);
          totalFetched += reviews.length;

          console.log(
            `[Catchtable] 페이지 ${page}: ${reviews.length}개 리뷰 수집 (총 ${totalFetched}개)`
          );

          // 최대 리뷰 수 도달 체크
          if (totalFetched >= MAX_REVIEWS) {
            console.log(`[Catchtable] 최대 리뷰 수 ${MAX_REVIEWS}개 도달`);
            allReviews = allReviews.slice(0, MAX_REVIEWS);
            break;
          }

          // 마지막 페이지 체크
          if (reviews.length < PAGE_SIZE) {
            break;
          }

          // 0.5초 딜레이
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
          page++;
        }

        // 5. DB 저장
        let savedCount = 0;
        for (const review of allReviews) {
          try {
            await catchtableReviewRepository.upsertReview({
              restaurant_id: restaurantId,
              review_seq: review.reviewSeq,
              article_seq: review.articleSeq || null,
              is_editable: review.isEditable,
              reg_date: review.regDate || null,
              writer_identifier: review.writer?.userIdentifier || null,
              writer_display_name: review.writer?.displayName || null,
              writer_profile_thumb_url: review.writer?.profileThumbUrl || null,
              writer_grade: review.writer?.grade || null,
              writer_total_review_cnt: review.writer?.totalReviewCnt || null,
              writer_total_avg_score: review.writer?.totalAvgScore || null,
              boss_reply: review.bossReply || null,
              total_score: review.content?.totalScore || null,
              taste_score: review.content?.tasteScore || null,
              mood_score: review.content?.moodScore || null,
              service_score: review.content?.serviceScore || null,
              review_content: review.content?.reviewContent || null,
              review_comment: review.content?.reviewComment || null,
              reservation_type: review.reservation?.reservationType || null,
              is_take_out: review.reservation?.isTakeOut || false,
              food_type_code: review.reservation?.foodType?.code || null,
              food_type_label: review.reservation?.foodType?.label || null,
              reply_cnt: review.engagement?.replyCnt || 0,
              like_cnt: review.engagement?.likeCnt || 0,
              is_liked: review.engagement?.isLiked || false,
            });
            savedCount++;
          } catch (error) {
            console.error(`[Catchtable] 리뷰 저장 실패 (reviewSeq: ${review.reviewSeq}):`, error);
          }
        }

        // 6. 저장 후 리뷰 수 확인
        const finalCount = await catchtableReviewRepository.countByRestaurantId(restaurantId);
        const newReviews = finalCount - existingCount;
        const updatedReviews = savedCount - newReviews;

        console.log(
          `[Catchtable] 크롤링 완료: 총 ${totalFetched}개 수집, ${savedCount}개 저장 (신규: ${newReviews}, 업데이트: ${updatedReviews})`
        );

        return ResponseHelper.success(
          reply,
          {
            restaurantId,
            catchtableId,
            totalFetched,
            totalSaved: savedCount,
            newReviews: Math.max(0, newReviews),
            updatedReviews: Math.max(0, updatedReviews),
            pagesProcessed: page,
          },
          `캐치테이블 리뷰 크롤링 완료: ${savedCount}개 저장`
        );
      } catch (error) {
        console.error('[Catchtable] 크롤링 에러:', error);
        return ResponseHelper.error(
          reply,
          error instanceof Error ? error.message : 'Catchtable review crawling failed',
          500
        );
      }
    }
  );
};

export default catchtableRoutes;
