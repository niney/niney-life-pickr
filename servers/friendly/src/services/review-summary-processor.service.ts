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
   * - 리뷰 ID와 요약 ID 비교하여 차이분만 처리
   * - pending 데이터를 1000개씩 페이지네이션으로 처리
   * - 실시간 진행 상황 Socket으로 전송
   */
  async processIncompleteReviews(
    restaurantId: number,
    useCloud: boolean = false
  ): Promise<void> {
    const io = getSocketIO();
    
    console.log(`🤖 레스토랑 ${restaurantId} 미완료 요약 처리 시작...`);
    
    try {
      // 1. 리뷰 ID 목록과 요약 review_id 목록 조회 (효율적)
      console.log(`📊 리뷰 및 요약 ID 목록 조회 중...`);
      const [reviewIds, summaryReviewIds] = await Promise.all([
        reviewRepository.findIdsByRestaurantId(restaurantId),
        reviewSummaryRepository.findReviewIdsByRestaurantId(restaurantId)
      ]);
      
      console.log(`📊 리뷰 개수: ${reviewIds.length}, 요약 개수: ${summaryReviewIds.length}`);

      // 2. ID 차이 분석 (Set을 사용한 효율적인 비교)
      const reviewIdSet = new Set(reviewIds);
      const summaryReviewIdSet = new Set(summaryReviewIds);
      
      // 리뷰에만 있는 ID (요약 생성 필요)
      const reviewIdsToCreate = reviewIds.filter(id => !summaryReviewIdSet.has(id));
      
      // 요약에만 있는 ID (삭제 필요 - 리뷰가 없는 요약)
      const reviewIdsToDelete = summaryReviewIds.filter(id => !reviewIdSet.has(id));
      
      console.log(`🔍 생성 필요: ${reviewIdsToCreate.length}개, 삭제 필요: ${reviewIdsToDelete.length}개`);

      // 3. 불필요한 요약 삭제
      if (reviewIdsToDelete.length > 0) {
        console.log(`🗑️  ${reviewIdsToDelete.length}개 요약 삭제 중...`);
        await reviewSummaryRepository.deleteBatchByReviewIds(reviewIdsToDelete);
        console.log(`✅ 삭제 완료`);
      }

      // 4. 필요한 pending 레코드 일괄 생성
      if (reviewIdsToCreate.length > 0) {
        console.log(`📝 ${reviewIdsToCreate.length}개 pending 레코드 생성 중...`);
        await reviewSummaryRepository.createBatch(restaurantId, reviewIdsToCreate);
        console.log(`✅ 생성 완료`);
      }

      // 5. AI 서비스 준비
      const summaryService = createReviewSummaryService(useCloud);
      await summaryService.ensureReady();
      
      const serviceType = summaryService.getCurrentServiceType();
      
      // 전체 미완료 개수 조회
      const totalIncomplete = await reviewSummaryRepository.countIncompleteByRestaurant(restaurantId);
      
      if (totalIncomplete === 0) {
        console.log('✅ 모든 요약이 완료되었습니다.');
        return;
      }
      
      console.log(`🔄 총 ${totalIncomplete}개 미완료 요약 처리 시작`);
      console.log(`🤖 ${serviceType.toUpperCase()} AI 사용`);

      // Socket 시작 이벤트
      io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.REVIEW_SUMMARY_STARTED, {
        restaurantId,
        total: totalIncomplete
      });

      const globalStartTime = Date.now();
      let globalCompletedCount = 0;
      let globalFailedCount = 0;

      // 6. 전체 미완료 리뷰 일괄 조회 (1000개씩 페이지네이션)
      const allReviews: ReviewDB[] = [];
      let offset = 0;
      const limit = 1000;
      
      console.log(`📋 미완료 리뷰 데이터 조회 중...`);
      
      while (true) {
        const incompleteSummaries = await reviewSummaryRepository.findIncompleteByRestaurant(
          restaurantId, 
          limit, 
          offset
        );
        
        if (incompleteSummaries.length === 0) {
          break;
        }
        
        const reviewIdsToFetch = incompleteSummaries.map(s => s.review_id);
        const reviews = await reviewRepository.findByIds(reviewIdsToFetch);
        allReviews.push(...reviews);
        
        offset += limit;
        
        if (incompleteSummaries.length < limit) {
          break;
        }
      }
      
      if (allReviews.length === 0) {
        console.log('⚠️ 처리할 리뷰가 없습니다.');
        return;
      }
      
      console.log(`✅ 총 ${allReviews.length}개 리뷰 데이터 조회 완료`);

      // 7. AI에게 전체 리뷰 전달 - AI가 내부에서 배치 처리하고 콜백으로 저장
      const allReviewIds = allReviews.map(r => r.id);
      let processedCount = 0;
      
      await summaryService.summarizeReviews(
        allReviews,
        (current, total, batchResults) => {
          const percentage = Math.floor((current / total) * 100);
          
          // AI 배치 완료 시 콜백으로 결과 받아서 일괄 저장
          if (batchResults && batchResults.length > 0) {
            const batchStartIndex = processedCount;
            const batchEndIndex = batchStartIndex + batchResults.length;
            const currentBatchReviewIds = allReviewIds.slice(batchStartIndex, batchEndIndex);
            
            // 배치 결과를 DB에 일괄 저장 (트랜잭션)
            this.saveBatchResultsOptimized(
              currentBatchReviewIds,
              batchResults,
              summaryService
            ).then(({ succeeded, failed }) => {
              globalCompletedCount += succeeded;
              globalFailedCount += failed;
              
              console.log(`  💾 AI 배치 저장 완료: ${succeeded}개 성공, ${failed}개 실패 (누적: ${globalCompletedCount}/${total})`);
            }).catch((err: Error) => {
              console.error('  ❌ 배치 저장 오류:', err);
              globalFailedCount += batchResults.length;
            });
            
            processedCount = batchEndIndex;
          }
          
          // Socket 진행률 업데이트
          io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.REVIEW_SUMMARY_PROGRESS, {
            restaurantId,
            current,
            total,
            percentage,
            completed: globalCompletedCount,
            failed: globalFailedCount
          });
        }
      );
      
      // 저장 완료 대기
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 9. 최종 완료
      const globalElapsed = Date.now() - globalStartTime;
      console.log(`\n✅ 전체 처리 완료 (${(globalElapsed / 1000).toFixed(2)}초)`);
      console.log(`   성공: ${globalCompletedCount}개, 실패: ${globalFailedCount}개`);
      
      // Socket 완료 이벤트
      io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.REVIEW_SUMMARY_COMPLETED, {
        restaurantId,
        total: allReviews.length,
        completed: globalCompletedCount,
        failed: globalFailedCount,
        elapsed: Math.floor(globalElapsed / 1000)
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
   * 배치 결과를 DB에 일괄 저장하는 최적화된 메서드
   * - 단일 트랜잭션으로 모든 업데이트 처리
   */
  private async saveBatchResultsOptimized(
    reviewIds: number[],
    batchResults: string[],
    summaryService: ReturnType<typeof createReviewSummaryService>
  ): Promise<{ succeeded: number; failed: number }> {
    const updates: Array<{
      reviewId: number;
      summaryData: any | null;
      errorMessage?: string;
    }> = [];

    // 모든 결과를 파싱하여 업데이트 배열 준비
    for (let i = 0; i < batchResults.length; i++) {
      const reviewId = reviewIds[i];
      const response = batchResults[i];

      if (response) {
        const summaryData = summaryService.parseResponse(response);
        
        if (summaryData) {
          // summary가 빈 문자열인 경우 실패 처리
          if (summaryData.summary === '') {
            console.warn(`⚠️  빈 요약 반환 (reviewId: ${reviewId}) - 실패 처리`);
            updates.push({ 
              reviewId, 
              summaryData: null, 
              errorMessage: 'AI가 빈 요약 반환 (리뷰 내용 부족)' 
            });
          } 
          // "요약 내용이 없습니다"는 정상 완료로 처리
          else if (summaryData.summary === '요약 내용이 없습니다') {
            console.warn(`⚠️  요약 내용 없음 (reviewId: ${reviewId}) - 리뷰 내용 부족하지만 완료 처리`);
            updates.push({ reviewId, summaryData });
          }
          // 일반 요약은 정상 저장
          else {
            updates.push({ reviewId, summaryData });
          }
        } else {
          // 파싱 실패 원인 분석
          let errorMessage = 'AI 요약 파싱 실패';
          
          try {
            const parsed = JSON.parse(response);
            if (parsed && parsed.summary === undefined) {
              errorMessage = 'summary 필드 누락';
              console.error(`❌ summary 필드 누락 (reviewId: ${reviewId})`);
            } else if (!parsed) {
              errorMessage = 'JSON 파싱 실패';
              console.error(`❌ JSON 파싱 실패 (reviewId: ${reviewId})`);
            }
          } catch (e) {
            errorMessage = 'JSON 형식 오류';
            console.error(`❌ JSON 형식 오류 (reviewId: ${reviewId})`);
          }
          
          console.error(`원본 응답:`, response);
          console.error(`파싱 결과:`, summaryData);
          updates.push({ reviewId, summaryData: null, errorMessage });
        }
      } else {
        console.error(`❌ AI 요약 생성 실패 (reviewId: ${reviewId}) - 응답이 비어있음`);
        updates.push({ reviewId, summaryData: null, errorMessage: 'AI 요약 생성 실패' });
      }
    }

    // 일괄 업데이트 (트랜잭션)
    await reviewSummaryRepository.updateSummaryBatch(updates);

    const succeeded = updates.filter(u => u.summaryData).length;
    const failed = updates.filter(u => u.errorMessage).length;

    return { succeeded, failed };
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
    
    // 레스토랑별로 그룹핑 (restaurant_id를 직접 사용)
    const byRestaurant = new Map<number, number[]>();
    
    for (const summary of allIncomplete) {
      if (!byRestaurant.has(summary.restaurant_id)) {
        byRestaurant.set(summary.restaurant_id, []);
      }
      byRestaurant.get(summary.restaurant_id)!.push(summary.review_id);
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
