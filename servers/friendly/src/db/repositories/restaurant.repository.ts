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
          updated_at = CURRENT_TIMESTAMP
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
   * 메뉴 저장 (기존 메뉴 삭제 후 재저장)
   */
  async saveMenus(restaurantId: number, menus: MenuInput[]): Promise<void> {
    // 기존 메뉴 삭제
    await this.deleteMenusByRestaurantId(restaurantId);

    // 새 메뉴 삽입
    for (const menu of menus) {
      await db.run(
        `INSERT INTO menus (restaurant_id, name, description, price, image)
         VALUES (?, ?, ?, ?, ?)`,
        [restaurantId, menu.name, menu.description || null, menu.price, menu.image || null]
      );
    }
  }

  /**
   * 음식점 목록 조회 (페이지네이션)
   */
  async findAll(limit: number = 20, offset: number = 0): Promise<RestaurantDB[]> {
    return await db.all<RestaurantDB>(
      'SELECT * FROM restaurants ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
  }

  /**
   * 음식점 총 개수
   */
  async count(): Promise<number> {
    const result = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM restaurants'
    );
    return result?.count || 0;
  }
}

export const restaurantRepository = new RestaurantRepository();
export default restaurantRepository;
