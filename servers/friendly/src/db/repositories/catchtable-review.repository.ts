import db from '../database';
import type { CatchtableReviewDB, CatchtableReviewInput } from '../../types/catchtable.types';

export class CatchtableReviewRepository {
  /**
   * 리뷰 UPSERT (review_seq 기준 중복 방지)
   */
  async upsertReview(input: CatchtableReviewInput): Promise<number> {
    await db.run(
      `INSERT INTO catchtable_reviews (
        restaurant_id, review_seq, article_seq, is_editable, reg_date,
        writer_identifier, writer_display_name, writer_profile_thumb_url,
        writer_grade, writer_total_review_cnt, writer_total_avg_score,
        boss_reply, total_score, taste_score, mood_score, service_score,
        review_content, review_comment, reservation_type, is_take_out,
        food_type_code, food_type_label, reply_cnt, like_cnt, is_liked,
        crawled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      ON CONFLICT(review_seq) DO UPDATE SET
        boss_reply = excluded.boss_reply,
        reply_cnt = excluded.reply_cnt,
        like_cnt = excluded.like_cnt,
        is_liked = excluded.is_liked,
        crawled_at = datetime('now', 'localtime'),
        updated_at = datetime('now', 'localtime')`,
      [
        input.restaurant_id,
        input.review_seq,
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

    const saved = await this.findByReviewSeq(input.review_seq);
    return saved?.id || 0;
  }

  /**
   * review_seq로 조회
   */
  async findByReviewSeq(reviewSeq: number): Promise<CatchtableReviewDB | undefined> {
    return await db.get<CatchtableReviewDB>(
      'SELECT * FROM catchtable_reviews WHERE review_seq = ?',
      [reviewSeq]
    );
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
}

export const catchtableReviewRepository = new CatchtableReviewRepository();
export default catchtableReviewRepository;
