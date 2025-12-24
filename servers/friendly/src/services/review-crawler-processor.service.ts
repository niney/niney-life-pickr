import { crawlReviews } from './review-crawler';
import type { ProcessedReviewData } from './review-crawler';
import reviewRepository from '../db/repositories/review.repository';
import jobService from './job-socket.service';
import { generateReviewHash } from '../utils/hash.utils';
import { SOCKET_EVENTS } from '../socket/events';
import type { ReviewInfo } from '../types/crawler.types';

/**
 * 리뷰 크롤링 Processor
 * review-crawler v2 기반 + Job 관리 + Socket 이벤트
 */
export class ReviewCrawlerProcessor {
  /**
   * 리뷰 크롤링 실행 (외부 Job ID 사용)
   */
  async processWithJobId(
    jobId: string,
    placeId: string,
    url: string,
    restaurantId: number
  ): Promise<ReviewInfo[]> {
    console.log(`[Job ${jobId}] 리뷰 크롤링 시작 (review-crawler v2)`);

    // 새로운 review-crawler로 크롤링 실행
    const result = await crawlReviews(url, {
      enableScroll: true,
      downloadImages: true,
      maxMoreClicks: 5000
    }, {
      // 크롤링 진행률 콜백
      onCrawlProgress: async (current, total) => {
        if (jobService.isCancelled(jobId)) return;

        await jobService.emitProgressSocketEvent(
          jobId,
          restaurantId,
          SOCKET_EVENTS.REVIEW_CRAWL_PROGRESS,
          {
            current,
            total,
            metadata: {
              step: 'review',
              substep: 'crawling',
              placeId
            }
          }
        );

        if (current % 10 === 0 || current === total) {
          console.log(`[Job ${jobId}] 크롤링: ${current}/${total}`);
        }
      },
      // 이미지 다운로드 진행률 콜백
      onImageProgress: async (current, total) => {
        if (jobService.isCancelled(jobId)) return;

        await jobService.emitProgressSocketEvent(
          jobId,
          restaurantId,
          SOCKET_EVENTS.REVIEW_IMAGE_PROGRESS,
          {
            current,
            total,
            metadata: {
              step: 'review',
              substep: 'image_processing',
              placeId
            }
          }
        );

        if (current % 10 === 0 || current === total) {
          console.log(`[Job ${jobId}] 이미지 처리: ${current}/${total}`);
        }
      }
    });

    // 크롤링 실패 시
    if (!result.success) {
      console.error(`[Job ${jobId}] 크롤링 실패:`, result.error);
      return [];
    }

    // 취소 확인
    if (jobService.isCancelled(jobId)) {
      console.log(`[Job ${jobId}] 크롤링 취소됨`);
      return [];
    }

    // DB 저장 (일괄 처리)
    console.log(`[Job ${jobId}] DB 저장 시작 (${result.reviews.length}개)`);
    const reviews = await this.saveReviewsToDb(
      jobId,
      placeId,
      restaurantId,
      result.reviews
    );

    console.log(`[Job ${jobId}] 리뷰 크롤링 완료: ${reviews.length}개`);
    return reviews;
  }

  /**
   * 리뷰 DB 저장 (일괄)
   */
  private async saveReviewsToDb(
    jobId: string,
    placeId: string,
    restaurantId: number,
    processedReviews: ProcessedReviewData[]
  ): Promise<ReviewInfo[]> {
    const reviews: ReviewInfo[] = [];
    const total = processedReviews.length;

    for (let i = 0; i < processedReviews.length; i++) {
      const review = processedReviews[i];
      const current = i + 1;

      // 취소 확인
      if (jobService.isCancelled(jobId)) {
        console.log(`[Job ${jobId}] DB 저장 중단 (${current}/${total})`);
        break;
      }

      // ReviewInfo로 변환
      const reviewInfo: ReviewInfo = {
        userName: review.userName,
        visitKeywords: review.visitKeywords,
        waitTime: review.waitTime,
        reviewText: review.reviewText,
        emotionKeywords: review.emotionKeywords,
        visitInfo: review.visitInfo,
        images: review.images
      };

      // 리뷰 해시 생성
      const reviewHash = generateReviewHash(
        placeId,
        review.userName,
        review.visitInfo.visitDate,
        review.visitInfo.visitCount,
        review.visitInfo.verificationMethod
      );

      // DB 저장
      try {
        await reviewRepository.upsertReview(restaurantId, reviewInfo, reviewHash);
        reviews.push(reviewInfo);
      } catch (dbError) {
        console.error(`[Job ${jobId}] 리뷰 DB 저장 실패 (${current}):`, dbError);
      }

      // DB 저장 진행률 Socket 이벤트
      await jobService.emitProgressSocketEvent(
        jobId,
        restaurantId,
        SOCKET_EVENTS.REVIEW_DB_PROGRESS,
        {
          current,
          total,
          metadata: {
            step: 'review',
            substep: 'saving',
            placeId
          }
        }
      );

      if (current % 10 === 0 || current === total) {
        console.log(`[Job ${jobId}] DB 저장: ${current}/${total}`);
      }
    }

    return reviews;
  }
}

export const reviewCrawlerProcessor = new ReviewCrawlerProcessor();
export default reviewCrawlerProcessor;
