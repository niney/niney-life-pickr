-- 음식 카테고리 정규화 테이블
-- 여러 레스토랑에서 같은 메뉴명에 대해 다양한 category_path가 있을 때
-- LLM으로 병합하여 하나의 표준 카테고리로 통일

CREATE TABLE IF NOT EXISTS food_categories_normalized (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category_path TEXT NOT NULL,
  source_count INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 메뉴명 조회용 인덱스 (UNIQUE이므로 자동 생성되지만 명시적으로 추가)
CREATE INDEX IF NOT EXISTS idx_food_categories_normalized_name ON food_categories_normalized(name);

-- 카테고리 경로 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_food_categories_normalized_category_path ON food_categories_normalized(category_path);
