import reviewSummaryRepository from '../db/repositories/review-summary.repository';
import restaurantRepository from '../db/repositories/restaurant.repository';
import rankingCacheService from './ranking-cache.service';
import type {
  RankingOptions,
  RestaurantRanking,
  RestaurantRankingsResponse,
} from '../types/db.types';

/**
 * Restaurant Ranking Service
 * 레스토랑 감정률 순위 계산
 */
export class RestaurantRankingService {
  /**
   * 레스토랑 순위 조회
   */
  async getRankings(options: RankingOptions): Promise<RestaurantRankingsResponse> {
    const { type, limit, minReviews, category, excludeNeutral = false } = options;

    // 캐시 조회
    const cacheKey = rankingCacheService.getCacheKey(type, limit, minReviews, category, excludeNeutral);
    const cached = rankingCacheService.get(cacheKey);

    if (cached) {
      console.log(`[RankingService] Cache HIT: ${cacheKey}`);
      return cached;
    }

    console.log(`[RankingService] Cache MISS: ${cacheKey}`);

    // 성능 측정 시작
    const startTime = Date.now();

    // Repository에서 모든 레스토랑 통계 조회
    const stats = await reviewSummaryRepository.getAllRestaurantsSentimentStats(
      minReviews,
      category,
      excludeNeutral
    );

    // 타입에 따라 정렬
    const sortColumn = `${type}_rate` as 'positive_rate' | 'negative_rate' | 'neutral_rate';
    const sortedStats = stats.sort((a, b) => {
      // 1차: 타겟 비율 (내림차순)
      if (b[sortColumn] !== a[sortColumn]) {
        return (b[sortColumn] || 0) - (a[sortColumn] || 0);
      }
      // 2차: 분석된 리뷰 수 (내림차순)
      if (b.analyzed_reviews !== a.analyzed_reviews) {
        return b.analyzed_reviews - a.analyzed_reviews;
      }
      // 3차: 전체 리뷰 수 (내림차순)
      return b.total_reviews - a.total_reviews;
    });

    // TOP N개만 선택
    const topStats = sortedStats.slice(0, limit);

    // 레스토랑 정보 일괄 조회 (N+1 문제 해결)
    const restaurantIds = topStats.map(stat => stat.restaurant_id);
    const restaurants = await restaurantRepository.findByIds(restaurantIds);

    // ID 기반 Map 생성 (빠른 조회)
    const restaurantMap = new Map(
      restaurants.map(r => [r.id, r])
    );

    // 레스토랑 정보 결합
    const rankings: RestaurantRanking[] = [];

    for (let i = 0; i < topStats.length; i++) {
      const stat = topStats[i];
      const restaurant = restaurantMap.get(stat.restaurant_id);

      if (restaurant) {
        rankings.push({
          rank: i + 1,
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            category: restaurant.category,
            address: restaurant.address,
          },
          statistics: {
            totalReviews: stat.total_reviews,
            analyzedReviews: stat.analyzed_reviews,
            positive: stat.positive,
            negative: stat.negative,
            neutral: stat.neutral,
            positiveRate: stat.positive_rate || 0,
            negativeRate: stat.negative_rate || 0,
            neutralRate: stat.neutral_rate || 0,
          },
        });
      }
    }

    const response: RestaurantRankingsResponse = {
      type,
      limit,
      minReviews,
      category,
      rankings,
    };

    // 캐시 저장
    rankingCacheService.set(cacheKey, response);

    // 성능 측정 종료
    const duration = Date.now() - startTime;
    console.log(`[RankingService] Ranking calculation completed in ${duration}ms`);

    if (duration > 1000) {
      console.warn(`⚠️ Slow ranking query: ${duration}ms`);
    }

    return response;
  }

  /**
   * 캐시 무효화 (리뷰 요약 완료 시 호출)
   */
  invalidateCache(): void {
    rankingCacheService.invalidate('ranking:');
    console.log('[RankingService] Cache invalidated');
  }
}

export const restaurantRankingService = new RestaurantRankingService();
export default restaurantRankingService;
