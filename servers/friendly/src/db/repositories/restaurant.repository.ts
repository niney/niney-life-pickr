import db from '../database';
import { RestaurantDB, MenuDB, RestaurantInput, MenuInput } from '../../types/db.types';

/**
 * Restaurant Repository
 * 음식점 및 메뉴 데이터 관리
 */
export class RestaurantRepository {
  /**
   * Place ID로 음식점 조회
   */
  async findByPlaceId(placeId: string): Promise<RestaurantDB | undefined> {
    return await db.get<RestaurantDB>(
      'SELECT * FROM restaurants WHERE place_id = ?',
      [placeId]
    );
  }

  /**
   * 음식점 ID로 조회
   */
  async findById(id: number): Promise<RestaurantDB | undefined> {
    return await db.get<RestaurantDB>(
      'SELECT * FROM restaurants WHERE id = ?',
      [id]
    );
  }

  /**
   * 음식점 정보 UPSERT (place_id 기준)
   * 이미 존재하면 업데이트, 없으면 삽입
   */
  async upsertRestaurant(input: RestaurantInput): Promise<number> {
    const existing = await this.findByPlaceId(input.place_id);

    if (existing) {
      // 업데이트
      await db.run(
        `UPDATE restaurants SET
          name = ?,
          place_name = ?,
          category = ?,
          phone = ?,
          address = ?,
          description = ?,
          business_hours = ?,
          lat = ?,
          lng = ?,
          url = ?,
          crawled_at = ?,
          updated_at = datetime('now', 'localtime')
        WHERE place_id = ?`,
        [
          input.name,
          input.place_name,
          input.category,
          input.phone,
          input.address,
          input.description,
          input.business_hours,
          input.lat,
          input.lng,
          input.url,
          input.crawled_at,
          input.place_id
        ]
      );
      return existing.id;
    } else {
      // 삽입
      await db.run(
        `INSERT INTO restaurants (
          place_id, name, place_name, category, phone, address,
          description, business_hours, lat, lng, url, crawled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.place_id,
          input.name,
          input.place_name,
          input.category,
          input.phone,
          input.address,
          input.description,
          input.business_hours,
          input.lat,
          input.lng,
          input.url,
          input.crawled_at
        ]
      );

      // 방금 삽입한 ID 조회
      const inserted = await this.findByPlaceId(input.place_id);
      if (!inserted) {
        throw new Error('Failed to insert restaurant');
      }
      return inserted.id;
    }
  }

  /**
   * 음식점의 메뉴 조회
   */
  async findMenusByRestaurantId(restaurantId: number): Promise<MenuDB[]> {
    return await db.all<MenuDB>(
      'SELECT * FROM menus WHERE restaurant_id = ? ORDER BY id',
      [restaurantId]
    );
  }

  /**
   * 음식점의 기존 메뉴 삭제
   */
  async deleteMenusByRestaurantId(restaurantId: number): Promise<void> {
    await db.run('DELETE FROM menus WHERE restaurant_id = ?', [restaurantId]);
  }

  /**
   * 메뉴 이미지 파일 삭제 (place_id 기반)
   *
   * 주의: 현재 사용하지 않음
   * 이유: 크롤링 시점에 이미지가 다운로드되므로,
   * DB 저장 시점에 삭제하면 방금 다운로드한 이미지가 삭제됨
   *
   * 필요 시: 수동으로 메뉴를 완전 삭제할 때만 사용
   */
  /*
  private async deleteMenuImagesByPlaceId(placeId: string): Promise<void> {
    const menuDir = path.join(process.cwd(), 'data', 'images', 'menus', placeId);

    try {
      await fs.rm(menuDir, { recursive: true, force: true });
      console.log(`✅ 메뉴 이미지 디렉토리 삭제: ${menuDir}`);
    } catch (error) {
      // 디렉토리가 없는 경우 무시
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`메뉴 이미지 삭제 실패 (${placeId}):`, error);
      }
    }
  }
  */

  /**
   * 메뉴 저장 (기존 메뉴 삭제 후 재저장)
   *
   * 주의: 이미지 파일은 크롤링 단계에서 이미 새로 다운로드되어 있으므로
   * 여기서 삭제하면 안 됩니다!
   */
  async saveMenus(restaurantId: number, menus: MenuInput[]): Promise<void> {
    // 기존 메뉴 삭제 (DB만)
    // 이미지 파일은 크롤링 시점에 이미 새 파일로 교체되어 있음
    await this.deleteMenusByRestaurantId(restaurantId);

    // 새 메뉴 삽입
    for (const menu of menus) {
      await db.run(
        `INSERT INTO menus (restaurant_id, name, description, price, image, normalized_name)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          restaurantId,
          menu.name,
          menu.description || null,
          menu.price,
          menu.image || null,
          menu.normalized_name || null
        ]
      );
    }
  }

  /**
   * 메뉴의 normalized_name 업데이트
   * @param menuId - 메뉴 ID
   * @param normalizedName - AI가 정규화한 메뉴 이름
   */
  async updateMenuNormalizedName(menuId: number, normalizedName: string): Promise<void> {
    await db.run(
      'UPDATE menus SET normalized_name = ? WHERE id = ?',
      [normalizedName, menuId]
    );
  }

  /**
   * 여러 메뉴의 normalized_name 일괄 업데이트
   * @param updates - { menuId, normalizedName } 배열
   */
  async updateMenusNormalizedNames(updates: Array<{ menuId: number; normalizedName: string }>): Promise<void> {
    for (const { menuId, normalizedName } of updates) {
      await this.updateMenuNormalizedName(menuId, normalizedName);
    }
  }

  /**
   * 음식점 목록 조회 (페이지네이션 + 카테고리 필터 + 이름 검색 + 주소 검색)
   */
  async findAll(limit: number = 20, offset: number = 0, category?: string, searchName?: string, searchAddress?: string): Promise<RestaurantDB[]> {
    let query = 'SELECT * FROM restaurants';
    const params: any[] = [];
    const conditions: string[] = [];

    // 카테고리 필터링
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    // 이름 검색 필터링
    if (searchName && searchName.trim()) {
      conditions.push('name LIKE ?');
      params.push(`%${searchName.trim()}%`);
    }

    // 주소 검색 필터링
    if (searchAddress && searchAddress.trim()) {
      conditions.push('address LIKE ?');
      params.push(`%${searchAddress.trim()}%`);
    }

    // WHERE 절 적용
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await db.all<RestaurantDB>(query, params);
  }

  /**
   * 음식점 총 개수 (카테고리 필터 + 이름 검색 + 주소 검색 지원)
   */
  async count(category?: string, searchName?: string, searchAddress?: string): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM restaurants';
    const params: any[] = [];
    const conditions: string[] = [];

    // 카테고리 필터링
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    // 이름 검색 필터링
    if (searchName && searchName.trim()) {
      conditions.push('name LIKE ?');
      params.push(`%${searchName.trim()}%`);
    }

    // 주소 검색 필터링
    if (searchAddress && searchAddress.trim()) {
      conditions.push('address LIKE ?');
      params.push(`%${searchAddress.trim()}%`);
    }

    // WHERE 절 적용
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await db.get<{ count: number }>(query, params);
    return result?.count || 0;
  }

  /**
   * 카테고리별 음식점 개수 조회 (GROUP BY category)
   */
  async countByCategory(): Promise<Array<{ category: string; count: number }>> {
    return await db.all<{ category: string; count: number }>(
      `SELECT
        COALESCE(category, 'Unknown') as category,
        COUNT(*) as count
       FROM restaurants
       GROUP BY category
       ORDER BY count DESC, category`
    );
  }

  /**
   * 음식점 삭제 (하드 삭제)
   * CASCADE로 관련 데이터(메뉴, 리뷰, Job, 리뷰 요약)도 자동 삭제됩니다.
   *
   * @param id - 삭제할 음식점 ID
   * @returns 삭제된 음식점 정보 및 관련 통계
   */
  async deleteById(id: number): Promise<{
    placeId: string;
    deletedMenus: number;
    deletedReviews: number;
    deletedJobs: number;
  } | null> {
    // 1. 음식점 존재 여부 확인 (placeId 조회용)
    const restaurant = await this.findById(id);
    if (!restaurant) {
      return null;
    }

    // 2. CASCADE 삭제될 레코드 수 조회
    const menuCount = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM menus WHERE restaurant_id = ?',
      [id]
    );

    const reviewCount = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM reviews WHERE restaurant_id = ?',
      [id]
    );

    const jobCount = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM jobs WHERE restaurant_id = ?',
      [id]
    );

    // 3. 음식점 삭제 (CASCADE로 관련 데이터도 자동 삭제)
    await db.run('DELETE FROM restaurants WHERE id = ?', [id]);

    // 4. 삭제 통계 반환
    return {
      placeId: restaurant.place_id,
      deletedMenus: menuCount?.count || 0,
      deletedReviews: reviewCount?.count || 0,
      deletedJobs: jobCount?.count || 0
    };
  }
}

export const restaurantRepository = new RestaurantRepository();
export default restaurantRepository;
