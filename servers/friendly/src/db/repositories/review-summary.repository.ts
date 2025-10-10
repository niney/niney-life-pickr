import db from '../database';
import type { 
  ReviewSummaryDB, 
  ReviewSummaryInput, 
  ReviewSummaryData,
  ReviewSummaryStatus 
} from '../../types/db.types';

/**
 * Review Summary Repository
 * 리뷰 요약 데이터 관리
 */
export class ReviewSummaryRepository {
  
  /**
   * 요약 레코드 생성 (초기 상태: pending, summary_data: NULL)
   */
  async create(input: ReviewSummaryInput): Promise<void> {
    await db.run(`
      INSERT INTO review_summaries (review_id, restaurant_id, status, summary_data)
      VALUES (?, ?, ?, ?)
    `, [
      input.review_id,
      input.restaurant_id,
      input.status || 'pending',
      input.summary_data ? JSON.stringify(input.summary_data) : null
    ]);
  }

  /**
   * 상태 업데이트
   */
  async updateStatus(
    reviewId: number, 
    status: ReviewSummaryStatus,
    errorMessage?: string
  ): Promise<void> {
    await db.run(`
      UPDATE review_summaries 
      SET status = ?, 
          error_message = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE review_id = ?
    `, [status, errorMessage || null, reviewId]);
  }

  /**
   * 요약 데이터 업데이트 (AI 완료 시)
   */
  async updateSummary(
    reviewId: number,
    summaryData: ReviewSummaryData
  ): Promise<void> {
    await db.run(`
      UPDATE review_summaries 
      SET summary_data = ?,
          status = 'completed',
          error_message = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE review_id = ?
    `, [JSON.stringify(summaryData), reviewId]);
  }

  /**
   * 배치 요약 데이터 업데이트 (트랜잭션)
   */
  async updateSummaryBatch(
    updates: Array<{ reviewId: number; summaryData: ReviewSummaryData | null; errorMessage?: string }>
  ): Promise<void> {
    if (updates.length === 0) return;
    
    // 트랜잭션으로 일괄 업데이트
    await db.run('BEGIN TRANSACTION');
    
    try {
      for (const update of updates) {
        if (update.summaryData && update.summaryData.summary) {
          // 성공: completed 상태로 업데이트
          await db.run(`
            UPDATE review_summaries 
            SET summary_data = ?,
                status = 'completed',
                error_message = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE review_id = ?
          `, [JSON.stringify(update.summaryData), update.reviewId]);
        } else {
          // 실패: failed 상태로 업데이트
          await db.run(`
            UPDATE review_summaries 
            SET status = 'failed',
                error_message = ?,
                retry_count = retry_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE review_id = ?
          `, [update.errorMessage || 'AI 요약 생성 실패', update.reviewId]);
        }
      }
      
      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * 실패 처리
   */
  async markAsFailed(
    reviewId: number,
    errorMessage: string
  ): Promise<void> {
    await db.run(`
      UPDATE review_summaries 
      SET status = 'failed',
          error_message = ?,
          retry_count = retry_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE review_id = ?
    `, [errorMessage, reviewId]);
  }

  /**
   * 리뷰 ID로 조회
   */
  async findByReviewId(reviewId: number): Promise<ReviewSummaryDB | null> {
    const row = await db.get<ReviewSummaryDB>(`
      SELECT * FROM review_summaries WHERE review_id = ?
    `, [reviewId]);
    
    return row || null;
  }

  /**
   * 특정 상태의 요약 조회
   */
  async findByStatus(status: ReviewSummaryStatus): Promise<ReviewSummaryDB[]> {
    return await db.all<ReviewSummaryDB>(`
      SELECT * FROM review_summaries WHERE status = ?
      ORDER BY created_at ASC
    `, [status]);
  }

  /**
   * 미완료 요약 조회 (pending + failed)
   */
  async findIncomplete(): Promise<ReviewSummaryDB[]> {
    return await db.all<ReviewSummaryDB>(`
      SELECT * FROM review_summaries 
      WHERE status IN ('pending', 'failed')
      ORDER BY created_at ASC
    `);
  }

  /**
   * 레스토랑의 미완료 요약 조회 (restaurant_id로 직접 조회, 페이지네이션)
   */
  async findIncompleteByRestaurant(
    restaurantId: number, 
    limit: number = 1000, 
    offset: number = 0
  ): Promise<ReviewSummaryDB[]> {
    return await db.all<ReviewSummaryDB>(`
      SELECT * 
      FROM review_summaries
      WHERE restaurant_id = ? 
        AND status IN ('pending', 'failed')
      ORDER BY created_at ASC
      LIMIT ? OFFSET ?
    `, [restaurantId, limit, offset]);
  }

  /**
   * 레스토랑의 모든 요약 review_id 목록 조회 (효율적)
   */
  async findReviewIdsByRestaurantId(restaurantId: number): Promise<number[]> {
    const rows = await db.all<{ review_id: number }>(`
      SELECT review_id 
      FROM review_summaries
      WHERE restaurant_id = ?
      ORDER BY review_id ASC
    `, [restaurantId]);
    return rows.map(row => row.review_id);
  }

  /**
   * 특정 review_id들의 요약 일괄 생성
   */
  async createBatch(restaurantId: number, reviewIds: number[]): Promise<void> {
    if (reviewIds.length === 0) return;
    
    const values = reviewIds.map(reviewId => 
      `(${reviewId}, ${restaurantId}, 'pending', NULL)`
    ).join(', ');
    
    await db.run(`
      INSERT INTO review_summaries (review_id, restaurant_id, status, summary_data)
      VALUES ${values}
    `);
  }

  /**
   * 특정 review_id들의 요약 일괄 삭제
   */
  async deleteBatchByReviewIds(reviewIds: number[]): Promise<void> {
    if (reviewIds.length === 0) return;
    
    const placeholders = reviewIds.map(() => '?').join(', ');
    await db.run(`
      DELETE FROM review_summaries 
      WHERE review_id IN (${placeholders})
    `, reviewIds);
  }

  /**
   * 레스토랑의 미완료 요약 개수 (restaurant_id로 직접 조회)
   */
  async countIncompleteByRestaurant(restaurantId: number): Promise<number> {
    const result = await db.get<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM review_summaries
      WHERE restaurant_id = ? 
        AND status IN ('pending', 'failed')
    `, [restaurantId]);
    
    return result?.count || 0;
  }

  /**
   * 레스토랑의 요약 전체 개수 (restaurant_id로 직접 조회)
   */
  async countByRestaurant(restaurantId: number): Promise<number> {
    const result = await db.get<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM review_summaries
      WHERE restaurant_id = ?
    `, [restaurantId]);
    
    return result?.count || 0;
  }

  /**
   * 레스토랑의 완료된 요약 조회 (restaurant_id로 직접 조회)
   */
  async findCompletedByRestaurant(restaurantId: number): Promise<Array<{
    reviewId: number;
    summary: ReviewSummaryData;
  }>> {
    const rows = await db.all<ReviewSummaryDB>(`
      SELECT * 
      FROM review_summaries
      WHERE restaurant_id = ? 
        AND status = 'completed'
      ORDER BY created_at DESC
    `, [restaurantId]);

    return rows.map(row => ({
      reviewId: row.review_id,
      summary: JSON.parse(row.summary_data!)
    }));
  }

  /**
   * 요약 삭제 (리뷰 삭제 시 CASCADE로 자동 삭제됨)
   */
  async deleteByReviewId(reviewId: number): Promise<void> {
    await db.run('DELETE FROM review_summaries WHERE review_id = ?', [reviewId]);
  }

  /**
   * 레스토랑의 모든 요약 삭제 (restaurant_id로 직접 삭제)
   */
  async deleteByRestaurantId(restaurantId: number): Promise<void> {
    await db.run(`
      DELETE FROM review_summaries WHERE restaurant_id = ?
    `, [restaurantId]);
  }
}

export const reviewSummaryRepository = new ReviewSummaryRepository();
export default reviewSummaryRepository;
