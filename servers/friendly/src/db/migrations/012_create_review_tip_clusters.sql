-- 012_create_tip_clusters.sql
-- 팁 클러스터링 결과 테이블

CREATE TABLE IF NOT EXISTS review_tip_clusters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL UNIQUE,
  
  -- 클러스터링 결과 (JSON)
  cluster_data TEXT NOT NULL,             -- TipGroup[] JSON
  
  -- 통계
  total_tips INTEGER NOT NULL DEFAULT 0,  -- 원본 팁 총 개수
  group_count INTEGER NOT NULL DEFAULT 0, -- 그룹 개수
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_tip_clusters_restaurant 
  ON review_tip_clusters(restaurant_id);
