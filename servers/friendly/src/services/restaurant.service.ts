import naverCrawlerService from './naver-crawler.service';
import restaurantRepository from '../db/repositories/restaurant.repository';
import { RestaurantInput, MenuInput } from '../types/db.types';
import { RestaurantInfo, MenuItem } from '../types/crawler.types';
import { normalizeMenuItems } from './menu-normalization.service';
import { SOCKET_EVENTS } from '../socket/events';
import * as fs from 'fs/promises';
import * as path from 'path';

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
   * 레스토랑 정보만 크롤링 (DB 저장 제외)
   * 신규 크롤링 1단계용
   */
  async crawlRestaurantInfo(url: string): Promise<{
    success: boolean;
    data?: RestaurantInfo;
    error?: string;
  }> {
    try {
      console.log('[RestaurantService] 레스토랑 정보 크롤링 시작:', url);
      
      const restaurantInfo = await naverCrawlerService.crawlRestaurant(url, {
        crawlMenus: true,
        crawlReviews: false
      });

      return {
        success: true,
        data: restaurantInfo
      };
    } catch (error) {
      console.error('[RestaurantService] 크롤링 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Crawling failed'
      };
    }
  }

  /**
   * 레스토랑 + 메뉴 DB 저장
   * 신규 크롤링 2단계용
   * @param restaurantInfo 레스토랑 정보
   * @param jobId Job ID (Socket 통신용, 선택적)
   */
  async saveRestaurantAndMenus(
    restaurantInfo: RestaurantInfo,
    jobId?: string
  ): Promise<{
    restaurantId: number;
    menusCount: number;
  }> {
    if (!restaurantInfo.placeId) {
      throw new Error('Missing placeId - cannot save to database');
    }

    console.log('[RestaurantService] DB 저장 시작:', restaurantInfo.placeId);

    // 1. 음식점 정보 UPSERT
    const restaurantInput = this.convertToRestaurantInput(restaurantInfo);
    const restaurantId = await restaurantRepository.upsertRestaurant(restaurantInput);

    // Socket 통신: AI 정규화 시작
    const menuItems = restaurantInfo.menuItems || [];
    if (jobId && menuItems.length > 0) {
      const jobService = await import('./job-socket.service');
      jobService.default.emitProgressSocketEvent(
        jobId,
        restaurantId,
        SOCKET_EVENTS.RESTAURANT_MENU_PROGRESS,
        {
          current: 2,
          total: 3,
          metadata: {
            step: 'menu',
            substep: 'normalizing',
            menusCount: menuItems.length
          }
        }
      );
    }

    // 2. 메뉴 저장 (AI 정규화 포함)
    let menusCount = 0;
    if (menuItems.length > 0) {
      console.log(`[RestaurantService] AI로 ${menuItems.length}개 메뉴 정규화 중...`);
      const normalizedMenuItems = await normalizeMenuItems(menuItems, true);

      // Socket 통신: DB 저장 시작
      if (jobId) {
        const jobService = await import('./job-socket.service');
        jobService.default.emitProgressSocketEvent(
          jobId,
          restaurantId,
          SOCKET_EVENTS.RESTAURANT_MENU_PROGRESS,
          {
            current: 3,
            total: 3,
            metadata: {
              step: 'menu',
              substep: 'saving',
              menusCount: normalizedMenuItems.length
            }
          }
        );
      }
      
      const menuInputs = this.convertToMenuInputs(restaurantId, normalizedMenuItems);
      await restaurantRepository.saveMenus(restaurantId, menuInputs);
      menusCount = menuInputs.length;
      console.log(`[RestaurantService] 메뉴 ${menusCount}개 저장 완료 (정규화 포함)`);
    }

    console.log('[RestaurantService] DB 저장 완료:', restaurantId);

    return {
      restaurantId,
      menusCount
    };
  }

  /**
   * 메뉴만 재크롤링 (Job Chain용)
   * @param url 네이버맵 URL
   * @param restaurantId 레스토랑 ID (선택적)
   * @param jobId Job ID (Socket 통신용, 선택적)
   * @returns 크롤링 결과
   */
  async crawlAndSaveMenusOnly(
    url: string,
    restaurantId?: number,
    jobId?: string
  ): Promise<{
    savedToDb: boolean;
    restaurantId?: number;
    menusCount: number;
    error?: string;
  }> {
    try {
      console.log('[RestaurantService] 메뉴 크롤링 시작:', url);

      // Socket 통신: 1단계 - 크롤링 시작
      if (jobId && restaurantId) {
        const jobService = await import('./job-socket.service');
        jobService.default.emitProgressSocketEvent(
          jobId,
          restaurantId,
          SOCKET_EVENTS.RESTAURANT_MENU_PROGRESS,
          {
            current: 1,
            total: 4,
            metadata: {
              step: 'menu',
              substep: 'fetching',
              url
            }
          }
        );
      }

      // 1. 레스토랑 정보 + 메뉴 크롤링 (리뷰 제외)
      const restaurantInfo = await naverCrawlerService.crawlRestaurant(url, {
        crawlMenus: true,
        crawlReviews: false
      });

      // placeId가 없으면 DB 저장 불가
      if (!restaurantInfo.placeId) {
        console.warn('[RestaurantService] placeId가 없어 DB 저장 생략:', url);
        return {
          savedToDb: false,
          menusCount: 0,
          error: 'Missing placeId - cannot save to database'
        };
      }

      try {
        console.log('[RestaurantService] 메뉴 DB 저장 시작:', restaurantInfo.placeId);

        // 2-1. 음식점 정보 UPSERT
        const restaurantInput = this.convertToRestaurantInput(restaurantInfo);
        const savedRestaurantId = await restaurantRepository.upsertRestaurant(restaurantInput);

        // Socket 통신: 2단계 - AI 정규화 시작
        const menuItems = restaurantInfo.menuItems || [];
        if (jobId && restaurantId) {
          const jobService = await import('./job-socket.service');
          jobService.default.emitProgressSocketEvent(
            jobId,
            restaurantId,
            SOCKET_EVENTS.RESTAURANT_MENU_PROGRESS,
            {
              current: 2,
              total: 4,
              metadata: {
                step: 'menu',
                substep: 'normalizing',
                menusCount: menuItems.length
              }
            }
          );
        }

        // 2-2. 메뉴 저장 (있는 경우)
        let menusCount = 0;
        if (menuItems.length > 0) {
          // AI로 메뉴 정규화 (normalized_name 추가)
          console.log(`[RestaurantService] AI로 ${menuItems.length}개 메뉴 정규화 중...`);
          const normalizedMenuItems = await normalizeMenuItems(menuItems, true); // true = Cloud 우선 (실패 시 Local)

          // Socket 통신: 3단계 - DB 저장 시작
          if (jobId && restaurantId) {
            const jobService = await import('./job-socket.service');
            jobService.default.emitProgressSocketEvent(
              jobId,
              restaurantId,
              SOCKET_EVENTS.RESTAURANT_MENU_PROGRESS,
              {
                current: 3,
                total: 4,
                metadata: {
                  step: 'menu',
                  substep: 'saving',
                  menusCount: normalizedMenuItems.length
                }
              }
            );
          }

          const menuInputs = this.convertToMenuInputs(savedRestaurantId, normalizedMenuItems);
          await restaurantRepository.saveMenus(savedRestaurantId, menuInputs);
          menusCount = menuInputs.length;
          console.log(`[RestaurantService] 메뉴 ${menusCount}개 저장 완료 (정규화 포함)`);
        }

        console.log('[RestaurantService] 메뉴 DB 저장 완료:', savedRestaurantId);

        // Socket 통신: 4단계 - 완료
        if (jobId && restaurantId) {
          const jobService = await import('./job-socket.service');
          jobService.default.emitProgressSocketEvent(
            jobId,
            restaurantId,
            SOCKET_EVENTS.RESTAURANT_MENU_PROGRESS,
            {
              current: 4,
              total: 4,
              metadata: {
                step: 'menu',
                substep: 'completed',
                menusCount,
                restaurantId: savedRestaurantId
              }
            }
          );
        }

        return {
          savedToDb: true,
          restaurantId: savedRestaurantId,
          menusCount
        };
      } catch (dbError) {
        console.error('[RestaurantService] 메뉴 DB 저장 실패:', dbError);
        return {
          savedToDb: false,
          menusCount: 0,
          error: dbError instanceof Error ? dbError.message : 'Database save failed'
        };
      }
    } catch (crawlError) {
      console.error('[RestaurantService] 메뉴 크롤링 실패:', crawlError);
      throw crawlError;
    }
  }

  /**
   * 음식점 크롤링 및 DB 저장 (신규 크롤링용)
   * @param url 네이버맵 URL
   * @param options 크롤링 옵션 (crawlMenus, crawlReviews, createSummary, resetSummary 등)
   * @returns 크롤링 결과 및 DB 저장 여부
   */
  async crawlAndSaveRestaurant(
    url: string,
    options: { crawlMenus?: boolean; crawlReviews?: boolean; createSummary?: boolean; resetSummary?: boolean } = {}
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

        // ⚠️ 리뷰/요약 자동 시작 로직 제거
        // API 레벨에서 Job으로 관리하도록 변경됨

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

  /**
   * 이미지 파일 삭제 헬퍼
   * @param placeId - Place ID
   * @returns 삭제된 이미지 통계
   */
  private async deleteRestaurantImages(placeId: string): Promise<{
    menuImagesDeleted: number;
    reviewImagesDeleted: number;
  }> {
    const menuDir = path.join(process.cwd(), 'data', 'images', 'menus', placeId);
    const reviewDir = path.join(process.cwd(), 'data', 'images', 'reviews', placeId);

    let menuImagesDeleted = 0;
    let reviewImagesDeleted = 0;

    // 메뉴 이미지 삭제
    try {
      const menuStats = await fs.stat(menuDir);
      if (menuStats.isDirectory()) {
        // 파일 개수 카운트 (재귀적으로)
        const countFiles = async (dir: string): Promise<number> => {
          let count = 0;
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isFile()) {
              count++;
            } else if (entry.isDirectory()) {
              count += await countFiles(path.join(dir, entry.name));
            }
          }
          return count;
        };
        menuImagesDeleted = await countFiles(menuDir);
        await fs.rm(menuDir, { recursive: true, force: true });
        console.log(`✅ 메뉴 이미지 ${menuImagesDeleted}개 삭제: ${menuDir}`);
      }
    } catch (error) {
      // 디렉토리가 없는 경우 무시
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`메뉴 이미지 삭제 실패 (${placeId}):`, error);
      }
    }

    // 리뷰 이미지 삭제
    try {
      const reviewStats = await fs.stat(reviewDir);
      if (reviewStats.isDirectory()) {
        const countFiles = async (dir: string): Promise<number> => {
          let count = 0;
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isFile()) {
              count++;
            } else if (entry.isDirectory()) {
              count += await countFiles(path.join(dir, entry.name));
            }
          }
          return count;
        };
        reviewImagesDeleted = await countFiles(reviewDir);
        await fs.rm(reviewDir, { recursive: true, force: true });
        console.log(`✅ 리뷰 이미지 ${reviewImagesDeleted}개 삭제: ${reviewDir}`);
      }
    } catch (error) {
      // 디렉토리가 없는 경우 무시
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`리뷰 이미지 삭제 실패 (${placeId}):`, error);
      }
    }

    return {
      menuImagesDeleted,
      reviewImagesDeleted
    };
  }

  /**
   * 음식점 삭제 (하드 삭제)
   * DB 레코드 + 이미지 파일 모두 삭제
   *
   * @param id - 삭제할 음식점 ID
   * @returns 삭제 결과 및 통계
   */
  async deleteRestaurant(id: number): Promise<{
    success: boolean;
    placeId: string;
    deletedMenus: number;
    deletedReviews: number;
    deletedJobs: number;
    deletedImages: { menus: number; reviews: number; };
    error?: string;
  } | null> {
    try {
      console.log('[RestaurantService] 음식점 삭제 시작:', id);

      // 1. DB 삭제 (CASCADE로 관련 데이터도 자동 삭제)
      const dbResult = await restaurantRepository.deleteById(id);

      if (!dbResult) {
        console.log('[RestaurantService] 음식점을 찾을 수 없음:', id);
        return null;
      }

      console.log('[RestaurantService] DB 삭제 완료:', {
        placeId: dbResult.placeId,
        deletedMenus: dbResult.deletedMenus,
        deletedReviews: dbResult.deletedReviews,
        deletedJobs: dbResult.deletedJobs
      });

      // 2. 이미지 파일 삭제 (실패해도 계속 진행)
      let deletedImages = { menus: 0, reviews: 0 };
      try {
        const imageResult = await this.deleteRestaurantImages(dbResult.placeId);
        deletedImages = {
          menus: imageResult.menuImagesDeleted,
          reviews: imageResult.reviewImagesDeleted
        };
      } catch (imageError) {
        console.error('[RestaurantService] 이미지 삭제 실패 (무시):', imageError);
        // DB는 이미 삭제되었으므로 에러를 무시하고 계속 진행
      }

      console.log('[RestaurantService] 음식점 삭제 완료:', {
        restaurantId: id,
        placeId: dbResult.placeId,
        deletedImages
      });

      return {
        success: true,
        placeId: dbResult.placeId,
        deletedMenus: dbResult.deletedMenus,
        deletedReviews: dbResult.deletedReviews,
        deletedJobs: dbResult.deletedJobs,
        deletedImages
      };
    } catch (error) {
      console.error('[RestaurantService] 음식점 삭제 실패:', error);
      return {
        success: false,
        placeId: '',
        deletedMenus: 0,
        deletedReviews: 0,
        deletedJobs: 0,
        deletedImages: { menus: 0, reviews: 0 },
        error: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }
}

export const restaurantService = new RestaurantService();
export default restaurantService;
