-- 음식 카테고리 분류 테이블
-- 메뉴명과 LLM이 분류한 카테고리 경로를 저장

CREATE TABLE IF NOT EXISTS food_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  category_path TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  UNIQUE(restaurant_id, name)
);

-- 레스토랑별 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_food_categories_restaurant_id ON food_categories(restaurant_id);

-- 카테고리 경로 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_food_categories_category_path ON food_categories(category_path);
