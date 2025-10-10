/**
 * 리뷰 요약 프로세서
 * Socket.io와 통합하여 실시간 상태 업데이트
 */

import { getSocketIO } from '../socket/socket';
import { SOCKET_EVENTS } from '../socket/events';
import reviewRepository from '../db/repositories/review.repository';
import reviewSummaryRepository from '../db/repositories/review-summary.repository';
import { createReviewSummaryService } from './review-summary.service';
import type { ReviewDB } from '../types/db.types';

export class ReviewSummaryProcessor {
  
  /**
   * 레스토랑의 미완료 요약 처리 (Socket 이벤트 발행)
   * - pending + failed 상태만 처리
   * - 실시간 진행 상황 Socket으로 전송
   */
  async processIncompleteReviews(
    restaurantId: number,
    useCloud: boolean = false
  ): Promise<void> {
    const io = getSocketIO();
    
    console.log(`🤖 레스토랑 ${restaurantId} 미완료 요약 처리 시작...`);
    
    try {
      // 1. 미완료 요약 조회
      const incompleteSummaries = await reviewSummaryRepository.findIncompleteByRestaurant(restaurantId);
      
      if (incompleteSummaries.length === 0) {
        console.log('✅ 모든 요약이 완료되었습니다.');
        return;
      }

      console.log(`📦 미완료 요약 ${incompleteSummaries.length}개 발견`);

      // 2. 리뷰 데이터 조회
      const summaryReviewIds = incompleteSummaries.map(s => s.review_id);
      const reviews: ReviewDB[] = [];
      
      for (const reviewId of summaryReviewIds) {
        const review = await reviewRepository.findById(reviewId);
        if (review) {
          reviews.push(review);
        }
      }

      if (reviews.length === 0) {
        console.log('⚠️ 리뷰 데이터를 찾을 수 없습니다.');
        return;
      }

      // 3. AI 서비스 준비
      const summaryService = createReviewSummaryService(useCloud);
      await summaryService.ensureReady();

      const serviceType = summaryService.getCurrentServiceType();
      console.log(`🤖 ${serviceType.toUpperCase()} AI로 ${reviews.length}개 요약 시작...`);

      // 4. Socket 시작 이벤트
      io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.REVIEW_SUMMARY_STARTED, {
        restaurantId,
        total: reviews.length
      });

      const startTime = Date.now();
      let completedCount = 0;
      let failedCount = 0;

      // 5. 전체 리뷰를 한 번에 처리 (generateBatch가 내부에서 배치 병렬 처리)
      const reviewIds = reviews.map(r => r.id);
      
      // 5-1. 전체를 processing 상태로 변경
      await Promise.all(
        reviewIds.map(id => reviewSummaryRepository.updateStatus(id, 'processing'))
      );

      // 5-2. AI 요약 생성 (진행 상황 콜백 포함)
      // - Cloud: parallelSize(기본 3개)씩 자동 배치 병렬 처리
      // - Local: 순차 처리
      const summaryDataList = await summaryService.summarizeReviews(
        reviews,
        (current, total) => {
          // Socket 진행률 업데이트 콜백
          const percentage = Math.floor((current / total) * 100);
          
          io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.REVIEW_SUMMARY_PROGRESS, {
            restaurantId,
            current,
            total,
            percentage,
            completed: completedCount,
            failed: failedCount
          });
        }
      );

      // 5-3. 결과 저장 (성공한 것만)
      for (let i = 0; i < summaryDataList.length; i++) {
        const summaryData = summaryDataList[i];
        const reviewId = reviewIds[i];
        
        if (summaryData && summaryData.summary) {
          await reviewSummaryRepository.updateSummary(reviewId, summaryData);
          completedCount++;
        } else {
          await reviewSummaryRepository.markAsFailed(reviewId, 'AI 요약 생성 실패');
          failedCount++;
        }
      }

      console.log(`  ✅ 전체 완료 (성공: ${completedCount}, 실패: ${failedCount})`);
      
      // 5-4. 최종 Socket 진행률 업데이트
      io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.REVIEW_SUMMARY_PROGRESS, {
        restaurantId,
        current: reviews.length,
        total: reviews.length,
        percentage: 100,
        completed: completedCount,
        failed: failedCount
      });

      const elapsed = Date.now() - startTime;
      console.log(`✅ 처리 완료 (${(elapsed / 1000).toFixed(2)}초)`);
      console.log(`   성공: ${completedCount}개, 실패: ${failedCount}개`);
      
      // 6. Socket 완료 이벤트
      io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.REVIEW_SUMMARY_COMPLETED, {
        restaurantId,
        total: reviews.length,
        completed: completedCount,
        failed: failedCount,
        elapsed: Math.floor(elapsed / 1000)
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ 요약 처리 중 오류:', errorMessage);
      
      // Socket 에러 이벤트
      io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.REVIEW_SUMMARY_ERROR, {
        restaurantId,
        error: errorMessage
      });
      
      throw error;
    }
  }

  /**
   * 특정 리뷰만 요약 (단일)
   */
  async processSingleReview(
    reviewId: number,
    useCloud: boolean = false
  ): Promise<void> {
    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new Error('리뷰를 찾을 수 없습니다');
    }

    const summaryService = createReviewSummaryService(useCloud);
    await summaryService.ensureReady();

    // 상태 업데이트
    await reviewSummaryRepository.updateStatus(reviewId, 'processing');

    try {
      const [summaryData] = await summaryService.summarizeReviews([review]);
      await reviewSummaryRepository.updateSummary(reviewId, summaryData);
      console.log(`✅ 리뷰 ${reviewId} 요약 완료`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await reviewSummaryRepository.markAsFailed(reviewId, errorMessage);
      throw error;
    }
  }

  /**
   * 전체 미완료 요약 처리 (모든 레스토랑)
   */
  async processAllIncomplete(useCloud: boolean = false): Promise<void> {
    const allIncomplete = await reviewSummaryRepository.findIncomplete();
    
    console.log(`🌍 전체 미완료 요약 ${allIncomplete.length}개 처리 시작...`);
    
    // 레스토랑별로 그룹핑
    const byRestaurant = new Map<number, number[]>();
    
    for (const summary of allIncomplete) {
      const review = await reviewRepository.findById(summary.review_id);
      if (review) {
        if (!byRestaurant.has(review.restaurant_id)) {
          byRestaurant.set(review.restaurant_id, []);
        }
        byRestaurant.get(review.restaurant_id)!.push(summary.review_id);
      }
    }
    
    // 레스토랑별 처리
    for (const [restaurantId, reviewIds] of byRestaurant.entries()) {
      console.log(`\n📍 레스토랑 ${restaurantId}: ${reviewIds.length}개 미완료`);
      await this.processIncompleteReviews(restaurantId, useCloud);
    }
    
    console.log('\n🎉 전체 처리 완료!');
  }
}

export const reviewSummaryProcessor = new ReviewSummaryProcessor();
export default reviewSummaryProcessor;
