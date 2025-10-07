import { getSocketIO } from '../socket/socket';
import { SOCKET_EVENTS } from '../socket/events';
import naverCrawlerService from './naver-crawler.service';
import reviewRepository from '../db/repositories/review.repository';
import crawlJobRepository from '../db/repositories/crawl-job.repository';
import jobManager from './job-manager.service';
import { generateReviewHash } from '../utils/hash.utils';
import type { ReviewInfo } from '../types/crawler.types';

/**
 * 리뷰 크롤링 Processor
 * Job Manager + Socket.io + DB 저장 통합
 */
export class ReviewCrawlerProcessor {
  /**
   * 리뷰 크롤링 실행 (백그라운드)
   */
  async process(jobId: string, placeId: string, url: string, restaurantId: number): Promise<void> {
    const io = getSocketIO();

    try {
      // 1. Job 시작
      jobManager.updateStatus(jobId, 'active', { startedAt: new Date() });
      await crawlJobRepository.updateStatus(jobId, 'active', { startedAt: new Date() });

      // Place room과 Restaurant room 모두에 이벤트 발행 (호환성)
      io.to(`place:${placeId}`).emit(SOCKET_EVENTS.REVIEW_STARTED, {
        placeId,
        restaurantId,
        url
      });
      io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.REVIEW_STARTED, {
        placeId,
        restaurantId,
        url
      });

      console.log(`[Job ${jobId}] 리뷰 크롤링 시작`);

      // 2. 크롤링 실행
      const reviews = await this.crawlWithProgress(jobId, placeId, url, restaurantId);

      // 3. 완료 처리
      if (jobManager.isCancelled(jobId)) {
        console.log(`[Job ${jobId}] 크롤링 취소됨`);
        await crawlJobRepository.updateStatus(jobId, 'cancelled', {
          completedAt: new Date(),
          totalReviews: reviews.length,
          savedToDb: reviews.length
        });

        io.to(`place:${placeId}`).emit(SOCKET_EVENTS.REVIEW_CANCELLED, {
          placeId,
          restaurantId,
          totalReviews: reviews.length
        });
        io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.REVIEW_CANCELLED, {
          placeId,
          restaurantId,
          totalReviews: reviews.length
        });
      } else {
        console.log(`[Job ${jobId}] 리뷰 크롤링 완료: ${reviews.length}개`);

        jobManager.completeJob(jobId, {
          totalReviews: reviews.length,
          savedToDb: reviews.length
        });

        await crawlJobRepository.updateStatus(jobId, 'completed', {
          completedAt: new Date(),
          totalReviews: reviews.length,
          savedToDb: reviews.length
        });

        // 완료 이벤트 (Place room과 Restaurant room 모두)
        const completedData = {
          placeId,
          restaurantId,
          totalReviews: reviews.length,
          savedToDb: reviews.length
        };
        io.to(`place:${placeId}`).emit(SOCKET_EVENTS.REVIEW_COMPLETED, completedData);
        io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.REVIEW_COMPLETED, completedData);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Job ${jobId}] 리뷰 크롤링 실패:`, errorMessage);

      jobManager.failJob(jobId, errorMessage);
      await crawlJobRepository.updateStatus(jobId, 'failed', {
        completedAt: new Date(),
        errorMessage
      });

      const errorData = {
        placeId,
        restaurantId,
        error: errorMessage
      };
      io.to(`place:${placeId}`).emit(SOCKET_EVENTS.REVIEW_ERROR, errorData);
      io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.REVIEW_ERROR, errorData);

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
    const io = getSocketIO();
    const reviews: ReviewInfo[] = [];

    // 리뷰 크롤링 시작 (콜백으로 실시간 전송)
    await naverCrawlerService.crawlReviews(
      url,
      async (current, total, review) => {
      // 중단 체크
      if (jobManager.isCancelled(jobId)) {
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

      // 진행 상황 업데이트
      const percentage = Math.floor((current / total) * 100);

      jobManager.updateProgress(jobId, current, total);
      await crawlJobRepository.updateProgress(jobId, current, total, percentage);

      // Socket 이벤트: DB 저장 진행 상황 (10개마다 또는 마지막)
      if (current % 10 === 0 || current === total) {
        const dbProgressData = {
          placeId,
          restaurantId,
          current,
          total,
          percentage
        };
        io.to(`place:${placeId}`).emit(SOCKET_EVENTS.REVIEW_DB_PROGRESS, dbProgressData);
        io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.REVIEW_DB_PROGRESS, dbProgressData);
        console.log(`[Job ${jobId}] DB 저장 진행: ${current}/${total} (${percentage}%)`);
      }
    },
      // 크롤링 진행 상황 콜백
      (current, total) => {
        const percentage = Math.floor((current / total) * 100);
        
        // Socket 이벤트: 크롤링 진행 상황
        const crawlProgressData = {
          placeId,
          restaurantId,
          current,
          total,
          percentage
        };
        io.to(`place:${placeId}`).emit(SOCKET_EVENTS.REVIEW_CRAWL_PROGRESS, crawlProgressData);
        io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.REVIEW_CRAWL_PROGRESS, crawlProgressData);
        
        console.log(`[Job ${jobId}] 크롤링 진행: ${current}/${total} (${percentage}%)`);
      }
    );

    return reviews;
  }
}

export const reviewCrawlerProcessor = new ReviewCrawlerProcessor();
export default reviewCrawlerProcessor;
