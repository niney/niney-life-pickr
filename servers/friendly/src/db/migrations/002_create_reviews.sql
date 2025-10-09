-- 002_create_reviews.sql
-- 리뷰 테이블 생성

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL,
  user_name TEXT,
  visit_keywords TEXT,                -- "저녁에 방문,예약 없이 이용,일상,친구" (쉼표 구분)
  wait_time TEXT,
  review_text TEXT,
  emotion_keywords TEXT,              -- "음식이 맛있어요,매장이 넓어요,친절해요" (쉼표 구분)
  visit_date DATE,                    -- ISO 날짜 형식 (YYYY-MM-DD)
  visit_count TEXT,                   -- "1번째 방문"
  verification_method TEXT,           -- "인증 수단영수증"
  review_hash TEXT UNIQUE NOT NULL,   -- MD5 해시 (placeId+userName+visitDate+visitCount+receiptVerified)
  crawled_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_hash ON reviews(review_hash);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_name);
CREATE INDEX IF NOT EXISTS idx_reviews_date ON reviews(visit_date);
