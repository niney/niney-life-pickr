import restaurantService from './restaurant.service';
import jobService from './job-socket.service';

export interface CrawlWorkflowParams {
  restaurantId: number;
  placeId: string | null;
  standardUrl: string | null;
  crawlMenus: boolean;
  crawlReviews: boolean;
  createSummary: boolean;
  resetSummary: boolean;
  jobId?: string;
}

class CrawlerExecutor {
  /**
   * 메뉴 크롤링 실행
   */
  async executeMenuCrawl(
    url: string,
    restaurantId: number,
    jobId?: string
  ): Promise<{ menusCount: number }> {
    console.log(`[CrawlerExecutor] 메뉴 크롤링 시작${jobId ? ` (Job ${jobId})` : ''}`);

    const result = await restaurantService.crawlAndSaveMenusOnly(
      url,
      restaurantId,
      jobId
    );

    console.log(`[CrawlerExecutor] 메뉴 크롤링 완료 - ${result.menusCount}개 저장`);
    return result;
  }

  /**
   * 리뷰 크롤링 실행
   */
  async executeReviewCrawl(
    placeId: string,
    restaurantId: number,
    jobId?: string
  ): Promise<{ reviewsCount: number; cancelled?: boolean }> {
    console.log(`[CrawlerExecutor] 리뷰 크롤링 시작${jobId ? ` (Job ${jobId})` : ''}`);

    const reviewUrl = `https://m.place.naver.com/restaurant/${placeId}/review/visitor?reviewSort=recent`;
    const reviewCrawlerProcessor = await import('./review-crawler-processor.service');

    const reviews = await reviewCrawlerProcessor.default.processWithJobId(
      jobId || '',
      placeId,
      reviewUrl,
      restaurantId
    );

    // 취소 확인
    if (jobId && jobService.isCancelled(jobId)) {
      console.log(`[CrawlerExecutor] 리뷰 크롤링 취소됨 (Job ${jobId})`);
      await jobService.cancel(jobId, {
        step: 'reviews_cancelled',
        totalReviews: reviews.length
      });
      return { reviewsCount: reviews.length, cancelled: true };
    }

    console.log(`[CrawlerExecutor] 리뷰 크롤링 완료 - ${reviews.length}개`);
    return { reviewsCount: reviews.length, cancelled: false };
  }

  /**
   * 리뷰 요약 생성 실행
   */
  async executeReviewSummary(
    restaurantId: number,
    resetSummary: boolean,
    jobId?: string
  ): Promise<{ completed: number; failed: number }> {
    console.log(`[CrawlerExecutor] 리뷰 요약 시작${jobId ? ` (Job ${jobId})` : ''}`);

    // 기존 요약 삭제 (옵션)
    if (resetSummary) {
      const reviewSummaryRepository = await import('../db/repositories/review-summary.repository');
      await reviewSummaryRepository.default.deleteByRestaurantId(restaurantId);
      console.log(`[CrawlerExecutor] 기존 요약 삭제 완료${jobId ? ` (Job ${jobId})` : ''}`);
    }

    const reviewSummaryProcessor = await import('./review-summary-processor.service');

    const summaryResult = await reviewSummaryProcessor.default.processWithJobId(
      jobId || '',
      restaurantId,
      true // useCloud
    );

    console.log(
      `[CrawlerExecutor] 리뷰 요약 완료 - ${summaryResult.completed}개 성공, ${summaryResult.failed}개 실패`
    );

    return summaryResult;
  }

  /**
   * 통합 크롤링 워크플로우 실행
   * 메뉴 → 리뷰 → 요약 순차 실행
   */
  async executeCrawlWorkflow(params: CrawlWorkflowParams): Promise<void> {
    const {
      restaurantId,
      placeId,
      standardUrl,
      crawlMenus,
      crawlReviews,
      createSummary,
      resetSummary,
      jobId
    } = params;

    console.log(
      `[CrawlerExecutor] 크롤링 워크플로우 시작 (Restaurant ${restaurantId}${jobId ? `, Job ${jobId}` : ''})`
    );

    try {
      // 1️⃣ 메뉴 크롤링
      if (crawlMenus && standardUrl) {
        await this.executeMenuCrawl(standardUrl, restaurantId, jobId);
      }

      // 2️⃣ 리뷰 크롤링
      if (crawlReviews && placeId) {
        const reviewResult = await this.executeReviewCrawl(placeId, restaurantId, jobId);

        // 취소된 경우 후속 작업 중단
        if (reviewResult.cancelled) {
          console.log(`[CrawlerExecutor] 워크플로우 중단됨 (Job ${jobId})`);
          return;
        }
      }

      // 3️⃣ 리뷰 요약 생성
      if (createSummary) {
        await this.executeReviewSummary(restaurantId, resetSummary, jobId);
      }

      console.log(
        `[CrawlerExecutor] 크롤링 워크플로우 완료 (Restaurant ${restaurantId}${jobId ? `, Job ${jobId}` : ''})`
      );
    } catch (error) {
      console.error(
        `[CrawlerExecutor] 크롤링 워크플로우 실패 (Restaurant ${restaurantId}):`,
        error
      );
      throw error;
    }
  }
}

export default new CrawlerExecutor();
