-- 003_create_crawl_jobs.sql
-- 크롤링 Job 관리 테이블 생성

CREATE TABLE IF NOT EXISTS crawl_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT UNIQUE NOT NULL,
  restaurant_id INTEGER NOT NULL,
  place_id TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL,                -- waiting, active, completed, failed, cancelled
  progress_current INTEGER DEFAULT 0,
  progress_total INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0,
  total_reviews INTEGER,
  saved_to_db INTEGER,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status ON crawl_jobs(status);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_restaurant ON crawl_jobs(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_created ON crawl_jobs(created_at DESC);
