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
      images: review.images && review.images.length > 0 ? JSON.stringify(review.images) : null,
      crawled_at: new Date().toISOString()
    };

    // 리뷰 저장
    await db.run(`
      INSERT INTO reviews (
        restaurant_id, user_name, visit_keywords, wait_time,
        review_text, emotion_keywords, visit_date, visit_count,
        verification_method, review_hash, images, crawled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(review_hash) DO UPDATE SET
        review_text = excluded.review_text,
        emotion_keywords = excluded.emotion_keywords,
        images = excluded.images,
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
      input.images,
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
   * 레스토랑의 리뷰 조회 (요약 데이터 포함 - JOIN 사용)
   */
  async findByRestaurantIdWithSummary(
    restaurantId: number,
    limit: number = 20,
    offset: number = 0,
    sentiments?: string[]
  ): Promise<any[]> {
    // Sentiment 필터가 있으면 WHERE 절에 추가
    let query = `
      SELECT
        r.*,
        rs.summary_data,
        rs.status as summary_status
      FROM reviews r
      LEFT JOIN review_summaries rs ON r.id = rs.review_id AND rs.status = 'completed'
      WHERE r.restaurant_id = ?
    `;

    const params: any[] = [restaurantId];

    // Sentiment 필터 적용 (요약이 있는 리뷰만 필터링)
    if (sentiments && sentiments.length > 0) {
      const placeholders = sentiments.map(() => '?').join(', ');
      query += ` AND json_extract(rs.summary_data, '$.sentiment') IN (${placeholders})`;
      params.push(...sentiments);
    }

    query += ` ORDER BY r.visit_date DESC, r.id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return await db.all<any>(query, params);
  }

  /**
   * 레스토랑의 리뷰 개수
   */
  async countByRestaurantId(restaurantId: number, sentiments?: string[]): Promise<number> {
    let query = `
      SELECT COUNT(*) as count
      FROM reviews r
    `;

    const params: any[] = [];

    // Sentiment 필터가 있으면 JOIN 및 WHERE 절 추가
    if (sentiments && sentiments.length > 0) {
      query += ` LEFT JOIN review_summaries rs ON r.id = rs.review_id AND rs.status = 'completed'`;
      query += ` WHERE r.restaurant_id = ?`;
      params.push(restaurantId);

      const placeholders = sentiments.map(() => '?').join(', ');
      query += ` AND json_extract(rs.summary_data, '$.sentiment') IN (${placeholders})`;
      params.push(...sentiments);
    } else {
      query += ` WHERE r.restaurant_id = ?`;
      params.push(restaurantId);
    }

    const result = await db.get<{ count: number }>(query, params);
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
