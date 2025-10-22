import naverCrawlerService from './naver-crawler.service';
import reviewRepository from '../db/repositories/review.repository';
import jobService from './job-socket.service';
import { generateReviewHash } from '../utils/hash.utils';
import reviewSummaryProcessor from './review-summary-processor.service';
import { SOCKET_EVENTS } from '../socket/events';
import type { ReviewInfo } from '../types/crawler.types';

/**
 * 리뷰 크롤링 Processor
 * Job Service를 통한 통합 Job 관리 + Socket 이벤트 자동화 (단순화 버전)
 */
export class ReviewCrawlerProcessor {
  /**
   * 리뷰 크롤링 실행 (기본)
   * 요약 제외 - Job Chain에서 사용
   */
  async process(placeId: string, url: string, restaurantId: number): Promise<void> {
    const startTime = Date.now();
    let jobId: string | undefined;

    try {
      // 1. Job 시작 (ID 자동 생성 + Socket 시작 알림)
      jobId = await jobService.start({
        type: 'review_crawl',
        restaurantId,
        metadata: {
          placeId,
          url,
          batchSize: 10
        }
      });

      console.log(`[Job ${jobId}] 리뷰 크롤링 시작`);

      // 2. 크롤링 실행
      const reviews = await this.crawlWithProgress(jobId, placeId, url, restaurantId);

      // 3. 완료 처리
      if (jobService.isCancelled(jobId)) {
        console.log(`[Job ${jobId}] 크롤링 취소됨`);
        
        // Job 취소 + Socket CANCELLED 이벤트 자동 발행
        await jobService.cancel(jobId, {
          placeId,
          totalReviews: reviews.length
        });
      } else {
        console.log(`[Job ${jobId}] 리뷰 크롤링 완료: ${reviews.length}개`);

        // Job 완료 + Socket COMPLETED 이벤트 자동 발행
        await jobService.complete(jobId, {
          placeId,
          totalReviews: reviews.length,
          savedToDb: reviews.length,
          duplicates: 0,
          crawlDuration: Date.now() - startTime
        });

        // ⚠️ 요약 자동 시작 제거 - 필요 시 processWithSummary() 사용
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Job ${jobId}] 리뷰 크롤링 실패:`, errorMessage);

      // Job 실패 처리 + Socket ERROR 이벤트 자동 발행
      if (jobId) {
        await jobService.error(jobId, errorMessage, { placeId });
      }

      throw error;
    }
  }

  /**
   * 리뷰 크롤링 실행 (요약 포함)
   * 신규 크롤링용 - 자동으로 요약 시작
   */
  async processWithSummary(placeId: string, url: string, restaurantId: number): Promise<void> {
    const startTime = Date.now();
    let jobId: string | undefined;

    try {
      // 1. Job 시작 (ID 자동 생성 + Socket 시작 알림)
      jobId = await jobService.start({
        type: 'review_crawl',
        restaurantId,
        metadata: {
          placeId,
          url,
          batchSize: 10
        }
      });

      console.log(`[Job ${jobId}] 리뷰 크롤링 시작 (요약 포함)`);

      // 2. 크롤링 실행
      const reviews = await this.crawlWithProgress(jobId, placeId, url, restaurantId);

      // 3. 완료 처리
      if (jobService.isCancelled(jobId)) {
        console.log(`[Job ${jobId}] 크롤링 취소됨`);
        
        // Job 취소 + Socket CANCELLED 이벤트 자동 발행
        await jobService.cancel(jobId, {
          placeId,
          totalReviews: reviews.length
        });
      } else {
        console.log(`[Job ${jobId}] 리뷰 크롤링 완료: ${reviews.length}개 (요약 포함)`);

        // Job 완료 + Socket COMPLETED 이벤트 자동 발행
        await jobService.complete(jobId, {
          placeId,
          totalReviews: reviews.length,
          savedToDb: reviews.length,
          duplicates: 0,
          crawlDuration: Date.now() - startTime
        });

        // 4. 리뷰 크롤링 완료 후 자동으로 요약 시작
        console.log(`[Job ${jobId}] 리뷰 요약 자동 시작...`);
        this.startReviewSummary(restaurantId);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Job ${jobId}] 리뷰 크롤링 실패:`, errorMessage);

      // Job 실패 처리 + Socket ERROR 이벤트 자동 발행
      if (jobId) {
        await jobService.error(jobId, errorMessage, { placeId });
      }

      throw error;
    }
  }

  /**
   * 진행 상황을 추적하며 크롤링 실행
   */
  private async crawlWithProgress(
    jobId: string,
    placeId: string,
    url: string,
    restaurantId: number
  ): Promise<ReviewInfo[]> {
    const reviews: ReviewInfo[] = [];

    // 리뷰 크롤링 시작 (콜백으로 실시간 전송)
    await naverCrawlerService.crawlReviews(
      url,
      async (current, total, review) => {
      // 중단 체크
      if (jobService.isCancelled(jobId)) {
        console.log(`[Job ${jobId}] 중단 감지 (리뷰 ${current}/${total})`);
        return;
      }

      reviews.push(review);

      // 리뷰 해시 생성
      const reviewHash = generateReviewHash(
        placeId,
        review.userName,
        review.visitInfo.visitDate,
        review.visitInfo.visitCount,
        review.visitInfo.verificationMethod
      );

      // DB 저장 (즉시)
      try {
        await reviewRepository.upsertReview(restaurantId, review, reviewHash);
      } catch (dbError) {
        console.error(`[Job ${jobId}] 리뷰 DB 저장 실패 (${current}):`, dbError);
      }

      // ✅ DB 저장 진행률: Socket 이벤트만 전송 (매번, DB 저장 없음)
      jobService.emitProgressSocketEvent(
        jobId,
        restaurantId,
        SOCKET_EVENTS.REVIEW_DB_PROGRESS,
        { current, total, metadata: { placeId } }
      );
      
      if (current % 10 === 0 || current === total) {
        console.log(`[Job ${jobId}] DB 저장: ${current}/${total}`);
      }
    },
      // 크롤링 진행 상황 콜백 (Socket 이벤트만, DB 저장 없음)
      (current, total) => {
        // ✅ 크롤링 진행률: Socket 이벤트만 전송 (매번)
        jobService.emitProgressSocketEvent(
          jobId,
          restaurantId,
          SOCKET_EVENTS.REVIEW_CRAWL_PROGRESS,
          { current, total, metadata: { placeId } }
        );
        
        if (current % 10 === 0 || current === total) {
          console.log(`[Job ${jobId}] 크롤링: ${current}/${total}`);
        }
      },
      // 이미지 처리 진행 상황 콜백 (Socket 이벤트만, DB 저장 없음)
      (current, total) => {
        // ✅ 이미지 처리 진행률: Socket 이벤트만 전송 (매번)
        jobService.emitProgressSocketEvent(
          jobId,
          restaurantId,
          SOCKET_EVENTS.REVIEW_IMAGE_PROGRESS,
          { current, total, metadata: { placeId } }
        );
        
        if (current % 10 === 0 || current === total) {
          console.log(`[Job ${jobId}] 이미지 처리: ${current}/${total}`);
        }
      }
    );

    return reviews;
  }

  /**
   * 리뷰 요약 시작 (백그라운드)
   * - 크롤링 완료 후 자동 실행
   * - Cloud AI 우선 사용 (실패 시 Local)
   */
  private startReviewSummary(restaurantId: number): void {
    // 백그라운드로 실행 (비동기, 에러 무시)
    reviewSummaryProcessor.processIncompleteReviews(restaurantId, true) // useCloud=true
      .then(() => {
        console.log(`[레스토랑 ${restaurantId}] 리뷰 요약 완료`);
      })
      .catch(error => {
        console.error(`[레스토랑 ${restaurantId}] 리뷰 요약 실패:`, error instanceof Error ? error.message : error);
      });
  }
}

export const reviewCrawlerProcessor = new ReviewCrawlerProcessor();
export default reviewCrawlerProcessor;
