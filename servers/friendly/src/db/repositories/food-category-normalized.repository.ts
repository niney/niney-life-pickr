import db from '../database';
import type {
  FoodCategoryNormalizedDB,
  FoodCategoryNormalizedInput,
} from '../../types/db.types';

/**
 * Food Category Normalized Repository
 * 정규화된 음식 카테고리 데이터 관리
 */
export class FoodCategoryNormalizedRepository {
  /**
   * ID로 조회
   */
  async findById(id: number): Promise<FoodCategoryNormalizedDB | undefined> {
    return await db.get<FoodCategoryNormalizedDB>(
      'SELECT * FROM food_categories_normalized WHERE id = ?',
      [id]
    );
  }

  /**
   * 메뉴명으로 조회
   */
  async findByName(name: string): Promise<FoodCategoryNormalizedDB | undefined> {
    return await db.get<FoodCategoryNormalizedDB>(
      'SELECT * FROM food_categories_normalized WHERE name = ?',
      [name]
    );
  }

  /**
   * 카테고리 경로로 조회
   */
  async findByCategoryPath(categoryPath: string): Promise<FoodCategoryNormalizedDB[]> {
    return await db.all<FoodCategoryNormalizedDB>(
      'SELECT * FROM food_categories_normalized WHERE category_path = ? ORDER BY name',
      [categoryPath]
    );
  }

  /**
   * 전체 조회
   */
  async findAll(): Promise<FoodCategoryNormalizedDB[]> {
    return await db.all<FoodCategoryNormalizedDB>(
      'SELECT * FROM food_categories_normalized ORDER BY name'
    );
  }

  /**
   * 단일 삽입 (중복 시 업데이트)
   */
  async upsert(input: FoodCategoryNormalizedInput): Promise<void> {
    await db.run(
      `INSERT INTO food_categories_normalized (name, category_path, source_count)
       VALUES (?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET
         category_path = excluded.category_path,
         source_count = excluded.source_count,
         updated_at = CURRENT_TIMESTAMP`,
      [input.name, input.category_path, input.source_count ?? 1]
    );
  }

  /**
   * 일괄 삽입 (트랜잭션, 중복 시 업데이트)
   */
  async bulkUpsert(
    inputs: FoodCategoryNormalizedInput[]
  ): Promise<{ inserted: number; updated: number }> {
    if (inputs.length === 0) {
      return { inserted: 0, updated: 0 };
    }

    let inserted = 0;
    let updated = 0;

    await db.run('BEGIN TRANSACTION');

    try {
      for (const input of inputs) {
        const existing = await this.findByName(input.name);

        await db.run(
          `INSERT INTO food_categories_normalized (name, category_path, source_count)
           VALUES (?, ?, ?)
           ON CONFLICT(name) DO UPDATE SET
             category_path = excluded.category_path,
             source_count = excluded.source_count,
             updated_at = CURRENT_TIMESTAMP`,
          [input.name, input.category_path, input.source_count ?? 1]
        );

        if (existing) {
          updated++;
        } else {
          inserted++;
        }
      }

      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }

    return { inserted, updated };
  }

  /**
   * 전체 삭제 (테이블 초기화)
   */
  async truncate(): Promise<number> {
    const all = await this.findAll();
    const count = all.length;

    if (count > 0) {
      await db.run('DELETE FROM food_categories_normalized');
    }

    return count;
  }

  /**
   * 메뉴명으로 삭제
   */
  async deleteByName(name: string): Promise<boolean> {
    const existing = await this.findByName(name);
    if (!existing) {
      return false;
    }

    await db.run('DELETE FROM food_categories_normalized WHERE name = ?', [name]);
    return true;
  }

  /**
   * 카테고리별 메뉴 개수 통계
   */
  async getCategoryStats(): Promise<Array<{ category_path: string; count: number }>> {
    return await db.all<{ category_path: string; count: number }>(
      `SELECT category_path, COUNT(*) as count 
       FROM food_categories_normalized 
       GROUP BY category_path 
       ORDER BY count DESC`
    );
  }

  /**
   * 전체 레코드 수
   */
  async count(): Promise<number> {
    const result = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM food_categories_normalized'
    );
    return result?.count ?? 0;
  }

  /**
   * 여러 메뉴명이 정규화 테이블에 있는지 확인
   * @param names 확인할 메뉴명 목록
   * @returns 정규화 테이블에 없는 메뉴명 목록
   */
  async findMissingNames(names: string[]): Promise<string[]> {
    if (names.length === 0) {
      return [];
    }

    // 테이블에 존재하는 이름들 조회
    const placeholders = names.map(() => '?').join(',');
    const existing = await db.all<{ name: string }>(
      `SELECT name FROM food_categories_normalized WHERE name IN (${placeholders})`,
      names
    );

    const existingSet = new Set(existing.map(e => e.name));
    return names.filter(name => !existingSet.has(name));
  }
}

export default new FoodCategoryNormalizedRepository();
