-- 004_create_review_summaries.sql
-- 리뷰 요약 테이블 생성

CREATE TABLE IF NOT EXISTS review_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id INTEGER NOT NULL UNIQUE,
  
  -- 상태 관리
  status TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'processing' | 'completed' | 'failed'
  
  -- AI 요약 결과 (JSON, 초기에는 NULL)
  summary_data TEXT,                        -- NULL 허용 (pending 상태일 때)
  
  -- 에러 처리
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
);

-- 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_summaries_review 
  ON review_summaries(review_id);
  
CREATE INDEX IF NOT EXISTS idx_review_summaries_status 
  ON review_summaries(status);
