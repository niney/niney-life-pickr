import catchtableReviewRepository from '../db/repositories/catchtable-review.repository';
import jobService from './job-socket.service';
import { SOCKET_EVENTS } from '../socket/events';
import type { CatchtableApiResponse, CatchtableApiReview } from '../types/catchtable.types';

// 상수
const CATCHTABLE_API_BASE = 'https://ct-api.catchtable.co.kr/api/review/v1/shops';
const PAGE_SIZE = 12;
const MAX_REVIEWS = 300;
const DELAY_MS = 500;

export interface CatchtableReviewCrawlResult {
  restaurantId: number;
  catchtableId: string;
  totalFetched: number;
  totalSaved: number;
  newReviews: number;
  updatedReviews: number;
  pagesProcessed: number;
}

class CatchtableService {
  /**
   * 캐치테이블 리뷰 크롤링 (with Job + Socket)
   */
  async crawlReviews(
    jobId: string,
    restaurantId: number,
    catchtableId: string
  ): Promise<CatchtableReviewCrawlResult> {
    console.log(
      `[Catchtable] 리뷰 크롤링 시작: restaurantId=${restaurantId}, catchtableId=${catchtableId}`
    );

    // 크롤링 전 기존 리뷰 수 확인
    const existingCount = await catchtableReviewRepository.countByRestaurantId(restaurantId);

    // 페이지네이션 호출
    let page = 1;
    let totalFetched = 0;
    let allReviews: CatchtableApiReview[] = [];

    while (totalFetched < MAX_REVIEWS) {
      // 취소 확인
      if (jobService.isCancelled(jobId)) {
        console.log(`[Catchtable] Job ${jobId} 취소됨`);
        break;
      }

      const url = `${CATCHTABLE_API_BASE}/${catchtableId}/reviews?page=${page}&size=${PAGE_SIZE}&sort=D`;
      console.log(`[Catchtable] Fetching page ${page}: ${url}`);

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

      // 진행률 전송 (API fetch 단계)
      await jobService.emitProgressSocketEvent(
        jobId,
        restaurantId,
        SOCKET_EVENTS.CATCHTABLE_REVIEW_PROGRESS,
        {
          current: totalFetched,
          total: MAX_REVIEWS,
          metadata: {
            step: 'fetch',
            page,
            fetched: reviews.length,
          },
        }
      );

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

    // DB 저장
    let savedCount = 0;
    for (let i = 0; i < allReviews.length; i++) {
      // 취소 확인
      if (jobService.isCancelled(jobId)) {
        console.log(`[Catchtable] Job ${jobId} 취소됨 (DB 저장 중)`);
        break;
      }

      const review = allReviews[i];
      try {
        await catchtableReviewRepository.upsertReview({
          id: review.reviewSeq,
          restaurant_id: restaurantId,
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

        // 진행률 전송 (DB 저장 단계) - 10개마다 전송
        if (savedCount % 10 === 0 || savedCount === allReviews.length) {
          await jobService.emitProgressSocketEvent(
            jobId,
            restaurantId,
            SOCKET_EVENTS.CATCHTABLE_REVIEW_PROGRESS,
            {
              current: savedCount,
              total: allReviews.length,
              metadata: {
                step: 'save',
                saved: savedCount,
              },
            }
          );
        }
      } catch (error) {
        console.error(`[Catchtable] 리뷰 저장 실패 (reviewSeq: ${review.reviewSeq}):`, error);
      }
    }

    // 저장 후 리뷰 수 확인
    const finalCount = await catchtableReviewRepository.countByRestaurantId(restaurantId);
    const newReviews = finalCount - existingCount;
    const updatedReviews = savedCount - newReviews;

    console.log(
      `[Catchtable] 크롤링 완료: 총 ${totalFetched}개 수집, ${savedCount}개 저장 (신규: ${newReviews}, 업데이트: ${updatedReviews})`
    );

    return {
      restaurantId,
      catchtableId,
      totalFetched,
      totalSaved: savedCount,
      newReviews: Math.max(0, newReviews),
      updatedReviews: Math.max(0, updatedReviews),
      pagesProcessed: page,
    };
  }
}

export const catchtableService = new CatchtableService();
export default catchtableService;
