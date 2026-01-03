import db from '../database';
import type { CatchtableReviewDB, CatchtableReviewInput } from '../../types/catchtable.types';

export class CatchtableReviewRepository {
  /**
   * 리뷰 UPSERT (id = reviewSeq 기준 중복 방지)
   */
  async upsertReview(input: CatchtableReviewInput): Promise<number> {
    await db.run(
      `INSERT INTO catchtable_reviews (
        id, restaurant_id, article_seq, is_editable, reg_date,
        writer_identifier, writer_display_name, writer_profile_thumb_url,
        writer_grade, writer_total_review_cnt, writer_total_avg_score,
        boss_reply, total_score, taste_score, mood_score, service_score,
        review_content, review_comment, reservation_type, is_take_out,
        food_type_code, food_type_label, reply_cnt, like_cnt, is_liked,
        crawled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      ON CONFLICT(id) DO UPDATE SET
        boss_reply = excluded.boss_reply,
        reply_cnt = excluded.reply_cnt,
        like_cnt = excluded.like_cnt,
        is_liked = excluded.is_liked,
        crawled_at = datetime('now', 'localtime'),
        updated_at = datetime('now', 'localtime')`,
      [
        input.id,
        input.restaurant_id,
        input.article_seq,
        input.is_editable ? 1 : 0,
        input.reg_date,
        input.writer_identifier,
        input.writer_display_name,
        input.writer_profile_thumb_url,
        input.writer_grade,
        input.writer_total_review_cnt,
        input.writer_total_avg_score,
        input.boss_reply,
        input.total_score,
        input.taste_score,
        input.mood_score,
        input.service_score,
        input.review_content,
        input.review_comment,
        input.reservation_type,
        input.is_take_out ? 1 : 0,
        input.food_type_code,
        input.food_type_label,
        input.reply_cnt,
        input.like_cnt,
        input.is_liked ? 1 : 0,
      ]
    );

    return input.id;
  }

  /**
   * 레스토랑의 리뷰 개수 조회
   */
  async countByRestaurantId(restaurantId: number): Promise<number> {
    const result = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM catchtable_reviews WHERE restaurant_id = ?',
      [restaurantId]
    );
    return result?.count || 0;
  }

  /**
   * ID로 조회
   */
  async findById(id: number): Promise<CatchtableReviewDB | undefined> {
    return await db.get<CatchtableReviewDB>(
      'SELECT * FROM catchtable_reviews WHERE id = ?',
      [id]
    );
  }

  /**
   * 여러 ID로 조회
   */
  async findByIds(ids: number[]): Promise<CatchtableReviewDB[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    return await db.all<CatchtableReviewDB>(
      `SELECT * FROM catchtable_reviews WHERE id IN (${placeholders}) ORDER BY id`,
      ids
    );
  }

  /**
   * 레스토랑의 모든 리뷰 ID 조회
   */
  async findReviewIdsByRestaurantId(restaurantId: number): Promise<number[]> {
    const rows = await db.all<{ id: number }>(
      'SELECT id FROM catchtable_reviews WHERE restaurant_id = ? ORDER BY id',
      [restaurantId]
    );
    return rows.map(row => row.id);
  }

  /**
   * 레스토랑의 모든 리뷰 조회
   */
  async findByRestaurantId(restaurantId: number): Promise<CatchtableReviewDB[]> {
    return await db.all<CatchtableReviewDB>(
      'SELECT * FROM catchtable_reviews WHERE restaurant_id = ? ORDER BY reg_date DESC',
      [restaurantId]
    );
  }
}

export const catchtableReviewRepository = new CatchtableReviewRepository();
export default catchtableReviewRepository;
