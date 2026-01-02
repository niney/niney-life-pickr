/**
 * 리뷰 요약 프로세서
 * JobService 통합으로 DB 저장 + Socket 이벤트 자동 발행
 */

import jobService from './job-socket.service';
import reviewRepository from '../db/repositories/review.repository';
import reviewSummaryRepository from '../db/repositories/review-summary.repository';
import { createReviewSummaryService } from './review-summary.service';
import { SOCKET_EVENTS } from '../socket/events';
import type { ReviewDB } from '../types/db.types';
import type { BaseOllamaConfig } from './ollama/ollama.types';

export class ReviewSummaryProcessor {
  
  /**
   * 레스토랑의 미완료 요약 처리 (외부 Job ID 사용)
   * - 외부에서 생성한 Job ID로 요약 실행
   * - Job 생명주기는 외부에서 관리 (complete/error는 orchestrator가 처리)
   */
  async processWithJobId(
    jobId: string,
    restaurantId: number,
    useCloud: boolean = false
  ): Promise<{ completed: number; failed: number; totalIncomplete: number }> {
    console.log(`🤖 레스토랑 ${restaurantId} 미완료 요약 처리 시작 [Job ${jobId}]...`);
    
    // 1. 리뷰 ID 목록과 요약 review_id 목록 조회
    console.log(`📊 리뷰 및 요약 ID 목록 조회 중...`);
    const [reviewIds, summaryReviewIds] = await Promise.all([
      reviewRepository.findIdsByRestaurantId(restaurantId),
      reviewSummaryRepository.findReviewIdsByRestaurantId(restaurantId)
    ]);
    
    console.log(`📊 리뷰 개수: ${reviewIds.length}, 요약 개수: ${summaryReviewIds.length}`);

    // 2. ID 차이 분석
    const reviewIdSet = new Set(reviewIds);
    const summaryReviewIdSet = new Set(summaryReviewIds);
    
    const reviewIdsToCreate = reviewIds.filter(id => !summaryReviewIdSet.has(id));
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
      return {
        totalIncomplete: 0,
        completed: 0,
        failed: 0
      };
    }
      
      console.log(`🔄 총 ${totalIncomplete}개 미완료 요약 처리 시작`);
      console.log(`🤖 ${serviceType.toUpperCase()} AI 사용`);

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
        return {
          totalIncomplete: 0,
          completed: 0,
          failed: 0
        };
      }
      
      console.log(`✅ 총 ${allReviews.length}개 리뷰 데이터 조회 완료`);

      // 7. AI에게 전체 리뷰 전달 - AI가 내부에서 배치 처리하고 콜백으로 저장
      const allReviewIds = allReviews.map(r => r.id);
      let processedCount = 0;
      const savePromises: Promise<{ succeeded: number; failed: number; failedReviewIds: number[] }>[] = [];
      const allFailedReviewIds: number[] = [];

      await summaryService.summarizeReviews(
        allReviews,
        async (current, total, batchResults) => {
          // AI 배치 완료 시 콜백으로 결과 받아서 일괄 저장
          if (batchResults && batchResults.length > 0) {
            const batchStartIndex = processedCount;
            const batchEndIndex = batchStartIndex + batchResults.length;
            const currentBatchReviewIds = allReviewIds.slice(batchStartIndex, batchEndIndex);

            // 배치 결과를 DB에 일괄 저장 (트랜잭션)
            const savePromise = this.saveBatchResultsOptimized(
              currentBatchReviewIds,
              batchResults,
              summaryService
            ).then(({ succeeded, failed, failedReviewIds }) => {
              globalCompletedCount += succeeded;
              globalFailedCount += failed;
              allFailedReviewIds.push(...failedReviewIds);

              console.log(`  💾 AI 배치 저장 완료: ${succeeded}개 성공, ${failed}개 실패 (누적: ${globalCompletedCount}/${total})`);
              return { succeeded, failed, failedReviewIds };
            }).catch((err: Error) => {
              console.error('  ❌ 배치 저장 오류:', err);
              globalFailedCount += batchResults.length;
              return { succeeded: 0, failed: batchResults.length, failedReviewIds: currentBatchReviewIds };
            });

            savePromises.push(savePromise);
            processedCount += batchResults.length;
          }

          // Socket 진행률 업데이트 (Socket 이벤트만, DB 저장 없음)
          await jobService.emitProgressSocketEvent(
            jobId,
            restaurantId,
            SOCKET_EVENTS.REVIEW_SUMMARY_PROGRESS,
            {
              current,
              total,
              metadata: {
                step: 'summary',
                substep: 'processing',
                serviceType,
                succeeded: globalCompletedCount,
                failed: globalFailedCount
              }
            }
          );
        }
      );

      // 8. 모든 저장 작업 완료 대기
      console.log(`⏳ 모든 배치 저장 완료 대기 중...`);
      await Promise.all(savePromises);
      console.log(`✅ 모든 배치 저장 완료`);

      // 9. 실패 항목 재시도
      if (allFailedReviewIds.length > 0) {
        console.log(`\n🔄 실패한 ${allFailedReviewIds.length}개 항목 재시도...`);

        const failedReviews = await reviewRepository.findByIds(allFailedReviewIds);
        let retrySucceeded = 0;
        let retryFailed = 0;

        // Production 환경이면 강제 Cloud, 아니면 기존 serviceType 사용
        const isProduction = process.env.NODE_ENV === 'production';
        const isCloud = isProduction || serviceType === 'cloud';
        const batchSize = isCloud ? 10 : 1;
        console.log(`  📦 ${isCloud ? 'Cloud' : 'Local'} 모드: ${batchSize}건씩 재시도`);

        for (let i = 0; i < failedReviews.length; i += batchSize) {
          const batch = failedReviews.slice(i, i + batchSize);
          const batchIds = batch.map(r => r.id);

          try {
            console.log(`  [재시도] 리뷰 ${batchIds.join(', ')} 처리 중...`);
            const summaryResults = await summaryService.summarizeReviews(batch);

            // 배치 결과 처리
            for (let j = 0; j < batch.length; j++) {
              const review = batch[j];
              const summaryData = summaryResults[j];

              // 재시도 성공 시만 DB 업데이트
              if (summaryData && summaryData.summary && summaryData.summary !== '') {
                await reviewSummaryRepository.updateSummary(review.id, summaryData);
                retrySucceeded++;
                globalCompletedCount++;
                globalFailedCount--;
                console.log(`  ✅ 재시도 성공 (리뷰 ${review.id})`);
              } else {
                // 재시도 실패 → DB 업데이트 안 함 (원래 에러 메시지 유지: 'AI 요약 생성 실패' 등)
                console.warn(`  ⚠️ 재시도 후에도 빈 요약 (리뷰 ${review.id}) - 원래 에러 메시지 유지`);
                retryFailed++;
              }
            }
          } catch (error) {
            // 배치 전체 실패 → 각 리뷰에 대해 실패 처리
            for (const review of batch) {
              console.error(`  ❌ 재시도 실패 (리뷰 ${review.id}):`, error instanceof Error ? error.message : error);
              console.error(`  → 원래 에러 메시지 유지 (DB 업데이트 안 함)`);
              retryFailed++;
            }
          }
        }

        console.log(`📊 재시도 결과: 성공 ${retrySucceeded}개, 실패 ${retryFailed}개`);
      }

      const duration = Date.now() - globalStartTime;
      console.log(`\n✅ 전체 처리 완료! 성공: ${globalCompletedCount}개, 실패: ${globalFailedCount}개 (소요: ${(duration / 1000).toFixed(1)}초)`);

      // 결과 반환 (Job 생명주기는 orchestrator가 관리)
      return {
        totalIncomplete,
        completed: globalCompletedCount,
        failed: globalFailedCount
      };
  }

  /**
   * 배치 결과를 DB에 일괄 저장하는 최적화된 메서드
   * - 단일 트랜잭션으로 모든 업데이트 처리
   */
  private async saveBatchResultsOptimized(
    reviewIds: number[],
    batchResults: string[],
    summaryService: ReturnType<typeof createReviewSummaryService>
  ): Promise<{ succeeded: number; failed: number; failedReviewIds: number[] }> {
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
    const failedReviewIds = updates.filter(u => u.errorMessage).map(u => u.reviewId);

    return { succeeded, failed, failedReviewIds };
  }

  /**
   * 특정 리뷰만 요약 (단일)
   * @param reviewId - 리뷰 ID
   * @param useCloud - Cloud 사용 여부 (기본: false)
   * @param config - 커스텀 설정 (선택) - model, timeout 등
   */
  async processSingleReview(
    reviewId: number,
    useCloud: boolean = false,
    config?: Partial<BaseOllamaConfig>
  ): Promise<void> {
    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new Error('리뷰를 찾을 수 없습니다');
    }

    const summaryService = createReviewSummaryService(useCloud, config);
    await summaryService.ensureReady();

    try {
      const [summaryData] = await summaryService.summarizeReviews([review]);
      await reviewSummaryRepository.updateSummary(reviewId, summaryData);
      
      const serviceType = useCloud ? 'Cloud' : 'Local';
      const modelInfo = config?.model || 'default';
      console.log(`✅ 리뷰 ${reviewId} 요약 완료 (${serviceType}, 모델: ${modelInfo})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await reviewSummaryRepository.markAsFailed(reviewId, errorMessage);
      throw error;
    }
  }

  /**
   * 전체 미완료 요약 처리 (모든 레스토랑)
   * ⚠️ Deprecated: API 레벨에서 Job으로 관리하도록 변경됨
   * 대신 processWithJobId()를 사용하세요
   */
  async processAllIncomplete(useCloud: boolean = false): Promise<void> {
    const allIncomplete = await reviewSummaryRepository.findIncomplete();
    
    console.log(`🌍 전체 미완료 요약 ${allIncomplete.length}개 처리 시작...`);
    console.warn('⚠️ processAllIncomplete()는 Deprecated 되었습니다. processWithJobId()를 사용하세요.');
    
    // 레스토랑별로 그룹핑 (restaurant_id를 직접 사용)
    const byRestaurant = new Map<number, number[]>();
    
    for (const summary of allIncomplete) {
      if (!byRestaurant.has(summary.restaurant_id)) {
        byRestaurant.set(summary.restaurant_id, []);
      }
      byRestaurant.get(summary.restaurant_id)!.push(summary.review_id);
    }
    
    // 레스토랑별 처리 (각각 Job 생성)
    for (const [restaurantId, reviewIds] of byRestaurant.entries()) {
      console.log(`\n📍 레스토랑 ${restaurantId}: ${reviewIds.length}개 미완료`);
      
      // Job 생성 후 processWithJobId 사용
      const jobService = await import('./job-socket.service');
      const jobId = await jobService.default.start({
        restaurantId,
        metadata: {
          step: 'started',
          total: reviewIds.length
        }
      });
      
      await this.processWithJobId(jobId, restaurantId, useCloud);
    }
    
    console.log('\n🎉 전체 처리 완료!');
  }
}

export const reviewSummaryProcessor = new ReviewSummaryProcessor();
export default reviewSummaryProcessor;
