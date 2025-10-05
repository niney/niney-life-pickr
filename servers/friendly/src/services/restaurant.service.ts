import naverCrawlerService from './naver-crawler.service';
import restaurantRepository from '../db/repositories/restaurant.repository';
import { RestaurantInput, MenuInput } from '../types/db.types';
import { RestaurantInfo, MenuItem } from '../types/crawler.types';

/**
 * Restaurant Service
 * 크롤링 + DB 저장을 통합 처리하는 서비스
 */
export class RestaurantService {
  /**
   * 크롤링 결과를 DB 입력 형식으로 변환
   */
  private convertToRestaurantInput(restaurantInfo: RestaurantInfo): RestaurantInput {
    return {
      place_id: restaurantInfo.placeId || '',
      name: restaurantInfo.name,
      place_name: restaurantInfo.placeName,
      category: restaurantInfo.category,
      phone: restaurantInfo.phone,
      address: restaurantInfo.address,
      description: restaurantInfo.description,
      business_hours: restaurantInfo.businessHours,
      lat: restaurantInfo.coordinates?.lat || null,
      lng: restaurantInfo.coordinates?.lng || null,
      url: restaurantInfo.url,
      crawled_at: restaurantInfo.crawledAt
    };
  }

  /**
   * 메뉴 아이템을 DB 입력 형식으로 변환
   */
  private convertToMenuInputs(restaurantId: number, menuItems?: MenuItem[]): MenuInput[] {
    if (!menuItems || menuItems.length === 0) {
      return [];
    }

    return menuItems.map(item => ({
      restaurant_id: restaurantId,
      name: item.name,
      description: item.description || null,
      price: item.price,
      image: item.image || null
    }));
  }

  /**
   * 음식점 크롤링 및 DB 저장
   * @param url 네이버맵 URL
   * @param options 크롤링 옵션 (crawlMenus 등)
   * @returns 크롤링 결과 및 DB 저장 여부
   */
  async crawlAndSaveRestaurant(
    url: string,
    options: { crawlMenus?: boolean } = {}
  ): Promise<{
    restaurantInfo: RestaurantInfo;
    savedToDb: boolean;
    restaurantId?: number;
    error?: string;
  }> {
    try {
      // 1. 크롤링 실행
      console.log('[RestaurantService] 크롤링 시작:', url);
      const restaurantInfo = await naverCrawlerService.crawlRestaurant(url, options);

      // placeId가 없으면 DB 저장 불가
      if (!restaurantInfo.placeId) {
        console.warn('[RestaurantService] placeId가 없어 DB 저장 생략:', url);
        return {
          restaurantInfo,
          savedToDb: false,
          error: 'Missing placeId - cannot save to database'
        };
      }

      // 2. DB 저장
      try {
        console.log('[RestaurantService] DB 저장 시작:', restaurantInfo.placeId);

        // 2-1. 음식점 정보 UPSERT
        const restaurantInput = this.convertToRestaurantInput(restaurantInfo);
        const restaurantId = await restaurantRepository.upsertRestaurant(restaurantInput);

        // 2-2. 메뉴 저장 (있는 경우)
        if (restaurantInfo.menuItems && restaurantInfo.menuItems.length > 0) {
          const menuInputs = this.convertToMenuInputs(restaurantId, restaurantInfo.menuItems);
          await restaurantRepository.saveMenus(restaurantId, menuInputs);
          console.log(`[RestaurantService] 메뉴 ${menuInputs.length}개 저장 완료`);
        }

        console.log('[RestaurantService] DB 저장 완료:', restaurantId);

        return {
          restaurantInfo,
          savedToDb: true,
          restaurantId
        };
      } catch (dbError) {
        // DB 저장 실패해도 크롤링 결과는 반환
        console.error('[RestaurantService] DB 저장 실패:', dbError);
        return {
          restaurantInfo,
          savedToDb: false,
          error: dbError instanceof Error ? dbError.message : 'Database save failed'
        };
      }
    } catch (crawlError) {
      // 크롤링 자체가 실패하면 에러 throw
      console.error('[RestaurantService] 크롤링 실패:', crawlError);
      throw crawlError;
    }
  }

  /**
   * 여러 URL 일괄 크롤링 및 DB 저장
   * @param urls 네이버맵 URL 목록
   * @returns 일괄 크롤링 결과
   */
  async crawlAndSaveMultiple(
    urls: string[]
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    savedToDb: number;
    results: Array<{
      success: boolean;
      data?: RestaurantInfo;
      savedToDb?: boolean;
      restaurantId?: number;
      url?: string;
      error?: string;
    }>;
  }> {
    console.log(`[RestaurantService] ${urls.length}개 URL 일괄 크롤링 시작`);

    const results: Array<{
      success: boolean;
      data?: RestaurantInfo;
      savedToDb?: boolean;
      restaurantId?: number;
      url?: string;
      error?: string;
    }> = [];

    let savedCount = 0;

    // 순차적으로 크롤링 (병렬 처리하면 서버 부하 증가)
    for (const url of urls) {
      try {
        const result = await this.crawlAndSaveRestaurant(url);
        results.push({
          success: true,
          data: result.restaurantInfo,
          savedToDb: result.savedToDb,
          restaurantId: result.restaurantId
        });

        if (result.savedToDb) {
          savedCount++;
        }
      } catch (error) {
        results.push({
          success: false,
          url,
          error: error instanceof Error ? error.message : 'Crawling failed'
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`[RestaurantService] 일괄 크롤링 완료 - 성공: ${successful}, 실패: ${failed}, DB 저장: ${savedCount}`);

    return {
      total: results.length,
      successful,
      failed,
      savedToDb: savedCount,
      results
    };
  }

  /**
   * Place ID로 음식점 조회 (메뉴 포함)
   */
  async getRestaurantByPlaceId(placeId: string) {
    const restaurant = await restaurantRepository.findByPlaceId(placeId);
    if (!restaurant) {
      return null;
    }

    const menus = await restaurantRepository.findMenusByRestaurantId(restaurant.id);

    return {
      restaurant,
      menus
    };
  }

  /**
   * 음식점 목록 조회
   */
  async getRestaurants(limit: number = 20, offset: number = 0) {
    const restaurants = await restaurantRepository.findAll(limit, offset);
    const total = await restaurantRepository.count();

    return {
      restaurants,
      total,
      limit,
      offset
    };
  }
}

export const restaurantService = new RestaurantService();
export default restaurantService;
