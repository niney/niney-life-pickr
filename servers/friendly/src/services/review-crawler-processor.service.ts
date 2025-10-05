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

      io.to(`job:${jobId}`).emit(SOCKET_EVENTS.REVIEW_STARTED, {
        jobId,
        placeId,
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

        io.to(`job:${jobId}`).emit(SOCKET_EVENTS.REVIEW_CANCELLED, {
          jobId,
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

        // 마지막 100% 진행 상황 보장
        io.to(`job:${jobId}`).emit(SOCKET_EVENTS.REVIEW_PROGRESS, {
          jobId,
          current: reviews.length,
          total: reviews.length,
          percentage: 100
        });

        // 완료 이벤트
        io.to(`job:${jobId}`).emit(SOCKET_EVENTS.REVIEW_COMPLETED, {
          jobId,
          totalReviews: reviews.length,
          savedToDb: reviews.length
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Job ${jobId}] 리뷰 크롤링 실패:`, errorMessage);

      jobManager.failJob(jobId, errorMessage);
      await crawlJobRepository.updateStatus(jobId, 'failed', {
        completedAt: new Date(),
        errorMessage
      });

      io.to(`job:${jobId}`).emit(SOCKET_EVENTS.REVIEW_ERROR, {
        jobId,
        error: errorMessage
      });

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
    await naverCrawlerService.crawlReviews(url, async (current, total, review) => {
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

      // Socket 이벤트: 진행 상황 (10개마다 또는 마지막)
      if (current % 10 === 0 || current === total) {
        io.to(`job:${jobId}`).emit(SOCKET_EVENTS.REVIEW_PROGRESS, {
          jobId,
          current,
          total,
          percentage
        });
      }

      // Socket 이벤트: 리뷰 아이템 (5개마다 전송으로 부담 감소)
      if (current % 5 === 0 || current === total) {
        io.to(`job:${jobId}`).emit(SOCKET_EVENTS.REVIEW_ITEM, {
          jobId,
          review,
          index: current - 1
        });
      }

      // 10개마다 로그
      if (current % 10 === 0) {
        console.log(`[Job ${jobId}] 진행: ${current}/${total} (${percentage}%)`);
      }
    });

    return reviews;
  }
}

export const reviewCrawlerProcessor = new ReviewCrawlerProcessor();
export default reviewCrawlerProcessor;
