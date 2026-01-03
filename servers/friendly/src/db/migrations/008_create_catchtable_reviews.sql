-- 008_create_catchtable_reviews.sql
-- 캐치테이블 전용 리뷰 테이블 생성 (flat 구조)

CREATE TABLE IF NOT EXISTS catchtable_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL,

  -- 리뷰 기본 정보
  review_seq INTEGER NOT NULL,
  article_seq INTEGER,
  is_editable INTEGER DEFAULT 0,
  reg_date INTEGER,                      -- Unix timestamp (ms)

  -- 작성자 정보 (writer.*)
  writer_identifier TEXT,
  writer_display_name TEXT,
  writer_profile_thumb_url TEXT,
  writer_grade TEXT,
  writer_total_review_cnt INTEGER,
  writer_total_avg_score REAL,

  -- 사장님 답글
  boss_reply TEXT,

  -- 리뷰 내용 (content.*)
  total_score INTEGER,
  taste_score INTEGER,
  mood_score INTEGER,
  service_score INTEGER,
  review_content TEXT,
  review_comment TEXT,

  -- 예약 정보 (reservation.*)
  reservation_type TEXT,                 -- 'DINING' 등
  is_take_out INTEGER DEFAULT 0,
  food_type_code TEXT,                   -- 'LUNCH', 'DINNER' 등
  food_type_label TEXT,                  -- '점심', '저녁' 등

  -- 반응 정보 (engagement.*)
  reply_cnt INTEGER DEFAULT 0,
  like_cnt INTEGER DEFAULT 0,
  is_liked INTEGER DEFAULT 0,

  -- 메타
  crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_catchtable_reviews_seq
  ON catchtable_reviews(review_seq);

CREATE INDEX IF NOT EXISTS idx_catchtable_reviews_restaurant
  ON catchtable_reviews(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_catchtable_reviews_reg_date
  ON catchtable_reviews(reg_date);

CREATE INDEX IF NOT EXISTS idx_catchtable_reviews_total_score
  ON catchtable_reviews(total_score);
