-- 003_create_jobs.sql
-- 범용 작업 추적 테이블 생성 (단순화 버전)

CREATE TABLE IF NOT EXISTS jobs (
  -- 기본 정보
  id TEXT PRIMARY KEY,                             -- UUID
  type TEXT NOT NULL DEFAULT 'restaurant_crawl',   -- 'restaurant_crawl' 고정
  restaurant_id INTEGER NOT NULL,                  -- 레스토랑 ID (FK)
  
  -- 상태 관리
  status TEXT NOT NULL DEFAULT 'pending',          -- 'pending', 'active', 'completed', 'failed', 'cancelled'
  
  -- 메타데이터 (Socket 통신 데이터를 JSON으로 저장)
  -- 예시: { "step": "menu", "progress": { "current": 50, "total": 100 }, "placeId": "123", ... }
  metadata TEXT,                                   -- JSON string
  
  -- 에러 정보
  error_message TEXT,
  
  -- 타임스탬프
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- 외래 키
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  
  -- 유니크 제약 조건: 하나의 레스토랑은 하나의 활성 작업만 가질 수 있음
  UNIQUE(restaurant_id, type)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_jobs_restaurant_status ON jobs(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
