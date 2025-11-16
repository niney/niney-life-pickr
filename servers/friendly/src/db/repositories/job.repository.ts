/**
 * Job Repository (단순화 버전)
 * - restaurant_crawl 타입 고정
 * - metadata에 Socket 통신 데이터 저장
 */

import db from '../database';
import {JobDB, JobStatus} from '../../types/db.types';
import {v4 as uuidv4} from 'uuid';

class JobRepository {

  /**
   * restaurant_id와 type으로 Job 조회
   */
  async findByRestaurantAndType(
    restaurantId: number,
    type: string = 'restaurant_crawl'
  ): Promise<JobDB | undefined> {
    return await db.get<JobDB>(`
      SELECT * FROM jobs
      WHERE restaurant_id = ? AND type = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [restaurantId, type]);
  }

  /**
   * Job 생성 (단순화)
   * - 기존 Job이 있으면 삭제 후 생성 (UNIQUE 제약 조건 우회)
   */
  async create(params: {
    id?: string; // 선택적: 미제공 시 UUID 자동 생성
    restaurantId: number;
    metadata?: Record<string, any>;
  }): Promise<JobDB> {
    const id = params.id || uuidv4(); // 외부 ID 우선, 없으면 생성
    const now = new Date().toISOString();

    // 기존 Job 삭제 (UNIQUE 제약 조건 회피)
    await db.run(`
      DELETE FROM jobs
      WHERE restaurant_id = ? AND type = ?
    `, [params.restaurantId, 'restaurant_crawl']);

    await db.run(`
      INSERT INTO jobs (
        id, type, restaurant_id, status,
        metadata, error_message,
        started_at, completed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      'restaurant_crawl', // 고정
      params.restaurantId,
      'active',
      params.metadata ? JSON.stringify(params.metadata) : null,
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
   * 메타데이터 업데이트 (Socket 통신 데이터 저장)
   * - 기존 metadata와 병합하여 업데이트 (덮어쓰기 방지)
   */
  async updateMetadata(
    jobId: string,
    eventName: string,
    metadata: Record<string, any>
  ): Promise<void> {
    // 1. 기존 Job 조회
    const job = await this.findById(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // 2. 기존 metadata 파싱
    let existingMetadata: Record<string, any> = {};
    if (job.metadata) {
      try {
        existingMetadata = JSON.parse(job.metadata);
      } catch (error) {
        console.error('[JobRepository] Failed to parse existing metadata:', error);
        // 파싱 실패 시 빈 객체로 시작
      }
    }

    // 3. 새 metadata와 병합 (새 값이 우선)
    const mergedMetadata = {
      ...existingMetadata,
      ...metadata,
    };

    // 4. DB 업데이트
    await db.run(`
      UPDATE jobs
      SET metadata = ?,
          event_name = ?,
          updated_at = ?
      WHERE id = ?
    `, [
      JSON.stringify(mergedMetadata),
      eventName || null,
      new Date().toISOString(),
      jobId
    ]);
  }

  /**
   * Job 완료
   * - 기존 metadata와 병합하여 업데이트 (덮어쓰기 방지)
   */
  async complete(
    jobId: string,
    finalMetadata?: Record<string, any>
  ): Promise<void> {
    // 1. 기존 Job 조회
    const job = await this.findById(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // 2. 기존 metadata 파싱
    let existingMetadata: Record<string, any> = {};
    if (job.metadata) {
      try {
        existingMetadata = JSON.parse(job.metadata);
      } catch (error) {
        console.error('[JobRepository] Failed to parse existing metadata:', error);
        // 파싱 실패 시 빈 객체로 시작
      }
    }

    // 3. 새 metadata와 병합 (새 값이 우선)
    const mergedMetadata = {
      ...existingMetadata,
      ...(finalMetadata || {}),
    };

    const now = new Date().toISOString();

    // 4. DB 업데이트
    await db.run(`
      UPDATE jobs
      SET status = 'completed',
          metadata = ?,
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `, [
      JSON.stringify(mergedMetadata),
      now,
      now,
      jobId
    ]);
  }

  /**
   * Job 실패
   * - 기존 metadata와 병합하여 업데이트 (덮어쓰기 방지)
   */
  async fail(jobId: string, error: string, metadata?: Record<string, any>): Promise<void> {
    // 1. 기존 Job 조회
    const job = await this.findById(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // 2. 기존 metadata 파싱
    let existingMetadata: Record<string, any> = {};
    if (job.metadata) {
      try {
        existingMetadata = JSON.parse(job.metadata);
      } catch (error) {
        console.error('[JobRepository] Failed to parse existing metadata:', error);
        // 파싱 실패 시 빈 객체로 시작
      }
    }

    // 3. 새 metadata와 병합 (새 값이 우선)
    const mergedMetadata = {
      ...existingMetadata,
      ...(metadata || {}),
    };

    const now = new Date().toISOString();

    // 4. DB 업데이트
    await db.run(`
      UPDATE jobs
      SET status = 'failed',
          error_message = ?,
          metadata = ?,
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `, [
      error,
      JSON.stringify(mergedMetadata),
      now,
      now,
      jobId
    ]);
  }

  /**
   * Job 취소
   * - 기존 metadata와 병합하여 업데이트 (덮어쓰기 방지)
   */
  async cancel(jobId: string, metadata?: Record<string, any>): Promise<void> {
    // 1. 기존 Job 조회
    const job = await this.findById(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // 2. 기존 metadata 파싱
    let existingMetadata: Record<string, any> = {};
    if (job.metadata) {
      try {
        existingMetadata = JSON.parse(job.metadata);
      } catch (error) {
        console.error('[JobRepository] Failed to parse existing metadata:', error);
        // 파싱 실패 시 빈 객체로 시작
      }
    }

    // 3. 새 metadata와 병합 (새 값이 우선)
    const mergedMetadata = {
      ...existingMetadata,
      ...(metadata || {}),
    };

    const now = new Date().toISOString();

    // 4. DB 업데이트
    await db.run(`
      UPDATE jobs
      SET status = 'cancelled',
          metadata = ?,
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `, [
      JSON.stringify(mergedMetadata),
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
   * 레스토랑의 활성 Job 조회
   */
  async findActiveByRestaurant(restaurantId: number): Promise<JobDB[]> {
    return db.all<JobDB>(`
      SELECT * FROM jobs
      WHERE restaurant_id = ? AND status = 'active'
      ORDER BY created_at DESC
    `, [restaurantId]);
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
   * 모든 활성 Job 조회 (Restaurant 정보 포함)
   * Socket 통신용 - Restaurant 이름, 카테고리, 주소 정보 함께 조회
   */
  async findAllActiveWithRestaurant(): Promise<Array<JobDB & {
    restaurant_name: string | null;
    restaurant_category: string | null;
    restaurant_address: string | null;
  }>> {
    return db.all(`
      SELECT 
        j.*,
        r.name as restaurant_name,
        r.category as restaurant_category,
        r.address as restaurant_address
      FROM jobs j
      LEFT JOIN restaurants r ON j.restaurant_id = r.id
      WHERE j.status = 'active'
      ORDER BY j.created_at DESC
    `);
  }

  /**
   * 레스토랑의 Job 히스토리 조회
   */
  async findByRestaurant(
    restaurantId: number,
    limit: number = 10
  ): Promise<JobDB[]> {
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
}

export const jobRepository = new JobRepository();
export default jobRepository;
