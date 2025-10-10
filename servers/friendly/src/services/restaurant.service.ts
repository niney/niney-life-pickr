import naverCrawlerService from './naver-crawler.service';
import restaurantRepository from '../db/repositories/restaurant.repository';
import { RestaurantInput, MenuInput } from '../types/db.types';
import { RestaurantInfo, MenuItem } from '../types/crawler.types';
import jobManager from './job-manager.service';
import crawlJobRepository from '../db/repositories/crawl-job.repository';
import reviewCrawlerProcessor from './review-crawler-processor.service';
import { normalizeMenuItems } from './menu-normalization.service';

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
      image: item.image || null,
      normalized_name: item.normalizedName || null  // ← AI 정규화 결과 포함
    }));
  }

  /**
   * 음식점 크롤링 및 DB 저장
   * @param url 네이버맵 URL
   * @param options 크롤링 옵션 (crawlMenus, crawlReviews, createSummary 등)
   * @returns 크롤링 결과 및 DB 저장 여부
   */
  async crawlAndSaveRestaurant(
    url: string,
    options: { crawlMenus?: boolean; crawlReviews?: boolean; createSummary?: boolean } = {}
  ): Promise<{
    restaurantInfo: RestaurantInfo;
    savedToDb: boolean;
    restaurantId?: number;
    reviewJobId?: string;
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
          // AI로 메뉴 정규화 (normalized_name 추가)
          console.log(`[RestaurantService] AI로 ${restaurantInfo.menuItems.length}개 메뉴 정규화 중...`);
          const normalizedMenuItems = await normalizeMenuItems(restaurantInfo.menuItems, true); // true = Cloud 우선 (실패 시 Local)
          
          const menuInputs = this.convertToMenuInputs(restaurantId, normalizedMenuItems);
          await restaurantRepository.saveMenus(restaurantId, menuInputs);
          console.log(`[RestaurantService] 메뉴 ${menuInputs.length}개 저장 완료 (정규화 포함)`);
        }

        console.log('[RestaurantService] DB 저장 완료:', restaurantId);

        // 3. 리뷰 크롤링 시작 (옵션이 true인 경우)
        let reviewJobId: string | undefined = undefined;
        if (options.crawlReviews && restaurantInfo.placeId) {
          try {
            const { v4: uuidv4 } = await import('uuid');
            reviewJobId = uuidv4();

            // 리뷰 URL 생성
            const reviewUrl = `https://m.place.naver.com/restaurant/${restaurantInfo.placeId}/review/visitor?reviewSort=recent`;

            console.log('[RestaurantService] 리뷰 크롤링 Job 생성:', reviewJobId);

            // Job 생성
            jobManager.createJob(reviewJobId, {
              restaurantId,
              placeId: restaurantInfo.placeId,
              url: reviewUrl
            });

            // DB에 Job 기록
            await crawlJobRepository.create({
              job_id: reviewJobId,
              restaurant_id: restaurantId,
              place_id: restaurantInfo.placeId,
              url: reviewUrl,
              status: 'pending'
            });

            // 백그라운드로 리뷰 크롤링 시작
            reviewCrawlerProcessor.process(reviewJobId, restaurantInfo.placeId, reviewUrl, restaurantId)
              .catch(err => console.error('[RestaurantService] 리뷰 크롤링 에러:', err));

            console.log('[RestaurantService] 리뷰 크롤링 Job 시작됨:', reviewJobId);
          } catch (reviewError) {
            console.error('[RestaurantService] 리뷰 크롤링 Job 생성 실패:', reviewError);
            // 리뷰 크롤링 실패해도 레스토랑 크롤링은 성공으로 처리
          }
        }

        // 4. 리뷰 요약 생성 (옵션이 true인 경우)
        if (options.createSummary && restaurantId) {
          try {
            console.log(`[RestaurantService] 레스토랑 ${restaurantId} 리뷰 요약 생성 시작`);
            const reviewSummaryProcessor = await import('./review-summary-processor.service');
            reviewSummaryProcessor.default.processIncompleteReviews(
              restaurantId, 
              true // useCloud
            ).catch(err => {
              console.error(`[RestaurantService] 레스토랑 ${restaurantId} 요약 생성 오류:`, err);
            });
          } catch (summaryError) {
            console.error('[RestaurantService] 리뷰 요약 생성 실패:', summaryError);
            // 요약 생성 실패해도 레스토랑 크롤링은 성공으로 처리
          }
        }

        return {
          restaurantInfo,
          savedToDb: true,
          restaurantId,
          reviewJobId
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
   * Place ID로 음식점 조회 (간단 버전)
   */
  async findByPlaceId(placeId: string) {
    return await restaurantRepository.findByPlaceId(placeId);
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
