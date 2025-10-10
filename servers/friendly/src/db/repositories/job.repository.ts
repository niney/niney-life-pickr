/**
 * Job Repository (범용 작업 추적)
 * - 리뷰 크롤링, 리뷰 요약, 레스토랑 크롤링 등 모든 백그라운드 작업 추적
 */

import db from '../database';
import { 
  JobDB, 
  JobType, 
  JobStatus, 
  JobProgress
} from '../../types/db.types';
import { v4 as uuidv4 } from 'uuid';

class JobRepository {
  
  /**
   * Job 생성 (범용)
   * - id를 외부에서 제공하거나 자동 생성
   */
  async create<T extends JobType>(params: {
    id?: string; // 선택적: 미제공 시 UUID 자동 생성
    type: T;
    restaurantId: number;
    metadata?: Record<string, any>;
  }): Promise<JobDB> {
    const id = params.id || uuidv4(); // 외부 ID 우선, 없으면 생성
    const now = new Date().toISOString();
    
    await db.run(`
      INSERT INTO jobs (
        id, type, restaurant_id, status,
        progress_current, progress_total, progress_percentage,
        metadata, result, error_message,
        started_at, completed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      params.type,
      params.restaurantId,
      'active',
      0,
      0,
      0,
      params.metadata ? JSON.stringify(params.metadata) : null,
      null,
      null,
      now,
      null,
      now,
      now
    ]);
    
    const job = await db.get<JobDB>('SELECT * FROM jobs WHERE id = ?', [id]);
    if (!job) {
      throw new Error('Failed to create job');
    }
    
    return job;
  }
  
  /**
   * 진행률 업데이트
   */
  async updateProgress(
    jobId: string, 
    progress: JobProgress
  ): Promise<void> {
    await db.run(`
      UPDATE jobs 
      SET progress_current = ?,
          progress_total = ?,
          progress_percentage = ?,
          updated_at = ?
      WHERE id = ?
    `, [
      progress.current,
      progress.total,
      progress.percentage,
      new Date().toISOString(),
      jobId
    ]);
  }
  
  /**
   * Job 완료
   */
  async complete(
    jobId: string, 
    result?: Record<string, any>
  ): Promise<void> {
    const now = new Date().toISOString();
    
    await db.run(`
      UPDATE jobs
      SET status = 'completed',
          result = ?,
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `, [
      result ? JSON.stringify(result) : null,
      now,
      now,
      jobId
    ]);
  }
  
  /**
   * Job 실패
   */
  async fail(jobId: string, error: string): Promise<void> {
    const now = new Date().toISOString();
    
    await db.run(`
      UPDATE jobs
      SET status = 'failed',
          error_message = ?,
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `, [
      error,
      now,
      now,
      jobId
    ]);
  }
  
  /**
   * Job 취소
   */
  async cancel(jobId: string): Promise<void> {
    const now = new Date().toISOString();
    
    await db.run(`
      UPDATE jobs
      SET status = 'cancelled',
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `, [
      now,
      now,
      jobId
    ]);
  }
  
  /**
   * ID로 조회
   */
  async findById(jobId: string): Promise<JobDB | null> {
    const job = await db.get<JobDB>(
      'SELECT * FROM jobs WHERE id = ?',
      [jobId]
    );
    return job || null;
  }
  
  /**
   * 레스토랑의 활성 Job 조회 (타입 필터 가능)
   */
  async findActiveByRestaurant(
    restaurantId: number,
    type?: JobType
  ): Promise<JobDB[]> {
    if (type) {
      return db.all<JobDB>(`
        SELECT * FROM jobs
        WHERE restaurant_id = ? AND status = 'active' AND type = ?
        ORDER BY created_at DESC
      `, [restaurantId, type]);
    }
    
    return db.all<JobDB>(`
      SELECT * FROM jobs
      WHERE restaurant_id = ? AND status = 'active'
      ORDER BY created_at DESC
    `, [restaurantId]);
  }
  
  /**
   * 타입별 활성 Job 조회
   */
  async findActiveByType(type: JobType): Promise<JobDB[]> {
    return db.all<JobDB>(`
      SELECT * FROM jobs
      WHERE type = ? AND status = 'active'
      ORDER BY created_at DESC
    `, [type]);
  }
  
  /**
   * 모든 활성 Job 조회
   */
  async findAllActive(): Promise<JobDB[]> {
    return db.all<JobDB>(`
      SELECT * FROM jobs
      WHERE status = 'active'
      ORDER BY created_at DESC
    `);
  }
  
  /**
   * 레스토랑의 Job 히스토리 조회
   */
  async findByRestaurant(
    restaurantId: number,
    limit: number = 10,
    type?: JobType
  ): Promise<JobDB[]> {
    if (type) {
      return db.all<JobDB>(`
        SELECT * FROM jobs
        WHERE restaurant_id = ? AND type = ?
        ORDER BY created_at DESC
        LIMIT ?
      `, [restaurantId, type, limit]);
    }
    
    return db.all<JobDB>(`
      SELECT * FROM jobs
      WHERE restaurant_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [restaurantId, limit]);
  }
  
  /**
   * 실패한 Job 조회
   */
  async findFailed(limit: number = 50): Promise<JobDB[]> {
    return db.all<JobDB>(`
      SELECT * FROM jobs
      WHERE status = 'failed'
      ORDER BY created_at DESC
      LIMIT ?
    `, [limit]);
  }
  
  /**
   * 오래된 완료 Job 삭제 (정리용)
   */
  async deleteOldCompleted(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    await db.run(`
      DELETE FROM jobs
      WHERE status IN ('completed', 'failed', 'cancelled')
        AND completed_at < ?
    `, [cutoffDate.toISOString()]);
    
    // SQLite에서는 변경된 행 수를 별도로 조회해야 함
    const result = await db.get<{ count: number }>(`
      SELECT changes() as count
    `);
    
    return result?.count || 0;
  }
  
  /**
   * Job 상태 업데이트
   */
  async updateStatus(jobId: string, status: JobStatus): Promise<void> {
    await db.run(`
      UPDATE jobs
      SET status = ?,
          updated_at = ?
      WHERE id = ?
    `, [
      status,
      new Date().toISOString(),
      jobId
    ]);
  }
  
  /**
   * 메타데이터 파싱 헬퍼
   */
  parseMetadata<T = any>(job: JobDB): T | null {
    if (!job.metadata) return null;
    try {
      return JSON.parse(job.metadata) as T;
    } catch {
      return null;
    }
  }
  
  /**
   * 결과 데이터 파싱 헬퍼
   */
  parseResult<T = any>(job: JobDB): T | null {
    if (!job.result) return null;
    try {
      return JSON.parse(job.result) as T;
    } catch {
      return null;
    }
  }
}

export const jobRepository = new JobRepository();
export default jobRepository;
