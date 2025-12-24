import type { CrawlerContext } from './types';

/**
 * 텍스트에서 URL 추출
 */
export function extractUrl(text: string): string | null {
  // URL 패턴 매칭 (http, https 포함)
  const urlPattern = /(https?:\/\/[^\s]+)/;
  const match = text.match(urlPattern);

  if (match) {
    return match[1];
  }

  // naver.me 단축 URL 패턴 (http/https 없이도 감지)
  const naverMePattern = /(naver\.me\/[^\s]+)/;
  const naverMeMatch = text.match(naverMePattern);

  if (naverMeMatch) {
    return `https://${naverMeMatch[1]}`;
  }

  return text.trim() || null;
}

/**
 * URL에서 Place ID 추출
 */
export function extractPlaceId(url: string): string | null {
  if (url.includes('naver.me')) {
    return null;
  }

  const patterns = [
    /map\.naver\.com\/p\/entry\/place\/(\d+)/,
    /map\.naver\.com\/v5\/entry\/place\/(\d+)/,
    /m\.place\.naver\.com\/restaurant\/(\d+)/,
    /place\.naver\.com\/restaurant\/(\d+)/,
    /place\/(\d+)/,
    /[?&]placeUid=(\d+)/,
    /[?&]id=(\d+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * 리뷰 페이지 URL 생성
 */
export function buildReviewUrl(placeId: string): string {
  return `https://m.place.naver.com/restaurant/${placeId}/review/visitor?reviewSort=recent`;
}

/**
 * 페이지 로드 및 URL 처리
 */
export async function loadPage(ctx: CrawlerContext): Promise<void> {
  if (!ctx.page) {
    throw new Error('[PageLoad] 페이지가 초기화되지 않았습니다');
  }

  // URL 추출
  const extractedUrl = extractUrl(ctx.originalUrl);
  if (!extractedUrl) {
    throw new Error('[PageLoad] URL을 추출할 수 없습니다');
  }

  ctx.crawlUrl = extractedUrl;
  ctx.finalUrl = extractedUrl;

  console.log('[PageLoad] 추출된 URL:', extractedUrl);

  // naver.me 단축 URL 처리
  if (extractedUrl.includes('naver.me')) {
    console.log('[PageLoad] naver.me 단축 URL 감지, 리다이렉트 처리...');

    await ctx.page.goto(extractedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });

    ctx.finalUrl = ctx.page.url();
    console.log('[PageLoad] 리다이렉트된 URL:', ctx.finalUrl);

    ctx.placeId = extractPlaceId(ctx.finalUrl);
    if (ctx.placeId) {
      ctx.crawlUrl = buildReviewUrl(ctx.placeId);
      console.log('[PageLoad] 모바일 리뷰 URL로 변환:', ctx.crawlUrl);

      await ctx.page.goto(ctx.crawlUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });
    }
  } else {
    // 일반 URL
    ctx.placeId = extractPlaceId(extractedUrl);
    if (ctx.placeId) {
      ctx.crawlUrl = buildReviewUrl(ctx.placeId);
    }

    await ctx.page.goto(ctx.crawlUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });

    ctx.finalUrl = ctx.page.url();
    if (!ctx.placeId) {
      ctx.placeId = extractPlaceId(ctx.finalUrl);
    }
  }

  console.log('[PageLoad] 페이지 로드 완료, Place ID:', ctx.placeId);
}

/**
 * 리뷰 목록 로드 대기
 */
export async function waitForReviewList(ctx: CrawlerContext): Promise<void> {
  if (!ctx.page) {
    throw new Error('[PageLoad] 페이지가 초기화되지 않았습니다');
  }

  console.log('[PageLoad] 리뷰 목록 로드 대기 중...');

  try {
    await ctx.page.waitForSelector('#_review_list', { timeout: 10000 });
    await ctx.page.waitForSelector('#_review_list li.place_apply_pui', { timeout: 5000 });
    console.log('[PageLoad] 리뷰 목록 로드 완료');
  } catch (error) {
    console.log('[PageLoad] 리뷰 목록 대기 시간 초과, 계속 진행...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

/**
 * 전체 리뷰 개수 추출
 */
export async function getTotalReviewCount(ctx: CrawlerContext): Promise<number> {
  if (!ctx.page) {
    throw new Error('[PageLoad] 페이지가 초기화되지 않았습니다');
  }

  try {
    const count = await ctx.page.evaluate(() => {
      const countElement = document.querySelector('.place_section_count');
      if (countElement) {
        const text = countElement.textContent?.trim() || '';
        const match = text.match(/[\d,]+/);
        return match ? parseInt(match[0].replace(/,/g, ''), 10) : 0;
      }
      return 0;
    });

    ctx.totalReviewCount = count;
    console.log(`[PageLoad] 전체 리뷰 개수: ${count}개`);
    return count;
  } catch (error) {
    console.log('[PageLoad] 전체 리뷰 개수 추출 실패:', error);
    return 0;
  }
}
