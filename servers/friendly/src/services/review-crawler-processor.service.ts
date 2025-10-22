import naverCrawlerService from './naver-crawler.service';
import reviewRepository from '../db/repositories/review.repository';
import jobService from './job-socket.service';
import { generateReviewHash } from '../utils/hash.utils';
import { SOCKET_EVENTS } from '../socket/events';
import type { ReviewInfo } from '../types/crawler.types';

/**
 * 리뷰 크롤링 Processor
 * Job Service를 통한 통합 Job 관리 + Socket 이벤트 자동화 (단순화 버전)
 */
export class ReviewCrawlerProcessor {
  /**
   * 리뷰 크롤링 실행 (외부 Job ID 사용)
   * - 외부에서 생성한 Job ID로 크롤링 실행
   * - Job 생명주기는 외부에서 관리 (complete/cancel/error는 orchestrator가 처리)
   */
  async processWithJobId(
    jobId: string,
    placeId: string,
    url: string,
    restaurantId: number
  ): Promise<ReviewInfo[]> {
    console.log(`[Job ${jobId}] 리뷰 크롤링 시작`);

    // 크롤링 실행 및 결과 반환
    const reviews = await this.crawlWithProgress(jobId, placeId, url, restaurantId);

    // 취소 확인
    if (jobService.isCancelled(jobId)) {
      console.log(`[Job ${jobId}] 크롤링 취소됨`);
      return reviews;
    }

    console.log(`[Job ${jobId}] 리뷰 크롤링 완료: ${reviews.length}개`);
    return reviews;
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
      
      // if (current % 10 === 0 || current === total) {
        console.log(`[Job ${jobId}] DB 저장: ${current}/${total}`);
      // }
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

}

export const reviewCrawlerProcessor = new ReviewCrawlerProcessor();
export default reviewCrawlerProcessor;
