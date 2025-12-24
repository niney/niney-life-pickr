import imageDownloader from '../../utils/image-download.utils';
import { generateReviewImageHash } from '../../utils/hash.utils';
import { parseVisitDate } from '../../utils/date.utils';
import type { CrawlerContext, RawReviewData, ProcessedReviewData, ProgressCallbacks } from './types';

/**
 * 리뷰 날짜 파싱 및 이미지 다운로드
 */
export async function processReviews(
  ctx: CrawlerContext,
  rawReviews: RawReviewData[],
  callbacks?: ProgressCallbacks,
  downloadImages: boolean = true
): Promise<ProcessedReviewData[]> {
  console.log('[DownloadImages] 리뷰 후처리 시작...');

  const processedReviews: ProcessedReviewData[] = [];

  // 이미지가 있는 리뷰 개수 (진행률 계산용)
  const reviewsWithImages = rawReviews.filter(r => r.imageUrls && r.imageUrls.length > 0).length;
  console.log(`[DownloadImages] 이미지 다운로드 대상: ${reviewsWithImages}개 리뷰`);

  let processedCount = 0;

  for (const review of rawReviews) {
    // 날짜 파싱
    const parsedVisitDate = parseVisitDate(review.visitInfo.visitDate);

    const processedReview: ProcessedReviewData = {
      userName: review.userName,
      visitKeywords: review.visitKeywords,
      waitTime: review.waitTime,
      reviewText: review.reviewText,
      emotionKeywords: review.emotionKeywords,
      visitInfo: {
        visitDate: parsedVisitDate,
        visitCount: review.visitInfo.visitCount,
        verificationMethod: review.visitInfo.verificationMethod
      }
    };

    // 이미지 다운로드
    if (downloadImages && ctx.placeId && review.imageUrls && review.imageUrls.length > 0) {
      try {
        // 리뷰 해시 생성 (이미지 저장 폴더명용)
        const imageHash = generateReviewImageHash(
          ctx.placeId,
          review.userName,
          parsedVisitDate,
          review.visitInfo.visitCount,
          review.visitInfo.verificationMethod
        );

        // 이미지 다운로드 (병렬 처리)
        const downloadedPaths = await imageDownloader.downloadImages(
          review.imageUrls,
          ctx.placeId,
          imageHash
        );

        processedReview.images = downloadedPaths;

        processedCount++;
        if (callbacks?.onImageProgress) {
          callbacks.onImageProgress(processedCount, reviewsWithImages);
        }

        if (processedCount % 10 === 0) {
          console.log(`[DownloadImages] 이미지 다운로드: ${processedCount}/${reviewsWithImages}`);
        }
      } catch (error) {
        console.error('[DownloadImages] 이미지 다운로드 실패:', error);
      }
    }

    processedReviews.push(processedReview);
  }

  console.log(`[DownloadImages] 후처리 완료: ${processedReviews.length}개 리뷰`);

  return processedReviews;
}

/**
 * 이미지 다운로드 없이 리뷰만 처리
 */
export async function processReviewsWithoutImages(
  rawReviews: RawReviewData[]
): Promise<ProcessedReviewData[]> {
  console.log('[DownloadImages] 리뷰 날짜 파싱 시작...');

  const processedReviews: ProcessedReviewData[] = rawReviews.map(review => ({
    userName: review.userName,
    visitKeywords: review.visitKeywords,
    waitTime: review.waitTime,
    reviewText: review.reviewText,
    emotionKeywords: review.emotionKeywords,
    visitInfo: {
      visitDate: parseVisitDate(review.visitInfo.visitDate),
      visitCount: review.visitInfo.visitCount,
      verificationMethod: review.visitInfo.verificationMethod
    }
  }));

  console.log(`[DownloadImages] 날짜 파싱 완료: ${processedReviews.length}개 리뷰`);

  return processedReviews;
}
