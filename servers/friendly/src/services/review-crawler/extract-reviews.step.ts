import type { CrawlerContext, RawReviewData } from './types';

/**
 * DOM에서 리뷰 정보 추출 스크립트 (브라우저 컨텍스트)
 */
const EXTRACT_REVIEWS_SCRIPT = `
  (() => {
    const reviewElements = document.querySelectorAll('#_review_list li.place_apply_pui');
    const reviews = [];

    reviewElements.forEach((element) => {
      try {
        // 사용자명
        const userNameElement = element.querySelector('.pui__NMi-Dp');
        const userName = userNameElement?.textContent?.trim() || null;

        // 방문 키워드 (중복 제거)
        const visitKeywordElements = element.querySelectorAll('.pui__uqSlGl .pui__V8F9nN em, .pui__uqSlGl .pui__V8F9nN');
        const visitKeywords = [];
        const seenKeywords = new Set();

        visitKeywordElements.forEach(el => {
          const text = el.textContent?.trim();
          if (text &&
              !text.includes('대기 시간') &&
              !text.includes('바로 입장') &&
              !seenKeywords.has(text)) {
            seenKeywords.add(text);
            visitKeywords.push(text);
          }
        });

        // 대기시간
        const waitTimeElements = element.querySelectorAll('.pui__uqSlGl .pui__V8F9nN');
        let waitTime = null;
        waitTimeElements.forEach(el => {
          const text = el.textContent?.trim();
          if (text?.includes('대기 시간')) {
            waitTime = text.includes('바로 입장') ? '바로 입장' : text;
          }
        });

        // 리뷰 텍스트
        const reviewTextElement = element.querySelector('.pui__vn15t2 a');
        const reviewText = reviewTextElement?.textContent?.trim() || null;

        // 이미지 URL
        const imageSelectors = [
          '.flicking-camera img',
          '.lazyload-wrapper img',
        ];

        const imageUrls = [];
        const seenUrls = new Set();

        for (const selector of imageSelectors) {
          const imageElements = element.querySelectorAll(selector);
          imageElements.forEach(img => {
            const dataSrc = img.getAttribute('data-src');
            const src = img.getAttribute('src');
            const imageUrl = dataSrc || src;

            if (imageUrl &&
                !imageUrl.includes('blank.gif') &&
                !imageUrl.includes('placeholder') &&
                !imageUrl.includes('data:image') &&
                !imageUrl.startsWith('data:') &&
                !seenUrls.has(imageUrl)) {
              seenUrls.add(imageUrl);
              imageUrls.push(imageUrl);
            }
          });

          if (imageUrls.length > 0) break;
        }

        // 감정 키워드 (중복 제거)
        const emotionKeywords = [];
        const seenEmotions = new Set();
        const emotionElements = element.querySelectorAll('.pui__HLNvmI .pui__jhpEyP');

        emotionElements.forEach(el => {
          if (!el.hasAttribute('data-pui-click-code') ||
              el.getAttribute('data-pui-click-code') !== 'keywordmore') {
            const text = el.textContent?.trim();
            if (text &&
                !text.includes('개의 리뷰가 더 있습니다') &&
                !text.includes('펼쳐보기') &&
                !seenEmotions.has(text)) {
              seenEmotions.add(text);
              emotionKeywords.push(text);
            }
          }
        });

        // 방문 정보
        const visitInfoElements = element.querySelectorAll('.pui__QKE5Pr .pui__gfuUIT');
        let visitDate = null;
        let visitCount = null;
        let verificationMethod = null;

        visitInfoElements.forEach(el => {
          const text = el.textContent?.trim();
          if (text?.includes('번째 방문')) {
            visitCount = text;
          } else if (text?.includes('영수증') || text?.includes('카드결제')) {
            verificationMethod = text;
          } else if (text?.match(/^\\d+\\.\\d+\\./)) {
            visitDate = text;
          }
        });

        if (!visitDate) {
          const timeElement = element.querySelector('time');
          if (timeElement) {
            visitDate = timeElement.textContent?.trim() || null;
          }
        }
        
        reviews.push({
          userName,
          visitKeywords,
          waitTime,
          reviewText,
          emotionKeywords,
          visitInfo: {
            visitDate,
            visitCount,
            verificationMethod
          },
          imageUrls
        });
      } catch (error) {
        console.error('리뷰 추출 중 오류:', error);
      }
    });

    return reviews;
  })()
`;

/**
 * DOM에서 리뷰 정보 추출
 */
export async function extractReviews(ctx: CrawlerContext): Promise<RawReviewData[]> {
  if (!ctx.page) {
    throw new Error('[ExtractReviews] 페이지가 초기화되지 않았습니다');
  }

  console.log('[ExtractReviews] 리뷰 정보 추출 시작...');

  const rawReviews = await ctx.page.evaluate(EXTRACT_REVIEWS_SCRIPT) as RawReviewData[];

  console.log(`[ExtractReviews] ${rawReviews.length}개 리뷰 추출 완료`);

  return rawReviews;
}
