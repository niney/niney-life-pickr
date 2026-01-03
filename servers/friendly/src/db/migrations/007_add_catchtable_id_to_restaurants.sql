-- 007_add_catchtable_id_to_restaurants.sql
-- restaurants 테이블에 캐치테이블 ID 컬럼 추가 (nullable)

ALTER TABLE restaurants ADD COLUMN catchtable_id TEXT;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_restaurants_catchtable_id
  ON restaurants(catchtable_id);
