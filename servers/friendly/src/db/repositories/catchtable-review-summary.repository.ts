import db from '../database';
import type { ReviewSummaryData } from '../../types/db.types';
import type {
  CatchtableReviewSummaryDB,
  CatchtableReviewSummaryStatus,
} from '../../types/catchtable.types';

/**
 * Catchtable Review Summary Repository
 * 캐치테이블 리뷰 요약 데이터 관리
 */
export class CatchtableReviewSummaryRepository {
  /**
   * 요약 레코드 생성 (초기 상태: pending)
   */
  async create(reviewId: number, restaurantId: number): Promise<void> {
    await db.run(
      `INSERT INTO catchtable_review_summaries (review_id, restaurant_id, status, summary_data)
       VALUES (?, ?, 'pending', NULL)`,
      [reviewId, restaurantId]
    );
  }

  /**
   * 배치 생성 (pending 상태)
   */
  async createBatch(restaurantId: number, reviewIds: number[]): Promise<void> {
    if (reviewIds.length === 0) return;

    const values = reviewIds
      .map((reviewId) => `(${reviewId}, ${restaurantId}, 'pending', NULL)`)
      .join(', ');

    await db.run(`
      INSERT INTO catchtable_review_summaries (review_id, restaurant_id, status, summary_data)
      VALUES ${values}
    `);
  }

  /**
   * 상태 업데이트
   */
  async updateStatus(
    reviewId: number,
    status: CatchtableReviewSummaryStatus,
    errorMessage?: string
  ): Promise<void> {
    await db.run(
      `UPDATE catchtable_review_summaries
       SET status = ?,
           error_message = ?,
           updated_at = datetime('now', 'localtime')
       WHERE review_id = ?`,
      [status, errorMessage || null, reviewId]
    );
  }

  /**
   * 요약 데이터 업데이트 (AI 완료 시)
   */
  async updateSummary(reviewId: number, summaryData: ReviewSummaryData): Promise<void> {
    await db.run(
      `UPDATE catchtable_review_summaries
       SET summary_data = ?,
           status = 'completed',
           error_message = NULL,
           updated_at = datetime('now', 'localtime')
       WHERE review_id = ?`,
      [JSON.stringify(summaryData), reviewId]
    );
  }

  /**
   * 배치 요약 데이터 업데이트 (트랜잭션)
   */
  async updateSummaryBatch(
    updates: Array<{
      reviewId: number;
      summaryData: ReviewSummaryData | null;
      errorMessage?: string;
    }>
  ): Promise<void> {
    if (updates.length === 0) return;

    await db.run('BEGIN TRANSACTION');

    try {
      for (const update of updates) {
        if (update.summaryData && update.summaryData.summary) {
          // 성공: completed 상태로 업데이트
          await db.run(
            `UPDATE catchtable_review_summaries
             SET summary_data = ?,
                 status = 'completed',
                 error_message = NULL,
                 updated_at = datetime('now', 'localtime')
             WHERE review_id = ?`,
            [JSON.stringify(update.summaryData), update.reviewId]
          );
        } else {
          // 실패: failed 상태로 업데이트
          await db.run(
            `UPDATE catchtable_review_summaries
             SET status = 'failed',
                 error_message = ?,
                 retry_count = retry_count + 1,
                 updated_at = datetime('now', 'localtime')
             WHERE review_id = ?`,
            [update.errorMessage || 'AI 요약 생성 실패', update.reviewId]
          );
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
  async markAsFailed(reviewId: number, errorMessage: string): Promise<void> {
    await db.run(
      `UPDATE catchtable_review_summaries
       SET status = 'failed',
           error_message = ?,
           retry_count = retry_count + 1,
           updated_at = datetime('now', 'localtime')
       WHERE review_id = ?`,
      [errorMessage, reviewId]
    );
  }

  /**
   * 리뷰 ID로 조회
   */
  async findByReviewId(reviewId: number): Promise<CatchtableReviewSummaryDB | null> {
    const row = await db.get<CatchtableReviewSummaryDB>(
      'SELECT * FROM catchtable_review_summaries WHERE review_id = ?',
      [reviewId]
    );
    return row || null;
  }

  /**
   * 여러 리뷰 ID로 요약 일괄 조회
   */
  async findByReviewIds(reviewIds: number[]): Promise<CatchtableReviewSummaryDB[]> {
    if (reviewIds.length === 0) return [];

    const placeholders = reviewIds.map(() => '?').join(',');
    return await db.all<CatchtableReviewSummaryDB>(
      `SELECT * FROM catchtable_review_summaries
       WHERE review_id IN (${placeholders})
       ORDER BY review_id`,
      reviewIds
    );
  }

  /**
   * 레스토랑의 미완료 요약 조회 (pending + failed)
   */
  async findIncompleteByRestaurantId(
    restaurantId: number,
    limit: number = 1000,
    offset: number = 0
  ): Promise<CatchtableReviewSummaryDB[]> {
    return await db.all<CatchtableReviewSummaryDB>(
      `SELECT *
       FROM catchtable_review_summaries
       WHERE restaurant_id = ?
         AND status IN ('pending', 'failed')
       ORDER BY created_at
       LIMIT ? OFFSET ?`,
      [restaurantId, limit, offset]
    );
  }

  /**
   * 레스토랑의 모든 요약 review_id 목록 조회
   */
  async findReviewIdsByRestaurantId(restaurantId: number): Promise<number[]> {
    const rows = await db.all<{ review_id: number }>(
      `SELECT review_id
       FROM catchtable_review_summaries
       WHERE restaurant_id = ?
       ORDER BY review_id`,
      [restaurantId]
    );
    return rows.map((row) => row.review_id);
  }

  /**
   * 레스토랑의 미완료 요약 개수
   */
  async countIncompleteByRestaurantId(restaurantId: number): Promise<number> {
    const result = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM catchtable_review_summaries
       WHERE restaurant_id = ?
         AND status IN ('pending', 'failed')`,
      [restaurantId]
    );
    return result?.count || 0;
  }

  /**
   * 레스토랑의 요약 전체 개수
   */
  async countByRestaurantId(restaurantId: number): Promise<number> {
    const result = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM catchtable_review_summaries
       WHERE restaurant_id = ?`,
      [restaurantId]
    );
    return result?.count || 0;
  }

  /**
   * 레스토랑의 완료된 요약 개수
   */
  async countCompletedByRestaurantId(restaurantId: number): Promise<number> {
    const result = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM catchtable_review_summaries
       WHERE restaurant_id = ?
         AND status = 'completed'`,
      [restaurantId]
    );
    return result?.count || 0;
  }

  /**
   * 레스토랑의 완료된 요약 조회
   */
  async findCompletedByRestaurantId(
    restaurantId: number
  ): Promise<Array<{ reviewId: number; summary: ReviewSummaryData }>> {
    const rows = await db.all<CatchtableReviewSummaryDB>(
      `SELECT *
       FROM catchtable_review_summaries
       WHERE restaurant_id = ?
         AND status = 'completed'
       ORDER BY created_at DESC`,
      [restaurantId]
    );

    return rows.map((row) => ({
      reviewId: row.review_id,
      summary: JSON.parse(row.summary_data!),
    }));
  }

  /**
   * 요약 삭제 (리뷰 ID로)
   */
  async deleteByReviewId(reviewId: number): Promise<void> {
    await db.run('DELETE FROM catchtable_review_summaries WHERE review_id = ?', [reviewId]);
  }

  /**
   * 레스토랑의 모든 요약 삭제
   */
  async deleteByRestaurantId(restaurantId: number): Promise<void> {
    await db.run('DELETE FROM catchtable_review_summaries WHERE restaurant_id = ?', [
      restaurantId,
    ]);
  }

  /**
   * 배치 삭제
   */
  async deleteBatchByReviewIds(reviewIds: number[]): Promise<void> {
    if (reviewIds.length === 0) return;

    const placeholders = reviewIds.map(() => '?').join(', ');
    await db.run(
      `DELETE FROM catchtable_review_summaries
       WHERE review_id IN (${placeholders})`,
      reviewIds
    );
  }

  /**
   * 레스토랑의 완료된 요약에서 메뉴 아이템 추출
   */
  async findMenuItemsByRestaurantId(
    restaurantId: number
  ): Promise<Array<{ reviewId: number; menuItem: any }>> {
    const summaries = await db.all<CatchtableReviewSummaryDB>(
      `SELECT review_id, summary_data
       FROM catchtable_review_summaries
       WHERE restaurant_id = ?
         AND status = 'completed'
         AND summary_data IS NOT NULL`,
      [restaurantId]
    );

    const menuItems: Array<{ reviewId: number; menuItem: any }> = [];

    for (const summary of summaries) {
      if (summary.summary_data) {
        try {
          const parsed = JSON.parse(summary.summary_data);
          if (parsed.menuItems && Array.isArray(parsed.menuItems)) {
            for (const item of parsed.menuItems) {
              menuItems.push({
                reviewId: summary.review_id,
                menuItem: item,
              });
            }
          }
        } catch (error) {
          console.error(
            `Failed to parse summary_data for catchtable review ${summary.review_id}:`,
            error
          );
        }
      }
    }

    return menuItems;
  }

  /**
   * 레스토랑별 감정 통계 조회
   */
  async countSentimentByRestaurantId(restaurantId: number): Promise<{
    positive: number;
    negative: number;
    neutral: number;
    total: number;
  }> {
    const rows = await db.all<{ sentiment: string; count: number }>(
      `SELECT
         json_extract(summary_data, '$.sentiment') as sentiment,
         COUNT(*) as count
       FROM catchtable_review_summaries
       WHERE restaurant_id = ?
         AND status = 'completed'
         AND summary_data IS NOT NULL
         AND json_extract(summary_data, '$.sentiment') IS NOT NULL
       GROUP BY sentiment`,
      [restaurantId]
    );

    const result = {
      positive: 0,
      negative: 0,
      neutral: 0,
      total: 0,
    };

    for (const row of rows) {
      const sentiment = row.sentiment;
      const count = row.count;

      if (sentiment === 'positive') result.positive = count;
      else if (sentiment === 'negative') result.negative = count;
      else if (sentiment === 'neutral') result.neutral = count;

      result.total += count;
    }

    return result;
  }
}

export const catchtableReviewSummaryRepository = new CatchtableReviewSummaryRepository();
export default catchtableReviewSummaryRepository;
