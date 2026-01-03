import reviewSummaryRepository from '../db/repositories/review-summary.repository';
import reviewRepository from '../db/repositories/review.repository';
import catchtableReviewRepository from '../db/repositories/catchtable-review.repository';
import catchtableReviewSummaryRepository from '../db/repositories/catchtable-review-summary.repository';
import type { RestaurantReviewStatistics } from '../types/db.types';

export type StatisticsSource = 'naver' | 'catchtable' | 'all';

interface SentimentStats {
  totalReviews: number;
  positive: number;
  negative: number;
  neutral: number;
  total: number; // analyzedReviews
}

/**
 * 레스토랑 통계 서비스
 */
class RestaurantStatisticsService {
  /**
   * 레스토랑별 리뷰 감정 통계 계산
   */
  async calculateReviewStatistics(
    restaurantId: number,
    source: StatisticsSource = 'naver'
  ): Promise<RestaurantReviewStatistics> {
    const stats = await this.getSentimentStats(restaurantId, source);
    return this.formatResult(restaurantId, stats);
  }

  /**
   * 소스별 분기
   */
  private async getSentimentStats(
    restaurantId: number,
    source: StatisticsSource
  ): Promise<SentimentStats> {
    switch (source) {
      case 'naver':
        return this.getNaverStats(restaurantId);
      case 'catchtable':
        return this.getCatchtableStats(restaurantId);
      case 'all':
        return this.getCombinedStats(restaurantId);
    }
  }

  /**
   * 네이버 리뷰 통계
   */
  private async getNaverStats(restaurantId: number): Promise<SentimentStats> {
    const [totalReviews, sentimentStats] = await Promise.all([
      reviewRepository.countByRestaurantId(restaurantId),
      reviewSummaryRepository.countSentimentByRestaurant(restaurantId),
    ]);

    return {
      totalReviews,
      positive: sentimentStats.positive,
      negative: sentimentStats.negative,
      neutral: sentimentStats.neutral,
      total: sentimentStats.total,
    };
  }

  /**
   * 캐치테이블 리뷰 통계
   */
  private async getCatchtableStats(restaurantId: number): Promise<SentimentStats> {
    const [totalReviews, sentimentStats] = await Promise.all([
      catchtableReviewRepository.countByRestaurantId(restaurantId),
      catchtableReviewSummaryRepository.countSentimentByRestaurantId(restaurantId),
    ]);

    return {
      totalReviews,
      positive: sentimentStats.positive,
      negative: sentimentStats.negative,
      neutral: sentimentStats.neutral,
      total: sentimentStats.total,
    };
  }

  /**
   * 전체 통합 통계 (네이버 + 캐치테이블)
   */
  private async getCombinedStats(restaurantId: number): Promise<SentimentStats> {
    const [naver, catchtable] = await Promise.all([
      this.getNaverStats(restaurantId),
      this.getCatchtableStats(restaurantId),
    ]);

    return {
      totalReviews: naver.totalReviews + catchtable.totalReviews,
      positive: naver.positive + catchtable.positive,
      negative: naver.negative + catchtable.negative,
      neutral: naver.neutral + catchtable.neutral,
      total: naver.total + catchtable.total,
    };
  }

  /**
   * 결과 포맷팅
   */
  private formatResult(
    restaurantId: number,
    stats: SentimentStats
  ): RestaurantReviewStatistics {
    const { totalReviews, positive, negative, neutral, total: analyzedReviews } = stats;

    // 비율 계산 (소수점 첫째자리)
    const positiveRate =
      analyzedReviews > 0 ? Math.round((positive / analyzedReviews) * 1000) / 10 : 0;
    const negativeRate =
      analyzedReviews > 0 ? Math.round((negative / analyzedReviews) * 1000) / 10 : 0;
    const neutralRate =
      analyzedReviews > 0 ? Math.round((neutral / analyzedReviews) * 1000) / 10 : 0;

    return {
      restaurantId,
      totalReviews,
      analyzedReviews,
      positive,
      negative,
      neutral,
      positiveRate,
      negativeRate,
      neutralRate,
    };
  }
}

export default new RestaurantStatisticsService();
