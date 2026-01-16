import db from '../database';
import type { TipClusterDB, TipClusterInput, TipGroup } from '../../types/db.types';

/**
 * Tip Cluster Repository
 * 팁 클러스터링 결과 관리
 */
class TipClusterRepository {

  /**
   * 클러스터 조회 (레스토랑별)
   */
  async findByRestaurantId(restaurantId: number): Promise<TipClusterDB | null> {
    const row = await db.get<TipClusterDB>(`
      SELECT * FROM review_tip_clusters WHERE restaurant_id = ?
    `, [restaurantId]);
    return row || null;
  }

  /**
   * 클러스터 데이터 파싱하여 조회
   */
  async findParsedByRestaurantId(restaurantId: number): Promise<TipGroup[] | null> {
    const row = await this.findByRestaurantId(restaurantId);
    if (!row) return null;
    
    try {
      return JSON.parse(row.cluster_data) as TipGroup[];
    } catch {
      return null;
    }
  }

  /**
   * 클러스터 생성 또는 업데이트 (Upsert)
   */
  async upsert(input: TipClusterInput): Promise<void> {
    const existing = await this.findByRestaurantId(input.restaurant_id);
    
    if (existing) {
      await db.run(`
        UPDATE review_tip_clusters
        SET cluster_data = ?,
            total_tips = ?,
            group_count = ?,
            updated_at = datetime('now', 'localtime')
        WHERE restaurant_id = ?
      `, [
        JSON.stringify(input.cluster_data),
        input.total_tips,
        input.group_count,
        input.restaurant_id
      ]);
    } else {
      await db.run(`
        INSERT INTO review_tip_clusters (restaurant_id, cluster_data, total_tips, group_count)
        VALUES (?, ?, ?, ?)
      `, [
        input.restaurant_id,
        JSON.stringify(input.cluster_data),
        input.total_tips,
        input.group_count
      ]);
    }
  }

  /**
   * 클러스터 삭제
   */
  async deleteByRestaurantId(restaurantId: number): Promise<void> {
    await db.run(`DELETE FROM review_tip_clusters WHERE restaurant_id = ?`, [restaurantId]);
  }
}

export default new TipClusterRepository();
