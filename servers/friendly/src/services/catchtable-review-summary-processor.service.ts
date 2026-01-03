/**
 * 캐치테이블 리뷰 요약 프로세서
 * JobService 통합으로 DB 저장 + Socket 이벤트 자동 발행
 */

import jobService from './job-socket.service';
import catchtableReviewRepository from '../db/repositories/catchtable-review.repository';
import catchtableReviewSummaryRepository from '../db/repositories/catchtable-review-summary.repository';
import { createCatchtableReviewSummaryService } from './catchtable-review-summary.service';
import { SOCKET_EVENTS } from '../socket/events';
import type { CatchtableReviewDB } from '../types/catchtable.types';

export class CatchtableReviewSummaryProcessor {
  /**
   * 레스토랑의 미완료 요약 처리 (외부 Job ID 사용)
   */
  async processWithJobId(
    jobId: string,
    restaurantId: number,
    useCloud: boolean = true
  ): Promise<{ completed: number; failed: number; totalIncomplete: number }> {
    console.log(`[Catchtable] 레스토랑 ${restaurantId} 미완료 요약 처리 시작 [Job ${jobId}]...`);

    // 1. 리뷰 ID 목록과 요약 review_id 목록 조회
    console.log(`[Catchtable] 리뷰 및 요약 ID 목록 조회 중...`);
    const [reviewIds, summaryReviewIds] = await Promise.all([
      catchtableReviewRepository.findReviewIdsByRestaurantId(restaurantId),
      catchtableReviewSummaryRepository.findReviewIdsByRestaurantId(restaurantId),
    ]);

    console.log(`[Catchtable] 리뷰 개수: ${reviewIds.length}, 요약 개수: ${summaryReviewIds.length}`);

    // 2. ID 차이 분석
    const reviewIdSet = new Set(reviewIds);
    const summaryReviewIdSet = new Set(summaryReviewIds);

    const reviewIdsToCreate = reviewIds.filter((id) => !summaryReviewIdSet.has(id));
    const reviewIdsToDelete = summaryReviewIds.filter((id) => !reviewIdSet.has(id));

    console.log(
      `[Catchtable] 생성 필요: ${reviewIdsToCreate.length}개, 삭제 필요: ${reviewIdsToDelete.length}개`
    );

    // 3. 불필요한 요약 삭제
    if (reviewIdsToDelete.length > 0) {
      console.log(`[Catchtable] ${reviewIdsToDelete.length}개 요약 삭제 중...`);
      await catchtableReviewSummaryRepository.deleteBatchByReviewIds(reviewIdsToDelete);
      console.log(`[Catchtable] 삭제 완료`);
    }

    // 4. 필요한 pending 레코드 일괄 생성
    if (reviewIdsToCreate.length > 0) {
      console.log(`[Catchtable] ${reviewIdsToCreate.length}개 pending 레코드 생성 중...`);
      await catchtableReviewSummaryRepository.createBatch(restaurantId, reviewIdsToCreate);
      console.log(`[Catchtable] 생성 완료`);
    }

    // 5. AI 서비스 준비
    const summaryService = createCatchtableReviewSummaryService(useCloud);
    await summaryService.ensureReady();

    const serviceType = summaryService.getCurrentServiceType();

    // 전체 미완료 개수 조회
    const totalIncomplete = await catchtableReviewSummaryRepository.countIncompleteByRestaurantId(
      restaurantId
    );

    if (totalIncomplete === 0) {
      console.log('[Catchtable] 모든 요약이 완료되었습니다.');
      return {
        totalIncomplete: 0,
        completed: 0,
        failed: 0,
      };
    }

    console.log(`[Catchtable] 총 ${totalIncomplete}개 미완료 요약 처리 시작`);
    console.log(`[Catchtable] ${serviceType.toUpperCase()} AI 사용`);

    const globalStartTime = Date.now();
    let globalCompletedCount = 0;
    let globalFailedCount = 0;

    // 6. 전체 미완료 리뷰 일괄 조회
    const allReviews: CatchtableReviewDB[] = [];
    let offset = 0;
    const limit = 1000;

    console.log(`[Catchtable] 미완료 리뷰 데이터 조회 중...`);

    while (true) {
      const incompleteSummaries =
        await catchtableReviewSummaryRepository.findIncompleteByRestaurantId(
          restaurantId,
          limit,
          offset
        );

      if (incompleteSummaries.length === 0) {
        break;
      }

      const reviewIdsToFetch = incompleteSummaries.map((s) => s.review_id);
      const reviews = await catchtableReviewRepository.findByIds(reviewIdsToFetch);
      allReviews.push(...reviews);

      offset += limit;

      if (incompleteSummaries.length < limit) {
        break;
      }
    }

    if (allReviews.length === 0) {
      console.log('[Catchtable] 처리할 리뷰가 없습니다.');
      return {
        totalIncomplete: 0,
        completed: 0,
        failed: 0,
      };
    }

    console.log(`[Catchtable] 총 ${allReviews.length}개 리뷰 데이터 조회 완료`);

    // 7. AI에게 전체 리뷰 전달
    const allReviewIds = allReviews.map((r) => r.id);
    let processedCount = 0;
    const savePromises: Promise<{
      succeeded: number;
      failed: number;
      failedReviewIds: number[];
    }>[] = [];
    const allFailedReviewIds: number[] = [];

    await summaryService.summarizeReviews(allReviews, async (current, total, batchResults) => {
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
        )
          .then(({ succeeded, failed, failedReviewIds }) => {
            globalCompletedCount += succeeded;
            globalFailedCount += failed;
            allFailedReviewIds.push(...failedReviewIds);

            console.log(
              `  [Catchtable] AI 배치 저장 완료: ${succeeded}개 성공, ${failed}개 실패 (누적: ${globalCompletedCount}/${total})`
            );
            return { succeeded, failed, failedReviewIds };
          })
          .catch((err: Error) => {
            console.error('  [Catchtable] 배치 저장 오류:', err);
            globalFailedCount += batchResults.length;
            return { succeeded: 0, failed: batchResults.length, failedReviewIds: currentBatchReviewIds };
          });

        savePromises.push(savePromise);
        processedCount += batchResults.length;
      }

      // Socket 진행률 업데이트
      await jobService.emitProgressSocketEvent(
        jobId,
        restaurantId,
        SOCKET_EVENTS.CATCHTABLE_REVIEW_SUMMARY_PROGRESS,
        {
          current,
          total,
          metadata: {
            step: 'summary',
            substep: 'processing',
            serviceType,
            succeeded: globalCompletedCount,
            failed: globalFailedCount,
          },
        }
      );
    });

    // 8. 모든 저장 작업 완료 대기
    console.log(`[Catchtable] 모든 배치 저장 완료 대기 중...`);
    await Promise.all(savePromises);
    console.log(`[Catchtable] 모든 배치 저장 완료`);

    // 9. 실패 항목 재시도
    if (allFailedReviewIds.length > 0) {
      console.log(`\n[Catchtable] 실패한 ${allFailedReviewIds.length}개 항목 재시도...`);

      const failedReviews = await catchtableReviewRepository.findByIds(allFailedReviewIds);
      let retrySucceeded = 0;
      let retryFailed = 0;

      const isProduction = process.env.NODE_ENV === 'production';
      const isCloud = isProduction || serviceType === 'cloud';
      const batchSize = isCloud ? 10 : 1;
      console.log(`  [Catchtable] ${isCloud ? 'Cloud' : 'Local'} 모드: ${batchSize}건씩 재시도`);

      for (let i = 0; i < failedReviews.length; i += batchSize) {
        const batch = failedReviews.slice(i, i + batchSize);
        const batchIds = batch.map((r) => r.id);

        try {
          console.log(`  [재시도] 리뷰 ${batchIds.join(', ')} 처리 중...`);
          const summaryResults = await summaryService.summarizeReviews(batch);

          for (let j = 0; j < batch.length; j++) {
            const review = batch[j];
            const summaryData = summaryResults[j];

            if (summaryData && summaryData.summary && summaryData.summary !== '') {
              await catchtableReviewSummaryRepository.updateSummary(review.id, summaryData);
              retrySucceeded++;
              globalCompletedCount++;
              globalFailedCount--;
              console.log(`  [Catchtable] 재시도 성공 (리뷰 ${review.id})`);
            } else {
              console.warn(
                `  [Catchtable] 재시도 후에도 빈 요약 (리뷰 ${review.id}) - 원래 에러 메시지 유지`
              );
              retryFailed++;
            }
          }
        } catch (error) {
          for (const review of batch) {
            console.error(
              `  [Catchtable] 재시도 실패 (리뷰 ${review.id}):`,
              error instanceof Error ? error.message : error
            );
            retryFailed++;
          }
        }
      }

      console.log(`[Catchtable] 재시도 결과: 성공 ${retrySucceeded}개, 실패 ${retryFailed}개`);
    }

    const duration = Date.now() - globalStartTime;
    console.log(
      `\n[Catchtable] 전체 처리 완료! 성공: ${globalCompletedCount}개, 실패: ${globalFailedCount}개 (소요: ${(duration / 1000).toFixed(1)}초)`
    );

    return {
      totalIncomplete,
      completed: globalCompletedCount,
      failed: globalFailedCount,
    };
  }

  /**
   * 배치 결과를 DB에 일괄 저장하는 최적화된 메서드
   */
  private async saveBatchResultsOptimized(
    reviewIds: number[],
    batchResults: string[],
    summaryService: ReturnType<typeof createCatchtableReviewSummaryService>
  ): Promise<{ succeeded: number; failed: number; failedReviewIds: number[] }> {
    const updates: Array<{
      reviewId: number;
      summaryData: any | null;
      errorMessage?: string;
    }> = [];

    for (let i = 0; i < batchResults.length; i++) {
      const reviewId = reviewIds[i];
      const response = batchResults[i];

      if (response) {
        const summaryData = summaryService.parseResponse(response);

        if (summaryData) {
          if (summaryData.summary === '') {
            console.warn(`[Catchtable] 빈 요약 반환 (reviewId: ${reviewId}) - 실패 처리`);
            updates.push({
              reviewId,
              summaryData: null,
              errorMessage: 'AI가 빈 요약 반환 (리뷰 내용 부족)',
            });
          } else if (summaryData.summary === '요약 내용이 없습니다') {
            console.warn(
              `[Catchtable] 요약 내용 없음 (reviewId: ${reviewId}) - 리뷰 내용 부족하지만 완료 처리`
            );
            updates.push({ reviewId, summaryData });
          } else {
            updates.push({ reviewId, summaryData });
          }
        } else {
          let errorMessage = 'AI 요약 파싱 실패';

          try {
            const parsed = JSON.parse(response);
            if (parsed && parsed.summary === undefined) {
              errorMessage = 'summary 필드 누락';
              console.error(`[Catchtable] summary 필드 누락 (reviewId: ${reviewId})`);
            } else if (!parsed) {
              errorMessage = 'JSON 파싱 실패';
              console.error(`[Catchtable] JSON 파싱 실패 (reviewId: ${reviewId})`);
            }
          } catch {
            errorMessage = 'JSON 형식 오류';
            console.error(`[Catchtable] JSON 형식 오류 (reviewId: ${reviewId})`);
          }

          console.error(`원본 응답:`, response);
          updates.push({ reviewId, summaryData: null, errorMessage });
        }
      } else {
        console.error(`[Catchtable] AI 요약 생성 실패 (reviewId: ${reviewId}) - 응답이 비어있음`);
        updates.push({ reviewId, summaryData: null, errorMessage: 'AI 요약 생성 실패' });
      }
    }

    // 일괄 업데이트 (트랜잭션)
    await catchtableReviewSummaryRepository.updateSummaryBatch(updates);

    const succeeded = updates.filter((u) => u.summaryData).length;
    const failed = updates.filter((u) => u.errorMessage).length;
    const failedReviewIds = updates.filter((u) => u.errorMessage).map((u) => u.reviewId);

    return { succeeded, failed, failedReviewIds };
  }
}

export const catchtableReviewSummaryProcessor = new CatchtableReviewSummaryProcessor();
export default catchtableReviewSummaryProcessor;
