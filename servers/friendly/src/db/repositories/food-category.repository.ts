import db from '../database';
import type { FoodCategoryDB, FoodCategoryInput } from '../../types/db.types';

/**
 * Food Category Repository
 * 음식 카테고리 분류 데이터 관리
 */
export class FoodCategoryRepository {
  /**
   * ID로 조회
   */
  async findById(id: number): Promise<FoodCategoryDB | undefined> {
    return await db.get<FoodCategoryDB>(
      'SELECT * FROM food_categories WHERE id = ?',
      [id]
    );
  }

  /**
   * 레스토랑 ID + 메뉴명으로 조회
   */
  async findByRestaurantAndName(
    restaurantId: number,
    name: string
  ): Promise<FoodCategoryDB | undefined> {
    return await db.get<FoodCategoryDB>(
      'SELECT * FROM food_categories WHERE restaurant_id = ? AND name = ?',
      [restaurantId, name]
    );
  }

  /**
   * 레스토랑의 모든 카테고리 조회
   */
  async findByRestaurantId(restaurantId: number): Promise<FoodCategoryDB[]> {
    return await db.all<FoodCategoryDB>(
      'SELECT * FROM food_categories WHERE restaurant_id = ? ORDER BY name',
      [restaurantId]
    );
  }

  /**
   * 카테고리 경로로 조회 (특정 카테고리에 속한 메뉴들)
   */
  async findByCategoryPath(categoryPath: string): Promise<FoodCategoryDB[]> {
    return await db.all<FoodCategoryDB>(
      'SELECT * FROM food_categories WHERE category_path = ? ORDER BY name',
      [categoryPath]
    );
  }

  /**
   * 카테고리 경로 prefix로 조회 (하위 카테고리 포함)
   */
  async findByCategoryPathPrefix(prefix: string): Promise<FoodCategoryDB[]> {
    return await db.all<FoodCategoryDB>(
      'SELECT * FROM food_categories WHERE category_path LIKE ? ORDER BY category_path, name',
      [`${prefix}%`]
    );
  }

  /**
   * 단일 삽입 (중복 허용)
   */
  async insert(input: FoodCategoryInput): Promise<void> {
    await db.run(
      `INSERT INTO food_categories (restaurant_id, name, category_path)
       VALUES (?, ?, ?)`,
      [input.restaurant_id, input.name, input.category_path]
    );
  }

  /**
   * 일괄 삽입 (중복 무시)
   * @returns 삽입된 개수
   */
  async bulkInsertIgnoreDuplicates(inputs: FoodCategoryInput[]): Promise<number> {
    if (inputs.length === 0) return 0;

    let insertedCount = 0;

    for (const input of inputs) {
      try {
        await db.run(
          `INSERT OR IGNORE INTO food_categories (restaurant_id, name, category_path)
           VALUES (?, ?, ?)`,
          [input.restaurant_id, input.name, input.category_path]
        );
        // changes가 1이면 삽입됨, 0이면 중복으로 스킵됨
        // INSERT OR IGNORE는 성공하면 changes=1, 무시되면 changes=0
        insertedCount++;
      } catch {
        // 에러 발생 시 해당 항목 스킵
      }
    }

    return insertedCount;
  }

  /**
   * 일괄 삽입 (트랜잭션, 중복 허용)
   * @returns { inserted: number }
   */
  async bulkInsert(inputs: FoodCategoryInput[]): Promise<{ inserted: number }> {
    if (inputs.length === 0) {
      return { inserted: 0 };
    }

    let inserted = 0;

    // 트랜잭션 시작
    await db.run('BEGIN TRANSACTION');

    try {
      for (const input of inputs) {
        await db.run(
          `INSERT INTO food_categories (restaurant_id, name, category_path)
           VALUES (?, ?, ?)`,
          [input.restaurant_id, input.name, input.category_path]
        );
        inserted++;
      }

      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }

    return { inserted };
  }

  /**
   * 삭제 (ID)
   */
  async deleteById(id: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    await db.run(
      'DELETE FROM food_categories WHERE id = ?',
      [id]
    );
    return true;
  }

  /**
   * 레스토랑의 모든 카테고리 삭제
   */
  async deleteByRestaurantId(restaurantId: number): Promise<number> {
    const existing = await this.findByRestaurantId(restaurantId);
    const count = existing.length;

    if (count > 0) {
      await db.run(
        'DELETE FROM food_categories WHERE restaurant_id = ?',
        [restaurantId]
      );
    }

    return count;
  }

  /**
   * 고유 카테고리 경로 목록 조회
   */
  async getUniqueCategoryPaths(): Promise<string[]> {
    const rows = await db.all<{ category_path: string }>(
      'SELECT DISTINCT category_path FROM food_categories ORDER BY category_path'
    );
    return rows.map((r) => r.category_path);
  }

  /**
   * 카테고리별 메뉴 개수 통계
   */
  async getCategoryStats(): Promise<Array<{ category_path: string; count: number }>> {
    return await db.all<{ category_path: string; count: number }>(
      `SELECT category_path, COUNT(*) as count 
       FROM food_categories 
       GROUP BY category_path 
       ORDER BY count DESC`
    );
  }
}

export default new FoodCategoryRepository();
