import db from '../database';
import type { ReviewDB, ReviewInput } from '../../types/db.types';
import type { ReviewInfo } from '../../types/crawler.types';

/**
 * Review Repository
 * 리뷰 데이터 관리
 */
export class ReviewRepository {
  /**
   * 리뷰 UPSERT (해시 기반 중복 방지)
   */
  async upsertReview(restaurantId: number, review: ReviewInfo, reviewHash: string): Promise<number> {
    const input: ReviewInput = {
      restaurant_id: restaurantId,
      user_name: review.userName,
      visit_keywords: review.visitKeywords.join(','),
      wait_time: review.waitTime,
      review_text: review.reviewText,
      emotion_keywords: review.emotionKeywords.join(','),
      visit_date: review.visitInfo.visitDate,
      visit_count: review.visitInfo.visitCount,
      verification_method: review.visitInfo.verificationMethod,
      review_hash: reviewHash,
      crawled_at: new Date().toISOString()
    };

    // 리뷰 저장
    await db.run(`
      INSERT INTO reviews (
        restaurant_id, user_name, visit_keywords, wait_time,
        review_text, emotion_keywords, visit_date, visit_count,
        verification_method, review_hash, crawled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(review_hash) DO UPDATE SET
        review_text = excluded.review_text,
        emotion_keywords = excluded.emotion_keywords,
        crawled_at = excluded.crawled_at,
        updated_at = CURRENT_TIMESTAMP
    `, [
      input.restaurant_id,
      input.user_name,
      input.visit_keywords,
      input.wait_time,
      input.review_text,
      input.emotion_keywords,
      input.visit_date,
      input.visit_count,
      input.verification_method,
      input.review_hash,
      input.crawled_at
    ]);

    // review_id 확인 (hash로 조회)
    const savedReview = await this.findByHash(reviewHash);
    if (!savedReview) {
      throw new Error('리뷰 저장 후 조회 실패');
    }

    return savedReview.id;
  }

  /**
   * 레스토랑의 리뷰 조회
   */
  async findByRestaurantId(restaurantId: number, limit: number = 20, offset: number = 0): Promise<ReviewDB[]> {
    return await db.all<ReviewDB>(
      'SELECT * FROM reviews WHERE restaurant_id = ? ORDER BY visit_date DESC, id DESC LIMIT ? OFFSET ?',
      [restaurantId, limit, offset]
    );
  }

  /**
   * 레스토랑의 리뷰 개수
   */
  async countByRestaurantId(restaurantId: number): Promise<number> {
    const result = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM reviews WHERE restaurant_id = ?',
      [restaurantId]
    );
    return result?.count || 0;
  }

  /**
   * 리뷰 해시로 조회 (중복 체크용)
   */
  async findByHash(reviewHash: string): Promise<ReviewDB | undefined> {
    return await db.get<ReviewDB>(
      'SELECT * FROM reviews WHERE review_hash = ?',
      [reviewHash]
    );
  }

  /**
   * 리뷰 ID로 조회
   */
  async findById(reviewId: number): Promise<ReviewDB | undefined> {
    return await db.get<ReviewDB>(
      'SELECT * FROM reviews WHERE id = ?',
      [reviewId]
    );
  }

  /**
   * 여러 리뷰 ID로 일괄 조회 (효율적)
   */
  async findByIds(reviewIds: number[]): Promise<ReviewDB[]> {
    if (reviewIds.length === 0) return [];
    
    const placeholders = reviewIds.map(() => '?').join(', ');
    return await db.all<ReviewDB>(
      `SELECT * FROM reviews WHERE id IN (${placeholders}) ORDER BY id ASC`,
      reviewIds
    );
  }

  /**
   * 레스토랑의 모든 리뷰 ID 목록 조회 (효율적)
   */
  async findIdsByRestaurantId(restaurantId: number): Promise<number[]> {
    const rows = await db.all<{ id: number }>(
      'SELECT id FROM reviews WHERE restaurant_id = ? ORDER BY id ASC',
      [restaurantId]
    );
    return rows.map(row => row.id);
  }

  /**
   * 레스토랑의 모든 리뷰 삭제
   */
  async deleteByRestaurantId(restaurantId: number): Promise<void> {
    await db.run('DELETE FROM reviews WHERE restaurant_id = ?', [restaurantId]);
  }
}

export const reviewRepository = new ReviewRepository();
export default reviewRepository;
