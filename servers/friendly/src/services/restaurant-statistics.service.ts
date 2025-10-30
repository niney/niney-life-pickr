import reviewSummaryRepository from '../db/repositories/review-summary.repository';
import reviewRepository from '../db/repositories/review.repository';
import type { RestaurantReviewStatistics } from '../types/db.types';

/**
 * 레스토랑 통계 서비스
 */
class RestaurantStatisticsService {
  /**
   * 레스토랑별 리뷰 감정 통계 계산
   */
  async calculateReviewStatistics(restaurantId: number): Promise<RestaurantReviewStatistics> {
    // 1. 전체 리뷰 수 조회
    const totalReviews = await reviewRepository.countByRestaurantId(restaurantId);

    // 2. 감정별 통계 조회
    const sentimentStats = await reviewSummaryRepository.countSentimentByRestaurant(restaurantId);

    // 3. 비율 계산 (소수점 첫째자리)
    const analyzedReviews = sentimentStats.total;
    const positiveRate = analyzedReviews > 0
      ? Math.round((sentimentStats.positive / analyzedReviews) * 1000) / 10
      : 0;
    const negativeRate = analyzedReviews > 0
      ? Math.round((sentimentStats.negative / analyzedReviews) * 1000) / 10
      : 0;
    const neutralRate = analyzedReviews > 0
      ? Math.round((sentimentStats.neutral / analyzedReviews) * 1000) / 10
      : 0;

    return {
      restaurantId,
      totalReviews,
      analyzedReviews,
      positive: sentimentStats.positive,
      negative: sentimentStats.negative,
      neutral: sentimentStats.neutral,
      positiveRate,
      negativeRate,
      neutralRate
    };
  }
}

export default new RestaurantStatisticsService();
