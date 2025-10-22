import reviewSummaryRepository from '../db/repositories/review-summary.repository';
import reviewRepository from '../db/repositories/review.repository';
import type {
  MenuSentimentStats,
  RestaurantMenuStatistics,
  MenuItemSentiment,
  MenuItemWithSentiment
} from '../types/db.types';

/**
 * 메뉴 통계 서비스
 */
class MenuStatisticsService {
  /**
   * 레스토랑별 메뉴 감정 통계 계산
   */
  async calculateMenuStatistics(restaurantId: number): Promise<RestaurantMenuStatistics> {
    // 1. 모든 메뉴 아이템 조회
    const menuItemsData = await reviewSummaryRepository.findMenuItemsByRestaurant(restaurantId);
    const menuItems = menuItemsData.map(item => item.menuItem as MenuItemWithSentiment);
    
    // 2. 메뉴명별로 그룹핑
    const menuMap = new Map<string, MenuItemWithSentiment[]>();
    for (const item of menuItems) {
      const normalized = this.normalizeMenuName(item.name);
      if (!menuMap.has(normalized)) {
        menuMap.set(normalized, []);
      }
      menuMap.get(normalized)!.push(item);
    }
    
    // 3. 통계 계산
    const menuStatistics: MenuSentimentStats[] = [];
    for (const [menuName, items] of menuMap) {
      const stats = this.calculateSingleMenuStats(menuName, items);
      menuStatistics.push(stats);
    }
    
    // 4. 정렬 (언급 횟수 기준)
    menuStatistics.sort((a, b) => b.totalMentions - a.totalMentions);
    
    // 5. Top 메뉴 추출
    const topPositive = this.getTopPositiveMenus(menuStatistics, 5);
    const topNegative = this.getTopNegativeMenus(menuStatistics, 5);
    
    // 6. 전체 리뷰 수 조회
    const totalReviews = await reviewRepository.countByRestaurantId(restaurantId);
    
    return {
      restaurantId,
      totalReviews,
      analyzedReviews: menuItemsData.length,
      menuStatistics,
      topPositiveMenus: topPositive,
      topNegativeMenus: topNegative
    };
  }
  
  /**
   * 단일 메뉴 통계 계산
   */
  private calculateSingleMenuStats(
    menuName: string, 
    items: MenuItemWithSentiment[]
  ): MenuSentimentStats {
    const positive = items.filter(i => i.sentiment === 'positive').length;
    const negative = items.filter(i => i.sentiment === 'negative').length;
    const neutral = items.filter(i => i.sentiment === 'neutral').length;
    const total = items.length;
    
    const positiveRate = total > 0 ? (positive / total) * 100 : 0;
    
    // 전체 감정 판단
    let sentiment: MenuItemSentiment = 'neutral';
    if (positiveRate >= 70) sentiment = 'positive';
    else if (positiveRate <= 30) sentiment = 'negative';
    
    // Top 이유 추출 (최대 3개)
    const topReasons = {
      positive: this.getTopReasons(items, 'positive', 3),
      negative: this.getTopReasons(items, 'negative', 3),
      neutral: this.getTopReasons(items, 'neutral', 3)
    };
    
    return {
      menuName,
      totalMentions: total,
      positive,
      negative,
      neutral,
      positiveRate: Math.round(positiveRate * 10) / 10,
      sentiment,
      topReasons
    };
  }
  
  /**
   * 메뉴명 정규화 (유사한 이름 통합)
   */
  private normalizeMenuName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')  // 공백 제거
      .replace(/[()]/g, ''); // 괄호 제거
  }
  
  /**
   * 가장 많이 언급된 이유 추출
   */
  private getTopReasons(
    items: MenuItemWithSentiment[], 
    sentiment: MenuItemSentiment, 
    limit: number
  ): string[] {
    const reasons = items
      .filter(i => i.sentiment === sentiment && i.reason)
      .map(i => i.reason!)
      .reduce((acc, reason) => {
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    return Object.entries(reasons)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([reason]) => reason);
  }
  
  /**
   * Top 긍정 메뉴
   */
  private getTopPositiveMenus(
    stats: MenuSentimentStats[],
    limit: number
  ): Array<{ menuName: string; positiveRate: number; mentions: number; positive: number; negative: number; neutral: number }> {
    return stats
      .filter(s => s.totalMentions >= 3)  // 최소 3회 이상 언급
      .sort((a, b) => b.positiveRate - a.positiveRate)
      .slice(0, limit)
      .map(s => ({
        menuName: s.menuName,
        positiveRate: s.positiveRate,
        mentions: s.totalMentions,
        positive: s.positive,
        negative: s.negative,
        neutral: s.neutral
      }));
  }
  
  /**
   * Top 부정 메뉴
   */
  private getTopNegativeMenus(
    stats: MenuSentimentStats[],
    limit: number
  ): Array<{ menuName: string; negativeRate: number; mentions: number; positive: number; negative: number; neutral: number }> {
    return stats
      .filter(s => s.totalMentions >= 3)
      .sort((a, b) => {
        const aNegRate = (a.negative / a.totalMentions) * 100;
        const bNegRate = (b.negative / b.totalMentions) * 100;
        return bNegRate - aNegRate;
      })
      .slice(0, limit)
      .map(s => ({
        menuName: s.menuName,
        negativeRate: Math.round((s.negative / s.totalMentions) * 1000) / 10,
        mentions: s.totalMentions,
        positive: s.positive,
        negative: s.negative,
        neutral: s.neutral
      }));
  }
}

export default new MenuStatisticsService();
