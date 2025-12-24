/**
 * Review Crawler v2
 *
 * 리뷰 크롤링을 스텝별로 분리한 모듈형 크롤러
 *
 * 스텝 구조:
 * 1. browser.step.ts     - 브라우저 생성/설정/종료
 * 2. page-load.step.ts   - 페이지 로드 + URL 처리
 * 3. load-all-reviews.step.ts - 더보기 클릭 + 스크롤
 * 4. extract-reviews.step.ts  - DOM에서 리뷰 추출
 * 5. download-images.step.ts  - 이미지 다운로드
 */

import { createContext, initBrowser, closeBrowser } from './browser.step';
import { loadPage, waitForReviewList, getTotalReviewCount } from './page-load.step';
import { loadAllReviews, scrollForDomLoad, expandEmotionKeywords } from './load-all-reviews.step';
import { extractReviews } from './extract-reviews.step';
import { processReviews, processReviewsWithoutImages } from './download-images.step';
import type {
  CrawlOptions,
  ProgressCallbacks,
  CrawlResult,
  ProcessedReviewData
} from './types';

// 타입 re-export
export type {
  CrawlerContext,
  CrawlOptions,
  ProgressCallbacks,
  CrawlResult,
  ProcessedReviewData,
  RawReviewData,
  BrowserOptions
} from './types';

// 스텝 함수 re-export (고급 사용자용)
export { createContext, initBrowser, closeBrowser } from './browser.step';
export { loadPage, waitForReviewList, getTotalReviewCount, extractPlaceId } from './page-load.step';
export { loadAllReviews, scrollForDomLoad, expandEmotionKeywords } from './load-all-reviews.step';
export { extractReviews } from './extract-reviews.step';
export { processReviews, processReviewsWithoutImages } from './download-images.step';

/**
 * 리뷰 크롤링 실행 (전체 워크플로우)
 */
export async function crawlReviews(
  url: string,
  options?: CrawlOptions,
  callbacks?: ProgressCallbacks
): Promise<CrawlResult> {
  const {
    browserOptions = {},
    enableScroll = true,
    downloadImages = true,
    maxMoreClicks = 5000
  } = options || {};

  // 컨텍스트 생성
  const ctx = createContext(url);

  try {
    // Step 1: 브라우저 시작
    console.log('=== Step 1: 브라우저 초기화 ===');
    await initBrowser(ctx, browserOptions);

    // Step 2: 페이지 로드
    console.log('=== Step 2: 페이지 로드 ===');
    await loadPage(ctx);
    await waitForReviewList(ctx);
    await getTotalReviewCount(ctx);

    // Step 3: 모든 리뷰 로드
    console.log('=== Step 3: 모든 리뷰 로드 ===');
    await loadAllReviews(ctx, callbacks, maxMoreClicks);

    if (enableScroll) {
      await scrollForDomLoad(ctx);
    }

    await expandEmotionKeywords(ctx);

    // Step 4: 리뷰 추출
    console.log('=== Step 4: 리뷰 추출 ===');
    const rawReviews = await extractReviews(ctx);

    // Step 5: 후처리 (날짜 파싱 + 이미지 다운로드)
    console.log('=== Step 5: 후처리 ===');
    let reviews: ProcessedReviewData[];

    if (downloadImages) {
      reviews = await processReviews(ctx, rawReviews, callbacks, true);
    } else {
      reviews = await processReviewsWithoutImages(rawReviews);
    }

    console.log(`=== 크롤링 완료: ${reviews.length}개 리뷰 ===`);

    return {
      success: true,
      reviews,
      placeId: ctx.placeId,
      totalReviewCount: ctx.totalReviewCount
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ReviewCrawler] 크롤링 실패:', errorMessage);

    return {
      success: false,
      reviews: [],
      placeId: ctx.placeId,
      totalReviewCount: ctx.totalReviewCount,
      error: errorMessage
    };

  } finally {
    // 브라우저 종료
    await closeBrowser(ctx);
  }
}

/**
 * 개별 스텝 실행 (고급 사용자용)
 *
 * 각 스텝을 개별적으로 실행하고 싶을 때 사용
 *
 * @example
 * ```typescript
 * import { steps } from './review-crawler';
 *
 * const ctx = steps.createContext(url);
 * await steps.initBrowser(ctx);
 * await steps.loadPage(ctx);
 * // ... 원하는 스텝만 실행
 * await steps.closeBrowser(ctx);
 * ```
 */
export const steps = {
  createContext,
  initBrowser,
  closeBrowser,
  loadPage,
  waitForReviewList,
  getTotalReviewCount,
  loadAllReviews,
  scrollForDomLoad,
  expandEmotionKeywords,
  extractReviews,
  processReviews,
  processReviewsWithoutImages
};

// 기본 export
export default { crawlReviews, steps };
