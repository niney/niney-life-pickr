-- 003_create_jobs.sql
-- 범용 작업 추적 테이블 생성 (리뷰 크롤링, 리뷰 요약, 레스토랑 크롤링 등)

CREATE TABLE IF NOT EXISTS jobs (
  -- 기본 정보
  id TEXT PRIMARY KEY,                             -- UUID
  type TEXT NOT NULL,                              -- 'review_crawl', 'review_summary', 'restaurant_crawl'
  restaurant_id INTEGER NOT NULL,                  -- 레스토랑 ID (FK)
  
  -- 상태 관리
  status TEXT NOT NULL DEFAULT 'pending',          -- 'pending', 'active', 'completed', 'failed', 'cancelled'
  
  -- 진행률 (범용)
  progress_current INTEGER DEFAULT 0,              -- 현재 처리 개수
  progress_total INTEGER DEFAULT 0,                -- 전체 개수
  progress_percentage INTEGER DEFAULT 0,           -- 진행률 (%)
  
  -- 메타데이터 (작업별 커스텀 데이터) - JSON
  metadata TEXT,                                   -- JSON string
  
  -- 결과 데이터 (작업별 커스텀 결과) - JSON
  result TEXT,                                     -- JSON string
  
  -- 에러 정보
  error_message TEXT,
  
  -- 타임스탬프
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- 외래 키
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_jobs_restaurant_status ON jobs(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_type_status ON jobs(type, status);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_restaurant_type ON jobs(restaurant_id, type);
