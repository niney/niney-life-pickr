import type { CrawlerContext, ProgressCallbacks } from './types';

/**
 * 더보기 버튼 찾기 스크립트 (브라우저 컨텍스트)
 */
const FIND_MORE_BUTTON_SCRIPT = `
  (() => {
    const buttons = document.querySelectorAll('a.fvwqf');
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const text = button.textContent?.trim() || '';
      if (text.includes('펼쳐서 더보기') &&
          !text.includes('팔로우') &&
          !text.includes('follow') &&
          !text.includes('구독')) {
        return true;
      }
    }
    return false;
  })()
`;

/**
 * 현재 로드된 리뷰 개수 가져오기
 */
async function getCurrentReviewCount(ctx: CrawlerContext): Promise<number> {
  if (!ctx.page) return 0;

  return await ctx.page.evaluate(() => {
    return document.querySelectorAll('#_review_list li.place_apply_pui').length;
  });
}

/**
 * 마지막 리뷰 아이템의 해시값 가져오기 (userName + visitDate 조합)
 */
async function getLastReviewHash(ctx: CrawlerContext): Promise<string> {
  if (!ctx.page) return '';

  return await ctx.page.evaluate(() => {
    const reviewElements = document.querySelectorAll('#_review_list li.place_apply_pui');
    if (reviewElements.length === 0) return '';

    const lastElement = reviewElements[reviewElements.length - 1];
    const userName = lastElement.querySelector('.pui__NMi-Dp')?.textContent?.trim() || '';
    const visitInfoElements = lastElement.querySelectorAll('.pui__QKE5Pr .pui__gfuUIT');
    let visitDate = '';
    visitInfoElements.forEach(el => {
      const text = el.textContent?.trim() || '';
      if (text.match(/^\d+\.\d+\./)) {
        visitDate = text;
      }
    });

    return `${userName}|${visitDate}|${reviewElements.length}`;
  });
}

/**
 * 더보기 버튼 클릭
 */
async function clickMoreButton(ctx: CrawlerContext): Promise<boolean> {
  if (!ctx.page) return false;

  return await ctx.page.evaluate(() => {
    const buttons = document.querySelectorAll('a.fvwqf');
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const text = button.textContent?.trim() || '';
      if (text.includes('펼쳐서 더보기') &&
          !text.includes('팔로우') &&
          !text.includes('follow') &&
          !text.includes('구독')) {
        (button as HTMLElement).click();
        return true;
      }
    }
    return false;
  });
}

/**
 * 더보기 버튼 대기
 */
async function waitForMoreButton(ctx: CrawlerContext, timeout: number = 5000): Promise<boolean> {
  if (!ctx.page) return false;

  try {
    await ctx.page.waitForFunction(FIND_MORE_BUTTON_SCRIPT, {
      timeout,
      polling: 100
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 모든 리뷰 로드 (더보기 버튼 반복 클릭)
 */
export async function loadAllReviews(
  ctx: CrawlerContext,
  callbacks?: ProgressCallbacks,
  maxClicks: number = 5000
): Promise<number> {
  if (!ctx.page) {
    throw new Error('[LoadReviews] 페이지가 초기화되지 않았습니다');
  }

  console.log('[LoadReviews] 더보기 버튼 클릭 시작...');

  let clickCount = 0;
  let previousReviewCount = 0;

  while (clickCount < maxClicks) {
    try {
      // 현재 리뷰 개수 확인
      const currentReviewCount = await getCurrentReviewCount(ctx);

      // 진행 상황 콜백
      if (currentReviewCount !== previousReviewCount) {
        console.log(`[LoadReviews] 로드된 리뷰: ${currentReviewCount}개`);
        if (callbacks?.onCrawlProgress) {
          callbacks.onCrawlProgress(currentReviewCount, ctx.totalReviewCount || currentReviewCount);
        }
        previousReviewCount = currentReviewCount;
      }

      // 클릭 전 마지막 아이템 해시 저장
      const lastHashBeforeClick = await getLastReviewHash(ctx);

      // 더보기 버튼 클릭
      const clicked = await clickMoreButton(ctx);

      if (!clicked) {
        console.log('[LoadReviews] 더보기 버튼 없음, 모든 리뷰 로드 완료');
        break;
      }

      clickCount++;
      if (clickCount % 10 === 0) {
        console.log(`[LoadReviews] 더보기 클릭: ${clickCount}/${maxClicks}`);
      }

      // 마지막 아이템 해시가 변경될 때까지 대기 (새 리뷰 로드 확인)
      let hashChanged = false;
      for (let i = 0; i < 50; i++) { // 최대 5초 대기 (100ms * 50)
        await new Promise(resolve => setTimeout(resolve, 100));
        const currentLastHash = await getLastReviewHash(ctx);
        if (currentLastHash !== lastHashBeforeClick) {
          hashChanged = true;
          break;
        }
      }

      if (!hashChanged) {
        console.log('[LoadReviews] 새 리뷰 로드 대기 타임아웃, 로드 완료');
        break;
      }

      // 버튼이 다시 나타날 때까지 대기
      const hasMore = await waitForMoreButton(ctx, 3000);
      if (!hasMore) {
        console.log('[LoadReviews] 더보기 버튼 대기 타임아웃, 로드 완료');
        break;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('[LoadReviews] 오류:', errorMessage);
      break;
    }
  }

  // 최종 리뷰 개수
  ctx.loadedReviewCount = await getCurrentReviewCount(ctx);
  console.log(`[LoadReviews] 총 ${clickCount}번 클릭, ${ctx.loadedReviewCount}개 리뷰 로드`);

  // 최종 진행 상황 콜백
  if (callbacks?.onCrawlProgress) {
    callbacks.onCrawlProgress(ctx.loadedReviewCount, ctx.totalReviewCount || ctx.loadedReviewCount);
  }

  return ctx.loadedReviewCount;
}

/**
 * 스크롤 기반 DOM 로딩 (이미지 URL 추출용)
 */
export async function scrollForDomLoad(ctx: CrawlerContext): Promise<void> {
  if (!ctx.page) {
    throw new Error('[LoadReviews] 페이지가 초기화되지 않았습니다');
  }

  console.log('[LoadReviews] 스크롤 기반 DOM 로딩 시작...');

  const totalItems = await ctx.page.evaluate(() => {
    return document.querySelectorAll('#_review_list li.place_apply_pui').length;
  });

  // 빠른 스크롤 (이미지 대기 없이 DOM만 로드)
  await ctx.page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const reviewElements = document.querySelectorAll('#_review_list li.place_apply_pui');
      let currentIndex = 0;
      const SKIP_COUNT = 10;

      const scrollToNext = () => {
        if (currentIndex >= reviewElements.length) {
          resolve();
          return;
        }

        const element = reviewElements[currentIndex];
        element.scrollIntoView({ behavior: 'instant', block: 'center' });
        currentIndex += SKIP_COUNT;

        setTimeout(scrollToNext, 30);
      };

      scrollToNext();
    });
  });

  console.log(`[LoadReviews] 스크롤 완료 (${totalItems}개 리뷰)`);
}

/**
 * 감정 키워드 더보기 버튼 클릭
 */
export async function expandEmotionKeywords(ctx: CrawlerContext): Promise<void> {
  if (!ctx.page) {
    throw new Error('[LoadReviews] 페이지가 초기화되지 않았습니다');
  }

  console.log('[LoadReviews] 감정 키워드 더보기 클릭...');

  try {
    await ctx.page.evaluate(() => {
      const moreButtons = document.querySelectorAll(
        '.pui__HLNvmI .pui__jhpEyP.pui__ggzZJ8[data-pui-click-code="keywordmore"]'
      );
      moreButtons.forEach(btn => {
        try {
          (btn as HTMLElement).click();
        } catch {
          // 무시
        }
      });
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('[LoadReviews] 감정 키워드 더보기 클릭 완료');
  } catch (error) {
    console.log('[LoadReviews] 감정 키워드 더보기 클릭 오류:', error);
  }
}
