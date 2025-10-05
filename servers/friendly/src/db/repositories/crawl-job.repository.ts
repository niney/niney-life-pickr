import db from '../database';
import type { CrawlJobDB, CrawlJobInput } from '../../types/db.types';

/**
 * Crawl Job Repository
 * 크롤링 Job DB 관리
 */
export class CrawlJobRepository {
  /**
   * Job 생성
   */
  async create(input: CrawlJobInput): Promise<void> {
    await db.run(`
      INSERT INTO crawl_jobs (
        job_id, restaurant_id, place_id, url, status
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      input.job_id,
      input.restaurant_id,
      input.place_id,
      input.url,
      input.status
    ]);
  }

  /**
   * Job ID로 조회
   */
  async findById(jobId: string): Promise<CrawlJobDB | undefined> {
    return await db.get<CrawlJobDB>(
      'SELECT * FROM crawl_jobs WHERE job_id = ?',
      [jobId]
    );
  }

  /**
   * 모든 Job 조회
   */
  async findAll(status?: string, limit: number = 20): Promise<CrawlJobDB[]> {
    if (status) {
      return await db.all<CrawlJobDB>(
        'SELECT * FROM crawl_jobs WHERE status = ? ORDER BY created_at DESC LIMIT ?',
        [status, limit]
      );
    }
    return await db.all<CrawlJobDB>(
      'SELECT * FROM crawl_jobs ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
  }

  /**
   * Job 상태 업데이트
   */
  async updateStatus(
    jobId: string,
    status: string,
    updates?: {
      startedAt?: Date;
      completedAt?: Date;
      totalReviews?: number;
      savedToDb?: number;
      errorMessage?: string;
    }
  ): Promise<void> {
    let query = 'UPDATE crawl_jobs SET status = ?';
    const params: any[] = [status];

    if (updates?.startedAt) {
      query += ', started_at = ?';
      params.push(updates.startedAt.toISOString());
    }

    if (updates?.completedAt) {
      query += ', completed_at = ?';
      params.push(updates.completedAt.toISOString());
    }

    if (updates?.totalReviews !== undefined) {
      query += ', total_reviews = ?';
      params.push(updates.totalReviews);
    }

    if (updates?.savedToDb !== undefined) {
      query += ', saved_to_db = ?';
      params.push(updates.savedToDb);
    }

    if (updates?.errorMessage) {
      query += ', error_message = ?';
      params.push(updates.errorMessage);
    }

    query += ' WHERE job_id = ?';
    params.push(jobId);

    await db.run(query, params);
  }

  /**
   * 진행 상황 업데이트
   */
  async updateProgress(jobId: string, current: number, total: number, percentage: number): Promise<void> {
    await db.run(`
      UPDATE crawl_jobs
      SET progress_current = ?, progress_total = ?, progress_percentage = ?
      WHERE job_id = ?
    `, [current, total, percentage, jobId]);
  }

  /**
   * Job 상태 조회 (간단)
   */
  async getStatus(jobId: string): Promise<string | null> {
    const result = await db.get<{ status: string }>(
      'SELECT status FROM crawl_jobs WHERE job_id = ?',
      [jobId]
    );
    return result?.status || null;
  }
}

export const crawlJobRepository = new CrawlJobRepository();
export default crawlJobRepository;
