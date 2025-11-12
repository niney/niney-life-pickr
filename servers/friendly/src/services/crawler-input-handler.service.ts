import restaurantRepository from '../db/repositories/restaurant.repository';
import restaurantService from './restaurant.service';

export interface NormalizedCrawlInput {
  restaurantId: number;
  placeId: string | null;
  standardUrl: string | null;
  isNewCrawl: boolean;
}

export interface CrawlInputOptions {
  url?: string;
  restaurantId?: number;
}

class CrawlerInputHandler {
  /**
   * URL 또는 restaurantId를 표준화된 크롤링 입력으로 변환
   * @throws Error - 입력 검증 실패 시
   */
  async normalizeInput(input: CrawlInputOptions): Promise<NormalizedCrawlInput> {
    const { url, restaurantId } = input;

    // 신규 크롤링: URL 제공
    if (url) {
      return await this.normalizeFromUrl(url);
    }

    // 재크롤링: restaurantId 제공
    if (restaurantId) {
      return await this.normalizeFromRestaurantId(restaurantId);
    }

    throw new Error('Either url or restaurantId is required');
  }

  /**
   * URL로부터 레스토랑 정보 크롤링 및 DB 저장
   */
  private async normalizeFromUrl(url: string): Promise<NormalizedCrawlInput> {
    // Place ID만 입력된 경우 모바일 URL로 변환
    if (/^\d+$/.test(url.trim())) {
      url = this.convertPlaceIdToUrl(url.trim());
      console.log('Place ID를 모바일 URL로 변환:', url);
    }

    // URL 검증
    if (!this.validateNaverMapUrl(url)) {
      throw new Error('Invalid Naver Map URL or Place ID');
    }

    console.log('[CrawlerInputHandler] 신규 크롤링 URL:', url);

    // 레스토랑 정보 크롤링
    const crawlResult = await restaurantService.crawlRestaurantInfo(url);

    if (!crawlResult.success || !crawlResult.data) {
      throw new Error(crawlResult.error || 'Crawling failed');
    }

    const restaurantData = crawlResult.data;

    // DB에 저장
    const restaurantInput = {
      place_id: restaurantData.placeId || '',
      name: restaurantData.name,
      place_name: restaurantData.placeName,
      category: restaurantData.category,
      phone: restaurantData.phone,
      address: restaurantData.address,
      description: restaurantData.description,
      business_hours: restaurantData.businessHours,
      lat: restaurantData.coordinates?.lat || null,
      lng: restaurantData.coordinates?.lng || null,
      url: restaurantData.url,
      crawled_at: restaurantData.crawledAt
    };

    const restaurantId = await restaurantRepository.upsertRestaurant(restaurantInput);

    console.log(`[CrawlerInputHandler] 신규 레스토랑 ${restaurantId} 정보 저장 완료`);

    return {
      restaurantId,
      placeId: restaurantData.placeId,
      standardUrl: restaurantData.url,
      isNewCrawl: true
    };
  }

  /**
   * restaurantId로부터 DB 조회 및 URL 복원
   */
  private async normalizeFromRestaurantId(restaurantId: number): Promise<NormalizedCrawlInput> {
    const restaurant = await restaurantRepository.findById(restaurantId);

    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    const placeId = restaurant.place_id;
    const standardUrl = restaurant.place_id
      ? `https://m.place.naver.com/restaurant/${restaurant.place_id}/home`
      : restaurant.url;

    console.log(`[CrawlerInputHandler] 레스토랑 ${restaurantId} 재크롤링`);

    return {
      restaurantId,
      placeId,
      standardUrl,
      isNewCrawl: false
    };
  }

  /**
   * Place ID를 모바일 URL로 변환
   */
  convertPlaceIdToUrl(placeId: string): string {
    return `https://m.place.naver.com/restaurant/${placeId}/home`;
  }

  /**
   * 네이버맵 URL 도메인 검증
   */
  validateNaverMapUrl(url: string): boolean {
    const validDomains = ['map.naver.com', 'm.place.naver.com', 'place.naver.com', 'naver.me'];
    return validDomains.some(domain => url.includes(domain));
  }
}

export default new CrawlerInputHandler();
